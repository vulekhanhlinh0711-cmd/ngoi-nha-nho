// Màn Khu vườn (P6.05–P6.07, P52: vườn pixel sống động, tự bày theo ý mình).
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getSetting } from '../../core/db.js';
import { timeOfDay } from '../home/art.js';
import { sheet } from '../books/dialogs.js';
import { SEEDS, seedOf, gardenState, buySeed, plant, harvest, claimTomatoes, POMODOROS_PER_TOMATO, plantTree, pickTree } from './garden.js';
import { getMap, occupant, DECOR, decorOf, paint, moveThing, placeDecor, storeDecor, buyDecor, buyPlotTile, buySpot, resetLayout, PLOT_PRICE, SPOT_PRICE, MAX_PLOTS } from './layout.js';
import { gardenCanvas } from './garden-scene.js';

let selectedSeed = null;
let mode = 'view'; // 'view' | 'edit'
let tool = 'move'; // move | p | w | g | store | place:<loại>
let sel = null; // vật đang chọn để dời

const pct = (r) => `${Math.round(r * 100)}%`;
const close = (dlg) => dlg.close();

// ---- hộp thoại khi bấm ô đất / cây ----
function plotSheet(i, p, g) {
  const { dlg, body } = sheet(p ? (p.ripe ? `${p.seed.icon} ${p.seed.name} đã chín!` : `${p.seed.icon} ${p.seed.name}`) : '🟫 Ô đất trống', { cls: 'gd-sheet' });
  if (!p) {
    const bag = SEEDS.filter((s) => !s.tree && g.seeds[s.id] > 0);
    mount(body,
      bag.length ? [h('p', { class: 'muted small' }, 'Chọn hạt để gieo:'),
        h('div', { class: 'gd-pick' }, bag.map((s) => h('button', { class: 'chip', onclick: async () => { close(dlg); if (await plant(i, s.id)) toast(`🌱 Đã gieo ${s.name}`); } }, `${s.icon} ${s.name} ×${g.seeds[s.id]}`))),
        h('p', { class: 'muted small' }, 'Mẹo: chọn hạt trong “Túi hạt giống” rồi chạm liên tục nhiều ô để gieo nhanh.')]
        : h('p', {}, 'Túi hạt đang trống. Mua hạt ở “Cửa hàng hạt giống” bên dưới nhé.'));
    return;
  }
  if (p.ripe) {
    mount(body,
      h('p', {}, 'Thu hoạch để bán lấy xu, hoặc cất vào bếp để nấu món / cắm hoa.'),
      h('div', { class: 'gd-pick' },
        h('button', { class: 'btn', onclick: async () => { close(dlg); const s = await harvest(i, false); if (s) toast(`${s.icon} Đã cất vào bếp`); } }, '🧺 Cất vào bếp'),
        h('button', { class: 'chip', onclick: async () => { close(dlg); const s = await harvest(i, true); if (s) toast(`Đã bán ${s.name}: +${s.sell} 🪙`); } }, `Bán +${p.seed.sell} 🪙`)));
    return;
  }
  mount(body,
    h('div', { class: 'gd-prog' }, h('span', { style: `width:${pct(p.ratio)}` })),
    h('p', {}, `Đã lớn ${pct(p.ratio)}. ${['Mới gieo hạt', 'Đã nảy mầm', 'Đang lớn', 'Sắp chín'][p.stage]}.`),
    h('p', { class: 'muted small' }, p.thirsty ? '💧 Cây hơi khát: uống một ly nước là tưới cây ngay.' : '💧 Uống đủ nước trong ngày (+50%), giữ thói quen (+25% mỗi thói quen), ăn món ở bếp để cây lớn nhanh hơn.'));
}

function treeSheet(spot, t, g) {
  const { dlg, body } = sheet(t ? `${t.seed.icon} Cây ${t.seed.name.toLowerCase()}` : '🌳 Chỗ trồng cây ăn trái', { cls: 'gd-sheet' });
  if (!t) {
    const bag = SEEDS.filter((s) => s.tree && g.seeds[s.id] > 0);
    mount(body, bag.length
      ? [h('p', { class: 'muted small' }, 'Chọn cây con để trồng:'), h('div', { class: 'gd-pick' }, bag.map((s) => h('button', { class: 'chip', onclick: async () => { close(dlg); if (await plantTree(spot, s.id)) toast(`🌱 Đã trồng cây ${s.name.toLowerCase()}`); } }, `${s.icon} ${s.name} ×${g.seeds[s.id]}`)))]
      : h('p', {}, 'Chưa có cây con. Mua ở mục “🌳 Cây ăn trái” trong cửa hàng bên dưới — trồng một lần, hái trái nhiều đợt.'));
    return;
  }
  if (t.ripe) {
    mount(body,
      h('p', {}, `Cây trĩu trái! Hái được ${t.seed.yield} ${t.seed.name.toLowerCase()}. Cây sẽ ra trái đợt mới sau ~${t.seed.regrow} ngày.`),
      h('div', { class: 'gd-pick' },
        h('button', { class: 'btn', onclick: async () => { close(dlg); const r = await pickTree(spot, false); if (r) toast(`${r.seed.icon} Đã hái ${r.n} trái cất vào bếp`); } }, '🧺 Hái, cất vào bếp'),
        h('button', { class: 'chip', onclick: async () => { close(dlg); const r = await pickTree(spot, true); if (r) toast(`Đã bán ${r.n} ${r.seed.name.toLowerCase()}: +${r.n * r.seed.sell} 🪙`); } }, `Bán +${t.seed.yield * t.seed.sell} 🪙`)));
    return;
  }
  const growing = t.stage < 2;
  mount(body,
    h('div', { class: 'gd-prog' }, h('span', { style: `width:${pct(growing ? t.ratio : t.fruit)}` })),
    h('p', {}, growing ? `Cây đang lớn: ${pct(t.ratio)}. Lớn xong sẽ ra hoa rồi kết trái.` : `Đang ${t.fruit < 0.45 ? 'ra hoa' : 'nuôi trái'}: ${pct(t.fruit)} tới lúc hái.`),
    h('p', { class: 'muted small' }, 'Uống đủ nước, giữ thói quen và ăn món ở bếp giúp cây nhanh ra trái.'));
}

// ---- bấm lên cảnh ----
async function onTap(x, y, st) {
  const map = await getMap(st.g.plots.length);
  const o = occupant(map, x, y);
  if (mode === 'view') {
    if (o?.kind === 'plot') {
      const p = st.plots[o.index];
      if (!p && selectedSeed && !seedOf(selectedSeed).tree) {
        const s = seedOf(selectedSeed);
        if (await plant(o.index, selectedSeed)) { toast(`🌱 Đã gieo ${s.name}`); if (!(st.g.seeds[s.id] > 1)) selectedSeed = null; }
        return;
      }
      plotSheet(o.index, p, st.g); return;
    }
    if (o?.kind === 'spot') {
      const t = st.trees[o.id];
      if (!t && selectedSeed && seedOf(selectedSeed).tree) { if (await plantTree(o.id, selectedSeed)) { toast(`🌱 Đã trồng cây ${seedOf(selectedSeed).name.toLowerCase()}`); selectedSeed = null; } return; }
      treeSheet(o.id, t, st.g); return;
    }
    if (o?.kind === 'decor') { const d = decorOf(o.item.type); if (d) toast(`${d.icon} ${d.name}${o.item.type === 'beehive' ? ' · bzz bzz 🐝' : ''}`); return; }
    if (map.ground[y]?.[x] === 'w') toast('🎣 Ao cá — sắp có câu cá ở đây!');
    return;
  }
  // ---- chế độ bày vườn ----
  if (tool === 'move') {
    if (!sel) { if (o) { sel = o; notifyChange(); } else toast('Chạm vào một ô đất, cây hoặc món đồ để chọn'); return; }
    if (o && (o.kind === 'plot' ? sel.kind === 'plot' && o.index === sel.index : o.id === sel.id)) { sel = null; notifyChange(); return; }
    const ok = await moveThing(sel, x, y);
    if (ok) { sel = null; return; }
    if (o) { sel = o; notifyChange(); return; }
    toast(sel.kind === 'spot' ? 'Chỗ trồng cây cần 2×2 ô trống (không có nước)' : 'Không đặt được ở đây');
    return;
  }
  if (['p', 'w', 'g'].includes(tool)) {
    const r = await paint(x, y, tool);
    if (r === 'blocked') toast(tool === 'w' ? 'Dời đồ đi trước khi đào ao ở đây' : 'Cất lá sen trước nhé');
    return;
  }
  if (tool === 'store') {
    if (o?.kind !== 'decor') { toast('Chạm vào món đồ trang trí để cất vào kho'); return; }
    const t = await storeDecor(o.id); if (t) toast(`📦 Đã cất ${decorOf(t)?.name ?? ''} vào kho`);
    return;
  }
  if (tool.startsWith('place:')) {
    const type = tool.slice(6);
    if (!(await placeDecor(type, x, y))) { toast(decorOf(type)?.water ? 'Lá sen chỉ đặt trên mặt nước' : 'Ô này đã có đồ hoặc là nước'); return; }
    const m = await getMap(); if (!((m.inv[type] ?? 0) > 0)) tool = 'move';
  }
}

function editPanel(map, coins, plotCount) {
  const owned = DECOR.filter((d) => (map.inv[d.id] ?? 0) > 0);
  const chip = (k, label, title) => h('button', { class: `chip${tool === k ? ' on' : ''}`, title, onclick: () => { tool = k; sel = null; notifyChange(); } }, label);
  return [
    h('section', { class: 'card gd-tools' },
      h('div', { class: 'card-head' }, h('h3', {}, '🛠 Bày vườn theo ý bạn'), h('span', { class: 'coin' }, `🪙 ${coins}`)),
      h('div', { class: 'presets' },
        chip('move', '✋ Dời chỗ', 'Chạm vật rồi chạm chỗ mới'), chip('p', '🟫 Vẽ lối đi'), chip('w', '💧 Đào ao'), chip('g', '🌿 Trồng cỏ'), chip('store', '📦 Cất đồ vào kho')),
      h('p', { class: 'muted small' }, {
        move: sel ? '👉 Giờ chạm chỗ mới để dời tới (chạm lại để bỏ chọn).' : 'Chạm một ô đất, chỗ trồng cây hoặc món đồ để chọn, rồi chạm chỗ mới. Cây đang trồng đi theo, không bị mất.',
        p: 'Chạm từng ô để lát lối đi — cô làm vườn sẽ dạo trên lối đi.', w: 'Chạm từng ô để đào ao. Ao dùng để thả lá sen (và sắp tới: câu cá).', g: 'Chạm để trả lại cỏ.', store: 'Chạm món đồ để cất vào kho (đặt lại bất cứ lúc nào).',
      }[tool] ?? `Chạm ô trống để đặt ${decorOf(tool.slice(6))?.name ?? ''}.`),
      owned.length ? [h('h4', {}, '📦 Kho đồ — chọn rồi chạm vào vườn để đặt'),
        h('div', { class: 'presets' }, owned.map((d) => chip(`place:${d.id}`, `${d.icon} ${d.name.replace(/ \(.*\)/, '')} ×${map.inv[d.id]}`)))] : null),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '🏪 Cửa hàng đồ vườn'), h('span', { class: 'coin' }, `🪙 ${coins}`)),
      h('ul', { class: 'shop' },
        h('li', {}, h('span', { class: 'shop-icon' }, '🟫'), h('div', { class: 'grow' }, h('b', {}, 'Ô đất mới'), h('span', { class: 'meta-text' }, ` · đang có ${plotCount}/${MAX_PLOTS}`)),
          h('button', { class: 'chip', disabled: coins < PLOT_PRICE || plotCount >= MAX_PLOTS, onclick: async () => { const r = await buyPlotTile(plotCount); toast(r.ok ? '🟫 Đã thêm ô đất — dời tới chỗ bạn thích nhé' : r.msg); notifyChange(); } }, `${PLOT_PRICE} 🪙`)),
        h('li', {}, h('span', { class: 'shop-icon' }, '🌳'), h('div', { class: 'grow' }, h('b', {}, 'Chỗ trồng cây ăn trái'), h('span', { class: 'meta-text' }, ' · 2×2 ô')),
          h('button', { class: 'chip', disabled: coins < SPOT_PRICE, onclick: async () => { const r = await buySpot(); toast(r.ok ? '🌳 Đã thêm chỗ trồng cây' : r.msg); } }, `${SPOT_PRICE} 🪙`)),
        DECOR.map((d) => h('li', {},
          h('span', { class: 'shop-icon' }, d.icon), h('div', { class: 'grow' }, h('b', {}, d.name), (map.inv[d.id] ?? 0) ? h('span', { class: 'meta-text' }, ` · trong kho ${map.inv[d.id]}`) : null),
          h('button', { class: 'chip', disabled: coins < d.price, onclick: async () => { const r = await buyDecor(d.id); if (r.ok) { tool = `place:${d.id}`; toast(`Đã mua ${d.name} — chạm vào vườn để đặt`); } else toast(r.msg); notifyChange(); } }, `${d.price} 🪙`)))),
      h('button', { class: 'link-btn small', onclick: async () => { if (confirm('Xếp lại vườn như ban đầu? Cây đang trồng và đồ đã mua vẫn giữ (đồ thừa về kho).')) { sel = null; await resetLayout(); toast('Đã xếp lại vườn'); } } }, '↺ Xếp lại như ban đầu')),
  ];
}

export async function renderGarden(root) {
  const st = await gardenState();
  const { g, plots, trees, tomatoes, coins, wetToday } = st;
  const map = await getMap(g.plots.length);
  const bag = SEEDS.filter((s) => g.seeds[s.id] > 0);
  if (selectedSeed && !(g.seeds[selectedSeed] > 0)) selectedSeed = null;
  if (mode === 'view') sel = null;
  const thirsty = plots.some((p) => p?.thirsty);
  const light = timeOfDay((await getSetting('houseLight')) ?? 'auto');
  const ripePlots = plots.map((p, i) => (p?.ripe ? i : -1)).filter((i) => i >= 0);
  const ripeTrees = Object.entries(trees).filter(([, t]) => t.ripe).map(([k]) => k);
  const nRipe = ripePlots.length + ripeTrees.length;

  const canvasEl = gardenCanvas({ map, plots, trees, light, mode, sel, wet: wetToday }, { onTap: (x, y) => onTap(x, y, st) });

  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'garden'), h('h2', {}, 'Khu vườn'),
      h('p', { class: 'muted' }, 'Cây lớn mỗi ngày. Uống đủ nước là tưới cây, giữ thói quen thì cây lớn nhanh hơn. Chạm vào ô đất hay cây để chăm.')),
    thirsty ? h('p', { class: 'insight' }, '💧 Vài cây hơi khát. Uống một ly nước là vườn tươi lại ngay.') : null,
    h('div', { class: 'toolbar gd-bar' },
      h('div', { class: 'btn-group', role: 'radiogroup', 'aria-label': 'Chế độ' },
        [['view', '🌱 Chăm vườn'], ['edit', '🛠 Bày vườn']].map(([k, l]) => h('button', { class: `chip${mode === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(mode === k), onclick: () => { mode = k; sel = null; tool = 'move'; notifyChange(); } }, l))),
      mode === 'view' && nRipe ? h('button', { class: 'btn', onclick: async () => {
        let n = 0;
        for (const i of ripePlots) if (await harvest(i, false)) n += 1;
        for (const k of ripeTrees) { const r = await pickTree(k, false); if (r) n += r.n; }
        toast(`🧺 Đã thu ${n} nông sản vào bếp`);
      } }, `🧺 Thu hết ${nRipe} chỗ chín vào bếp`) : null,
      selectedSeed && mode === 'view' ? h('span', { class: 'meta-chip' }, `${seedOf(selectedSeed).icon} Đang cầm hạt ${seedOf(selectedSeed).name} — chạm ${seedOf(selectedSeed).tree ? 'chỗ trồng cây' : 'ô đất trống'}`) : null),
    h('section', { class: `gd-frame time-${light.id}${mode === 'edit' ? ' editing' : ''}` }, canvasEl),
    // danh sách cho trình đọc màn hình (cảnh vẽ bằng canvas)
    h('ul', { class: 'vh' }, plots.map((p, i) => h('li', {}, h('button', { onclick: () => plotSheet(i, p, g) }, `Ô đất ${i + 1}: ${p ? `${p.seed.name} ${p.ripe ? 'đã chín' : pct(p.ratio)}` : 'trống'}`))),
      Object.keys(trees).map((k) => h('li', {}, h('button', { onclick: () => treeSheet(k, trees[k], g) }, `Cây ${trees[k].seed.name}: ${trees[k].ripe ? 'có trái chín' : 'đang lớn'}`)))),

    mode === 'edit' ? editPanel(map, coins, g.plots.length) : [
      h('section', { class: 'card' },
        h('h3', {}, '👜 Túi hạt giống'),
        tomatoes ? h('p', {}, `🍅 Bạn có ${tomatoes} hạt cà chua từ Pomodoro (mỗi ${POMODOROS_PER_TOMATO} phiên = 1 hạt). `,
          h('button', { class: 'chip', onclick: async () => { const n = await claimTomatoes(); toast(`Đã nhận ${n} hạt cà chua`); } }, 'Nhận')) : null,
        bag.length ? h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Chọn hạt để gieo' }, bag.map((s) => h('button', {
          class: `chip${selectedSeed === s.id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(selectedSeed === s.id),
          onclick: () => { selectedSeed = selectedSeed === s.id ? null : s.id; notifyChange(); },
        }, `${s.icon} ${s.name} ×${g.seeds[s.id]}`))) : h('p', { class: 'muted small' }, 'Túi đang trống. Mua hạt ở cửa hàng bên dưới nhé.'),
        h('p', { class: 'muted small' }, selectedSeed ? 'Chạm các ô đất trống trên vườn để gieo liên tục.' : 'Chọn hạt rồi chạm ô đất trống để gieo nhanh, hoặc chạm thẳng vào ô đất.')),
      h('section', { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', {}, '🏪 Cửa hàng hạt giống'), h('span', { class: 'coin' }, `🪙 ${coins}`)),
        h('ul', { class: 'shop' }, SEEDS.filter((s) => s.price && !s.tree).map((s) => h('li', {},
          h('span', { class: 'shop-icon' }, s.icon),
          h('div', { class: 'grow' }, h('b', {}, s.name), h('span', { class: 'meta-text' }, ` · chín sau ~${s.days} ngày · bán ${s.sell} 🪙`)),
          h('button', { class: 'chip', disabled: coins < s.price, onclick: async () => { const r = await buySeed(s.id); toast(r.ok ? `Đã mua hạt ${s.name}` : r.msg); } }, `${s.price} 🪙`)))),
        h('h4', {}, '🌳 Cây ăn trái — trồng một lần, hái nhiều đợt'),
        h('ul', { class: 'shop' }, SEEDS.filter((s) => s.tree).map((s) => h('li', {},
          h('span', { class: 'shop-icon' }, s.icon),
          h('div', { class: 'grow' }, h('b', {}, `Cây ${s.name.toLowerCase()} con`), h('span', { class: 'meta-text' }, ` · lớn ~${s.days} ngày · mỗi ~${s.regrow} ngày hái ${s.yield} trái (${s.sell} 🪙/trái)`)),
          h('button', { class: 'chip', disabled: coins < s.price, onclick: async () => { const r = await buySeed(s.id); toast(r.ok ? `Đã mua cây ${s.name.toLowerCase()} con — chạm chỗ trồng cây để trồng` : r.msg); if (r.ok) selectedSeed = s.id; } }, `${s.price} 🪙`))))),
      await (await import('./kitchen.js')).kitchenCard(),
    ],
  );
}
