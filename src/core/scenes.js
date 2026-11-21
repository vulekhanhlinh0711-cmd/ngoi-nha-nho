// P25: "Bối cảnh" — mỗi nhóm màn hình có một bức tranh làm nền (theo redesign-skill của Open Design:
// nền trống thì đặt ảnh chất lượng cao, phủ mờ/che bớt để tạo chiều sâu).
// Tranh do BẠN chọn từ máy (thư mục "Mẫu thiết kế"); lưu trong trình duyệt (bảng photos), KHÔNG đưa lên web công khai.
import { getSetting, setSetting } from './db.js';
import { savePhoto, deletePhoto, photoUrl } from './photos.js';
import { notifyChange } from './events.js';

export const SCENE_GROUPS = [
  ['today', 'Hôm nay'], ['inbox', 'Inbox'], ['tasks', 'Việc'], ['focus', 'Tập trung'], ['health', 'Sức khỏe'],
  ['learn', 'Học'], ['journal', 'Nhật ký'], ['finance', 'Tài chính'], ['home', 'Nhà & vườn'],
];
// Gợi ý tự gán theo tên file trong thư mục "Mẫu thiết kế" (chọn tranh hợp với không khí từng màn).
const SUGGEST = {
  today: 'sunlit-anime-haven-stockcake',
  inbox: 'ac4e9b85-f58b-434f-b756-226b1a2bdd8d',
  tasks: '612558cbe853a8cae1f2cd3a4bd1ef70',
  focus: 'lofi-anime-style-illustration-cozy-room',
  health: 'bc8450ca1a906234e889fabb85f173b2',
  learn: 'sunlit-manga-haven-stockcake',
  journal: 'cozy-home-interior-anime-style_23-2151176373',
  finance: 'images (3)',
  home: '3cdd7e468787870332a5462dcf1cf882',
};

export async function getScenes() { return { on: true, map: {}, pool: [], ...((await getSetting('scenes')) ?? {}) }; }
const save = async (s) => { await setSetting('scenes', s); notifyChange(); };

// Nhập nhiều ảnh: lưu vào kho, tự gán ảnh hợp nhất cho từng màn còn trống.
export async function importScenes(files, onProgress) {
  const s = await getScenes();
  const imgs = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|avif)$/i.test(f.name));
  let i = 0;
  for (const f of imgs) {
    if (s.pool.some((p) => p.name === f.name)) { i++; continue; }
    try {
      const id = await savePhoto(f, 1920);
      s.pool.push({ id, name: f.name });
    } catch { /* ảnh lỗi định dạng: bỏ qua */ }
    onProgress?.(++i, imgs.length);
  }
  for (const [g] of SCENE_GROUPS) {
    if (s.map[g] && s.pool.some((p) => p.id === s.map[g])) continue;
    const hit = s.pool.find((p) => p.name.startsWith(SUGGEST[g]));
    if (hit) s.map[g] = hit.id;
  }
  s.on = true;
  await save(s);
  return { added: imgs.length, total: s.pool.length };
}
export async function assignScene(group, photoId) { const s = await getScenes(); if (photoId) s.map[group] = photoId; else delete s.map[group]; await save(s); }
export async function toggleScenes(on) { const s = await getScenes(); s.on = on; await save(s); }
export async function clearScenes() {
  const s = await getScenes();
  for (const p of s.pool) await deletePhoto(p.id);
  await save({ on: true, map: {}, pool: [] });
}

// Tranh đóng gói sẵn trong app (từ thư mục "Mẫu thiết kế") — có ngay trên mọi máy.
// Đường dẫn đầy đủ (url() trong biến CSS được tính theo vị trí file CSS, không theo trang).
export const BUNDLED = Object.fromEntries(SCENE_GROUPS.map(([g]) => [g, new URL(`assets/scenes/${g}.jpg`, document.baseURI).href]));
export const sceneUrlFor = async (s, group) => (s.map[group] ? await photoUrl(s.map[group]) : null) ?? BUNDLED[group] ?? null;

// Gắn tranh của nhóm màn hiện tại làm bối cảnh chính.
let shown = null;
export async function applyScene(group) {
  const s = await getScenes();
  const body = document.body;
  // Màn ngoài các nhóm (Thống kê, Cài đặt, Tổng kết, AI) dùng tranh của Hôm nay.
  if (!SCENE_GROUPS.some(([g]) => g === group)) group = 'today';
  body.dataset.scene = group;
  const url = s.on ? await sceneUrlFor(s, group) : null;
  if (!url) { body.classList.remove('has-scene'); shown = null; return; }
  if (shown === url && body.classList.contains('has-scene')) return;
  body.style.setProperty('--scene', `url("${url}")`);
  body.classList.add('has-scene');
  shown = url;
}
