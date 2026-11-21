// P23: đồng bộ nhiều máy qua Supabase (REST, không cần thư viện).
// - Mỗi bản ghi = 1 dòng trong bảng `items` (user_id, store, id, data, deleted, updated_at), bảo vệ bằng RLS: chỉ chủ tài khoản đọc/ghi.
// - Đẩy: các thay đổi trong hàng chờ (outbox). Kéo: các dòng có updated_at mới hơn lần kéo trước. Ai sửa sau thắng.
// - Máy mới nối vào: nếu máy đã có dữ liệu mà trên mây cũng có → chụp bản sao máy này trước, rồi dùng dữ liệu trên mây.
// URL dự án và "publishable/anon key" là thông tin công khai (giống Client ID) — dữ liệu được bảo vệ bởi đăng nhập + RLS.
import {
  getAll, entries, putRaw, delRaw, outboxAll, outboxRemove, setSyncHooks, clearStore, SYNC_STORES, isLocalOnlySetting,
} from './db.js';
import { notifyChange } from './events.js';

// Dự án Supabase của bạn (URL + publishable key là thông tin công khai; dữ liệu được bảo vệ bằng đăng nhập + RLS).
export const DEFAULT_SYNC = { url: 'https://hgjzcmkojxrqcrirooog.supabase.co', key: 'sb_publishable_MQZBAzKOxMqgQNxsddTLrA_K1EBrBKD' };
const local = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
const saveLocal = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };

export function syncConfig() { const c = local('syncConfig'); return c?.url ? c : DEFAULT_SYNC; }
export const setSyncConfig = (url, key) => saveLocal('syncConfig', { url: url.trim().replace(/\/+$/, ''), key: key.trim() });
const session = () => local('syncSession');
const meta = () => local('syncMeta') ?? { lastPull: null, joined: false };
const setMeta = (m) => saveLocal('syncMeta', m);

export const syncState = { status: 'off', lastSync: null, error: null, email: null };
const emit = () => window.dispatchEvent(new Event('sync-status'));
function set(status, error = null) { syncState.status = status; syncState.error = error; if (status === 'ok') syncState.lastSync = new Date(); emit(); }

// ---------- Xác thực ----------
async function auth(path, body) {
  const { url, key } = syncConfig();
  const res = await fetch(`${url}/auth/v1/${path}`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = data.error_description || data.msg || data.message || `Lỗi ${res.status}`;
    throw new Error(/invalid login/i.test(m) ? 'Sai email hoặc mật khẩu.' : /not confirmed/i.test(m) ? 'Email chưa xác nhận: mở hộp thư, bấm link xác nhận rồi đăng nhập lại.' : /already registered/i.test(m) ? 'Email này đã có tài khoản — hãy bấm Đăng nhập.' : m);
  }
  return data;
}
function keepSession(d) {
  saveLocal('syncSession', { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in - 60) * 1000, email: d.user?.email });
}
export async function signUp(email, password) {
  const d = await auth('signup', { email, password });
  if (d.access_token) { keepSession(d); return 'in'; }
  return 'confirm'; // cần bấm link trong email
}
export async function signIn(email, password) {
  keepSession(await auth('token?grant_type=password', { email, password }));
  await start();
}
export function signOut() {
  saveLocal('syncSession', null); setMeta({ lastPull: null, joined: false });
  setSyncHooks(false, null); stopTimers(); set('off');
}
async function token() {
  const s = session();
  if (!s) throw new Error('Chưa đăng nhập đồng bộ.');
  if (Date.now() < s.exp) return s.access;
  keepSession(await auth('token?grant_type=refresh_token', { refresh_token: s.refresh }));
  return session().access;
}
export const signedInEmail = () => session()?.email ?? null;

// ---------- REST ----------
async function api(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = syncConfig();
  const headers = { apikey: key, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { saveLocal('syncSession', { ...session(), exp: 0 }); throw new Error('Phiên đăng nhập hết hạn.'); }
  if (!res.ok) throw new Error(`Máy chủ đồng bộ lỗi ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return { res, data: res.status === 204 ? null : await res.json().catch(() => null) };
}
const enc = (v) => encodeURIComponent(v);

async function remoteCount() {
  const { res } = await api('items?select=id&deleted=is.false&limit=1', { prefer: 'count=exact' });
  return Number((res.headers.get('content-range') ?? '*/0').split('/')[1]) || 0;
}

// ---------- Đẩy ----------
async function rowsFor(store, keys) {
  const map = new Map(store === 'settings' ? (await entries('settings')).map(([k, v]) => [String(k), v]) : (await getAll(store)).map((v) => [String(v.id), v]));
  return keys.map((k) => { const v = map.get(String(k)); return { store, id: String(k), data: v === undefined ? null : v, deleted: v === undefined }; });
}
async function allLocalRows(store) {
  if (store === 'settings') return (await entries('settings')).filter(([k]) => !isLocalOnlySetting(k)).map(([k, v]) => ({ store, id: String(k), data: v, deleted: false }));
  return (await getAll(store)).map((v) => ({ store, id: String(v.id), data: v, deleted: false }));
}
async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 400) {
    await api('items?on_conflict=user_id,store,id', { method: 'POST', body: rows.slice(i, i + 400), prefer: 'resolution=merge-duplicates,return=minimal' });
  }
}
async function pushAll(store) {
  const rows = await allLocalRows(store);
  const { data } = await api(`items?select=id&store=eq.${enc(store)}&deleted=is.false&limit=100000`);
  const have = new Set(rows.map((r) => r.id));
  const gone = (data ?? []).filter((r) => !have.has(r.id)).map((r) => ({ store, id: r.id, data: null, deleted: true }));
  await upsert([...rows, ...gone]);
}
let pushing = false;
async function push() {
  if (pushing) return;
  pushing = true;
  try {
    const ob = await outboxAll();
    if (!ob.length) return;
    const full = new Set(ob.filter(([, v]) => v.full).map(([, v]) => v.store));
    for (const st of full) await pushAll(st);
    const byStore = new Map();
    for (const [k, v] of ob) if (!v.full && !full.has(v.store)) { if (!byStore.has(v.store)) byStore.set(v.store, []); byStore.get(v.store).push(v.key); }
    for (const [st, keys] of byStore) await upsert(await rowsFor(st, keys));
    for (const [k, v] of ob) { const cur = (await outboxAll()).find(([kk]) => kk === k); if (cur && cur[1].at === v.at) await outboxRemove(k); }
  } finally { pushing = false; }
}

// ---------- Kéo ----------
async function pull() {
  const m = meta();
  // Lùi 10 giây để không sót dòng ghi cùng lúc; áp dụng lại dòng cũ thì vô hại.
  const since = m.lastPull ? new Date(new Date(m.lastPull).getTime() - 10_000).toISOString() : '1970-01-01T00:00:00Z';
  const pending = new Set((await outboxAll()).map(([k]) => k));
  let changed = false;
  let last = m.lastPull;
  for (let page = 0; page < 50; page++) {
    const { data } = await api(`items?select=store,id,data,deleted,updated_at&updated_at=gt.${enc(since)}&order=updated_at.asc&offset=${page * 1000}&limit=1000`);
    for (const r of data ?? []) {
      last = r.updated_at;
      if (!SYNC_STORES.includes(r.store) || pending.has(`${r.store}|${r.id}`) || (r.store === 'settings' && isLocalOnlySetting(r.id))) continue;
      const key = r.store === 'settings' ? r.id : Number(r.id);
      if (r.deleted) await delRaw(r.store, key);
      else if (r.store === 'settings') await putRaw('settings', r.data, key);
      else await putRaw(r.store, r.data);
      changed = true;
    }
    if (!data || data.length < 1000) break;
  }
  setMeta({ ...meta(), lastPull: last });
  if (changed) notifyChange();
}

// ---------- Vòng đồng bộ ----------
let timer = null; let debounce = null; let running = false;
function stopTimers() { clearInterval(timer); timer = null; }
export async function syncNow() {
  if (!session() || running) return;
  running = true;
  set('syncing');
  try { await push(); await pull(); set('ok'); pushPhotos().catch(() => {}); } catch (e) { set(navigator.onLine === false ? 'offline' : 'error', e.message); } finally { running = false; }
}

// Lần đầu nối máy này vào tài khoản.
async function join() {
  const m = meta();
  if (m.joined) return;
  const remote = await remoteCount();
  const localCount = (await getAll('tasks')).length + (await getAll('events')).length;
  if (remote === 0) {
    // Máy đầu tiên: đưa toàn bộ dữ liệu hiện có lên mây.
    for (const st of SYNC_STORES) await pushAll(st);
  } else if (localCount > 0) {
    const { snapshot } = await import('./safety.js');
    await snapshot('truoc-dong-bo');
    if (!confirm(`Trên mây đã có dữ liệu (${remote} mục). Máy này cũng có dữ liệu riêng.\n\nOK = dùng dữ liệu trên mây cho máy này (dữ liệu hiện tại của máy được cất vào Bản sao tự động, khôi phục được).\nHủy = tạm chưa đồng bộ.`)) {
      signOut();
      throw new Error('Đã hủy đồng bộ trên máy này.');
    }
    setSyncHooks(false, null);
    for (const st of SYNC_STORES) {
      const keep = st === 'settings' ? (await entries('settings')).filter(([k]) => isLocalOnlySetting(k)) : [];
      await clearStore(st);
      for (const [k, v] of keep) await putRaw('settings', v, k);
    }
  }
  setMeta({ lastPull: null, joined: true });
}

export async function start() {
  if (!session() || !syncConfig().url) return;
  syncState.email = signedInEmail();
  set('syncing');
  try {
    await join();
    setSyncHooks(true, () => { clearTimeout(debounce); debounce = setTimeout(syncNow, 1500); });
    await syncNow();
  } catch (e) { set('error', e.message); return; }
  stopTimers();
  timer = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 15_000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
window.addEventListener('online', () => syncNow());

// ---------- P35: ảnh (Supabase Storage, bucket riêng tư "photos/<uid>/<id>.jpg") ----------
function uid() {
  const s = session();
  try { return JSON.parse(atob(s.access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch { return null; }
}
const upKey = 'photosUploaded';
const uploaded = () => new Set(local(upKey) ?? []);
const markUp = (id) => { const u = uploaded(); u.add(String(id)); saveLocal(upKey, [...u]); };
async function storageFetch(path, opts = {}) {
  const { url, key } = syncConfig();
  return fetch(`${url}/storage/v1/${path}`, { ...opts, headers: { apikey: key, Authorization: `Bearer ${await token()}`, ...(opts.headers ?? {}) } });
}
export async function uploadPhoto(id, blob) {
  if (!session() || !syncConfig().url) return false;
  const u = uid(); if (!u) return false;
  const res = await storageFetch(`object/photos/${u}/${id}.jpg`, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob });
  if (res.ok) { markUp(id); return true; }
  return false;
}
export async function downloadPhoto(id) {
  if (!session() || !syncConfig().url) return null;
  const u = uid(); if (!u) return null;
  const res = await storageFetch(`object/authenticated/photos/${u}/${id}.jpg`);
  if (!res.ok) return null;
  const blob = await res.blob();
  await putRaw('photos', { id: Number(id), blob, at: new Date().toISOString() });
  markUp(id);
  return blob;
}
export async function deleteRemotePhoto(id) {
  if (!session()) return;
  const u = uid(); if (!u) return;
  await storageFetch(`object/photos/${u}/${id}.jpg`, { method: 'DELETE' }).catch(() => {});
}
// Đẩy các ảnh chưa đồng bộ (gọi trong vòng đồng bộ, tối đa vài ảnh mỗi lượt để không nặng máy).
let pushingPhotos = false;
async function pushPhotos() {
  if (pushingPhotos) return; pushingPhotos = true;
  try {
    const up = uploaded();
    const pending = (await getAll('photos')).filter((p) => !up.has(String(p.id)));
    for (const p of pending.slice(0, 5)) await uploadPhoto(p.id, p.blob);
  } finally { pushingPhotos = false; }
}
