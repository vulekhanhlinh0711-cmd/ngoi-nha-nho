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

// P12.05: kéo việc sang ngày khác trên lịch tháng.
export async function reschedule(id, day) {
  const { getTask, updateTask } = await import('./tasks.js');
  const t = await getTask(id);
  if (!t || t.dueDate === day) return;
  const prev = t.dueDate ?? null;
  await updateTask(id, { dueDate: day });
  const [, m, d] = day.split('-');
  toast(`Đã dời sang ${+d}/${+m}`, { onAction: () => updateTask(id, { dueDate: prev }) });
}
