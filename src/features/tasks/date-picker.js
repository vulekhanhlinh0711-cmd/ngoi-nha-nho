// P13: hộp chọn ngày — lịch tháng, phím tắt, đặt giờ, nhắc trước, lặp lại.
import { h, mount } from '../../ui/dom.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate, nextWeekday } from '../../core/dates.js';
import { REPEATS, REMINDS } from './task-meta.js';

const pad = (n) => String(n).padStart(2, '0');
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// value: { dueDate, dueTime, remind, repeat } → Promise<giá trị mới | null nếu hủy>
export function pickDate(value) {
  return new Promise((resolve) => {
    const today = todayKey();
    const v = { dueDate: value.dueDate ?? null, dueTime: value.dueTime ?? null, remind: value.remind ?? null, repeat: value.repeat ?? null };
    let month = (v.dueDate ?? today).slice(0, 7);
    let result = null;
    const body = h('div', { class: 'dp' });
    const dlg = h('dialog', { class: 'sheet dp-dialog', 'aria-label': 'Chọn ngày' }, body);

    const draw = () => {
      const [y, m] = month.split('-').map(Number);
      const first = `${month}-01`;
      const lead = (toDate(first).getDay() + 6) % 7;
      const days = new Date(y, m, 0).getDate();
      const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`)];
      const shift = (n) => { const d = new Date(y, m - 1 + n, 1); month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; draw(); };
      const quick = [['☀️', 'Hôm nay', today], ['🌤', 'Ngày mai', addDays(today, 1)], ['📅', 'Tuần sau', nextWeekday(today, 1)], ['🚫', 'Không ngày', null]];
      mount(body,
        h('div', { class: 'dp-quick' }, quick.map(([ic, label, d]) => h('button', {
          type: 'button', class: `dp-q${v.dueDate === d ? ' on' : ''}`, title: label,
          onclick: () => { v.dueDate = d; if (!d) { v.dueTime = null; v.repeat = null; } if (d) month = d.slice(0, 7); draw(); },
        }, h('span', {}, ic), h('small', {}, label)))),
        h('div', { class: 'dp-head' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Tháng trước', onclick: () => shift(-1) }, '‹'),
          h('b', {}, `Tháng ${m}, ${y}`),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Tháng sau', onclick: () => shift(1) }, '›')),
        h('div', { class: 'dp-grid' },
          WD.map((w) => h('span', { class: 'dp-wd' }, w)),
          cells.map((d) => (d ? h('button', {
            type: 'button', class: `dp-day${d === v.dueDate ? ' on' : ''}${d === today ? ' today' : ''}${d < today ? ' past' : ''}`,
            'aria-label': `Ngày ${+d.slice(8)} tháng ${m}`, 'aria-pressed': String(d === v.dueDate),
            onclick: () => { v.dueDate = d; draw(); },
          }, +d.slice(8)) : h('span', {})))),
        h('div', { class: 'dp-rows' },
          h('label', { class: 'dp-row' }, h('span', { class: 'dp-ic' }, '🕒'), h('span', { class: 'grow' }, 'Đặt giờ'),
            h('input', { type: 'time', class: 'input', value: v.dueTime ?? '', 'aria-label': 'Giờ', onchange: (e) => { v.dueTime = e.target.value || null; if (v.dueTime && !v.dueDate) v.dueDate = today; draw(); } }),
            v.dueTime ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Bỏ giờ', onclick: () => { v.dueTime = null; draw(); } }, '✕') : null),
          h('label', { class: `dp-row${v.dueTime ? '' : ' off'}` }, h('span', { class: 'dp-ic' }, '⏰'), h('span', { class: 'grow' }, 'Nhắc nhở'),
            h('select', { class: 'input', disabled: !v.dueTime, 'aria-label': 'Nhắc nhở', onchange: (e) => { v.remind = e.target.value === '' ? null : Number(e.target.value); } },
              REMINDS.map(([k, label]) => h('option', { value: k ?? '', selected: k === v.remind }, label)))),
          h('label', { class: `dp-row${v.dueDate ? '' : ' off'}` }, h('span', { class: 'dp-ic' }, '🔁'), h('span', { class: 'grow' }, 'Lặp lại'),
            h('select', { class: 'input', disabled: !v.dueDate, 'aria-label': 'Lặp lại', onchange: (e) => { v.repeat = e.target.value || null; } },
              REPEATS.map(([k, label]) => h('option', { value: k ?? '', selected: k === v.repeat }, label))))),
        h('div', { class: 'sheet-actions' },
          h('button', { type: 'button', class: 'chip', onclick: () => { result = { dueDate: null, dueTime: null, remind: null, repeat: null }; dlg.close(); } }, 'Xóa ngày'),
          h('span', { class: 'grow' }),
          h('button', { type: 'button', class: 'chip', onclick: () => dlg.close() }, 'Hủy'),
          h('button', { type: 'button', class: 'btn', onclick: () => { result = { ...v }; dlg.close(); } }, 'Xong')));
    };
    draw();
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

// Nhãn ngày ngắn gọn kiểu "Hôm nay, 13:00" / "Mai" / "T5 20/11".
export function dueLabel(t, today = todayKey()) {
  if (!t.dueDate) return '';
  const n = Math.round((toDate(t.dueDate) - toDate(today)) / 86_400_000);
  const dt = toDate(t.dueDate);
  const dm = `${dt.getDate()}/${dt.getMonth() + 1}`;
  const base = n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : n === -1 ? 'Hôm qua' : n > 1 && n < 7 ? `${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dt.getDay()]} ${dm}` : dm;
  return t.dueTime ? (n === 0 ? t.dueTime : `${base}, ${t.dueTime}`) : base;
}
