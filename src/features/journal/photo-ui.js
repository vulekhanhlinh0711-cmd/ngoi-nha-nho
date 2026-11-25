// P35: ảnh nhật ký kiểu Instagram — băng chuyền ảnh, xem toàn màn hình, treo ảnh lên tường phòng khách.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { photoUrl } from '../../core/photos.js';

export const WALL_MAX = 6;
export async function wallPhotos() { return (await getSetting('wallPhotos')) ?? []; }
export async function toggleWall(photoId) {
  const list = await wallPhotos();
  const has = list.includes(photoId);
  if (!has && list.length >= WALL_MAX) { toast(`Tường chỉ treo được ${WALL_MAX} ảnh. Gỡ bớt một ảnh trước nhé.`); return false; }
  await setSetting('wallPhotos', has ? list.filter((x) => x !== photoId) : [...list, photoId]);
  toast(has ? 'Đã gỡ ảnh khỏi tường' : '🖼️ Đã treo ảnh lên tường phòng khách');
  notifyChange();
  return !has;
}

// Băng chuyền: vuốt ngang, chấm chỉ số, bấm để phóng to.
export async function carousel(photoIds, caption = '') {
  const items = (await Promise.all(photoIds.map(async (id) => ({ id, url: await photoUrl(id) })))).filter((x) => x.url);
  if (!items.length) {
    return photoIds.length ? h('div', { class: 'ig-missing' }, '🖼️ Ảnh đang được đồng bộ từ máy khác…') : null;
  }
  const wall = await wallPhotos();
  const track = h('div', { class: 'ig-track' }, items.map((it, i) => h('button', {
    class: 'ig-slide', 'aria-label': `Xem ảnh ${i + 1}/${items.length}`, onclick: () => lightbox(items, i, caption),
  }, h('img', { src: it.url, alt: caption ? `Ảnh: ${caption.slice(0, 60)}` : 'Ảnh nhật ký', loading: 'lazy', decoding: 'async' }),
    wall.includes(it.id) ? h('span', { class: 'ig-wall-badge', title: 'Đang treo trên tường' }, '🖼️') : null)));
  const dots = items.length > 1 ? h('div', { class: 'ig-dots', 'aria-hidden': 'true' }, items.map((_, i) => h('span', { class: i ? '' : 'on' }))) : null;
  if (dots) {
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
  }
  return h('div', { class: `ig-carousel${items.length > 1 ? ' multi' : ''}` }, track, dots,
    items.length > 1 ? h('span', { class: 'ig-count' }, `1/${items.length}`) : null);
}

// Xem toàn màn hình: vuốt/phím ← → để chuyển, có nút treo lên tường.
export function lightbox(items, start = 0, caption = '') {
  let i = start;
  const img = h('img', { class: 'lb-img', alt: '' });
  const counter = h('span', { class: 'lb-count' });
  const wallBtn = h('button', { class: 'lb-btn' });
  const dlg = h('dialog', { class: 'lightbox', 'aria-label': 'Xem ảnh' });
  const show = async () => {
    img.src = items[i].url;
    counter.textContent = items.length > 1 ? `${i + 1}/${items.length}` : '';
    const on = (await wallPhotos()).includes(items[i].id);
    wallBtn.textContent = on ? '✓ Đang treo trên tường · Gỡ' : '🖼️ Treo lên tường phòng khách';
    wallBtn.classList.toggle('on', on);
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  wallBtn.addEventListener('click', async () => { await toggleWall(items[i].id); show(); });
  let x0 = null;
  img.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  img.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1); x0 = null; });
  mount(dlg,
    h('button', { class: 'lb-close', 'aria-label': 'Đóng', onclick: () => dlg.close() }, '✕'),
    items.length > 1 ? h('button', { class: 'lb-nav prev', 'aria-label': 'Ảnh trước', onclick: () => go(-1) }, '‹') : null,
    img,
    items.length > 1 ? h('button', { class: 'lb-nav next', 'aria-label': 'Ảnh sau', onclick: () => go(1) }, '›') : null,
    h('div', { class: 'lb-bar' }, counter, caption ? h('p', { class: 'lb-cap' }, caption) : null, wallBtn));
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  show();
}

// Xem trước ảnh vừa chọn (trước khi lưu).
export function previewStrip(files, onRemove) {
  return h('div', { class: 'ig-preview' }, files.map((f, i) => {
    const url = URL.createObjectURL(f);
    return h('div', { class: 'ig-prev-item' },
      h('img', { src: url, alt: '', onload: () => setTimeout(() => URL.revokeObjectURL(url), 1000) }),
      h('button', { class: 'ig-prev-x', type: 'button', 'aria-label': 'Bỏ ảnh này', onclick: () => onRemove(i) }, '✕'));
  }));
}
