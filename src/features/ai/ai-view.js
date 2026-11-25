// P8.07: trò chuyện với AI dựa trên tóm tắt tuần (chỉ số liệu tổng hợp, không gửi nhật ký/tài chính/tên việc).
// P11.07: tóm tắt tin tức bạn dán vào, kèm phân tích tác động có thể có.
import { h, mount } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { weeklyReview } from '../assistant/assistant.js';
import { ask, hasKey, saveApiKey, modelLabel } from './claude.js';

let chat = []; // chỉ trong bộ nhớ, tải lại trang là mất
let busy = false;

// Bản tóm tắt gửi kèm: chỉ con số và tên thói quen.
export async function contextSummary() {
  const r = await weeklyReview();
  return [
    `Tuần ${r.start} – ${r.end}:`,
    `- Việc hoàn thành: ${r.tasksDone}`,
    `- Phiên tập trung: ${r.tomatoes} (${r.focusMin} phút), bị gián đoạn ${r.interruptions} lần`,
    `- Ngày uống đủ nước: ${r.waterDays}/7`,
    `- Thói quen: ${r.habits.map((x) => `${x.name} ${x.days}/7`).join(', ')}`,
    `- Số trang nhật ký đã viết: ${r.journal} (không gửi nội dung)`,
    r.moodAvg ? `- Cảm xúc trung bình: ${r.moodAvg.toFixed(1)}/5` : null,
  ].filter(Boolean).join('\n');
}

const SYSTEM = 'Bạn là trợ lý cá nhân dịu dàng trong một app quản lý thói quen kiểu "chữa lành". Trả lời bằng tiếng Việt, ngắn gọn, ấm áp, thực tế. Không phán xét, không gây cảm giác tội lỗi; khen hành động hơn con số. Khi được nhờ sắp xếp việc, đề xuất thứ tự và khung giờ cụ thể, ưu tiên việc quan trọng vào khung yên tĩnh. Không đưa lời khuyên y tế hay tài chính chuyên sâu; khi cần, gợi ý hỏi chuyên gia.';

export function keyCard() {
  return h('section', { class: 'card' },
    h('h3', {}, '🔑 Cần khóa AI'),
    h('p', { class: 'muted small' }, 'Miễn phí: tạo khóa Gemini ở aistudio.google.com/apikey (bắt đầu bằng AIza…). Hoặc khóa Claude (sk-ant-…, trả phí). Dán vào đây — khóa được đồng bộ sang các máy của bạn.'),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const v = e.target.elements.k.value.trim();
        if (!v) return;
        const p = await saveApiKey(v);
        toast(p === 'gemini' ? 'Đã lưu khóa Gemini (miễn phí)' : 'Đã lưu khóa Claude');
      },
    }, h('input', { class: 'input', name: 'k', type: 'password', autocomplete: 'off', placeholder: 'AIza… hoặc sk-ant-…', 'aria-label': 'Khóa AI' }), h('button', { class: 'btn', type: 'submit' }, 'Lưu')));
}

async function send(text, includeContext) {
  if (busy || !text.trim()) return;
  busy = true;
  const first = chat.length === 0;
  const content = first && includeContext ? `${await contextSummary()}\n\n${text}` : text;
  chat.push({ role: 'user', content, shown: text });
  chat.push({ role: 'assistant', content: '', shown: '' });
  notifyChange();
  const reply = chat.at(-1);
  try {
    const r = await ask({
      system: SYSTEM,
      messages: chat.slice(0, -1).map(({ role, content: c }) => ({ role, content: c })),
      onText: (t) => {
        reply.content += t; reply.shown += t;
        const el = document.querySelector('.chat .msg.assistant:last-child .msg-text');
        if (el) el.textContent = reply.shown;
      },
    });
    if (r.refused) { reply.shown = 'Mình không thể trả lời câu này. Bạn thử hỏi cách khác nhé.'; reply.content = reply.shown; }
    else { reply.content = r.text; reply.shown = r.text + (r.truncated ? ' …(bị cắt bớt)' : ''); }
  } catch (err) {
    chat = chat.slice(0, -2);
    toast(err.message, { duration: 8000 });
  } finally {
    busy = false;
    notifyChange();
  }
}

export async function renderAi(root) {
  const head = h('div', { class: 'view-head' }, h('h2', {}, '💬 Trò chuyện với trợ lý AI'),
    h('p', { class: 'muted' }, `Đang dùng: ${await modelLabel()}. Dữ liệu chỉ gửi đi khi bạn bấm Gửi.`));
  if (!(await hasKey())) { mount(root, head, keyCard()); return; }
  const preview = await contextSummary();
  const input = h('textarea', { class: 'input', rows: '3', placeholder: 'VD: Chiều nay sắp xếp giúp mình 3 việc: viết báo cáo, gọi khách, đi siêu thị', 'aria-label': 'Tin nhắn' });
  const ctx = h('input', { type: 'checkbox', checked: true });
  mount(root, head,
    chat.length === 0 ? h('details', { class: 'card' },
      h('summary', {}, '🔒 Xem dữ liệu sẽ gửi kèm tin nhắn đầu tiên'),
      h('pre', { class: 'ctx-preview' }, preview),
      h('p', { class: 'muted small' }, 'Không gửi: nội dung nhật ký, số tiền, tên việc, ảnh, số đo. Hội thoại không được lưu lại.')) : null,
    h('section', { class: 'card chat', 'aria-live': 'polite' },
      chat.length ? chat.map((m) => h('div', { class: `msg ${m.role}` }, h('div', { class: 'msg-text' }, m.shown || (busy ? '…' : '')))) :
        h('p', { class: 'muted small' }, 'Gợi ý: “Tuần này mình nên cải thiện điều gì?”, “Sắp xếp giúp mình các việc chiều nay”, “Cho mình một lời động viên”.')),
    h('form', {
      class: 'chat-form', onsubmit: (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v, ctx.checked); },
    }, input,
      h('div', { class: 'presets' },
        chat.length === 0 ? h('label', { class: 'field-inline' }, ctx, 'Gửi kèm tóm tắt tuần') : null,
        h('button', { class: 'btn', type: 'submit', disabled: busy }, busy ? 'Đang trả lời…' : 'Gửi'),
        chat.length ? h('button', { class: 'chip', type: 'button', onclick: () => { chat = []; notifyChange(); } }, 'Cuộc trò chuyện mới') : null)));
}

// ---- P11.07: tóm tắt tin tức đã dán ----
const NEWS_SYSTEM = 'Bạn tóm tắt tin kinh tế – xã hội cho người đọc phổ thông Việt Nam. Trả lời bằng tiếng Việt, gồm: (1) Tóm tắt 3–5 gạch đầu dòng; (2) Tác động có thể có tới túi tiền người dân (giá cả, lãi suất, tỷ giá, việc làm) — nói rõ đây là khả năng, không phải dự đoán chắc chắn; (3) Một câu nên theo dõi tiếp điều gì. Không khuyên mua/bán tài sản cụ thể. Chỉ dựa trên nội dung được cung cấp; nếu thiếu thông tin thì nói rõ.';
let newsOut = '';
export function newsCard() {
  const area = h('textarea', { class: 'input', rows: '6', placeholder: 'Dán nội dung một bài báo (chữ, không phải link)…', 'aria-label': 'Nội dung tin tức' });
  const out = h('div', { class: 'news-out' }, newsOut);
  return h('section', { class: 'card' },
    h('h3', {}, '📰 Tóm tắt tin tức bằng AI'),
    h('p', { class: 'muted small' }, 'Dán nội dung bài báo bạn đọc được; AI tóm tắt và phân tích tác động có thể có. Cần khóa API (Cài đặt → Trợ lý AI).'),
    area,
    h('button', {
      class: 'btn', onclick: async (e) => {
        const btn = e.currentTarget; // currentTarget thành null sau await
        const text = area.value.trim();
        if (text.length < 80) { toast('Dán nội dung bài báo dài hơn một chút nhé'); return; }
        if (!(await hasKey())) { toast('Chưa có khóa AI. Vào Cài đặt → Trợ lý AI.'); return; }
        btn.disabled = true;
        out.textContent = '…';
        try {
          let acc = '';
          const r = await ask({ system: NEWS_SYSTEM, messages: [{ role: 'user', content: text }], effort: 'low', onText: (t) => { acc += t; out.textContent = acc; } });
          newsOut = r.refused ? 'Không tóm tắt được bài này.' : r.text;
          out.textContent = newsOut;
        } catch (err) { out.textContent = ''; toast(err.message, { duration: 8000 }); }
        btn.disabled = false;
      },
    }, 'Tóm tắt'),
    out);
}
