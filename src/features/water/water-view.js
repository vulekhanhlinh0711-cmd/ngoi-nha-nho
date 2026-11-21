// Màn Nước: bình đầy dần, chạm để thêm, loại đồ uống, nhật ký trong ngày, cài đặt.
import { h, mount } from '../../ui/dom.js';
import { fmtMl } from '../../core/time.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { subnav } from '../../ui/subnav.js';
import {
  DRINKS, drinkOf, getWaterSettings, saveWaterSettings, baseGoal, getBonus, toggleBonus,
  HOT_ML, ACTIVE_ML, waterToday, addWater, undoWater, waterStreak,
} from './water.js';

let drinkId = 'water';
let settingsOpen = false; // giữ khung cài đặt mở sau khi lưu

export function bottle(total, goal, size = '') {
  const pct = Math.min(100, Math.round((total / goal) * 100));
  return h('div', {
    class: `bottle ${size}`, role: 'img', 'aria-label': `Đã uống ${pct}% mục tiêu`,
  },
    h('div', { class: 'bottle-cap' }),
    h('div', { class: 'bottle-body' },
      h('div', { class: 'water', style: `height:${pct}%` }, h('div', { class: 'wave' })),
      h('div', { class: 'bottle-text' }, h('b', {}, `${pct}%`))));
}

const timeOf = (iso) => new Date(iso).toTimeString().slice(0, 5);

function settingsCard(s) {
  const save = (patch) => saveWaterSettings({ ...s, ...patch });
  const num = (label, key, attrs = {}) => h('label', { class: 'field-inline' }, label,
    h('input', {
      type: 'number', class: 'input num', value: s[key] ?? '', ...attrs,
      onchange: (e) => save({ [key]: e.target.value === '' ? null : Number(e.target.value) }),
    }));
  const time = (label, key) => h('label', { class: 'field-inline' }, label,
    h('input', { type: 'time', class: 'input', value: s[key], onchange: (e) => e.target.value && save({ [key]: e.target.value }) }));

  return h('details', { class: 'card', open: settingsOpen, ontoggle: (e) => { settingsOpen = e.target.open; } },
    h('summary', {}, '⚙️ Cài đặt uống nước'),
    h('h4', {}, 'Mục tiêu'),
    h('p', { class: 'muted small' }, `Tự tính = cân nặng × ${s.mlPerKg} ml. Hiện tại: ${fmtMl(baseGoal(s))}/ngày.`),
    h('div', { class: 'form-row' },
      num('Cân nặng (kg)', 'weightKg', { min: '20', max: '300', placeholder: 'tùy chọn' }),
      num('ml mỗi kg', 'mlPerKg', { min: '25', max: '45' }),
      num('Hoặc đặt tay (ml)', 'goalMl', { min: '500', max: '6000', step: '50', placeholder: 'tự tính' })),
    h('h4', {}, 'Ly của tôi'),
    h('ul', { class: 'cup-edit' }, s.cups.map((c, i) => h('li', {},
      h('input', {
        class: 'input', value: c.name, 'aria-label': 'Tên ly',
        onchange: (e) => { const cups = [...s.cups]; cups[i] = { ...c, name: e.target.value || c.name }; save({ cups }); },
      }),
      h('input', {
        type: 'number', class: 'input num', value: c.ml, min: '50', max: '2000', step: '10', 'aria-label': 'Dung tích (ml)',
        onchange: (e) => { const cups = [...s.cups]; cups[i] = { ...c, ml: Number(e.target.value) || c.ml }; save({ cups }); },
      }), 'ml',
      h('label', { class: 'field-inline' },
        h('input', { type: 'radio', name: 'default-cup', checked: s.defaultCup === c.id, onchange: () => save({ defaultCup: c.id }) }),
        'mặc định'),
      s.cups.length > 1 ? h('button', {
        class: 'icon-btn', 'aria-label': `Xóa ${c.name}`,
        onclick: () => save({ cups: s.cups.filter((x) => x.id !== c.id), defaultCup: s.defaultCup === c.id ? s.cups.find((x) => x.id !== c.id).id : s.defaultCup }),
      }, '✕') : null))),
    h('button', {
      class: 'chip', onclick: () => save({ cups: [...s.cups, { id: `c${Date.now()}`, name: 'Ly mới', icon: '🥤', ml: 350 }] }),
    }, '+ Thêm ly'),
    h('h4', {}, 'Nhắc uống nước'),
    h('label', { class: 'switch' },
      h('input', { type: 'checkbox', checked: s.remind, onchange: (e) => save({ remind: e.target.checked }) }), ' Bật nhắc'),
    h('div', { class: 'form-row' },
      time('Giờ thức dậy', 'wake'), time('Giờ đi ngủ', 'sleep'),
      num('Cách nhau (phút)', 'intervalMin', { min: '20', max: '240', step: '5' })),
    h('p', { class: 'muted small' },
      'App không nhắc nếu bạn vừa uống, ngừng khi đã đủ, và không làm phiền khi đang tập trung (sẽ gợi ý vào giờ nghỉ).'));
}

export async function renderWater(root) {
  const s = await getWaterSettings();
  const { logs, total, goal } = await waterToday();
  const bonus = await getBonus();
  const streak = await waterStreak();
  const drink = drinkOf(drinkId);
  const add = async (ml) => {
    await addWater(ml, drinkId);
    toast(`${drink.icon} +${ml} ml ${drink.name.toLowerCase()}${drink.k < 1 ? ` (tính ${Math.round(ml * drink.k)} ml nước)` : ''}`);
  };
  const def = s.cups.find((c) => c.id === s.defaultCup) ?? s.cups[0];

  mount(root, 
    h('div', { class: 'view-head' },
      subnav('health', 'water'),
      h('h2', {}, 'Uống nước'),
      h('p', { class: 'muted' }, 'Mỗi ly nước cũng là một lần tưới cây 🌱')),
    h('section', { class: 'card water-main' },
      bottle(total, goal, 'big'),
      h('div', { class: 'water-side' },
        h('p', { class: 'water-total' }, h('b', {}, fmtMl(total)), ` / ${fmtMl(goal)}`),
        h('p', { class: 'muted small' }, total >= goal
          ? '🎉 Đủ nước hôm nay rồi!'
          : `Còn ${fmtMl(goal - total)} nữa.`,
        streak.days ? ` · 🔥 Chuỗi ${streak.days} ngày` : ''),
        h('button', { class: 'btn btn-big', onclick: () => add(def.ml) }, `${drink.icon} +${def.ml} ml`),
        h('div', { class: 'presets' }, s.cups.map((c) => h('button', { class: 'chip', onclick: () => add(c.ml) }, `${c.icon} ${c.name} ${c.ml}`))),
        h('div', { class: 'presets drinks', role: 'radiogroup', 'aria-label': 'Loại đồ uống' }, DRINKS.map((d) => h('button', {
          class: `chip${d.id === drinkId ? ' on' : ''}`, role: 'radio', 'aria-checked': String(d.id === drinkId),
          title: `Tính ${Math.round(d.k * 100)}% vào lượng nước`,
          onclick: () => { drinkId = d.id; notifyChange(); },
        }, `${d.icon} ${d.name}`))),
        h('div', { class: 'presets' },
          h('button', { class: `chip${bonus.hot ? ' on' : ''}`, 'aria-pressed': String(bonus.hot), onclick: () => toggleBonus('hot') }, `☀️ Trời nóng +${HOT_ML}`),
          h('button', { class: `chip${bonus.active ? ' on' : ''}`, 'aria-pressed': String(bonus.active), onclick: () => toggleBonus('active') }, `🏃 Vận động +${ACTIVE_ML}`)))),
    h('section', { class: 'card' },
      h('h3', {}, 'Hôm nay đã uống', h('span', { class: 'count' }, logs.length)),
      logs.length
        ? h('ul', { class: 'log-list' }, [...logs].reverse().map((e) => {
            const d = drinkOf(e.drink);
            return h('li', {},
              h('span', { class: 'muted' }, timeOf(e.at)),
              h('span', {}, `${d.icon} ${d.name} ${e.ml} ml`, e.hydrationMl !== e.ml ? h('span', { class: 'muted small' }, ` → ${e.hydrationMl} ml nước`) : ''),
              h('button', { class: 'icon-btn', 'aria-label': 'Xóa lần uống này', onclick: () => undoWater(e.id) }, '✕'));
          }))
        : h('p', { class: 'muted small' }, 'Chưa uống ly nào. Bắt đầu bằng một ly nhé!')),
    settingsCard(s),
  );
}
