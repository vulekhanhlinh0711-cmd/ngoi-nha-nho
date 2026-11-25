// P4.05: lịch tô màu theo tâm trạng, "Ngày này năm trước", tổng kết tháng.
import { h, mount } from '../../ui/dom.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { makeKey, toDate } from '../../core/dates.js';
import { isLocked, lockScreen } from '../../core/lock.js';
import { MOODS, moodOf, allEntries, moodByDay, KINDS } from './journal.js';
import { entryCard, journalHead, dayLabel } from './journal-view.js';

let month = null; // 'YYYY-MM'
let picked = null;

const monthKey = (day) => day.slice(0, 7);
function shiftMonth(m, n) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function renderJournalCal(root) {
  if (await isLocked('journal')) {
    mount(root, journalHead('journal-cal'), lockScreen('journal', 'Nhật ký đang khóa', notifyChange));
    return;
  }
  const today = todayKey();
  month ??= monthKey(today);
  const [y, mo] = month.split('-').map(Number);
  const moods = await moodByDay();
  const entries = await allEntries();
  const byDay = new Map();
  for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);

  // Lưới tháng, bắt đầu từ Thứ 2.
  const first = new Date(y, mo - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => makeKey(y, mo, i + 1))];
  const cell = (d) => {
    if (!d) return h('span', { class: 'cal-cell empty' });
    const m = moods.get(d);
    const n = byDay.get(d)?.length ?? 0;
    const label = `${toDate(d).getDate()}/${mo}${m ? `: ${moodOf(m.mood)[2]}` : ''}${n ? `, ${n} trang` : ''}`;
    return h('button', {
      class: `cal-cell${m ? ` mood-${m.mood}` : ''}${d === today ? ' today' : ''}${d === picked ? ' picked' : ''}`,
      title: label, 'aria-label': label, onclick: () => { picked = d; notifyChange(); },
    }, h('span', {}, toDate(d).getDate()), m ? h('span', { class: 'cal-emoji' }, moodOf(m.mood)[1]) : null, n ? h('span', { class: 'cal-dot' }) : null);
  };

  // Ngày này những năm trước.
  const md = today.slice(5);
  const past = entries.filter((e) => e.day.slice(5) === md && e.day < today);
  const pastMoods = [...moods.values()].filter((m) => m.day.slice(5) === md && m.day < today);

  // Tổng kết tháng.
  const inMonth = entries.filter((e) => monthKey(e.day) === month);
  const moodsInMonth = [...moods.values()].filter((m) => monthKey(m.day) === month);
  const dist = MOODS.map(([v]) => moodsInMonth.filter((m) => m.mood === v).length);
  const avg = moodsInMonth.length ? moodsInMonth.reduce((s, m) => s + m.mood, 0) / moodsInMonth.length : null;
  const tagCount = new Map();
  for (const e of inMonth) for (const t of e.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topTags = [...tagCount].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const gratitude = inMonth.filter((e) => e.kind === 'gratitude').reduce((s, e) => s + (e.items?.length ?? 1), 0);
  const maxDist = Math.max(...dist, 1);

  mount(root,
    journalHead('journal-cal'),
    h('section', { class: 'card' },
      h('div', { class: 'toolbar' },
        h('div', { class: 'btn-group' },
          h('button', { class: 'chip', 'aria-label': 'Tháng trước', onclick: () => { month = shiftMonth(month, -1); notifyChange(); } }, '‹'),
          h('button', { class: 'chip', onclick: () => { month = monthKey(today); notifyChange(); } }, 'Tháng này'),
          h('button', { class: 'chip', 'aria-label': 'Tháng sau', onclick: () => { month = shiftMonth(month, 1); notifyChange(); } }, '›')),
        h('strong', {}, `Tháng ${mo}/${y}`)),
      h('div', { class: 'cal-grid' }, ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => h('span', { class: 'cal-wd' }, d)), cells.map(cell)),
      h('div', { class: 'hm-legend' }, MOODS.map(([v, icon, label]) => h('span', { class: 'legend-item' }, h('span', { class: `swatch mood-${v}` }), `${icon} ${label}`)))),
    picked ? h('section', { class: 'card' },
      h('h3', {}, dayLabel(picked), moods.get(picked) ? ` · ${moodOf(moods.get(picked).mood)[1]}` : ''),
      moods.get(picked)?.note ? h('p', { class: 'muted' }, `“${moods.get(picked).note}”`) : null,
      byDay.get(picked)?.length ? await Promise.all(byDay.get(picked).map(entryCard)) : h('p', { class: 'muted small' }, 'Ngày này chưa viết trang nào.')) : null,
    h('section', { class: 'card' },
      h('h3', {}, '🕰️ Ngày này năm trước'),
      past.length || pastMoods.length
        ? [pastMoods.map((m) => h('p', {}, `${m.day.slice(0, 4)}: ${moodOf(m.mood)[1]} ${m.note ?? ''}`)), await Promise.all(past.map(entryCard))]
        : h('p', { class: 'muted small' }, 'Chưa có kỷ niệm nào vào ngày này. Một năm nữa, trang bạn viết hôm nay sẽ hiện ở đây 🌱')),
    h('section', { class: 'card' },
      h('h3', {}, `📊 Tổng kết tháng ${mo}`),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, inMonth.length), h('span', {}, 'trang đã viết')),
        h('div', { class: 'stat' }, h('b', {}, moodsInMonth.length), h('span', {}, 'ngày ghi cảm xúc')),
        h('div', { class: 'stat' }, h('b', {}, avg ? moodOf(Math.round(avg))[1] : '—'), h('span', {}, 'cảm xúc trung bình')),
        h('div', { class: 'stat' }, h('b', {}, gratitude), h('span', {}, 'điều biết ơn'))),
      moodsInMonth.length ? h('ul', { class: 'hbars' }, MOODS.map(([v, icon, label], i) => h('li', { title: `${label}: ${dist[i]} ngày` },
        h('span', { class: 'hbar-label' }, `${icon} ${label}`),
        h('span', { class: 'hbar-track' }, h('span', { class: `hbar mood-${v}`, style: `width:${Math.max(2, (dist[i] / maxDist) * 100)}%` })),
        h('span', { class: 'hbar-value' }, `${dist[i]} ngày`)))) : null,
      h('p', { class: 'muted small' }, KINDS.map(([k, l]) => `${l}: ${inMonth.filter((e) => e.kind === k).length}`).join(' · ')),
      topTags.length ? h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, 'Nhãn nhiều nhất:'), topTags.map(([t, n]) => h('span', { class: 'meta-chip' }, `#${t} (${n})`))) : null));
}
