// P9: dữ liệu IELTS — thẻ từ (ôn ngắt quãng kiểu Leitner), buổi học (lesson_done), kế hoạch học.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate, weekStart } from '../../core/dates.js';
import { addTask, listOpenTasks, getTask } from '../tasks/tasks.js';
import { STARTER_WORDS, SKILLS } from './content.js';

// Hộp 1→5: ôn lại sau 0, 1, 3, 7, 14 ngày. Hộp ≥ 4 coi là "đã thuộc".
export const INTERVALS = [0, 1, 3, 7, 14];
export const LEARNED_BOX = 4;

export async function getCards() {
  let cards = await getSetting('ieltsCards');
  if (!cards) {
    cards = STARTER_WORDS.map(([word, pos, meaning, example], i) => ({ id: `s${i}`, word, pos, meaning, example, box: 0, due: null }));
    await setSetting('ieltsCards', cards);
  }
  return cards;
}
const saveCards = (c) => setSetting('ieltsCards', c);

// Thẻ cần ôn hôm nay: thẻ mới (tối đa `newPerDay`) + thẻ đến hạn.
export async function dueCards(newPerDay = 10) {
  const today = todayKey();
  const cards = await getCards();
  const due = cards.filter((c) => c.box > 0 && c.due <= today);
  const fresh = cards.filter((c) => c.box === 0).slice(0, newPerDay);
  return [...due, ...fresh];
}

export async function reviewCard(id, known) {
  const cards = await getCards();
  const c = cards.find((x) => x.id === id);
  c.box = known ? Math.min(5, c.box + 1) : 1;
  c.due = addDays(todayKey(), INTERVALS[c.box - 1]);
  await saveCards(cards);
}

export async function addWord(word, meaning, example = '', pos = '') {
  const cards = await getCards();
  if (cards.some((c) => c.word.toLowerCase() === word.toLowerCase())) return false;
  cards.push({ id: `u${Date.now()}`, word, pos, meaning, example, box: 0, due: null, mine: true });
  await saveCards(cards);
  notifyChange();
  return true;
}

// Mỗi buổi luyện = 1 sự kiện lesson_done (P9.04): thói quen "Học tiếng Anh" tự tích.
export async function lessonDone(skill, minutes, extra = {}) {
  await logEvent('lesson_done', { skill, minutes: Math.max(1, Math.round(minutes)), day: todayKey(), ...extra });
  // Việc IELTS hôm nay (nếu có) được đánh dấu xong.
  const plan = await getSetting('ieltsTask');
  if (plan?.day === todayKey()) {
    const t = await getTask(plan.taskId);
    if (t && t.status !== 'done') {
      const { moveTask } = await import('../tasks/tasks.js');
      await moveTask(t.id, 'done');
    }
  }
  notifyChange();
}

// ---- P9.03: kế hoạch học ----
export const DEFAULT_PLAN = { days: [1, 2, 3, 4, 5], minutes: 30, skills: { 1: 'reading', 2: 'listening', 3: 'writing', 4: 'speaking', 5: 'reading', 6: 'listening', 0: 'writing' }, autoTask: true };
export async function getPlan() { return { ...DEFAULT_PLAN, ...((await getSetting('ieltsPlan')) ?? {}) }; }
export async function savePlan(p) { await setSetting('ieltsPlan', p); notifyChange(); }
export async function planFor(day = todayKey()) {
  const p = await getPlan();
  const wd = toDate(day).getDay();
  return p.days.includes(wd) ? { skill: p.skills[wd], minutes: p.minutes } : null;
}
const skillName = (k) => SKILLS.find((s) => s[0] === k)?.[1] ?? k;

// Tự tạo việc "IELTS …" trong Hôm nay (1 lần/ngày) nếu kế hoạch có buổi học.
export async function ensureTodayTask() {
  const p = await getPlan();
  if (!p.autoTask) return null;
  const today = todayKey();
  const plan = await planFor(today);
  const prev = await getSetting('ieltsTask');
  if (!plan || prev?.day === today) return null;
  const t = await addTask(`IELTS ${skillName(plan.skill).split(' ')[1]} ${plan.minutes} phút hôm nay`, { status: 'today' });
  await setSetting('ieltsTask', { day: today, taskId: t.id });
  return t;
}

// ---- P9.05: tóm tắt cho App Habit ----
export async function ieltsSummary() {
  const cards = await getCards();
  const lessons = await queryEvents('lesson_done');
  const wk = weekStart(todayKey());
  const week = lessons.filter((e) => e.day >= wk);
  const by = Object.fromEntries(SKILLS.map(([k]) => [k, { count: 0, minutes: 0, scores: [] }]));
  for (const e of lessons) {
    const s = by[e.skill];
    if (!s) continue;
    s.count++; s.minutes += e.minutes;
    if (e.score != null) s.scores.push(e.score);
  }
  // Kỹ năng yếu: điểm trung bình thấp nhất (nếu có), không thì kỹ năng luyện ít nhất.
  const withScore = SKILLS.filter(([k]) => by[k].scores.length);
  const avg = (k) => by[k].scores.reduce((a, b) => a + b, 0) / by[k].scores.length;
  const weakest = withScore.length
    ? withScore.sort((a, b) => avg(a[0]) - avg(b[0]))[0]
    : [...SKILLS].sort((a, b) => by[a[0]].count - by[b[0]].count)[0];
  return {
    learned: cards.filter((c) => c.box >= LEARNED_BOX).length,
    total: cards.length,
    weekMinutes: week.reduce((s, e) => s + e.minutes, 0),
    weekLessons: week.length,
    bySkill: by,
    weakest: weakest ? { key: weakest[0], name: weakest[1], avg: by[weakest[0]].scores.length ? Math.round(avg(weakest[0])) : null } : null,
  };
}

export async function openIeltsTaskToday() {
  const prev = await getSetting('ieltsTask');
  if (prev?.day !== todayKey()) return null;
  return (await listOpenTasks()).find((t) => t.id === prev.taskId) ?? null;
}
