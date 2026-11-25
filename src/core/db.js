// Lớp bọc IndexedDB tối giản (thay Dexie khi chưa có Node).
const DB_NAME = 'ngoi-nha-nho';
// ⚠️ GIỮ DỮ LIỆU NGƯỜI DÙNG: không đổi DB_NAME, không xóa kho; nâng DB_VERSION chỉ để THÊM kho/chỉ mục (xem core/safety.js).
const DB_VERSION = 3; // v2: thêm photos, journal, finance · v3: thêm outbox (hàng chờ đồng bộ)
let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('tasks')) {
        const s = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        s.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        s.createIndex('type', 'type');
        s.createIndex('at', 'at');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      // v2
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('journal')) {
        const s = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
        s.createIndex('day', 'day');
      }
      if (!db.objectStoreNames.contains('finance')) {
        const s = db.createObjectStore('finance', { keyPath: 'id', autoIncrement: true });
        s.createIndex('kind', 'kind');
      }
      // v3 (P23): hàng chờ đồng bộ — khóa "<bảng>|<id>". Chỉ THÊM, không đụng dữ liệu cũ.
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}

export const get = async (name, key) => wrap((await store(name)).get(key));

// ---- P27: bộ nhớ đệm đọc (getAll) — mỗi lần vẽ màn hình gọi getAll nhiều lần; giữ bản trong bộ nhớ,
// xóa khi có ghi/xóa (cả từ tab khác qua BroadcastChannel). Trả bản sao để code gọi không làm hỏng bộ đệm.
const CACHEABLE = new Set(['tasks', 'events', 'journal', 'finance', 'settings']);
const memo = new Map(); // tên bảng → Promise<mảng>
const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nnn-db') : null;
chan?.addEventListener('message', (e) => memo.delete(e.data));
function invalidate(name) { memo.delete(name); chan?.postMessage(name); }
const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

// ---- P23: đồng bộ nhiều máy ----
// Các bảng được đồng bộ; bản ghi mới nhận mã số duy nhất toàn cục (thời gian × 1000 + bộ đếm) thay vì 1, 2, 3…
// để việc tạo trên điện thoại và trên máy tính không bao giờ trùng mã. Dữ liệu cũ giữ nguyên mã cũ.
export const SYNC_STORES = ['tasks', 'events', 'journal', 'finance', 'settings'];
const AUTO_ID = new Set(['tasks', 'events', 'journal', 'finance', 'photos']); // P35: ảnh cũng nhận mã duy nhất để đồng bộ không trùng
const LOCAL_ONLY_SETTINGS = new Set(['sync', 'syncSession', 'syncMeta']);
let idSeq = 0;
export const newId = () => Date.now() * 1000 + (idSeq++ % 1000);
let syncOn = false; // bật khi đã đăng nhập đồng bộ
let onLocalChange = null;
export function setSyncHooks(enabled, cb) { syncOn = enabled; onLocalChange = cb; }
async function enqueue(name, key) {
  if (!syncOn || !SYNC_STORES.includes(name) || (name === 'settings' && LOCAL_ONLY_SETTINGS.has(key))) return;
  await wrap((await store('outbox', 'readwrite')).put({ store: name, key, at: Date.now() }, `${name}|${key}`));
  onLocalChange?.();
}
export const isLocalOnlySetting = (k) => LOCAL_ONLY_SETTINGS.has(k);

export async function put(name, value, key) {
  if (AUTO_ID.has(name) && value && value.id == null) value.id = newId();
  const k = await wrap((await store(name, 'readwrite')).put(value, key));
  invalidate(name);
  await enqueue(name, k);
  return k;
}
export async function del(name, key) {
  const r = await wrap((await store(name, 'readwrite')).delete(key));
  invalidate(name);
  await enqueue(name, key);
  return r;
}
// Ghi/xóa do đồng bộ kéo về: không đưa lại vào hàng chờ.
export const putRaw = async (name, value, key) => { const r = await wrap((await store(name, 'readwrite')).put(value, key)); invalidate(name); return r; };
export const delRaw = async (name, key) => { const r = await wrap((await store(name, 'readwrite')).delete(key)); invalidate(name); return r; };
export const outboxAll = async () => entries('outbox');
export const outboxRemove = async (k) => wrap((await store('outbox', 'readwrite')).delete(k));
const readAll = async (name) => wrap((await store(name)).getAll());
export async function getAll(name) {
  if (!CACHEABLE.has(name)) return readAll(name);
  if (!memo.has(name)) { const p = readAll(name); memo.set(name, p); p.catch(() => memo.delete(name)); }
  return clone(await memo.get(name));
}
export const getAllByIndex = async (name, index, value) =>
  wrap((await store(name)).index(index).getAll(value));
export const countByIndex = async (name, index, value) =>
  wrap((await store(name)).index(index).count(value));

export const getSetting = (key) => get('settings', key);
export const setSetting = (key, value) => put('settings', value, key);

// Xóa sạch một bảng (nhập file / khôi phục). Khi đang đồng bộ: đánh dấu để lần đẩy sau đồng bộ lại TOÀN BỘ bảng đó.
export const clearStore = async (name) => {
  const r = await wrap((await store(name, 'readwrite')).clear());
  invalidate(name);
  if (syncOn && SYNC_STORES.includes(name)) await wrap((await store('outbox', 'readwrite')).put({ store: name, full: true, at: Date.now() }, `${name}|*`));
  return r;
};

// P47: các cặp [khóa, giá trị] có khóa bắt đầu bằng `prefix` (vd. 'v:' = sổ từ vựng, mỗi từ một dòng).
export async function entriesByPrefix(name, prefix) {
  const s = await store(name);
  const r = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
  const [keys, values] = await Promise.all([wrap(s.getAllKeys(r)), wrap(s.getAll(r))]);
  return keys.map((k, i) => [k, values[i]]);
}

// Cặp [khóa, giá trị] của một bảng (dùng cho sao lưu bảng settings).
export async function entries(name) {
  const s = await store(name);
  const [keys, values] = await Promise.all([wrap(s.getAllKeys()), wrap(s.getAll())]);
  return keys.map((k, i) => [k, values[i]]);
}
