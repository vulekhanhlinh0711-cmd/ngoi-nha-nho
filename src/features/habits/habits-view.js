// P49: tab Thói quen — Hôm nay · Bảng (tuần / tháng / năm) · chi tiết từng thói quen; thẻ tóm tắt trên màn Hôm nay.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate, weekStart, makeKey, WEEKDAY_NAMES } from '../../core/dates.js';
import { PARTS, habitBoard, toggleDay, addCount, isActive, rate, scheduleText, isTiredDay, setTiredDay, checkTiredWin } from './habits.js';
import { addDialog, editDialog, exerciseDialog, sleepDialog } from './habit-dialogs.js';

let tab = 'day'; let selDay = null; let detailId = null; let span = 'week'; let offset = 0; let calOff = 0; let scrollX = null;
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const wd = (k) => toDate(k).getDay();
const dm = (k) => `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`;
const DOW = (k) => WEEKDAY_NAMES[wd(k)];

async function tick(hb, day = todayKey()) {
  if (day === todayKey() && !hb.set.has(day) && hb.id === 'exercise') return exerciseDialog(hb);
  if (day === todayKey() && !hb.set.has(day) && hb.id === 'sleep') return sleepDialog();
  if (hb.kind === 'count' && !hb.set.has(day)) { const v = await addCount(hb, day, 1); if (v >= hb.target) toast(`✓ ${hb.name}: đủ ${hb.target} ${hb.unit}!`); return null; }
  if (hb.kind === 'count' && hb.countOn(day) > 0) return addCount(hb, day, -1);
  const r = await toggleDay(hb, day);
  if (r === 'auto') toast(`“${hb.name}” được tự tích từ hoạt động bạn đã ghi, nên không bỏ tích ở đây được.`);
  return r;
}
// Phần trăm lấp đầy của thanh thói quen trong một ngày.
async function fillOf(hb, day) {
  if (hb.set.has(day)) return { p: 1, text: null };
  if (hb.kind === 'count') { const v = hb.countOn(day); return { p: Math.min(1, v / (hb.target || 1)), text: `${v}/${hb.target} ${hb.unit}` }; }
  if (day === todayKey() && hb.id === 'water') { const { waterToday } = await import('../water/water.js'); const w = await waterToday(); return { p: Math.min(0.98, w.total / w.goal), text: `${w.total.toLocaleString('vi-VN')}/${w.goal.toLocaleString('vi-VN')} ml` }; }
  return { p: 0, text: null };
}
const dueOn = (list, day) => list.filter((x) => isActive(x, day) && (!(x.perWeek < 7) || x.set.has(day)));

// ---- tab Hôm nay ----
function strip(list, day) {
  const today = todayKey(); const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return h('div', { class: 'hb-strip' }, days.map((d) => { const due = dueOn(list, d); const n = due.filter((x) => x.set.has(d)).length; return h('button', { class: `hb-day${d === day ? ' on' : ''}`, 'aria-pressed': String(d === day), 'aria-label': `${DOW(d)} ${dm(d)}: ${n}/${due.length} thói quen`, onclick: () => { selDay = d === today ? null : d; notifyChange(); } }, h('small', {}, WD[wd(d)]), h('span', { class: 'hb-ring', style: `--r:${due.length ? n / due.length : 0}` }, h('span', {}, Number(d.slice(8))))); }));
}
async function bar(hb, day) {
  const f = await fillOf(hb, day); const done = hb.set.has(day); const off = !isActive(hb, day);
  const sub = off ? 'hôm nay nghỉ' : f.text ?? (done ? (hb.kind === 'avoid' ? 'Đã tránh được ✓' : 'Đã xong ✓') : hb.auto ?? scheduleText(hb));
  return h('li', { class: `hb-bar${done ? ' done' : ''}${off ? ' off' : ''}`, style: `--hc:${hb.color};--p:${f.p}` },
    h('button', { class: 'hb-main', 'aria-label': `Xem ${hb.name}`, onclick: () => { detailId = hb.id; calOff = 0; notifyChange(); } }, h('span', { class: 'hb-ic', 'aria-hidden': 'true' }, hb.icon), h('span', { class: 'hb-txt' }, h('b', {}, hb.name), h('small', {}, sub))),
    hb.streak.days ? h('span', { class: 'hb-fire', title: `Chuỗi ${hb.streak.days} ngày` }, `🔥${hb.streak.days}`) : null,
    hb.link && !done ? h('a', { class: 'hb-go', href: hb.link, 'aria-label': `Mở ${hb.name}` }, 'Mở') : null,
    hb.kind === 'count' && hb.countOn(day) > 0 && !done ? h('button', { class: 'hb-step', 'aria-label': `Bớt 1 ${hb.name}`, onclick: () => addCount(hb, day, -1) }, '−') : null,
    h('button', { class: `hb-tick${done ? ' on' : ''}`, 'aria-pressed': String(done), 'aria-label': `${done ? 'Bỏ tích' : hb.kind === 'count' ? 'Thêm 1' : 'Đánh dấu xong'}: ${hb.name}`, onclick: () => tick(hb, day) }, done ? '✓' : hb.kind === 'count' ? '＋' : ''));
}
async function dayTab(list) {
  const today = todayKey(); const day = selDay && selDay <= today ? selDay : today; const tired = await isTiredDay(); const won = await checkTiredWin();
  const due = dueOn(list, day); const n = due.filter((x) => x.set.has(day)).length; const all = due.length > 0 && n === due.length;
  const groups = await Promise.all(Object.entries(PARTS).map(async ([k, l]) => { const g = list.filter((x) => (PARTS[x.part] ? x.part : 'any') === k).sort((a, b) => Number(isActive(b, day)) - Number(isActive(a, day))); return g.length ? [h('h4', { class: 'hb-part' }, l, h('span', {}, ` ${g.filter((x) => x.set.has(day)).length}/${g.length}`)), h('ul', { class: 'hb-list' }, await Promise.all(g.map((x) => bar(x, day))))] : null; }));
  return [h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, day === today ? 'Hôm nay' : `${DOW(day)}, ${dm(day)}`, h('span', { class: 'count' }, `${n}/${due.length}`)), h('button', { class: 'btn', onclick: addDialog }, '+ Thêm thói quen')),
    strip(list, day), h('div', { class: 'progress hb-progress' }, h('span', { style: `width:${due.length ? (n / due.length) * 100 : 0}%` })),
    h('p', { class: 'small' }, all ? '🌸 Trọn vẹn! Bạn đã làm hết thói quen của ngày.' : day === today ? 'Chạm vòng tròn để tích. Chạm ngày ở trên để ghi bù.' : 'Bạn đang ghi bù cho ngày trước.', day !== today ? [' ', h('button', { class: 'bk-link', onclick: () => { selDay = null; notifyChange(); } }, 'Về hôm nay')] : null),
    groups),
  h('section', { class: `card tired${tired ? ' on' : ''}` }, h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, tired ? '🫶 Hôm nay là ngày mệt' : 'Hôm nay bạn thấy mệt?'), h('p', { class: 'muted small' }, tired ? (won ? '🏆 Bạn đã thắng hôm nay rồi! Chuỗi ngày của mọi thói quen được giữ nguyên.' : 'Chỉ cần làm 1 việc nhỏ bất kỳ là tính thắng cả ngày.') : 'Bật chế độ ngày mệt: 1 việc nhỏ cũng được tính là thắng.')), h('button', { class: `chip${tired ? ' on' : ''}`, 'aria-pressed': String(tired), onclick: () => setTiredDay(!tired) }, tired ? 'Tắt' : 'Bật ngày mệt')))];
}

// ---- tab Bảng ----
function period(off = offset) {
  const today = todayKey();
  if (span === 'week') { const from = addDays(weekStart(today), off * 7); return { from, to: addDays(from, 6), label: `${dm(from)} – ${dm(addDays(from, 6))}` }; }
  const t = toDate(today);
  if (span === 'month') { const d = new Date(t.getFullYear(), t.getMonth() + off, 1); const y = d.getFullYear(); const m = d.getMonth() + 1; return { from: makeKey(y, m, 1), to: makeKey(y, m, new Date(y, m, 0).getDate()), label: `Tháng ${m}/${y}` }; }
  const y = t.getFullYear() + off; return { from: makeKey(y, 1, 1), to: makeKey(y, 12, 31), label: `Năm ${y}` };
}
const range = (a, b) => { const o = []; for (let d = a; d <= b; d = addDays(d, 1)) o.push(d); return o; };
const overall = (list, p) => { const r = list.map((x) => rate(x, p.from, p.to)); const due = r.reduce((s, x) => s + x.due, 0); return { due, done: r.reduce((s, x) => s + x.counted, 0), pct: due ? r.reduce((s, x) => s + x.counted, 0) / due : null }; };
// Ô càng đậm khi chuỗi càng dài (tối đa sau 8 ngày).
function depth(hb, d) { let n = 1; while (n < 8 && hb.set.has(addDays(d, -n))) n++; return Math.min(100, 44 + n * 7); }
function cell(hb, d, today) {
  const on = hb.set.has(d); const act = isActive(hb, d); const part = !on && hb.kind === 'count' ? hb.countOn(d) / (hb.target || 1) : 0;
  return h('button', { class: `hb-cell${on ? ' on' : ''}${act ? '' : ' rest'}${d === today ? ' now' : ''}`, disabled: d > today, style: on ? `background:color-mix(in srgb, ${hb.color} ${depth(hb, d)}%, #fff)` : part ? `background:linear-gradient(to top, ${hb.color} ${part * 100}%, transparent 0)` : null, 'aria-pressed': String(on), 'aria-label': `${hb.name}, ${DOW(d)} ${dm(d)}: ${on ? 'đã làm' : 'chưa làm'}`, title: `${hb.name} · ${dm(d)}`, onclick: () => tick2(hb, d) }, on ? '✓' : '');
}
// Trong bảng: bấm là bật/tắt nguyên ngày (thói quen đếm thì ghi đủ hoặc xóa về 0).
async function tick2(hb, d) {
  if (hb.kind === 'count' && !hb.set.has(d)) return addCount(hb, d, hb.target - hb.countOn(d));
  const r = await toggleDay(hb, d);
  if (r === 'auto') toast(`“${hb.name}” được tự tích từ hoạt động bạn đã ghi, nên không bỏ tích ở đây được.`);
  return r;
}
function grid(list, p) {
  const today = todayKey(); const days = range(p.from, p.to);
  const name = (x) => h('th', { scope: 'row', class: 'hb-name' }, h('button', { onclick: () => { detailId = x.id; calOff = 0; notifyChange(); } }, h('span', { 'aria-hidden': 'true' }, x.icon), h('span', {}, x.name)));
  const wrap = h('div', { class: `hb-scroll ${span}` }, h('table', { class: 'hb-table' },
    h('thead', {}, h('tr', {}, h('th', { class: 'hb-name' }, 'Thói quen'), days.map((d) => h('th', { scope: 'col', class: d === today ? 'now' : [0, 6].includes(wd(d)) ? 'we' : '' }, h('small', {}, WD[wd(d)]), h('b', {}, Number(d.slice(8))))), h('th', { class: 'hb-sum' }, 'Đạt'), h('th', { class: 'hb-sum' }, '🔥 Chuỗi'), h('th', { class: 'hb-sum' }, '👑 Dài nhất'), h('th', { class: 'hb-sum' }, 'Tổng'))),
    h('tbody', {}, list.map((x) => { const r = rate(x, p.from, p.to); return h('tr', {}, name(x), days.map((d) => h('td', { class: [0, 6].includes(wd(d)) ? 'we' : '' }, cell(x, d, today))), h('td', { class: 'hb-sum' }, r.due ? `${r.done}/${r.due}` : '–'), h('td', { class: 'hb-sum' }, h('span', { class: x.streak.days >= 3 ? 'hb-badge' : '', style: `--hc:${x.color}` }, x.streak.days)), h('td', { class: 'hb-sum' }, x.best), h('td', { class: 'hb-sum' }, x.total)); })),
    h('tfoot', {}, h('tr', {}, h('th', { class: 'hb-name', scope: 'row' }, 'Số thói quen đã làm'), days.map((d) => h('td', {}, d > today ? '' : list.filter((x) => x.set.has(d)).length || '·')), h('td', { colspan: '4' })))));
  wrap.addEventListener('scroll', () => { scrollX = wrap.scrollLeft; }, { passive: true });
  requestAnimationFrame(() => { if (scrollX != null) wrap.scrollLeft = scrollX; else { const n = wrap.querySelector('th.now'); if (n) wrap.scrollLeft = Math.max(0, n.offsetLeft - wrap.clientWidth * 0.6); } });
  return wrap;
}
// Dải cả năm cho một thói quen (cột = tuần).
function yearStrip(hb, from, to) {
  const start = weekStart(from); const cells = range(start, to).map((d) => h('span', { class: d < from ? 'x' : '', style: hb.set.has(d) && d >= from ? `background:${hb.color}` : null, title: hb.set.has(d) ? dm(d) : null }));
  const n = range(from, to).filter((d) => hb.set.has(d)).length;
  const w = h('div', { class: 'hb-yscroll' }, h('div', { class: 'hb-year', role: 'img', 'aria-label': `${hb.name}: ${n} ngày` }, cells));
  requestAnimationFrame(() => { const today = todayKey(); w.scrollLeft = to >= today ? Math.max(0, (Math.round((toDate(today) - toDate(start)) / 6048e5) * 11) - w.clientWidth + 40) : 0; });
  return w;
}
function boardTab(list) {
  const p = period(); const prev = period(offset - 1); const o = overall(list, p); const q = overall(list, prev); const today = todayKey();
  const diff = o.pct != null && q.pct != null ? Math.round((o.pct - q.pct) * 100) : null;
  const days = range(p.from, p.to > today ? today : p.to); const best = days.reduce((b, d) => { const n = list.filter((x) => x.set.has(d)).length; return n > b.n ? { d, n } : b; }, { d: null, n: 0 });
  const top = [...list].sort((a, b) => b.best - a.best)[0];
  return [h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', { class: 'hb-seg', role: 'tablist' }, [['week', 'Tuần'], ['month', 'Tháng'], ['year', 'Năm']].map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(span === k), class: span === k ? 'on' : '', onclick: () => { span = k; offset = 0; scrollX = null; notifyChange(); } }, l))), h('button', { class: 'btn', onclick: addDialog }, '+ Thêm')),
    h('div', { class: 'hb-nav' }, h('button', { class: 'chip', 'aria-label': 'Trước', onclick: () => { offset -= 1; scrollX = null; notifyChange(); } }, '‹'), h('b', {}, p.label), h('button', { class: 'chip', 'aria-label': 'Sau', disabled: offset >= 0, onclick: () => { offset += 1; scrollX = null; notifyChange(); } }, '›'), offset ? h('button', { class: 'chip', onclick: () => { offset = 0; scrollX = null; notifyChange(); } }, 'Hiện tại') : null),
    h('div', { class: 'progress hb-progress' }, h('span', { style: `width:${(o.pct ?? 0) * 100}%` })),
    h('p', { class: 'small hb-ach' }, h('span', {}, diff == null ? '' : diff > 0 ? `↑ Tăng ${diff}% so với trước` : diff < 0 ? `↓ Giảm ${-diff}% so với trước` : 'Bằng kỳ trước'), h('b', {}, o.pct == null ? 'Chưa có dữ liệu' : `Đạt ${Math.round(o.pct * 100)}%`)),
    span === 'year' ? h('div', { class: 'hb-years' }, list.map((x) => { const r = rate(x, p.from, p.to); return h('div', {}, h('button', { class: 'bk-link', onclick: () => { detailId = x.id; calOff = 0; notifyChange(); } }, `${x.icon} ${x.name}`), h('span', { class: 'bk-meta' }, ` · ${r.done} ngày`), yearStrip(x, p.from, p.to)); })) : grid(list, p)),
  h('section', { class: 'card' }, h('div', { class: 'stat-row' },
    h('div', { class: 'stat' }, h('b', {}, o.done), h('span', {}, `lượt đã làm / ${o.due} cần làm`)),
    h('div', { class: 'stat' }, h('b', {}, best.d ? dm(best.d) : '—'), h('span', {}, best.d ? `ngày tốt nhất · ${best.n} thói quen` : 'ngày tốt nhất')),
    h('div', { class: 'stat' }, h('b', {}, top?.best ? `${top.best} ngày` : '—'), h('span', {}, top?.best ? `chuỗi dài nhất · ${top.icon} ${top.name}` : 'chuỗi dài nhất'))),
    span === 'year' ? null : h('p', { class: 'muted small' }, 'Chạm một ô để tích hoặc bỏ tích ngày đó. Ô càng đậm là chuỗi càng dài. Ô gạch chéo là ngày không có lịch.'))];
}

// ---- chi tiết một thói quen ----
function detail(hb) {
  const today = todayKey(); const t = toDate(today); const d0 = new Date(t.getFullYear(), t.getMonth() + calOff, 1); const y = d0.getFullYear(); const m = d0.getMonth() + 1;
  const from = makeKey(y, m, 1); const to = makeKey(y, m, new Date(y, m, 0).getDate()); const lead = (wd(from) + 6) % 7; const mr = rate(hb, from, to); const all = rate(hb, hb.since, today);
  const rec = (ic, v, l) => h('div', { class: 'hb-rec' }, h('span', {}, ic), h('b', {}, v), h('small', {}, l));
  return [h('button', { class: 'chip', onclick: () => { detailId = null; notifyChange(); } }, '‹ Tất cả thói quen'),
    h('section', { class: 'card', style: `--hc:${hb.color}` },
      h('div', { class: 'card-head' }, h('h3', {}, `${hb.icon} ${hb.name}`), h('button', { class: 'chip', onclick: () => editDialog(hb) }, '✎ Sửa')),
      h('p', { class: 'small' }, [scheduleText(hb), hb.kind === 'count' ? `${hb.target} ${hb.unit}/ngày` : hb.kind === 'avoid' ? 'tránh làm' : null, hb.auto].filter(Boolean).join(' · '), hb.link ? [' · ', h('a', { href: hb.link }, 'Mở →')] : null),
      h('div', { class: 'hb-nav' }, h('button', { class: 'chip', 'aria-label': 'Tháng trước', onclick: () => { calOff -= 1; notifyChange(); } }, '‹'), h('b', {}, `Tháng ${m}/${y}`), h('button', { class: 'chip', 'aria-label': 'Tháng sau', disabled: calOff >= 0, onclick: () => { calOff += 1; notifyChange(); } }, '›')),
      h('div', { class: 'hb-cal' }, ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((x) => h('small', {}, x)), Array.from({ length: lead }, () => h('span')), range(from, to).map((d) => h('button', { class: `${hb.set.has(d) ? 'on' : ''}${d === today ? ' now' : ''}${isActive(hb, d) ? '' : ' rest'}`, disabled: d > today, 'aria-pressed': String(hb.set.has(d)), 'aria-label': `${dm(d)}: ${hb.set.has(d) ? 'đã làm' : 'chưa làm'}`, onclick: () => tick2(hb, d) }, Number(d.slice(8)))))),
    h('section', { class: 'card' }, h('h3', {}, 'Kỷ lục'), h('div', { class: 'hb-recs' }, rec('🗓️', mr.done, `ngày trong tháng ${m}`), rec('✅', hb.total, 'tổng số ngày'), rec('🔥', hb.streak.days, 'chuỗi hiện tại'), rec('👑', hb.best, 'chuỗi dài nhất'), rec('📈', all.due ? `${Math.round((all.counted / all.due) * 100)}%` : '—', 'tỷ lệ đạt'), rec('🌿', hb.streak.restLeft, 'ngày nghỉ còn lại tuần này'))),
    h('section', { class: 'card' }, h('h3', {}, 'Một năm qua'), yearStrip(hb, addDays(today, -363), today))];
}

export async function renderHabits(root) {
  const list = await habitBoard(); const hb = list.find((x) => x.id === detailId); if (!hb) detailId = null;
  mount(root, h('div', { class: 'view-head' }, h('h2', {}, 'Thói quen')),
    hb ? null : h('div', { class: 'vocab-tabs hb-tabs', role: 'tablist' }, [['day', '☀️', 'Hôm nay'], ['board', '📊', 'Bảng tổng kết']].map(([k, i, l]) => h('button', { class: `vocab-tab${tab === k ? ' on' : ''}`, role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; notifyChange(); } }, h('span', { 'aria-hidden': 'true' }, i), l))),
    hb ? detail(hb) : tab === 'board' ? boardTab(list) : await dayTab(list));
}

// ---- thẻ tóm tắt trên màn Hôm nay ----
export async function habitSummary() {
  const list = await habitBoard(); const today = todayKey(); const due = list.filter((x) => x.activeToday); const must = dueOn(list, today); const n = must.filter((x) => x.set.has(today)).length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const p = { from: addDays(today, -6), to: today }; const o = overall(list, p); const fire = [...list].sort((a, b) => b.streak.days - a.streak.days)[0];
  const order = [...due].sort((a, b) => Number(a.set.has(today)) - Number(b.set.has(today)));
  return h('section', { class: 'card hb-sumcard' },
    h('div', { class: 'card-head' }, h('h3', {}, '🌱 Thói quen hôm nay', h('span', { class: 'count' }, `${n}/${must.length}`)), h('a', { class: 'chip', href: '#habits' }, 'Xem tất cả →')),
    h('div', { class: 'progress hb-progress' }, h('span', { style: `width:${must.length ? (n / must.length) * 100 : 0}%` })),
    h('div', { class: 'hb-chips' }, order.map((x) => { const done = x.set.has(today); const cnt = x.kind === 'count' && !done && x.countOn(today) ? ` ${x.countOn(today)}/${x.target}` : ''; return h('button', { class: `hb-chip${done ? ' done' : ''}`, style: `--hc:${x.color}`, 'aria-pressed': String(done), 'aria-label': `${done ? 'Bỏ tích' : 'Đánh dấu'} ${x.name}`, onclick: () => tick(x) }, h('span', { 'aria-hidden': 'true' }, x.icon), x.name + cnt, done ? h('b', {}, ' ✓') : null); })),
    h('div', { class: 'hb-mini' }, days.map((d) => { const dd = dueOn(list, d); const k = dd.filter((x) => x.set.has(d)).length; return h('span', { title: `${dm(d)}: ${k}/${dd.length}` }, h('span', { class: 'hb-minibar' }, h('i', { style: `height:${dd.length ? (k / dd.length) * 100 : 0}%` })), h('small', {}, WD[wd(d)])); }),
      h('p', { class: 'small' }, o.pct == null ? 'Tích thói quen đầu tiên để bắt đầu 🌱' : `7 ngày qua đạt ${Math.round(o.pct * 100)}%`, fire?.streak.days > 1 ? ` · ${fire.icon} 🔥 ${fire.streak.days} ngày` : '')));
}
