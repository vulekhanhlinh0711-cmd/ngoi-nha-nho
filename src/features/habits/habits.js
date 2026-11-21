// P6.01–P6.03: thói quen. Một số tự tích từ dữ liệu có sẵn, số khác ghi tay.
// Thưởng cho hành động (đã làm), không thưởng cho con số.
import { getAll, getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, deleteEvent, notifyChange } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { streakOf } from '../../core/streak.js';

export const BUILT_IN = [
  { id: 'water', name: 'Uống đủ nước', icon: '💧', auto: 'Tự tích khi đủ nước', link: '#water' },
  { id: 'breakfast', name: 'Ăn sáng', icon: '🍳', auto: 'Tự tích khi ghi bữa sáng', link: '#food' },
  { id: 'exercise', name: 'Vận động', icon: '🏃', auto: 'Tự tích khi ghi vận động' },
  { id: 'english', name: 'Học tiếng Anh', icon: '📚', link: '#ielts' },
  { id: 'sleep', name: 'Ngủ đúng giờ', icon: '😴' },
];
export const HABIT_COINS = 5;
export const STREAK_BONUS = 50;

export async function customHabits() {
  return (await getSetting('customHabits')) ?? [];
}
export async function addCustomHabit(name, icon = '⭐') {
  const list = await customHabits();
  await setSetting('customHabits', [...list, { id: `c-${Date.now()}`, name, icon, custom: true }]);
  notifyChange();
}
export async function removeCustomHabit(id) {
  await setSetting('customHabits', (await customHabits()).filter((h) => h.id !== id));
  notifyChange();
}
export async function allHabits() {
  return [...BUILT_IN, ...(await customHabits())];
}

// Ngày nào thói quen nào đã xong (tính từ danh sách sự kiện). Dùng chung cho xu và chuỗi ngày.
export function habitDaysFrom(events) {
  const map = new Map(); // habitId → Set(day)
  const mark = (id, day) => { if (!map.has(id)) map.set(id, new Set()); map.get(id).add(day); };
  const water = new Map();
  for (const e of events) {
    const day = e.day ?? dayOf(e.at);
    if (e.type === 'water_goal') mark('water', day);
    else if (e.type === 'meal_logged' && e.meal === 'sang' && e.source !== 'water') mark('breakfast', day);
    else if (e.type === 'exercise_logged') mark('exercise', day);
    else if (e.type === 'sleep_logged') mark('sleep', day);
    else if (e.type === 'habit_done') mark(e.habit, day);
    else if (e.type === 'lesson_done') mark('english', day); // P9.04: học trong IELTS → tự tích
    else if (e.type === 'water_logged') water.set(day, (water.get(day) ?? 0) + e.hydrationMl);
  }
  // P6.03: ngày mệt mà đã làm ít nhất 1 việc nhỏ thì cả ngày được tính là thắng (giữ chuỗi).
  for (const e of events) {
    if (e.type === 'tired_win') for (const id of new Set([...BUILT_IN.map((b) => b.id), ...map.keys()])) mark(id, e.day);
  }
  return map;
}

export async function habitStatus() {
  const events = await getAll('events');
  const days = habitDaysFrom(events);
  const today = todayKey();
  const firstDay = events.length ? (events.reduce((m, e) => { const d = e.day ?? dayOf(e.at); return d < m ? d : m; }, today)) : today;
  const habits = await allHabits();
  return habits.map((hb) => {
    const set = days.get(hb.id) ?? new Set();
    // P13: tổng số ngày đã làm + 7 ngày gần nhất (cho dải tuần kiểu lịch).
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { day: k, done: set.has(k) }; });
    return { ...hb, doneToday: set.has(today), streak: streakOf(set, firstDay, today), totalDays: set.size, week };
  });
}

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
