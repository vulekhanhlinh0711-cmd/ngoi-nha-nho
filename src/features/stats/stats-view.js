// P1.20: thời gian tập trung theo việc, bản đồ nhiệt gián đoạn. P1.21: thống kê nước.
// Biểu đồ một màu (đậm dần theo giá trị), di chuột vào từng cột/ô để xem số; có bảng số liệu kèm theo.
import { h, mount } from '../../ui/dom.js';
import { getAll } from '../../core/db.js';
import { queryEvents, notifyChange } from '../../core/events.js';
import { todayKey, dayOf, fmtMl } from '../../core/time.js';
import { addDays, toDate, WEEKDAY_NAMES } from '../../core/dates.js';
import { SOURCES } from '../focus/focus-view.js';
import { waterHistory, waterStreak, REST_PER_WEEK } from '../water/water.js';

let focusRange = 7;  // 1 = hôm nay, 7 = 7 ngày
let waterRange = 7;  // 7 hoặc 30
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6h–23h
const ROWS = [1, 2, 3, 4, 5, 6, 0]; // T2 … CN
const shortDay = (wd) => (wd === 0 ? 'CN' : `T${wd + 1}`);

const toggle = (value, options, onPick) => h('div', { class: 'btn-group' }, options.map(([v, label]) =>
  h('button', { class: `chip${v === value ? ' on' : ''}`, 'aria-pressed': String(v === value), onclick: () => onPick(v) }, label)));

async function focusSection() {
  const from = addDays(todayKey(), -(focusRange - 1));
  const sessions = [...await queryEvents('pomodoro_done'), ...await queryEvents('pomodoro_stopped')]
    .filter((e) => dayOf(e.at) >= from && e.minutes > 0);
  const titles = new Map((await getAll('tasks')).map((t) => [t.id, t.title]));
  const byTask = new Map();
  for (const e of sessions) {
    const key = e.taskId ?? 'free';
    byTask.set(key, (byTask.get(key) ?? 0) + e.minutes);
  }
  const rows = [...byTask].map(([k, min]) => ({
    name: k === 'free' ? 'Tập trung tự do' : titles.get(k) ?? 'Việc đã xóa', min,
  })).sort((a, b) => b.min - a.min);
  const total = rows.reduce((s, r) => s + r.min, 0);
  const tomatoes = sessions.filter((e) => e.type === 'pomodoro_done').length;
  const max = rows[0]?.min ?? 1;
  const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`);

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h3', {}, '🍅 Thời gian tập trung'),
      toggle(focusRange, [[1, 'Hôm nay'], [7, '7 ngày']], (v) => { focusRange = v; notifyChange(); })),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('b', {}, fmt(total)), h('span', {}, 'tổng thời gian')),
      h('div', { class: 'stat' }, h('b', {}, tomatoes), h('span', {}, 'quả cà chua'))),
    rows.length
      ? h('ul', { class: 'hbars' }, rows.slice(0, 8).map((r) => h('li', { title: `${r.name}: ${fmt(r.min)}` },
          h('span', { class: 'hbar-label' }, r.name),
          h('span', { class: 'hbar-track' }, h('span', { class: 'hbar', style: `width:${Math.max(2, (r.min / max) * 100)}%` })),
          h('span', { class: 'hbar-value' }, fmt(r.min)))))
      : h('p', { class: 'muted small' }, 'Chưa có phiên tập trung nào trong khoảng này.'));
}

async function interruptSection() {
  const from = addDays(todayKey(), -29);
  const list = (await queryEvents('interruption')).filter((e) => dayOf(e.pausedAt ?? e.at) >= from);
  const grid = new Map();
  let outside = 0;
  for (const e of list) {
    const d = new Date(e.pausedAt ?? e.at);
    if (d.getHours() < 6) { outside++; continue; }
    const k = `${d.getDay()}|${d.getHours()}`;
    grid.set(k, (grid.get(k) ?? 0) + 1);
  }
  const max = Math.max(1, ...grid.values());
  const cell = (wd, hr) => {
    const n = grid.get(`${wd}|${hr}`) ?? 0;
    const label = `${WEEKDAY_NAMES[wd]}, ${hr}h–${hr + 1}h: ${n} lần`;
    return h('span', {
      class: 'hm-cell', title: label, 'aria-label': label, role: 'gridcell',
      style: n ? `background:color-mix(in srgb, var(--seq) ${Math.round(25 + 75 * (n / max))}%, var(--surface-2))` : null,
    });
  };

  // Gợi ý: khung hay bị làm phiền nhất, và giờ yên tĩnh nhất trong giờ làm việc (T2–T6, 8h–18h).
  let insight = null;
  if (list.length >= 3 && grid.size) {
    const [busyKey, busyN] = [...grid].sort((a, b) => b[1] - a[1])[0] ?? [];
    const work = Array.from({ length: 10 }, (_, i) => i + 8).map((hr) => [hr, [1, 2, 3, 4, 5].reduce((s, wd) => s + (grid.get(`${wd}|${hr}`) ?? 0), 0)]);
    const [quietHr] = work.sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
    const [bwd, bhr] = busyKey.split('|').map(Number);
    insight = h('p', { class: 'insight' },
      `Hay bị gián đoạn nhất: ${WEEKDAY_NAMES[bwd]} ${bhr}h–${bhr + 1}h (${busyN} lần). `,
      `Giờ yên tĩnh nhất trong tuần làm việc: ${quietHr}h–${quietHr + 1}h. Nên xếp việc cần tập trung vào giờ này.`);
  }

  const bySource = new Map();
  for (const e of list) bySource.set(e.source, (bySource.get(e.source) ?? 0) + 1);

  return h('section', { class: 'card' },
    h('h3', {}, '⏸ Gián đoạn (30 ngày)', h('span', { class: 'count' }, `${list.length} lần`)),
    list.length ? [
      h('div', { class: 'heatmap', role: 'grid', 'aria-label': 'Số lần gián đoạn theo thứ và giờ' },
        h('span', {}), HOURS.map((hr) => h('span', { class: 'hm-hour' }, hr % 3 === 0 ? `${hr}h` : '')),
        ROWS.map((wd) => [h('span', { class: 'hm-day' }, shortDay(wd)), HOURS.map((hr) => cell(wd, hr))])),
      h('div', { class: 'hm-legend' }, h('span', {}, 'Ít'), h('span', { class: 'hm-scale' }), h('span', {}, 'Nhiều'),
        outside ? h('span', { class: 'muted' }, ` · ${outside} lần trước 6h không hiển thị`) : null),
      insight,
      h('div', { class: 'presets' }, SOURCES.filter(([k]) => bySource.get(k)).map(([k, label]) =>
        h('span', { class: 'meta-chip' }, `${label}: ${bySource.get(k)}`))),
      h('details', { class: 'table-view' }, h('summary', {}, 'Xem dạng bảng'),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Thứ'), h('th', {}, 'Giờ'), h('th', {}, 'Số lần'))),
          h('tbody', {}, [...grid].sort((a, b) => b[1] - a[1]).map(([k, n]) => {
            const [wd, hr] = k.split('|').map(Number);
            return h('tr', {}, h('td', {}, WEEKDAY_NAMES[wd]), h('td', {}, `${hr}h–${hr + 1}h`), h('td', {}, n));
          })))),
    ] : h('p', { class: 'muted small' }, 'Chưa ghi nhận lần gián đoạn nào. Khi bị làm phiền lúc tập trung, bấm “Bị gián đoạn” để app học thói quen của bạn.'));
}

async function waterSection() {
  const hist = await waterHistory(waterRange);
  const tracked = hist.filter((d) => d.tracked);
  const streak = await waterStreak();
  const top = Math.max(...tracked.map((d) => Math.max(d.total, d.goal)), 1);
  const met = tracked.filter((d) => d.total >= d.goal).length;
  const avg = Math.round(tracked.reduce((s, d) => s + d.total, 0) / tracked.length);
  const label = (d) => { const dt = toDate(d.day); return `${dt.getDate()}/${dt.getMonth() + 1}`; };

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h3', {}, '💧 Uống nước'),
      toggle(waterRange, [[7, '7 ngày'], [30, '30 ngày']], (v) => { waterRange = v; notifyChange(); })),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('b', {}, `🔥 ${streak.days}`), h('span', {}, `ngày liên tiếp · còn ${streak.restLeft}/${REST_PER_WEEK} ngày nghỉ tuần này`)),
      h('div', { class: 'stat' }, h('b', {}, `${met}/${tracked.length}`), h('span', {}, tracked.length < hist.length ? 'ngày uống đủ (từ khi bắt đầu)' : 'ngày uống đủ')),
      h('div', { class: 'stat' }, h('b', {}, fmtMl(avg)), h('span', {}, 'trung bình mỗi ngày'))),
    h('div', { class: `vbars${waterRange > 7 ? ' dense' : ''}`, role: 'img', 'aria-label': 'Lượng nước theo ngày' },
      hist.map((d) => {
        const ok = d.total >= d.goal;
        const tip = `${label(d)}: ${fmtMl(d.total)} / ${fmtMl(d.goal)}${ok ? ' ✓' : ''}`;
        return h('div', { class: 'vbar-col', title: d.tracked ? tip : `${label(d)}: chưa dùng app` },
          h('div', { class: 'vbar-area' }, d.tracked ? [
            h('div', { class: 'vbar-goal', style: `bottom:${(d.goal / top) * 100}%` }),
            h('div', { class: `vbar${ok ? ' ok' : ''}`, style: `height:${(d.total / top) * 100}%` }),
          ] : null),
          h('span', { class: 'vbar-label' }, waterRange > 7 && toDate(d.day).getDate() % 5 ? '' : label(d)));
      })),
    h('div', { class: 'hm-legend' },
      h('span', { class: 'swatch ok' }), 'Đủ mục tiêu', h('span', { class: 'swatch' }), 'Chưa đủ',
      h('span', { class: 'swatch-line' }), 'Mục tiêu'),
    h('details', { class: 'table-view' }, h('summary', {}, 'Xem dạng bảng'),
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Ngày'), h('th', {}, 'Đã uống'), h('th', {}, 'Mục tiêu'))),
        h('tbody', {}, [...tracked].reverse().map((d) => h('tr', {}, h('td', {}, label(d)), h('td', {}, fmtMl(d.total)), h('td', {}, fmtMl(d.goal))))))));
}

export async function renderStats(root) {
  mount(root, 
    h('div', { class: 'view-head' }, h('h2', {}, 'Thống kê'),
      h('p', { class: 'muted' }, 'Nhìn lại nhẹ nhàng để sắp xếp ngày mai tốt hơn, không phải để chấm điểm. ', h('a', { href: '#review' }, '📋 Tổng kết tuần →'))),
    await focusSection(),
    await interruptSection(),
    await waterSection(),
  );
}
