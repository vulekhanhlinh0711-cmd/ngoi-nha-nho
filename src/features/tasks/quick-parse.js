// P1.04: đọc câu ghi nhanh tiếng Việt.
//   "họp với sếp 15h mai"      → ngày mai, 15:00
//   "!gọi ngân hàng thứ 5"     → quan trọng, thứ 5 tới
//   "!!nộp báo cáo 20/11 9h30" → quan trọng + gấp, 20/11 09:30
// Không chắc thì để nguyên chữ: ô xem trước cho người dùng thấy app hiểu thế nào.
import { addDays, nextWeekday, makeKey, isValidDate } from '../../core/dates.js';

// Ranh giới từ hỗ trợ chữ có dấu (\b của JS chỉ hiểu chữ Latin không dấu).
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const PRE = '(?:(?:lúc|vào|ngày|hạn)\\s+)?';
const WORD_DAYS = { hai: 1, ba: 2, 'tư': 3, 'năm': 4, 'sáu': 5, 'bảy': 6 };

const DATE_RULES = [
  [new RegExp(`${B}${PRE}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2}|\\d{4}))?${E}`, 'iu'), (m, base) => {
    const d = +m[1], mo = +m[2];
    let y = m[3] ? +m[3] : +base.slice(0, 4);
    if (y < 100) y += 2000;
    if (!isValidDate(y, mo, d)) return null;
    const key = makeKey(y, mo, d);
    // Không ghi năm mà ngày đã qua → hiểu là năm sau.
    return !m[3] && key < base ? makeKey(y + 1, mo, d) : key;
  }],
  [new RegExp(`${B}${PRE}(?:hôm nay|bữa nay)${E}`, 'iu'), (m, base) => base],
  // "mai" viết thường mới tính, để không nhầm tên người như "chị Mai".
  [new RegExp(`${B}(?:(?:lúc|vào|hạn)\\s+)?(?:[Nn]gày\\s+mai|mai)${E}`, 'u'), (m, base) => addDays(base, 1)],
  [new RegExp(`${B}${PRE}(?:ngày kia|ngày mốt|mốt)${E}`, 'iu'), (m, base) => addDays(base, 2)],
  [new RegExp(`${B}${PRE}(?:tuần sau|tuần tới)${E}`, 'iu'), (m, base) => nextWeekday(base, 1)],
  [new RegExp(`${B}${PRE}(?:thứ\\s*(hai|ba|tư|năm|sáu|bảy|[2-7])|t([2-7]))${E}`, 'iu'), (m, base) => {
    const w = m[1] ? m[1].toLowerCase() : m[2];
    return nextWeekday(base, /\d/.test(w) ? +w - 1 : WORD_DAYS[w]);
  }],
  [new RegExp(`${B}${PRE}(?:chủ nhật|cn)${E}`, 'iu'), (m, base) => nextWeekday(base, 0)],
];

const TIME_RULE = new RegExp(
  `${B}(?:(?:lúc|vào)\\s+)?(\\d{1,2})` +
  `(?:\\s*(?:h|g|giờ)\\s*(\\d{1,2}|rưỡi)?(?:\\s*(?:phút|p))?|:(\\d{2}))` +
  `(?:\\s+(sáng|trưa|chiều|tối|đêm))?${E}`, 'iu');

function readTime(m) {
  let h = +m[1];
  const mm = m[2] === undefined ? m[3] : m[2];
  const min = mm === undefined ? 0 : /rưỡi/i.test(mm) ? 30 : +mm;
  const part = m[4]?.toLowerCase();
  if ((part === 'chiều' || part === 'tối') && h < 12) h += 12;
  else if (part === 'trưa' && h < 6) h += 12;
  else if (part === 'đêm' && h >= 6 && h < 12) h += 12;
  else if ((part === 'sáng' || part === 'đêm') && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const cut = (text, m) => `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;

export function parseQuick(input, base) {
  let text = input;
  const out = { important: false, urgent: false, dueDate: null, dueTime: null, project: null };

  // P12.01: "#Tên" = gắn project (gạch dưới/gạch ngang thay cho dấu cách, ví dụ #Nhà_mới).
  const tag = /(?<=^|\s)#([\p{L}\p{N}_-]{1,40})(?![\p{L}\p{N}])/u.exec(text);
  if (tag) { out.project = tag[1]; text = cut(text, tag); }

  // Dấu ! đầu từ: một dấu = quan trọng, hai dấu = quan trọng và gấp.
  const bang = /(?<=^|\s)(!{1,3})(?=\S|$)/u.exec(text) ?? /(?<=^|\s)(!{1,3})(?=\s|$)/u.exec(text);
  if (bang) {
    out.important = true;
    out.urgent = bang[1].length >= 2;
    text = cut(text, bang);
  }

  for (const [re, read] of DATE_RULES) {
    const m = re.exec(text);
    const key = m && read(m, base);
    if (key) { out.dueDate = key; text = cut(text, m); break; }
  }

  const tm = TIME_RULE.exec(text);
  const time = tm && readTime(tm);
  if (time) { out.dueTime = time; text = cut(text, tm); }

  out.title = text.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1')
    .replace(/^[\s,–-]+|[\s,–-]+$/g, '').trim();
  // Chỉ gõ mỗi "mai" hay "15h" thì giữ nguyên làm tiêu đề, không hiểu là ngày/giờ.
  if (!out.title) {
    return { title: input.replace(/\s+/g, ' ').trim(), important: false, urgent: false, dueDate: null, dueTime: null, project: null };
  }
  if (out.dueTime && !out.dueDate) out.dueDate = base;
  // Hạn trong hôm nay hoặc mai thì mặc định là gấp.
  if (out.dueDate && out.dueDate <= addDays(base, 1)) out.urgent = true;
  return out;
}
