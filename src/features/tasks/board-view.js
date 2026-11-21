// P12.02–P12.04: bảng Kanban kiểu Trello/TickTick.
// Cột theo trạng thái / project / ưu tiên; lọc, sắp xếp; thanh project bên trái để xem từng project.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { getAll, getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays } from '../../core/dates.js';
import { LABEL, addTask, setPriority } from './tasks.js';
import { taskMeta, QUADRANTS, quadrantIndex } from './task-meta.js';
import { taskSubnav } from './task-subnav.js';
import { triage } from './task-actions.js';
import { openTaskEditor } from './task-editor.js';
import { getProjects, addProject, updateProject, deleteProject, PROJECT_COLORS, PROJECT_ICONS } from './projects.js';
import { startFocusOn } from '../focus/focus-actions.js';

const DEFAULT = { group: 'status', project: 'all', priority: 'all', due: 'all', sort: 'due', showDone: true, q: '' };
let prefs = null;
let editingProject = false;

async function loadPrefs() { prefs ??= { ...DEFAULT, ...((await getSetting('boardPrefs')) ?? {}), q: '' }; return prefs; }
function setPref(patch) {
  Object.assign(prefs, patch);
  const { q, ...keep } = prefs;
  setSetting('boardPrefs', keep);
  notifyChange();
}

const SORTS = {
  due: (a, b) => `${a.dueDate ?? '9999'} ${a.dueTime ?? '99'}`.localeCompare(`${b.dueDate ?? '9999'} ${b.dueTime ?? '99'}`) || a.createdAt.localeCompare(b.createdAt),
  priority: (a, b) => quadrantIndex(a) - quadrantIndex(b) || SORTS.due(a, b),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, 'vi'),
};

function passes(t, today) {
  const p = prefs;
  if (p.project === 'none' ? t.projectId : p.project !== 'all' && t.projectId !== p.project) return false;
  if (p.priority === 'important' && !t.important) return false;
  if (p.priority === 'urgent' && !t.urgent) return false;
  if (/^q\d$/.test(p.priority) && quadrantIndex(t) !== +p.priority[1]) return false;
  if (p.due !== 'all') {
    const d = t.dueDate;
    if (p.due === 'nodate' && d) return false;
    if (p.due === 'overdue' && !(d && d < today && t.status !== 'done')) return false;
    if (p.due === 'today' && d !== today) return false;
    if (p.due === 'week' && !(d && d >= today && d <= addDays(today, 6))) return false;
  }
  return true;
}

// Ô tìm kiếm lọc ngay trên màn hình (không vẽ lại, để không mất chữ đang gõ).
function applySearch(root) {
  const q = prefs.q.normalize('NFC').toLowerCase().trim();
  root.querySelectorAll('.kcard').forEach((c) => { c.hidden = !!q && !c.dataset.title.includes(q); });
  root.querySelectorAll('.kcol').forEach((col) => {
    const n = col.querySelectorAll('.kcard:not([hidden])').length;
    const badge = col.querySelector('.count');
    if (badge) badge.textContent = n;
  });
}

function card(t, projects) {
  const proj = projects.find((p) => p.id === t.projectId);
  const done = t.status === 'done';
  return h('li', {
    class: `kcard${done ? ' is-done' : ''}`, draggable: 'true', style: proj ? `--pc:${proj.color}` : null,
    dataset: { id: t.id, title: `${t.title} ${t.note ?? ''}`.normalize('NFC').toLowerCase() },
  },
    h('input', {
      type: 'checkbox', checked: done, 'aria-label': `${done ? 'Bỏ đánh dấu' : 'Đánh dấu xong'}: ${t.title}`,
      onchange: () => triage(t.id, done ? 'today' : 'done'),
    }),
    h('button', { class: 'kcard-body', onclick: () => openTaskEditor(t.id), title: 'Bấm để sửa' },
      h('span', { class: 'task-title' }, t.title),
      t.note ? h('span', { class: 'kcard-note' }, t.note) : null,
      taskMeta(t)),
    done ? null : h('button', { class: 'icon-btn', title: 'Tập trung vào việc này', 'aria-label': `Tập trung: ${t.title}`, onclick: () => startFocusOn(t.id) }, '▶'));
}

// Ô thêm nhanh cuối mỗi cột: việc mới vào đúng cột đó.
function quickAdd(col) {
  return h('form', {
    class: 'kadd',
    onsubmit: async (e) => {
      e.preventDefault();
      const input = e.target.elements.t;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      const t = await addTask(text, col.add);
      if (t && col.quadrant) await setPriority(t.id, col.quadrant.important, col.quadrant.urgent);
      if (t) toast(`Đã thêm “${t.title}”`);
    },
  }, h('input', { class: 'input', name: 't', placeholder: '＋ Thêm việc', 'aria-label': `Thêm việc vào ${col.name}`, maxlength: '200' }));
}

function columnsFor(tasks, projects) {
  const g = prefs.group;
  const scoped = prefs.project !== 'all' && prefs.project !== 'none' ? prefs.project : null;
  if (g === 'project') {
    const list = projects.filter((p) => !scoped || p.id === scoped);
    const cols = list.map((p) => ({ key: `p:${p.id}`, name: `${p.icon} ${p.name}`, color: p.color, items: tasks.filter((t) => t.projectId === p.id), add: { projectId: p.id, status: 'week' } }));
    if (!scoped) cols.push({ key: 'p:none', name: 'Không có project', items: tasks.filter((t) => !t.projectId || !projects.some((p) => p.id === t.projectId)), add: { status: 'week' } });
    return cols;
  }
  const add = scoped ? { projectId: scoped } : {};
  if (g === 'priority') {
    return QUADRANTS.map((q, i) => ({
      key: `q:${q.important ? 1 : 0}:${q.urgent ? 1 : 0}`, name: q.short, hint: q.name, quadrant: q,
      items: tasks.filter((t) => quadrantIndex(t) === i), add: { ...add, status: 'week' },
    }));
  }
  const statuses = ['inbox', 'today', 'week', 'later', ...(prefs.showDone ? ['done'] : [])];
  return statuses.map((s) => ({ key: s, name: LABEL[s], status: s, items: tasks.filter((t) => t.status === s), add: { ...add, status: s } }));
}

function sidebar(all, projects) {
  const open = all.filter((t) => t.status !== 'done');
  const count = (fn) => open.filter(fn).length;
  const item = (key, label, n, color) => h('button', {
    class: `pnav-item${prefs.project === key ? ' on' : ''}`, style: color ? `--pc:${color}` : null,
    onclick: () => { editingProject = false; setPref({ project: key }); },
  }, h('span', { class: 'grow' }, label), h('span', { class: 'count' }, n));
  return h('aside', { class: 'pnav', 'aria-label': 'Project' },
    h('h3', {}, 'Project'),
    item('all', '🗂 Tất cả việc', open.length),
    projects.map((p) => item(p.id, `${p.icon} ${p.name}`, count((t) => t.projectId === p.id), p.color)),
    item('none', '📥 Không có project', count((t) => !t.projectId)),
    h('form', {
      class: 'pnav-add',
      onsubmit: async (e) => {
        e.preventDefault();
        const v = e.target.elements.n.value.trim();
        if (!v) return;
        e.target.elements.n.value = '';
        const p = await addProject(v);
        if (p) { setPref({ project: p.id }); toast(`Đã tạo project “${p.name}”. Gõ #${p.name.replace(/\s+/g, '_')} khi ghi nhanh để gắn việc.`); }
      },
    }, h('input', { class: 'input', name: 'n', placeholder: '＋ Project mới', maxlength: '40', 'aria-label': 'Tên project mới' })));
}

function projectEditor(p) {
  return h('section', { class: 'card project-edit' },
    h('form', {
      class: 'inline-form',
      onsubmit: async (e) => { e.preventDefault(); const v = e.target.elements.n.value.trim(); if (v) await updateProject(p.id, { name: v }); editingProject = false; notifyChange(); },
    }, h('input', { class: 'input', name: 'n', value: p.name, maxlength: '40', 'aria-label': 'Tên project' }), h('button', { class: 'btn', type: 'submit' }, 'Lưu tên')),
    h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Màu project' }, PROJECT_COLORS.map((c) => h('button', {
      class: `swatch${c === p.color ? ' on' : ''}`, style: `--pc:${c}`, role: 'radio', 'aria-checked': String(c === p.color), 'aria-label': `Màu ${c}`,
      onclick: () => updateProject(p.id, { color: c }),
    }))),
    h('div', { class: 'presets' }, PROJECT_ICONS.map((ic) => h('button', { class: `chip${ic === p.icon ? ' on' : ''}`, onclick: () => updateProject(p.id, { icon: ic }) }, ic))),
    h('button', {
      class: 'chip danger', onclick: async () => {
        if (!confirm(`Xóa project “${p.name}”? Các việc vẫn giữ, chỉ bỏ gắn project.`)) return;
        editingProject = false; prefs.project = 'all';
        await deleteProject(p.id);
      },
    }, '🗑 Xóa project'));
}

const select = (label, key, options) => h('label', { class: 'field-inline' }, label,
  h('select', { class: 'input', 'aria-label': label, onchange: (e) => setPref({ [key]: e.target.value }) },
    options.map(([v, text]) => h('option', { value: v, selected: prefs[key] === v }, text))));

export async function renderBoard(root) {
  await loadPrefs();
  const today = todayKey();
  const projects = await getProjects();
  if (!['all', 'none'].includes(prefs.project) && !projects.some((p) => p.id === prefs.project)) prefs.project = 'all';
  const all = await getAll('tasks');
  const recentDone = (t) => t.status !== 'done' || (t.doneAt ?? '') >= addDays(today, -7);
  const tasks = all.filter((t) => recentDone(t) && passes(t, today)).sort(SORTS[prefs.sort]);
  const cols = columnsFor(tasks, projects);
  const cur = projects.find((p) => p.id === prefs.project);

  mount(root,
    h('div', { class: 'view-head' },
      taskSubnav('board'),
      h('h2', {}, cur ? `${cur.icon} ${cur.name}` : prefs.project === 'none' ? 'Việc không có project' : 'Bảng việc'),
      h('p', { class: 'muted' }, 'Kéo thẻ giữa các cột để đổi. Bấm vào thẻ để sửa. Gõ “#tên-project” khi ghi nhanh để gắn project.')),
    h('div', { class: 'board-layout' },
      sidebar(all, projects),
      h('div', { class: 'board-main' },
        cur ? h('div', { class: 'toolbar' },
          h('span', { class: 'pdot', style: `--pc:${cur.color}` }),
          h('button', { class: `chip${editingProject ? ' on' : ''}`, onclick: () => { editingProject = !editingProject; notifyChange(); } }, '⚙️ Sửa project')) : null,
        cur && editingProject ? projectEditor(cur) : null,
        h('div', { class: 'toolbar board-filters' },
          h('div', { class: 'btn-group', role: 'radiogroup', 'aria-label': 'Chia cột theo' },
            [['status', 'Trạng thái'], ['project', 'Project'], ['priority', 'Ưu tiên']].map(([k, label]) => h('button', {
              class: `chip${prefs.group === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(prefs.group === k), onclick: () => setPref({ group: k }),
            }, label))),
          select('Ưu tiên', 'priority', [['all', 'Tất cả'], ['important', '⭐ Quan trọng'], ['urgent', '⚡ Gấp'], ...QUADRANTS.map((q, i) => [`q${i}`, q.short])]),
          select('Hạn', 'due', [['all', 'Mọi lúc'], ['overdue', 'Quá hạn'], ['today', 'Hôm nay'], ['week', '7 ngày tới'], ['nodate', 'Chưa có hạn']]),
          select('Sắp xếp', 'sort', [['due', 'Theo hạn'], ['priority', 'Theo ưu tiên'], ['created', 'Mới tạo trước'], ['title', 'Theo tên']]),
          prefs.group === 'status' ? h('label', { class: 'field-inline' },
            h('input', { type: 'checkbox', checked: prefs.showDone, onchange: (e) => setPref({ showDone: e.target.checked }) }), 'Hiện cột Đã xong') : null,
          h('input', {
            class: 'input board-search', type: 'search', placeholder: '🔍 Tìm việc…', value: prefs.q, 'aria-label': 'Tìm việc',
            oninput: (e) => { prefs.q = e.target.value; applySearch(root); },
          })),
        prefs.group === 'project' && !projects.length
          ? h('p', { class: 'insight' }, 'Chưa có project nào. Tạo project ở thanh bên trái, hoặc gõ “#tên” khi ghi nhanh.') : null,
        h('div', { class: 'board' }, cols.map((col) => h('section', {
          class: `kcol${col.status ? ` kcol-${col.status}` : ''}`, dataset: { drop: col.key }, style: col.color ? `--pc:${col.color}` : null, 'aria-label': col.name,
        },
          h('header', { class: 'kcol-head', title: col.hint ?? null }, h('h3', {}, col.name), h('span', { class: 'count' }, col.items.length)),
          h('ul', { class: 'kcol-list' }, col.items.map((t) => card(t, projects))),
          col.status === 'done' ? h('p', { class: 'muted small' }, 'Việc xong trong 7 ngày qua.') : quickAdd(col)))))),
  );
  applySearch(root);
}
