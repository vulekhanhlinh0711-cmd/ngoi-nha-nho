// P47: màn luyện toàn màn hình — ôn giờ vàng, học từ mới theo khóa, luyện thêm (không đổi cấp).
import { h, mount } from '../../ui/dom.js';
import { notifyChange } from '../../core/events.js';
import { pronounce, lookup } from '../ielts/pronounce.js';
import { LEVELS, answer, saveWord, markKnown, notebook, courseWords, finishSession, golden } from './vocab.js';
import { POS_NAME } from './dict.js';

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const norm = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' -]/g, '').replace(/\s+/g, ' ').trim();
export const sameWord = (a, b) => norm(a) === norm(b);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Câu ví dụ có chỗ trống (nhận cả dạng biến đổi: analyse → analyses).
export function blankOut(example, word) {
  if (!example) return null;
  const stem = word.length > 4 ? word.replace(/(e|y)$/, '') : word;
  const r = new RegExp(`\\b${esc(stem)}[a-z]*\\b`, 'i');
  const exact = new RegExp(`\\b${esc(word)}\\b`, 'i');
  return exact.test(example) ? example.replace(exact, '_____') : r.test(example) ? example.replace(r, '_____') : null;
}
// Cấp càng cao câu hỏi càng khó.
export function kindFor(box) { return box <= 1 ? 'choice' : box === 2 ? (Math.random() < 0.5 ? 'listen' : 'choice') : box === 3 ? 'type' : Math.random() < 0.5 ? 'dictate' : 'type'; }

let open = null;
function shell(title, onClose) {
  const bar = h('span'); const body = h('div', { class: 'vq-body' }); const count = h('span', { class: 'vq-count' });
  const dlg = h('dialog', { class: 'vq', 'aria-label': title },
    h('header', { class: 'vq-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Thoát', onclick: () => onClose() }, '✕'),
      h('div', { class: 'progress vq-progress' }, bar), count), body);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); onClose(); });
  document.body.append(dlg); dlg.showModal();
  open = dlg;
  return { dlg, body, progress: (i, n) => { bar.style.width = `${n ? (i / n) * 100 : 0}%`; count.textContent = `${Math.min(i + 1, n)}/${n}`; }, close: () => { dlg.close(); dlg.remove(); open = null; } };
}
function wordCard(c) {
  const ipa = h('span', { class: 'vq-ipa' }, c.ipa ? `/${c.ipa}/` : '');
  if (!c.ipa) lookup(c.word).then((r) => { const t = r.ipa?.uk ?? r.ipa?.us; if (t) ipa.textContent = t; }).catch(() => {});
  return h('div', { class: 'vq-card' },
    h('div', { class: 'vq-word' }, c.word), h('div', { class: 'vq-meta' }, ipa, c.pos ? h('span', {}, ` · ${POS_NAME[c.pos] ?? c.pos}`) : null),
    h('button', { class: 'chip', type: 'button', onclick: () => pronounce(c.word) }, '🔊 Nghe'),
    h('p', { class: 'vq-meaning' }, c.meaning),
    c.example ? h('p', { class: 'vq-ex' }, c.example, c.exVi ? h('small', {}, c.exVi) : null) : null);
}

// Chạy một danh sách câu hỏi. onAnswer(card, ok) chỉ gọi ở lần trả lời đầu của mỗi từ.
async function quiz(ui, cards, { onAnswer, forceKind = null }) {
  const pool = [...await notebook(), ...await courseWords('starter')];
  let extra = null;
  const options = async (c, field) => {
    let others = shuffle(pool.filter((x) => x.word !== c.word && x[field] && x[field] !== c[field] && (!c.pos || !x.pos || x.pos === c.pos)));
    if (others.length < 3) { extra ??= await courseWords('base1').catch(() => []); others = [...others, ...shuffle(extra.filter((x) => x.word !== c.word && x[field] !== c[field]))]; }
    const seen = new Set([c[field]]); const pick = [];
    for (const o of others) { if (seen.has(o[field])) continue; seen.add(o[field]); pick.push(o[field]); if (pick.length === 3) break; }
    return shuffle([c[field], ...pick]);
  };
  const queue = cards.map((c) => ({ c, again: false }));
  let done = 0; let correct = 0; let i = 0;
  while (i < queue.length) {
    if (!ui.dlg.open) return { done, correct };
    const { c, again } = queue[i];
    ui.progress(i, queue.length);
    let kind = forceKind ?? (again ? 'choice' : kindFor(c.box));
    const result = await new Promise((resolve) => { // eslint-disable-line no-loop-func
      ui.dlg.addEventListener('close', () => resolve(null), { once: true });
      const fb = h('div', { class: 'vq-feedback', hidden: true, 'aria-live': 'polite' });
      let answered = false;
      const reveal = (ok, note = '') => {
        if (answered) return; answered = true;
        pronounce(c.word).catch(() => {});
        const next = h('button', { class: 'btn vq-next', onclick: () => resolve(ok) }, 'Tiếp tục ›');
        fb.hidden = false; fb.className = `vq-feedback ${ok ? 'ok' : 'bad'}`;
        mount(fb, h('b', { class: 'vq-verdict' }, ok ? '✓ Chính xác!' : '✗ Chưa đúng', note ? ` ${note}` : ''), wordCard(c), next);
        setTimeout(() => next.focus(), 60);
        fb.scrollIntoView({ block: 'end', behavior: 'smooth' });
      };
      const skip = h('button', { class: 'chip vq-skip', onclick: () => reveal(false) }, 'Mình chưa nhớ');
      const draw = async () => {
        if (kind === 'choice') {
          const opts = await options(c, 'meaning');
          mount(ui.body, h('p', { class: 'vq-ask' }, 'Chọn nghĩa đúng'), h('div', { class: 'vq-word' }, c.word),
            h('button', { class: 'chip', onclick: () => pronounce(c.word) }, '🔊 Nghe'),
            h('div', { class: 'vq-opts' }, opts.map((o) => h('button', { class: 'vq-opt', onclick: (e) => {
              if (answered) return;
              const ok = o === c.meaning; e.currentTarget.classList.add(ok ? 'right' : 'wrong');
              if (!ok) [...ui.body.querySelectorAll('.vq-opt')].find((b) => b.textContent === c.meaning)?.classList.add('right');
              skip.remove(); reveal(ok);
            } }, o))), skip, fb);
        } else if (kind === 'listen') {
          const opts = await options(c, 'word');
          mount(ui.body, h('p', { class: 'vq-ask' }, 'Nghe và chọn từ đúng'), h('button', { class: 'vq-speaker', 'aria-label': 'Nghe lại', onclick: () => pronounce(c.word) }, '🔊'),
            h('div', { class: 'vq-opts' }, opts.map((o) => h('button', { class: 'vq-opt', onclick: (e) => {
              if (answered) return;
              const ok = o === c.word; e.currentTarget.classList.add(ok ? 'right' : 'wrong'); skip.remove(); reveal(ok);
            } }, o))), skip, fb);
          pronounce(c.word).catch(() => {});
        } else {
          const blank = kind === 'type' ? blankOut(c.example, c.word) : null;
          const inp = h('input', { class: 'input vq-input', name: 'a', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Gõ từ tiếng Anh', placeholder: kind === 'type' ? `${c.word[0]}${' _'.repeat(Math.min(14, c.word.length - 1))}` : 'Gõ từ bạn nghe được' });
          mount(ui.body, h('p', { class: 'vq-ask' }, kind === 'dictate' ? 'Nghe và gõ lại từ' : 'Gõ từ tiếng Anh phù hợp'),
            kind === 'dictate' ? h('button', { class: 'vq-speaker', 'aria-label': 'Nghe lại', onclick: () => pronounce(c.word) }, '🔊') : h('p', { class: 'vq-meaning big' }, c.meaning, c.pos ? h('small', {}, ` (${POS_NAME[c.pos] ?? c.pos})`) : null),
            blank ? h('p', { class: 'vq-ex' }, blank) : null,
            h('form', { class: 'vq-form', onsubmit: (e) => { e.preventDefault(); if (answered || !inp.value.trim()) return; inp.readOnly = true; skip.remove(); e.target.querySelector('button').hidden = true; reveal(sameWord(inp.value, c.word), sameWord(inp.value, c.word) ? '' : `Bạn gõ: ${inp.value.trim()}`); } },
              inp, h('button', { class: 'btn', type: 'submit' }, 'Kiểm tra')), skip, fb);
          inp.focus();
          if (kind === 'dictate') pronounce(c.word).catch(() => {});
        }
      };
      draw();
    });
    if (result === null) return { done, correct };
    if (!again) { done++; if (result) correct++; await onAnswer(c, result); }
    if (!result && !again) queue.push({ c, again: true }); // sai → hỏi lại một lần cuối lượt (không đổi cấp nữa)
    i++;
  }
  ui.progress(queue.length, queue.length);
  return { done, correct };
}

const until = (ms) => { const m = Math.max(1, Math.round((ms - Date.now()) / 60000)); return m < 60 ? `${m} phút` : m < 48 * 60 ? `${Math.round(m / 60)} giờ` : `${Math.round(m / 1440)} ngày`; };
async function summary(ui, { title, done, correct, moves = [], learned = 0, start, kind }) {
  const r = await finishSession({ kind, total: done, correct, learned, ms: Date.now() - start });
  const g = golden(await notebook());
  mount(ui.body, h('div', { class: 'vq-end' },
    h('div', { class: 'vq-big' }, done && correct === done ? '🌸' : '🌿'), h('h2', {}, title),
    done ? h('p', {}, h('b', {}, `${correct}/${done}`), ' câu đúng') : null,
    learned ? h('p', {}, `🌱 ${learned} từ mới đã vào sổ tay`) : null,
    moves.length ? h('ul', { class: 'vq-moves' }, moves.map((m) => h('li', {}, h('b', {}, m.word), h('span', {}, `${LEVELS[m.from].icon} ${m.from} → ${LEVELS[m.to].icon} ${m.to}`)))) : null,
    h('p', {}, `🔥 ${r.streak} ngày học liên tiếp`),
    r.gift ? h('p', { class: 'vq-gift' }, `🎁 Đủ 7 ngày liên tiếp! Bạn nhận 1 hạt ${r.gift.icon} ${r.gift.name} cho Khu vườn.`) : null,
    g.due.length ? h('p', {}, `Còn ${g.due.length} từ đang tới hạn.`) : g.nextAt ? h('p', {}, `⏳ Giờ ôn vàng tiếp theo: sau ${until(g.nextAt)} (${g.nextCount} từ)`) : null,
    h('div', { class: 'presets' }, g.due.length && kind === 'review' ? h('button', { class: 'btn', onclick: () => { ui.close(); startReview(); } }, 'Ôn tiếp') : null,
      h('button', { class: g.due.length && kind === 'review' ? 'chip' : 'btn', onclick: () => { ui.close(); notifyChange(); } }, 'Xong'))));
}

export async function startReview(limit = 20) {
  if (open) return;
  const cards = golden(await notebook()).due.slice(0, limit);
  if (!cards.length) return;
  const start = Date.now(); const moves = []; let n = 0; let ok = 0;
  const bail = async () => { ui.close(); if (n) await finishSession({ kind: 'review', total: n, correct: ok, ms: Date.now() - start }); else notifyChange(); };
  const ui = shell('Ôn tập từ vựng', bail);
  const r = await quiz(ui, cards, { onAnswer: async (c, good) => { n++; if (good) ok++; const st = await answer(c, good); moves.push({ word: c.word, from: c.box, to: st.box }); } });
  if (ui.dlg.open) await summary(ui, { title: 'Xong lượt ôn!', ...r, moves, start, kind: 'review' });
}

// Luyện thêm: không đổi cấp và không đổi giờ ôn.
export async function startPractice(cards) {
  if (open || !cards.length) return;
  const start = Date.now(); let n = 0; let ok = 0;
  const bail = async () => { ui.close(); if (n >= 5) await finishSession({ kind: 'practice', total: n, correct: ok, ms: Date.now() - start }); else notifyChange(); };
  const ui = shell('Luyện thêm', bail);
  const r = await quiz(ui, shuffle(cards).slice(0, 10), { onAnswer: async (c, good) => { n++; if (good) ok++; } });
  if (ui.dlg.open) await summary(ui, { title: 'Luyện thêm xong!', ...r, start, kind: 'practice' });
}

// Học từ mới: xem từng thẻ (giữ / đã biết) → kiểm tra nhanh → vào sổ tay cấp 1.
export async function startLearn(words, title) {
  if (open || !words.length) return;
  const start = Date.now(); const take = []; let saved = 0;
  const bail = async () => { ui.close(); if (saved) await finishSession({ kind: 'learn', total: 0, correct: 0, learned: saved, ms: Date.now() - start }); else notifyChange(); };
  const ui = shell(title, bail);
  for (let i = 0; i < words.length; i++) {
    const c = words[i]; ui.progress(i, words.length);
    const act = await new Promise((resolve) => {
      ui.dlg.addEventListener('close', () => resolve('quit'), { once: true });
      mount(ui.body, h('p', { class: 'vq-ask' }, 'Từ mới'), wordCard(c),
        h('div', { class: 'presets vq-learn' }, h('button', { class: 'btn', onclick: () => resolve('learn') }, '🌱 Học từ này'), h('button', { class: 'chip', onclick: () => resolve('known') }, 'Mình biết rồi')));
      pronounce(c.word).catch(() => {});
      ui.body.querySelector('.vq-learn .btn').focus();
    });
    if (act === 'quit') return;
    if (act === 'known') await markKnown({ ...c, box: 0 });
    else { await saveWord(c); saved++; take.push({ ...c, box: 1 }); }
  }
  const r = take.length ? await quiz(ui, take, { forceKind: 'choice', onAnswer: async () => {} }) : { done: 0, correct: 0 };
  if (ui.dlg.open) await summary(ui, { title: take.length ? 'Học xong từ mới!' : 'Xong!', ...r, learned: saved, start, kind: 'learn' });
}
