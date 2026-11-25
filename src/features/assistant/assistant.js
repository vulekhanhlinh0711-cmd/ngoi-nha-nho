// P8.01–P8.03: trợ lý chạy hoàn toàn trên máy (không gửi dữ liệu đi đâu).
import { getAll, getSetting, setSetting } from '../../core/db.js';
import { queryEvents } from '../../core/events.js';
import { todayKey, dayOf, atTime } from '../../core/time.js';
import { addDays, weekStart, toDate } from '../../core/dates.js';
import { systemNotify } from '../../core/notify.js';
import { listOpenTasks, byDue } from '../tasks/tasks.js';
import { getTop3 } from '../today/top3.js';
import { habitDaysFrom, allHabits } from '../habits/habits.js';

export const WORK_START = 8;
export const WORK_END = 18;

// Số lần bị gián đoạn theo giờ cho thứ trong tuần hôm nay (30 ngày gần nhất).
async function interruptionsByHour(weekday) {
  const from = addDays(todayKey(), -29);
  const counts = new Map();
  for (const e of await queryEvents('interruption')) {
    const d = new Date(e.pausedAt ?? e.at);
    if (dayOf(d.toISOString()) < from || d.getDay() !== weekday) continue;
    counts.set(d.getHours(), (counts.get(d.getHours()) ?? 0) + 1);
  }
  return counts;
}

// P8.01 + P8.02: khung giờ trống trong giờ làm việc, xếp theo mức độ yên tĩnh.
export async function freeSlots(day = todayKey()) {
  const busy = new Set();
  for (const t of await listOpenTasks()) {
    if (t.dueDate !== day || !t.dueTime) continue;
    const h = Number(t.dueTime.slice(0, 2));
    busy.add(h); // coi mỗi lịch hẹn chiếm 1 giờ
  }
  const now = new Date();
  const startHour = day === todayKey() ? Math.max(WORK_START, now.getHours() + (now.getMinutes() > 0 ? 1 : 0)) : WORK_START;
  const counts = await interruptionsByHour(toDate(day).getDay());
  const slots = [];
  for (let h = startHour; h < WORK_END; h++) if (!busy.has(h)) slots.push({ hour: h, interruptions: counts.get(h) ?? 0 });
  const ranked = [...slots].sort((a, b) => a.interruptions - b.interruptions || a.hour - b.hour);
  return { slots, quiet: ranked.slice(0, 3), hasData: counts.size > 0 };
}

export async function morningPlan() {
  const today = todayKey();
  const open = await listOpenTasks();
  const appts = open.filter((t) => t.dueDate === today && t.dueTime).sort(byDue);
  const top = await getTop3();
  const topTasks = top ? open.filter((t) => top.includes(t.id)) : [];
  const important = (topTasks.length ? topTasks : open.filter((t) => t.important || (t.dueDate && t.dueDate <= today)).sort(byDue)).filter((t) => !t.dueTime).slice(0, 3);
  const inbox = open.filter((t) => t.status === 'inbox').length;
  const { slots, quiet, hasData } = await freeSlots(today);
  // Gợi ý: việc quan trọng nhất (chưa có giờ) vào khung yên tĩnh nhất.
  const suggestion = important[0] && quiet[0] ? { task: important[0], hour: quiet[0].hour, byData: hasData } : null;
  return { appts, important, inbox, slots, quiet, suggestion };
}

// P8.03: tổng kết tuần (T2–CN của tuần chứa `day`).
export async function weeklyReview(day = todayKey()) {
  const start = weekStart(day);
  const end = addDays(start, 6);
  const events = await getAll('events');
  const inWeek = (e) => { const d = e.day ?? dayOf(e.at); return d >= start && d <= end; };
  const wk = events.filter(inWeek);
  const count = (type) => wk.filter((e) => e.type === type).length;
  const focusMin = wk.filter((e) => e.type === 'pomodoro_done' || e.type === 'pomodoro_stopped').reduce((s, e) => s + (e.minutes || 0), 0);
  const moods = wk.filter((e) => e.type === 'mood_logged');
  const habitDays = habitDaysFrom(events);
  const habits = (await allHabits()).map((hb) => {
    const days = [...(habitDays.get(hb.id) ?? [])].filter((d) => d >= start && d <= end).length;
    return { ...hb, days };
  });
  const weakest = [...habits].sort((a, b) => a.days - b.days)[0];
  const strongest = [...habits].sort((a, b) => b.days - a.days)[0];
  const interruptions = count('interruption');
  const goals = [];
  if (weakest && weakest.days < 4) goals.push(`Thử giữ “${weakest.name}” ít nhất ${Math.min(7, weakest.days + 2)}/7 ngày.`);
  if (interruptions >= 5) goals.push('Tắt thông báo điện thoại trong 1–2 phiên tập trung mỗi ngày.');
  if (count('pomodoro_done') < 5) goals.push('Đặt mục tiêu 1 quả cà chua mỗi ngày làm việc.');
  if (!count('journal_written')) goals.push('Viết 3 điều biết ơn vào một buổi tối trong tuần.');
  if (!goals.length) goals.push('Tuần này rất tốt rồi — giữ nhịp như vậy và nhớ nghỉ ngơi nhé 🌿');
  return {
    start, end,
    tasksDone: count('task_done'), tomatoes: count('pomodoro_done'), focusMin, interruptions,
    waterDays: count('water_goal'), journal: count('journal_written'), moneyDays: new Set(wk.filter((e) => e.type === 'money_logged').map((e) => e.day)).size,
    moodAvg: moods.length ? moods.reduce((s, e) => s + e.mood, 0) / moods.length : null,
    habits, strongest, goals: goals.slice(0, 3),
  };
}

// Tối Chủ nhật (từ 19h) nhắc xem tổng kết tuần, 1 lần/tuần.
export async function checkWeeklyReview() {
  const now = new Date();
  if (now.getDay() !== 0 || now.getHours() < 19) return false;
  const wk = weekStart(todayKey());
  if ((await getSetting('reviewShown')) === wk) return false;
  await setSetting('reviewShown', wk);
  systemNotify('📋 Tổng kết tuần đã sẵn sàng', 'Nhìn lại tuần qua và chọn mục tiêu nhẹ nhàng cho tuần tới.', '#review', 'review');
  return true;
}
export const isReviewTime = () => { const n = new Date(); return n.getDay() === 0 && n.getHours() >= 17; };
export { atTime };
