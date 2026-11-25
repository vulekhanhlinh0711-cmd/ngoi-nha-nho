// Hộp sửa một việc: tên, project, cột, hạn, giờ, ưu tiên, ghi chú.
import { h } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { LABEL, getTask, updateTask, moveTask } from './tasks.js';
import { getProjects, addProject } from './projects.js';
import { remove } from './task-actions.js';

const STATUSES = ['inbox', 'today', 'week', 'later', 'done'];

export async function openTaskEditor(id) {
  const t = await getTask(id);
  if (!t) return;
  const projects = await getProjects();
  const f = (name, label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
  const dlg = h('dialog', { class: 'sheet', 'aria-label': 'Sửa việc' },
    h('form', {
      method: 'dialog', class: 'sheet-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const el = e.target.elements;
        const title = el.title.value.trim();
        if (!title) { toast('Tên việc không được để trống'); return; }
        let projectId = el.project.value || null;
        if (projectId === '__new') {
          const name = prompt('Tên project mới');
          projectId = name ? (await addProject(name))?.id ?? null : null;
        }
        const patch = {
          title, note: el.note.value.trim() || null, dueDate: el.due.value || null, dueTime: el.time.value || null,
          important: el.imp.checked, urgent: el.urg.checked, projectId,
        };
        if (patch.dueTime && !patch.dueDate) { toast('Có giờ thì cần chọn ngày'); return; }
        await updateTask(id, patch);
        if (el.status.value !== t.status) await moveTask(id, el.status.value);
        dlg.close();
        toast('Đã lưu');
      },
    },
      h('h3', {}, '✏️ Sửa việc'),
      f('title', 'Tên việc', h('input', { class: 'input', name: 'title', value: t.title, maxlength: '200', required: true })),
      h('div', { class: 'form-row' },
        f('project', 'Project', h('select', { class: 'input', name: 'project' },
          h('option', { value: '' }, '— Không có —'),
          projects.map((p) => h('option', { value: p.id, selected: p.id === t.projectId }, `${p.icon} ${p.name}`)),
          h('option', { value: '__new' }, '＋ Project mới…'))),
        f('status', 'Cột', h('select', { class: 'input', name: 'status' },
          STATUSES.map((s) => h('option', { value: s, selected: s === t.status }, LABEL[s]))))),
      h('div', { class: 'form-row' },
        f('due', 'Hạn', h('input', { class: 'input', type: 'date', name: 'due', value: t.dueDate ?? '' })),
        f('time', 'Giờ', h('input', { class: 'input', type: 'time', name: 'time', value: t.dueTime ?? '' }))),
      h('div', { class: 'form-row' },
        h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', name: 'imp', checked: !!t.important }), '⭐ Quan trọng'),
        h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', name: 'urg', checked: !!t.urgent }), '⚡ Gấp')),
      f('note', 'Ghi chú', h('textarea', { class: 'input', name: 'note', rows: '3' }, t.note ?? '')),
      h('div', { class: 'sheet-actions' },
        h('button', { class: 'chip danger', type: 'button', onclick: () => { dlg.close(); remove(id); } }, '🗑 Xóa'),
        h('span', { class: 'grow' }),
        h('button', { class: 'chip', type: 'button', onclick: () => dlg.close() }, 'Hủy'),
        h('button', { class: 'btn', type: 'submit' }, 'Lưu'))));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
