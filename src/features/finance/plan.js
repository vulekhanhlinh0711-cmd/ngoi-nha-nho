// P5.04–P5.10: ngân sách, mục tiêu tiết kiệm, trả nợ, lịch sale, quy tắc chờ 48 giờ.
import { getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { makeKey, toDate, addDays, diffDays } from '../../core/dates.js';

// ---- Ngân sách ----
// Mỗi phương pháp: các "lọ" (tên, %) và danh mục chi thuộc lọ nào.
export const METHODS = {
  jars: {
    name: '6 chiếc lọ',
    buckets: [
      ['nec', 'Thiết yếu', 55, ['food', 'transport', 'home', 'health', 'bills']],
      ['play', 'Hưởng thụ', 10, ['fun', 'shopping']],
      ['edu', 'Giáo dục', 10, ['learning']],
      ['give', 'Cho đi', 5, ['family']],
      ['ltss', 'Tiết kiệm dài hạn', 10, []],
      ['ffa', 'Tự do tài chính', 10, []],
    ],
  },
  '503020': {
    name: '50/30/20',
    buckets: [
      ['needs', 'Nhu cầu', 50, ['food', 'transport', 'home', 'health', 'bills']],
      ['wants', 'Mong muốn', 30, ['fun', 'shopping', 'family', 'learning']],
      ['save', 'Tiết kiệm', 20, []],
    ],
  },
};
export const OTHER_BUCKET = 'other';

export async function getBudget() {
  const b = (await getSetting('budget')) ?? {};
  return { method: 'jars', income: null, custom: null, ...b };
}
export async function saveBudget(b) {
  await setSetting('budget', b);
  notifyChange();
}

// Danh sách lọ đang dùng. "Tự đặt" = % tự chỉnh cho từng lọ của 6 chiếc lọ.
export function bucketsOf(budget) {
  const base = METHODS[budget.method === 'custom' ? 'jars' : budget.method].buckets;
  return base.map(([id, name, pct, cats]) => [id, name, budget.method === 'custom' ? (budget.custom?.[id] ?? pct) : pct, cats]);
}

// Chi tiêu theo lọ cho 1 tháng. Danh mục không thuộc lọ nào được tính vào lọ đầu tiên (thiết yếu/nhu cầu).
export function spendByBucket(budget, txs) {
  const buckets = bucketsOf(budget);
  const income = budget.income ?? txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = Object.fromEntries(buckets.map(([id]) => [id, 0]));
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const b = buckets.find(([, , , cats]) => cats.includes(t.category)) ?? buckets[0];
    spent[b[0]] += t.amount;
  }
  return buckets.map(([id, name, pct, cats]) => {
    const limit = Math.round((income * pct) / 100);
    const used = spent[id];
    return { id, name, pct, cats, limit, used, ratio: limit ? used / limit : used ? 1.5 : 0, savingJar: cats.length === 0 };
  });
}
// Trạng thái thanh ngân sách: ổn → gần hết → vượt (màu dịu, không đỏ gắt).
export const level = (ratio) => (ratio >= 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok');

// ---- Mục tiêu tiết kiệm ----
export function goalPlan(goal, today = todayKey()) {
  const saved = (goal.history ?? []).reduce((s, h) => s + h.amount, 0);
  const left = Math.max(goal.target - saved, 0);
  const months = goal.deadline ? Math.max(1, Math.ceil(diffDays(today, goal.deadline) / 30.44)) : null;
  return { saved, left, months, perMonth: months ? Math.ceil(left / months / 1000) * 1000 : null, pct: goal.target ? Math.min(1, saved / goal.target) : 0 };
}

// ---- Trả nợ: so sánh "quả cầu tuyết" (dư nợ nhỏ trước) và "lãi cao trước" ----
export function simulateDebts(debts, extra = 0, strategy = 'snowball') {
  let list = debts.map((d) => ({ id: d.id, name: d.name, bal: d.balance, rate: d.rate / 100 / 12, min: d.minPay, paidOff: null }));
  const order = (a, b) => (strategy === 'snowball' ? a.bal - b.bal : b.rate - a.rate);
  let month = 0;
  let interest = 0;
  const budget = list.reduce((s, d) => s + d.min, 0) + extra;
  while (list.some((d) => d.bal > 0) && month < 600) {
    month++;
    for (const d of list) if (d.bal > 0) { const i = d.bal * d.rate; d.bal += i; interest += i; }
    let pool = budget;
    for (const d of list) if (d.bal > 0) { const p = Math.min(d.min, d.bal); d.bal -= p; pool -= p; }
    for (const d of [...list].filter((x) => x.bal > 0).sort(order)) {
      if (pool <= 0) break;
      const p = Math.min(pool, d.bal);
      d.bal -= p;
      pool -= p;
    }
    for (const d of list) if (d.bal <= 0.5 && d.paidOff == null) { d.bal = 0; d.paidOff = month; }
  }
  const stuck = month >= 600;
  return { months: stuck ? null : month, interest: Math.round(interest), order: list.map((d) => ({ id: d.id, name: d.name, paidOff: d.paidOff })) };
}
export const monthLabel = (offset) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
};

// ---- Lịch sale (P5.09) ----
const TET = { 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03' };
function blackFriday(y) {
  const nov1 = new Date(y, 10, 1).getDay();
  const thanksgiving = 1 + ((4 - nov1 + 7) % 7) + 21; // thứ Năm thứ 4 của tháng 11
  return makeKey(y, 11, thanksgiving + 1);
}
export function saleCalendar(payday = 5, days = 75, today = todayKey()) {
  const end = addDays(today, days);
  const out = [];
  const y0 = Number(today.slice(0, 4));
  for (const y of [y0, y0 + 1]) {
    for (let m = 1; m <= 12; m++) {
      if (m >= 9) out.push({ day: makeKey(y, m, m), name: `Sale ${m}.${m}`, kind: 'double' });
      out.push({ day: makeKey(y, m, 15), name: 'Sale giữa tháng', kind: 'mid' });
      out.push({ day: makeKey(y, m, Math.min(payday, new Date(y, m, 0).getDate())), name: 'Ngày lương', kind: 'payday' });
    }
    out.push({ day: blackFriday(y), name: 'Black Friday', kind: 'bf' });
    if (TET[y]) out.push({ day: addDays(TET[y], -14), name: `Sale Tết ${y} (2 tuần trước Tết)`, kind: 'tet' });
  }
  return out.filter((s) => s.day >= today && s.day <= end).sort((a, b) => (a.day < b.day ? -1 : 1));
}

// ---- Quy tắc chờ 48 giờ (P5.10) ----
export const WAIT_HOURS = 48;
export function waitLeftHours(wish, now = Date.now()) {
  if (wish.urgent) return 0;
  return Math.max(0, Math.ceil(WAIT_HOURS - (now - new Date(wish.addedAt).getTime()) / 3_600_000));
}

export const daysUntil = (day, today = todayKey()) => diffDays(today, day);
export { toDate };
