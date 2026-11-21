// P37: lời chào "Hi Khloe!" khi mở app (và khi quay lại app sau một lúc lâu).
// Giọng đọc tạo sẵn thành file (assets/voice) nên máy nào cũng nghe giống nhau, không cần mạng sau lần đầu.
// Trình duyệt chặn phát âm thanh trước khi người dùng chạm → nếu bị chặn thì chào ở lần chạm đầu tiên.
const KEY = 'greet';
export const VOICES = [['samantha', 'Samantha'], ['flo', 'Flo'], ['shelley', 'Shelley'], ['karen', 'Karen (Úc)']];
const DEF = { on: true, voice: 'samantha', chime: true };
let prefs = { ...DEF };
try { prefs = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { /* dùng mặc định */ }
export const greetPrefs = () => ({ ...prefs });
export function setGreet(p) {
  prefs = { ...prefs, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* chỉ áp dụng phiên này */ }
}

const url = (v) => new URL(`assets/voice/hi-${v}.m4a`, document.baseURI).href;

// Tải sẵn file giọng (dạng byte) để lúc chạm là phát ngay.
const bytes = new Map();
const load = (v) => {
  if (!bytes.has(v)) {
    const p = fetch(url(v)).then((r) => { if (!r.ok) throw new Error('voice'); return r.arrayBuffer(); });
    p.catch(() => bytes.delete(v)); bytes.set(v, p);
  }
  return bytes.get(v);
};

// Phát lời chào bằng Web Audio: chuông "ting-ting" nhỏ (tổng hợp) rồi giọng nói, cùng một lần phát
// (Safari trên iPhone chỉ cho phát trong lúc chạm, nên không được tách ra hẹn giờ).
// force = bấm "Nghe thử". Trả về true nếu phát được.
export async function greet(force = false) {
  if (!prefs.on && !force) return true;
  let ctx;
  try {
    ctx = new AudioContext();
    if (ctx.state !== 'running') { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 150))]); }
    if (ctx.state !== 'running') throw new Error('blocked');
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    let t = ctx.currentTime + 0.03;
    if (prefs.chime) {
      [[1318.5, 0], [1760, 0.13]].forEach(([f, d]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.2, t + d + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
        o.connect(g).connect(out); o.start(t + d); o.stop(t + d + 1);
      });
      t += 0.4;
    }
    const buf = await ctx.decodeAudioData((await load(prefs.voice)).slice(0));
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(out);
    src.start(Math.max(t, ctx.currentTime + 0.01));
    src.onended = () => ctx.close();
    return true;
  } catch { ctx?.close().catch(() => {}); return false; }
}

// ---- tự chào khi mở app ----
const opened = Date.now();
let greeted = false;
function onGesture() {
  window.removeEventListener('pointerdown', onGesture, true); window.removeEventListener('keydown', onGesture, true);
  // Chỉ chào nếu chạm trong 2 phút đầu — chạm muộn hơn thì không còn là "vừa mở app".
  if (!greeted && Date.now() - opened < 120_000) { greeted = true; greet(); }
}
export function startGreeting() {
  if (!prefs.on) return;
  load(prefs.voice).catch(() => {});
  // Thử chào ngay (app đã cài trên máy thường được phép); không được thì đợi lần chạm đầu.
  setTimeout(async () => {
    if (greeted) return;
    if (await greet()) { greeted = true; return; }
    window.addEventListener('pointerdown', onGesture, true); window.addEventListener('keydown', onGesture, true);
  }, 700);
  // Quay lại app sau ≥ 30 phút (điện thoại thường chỉ "ngủ" app chứ không đóng hẳn) → chào lại.
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 30 * 60_000) greet();
  });
}

// Thẻ trong Cài đặt.
export function greetCard(h) {
  const p = greetPrefs();
  const chips = () => document.querySelectorAll('.greet-voice .chip').forEach((b) => {
    const on = b.dataset.v === greetPrefs().voice; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
  });
  return h('section', { class: 'card' },
    h('h3', {}, '👋 Lời chào khi mở app'),
    h('label', { class: 'field-inline' },
      h('input', { type: 'checkbox', checked: p.on, onchange: (e) => setGreet({ on: e.target.checked }) }),
      'Chào “Hi Khloe!” mỗi khi mở app'),
    h('label', { class: 'field-inline' },
      h('input', { type: 'checkbox', checked: p.chime, onchange: (e) => setGreet({ chime: e.target.checked }) }),
      'Kèm tiếng chuông “ting-ting” nhỏ'),
    h('div', { class: 'presets greet-voice', role: 'radiogroup', 'aria-label': 'Giọng chào' },
      VOICES.map(([v, label]) => h('button', {
        class: `chip${p.voice === v ? ' on' : ''}`, role: 'radio', 'aria-checked': String(p.voice === v), dataset: { v },
        onclick: () => { setGreet({ voice: v }); chips(); greet(true); },
      }, label))),
    h('button', { class: 'chip', onclick: () => greet(true) }, '▶ Nghe thử'),
    h('p', { class: 'muted small' }, 'Trình duyệt chỉ cho phát âm thanh sau khi bạn chạm màn hình, nên đôi khi lời chào vang lên ở lần chạm đầu tiên. Quay lại app sau hơn 30 phút cũng được chào lại.'));
}
