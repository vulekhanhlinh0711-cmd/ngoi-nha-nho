// P12.01: project cho việc. Lưu trong settings 'projects'; mỗi việc giữ projectId.
import { getSetting, setSetting, getAll, put } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';

export const PROJECT_COLORS = ['#e8a0a0', '#f2b880', '#e9cf7a', '#9cc79a', '#86bfc0', '#93aee0', '#b9a3dd', '#dca0c8'];
export const PROJECT_ICONS = ['📁', '💼', '💻', '📊', '📝', '📌', '🏠', '🛒', '🍳', '🧺', '📚', '🎓', '✏️', '🧠', '💪', '🏃', '🧘', '🍎', '💊', '❤️', '🎨', '🎵', '📷', '🎮', '✈️', '🏖️', '🚗', '💰', '🎁', '🎂', '🌱', '🌸', '🐱', '🧸', '⭐', '🎄'];
export const PROJECT_COLORS_MORE = ['#f28c8c', '#f4a273', '#f2c26a', '#8fd19e', '#6cc3b9', '#7fb2f0', '#a58cf5', '#e98fc1', '#b9b4c7', '#8a6f5c'];

// Bản sao đồng bộ để taskMeta (hàm vẽ không async) hiện được tên/màu project.
export let projectCache = [];
export async function getProjects() { projectCache = (await getSetting('projects')) ?? []; return projectCache; }
const save = async (list) => { projectCache = list; await setSetting('projects', list); notifyChange(); };

export const projectOf = (list, id) => list.find((p) => p.id === id) ?? null;
const norm = (s) => s.normalize('NFC').toLowerCase().trim();

export async function addProject(name, extra = {}) {
  const list = await getProjects();
  const clean = name.trim().slice(0, 40);
  if (!clean) return null;
  const same = list.find((p) => norm(p.name) === norm(clean));
  if (same) return same;
  const p = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: clean,
    color: PROJECT_COLORS[list.length % PROJECT_COLORS.length],
    icon: '📁',
    ...extra,
  };
  await save([...list, p]);
  return p;
}

export async function updateProject(id, patch) {
  const list = await getProjects();
  const p = projectOf(list, id);
  if (!p) return;
  Object.assign(p, patch);
  await save(list);
}

// Xóa project: việc vẫn giữ, chỉ bỏ gắn project.
export async function deleteProject(id) {
  const list = await getProjects();
  projectCache = list.filter((p) => p.id !== id);
  await setSetting('projects', projectCache);
  for (const t of await getAll('tasks')) {
    if (t.projectId === id) { delete t.projectId; await put('tasks', t); }
  }
  notifyChange();
}

// "#Tên" trong câu ghi nhanh → id project (tạo mới nếu chưa có).
export async function resolveProject(name) {
  if (!name) return null;
  const list = await getProjects();
  const key = norm(name.replace(/[-_]/g, ' '));
  const found = list.find((p) => norm(p.name) === key || norm(p.name).replace(/\s+/g, '') === key.replace(/\s+/g, ''));
  return (found ?? (await addProject(name.replace(/[-_]/g, ' '))))?.id ?? null;
}
