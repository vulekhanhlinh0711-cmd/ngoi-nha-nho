// P8.07, P11.07, P33: trợ lý AI — hai nhà cung cấp, khóa do bạn tự nhập:
//  · Gemini (Google AI Studio) — có gói MIỄN PHÍ (mặc định). Lưu ý: ở gói miễn phí Google có thể dùng nội dung gửi lên để cải thiện sản phẩm.
//  · Claude (Anthropic) — trả phí theo lượt, gọi bằng SDK chính thức.
// Khóa lưu trong cài đặt 'ai' (đồng bộ giữa các máy của bạn qua tài khoản đồng bộ, không lên web công khai).
import { getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm';
const CLAUDE_MODEL = 'claude-opus-5-5';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';

export async function aiSettings() { return { apiKey: '', geminiKey: '', provider: '', ...((await getSetting('ai')) ?? {}) }; }
// Nhà cung cấp đang dùng: theo lựa chọn; không chọn thì ưu tiên Gemini (miễn phí) nếu có khóa.
export async function provider() {
  const s = await aiSettings();
  if (s.provider === 'claude' && s.apiKey) return 'claude';
  if (s.provider === 'gemini' && s.geminiKey) return 'gemini';
  return s.geminiKey ? 'gemini' : s.apiKey ? 'claude' : null;
}
// Nhận diện khóa theo tiền tố: AIza… = Gemini, sk-ant-… = Claude.
export async function saveApiKey(key) {
  const k = key.trim();
  const s = await aiSettings();
  if (!k) { await setSetting('ai', { ...s, apiKey: '', geminiKey: '', provider: '' }); notifyChange(); return null; }
  const p = k.startsWith('sk-ant') ? 'claude' : 'gemini'; // Gemini: AIza… hoặc dạng mới AQ.…
  await setSetting('ai', { ...s, [p === 'gemini' ? 'geminiKey' : 'apiKey']: k, provider: p });
  notifyChange();
  return p;
}
export async function setProvider(p) { await setSetting('ai', { ...(await aiSettings()), provider: p }); notifyChange(); }
export async function hasKey() { return !!(await provider()); }

// ---------- Gemini ----------
let geminiModels = null; // danh sách ứng viên, tốt nhất trước
let geminiWorking = null; // mô hình vừa trả lời được
async function geminiCandidates(key) {
  if (geminiModels) return geminiModels;
  const ver = (n) => Number(n.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  let names = [];
  try {
    const r = await fetch(`${GEMINI_API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    names = ((await r.json()).models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''));
  } catch { /* dùng danh sách mặc định */ }
  // Ưu tiên bản "flash" ổn định mới nhất (nhanh, có gói miễn phí); dự phòng: alias latest, rồi bản lite.
  const stable = names.filter((n) => /^gemini-\d+(\.\d+)?-flash$/.test(n)).sort((x, y) => ver(y) - ver(x));
  const lite = names.filter((n) => /^gemini-\d+(\.\d+)?-flash-lite$/.test(n)).sort((x, y) => ver(y) - ver(x));
  geminiModels = [...new Set([...stable, 'gemini-flash-latest', ...lite, 'gemini-flash-lite-latest'])];
  return geminiModels;
}
async function pickGeminiModel(key) { return geminiWorking ?? (await geminiCandidates(key))[0]; }

function geminiError(status, body) {
  const msg = body?.error?.message ?? '';
  if (status === 400 && /API key/i.test(msg)) return 'Khóa Gemini không hợp lệ.';
  if (status === 404) return 'Gemini đang quá tải (miễn phí nên đôi lúc đông). Thử lại sau ít phút.';
  if (status === 403) return 'Khóa Gemini chưa được phép dùng Gemini API (kiểm tra lại project của khóa).';
  if (status === 429) return 'Đã chạm giới hạn miễn phí của Gemini. Thử lại sau ít phút (hoặc ngày mai).';
  if (status >= 500) return 'Gemini đang quá tải (miễn phí nên đôi lúc đông). Thử lại sau ít phút.';
  return msg || `Gemini lỗi ${status}.`;
}

async function askGemini({ system, messages, onText, maxTokens }) {
  const key = (await aiSettings()).geminiKey;
  const body = {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: maxTokens },
  };
  // Thử lần lượt các mô hình: quá tải (503) hoặc đã ngừng (404) thì chuyển sang mô hình kế tiếp.
  const list = await geminiCandidates(key);
  const order = geminiWorking ? [geminiWorking, ...list.filter((m) => m !== geminiWorking)] : list;
  let res = null; let lastErr = null;
  // Thử tối đa 3 vòng (cách nhau 2s, 5s) — Gemini hay quá tải tạm thời vài giây.
  for (let round = 0; round < 3 && !res; round++) {
  if (round) await new Promise((r) => setTimeout(r, round === 1 ? 2000 : 5000));
  for (const model of order.slice(0, 6)) {
    res = await fetch(`${GEMINI_API}/models/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) { geminiWorking = model; break; }
    lastErr = geminiError(res.status, await res.json().catch(() => ({})));
    if (![404, 500, 503].includes(res.status)) throw new Error(lastErr);
    res = null;
  }
  }
  if (!res) throw new Error(lastErr ?? 'Gemini đang bận. Thử lại sau ít phút.');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = ''; let text = ''; let finish = null; let blocked = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let d; try { d = JSON.parse(line.slice(5)); } catch { continue; }
      if (d.promptFeedback?.blockReason) blocked = true;
      const c = d.candidates?.[0];
      if (c?.finishReason) finish = c.finishReason;
      const t = (c?.content?.parts ?? []).map((p) => p.text ?? '').join('');
      if (t) { text += t; onText?.(t); }
    }
  }
  if (blocked || (!text && /SAFETY|BLOCK|PROHIBITED/.test(finish ?? ''))) return { text: '', refused: true };
  return { text, truncated: finish === 'MAX_TOKENS' };
}

// ---------- Claude ----------
let sdk = null;
function claudeError(err) {
  const s = err?.status;
  if (s === 401) return 'Khóa Claude không hợp lệ.';
  if (s === 429) return 'Đang bị giới hạn số lượt gọi. Thử lại sau ít phút.';
  if (s >= 500) return 'Máy chủ Claude đang bận. Thử lại sau.';
  if (err instanceof TypeError) return 'Không kết nối được. Kiểm tra mạng.';
  return err?.message ?? 'Có lỗi xảy ra.';
}
async function askClaude({ system, messages, onText, effort, maxTokens }) {
  try {
    const key = (await aiSettings()).apiKey;
    sdk ??= (await import(SDK_URL)).default;
    // dangerouslyAllowBrowser: khóa nằm trong trình duyệt — chấp nhận được vì app chỉ chạy riêng cho bạn.
    const c = new sdk({ apiKey: key, dangerouslyAllowBrowser: true });
    const stream = c.beta.messages.stream({
      model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages,
      output_config: { effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    });
    if (onText) stream.on('text', onText);
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') return { text: '', refused: true };
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return { text, truncated: msg.stop_reason === 'max_tokens' };
  } catch (err) { throw new Error(claudeError(err)); }
}

// Gửi hội thoại, stream chữ về qua onText. Trả về { text, refused?, truncated? }.
export async function ask({ system, messages, onText, effort = 'low', maxTokens = 4000 }) {
  const p = await provider();
  if (!p) throw new Error('Chưa có khóa AI. Vào Cài đặt → Trợ lý AI để nhập.');
  try {
    return p === 'gemini' ? await askGemini({ system, messages, onText, maxTokens }) : await askClaude({ system, messages, onText, effort, maxTokens });
  } catch (err) {
    if (err instanceof TypeError) throw new Error('Không kết nối được. Kiểm tra mạng.');
    throw err;
  }
}

export async function modelLabel() {
  const p = await provider();
  if (p === 'gemini') return `Google Gemini (${await pickGeminiModel((await aiSettings()).geminiKey)}, miễn phí)`;
  if (p === 'claude') return `Claude (${CLAUDE_MODEL})`;
  return 'chưa kết nối';
}
export const MODEL = CLAUDE_MODEL;
