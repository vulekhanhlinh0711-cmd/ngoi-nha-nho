// P1.07: lịch theo tuần / theo ngày. Việc có ngày (dueDate) đều hiện ở đây; việc có giờ là lịch hẹn.
import { h, mount } from '../../ui/dom.js';
import { getAll } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate, weekStart, WEEKDAY_NAMES } from '../../core/dates.js';
import { byDue, LABEL } from '../tasks/tasks.js';
import { triage } from '../tasks/task-actions.js';
import { taskSubnav } from '../tasks/task-subnav.js';
import { startFocusOn } from '../focus/focus-actions.js';
import { openTaskEditor } from '../tasks/task-editor.js';
import { getProjects } from '../tasks/projects.js';

let mode = 'month';
let anchor = null;

const diffDaysKey = (a, b) => Math.round((toDate(b) - toDate(a)) / 86_400_000);
const dm = (key) => { const d = toDate(key); return `${d.getDate()}/${d.getMonth() + 1}`; };
const go = (m, a) => { mode = m; anchor = a; notifyChange(); };

function item(t) {
  const done = t.status === 'done';
  return h('li', { class: `task compact appt${done ? ' is-done' : ''}` },
    h('input', {
      type: 'checkbox', checked: done, 'aria-label': `${done ? 'Bỏ đánh dấu' : 'Đánh dấu xong'}: ${t.title}`,
      onchange: () => triage(t.id, done ? (t.dueDate === todayKey() ? 'today' : 'week') : 'done'),
    }),
    h('span', { class: 'appt-time' }, t.dueTime ?? 'Cả ngày'),
    h('div', { class: 'task-main' },
      h('span', { class: 'task-title' }, t.title),
      h('span', { class: 'meta-text' }, LABEL[t.status], t.important ? ' · ⭐' : '')),
    done ? null : h('button', {
      class: 'icon-btn', title: 'Tập trung vào việc này', 'aria-label': `Tập trung: ${t.title}`,
      onclick: () => startFocusOn(t.id),
    }, '▶'));
}

export async function renderCalendar(root) {
  const today = todayKey();
  anchor ??= today;
  const tasks = (await getAll('tasks')).filter((t) => t.dueDate).sort(byDue);
  const on = (day) => tasks.filter((t) => t.dueDate === day);
  const projects = await getProjects();

  let title;
  let body;
  if (mode === 'month') {
    // P12.05: lưới cả tháng, tuần bắt đầu từ Thứ 2; kéo việc sang ô ngày khác để dời hạn.
    const [y, m] = anchor.split('-').map(Number);
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const start = weekStart(first);
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const nWeeks = Math.ceil((diffDaysKey(start, last) + 1) / 7);
    title = `Tháng ${m}/${y}`;
    const chip = (t) => {
      const p = projects.find((x) => x.id === t.projectId);
      return h('li', {
        class: `mchip${t.status === 'done' ? ' is-done' : ''}${t.important ? ' imp' : ''}`, draggable: 'true', dataset: { id: t.id },
        style: p ? `--pc:${p.color}` : null,
      }, h('button', { class: 'mchip-btn', title: `${t.dueTime ?? 'Cả ngày'} · ${t.title}`, onclick: (e) => { e.stopPropagation(); openTaskEditor(t.id); } },
        t.dueTime ? h('b', {}, t.dueTime) : null, ' ', t.title));
    };
    body = h('div', { class: 'month' },
      ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => h('div', { class: 'month-wd', 'aria-hidden': 'true' }, w)),
      Array.from({ length: nWeeks * 7 }, (_, i) => {
        const d = addDays(start, i);
        const list = on(d);
        const inMonth = +d.slice(5, 7) === m;
        const MAX = 3;
        return h('section', {
          class: `mcell${d === today ? ' is-today' : ''}${inMonth ? '' : ' out'}${d < today ? ' past' : ''}`, dataset: { drop: `d:${d}` },
          'aria-label': `${WEEKDAY_NAMES[toDate(d).getDay()]} ${dm(d)}: ${list.length} việc`,
        },
          h('button', { class: 'mcell-day', onclick: () => go('day', d), title: 'Xem ngày này' }, toDate(d).getDate()),
          list.length ? h('ul', { class: 'mcell-list' }, list.slice(0, MAX).map(chip)) : null,
          list.length > MAX ? h('button', { class: 'mcell-more', onclick: () => go('day', d) }, `+${list.length - MAX} việc nữa`) : null);
      }));
  } else if (mode === 'week') {
    const start = weekStart(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    title = `${dm(days[0])} – ${dm(days[6])}`;
    body = h('div', { class: 'week' }, days.map((d) => {
      const list = on(d);
      return h('section', { class: `day-col${d === today ? ' is-today' : ''}` },
        h('button', { class: 'day-head', onclick: () => go('day', d), title: 'Xem ngày này' },
          h('span', {}, WEEKDAY_NAMES[toDate(d).getDay()]), h('b', {}, dm(d))),
        list.length
          ? h('ul', { class: 'task-list' }, list.map(item))
          : h('p', { class: 'muted small' }, '—'));
    }));
  } else {
    // P13: dải tuần + dòng thời gian trong ngày.
    const list = on(anchor);
    title = `${WEEKDAY_NAMES[toDate(anchor).getDay()]}, ${dm(anchor)}${anchor === today ? ' (hôm nay)' : ''}`;
    const ws = weekStart(anchor);
    const timed = list.filter((t) => t.dueTime);
    const allDay = list.filter((t) => !t.dueTime);
    const tlItem = (t) => {
      const done = t.status === 'done';
      return h('li', { class: `tl-item${done ? ' is-done' : ''}`, draggable: 'true', dataset: { id: t.id } },
        h('span', { class: 'tl-time' }, t.dueTime ?? ''),
        h('button', {
          class: 'tl-dot', role: 'checkbox', 'aria-checked': String(done), 'aria-label': `${done ? 'Bỏ hoàn thành' : 'Hoàn thành'}: ${t.title}`,
          onclick: () => triage(t.id, done ? (t.dueDate === today ? 'today' : 'week') : 'done'),
        }),
        h('button', { class: 'tl-card', onclick: () => openTaskEditor(t.id) },
          t.dueTime ? h('small', {}, t.dueTime) : null, h('b', {}, t.title), t.note ? h('span', { class: 'muted small' }, t.note) : null));
    };
    body = h('div', { class: 'day-view' },
      h('div', { class: 'week-strip' }, Array.from({ length: 7 }, (_, i) => {
        const d = addDays(ws, i);
        return h('button', { class: `ws-day${d === anchor ? ' on' : ''}${d === today ? ' today' : ''}`, onclick: () => go('day', d) },
          h('small', {}, ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i]), h('b', {}, toDate(d).getDate()),
          h('span', { class: `ws-dot${on(d).length ? '' : ' none'}` }));
      })),
      allDay.length ? h('section', { class: 'card' },
        h('h3', {}, 'Cả ngày', h('span', { class: 'count' }, allDay.length)),
        h('ul', { class: 'task-list' }, allDay.map(item))) : null,
      timed.length ? h('ul', { class: 'timeline' }, timed.map(tlItem))
        : h('p', { class: 'muted small' }, allDay.length ? 'Không có lịch hẹn theo giờ.' : 'Ngày trống. Thêm lịch bằng ô ghi nhanh, ví dụ “họp 14h thứ 5”.'));
  }

  const shift = (n) => {
    if (mode !== 'month') return addDays(anchor, n * (mode === 'week' ? 7 : 1));
    const [y, m] = anchor.split('-').map(Number);
    const dt = new Date(y, m - 1 + n, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`;
  };
  mount(root, 
    h('div', { class: 'view-head' },
      taskSubnav('calendar'),
      h('h2', {}, 'Lịch'),
      h('p', { class: 'muted' }, 'Thêm lịch hẹn bằng ô ghi nhanh, ví dụ “họp nhóm 14h thứ 5”. Ở chế độ Tháng, kéo việc sang ngày khác để dời hạn.')),
    h('div', { class: 'toolbar' },
      h('div', { class: 'btn-group' },
        h('button', { class: 'chip', 'aria-label': 'Trước', onclick: () => go(mode, shift(-1)) }, '‹'),
        h('button', { class: 'chip', onclick: () => go(mode, today) }, 'Hôm nay'),
        h('button', { class: 'chip', 'aria-label': 'Sau', onclick: () => go(mode, shift(1)) }, '›')),
      h('strong', { class: 'toolbar-title' }, title),
      h('div', { class: 'btn-group' },
        h('button', { class: `chip${mode === 'month' ? ' on' : ''}`, onclick: () => go('month', anchor) }, 'Tháng'),
        h('button', { class: `chip${mode === 'week' ? ' on' : ''}`, onclick: () => go('week', anchor) }, 'Tuần'),
        h('button', { class: `chip${mode === 'day' ? ' on' : ''}`, onclick: () => go('day', anchor) }, 'Ngày'))),
    body,
  );
}
