// P52: bố cục khu vườn pixel — nền (cỏ/lối đi/nước), vị trí ô đất, chỗ trồng cây ăn trái, đồ trang trí.
// Lưu ở cài đặt 'gardenMap' (đồng bộ). Dữ liệu cây/hạt/nông sản vẫn ở 'garden' → đổi bố cục không mất cây.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { coinSummary } from '../rewards/coins.js';

export const COLS = 14;
export const ROWS = 11;

// Đồ trang trí: giá xu, đặt được trên nước hay không.
export const DECOR = [
  { id: 'fence', name: 'Hàng rào gỗ', icon: '🪵', price: 10 },
  { id: 'lantern', name: 'Đèn lồng (sáng về đêm)', icon: '🏮', price: 40 },
  { id: 'pot', name: 'Chậu hoa', icon: '🪴', price: 25 },
  { id: 'bush', name: 'Bụi cây hoa', icon: '🌳', price: 20 },
  { id: 'rock', name: 'Tảng đá', icon: '🪨', price: 10 },
  { id: 'hay', name: 'Bó rơm', icon: '🌾', price: 20 },
  { id: 'scarecrow', name: 'Bù nhìn', icon: '🧑‍🌾', price: 50 },
  { id: 'barrow', name: 'Xe rùa', icon: '🛒', price: 45 },
  { id: 'beehive', name: 'Tổ ong (có ong bay)', icon: '🐝', price: 80 },
  { id: 'bench', name: 'Ghế gỗ', icon: '🪑', price: 60 },
  { id: 'sign', name: 'Biển gỗ', icon: '🪧', price: 20 },
  { id: 'well', name: 'Giếng nước', icon: '⛲', price: 120 },
  { id: 'lily', name: 'Lá sen (đặt trên nước)', icon: '🪷', price: 15, water: true },
  { id: 'flowers', name: 'Luống hoa dại', icon: '🌼', price: 15 },
  { id: 'tuft', name: 'Bụi cỏ cao', icon: '🌿', price: 5 },
  { id: 'mushroom', name: 'Nấm đỏ', icon: '🍄', price: 10 },
  { id: 'hen', name: 'Gà mái (đi dạo quanh đây)', icon: '🐔', price: 70 },
  { id: 'duck', name: 'Vịt (bơi trong ao)', icon: '🦆', price: 60, water: true },
];
export const decorOf = (id) => DECOR.find((d) => d.id === id);
export const PLOT_PRICE = 60;
export const SPOT_PRICE = 100;
export const MAX_PLOTS = 24;
export const MAX_SPOTS = 6;

const DEFAULT_GROUND = [
  'gggggggggggggg',
  'ggggggggggwwwg',
  'gggggggggwwwwg',
  'ggggggggggwwgg',
  'pppppppppppppp',
  'gggggggpgggggg',
  'gggggggpgggggg',
  'gggggggpgggggg',
  'gggggggpgggggg',
  'gggggggpgggggg',
  'gggggggpgggggg',
];
const DEFAULT_ITEMS = [
  ...Array.from({ length: 14 }, (_, x) => ({ type: 'fence', x, y: 0 })).filter((f) => f.x < 1 || f.x > 6),
  { type: 'spot', id: 's1', x: 1, y: 2 }, { type: 'spot', id: 's2', x: 4, y: 2 },
  { type: 'lily', x: 11, y: 2 }, { type: 'lily', x: 10, y: 1 }, { type: 'rock', x: 9, y: 3 },
  { type: 'lantern', x: 6, y: 5 }, { type: 'lantern', x: 8, y: 5 },
  { type: 'scarecrow', x: 0, y: 7 }, { type: 'beehive', x: 9, y: 6 }, { type: 'pot', x: 11, y: 6 }, { type: 'pot', x: 12, y: 6 },
  { type: 'bush', x: 13, y: 5 }, { type: 'bush', x: 0, y: 10 }, { type: 'hay', x: 12, y: 8 }, { type: 'hay', x: 13, y: 8 },
  { type: 'barrow', x: 11, y: 9 }, { type: 'bench', x: 9, y: 9 }, { type: 'sign', x: 8, y: 7 },
  { type: 'flowers', x: 1, y: 0 }, { type: 'flowers', x: 2, y: 0 }, { type: 'flowers', x: 3, y: 0 }, { type: 'flowers', x: 4, y: 0 }, { type: 'flowers', x: 5, y: 0 }, { type: 'flowers', x: 6, y: 0 },
  { type: 'tuft', x: 8, y: 2 }, { type: 'tuft', x: 13, y: 3 }, { type: 'tuft', x: 3, y: 10 }, { type: 'tuft', x: 13, y: 10 }, { type: 'mushroom', x: 0, y: 5 },
  { type: 'flowers', x: 10, y: 10 }, { type: 'flowers', x: 11, y: 10 }, { type: 'flowers', x: 12, y: 10 }, { type: 'tuft', x: 6, y: 9 },
  { type: 'hen', x: 10, y: 8 }, { type: 'hen', x: 12, y: 9 }, { type: 'duck', x: 12, y: 1 },
];
const DEFAULT_PLOTS = [6, 8].flatMap((y) => [1, 2, 3, 4, 5, 6].map((x) => [x, y]));

let seq = 0;
const newId = () => `i${Date.now().toString(36)}${(seq += 1)}`;

export async function getMap(plotCount = 12) {
  const m = (await getSetting('gardenMap')) ?? {};
  const map = {
    ground: Array.isArray(m.ground) && m.ground.length === ROWS ? m.ground : DEFAULT_GROUND,
    items: Array.isArray(m.items) ? m.items : DEFAULT_ITEMS.map((it, i) => ({ id: it.id ?? `d${i}`, ...it })),
    plotPos: Array.isArray(m.plotPos) ? [...m.plotPos] : [...DEFAULT_PLOTS],
    inv: m.inv ?? {},
  };
  // Có thêm ô đất (mua thêm / máy khác) mà chưa có vị trí → tìm chỗ trống.
  while (map.plotPos.length < plotCount) {
    const free = freeTile(map, (x, y) => map.ground[y][x] !== 'w');
    if (!free) break;
    map.plotPos.push(free);
  }
  return map;
}
export const saveMap = async (m) => { await setSetting('gardenMap', m); notifyChange(); };

// Ô (x,y) đang bị gì chiếm: { kind: 'plot'|'spot'|'decor', index/id }.
export function occupant(map, x, y) {
  const pi = map.plotPos.findIndex(([px, py]) => px === x && py === y);
  if (pi >= 0) return { kind: 'plot', index: pi };
  for (const it of map.items) {
    if (it.type === 'spot' ? x >= it.x && x <= it.x + 1 && y >= it.y && y <= it.y + 1 : it.x === x && it.y === y) {
      return { kind: it.type === 'spot' ? 'spot' : 'decor', id: it.id, item: it };
    }
  }
  return null;
}
const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
function freeTile(map, ok) {
  for (let y = ROWS - 1; y >= 1; y -= 1) for (let x = 0; x < COLS; x += 1) if (ok(x, y) && !occupant(map, x, y)) return [x, y];
  return null;
}
// Đặt được vật loại `kind` tại (x,y) không (bỏ qua chính nó khi đang dời).
export function canPlace(map, kind, x, y, self = null) {
  const tiles = kind === 'spot' ? [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]] : [[x, y]];
  return tiles.every(([tx, ty]) => {
    if (!inMap(tx, ty)) return false;
    const water = map.ground[ty][tx] === 'w';
    if (decorOf(kind)?.water ? !water : water) return false;
    const o = occupant(map, tx, ty);
    return !o || (self && ((o.kind === 'plot' && o.index === self.index) || (o.id && o.id === self.id)));
  });
}

// ---- thao tác trong chế độ bày vườn ----
export async function paint(x, y, t) {
  const m = await getMap();
  if (!inMap(x, y) || m.ground[y][x] === t) return false;
  const o = occupant(m, x, y);
  if (t === 'w' && o && !(o.kind === 'decor' && decorOf(o.item.type)?.water)) return 'blocked';
  if (t !== 'w' && decorOf(o?.item?.type)?.water) return 'blocked';
  m.ground = m.ground.map((row, j) => (j === y ? row.slice(0, x) + t + row.slice(x + 1) : row));
  await saveMap(m);
  return true;
}
export async function moveThing(sel, x, y) {
  const m = await getMap();
  if (sel.kind === 'plot') {
    if (!canPlace(m, 'plot', x, y, sel)) return false;
    m.plotPos[sel.index] = [x, y];
  } else {
    const it = m.items.find((i) => i.id === sel.id);
    if (!it || !canPlace(m, it.type === 'spot' ? 'spot' : it.type, x, y, sel)) return false;
    it.x = x; it.y = y;
  }
  await saveMap(m);
  return true;
}
export async function placeDecor(type, x, y) {
  const m = await getMap();
  if (!((m.inv[type] ?? 0) > 0) || !canPlace(m, type, x, y)) return false;
  m.inv[type] -= 1;
  m.items.push({ id: newId(), type, x, y });
  await saveMap(m);
  return true;
}
export async function storeDecor(id) {
  const m = await getMap();
  const it = m.items.find((i) => i.id === id);
  if (!it || it.type === 'spot') return false;
  m.items = m.items.filter((i) => i !== it);
  m.inv[it.type] = (m.inv[it.type] ?? 0) + 1;
  await saveMap(m);
  return it.type;
}
export async function buyDecor(type) {
  const d = decorOf(type);
  if (!d) return { ok: false };
  if ((await coinSummary()).balance < d.price) return { ok: false, msg: `Chưa đủ xu (cần ${d.price} 🪙).` };
  await logEvent('coins_spent', { amount: d.price, item: `decor:${type}`, day: todayKey() });
  const m = await getMap();
  m.inv[type] = (m.inv[type] ?? 0) + 1;
  await saveMap(m);
  return { ok: true };
}
// Mua thêm ô đất / chỗ trồng cây: đặt ngay vào chỗ trống đầu tiên (dời lại tùy ý).
export async function buyPlotTile(plotCount) {
  if (plotCount >= MAX_PLOTS) return { ok: false, msg: `Tối đa ${MAX_PLOTS} ô đất.` };
  if ((await coinSummary()).balance < PLOT_PRICE) return { ok: false, msg: `Chưa đủ xu (cần ${PLOT_PRICE} 🪙).` };
  const m = await getMap(plotCount);
  const free = freeTile(m, (x, y) => m.ground[y][x] !== 'w');
  if (!free) return { ok: false, msg: 'Vườn hết chỗ trống. Cất bớt đồ trang trí nhé.' };
  await logEvent('coins_spent', { amount: PLOT_PRICE, item: 'garden-plot', day: todayKey() });
  m.plotPos = [...m.plotPos.slice(0, plotCount), free];
  await setSetting('gardenMap', m);
  const { addPlot } = await import('./garden.js');
  await addPlot();
  return { ok: true };
}
export async function buySpot() {
  const m = await getMap();
  if (m.items.filter((i) => i.type === 'spot').length >= MAX_SPOTS) return { ok: false, msg: `Tối đa ${MAX_SPOTS} chỗ trồng cây.` };
  if ((await coinSummary()).balance < SPOT_PRICE) return { ok: false, msg: `Chưa đủ xu (cần ${SPOT_PRICE} 🪙).` };
  let pos = null;
  for (let y = ROWS - 2; y >= 1 && !pos; y -= 1) for (let x = 0; x < COLS - 1 && !pos; x += 1) if (canPlace(m, 'spot', x, y)) pos = [x, y];
  if (!pos) return { ok: false, msg: 'Cần khoảng trống 2×2 ô. Cất bớt đồ hoặc dời ô đất nhé.' };
  await logEvent('coins_spent', { amount: SPOT_PRICE, item: 'garden-spot', day: todayKey() });
  m.items.push({ id: `s${Date.now().toString(36)}`, type: 'spot', x: pos[0], y: pos[1] });
  await saveMap(m);
  return { ok: true };
}
export async function resetLayout() {
  const m = await getMap();
  // Giữ đồ đã mua: mọi đồ đang đặt (trừ bộ mặc định) về kho; chỗ trồng cây giữ id để không mất cây.
  const spots = m.items.filter((i) => i.type === 'spot');
  const inv = { ...m.inv };
  const defCount = {};
  for (const it of DEFAULT_ITEMS) if (it.type !== 'spot') defCount[it.type] = (defCount[it.type] ?? 0) + 1;
  const placed = {};
  for (const it of m.items) if (it.type !== 'spot') placed[it.type] = (placed[it.type] ?? 0) + 1;
  for (const [t, n] of Object.entries(placed)) { const extra = n - (defCount[t] ?? 0); if (extra > 0) inv[t] = (inv[t] ?? 0) + extra; }
  const items = DEFAULT_ITEMS.filter((it) => it.type !== 'spot').map((it) => ({ id: newId(), ...it }));
  const fresh = { ground: DEFAULT_GROUND, items, plotPos: [...DEFAULT_PLOTS], inv };
  // chỗ trồng cây: 2 chỗ mặc định giữ id cũ, chỗ mua thêm tìm chỗ trống
  const defSpots = DEFAULT_ITEMS.filter((i) => i.type === 'spot');
  spots.forEach((sp, k) => {
    if (defSpots[k]) items.push({ ...sp, x: defSpots[k].x, y: defSpots[k].y });
    else {
      let pos = null;
      for (let y = ROWS - 2; y >= 1 && !pos; y -= 1) for (let x = 0; x < COLS - 1 && !pos; x += 1) if (canPlace(fresh, 'spot', x, y)) pos = [x, y];
      if (pos) items.push({ ...sp, x: pos[0], y: pos[1] });
    }
  });
  // ô đất mua thêm
  while (fresh.plotPos.length < m.plotPos.length) { const f = freeTile(fresh, (x, y) => fresh.ground[y][x] !== 'w'); if (!f) break; fresh.plotPos.push(f); }
  await saveMap(fresh);
}
