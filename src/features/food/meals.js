// P3.05–P3.17: dữ liệu bữa ăn. Mỗi món ăn là 1 sự kiện meal_logged.
import { get, getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, deleteEvent, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, weekStart } from '../../core/dates.js';
import { deletePhoto } from '../../core/photos.js';
import { foodById, portion, normalize, searchFoods } from './foods.js';
import { getBody, targets } from './body.js';

export const MEALS = [['sang', '🌅 Sáng'], ['trua', '☀️ Trưa'], ['toi', '🌙 Tối'], ['vat', '🍪 Ăn vặt']];
export const MAIN_MEALS = ['sang', 'trua', 'toi'];

export async function myFoods() {
  return (await getSetting('myFoods')) ?? [];
}
export async function saveMyFood(f) {
  const list = await myFoods();
  const item = { ...f, id: f.id ?? `my-${Date.now()}`, mine: true };
  await setSetting('myFoods', [...list.filter((x) => x.id !== item.id), item]);
  return item;
}

export async function addMeal({ meal, food, qty = 1, grams = null, name, kcal, p = 0, c = 0, f = 0, photoId = null, source }) {
  const n = food ? portion(food, { qty, grams }) : { kcal: Math.round(kcal), p, c, f };
  return logEvent('meal_logged', {
    day: todayKey(), meal,
    name: name ?? food?.name ?? 'Món khác',
    foodId: food?.id ?? null, qty: grams != null ? null : qty, grams, unit: food?.unit ?? null,
    ...n, photoId, source,
  }).then((id) => { notifyChange(); return id; });
}

export async function removeMeal(id) {
  const e = await get('events', id);
  if (e?.photoId) await deletePhoto(e.photoId);
  await deleteEvent(id);
  notifyChange();
}

export async function mealsOn(day = todayKey()) {
  return (await queryEvents('meal_logged')).filter((e) => e.day === day).sort((a, b) => a.id - b.id);
}

export const sum = (list) => list.reduce((s, e) => ({
  kcal: s.kcal + e.kcal, p: s.p + (e.p || 0), c: s.c + (e.c || 0), f: s.f + (e.f || 0),
}), { kcal: 0, p: 0, c: 0, f: 0 });

export async function exerciseOn(day = todayKey()) {
  return (await queryEvents('exercise_logged')).filter((e) => e.day === day);
}

// P3.08
export async function recentFoods(limit = 8) {
  const seen = new Map();
  const list = (await queryEvents('meal_logged')).sort((a, b) => b.id - a.id);
  for (const e of list) {
    const key = e.foodId ?? `name:${e.name}`;
    if (!seen.has(key)) seen.set(key, e);
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}
export async function favorites() {
  return (await getSetting('foodFav')) ?? [];
}
export async function toggleFavorite(foodId) {
  const fav = await favorites();
  await setSetting('foodFav', fav.includes(foodId) ? fav.filter((x) => x !== foodId) : [...fav, foodId]);
  notifyChange();
}
export async function repeatYesterday(meal) {
  const y = (await mealsOn(addDays(todayKey(), -1))).filter((e) => e.meal === meal);
  for (const { id, at, type, source, ...rest } of y) {
    await logEvent('meal_logged', { ...rest, day: todayKey(), photoId: null, source: 'repeat' });
  }
  notifyChange();
  return y.length;
}

// P3.15
export async function specialDays() {
  return new Set((await getSetting('specialDays')) ?? []);
}
export async function toggleSpecial(day = todayKey()) {
  const s = await specialDays();
  s.has(day) ? s.delete(day) : s.add(day);
  await setSetting('specialDays', [...s]);
  notifyChange();
}

// P3.16: trung bình kcal theo tuần (bỏ ngày đặc biệt và ngày chưa ghi).
export async function weeklyAverages(weeks = 8) {
  const special = await specialDays();
  const byDay = new Map();
  for (const e of await queryEvents('meal_logged')) byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.kcal);
  const thisWeek = weekStart(todayKey());
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i));
    const days = Array.from({ length: 7 }, (_, d) => addDays(start, d)).filter((d) => byDay.has(d) && !special.has(d));
    const avg = days.length ? Math.round(days.reduce((s, d) => s + byDay.get(d), 0) / days.length) : null;
    return { start, avg, days: days.length };
  });
}

// P3.17: nhắc nhẹ nếu 3 ngày ghi gần nhất (mỗi ngày ≥ 2 bữa chính) đều dưới mức sàn.
export async function lowIntakeWarning() {
  const b = await getBody();
  const t = targets(b);
  if (!t) return false;
  const special = await specialDays();
  const days = new Map();
  for (const e of await queryEvents('meal_logged')) {
    if (special.has(e.day) || e.day === todayKey()) continue;
    const d = days.get(e.day) ?? { kcal: 0, meals: new Set() };
    d.kcal += e.kcal;
    if (MAIN_MEALS.includes(e.meal)) d.meals.add(e.meal);
    days.set(e.day, d);
  }
  const full = [...days].filter(([, d]) => d.meals.size >= 2).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 3);
  return full.length === 3 && full.every(([, d]) => d.kcal < t.floor);
}

// P3.07: "trưa phở bò 1 bát", "sáng 2 trứng luộc", "vặt trà sữa", "tối cơm 350kcal"
const MEAL_WORDS = [['sang', /^(?:bữa\s+)?(?:sáng|sang)\b/i], ['trua', /^(?:bữa\s+)?(?:trưa|trua)\b/i], ['toi', /^(?:bữa\s+)?(?:tối|toi|chiều|chieu)\b/i], ['vat', /^(?:ăn\s+)?(?:vặt|vat|xế|xe)\b/i]];
export function guessMeal(hour = new Date().getHours()) {
  if (hour < 10) return 'sang';
  if (hour < 14) return 'trua';
  if (hour >= 17 && hour < 22) return 'toi';
  return 'vat';
}
export function parseFoodLine(text, extra = []) {
  let s = text.trim();
  let meal = null;
  for (const [k, re] of MEAL_WORDS) { const m = re.exec(s); if (m) { meal = k; s = s.slice(m[0].length).trim(); break; } }
  let kcal = null;
  s = s.replace(/(\d+)\s*kcal\b/i, (_, n) => { kcal = Number(n); return ' '; });
  let grams = null;
  s = s.replace(/(\d+)\s*(?:g|gr|gram)\b/i, (_, n) => { grams = Number(n); return ' '; });
  let qty = 1;
  s = s.replace(/(?:^|\s)(\d+(?:[.,]\d+)?|nửa|rưỡi)(?:\s+(?:bát|tô|đĩa|dĩa|suất|phần|ổ|cái|quả|trái|ly|cốc|lon|chai|gói|miếng|lát|củ|bắp|hộp|viên|cuộn|múi|nắm|thanh|khúc))?(?=\s|$)/i, (_, n) => {
    qty = n === 'nửa' ? 0.5 : n === 'rưỡi' ? 1.5 : Number(n.replace(',', '.'));
    return ' ';
  });
  const name = s.replace(/\s+/g, ' ').trim();
  const food = name ? searchFoods(name, extra, 1)[0] ?? null : null;
  return { meal, name, food, qty, grams, kcal };
}

// Gộp kcal từ đồ uống bên phần Nước (P3.13).
export const DRINK_KCAL_PER_100ML = { milktea: 75, soda: 42 };

export const sameNorm = (a, b) => normalize(a) === normalize(b);
export { foodById };
