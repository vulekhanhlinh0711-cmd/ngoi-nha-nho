// P30: âm thanh nền bằng BẢN GHI ÂM THẬT (thay cho âm tổng hợp).
// Nguồn: Mixkit (Sound Effects Free License, không cần ghi tên) và Wikimedia Commons (CC0 / public domain / CC BY 3.0).
// Ghi công đầy đủ: assets/sounds/CREDITS.txt và SOUND_CREDITS bên dưới.
// · Âm nền: vòng lặp liền mạch (đã chồng đầu–cuối 3 giây khi chuẩn bị file), bắt đầu ở vị trí ngẫu nhiên.
// · Âm thỉnh thoảng (ly chén, máy xay, máy espresso): phát rải rác, vị trí trái–phải ngẫu nhiên, tốc độ lệch nhẹ để không lặp đều.
// · File chỉ tải khi bật kênh lần đầu; service worker lưu lại để nghe được khi mất mạng.
let ctx;
let master;
const live = new Map(); // id → { gain, stop() }
const volumes = {};
const buffers = new Map(); // tên file → Promise<AudioBuffer>

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    // Nén nhẹ để nhiều kênh cùng bật không bị vỡ tiếng.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const url = (name) => new URL(`assets/sounds/${name}.m4a`, document.baseURI).href;
function load(name) {
  if (!buffers.has(name)) {
    const p = fetch(url(name)).then((r) => { if (!r.ok) throw new Error(`Không tải được âm thanh ${name}`); return r.arrayBuffer(); })
      .then((ab) => audio().decodeAudioData(ab));
    p.catch(() => buffers.delete(name));
    buffers.set(name, p);
  }
  return buffers.get(name);
}

// Bỏ khoảng lặng do bộ mã hóa AAC chèn ở đầu/cuối để vòng lặp không bị hụt nhịp.
function trimPoints(buf) {
  const d = buf.getChannelData(0);
  const lim = Math.min(d.length, Math.floor(buf.sampleRate * 0.2));
  let a = 0; while (a < lim && Math.abs(d[a]) < 1e-4) a++;
  let b = d.length - 1; const lim2 = d.length - lim; while (b > lim2 && Math.abs(d[b]) < 1e-4) b--;
  return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
}

// ---- kiểu kênh ----
function loopChannel(file) {
  return (out) => {
    let src = null; let stopped = false;
    load(file).then((buf) => {
      if (stopped) return;
      const [s, e] = trimPoints(buf);
      src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true; src.loopStart = s; src.loopEnd = e;
      src.connect(out);
      src.start(0, s + Math.random() * (e - s) * 0.9);
    }).catch(() => {});
    return () => { stopped = true; try { src?.stop(); } catch { /* đã dừng */ } };
  };
}

// Phát rải rác một trong các file; seg = [min,max] giây để phát một đoạn của file dài (có tăng/giảm dần).
function sprinkleChannel(files, minMs, maxMs, { seg = null, firstMs = null, rate = 0.06 } = {}) {
  return (out) => {
    let timer; let stopped = false;
    const playOne = async () => {
      const buf = await load(files[Math.floor(Math.random() * files.length)]).catch(() => null);
      if (!buf || stopped) return;
      const t = ctx.currentTime + 0.02;
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * rate;
      const g = ctx.createGain(); const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.4 - 0.7;
      src.connect(g).connect(pan).connect(out);
      if (seg) {
        const len = Math.min(buf.duration, seg[0] + Math.random() * (seg[1] - seg[0]));
        const off = Math.random() * Math.max(0, buf.duration - len);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.4);
        g.gain.setValueAtTime(1, t + len - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        src.start(t, off, len);
      } else {
        g.gain.value = 0.55 + Math.random() * 0.45;
        src.start(t);
      }
    };
    const loop = () => { playOne(); timer = setTimeout(loop, minMs + Math.random() * (maxMs - minMs)); };
    timer = setTimeout(loop, firstMs ?? Math.random() * Math.min(maxMs, 4000));
    files.forEach((f) => load(f).catch(() => {})); // tải trước
    return () => { stopped = true; clearTimeout(timer); };
  };
}

const CLINKS = ['clink1', 'clink2', 'clink3', 'clink4', 'clink5', 'clink6', 'clink7'];
const BUILD = {
  rain: loopChannel('rain'),
  thunder: loopChannel('thunder'),
  waves: loopChannel('waves'),
  ocean: loopChannel('ocean'),
  stream: loopChannel('stream'),
  birds: loopChannel('birds'),
  night: loopChannel('night'),
  fire: loopChannel('fire'),
  library: loopChannel('library'),
  cafe: loopChannel('cafe'),
  chatter: loopChannel('chatter'),
  clinks: sprinkleChannel(CLINKS, 1800, 7000),
  grinder: sprinkleChannel(['grinder'], 30000, 70000, { seg: [5, 9], firstMs: 3000, rate: 0.03 }),
  steam: sprinkleChannel(['steam'], 40000, 90000, { seg: [5, 8], firstMs: 12000, rate: 0.02 }),
};

export const CHANNELS = [
  { id: 'rain', name: 'Mưa', icon: '🌧️', group: 'Thiên nhiên' },
  { id: 'thunder', name: 'Giông bão', icon: '⛈️', group: 'Thiên nhiên' },
  { id: 'waves', name: 'Sóng biển', icon: '🌊', group: 'Thiên nhiên' },
  { id: 'ocean', name: 'Sóng vỗ bờ', icon: '🐋', group: 'Thiên nhiên' },
  { id: 'stream', name: 'Suối chảy', icon: '💧', group: 'Thiên nhiên' },
  { id: 'birds', name: 'Chim rừng', icon: '🐦', group: 'Thiên nhiên' },
  { id: 'night', name: 'Rừng đêm, côn trùng', icon: '🦗', group: 'Thiên nhiên' },
  { id: 'fire', name: 'Lửa trại', icon: '🔥', group: 'Thiên nhiên' },
  { id: 'cafe', name: 'Không khí quán', icon: '☕', group: 'Quán cà phê' },
  { id: 'chatter', name: 'Người trò chuyện', icon: '🗣️', group: 'Quán cà phê' },
  { id: 'clinks', name: 'Ly chén, muỗng', icon: '🥄', group: 'Quán cà phê' },
  { id: 'grinder', name: 'Máy xay cà phê', icon: '⚙️', group: 'Quán cà phê' },
  { id: 'steam', name: 'Máy pha espresso', icon: '♨️', group: 'Quán cà phê' },
  { id: 'library', name: 'Thư viện yên tĩnh', icon: '📚', group: 'Không gian' },
];

export const SOUND_CREDITS = [
  'Mưa, giông, sóng, suối, chim, rừng đêm, lửa trại, người trò chuyện, ly chén: Mixkit (mixkit.co) — Sound Effects Free License.',
  'Không khí quán cà phê: “Cafe ambiance” — Marble Toast, CC0, Wikimedia Commons.',
  'Máy xay cà phê: “Coffee grinder” — smijen, public domain, Wikimedia Commons.',
  'Máy pha espresso: “Espresso machine” — hugh, public domain, Wikimedia Commons.',
  'Thư viện: “TU Delft Library, quiet study room – general ambience” — el_mar, CC BY 3.0 (creativecommons.org/licenses/by/3.0), Wikimedia Commons; đã cắt đoạn và nối vòng lặp.',
];

export const getVolume = (id) => volumes[id] ?? 0;
export const currentMix = () => Object.fromEntries(CHANNELS.map((c) => [c.id, getVolume(c.id)]));
export const isPlaying = () => live.size > 0;

// v: 0–1. Đường cong bình phương để thanh trượt nghe tự nhiên hơn.
export function setVolume(id, v) {
  if (!BUILD[id]) return;
  volumes[id] = v;
  if (v <= 0) {
    const ch = live.get(id);
    if (ch) {
      ch.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => { ch.stop(); ch.gain.disconnect(); }, 900);
      live.delete(id);
    }
    return;
  }
  audio();
  let ch = live.get(id);
  if (!ch) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    ch = { gain, stop: BUILD[id](gain) };
    live.set(id, ch);
  }
  ch.gain.gain.setTargetAtTime(v * v, ctx.currentTime, 0.4);
}

export function applyMix(mix) {
  for (const c of CHANNELS) setVolume(c.id, mix[c.id] ?? 0);
}

export const stopAll = () => applyMix({});
