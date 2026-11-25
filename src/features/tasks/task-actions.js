// Hành động của người dùng trên một việc, kèm thông báo và Hoàn tác.
import { LABEL, moveTask, deleteTask, restoreTask, setPriority } from './tasks.js';
import { QUADRANTS, quadrantIndex } from './task-meta.js';
import { toast } from '../../ui/toast.js';
import { bus } from '../../core/events.js';

// Gộp lời mừng "Inbox về 0" vào cùng thông báo để không mất nút Hoàn tác.
let reachedZero = false;
bus.addEventListener('inbox-zero', () => { reachedZero = true; });
function withZero(msg) {
  if (!reachedZero) return msg;
  reachedZero = false;
  return `${msg} · 🎉 Inbox về 0!`;
}

export async function triage(id, status) {
  const from = await moveTask(id, status);
  if (from == null) return;
  const msg = status === 'done' ? 'Xong một việc 🎉' : `Đã chuyển vào ${LABEL[status]}`;
  toast(withZero(msg), { onAction: () => moveTask(id, from) });
}

export async function prioritize(id, important, urgent) {
  const prev = await setPriority(id, important, urgent);
  if (!prev) return;
  const q = QUADRANTS[quadrantIndex({ important, urgent })];
  toast(`Đã chuyển sang “${q.name}”`, {
    onAction: () => setPriority(id, prev.important, prev.urgent),
  });
}

export async function remove(id) {
  const t = await deleteTask(id);
  if (!t) return;
  toast(withZero('Đã xóa việc'), { onAction: () => restoreTask(t) });
}

// P12.02: kéo thẻ sang cột project khác.
export async function assignProject(id, projectId) {
  const { getTask, updateTask } = await import('./tasks.js');
  const { projectCache } = await import('./projects.js');
  const t = await getTask(id);
  if (!t || (t.projectId ?? null) === projectId) return;
  const prev = t.projectId ?? null;
  await updateTask(id, { projectId });
  const name = projectCache.find((p) => p.id === projectId)?.name;
  toast(name ? `Đã chuyển sang project “${name}”` : 'Đã bỏ khỏi project', { onAction: () => updateTask(id, { projectId: prev }) });
}

// P12.05 / P51: kéo việc sang ngày khác (lịch tháng, bảng theo ngày). day = null → bỏ hạn.
// Việc chưa xong tự chuyển nhóm theo hạn mới: hôm nay/quá hạn → Hôm nay, < 7 ngày → Tuần này, xa hơn → Để sau.
export function statusForDay(t, day, today) {
  if (t.status === 'done') return 'done';
  if (!day) return t.status === 'today' ? 'week' : t.status;
  const n = Math.round((new Date(day) - new Date(today)) / 86_400_000);
  return n <= 0 ? 'today' : n < 7 ? 'week' : 'later';
}
const dayText = (day) => { if (!day) return 'bỏ hạn'; const [, m, d] = day.split('-'); return `${+d}/${+m}`; };

export async function reschedule(id, day) {
  const { getTask, updateTask } = await import('./tasks.js');
  const { todayKey } = await import('../../core/time.js');
  const t = await getTask(id);
  if (!t || (t.dueDate ?? null) === day) return;
  const prev = { dueDate: t.dueDate ?? null, status: t.status };
  await updateTask(id, { dueDate: day, status: statusForDay(t, day, todayKey()) });
  toast(day ? `Đã dời “${t.title.slice(0, 30)}” sang ${dayText(day)}` : `Đã bỏ hạn “${t.title.slice(0, 30)}”`, { onAction: () => updateTask(id, prev) });
}

// Dời nhiều việc cùng lúc (vd: tất cả việc quá hạn → hôm nay), hoàn tác một lần.
export async function rescheduleMany(ids, day) {
  const { getTask, updateTask } = await import('./tasks.js');
  const { todayKey } = await import('../../core/time.js');
  const prev = [];
  for (const id of ids) {
    const t = await getTask(id);
    if (!t || t.status === 'done') continue;
    prev.push([id, { dueDate: t.dueDate ?? null, status: t.status }]);
    await updateTask(id, { dueDate: day, status: statusForDay(t, day, todayKey()) });
  }
  if (prev.length) toast(`Đã dời ${prev.length} việc sang ${dayText(day)}`, { onAction: async () => { for (const [id, p] of prev) await updateTask(id, p); } });
}
