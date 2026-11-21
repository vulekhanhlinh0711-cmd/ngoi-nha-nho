// P0.06: xuất / nhập toàn bộ dữ liệu ra file JSON (ảnh được chuyển thành chuỗi base64).
import { getAll, put, clearStore, entries, setSetting, getSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';

const APP = 'ngoi-nha-nho';
const VERSION = 2;
const STORES = ['tasks', 'events', 'journal', 'finance'];

const blobToDataUrl = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsDataURL(blob);
});
const dataUrlToBlob = async (url) => (await fetch(url)).blob();

export async function exportData() {
  await setSetting('lastBackup', new Date().toISOString());
  const data = { app: APP, version: VERSION, exportedAt: new Date().toISOString() };
  for (const s of STORES) data[s] = await getAll(s);
  data.settings = await entries('settings');
  data.photos = await Promise.all((await getAll('photos')).map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob) })));
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ngoi-nha-nho-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  notifyChange();
  return { tasks: data.tasks.length, events: data.events.length, journal: data.journal.length, photos: data.photos.length };
}

// Ghi đè toàn bộ dữ liệu hiện tại bằng nội dung file.
export async function importData(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('File không đọc được (không phải JSON).');
  }
  if (data?.app !== APP || !Array.isArray(data.tasks) || !Array.isArray(data.events) || !Array.isArray(data.settings)) {
    throw new Error('Đây không phải file sao lưu của Ngôi nhà nhỏ.');
  }
  if (data.version > VERSION) throw new Error('File được tạo bởi phiên bản mới hơn của app.');

  for (const s of [...STORES, 'settings', 'photos']) await clearStore(s);
  for (const s of STORES) for (const r of data[s] ?? []) await put(s, r);
  for (const [k, v] of data.settings) await put('settings', v, k);
  for (const p of data.photos ?? []) await put('photos', { ...p, blob: await dataUrlToBlob(p.blob) });
  notifyChange();
  return { tasks: data.tasks.length, events: data.events.length, journal: data.journal?.length ?? 0, photos: data.photos?.length ?? 0 };
}

export const lastBackup = () => getSetting('lastBackup');
