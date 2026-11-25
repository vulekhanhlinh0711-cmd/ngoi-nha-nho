// P48: góc đọc sách — sách, tiến độ, buổi đọc, ghi chú và lịch nhớ lại.
// Lưu: mỗi sách một dòng settings 'book:<id>', mỗi ghi chú một dòng 'bnote:<id>' (đồng bộ từng dòng, hai máy không đè nhau).
// Xóa chỉ là đánh dấu deleted (khôi phục được); ảnh giữ nguyên. Buổi đọc = sự kiện 'reading_done'.
import { getSetting, setSetting, entriesByPrefix, newId } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays } from '../../core/dates.js';

export const STATUS = { reading: '📖 Đang đọc', want: '🔖 Muốn đọc', done: '✅ Đã đọc xong', paused: '⏸️ Tạm dừng' };
export const NOTE_TYPES = {
  quote: { icon: '💎', name: 'Ý tâm đắc', hint: 'Câu văn hoặc ý khiến bạn dừng lại suy nghĩ…' },
  outline: { icon: '🗂️', name: 'Dàn ý', hint: 'Mỗi dòng một ý. Thụt vào 2 dấu cách (nút →) để tạo ý con.' },
  apply: { icon: '💡', name: 'Áp dụng thực tế', hint: 'Mình sẽ làm gì, khi nào, ở đâu? Viết việc thật nhỏ và cụ thể.' },
  note: { icon: '📝', name: 'Ghi chú', hint: 'Suy nghĩ, câu hỏi, liên hệ với sách khác…' },
};
export const TEMPLATES = [
  ['Dàn ý chương', 'Chủ đề chính:\n  Ý 1:\n    Ví dụ:\n  Ý 2:\n    Ví dụ:\nKết luận của chương:'],
  ['Giảng lại cho người khác', 'Nói bằng lời của mình trong 3 câu:\nMột ví dụ đời thường:\nChỗ mình chưa hiểu rõ:'],
  ['Cả cuốn sách', 'Sách trả lời câu hỏi gì?\nBa ý lớn nhất:\n  1.\n  2.\n  3.\nMình đồng ý / không đồng ý vì:\nMình sẽ thay đổi điều gì:'],
];
export const RECALL_DAYS = [1, 3, 7, 16, 35, 90];

const rows = async (prefix) => (await entriesByPrefix('settings', prefix)).map(([, v]) => v).filter(Boolean);
export async function allBooks({ deleted = false } = {}) { return (await rows('book:')).filter((b) => !!b.deleted === deleted).sort((a, b) => (b.touched ?? b.added) - (a.touched ?? a.added)); }
export const getBook = (id) => getSetting(`book:${id}`);
export async function saveBook(data) {
  const id = data.id ?? newId();
  const old = (await getBook(id)) ?? { id, added: Date.now(), status: 'want', unit: 'page', total: 0, current: 0 };
  const b = { ...old, ...data, id, touched: Date.now() };
  await setSetting(`book:${id}`, b);
  notifyChange();
  return b;
}
export const pct = (b) => (b.status === 'done' ? 1 : b.total > 0 ? Math.min(1, b.current / b.total) : 0);
export const unitName = (b) => (b.unit === 'percent' ? '%' : 'trang');

export async function setStatus(b, status) {
  const patch = { id: b.id, status };
  if (status === 'reading' && !b.started) patch.started = todayKey();
  if (status === 'done') {
    patch.finished = b.finished ?? todayKey();
    if (b.total) patch.current = b.total;
    if (!(await queryEvents('book_finished')).some((e) => e.bookId === b.id)) await logEvent('book_finished', { bookId: b.id, day: todayKey() });
  } else patch.finished = null;
  return saveBook(patch);
}

// Ghi một buổi đọc: đọc tới `to`; chỉ tính trang tiến lên. `minutes` có thể bằng 0 (chỉ cập nhật trang).
export async function logReading(b, { to, minutes = 0, day = todayKey() }) {
  const cur = (await getBook(b.id)) ?? b;
  const from = cur.current ?? 0;
  const end = cur.total ? Math.min(cur.total, to) : to;
  const units = Math.max(0, end - from);
  const pages = cur.unit === 'percent' ? (cur.pagesTotal ? Math.round((units / 100) * cur.pagesTotal) : 0) : units;
  if (units > 0 || minutes > 0) await logEvent('reading_done', { bookId: b.id, from, to: end, pages, minutes: Math.round(minutes), day });
  const nb = await saveBook({ id: b.id, current: end, status: cur.status === 'done' ? 'done' : 'reading', started: cur.started ?? day });
  return { book: nb, pages, finished: !!nb.total && end >= nb.total && cur.status !== 'done' };
}

// ---- mục tiêu & thống kê ----
export async function readingGoal() { return { kind: 'minutes', n: 20, year: 12, ...((await getSetting('readingGoal')) ?? {}) }; }
export async function saveGoal(g) { await setSetting('readingGoal', g); notifyChange(); }
export async function readingStats(today = todayKey()) {
  const ev = (await queryEvents('reading_done')).map((e) => ({ ...e, day: e.day ?? dayOf(e.at) }));
  const goal = await readingGoal();
  const byDay = new Map();
  for (const e of ev) { const d = byDay.get(e.day) ?? { minutes: 0, pages: 0 }; d.minutes += e.minutes ?? 0; d.pages += e.pages ?? 0; byDay.set(e.day, d); }
  let streak = 0;
  for (let d = byDay.has(today) ? today : addDays(today, -1); byDay.has(d); d = addDays(d, -1)) streak++;
  const sum = (from) => [...byDay].filter(([d]) => d >= from && d <= today).reduce((a, [, v]) => ({ minutes: a.minutes + v.minutes, pages: a.pages + v.pages, days: a.days + 1 }), { minutes: 0, pages: 0, days: 0 });
  const t = byDay.get(today) ?? { minutes: 0, pages: 0 };
  const doneYear = (await allBooks()).filter((b) => b.status === 'done' && b.finished?.slice(0, 4) === today.slice(0, 4)).length;
  return { byDay, streak, today: t, goal, goalPct: Math.min(1, (goal.kind === 'pages' ? t.pages : t.minutes) / Math.max(1, goal.n)), week: sum(addDays(today, -6)), month: sum(addDays(today, -29)), doneYear, events: ev };
}
// Dự kiến còn bao nhiêu ngày (theo tốc độ 14 ngày gần nhất của chính cuốn đó).
export function eta(b, events, today = todayKey()) {
  if (!b.total || b.status !== 'reading') return null;
  const mine = events.filter((e) => e.bookId === b.id && e.day > addDays(today, -14));
  const units = mine.reduce((s, e) => s + Math.max(0, e.to - e.from), 0);
  if (!units) return null;
  const first = mine.reduce((m, e) => (e.day < m ? e.day : m), today);
  const span = Math.max(1, Math.round((new Date(today) - new Date(first)) / 864e5) + 1);
  return Math.ceil((b.total - b.current) / (units / span));
}

// ---- bấm giờ đọc (sống qua việc tải lại trang, chỉ ở máy này) ----
const TKEY = 'readingTimer';
export function timer() { try { return JSON.parse(localStorage.getItem(TKEY) ?? 'null'); } catch { return null; } }
const setTimer = (t) => { try { if (t) localStorage.setItem(TKEY, JSON.stringify(t)); else localStorage.removeItem(TKEY); } catch { /* chế độ riêng tư */ } notifyChange(); };
export const startTimer = (bookId) => setTimer({ bookId, acc: 0, from: Date.now() });
export const elapsed = (t = timer()) => (t ? t.acc + (t.from ? Date.now() - t.from : 0) : 0);
export const pauseTimer = () => { const t = timer(); if (t?.from) setTimer({ ...t, acc: elapsed(t), from: null }); };
export const resumeTimer = () => { const t = timer(); if (t && !t.from) setTimer({ ...t, from: Date.now() }); };
export const clearTimer = () => setTimer(null);

// ---- ghi chú ----
export async function allNotes({ deleted = false } = {}) { return (await rows('bnote:')).filter((n) => !!n.deleted === deleted).sort((a, b) => b.createdAt - a.createdAt); }
export async function saveNote(data) {
  const id = data.id ?? newId();
  const old = (await getSetting(`bnote:${id}`)) ?? { id, createdAt: Date.now(), type: 'note', text: '', photoIds: [], page: null, recall: { lvl: 0, due: addDays(todayKey(), RECALL_DAYS[0]) } };
  const n = { ...old, ...data, id };
  await setSetting(`bnote:${id}`, n);
  if (!data.id && n.bookId) { const b = await getBook(n.bookId); if (b) await setSetting(`book:${b.id}`, { ...b, touched: Date.now() }); }
  notifyChange();
  return n;
}
export const dueNotes = (notes, today = todayKey()) => notes.filter((n) => n.recall && n.recall.due <= today).sort((a, b) => (a.recall.due < b.recall.due ? -1 : 1));
export function nextRecall(r, ok, today = todayKey()) {
  const lvl = ok ? Math.min(RECALL_DAYS.length - 1, (r?.lvl ?? 0) + 1) : 0;
  return { lvl, due: addDays(today, RECALL_DAYS[lvl]), last: today };
}
export const answerRecall = (n, ok) => saveNote({ id: n.id, recall: nextRecall(n.recall, ok) });

// Dàn ý: dòng → { depth, text } (2 dấu cách hoặc 1 tab = 1 cấp; bỏ dấu đầu dòng).
export function parseOutline(text) {
  return text.split('\n').map((l) => l.replace(/\t/g, '  ')).filter((l) => l.trim()).map((l) => {
    const sp = /^ */.exec(l)[0].length;
    return { depth: Math.min(4, Math.floor(sp / 2)), text: l.trim().replace(/^[-•*+]\s+/, '') };
  });
}
// Gợi ý để tự nhớ lại trước khi xem đáp án.
export function cueOf(n) {
  if (n.type === 'outline') { const o = parseOutline(n.text); return o.filter((x) => x.depth === 0).map((x) => x.text).join(' · '); }
  const w = n.text.trim().split(/\s+/).filter(Boolean);
  return w.length > 4 ? `${w.slice(0, Math.min(6, Math.max(2, Math.ceil(w.length / 4)))).join(' ')} …` : w.length ? `${w[0]} …` : '';
}
export function notesAsText(b, notes) {
  return [`${b.title}${b.author ? ` — ${b.author}` : ''}`, '', ...[...notes].sort((a, c) => (a.page ?? 1e9) - (c.page ?? 1e9) || a.createdAt - c.createdAt).map((n) => `${NOTE_TYPES[n.type].icon} ${NOTE_TYPES[n.type].name}${n.page ? ` (tr. ${n.page})` : ''}\n${n.text}\n`)].join('\n');
}

// ---- tìm bìa & thông tin (Open Library, miễn phí). Chỉ gửi tên sách khi bạn bấm Tìm. ----
export async function findBooks(q) {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,number_of_pages_median,cover_i`);
  if (!r.ok) throw new Error('search');
  return ((await r.json()).docs ?? []).map((d) => ({ title: d.title, author: d.author_name?.slice(0, 2).join(', ') ?? '', pages: d.number_of_pages_median ?? 0, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null, coverL: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null }));
}
