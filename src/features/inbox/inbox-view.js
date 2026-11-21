// P1.01–P1.02: Inbox và phân loại (nút, phím tắt 1/2/3/Delete, kéo thả).
import { h, mount } from '../../ui/dom.js';
import { timeAgo } from '../../core/time.js';
import { LABEL, listTasks } from '../tasks/tasks.js';
import { taskMeta } from '../tasks/task-meta.js';
import { triage, remove } from '../tasks/task-actions.js';

const TARGETS = ['today', 'week', 'later'];
const KEYS = { 1: 'today', 2: 'week', 3: 'later' };
let focusIndex = null; // giữ vị trí con trỏ bàn phím sau khi vẽ lại

function onKey(e, t) {
  const li = e.currentTarget;
  if (e.key === 'ArrowDown') { li.nextElementSibling?.focus(); e.preventDefault(); return; }
  if (e.key === 'ArrowUp') { li.previousElementSibling?.focus(); e.preventDefault(); return; }
  const index = [...li.parentElement.children].indexOf(li);
  if (KEYS[e.key]) { focusIndex = index; triage(t.id, KEYS[e.key]); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { focusIndex = index; remove(t.id); e.preventDefault(); }
}

function item(t) {
  return h('li', {
    class: 'task', tabindex: '0', draggable: 'true',
    dataset: { id: t.id }, onkeydown: (e) => onKey(e, t),
  },
    h('div', { class: 'task-main' },
      h('span', { class: 'task-title' }, t.title),
      taskMeta(t, { extra: timeAgo(t.createdAt) })),
    h('div', { class: 'task-actions' },
      TARGETS.map((s, i) => h('button', {
        class: `chip chip-${s}`, title: `${LABEL[s]} (phím ${i + 1})`,
        onclick: () => triage(t.id, s),
      }, LABEL[s])),
      h('button', {
        class: 'chip chip-delete', title: 'Xóa (phím Delete)',
        onclick: () => remove(t.id),
      }, 'Xóa')));
}

const dropZones = () => h('div', { class: 'drop-zones' },
  [...TARGETS, 'delete'].map((s) => h('div', { class: `drop drop-${s}`, dataset: { drop: s } },
    s === 'delete' ? '🗑 Xóa' : LABEL[s])));

export async function renderInbox(root) {
  const items = await listTasks('inbox');
  mount(root, 
    h('div', { class: 'view-head' },
      h('h2', {}, 'Inbox'),
      h('p', { class: 'muted' }, items.length
        ? `${items.length} việc đang chờ phân loại`
        : 'Ghi nhanh ở ô phía trên, sắp xếp sau.')),
    ...(items.length
      ? [
          h('ul', { class: 'task-list' }, items.map(item)),
          dropZones(),
          h('p', { class: 'hint' },
            'Mẹo: chọn một việc (Tab hoặc ↑↓) rồi bấm 1 Hôm nay · 2 Tuần này · 3 Để sau · Delete để xóa. ' +
            'Trên máy tính có thể kéo việc thả vào các ô.'),
        ]
      : [h('div', { class: 'empty' },
          h('div', { class: 'empty-icon' }, '🌿'),
          h('p', {}, 'Inbox trống. Đầu óc nhẹ tênh!'))]),
  );
  if (focusIndex != null) {
    const lis = root.querySelectorAll('.task');
    lis[Math.min(focusIndex, lis.length - 1)]?.focus();
    focusIndex = null;
  }
}
