// Ba danh sách sau khi phân loại: Hôm nay / Tuần này / Để sau.
import { h, mount } from '../../ui/dom.js';
import { LABEL, listTasks, byDue } from '../tasks/tasks.js';
import { taskMeta } from '../tasks/task-meta.js';
import { taskSubnav } from '../tasks/task-subnav.js';
import { startFocusOn } from '../focus/focus-actions.js';
import { triage } from '../tasks/task-actions.js';

const COLUMNS = ['today', 'week', 'later'];

const item = (t) => h('li', { class: 'task compact', draggable: 'true', dataset: { id: t.id } },
  h('input', {
    type: 'checkbox', 'aria-label': `Đánh dấu xong: ${t.title}`,
    onchange: () => triage(t.id, 'done'),
  }),
  h('div', { class: 'task-main' },
    h('span', { class: 'task-title' }, t.title),
    taskMeta(t)),
  h('button', {
    class: 'icon-btn', title: 'Tập trung vào việc này', 'aria-label': `Tập trung: ${t.title}`,
    onclick: () => startFocusOn(t.id),
  }, '▶'),
  h('button', {
    class: 'icon-btn', title: 'Trả về Inbox', 'aria-label': 'Trả về Inbox',
    onclick: () => triage(t.id, 'inbox'),
  }, '↩'));

export async function renderLists(root) {
  const data = (await Promise.all(COLUMNS.map(listTasks))).map((a) => a.sort(byDue));
  mount(root, 
    h('div', { class: 'view-head' },
      taskSubnav('lists'),
      h('h2', {}, 'Việc theo ngày'),
      h('p', { class: 'muted' }, 'Tích để hoàn thành. Kéo việc giữa các cột để đổi.')),
    h('div', { class: 'columns' }, COLUMNS.map((s, i) =>
      h('section', { class: `column column-${s}`, dataset: { drop: s } },
        h('h3', {}, LABEL[s], h('span', { class: 'count' }, data[i].length)),
        data[i].length
          ? h('ul', { class: 'task-list' }, data[i].map(item))
          : h('p', { class: 'muted small' }, 'Chưa có việc nào.')))),
  );
}
