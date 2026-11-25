// P39: phát âm thẻ từ bằng GIỌNG NGƯỜI THẬT, chọn Anh Anh (UK) / Anh Mỹ (US).
// Thứ tự tìm bản ghi âm (đều miễn phí, cho phép gọi từ trình duyệt):
//  1. Wiktionary — phiên âm IPA + file ghi âm người thật có ghi rõ vùng (Mỹ / Anh); file nằm trên Wikimedia Commons.
//  2. Wikimedia Commons — đoán tên file chuẩn En-us-/En-uk-<từ>.ogg (bản mp3 Commons tự chuyển, chạy được trên iPhone).
//  3. Lingua Libre (trên Commons) — người bản ngữ đọc, không ghi rõ vùng.
//  IPA dự phòng: Free Dictionary API.
//  4. Không có bản ghi → giọng máy, nhưng chọn ĐÚNG giọng tiếng Anh tốt nhất của máy theo UK/US (trước đây máy tự chọn nên nghe lạ).
// Cambridge / Oxford không cho app khác lấy âm thanh → có nút mở thẳng trang từ điển để nghe & xem nghĩa.
const COMMONS = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query';
const CACHE_DAYS = 30;

export const accent = () => { try { return localStorage.getItem('accent') === 'us' ? 'us' : 'uk'; } catch { return 'uk'; } };
export const setAccent = (a) => { try { localStorage.setItem('accent', a); } catch { /* chỉ phiên này */ } };
export const ACCENT_NAME = { uk: '🇬🇧 Anh Anh', us: '🇺🇸 Anh Mỹ' };
export const cambridgeUrl = (w) => `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(w.trim().toLowerCase().replace(/\s+/g, '-'))}`;
export const oxfordUrl = (w) => `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(w.trim())}`;

const cacheKey = (w) => `pron2:${w.toLowerCase()}`;
function cached(w) {
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey(w)) ?? 'null');
    if (c && Date.now() - c.at < CACHE_DAYS * 864e5) return c;
  } catch { /* bỏ qua */ }
  return null;
}
const json = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

// Vùng giọng từ nhãn Wiktionary / tên file.
function accentOf(label = '', file = '') {
  const l = `${label} ${file}`;
  if (/\b(US|General American|GA|GenAm|American|Canada|Canadian)\b|En-us-/i.test(l)) return 'us';
  if (/\b(UK|RP|Received Pronunciation|British|England|English|London|SSB|Southern England)\b|En-(uk|gb)-/i.test(l)) return 'uk';
  return null;
}

// 1. Wiktionary: phiên âm IPA (UK/US) + danh sách file ghi âm có ghi rõ vùng giọng.
async function fromWiktionary(w, depth = 0) {
  const out = { ipa: { uk: null, us: null }, files: [] };
  for (const page of [...new Set([w, w.toLowerCase()])]) {
    const d = await json(`https://en.wiktionary.org/w/api.php?action=parse&format=json&origin=*&prop=wikitext&redirects=1&page=${encodeURIComponent(page)}`);
    const t = d?.parse?.wikitext?.['*'];
    if (!t) continue;
    const i = t.indexOf('==English==');
    if (i < 0) continue;
    const rest = t.slice(i + 11);
    const sec = rest.slice(0, rest.search(/\n==[^=]/) >>> 0);
    for (const line of sec.split('\n')) {
      const lineAcc = [...line.matchAll(/\{\{(?:a|accent|lb)\|en\|?([^}]*)\}\}|\{\{a\|([^}]*)\}\}/g)].map((m) => m[1] ?? m[2]).join(' ');
      const ipa = /\{\{IPA\|en\|([^}]*)\}\}/.exec(line);
      if (ipa) {
        const parts = ipa[1].split('|');
        const first = parts.find((x) => /^[/[]/.test(x));
        const acc = accentOf(`${lineAcc} ${parts.filter((x) => /^a=/.test(x)).join(' ')}`);
        if (first) {
          if (acc) out.ipa[acc] ??= first;
          else { out.ipa.uk ??= first; out.ipa.us ??= first; }
        }
      }
      for (const m of line.matchAll(/\{\{audio\|en\|([^|}]+)((?:\|[^}]*)?)\}\}/g)) {
        out.files.push({ file: m[1].trim(), accent: accentOf(`${lineAcc} ${m[2]}`, m[1]) });
      }
    }
    // "analyse" = cách viết Anh của "analyze" → lấy thêm phát âm ở trang kia nếu trang này thiếu.
    const tpl = /\{\{(?:[a-z ]*spelling of|alternative form of|alt form|alt sp)\|en\|([^}]+)\}\}/i.exec(sec)?.[1];
    const alt = tpl?.replace(/\[\[[^\]]*\]\]/g, '').split('|').map((x) => x.trim()).find((x) => x && !x.includes('='));
    if (alt && depth < 1 && (!out.ipa.uk || !out.files.some((f) => f.accent))) {
      const o = await fromWiktionary(alt, depth + 1);
      out.ipa.uk ??= o.ipa.uk; out.ipa.us ??= o.ipa.us;
      out.files.push(...o.files);
    }
    if (out.files.length || out.ipa.uk || out.ipa.us) break;
  }
  return out;
}

// Bản mp3 (Commons tự chuyển từ .ogg) để Safari/iPhone phát được; file wav/mp3 dùng thẳng.
const playable = (vi) => vi?.derivatives?.find((d) => /mpeg|mp3/.test(d.type ?? '') || /\.mp3$/.test(d.src ?? ''))?.src
  ?? (/\.(wav|mp3)$/i.test((vi?.url ?? '').split('?')[0]) ? vi.url.split('?')[0] : null);
async function resolveFiles(files) {
  if (!files.length) return {};
  const titles = files.map((f) => `File:${f.replace(/^File:/i, '')}`);
  const d = await json(`${COMMONS}&prop=videoinfo&viprop=url|derivatives&titles=${encodeURIComponent(titles.join('|'))}`);
  const map = {};
  for (const p of Object.values(d?.query?.pages ?? {})) {
    if (p.missing !== undefined) continue;
    const src = playable(p.videoinfo?.[0]);
    if (src) map[p.title.replace(/^File:/, '').replace(/_/g, ' ').toLowerCase()] = { src, page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}` };
  }
  return map;
}

// 2. Không có trên Wiktionary → đoán tên file chuẩn trên Commons + tìm Lingua Libre.
async function commonsGuess(w) {
  const n = w.replace(/\s+/g, '_');
  const files = ['uk', 'gb', 'us'].flatMap((a) => [`En-${a}-${n}.ogg`, `En-${a}-${n}.oga`]).map((file) => ({ file, accent: accentOf('', file) }));
  const q = `intitle:"LL-Q1860 (eng)" intitle:"-${w}.wav"`;
  const d = await json(`${COMMONS}&list=search&srnamespace=6&srlimit=6&srsearch=${encodeURIComponent(q)}`);
  for (const r of d?.query?.search ?? []) if (r.title.toLowerCase().endsWith(`-${w.toLowerCase()}.wav`)) files.push({ file: r.title.replace(/^File:/, ''), accent: null });
  return files;
}

// 3. IPA dự phòng từ Free Dictionary API (chỉ lấy phiên âm; file âm thanh của họ bị chặn).
async function ipaFromDictionary(w) {
  const d = await json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
  if (!Array.isArray(d)) return null;
  for (const e of d) { const t = e.phonetic ?? e.phonetics?.find((p) => p.text)?.text; if (t && !/^\/-/.test(t)) return t; }
  return null;
}

const pending = new Map();
// Tra bản ghi + IPA cho một từ (bộ nhớ đệm 30 ngày). Trả về { uk, us, ll, ipa:{uk,us} }.
export function lookup(word) {
  const w = word.trim();
  const c = cached(w);
  if (c) return Promise.resolve(c);
  if (!pending.has(w)) {
    pending.set(w, (async () => {
      const wk = await fromWiktionary(w);
      let files = wk.files;
      if (!files.some((f) => f.accent)) files = [...files, ...(await commonsGuess(w))];
      const map = await resolveFiles(files.map((f) => f.file));
      const res = { uk: null, us: null, ll: null, ipa: wk.ipa, at: Date.now() };
      for (const f of files) {
        const hit = map[f.file.replace(/_/g, ' ').toLowerCase()];
        if (!hit) continue;
        const by = /^LL-/i.test(f.file) ? 'Lingua Libre' : 'Wiktionary · Wikimedia Commons';
        if (f.accent && !res[f.accent]) res[f.accent] = { ...hit, by };
        else if (!f.accent && !res.ll) res.ll = { ...hit, by };
      }
      if (!res.ipa.uk && !res.ipa.us) { const t = await ipaFromDictionary(w); if (t) res.ipa = { uk: t, us: t }; }
      if (!res.uk && !res.us && !res.ll) res.at = Date.now() - (CACHE_DAYS - 3) * 864e5; // không có bản ghi: thử lại sau 3 ngày
      try { localStorage.setItem(cacheKey(w), JSON.stringify(res)); } catch { /* đầy bộ nhớ: bỏ qua */ }
      pending.delete(w);
      return res;
    })());
  }
  return pending.get(w);
}

// ---- giọng máy dự phòng: chọn giọng tiếng Anh tốt nhất theo vùng ----
let voices = [];
const loadVoices = () => { voices = window.speechSynthesis?.getVoices() ?? []; };
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }
const GOOD = /natural|neural|premium|enhanced|siri|google|daniel|kate|serena|arthur|oliver|martha|samantha|ava|allison|susan|zoe|evan|nathan|tom|aaron|nicky|jenny|aria|guy|libby|sonia|ryan/i;
export function bestVoice(a = accent()) {
  if (!voices.length) loadVoices();
  const tag = a === 'us' ? 'en-us' : 'en-gb';
  const norm = (v) => v.lang.replace('_', '-').toLowerCase();
  const score = (v) => (norm(v) === tag ? 10 : norm(v).startsWith('en') ? 3 : -100)
    + (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (GOOD.test(v.name) ? 2 : 0)
    - (/compact|eloquence|grandma|grandpa|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|wobble|superstar|bahh|albert|fred|junior|ralph|rocko|eddy|flo|reed|sandy|shelley/i.test(v.name) ? 6 : 0);
  return [...voices].sort((x, y) => score(y) - score(x)).find((v) => score(v) > 0) ?? null;
}
export function speakTTS(text, rate = 0.9, a = accent()) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = bestVoice(a);
  u.lang = a === 'us' ? 'en-US' : 'en-GB';
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = rate;
  speechSynthesis.speak(u);
  return true;
}

let audioEl = null;
// Đọc một từ: ưu tiên bản ghi đúng giọng → giọng còn lại → Lingua Libre → giọng máy.
// Trả về mô tả nguồn đã dùng (để hiện "Giọng người thật · Anh Anh · Wiktionary").
export async function pronounce(word, a = accent()) {
  const r = cached(word.trim()) ?? await lookup(word);
  const other = a === 'uk' ? 'us' : 'uk';
  const pick = r[a] ? { ...r[a], accent: a } : r[other] ? { ...r[other], accent: other } : r.ll ? { ...r.ll, accent: null } : null;
  if (pick) {
    try {
      audioEl?.pause();
      audioEl = new Audio(pick.src);
      await audioEl.play();
      return { human: true, ...pick };
    } catch { /* lỗi mạng/định dạng → giọng máy */ }
  }
  speakTTS(word, 0.9, a);
  return { human: false, accent: a, voice: bestVoice(a)?.name ?? null };
}
