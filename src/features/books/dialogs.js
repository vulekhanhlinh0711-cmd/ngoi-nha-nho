// P48: các hộp thoại của góc đọc sách. Dùng <dialog> gắn vào body nên việc vẽ lại màn hình (đồng bộ…) không làm mất chữ đang gõ.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange, logEvent } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { savePhoto, photoUrl } from '../../core/photos.js';
import { previewStrip, lightbox } from '../journal/photo-ui.js';
import {
  STATUS, NOTE_TYPES, TEMPLATES, saveBook, findBooks, logReading, setStatus, saveNote, allNotes, allBooks, dueNotes, answerRecall, cueOf, parseOutline, unitName, RECALL_DAYS,
} from './books.js';

export function sheet(title, { dirty = () => false, cls = '' } = {}) {
  const body = h('div', { class: 'bk-body' });
  const tryClose = () => { if (!dirty() || confirm('Bỏ nội dung chưa lưu?')) dlg.close(); };
  const dlg = h('dialog', { class: `bk-dialog ${cls}`, 'aria-label': title },
    h('header', { class: 'bk-head' }, h('h3', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', onclick: tryClose }, '✕')), body);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); tryClose(); });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
  return { dlg, body };
}
const field = (label, input, hint) => h('label', { class: 'bk-field' }, h('span', {}, label), input, hint ? h('small', {}, hint) : null);
const int = (v) => { const m = /\d+/.exec(String(v ?? '').replace(/[.,\s](?=\d{3}\b)/g, '')); return m ? Number(m[0]) : 0; };

// ---- thêm / sửa sách ----
export function bookDialog(b = null) {
  const { dlg, body } = sheet(b ? 'Sửa thông tin sách' : 'Thêm sách');
  let file = null; let remote = null;
  const err = h('p', { class: 'bk-err', role: 'alert' });
  const cover = h('div', { class: 'bk-cover big' }, '📕');
  const setCover = (src) => mount(cover, src ? h('img', { src, alt: '' }) : '📕');
  if (b?.coverId) photoUrl(b.coverId).then((u) => u && !file && !remote && setCover(u));
  const found = h('div', { class: 'bk-found', 'aria-live': 'polite' });
  const title = h('input', { class: 'input', name: 'title', value: b?.title ?? '', required: true, maxlength: '160', autocomplete: 'off', placeholder: 'VD: Nhà giả kim' });
  const author = h('input', { class: 'input', name: 'author', value: b?.author ?? '', maxlength: '120', autocomplete: 'off' });
  const total = h('input', { class: 'input', name: 'total', value: b?.unit === 'percent' ? (b.pagesTotal || '') : (b?.total || ''), inputmode: 'numeric', autocomplete: 'off', placeholder: 'VD: 228' });
  const search = async () => {
    const q = title.value.trim(); if (!q) { err.textContent = 'Gõ tên sách trước rồi bấm Tìm.'; title.focus(); return; }
    err.textContent = ''; mount(found, h('p', { class: 'small' }, 'Đang tìm…'));
    try {
      const list = await findBooks(q);
      mount(found, list.length ? list.map((x) => h('button', { type: 'button', class: 'bk-hit', onclick: () => { title.value = x.title; author.value = x.author; if (x.pages) total.value = x.pages; remote = x.coverL; file = null; setCover(x.cover); mount(found); } },
        h('span', { class: 'bk-cover mini' }, x.cover ? h('img', { src: x.cover, alt: '', loading: 'lazy' }) : '📕'), h('span', {}, h('b', {}, x.title), h('small', {}, [x.author, x.pages ? `${x.pages} trang` : ''].filter(Boolean).join(' · ')))))
        : h('p', { class: 'small' }, 'Không tìm thấy. Bạn nhập tay và chụp bìa nhé.'));
    } catch { mount(found, h('p', { class: 'small' }, 'Chưa tìm được (mạng hoặc máy chủ bận). Bạn nhập tay nhé.')); }
  };
  const unit = h('select', { class: 'input', name: 'unit' }, h('option', { value: 'page', selected: b?.unit !== 'percent' }, 'Số trang (sách giấy)'), h('option', { value: 'percent', selected: b?.unit === 'percent' }, '% (sách điện tử, sách nói)'));
  mount(body, h('form', { class: 'bk-form', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); const f = e.target.elements;
    if (!title.value.trim()) { err.textContent = 'Nhập tên sách nhé.'; title.focus(); return; }
    const save = e.target.querySelector('[type=submit]'); save.disabled = true;
    let coverId = b?.coverId ?? null;
    try {
      if (remote) { const r = await fetch(remote); if (r.ok) coverId = await savePhoto(await r.blob(), 700); } else if (file) coverId = await savePhoto(file, 900);
    } catch { /* không tải được bìa: lưu sách không bìa, thêm sau */ }
    const percent = unit.value === 'percent'; const pages = int(total.value);
    const patch = { ...(b ? { id: b.id } : {}), title: title.value.trim(), author: author.value.trim(), category: f.category.value.trim(), unit: unit.value, total: percent ? 100 : pages, pagesTotal: percent ? pages : 0, coverId };
    if (b && b.unit !== unit.value) patch.current = b.total ? (percent ? Math.round((b.current / b.total) * 100) : Math.round((b.current / 100) * pages)) : 0;
    else if (patch.total && (b?.current ?? 0) > patch.total) patch.current = patch.total;
    let nb = await saveBook(patch);
    const st = f.status.value; if (st !== (b?.status ?? '')) nb = await setStatus(nb, st);
    dlg.close(); toast(b ? 'Đã lưu thông tin sách' : `📚 Đã thêm “${nb.title}” vào tủ sách`);
  } },
    h('div', { class: 'bk-coverrow' }, cover, h('div', { class: 'presets' },
      h('label', { class: 'chip file-chip' }, '📷 Chụp / chọn bìa', h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { file = e.target.files[0] ?? null; remote = null; if (file) setCover(URL.createObjectURL(file)); } })))),
    field('Tên sách *', title), h('button', { class: 'chip', type: 'button', onclick: search }, '🔎 Tìm bìa, tác giả, số trang'), found,
    field('Tác giả', author),
    h('div', { class: 'bk-two' }, field('Theo dõi bằng', unit), field('Tổng số trang', total)),
    h('div', { class: 'bk-two' }, field('Tình trạng', h('select', { class: 'input', name: 'status' }, Object.entries(STATUS).map(([k, l]) => h('option', { value: k, selected: k === (b?.status ?? 'reading') }, l)))),
      field('Thể loại', h('input', { class: 'input', name: 'category', value: b?.category ?? '', list: 'bk-cats', autocomplete: 'off', placeholder: 'VD: Kỹ năng' }))),
    h('datalist', { id: 'bk-cats' }, ['Kỹ năng', 'Kinh tế – tài chính', 'Tâm lý', 'Văn học', 'Lịch sử', 'Khoa học', 'Sức khỏe', 'Tiếng Anh', 'Tiểu sử'].map((c) => h('option', { value: c }))),
    err, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu')));
  if (!b) title.focus();
}

// ---- cập nhật trang / kết thúc buổi đọc ----
export function progressDialog(b, { minutes = null, onSaved = null } = {}) {
  const { dlg, body } = sheet(minutes == null ? 'Cập nhật tiến độ' : 'Xong buổi đọc');
  const err = h('p', { class: 'bk-err', role: 'alert' });
  const to = h('input', { class: 'input bk-bigin', name: 'to', inputmode: 'numeric', autocomplete: 'off', value: b.current || '', 'aria-label': 'Đã đọc tới' });
  const bump = (n) => { to.value = Math.max(0, b.total ? Math.min(b.total, int(to.value) + n) : int(to.value) + n); };
  mount(body, h('form', { class: 'bk-form', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); const f = e.target.elements; const n = int(to.value); const min = int(f.min.value);
    if (b.total && n > b.total) { err.textContent = `Sách chỉ có ${b.total} ${unitName(b)}. Nếu số trang sai, sửa ở thông tin sách.`; return; }
    if (n < b.current && !confirm(`Lùi từ ${b.current} về ${n}? (chỉ sửa tiến độ, lịch sử đọc giữ nguyên)`)) return;
    if (min > 720) { err.textContent = 'Số phút quá lớn, kiểm tra lại nhé.'; return; }
    const r = await logReading(b, { to: n, minutes: min, day: f.day.value || todayKey() });
    dlg.close(); onSaved?.();
    if (r.finished) { await setStatus(r.book, 'done'); toast(`🎉 Chúc mừng! Bạn đã đọc xong “${b.title}”.`); reviewDialog(r.book); }
    else toast(`📖 Đã ghi${r.pages ? ` ${r.pages} trang` : ''}${min ? ` · ${min} phút` : ''}`, { duration: 8000, actionLabel: '✍️ Ghi ý vừa đọc', onAction: () => noteDialog({ bookId: b.id, page: b.unit === 'page' ? n : null }) });
  } },
    h('p', { class: 'small' }, h('b', {}, b.title), ` · đang ở ${b.current}${b.total ? `/${b.total}` : ''} ${unitName(b)}`),
    field(`Đã đọc tới (${unitName(b)})`, to), h('div', { class: 'presets' }, [1, 5, 10, 20].map((n) => h('button', { class: 'chip', type: 'button', onclick: () => bump(n) }, `+${n}`))),
    h('div', { class: 'bk-two' }, field('Số phút đọc', h('input', { class: 'input', name: 'min', inputmode: 'numeric', autocomplete: 'off', value: minutes ?? '', placeholder: 'tùy chọn' })), field('Ngày', h('input', { class: 'input', name: 'day', type: 'date', value: todayKey(), max: todayKey() }))),
    err, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu')));
  to.focus(); to.select();
}

// ---- đánh giá khi đọc xong ----
export function reviewDialog(b) {
  const { dlg, body } = sheet(`Đọc xong: ${b.title}`); let rating = b.rating ?? 0;
  const stars = h('div', { class: 'bk-stars', role: 'radiogroup', 'aria-label': 'Đánh giá' });
  const draw = () => mount(stars, [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(n === rating), 'aria-label': `${n} sao`, class: n <= rating ? 'on' : '', onclick: () => { rating = n; draw(); } }, '★')));
  draw();
  mount(body, h('form', { class: 'bk-form', onsubmit: async (e) => { e.preventDefault(); await saveBook({ id: b.id, rating, review: e.target.elements.r.value.trim() }); dlg.close(); toast('Đã lưu cảm nhận'); } },
    stars, field('Điều đọng lại lớn nhất với bạn', h('textarea', { class: 'input', name: 'r', rows: '4' }, b.review ?? '')),
    h('div', { class: 'presets' }, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu'), h('button', { class: 'chip', type: 'button', onclick: () => { dlg.close(); noteDialog({ bookId: b.id, type: 'outline', text: TEMPLATES[2][1] }); } }, '🗂️ Viết dàn ý cả sách'))));
}

// ---- ghi chú: ý tâm đắc / dàn ý / áp dụng, kèm ảnh ----
const DKEY = 'bnoteDraft';
const draftOf = () => { try { return JSON.parse(localStorage.getItem(DKEY) ?? 'null'); } catch { return null; } };
const setDraft = (d) => { try { if (d) localStorage.setItem(DKEY, JSON.stringify(d)); else localStorage.removeItem(DKEY); } catch { /* bỏ qua */ } };
export async function noteDialog(n = {}) {
  const books = (await allBooks()); const editing = !!n.id;
  const d = editing ? null : draftOf();
  const useDraft = d && d.text && d.bookId === n.bookId && !n.text;
  let type = n.type ?? (useDraft ? d.type : 'quote'); let keep = [...(n.photoIds ?? [])]; let files = []; let changed = false; let saved = false;
  const start = n.text ?? (useDraft ? d.text : '');
  const { dlg, body } = sheet(editing ? 'Sửa ghi chú' : 'Ghi lại điều đáng nhớ', { cls: 'wide', dirty: () => changed && !saved });
  const err = h('p', { class: 'bk-err', role: 'alert' });
  const text = h('textarea', { class: 'input bk-text', name: 'text', rows: '7', 'aria-label': 'Nội dung', oninput: () => { changed = true; if (!editing) setDraft({ bookId: bookSel.value ? Number(bookSel.value) : null, type, text: text.value }); } }, start);
  const bookSel = h('select', { class: 'input', name: 'book' }, books.map((b) => h('option', { value: b.id, selected: b.id === n.bookId }, b.title)));
  const tabs = h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Loại ghi chú' });
  const tools = h('div', { class: 'presets bk-tools' });
  const photos = h('div', { class: 'bk-photos' });
  // Thụt / lùi các dòng đang chọn (cho dàn ý).
  const indent = (dir) => {
    const v = text.value; const a = v.lastIndexOf('\n', text.selectionStart - 1) + 1; let z = v.indexOf('\n', text.selectionEnd); if (z < 0) z = v.length;
    const out = v.slice(a, z).split('\n').map((l) => (dir > 0 ? `  ${l}` : l.replace(/^ {1,2}|^\t/, ''))).join('\n');
    text.setRangeText(out, a, z, 'end'); text.focus(); changed = true;
  };
  text.addEventListener('keydown', (e) => {
    if (type !== 'outline') return;
    if (e.key === 'Tab') { e.preventDefault(); indent(e.shiftKey ? -1 : 1); }
    if (e.key === 'Enter' && !e.isComposing) { const v = text.value; const a = v.lastIndexOf('\n', text.selectionStart - 1) + 1; const pad = /^\s*/.exec(v.slice(a, text.selectionStart))[0]; if (pad) { e.preventDefault(); text.setRangeText(`\n${pad}`, text.selectionStart, text.selectionEnd, 'end'); text.dispatchEvent(new Event('input')); } }
  });
  const drawTabs = () => {
    mount(tabs, Object.entries(NOTE_TYPES).map(([k, t]) => h('button', { type: 'button', class: `chip${k === type ? ' on' : ''}`, role: 'radio', 'aria-checked': String(k === type), onclick: () => { type = k; drawTabs(); } }, `${t.icon} ${t.name}`)));
    text.placeholder = NOTE_TYPES[type].hint;
    mount(tools, type === 'outline' ? [
      h('button', { type: 'button', class: 'chip', onclick: () => indent(1), title: 'Thụt vào thành ý con' }, '→ Ý con'), h('button', { type: 'button', class: 'chip', onclick: () => indent(-1) }, '← Ý cha'),
      TEMPLATES.map(([name, t]) => h('button', { type: 'button', class: 'chip', onclick: () => { if (text.value.trim() && !confirm('Chèn mẫu vào cuối nội dung?')) return; text.value = text.value.trim() ? `${text.value.trimEnd()}\n${t}` : t; text.dispatchEvent(new Event('input')); text.focus(); } }, `📄 ${name}`)),
    ] : type === 'apply' ? h('p', { class: 'small' }, 'Lưu xong, bạn bấm “→ Đưa vào Inbox” để biến ý này thành việc cần làm.') : []);
  };
  const drawPhotos = async () => {
    const olds = (await Promise.all(keep.map(async (id) => ({ id, url: await photoUrl(id) }))));
    mount(photos, olds.length ? h('div', { class: 'ig-preview' }, olds.map((p) => h('div', { class: 'ig-prev-item' }, p.url ? h('img', { src: p.url, alt: 'Ảnh đã lưu' }) : h('span', {}, '🖼️'), h('button', { class: 'ig-prev-x', type: 'button', 'aria-label': 'Bỏ ảnh này', onclick: () => { keep = keep.filter((x) => x !== p.id); changed = true; drawPhotos(); } }, '✕')))) : null,
      files.length ? previewStrip(files, (i) => { files.splice(i, 1); drawPhotos(); }) : null);
  };
  const pick = (e) => { files.push(...e.target.files); e.target.value = ''; changed = true; drawPhotos(); };
  mount(body, h('form', { class: 'bk-form', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); const t = text.value.trimEnd();
    if (!t.trim() && !keep.length && !files.length) { err.textContent = 'Viết vài chữ hoặc thêm ảnh nhé.'; text.focus(); return; }
    const bookId = Number(bookSel.value); if (!bookId) { err.textContent = 'Chọn sách cho ghi chú này.'; return; }
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Đang lưu…';
    const ids = [...keep]; let bad = 0;
    for (const f of files) { try { ids.push(await savePhoto(f, 1800)); } catch { bad++; } }
    await saveNote({ ...(editing ? { id: n.id } : {}), bookId, type, text: t, photoIds: ids, page: int(e.target.elements.page.value) || null });
    saved = true; if (!editing) setDraft(null); dlg.close();
    toast(bad ? `Đã lưu, nhưng ${bad} ảnh không đọc được` : editing ? 'Đã lưu ghi chú' : '✨ Đã lưu. App sẽ nhắc bạn nhớ lại sau 1 ngày.');
  } },
    tabs, useDraft ? h('p', { class: 'small' }, '↩︎ Đã khôi phục bản nháp chưa lưu.') : null,
    h('div', { class: 'presets' },
      h('label', { class: 'chip file-chip' }, '📷 Chụp trang sách', h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: pick })),
      h('label', { class: 'chip file-chip' }, '🖼️ Chọn từ thư viện', h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: pick }))),
    photos, tools, text,
    h('div', { class: 'bk-two' }, field('Sách', bookSel), field('Trang', h('input', { class: 'input', name: 'page', inputmode: 'numeric', autocomplete: 'off', value: n.page ?? '', placeholder: 'tùy chọn' }))),
    err, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu ghi chú')));
  drawTabs(); drawPhotos();
  if (!matchMedia('(pointer: coarse)').matches) text.focus();
}

// Hiển thị nội dung theo loại (dàn ý thành cây thụt lề).
export function noteBody(n) {
  if (!n.text) return null;
  if (n.type === 'outline') return h('ul', { class: 'bk-outline' }, parseOutline(n.text).map((o) => h('li', { class: `d${o.depth}`, style: `--d:${o.depth}` }, o.text)));
  return h(n.type === 'quote' ? 'blockquote' : 'p', { class: 'bk-notetext' }, n.text);
}

// ---- Nhớ lại: xem gợi ý → tự nhớ → mở đáp án → tự chấm ----
export async function recallSession(list = null) {
  const notes = (list ?? dueNotes(await allNotes())).slice(0, 15); if (!notes.length) return;
  const books = new Map((await allBooks()).map((b) => [b.id, b]));
  let i = 0; let ok = 0; let done = 0;
  const { dlg, body } = sheet('Nhớ lại điều đã đọc', { cls: 'wide' });
  dlg.addEventListener('close', async () => { if (done) { await logEvent('book_recall', { n: done, ok, day: todayKey() }); notifyChange(); } });
  const step = async () => {
    if (i >= notes.length) {
      mount(body, h('div', { class: 'bk-end' }, h('div', { class: 'bk-bigicon' }, '🧠'), h('h3', {}, `Đã ôn ${done} ghi chú`), h('p', {}, `Nhớ được ${ok}/${done}. Những ý chưa nhớ sẽ quay lại vào ngày mai.`), h('button', { class: 'btn', onclick: () => dlg.close() }, 'Xong')));
      return;
    }
    const n = notes[i]; const b = books.get(n.bookId); const cue = cueOf(n);
    const pics = (await Promise.all((n.photoIds ?? []).map(async (id) => ({ id, url: await photoUrl(id) })))).filter((p) => p.url);
    const answer = h('div', { class: 'bk-answer', hidden: true }, noteBody(n), pics.length ? h('div', { class: 'bk-thumbs' }, pics.map((p, k) => h('button', { type: 'button', 'aria-label': 'Xem ảnh', onclick: () => lightbox(pics, k) }, h('img', { src: p.url, alt: 'Ảnh ghi chú' })))) : null);
    const acts = h('div', { class: 'presets center' });
    const rate = async (good) => { acts.querySelectorAll('button').forEach((x) => { x.disabled = true; }); await answerRecall(n, good); done++; if (good) ok++; i++; step(); };
    mount(acts, h('button', { class: 'btn', onclick: () => { answer.hidden = false; mount(acts, h('button', { class: 'chip', onclick: () => rate(false) }, '😅 Quên mất (mai ôn lại)'), h('button', { class: 'btn', onclick: () => rate(true) }, '✓ Mình nhớ')); } }, 'Xem đáp án'));
    mount(body, h('p', { class: 'small' }, `${i + 1}/${notes.length}`), h('div', { class: 'bk-recall' },
      h('p', { class: 'small' }, `${NOTE_TYPES[n.type].icon} ${NOTE_TYPES[n.type].name} · ${b?.title ?? 'Sách đã xóa'}${n.page ? ` · trang ${n.page}` : ''}`),
      h('p', { class: 'bk-cue' }, cue || (pics.length ? '🖼️ Bạn đã chụp một trang sách ở đây…' : '…')),
      h('p', { class: 'small' }, n.type === 'outline' ? 'Thử kể lại các ý con trong đầu hoặc viết nháp:' : n.type === 'apply' ? 'Bạn đã định áp dụng điều gì? Đã làm chưa?' : 'Thử nhớ lại trọn ý trước khi xem:'),
      h('textarea', { class: 'input', rows: '3', placeholder: 'Viết nháp điều bạn nhớ (không lưu lại)', 'aria-label': 'Viết nháp' }), answer, acts));
  };
  step();
}
export const recallText = (n) => `nhắc lại ${n.recall ? `mức ${n.recall.lvl + 1}/${RECALL_DAYS.length}` : ''}`;
