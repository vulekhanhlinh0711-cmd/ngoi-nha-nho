// P35: Album ảnh nhật ký — lưới vuông kiểu Instagram; bấm để xem toàn màn hình / treo lên tường.
import { h, mount } from '../../ui/dom.js';
import { getAll } from '../../core/db.js';
import { photoUrl } from '../../core/photos.js';
import { isLocked, lockScreen } from '../../core/lock.js';
import { notifyChange } from '../../core/events.js';
import { journalHead } from './journal-view.js';
import { lightbox, wallPhotos, WALL_MAX } from './photo-ui.js';

export async function renderJournalAlbum(root) {
  if (await isLocked('journal')) { mount(root, journalHead('journal-album'), lockScreen('journal', 'Nhật ký đang khóa', notifyChange)); return; }
  const entries = (await getAll('journal')).filter((e) => e.photoIds?.length).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const all = [];
  for (const e of entries) for (const id of e.photoIds) all.push({ id, e });
  const items = (await Promise.all(all.map(async (x) => ({ ...x, url: await photoUrl(x.id) })))).filter((x) => x.url);
  const wall = await wallPhotos();
  mount(root,
    journalHead('journal-album'),
    h('section', { class: 'card album-head' },
      h('div', { class: 'album-stats' },
        h('div', {}, h('b', {}, items.length), h('span', {}, 'ảnh')),
        h('div', {}, h('b', {}, entries.length), h('span', {}, 'trang có ảnh')),
        h('div', {}, h('b', {}, `${wall.length}/${WALL_MAX}`), h('span', {}, 'ảnh trên tường'))),
      h('p', { class: 'muted small' }, 'Bấm vào ảnh để xem lớn và chọn “Treo lên tường phòng khách”. Viết nhật ký kèm ảnh ở mục Viết.')),
    items.length
      ? h('div', { class: 'album-grid' }, items.map((it, i) => h('button', {
        class: 'album-cell', 'aria-label': `Ảnh ${i + 1}`, onclick: () => lightbox(items, i, it.e.text ?? ''),
      }, h('img', { src: it.url, alt: '', loading: 'lazy', decoding: 'async' }), wall.includes(it.id) ? h('span', { class: 'ig-wall-badge' }, '🖼️') : null)))
      : h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, '📷'), h('p', {}, 'Chưa có ảnh nào. Viết nhật ký kèm ảnh để lưu lại khoảnh khắc nhé!')));
}
