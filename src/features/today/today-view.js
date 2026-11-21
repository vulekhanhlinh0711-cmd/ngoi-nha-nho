// P1.19: màn Hôm nay = chậu cây + xu, bình nước, tập trung, lịch hẹn, 3 việc chính, việc khác, Inbox.
import { h, mount } from '../../ui/dom.js';
import { todayKey } from '../../core/time.js';
import { notifyChange } from '../../core/events.js';
import { WEEKDAY_NAMES, toDate } from '../../core/dates.js';
import { listTasks, listOpenTasks, getTask, byDue, countInbox, LABEL } from '../tasks/tasks.js';
import { taskMeta } from '../tasks/task-meta.js';
import { triage } from '../tasks/task-actions.js';
import { getTop3, setTop3, suggestScore, TOP_MAX } from './top3.js';
import { startFocusOn } from '../focus/focus-actions.js';
import { getPomo } from '../focus/pomodoro.js';
import { queryEvents } from '../../core/events.js';
import { dayOf, fmtMl } from '../../core/time.js';
import { toast } from '../../ui/toast.js';
import { waterToday, addDefaultCup } from '../water/water.js';
import { bottle } from '../water/water-view.js';
import { coinSummary, DAILY_CAP } from '../rewards/coins.js';
import { plantState, plantArt } from '../rewards/plant.js';
import { morningPlan, isReviewTime } from '../assistant/assistant.js';
import { updateTask } from '../tasks/tasks.js';
import { heroBanner, statTiles, chartsRow, homeBanner } from './hero.js';

let picking = false;      // người dùng bấm "Đổi" (chưa có danh sách thì luôn ở chế độ chọn)
let selected = new Set(); // id đang chọn khi picking

function checkItem(t) {
  const done = t.status === 'done';
  return h('li', { class: `task compact${done ? ' is-done' : ''}`, draggable: done ? null : 'true', dataset: { id: t.id } },
    h('input', {
      type: 'checkbox', checked: done,
      'aria-label': `${done ? 'Bỏ đánh dấu' : 'Đánh dấu xong'}: ${t.title}`,
      onchange: () => triage(t.id, done ? 'today' : 'done'),
    }),
    h('div', { class: 'task-main' },
      h('span', { class: 'task-title' }, t.title),
      taskMeta(t)),
    done ? null : h('button', {
      class: 'icon-btn', title: 'Tập trung vào việc này', 'aria-label': `Tập trung: ${t.title}`,
      onclick: () => startFocusOn(t.id),
    }, '▶'));
}

function pickItem(t, rerender) {
  const on = selected.has(t.id);
  const full = !on && selected.size >= TOP_MAX;
  return h('li', { class: `task compact pick${on ? ' picked' : ''}` },
    h('button', {
      class: 'star-btn', 'aria-pressed': String(on), disabled: full,
      'aria-label': `${on ? 'Bỏ chọn' : 'Chọn'}: ${t.title}`,
      onclick: () => { on ? selected.delete(t.id) : selected.add(t.id); rerender(); },
    }, on ? '★' : '☆'),
    h('div', { class: 'task-main' },
      h('span', { class: 'task-title' }, t.title),
      taskMeta(t, { extra: LABEL[t.status] })));
}

async function topCard(root, top) {
  const rerender = notifyChange;

  if (top && !picking) {
    const tasks = (await Promise.all(top.map(getTask))).filter(Boolean);
    const doneCount = tasks.filter((t) => t.status === 'done').length;
    return h('section', { class: 'card top3' },
      h('div', { class: 'card-head' },
        h('h3', {}, '⭐ 3 việc chính hôm nay', h('span', { class: 'count' }, `${doneCount}/${tasks.length} xong`)),
        h('button', {
          class: 'link-btn',
          onclick: () => { picking = true; selected = new Set(top); rerender(); },
        }, 'Đổi')),
      tasks.length
        ? h('ul', { class: 'task-list' }, tasks.map(checkItem))
        : h('p', { class: 'muted small' }, 'Các việc đã chọn không còn nữa. Bấm Đổi để chọn lại.'),
      doneCount && doneCount === tasks.length
        ? h('p', { class: 'cheer' }, '🌸 Xong cả 3 việc chính rồi. Phần còn lại của ngày là phần thưởng!')
        : null);
  }

  const today = todayKey();
  const candidates = (await listOpenTasks())
    .sort((a, b) => suggestScore(a, today) - suggestScore(b, today) || byDue(a, b));
  return h('section', { class: 'card top3 picking' },
    h('div', { class: 'card-head' },
      h('h3', {}, '☀️ Chọn 3 việc chính hôm nay', h('span', { class: 'count' }, `${selected.size}/${TOP_MAX}`)),
      top ? h('button', { class: 'link-btn', onclick: () => { picking = false; rerender(); } }, 'Hủy') : null),
    h('p', { class: 'muted small' },
      'Chỉ cần 3 việc thôi để không bị ngợp. Gợi ý: việc đến hạn và việc quan trọng được xếp lên đầu.'),
    candidates.length
      ? h('ul', { class: 'task-list pick-list' }, candidates.slice(0, 12).map((t) => pickItem(t, rerender)))
      : h('p', { class: 'muted small' }, 'Chưa có việc nào. Ghi nhanh ở ô phía trên nhé.'),
    h('button', {
      class: 'btn', disabled: selected.size === 0,
      onclick: async () => { const ids = [...selected]; picking = false; selected = new Set(); await setTop3(ids); },
    }, 'Chốt danh sách'));
}

async function dashboard() {
  const coins = await coinSummary();
  const water = await waterToday();
  const plant = await plantState({ earned: coins.earned, waterTotal: water.total, waterGoal: water.goal });
  const today = todayKey();
  const tomatoes = (await queryEvents('pomodoro_done')).filter((e) => dayOf(e.at) === today).length;
  const pomo = getPomo();

  return h('div', { class: 'dash' },
    h('section', { class: 'card dash-plant' },
      plantArt(plant, true),
      h('div', {},
        h('h3', {}, `${plant.stage.name}`),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': Math.round(plant.progress * 100), 'aria-label': 'Tiến độ lớn của cây' },
          h('span', { style: `width:${Math.round(plant.progress * 100)}%` })),
        h('p', { class: 'muted small' }, plant.mood),
        h('p', { class: 'coins-line' }, h('span', { class: 'coin' }, `🪙 ${coins.balance}`),
          ` xu · hôm nay +${coins.today}${coins.capped ? ` (đã đủ ${DAILY_CAP}, mai tiếp nhé)` : ''}`))),
    h('section', { class: 'card dash-water' },
      bottle(water.total, water.goal, 'mini'),
      h('div', {},
        h('h3', {}, h('a', { href: '#water' }, '💧 Nước')),
        h('p', { class: 'small' }, `${fmtMl(water.total)} / ${fmtMl(water.goal)}`),
        h('button', {
          class: 'chip', onclick: async () => {
            const c = await addDefaultCup();
            toast(`💧 +${c.ml} ml. Cây được tưới rồi!`);
          },
        }, '+1 ly'))),
    h('section', { class: 'card dash-focus' },
      h('h3', {}, h('a', { href: '#focus' }, '🍅 Tập trung')),
      h('p', { class: 'small' }, tomatoes ? `${'🍅'.repeat(Math.min(tomatoes, 8))} ${tomatoes} phiên hôm nay` : 'Chưa có phiên nào hôm nay'),
      h('a', { class: 'chip', href: '#focus' }, pomo.phase === 'idle' ? '▶ Bắt đầu' : 'Đang chạy →')));
}

async function apptCard() {
  const today = todayKey();
  const appts = (await listOpenTasks()).filter((t) => t.dueDate === today && t.dueTime).sort(byDue);
  if (!appts.length) return null;
  const now = new Date().toTimeString().slice(0, 5);
  return h('section', { class: 'card' },
    h('h3', {}, '⏰ Lịch hẹn hôm nay', h('span', { class: 'count' }, appts.length)),
    h('ul', { class: 'appt-list' }, appts.map((t) => h('li', { class: t.dueTime < now ? 'past' : null },
      h('span', { class: 'appt-time' }, t.dueTime), h('span', {}, t.title)))));
}

let planOpen = null; // null = tự động (mở buổi sáng)
async function planCard() {
  const p = await morningPlan();
  const open = planOpen ?? new Date().getHours() < 12;
  const hh = (n) => `${String(n).padStart(2, '0')}:00`;
  return h('details', { class: 'card plan', open, ontoggle: (e) => { planOpen = e.target.open; } },
    h('summary', {}, '🗓️ Kế hoạch hôm nay ', h('a', { href: '#ai', class: 'small' }, '💬 nhờ AI sắp xếp')),
    h('ul', { class: 'plan-list' },
      h('li', {}, `⏰ ${p.appts.length ? p.appts.map((t) => `${t.dueTime} ${t.title}`).join(' · ') : 'Không có lịch hẹn'}`),
      h('li', {}, `⭐ ${p.important.length ? p.important.map((t) => t.title).join(' · ') : 'Chưa có việc quan trọng'}`),
      p.inbox ? h('li', {}, h('a', { href: '#inbox' }, `📥 ${p.inbox} việc trong Inbox chờ phân loại`)) : null,
      h('li', {}, `🕘 Khung giờ trống: ${p.slots.length ? p.slots.map((s) => `${s.hour}h`).join(', ') : 'không còn trong giờ làm việc'}`)),
    p.suggestion ? h('p', { class: 'insight' },
      `Gợi ý: làm “${p.suggestion.task.title}” lúc ${hh(p.suggestion.hour)}`,
      p.suggestion.byData ? ' — khung giờ ít bị gián đoạn nhất theo dữ liệu của bạn. ' : '. ',
      h('button', {
        class: 'chip', onclick: async () => {
          await updateTask(p.suggestion.task.id, { dueDate: todayKey(), dueTime: hh(p.suggestion.hour) });
          toast(`Đã xếp “${p.suggestion.task.title}” lúc ${hh(p.suggestion.hour)}`);
        },
      }, 'Xếp lịch')) : null);
}

export async function renderToday(root) {
  const top = await getTop3();
  const topIds = new Set(top ?? []);
  const others = (await listTasks('today')).filter((t) => !topIds.has(t.id)).sort(byDue);
  const inbox = await countInbox();
  const d = toDate(todayKey());

  mount(root, 
    h('p', { class: 'muted today-date' }, `${WEEKDAY_NAMES[d.getDay()]}, ${d.toLocaleDateString('vi-VN')}`),
    await heroBanner(),
    await statTiles(),
    await chartsRow(),
    isReviewTime() ? h('a', { class: 'card inbox-link', href: '#review' }, '📋 Tối Chủ nhật rồi — xem tổng kết tuần và chọn mục tiêu tuần tới →') : null,
    await planCard(),
    await dashboard(),
    await apptCard(),
    await topCard(root, top),
    h('section', { class: 'card', dataset: { drop: 'today' } },
      h('h3', {}, 'Việc khác hôm nay', h('span', { class: 'count' }, others.length)),
      others.length
        ? h('ul', { class: 'task-list' }, others.map(checkItem))
        : h('p', { class: 'muted small' }, 'Không còn việc nào khác. Nhẹ nhàng thôi 🍃')),
    inbox
      ? h('a', { class: 'card inbox-link', href: '#inbox' }, `📥 ${inbox} việc trong Inbox đang chờ phân loại →`)
      : null,
    homeBanner(),
  );
}
