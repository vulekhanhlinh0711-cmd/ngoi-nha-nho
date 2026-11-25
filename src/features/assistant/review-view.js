// P8.03: màn Tổng kết tuần.
import { h, mount } from '../../ui/dom.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate } from '../../core/dates.js';
import { MOODS } from '../journal/journal.js';
import { weeklyReview } from './assistant.js';

let offset = 0; // 0 = tuần này, -1 = tuần trước…
const dm = (d) => `${toDate(d).getDate()}/${toDate(d).getMonth() + 1}`;

export async function renderReview(root) {
  const r = await weeklyReview(addDays(todayKey(), offset * 7));
  const stat = (v, label) => h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, label));
  mount(root,
    h('div', { class: 'view-head' }, h('h2', {}, '📋 Tổng kết tuần'),
      h('p', { class: 'muted' }, 'Nhìn lại nhẹ nhàng: ghi nhận điều đã làm được, chọn 1–3 mục tiêu nhỏ cho tuần tới.')),
    h('div', { class: 'toolbar' },
      h('div', { class: 'btn-group' },
        h('button', { class: 'chip', 'aria-label': 'Tuần trước', onclick: () => { offset--; notifyChange(); } }, '‹'),
        h('button', { class: 'chip', onclick: () => { offset = 0; notifyChange(); } }, 'Tuần này'),
        h('button', { class: 'chip', 'aria-label': 'Tuần sau', disabled: offset >= 0, onclick: () => { offset++; notifyChange(); } }, '›')),
      h('strong', {}, `${dm(r.start)} – ${dm(r.end)}`)),
    h('section', { class: 'card' },
      h('h3', {}, '🌟 Bạn đã làm được'),
      h('div', { class: 'stat-row' },
        stat(r.tasksDone, 'việc hoàn thành'), stat(`🍅 ${r.tomatoes}`, `phiên tập trung (${r.focusMin} phút)`),
        stat(`${r.waterDays}/7`, 'ngày uống đủ nước'), stat(r.journal, 'trang nhật ký'),
        stat(r.moodAvg ? MOODS[Math.round(r.moodAvg) - 1][1] : '—', 'cảm xúc trung bình'),
        stat(r.moneyDays, 'ngày ghi thu chi')),
      r.strongest?.days ? h('p', {}, `Thói quen giữ tốt nhất: ${r.strongest.icon} ${r.strongest.name} (${r.strongest.days}/7 ngày) 👏`) : null,
      h('ul', { class: 'hbars' }, r.habits.map((hb) => h('li', { title: `${hb.name}: ${hb.days}/7 ngày` },
        h('span', { class: 'hbar-label' }, `${hb.icon} ${hb.name}`),
        h('span', { class: 'hbar-track' }, h('span', { class: 'hbar', style: `width:${Math.max(2, (hb.days / 7) * 100)}%` })),
        h('span', { class: 'hbar-value' }, `${hb.days}/7`)))),
      r.interruptions ? h('p', { class: 'muted small' }, `Bị gián đoạn ${r.interruptions} lần khi tập trung. Xem giờ hay bị làm phiền ở `, h('a', { href: '#stats' }, 'Thống kê'), '.') : null),
    h('section', { class: 'card' },
      h('h3', {}, '🎯 Gợi ý mục tiêu tuần tới'),
      h('ol', { class: 'goals' }, r.goals.map((g) => h('li', {}, g))),
      h('p', { class: 'muted small' }, 'Đây chỉ là gợi ý. Chọn điều vừa sức nhất với bạn. ', h('a', { href: '#ai' }, '💬 Bàn thêm với trợ lý AI →'))));
}
