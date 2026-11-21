// Màn Khu vườn (P6.05–P6.07).
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getSetting } from '../../core/db.js';
import { plantSvg, gardenBackdrop, timeOfDay } from '../home/art.js';
import { SEEDS, seedOf, gardenState, buySeed, plant, harvest, claimTomatoes, POMODOROS_PER_TOMATO } from './garden.js';

let selectedSeed = null;

function plotCell(p, i, seedsLeft) {
  if (!p) {
    return h('button', {
      class: 'plot empty', 'aria-label': `Ô đất ${i + 1} trống${selectedSeed ? `, trồng ${seedOf(selectedSeed).name}` : ''}`,
      onclick: async () => {
        if (!selectedSeed) { toast('Chọn một loại hạt trong túi trước nhé'); return; }
        if (await plant(i, selectedSeed)) {
          toast(`🌱 Đã gieo ${seedOf(selectedSeed).name}`);
          if (!(seedsLeft[selectedSeed] > 1)) selectedSeed = null;
        }
      },
    }, selectedSeed ? '＋' : '');
  }
  const label = p.ripe ? `${p.seed.name} đã chín` : `${p.seed.name} lớn ${Math.round(p.ratio * 100)}%${p.thirsty ? ', hơi khát' : ''}`;
  return h('div', { class: `plot${p.ripe ? ' ripe' : ''}${p.thirsty ? ' thirsty' : ''}`, title: label, role: 'img', 'aria-label': label },
    plantSvg(p.seed.id, p.stage, p.ripe),
    p.ripe ? h('div', { class: 'plot-actions' },
      h('button', {
        class: 'chip', onclick: async () => { const s = await harvest(i, true); if (s) toast(`Đã bán ${s.name}: +${s.sell} 🪙`); },
      }, `Bán +${p.seed.sell}`),
      h('button', {
        class: 'chip', onclick: async () => { const s = await harvest(i, false); if (s) toast(`${s.icon} Đã cất vào bếp`); },
      }, 'Cất'))
      : h('div', { class: 'plot-bar' }, h('span', { style: `width:${p.ratio * 100}%` })));
}

export async function renderGarden(root) {
  const { g, plots, tomatoes, coins } = await gardenState();
  const bag = SEEDS.filter((s) => g.seeds[s.id] > 0);
  if (selectedSeed && !(g.seeds[selectedSeed] > 0)) selectedSeed = null;
  const thirsty = plots.some((p) => p?.thirsty);
  const light = timeOfDay((await getSetting('houseLight')) ?? 'auto');

  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'garden'), h('h2', {}, 'Khu vườn'),
      h('p', { class: 'muted' }, 'Cây lớn mỗi ngày. Uống đủ nước là tưới cây, giữ thói quen thì cây lớn nhanh hơn.')),
    thirsty ? h('p', { class: 'insight' }, '💧 Vài cây hơi khát. Uống một ly nước là vườn tươi lại ngay.') : null,
    h('section', { class: `garden-scene time-${light.id}`, style: `--sky1:${light.sky1};--sky2:${light.sky2};--sun:${light.sun};--dim:${light.dim}` },
      gardenBackdrop(),
      h('div', { class: 'garden-grid' }, plots.map((p, i) => plotCell(p, i, g.seeds)))),
    h('section', { class: 'card' },
      h('h3', {}, '👜 Túi hạt giống'),
      tomatoes ? h('p', {}, `🍅 Bạn có ${tomatoes} hạt cà chua từ Pomodoro (mỗi ${POMODOROS_PER_TOMATO} phiên = 1 hạt). `,
        h('button', { class: 'chip', onclick: async () => { const n = await claimTomatoes(); toast(`Đã nhận ${n} hạt cà chua`); } }, 'Nhận')) : null,
      bag.length ? h('div', { class: 'presets', role: 'radiogroup', 'aria-label': 'Chọn hạt để gieo' }, bag.map((s) => h('button', {
        class: `chip${selectedSeed === s.id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(selectedSeed === s.id),
        onclick: () => { selectedSeed = selectedSeed === s.id ? null : s.id; notifyChange(); },
      }, `${s.icon} ${s.name} ×${g.seeds[s.id]}`))) : h('p', { class: 'muted small' }, 'Túi đang trống. Mua hạt ở cửa hàng bên dưới nhé.'),
      selectedSeed ? h('p', { class: 'muted small' }, 'Bấm vào ô đất trống để gieo.') : null),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '🏪 Cửa hàng hạt giống'), h('span', { class: 'coin' }, `🪙 ${coins}`)),
      h('ul', { class: 'shop' }, SEEDS.filter((s) => s.price).map((s) => h('li', {},
        h('span', { class: 'shop-icon' }, s.icon),
        h('div', { class: 'grow' }, h('b', {}, s.name), h('span', { class: 'meta-text' }, ` · chín sau ~${s.days} ngày · bán ${s.sell} 🪙`)),
        h('button', {
          class: 'chip', disabled: coins < s.price,
          onclick: async () => { const r = await buySeed(s.id); toast(r.ok ? `Đã mua hạt ${s.name}` : r.msg); },
        }, `${s.price} 🪙`))))),
    Object.keys(g.harvest).length ? h('section', { class: 'card' },
      h('h3', {}, '🧺 Đã cất vào bếp'),
      h('p', {}, Object.entries(g.harvest).map(([id, n]) => `${seedOf(id).icon} ×${n}`).join('  '))) : null,
  );
}
