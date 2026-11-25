// P34: nhạc nền theo buổi trong ngày + âm thiên nhiên đi kèm, phát trên mọi tab (tự tạm dừng khi vào Focus Room).
// Nhạc: Mixkit (Free License — dùng miễn phí, không cần ghi tên). Âm thiên nhiên: dùng lại các file trong assets/sounds.
// Phát bằng <audio> (tải dần, nhẹ máy) nối qua Web Audio để tăng/giảm âm mượt (iPhone không cho chỉnh audio.volume).
import { h, mount } from '../../ui/dom.js';
import { seasonFor } from '../../core/season.js';
import { getSetting, setSetting } from '../../core/db.js';
import { toast } from '../../ui/toast.js';
import { STYLE_TRACKS, GAIN } from './tracks.js';

// P50: kênh thể loại. calm = hợp tối/khuya; parts = buổi mà kênh được trộn vào chế độ "Theo giờ".
export const STYLES = {
  lofi: { name: 'Lo-fi', icon: '☕', parts: ['noon', 'afternoon'] },
  jazz: { name: 'Jazz quán cà phê', icon: '🎷', parts: ['noon', 'afternoon', 'evening'] },
  piano: { name: 'Piano', icon: '🎹', calm: true, parts: ['morning', 'evening', 'night'] },
  classical: { name: 'Cổ điển', icon: '🎻', calm: true, parts: ['morning', 'evening'] },
  acoustic: { name: 'Acoustic & ukulele', icon: '🎸', parts: ['morning', 'afternoon'] },
  fairy: { name: 'Cổ tích mơ màng', icon: '🏰', parts: ['morning', 'afternoon'] },
  latin: { name: 'Latin & biển', icon: '🌴', parts: ['noon'] },
  soul: { name: 'Soul & R&B', icon: '🌹', parts: ['afternoon', 'evening'] },
  zen: { name: 'Thiền & thư giãn', icon: '🪷', calm: true, parts: ['night'] },
  world: { name: 'Á Đông & thế giới', icon: '🎋', parts: ['morning', 'afternoon'] },
  city: { name: 'Thành phố đêm', icon: '🌆', parts: ['evening'] },
  happy: { name: 'Vui tươi', icon: '🎈', parts: ['morning', 'noon'] },
};
const AMBS = [['auto', 'Tự động theo buổi'], ['rain', '🌧️ Mưa'], ['birds', '🐦 Chim rừng'], ['stream', '💧 Suối'], ['waves', '🌊 Sóng biển'], ['fire', '🔥 Lửa trại'], ['night', '🦗 Đêm côn trùng'], ['cafe', '☕ Quán cà phê']];

export const PERIODS = {
  morning: { name: 'Buổi sáng', short: 'Sáng', icon: '☀️', mood: 'Tươi mới, nhẹ nhàng', amb: 'birds', ambVol: 0.22,
    tracks: [[443, 'Serene View'], [282, 'Sweet September'], [801, 'Happy Home'], [1072, 'Owies Ukulele'], [543, 'A New Life'], [534, 'Hope and Kindness'], [682, 'Classical Vibes 2'], [587, 'Discover']] },
  noon: { name: 'Buổi trưa', short: 'Trưa', icon: '🌤', mood: 'Chill, mát mẻ', amb: 'stream', ambVol: 0.14,
    tracks: [[135, 'Sleepy Cat'], [766, 'Lo-Fi 04'], [175, 'Digital Clouds'], [292, 'Relax Beat'], [494, 'Chill Bro'], [24, 'Smooth Like Jazz'], [988, "Day Dreamin' with U"], [39, 'Latin Lovers']] },
  afternoon: { name: 'Buổi chiều', short: 'Chiều', icon: '🌇', mood: 'Thư thả, ấm áp', amb: null, ambVol: 0,
    tracks: [[234, 'Thinking About You'], [640, 'Smooth Jazz'], [528, 'You Got Jazz'], [23, 'Relaxing Country'], [480, 'Curiosity'], [964, 'Look At The Bright Side'], [127, 'Valley Sunset']] },
  evening: { name: 'Buổi tối', short: 'Tối', icon: '🌙', mood: 'Nhẹ nhàng, lãng mạn', amb: 'rain', ambVol: 0.1,
    tracks: [[659, 'Romantic'], [493, 'Beautiful Dream'], [40, 'Lounging By Moonlight'], [752, 'Romantic 01'], [22, 'Piano Reflections'], [38, 'Forever Love'], [599, 'Possible Dreams'], [502, 'Winter Wind']] },
  night: { name: 'Đêm khuya', short: 'Khuya', icon: '🌌', mood: 'Êm dịu, dễ ngủ', amb: 'night', ambVol: 0.12,
    tracks: [[148, 'Forest Mist Whispers'], [324, 'Smooth Meditation'], [441, 'Meditation'], [184, 'Vastness'], [584, 'Rest Now']] },
};
export const ORDER = ['morning', 'noon', 'afternoon', 'evening', 'night'];

// P36: nhạc theo sự kiện & mùa. [mã/tên file, tên bài, êm (dùng cho tối/khuya)]
export const EVENTS = {
  noel: { name: 'Giáng sinh', icon: '🎄', tracks: [[93, 'Tinsel and Mistletoe'], [862, 'Christmas Gifts'], [866, 'Christmas Stars'], [867, 'December Treats'], [916, 'See You Next Christmas'], [691, 'Holidays 2'], [505, 'Golden Freezer'], [510, 'Holiday Seasonal 3', 1], [503, 'Christmas Jazz'], [506, 'Little Bells', 1], [509, 'Holiday Seasonal 2'], [512, 'Holiday Seasonal 5'], [690, 'Holidays'], [897, 'A Very Happy Christmas'], [906, 'Glory of Christmas'], [984, 'Christmas Laughs'], [985, 'Christmas Lullaby', 1], [912, 'My Christmas Prayer', 1]] },
  newyear: { name: 'Năm mới', icon: '🎆', tracks: [['ny-auld-lang-syne', 'Auld Lang Syne', 1], [839, 'Tears of Joy'], [288, 'One More Dance'], [963, 'Just Keep Walking'], [862, 'Christmas Gifts']] },
  tet: { name: 'Tết', icon: '🧧', tracks: [['tet-guzheng-morning', 'Guzheng Morning'], ['tet-zheng-zheng', 'Zheng Zheng GuZheng'], ['tet-happy-monks', 'Senor Guzheng and the Happy Monks'], ['tet-erhu', 'Dances With Erhu'], ['tet-cung-hy', 'Cung Hỷ Cung Hỷ (1940s)'], ['tet-mua-la-chuoi', 'Mưa rơi trên lá chuối', 1]] },
  valentine: { name: 'Valentine', icon: '💝', tracks: [[659, 'Romantic', 1], [493, 'Beautiful Dream', 1], [37, 'Love is Eternal', 1], [38, 'Forever Love', 1], [1081, "We'll Be Okay"], [672, 'Wedding Harp', 1]] },
  midautumn: { name: 'Trung thu', icon: '🏮', tracks: [['tet-mua-la-chuoi', 'Mưa rơi trên lá chuối', 1], ['tet-guzheng-morning', 'Guzheng Morning'], ['tet-erhu', 'Dances With Erhu'], [531, 'Lullaby Night', 1], [148, 'Forest Mist Whispers', 1]] },
  halloween: { name: 'Halloween', icon: '🎃', tracks: [[64, 'Dark Shadows'], [404, 'Greed']] },
  spring: { name: 'Mùa xuân', icon: '🌸', tracks: [[684, 'Classical Vibes 4'], [847, "It's April"], [530, 'A Baby Story'], [532, 'A Happy Child'], [38, 'Forever Love', 1]] },
  summer: { name: 'Mùa hè', icon: '☀️', tracks: [[839, 'Tears of Joy'], [288, 'One More Dance'], [13, 'Summer Fun'], [529, 'Walking in the Park'], [813, 'Magical Moment', 1]] },
  autumn: { name: 'Mùa thu', icon: '🍂', tracks: [[1028, 'Fifth of February', 1], [854, 'Old Letter', 1], [531, 'Lullaby Night', 1], [127, 'Valley Sunset'], [22, 'Piano Reflections', 1]] },
  winter: { name: 'Mùa đông', icon: '❄️', tracks: [[139, 'Spirit in the Woods'], [147, 'Spirit in the Woods 2', 1], [138, 'Forest Treasure'], [588, 'Feedback Dreams', 1], [148, 'Forest Mist Whispers', 1]] },
};
const EVENT_ORDER = ['noel', 'newyear', 'tet', 'valentine', 'midautumn', 'halloween', 'spring', 'summer', 'autumn', 'winter'];
// Sự kiện hiện tại: theo lịch nền của app (season.js) + tuần Năm mới (28/12–3/1).
export function eventNow(d = new Date()) {
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (md >= '12-28' || md <= '01-03') return 'newyear';
  const s = seasonFor(d);
  return EVENTS[s] ? s : null;
}
export function periodNow(d = new Date()) {
  const hr = d.getHours();
  return hr >= 5 && hr < 11 ? 'morning' : hr < 14 && hr >= 11 ? 'noon' : hr < 18 && hr >= 14 ? 'afternoon' : hr < 23 && hr >= 18 ? 'evening' : 'night';
}

// ---- cài đặt (riêng từng máy) ----
const DEF = { on: false, vol: 0.5, amb: true, period: 'auto', evMode: 'mix', evPick: 'auto', styles: [], favOnly: false, ambPick: 'auto' }; // evMode: mix | only | off
const load = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem('bgm') ?? '{}') }; } catch { return { ...DEF }; } };
let prefs = load();
const save = () => { try { localStorage.setItem('bgm', JSON.stringify(prefs)); } catch { /* bỏ qua */ } };

// ---- âm thanh ----
let ctx = null; let master = null;
const decks = []; // 2 đầu phát nhạc để chuyển bài mượt
let ambEl = null; let ambGain = null; let ambName = null;
let current = null; // { period, id, title, deck }
let paused = true; // đang tạm dừng (vì tắt, Focus Room, hoặc chờ chạm lần đầu)
let blockedBy = new Set(); // lý do tạm dừng từ bên ngoài (room)
// Các bài vừa nghe (nhớ qua các lần mở app) để không lặp lại.
let history = []; try { history = JSON.parse(localStorage.getItem('bgmHist') ?? '[]'); } catch { /* bỏ qua */ }
let backStack = []; // để bấm "bài trước"
// Yêu thích / không thích: lưu trong cài đặt → đồng bộ giữa các máy.
let taste = { fav: [], no: [] };
getSetting('bgmTaste').then((t) => { if (t) { taste = { fav: [], no: [], ...t }; emit(); } }).catch(() => {});
const saveTaste = () => { setSetting('bgmTaste', taste).catch(() => {}); emit(); };
const TITLES = new Map([...Object.values(STYLE_TRACKS).flat(), ...Object.values(PERIODS).flatMap((p) => p.tracks), ...Object.values(EVENTS).flatMap((e) => e.tracks)].map(([id, t]) => [String(id), [id, t]]));
export const trackCount = TITLES.size;
export const isFav = (id) => taste.fav.includes(String(id));
export function toggleFav(id) { const k = String(id); taste.fav = taste.fav.includes(k) ? taste.fav.filter((x) => x !== k) : [...taste.fav, k]; taste.no = taste.no.filter((x) => x !== k); saveTaste(); }
export function dislike(id) { const k = String(id); taste.no = [...new Set([...taste.no, k])]; taste.fav = taste.fav.filter((x) => x !== k); saveTaste(); }
export function undislike(id) { taste.no = taste.no.filter((x) => x !== String(id)); saveTaste(); }
const base = (p) => new URL(p, document.baseURI).href;

function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  for (let i = 0; i < 2; i++) {
    const el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous';
    const g = ctx.createGain(); g.gain.value = 0;
    ctx.createMediaElementSource(el).connect(g).connect(master);
    el.addEventListener('ended', () => { if (current?.deck === i) next(); });
    el.addEventListener('error', () => { if (current?.deck === i) setTimeout(next, 1500); });
    decks.push({ el, g });
  }
  ambEl = new Audio(); ambEl.loop = true; ambEl.crossOrigin = 'anonymous';
  ambGain = ctx.createGain(); ambGain.gain.value = 0;
  ctx.createMediaElementSource(ambEl).connect(ambGain).connect(master);
}

const activePeriod = () => (prefs.period === 'auto' ? periodNow() : prefs.period);
export const activeEvent = () => (prefs.evMode === 'off' ? null : prefs.evPick === 'auto' ? eventNow() : prefs.evPick);
// Danh sách bài có thể phát: yêu thích → thể loại đã chọn → theo giờ (bài gốc của buổi + các kênh hợp buổi đó).
export function poolFor(period) {
  let list;
  if (prefs.favOnly && taste.fav.length) list = taste.fav.map((k) => TITLES.get(k)).filter(Boolean);
  else if (prefs.styles.length) list = prefs.styles.flatMap((k) => STYLE_TRACKS[k] ?? []);
  else list = [...PERIODS[period].tracks, ...Object.entries(STYLES).filter(([, st]) => st.parts.includes(period)).flatMap(([k]) => STYLE_TRACKS[k])];
  const seen = new Set(); const uniq = list.filter(([id]) => { const k = String(id); if (seen.has(k)) return false; seen.add(k); return true; });
  const ok = uniq.filter(([id]) => !taste.no.includes(String(id)));
  return ok.length ? ok : uniq;
}
function pickTrack(period) {
  const ev = activeEvent();
  const calm = period === 'evening' || period === 'night';
  let list = poolFor(period);
  // Nhạc dịp lễ: chế độ "trộn" chỉ chen ~1/4 số bài và nhường khi bạn đã tự chọn thể loại / yêu thích.
  const own = prefs.styles.length || (prefs.favOnly && taste.fav.length);
  if (ev && (prefs.evMode === 'only' || (!own && Math.random() < 0.27))) {
    const all = EVENTS[ev].tracks.filter(([id]) => !taste.no.includes(String(id))); const soft = all.filter((t) => t[2]);
    const pick = calm && soft.length ? soft : all;
    if (pick.length) list = pick;
  }
  const avoid = new Set(history.slice(-Math.min(60, Math.floor(list.length * 0.7))).map(String));
  const fresh = list.filter(([id]) => !avoid.has(String(id)) && String(id) !== String(current?.id));
  return fresh[Math.floor(Math.random() * fresh.length)] ?? list.find(([id]) => String(id) !== String(current?.id)) ?? list[0];
}
const ramp = (param, v, sec) => { const t = ctx.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + sec); };

function playTrack(period, [id, title]) {
  ensureAudio();
  const i = current ? 1 - current.deck : 0;
  const d = decks[i];
  clearTimeout(d.stop); // đầu phát này được dùng lại → hủy lệnh dừng trễ của bài trước
  if (current) { const old = decks[current.deck]; ramp(old.g.gain, 0, 2.5); clearTimeout(old.stop); old.stop = setTimeout(() => old.el.pause(), 2600); }
  d.el.src = base(`assets/music/${id}.m4a`);
  d.el.currentTime = 0;
  d.el.play().catch(() => {});
  ramp(d.g.gain, GAIN[id] ?? 1, 2.5);
  current = { period, id, title, deck: i, ev: EVENTS[activeEvent()]?.tracks.some((t) => t[0] === id) ? activeEvent() : null };
  history = [...history, id].slice(-80);
  try { localStorage.setItem('bgmHist', JSON.stringify(history)); } catch { /* bỏ qua */ }
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'Ngôi nhà nhỏ', album: 'Nhạc nền' });
      navigator.mediaSession.setActionHandler('nexttrack', () => skip());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
      navigator.mediaSession.setActionHandler('play', () => { if (!prefs.on) toggle(); else resume(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (prefs.on) toggle(); });
    } catch { /* trình duyệt cũ */ }
  }
  setAmbience(period);
  emit();
}
function setAmbience(period) {
  if (!ambEl) return;
  const p = PERIODS[period];
  const want = !prefs.amb ? null : prefs.ambPick !== 'auto' ? prefs.ambPick : p.amb;
  const vol = prefs.ambPick !== 'auto' ? 0.16 : p.ambVol;
  if (want !== ambName) {
    ramp(ambGain.gain, 0, 1.5);
    setTimeout(() => {
      if (want) { ambEl.src = base(`assets/sounds/${want}.m4a`); ambEl.play().catch(() => {}); ramp(ambGain.gain, vol, 3); } else ambEl.pause();
    }, want && ambName ? 1600 : 0);
    ambName = want;
  } else if (want) ramp(ambGain.gain, vol, 1);
}
function applyVolume(sec = 1.2) { if (master) ramp(master.gain, paused ? 0 : prefs.vol * prefs.vol * 1.15, sec); }

function next() { if (!prefs.on) return; const p = activePeriod(); if (current) backStack = [...backStack, [current.id, current.title]].slice(-30); playTrack(p, pickTrack(p)); }

function resume() {
  if (!prefs.on || blockedBy.size) return;
  ensureAudio();
  paused = false;
  if (!current || current.period !== activePeriod()) next();
  else { decks[current.deck].el.play().catch(() => {}); if (ambName) ambEl.play().catch(() => {}); }
  applyVolume(1.5);
  emit();
}
function pause() {
  paused = true; applyVolume(0.8);
  setTimeout(() => { if (paused) { decks.forEach((d) => d.el.pause()); ambEl?.pause(); } }, 900);
  emit();
}

// ---- API cho app ----
export function toggle() {
  prefs.on = !prefs.on; save();
  if (prefs.on) resume(); else pause();
}
export function setVolume(v) { prefs.vol = v; save(); applyVolume(0.3); }
export function setAmb(on) { prefs.amb = on; save(); if (current) setAmbience(current.period); emit(); }
export function setEvent(mode, pick) { if (mode) prefs.evMode = mode; if (pick) prefs.evPick = pick; save(); if (prefs.on && !paused) next(); else emit(); }
export function setPeriod(p) { prefs.period = p; prefs.styles = []; prefs.favOnly = false; save(); if (prefs.on && !paused) next(); else emit(); }
export function setStyles(list) { prefs.styles = list.filter((k) => STYLES[k]); prefs.favOnly = false; save(); if (prefs.on && !paused) next(); else emit(); }
export function setFavOnly(on) { prefs.favOnly = on; if (on) prefs.styles = []; save(); if (prefs.on && !paused) next(); else emit(); }
export function setAmbPick(k) { prefs.ambPick = k; prefs.amb = true; save(); if (current) setAmbience(current.period); emit(); }
export function previous() { const t = backStack.pop(); if (!t || !prefs.on) return false; if (paused) resume(); playTrack(activePeriod(), t); return true; }
export function playNow(id) { const t = TITLES.get(String(id)); if (!t) return; if (!prefs.on) { prefs.on = true; save(); } if (current) backStack.push([current.id, current.title]); ensureAudio(); paused = false; playTrack(activePeriod(), t); applyVolume(1); emit(); }
export function skip() { if (prefs.on) { if (paused) resume(); next(); } }
// Focus Room (hoặc nguồn âm khác) xin tạm dừng / cho phát lại.
export function block(reason) { blockedBy.add(reason); if (!paused) pause(); }
export function unblock(reason) { blockedBy.delete(reason); if (prefs.on && !blockedBy.size) resume(); }
export const state = () => ({ ...prefs, paused, current, period: activePeriod(), event: activeEvent(), blocked: blockedBy.size > 0 });

// Đổi buổi trong lúc nghe: hết bài hiện tại sẽ tự sang nhạc của buổi mới; âm thiên nhiên đổi ngay.
setInterval(() => { if (prefs.on && !paused && current && current.period !== activePeriod()) setAmbience(activePeriod()); }, 60_000);

// Trình duyệt chỉ cho phát âm thanh sau khi người dùng chạm/bấm → đã bật từ trước thì phát ở lần chạm đầu tiên.
const firstGesture = () => {
  window.removeEventListener('pointerdown', firstGesture, true); window.removeEventListener('keydown', firstGesture, true);
  if (prefs.on && paused) resume();
};
window.addEventListener('pointerdown', firstGesture, true); window.addEventListener('keydown', firstGesture, true);

// ---- giao diện: nút ở góc trên + bảng điều khiển nhỏ ----
const listeners = new Set();
function emit() { listeners.forEach((f) => f()); }
export function mountControl(container) {
  const wrap = h('div', { class: 'bgm' });
  const btn = h('button', { class: 'pill icon bgm-btn', 'aria-label': 'Bật/tắt nhạc nền', title: 'Nhạc nền' });
  const more = h('button', { class: 'pill icon bgm-more', 'aria-label': 'Tùy chọn nhạc nền', 'aria-expanded': 'false' }, '▾');
  const panel = h('div', { class: 'bgm-panel', hidden: true, role: 'dialog', 'aria-label': 'Nhạc nền' });
  btn.addEventListener('click', () => toggle());
  more.addEventListener('click', () => { panel.hidden = !panel.hidden; more.setAttribute('aria-expanded', String(!panel.hidden)); render(); });
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !wrap.contains(e.target)) { panel.hidden = true; more.setAttribute('aria-expanded', 'false'); } });
  wrap.append(btn, more, panel);
  container.prepend(wrap);

  function render() {
    const s = state();
    const playing = s.on && !s.paused;
    btn.classList.toggle('on', s.on);
    btn.classList.toggle('playing', playing);
    btn.textContent = s.on ? (playing ? '🎵' : '⏸') : '🔇';
    btn.title = s.on ? (s.blocked ? 'Nhạc nền tạm dừng trong Focus Room' : playing ? `Đang phát: ${s.current?.title ?? ''} — bấm để tắt` : 'Chạm vào trang để bắt đầu phát') : 'Bật nhạc nền';
    if (panel.hidden) return;
    const P = PERIODS[s.period];
    const openD = new Set([...panel.querySelectorAll('details[open]')].map((x) => x.dataset.k)); const top = panel.scrollTop;
    const cur = s.current && s.on ? s.current : null; const own = s.styles.length || s.favOnly;
    const stName = s.favOnly ? '❤️ Bài yêu thích' : s.styles.length ? s.styles.map((k) => `${STYLES[k].icon} ${STYLES[k].name}`).join(' + ') : `${P.name} · ${P.mood}`;
    const keep = (k, title, ...kids) => h('details', { class: 'small', dataset: { k }, open: openD.has(k) }, h('summary', {}, title), kids);
    mount(panel,
      h('div', { class: 'bgm-now' },
        h('span', { class: 'bgm-ic' }, s.favOnly ? '❤️' : s.styles.length === 1 ? STYLES[s.styles[0]].icon : P.icon),
        h('div', { class: 'grow' }, h('b', {}, cur ? cur.title : 'Nhạc nền đang tắt'),
          h('small', {}, cur?.ev ? `${EVENTS[cur.ev].icon} Nhạc ${EVENTS[cur.ev].name}` : stName)),
        cur ? h('button', { class: 'icon-btn bgm-heart', 'aria-pressed': String(isFav(cur.id)), 'aria-label': isFav(cur.id) ? 'Bỏ yêu thích' : 'Yêu thích bài này', onclick: () => toggleFav(cur.id) }, isFav(cur.id) ? '❤️' : '🤍') : null,
        cur ? h('button', { class: 'icon-btn', 'aria-label': 'Không phát bài này nữa', title: 'Không phát bài này nữa', onclick: () => { const { id, title } = cur; dislike(id); skip(); toast(`Sẽ không phát “${title}” nữa`, { onAction: () => undislike(id) }); } }, '🚫') : null),
      h('div', { class: 'bgm-row' },
        h('button', { class: 'chip', onclick: () => previous(), disabled: !s.on, 'aria-label': 'Bài trước' }, '⏮'),
        h('button', { class: 'chip on', onclick: () => toggle() }, s.on ? (playing ? '⏸ Tắt' : '▶ Phát') : '▶ Bật nhạc nền'),
        h('button', { class: 'chip', onclick: () => skip(), disabled: !s.on }, '⏭ Bài khác')),
      h('label', { class: 'bgm-vol' }, '🔈', h('input', { type: 'range', min: '0', max: '100', value: Math.round(s.vol * 100), 'aria-label': 'Âm lượng nhạc nền', oninput: (e) => setVolume(e.target.value / 100) }), '🔊'),
      h('b', { class: 'small' }, '🕰 Theo giờ trong ngày'),
      h('div', { class: 'bgm-periods', role: 'radiogroup', 'aria-label': 'Chọn buổi' },
        h('button', { class: `chip${!own && prefs.period === 'auto' ? ' on' : ''}`, role: 'radio', 'aria-checked': String(!own && prefs.period === 'auto'), onclick: () => setPeriod('auto') }, 'Tự động'),
        ORDER.map((k) => h('button', { class: `chip${!own && prefs.period === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(!own && prefs.period === k), onclick: () => setPeriod(k) }, `${PERIODS[k].icon} ${PERIODS[k].short}`))),
      h('b', { class: 'small' }, '🎚 Hoặc chọn thể loại (chọn nhiều để trộn)'),
      h('div', { class: 'bgm-periods bgm-styles', role: 'group', 'aria-label': 'Thể loại' },
        h('button', { class: `chip${s.favOnly ? ' on' : ''}`, 'aria-pressed': String(s.favOnly), disabled: !taste.fav.length, title: taste.fav.length ? '' : 'Bấm 🤍 ở bài bạn thích trước', onclick: () => setFavOnly(!s.favOnly) }, `❤️ Yêu thích ${taste.fav.length || ''}`),
        Object.entries(STYLES).map(([k, st]) => { const on = s.styles.includes(k); return h('button', { class: `chip${on ? ' on' : ''}`, 'aria-pressed': String(on), onclick: () => setStyles(on ? s.styles.filter((x) => x !== k) : [...s.styles, k]) }, `${st.icon} ${st.name}`); })),
      h('div', { class: 'bgm-ambrow' },
        h('label', { class: 'field-inline small' }, h('input', { type: 'checkbox', checked: s.amb, onchange: (e) => setAmb(e.target.checked) }), 'Âm thiên nhiên'),
        s.amb ? h('select', { class: 'input', 'aria-label': 'Loại âm thiên nhiên', onchange: (e) => setAmbPick(e.target.value) }, AMBS.map(([k, l]) => h('option', { value: k, selected: s.ambPick === k }, l))) : null),
      keep('list', `📃 Danh sách bài (${trackCount} bài)`, Object.entries(STYLES).map(([k, st]) => keep(`l-${k}`, `${st.icon} ${st.name} (${STYLE_TRACKS[k].length})`, h('ul', { class: 'bgm-list' }, STYLE_TRACKS[k].map(([id, t]) => h('li', {}, h('button', { class: cur && String(cur.id) === String(id) ? 'on' : '', onclick: () => playNow(id) }, `▶ ${t}`), isFav(id) ? h('span', {}, '❤️') : null))))),
        taste.no.length ? keep('l-no', `🚫 Không phát nữa (${taste.no.length})`, h('ul', { class: 'bgm-list' }, taste.no.map((k) => h('li', {}, h('span', { class: 'grow' }, TITLES.get(k)?.[1] ?? k), h('button', { onclick: () => undislike(k) }, '↩︎ Cho phát lại'))))) : null),
      h('div', { class: 'bgm-ev' },
        h('b', { class: 'small' }, `🎉 Nhạc sự kiện & mùa${eventNow() ? ` — đang là ${EVENTS[eventNow()].icon} ${EVENTS[eventNow()].name}` : ''}`),
        h('div', { class: 'bgm-periods', role: 'radiogroup', 'aria-label': 'Nhạc sự kiện' },
          [['mix', 'Trộn với nhạc theo giờ'], ['only', 'Chỉ nhạc sự kiện'], ['off', 'Tắt']].map(([k, l]) => h('button', { class: `chip${prefs.evMode === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(prefs.evMode === k), onclick: () => setEvent(k) }, l))),
        prefs.evMode === 'off' ? null : h('label', { class: 'field-inline small' }, 'Dịp:',
          h('select', { class: 'input', 'aria-label': 'Chọn dịp', onchange: (e) => setEvent(null, e.target.value) },
            h('option', { value: 'auto', selected: prefs.evPick === 'auto' }, `Tự động theo ngày${eventNow() ? ` (${EVENTS[eventNow()].name})` : ''}`),
            EVENT_ORDER.map((k) => h('option', { value: k, selected: prefs.evPick === k }, `${EVENTS[k].icon} ${EVENTS[k].name}`))))),
      keep('src', 'Nguồn nhạc',
        h('p', {}, 'Phần lớn nhạc: Mixkit (miễn phí, không cần ghi tên).'),
        h('p', {}, 'Đàn tranh & đàn nhị: Antti Luode — “Guzheng Morning”, “My name is Zheng Zheng GuZheng”, “Senor Guzheng and the Happy Monks”, “Dances With Erhu” — CC BY 3.0, Wikimedia Commons.'),
        h('p', {}, '“雨打芭蕉” (Mưa rơi trên lá chuối) — nhạc dân gian, phối: 丘鹤俦 — CC BY-SA 4.0, Wikimedia Commons (đã chuyển định dạng).'),
        h('p', {}, '“Cung Hỷ Cung Hỷ” (Trần Ca Tân, Diêu Lỵ hát, thập niên 1940) và “Auld Lang Syne” — public domain, Wikimedia Commons.'),
        h('p', {}, 'Cổ điển (Wikimedia Commons): Satie – Robin Alciatore; Chopin – Frank Lévy; Schumann, Grieg – Musopen; Mozart; Debussy “Clair de lune”; Bach – U.S. Air Force Band — public domain. Debussy “Arabesque” – Patrizia Prati và Vivaldi – John Harrison (violin) — CC BY-SA 4.0. “Do You Shakuhachi” – Antti Luode — CC BY 3.0. Các bản đã chuyển định dạng.')),
      h('p', { class: 'muted small' }, 'Tự tạm dừng khi vào Focus Room và khi thiền.'));
    panel.scrollTop = top;
  }
  listeners.add(render);
  render();
}
