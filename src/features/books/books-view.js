// P48: màn Đọc sách — Đang đọc · Tủ sách · Ghi chú · Thói quen; trang chi tiết từng cuốn.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate } from '../../core/dates.js';
import { fmtClock } from '../../core/time.js';
import { get, put } from '../../core/db.js';
import { photoUrl } from '../../core/photos.js';
import { carousel } from '../journal/photo-ui.js';
import {
  STATUS, NOTE_TYPES, allBooks, allNotes, saveBook, saveNote, setStatus, pct, unitName, readingStats, saveGoal, eta, timer, startTimer, pauseTimer, resumeTimer, clearTimer, elapsed, dueNotes, notesAsText,
} from './books.js';
import { bookDialog, progressDialog, noteDialog, reviewDialog, recallSession, noteBody } from './dialogs.js';

let tab = 'now'; let bookId = null; let shelf = 'all'; let shelfQ = '';
const nf = { type: 'all', q: '', show: 15 };
const goBook = (id) => { bookId = id; nf.type = 'all'; nf.q = ''; nf.show = 15; notifyChange(); };
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const viDay = (k) => `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}/${k.slice(0, 4)}`;

async function coverEl(b, cls = '') {
  const url = b.coverId ? await photoUrl(b.coverId) : null;
  return h('span', { class: `bk-cover ${cls}` }, url ? h('img', { src: url, alt: `Bìa ${b.title}`, loading: 'lazy' }) : h('span', { class: 'bk-nocover' }, b.title.slice(0, 40)));
}
const bar = (b) => h('div', { class: 'progress bk-progress', role: 'progressbar', 'aria-valuenow': Math.round(pct(b) * 100), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `Tiến độ ${b.title}` }, h('span', { style: `width:${pct(b) * 100}%` }));
const where = (b) => (b.unit === 'percent' ? `${b.current}%` : b.total ? `trang ${b.current}/${b.total} · ${Math.round(pct(b) * 100)}%` : `trang ${b.current}`);

function timerCard(books) {
  const t = timer(); const b = t && books.find((x) => x.id === t.bookId); if (!b) return null;
  const clock = h('b', { class: 'bk-clock', role: 'timer' }, fmtClock(elapsed(t)));
  const iv = setInterval(() => { if (!clock.isConnected) { if (clock.dataset.on) clearInterval(iv); return; } clock.dataset.on = '1'; clock.textContent = fmtClock(elapsed()); }, 1000);
  return h('section', { class: 'card bk-timer' }, h('p', {}, t.from ? '📖 Đang đọc ' : '⏸️ Tạm dừng ', h('b', {}, b.title)), clock,
    h('div', { class: 'presets center' },
      t.from ? h('button', { class: 'chip', onclick: pauseTimer }, '⏸ Tạm dừng') : h('button', { class: 'chip', onclick: resumeTimer }, '▶ Đọc tiếp'),
      h('button', { class: 'chip', onclick: () => noteDialog({ bookId: b.id }) }, '📷 Ghi / chụp'),
      h('button', { class: 'btn', onclick: () => { pauseTimer(); progressDialog(b, { minutes: Math.max(1, Math.round(elapsed() / 60000)), onSaved: clearTimer }); } }, '✓ Xong buổi đọc'),
      h('button', { class: 'chip', onclick: () => { if (elapsed() < 60_000 || confirm('Bỏ buổi đọc này, không ghi lại?')) clearTimer(); } }, 'Bỏ')));
}
function noteCard(n, b, { showBook = true } = {}) {
  const T = NOTE_TYPES[n.type];
  return (async () => {
    const task = n.taskId ? await get('tasks', n.taskId) : null;
    const applied = n.applied || task?.status === 'done';
    return h('article', { class: `bk-note t-${n.type}` },
      h('header', {}, h('b', {}, `${T.icon} ${T.name}`), h('span', { class: 'bk-meta' }, [n.page ? `tr. ${n.page}` : null, new Date(n.createdAt).toLocaleDateString('vi-VN')].filter(Boolean).join(' · '))),
      showBook && b ? h('button', { class: 'bk-link', onclick: () => goBook(b.id) }, `📕 ${b.title}`) : null,
      noteBody(n), n.photoIds?.length ? await carousel(n.photoIds, n.text.slice(0, 120)) : null,
      h('footer', { class: 'presets' },
        n.type === 'apply' ? [
          applied ? h('button', { class: 'chip on', title: 'Bấm để bỏ đánh dấu', onclick: () => saveNote({ id: n.id, applied: false, taskId: task?.status === 'done' ? null : n.taskId }) }, '✓ Đã áp dụng') : h('button', { class: 'chip', onclick: async () => { await saveNote({ id: n.id, applied: true }); toast('💪 Tuyệt vời, bạn đã áp dụng điều đã đọc!'); } }, 'Đánh dấu đã áp dụng'),
          !applied && !task ? h('button', { class: 'btn', onclick: async () => {
            const { addTask } = await import('../tasks/tasks.js');
            const line = (n.text.split('\n').find((l) => l.trim()) ?? 'Áp dụng ý từ sách').trim().replace(/[#!]/g, '').slice(0, 110);
            const t = await addTask(`${line}${b ? ` (từ sách ${b.title.replace(/[#!]/g, '').slice(0, 40)})` : ''}`);
            if (t) { await saveNote({ id: n.id, taskId: t.id }); toast('📥 Đã đưa vào Inbox', { actionLabel: 'Mở Inbox', onAction: () => { location.hash = '#inbox'; } }); }
          } }, '→ Đưa vào Inbox') : !applied ? h('span', { class: 'bk-meta' }, '📥 Đang là việc cần làm') : null] : null,
        h('button', { class: 'icon-btn', 'aria-label': 'Sửa ghi chú', onclick: () => noteDialog(n) }, '✎'),
        h('button', { class: 'icon-btn', 'aria-label': 'Xóa ghi chú', onclick: async () => { await saveNote({ id: n.id, deleted: true }); toast('Đã xóa ghi chú', { onAction: () => saveNote({ id: n.id, deleted: false }) }); } }, '✕')));
  })();
}
async function noteList(notes, books, opts = {}) {
  const map = new Map(books.map((b) => [b.id, b]));
  const box = h('div', { class: 'bk-notes' }); let run = 0;
  const draw = async () => {
    const my = ++run; const q = norm(nf.q.trim());
    const hit = notes.filter((n) => (nf.type === 'all' || n.type === nf.type) && (!q || norm(n.text).includes(q) || norm(map.get(n.bookId)?.title).includes(q)));
    const cards = await Promise.all(hit.slice(0, nf.show).map((n) => noteCard(n, map.get(n.bookId), opts)));
    if (my !== run) return;
    mount(box, cards, hit.length > nf.show ? h('button', { class: 'chip', onclick: () => { nf.show += 20; draw(); } }, `Xem thêm (${hit.length - nf.show})`) : null, hit.length ? null : h('p', { class: 'muted' }, notes.length ? 'Không có ghi chú nào khớp.' : 'Chưa có ghi chú. Đọc tới đâu, chụp hoặc ghi lại ý hay tới đó nhé.'));
  };
  await draw();
  const cnt = (k) => notes.filter((n) => n.type === k).length;
  return [notes.length > 5 ? h('input', { class: 'input bk-search', type: 'search', value: nf.q, placeholder: 'Tìm trong ghi chú…', 'aria-label': 'Tìm ghi chú', oninput: (e) => { nf.q = e.target.value; nf.show = 15; draw(); } }) : null,
    notes.length ? h('div', { class: 'presets' }, [['all', `Tất cả ${notes.length}`], ...Object.entries(NOTE_TYPES).filter(([k]) => cnt(k)).map(([k, t]) => [k, `${t.icon} ${t.name} ${cnt(k)}`])].map(([k, l]) => h('button', { class: `chip${nf.type === k ? ' on' : ''}`, 'aria-pressed': String(nf.type === k), onclick: () => { nf.type = k; nf.show = 15; notifyChange(); } }, l))) : null, box];
}
function recallCard(notes) {
  const due = dueNotes(notes); if (!notes.length) return null;
  const next = notes.filter((n) => n.recall && n.recall.due > todayKey()).map((n) => n.recall.due).sort()[0];
  return h('section', { class: 'card bk-recallcard' }, h('h3', {}, '🧠 Nhớ lại điều đã đọc'),
    due.length ? [h('p', {}, h('b', {}, `${due.length} ghi chú`), ' tới lúc ôn. Tự nhớ trước, xem đáp án sau — nhớ được lâu hơn nhiều so với đọc lại.'), h('button', { class: 'btn', onclick: () => recallSession() }, `Bắt đầu (${Math.min(15, due.length)})`)]
      : h('p', { class: 'small' }, next ? `Hôm nay không có ghi chú nào cần ôn. Lần tới: ${viDay(next)}.` : 'Chưa có ghi chú cần ôn.'));
}

async function nowTab(books, notes, s) {
  const reading = books.filter((b) => b.status === 'reading'); const t = timer();
  const cards = await Promise.all(reading.map(async (b) => {
    const e = eta(b, s.events); const n = notes.filter((x) => x.bookId === b.id).length;
    return h('section', { class: 'card bk-now' }, h('button', { class: 'bk-open', 'aria-label': `Mở ${b.title}`, onclick: () => goBook(b.id) }, await coverEl(b)),
      h('div', { class: 'bk-info' }, h('button', { class: 'bk-link title', onclick: () => goBook(b.id) }, b.title), b.author ? h('p', { class: 'bk-meta' }, b.author) : null,
        bar(b), h('p', { class: 'small' }, where(b), e ? ` · còn khoảng ${e} ngày` : ''), n ? h('p', { class: 'bk-meta' }, `${n} ghi chú`) : null,
        h('div', { class: 'presets' },
          t ? null : h('button', { class: 'btn', onclick: () => startTimer(b.id) }, '▶ Đọc'),
          h('button', { class: 'chip', onclick: () => progressDialog(b) }, '＋ Cập nhật trang'), h('button', { class: 'chip', onclick: () => noteDialog({ bookId: b.id, page: b.unit === 'page' && b.current ? b.current : null }) }, '📷 Ghi / chụp'))));
  }));
  const G = s.goal; const val = G.kind === 'pages' ? s.today.pages : s.today.minutes;
  return [timerCard(books),
    h('section', { class: 'card' }, h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('b', {}, `${val}/${G.n}`), h('span', {}, `${G.kind === 'pages' ? 'trang' : 'phút'} hôm nay`)),
      h('div', { class: 'stat' }, h('b', {}, `${s.streak} ngày`), h('span', {}, 'đọc liên tiếp')),
      h('div', { class: 'stat' }, h('b', {}, `${s.doneYear}/${G.year}`), h('span', {}, `cuốn năm ${todayKey().slice(0, 4)}`))),
      h('div', { class: 'progress bk-progress' }, h('span', { style: `width:${s.goalPct * 100}%` }))),
    recallCard(notes),
    cards.length ? cards : h('section', { class: 'card bk-empty' }, h('p', {}, books.length ? 'Chưa có cuốn nào đang đọc. Chọn một cuốn trong Tủ sách nhé.' : 'Thêm cuốn sách đầu tiên của bạn 📚'), h('button', { class: 'btn', onclick: () => (books.length ? (tab = 'shelf', notifyChange()) : bookDialog()) }, books.length ? 'Mở Tủ sách' : '+ Thêm sách'))];
}
async function shelfTab(books) {
  const grid = h('div', { class: 'bk-grid' });
  const draw = async () => {
    const q = norm(shelfQ.trim());
    const hit = books.filter((b) => (shelf === 'all' || b.status === shelf) && (!q || norm(`${b.title} ${b.author} ${b.category}`).includes(q)));
    mount(grid, await Promise.all(hit.map(async (b) => h('button', { class: 'bk-item', onclick: () => goBook(b.id) }, await coverEl(b), h('b', {}, b.title), h('small', {}, b.status === 'done' ? (b.rating ? '★'.repeat(b.rating) : '✅ Đã xong') : b.status === 'reading' ? where(b) : STATUS[b.status]), b.status === 'reading' ? bar(b) : null))), hit.length ? null : h('p', { class: 'muted' }, books.length ? 'Không có sách nào ở mục này.' : 'Tủ sách đang trống.'));
  };
  await draw();
  const gone = await allBooks({ deleted: true });
  return [h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', {}, '📚 Tủ sách'), h('button', { class: 'btn', onclick: () => bookDialog() }, '+ Thêm sách')),
    books.length > 6 ? h('input', { class: 'input bk-search', type: 'search', value: shelfQ, placeholder: 'Tìm tên sách, tác giả, thể loại…', 'aria-label': 'Tìm sách', oninput: (e) => { shelfQ = e.target.value; draw(); } }) : null,
    h('div', { class: 'presets' }, [['all', `Tất cả ${books.length}`], ...Object.entries(STATUS).map(([k, l]) => [k, `${l} ${books.filter((b) => b.status === k).length}`])].map(([k, l]) => h('button', { class: `chip${shelf === k ? ' on' : ''}`, 'aria-pressed': String(shelf === k), onclick: () => { shelf = k; notifyChange(); } }, l))), grid),
  gone.length ? h('details', { class: 'card sub' }, h('summary', {}, `Sách đã xóa (${gone.length})`), h('ul', { class: 'log-list' }, gone.map((b) => h('li', {}, h('span', { class: 'grow' }, b.title), h('button', { class: 'chip', onclick: () => saveBook({ id: b.id, deleted: false }) }, '↩︎ Khôi phục'))))) : null];
}
function habitTab(s, books) {
  const today = todayKey(); const G = s.goal; const wd = (toDate(today).getDay() + 6) % 7; const start = addDays(today, -(7 * 15 + wd));
  const key = G.kind === 'pages' ? 'pages' : 'minutes'; const unit = G.kind === 'pages' ? 'trang' : 'phút';
  const cells = []; for (let d = start; d <= today; d = addDays(d, 1)) { const v = s.byDay.get(d); const x = v ? v[key] : 0; const lv = !v ? 0 : x >= G.n * 2 ? 4 : x >= G.n ? 3 : x >= G.n / 2 ? 2 : 1; cells.push(h('span', { class: `hm l${lv}`, title: `${viDay(d)}: ${v ? `${v.minutes} phút, ${v.pages} trang` : 'không đọc'}` })); }
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)); const max = Math.max(G.n, ...days.map((d) => s.byDay.get(d)?.[key] ?? 0));
  const titles = new Map(books.map((b) => [b.id, b.title]));
  return [h('section', { class: 'card' }, h('h3', {}, '📊 Thói quen đọc'), h('div', { class: 'stat-row' },
    h('div', { class: 'stat' }, h('b', {}, `${s.week.minutes} phút`), h('span', {}, `7 ngày qua · ${s.week.pages} trang · ${s.week.days} ngày có đọc`)),
    h('div', { class: 'stat' }, h('b', {}, `${s.month.minutes} phút`), h('span', {}, `30 ngày qua · ${s.month.pages} trang · ${s.month.days} ngày có đọc`)),
    h('div', { class: 'stat' }, h('b', {}, `${s.streak} ngày`), h('span', {}, 'liên tiếp'))),
  h('h4', {}, `14 ngày gần đây (${unit})`), h('div', { class: 'bk-bars', role: 'img', 'aria-label': `Số ${unit} đọc 14 ngày gần đây` }, days.map((d) => { const v = s.byDay.get(d)?.[key] ?? 0; return h('span', { class: 'bk-barcol', title: `${viDay(d)}: ${v} ${unit}` }, h('span', { class: 'bk-barn' }, v || ''), h('span', { class: 'bk-bartrack' }, h('span', { style: `height:${v ? Math.max(4, (v / max) * 100) : 0}%` })), h('small', {}, Number(d.slice(8)))); })),
  h('h4', {}, '16 tuần gần đây'), h('div', { class: 'hm-wrap' }, h('div', { class: 'hm-grid', role: 'img', 'aria-label': `Lịch đọc sách 16 tuần: ${cells.filter((c) => !c.classList.contains('l0')).length} ngày có đọc` }, cells)), h('p', { class: 'bk-meta hm-legend' }, 'Ít', [0, 1, 2, 3, 4].map((l) => h('span', { class: `hm l${l}` })), 'Nhiều')),
  h('section', { class: 'card' }, h('h3', {}, '🎯 Mục tiêu'), h('div', { class: 'form-row' },
    h('label', { class: 'field-inline' }, 'Mỗi ngày', h('input', { class: 'input num', type: 'number', min: '1', max: '600', value: G.n, 'aria-label': 'Mục tiêu mỗi ngày', onchange: (e) => saveGoal({ ...G, n: Math.max(1, Number(e.target.value) || 20) }) }), h('select', { class: 'input', 'aria-label': 'Đơn vị', onchange: (e) => saveGoal({ ...G, kind: e.target.value }) }, h('option', { value: 'minutes', selected: G.kind === 'minutes' }, 'phút'), h('option', { value: 'pages', selected: G.kind === 'pages' }, 'trang'))),
    h('label', { class: 'field-inline' }, 'Cả năm', h('input', { class: 'input num', type: 'number', min: '1', max: '365', value: G.year, 'aria-label': 'Số cuốn cả năm', onchange: (e) => saveGoal({ ...G, year: Math.max(1, Number(e.target.value) || 12) }) }), 'cuốn')),
  h('p', { class: 'muted small' }, 'Mỗi ngày có ghi buổi đọc, thói quen “Đọc sách” tự được tích (+5 xu).')),
  s.events.length ? h('section', { class: 'card' }, h('h3', {}, '🕘 Các buổi đọc gần đây'), h('ul', { class: 'log-list' }, [...s.events].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 15).map((e) => h('li', {}, h('span', { class: 'bk-meta' }, viDay(e.day)), h('span', { class: 'grow' }, titles.get(e.bookId) ?? 'Sách đã xóa'), h('span', { class: 'small' }, [e.pages ? `${e.pages} trang` : null, e.minutes ? `${e.minutes} phút` : null].filter(Boolean).join(' · ')),
    h('button', { class: 'icon-btn', 'aria-label': 'Xóa buổi đọc này', onclick: async () => { if (!confirm('Xóa buổi đọc này khỏi lịch sử? (tiến độ sách giữ nguyên)')) return; const { deleteEvent } = await import('../../core/events.js'); await deleteEvent(e.id); notifyChange(); toast('Đã xóa buổi đọc', { onAction: async () => { await put('events', e); notifyChange(); } }); } }, '✕'))))) : null];
}
async function detail(b, books, notes, s) {
  const mine = notes.filter((n) => n.bookId === b.id); const ev = s.events.filter((e) => e.bookId === b.id); const e = eta(b, s.events); const due = dueNotes(mine); const t = timer();
  const mins = ev.reduce((x, y) => x + (y.minutes ?? 0), 0);
  return [h('button', { class: 'chip', onclick: () => { bookId = null; notifyChange(); } }, '‹ Tất cả sách'), t?.bookId === b.id ? timerCard(books) : null,
    h('section', { class: 'card bk-now' }, await coverEl(b, 'large'), h('div', { class: 'bk-info' }, h('h3', {}, b.title), h('p', { class: 'bk-meta' }, [b.author, b.category].filter(Boolean).join(' · ')),
      bar(b), h('p', { class: 'small' }, where(b), e ? ` · còn khoảng ${e} ngày` : ''),
      h('p', { class: 'bk-meta' }, [b.started ? `Bắt đầu ${viDay(b.started)}` : null, b.finished ? `Xong ${viDay(b.finished)}` : null, ev.length ? `${ev.length} buổi · ${mins} phút` : null].filter(Boolean).join(' · ')),
      h('select', { class: 'input bk-status', 'aria-label': 'Tình trạng', onchange: async (x) => { const st = x.target.value; const nb = await setStatus(b, st); if (st === 'done') reviewDialog(nb); } }, Object.entries(STATUS).map(([k, l]) => h('option', { value: k, selected: k === b.status }, l))),
      h('div', { class: 'presets' }, t || b.status === 'done' ? null : h('button', { class: 'btn', onclick: () => startTimer(b.id) }, '▶ Đọc'), h('button', { class: 'chip', onclick: () => progressDialog(b) }, '＋ Cập nhật trang'), h('button', { class: 'chip', onclick: () => bookDialog(b) }, '✎ Sửa'),
        h('button', { class: 'chip', onclick: async () => { if (!confirm(`Xóa “${b.title}” khỏi tủ? Ghi chú vẫn được giữ và có thể khôi phục.`)) return; bookId = null; if (timer()?.bookId === b.id) clearTimer(); await saveBook({ id: b.id, deleted: true }); toast('Đã xóa sách', { onAction: () => saveBook({ id: b.id, deleted: false }) }); } }, '🗑 Xóa')))),
    b.status === 'done' ? h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', {}, '⭐ Cảm nhận'), h('button', { class: 'chip', onclick: () => reviewDialog(b) }, b.review || b.rating ? '✎ Sửa' : '+ Viết')), b.rating ? h('p', { class: 'bk-rated', 'aria-label': `${b.rating} sao` }, '★'.repeat(b.rating)) : null, b.review ? h('p', { class: 'bk-notetext' }, b.review) : null) : null,
    h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', {}, '💎 Ghi chú của bạn'), h('button', { class: 'btn', onclick: () => noteDialog({ bookId: b.id, page: b.unit === 'page' && b.current ? b.current : null }) }, '+ Ghi / chụp')),
      mine.length ? h('div', { class: 'presets' }, h('button', { class: 'chip', onclick: () => recallSession(due.length ? due : mine) }, due.length ? `🧠 Nhớ lại (${due.length})` : '🧠 Ôn lại cả sách'), h('button', { class: 'chip', onclick: async () => { try { await navigator.clipboard.writeText(notesAsText(b, mine)); toast('📋 Đã sao chép toàn bộ ghi chú'); } catch { toast('Trình duyệt không cho sao chép'); } } }, '📋 Sao chép ghi chú')) : null,
      await noteList(mine, books, { showBook: false }))];
}

export async function renderBooks(root) {
  const [books, notesAll, s] = [await allBooks(), await allNotes(), await readingStats()];
  const ids = new Set(books.map((b) => b.id)); const notes = notesAll.filter((n) => ids.has(n.bookId));
  const b = books.find((x) => x.id === bookId); if (!b) bookId = null;
  const body = b ? await detail(b, books, notes, s) : tab === 'shelf' ? await shelfTab(books) : tab === 'notes' ? [recallCard(notes), h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', {}, '💎 Ghi chú từ sách'), books.length ? h('button', { class: 'btn', onclick: () => noteDialog({ bookId: books[0].id }) }, '+ Ghi / chụp') : null), await noteList(notes, books))] : tab === 'habit' ? habitTab(s, books) : await nowTab(books, notes, s);
  const dueN = dueNotes(notes).length;
  mount(root, h('div', { class: 'view-head' }, subnav('learn', 'books'), h('h2', {}, 'Đọc sách')),
    b ? null : h('div', { class: 'vocab-tabs', role: 'tablist' }, [['now', '📖', 'Đang đọc'], ['shelf', '📚', 'Tủ sách'], ['notes', '💎', dueN ? `Ghi chú · ${dueN}` : 'Ghi chú'], ['habit', '📊', 'Thói quen']].map(([k, i, l]) => h('button', { class: `vocab-tab${tab === k ? ' on' : ''}`, role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; nf.type = 'all'; nf.q = ''; nf.show = 15; notifyChange(); } }, h('span', { 'aria-hidden': 'true' }, i), l))), body);
}
