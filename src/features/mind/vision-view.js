// P46: Vision board — ảnh / thẻ chữ theo lĩnh vực cuộc sống, đánh dấu "đã đạt", chế độ ngắm toàn màn hình.
// Dữ liệu: cài đặt 'vision' { year, items: [{ id, area, text, photoId?, color?, done? }] }; ảnh lưu như ảnh nhật ký (đồng bộ).
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { savePhoto, photoUrl, deletePhoto } from '../../core/photos.js';

export const AREAS = [
  ['career', '💼 Sự nghiệp'], ['money', '💰 Tài chính'], ['health', '💪 Sức khỏe'], ['love', '💞 Tình yêu & gia đình'],
  ['learn', '📚 Học tập'], ['travel', '✈️ Du lịch'], ['home', '🏡 Ngôi nhà'], ['self', '🌸 Bản thân'],
];
const COLORS = ['#f9d5e5', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fecaca', '#fed7aa'];
const areaName = (id) => AREAS.find((a) => a[0] === id)?.[1] ?? '✨ Khác';

async function getVision() { return { year: new Date().getFullYear() + 1, items: [], ...((await getSetting('vision')) ?? {}) }; }
const saveVision = async (v) => { await setSetting('vision', v); notifyChange(); };

let filter = 'all';
let addKind = 'photo';
let pendingFile = null;

// Chế độ ngắm: trình chiếu toàn màn hình, tự chuyển 6 giây.
function slideshow(items) {
  if (!items.length) return;
  let i = 0; let timer = null;
  const img = h('img', { class: 'vs-img', alt: '' });
  const card = h('div', { class: 'vs-text' });
  const cap = h('p', { class: 'vs-cap' });
  const area = h('span', { class: 'vs-area' });
  const show = () => {
    const it = items[i];
    img.hidden = !it.url; card.hidden = !!it.url;
    if (it.url) img.src = it.url; else { card.textContent = it.text; card.style.background = it.color ?? COLORS[0]; }
    cap.textContent = it.url ? it.text ?? '' : '';
    area.textContent = `${areaName(it.area)}${it.done ? ' · ✨ Đã đạt' : ''}`;
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  const dlg = h('dialog', { class: 'lightbox vision-show', 'aria-label': 'Ngắm vision board' },
    h('button', { class: 'lb-close', 'aria-label': 'Đóng', onclick: () => dlg.close() }, '✕'),
    h('button', { class: 'lb-nav prev', 'aria-label': 'Trước', onclick: () => go(-1) }, '‹'),
    img, card,
    h('button', { class: 'lb-nav next', 'aria-label': 'Sau', onclick: () => go(1) }, '›'),
    h('div', { class: 'lb-bar' }, area, cap));
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  dlg.addEventListener('close', () => { clearInterval(timer); dlg.remove(); });
  document.body.append(dlg); dlg.showModal(); show();
  timer = setInterval(() => go(1), 6000);
}

export async function renderVision(root) {
  const v = await getVision();
  const items = await Promise.all(v.items.map(async (it) => ({ ...it, url: it.photoId ? await photoUrl(it.photoId) : null })));
  const shown = filter === 'all' ? items : items.filter((it) => it.area === filter);
  const doneN = v.items.filter((x) => x.done).length;
  const err = h('p', { class: 'form-err', role: 'alert' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { pendingFile = e.target.files?.[0] ?? null; notifyChange(); } });

  const update = async (id, patch) => { const vv = await getVision(); vv.items = vv.items.map((x) => (x.id === id ? { ...x, ...patch } : x)); await saveVision(vv); };

  mount(root,
    h('div', { class: 'view-head' }, subnav('health', 'vision'), h('h2', {}, `🌈 Vision board ${v.year}`)),
    h('section', { class: 'card' },
      h('div', { class: 'toolbar vision-bar' },
        h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Lọc theo lĩnh vực' },
          h('button', { class: `chip${filter === 'all' ? ' on' : ''}`, onclick: () => { filter = 'all'; notifyChange(); } }, `Tất cả (${items.length})`),
          AREAS.filter(([id]) => items.some((x) => x.area === id)).map(([id, l]) => h('button', { class: `chip${filter === id ? ' on' : ''}`, onclick: () => { filter = filter === id ? 'all' : id; notifyChange(); } }, l))),
        h('div', { class: 'presets' },
          items.length ? h('button', { class: 'btn', onclick: () => slideshow(shown) }, '▶ Ngắm board') : null,
          h('label', { class: 'field-inline small' }, 'Năm', h('input', { class: 'input num', inputmode: 'numeric', value: String(v.year), 'aria-label': 'Năm của vision board', onchange: async (e) => { const y = Number(e.target.value); if (y > 2000 && y < 2100) { const vv = await getVision(); vv.year = y; await saveVision(vv); } } })))),
      items.length ? h('p', { class: 'muted small' }, `✨ Đã đạt ${doneN}/${items.length} điều. Mỗi sáng ngắm board 1 phút, cảm nhận như đã có được.`) : null,

      shown.length ? h('div', { class: 'vision-grid' }, shown.map((it, i) => h('figure', { class: `vision-item${it.url ? '' : ' text'}${it.done ? ' done' : ''}`, style: it.url ? '' : `background:${it.color ?? COLORS[i % COLORS.length]}` },
        it.url ? h('button', { class: 'vi-open', 'aria-label': 'Xem lớn', onclick: () => slideshow([it]) }, h('img', { src: it.url, alt: it.text || 'Ảnh vision board', loading: 'lazy' })) : h('blockquote', {}, it.text),
        it.url && it.text ? h('figcaption', {}, it.text) : null,
        h('span', { class: 'vi-area' }, areaName(it.area)),
        it.done ? h('span', { class: 'vi-done', title: 'Đã đạt' }, '✨') : null,
        h('div', { class: 'vi-actions' },
          h('button', { class: 'chip', title: it.done ? 'Bỏ đánh dấu' : 'Đánh dấu đã đạt', onclick: async () => { await update(it.id, { done: !it.done }); if (!it.done) { await logEvent('vision_achieved', { day: todayKey() }); toast('✨ Chúc mừng! Một điều ước đã thành hiện thực.'); } } }, it.done ? '↺' : '✨ Đã đạt'),
          h('button', { class: 'icon-btn', 'aria-label': 'Xóa', onclick: async () => {
            if (!confirm('Gỡ mục này khỏi vision board?')) return;
            const vv = await getVision(); vv.items = vv.items.filter((x) => x.id !== it.id); await saveVision(vv);
            if (it.photoId) deletePhoto(it.photoId).catch(() => {});
          } }, '✕')))))
        : h('p', { class: 'muted' }, items.length ? 'Chưa có mục nào trong lĩnh vực này.' : 'Board còn trống. Thêm ảnh hoặc câu chữ về cuộc sống bạn mong muốn bên dưới 🌈')),

    h('section', { class: 'card' },
      h('h3', {}, '+ Thêm vào board'),
      h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Loại' },
        [['photo', '🖼️ Ảnh'], ['text', '✍️ Câu chữ']].map(([k, l]) => h('button', { class: `chip${addKind === k ? ' on' : ''}`, onclick: () => { addKind = k; notifyChange(); } }, l))),
      h('form', {
        class: 'debt-form', novalidate: true, onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const text = f.t.value.trim(); const areaId = f.area.value;
          if (addKind === 'photo' && !pendingFile) { err.textContent = 'Chọn một ảnh trước nhé.'; return; }
          if (addKind === 'text' && !text) { err.textContent = 'Viết câu bạn muốn đặt lên board.'; f.t.focus(); return; }
          let photoId = null;
          if (addKind === 'photo') { try { photoId = await savePhoto(pendingFile, 1600); } catch { err.textContent = 'Không đọc được ảnh này, thử ảnh khác nhé.'; return; } }
          pendingFile = null; e.target.reset(); document.activeElement?.blur?.();
          const vv = await getVision();
          vv.items = [...vv.items, { id: Date.now(), area: areaId, text, photoId, color: addKind === 'text' ? COLORS[vv.items.length % COLORS.length] : null }];
          await saveVision(vv);
          toast('🌈 Đã thêm vào vision board');
        },
      },
        addKind === 'photo' ? h('div', { class: 'presets' },
          h('label', { class: 'chip file-chip' }, pendingFile ? `📷 ${pendingFile.name.slice(0, 24)}` : '📷 Chọn ảnh…', fileIn),
          pendingFile ? h('button', { class: 'chip', type: 'button', onclick: () => { pendingFile = null; notifyChange(); } }, 'Bỏ ảnh') : null) : null,
        h('div', { class: 'debt-grid' },
          h('label', { class: 'debt-field' }, h('span', {}, addKind === 'photo' ? 'Chú thích (tùy chọn)' : 'Câu chữ *'),
            h('input', { class: 'input', name: 't', maxlength: '140', placeholder: addKind === 'photo' ? 'VD: Căn hộ có ban công đầy cây' : 'VD: IELTS 7.5 · Tiết kiệm 200 triệu', autocomplete: 'off' })),
          h('label', { class: 'debt-field' }, h('span', {}, 'Lĩnh vực'),
            h('select', { class: 'input', name: 'area' }, AREAS.map(([id, l]) => h('option', { value: id, selected: filter === id }, l))))),
        err,
        h('button', { class: 'btn', type: 'submit' }, '+ Thêm vào board')),
      h('p', { class: 'muted small' }, 'Gợi ý: ảnh nơi bạn muốn đến, căn nhà mơ ước, hình mẫu sức khỏe, con số tiết kiệm, câu nói truyền cảm hứng. Ảnh được đồng bộ riêng tư giữa các máy của bạn.')));
}
