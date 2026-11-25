// P46: Góc tĩnh tâm — thiền (hẹn giờ + hướng dẫn hơi thở + chuông + âm thanh thiên nhiên),
// thực hành chánh niệm từng bước, nhật ký biết ơn, manifest (câu khẳng định, 3-6-9, scripting).
// Dữ liệu: cài đặt 'mind' (đồng bộ giữa các máy) + sự kiện 'meditation_done' / 'mindful_done' để thống kê & thưởng xu.
import { h, mount } from '../../ui/dom.js';
import { relaxCard } from '../habits/relax.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange, queryEvents } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays } from '../../core/dates.js';

const DEF = { gratitude: {}, affirmations: null, intention: '', i369: {}, scripts: [] };
export async function mindData() { return { ...DEF, ...((await getSetting('mind')) ?? {}) }; }
const saveMind = async (m) => { await setSetting('mind', m); notifyChange(); };

export const DEFAULT_AFFIRMATIONS = [
  'Mình xứng đáng với tình yêu, sự bình an và những điều tốt đẹp.',
  'Mỗi ngày mình đều tiến bộ hơn một chút.',
  'Mình bình tĩnh, tự tin và làm chủ cuộc sống của mình.',
  'Tiền bạc đến với mình dễ dàng và mình dùng nó khôn ngoan.',
  'Cơ thể mình khỏe mạnh, tràn đầy năng lượng.',
  'Mình đủ giỏi để đạt band IELTS mình mong muốn.',
  'Mình biết ơn những gì đang có và mở lòng đón nhận nhiều hơn.',
];

// ---------- Thiền ----------
export const PATTERNS = {
  calm: { name: 'Thư giãn 4–6', hint: 'Hít 4 giây, thở ra 6 giây — thở ra dài giúp hạ nhịp tim.', phases: [['Hít vào', 4, 1], ['Thở ra', 6, 0]] },
  box: { name: 'Thở hộp 4–4–4–4', hint: 'Hít 4, giữ 4, thở 4, giữ 4 — giúp tập trung, bình tĩnh trước việc khó.', phases: [['Hít vào', 4, 1], ['Giữ', 4, 1], ['Thở ra', 4, 0], ['Giữ', 4, 0]] },
  478: { name: '4–7–8 (dễ ngủ)', hint: 'Hít 4, giữ 7, thở ra 8 — hợp trước khi ngủ.', phases: [['Hít vào', 4, 1], ['Giữ', 7, 1], ['Thở ra', 8, 0]] },
  free: { name: 'Thiền tự do', hint: 'Chỉ hẹn giờ & chuông. Để ý hơi thở tự nhiên; tâm đi lang thang thì nhẹ nhàng quay về.', phases: null },
};
const AMBIENCE = [['', '🔇 Yên lặng'], ['rain', '🌧️ Mưa'], ['stream', '💧 Suối'], ['waves', '🌊 Sóng'], ['birds', '🐦 Chim rừng'], ['night', '🦗 Đêm'], ['fire', '🔥 Lửa trại']];
let medPrefs = { minutes: 5, pattern: 'calm', amb: 'rain' };
try { medPrefs = { ...medPrefs, ...JSON.parse(localStorage.getItem('meditate') ?? '{}') }; } catch { /* mặc định */ }
const saveMed = () => { try { localStorage.setItem('meditate', JSON.stringify(medPrefs)); } catch { /* bỏ qua */ } };

// Chuông xoay (singing bowl) tổng hợp: vài họa âm lệch nhau, ngân dài.
function bowl(ctx, when = 0, gain = 0.35) {
  const t = ctx.currentTime + when;
  [[220, 1], [528.7, 0.55], [880.4, 0.3], [1290, 0.16], [1810, 0.08]].forEach(([f, a], i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 2.2 + i * 0.7; lg.gain.value = f * 0.0025;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * a, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 7 - i);
    o.connect(g).connect(ctx.destination); o.start(t); lfo.start(t); o.stop(t + 7.2); lfo.stop(t + 7.2);
  });
}

let session = null;
export async function startMeditation() {
  if (session) return;
  const { minutes, pattern, amb } = medPrefs;
  const ctx = new AudioContext();
  const sound = await import('../room/soundscape.js');
  const bgm = await import('../bgm/bgm.js');
  bgm.block('meditate');
  if (amb) sound.applyMix({ [amb]: 0.55 });
  bowl(ctx);
  let lock = null; try { lock = await navigator.wakeLock?.request('screen'); } catch { /* không giữ được màn hình */ }
  const start = Date.now(); const total = minutes * 60_000;
  const circle = h('div', { class: 'breath-circle' }, h('span', { class: 'breath-label' }, 'Bắt đầu'));
  const timeEl = h('div', { class: 'med-time' });
  const hint = h('p', { class: 'med-hint' }, PATTERNS[pattern].hint);
  const dlg = h('dialog', { class: 'meditate', 'aria-label': 'Đang thiền' },
    h('button', { class: 'lb-close', 'aria-label': 'Kết thúc', onclick: () => finish(false) }, '✕'),
    h('div', { class: 'med-body' }, circle, timeEl, hint,
      h('button', { class: 'chip', onclick: () => finish(false) }, 'Kết thúc sớm')));
  document.body.append(dlg); dlg.showModal();
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
  const phases = PATTERNS[pattern].phases;
  let pi = -1; let phaseEnd = 0;
  const label = circle.querySelector('.breath-label');
  const tick = () => {
    const now = Date.now(); const left = Math.max(0, total - (now - start));
    timeEl.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
    if (phases && now >= phaseEnd) {
      pi = (pi + 1) % phases.length;
      const [name, sec, big] = phases[pi];
      phaseEnd = now + sec * 1000;
      label.textContent = name;
      circle.style.transitionDuration = `${sec}s`;
      circle.classList.toggle('big', !!big);
    } else if (!phases && pi < 0) { pi = 0; label.textContent = 'Thở tự nhiên'; circle.classList.add('big', 'slow'); }
    if (left <= 0) finish(true);
  };
  const timer = setInterval(tick, 250); tick();
  async function finish(done) {
    if (!session) return;
    clearInterval(timer); session = null;
    const mins = Math.round((Date.now() - start) / 60000);
    if (done) bowl(ctx, 0, 0.4);
    sound.stopAll(); bgm.unblock('meditate');
    try { await lock?.release(); } catch { /* đã nhả */ }
    setTimeout(() => ctx.close(), 8000);
    dlg.close(); dlg.remove();
    if (mins >= 1) {
      await logEvent('meditation_done', { minutes: mins, pattern, day: todayKey() });
      toast(done ? `🧘 Xong ${mins} phút thiền. Cảm ơn bạn đã dành thời gian cho chính mình.` : `🧘 Đã ghi ${mins} phút thiền.`);
    } else toast('Buổi thiền ngắn quá nên chưa ghi lại. Lần sau thử ít nhất 1 phút nhé.');
    notifyChange();
  }
  session = { finish };
}

// ---------- Chánh niệm: bài tập từng bước ----------
export const PRACTICES = [
  { id: 'stop', icon: '⏸️', name: 'Dừng lại 1 phút (STOP)', steps: ['S — Stop: dừng việc đang làm.', 'T — Take a breath: hít một hơi thật sâu, thở ra chậm.', 'O — Observe: cơ thể đang cảm thấy gì? Tâm trạng ra sao?', 'P — Proceed: tiếp tục, nhẹ nhàng và tỉnh táo hơn.'] },
  { id: '54321', icon: '🖐️', name: 'Neo giác quan 5-4-3-2-1', steps: ['Nhìn quanh: gọi tên 5 thứ bạn THẤY.', '4 thứ bạn có thể CHẠM (áo, mặt bàn, tóc…).', '3 âm thanh bạn NGHE thấy.', '2 mùi bạn NGỬI được (hoặc mùi bạn thích).', '1 vị bạn NẾM được — rồi hít thở sâu 3 lần.'] },
  { id: 'body', icon: '🫧', name: 'Quét cơ thể (5 phút)', steps: ['Ngồi hoặc nằm thoải mái, nhắm mắt, thở chậm.', 'Để ý bàn chân, cổ chân — thả lỏng.', 'Bắp chân, đầu gối, đùi — thả lỏng.', 'Bụng, lưng, ngực — để hơi thở tự nhiên.', 'Vai, cánh tay, bàn tay — buông nặng xuống.', 'Cổ, hàm, trán, mắt — thả lỏng hết.', 'Cảm nhận toàn bộ cơ thể đang thở. Mở mắt khi sẵn sàng.'] },
  { id: 'eat', icon: '🍵', name: 'Ăn / uống chánh niệm', steps: ['Nhìn kỹ món ăn/thức uống: màu sắc, hình dáng.', 'Ngửi mùi thơm, để ý cảm giác đói/khát.', 'Ăn/uống một ngụm nhỏ, nhai chậm, cảm nhận vị.', 'Đặt đũa/ly xuống giữa các lần, không xem điện thoại.', 'Thầm cảm ơn những người đã làm ra bữa ăn này.'] },
  { id: 'walk', icon: '🚶‍♀️', name: 'Đi bộ chánh niệm', steps: ['Đứng yên, cảm nhận bàn chân chạm đất.', 'Bước thật chậm: nhấc — đưa — đặt.', 'Kết hợp hơi thở: hít một bước, thở một bước.', 'Để ý gió, nắng, âm thanh quanh mình.', 'Dừng lại, mỉm cười, cảm ơn cơ thể đã đưa mình đi.'] },
  { id: 'kind', icon: '💗', name: 'Gửi thương yêu (Metta)', steps: ['Đặt tay lên ngực, thở chậm.', 'Thầm nói: "Mong mình bình an, khỏe mạnh, hạnh phúc."', 'Nghĩ tới một người thân: "Mong bạn bình an, khỏe mạnh, hạnh phúc."', 'Nghĩ tới một người khó chịu với mình — gửi lời chúc tương tự.', '"Mong tất cả mọi người đều bình an."'] },
];
let practice = null; let step = 0;

// ---------- Thống kê ----------
async function stats() {
  const med = await queryEvents('meditation_done');
  const today = todayKey();
  const days = new Set(med.map((e) => e.day ?? dayOf(e.at)));
  let streak = 0; for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) streak++;
  const week = med.filter((e) => (e.day ?? dayOf(e.at)) > addDays(today, -7));
  return { total: med.reduce((s, e) => s + (e.minutes ?? 0), 0), streak, weekMin: week.reduce((s, e) => s + (e.minutes ?? 0), 0), todayMin: med.filter((e) => (e.day ?? dayOf(e.at)) === today).reduce((s, e) => s + (e.minutes ?? 0), 0) };
}

export async function renderMindful(root) {
  const m = await mindData();
  const s = await stats();
  const today = todayKey();
  const grat = m.gratitude[today] ?? [];
  const P = PRACTICES.find((p) => p.id === practice);

  mount(root,
    h('div', { class: 'view-head' }, subnav('health', 'mindful'), h('h2', {}, '🧘 Góc tĩnh tâm')),
    h('section', { class: 'card mind-hero' },
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, `${s.todayMin} phút`), h('span', {}, 'thiền hôm nay')),
        h('div', { class: 'stat' }, h('b', {}, `${s.streak} ngày`), h('span', {}, 'liên tiếp')),
        h('div', { class: 'stat' }, h('b', {}, `${s.weekMin} phút`), h('span', {}, `7 ngày qua · tổng ${s.total} phút`)))),

    h('section', { class: 'card' },
      h('h3', {}, '🪷 Thiền'),
      h('div', { class: 'med-setup' },
        h('div', {}, h('b', { class: 'small' }, 'Thời gian'),
          h('div', { class: 'presets' }, [3, 5, 10, 15, 20, 30].map((n) => h('button', { class: `chip${medPrefs.minutes === n ? ' on' : ''}`, onclick: () => { medPrefs.minutes = n; saveMed(); notifyChange(); } }, `${n} phút`)))),
        h('div', {}, h('b', { class: 'small' }, 'Hơi thở'),
          h('div', { class: 'presets' }, Object.entries(PATTERNS).map(([k, p]) => h('button', { class: `chip${medPrefs.pattern === k ? ' on' : ''}`, onclick: () => { medPrefs.pattern = k; saveMed(); notifyChange(); } }, p.name))),
          h('p', { class: 'muted small' }, PATTERNS[medPrefs.pattern].hint)),
        h('div', {}, h('b', { class: 'small' }, 'Âm thanh nền'),
          h('div', { class: 'presets' }, AMBIENCE.map(([k, l]) => h('button', { class: `chip${medPrefs.amb === k ? ' on' : ''}`, onclick: () => { medPrefs.amb = k; saveMed(); notifyChange(); } }, l))))),
      h('button', { class: 'btn big-btn', onclick: () => startMeditation() }, `▶ Bắt đầu thiền ${medPrefs.minutes} phút`),
      h('p', { class: 'muted small' }, 'Có tiếng chuông xoay khi bắt đầu và kết thúc. Nhạc nền app tự tạm dừng; màn hình được giữ sáng trong lúc thiền.')),

    h('section', { class: 'card' },
      h('h3', {}, '🌿 Thực hành chánh niệm'),
      P ? h('div', { class: 'practice' },
        h('p', { class: 'muted small' }, `${P.icon} ${P.name} · bước ${step + 1}/${P.steps.length}`),
        h('div', { class: 'progress' }, h('span', { style: `width:${((step + 1) / P.steps.length) * 100}%` })),
        h('p', { class: 'practice-step' }, P.steps[step]),
        h('div', { class: 'presets' },
          step > 0 ? h('button', { class: 'chip', onclick: () => { step -= 1; notifyChange(); } }, '‹ Trước') : null,
          step < P.steps.length - 1
            ? h('button', { class: 'btn', onclick: () => { step += 1; notifyChange(); } }, 'Tiếp ›')
            : h('button', { class: 'btn', onclick: async () => { await logEvent('mindful_done', { practice: P.id, day: today }); practice = null; step = 0; toast(`🌿 Hoàn thành: ${P.name}`); } }, '✓ Xong'),
          h('button', { class: 'chip', onclick: () => { practice = null; step = 0; notifyChange(); } }, 'Thoát')))
        : h('div', { class: 'practice-grid' }, PRACTICES.map((p) => h('button', { class: 'practice-card', onclick: () => { practice = p.id; step = 0; notifyChange(); } },
          h('span', { class: 'big-icon' }, p.icon), h('b', {}, p.name), h('small', { class: 'muted' }, `${p.steps.length} bước`))))),

    h('section', { class: 'card' },
      h('h3', {}, '🙏 Biết ơn hôm nay'),
      h('p', { class: 'muted small' }, 'Viết 3 điều nhỏ bạn biết ơn. Nhỏ thôi cũng được: ly cà phê ngon, một tin nhắn dễ thương…'),
      grat.length ? h('ol', { class: 'grat-list' }, grat.map((g, i) => h('li', {}, g, h('button', { class: 'icon-btn', 'aria-label': 'Xóa', onclick: async () => { const mm = await mindData(); mm.gratitude[today] = (mm.gratitude[today] ?? []).filter((_, k) => k !== i); await saveMind(mm); } }, '✕')))) : null,
      grat.length < 3 ? h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault();
          const v = e.target.elements.g.value.trim(); if (!v) return;
          e.target.reset(); document.activeElement?.blur?.();
          const mm = await mindData(); mm.gratitude = { ...mm.gratitude, [today]: [...(mm.gratitude[today] ?? []), v] };
          await saveMind(mm);
          if ((mm.gratitude[today] ?? []).length === 3) { await logEvent('mindful_done', { practice: 'gratitude', day: today }); toast('🙏 Đủ 3 điều biết ơn hôm nay. Tuyệt vời!'); }
        },
      }, h('input', { class: 'input', name: 'g', placeholder: `Điều biết ơn thứ ${grat.length + 1}…`, maxlength: '200', 'aria-label': 'Điều biết ơn' }), h('button', { class: 'chip', type: 'submit' }, '+ Thêm'))
        : h('p', { class: 'small' }, '✨ Đủ 3 điều rồi. Hẹn mai nhé!'),
      (() => {
        const past = Object.entries(m.gratitude).filter(([d]) => d < today).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
        return past.length ? h('details', {}, h('summary', { class: 'small' }, 'Những ngày trước'),
          h('ul', { class: 'log-list' }, past.map(([d, list]) => h('li', {}, h('span', { class: 'muted small' }, `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`), h('span', { class: 'grow small' }, list.join(' · ')))))) : null;
      })()),
    relaxCard());
}

// ---------- Manifest ----------
const SLOTS = [['m', '🌅 Sáng', 3], ['a', '☀️ Chiều', 6], ['e', '🌙 Tối', 9]];
export async function renderManifest(root) {
  const m = await mindData();
  const today = todayKey();
  const affs = m.affirmations ?? DEFAULT_AFFIRMATIONS;
  const dayIdx = Math.floor(new Date(today).getTime() / 864e5);
  const aff = affs.length ? affs[dayIdx % affs.length] : '';
  const c369 = m.i369[today] ?? { m: 0, a: 0, e: 0 };
  let streak = 0; for (let d = today; ; d = addDays(d, -1)) { const c = m.i369[d]; if (c && c.m >= 3 && c.a >= 6 && c.e >= 9) streak++; else if (d !== today) break; if (d < addDays(today, -400)) break; }
  const hour = new Date().getHours();
  const slotNow = hour < 12 ? 'm' : hour < 18 ? 'a' : 'e';
  const norm = (x) => x.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

  mount(root,
    h('div', { class: 'view-head' }, subnav('health', 'manifest'), h('h2', {}, '✨ Manifest')),
    h('section', { class: 'card aff-card' },
      h('p', { class: 'muted small' }, 'Câu khẳng định hôm nay'),
      h('blockquote', { class: 'affirmation' }, aff || 'Thêm câu khẳng định của bạn bên dưới.'),
      h('p', { class: 'muted small' }, 'Đọc to 3 lần, chậm rãi, cảm nhận như điều đó đã là sự thật.'),
      h('details', {}, h('summary', { class: 'small' }, `Danh sách câu khẳng định (${affs.length})`),
        h('ul', { class: 'log-list' }, affs.map((a, i) => h('li', {}, h('span', { class: 'grow small' }, a),
          h('button', { class: 'icon-btn', 'aria-label': 'Xóa câu này', onclick: async () => { const mm = await mindData(); mm.affirmations = (mm.affirmations ?? DEFAULT_AFFIRMATIONS).filter((_, k) => k !== i); await saveMind(mm); } }, '✕')))),
        h('form', {
          class: 'inline-form', onsubmit: async (e) => {
            e.preventDefault(); const v = e.target.elements.a.value.trim(); if (!v) return;
            e.target.reset(); document.activeElement?.blur?.();
            const mm = await mindData(); mm.affirmations = [...(mm.affirmations ?? DEFAULT_AFFIRMATIONS), v]; await saveMind(mm);
          },
        }, h('input', { class: 'input', name: 'a', placeholder: 'VD: Mình là người kỷ luật và tự do tài chính', maxlength: '160', 'aria-label': 'Câu khẳng định mới' }), h('button', { class: 'chip', type: 'submit' }, '+ Thêm')))),

    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '🔢 Phương pháp 3-6-9'), streak ? h('span', { class: 'meta-chip' }, `🔥 ${streak} ngày đủ 3-6-9`) : null),
      h('p', { class: 'muted small' }, 'Viết điều ước của bạn ở thì hiện tại: 3 lần buổi sáng, 6 lần buổi chiều, 9 lần buổi tối. Nhiều người làm liên tục 33 hoặc 45 ngày.'),
      h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault(); const v = e.target.elements.i.value.trim();
          e.target.reset(); document.activeElement?.blur?.();
          const mm = await mindData(); mm.intention = v; await saveMind(mm); toast(v ? 'Đã lưu điều ước' : 'Đã xóa điều ước');
        },
      }, h('input', { class: 'input', name: 'i', value: m.intention, placeholder: 'VD: Mình đã đạt IELTS 7.5 và rất tự hào.', maxlength: '200', 'aria-label': 'Điều ước 3-6-9' }), h('button', { class: 'chip', type: 'submit' }, 'Lưu')),
      m.intention ? [
        h('div', { class: 'slots369' }, SLOTS.map(([k, label, n]) => h('div', { class: `slot369${k === slotNow ? ' now' : ''}${c369[k] >= n ? ' done' : ''}` },
          h('b', {}, label), h('div', { class: 'dots' }, Array.from({ length: n }, (_, i) => h('span', { class: i < c369[k] ? 'on' : '' }))),
          h('small', {}, c369[k] >= n ? '✓ Xong' : `${c369[k]}/${n}`)))),
        c369[slotNow] < SLOTS.find((x) => x[0] === slotNow)[2] ? h('form', {
          class: 'inline-form', onsubmit: async (e) => {
            e.preventDefault();
            const v = e.target.elements.w.value;
            const mm = await mindData();
            if (norm(v) !== norm(mm.intention)) { toast('Viết đúng câu điều ước nhé (dấu câu không quan trọng).'); return; }
            const c = { m: 0, a: 0, e: 0, ...(mm.i369[today] ?? {}) }; c[slotNow] += 1;
            mm.i369 = { ...mm.i369, [today]: c };
            e.target.reset();
            const n = SLOTS.find((x) => x[0] === slotNow)[2];
            if (c[slotNow] >= n) document.activeElement?.blur?.();
            await saveMind(mm);
            if (c.m >= 3 && c.a >= 6 && c.e >= 9) { await logEvent('mindful_done', { practice: '369', day: today }); toast('✨ Hoàn thành 3-6-9 hôm nay!'); }
            else if (c[slotNow] >= n) toast(`✓ Xong phần ${SLOTS.find((x) => x[0] === slotNow)[1]}`);
          },
        }, h('input', { class: 'input', name: 'w', placeholder: `Viết lại: ${m.intention}`, autocomplete: 'off', 'aria-label': 'Viết điều ước' }), h('button', { class: 'chip', type: 'submit' }, `✍️ Lần ${c369[slotNow] + 1}`)) : h('p', { class: 'small' }, '✓ Đã xong phần của buổi này.'),
      ] : null),

    h('section', { class: 'card' },
      h('h3', {}, '📜 Scripting — viết như thể đã thành sự thật'),
      h('p', { class: 'muted small' }, 'Tưởng tượng một ngày trong tương lai khi điều bạn mong đã xảy ra. Viết ở thì hiện tại: bạn đang ở đâu, cảm thấy thế nào, ai ở bên cạnh…'),
      h('form', {
        class: 'script-form', onsubmit: async (e) => {
          e.preventDefault(); const v = e.target.elements.s.value.trim(); if (!v) return;
          e.target.reset(); document.activeElement?.blur?.();
          const mm = await mindData(); mm.scripts = [{ id: Date.now(), day: today, text: v }, ...(mm.scripts ?? [])]; await saveMind(mm);
          await logEvent('mindful_done', { practice: 'script', day: today });
          toast('📜 Đã lưu. Đọc lại mỗi khi cần động lực nhé!');
        },
      }, h('textarea', { class: 'input', name: 's', rows: '5', placeholder: 'Hôm nay là ngày 20/12/2027. Mình vừa nhận kết quả IELTS 7.5…', 'aria-label': 'Viết scripting' }),
        h('button', { class: 'btn', type: 'submit' }, 'Lưu bài viết')),
      (m.scripts ?? []).length ? h('ul', { class: 'scripts' }, m.scripts.map((sc) => h('li', { class: sc.real ? 'real' : '' },
        h('div', { class: 'muted small' }, `${Number(sc.day.slice(8))}/${Number(sc.day.slice(5, 7))}/${sc.day.slice(0, 4)}`, sc.real ? ' · ✨ Đã thành hiện thực' : ''),
        h('p', {}, sc.text),
        h('div', { class: 'presets' },
          h('button', { class: 'chip', onclick: async () => { const mm = await mindData(); mm.scripts = mm.scripts.map((x) => (x.id === sc.id ? { ...x, real: !x.real } : x)); await saveMind(mm); if (!sc.real) toast('✨ Chúc mừng bạn!'); } }, sc.real ? '↺ Bỏ đánh dấu' : '✨ Đã thành hiện thực'),
          h('button', { class: 'icon-btn', 'aria-label': 'Xóa bài', onclick: async () => { if (!confirm('Xóa bài viết này?')) return; const mm = await mindData(); mm.scripts = mm.scripts.filter((x) => x.id !== sc.id); await saveMind(mm); } }, '✕'))))) : null));
}
