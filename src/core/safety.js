// P19: giữ dữ liệu an toàn qua mọi lần đổi giao diện / nâng cấp app.
// 1) Xin trình duyệt lưu bền (không tự xóa khi thiếu dung lượng).
// 2) Mỗi ngày tự chụp 1 bản sao (việc, sự kiện, nhật ký, tài chính, cài đặt) vào một kho riêng trên máy,
//    giữ 14 bản gần nhất; cũng chụp ngay trước khi nhập file sao lưu. Ảnh không chụp lại (ảnh không bị sửa khi nâng cấp).
// 3) Khôi phục được từ Cài đặt.
// QUY TẮC CHO MỌI LẦN NÂNG CẤP: không đổi tên DB 'ngoi-nha-nho', không xóa kho dữ liệu, chỉ thêm kho/trường mới.
import { getAll, put, clearStore, entries } from './db.js';
import { todayKey } from './time.js';

const SNAP_DB = 'ngoi-nha-nho-snapshots';
const KEEP = 14;
const STORES = ['tasks', 'events', 'journal', 'finance'];

function openSnap() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SNAP_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('snaps')) req.result.createObjectStore('snaps', { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const tx = async (mode, fn) => {
  const db = await openSnap();
  return new Promise((resolve, reject) => {
    const t = db.transaction('snaps', mode);
    const r = fn(t.objectStore('snaps'));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
};

export async function requestPersist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}

export async function listSnapshots() {
  const all = await tx('readonly', (s) => s.getAll());
  return all.map(({ id, at, counts, reason }) => ({ id, at, counts, reason })).sort((a, b) => (a.id < b.id ? 1 : -1));
}

export async function snapshot(reason = 'daily') {
  const data = { at: new Date().toISOString(), reason };
  for (const s of STORES) data[s] = await getAll(s);
  data.settings = await entries('settings');
  data.counts = { tasks: data.tasks.length, events: data.events.length, journal: data.journal.length };
  data.id = reason === 'daily' ? `${todayKey()}` : `${todayKey()}-${reason}-${Date.now()}`;
  await tx('readwrite', (s) => s.put(data));
  const list = await listSnapshots();
  for (const old of list.slice(KEEP)) await tx('readwrite', (s) => s.delete(old.id));
  return data.counts;
}

// Bản sao của hôm nay được làm mới mỗi lần gọi (30 phút/lần); bản các ngày trước giữ nguyên.
export async function dailySnapshot() {
  const hasData = (await getAll('tasks')).length || (await getAll('events')).length;
  return hasData ? snapshot('daily') : null;
}

export async function restoreSnapshot(id) {
  const snap = await tx('readonly', (s) => s.get(id));
  if (!snap) throw new Error('Không tìm thấy bản sao.');
  await snapshot('truoc-khoi-phuc'); // để còn quay lại nếu chọn nhầm
  for (const s of [...STORES, 'settings']) await clearStore(s);
  for (const s of STORES) for (const r of snap[s] ?? []) await put(s, r);
  for (const [k, v] of snap.settings ?? []) await put('settings', v, k);
  return snap.counts;
}
