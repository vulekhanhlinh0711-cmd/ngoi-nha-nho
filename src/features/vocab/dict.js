// P47: từ điển Anh–Việt: nghĩa thông dụng (bảng dịch của Wiktionary tiếng Anh) + từ điển đầy đủ (Wiktionary tiếng Việt, gốc Hồ Ngọc Đức).
// Cả hai theo CC BY-SA 4.0, gọi thẳng từ trình duyệt. Chỉ gửi đúng TỪ cần tra.
import { findInCourses } from './vocab.js';

const json = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const wikitext = async (host, page) => (await json(`https://${host}/w/api.php?action=parse&format=json&origin=*&prop=wikitext&redirects=1&page=${encodeURIComponent(page)}`))?.parse?.wikitext?.['*'] ?? '';
export const POS_NAME = { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ', prep: 'giới từ', conj: 'liên từ', pron: 'đại từ', det: 'từ hạn định', interj: 'thán từ', num: 'số từ', phr: 'cụm từ' };

const clean = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').replace(/<[^>]+>/g, '')
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/'{2,5}/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').replace(/^[\s.;,:]+|[\s.;,:]+$/g, '');

const EN_POS = { Noun: 'n', Verb: 'v', Adjective: 'adj', Adverb: 'adv', Preposition: 'prep', Conjunction: 'conj', Pronoun: 'pron', Determiner: 'det', Interjection: 'interj', Numeral: 'num' };
export function parseEnTranslations(t) {
  const i = t.indexOf('==English=='); if (i >= 0) t = t.slice(i + 11);
  const j = t.search(/\n==[^=]/); if (j >= 0) t = t.slice(0, j);
  let pos = ''; let gloss = null; const out = [];
  for (const line of t.split('\n')) {
    const h = /^=+\s*(.*?)\s*=+$/.exec(line); if (h && EN_POS[h[1]]) pos = EN_POS[h[1]];
    const top = /^\{\{trans-top(?:-also)?\|(.*)\}\}/.exec(line); if (top) gloss = top[1].split('|').pop();
    if (line.startsWith('* Vietnamese:') && gloss != null && !/to be checked/i.test(gloss)) {
      const vi = [...line.matchAll(/\{\{tt?\+?\|vi\|([^|}]+)/g)].map((m) => m[1].replace(/\[\[|\]\]/g, '')).slice(0, 4);
      if (vi.length) out.push({ pos, meaning: vi.join(', '), gloss: clean(gloss), example: '', exVi: '' });
    }
  }
  return out;
}

const VI_POS = { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', prep: 'prep', conj: 'conj', pronoun: 'pron', interj: 'interj', num: 'num', article: 'det' };
const VI_HEAD = { 'danh từ': 'noun', 'động từ': 'verb', 'ngoại động từ': 'verb', 'nội động từ': 'verb', 'tính từ': 'adj', 'phó từ': 'adv', 'giới từ': 'prep', 'liên từ': 'conj', 'đại từ': 'pronoun', 'thán từ': 'interj' };
export function parseVi(t) {
  const m = /\{\{-eng-\}\}|==\s*Tiếng Anh\s*==|==\s*\{\{langname\|en\}\}/.exec(t);
  if (!m) return [];
  let sec = t.slice(m.index + m[0].length);
  for (const mm of sec.matchAll(/\n\{\{-([a-z]{3})-\}\}/g)) if (!['adj', 'adv', 'num', 'syn', 'ant', 'ref', 'etc'].includes(mm[1])) { sec = sec.slice(0, mm.index); break; }
  const e = sec.search(/\n==[^=]/); if (e >= 0) sec = sec.slice(0, e);
  let pos = ''; let cur = null; const out = [];
  for (const line of sec.split('\n')) {
    const h = /^\s*(?:\{\{-([a-z-]+)-\}\}|={3,}\s*(.*?)\s*={3,})/.exec(line);
    if (h) {
      let k = h[1] ?? VI_HEAD[(h[2] ?? '').replace(/\{\{.*?\}\}|=/g, '').trim().toLowerCase()] ?? 'x';
      if (/^(tr|intr)/.test(k)) k = 'verb';
      pos = VI_POS[k] ?? ''; cur = null; continue;
    }
    if (!pos) continue;
    const s = /^#\s*([^#:*].*)/.exec(line);
    if (s) { const g = clean(s[1]); cur = g && g.length < 160 ? { pos, meaning: g, gloss: '', example: '', exVi: '' } : null; if (cur) out.push(cur); continue; }
    const x = /^#[:*]+\s*(.+)/.exec(line);
    if (x && cur && !cur.example) { const [a, b] = clean(x[1]).split(/\s+[—–]\s+/); if (b && a.length < 120) { cur.example = a; cur.exVi = b; } }
  }
  return out;
}
async function englishOnly(w) {
  const d = await json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
  if (!Array.isArray(d)) return [];
  const P = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep' };
  return d.flatMap((e) => e.meanings ?? []).flatMap((m) => m.definitions.slice(0, 2).map((x) => ({ pos: P[m.partOfSpeech] ?? '', meaning: '', gloss: x.definition, example: x.example ?? '', exVi: '' }))).slice(0, 6);
}

const memo = new Map();
// { word, main, common[], full[], english[] }
export function search(word) {
  const w = word.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!memo.has(w)) {
    const p = (async () => {
      const [main, en, vi] = await Promise.all([findInCourses(w), wikitext('en.wiktionary.org', w), wikitext('vi.wiktionary.org', w)]);
      let common = parseEnTranslations(en);
      if (/see translation subpage/.test(en)) common = [...common, ...parseEnTranslations(await wikitext('en.wiktionary.org', `${w}/translations`))];
      const full = parseVi(vi);
      const english = common.length || full.length || main ? [] : await englishOnly(w);
      return { word: w, main, common, full, english };
    })();
    p.then((r) => { if (!r.main && !r.common.length && !r.full.length && !r.english.length) memo.delete(w); }, () => memo.delete(w));
    memo.set(w, p);
  }
  return memo.get(w);
}
