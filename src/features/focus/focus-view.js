// Màn Tập trung: chọn việc, đồng hồ, nút gián đoạn, giờ nghỉ.
import { h, mount } from '../../ui/dom.js';
import { fmtClock, todayKey, dayOf } from '../../core/time.js';
import { queryEvents } from '../../core/events.js';
import { listOpenTasks, byDue, LABEL, addTask } from '../tasks/tasks.js';
import { triage } from '../tasks/task-actions.js';
import { toast } from '../../ui/toast.js';
import {
  getPomo, getPrefs, setPrefs, startWork, interrupt, updatePause, resume, stop,
  remainingMs, phaseTotalMs, breakTips,
} from './pomodoro.js';
import { addDefaultCup } from '../water/water.js';
import { openRoom, SCENES } from '../room/room.js';
import { applyMix } from '../room/soundscape.js';
import { svg } from '../../ui/dom.js';

// P13: lưới âm thanh nền — bấm một ô để phát, bấm "Không" để tắt.
const cafeMix = SCENES.find((x) => x.id === 'cafe')?.mix ?? { cafe: 0.4 };
export const NOISES = [
  ['none', '🔇', 'Không', {}], ['rain', '🌧️', 'Mưa', { rain: 0.6 }], ['cafe', '☕', 'Quán cà phê', cafeMix],
  ['forest', '🌲', 'Rừng', { birds: 0.6, stream: 0.35 }], ['waves', '🌊', 'Sóng biển', { waves: 0.7, ocean: 0.3 }],
  ['fire', '🔥', 'Lửa trại', { fire: 0.75, night: 0.2 }], ['stream', '💧', 'Suối', { stream: 0.7, birds: 0.2 }],
  ['storm', '⛈️', 'Giông bão', { thunder: 0.8, rain: 0.4 }], ['night', '🦗', 'Đêm hè', { night: 0.7 }],
  ['library', '📚', 'Thư viện', { library: 0.75 }],
];
let noise = 'none';
function noiseGrid() {
  return h('section', { class: 'card' },
    h('h3', {}, 'Âm thanh nền'),
    h('div', { class: 'noise-grid', role: 'radiogroup', 'aria-label': 'Âm thanh nền' }, NOISES.map(([id, ic, name, mix]) => h('button', {
      class: `noise${noise === id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(noise === id),
      onclick: (e) => {
        noise = id; applyMix(mix);
        e.currentTarget.parentElement.querySelectorAll('.noise').forEach((b) => { const on = b === e.currentTarget; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
      },
    }, h('span', { class: 'noise-ic' }, ic), name))));
}

export const SOURCES = [
  ['call', '📞 Cuộc gọi'], ['chat', '💬 Tin nhắn'], ['email', '📧 Email'],
  ['person', '👤 Có người đến'], ['other', '✳️ Khác'],
];
const PRESETS = [[25, 5], [50, 10], [15, 3]];
const R = 88;
const C = 2 * Math.PI * R;

// Cập nhật đồng hồ mỗi giây mà không vẽ lại cả màn.
export function updateFocusClock() {
  const p = getPomo();
  const left = remainingMs();
  const time = document.getElementById('pomo-time');
  if (time) time.textContent = fmtClock(left);
  const ring = document.getElementById('pomo-ring');
  if (ring) ring.style.strokeDashoffset = String(C * (1 - left / phaseTotalMs()));
  const pill = document.getElementById('pomo-pill');
  if (pill) {
    pill.hidden = p.phase === 'idle';
    pill.textContent = `${p.phase === 'break' ? '☕' : p.phase === 'paused' ? '⏸' : '🍅'} ${fmtClock(left)}`;
  }
}

function svgRoot() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

const ring = (label) => h('div', { class: 'ring-wrap' },
  svgRoot(),
  h('div', { class: 'ring-center' },
    h('div', { id: 'pomo-time', class: 'clock', role: 'timer' }, fmtClock(remainingMs())),
    h('div', { class: 'muted small' }, label)));

// SVG phải tạo bằng createElementNS.
function fillRing(wrap, cls) {
  const svg = wrap.querySelector('svg');
  const ns = 'http://www.w3.org/2000/svg';
  for (const [id, c] of [[null, 'ring-bg'], ['pomo-ring', `ring-fg ${cls}`]]) {
    const el = document.createElementNS(ns, 'circle');
    el.setAttribute('cx', '100'); el.setAttribute('cy', '100'); el.setAttribute('r', String(R));
    el.setAttribute('class', c);
    if (id) {
      el.id = id;
      el.style.strokeDasharray = String(C);
      el.style.strokeDashoffset = String(C * (1 - remainingMs() / phaseTotalMs()));
    }
    svg.append(el);
  }
  return wrap;
}

async function todaySummary() {
  const today = todayKey();
  const done = (await queryEvents('pomodoro_done')).filter((e) => dayOf(e.at) === today);
  const stopped = (await queryEvents('pomodoro_stopped')).filter((e) => dayOf(e.at) === today);
  const minutes = [...done, ...stopped].reduce((s, e) => s + (e.minutes || 0), 0);
  return h('p', { class: 'muted center' }, `Hôm nay: ${'🍅'.repeat(Math.min(done.length, 12)) || 'chưa có quả cà chua nào'} · ${minutes} phút tập trung`);
}

async function idleView(p) {
  const prefs = await getPrefs();
  const tasks = (await listOpenTasks()).sort((a, b) => (a.status === 'today') === (b.status === 'today') ? byDue(a, b) : a.status === 'today' ? -1 : 1);
  const preselect = tasks.some((t) => t.id === p.lastTaskId) ? p.lastTaskId : tasks.find((t) => t.status === 'today')?.id;
  const label = h('span', {}, tasks.find((t) => t.id === preselect)?.title ?? 'Tập trung tự do');
  const select = h('select', {
    id: 'focus-task', 'aria-label': 'Chọn việc để tập trung',
    onchange: (e) => { label.textContent = e.target.selectedOptions[0]?.dataset.title ?? 'Tập trung tự do'; },
  },
    h('option', { value: '' }, '— Tập trung tự do (không gắn việc) —'),
    tasks.map((t) => h('option', { value: t.id, selected: t.id === preselect, dataset: { title: t.title } }, `${t.title} · ${LABEL[t.status]}`)));
  const num = (id, v, lbl) => h('label', { class: 'field-inline' }, lbl,
    h('input', { id, type: 'number', min: '1', max: '180', value: v, class: 'input num' }));
  const idleRing = h('div', { class: 'ring-wrap' },
    svg('svg', { viewBox: '0 0 200 200', class: 'ring', 'aria-hidden': 'true' },
      svg('circle', { cx: 100, cy: 100, r: R, class: 'ring-bg' }),
      svg('circle', { cx: 100, cy: 100, r: R, class: 'ring-fg idle', style: 'stroke-dasharray:0 999;opacity:.0' })),
    h('div', { class: 'ring-center' }, h('div', { class: 'clock' }, `${String(prefs.workMin).padStart(2, '0')}:00`), h('div', { class: 'muted small' }, `nghỉ ${prefs.breakMin} phút`)));

  return [h('section', { class: 'card focus-card' },
    h('div', { class: 'pomo-tabs' }, h('span', { class: 'on' }, 'Pomodoro')),
    h('label', { class: 'pomo-task', title: 'Chọn việc' }, 'Tập trung: ', label, ' ›', select),
    idleRing,
    h('button', {
      class: 'btn btn-big btn-pill',
      onclick: () => { const v = document.getElementById('focus-task').value; startWork(v ? Number(v) : null); },
    }, 'Bắt đầu'),
    h('div', { class: 'presets', style: 'justify-content:center' },
      PRESETS.map(([w, b]) => h('button', {
        class: `chip${prefs.workMin === w && prefs.breakMin === b ? ' on' : ''}`,
        onclick: () => setPrefs(w, b),
      }, `${w}/${b}`)),
      num('work-min', prefs.workMin, 'Làm'), num('break-min', prefs.breakMin, 'Nghỉ'),
      h('button', {
        class: 'chip', onclick: () => setPrefs(+document.getElementById('work-min').value, +document.getElementById('break-min').value),
      }, 'Lưu')),
    await todaySummary()), noiseGrid()];
}

function workView(p) {
  return [h('section', { class: 'card focus-card' },
    h('p', { class: 'focus-task' }, p.taskTitle),
    fillRing(ring('đang tập trung'), 'work'),
    p.note ? h('p', { class: 'note' }, '📝 Ghi chú lúc dừng: ', p.note) : null,
    h('div', { class: 'focus-actions' },
      h('button', { class: 'btn btn-big btn-soft', onclick: interrupt }, '⏸ Bị gián đoạn'),
      p.taskId ? h('button', {
        class: 'chip', onclick: async () => { await stop(); await triage(p.taskId, 'done'); },
      }, '✓ Xong việc này') : null,
      h('button', { class: 'chip', onclick: stop }, 'Kết thúc sớm'))), noiseGrid()];
}

function pausedView(p) {
  let timer;
  const urgent = h('input', { class: 'input', placeholder: 'Việc gấp phát sinh? Ghi vào Inbox…', 'aria-label': 'Việc gấp phát sinh' });
  return h('section', { class: 'card focus-card' },
    h('p', { class: 'focus-task' }, p.taskTitle),
    h('p', { class: 'paused-label' }, '⏸ Đang tạm dừng · còn ', h('b', {}, fmtClock(p.remainingMs))),
    h('div', { class: 'field' }, h('span', {}, 'Bị gián đoạn bởi'),
      h('div', { class: 'presets' }, SOURCES.map(([k, label]) => h('button', {
        class: `chip${p.source === k ? ' on' : ''}`, 'aria-pressed': String(p.source === k),
        onclick: (e) => {
          updatePause({ source: k });
          e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => {
            c.classList.toggle('on', c === e.currentTarget);
            c.setAttribute('aria-pressed', String(c === e.currentTarget));
          });
        },
      }, label)))),
    h('label', { class: 'field' }, h('span', {}, 'Đang làm dở đến đâu, bước tiếp theo là gì?'),
      h('textarea', {
        class: 'input', rows: '3', placeholder: 'Ví dụ: viết xong mục 2, tiếp theo là thêm số liệu tháng 10',
        oninput: (e) => { clearTimeout(timer); const v = e.target.value; timer = setTimeout(() => updatePause({ note: v }), 300); },
      }, p.note ?? '')),
    h('form', {
      class: 'inline-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const t = await addTask(urgent.value);
        if (t) { toast(`Đã ghi vào Inbox: “${t.title}”`); urgent.value = ''; }
      },
    }, urgent, h('button', { class: 'chip', type: 'submit' }, '+ Inbox')),
    h('div', { class: 'focus-actions' },
      h('button', { class: 'btn btn-big', onclick: resume }, `▶ Tiếp tục (còn ${fmtClock(p.remainingMs)})`),
      h('button', { class: 'chip', onclick: stop }, 'Kết thúc phiên')));
}

function breakView(p) {
  return h('section', { class: 'card focus-card break' },
    h('p', { class: 'focus-task' }, '☕ Giờ nghỉ'),
    fillRing(ring('nghỉ ngơi'), 'rest'),
    h('ul', { class: 'tips' }, breakTips(p.tipSeed).map((t) => h('li', {}, t))),
    h('div', { class: 'focus-actions' },
      h('button', {
        class: 'btn btn-soft',
        onclick: async () => { const c = await addDefaultCup(); toast(`💧 Đã uống ${c.ml} ml. Cây cũng được tưới!`); },
      }, '💧 Uống 1 ly'),
      h('button', { class: 'chip', onclick: stop }, 'Bỏ qua nghỉ')));
}

export async function renderFocus(root) {
  const p = getPomo();
  const view = p.phase === 'work' ? workView(p)
    : p.phase === 'paused' ? pausedView(p)
      : p.phase === 'break' ? breakView(p)
        : await idleView(p);
  mount(root, 
    h('div', { class: 'view-head' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Tập trung'),
        h('button', { class: 'btn btn-soft', onclick: openRoom }, '🌙 Vào Focus Room')),
      h('p', { class: 'muted' }, 'Pomodoro: làm một mạch rồi nghỉ ngắn. Bị làm phiền thì bấm “Bị gián đoạn”, ghi lại chỗ đang dở.')),
    view);
}
