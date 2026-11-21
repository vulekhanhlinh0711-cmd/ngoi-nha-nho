// P16.02: nền theo mùa và lễ hội. Mặc định tự đổi theo ngày; có thể chọn tay trong Cài đặt.
import { getSetting } from './db.js';

// Tết Nguyên đán (mùng 1) các năm tới.
const TET = { 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23' };
// Trung thu (rằm tháng 8 âm lịch).
const MID_AUTUMN = { 2027: '2027-09-15', 2028: '2028-10-03', 2029: '2029-09-22', 2030: '2030-09-12' };

export const SEASONS = [
  { id: 'noel', name: 'Giáng sinh', icon: '🎄' },
  { id: 'tet', name: 'Tết', icon: '🧧' },
  { id: 'valentine', name: 'Valentine', icon: '💝' },
  { id: 'midautumn', name: 'Trung thu', icon: '🏮' },
  { id: 'halloween', name: 'Halloween', icon: '🎃' },
  { id: 'spring', name: 'Mùa xuân', icon: '🌸' },
  { id: 'summer', name: 'Mùa hè', icon: '🌊' },
  { id: 'autumn', name: 'Mùa thu', icon: '🍂' },
  { id: 'winter', name: 'Mùa đông', icon: '❄️' },
];

const days = (a, b) => Math.round((new Date(`${b}T00:00`) - new Date(`${a}T00:00`)) / 86_400_000);

export function seasonFor(date = new Date()) {
  const y = date.getFullYear();
  const pad = (n) => String(n).padStart(2, '0');
  const key = `${y}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const md = key.slice(5);
  const near = (map, before, after) => { const d = map[y]; if (!d) return false; const n = days(d, key); return n >= -before && n <= after; };
  if (near(TET, 10, 7) || near({ [y]: TET[y + 1] }, 10, 7)) return 'tet';
  if (md >= '11-15' && md <= '12-27') return 'noel';
  if (md >= '02-10' && md <= '02-14') return 'valentine';
  if (near(MID_AUTUMN, 7, 1)) return 'midautumn';
  if (md >= '10-24' && md <= '10-31') return 'halloween';
  const m = date.getMonth() + 1;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

export async function currentSeason() {
  const pref = (await getSetting('seasonPref')) ?? 'auto';
  return pref === 'auto' ? seasonFor() : pref;
}

export async function applySeason() {
  const s = await currentSeason();
  const root = document.documentElement;
  if (root.dataset.season !== s) root.dataset.season = s;
  try { localStorage.setItem('season', s); } catch { /* bỏ qua */ }
  return s;
}
