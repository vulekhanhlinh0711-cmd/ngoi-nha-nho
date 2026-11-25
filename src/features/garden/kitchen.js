// P45: dùng nông sản trong bếp — bán, nấu món, ăn để nhận "năng lượng", cắm hoa trang trí phòng.
// Dữ liệu nằm trong cài đặt 'garden' (đồng bộ giữa các máy): harvest {seed: n}, dishes {dish: n}, vases [...], focusBoost.
import { h } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { diffDays } from '../../core/dates.js';
import { seedOf, SEEDS } from './garden.js';

// Món ăn: nguyên liệu → món. Bán món được nhiều xu hơn bán sống; ăn món thì nhận năng lượng.
//  grow: mọi cây đang trồng lớn thêm `power` điểm · focus: `power` buổi Focus kế tiếp được thêm +10 xu.
export const DISHES = [
  { id: 'salad', name: 'Salad rau củ', icon: '🥗', needs: { carrot: 1, cabbage: 1 }, sell: 80, eat: { kind: 'grow', power: 1 } },
  { id: 'pasta', name: 'Mì Ý sốt cà chua', icon: '🍝', needs: { tomato: 3 }, sell: 85, eat: { kind: 'focus', power: 2 } },
  { id: 'kimchi', name: 'Kim chi bắp cải', icon: '🥬', needs: { cabbage: 2, carrot: 1 }, sell: 120, eat: { kind: 'grow', power: 1.5 } },
  { id: 'smoothie', name: 'Sinh tố dâu', icon: '🥤', needs: { strawberry: 2 }, sell: 140, eat: { kind: 'focus', power: 2 } },
  { id: 'soup', name: 'Súp bí đỏ', icon: '🍲', needs: { pumpkin: 1, carrot: 1 }, sell: 135, eat: { kind: 'grow', power: 2 } },
  { id: 'rosetea', name: 'Trà hoa hồng', icon: '🫖', needs: { rose: 1 }, sell: 80, eat: { kind: 'focus', power: 1 } },
  { id: 'tart', name: 'Bánh tart dâu bí', icon: '🥧', needs: { strawberry: 1, pumpkin: 1 }, sell: 170, eat: { kind: 'focus', power: 3 } },
  { id: 'mangoshake', name: 'Sinh tố xoài', icon: '🥭', needs: { mango: 2 }, sell: 120, eat: { kind: 'focus', power: 2 } },
  { id: 'banana-che', name: 'Chè chuối', icon: '🍮', needs: { banana: 2 }, sell: 95, eat: { kind: 'grow', power: 1.5 } },
  { id: 'oj', name: 'Nước cam', icon: '🧃', needs: { orange: 2 }, sell: 105, eat: { kind: 'focus', power: 2 } },
  { id: 'fruitbowl', name: 'Đĩa trái cây miệt vườn', icon: '🍱', needs: { banana: 1, mango: 1, orange: 1, strawberry: 1 }, sell: 220, eat: { kind: 'both', power: 2 } },
  { id: 'feast', name: 'Mâm cơm nhà vườn', icon: '🍱', needs: { carrot: 1, cabbage: 1, tomato: 1, pumpkin: 1 }, sell: 230, eat: { kind: 'both', power: 2 } },
];
export const dishOf = (id) => DISHES.find((d) => d.id === id);
export const FLOWERS = ['sunflower', 'tulip', 'rose'];
export const VASE_FRESH_DAYS = 5;
export const VASE_ROOMS = [['living', '🛋️ Phòng khách'], ['bedroom', '🛏️ Phòng ngủ'], ['study', '💻 Phòng làm việc'], ['kitchen', '🍳 Phòng bếp'], ['bathroom', '🛁 Phòng tắm'], ['dressing', '👗 Phòng thay đồ'], ['balcony', '🌇 Ban công']];

const load = async () => ({ plots: [], seeds: {}, harvest: {}, dishes: {}, vases: [], focusBoost: 0, ...((await getSetting('garden')) ?? {}) });
const save = async (g) => { await setSetting('garden', g); notifyChange(); };
const eatText = (e) => (e.kind === 'grow' ? `cây trong vườn lớn thêm ${e.power} ngày`
  : e.kind === 'focus' ? `${e.power} buổi Focus kế tiếp +10 xu`
    : `cây lớn thêm ${e.power} ngày & ${e.power} buổi Focus +10 xu`);

export async function sellProduce(seedId) {
  const g = await load(); const s = seedOf(seedId);
  if (!(g.harvest[seedId] > 0)) return;
  g.harvest[seedId] -= 1; if (!g.harvest[seedId]) delete g.harvest[seedId];
  await save(g);
  await logEvent('coins_earned', { amount: s.sell, uncapped: true, from: `kitchen-sell:${seedId}`, day: todayKey() });
  toast(`Đã bán ${s.icon} ${s.name}: +${s.sell} 🪙`);
}
export const canCook = (g, d) => Object.entries(d.needs).every(([k, n]) => (g.harvest[k] ?? 0) >= n);
export async function cook(dishId) {
  const g = await load(); const d = dishOf(dishId);
  if (!canCook(g, d)) { toast('Chưa đủ nguyên liệu'); return; }
  for (const [k, n] of Object.entries(d.needs)) { g.harvest[k] -= n; if (!g.harvest[k]) delete g.harvest[k]; }
  g.dishes[dishId] = (g.dishes[dishId] ?? 0) + 1;
  await save(g);
  await logEvent('dish_cooked', { dish: dishId, day: todayKey() });
  toast(`${d.icon} Đã nấu xong ${d.name}!`);
}
export async function eatDish(dishId) {
  const g = await load(); const d = dishOf(dishId);
  if (!(g.dishes[dishId] > 0)) return;
  g.dishes[dishId] -= 1; if (!g.dishes[dishId]) delete g.dishes[dishId];
  const { kind, power } = d.eat;
  if (kind === 'grow' || kind === 'both') {
    g.plots = (g.plots ?? []).map((p) => (p ? { ...p, bonus: (p.bonus ?? 0) + power } : p));
    // P52: cây ăn trái cũng lớn nhanh hơn / ra trái sớm hơn
    g.trees = Object.fromEntries(Object.entries(g.trees ?? {}).map(([k, t]) => [k, t.lastPick ? { ...t, fruitBonus: (t.fruitBonus ?? 0) + power } : { ...t, bonus: (t.bonus ?? 0) + power }]));
  }
  if (kind === 'focus' || kind === 'both') g.focusBoost = (g.focusBoost ?? 0) + Math.round(power);
  await save(g);
  await logEvent('dish_eaten', { dish: dishId, day: todayKey() });
  toast(`😋 Ngon quá! ${d.name}: ${eatText(d.eat)}`);
}
export async function sellDish(dishId) {
  const g = await load(); const d = dishOf(dishId);
  if (!(g.dishes[dishId] > 0)) return;
  g.dishes[dishId] -= 1; if (!g.dishes[dishId]) delete g.dishes[dishId];
  await save(g);
  await logEvent('coins_earned', { amount: d.sell, uncapped: true, from: `dish-sell:${dishId}`, day: todayKey() });
  toast(`Đã bán ${d.icon} ${d.name}: +${d.sell} 🪙`);
}
// Gọi khi xong 1 buổi Focus: còn năng lượng từ món ăn thì thưởng thêm 10 xu.
export async function useFocusBoost() {
  const g = await load();
  if (!(g.focusBoost > 0)) return false;
  g.focusBoost -= 1;
  await save(g);
  await logEvent('coins_earned', { amount: 10, uncapped: true, from: 'dish-focus-boost', day: todayKey() });
  return true;
}

// ---- Cắm hoa ----
export async function makeVase(flowers, room) {
  const g = await load();
  const need = flowers.reduce((m, f) => ({ ...m, [f]: (m[f] ?? 0) + 1 }), {});
  if (!flowers.length || Object.entries(need).some(([k, n]) => (g.harvest[k] ?? 0) < n)) { toast('Chưa đủ hoa'); return; }
  for (const [k, n] of Object.entries(need)) { g.harvest[k] -= n; if (!g.harvest[k]) delete g.harvest[k]; }
  g.vases = [...(g.vases ?? []), { id: Date.now(), flowers, room, day: todayKey() }];
  await save(g);
  await logEvent('vase_made', { room, day: todayKey() });
  toast(`💐 Đã cắm bình hoa đặt ở ${VASE_ROOMS.find((r) => r[0] === room)?.[1] ?? room}`);
}
export const vaseAge = (v, today = todayKey()) => diffDays(v.day, today);
export const vaseFresh = (v) => vaseAge(v) < VASE_FRESH_DAYS;
export async function moveVase(id, room) { const g = await load(); g.vases = g.vases.map((v) => (v.id === id ? { ...v, room } : v)); await save(g); }
export async function removeVase(id) { const g = await load(); g.vases = g.vases.filter((v) => v.id !== id); await save(g); }
export async function vasesIn(room) { return ((await load()).vases ?? []).filter((v) => v.room === room); }
// Bình hoa hiển thị trong tranh phòng.
export function vaseEl(v, i) {
  const fresh = vaseFresh(v);
  return h('div', {
    class: `vase-deco${fresh ? '' : ' wilted'}`, style: `left:${[82, 12, 68, 30, 90, 50][i % 6]}%;bottom:${[16, 18, 24, 14, 30, 20][i % 6]}%`,
    title: fresh ? `Bình hoa (còn tươi ${VASE_FRESH_DAYS - vaseAge(v)} ngày)` : 'Hoa đã héo — vào bếp để dọn',
    role: 'img', 'aria-label': fresh ? 'Bình hoa tươi' : 'Bình hoa đã héo',
  }, h('span', { class: 'vase-flowers' }, fresh ? v.flowers.map((f) => seedOf(f).icon).join('') : '🥀'.repeat(Math.min(3, v.flowers.length))), h('span', { class: 'vase-pot' }, '🏺'));
}

// ---- Thẻ "Bếp nhà mình" ----
let picked = [];
let vaseRoom = 'living';
export async function kitchenCard() {
  const g = await load();
  const produce = SEEDS.filter((s) => (g.harvest[s.id] ?? 0) > 0);
  const dishes = DISHES.filter((d) => (g.dishes[d.id] ?? 0) > 0);
  const flowerStock = (f) => (g.harvest[f] ?? 0) - picked.filter((x) => x === f).length;
  const need = (d) => Object.entries(d.needs).map(([k, n]) => {
    const have = g.harvest[k] ?? 0;
    return h('span', { class: `need${have >= n ? ' ok' : ''}` }, `${seedOf(k).icon}${have}/${n}`);
  });
  return h('section', { class: 'card kitchen-card' },
    h('div', { class: 'card-head' }, h('h3', {}, '🍳 Bếp nhà mình'),
      g.focusBoost > 0 ? h('span', { class: 'meta-chip', title: 'Từ món đã ăn' }, `⚡ ${g.focusBoost} buổi Focus +10 xu`) : null),

    h('h4', {}, '🧺 Giỏ nông sản'),
    produce.length ? h('ul', { class: 'log-list produce' }, produce.map((s) => h('li', {},
      h('span', { class: 'big-icon' }, s.icon), h('span', { class: 'grow' }, h('b', {}, s.name), ` ×${g.harvest[s.id]}`),
      h('button', { class: 'chip', onclick: () => sellProduce(s.id) }, `Bán 1 · +${s.sell} 🪙`))))
      : h('p', { class: 'muted small' }, 'Giỏ trống. Ra Khu vườn, thu hoạch và chọn “Cất vào bếp”.'),

    h('h4', {}, '📖 Sổ công thức'),
    h('ul', { class: 'recipes' }, DISHES.map((d) => {
      const ok = canCook(g, d);
      return h('li', { class: ok ? 'ready' : '' },
        h('span', { class: 'big-icon' }, d.icon),
        h('div', { class: 'grow' }, h('b', {}, d.name),
          h('div', { class: 'small needs' }, need(d)),
          h('div', { class: 'muted small' }, `Ăn: ${eatText(d.eat)} · Bán: ${d.sell} 🪙`)),
        h('button', { class: ok ? 'btn' : 'chip', disabled: !ok, onclick: () => cook(d.id) }, ok ? '🍳 Nấu' : 'Thiếu'));
    })),

    dishes.length ? [
      h('h4', {}, '🍽️ Món đã nấu'),
      h('ul', { class: 'log-list' }, dishes.map((d) => h('li', {},
        h('span', { class: 'big-icon' }, d.icon), h('span', { class: 'grow' }, h('b', {}, d.name), ` ×${g.dishes[d.id]}`, h('div', { class: 'muted small' }, eatText(d.eat))),
        h('button', { class: 'btn', onclick: () => eatDish(d.id) }, '😋 Ăn'),
        h('button', { class: 'chip', onclick: () => sellDish(d.id) }, `Bán +${d.sell}`)))),
    ] : null,

    h('h4', {}, '💐 Cắm hoa'),
    FLOWERS.some((f) => (g.harvest[f] ?? 0) > 0) || picked.length ? [
      h('p', { class: 'muted small' }, `Chạm hoa để cho vào bình (tối đa 5 bông). Hoa tươi ${VASE_FRESH_DAYS} ngày rồi héo.`),
      h('div', { class: 'presets' }, FLOWERS.filter((f) => (g.harvest[f] ?? 0) > 0).map((f) => h('button', {
        class: 'chip', disabled: flowerStock(f) <= 0 || picked.length >= 5,
        onclick: () => { picked.push(f); notifyChange(); },
      }, `${seedOf(f).icon} ${seedOf(f).name} (${flowerStock(f)})`))),
      h('div', { class: 'vase-preview' },
        h('span', { class: 'vase-flowers big' }, picked.length ? picked.map((f) => seedOf(f).icon).join('') : '· · ·'), h('span', { class: 'vase-pot big' }, '🏺'),
        picked.length ? h('button', { class: 'chip', onclick: () => { picked = []; notifyChange(); } }, 'Bỏ hết') : null),
      h('div', { class: 'form-row' },
        h('label', { class: 'field-inline' }, 'Đặt ở', h('select', { class: 'input', onchange: (e) => { vaseRoom = e.target.value; } },
          VASE_ROOMS.map(([id, l]) => h('option', { value: id, selected: id === vaseRoom }, l)))),
        h('button', { class: 'btn', disabled: !picked.length, onclick: async () => { const f = picked; picked = []; await makeVase(f, vaseRoom); } }, '💐 Cắm bình')),
    ] : h('p', { class: 'muted small' }, 'Trồng 🌻 Hướng dương, 🌷 Tulip hoặc 🌹 Hoa hồng rồi cất vào bếp để cắm hoa.'),

    (g.vases ?? []).length ? [
      h('h4', {}, '🏺 Bình hoa đang trưng'),
      h('ul', { class: 'log-list' }, g.vases.map((v) => h('li', {},
        h('span', { class: 'big-icon' }, vaseFresh(v) ? v.flowers.map((f) => seedOf(f).icon).join('') : '🥀'),
        h('span', { class: 'grow small' }, vaseFresh(v) ? `Còn tươi ${VASE_FRESH_DAYS - vaseAge(v)} ngày` : 'Đã héo'),
        h('select', { class: 'input', 'aria-label': 'Chuyển bình hoa sang phòng', onchange: (e) => moveVase(v.id, e.target.value) },
          VASE_ROOMS.map(([id, l]) => h('option', { value: id, selected: id === v.room }, l))),
        h('button', { class: 'icon-btn', 'aria-label': 'Dọn bình hoa', title: 'Dọn bình', onclick: () => removeVase(v.id) }, '✕')))),
    ] : null);
}
