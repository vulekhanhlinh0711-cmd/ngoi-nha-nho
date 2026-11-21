// Nhãn nhỏ cạnh tên việc: hạn, giờ, quan trọng, gấp.
import { h } from '../../ui/dom.js';
import { todayKey } from '../../core/time.js';
import { dateLabel } from '../../core/dates.js';
import { projectCache } from './projects.js';

export const QUADRANTS = [
  { important: true, urgent: true, name: 'Quan trọng & gấp', short: '🔥 Làm ngay', hint: 'Làm ngay' },
  { important: true, urgent: false, name: 'Quan trọng, chưa gấp', short: '📅 Lên lịch', hint: 'Lên lịch để làm' },
  { important: false, urgent: true, name: 'Gấp, không quan trọng', short: '⚡ Làm nhanh', hint: 'Làm nhanh hoặc nhờ người khác' },
  { important: false, urgent: false, name: 'Không gấp, không quan trọng', short: '🍃 Để sau', hint: 'Để sau hoặc bỏ bớt' },
];
export const quadrantIndex = (t) => QUADRANTS.findIndex(
  (q) => q.important === !!t.important && q.urgent === !!t.urgent);

export function taskMeta(t, { extra } = {}) {
  const chips = [];
  if (extra) chips.push(h('span', { class: 'meta-text' }, extra));
  const proj = t.projectId ? projectCache.find((p) => p.id === t.projectId) : null;
  if (proj) chips.push(h('span', { class: 'meta-chip project', style: `--pc:${proj.color}` }, `${proj.icon} ${proj.name}`));
  else if (t.project) chips.push(h('span', { class: 'meta-chip project', style: '--pc:var(--accent)' }, `# ${t.project}`));
  if (t.dueDate) {
    const { text, overdue } = dateLabel(t.dueDate, todayKey());
    chips.push(h('span', { class: `meta-chip${overdue && t.status !== 'done' ? ' overdue' : ''}` },
      `📅 ${text}${t.dueTime ? ` ${t.dueTime}` : ''}`));
  }
  if (t.important) chips.push(h('span', { class: 'meta-chip important', title: 'Quan trọng' }, '⭐ Quan trọng'));
  if (t.urgent) chips.push(h('span', { class: 'meta-chip urgent', title: 'Gấp' }, '⚡ Gấp'));
  return chips.length ? h('span', { class: 'meta' }, chips) : null;
}

// P13: mức ưu tiên kiểu cờ (khớp với ma trận): Cao = quan trọng & gấp, Vừa = quan trọng, Thấp = gấp, Không.
export const PRIORITIES = [
  { level: 0, name: 'Không ưu tiên', short: 'Không', color: 'var(--p0)', important: false, urgent: false },
  { level: 1, name: 'Ưu tiên thấp', short: 'Thấp', color: 'var(--p1)', important: false, urgent: true },
  { level: 2, name: 'Ưu tiên vừa', short: 'Vừa', color: 'var(--p2)', important: true, urgent: false },
  { level: 3, name: 'Ưu tiên cao', short: 'Cao', color: 'var(--p3)', important: true, urgent: true },
];
export const prioOf = (t) => (t.important && t.urgent ? 3 : t.important ? 2 : t.urgent ? 1 : 0);

export const REPEATS = [
  [null, 'Không lặp lại'], ['daily', 'Hằng ngày'], ['weekdays', 'Ngày làm việc (T2–T6)'],
  ['weekly', 'Hằng tuần'], ['monthly', 'Hằng tháng'], ['yearly', 'Hằng năm'],
];
export const REMINDS = [
  [null, 'Mặc định (theo Cài đặt)'], [0, 'Đúng giờ'], [5, 'Trước 5 phút'], [15, 'Trước 15 phút'],
  [30, 'Trước 30 phút'], [60, 'Trước 1 giờ'], [1440, 'Trước 1 ngày'], [-1, 'Không nhắc'],
];
