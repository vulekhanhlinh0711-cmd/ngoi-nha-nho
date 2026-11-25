// P1.05: ma trận ưu tiên 4 ô. Kéo thả trên máy tính, chọn ô bằng menu trên điện thoại.
import { h, mount } from '../../ui/dom.js';
import { listTasks, byDue, LABEL } from '../tasks/tasks.js';
import { QUADRANTS, quadrantIndex, taskMeta } from '../tasks/task-meta.js';
import { triage, prioritize } from '../tasks/task-actions.js';
import { taskSubnav } from '../tasks/task-subnav.js';

const SOURCES = ['today', 'week', 'later'];

const item = (t) => h('li', { class: 'task compact', draggable: 'true', dataset: { id: t.id } },
  h('input', {
    type: 'checkbox', 'aria-label': `Đánh dấu xong: ${t.title}`,
    onchange: () => triage(t.id, 'done'),
  }),
  h('div', { class: 'task-main' },
    h('span', { class: 'task-title' }, t.title),
    taskMeta(t, { extra: LABEL[t.status] })),
  h('select', {
    class: 'quad-select', 'aria-label': 'Chuyển sang ô khác',
    onchange: (e) => {
      const q = QUADRANTS[+e.target.value];
      prioritize(t.id, q.important, q.urgent);
    },
  }, QUADRANTS.map((q, i) => h('option', { value: i, selected: i === quadrantIndex(t) }, q.short))));

export async function renderMatrix(root) {
  const tasks = (await Promise.all(SOURCES.map(listTasks))).flat().sort(byDue);
  const groups = QUADRANTS.map(() => []);
  for (const t of tasks) groups[quadrantIndex(t)].push(t);

  mount(root, 
    h('div', { class: 'view-head' },
      taskSubnav('matrix'),
      h('h2', {}, 'Ưu tiên'),
      h('p', { class: 'muted' },
        'Việc đã phân loại, xếp theo mức quan trọng và độ gấp. Kéo việc giữa các ô hoặc chọn ô ở menu bên phải.')),
    h('div', { class: 'matrix' }, QUADRANTS.map((q, i) =>
      h('section', {
        class: `quad quad-${i}`,
        dataset: { drop: `q:${q.important ? 1 : 0}:${q.urgent ? 1 : 0}` },
      },
        h('h3', {}, q.name, h('span', { class: 'count' }, groups[i].length)),
        h('p', { class: 'quad-hint' }, q.hint),
        groups[i].length
          ? h('ul', { class: 'task-list' }, groups[i].map(item))
          : h('p', { class: 'muted small' }, 'Trống.')))),
  );
}
