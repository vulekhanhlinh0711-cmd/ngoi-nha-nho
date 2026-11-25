// P6.01–P6.03: thói quen. Một số tự tích từ dữ liệu có sẵn, số khác ghi tay.
// Thưởng cho hành động (đã làm), không thưởng cho con số.
import { getAll, getSetting, setSetting, entriesByPrefix } from '../../core/db.js';
import { logEvent, queryEvents, deleteEvent, notifyChange } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays, toDate, weekStart } from '../../core/dates.js';

// part: buổi trong ngày · kind: check (tích) | count (đếm tới target) | avoid (tránh làm)
// lịch: days = [0..6] các thứ trong tuần; hoặc perWeek = số lần mỗi tuần (ngày nào cũng được)
export const BUILT_IN = [
  { id: 'breakfast', name: 'Ăn sáng', icon: '🍳', color: '#f7b267', part: 'morning', auto: 'Tự tích khi ghi bữa sáng', link: '#food' },
  { id: 'skincare', name: 'Dưỡng da', icon: '🧴', color: '#f4a6c0', part: 'any', kind: 'count', target: 2, unit: 'lần' },
  { id: 'water', name: 'Uống đủ nước', icon: '💧', color: '#6cc7ee', part: 'any', auto: 'Tự tích khi đủ nước', link: '#water' },
  { id: 'english', name: 'Học tiếng Anh', icon: '📚', color: '#8fb4f7', part: 'any', auto: 'Tự tích khi học IELTS hoặc ôn từ vựng', link: '#ielts' },
  { id: 'exercise', name: 'Vận động', icon: '🏃', color: '#bda2f2', part: 'any', auto: 'Tự tích khi ghi vận động' },
  { id: 'meditate', name: 'Thiền', icon: '🧘', color: '#8ed3c7', part: 'evening', auto: 'Tự tích khi thiền từ 1 phút', link: '#mindful' },
  { id: 'reading', name: 'Đọc sách', icon: '📖', color: '#e2b98a', part: 'evening', auto: 'Tự tích khi ghi buổi đọc', link: '#books' },
  { id: 'sleep', name: 'Ngủ đúng giờ', icon: '😴', color: '#a7b0f0', part: 'evening' },
];
// Gợi ý thêm nhanh. Mã cố định nên thêm trên hai máy không bị trùng. extra = tự tích từ hoạt động có sẵn (không cộng xu lần nữa).
export const SUGGESTIONS = [
  { id: 's-journal', name: 'Viết nhật ký', icon: '✍️', color: '#c7a8ee', part: 'evening', auto: 'Tự tích khi viết nhật ký', link: '#journal' },
  { id: 's-vocab', name: 'Ôn từ vựng', icon: '🌱', color: '#8fd6a5', part: 'any', auto: 'Tự tích khi ôn từ vựng', link: '#vocab' },
  { id: 's-grateful', name: 'Biết ơn 3 điều', icon: '🙏', color: '#f6cf7a', part: 'evening', auto: 'Tự tích khi đủ 3 điều biết ơn', link: '#mindful' },
  { id: 's-focus', name: 'Một phiên tập trung', icon: '🍅', color: '#f49b8c', part: 'any', auto: 'Tự tích khi xong 1 quả cà chua', link: '#focus' },
  { id: 's-money', name: 'Ghi chi tiêu', icon: '💰', color: '#f2cf63', part: 'evening', auto: 'Tự tích khi ghi thu chi', link: '#money' },
  { id: 's-sun', name: 'Thoa kem chống nắng', icon: '☀️', color: '#f9c74f', part: 'morning' },
  { id: 's-bed', name: 'Dọn giường', icon: '🛏️', color: '#a9c5f5', part: 'morning' },
  { id: 's-vitamin', name: 'Uống vitamin', icon: '💊', color: '#f4a28c', part: 'morning' },
  { id: 's-veg', name: 'Ăn rau và trái cây', icon: '🥗', color: '#9ad47f', part: 'any' },
  { id: 's-walk', name: 'Đi bộ 30 phút', icon: '🚶', color: '#7fcfb8', part: 'any' },
  { id: 's-stretch', name: 'Giãn cơ', icon: '🤸', color: '#d7a6e6', part: 'any' },
  { id: 's-floss', name: 'Dùng chỉ nha khoa', icon: '🦷', color: '#9fd8e6', part: 'evening' },
  { id: 's-home', name: 'Dọn nhà 15 phút', icon: '🧹', color: '#c9b79c', part: 'any' },
  { id: 's-parents', name: 'Gọi cho bố mẹ', icon: '📞', color: '#f59fb4', part: 'any', perWeek: 2 },
  { id: 's-sugar', name: 'Không uống nước ngọt', icon: '🥤', color: '#f28fa0', part: 'any', kind: 'avoid' },
  { id: 's-phone', name: 'Không điện thoại trước ngủ', icon: '📵', color: '#b4b8c9', part: 'evening', kind: 'avoid' },
];
export const COLORS = ['#f4a6c0', '#f49b8c', '#f7b267', '#f2cf63', '#9ad47f', '#8fd6a5', '#8ed3c7', '#6cc7ee', '#8fb4f7', '#a7b0f0', '#bda2f2', '#e2b98a'];
export const PARTS = { morning: '🌅 Buổi sáng', any: '🌤️ Trong ngày', evening: '🌙 Buổi tối' };
export const HABIT_COINS = 5;
export const STREAK_BONUS = 50;
export const REST = 2; // thói quen hằng ngày: mỗi tuần được nghỉ 2 ngày mà không đứt chuỗi

// Mỗi thói quen tự tạo / chỉnh sửa = một dòng settings 'habit:<id>' (chồng lên thói quen có sẵn). Danh sách cũ 'customHabits' vẫn được đọc.
export async function allHabits({ archived = false } = {}) {
  const base = [...BUILT_IN, ...((await getSetting('customHabits')) ?? [])];
  const map = new Map(base.map((x, i) => [x.id, { color: COLORS[i % COLORS.length], part: 'any', kind: 'check', order: i, ...x }]));
  for (const [k, v] of await entriesByPrefix('settings', 'habit:')) if (v) { const id = k.slice(6); map.set(id, { color: COLORS[0], part: 'any', kind: 'check', order: 100, ...map.get(id), ...v, id }); }
  return [...map.values()].filter((x) => !!x.archived === archived).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
export async function saveHabit(id, patch) {
  await setSetting(`habit:${id}`, { ...((await getSetting(`habit:${id}`)) ?? {}), ...patch });
  notifyChange();
}
export async function addHabit(hb) {
  const id = hb.id ?? `c-${Date.now()}`;
  const order = Math.max(0, ...(await allHabits()).map((x) => x.order ?? 0)) + 1;
  await saveHabit(id, { custom: true, created: todayKey(), order, ...hb, id, archived: false });
  return id;
}
export const archiveHabit = (id, on = true) => saveHabit(id, { archived: on }); // ẩn, lịch sử vẫn giữ
export const addCustomHabit = (name, icon = '⭐') => addHabit({ name, icon });

// Tự tích cho các thói quen gợi ý (chỉ để hiển thị, không cộng thêm xu).
const EXTRA = { journal_written: 's-journal', vocab_session: 's-vocab', pomodoro_done: 's-focus', money_logged: 's-money' };
function extraDays(events) {
  const map = new Map(); const mark = (id, d) => { if (!map.has(id)) map.set(id, new Set()); map.get(id).add(d); };
  for (const e of events) {
    const id = EXTRA[e.type] ?? (e.type === 'mindful_done' && e.practice === 'gratitude' ? 's-grateful' : null);
    if (id) mark(id, e.day ?? dayOf(e.at));
  }
  return map;
}

// ---- lịch & chuỗi ----
export const isActive = (hb, day) => !(hb.days?.length && hb.days.length < 7 && !hb.perWeek) || hb.days.includes(toDate(day).getDay());
export const restOf = (hb) => (hb.perWeek ? 7 - hb.perWeek : hb.days?.length && hb.days.length < 7 ? 0 : REST);
export function scheduleText(hb) {
  if (hb.perWeek && hb.perWeek < 7) return `${hb.perWeek} lần/tuần`;
  if (!hb.days?.length || hb.days.length === 7) return 'hằng ngày';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => hb.days.includes(d)).map((d) => (d ? `T${d + 1}` : 'CN')).join(', ');
}
// Chuỗi hiện tại, còn mấy ngày nghỉ, chuỗi dài nhất. Ngày không có lịch thì bỏ qua; hôm nay chưa xong chưa tính là đứt.
export function streakInfo(set, today, hb) {
  const first = [...set].reduce((m, d) => (d < m ? d : m), today); const rest = restOf(hb);
  const used = new Map(); let days = set.has(today) ? 1 : 0;
  for (let d = addDays(today, -1); d >= first; d = addDays(d, -1)) {
    if (set.has(d)) { days++; continue; }
    if (!isActive(hb, d)) continue;
    const wk = weekStart(d); const n = used.get(wk) ?? 0;
    if (n >= rest) break;
    used.set(wk, n + 1);
  }
  let best = 0; let run = 0; let u = new Map();
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (set.has(d)) { run++; if (run > best) best = run; continue; }
    if (!isActive(hb, d) || d === today) continue;
    const wk = weekStart(d); const n = u.get(wk) ?? 0;
    if (n >= rest) { run = 0; u = new Map([[wk, n]]); } else u.set(wk, n + 1);
  }
  return { days: set.size ? days : 0, restLeft: Math.max(0, rest - (used.get(weekStart(today)) ?? 0)), best: Math.max(best, set.size ? days : 0) };
}

// Toàn bộ thói quen kèm lịch sử (dùng cho tab Thói quen và thẻ trên Hôm nay).
export async function habitBoard(opts = {}) {
  const events = await getAll('events'); const today = todayKey();
  const days = habitDaysFrom(events); const extra = extraDays(events);
  const counts = new Map(); const manual = new Map();
  for (const e of events) {
    if (e.type === 'habit_count') { const k = `${e.habit}|${e.day}`; counts.set(k, (counts.get(k) ?? 0) + e.n); }
    if (e.type === 'habit_done') { if (!manual.has(e.habit)) manual.set(e.habit, new Set()); manual.get(e.habit).add(e.day); }
  }
  return (await allHabits(opts)).map((hb) => {
    const set = new Set([...(days.get(hb.id) ?? []), ...(extra.get(hb.id) ?? [])]);
    const first = [...set].reduce((m, d) => (!m || d < m ? d : m), null);
    const since = first && hb.created ? (first < hb.created ? first : hb.created) : first ?? hb.created ?? today;
    const st = streakInfo(set, today, hb);
    return { ...hb, set, since, streak: st, best: st.best, total: set.size, totalDays: set.size, doneToday: set.has(today), activeToday: isActive(hb, today), countOn: (d) => counts.get(`${hb.id}|${d}`) ?? 0, manualOn: (d) => manual.get(hb.id)?.has(d) ?? false };
  });
}
// Đã làm / cần làm trong một khoảng ngày (không tính trước khi bắt đầu và sau hôm nay).
export function rate(hb, from, to, today = todayKey()) {
  let done = 0; let due = 0; const a = from < hb.since ? hb.since : from; const z = to > today ? today : to;
  for (let d = a; d <= z; d = addDays(d, 1)) { const ok = hb.set.has(d); if (ok) done++; if (isActive(hb, d) && (ok || d !== today)) due++; } // hôm nay chưa làm thì chưa tính là thiếu
  if (hb.perWeek && hb.perWeek < 7) due = Math.max(due ? 1 : 0, Math.round((due * hb.perWeek) / 7));
  return { done, due, counted: Math.min(done, due) };
}

// ---- tích / bỏ tích một ngày bất kỳ (tới hôm nay) ----
export async function toggleDay(hb, day = todayKey()) {
  if (day > todayKey()) return 'future';
  if (!hb.set.has(day)) { await logEvent('habit_done', { habit: hb.id, day }); notifyChange(); return 'done'; }
  if (!hb.manualOn(day) && !(hb.id === 'sleep')) return 'auto';
  for (const e of await queryEvents('habit_done')) if (e.habit === hb.id && e.day === day) await deleteEvent(e.id);
  for (const e of await queryEvents('habit_count')) if (e.habit === hb.id && e.day === day) await deleteEvent(e.id);
  if (hb.id === 'sleep') for (const e of await queryEvents('sleep_logged')) if (e.day === day) await deleteEvent(e.id);
  notifyChange();
  return (await habitBoard()).find((x) => x.id === hb.id)?.set.has(day) ? 'auto' : 'undone';
}
export async function addCount(hb, day = todayKey(), n = 1) {
  if (day > todayKey()) return 0;
  const now = hb.countOn(day); const v = Math.max(0, now + n);
  if (v === now) return now;
  await logEvent('habit_count', { habit: hb.id, day, n: v - now });
  const done = v >= (hb.target || 1);
  if (done && !hb.manualOn(day)) await logEvent('habit_done', { habit: hb.id, day });
  if (!done && hb.manualOn(day)) for (const e of await queryEvents('habit_done')) if (e.habit === hb.id && e.day === day) await deleteEvent(e.id);
  notifyChange();
  return v;
}

// Ngày nào thói quen nào đã xong (tính từ danh sách sự kiện). Dùng chung cho xu và chuỗi ngày.
export function habitDaysFrom(events) {
  const map = new Map(); // habitId → Set(day)
  const mark = (id, day) => { if (!map.has(id)) map.set(id, new Set()); map.get(id).add(day); };
  for (const e of events) {
    const day = e.day ?? dayOf(e.at);
    if (e.type === 'water_goal') mark('water', day);
    else if (e.type === 'meal_logged' && e.meal === 'sang' && e.source !== 'water') mark('breakfast', day);
    else if (e.type === 'exercise_logged') mark('exercise', day);
    else if (e.type === 'sleep_logged') mark('sleep', day);
    else if (e.type === 'habit_done') mark(e.habit, day);
    else if (e.type === 'lesson_done') mark('english', day); // P9.04: học trong IELTS → tự tích
    else if (e.type === 'reading_done') mark('reading', day); // P48: ghi buổi đọc sách → tự tích
    else if (e.type === 'meditation_done') mark('meditate', day); // P49
  }
  // P6.03: ngày mệt mà đã làm ít nhất 1 việc nhỏ thì cả ngày được tính là thắng (giữ chuỗi).
  for (const e of events) {
    if (e.type === 'tired_win') for (const id of new Set([...BUILT_IN.map((b) => b.id), ...map.keys()])) mark(id, e.day);
  }
  return map;
}

export const habitStatus = () => habitBoard();

export async function checkHabit(id, data = {}) {
  await logEvent('habit_done', { habit: id, day: todayKey(), ...data });
  notifyChange();
}
// Bỏ tích (chỉ với thói quen ghi tay).
export async function uncheckHabit(id) {
  for (const e of await queryEvents('habit_done')) if (e.habit === id && e.day === todayKey()) await deleteEvent(e.id);
  for (const e of id === 'sleep' ? await queryEvents('sleep_logged') : []) if (e.day === todayKey()) await deleteEvent(e.id);
  notifyChange();
}

export async function logSleep(bed, wake) {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  await logEvent('sleep_logged', { day: todayKey(), bed, wake, hours: Math.round((mins / 60) * 10) / 10 });
  notifyChange();
}

// ---- P6.03: chế độ ngày mệt ----
export async function isTiredDay() {
  return (await getSetting('tiredDay')) === todayKey();
}
export async function setTiredDay(on) {
  await setSetting('tiredDay', on ? todayKey() : null);
  notifyChange();
}
// Đã có "một việc nhỏ" chưa: xong 1 việc, 1 thói quen, 1 ly nước, 1 phiên tập trung…
const SMALL_WINS = new Set(['task_done', 'habit_done', 'water_logged', 'pomodoro_done', 'meal_logged', 'exercise_logged', 'sleep_logged', 'journal_written', 'mood_logged']);
export async function checkTiredWin() {
  if (!(await isTiredDay())) return false;
  const today = todayKey();
  const events = await getAll('events');
  if (events.some((e) => e.type === 'tired_win' && e.day === today)) return true;
  if (!events.some((e) => SMALL_WINS.has(e.type) && (e.day ?? dayOf(e.at)) === today)) return false;
  await logEvent('tired_win', { day: today });
  return true;
}

// ---- P6.02: thưởng 50 xu mỗi khi chuỗi chạm mốc 7, 14, 21… ngày ----
export async function checkStreakBonus() {
  const status = await habitStatus();
  const got = new Set((await queryEvents('streak_bonus')).map((e) => `${e.habit}|${e.milestone}`));
  const reached = [];
  for (const hb of status) {
    const m = Math.floor(hb.streak.days / 7) * 7;
    if (m >= 7 && !got.has(`${hb.id}|${m}`)) {
      await logEvent('streak_bonus', { habit: hb.id, milestone: m, day: todayKey() });
      reached.push({ ...hb, milestone: m });
    }
  }
  return reached;
}

export const REST_PER_WEEK_LABEL = 2;
