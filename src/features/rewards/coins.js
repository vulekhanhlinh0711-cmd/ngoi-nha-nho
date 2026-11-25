// P1.17: ví xu, tính hoàn toàn từ nhật ký sự kiện (đổi luật thưởng thì chỉ sửa bảng dưới).
// Thưởng cho hành động, không thưởng cho con số. Tối đa DAILY_CAP xu mỗi ngày.
import { getAll } from '../../core/db.js';
import { todayKey, dayOf } from '../../core/time.js';
import { habitDaysFrom, HABIT_COINS, STREAK_BONUS } from '../habits/habits.js';

export const DAILY_CAP = 150;
export const MEAL_COINS = 3;
export const FULL_DAY_COINS = 15;
export const COIN_RULES = {
  task_done: (e) => (e.important ? 25 : 10),
  pomodoro_done: () => 10,
  inbox_zero: () => 15,
  water_goal: () => 10,
  bill_paid: (e) => (e.onTime ? 10 : 0),
  econ_lesson_done: () => 10,
  meditation_done: (e) => Math.min(20, 5 + (e.minutes ?? 0)), // P46: thiền 5 + 1 xu/phút (tối đa 20)
  vision_achieved: () => 20,
  book_finished: () => 20,
};
// Chỉ thưởng lần đầu mỗi ngày.
export const ONCE_PER_DAY = { money_logged: 5, no_spend_day: 10, mindful_done: 10 };

export async function coinSummary() {
  const events = (await getAll('events')).sort((a, b) => a.id - b.id);
  const perDay = new Map();
  const credited = new Map(); // taskId → { day, amount }: hoàn tác "xong" trong ngày thì trừ lại
  const add = (day, n) => perDay.set(day, (perDay.get(day) ?? 0) + n);
  let spent = 0;
  const mealSlots = new Map(); // day → Set(bữa đã ghi)
  const onceSeen = new Set();

  for (const e of events) {
    const day = e.day ?? dayOf(e.at);
    if (e.type === 'task_done') {
      if (credited.has(e.taskId)) continue;
      const amount = COIN_RULES.task_done(e);
      credited.set(e.taskId, { day, amount });
      add(day, amount);
    } else if (e.type === 'task_moved' && e.from === 'done') {
      const c = credited.get(e.taskId);
      if (c && c.day === day) { add(day, -c.amount); credited.delete(e.taskId); }
    } else if (e.type === 'meal_logged' && e.source !== 'water') {
      const slots = mealSlots.get(day) ?? new Set();
      if (!slots.has(e.meal)) {
        slots.add(e.meal);
        add(day, MEAL_COINS);
        if (['sang', 'trua', 'toi'].every((m) => slots.has(m))) add(day, FULL_DAY_COINS);
      }
      mealSlots.set(day, slots);
    } else if (ONCE_PER_DAY[e.type]) {
      const k = `${e.type}|${day}`;
      if (!onceSeen.has(k)) { onceSeen.add(k); add(day, ONCE_PER_DAY[e.type]); }
    } else if (e.type === 'coins_earned' && !e.uncapped) {
      add(day, e.amount);
    } else if (e.type === 'coins_spent') {
      spent += e.amount;
    } else if (COIN_RULES[e.type]) {
      add(day, COIN_RULES[e.type](e));
    }
  }

  // Thói quen: +5 mỗi thói quen mỗi ngày (uống nước đã có thưởng riêng nên không tính lại).
  for (const [id, days] of habitDaysFrom(events)) {
    if (id === 'water') continue;
    for (const d of days) add(d, HABIT_COINS);
  }

  let earned = 0;
  for (const v of perDay.values()) earned += Math.min(Math.max(v, 0), DAILY_CAP);
  // Không bị giới hạn ngày: thưởng chuỗi 7 ngày, bán nông sản.
  for (const e of events) {
    if (e.type === 'streak_bonus') earned += STREAK_BONUS;
    else if (e.type === 'coins_earned' && e.uncapped) earned += e.amount;
  }
  const todayRaw = Math.max(perDay.get(todayKey()) ?? 0, 0);
  return { balance: earned - spent, earned, today: Math.min(todayRaw, DAILY_CAP), capped: todayRaw >= DAILY_CAP };
}
