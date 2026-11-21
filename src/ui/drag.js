// Kéo thả dùng chung: phần tử có data-id kéo được, vùng có data-drop nhận thả.
// Gắn 1 lần vào khung chính, các view vẽ lại không cần gắn lại.
import { triage, remove, prioritize, assignProject, reschedule } from '../features/tasks/task-actions.js';

const zoneOf = (e) => (e.target instanceof Element ? e.target.closest('[data-drop]') : null);

export function enableDrag(root) {
  root.addEventListener('dragstart', (e) => {
    const el = e.target instanceof Element ? e.target.closest('[data-id]') : null;
    if (!el) return;
    e.dataTransfer.setData('text/plain', el.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });
  root.addEventListener('dragend', (e) => {
    if (e.target instanceof Element) e.target.classList.remove('dragging');
  });
  root.addEventListener('dragover', (e) => {
    const z = zoneOf(e);
    if (!z) return;
    e.preventDefault();
    z.classList.add('over');
  });
  root.addEventListener('dragleave', (e) => {
    const z = zoneOf(e);
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('over');
  });
  root.addEventListener('drop', (e) => {
    const z = zoneOf(e);
    if (!z) return;
    e.preventDefault();
    z.classList.remove('over');
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (!id) return;
    const target = z.dataset.drop;
    if (target === 'delete') remove(id);
    else if (target.startsWith('q:')) {
      // Ô ma trận: "q:<quan trọng 0/1>:<gấp 0/1>"
      const [, imp, urg] = target.split(':');
      prioritize(id, imp === '1', urg === '1');
    } else if (target.startsWith('p:')) assignProject(id, target === 'p:none' ? null : target.slice(2));
    else if (target.startsWith('d:')) reschedule(id, target.slice(2));
    else triage(id, target);
  });
}
