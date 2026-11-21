// P11.03–P11.06, P11.08: số liệu thị trường (nhập tay) và các công cụ tính toán.
import { getSetting, setSetting } from '../../core/db.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';

export const SERIES = [
  { key: 'sjc_buy', name: 'Vàng SJC – mua vào', unit: 'triệu đ/lượng', group: 'gold' },
  { key: 'sjc_sell', name: 'Vàng SJC – bán ra', unit: 'triệu đ/lượng', group: 'gold' },
  { key: 'ring_buy', name: 'Vàng nhẫn – mua vào', unit: 'triệu đ/lượng', group: 'gold' },
  { key: 'ring_sell', name: 'Vàng nhẫn – bán ra', unit: 'triệu đ/lượng', group: 'gold' },
  { key: 'world_gold', name: 'Vàng thế giới', unit: 'USD/ounce', group: 'gold' },
  { key: 'usdvnd', name: 'Tỷ giá USD/VND (bán ra)', unit: 'đ', group: 'fx' },
  { key: 'cpi', name: 'Lạm phát CPI so với cùng kỳ', unit: '%', group: 'macro' },
];
export const MEANING = {
  sjc_sell: 'Giá bạn phải trả khi mua 1 lượng vàng miếng. Mua rồi bán lại ngay sẽ lỗ đúng bằng chênh lệch mua – bán.',
  sjc_buy: 'Giá cửa hàng mua lại từ bạn. Khi bán vàng, đây mới là số tiền bạn nhận.',
  ring_sell: 'Vàng nhẫn thường có chênh lệch mua – bán thấp hơn vàng miếng.',
  ring_buy: 'Giá bán lại vàng nhẫn.',
  world_gold: 'Giá vàng quốc tế tính bằng USD/ounce (1 lượng ≈ 1,2057 ounce). Giá trong nước thường cao hơn giá thế giới quy đổi.',
  usdvnd: 'Tỷ giá tăng → đồ nhập khẩu, du lịch nước ngoài, học phí du học có xu hướng đắt hơn.',
  cpi: 'Nếu lãi tiết kiệm thấp hơn con số này, tiền gửi đang mất sức mua.',
};
export const OZ_PER_LUONG = 37.5 / 31.1035;

export async function getMarket() {
  return { series: {}, banks: [], alerts: {}, ...((await getSetting('market')) ?? {}) };
}
const save = async (m) => { await setSetting('market', m); notifyChange(); };

export const latest = (m, key) => m.series[key]?.at(-1)?.v ?? null;

// Ghi số liệu; trả về danh sách cảnh báo giá bị chạm (P11.06).
export async function addPoint(key, v, day = todayKey()) {
  const m = await getMarket();
  const list = (m.series[key] ?? []).filter((p) => p.day !== day);
  list.push({ day, v });
  list.sort((a, b) => (a.day < b.day ? -1 : 1));
  m.series[key] = list;
  await save(m);
  const a = m.alerts[key];
  const hits = [];
  if (a?.above != null && v >= a.above) hits.push(`${SERIES.find((s) => s.key === key).name} đã lên ${v} (≥ ${a.above})`);
  if (a?.below != null && v <= a.below) hits.push(`${SERIES.find((s) => s.key === key).name} đã xuống ${v} (≤ ${a.below})`);
  return hits;
}
export async function setAlert(key, above, below) {
  const m = await getMarket();
  m.alerts[key] = { above, below };
  await save(m);
}
export async function saveBanks(banks) {
  const m = await getMarket();
  m.banks = banks;
  await save(m);
}

// P11.06: phân tích vàng.
export function goldAnalysis(m) {
  const buy = latest(m, 'sjc_buy'), sell = latest(m, 'sjc_sell');
  const rBuy = latest(m, 'ring_buy'), rSell = latest(m, 'ring_sell');
  const world = latest(m, 'world_gold'), fx = latest(m, 'usdvnd');
  const worldVnd = world && fx ? (world * fx * OZ_PER_LUONG) / 1e6 : null; // triệu đ/lượng
  return {
    spread: buy && sell ? sell - buy : null,
    spreadPct: buy && sell ? ((sell - buy) / sell) * 100 : null,
    ringSpread: rBuy && rSell ? rSell - rBuy : null,
    worldVnd,
    premium: worldVnd && sell ? sell - worldVnd : null,
  };
}

// P11.04: so sánh tiết kiệm (lãi trả cuối kỳ).
export function savingsCompare(amount, months, rate, cpi) {
  const interest = amount * (rate / 100) * (months / 12);
  const realRate = cpi != null ? rate - cpi : null;
  const realGain = realRate != null ? amount * (realRate / 100) * (months / 12) : null;
  return { interest: Math.round(interest), realRate, realGain: realGain != null ? Math.round(realGain) : null };
}

// P11.05: lịch trả nợ. method: 'declining' (gốc đều, lãi trên dư nợ giảm dần) hoặc 'flat' (lãi trên gốc ban đầu).
// rates: mảng lãi suất %/năm cho từng tháng (để mô phỏng ưu đãi rồi thả nổi).
export function loanSchedule(amount, months, ratesByMonth, method = 'declining') {
  const principal = amount / months;
  let bal = amount;
  const pays = [];
  for (let i = 0; i < months; i++) {
    const r = ratesByMonth[i] / 100 / 12;
    const interest = method === 'flat' ? amount * r : bal * r;
    pays.push(principal + interest);
    bal -= principal;
  }
  return pays;
}
// Lãi suất thực tế năm (IRR) từ số tiền thực nhận và các kỳ trả.
export function effectiveRate(received, pays) {
  const npv = (r) => pays.reduce((s, p, i) => s + p / (1 + r) ** (i + 1), 0) - received;
  let lo = 0, hi = 1;
  if (npv(0) < 0) return 0;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
  return ((1 + lo) ** 12 - 1) * 100;
}
export function loanCompare({ amount, months, fixedRate, promoRate, promoMonths, floatRate, feePct = 0, insurance = 0, method = 'declining' }) {
  const fees = amount * (feePct / 100) + insurance;
  const build = (rates) => {
    const pays = loanSchedule(amount, months, rates, method);
    const total = pays.reduce((s, p) => s + p, 0);
    return { first: pays[0], max: Math.max(...pays), totalInterest: total - amount, totalCost: total - amount + fees, apr: effectiveRate(amount - fees, pays) };
  };
  const fixed = fixedRate != null ? build(Array(months).fill(fixedRate)) : null;
  const floating = promoRate != null && floatRate != null
    ? build(Array.from({ length: months }, (_, i) => (i < promoMonths ? promoRate : floatRate))) : null;
  return { fixed, floating, fees };
}

// P11.08: phát hiện "nâng giá rồi giảm".
export function fakeDiscount(prices) {
  if (prices.length < 3) return null;
  const last = prices.at(-1).price;
  let peakIdx = 0;
  prices.slice(0, -1).forEach((p, i) => { if (p.price >= prices[peakIdx].price) peakIdx = i; });
  const peak = prices[peakIdx].price;
  const before = prices.slice(0, peakIdx);
  if (!before.length) return null;
  const baseline = Math.min(...before.map((p) => p.price));
  if (peak >= baseline * 1.1 && last < peak && last >= baseline * 0.98) {
    return { baseline, peak, last, claimed: Math.round(((peak - last) / peak) * 100) };
  }
  return null;
}

// P11.02: tỷ giá tự động từ ExchangeRate-API (truy cập mở, không cần khóa).
// Điều khoản: phải ghi nguồn "Rates By Exchange Rate API", lưu lại dùng trong ngày, không phân phối lại.
// Chỉ gọi khi bạn bấm, tối đa 1 lần/ngày (dữ liệu nguồn cập nhật 1 lần/ngày).
export const FX_SOURCE = { label: 'Rates By Exchange Rate API', url: 'https://www.exchangerate-api.com' };
export async function fetchUsdVnd() {
  const m = await getMarket();
  const today = todayKey();
  if (m.fxFetchedOn === today) return { rate: latest(m, 'usdvnd'), cached: true };
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (res.status === 429) throw new Error('Nguồn tỷ giá đang giới hạn lượt gọi, thử lại sau 20 phút.');
  const data = await res.json();
  const rate = data?.result === 'success' ? data.rates?.VND : null;
  if (!rate) throw new Error('Không lấy được tỷ giá USD/VND.');
  await addPoint('usdvnd', Math.round(rate), today);
  const m2 = await getMarket();
  m2.fxFetchedOn = today;
  await setSetting('market', m2);
  notifyChange();
  return { rate: Math.round(rate), cached: false };
}
