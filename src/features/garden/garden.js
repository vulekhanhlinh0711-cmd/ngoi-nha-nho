// P6.05–P6.07: khu vườn. Cây lớn theo ngày; uống đủ nước (tưới) và giữ thói quen giúp lớn nhanh hơn.
// Thiếu nước thì cây chỉ hơi héo, không bao giờ chết.
import { getAll, getSetting, setSetting } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays } from '../../core/dates.js';
import { coinSummary } from '../rewards/coins.js';
import { habitDaysFrom } from '../habits/habits.js';

// days = số "điểm lớn" cần để chín. Mỗi ngày: +1, +0,5 nếu được tưới (đủ nước), +0,25 mỗi thói quen (tối đa +0,5).
export const SEEDS = [
  { id: 'carrot', name: 'Cà rốt', icon: '🥕', days: 2, price: 15, sell: 25 },
  { id: 'cabbage', name: 'Bắp cải', icon: '🥬', days: 3, price: 20, sell: 35 },
  { id: 'sunflower', name: 'Hướng dương', icon: '🌻', days: 3, price: 20, sell: 35 },
  { id: 'tulip', name: 'Tulip', icon: '🌷', days: 3, price: 25, sell: 40 },
  { id: 'strawberry', name: 'Dâu tây', icon: '🍓', days: 4, price: 30, sell: 55 },
  { id: 'rose', name: 'Hoa hồng', icon: '🌹', days: 4, price: 35, sell: 60 },
  { id: 'pumpkin', name: 'Bí ngô', icon: '🎃', days: 5, price: 40, sell: 80 },
  { id: 'tomato', name: 'Cà chua bi', icon: '🍅', days: 2, price: null, sell: 20, pomodoro: true },
];
export const seedOf = (id) => SEEDS.find((s) => s.id === id);
export const PLOTS = 12;
export const POMODOROS_PER_TOMATO = 4;

export async function getGarden() {
  const g = (await getSetting('garden')) ?? {};
  return { plots: Array(PLOTS).fill(null), seeds: {}, harvest: {}, tomatoClaimed: 0, ...g };
}
const saveGarden = async (g) => { await setSetting('garden', g); notifyChange(); };

// Dữ liệu từng ngày: được tưới chưa, xong mấy thói quen.
async function dayData() {
  const events = await getAll('events');
  const watered = new Set(events.filter((e) => e.type === 'water_goal').map((e) => e.day));
  const habitsPerDay = new Map();
  for (const [id, days] of habitDaysFrom(events)) {
    if (id === 'water') continue;
    for (const d of days) habitsPerDay.set(d, (habitsPerDay.get(d) ?? 0) + 1);
  }
  const drank = new Set(events.filter((e) => e.type === 'water_logged').map((e) => e.day ?? dayOf(e.at)));
  return { watered, habitsPerDay, drank };
}

export function growthOf(plot, data, today = todayKey()) {
  const seed = seedOf(plot.seed);
  let points = 0;
  for (let d = plot.plantedOn; d < today; d = addDays(d, 1)) {
    points += 1 + (data.watered.has(d) ? 0.5 : 0) + Math.min(0.5, 0.25 * (data.habitsPerDay.get(d) ?? 0));
  }
  // Hôm nay cũng được tính phần thưởng (tưới, thói quen) để thấy cây nhích lên ngay.
  points += (data.watered.has(today) ? 0.5 : 0) + Math.min(0.5, 0.25 * (data.habitsPerDay.get(today) ?? 0));
  const ratio = Math.min(1, points / seed.days);
  const stage = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.25 ? 1 : 0;
  const thirsty = !data.drank.has(today) && !data.drank.has(addDays(today, -1)) && plot.plantedOn < today;
  return { seed, ratio, stage, ripe: ratio >= 1, thirsty };
}

export async function gardenState() {
  const g = await getGarden();
  const data = await dayData();
  const tomatoes = Math.floor((await queryEvents('pomodoro_done')).length / POMODOROS_PER_TOMATO) - g.tomatoClaimed;
  return { g, plots: g.plots.map((p) => (p ? { ...p, ...growthOf(p, data) } : null)), tomatoes: Math.max(0, tomatoes), coins: (await coinSummary()).balance };
}

export async function buySeed(id, qty = 1) {
  const s = seedOf(id);
  if (!s?.price) return { ok: false, msg: 'Hạt này không bán.' };
  const cost = s.price * qty;
  if ((await coinSummary()).balance < cost) return { ok: false, msg: `Chưa đủ xu (cần ${cost} 🪙).` };
  await logEvent('coins_spent', { amount: cost, item: `seed:${id}`, day: todayKey() });
  const g = await getGarden();
  g.seeds[id] = (g.seeds[id] ?? 0) + qty;
  await saveGarden(g);
  return { ok: true };
}

export async function claimTomatoes() {
  const { tomatoes } = await gardenState();
  if (!tomatoes) return 0;
  const g = await getGarden();
  g.seeds.tomato = (g.seeds.tomato ?? 0) + tomatoes;
  g.tomatoClaimed += tomatoes;
  await saveGarden(g);
  return tomatoes;
}

export async function plant(index, seedId) {
  const g = await getGarden();
  if (g.plots[index] || !(g.seeds[seedId] > 0)) return false;
  g.seeds[seedId] -= 1;
  g.plots[index] = { seed: seedId, plantedOn: todayKey() };
  await saveGarden(g);
  await logEvent('garden_planted', { seed: seedId, day: todayKey() });
  return true;
}

// Thu hoạch: bán lấy xu (không bị giới hạn 150 xu/ngày) hoặc cất vào bếp để trang trí.
export async function harvest(index, sell) {
  const g = await getGarden();
  const p = g.plots[index];
  if (!p) return null;
  const data = await dayData();
  const st = growthOf(p, data);
  if (!st.ripe) return null;
  g.plots[index] = null;
  if (!sell) g.harvest[p.seed] = (g.harvest[p.seed] ?? 0) + 1;
  await saveGarden(g);
  if (sell) await logEvent('coins_earned', { amount: st.seed.sell, uncapped: true, from: `harvest:${p.seed}`, day: todayKey() });
  else await logEvent('garden_kept', { seed: p.seed, day: todayKey() });
  return st.seed;
}
