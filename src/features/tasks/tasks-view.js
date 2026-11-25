// P13: màn Việc 3 cột (kiểu app to-do gọn gàng):
// trái = danh sách thông minh + project + bộ lọc; giữa = việc nhóm theo ngày/ưu tiên/project; phải = chi tiết việc.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { getAll, getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, weekStart } from '../../core/dates.js';
import { addTask, updateTask, getTask } from './tasks.js';
import { PRIORITIES, prioOf, REPEATS } from './task-meta.js';
import { taskSubnav } from './task-subnav.js';
import { triage, remove } from './task-actions.js';
import { getProjects, addProject, updateProject, deleteProject, PROJECT_ICONS, PROJECT_COLORS, PROJECT_COLORS_MORE } from './projects.js';
import { pickDate, dueLabel } from './date-picker.js';
import { startFocusOn } from '../focus/focus-actions.js';

let prefs = null;
let selectedId = null;
let detailOpen = false; // điện thoại: chi tiết phủ toàn màn
let navOpen = false; // điện thoại: thanh danh sách
const collapsed = new Set(['done']);

const SMART = [
  { key: 'today', icon: '☀️', name: 'Hôm nay' },
  { key: 'next7', icon: '📆', name: '7 ngày tới' },
  { key: 'inbox', icon: '📥', name: 'Inbox' },
];
const FILTERS = [
  { key: 'week', icon: '🗓', name: 'Tuần này' },
  { key: 'important', icon: '🚩', name: 'Quan trọng' },
  { key: 'nodate', icon: '⏳', name: 'Chưa lên lịch' },
  { key: 'all', icon: '🗂', name: 'Tất cả việc' },
];

async function loadPrefs() { prefs ??= { list: 'today', group: 'date', ...((await getSetting('listPrefs')) ?? {}) }; return prefs; }
function setPref(patch) { Object.assign(prefs, patch); setSetting('listPrefs', prefs); notifyChange(); }

const effDay = (t, today) => t.dueDate ?? (t.status === 'today' ? today : null);

function inList(key, t, today) {
  if (key === 'done') return t.status === 'done';
  if (t.status === 'done') return false;
  const d = effDay(t, today);
  const ws = weekStart(today);
  switch (key) {
    case 'today': return !!d && d <= today;
    case 'next7': return !!d && d <= addDays(today, 6);
    case 'inbox': return t.status === 'inbox';
    case 'week': return !!d && d >= ws && d <= addDays(ws, 6);
    case 'important': return prioOf(t) >= 2;
    case 'nodate': return !d;
    case 'all': return true;
    default: return key.startsWith('p:') && t.projectId === key.slice(2);
  }
}
// Việc đã xong hiện cuối danh sách (nhóm "Đã xong", thu gọn).
function doneInList(key, t, today) {
  if (t.status !== 'done') return false;
  if (key === 'today' || key === 'next7') return (t.doneAt ?? '').slice(0, 10) === today || (t.dueDate === today);
  if (key.startsWith('p:')) return t.projectId === key.slice(2);
  return false;
}

const byTime = (a, b) => `${a.dueDate ?? '9'} ${a.dueTime ?? '99'}`.localeCompare(`${b.dueDate ?? '9'} ${b.dueTime ?? '99'}`) || prioOf(b) - prioOf(a) || a.createdAt.localeCompare(b.createdAt);

function groupTasks(tasks, today, projects) {
  const g = prefs.group;
  if (g === 'priority') {
    return [3, 2, 1, 0].map((lv) => ({ key: `pr${lv}`, name: PRIORITIES[lv].name, color: PRIORITIES[lv].color, items: tasks.filter((t) => prioOf(t) === lv).sort(byTime) }));
  }
  if (g === 'project') {
    return [...projects.map((p) => ({ key: `pj${p.id}`, name: `${p.icon} ${p.name}`, items: tasks.filter((t) => t.projectId === p.id).sort(byTime) })),
      { key: 'pjnone', name: '📥 Không có project', items: tasks.filter((t) => !projects.some((p) => p.id === t.projectId)).sort(byTime) }];
  }
  if (g === 'none') return [{ key: 'all', name: null, items: [...tasks].sort(byTime) }];
  const tm = addDays(today, 1), d7 = addDays(today, 6);
  const buckets = [
    ['overdue', 'Quá hạn', (d) => d && d < today],
    ['today', 'Hôm nay', (d) => d === today],
    ['tomorrow', 'Ngày mai', (d) => d === tm],
    ['next7', '7 ngày tới', (d) => d && d > tm && d <= d7],
    ['later', 'Sau này', (d) => d && d > d7],
    ['nodate', 'Chưa có ngày', (d) => !d],
  ];
  return buckets.map(([key, name, test]) => ({ key, name, items: tasks.filter((t) => test(effDay(t, today))).sort(byTime) }));
}

// ---------- hàng việc ----------
function checkBox(t) {
  const done = t.status === 'done';
  return h('button', {
    class: `tcheck p${prioOf(t)}${done ? ' on' : ''}`, role: 'checkbox', 'aria-checked': String(done),
    'aria-label': `${done ? 'Bỏ hoàn thành' : 'Hoàn thành'}: ${t.title}`,
    onclick: (e) => {
      e.stopPropagation();
      const today = todayKey();
      triage(t.id, done ? ((t.dueDate ?? today) <= today ? 'today' : 'week') : 'done');
    },
  }, done ? '✓' : '');
}

function row(t, projects, today, showProject) {
  const proj = projects.find((p) => p.id === t.projectId);
  const subs = t.subtasks ?? [];
  const overdue = t.dueDate && t.dueDate < today && t.status !== 'done';
  return h('li', {
    class: `trow${t.id === selectedId ? ' sel' : ''}${t.status === 'done' ? ' is-done' : ''}`, draggable: 'true', dataset: { id: t.id },
    tabindex: '0', onclick: () => select(t.id), onkeydown: (e) => { if (e.key === 'Enter') select(t.id); },
  },
    checkBox(t),
    h('span', { class: 'trow-title' }, t.title),
    h('span', { class: 'trow-meta' },
      t.note ? h('span', { class: 'tic', title: 'Có ghi chú' }, '≡') : null,
      subs.length ? h('span', { class: 'tic', title: 'Việc con' }, `☑ ${subs.filter((s) => s.done).length}/${subs.length}`) : null,
      t.repeat ? h('span', { class: 'tic', title: 'Lặp lại' }, '🔁') : null,
      t.dueTime && t.remind !== -1 ? h('span', { class: 'tic', title: 'Có nhắc' }, '⏰') : null,
      showProject && proj ? h('span', { class: 'tproj', style: `--pc:${proj.color}` }, proj.name) : null,
      t.dueDate ? h('span', { class: `tdue${overdue ? ' overdue' : ''}` }, dueLabel(t, today)) : null));
}

function select(id) {
  selectedId = id; detailOpen = true;
  notifyChange();
}

// ---------- chi tiết ----------
async function detail(projects, today) {
  const t = selectedId ? await getTask(selectedId) : null;
  if (!t) {
    return h('aside', { class: 'tdetail empty' },
      h('div', { class: 'tdetail-empty' }, h('div', { class: 'empty-ic' }, '📝'), h('p', {}, 'Bấm vào một việc để xem chi tiết'), h('p', { class: 'muted small' }, 'Đặt ngày, giờ nhắc, lặp lại, ưu tiên và việc con ở đây.')));
  }
  const subs = t.subtasks ?? [];
  const saveSubs = (list) => updateTask(t.id, { subtasks: list });
  const lv = prioOf(t);
  const overdue = t.dueDate && t.dueDate < today && t.status !== 'done';
  return h('aside', { class: 'tdetail', 'aria-label': 'Chi tiết việc' },
    h('div', { class: 'tdetail-top' },
      h('button', { class: 'icon-btn back', 'aria-label': 'Quay lại danh sách', onclick: () => { detailOpen = false; notifyChange(); } }, '‹'),
      checkBox(t),
      h('button', {
        class: `tdate${t.dueDate ? '' : ' empty'}${overdue ? ' overdue' : ''}`,
        onclick: async () => {
          const v = await pickDate(t);
          if (!v) return;
          await updateTask(t.id, v);
          if (v.dueDate === today && t.status === 'inbox') await triage(t.id, 'today');
        },
      }, '📅 ', t.dueDate ? dueLabel({ ...t, dueTime: null }, today) + (t.dueTime ? `, ${t.dueTime}` : '') : 'Ngày & nhắc nhở',
        t.repeat ? h('span', { class: 'tic' }, ` 🔁 ${REPEATS.find((r) => r[0] === t.repeat)?.[1] ?? ''}`) : null),
      h('label', { class: 'tflag', title: 'Ưu tiên' },
        h('span', { class: `flag p${lv}`, 'aria-hidden': 'true' }, '⚑'),
        h('select', {
          'aria-label': 'Mức ưu tiên',
          onchange: (e) => { const p = PRIORITIES[+e.target.value]; updateTask(t.id, { important: p.important, urgent: p.urgent }); },
        }, [...PRIORITIES].reverse().map((p) => h('option', { value: p.level, selected: p.level === lv }, `⚑ ${p.name}`))))),
    h('input', {
      class: 'tdetail-title', value: t.title, maxlength: '200', 'aria-label': 'Tên việc',
      onchange: (e) => { const v = e.target.value.trim(); if (v) updateTask(t.id, { title: v }); },
      onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
    }),
    h('ul', { class: 'subtasks' },
      subs.map((s, i) => h('li', { class: `sub${s.done ? ' is-done' : ''}` },
        h('button', {
          class: `tcheck small${s.done ? ' on' : ''}`, role: 'checkbox', 'aria-checked': String(!!s.done), 'aria-label': `Việc con: ${s.text}`,
          onclick: () => saveSubs(subs.map((x, j) => (j === i ? { ...x, done: !x.done } : x))),
        }, s.done ? '✓' : ''),
        h('input', {
          class: 'sub-text', value: s.text, 'aria-label': 'Nội dung việc con',
          onchange: (e) => { const v = e.target.value.trim(); saveSubs(v ? subs.map((x, j) => (j === i ? { ...x, text: v } : x)) : subs.filter((_, j) => j !== i)); },
          onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        }),
        h('button', { class: 'icon-btn', 'aria-label': 'Xóa việc con', onclick: () => saveSubs(subs.filter((_, j) => j !== i)) }, '✕'))),
      h('li', { class: 'sub add' },
        h('span', { class: 'sub-plus' }, '＋'),
        h('input', {
          class: 'sub-text', placeholder: 'Thêm việc con', 'aria-label': 'Thêm việc con',
          onkeydown: (e) => {
            if (e.key !== 'Enter') return;
            const v = e.target.value.trim();
            if (!v) return;
            e.target.value = '';
            saveSubs([...subs, { id: Date.now().toString(36), text: v, done: false }]);
          },
        }))),
    h('textarea', {
      class: 'tdetail-note', rows: '6', placeholder: 'Mô tả, ghi chú…', 'aria-label': 'Ghi chú',
      onchange: (e) => updateTask(t.id, { note: e.target.value.trim() || null }),
    }, t.note ?? ''),
    h('div', { class: 'tdetail-foot' },
      h('select', {
        class: 'input', 'aria-label': 'Project',
        onchange: async (e) => {
          let v = e.target.value || null;
          if (v === '__new') { const name = prompt('Tên project mới'); v = name ? (await addProject(name))?.id ?? null : t.projectId ?? null; }
          updateTask(t.id, { projectId: v });
        },
      }, h('option', { value: '' }, '📥 Không có project'),
        projects.map((p) => h('option', { value: p.id, selected: p.id === t.projectId }, `${p.icon} ${p.name}`)),
        h('option', { value: '__new' }, '＋ Project mới…')),
      h('span', { class: 'grow' }),
      t.status !== 'done' ? h('button', { class: 'icon-btn', title: 'Tập trung vào việc này', 'aria-label': 'Tập trung vào việc này', onclick: () => startFocusOn(t.id) }, '▶') : null,
      h('button', { class: 'icon-btn', title: 'Xóa việc', 'aria-label': 'Xóa việc', onclick: () => { selectedId = null; detailOpen = false; remove(t.id); } }, '🗑')));
}

// ---------- thanh trái ----------
function sidebar(all, projects, today) {
  const count = (key) => all.filter((t) => inList(key, t, today)).length;
  const item = ({ key, icon, name, color }, drop) => h('button', {
    class: `tnav-item${prefs.list === key ? ' on' : ''}`, dataset: drop ? { drop } : {}, style: color ? `--pc:${color}` : null,
    onclick: () => { navOpen = false; selectedId = null; detailOpen = false; setPref({ list: key }); },
  }, h('span', { class: 'tnav-ic' }, icon), h('span', { class: 'grow' }, name), key === 'done' ? null : h('span', { class: 'count' }, count(key) || ''));
  const projItem = (p) => h('div', { class: 'tnav-row' },
    item({ key: `p:${p.id}`, icon: p.icon, name: p.name, color: p.color }, `p:${p.id}`),
    h('button', { class: 'tnav-edit', title: 'Sửa danh sách', 'aria-label': `Sửa danh sách ${p.name}`, onclick: () => editProject(p) }, '✎'));
  return h('nav', { class: `tnav${navOpen ? ' open' : ''}`, 'aria-label': 'Danh sách việc' },
    SMART.map((s) => item(s, s.key === 'today' ? `d:${today}` : s.key === 'inbox' ? 'inbox' : null)),
    h('div', { class: 'tnav-sep' }),
    h('h4', {}, 'Danh sách'),
    projects.map(projItem),
    h('form', {
      class: 'tnav-add', onsubmit: async (e) => {
        e.preventDefault();
        const v = e.target.elements.n.value.trim();
        if (!v) return;
        const p = await addProject(v);
        if (p) setPref({ list: `p:${p.id}` });
      },
    }, h('input', { class: 'input', name: 'n', placeholder: '＋ Thêm danh sách', maxlength: '40', 'aria-label': 'Tên danh sách mới' })),
    h('h4', {}, 'Bộ lọc'),
    FILTERS.map((f) => item(f)),
    h('div', { class: 'tnav-sep' }),
    item({ key: 'done', icon: '✅', name: 'Đã hoàn thành' }, 'done'));
}

// P16.03: sửa tên, biểu tượng (chọn sẵn hoặc gõ emoji bất kỳ), màu, xóa danh sách.
function editProject(p) {
  const v = { name: p.name, icon: p.icon, color: p.color };
  const body = h('div', { class: 'pe' });
  const dlg = h('dialog', { class: 'sheet', 'aria-label': 'Sửa danh sách' }, body);
  const draw = () => mount(body,
    h('div', { class: 'pe-head' },
      h('span', { class: 'pe-preview', style: `--pc:${v.color}` }, v.icon),
      h('input', { class: 'input grow', value: v.name, maxlength: '40', 'aria-label': 'Tên danh sách', oninput: (e) => { v.name = e.target.value; } })),
    h('h4', {}, 'Biểu tượng'),
    h('div', { class: 'pe-icons', role: 'radiogroup', 'aria-label': 'Biểu tượng' }, PROJECT_ICONS.map((ic) => h('button', {
      type: 'button', class: `pe-ic${ic === v.icon ? ' on' : ''}`, role: 'radio', 'aria-checked': String(ic === v.icon), onclick: () => { v.icon = ic; draw(); },
    }, ic))),
    h('label', { class: 'field-inline small' }, 'Hoặc gõ emoji khác:',
      h('input', {
        class: 'input num', maxlength: '4', placeholder: '🦄', 'aria-label': 'Emoji tùy chọn',
        onchange: (e) => { const x = [...new Intl.Segmenter().segment(e.target.value.trim())][0]?.segment; if (x) { v.icon = x; draw(); } },
      })),
    h('h4', {}, 'Màu'),
    h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Màu' }, [...PROJECT_COLORS, ...PROJECT_COLORS_MORE].map((c) => h('button', {
      type: 'button', class: `swatch${c === v.color ? ' on' : ''}`, style: `--pc:${c}`, role: 'radio', 'aria-checked': String(c === v.color), 'aria-label': `Màu ${c}`,
      onclick: () => { v.color = c; draw(); },
    })),
      h('label', { class: 'swatch custom', title: 'Màu tự chọn', style: `--pc:${v.color}` }, h('input', { type: 'color', value: v.color, 'aria-label': 'Màu tự chọn', oninput: (e) => { v.color = e.target.value; draw(); } }))),
    h('div', { class: 'sheet-actions' },
      h('button', {
        type: 'button', class: 'chip danger', onclick: async () => {
          if (!confirm(`Xóa danh sách “${p.name}”? Các việc vẫn giữ, chỉ bỏ gắn danh sách.`)) return;
          dlg.close(); if (prefs.list === `p:${p.id}`) prefs.list = 'today'; await deleteProject(p.id);
        },
      }, '🗑 Xóa'),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'chip', onclick: () => dlg.close() }, 'Hủy'),
      h('button', {
        type: 'button', class: 'btn', onclick: async () => {
          await updateProject(p.id, { name: v.name.trim() || p.name, icon: v.icon, color: v.color });
          dlg.close(); toast('Đã lưu danh sách');
        },
      }, 'Lưu')));
  draw();
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

function listTitle(key, projects) {
  const all = [...SMART, ...FILTERS, { key: 'done', icon: '✅', name: 'Đã hoàn thành' }];
  const s = all.find((x) => x.key === key);
  if (s) return s.name;
  const p = projects.find((x) => `p:${x.id}` === key);
  return p ? `${p.icon} ${p.name}` : 'Việc';
}

function addOpts(key, today) {
  if (key === 'today' || key === 'next7' || key === 'week') return { status: 'today', dueDate: today };
  if (key === 'inbox' || key === 'all') return { status: 'inbox' };
  if (key === 'nodate') return { status: 'later' };
  if (key === 'important') return { status: 'week', important: true };
  if (key.startsWith('p:')) return { status: 'week', projectId: key.slice(2) };
  return { status: 'inbox' };
}

export async function renderTasks(root) {
  await loadPrefs();
  const today = todayKey();
  const projects = await getProjects();
  if (prefs.list.startsWith('p:') && !projects.some((p) => `p:${p.id}` === prefs.list)) prefs.list = 'today';
  const all = await getAll('tasks');
  const key = prefs.list;
  const tasks = all.filter((t) => inList(key, t, today));
  const showProject = !key.startsWith('p:');

  let groups;
  if (key === 'done') {
    const days = new Map();
    for (const t of tasks.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 150)) {
      const d = (t.doneAt ?? '').slice(0, 10);
      if (!days.has(d)) days.set(d, []);
      days.get(d).push(t);
    }
    groups = [...days].map(([d, items]) => ({ key: `d${d}`, name: d === today ? 'Hôm nay' : d === addDays(today, -1) ? 'Hôm qua' : d.split('-').reverse().join('/'), items }));
  } else {
    groups = groupTasks(tasks, today, projects);
    const done = all.filter((t) => doneInList(key, t, today));
    if (done.length) groups.push({ key: 'done', name: 'Đã xong', items: done });
  }
  groups = groups.filter((g) => g.items.length);
  if (selectedId && !all.some((t) => t.id === selectedId)) { selectedId = null; detailOpen = false; }
  const opts = addOpts(key, today);
  const title = listTitle(key, projects);

  mount(root,
    h('div', { class: `tt${detailOpen ? ' detail-open' : ''}` },
      sidebar(all, projects, today),
      h('section', { class: 'tlist' },
        h('div', { class: 'tlist-head' },
          h('button', { class: 'icon-btn menu', 'aria-label': 'Mở danh sách', onclick: () => { navOpen = !navOpen; notifyChange(); } }, '☰'),
          h('h2', {}, title),
          h('span', { class: 'grow' }),
          key === 'done' ? null : h('label', { class: 'tgroup', title: 'Nhóm theo' }, '⇅',
            h('select', { 'aria-label': 'Nhóm theo', onchange: (e) => setPref({ group: e.target.value }) },
              [['date', 'Nhóm theo ngày'], ['priority', 'Nhóm theo ưu tiên'], ['project', 'Nhóm theo danh sách'], ['none', 'Không nhóm']].map(([v, l]) => h('option', { value: v, selected: prefs.group === v }, l))))),
        taskSubnav('tasks'),
        key === 'done' ? null : h('form', {
          class: 'tadd', onsubmit: async (e) => {
            e.preventDefault();
            const input = e.target.elements.t;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            const { dueDate, important, ...o } = opts;
            const t = await addTask(text, o);
            if (!t) return;
            const patch = {};
            if (dueDate && !t.dueDate) patch.dueDate = dueDate;
            if (important && !t.important) patch.important = true;
            if (Object.keys(patch).length) await updateTask(t.id, patch);
            toast(`Đã thêm “${t.title}”`);
          },
        }, h('input', { class: 'input', name: 't', maxlength: '200', placeholder: `＋ Thêm việc vào “${title.replace(/^[^\p{L}\p{N}]+/u, '')}”, ví dụ “họp 15h mai”`, 'aria-label': 'Thêm việc' })),
        groups.length ? groups.map((g) => {
          const isCol = collapsed.has(g.key);
          return h('section', { class: 'tgroup-sec' },
            g.name ? h('button', {
              class: 'tgroup-head', 'aria-expanded': String(!isCol), style: g.color ? `--gc:${g.color}` : null,
              onclick: () => { if (isCol) collapsed.delete(g.key); else collapsed.add(g.key); notifyChange(); },
            }, h('span', { class: 'chev' }, isCol ? '›' : '⌄'), g.name, h('span', { class: 'count' }, g.items.length)) : null,
            isCol ? null : h('ul', { class: 'trows' }, g.items.map((t) => row(t, projects, today, showProject))));
        }) : h('div', { class: 'tempty' }, h('div', { class: 'empty-ic' }, key === 'done' ? '🌱' : '🎉'), h('p', {}, key === 'done' ? 'Chưa hoàn thành việc nào.' : 'Không có việc nào ở đây. Thảnh thơi!'))),
      await detail(projects, today)),
  );
}
