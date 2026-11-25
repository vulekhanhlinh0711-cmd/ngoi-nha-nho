// P3.01–P3.02: hồ sơ cơ thể, BMR (Mifflin-St Jeor), TDEE, mục tiêu có mức sàn an toàn.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';

export const ACTIVITY = [
  [1.2, 'Ít vận động (ngồi nhiều)'],
  [1.375, 'Vận động nhẹ (1–3 buổi/tuần)'],
  [1.55, 'Vừa phải (3–5 buổi/tuần)'],
  [1.725, 'Nhiều (6–7 buổi/tuần)'],
  [1.9, 'Rất nhiều (lao động nặng)'],
];

export const DEFAULT_BODY = {
  heightCm: null, weightKg: null, age: null, sex: 'f', activity: 1.375,
  deficit: 400,         // giảm 300–500 kcal/ngày
  hideNumbers: false,   // P3.14
  showMacros: false,    // P3.11
  addExercise: false,   // P3.12: cộng kcal vận động vào mục tiêu
};

export async function getBody() {
  return { ...DEFAULT_BODY, ...((await getSetting('body')) ?? {}) };
}
export async function saveBody(b) {
  await setSetting('body', b);
  notifyChange();
}

export const profileReady = (b) => !!(b.heightCm && b.weightKg && b.age);

export function bmr(b) {
  if (!profileReady(b)) return null;
  return Math.round(10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (b.sex === 'm' ? 5 : -161));
}
export const tdee = (b) => (bmr(b) ? Math.round(bmr(b) * b.activity) : null);

// Mục tiêu = TDEE − mức giảm, nhưng không bao giờ thấp hơn BMR (mức sàn).
export function targets(b) {
  const base = bmr(b);
  if (!base) return null;
  const t = tdee(b);
  const want = t - b.deficit;
  return { bmr: base, tdee: t, target: Math.max(want, base), floor: base, clamped: want < base };
}

// Cân nặng: tùy chọn, chỉ xem xu hướng.
export async function logWeight(kg) {
  await logEvent('weight_logged', { kg, day: todayKey() });
  const b = await getBody();
  await saveBody({ ...b, weightKg: kg });
}
export async function weightSeries() {
  const byDay = new Map();
  for (const e of await queryEvents('weight_logged')) byDay.set(e.day, e.kg);
  return [...byDay].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, kg]) => ({ day, kg }));
}

// P3.12: kcal vận động ước tính theo MET.
export const EXERCISES = [
  ['walk', '🚶 Đi bộ', 3.5], ['yoga', '🧘 Yoga', 2.5], ['dance', '💃 Nhảy', 5],
  ['run', '🏃 Chạy bộ', 8], ['bike', '🚴 Đạp xe', 6], ['gym', '🏋️ Tập gym', 5], ['swim', '🏊 Bơi', 6],
];
export function exerciseKcal(kind, minutes, weightKg) {
  const met = EXERCISES.find((e) => e[0] === kind)?.[2] ?? 4;
  return Math.round(met * (weightKg || 55) * (minutes / 60));
}
export async function logExercise(kind, minutes) {
  const b = await getBody();
  await logEvent('exercise_logged', { kind, minutes, kcal: exerciseKcal(kind, minutes, b.weightKg), day: todayKey() });
  notifyChange();
}
