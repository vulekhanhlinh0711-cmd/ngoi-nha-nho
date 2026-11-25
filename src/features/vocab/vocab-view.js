// P47: màn Từ vựng — Ôn tập (5 cấp + giờ ôn vàng) · Sổ tay · Tra từ · Khóa học.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { pronounce, lookup, cambridgeUrl, oxfordUrl } from '../ielts/pronounce.js';
import {
  LEVELS, MASTER, COURSES, allCards, inNotebook, golden, levelCounts, courseWords, courseIndex, saveWord, removeWord, editWord, markKnown, unmarkKnown, streak, keyOf,
} from './vocab.js';
import { search, POS_NAME } from './dict.js';
import { startReview, startPractice, startLearn } from './session.js';

let tab = 'review';
const nb = { q: '', level: 'all', show: 40 };
const dict = { q: '', basic: true };
let courseId = null; let courseShow = 40;

const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const hh = Math.floor(s / 3600); return hh >= 48 ? `${Math.floor(hh / 24)} ngày ${hh % 24} giờ` : [hh, Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':'); };
const dueText = (c) => { const d = c.dueAt - Date.now(); if (d <= 0) return 'ôn ngay'; const m = Math.round(d / 60000); return m < 60 ? `ôn sau ${m} phút` : m < 2880 ? `ôn sau ${Math.round(m / 60)} giờ` : `ôn sau ${Math.round(m / 1440)} ngày`; };

// Biểu đồ 5 cấp (một màu, đậm dần theo mức nhớ); cột bấm được → mở Sổ tay đúng cấp.
function levelChart(cards) {
  const n = levelCounts(cards); const max = Math.max(...n, 1);
  return h('div', { class: 'lv-chart', role: 'group', 'aria-label': 'Số từ theo cấp độ nhớ' }, n.map((v, i) => h('button', {
    class: `lv-col lv${i + 1}`, title: `Cấp ${i + 1} · ${LEVELS[i + 1].name}: ${v} từ`, onclick: () => { tab = 'book'; nb.level = String(i + 1); nb.show = 40; notifyChange(); },
  }, h('span', { class: 'lv-n' }, `${v} từ`), h('span', { class: 'lv-track' }, h('span', { class: 'lv-bar', style: `height:${v ? Math.max(5, (v / max) * 100) : 0}%` })),
    h('span', { class: 'lv-icon', 'aria-hidden': 'true' }, LEVELS[i + 1].icon), h('span', { class: 'lv-label' }, `Cấp ${i + 1}`))));
}
// Hộp "giờ ôn vàng": có từ đến hạn → nút ôn; chưa tới → đếm ngược.
export function goldenBox(cards) {
  const g = golden(cards);
  if (g.due.length) return h('div', { class: 'golden ready' }, h('p', {}, '⏳ Đang là giờ ôn vàng: ', h('b', {}, `${g.due.length} từ`)), h('button', { class: 'btn big-btn', onclick: () => startReview() }, `Ôn tập ngay${g.due.length > 20 ? ' (20 từ)' : ''}`));
  if (!g.nextAt) return h('div', { class: 'golden' }, h('p', {}, 'Sổ tay chưa có từ nào để ôn. Vào Khóa học hoặc Tra từ để thêm nhé.'));
  const t = h('b', { class: 'golden-clock', role: 'timer' }, clock(g.nextAt - Date.now()));
  const iv = setInterval(() => { if (!t.isConnected) { if (t.dataset.seen) clearInterval(iv); return; } t.dataset.seen = '1'; const d = g.nextAt - Date.now(); t.textContent = clock(d); if (d <= 0) { clearInterval(iv); notifyChange(); } }, 1000);
  return h('div', { class: 'golden' }, h('p', {}, 'Chuẩn bị ôn tập: ', h('b', {}, `${g.nextCount} từ`)), h('div', { class: 'golden-timer' }, '⏳ ', t));
}
export async function vocabTeaser() {
  const cards = (await allCards()).filter(inNotebook);
  return h('section', { class: 'card vocab-teaser' },
    h('div', { class: 'card-head' }, h('h3', {}, '🗂️ Từ vựng của bạn'), h('a', { class: 'chip', href: '#vocab' }, 'Mở sổ tay →')),
    h('p', { class: 'small' }, 'Sổ tay đã có ', h('b', {}, `${cards.length} từ`)), levelChart(cards), goldenBox(cards));
}

async function reviewTab(cards) {
  const s = await streak(); const inCycle = s.n ? ((s.n - 1) % 7) + 1 : 0; const pct = inCycle / 7;
  const stage = ['🫘', '🌱', '🌱', '🌿', '🌿', '🪴', '🌷', '🌸'][inCycle];
  const R = 54; const C = 2 * Math.PI * R;
  const ring = document.createElement('div'); ring.className = 'plant-ring';
  ring.innerHTML = `<svg viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="${R}" class="pr-bg"/><circle cx="65" cy="65" r="${R}" class="pr-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 65 65)"/></svg><span class="pr-plant">${stage}</span>`;
  return [
    h('section', { class: 'card' },
      h('div', { class: 'book-pill' }, '📒 Sổ tay đã có ', h('b', {}, `${cards.length} từ`), h('span', { class: 'muted small' }, ` · đã thuộc ${cards.filter((c) => c.box >= MASTER).length}`)),
      levelChart(cards), goldenBox(cards),
      cards.length >= 4 ? h('div', { class: 'presets center' },
        h('button', { class: 'chip', onclick: () => startPractice(cards) }, '🎲 Luyện thêm 10 từ'),
        cards.some((c) => (c.bad ?? 0) >= 2) ? h('button', { class: 'chip', onclick: () => startPractice([...cards].filter((c) => (c.bad ?? 0) >= 1).sort((a, b) => b.bad - a.bad).slice(0, 15)) }, '💪 Luyện từ hay sai') : null) : null,
      h('p', { class: 'muted small' }, 'Trả lời đúng: từ lên 1 cấp và lâu hơn mới phải ôn lại (1 giờ → 1 ngày → 3 ngày → 7 ngày → 16 ngày). Sai: lùi 2 cấp. Bấm vào cột để xem các từ ở cấp đó.')),
    h('section', { class: 'card plant-card' },
      ring,
      h('div', {}, h('p', {}, 'Bạn đã học ', h('b', {}, `${inCycle}/7`), ' ngày liên tiếp', s.n > 7 ? ` (tổng chuỗi ${s.n} ngày 🔥)` : ''),
        h('p', { class: 'muted small' }, s.today ? '✓ Hôm nay đã tưới cây. Hẹn gặp bạn ngày mai!' : 'Học hoặc ôn từ hôm nay để cây lớn thêm.'),
        h('p', { class: 'muted small' }, 'Đủ mỗi 7 ngày liên tiếp: tặng 1 hạt giống cho Khu vườn 🎁'))),
  ];
}

// ---- Sổ tay ----
function editDialog(c) {
  const dlg = h('dialog', { class: 'dialog vocab-edit', 'aria-label': `Sửa ${c.word}` },
    h('form', { class: 'debt-form', onsubmit: async (e) => { e.preventDefault(); const f = e.target.elements; if (!f.m.value.trim()) { toast('Nhập nghĩa nhé'); return; } await editWord(c.word, { meaning: f.m.value.trim(), example: f.x.value.trim(), exVi: f.v.value.trim() }); dlg.close(); toast(`Đã sửa “${c.word}”`); notifyChange(); } },
      h('h3', {}, c.word),
      h('label', { class: 'debt-field' }, h('span', {}, 'Nghĩa'), h('textarea', { class: 'input', name: 'm', rows: '2' }, c.meaning)),
      h('label', { class: 'debt-field' }, h('span', {}, 'Ví dụ'), h('textarea', { class: 'input', name: 'x', rows: '2' }, c.example ?? '')),
      h('label', { class: 'debt-field' }, h('span', {}, 'Dịch ví dụ'), h('textarea', { class: 'input', name: 'v', rows: '2' }, c.exVi ?? '')),
      h('div', { class: 'presets' }, h('button', { class: 'btn', type: 'submit' }, '💾 Lưu'), h('button', { class: 'chip', type: 'button', onclick: () => dlg.close() }, 'Hủy'))));
  dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
function bookTab(all) {
  const cards = all.filter(inNotebook); const known = all.filter((c) => c.known);
  const list = h('div', { class: 'nb-list' });
  const draw = () => {
    const q = keyOf(nb.q);
    const pool = nb.level === 'known' ? known : cards.filter((c) => nb.level === 'all' || (nb.level === 'due' ? c.dueAt <= Date.now() : nb.level === 'bad' ? (c.bad ?? 0) >= 2 : c.box === Number(nb.level)));
    const hit = pool.filter((c) => !q || keyOf(c.word).includes(q) || c.meaning.toLowerCase().includes(nb.q.trim().toLowerCase())).sort((a, b) => (b.added ?? 0) - (a.added ?? 0) || a.word.localeCompare(b.word));
    mount(list,
      h('p', { class: 'muted small' }, `${hit.length} từ`),
      h('ul', { class: 'nb-rows' }, hit.slice(0, nb.show).map((c) => h('li', {},
        h('button', { class: 'icon-btn', 'aria-label': `Nghe ${c.word}`, onclick: () => pronounce(c.word) }, '🔊'),
        h('div', { class: 'grow' },
          h('div', {}, h('b', { class: 'nb-word' }, c.word), c.pos ? h('span', { class: 'muted small' }, ` (${POS_NAME[c.pos] ?? c.pos})`) : null, c.ipa ? h('span', { class: 'muted small' }, ` /${c.ipa}/`) : null),
          h('div', {}, c.meaning), c.example ? h('div', { class: 'muted small' }, c.example) : null,
          h('div', { class: 'muted small' }, c.known ? '✓ Bạn đã biết từ này' : `${LEVELS[c.box].icon} Cấp ${c.box} · ${dueText(c)}`)),
        c.known ? h('button', { class: 'chip', onclick: async () => { await unmarkKnown(c); toast(`Đã đưa “${c.word}” vào sổ để ôn`); notifyChange(); } }, 'Ôn lại') : h('button', { class: 'icon-btn', 'aria-label': `Đánh dấu đã biết ${c.word}`, title: 'Đã biết, không cần ôn nữa', onclick: async () => { await markKnown(c); toast(`“${c.word}”: đã biết`); notifyChange(); } }, '✓'),
        h('button', { class: 'icon-btn', 'aria-label': `Sửa ${c.word}`, onclick: () => editDialog(c) }, '✎'),
        h('button', { class: 'icon-btn', 'aria-label': `Xóa ${c.word}`, onclick: async () => { if (!confirm(`Xóa “${c.word}” khỏi sổ tay? Tiến độ của từ này cũng mất.`)) return; await removeWord(c.word); notifyChange(); } }, '✕')))),
      hit.length > nb.show ? h('button', { class: 'chip', onclick: () => { nb.show += 60; draw(); } }, `Xem thêm (${hit.length - nb.show})`) : null,
      hit.length ? null : h('p', { class: 'muted' }, 'Không có từ nào ở mục này.'));
  };
  const counts = levelCounts(cards);
  const opt = (k, l) => h('button', { class: `chip${nb.level === k ? ' on' : ''}`, 'aria-pressed': String(nb.level === k), onclick: () => { nb.level = k; nb.show = 40; notifyChange(); } }, l);
  draw();
  return [h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, '📒 Sổ tay của bạn'), h('span', { class: 'small' }, `${cards.length} từ`)),
    h('input', { class: 'input nb-search', type: 'search', value: nb.q, placeholder: 'Tìm từ hoặc nghĩa…', 'aria-label': 'Tìm trong sổ tay', oninput: (e) => { nb.q = e.target.value; nb.show = 40; draw(); } }),
    h('div', { class: 'presets' }, opt('all', `Tất cả ${cards.length}`), opt('due', `⏳ Tới hạn ${golden(cards).due.length}`), counts.map((n, i) => opt(String(i + 1), `${LEVELS[i + 1].icon} Cấp ${i + 1} · ${n}`)), opt('bad', '💪 Hay sai'), known.length ? opt('known', `✓ Đã biết ${known.length}`) : null),
    list),
  h('section', { class: 'card' }, h('details', { class: 'sub' }, h('summary', {}, '+ Tự thêm từ'),
    h('form', { class: 'debt-form', onsubmit: async (e) => {
      e.preventDefault(); const f = e.target.elements; const word = f.w.value.trim(); const meaning = f.m.value.trim();
      if (!word || !meaning) { toast('Điền từ và nghĩa nhé'); return; }
      const r = await saveWord({ word, meaning, example: f.x.value.trim() }); e.target.reset(); document.activeElement?.blur?.();
      toast(r === 'added' ? `Đã thêm “${word}”` : r === 'merged' ? `Đã thêm nghĩa mới cho “${word}”` : 'Từ này đã có trong sổ'); notifyChange();
    } }, h('div', { class: 'debt-grid' },
      h('label', { class: 'debt-field' }, h('span', {}, 'Từ'), h('input', { class: 'input', name: 'w', autocomplete: 'off', autocapitalize: 'off' })),
      h('label', { class: 'debt-field' }, h('span', {}, 'Nghĩa'), h('input', { class: 'input', name: 'm', autocomplete: 'off' })),
      h('label', { class: 'debt-field' }, h('span', {}, 'Ví dụ (tùy chọn)'), h('input', { class: 'input', name: 'x', autocomplete: 'off' }))),
    h('button', { class: 'btn', type: 'submit' }, '+ Thêm vào sổ'))))];
}

// ---- Tra từ ----
function dictTab(all) {
  const book = new Map(all.filter(inNotebook).map((c) => [keyOf(c.word), c]));
  const box = h('div', { class: 'dict-result', 'aria-live': 'polite' });
  const run = async () => {
    const q = dict.q.trim(); if (!q) { mount(box); return; }
    mount(box, h('p', { class: 'muted' }, `Đang tra “${q}”…`));
    const r = await search(q);
    if (keyOf(dict.q) !== keyOf(q)) return;
    const ipaUk = h('span', { class: 'vq-ipa' }); const ipaUs = h('span', { class: 'vq-ipa' });
    lookup(r.word).then((p) => { if (p.ipa?.uk) ipaUk.textContent = p.ipa.uk; if (p.ipa?.us) ipaUs.textContent = p.ipa.us; }).catch(() => {});
    const row = (s) => {
      const has = () => { const c = book.get(keyOf(r.word)); return !!c && !!s.meaning && c.meaning.toLowerCase().includes(s.meaning.toLowerCase()); };
      const btn = h('button', { class: `chip save-word${has() ? ' saved' : ''}`, disabled: has() });
      btn.textContent = has() ? '✓ Đã lưu' : '+ Lưu từ';
      btn.addEventListener('click', async () => {
        let meaning = s.meaning;
        if (!meaning) { meaning = (prompt(`Nghĩa tiếng Việt của “${r.word}”\n(${s.gloss})`) ?? '').trim(); if (!meaning) return; }
        btn.disabled = true;
        const res = await saveWord({ word: r.word, pos: s.pos, meaning, example: s.example, exVi: s.exVi, ipa: '' });
        btn.textContent = '✓ Đã lưu'; btn.classList.add('saved');
        toast(res === 'merged' ? `Đã thêm nghĩa cho “${r.word}”` : `Đã lưu “${r.word}” · ôn lại sau 1 giờ`);
        const c = book.get(keyOf(r.word)); book.set(keyOf(r.word), { word: r.word, meaning: c ? `${c.meaning}; ${meaning}` : meaning });
      });
      return h('li', {}, h('div', { class: 'grow' },
        h('div', {}, s.meaning ? h('b', {}, s.meaning) : null, s.pos ? h('span', { class: 'muted small' }, ` (${POS_NAME[s.pos] ?? s.pos})`) : null),
        s.gloss ? h('div', { class: 'muted small' }, s.gloss) : null, s.example ? h('div', { class: 'small' }, `– ${s.example}`, s.exVi ? h('span', { class: 'muted' }, ` — ${s.exVi}`) : null) : null), btn);
    };
    const none = !r.main && !r.common.length && !r.full.length && !r.english.length;
    const basic = [...(r.main ? [r.main] : []), ...r.common.slice(0, 8)];
    const list = dict.basic && basic.length ? basic : [...basic, ...r.full];
    mount(box, none ? h('p', {}, `Không tìm thấy “${r.word}”. Kiểm tra chính tả hoặc mạng, hoặc xem `, h('a', { href: cambridgeUrl(r.word), target: '_blank', rel: 'noopener' }, 'Cambridge ↗'), '.') : [
      h('h3', { class: 'dict-word' }, r.word),
      h('div', { class: 'dict-pron' },
        h('div', {}, h('b', { class: 'uk' }, 'Anh'), h('button', { class: 'icon-btn', 'aria-label': 'Nghe giọng Anh Anh', onclick: () => pronounce(r.word, 'uk') }, '🔊'), ipaUk),
        h('div', {}, h('b', { class: 'us' }, 'Mỹ'), h('button', { class: 'icon-btn', 'aria-label': 'Nghe giọng Anh Mỹ', onclick: () => pronounce(r.word, 'us') }, '🔊'), ipaUs)),
      h('ul', { class: 'dict-senses' }, (list.length ? list : r.english).map(row)),
      dict.basic && r.full.length && basic.length ? h('button', { class: 'chip', onclick: () => { dict.basic = false; notifyChange(); } }, `Xem từ điển đầy đủ (${r.full.length} nghĩa)`) : null,
      h('div', { class: 'presets' }, h('a', { class: 'chip', href: cambridgeUrl(r.word), target: '_blank', rel: 'noopener' }, 'Cambridge ↗'), h('a', { class: 'chip', href: oxfordUrl(r.word), target: '_blank', rel: 'noopener' }, 'Oxford ↗'))]);
  };
  if (dict.q) run();
  return [h('section', { class: 'card' },
    h('h3', {}, '🔎 Từ điển Anh – Việt'),
    h('form', { class: 'inline-form dict-form', onsubmit: (e) => { e.preventDefault(); dict.q = e.target.elements.q.value; e.target.elements.q.blur(); run(); } },
      h('input', { class: 'input', name: 'q', type: 'search', value: dict.q, placeholder: 'Gõ từ tiếng Anh, vd: turn', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Từ cần tra' }), h('button', { class: 'btn', type: 'submit' }, 'Tra')),
    h('label', { class: 'field-inline' }, h('input', { type: 'checkbox', checked: dict.basic, onchange: (e) => { dict.basic = e.target.checked; notifyChange(); } }), 'Từ điển cơ bản (chỉ nghĩa thông dụng)'),
    box,
    h('p', { class: 'muted small' }, 'Nghĩa: Wiktionary (CC BY-SA 4.0). Nghĩa từ điển có thể hơi cổ hoặc thiếu — bạn sửa lại được trong Sổ tay.'))];
}

// ---- Khóa học ----
async function courseTab(all) {
  const have = new Map(all.map((c) => [keyOf(c.word), c]));
  const taken = (w) => { const c = have.get(keyOf(w.word)); return !!c && (inNotebook(c) || c.known); };
  if (!courseId) {
    const idx = await courseIndex();
    const done = Object.fromEntries(COURSES.map((c) => [c.id, 0]));
    for (const c of all) if ((inNotebook(c) || c.known) && done[c.course] != null) done[c.course]++;
    return [h('section', { class: 'card' }, h('h3', {}, '🎒 Danh sách khóa học'),
      h('div', { class: 'course-list' }, COURSES.map((c) => { const n = idx[c.id] ?? c.n; return h('button', { class: 'course', onclick: () => { courseId = c.id; courseShow = 40; notifyChange(); } },
        h('span', { class: 'course-icon' }, c.icon), h('span', { class: 'grow' }, h('b', {}, c.name), h('small', {}, `🎯 ${c.goal}`), h('small', {}, `📦 ${n} ${c.id === 'phrases' ? 'cụm từ' : 'từ'} · đã học ${Math.min(done[c.id], n)}`),
          h('span', { class: 'progress' }, h('span', { style: `width:${n ? Math.min(100, (done[c.id] / n) * 100) : 0}%` })))); })),
      h('p', { class: 'muted small' }, 'Danh sách từ chọn từ NGSL và NAWL (Browne, Culligan & Phillips) — CC BY-SA 4.0. Ví dụ & phiên âm: Wiktionary — CC BY-SA 4.0. Nghĩa và cụm từ: tự soạn.'))];
  }
  const C = COURSES.find((x) => x.id === courseId);
  let words = [];
  try { words = await courseWords(courseId); } catch { /* báo bên dưới */ }
  const left = words.filter((w) => !taken(w));
  return [h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('button', { class: 'chip', onclick: () => { courseId = null; notifyChange(); } }, '‹ Khóa học'), h('span', { class: 'small' }, `${words.length - left.length}/${words.length}`)),
    h('h3', {}, `${C.icon} ${C.name}`), h('div', { class: 'progress' }, h('span', { style: `width:${words.length ? ((words.length - left.length) / words.length) * 100 : 0}%` })),
    !words.length ? h('p', {}, 'Chưa tải được khóa học. Kiểm tra mạng rồi mở lại nhé.') : left.length ? h('div', { class: 'presets center' }, [5, 10, 20].map((n) => h('button', { class: n === 10 ? 'btn' : 'chip', onclick: () => startLearn(left.slice(0, n), C.name) }, `Học ${Math.min(n, left.length)} từ mới`))) : h('p', {}, '🎉 Bạn đã học hết khóa này!'),
    h('ul', { class: 'nb-rows' }, words.slice(0, courseShow).map((w) => { const c = have.get(keyOf(w.word)); return h('li', {},
      h('button', { class: 'icon-btn', 'aria-label': `Nghe ${w.word}`, onclick: () => pronounce(w.word) }, '🔊'),
      h('div', { class: 'grow' }, h('b', { class: 'nb-word' }, w.word), w.pos ? h('span', { class: 'muted small' }, ` (${POS_NAME[w.pos] ?? w.pos})`) : null, h('div', {}, w.meaning)),
      c?.known ? h('span', { class: 'small' }, '✓ Đã biết') : c && inNotebook(c) ? h('span', { class: 'small' }, `${LEVELS[c.box].icon} Cấp ${c.box}`)
        : h('button', { class: 'chip save-word', onclick: async () => { await saveWord(w); toast(`Đã lưu “${w.word}”`); notifyChange(); } }, '+ Lưu')); })),
    words.length > courseShow ? h('button', { class: 'chip', onclick: () => { courseShow += 80; notifyChange(); } }, `Xem thêm (${words.length - courseShow})`) : null)];
}

export async function renderVocab(root) {
  const all = await allCards(); const cards = all.filter(inNotebook);
  const body = tab === 'book' ? bookTab(all) : tab === 'dict' ? dictTab(all) : tab === 'course' ? await courseTab(all) : await reviewTab(cards);
  mount(root,
    h('div', { class: 'view-head' }, subnav('learn', 'vocab'), h('h2', {}, 'Từ vựng')),
    h('div', { class: 'vocab-tabs', role: 'tablist' }, [['dict', '🔎', 'Tra từ'], ['course', '🎒', 'Học từ mới'], ['review', '🌱', 'Ôn tập'], ['book', '📒', 'Sổ tay']].map(([k, i, l]) => h('button', {
      class: `vocab-tab${tab === k ? ' on' : ''}`, role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; if (k === 'book') nb.level = 'all'; notifyChange(); },
    }, h('span', { 'aria-hidden': 'true' }, i), l))),
    body);
}
