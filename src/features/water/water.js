// P1.13–P1.15, P1.21: dữ liệu uống nước. Mỗi lần uống là 1 sự kiện water_logged.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, deleteEvent, notifyChange, bus } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, weekStart } from '../../core/dates.js';
import { get } from '../../core/db.js';
import { addMeal, removeMeal, guessMeal, DRINK_KCAL_PER_100ML } from '../food/meals.js';

// k = phần được tính vào lượng nước (ước tính, chỉnh được sau).
export const DRINKS = [
  { id: 'water', name: 'Nước lọc', icon: '💧', k: 1 },
  { id: 'tea', name: 'Trà', icon: '🍵', k: 0.9 },
  { id: 'milk', name: 'Sữa', icon: '🥛', k: 0.9 },
  { id: 'juice', name: 'Nước ép', icon: '🧃', k: 0.9 },
  { id: 'coffee', name: 'Cà phê', icon: '☕', k: 0.8 },
  { id: 'milktea', name: 'Trà sữa', icon: '🧋', k: 0.5 },
  { id: 'soda', name: 'Nước ngọt', icon: '🥤', k: 0.5 },
];
export const drinkOf = (id) => DRINKS.find((d) => d.id === id) ?? DRINKS[0];

export const DEFAULT_WATER = {
  weightKg: null,
  mlPerKg: 33,
  goalMl: null, // đặt tay; null = tự tính
  cups: [
    { id: 'c1', name: 'Ly', icon: '🥛', ml: 200 },
    { id: 'c2', name: 'Cốc', icon: '☕', ml: 300 },
    { id: 'c3', name: 'Chai', icon: '🍶', ml: 500 },
    { id: 'c4', name: 'Bình', icon: '🫙', ml: 750 },
  ],
  defaultCup: 'c1',
  remind: true,
  wake: '07:00',
  sleep: '22:30',
  intervalMin: 75,
};
export const HOT_ML = 300;
export const ACTIVE_ML = 500;

export async function getWaterSettings() {
  return { ...DEFAULT_WATER, ...((await getSetting('water')) ?? {}) };
}
export async function saveWaterSettings(s) {
  await setSetting('water', s);
  notifyChange();
}

export function baseGoal(s) {
  if (s.goalMl) return s.goalMl;
  if (s.weightKg) return Math.round((s.weightKg * s.mlPerKg) / 50) * 50;
  return 2000;
}

export async function getBonus(day = todayKey()) {
  const b = await getSetting('waterBonus');
  return b?.day === day ? b : { day, hot: false, active: false };
}
export async function toggleBonus(kind) {
  const b = await getBonus();
  b[kind] = !b[kind];
  await setSetting('waterBonus', b);
  notifyChange();
}
export const bonusMl = (b) => (b.hot ? HOT_ML : 0) + (b.active ? ACTIVE_ML : 0);

export async function goalToday() {
  return baseGoal(await getWaterSettings()) + bonusMl(await getBonus());
}

export async function waterLogs(day = todayKey()) {
  return (await queryEvents('water_logged')).filter((e) => e.day === day).sort((a, b) => a.id - b.id);
}

export async function waterToday() {
  const logs = await waterLogs();
  return { logs, total: logs.reduce((s, e) => s + e.hydrationMl, 0), goal: await goalToday() };
}

export async function addWater(ml, drinkId = 'water') {
  const d = drinkOf(drinkId);
  const day = todayKey();
  const goal = await goalToday();
  let mealId = null;
  if (DRINK_KCAL_PER_100ML[d.id]) {
    const kcal = Math.round((ml * DRINK_KCAL_PER_100ML[d.id]) / 100);
    mealId = await addMeal({ meal: guessMeal(), name: `${d.name} ${ml} ml`, kcal, c: Math.round(kcal / 4), source: 'water' });
  }
  await logEvent('water_logged', { ml, drink: d.id, hydrationMl: Math.round(ml * d.k), day, goal, mealId });
  const { total } = await waterToday();
  if (total >= goal && !(await queryEvents('water_goal')).some((e) => e.day === day)) {
    await logEvent('water_goal', { day });
    bus.dispatchEvent(new Event('water-goal'));
  }
  notifyChange();
}

export async function addDefaultCup() {
  const s = await getWaterSettings();
  const cup = s.cups.find((c) => c.id === s.defaultCup) ?? s.cups[0];
  await addWater(cup.ml, 'water');
  return cup;
}

export async function undoWater(eventId) {
  const e = await get('events', eventId);
  if (e?.mealId) await removeMeal(e.mealId);
  await deleteEvent(eventId);
  notifyChange();
}

// Tổng theo ngày: Map day → { total, goal } (goal = mục tiêu lúc ghi).
async function dailyTotals() {
  const map = new Map();
  for (const e of await queryEvents('water_logged')) {
    const m = map.get(e.day) ?? { total: 0, goal: e.goal ?? 2000 };
    m.total += e.hydrationMl;
    if (e.goal) m.goal = e.goal;
    map.set(e.day, m);
  }
  return map;
}

export async function waterHistory(days) {
  const map = await dailyTotals();
  const today = todayKey();
  const fallback = baseGoal(await getWaterSettings());
  const todayGoal = await goalToday();
  // Chỉ tính từ ngày bắt đầu ghi: không "phạt" những ngày trước khi dùng app.
  const first = [...map.keys()].sort()[0] ?? today;
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    const m = map.get(day);
    return { day, tracked: day >= first, total: m?.total ?? 0, goal: day === today ? todayGoal : m?.goal ?? fallback };
  });
}

// Chuỗi ngày uống đủ, mỗi tuần (T2–CN) được nghỉ phép tối đa 2 ngày.
// Hôm nay chưa đủ thì chưa tính là đứt chuỗi.
export const REST_PER_WEEK = 2;
export async function waterStreak() {
  const map = await dailyTotals();
  const today = todayKey();
  if (!map.size) return { days: 0, restLeft: REST_PER_WEEK };
  const first = [...map.keys()].sort()[0];
  const met = (d) => { const m = map.get(d); return !!m && m.total >= m.goal; };
  const rest = new Map();
  let days = met(today) ? 1 : 0;
  for (let d = addDays(today, -1); d >= first; d = addDays(d, -1)) {
    if (met(d)) { days++; continue; }
    const wk = weekStart(d);
    const used = rest.get(wk) ?? 0;
    if (used >= REST_PER_WEEK) break;
    rest.set(wk, used + 1);
  }
  return { days, restLeft: REST_PER_WEEK - (rest.get(weekStart(today)) ?? 0) };
}
