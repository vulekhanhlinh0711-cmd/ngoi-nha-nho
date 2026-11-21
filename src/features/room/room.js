// P2.01–P2.07: Focus Room — màn hình toàn phần với cảnh nền, đồng hồ, nút gián đoạn,
// bộ trộn âm thanh, công thức âm thanh, nhạc YouTube/Spotify.
// Nằm ngoài <main> nên app vẽ lại các màn khác không làm tắt nhạc.
import { h, mount } from '../../ui/dom.js';
import { getSetting, setSetting } from '../../core/db.js';
import { bus } from '../../core/events.js';
import { fmtClock } from '../../core/time.js';
import { toast } from '../../ui/toast.js';
import { getPomo, interrupt, resume, stop, startWork, remainingMs, breakTips } from '../focus/pomodoro.js';
import { CHANNELS, getVolume, setVolume, applyMix, currentMix, stopAll, SOUND_CREDITS } from './soundscape.js';
import { youtubeEmbed, spotifyEmbed } from './music.js';
import { ytConfig, saveClientId, signedIn, signIn, signOut, myPlaylists, likedVideos, searchYt, linkOf } from './youtube.js';

export const SCENES = [
  { id: 'cafe', name: 'Quán cà phê', mix: { cafe: 0.35, chatter: 0.5, clinks: 0.5, grinder: 0.45, steam: 0.35 } },
  { id: 'rain-cafe', name: 'Quán cà phê mưa', mix: { rain: 0.6, cafe: 0.4, chatter: 0.3, clinks: 0.35 } },
  { id: 'beach', name: 'Bờ biển', mix: { waves: 0.7, ocean: 0.35, birds: 0.15 } },
  { id: 'fireplace', name: 'Lò sưởi', mix: { fire: 0.75, rain: 0.3 } },
  { id: 'forest', name: 'Rừng thông', mix: { birds: 0.6, stream: 0.4 } },
  { id: 'library', name: 'Thư viện đêm', mix: { library: 0.7, rain: 0.3 } },
];
const DEFAULT_RECIPES = SCENES.map((s) => ({ name: s.name, mix: s.mix, builtIn: true }));

let overlay = null;
let panel = null; // 'sound' | 'music' | null

async function prefs() {
  return { scene: 'cafe', recipes: [], youtube: '', spotify: '', ytSaved: [], ...((await getSetting('room')) ?? {}) };
}
async function savePrefs(patch) {
  await setSetting('room', { ...(await prefs()), ...patch });
}

export const isRoomOpen = () => !!overlay;

export function updateRoomClock() {
  const el = document.getElementById('room-time');
  if (el) el.textContent = fmtClock(remainingMs());
}

function sceneArt(id) {
  // Các lớp trang trí; hình dáng do CSS vẽ theo class .scene-<id>.
  const layers = { cafe: ['window', 'counter', 'lamp', 'steam'], 'rain-cafe': ['window', 'rain', 'lamp'], beach: ['sun', 'sea', 'sand'], fireplace: ['hearth', 'fire', 'glow'], forest: ['trees far', 'trees near', 'mist'], library: ['shelves', 'lamp', 'moon'] }[id] ?? [];
  return h('div', { class: `scene scene-${id}`, 'aria-hidden': 'true' }, layers.map((l) => h('div', { class: `layer ${l}` })));
}

function controls() {
  const p = getPomo();
  if (p.phase === 'work') {
    return [h('button', { class: 'room-btn', onclick: interrupt }, '⏸ Bị gián đoạn')];
  }
  if (p.phase === 'paused') {
    let timer;
    return [
      h('textarea', {
        class: 'room-note', rows: '2', placeholder: 'Đang dở đến đâu, bước tiếp theo là gì?', 'aria-label': 'Ghi chú lúc dừng',
        oninput: (e) => { clearTimeout(timer); const v = e.target.value; timer = setTimeout(() => import('../focus/pomodoro.js').then((m) => m.updatePause({ note: v })), 300); },
      }, p.note ?? ''),
      h('button', { class: 'room-btn', onclick: resume }, `▶ Tiếp tục (còn ${fmtClock(p.remainingMs)})`),
    ];
  }
  if (p.phase === 'break') {
    return [h('p', { class: 'room-tips' }, breakTips(p.tipSeed).join(' · ')), h('button', { class: 'room-btn ghost', onclick: stop }, 'Bỏ qua nghỉ')];
  }
  return [h('button', { class: 'room-btn', onclick: () => startWork(p.lastTaskId ?? null) }, '▶ Bắt đầu phiên tập trung')];
}

function soundPanel(state) {
  const recipes = [...DEFAULT_RECIPES, ...state.recipes];
  return h('div', { class: 'room-panel' },
    h('div', { class: 'room-panel-head' }, h('h3', {}, '🎚️ Âm thanh nền'),
      h('button', { class: 'room-close', 'aria-label': 'Đóng bảng âm thanh', onclick: () => { panel = null; draw(); } }, '✕')),
    [...new Set(CHANNELS.map((c) => c.group))].map((g) => [
      h('h4', {}, g),
      h('div', { class: 'mixer' }, CHANNELS.filter((c) => c.group === g).map((c) => h('label', { class: 'mix-row' },
        h('span', {}, `${c.icon} ${c.name}`),
        h('input', {
          type: 'range', min: '0', max: '100', value: Math.round(getVolume(c.id) * 100), 'aria-label': `Âm lượng ${c.name}`,
          oninput: (e) => setVolume(c.id, e.target.value / 100),
        }))))]),
    h('p', { class: 'room-small' }, 'Bản ghi âm thật; máy xay và máy pha espresso vang lên thỉnh thoảng như ở quán. Lần đầu bật mỗi âm cần vài giây để tải.'),
    h('details', { class: 'room-small' }, h('summary', {}, 'Nguồn âm thanh'), SOUND_CREDITS.map((c) => h('p', {}, c))),
    h('h4', {}, 'Công thức'),
    h('div', { class: 'recipe-list' }, recipes.map((r) => h('span', { class: 'recipe' },
      h('button', { class: 'room-chip', onclick: () => { applyMix(r.mix); draw(); } }, r.name),
      r.builtIn ? null : h('button', {
        class: 'room-chip x', 'aria-label': `Xóa công thức ${r.name}`,
        onclick: async () => { await savePrefs({ recipes: state.recipes.filter((x) => x !== r) }); draw(); },
      }, '✕')))),
    h('form', {
      class: 'room-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const name = e.target.elements.name.value.trim();
        const mix = currentMix();
        if (!name) return;
        if (!Object.values(mix).some((v) => v > 0)) { toast('Hãy bật ít nhất một âm thanh trước khi lưu'); return; }
        await savePrefs({ recipes: [...state.recipes.filter((r) => r.name !== name), { name, mix }] });
        toast(`Đã lưu công thức “${name}”`);
        draw();
      },
    },
      h('input', { name: 'name', class: 'room-input', placeholder: 'Tên công thức của bạn', maxlength: '40', 'aria-label': 'Tên công thức' }),
      h('button', { class: 'room-chip', type: 'submit' }, 'Lưu')),
    h('button', { class: 'room-chip', onclick: () => { stopAll(); draw(); } }, '🔇 Tắt hết'));
}

// ---- Nhạc: phần trình phát (giữ nguyên khi duyệt danh sách) + phần chọn nhạc (vẽ lại thoải mái) ----
let ytTab = 'playlists';
let ytItems = null; // kết quả đang hiện
let ytBusy = false;
let ytQuery = '';

async function play(link, title) {
  const s = await prefs();
  const saved = [{ link, title: title ?? link }, ...s.ytSaved.filter((x) => x.link !== link)].slice(0, 12);
  await savePrefs({ youtube: link, ytSaved: saved });
  draw();
}

async function loadTab(tab) {
  ytTab = tab;
  if (tab === 'search' && !ytQuery) { ytItems = null; drawBrowser(); return; }
  ytBusy = true; drawBrowser();
  try {
    ytItems = tab === 'playlists' ? await myPlaylists() : tab === 'liked' ? await likedVideos() : await searchYt(ytQuery);
  } catch (err) { ytItems = null; toast(err.message, { duration: 7000 }); }
  ytBusy = false; drawBrowser();
}

function ytGrid() {
  if (ytBusy) return h('p', { class: 'room-small' }, 'Đang tải…');
  if (!ytItems) return null;
  if (!ytItems.length) return h('p', { class: 'room-small' }, ytTab === 'playlists' ? 'Tài khoản chưa có playlist nào.' : 'Không có kết quả.');
  return h('ul', { class: 'yt-grid' }, ytItems.map((it) => h('li', {},
    h('button', { class: 'yt-item', title: it.title, onclick: () => play(linkOf(it), it.title) },
      it.thumb ? h('img', { src: it.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'yt-noimg' }, '🎵'),
      h('span', { class: 'yt-title' }, it.live ? '🔴 ' : '', it.kind === 'playlist' ? '📃 ' : '', it.title),
      it.count != null ? h('span', { class: 'room-small' }, `${it.count} video`) : it.by ? h('span', { class: 'room-small' }, it.by) : null))));
}

async function drawBrowser() {
  const box = overlay?.querySelector('.music-browser');
  if (!box) return;
  const state = await prefs();
  const cfg = await ytConfig();
  const linkForm = (key, placeholder) => h('form', {
    class: 'room-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const v = e.target.elements.link.value.trim();
      const ok = !v || (key === 'youtube' ? youtubeEmbed(v) : spotifyEmbed(v));
      if (!ok) { toast('Link chưa đúng. Hãy dán link playlist hoặc bài hát.'); return; }
      if (key === 'youtube' && v) await play(v); else { await savePrefs({ [key]: v }); draw(); }
      drawBrowser();
    },
  },
    h('input', { name: 'link', class: 'room-input', value: state[key], placeholder, 'aria-label': placeholder }),
    h('button', { class: 'room-chip', type: 'submit' }, 'Mở'));

  let account;
  if (!cfg.clientId) {
    account = h('details', { class: 'yt-setup' },
      h('summary', {}, '🔑 Đăng nhập YouTube để chọn playlist của bạn (cài 1 lần)'),
      h('ol', { class: 'room-small' },
        h('li', {}, 'Vào console.cloud.google.com → tạo project → bật “YouTube Data API v3”.'),
        h('li', {}, 'Mục “Google Auth Platform”: điền tên app, chọn đối tượng External, thêm email của bạn vào Test users.'),
        h('li', {}, 'Tạo OAuth client loại “Web application”, ở “Authorized JavaScript origins” thêm: ', h('code', {}, location.origin)),
        h('li', {}, 'Dán Client ID (dạng …apps.googleusercontent.com) vào ô dưới.')),
      h('form', {
        class: 'room-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const v = e.target.elements.cid.value.trim();
          if (!/\.apps\.googleusercontent\.com$/.test(v)) { toast('Client ID phải kết thúc bằng .apps.googleusercontent.com'); return; }
          await saveClientId(v);
          toast('Đã lưu Client ID. Bấm Đăng nhập Google.');
          drawBrowser();
        },
      }, h('input', { name: 'cid', class: 'room-input', placeholder: 'Client ID', 'aria-label': 'Google OAuth Client ID' }), h('button', { class: 'room-chip', type: 'submit' }, 'Lưu')),
      h('p', { class: 'room-small' }, 'App chỉ xin quyền xem (không đăng, không xóa gì). Client ID lưu trên máy này; mã đăng nhập chỉ giữ trong lúc mở app.'));
  } else if (!signedIn()) {
    account = h('div', { class: 'presets' },
      h('button', {
        class: 'room-chip on', onclick: async () => {
          try { await signIn(); toast('Đã đăng nhập YouTube'); await loadTab('playlists'); } catch (err) { toast(err.message, { duration: 7000 }); }
        },
      }, '▶️ Đăng nhập Google / YouTube'),
      h('button', { class: 'room-chip', onclick: async () => { await saveClientId(''); drawBrowser(); } }, 'Đổi Client ID'));
  } else {
    account = [
      h('div', { class: 'presets', role: 'tablist' },
        [['playlists', '📃 Playlist của tôi'], ['liked', '👍 Đã thích'], ['search', '🔍 Tìm']].map(([k, label]) => h('button', {
          class: `room-chip${ytTab === k ? ' on' : ''}`, role: 'tab', 'aria-selected': String(ytTab === k), onclick: () => loadTab(k),
        }, label)),
        h('button', { class: 'room-chip', onclick: () => { signOut(); ytItems = null; drawBrowser(); } }, 'Đăng xuất')),
      ytTab === 'search' ? h('form', {
        class: 'room-form', onsubmit: (e) => { e.preventDefault(); ytQuery = e.target.elements.q.value.trim(); if (ytQuery) loadTab('search'); },
      }, h('input', { name: 'q', class: 'room-input', value: ytQuery, placeholder: 'VD: lofi cafe jazz, piano mưa…', 'aria-label': 'Tìm trên YouTube' }),
        h('button', { class: 'room-chip', type: 'submit' }, 'Tìm')) : null,
      ytGrid(),
    ];
  }

  mount(box,
    h('div', { class: 'room-panel-head' }, h('h3', {}, '🎵 Nhạc'),
      h('button', { class: 'room-close', 'aria-label': 'Đóng bảng nhạc', onclick: () => { panel = null; draw(); } }, '✕')),
    h('h4', {}, 'YouTube'),
    account,
    state.ytSaved.length ? [h('h4', {}, 'Đã nghe gần đây'), h('div', { class: 'presets' }, state.ytSaved.map((x) => h('span', { class: 'recipe' },
      h('button', { class: `room-chip${x.link === state.youtube ? ' on' : ''}`, title: x.link, onclick: () => play(x.link, x.title) }, x.title.length > 34 ? `${x.title.slice(0, 32)}…` : x.title),
      h('button', { class: 'room-chip x', 'aria-label': `Bỏ ${x.title}`, onclick: async () => { await savePrefs({ ytSaved: state.ytSaved.filter((y) => y !== x) }); drawBrowser(); } }, '✕'))))] : null,
    h('details', {}, h('summary', { class: 'room-small' }, 'Hoặc dán link'), linkForm('youtube', 'Dán link video hoặc playlist YouTube')),
    h('h4', {}, 'Spotify'),
    linkForm('spotify', 'Dán link playlist/album/bài hát Spotify'),
    h('p', { class: 'room-small' }, 'Spotify: tài khoản miễn phí chỉ nghe thử 30 giây trong khung nhúng; nghe đầy đủ cần đăng nhập Spotify Premium trên trình duyệt.'));
}

function player(state) {
  // Đã đăng nhập: dùng youtube.com (trình phát nhận tài khoản/Premium của bạn); chưa thì dùng bản không cookie.
  let yt = state.youtube ? youtubeEmbed(state.youtube) : null;
  if (yt && signedIn()) yt = yt.replace('www.youtube-nocookie.com', 'www.youtube.com');
  if (yt) yt += `${yt.includes('?') ? '&' : '?'}autoplay=1`;
  const sp = state.spotify ? spotifyEmbed(state.spotify) : null;
  return [
    yt ? h('iframe', {
      class: 'embed yt', src: yt, title: 'YouTube', loading: 'lazy',
      allow: 'autoplay; encrypted-media; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin', allowfullscreen: true,
    }) : null,
    sp ? h('iframe', { class: 'embed sp', src: sp, title: 'Spotify', loading: 'lazy', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' }) : null,
  ];
}

async function draw() {
  if (!overlay) return;
  const state = await prefs();
  const p = getPomo();
  const content = overlay.querySelector('.room-content');
  mount(content, 
    sceneArt(state.scene),
    h('div', { class: 'room-top' },
      h('div', { class: 'room-scenes', role: 'radiogroup', 'aria-label': 'Chọn cảnh' }, SCENES.map((s) => h('button', {
        class: `room-chip${s.id === state.scene ? ' on' : ''}`, role: 'radio', 'aria-checked': String(s.id === state.scene),
        onclick: async () => {
          await savePrefs({ scene: s.id });
          if (!Object.values(currentMix()).some((v) => v > 0)) applyMix(s.mix);
          draw();
        },
      }, s.name))),
      h('div', { class: 'room-tools' },
        h('button', { class: `room-chip${panel === 'sound' ? ' on' : ''}`, onclick: () => { panel = panel === 'sound' ? null : 'sound'; draw(); } }, '🎚️ Âm thanh'),
        h('button', { class: `room-chip${panel === 'music' ? ' on' : ''}`, onclick: () => { panel = panel === 'music' ? null : 'music'; draw(); } }, '🎵 Nhạc'),
        h('button', { class: 'room-chip', 'aria-label': 'Thoát Focus Room', onclick: closeRoom }, '✕ Thoát'))),
    h('div', { class: 'room-center' },
      h('p', { class: 'room-task' }, p.phase === 'break' ? '☕ Giờ nghỉ' : p.taskTitle ?? p.lastTaskTitle ?? 'Tập trung'),
      h('div', { id: 'room-time', class: 'room-clock', role: 'timer' }, fmtClock(remainingMs())),
      h('div', { class: 'room-controls' }, controls())),
    panel === 'sound' ? soundPanel(state) : null,
  );
  // Khung nhạc nằm ở chỗ riêng, không bị vẽ lại (di chuyển iframe sẽ làm nhạc phát lại từ đầu).
  const slot = overlay.querySelector('.room-music');
  const playerBox = slot.querySelector('.music-player');
  const sig = `${state.youtube}|${state.spotify}|${signedIn()}`;
  if (playerBox.dataset.sig !== sig) {
    mount(playerBox, player(state));
    playerBox.dataset.sig = sig;
  }
  const wasHidden = slot.hidden;
  slot.hidden = panel !== 'music';
  if (wasHidden && !slot.hidden) drawBrowser();
}

function onKey(e) {
  if (e.key === 'Escape' && !document.fullscreenElement) closeRoom();
}

export async function openRoom() {
  if (overlay) return;
  (await import('../bgm/bgm.js')).block('room'); // nhạc nền tạm dừng — Focus Room có âm thanh riêng
  overlay = h('div', { class: 'room', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Focus Room' },
    h('div', { class: 'room-content' }),
    h('div', { class: 'room-music', hidden: true }, h('div', { class: 'music-browser room-panel' }), h('div', { class: 'music-player' })));
  document.body.append(overlay);
  document.body.classList.add('room-open');
  const state = await prefs();
  if (!Object.values(currentMix()).some((v) => v > 0)) {
    applyMix(SCENES.find((s) => s.id === state.scene)?.mix ?? {});
  }
  await draw();
  overlay.requestFullscreen?.().catch(() => { /* không hỗ trợ: vẫn phủ kín cửa sổ */ });
  document.addEventListener('keydown', onKey);
  bus.addEventListener('change', redrawControls);
}

// Pha Pomodoro đổi thì chỉ vẽ lại phần giữa, không động tới nhạc đang phát.
async function redrawControls() {
  if (!overlay) return;
  if (overlay.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName)) return;
  const center = overlay.querySelector('.room-center');
  if (!center) return;
  const p = getPomo();
  mount(center, 
    h('p', { class: 'room-task' }, p.phase === 'break' ? '☕ Giờ nghỉ' : p.taskTitle ?? p.lastTaskTitle ?? 'Tập trung'),
    h('div', { id: 'room-time', class: 'room-clock', role: 'timer' }, fmtClock(remainingMs())),
    h('div', { class: 'room-controls' }, controls()));
}

export function closeRoom() {
  if (!overlay) return;
  import('../bgm/bgm.js').then((m) => m.unblock('room'));
  bus.removeEventListener('change', redrawControls);
  document.removeEventListener('keydown', onKey);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  overlay.remove();
  overlay = null;
  panel = null;
  document.body.classList.remove('room-open');
  stopAll();
}
