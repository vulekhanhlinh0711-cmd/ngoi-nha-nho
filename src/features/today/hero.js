// P14.02: banner chào buổi + ô chỉ số nhiều màu + chọn cảm xúc nhanh (màn Hôm nay).
import { h } from '../../ui/dom.js';
import { todayKey, dayOf } from '../../core/time.js';
import { queryEvents, notifyChange } from '../../core/events.js';
import { getSetting } from '../../core/db.js';
import { toast } from '../../ui/toast.js';
import { svgFrom, pot, timeOfDay } from '../home/art.js';
import { MOODS, logMood } from '../journal/journal.js';
import { waterToday } from '../water/water.js';
import { coinSummary } from '../rewards/coins.js';
import { getPomo } from '../focus/pomodoro.js';
import { getAll } from '../../core/db.js';
import { addDays } from '../../core/dates.js';
import { avatarEl } from '../../core/profile.js';
import { villageSvg } from './village.js';
import { ic3d } from '../../ui/icons3d.js';
import { getProjects } from '../tasks/projects.js';

function greeting(hour) {
  if (hour < 11) return ['Chào buổi sáng', 'Hít một hơi thật sâu. Hôm nay bắt đầu nhẹ nhàng thôi nhé.'];
  if (hour < 14) return ['Chào buổi trưa', 'Nhớ ăn trưa và uống một ly nước nha.'];
  if (hour < 18) return ['Chào buổi chiều', 'Còn một chút nữa thôi, bạn đang làm rất tốt.'];
  return ['Chào buổi tối', 'Thả lỏng vai, nhìn lại một ngày đã qua nào.'];
}

// Tranh nhỏ: cửa sổ (trời theo giờ), bàn học, laptop, cốc trà, chậu cây.
function heroArt(light) {
  return svgFrom(`<svg class="hero-art" viewBox="0 0 300 200" aria-hidden="true">
    <defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${light.sky1}"/><stop offset="1" style="stop-color:${light.sky2}"/></linearGradient></defs>
    <rect x="70" y="14" width="150" height="112" rx="14" fill="#fffaf2"/>
    <rect x="80" y="24" width="130" height="92" rx="8" fill="url(#hsky)"/>
    <circle cx="180" cy="50" r="13" fill="${light.sun}"/>
    <ellipse cx="115" cy="48" rx="20" ry="7" fill="#fff" opacity=".85"/>
    <path d="M80 98 Q120 76 160 92 T210 86 V116 H80Z" fill="#9cc98d"/><path d="M80 108 Q140 94 210 106 V116 H80Z" fill="#7fb574"/>
    <rect x="143" y="24" width="4" height="92" fill="#fffaf2"/><rect x="80" y="68" width="130" height="4" fill="#fffaf2"/>
    <path d="M86 126 L60 200 H240 L204 126Z" fill="rgba(255,236,190,.35)"/>
    <rect x="20" y="148" width="260" height="12" rx="6" fill="#d9a97a"/><rect x="30" y="160" width="10" height="40" fill="#b9845a"/><rect x="260" y="160" width="10" height="40" fill="#b9845a"/>
    <rect x="110" y="112" width="74" height="40" rx="5" fill="#cfd6f5"/><rect x="115" y="117" width="64" height="30" rx="3" fill="#f3f6ff"/><rect x="100" y="148" width="94" height="5" rx="2.5" fill="#aeb8e6"/>
    <path d="M128 132 h20 M128 138 h32" stroke="#b9c3f0" stroke-width="3" stroke-linecap="round"/>
    <rect x="206" y="128" width="20" height="20" rx="4" fill="#f6b8b8"/><path d="M226 133 q8 0 6 8 q-2 4 -6 4" stroke="#f6b8b8" stroke-width="3" fill="none"/>
    <path d="M212 122 q3 -6 0 -10 M219 122 q3 -6 0 -10" stroke="#e8d8cc" stroke-width="2" fill="none" class="hero-steam"/>
    ${pot(60, 140, 0.62, 'monstera', '#f2c7a5')}
    ${pot(250, 140, 0.45, 'tulips', '#cfe3f2')}
  </svg>`);
}

export async function heroBanner() {
  const now = new Date();
  const light = timeOfDay((await getSetting('houseLight')) ?? 'auto');
  const [hello, sub] = greeting(now.getHours());
  const name = (await getSetting('profileName')) ?? '';
  const moods = (await queryEvents('mood_logged')).filter((e) => e.day === todayKey());
  const mood = moods.at(-1)?.mood;
  const pomo = getPomo();
  const season = document.documentElement.dataset.season;
  const greet = { noel: 'Giáng sinh an lành 🎄', tet: 'Chúc mừng năm mới 🧧', valentine: 'Valentine ngọt ngào 💝', midautumn: 'Trung thu vui vẻ 🏮', halloween: 'Happy Halloween 🎃' }[season];
  return h('section', { class: `hero time-${light.id}` },
    h('a', { class: 'hero-avatar', href: '#settings', title: 'Đổi ảnh đại diện' }, h('div', { class: 'hero-halo' }), await avatarEl('hero-pfp')),
    h('div', { class: 'hero-text' },
      h('h2', {}, `${hello}${name ? `, ${name}` : ''} `, h('span', { 'aria-hidden': 'true' }, light.id === 'night' ? '🌙' : '☀️')),
      greet ? h('p', { class: 'hero-season' }, greet) : null,
      h('p', {}, sub),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'btn hero-btn', href: '#focus' }, pomo.phase === 'idle' ? '▶ Bắt đầu tập trung' : '⏱ Đang tập trung →'),
        h('a', { class: 'chip', href: '#journal' }, '✍️ Viết nhật ký')),
      h('div', { class: 'hero-mood', role: 'radiogroup', 'aria-label': 'Hôm nay bạn thấy thế nào?' },
        h('span', { class: 'small' }, 'Hôm nay bạn thấy thế nào?'),
        h('div', { class: 'mood-faces' }, MOODS.map(([v, icon, label]) => h('button', {
          class: `mood-face m${v}${mood === v ? ' on' : ''}`, role: 'radio', 'aria-checked': String(mood === v), title: label, 'aria-label': label,
          onclick: async () => { await logMood(v); toast(`Đã ghi cảm xúc: ${icon} ${label}`); notifyChange(); },
        }, h('span', {}, ic3d(`mood${v}`)), h('small', {}, label)))))),
    season === 'noel' ? villageSvg() : heroArt(light));
}

// Số ngày liên tiếp có làm ít nhất 1 việc nhỏ (xong việc / tập trung / uống nước / thói quen).
function activeStreak(events, today) {
  const days = new Set(events.filter((e) => ['task_done', 'pomodoro_done', 'water_logged', 'habit_done', 'lesson_done'].includes(e.type)).map((e) => e.day ?? dayOf(e.at)));
  let n = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) n++;
  return n;
}

export async function statTiles() {
  const today = todayKey();
  const events = await getAll('events');
  const on = (type, d) => events.filter((e) => e.type === type && (e.day ?? dayOf(e.at)) === d);
  const inLast7 = (type) => events.filter((e) => e.type === type && (e.day ?? dayOf(e.at)) > addDays(today, -7));
  const done = on('task_done', today).length;
  const mins = (list) => list.reduce((s, e) => s + (e.minutes || 0), 0);
  const focus = mins([...on('pomodoro_done', today), ...on('pomodoro_stopped', today)]);
  const water = await waterToday();
  const streak = activeStreak(events, today);
  const coins = await coinSummary();
  const tile = (cls, icon, label, value, sub, href) => h('a', { class: `stat-tile ${cls}`, href },
    h('span', { class: 'stat-ic', 'aria-hidden': 'true' }, ic3d(icon)),
    h('span', { class: 'stat-label' }, label),
    h('b', { class: 'stat-value' }, value),
    h('span', { class: 'stat-sub' }, sub));
  return h('div', { class: 'stat-tiles' },
    tile('t-lilac', 'check', 'Việc đã xong', done, h('span', {}, h('b', { class: 'up' }, `${inLast7('task_done').length}`), ' trong 7 ngày'), '#tasks'),
    tile('t-pink', 'alarm', 'Phút tập trung', focus, h('span', {}, h('b', { class: 'up' }, `${Math.round(mins([...inLast7('pomodoro_done'), ...inLast7('pomodoro_stopped')]) / 6) / 10} giờ`), ' trong 7 ngày'), '#focus'),
    tile('t-yellow', 'droplet', 'Uống nước', `${Math.min(100, Math.round((water.total / water.goal) * 100))}%`, `${water.total}/${water.goal} ml`, '#water'),
    tile('t-blue', 'fire', 'Chuỗi ngày', streak, streak ? 'ngày liên tiếp' : 'bắt đầu từ hôm nay', '#habits'),
    tile('t-mint', 'coin', 'Xu', coins.balance, `+${coins.today} hôm nay`, '#house'));
}

// ---- Biểu đồ: phút tập trung 7 ngày (cột) + việc xong theo danh sách 30 ngày (vòng) ----
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export async function chartsRow() {
  const today = todayKey();
  const events = await getAll('events');
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const minsOn = (d) => events.filter((e) => (e.type === 'pomodoro_done' || e.type === 'pomodoro_stopped') && dayOf(e.at) === d).reduce((s, e) => s + (e.minutes || 0), 0);
  const vals = days.map(minsOn);
  const max = Math.max(60, ...vals);
  const nice = Math.ceil(max / 30) * 30;
  const bars = h('section', { class: 'card clay chart-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Thời gian tập trung'), h('span', { class: 'pill-soft' }, '7 ngày qua')),
    h('div', { class: 'cbars', role: 'img', 'aria-label': `Phút tập trung 7 ngày: ${days.map((d, i) => `${d.slice(8)}/${d.slice(5, 7)} ${vals[i]} phút`).join(', ')}` },
      h('div', { class: 'cbars-axis', 'aria-hidden': 'true' }, [nice, nice / 2, 0].map((v) => h('span', {}, v >= 60 ? `${Math.round(v / 6) / 10}h` : `${v}p`))),
      days.map((d, i) => h('div', { class: `cbar-col${d === today ? ' today' : ''}`, title: `${WD[new Date(`${d}T00:00`).getDay()]} ${+d.slice(8)}/${+d.slice(5, 7)}: ${vals[i]} phút` },
        h('div', { class: 'cbar-area' }, h('div', { class: 'cbar', style: `height:${Math.max(vals[i] ? 4 : 0, (vals[i] / nice) * 100)}%` }, vals[i] ? h('span', { class: 'cbar-tip' }, `${vals[i]}p`) : null)),
        h('span', { class: 'cbar-label' }, WD[new Date(`${d}T00:00`).getDay()])))),
    vals.every((v) => !v) ? h('p', { class: 'muted small' }, 'Chưa có phiên tập trung nào trong tuần. Bắt đầu một phiên 25 phút nhé!') : null);

  // Vòng: việc xong 30 ngày theo danh sách. Màu cố định theo danh sách (không theo thứ hạng), tối đa 5 + "Khác".
  const projects = await getProjects();
  const since = addDays(today, -29);
  const tasks = await getAll('tasks');
  const doneIds = new Set(events.filter((e) => e.type === 'task_done' && dayOf(e.at) >= since).map((e) => e.taskId));
  const counts = new Map();
  for (const t of tasks) if (doneIds.has(t.id)) counts.set(t.projectId ?? 'none', (counts.get(t.projectId ?? 'none') ?? 0) + 1);
  const PAL = ['#8f7cf0', '#f28ca5', '#f5b544', '#6cc39a', '#5fa8f0'];
  let rows = projects.map((p, i) => ({ id: p.id, name: `${p.icon} ${p.name}`, n: counts.get(p.id) ?? 0, color: PAL[i % PAL.length] })).filter((r) => r.n);
  const other = (counts.get('none') ?? 0) + rows.slice(5).reduce((s, r) => s + r.n, 0);
  rows = rows.slice(0, 5);
  if (other) rows.push({ id: 'none', name: 'Khác', n: other, color: '#b9b4c7' });
  const total = rows.reduce((s, r) => s + r.n, 0);
  let acc = 0;
  const stops = rows.map((r) => { const a = acc; acc += r.n / total; return `${r.color} ${a * 360}deg ${acc * 360 - 1.5}deg, transparent ${acc * 360 - 1.5}deg ${acc * 360}deg`; }).join(', ');
  const donut = h('section', { class: 'card clay chart-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Việc đã xong theo danh sách'), h('span', { class: 'pill-soft' }, '30 ngày')),
    total ? h('div', { class: 'donut-row' },
      h('div', { class: 'donut', style: `background:conic-gradient(${stops})`, role: 'img', 'aria-label': rows.map((r) => `${r.name}: ${r.n} việc`).join(', ') },
        h('div', { class: 'donut-hole' }, h('b', {}, total), h('small', {}, 'việc'))),
      h('ul', { class: 'legend' }, rows.map((r) => h('li', {}, h('span', { class: 'dot', style: `background:${r.color}` }), h('span', { class: 'grow' }, r.name), h('b', {}, `${Math.round((r.n / total) * 100)}%`)))))
      : h('p', { class: 'muted small' }, 'Hoàn thành vài việc có gắn danh sách (#tên khi ghi nhanh) để thấy biểu đồ này.'));
  return h('div', { class: 'charts-row' }, bars, donut);
}

export function homeBanner() {
  return h('a', { class: 'home-banner', href: '#house' },
    h('span', { class: 'hb-star', 'aria-hidden': 'true' }, ic3d(document.documentElement.dataset.season === 'noel' ? 'xmastree' : 'star')),
    h('span', { class: 'grow' }, h('b', {}, 'Ghé ngôi nhà nhỏ của bạn'), h('small', {}, 'Dùng xu để trang trí phòng, trồng hoa ngoài vườn')),
    h('span', { class: 'hb-btn' }, 'Vào nhà →'));
}
