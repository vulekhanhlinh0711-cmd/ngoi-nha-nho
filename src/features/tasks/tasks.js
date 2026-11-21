// Dữ liệu việc: thêm, chuyển trạng thái, xóa. Mỗi thay đổi đều ghi sự kiện.
import { get, put, del, getAllByIndex, countByIndex, getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange, bus } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { parseQuick } from './quick-parse.js';
import { resolveProject } from './projects.js';

export const LABEL = {
  inbox: 'Inbox',
  today: 'Hôm nay',
  week: 'Tuần này',
  later: 'Để sau',
  done: 'Đã xong',
};

const now = () => new Date().toISOString();

// opts.status: tạo thẳng vào danh sách khác Inbox (việc do app tự tạo, không làm sai thưởng "dọn Inbox").
export async function addTask(text, opts = {}) {
  if (!text.trim()) return null;
  const { project, ...parsed } = parseQuick(text, todayKey());
  const projectId = opts.projectId ?? (await resolveProject(project));
  const t = { ...parsed, status: opts.status ?? 'inbox', createdAt: now(), updatedAt: now() };
  if (projectId) t.projectId = projectId;
  t.id = await put('tasks', t);
  await logEvent('task_created', { taskId: t.id, important: t.important, dueDate: t.dueDate });
  notifyChange();
  return t;
}

export async function listTasks(status) {
  const items = await getAllByIndex('tasks', 'status', status);
  return items.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

// Việc chưa xong (cả Inbox lẫn đã phân loại).
export async function listOpenTasks() {
  const groups = await Promise.all(OPEN.map(listTasks));
  return groups.flat();
}
export const OPEN = ['inbox', 'today', 'week', 'later'];

// Sắp theo hạn (có hạn trước, sớm trước), rồi theo lúc tạo.
export function byDue(a, b) {
  const ka = `${a.dueDate ?? '9999-99-99'} ${a.dueTime ?? '99:99'}`;
  const kb = `${b.dueDate ?? '9999-99-99'} ${b.dueTime ?? '99:99'}`;
  if (ka !== kb) return ka < kb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

export const getTask = (id) => get('tasks', id);

// P1.05: đặt ô trong ma trận. Trả về mức cũ (để hoàn tác), hoặc null nếu không đổi.
export async function setPriority(id, important, urgent) {
  const t = await get('tasks', id);
  if (!t || (!!t.important === important && !!t.urgent === urgent)) return null;
  const prev = { important: !!t.important, urgent: !!t.urgent };
  Object.assign(t, { important, urgent, updatedAt: now() });
  await put('tasks', t);
  await logEvent('task_priority', { taskId: id, important, urgent });
  notifyChange();
  return prev;
}

export const countInbox = () => countByIndex('tasks', 'status', 'inbox');

// Trả về trạng thái cũ (để hoàn tác), hoặc null nếu không đổi gì.
export async function moveTask(id, status) {
  const t = await get('tasks', id);
  if (!t || t.status === status) return null;
  const from = t.status;
  t.status = status;
  t.updatedAt = now();
  if (status === 'done') t.doneAt = now();
  else delete t.doneAt;
  // P13: việc lặp lại → xong thì tạo lần kế tiếp; bỏ tích thì xóa lần kế tiếp đã tạo.
  if (status === 'done' && t.repeat && t.dueDate && !t.spawnedId) t.spawnedId = await spawnNext(t);
  if (from === 'done' && t.spawnedId) {
    const next = await get('tasks', t.spawnedId);
    if (next && next.status !== 'done') await del('tasks', t.spawnedId);
    delete t.spawnedId;
  }
  await put('tasks', t);
  await logEvent(status === 'done' ? 'task_done' : 'task_moved', { taskId: id, from, to: status, important: !!t.important });
  await checkInboxZero(from);
  notifyChange();
  return from;
}

// Trả về bản ghi đã xóa (để hoàn tác).
export async function deleteTask(id) {
  const t = await get('tasks', id);
  if (!t) return null;
  await del('tasks', id);
  await logEvent('task_deleted', { taskId: id, from: t.status });
  await checkInboxZero(t.status);
  notifyChange();
  return t;
}

export async function restoreTask(t) {
  await put('tasks', t);
  await logEvent('task_restored', { taskId: t.id, to: t.status });
  notifyChange();
}

// Dọn Inbox về 0: ghi sự kiện tối đa 1 lần/ngày (sau này đổi thành +15 xu).
async function checkInboxZero(from) {
  if (from !== 'inbox') return;
  if ((await countInbox()) > 0) return;
  const day = todayKey();
  if ((await getSetting('inboxZeroDay')) === day) return;
  await setSetting('inboxZeroDay', day);
  await logEvent('inbox_zero', { day });
  bus.dispatchEvent(new Event('inbox-zero'));
}

// Sửa vài trường của việc (ví dụ đặt giờ làm từ gợi ý của trợ lý).
export async function updateTask(id, patch) {
  const t = await get('tasks', id);
  if (!t) return null;
  Object.assign(t, patch, { updatedAt: now() });
  await put('tasks', t);
  await logEvent('task_updated', { taskId: id, fields: Object.keys(patch) });
  notifyChange();
  return t;
}

// ---- P13: lặp lại ----
export function nextDue(day, repeat) {
  const [y, m, d] = day.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const key = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const dt = new Date(y, m - 1, d);
  if (repeat === 'daily') dt.setDate(d + 1);
  else if (repeat === 'weekly') dt.setDate(d + 7);
  else if (repeat === 'weekdays') { do dt.setDate(dt.getDate() + 1); while ([0, 6].includes(dt.getDay())); }
  else if (repeat === 'monthly' || repeat === 'yearly') {
    // Ngày 31 sang tháng ít ngày hơn → lấy ngày cuối tháng.
    const ny = repeat === 'yearly' ? y + 1 : y + (m === 12 ? 1 : 0);
    const nm = repeat === 'yearly' ? m - 1 : m % 12;
    const last = new Date(ny, nm + 1, 0).getDate();
    return key(new Date(ny, nm, Math.min(d, last)));
  } else return null;
  return key(dt);
}
async function spawnNext(t) {
  let due = nextDue(t.dueDate, t.repeat);
  const today = todayKey();
  while (due && due < today) due = nextDue(due, t.repeat); // làm bù việc cũ thì lần tới vẫn ở tương lai
  if (!due) return null;
  const diff = Math.round((new Date(due) - new Date(today)) / 86_400_000);
  const copy = {
    title: t.title, note: t.note ?? null, important: !!t.important, urgent: !!t.urgent, dueDate: due, dueTime: t.dueTime ?? null,
    repeat: t.repeat, remind: t.remind ?? null, projectId: t.projectId, subtasks: (t.subtasks ?? []).map((s) => ({ ...s, done: false })),
    status: diff <= 0 ? 'today' : diff < 7 ? 'week' : 'later', createdAt: now(), updatedAt: now(), repeatOf: t.id,
  };
  if (!copy.projectId) delete copy.projectId;
  copy.id = await put('tasks', copy);
  await logEvent('task_created', { taskId: copy.id, repeatOf: t.id });
  return copy.id;
}
