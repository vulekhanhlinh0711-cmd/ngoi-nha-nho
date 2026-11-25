// P5.01–P5.02: đọc số tiền tiếng Việt, đoán danh mục, lưu thu chi.
import { put, del, getAllByIndex, getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange, queryEvents, deleteEvent } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { normalize } from '../food/foods.js';

// "45k" 45.000 · "1tr2" 1.200.000 · "15 triệu" · "200 nghìn" · "1,5tr" · "50.000" · "2 tỷ"
const UNIT = { k: 1e3, nghin: 1e3, ngan: 1e3, n: 1e3, tr: 1e6, trieu: 1e6, cu: 1e6, ty: 1e9, xi: 1e9 };
const MONEY_RE = /(?<![\p{L}\d])(\d+(?:[.,]\d+)*)\s*(k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|củ|cu|tỷ|ty|tỉ|ti|đ|d|vnd|vnđ)?(\d{1,3})?(?![\p{L}\d])/iu;

export function parseAmount(text) {
  const m = MONEY_RE.exec(text);
  if (!m) return null;
  let [, num, unit = '', tail] = m;
  const u = normalize(unit).replace('ti', 'ty');
  let value;
  if (UNIT[u]) {
    value = Number(num.replace(',', '.')) * UNIT[u];
    // "1tr2" = 1,2 triệu; "1tr250" = 1.250.000
    if (tail) value += Number(tail) * UNIT[u] / 10 ** tail.length;
  } else {
    if (tail) return null;
    // "50.000" hoặc "50,000" là phân cách hàng nghìn
    value = /^\d{1,3}([.,]\d{3})+$/.test(num) ? Number(num.replace(/[.,]/g, '')) : Number(num.replace(',', '.'));
  }
  if (!(value > 0)) return null;
  return { amount: Math.round(value), index: m.index, length: m[0].length };
}

// Từ khóa (không dấu) ngăn bởi dấu phẩy; mỗi cụm phải khớp nguyên cụm.
export const CATEGORIES = {
  expense: [
    ['food', '🍜 Ăn uống', 'ca phe,cafe,tra sua,com,pho,bun,an trua,an toi,an sang,an vat,nha hang,banh,do an,mi,lau,che,kem,tra chanh,nuoc ngot,sinh to,bia,highlands,starbucks'],
    ['transport', '🛵 Đi lại', 'xang,grab,be,gojek,taxi,xe buyt,bus,gui xe,ve may bay,ve tau,sua xe,rua xe'],
    ['home', '🏠 Nhà cửa', 'tien nha,thue nha,tien dien,dien,tien nuoc,internet,wifi,gas,sua nha,do gia dung,phi chung cu'],
    ['shopping', '🛍️ Mua sắm', 'quan ao,ao,quan,vay,giay,tui,my pham,shopee,lazada,tiki,tiktok shop,son,dong ho,phu kien'],
    ['health', '💊 Sức khỏe', 'thuoc,kham,benh vien,nha khoa,gym,yoga,bao hiem'],
    ['learning', '📚 Học tập', 'sach,khoa hoc,hoc phi,ielts,tieng anh,lop hoc'],
    ['fun', '🎬 Giải trí', 'phim,netflix,spotify,youtube premium,du lich,game,concert,karaoke'],
    ['family', '🎁 Gia đình & quà', 'qua,bieu,mung,hieu hi,dam cuoi,sinh nhat,bo me,cho con'],
    ['bills', '🧾 Hóa đơn & trả góp', 'tra gop,the tin dung,hoa don,cuoc dien thoai,tra no'],
    ['other', '✳️ Khác', ''],
  ],
  income: [
    ['salary', '💼 Lương', 'luong'],
    ['bonus', '🎉 Thưởng', 'thuong'],
    ['side', '🧑‍💻 Làm thêm', 'lam them,freelance,ban hang,job phu'],
    ['other-in', '✳️ Thu khác', 'hoan tien,duoc cho,lai tiet kiem'],
  ],
};
export const catOf = (type, id) => CATEGORIES[type]?.find((c) => c[0] === id) ?? CATEGORIES[type].at(-1);
export const allCats = () => [...CATEGORIES.expense, ...CATEGORIES.income];

// Cụm dài khớp trước ("tien nha" thắng "nha hang"/"an").
export function guessCategory(note, type) {
  const n = ` ${normalize(note).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  let best = null;
  for (const [id, , words] of CATEGORIES[type]) {
    for (const w of words ? words.split(',') : []) {
      if (n.includes(` ${w} `) && (!best || w.length > best.len)) best = { id, len: w.length };
    }
  }
  return best?.id ?? CATEGORIES[type].at(-1)[0];
}

const INCOME_WORDS = /^(?:\+|thu\b)|\b(lương|luong|thưởng|thuong|làm thêm|lam them|freelance|hoàn tiền|hoan tien|được cho|duoc cho)\b/i;

// "cà phê 45k" → chi 45.000 ăn uống · "lương 15tr" → thu 15.000.000 lương
export function parseTx(text) {
  const a = parseAmount(text);
  if (!a) return null;
  const note = `${text.slice(0, a.index)} ${text.slice(a.index + a.length)}`.replace(/^\s*[+-]\s*/, '').replace(/\s+/g, ' ').trim();
  const type = INCOME_WORDS.test(text.trim()) ? 'income' : 'expense';
  return { type, amount: a.amount, note, category: guessCategory(note, type) };
}

export const fmtVND = (n) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
export function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (a >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (a >= 1e3) return `${Math.round(n / 1e3).toLocaleString('vi-VN')}k`;
  return `${n}`;
}

// ---- Lưu trữ (bảng finance, phân loại bằng trường kind) ----
export const listKind = (kind) => getAllByIndex('finance', 'kind', kind);
export async function saveItem(item) {
  const id = await put('finance', item);
  notifyChange();
  return id;
}
export async function removeItem(id) {
  await del('finance', id);
  notifyChange();
}

export async function addTx({ type, amount, category, note = '', day = todayKey(), photoId = null, jar = null }) {
  const id = await put('finance', { kind: 'tx', type, amount, category, note, day, photoId, ...(jar && type === 'expense' ? { jar } : {}), at: new Date().toISOString() });
  // Chỉ ghi nhận hành động ghi chép (không ghi số tiền vào nhật ký sự kiện).
  await logEvent('money_logged', { day });
  // Có khoản chi thì ngày đó không còn là "ngày không chi tiêu".
  if (type === 'expense') {
    for (const e of await queryEvents('no_spend_day')) if (e.day === day) await deleteEvent(e.id);
  }
  notifyChange();
  return id;
}

export const monthOf = (day) => day.slice(0, 7);
export async function txInMonth(month) {
  return (await listKind('tx')).filter((t) => monthOf(t.day) === month);
}

export async function getFinanceSettings() {
  return { payday: 5, ...((await getSetting('finance')) ?? {}) };
}
export const saveFinanceSettings = async (s) => { await setSetting('finance', s); notifyChange(); };
