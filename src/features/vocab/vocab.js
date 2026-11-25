// P47: sổ từ vựng 5 cấp + "giờ ôn vàng" (ôn ngắt quãng).
// Lưu trữ: MỖI TỪ MỘT DÒNG trong kho settings, khóa 'v:<từ>' → hai máy học cùng lúc không đè nhau, chỉ đẩy từ vừa đổi.
// Bộ thẻ cũ 'ieltsCards' KHÔNG bị sửa/xóa: được đọc làm nền, dòng 'v:' chồng lên trên (giữ nguyên tiến độ cũ).
import { getSetting, setSetting, entriesByPrefix } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays, toDate } from '../../core/dates.js';
import { STARTER_WORDS } from '../ielts/content.js';

const HOUR = 3_600_000;
// Cấp 1→5: ôn lại sau 1 giờ, 1 ngày, 3 ngày, 7 ngày, 16 ngày.
export const LEVELS = [
  null,
  { icon: '🌱', name: 'Mới gieo', hours: 1 },
  { icon: '🌿', name: 'Nảy lá', hours: 24 },
  { icon: '🪴', name: 'Bén rễ', hours: 72 },
  { icon: '🌳', name: 'Vững chắc', hours: 168 },
  { icon: '🌸', name: 'Nhớ lâu', hours: 384 },
];
export const MASTER = 4; // từ cấp 4 coi là "đã thuộc"
export const BATCH_MS = 30 * 60_000; // các từ đến hạn gần nhau gộp một lượt

export const keyOf = (w) => w.trim().toLowerCase().replace(/\s+/g, ' ');
const dayStart = (k) => toDate(k).getTime();

// Toàn bộ thẻ (kể cả từ "đã biết" và thẻ khởi đầu chưa học).
export async function allCards() {
  const base = (await getSetting('ieltsCards')) ?? STARTER_WORDS.map(([word, pos, meaning, example], i) => ({ id: `s${i}`, word, pos, meaning, example, box: 0, due: null }));
  const map = new Map();
  for (const c of base) {
    const box = c.box || (c.mine ? 1 : 0);
    map.set(keyOf(c.word), { word: c.word, pos: c.pos ?? '', meaning: c.meaning ?? '', example: c.example ?? '', box, dueAt: box ? (c.due ? dayStart(c.due) : 0) : null, course: c.mine ? 'mine' : 'starter' });
  }
  for (const [k, v] of await entriesByPrefix('settings', 'v:')) if (v) map.set(k.slice(2), { ...map.get(k.slice(2)), ...v });
  return [...map.values()].filter((c) => !c.deleted);
}
// Sổ tay = những từ đã bắt đầu học.
export const inNotebook = (c) => c.box > 0 && !c.known;
export async function notebook() { return (await allCards()).filter(inNotebook); }

async function current(word) { return (await allCards()).find((c) => keyOf(c.word) === keyOf(word)) ?? null; }
async function write(word, patch) {
  const k = `v:${keyOf(word)}`;
  const old = (await getSetting(k)) ?? (await current(word)) ?? {};
  await setSetting(k, { ...old, word: old.word ?? word.trim(), ...patch });
}

// Lưu từ vào sổ (cấp 1, ôn lại sau 1 giờ). Từ đã có → thêm nghĩa mới, giữ nguyên cấp độ.
export async function saveWord({ word, pos = '', meaning, example = '', exVi = '', ipa = '', course = 'mine' }) {
  const c = await current(word);
  if (c && inNotebook(c)) {
    if (!meaning || c.meaning.toLowerCase().includes(meaning.toLowerCase())) return 'exists';
    await write(word, { meaning: c.meaning ? `${c.meaning}; ${meaning}` : meaning, example: c.example || example, exVi: c.exVi || exVi });
    return 'merged';
  }
  await write(word, { word: word.trim(), pos, meaning: meaning || c?.meaning || '', example: example || c?.example || '', exVi, ipa, course, box: 1, dueAt: Date.now() + LEVELS[1].hours * HOUR, added: Date.now(), ok: 0, bad: 0, known: false, deleted: false });
  return 'added';
}
export const markKnown = (c) => write(c.word, { word: c.word, pos: c.pos, meaning: c.meaning, example: c.example, course: c.course, box: c.box || 0, known: true, deleted: false });
export const unmarkKnown = (c) => write(c.word, { known: false, ...(c.box ? {} : { box: 1, dueAt: Date.now() }) });
export const removeWord = (word) => write(word, { deleted: true });
export const editWord = (word, patch) => write(word, patch);

// Trả lời đúng: lên 1 cấp. Sai: lùi 2 cấp (thấp nhất cấp 1).
export function nextState(c, ok, now = Date.now()) {
  const box = ok ? Math.min(5, c.box + 1) : Math.max(1, c.box - 2);
  return { box, dueAt: now + LEVELS[box].hours * HOUR, ok: (c.ok ?? 0) + (ok ? 1 : 0), bad: (c.bad ?? 0) + (ok ? 0 : 1), last: now };
}
export async function answer(c, ok) { const st = nextState(c, ok); await write(c.word, st); return st; }

// Giờ ôn vàng: từ đến hạn ngay bây giờ, hoặc mốc kế tiếp.
export function golden(cards, now = Date.now()) {
  const due = cards.filter((c) => c.dueAt <= now).sort((a, b) => a.box - b.box || a.dueAt - b.dueAt);
  const later = cards.filter((c) => c.dueAt > now);
  const nextAt = later.length ? Math.min(...later.map((c) => c.dueAt)) : null;
  return { due, nextAt, nextCount: nextAt ? later.filter((c) => c.dueAt <= nextAt + BATCH_MS).length : 0 };
}
export const levelCounts = (cards) => [1, 2, 3, 4, 5].map((l) => cards.filter((c) => c.box === l).length);

// ---- khóa học ----
export const COURSES = [
  { id: 'starter', icon: '✨', name: 'Khởi động IELTS', goal: 'Các từ học thuật hay gặp nhất', n: 50 },
  { id: 'base1', icon: '🧱', name: 'Từ nền tảng', goal: 'Củng cố nền tiếng Anh, dùng hằng ngày', n: 0 },
  { id: 'academic', icon: '🎓', name: 'Từ vựng học thuật', goal: 'IELTS Reading & Listening', n: 0 },
  { id: 'phrases', icon: '💬', name: 'Cụm từ Writing & Speaking', goal: 'Diễn đạt tự nhiên, nâng band', n: 0 },
];
const cache = new Map();
export async function courseWords(id) {
  if (id === 'starter') return STARTER_WORDS.map(([word, pos, meaning, example]) => ({ word, pos, meaning, example, exVi: '', ipa: '', course: 'starter' }));
  if (!cache.has(id)) {
    const p = fetch(new URL(`assets/vocab/${id}.json`, document.baseURI)).then((r) => { if (!r.ok) throw new Error('Không tải được khóa học'); return r.json(); })
      .then((l) => l.map(([word, pos, meaning, example, exVi, ipa]) => ({ word, pos, meaning, example, exVi, ipa, course: id })));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}
let index = null;
export async function courseIndex() {
  return (index ??= fetch(new URL('assets/vocab/index.json', document.baseURI)).then((r) => r.json()).catch(() => { index = null; return {}; }));
}
// Tra nghĩa ngắn gọn của một từ trong các khóa (nếu có).
export async function findInCourses(word) {
  const k = keyOf(word);
  for (const c of COURSES) { const hit = (await courseWords(c.id).catch(() => [])).find((x) => keyOf(x.word) === k); if (hit) return hit; }
  return null;
}

// ---- chuỗi ngày học + cây ----
export async function streak(today = todayKey()) {
  const days = new Set((await queryEvents('vocab_session')).map((e) => e.day ?? dayOf(e.at)));
  let n = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) n++;
  return { n, today: days.has(today) };
}
const GIFT = ['sunflower', 'tulip', 'strawberry', 'rose', 'pumpkin'];
// Kết thúc một lượt học/ôn: ghi nhật ký, tự tích thói quen "Học tiếng Anh"; đủ mỗi 7 ngày liên tiếp → tặng hạt giống cho Khu vườn.
export async function finishSession({ kind, total, correct, learned = 0, ms }) {
  const before = await streak();
  const minutes = Math.max(1, Math.round(ms / 60000));
  await logEvent('vocab_session', { kind, total, correct, learned, minutes, day: todayKey() });
  if (total + learned >= 5) await logEvent('lesson_done', { skill: 'vocab', minutes, day: todayKey(), source: 'vocab' });
  const s = await streak();
  let gift = null;
  if (!before.today && s.n > 0 && s.n % 7 === 0) {
    const { getGarden, seedOf } = await import('../garden/garden.js');
    const g = await getGarden(); const id = GIFT[(s.n / 7 - 1) % GIFT.length];
    g.seeds = { ...g.seeds, [id]: (g.seeds[id] ?? 0) + 1 };
    await setSetting('garden', g);
    gift = seedOf(id);
  }
  notifyChange();
  return { streak: s.n, gift };
}

// Nhắc khi tới giờ ôn (lúc app đang mở): mỗi lượt đến hạn nhắc một lần.
export function startVocabReminder() {
  let told = 0;
  const check = async () => {
    const g = golden(await notebook());
    if (!g.due.length) { told = 0; return; }
    if (told || g.due.length < 5) return;
    told = g.due.length;
    const { toast } = await import('../../ui/toast.js');
    toast(`⏳ Giờ ôn vàng: ${g.due.length} từ đang chờ bạn ôn.`, { duration: 9000, actionLabel: 'Ôn ngay', onAction: () => { location.hash = '#vocab'; } });
    if (document.hidden) { const { systemNotify } = await import('../../core/notify.js'); systemNotify('⏳ Giờ ôn vàng', `${g.due.length} từ vựng đang chờ bạn ôn.`, '#vocab', 'vocab'); }
  };
  setTimeout(check, 20_000);
  setInterval(check, 60_000);
}
