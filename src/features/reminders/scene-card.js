// P25: thẻ Cài đặt "Bối cảnh màn hình".
import { h } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { photoUrl } from '../../core/photos.js';
import { SCENE_GROUPS, getScenes, importScenes, assignScene, toggleScenes, clearScenes, BUNDLED } from '../../core/scenes.js';

export async function sceneCard() {
  const s = await getScenes();
  const urls = Object.fromEntries(await Promise.all(s.pool.map(async (p) => [p.id, await photoUrl(p.id)])));
  const status = h('span', { class: 'muted small' });
  const picker = (multipleDir) => h('label', { class: multipleDir ? 'btn file-chip' : 'chip file-chip' },
    multipleDir ? '📁 Thêm tranh từ một thư mục' : '🖼 Thêm vài ảnh…',
    h('input', {
      type: 'file', accept: 'image/*,.avif,.webp', multiple: true, hidden: true, ...(multipleDir ? { webkitdirectory: true } : {}),
      onchange: async (e) => {
        const files = e.target.files;
        if (!files?.length) return;
        status.textContent = 'Đang nhập ảnh…';
        const r = await importScenes(files, (i, n) => { status.textContent = `Đang nhập ${i}/${n}…`; });
        toast(`Đã có ${r.total} tranh. Mỗi màn đã được gán một bối cảnh.`);
      },
    }));
  return h('section', { class: 'card scene-card' },
    h('div', { class: 'card-head' }, h('h3', {}, '🖼 Bối cảnh màn hình'),
      h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', checked: s.on, onchange: (e) => toggleScenes(e.target.checked) }), 'Bật')),
    h('p', { class: 'muted small' }, 'Mỗi màn hình có sẵn một bức tranh làm bối cảnh chính (có trên mọi máy). Muốn đổi: chọn ảnh khác bên dưới — ảnh bạn tự chọn chỉ lưu trên máy này.'),
    h('div', { class: 'presets' }, picker(true), picker(false), status),
    h('div', { class: 'scene-grid' }, SCENE_GROUPS.map(([g, label]) => h('div', { class: 'scene-slot' },
      h('div', { class: 'scene-thumb', style: `background-image:url("${(s.map[g] && urls[s.map[g]]) || BUNDLED[g]}")` }, h('b', {}, label)),
      s.pool.length ? h('select', {
        class: 'input', 'aria-label': `Bối cảnh cho ${label}`, onchange: (e) => assignScene(g, e.target.value ? Number(e.target.value) : null),
      }, h('option', { value: '' }, '⭐ Tranh có sẵn'), s.pool.map((p, i) => h('option', { value: p.id, selected: s.map[g] === p.id }, `${i + 1}. ${p.name.slice(0, 34)}`))) : null))),
    s.pool.length ? h('button', { class: 'chip danger', onclick: async () => { if (confirm('Xóa toàn bộ tranh bối cảnh khỏi máy này?')) await clearScenes(); } }, '🗑 Xóa các tranh') : null);
}
