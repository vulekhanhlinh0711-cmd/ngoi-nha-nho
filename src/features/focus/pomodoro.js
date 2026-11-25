// P1.08–P1.11: Pomodoro có nút gián đoạn.
// Trạng thái lưu theo mốc thời gian (endsAt), nên tải lại trang hay tab chạy nền vẫn đúng giờ.
// phase: idle → work ⇄ paused → break → idle
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange } from '../../core/events.js';
import { systemNotify, beep } from '../../core/notify.js';
import { toast } from '../../ui/toast.js';
import { getTask } from '../tasks/tasks.js';

const MIN = 60_000;
let state = { phase: 'idle' };
let busy = false;

export const getPomo = () => state;
const save = () => setSetting('pomo', state);

export async function getPrefs() {
  return (await getSetting('pomoPrefs')) ?? { workMin: 25, breakMin: 5 };
}
export async function setPrefs(workMin, breakMin) {
  const clamp = (n, lo, hi, d) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);
  await setSetting('pomoPrefs', { workMin: clamp(workMin, 1, 180, 25), breakMin: clamp(breakMin, 1, 60, 5) });
  notifyChange();
}

export function remainingMs(now = Date.now()) {
  if (state.phase === 'paused') return state.remainingMs;
  if (state.phase === 'work' || state.phase === 'break') return Math.max(0, state.endsAt - now);
  return 0;
}
export const phaseTotalMs = () => (state.phase === 'break' ? state.breakMin : state.workMin) * MIN;

export async function loadPomo() {
  state = (await getSetting('pomo')) ?? { phase: 'idle' };
  await tick();
}

export async function startWork(taskId) {
  if (state.phase === 'work' || state.phase === 'paused') await stop();
  const prefs = await getPrefs();
  const t = taskId ? await getTask(taskId) : null;
  const now = Date.now();
  state = {
    phase: 'work',
    taskId: t?.id ?? null,
    taskTitle: t?.title ?? 'Tập trung tự do',
    workMin: prefs.workMin,
    breakMin: prefs.breakMin,
    endsAt: now + prefs.workMin * MIN,
    segStart: now,
    workedMs: 0,
    note: '',
  };
  await save();
  await logEvent('pomodoro_start', { taskId: state.taskId, workMin: state.workMin });
  notifyChange();
}

// P1.09: dừng đồng hồ, giữ thời gian còn lại.
export async function interrupt() {
  if (state.phase !== 'work') return;
  const now = Date.now();
  Object.assign(state, {
    phase: 'paused',
    remainingMs: state.endsAt - now,
    workedMs: state.workedMs + (now - state.segStart),
    pausedAt: now,
    source: null,
  });
  await save();
  notifyChange();
}

// Ghi nguồn gián đoạn / ghi chú đang dở (lưu ngay, không vẽ lại để không mất con trỏ khi gõ).
export async function updatePause(fields) {
  if (state.phase !== 'paused') return;
  Object.assign(state, fields);
  await save();
}

const logInterruption = () => logEvent('interruption', {
  taskId: state.taskId,
  source: state.source ?? 'other',
  pausedAt: new Date(state.pausedAt).toISOString(),
  durationMs: Date.now() - state.pausedAt,
  hasNote: !!state.note,
});

// P1.11: chạy tiếp với thời gian còn lại.
export async function resume() {
  if (state.phase !== 'paused') return;
  await logInterruption();
  const now = Date.now();
  state.phase = 'work';
  state.endsAt = now + state.remainingMs;
  state.segStart = now;
  delete state.remainingMs;
  delete state.pausedAt;
  await save();
  notifyChange();
}

// Kết thúc sớm (khi đang làm) hoặc bỏ qua giờ nghỉ.
export async function stop() {
  const now = Date.now();
  if (state.phase === 'paused') await logInterruption();
  if (state.phase === 'work' || state.phase === 'paused') {
    const worked = state.workedMs + (state.phase === 'work' ? now - state.segStart : 0);
    await logEvent('pomodoro_stopped', { taskId: state.taskId, minutes: Math.round(worked / MIN) });
  }
  state = { phase: 'idle', lastTaskId: state.taskId ?? state.lastTaskId, lastTaskTitle: state.taskTitle ?? state.lastTaskTitle };
  await save();
  notifyChange();
}

// Gọi mỗi giây: chuyển pha khi hết giờ.
export async function tick() {
  if (busy) return;
  busy = true;
  try {
    const now = Date.now();
    if (state.phase === 'work' && now >= state.endsAt) {
      const worked = state.workedMs + (state.endsAt - state.segStart);
      await logEvent('pomodoro_done', {
        taskId: state.taskId, minutes: Math.round(worked / MIN), at: new Date(state.endsAt).toISOString(),
      });
      const boosted = await import('../garden/kitchen.js').then((m) => m.useFocusBoost()).catch(() => false); // P45: năng lượng từ món ăn
      state = { ...state, phase: 'break', endsAt: state.endsAt + state.breakMin * MIN, workedMs: 0, note: '', tipSeed: Math.random() };
      await save();
      beep();
      toast(boosted ? '🍅 Xong một quả cà chua! +10 xu, ⚡ +10 xu năng lượng từ món ăn. Nghỉ một chút nhé.' : '🍅 Xong một quả cà chua! +10 xu. Nghỉ một chút nhé.');
      systemNotify('Xong một quả cà chua 🍅', `Nghỉ ${state.breakMin} phút: uống nước, vươn vai, hít thở.`, '#focus', 'pomo');
      notifyChange();
    }
    if (state.phase === 'break' && now >= state.endsAt) {
      await logEvent('break_done', { taskId: state.taskId });
      state = { phase: 'idle', lastTaskId: state.taskId, lastTaskTitle: state.taskTitle };
      await save();
      beep();
      systemNotify('Hết giờ nghỉ', 'Sẵn sàng cho phiên tiếp theo chưa?', '#focus', 'pomo');
      notifyChange();
    }
  } finally {
    busy = false;
  }
}

// P1.12: gợi ý trong giờ nghỉ.
export const BREAK_TIPS = [
  '💧 Uống một ly nước',
  '🙆 Đứng dậy vươn vai 30 giây',
  '🌬️ Hít vào 4 giây, giữ 4 giây, thở ra 6 giây',
  '👀 Nhìn ra xa 20 giây cho mắt nghỉ',
  '🚶 Đi lại vài bước',
  '🎵 Nghe một bài nhạc nhẹ',
];
export function breakTips(seed = 0, n = 3) {
  const start = Math.floor(seed * BREAK_TIPS.length);
  // Luôn có gợi ý uống nước, cộng thêm vài gợi ý khác.
  const others = BREAK_TIPS.slice(1);
  return [BREAK_TIPS[0], ...Array.from({ length: n - 1 }, (_, i) => others[(start + i) % others.length])];
}
