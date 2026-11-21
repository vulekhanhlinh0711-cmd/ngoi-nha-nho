// P16.01: hồ sơ — tên gọi, ảnh đại diện (ảnh tải lên, lưu trên máy) hoặc hình vẽ mặc định với màu nơ tùy chọn.
import { h } from '../ui/dom.js';
import { getSetting, setSetting } from './db.js';
import { photoUrl, savePhoto, deletePhoto } from './photos.js';
import { notifyChange } from './events.js';
import { girlSvg, girl3dSvg } from '../features/home/girl.js';

export const BOW_COLORS = ['#ee7a6e', '#e85d8a', '#a98bd6', '#6fa3f2', '#5fb98a', '#f2b34a'];

export async function getProfile() {
  return { name: (await getSetting('profileName')) ?? '', bow: BOW_COLORS[0], photoId: null, style: 'photo', ...((await getSetting('profile')) ?? {}) };
}
async function saveProfile(patch) {
  await setSetting('profile', { ...((await getSetting('profile')) ?? {}), ...patch });
  notifyChange();
}
export const setBow = (bow) => saveProfile({ bow });
export const setStyle = (style) => saveProfile({ style });
export async function setPhoto(file) {
  const old = (await getProfile()).photoId;
  const id = await savePhoto(file);
  if (old) await deletePhoto(old);
  await saveProfile({ photoId: id });
}
export async function clearPhoto() {
  const old = (await getProfile()).photoId;
  if (old) await deletePhoto(old);
  await saveProfile({ photoId: null });
}

export async function avatarEl(cls = '') {
  const p = await getProfile();
  // Không có ảnh đại diện riêng → dùng phần đầu của ảnh nhân vật 3D (nếu đã tải).
  const charMain = p.photoId ? null : (await getSetting('charImages'))?.main;
  // P32: mặc định = ảnh 3D có sẵn (khuôn mặt nhân vật chính).
  const bundled = new URL('assets/character/avatar.jpg', document.baseURI).href;
  const url = p.photoId ? await photoUrl(p.photoId) : charMain ? await photoUrl(charMain) : p.style === 'photo' ? bundled : null;
  const hat = document.documentElement.dataset.season === 'noel';
  return h('span', { class: `pfp ${cls}`, role: 'img', 'aria-label': 'Ảnh đại diện' },
    url ? h('img', { src: url, alt: '', class: charMain ? 'from-char' : null }) : p.style === 'bow' ? girlSvg({ bow: p.bow, hat }) : girl3dSvg({ hat }));
}
export const LOOKS = [['blue', 'Sơ mi xanh · quần trắng'], ['pink', 'Sơ mi kẻ hồng · jean'], ['wine', 'Polo đỏ đô · jean']];
export const lookUrl = (k) => new URL(`assets/character/look-${k}.jpg`, document.baseURI).href;
