// P7.07–P7.09: nhân vật, shop thời trang, outfit và lịch mặc.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { addDays, toDate, WEEKDAY_NAMES } from '../../core/dates.js';
import { coinSummary } from '../rewards/coins.js';
import {
  CLOTHES, clothOf, STYLES, SEASONS, OCCASIONS, SLOTS, SKIN, HAIR_COLORS, HAIR_STYLES, EYES,
  isAvailable, LIMITED, currentSeason,
} from './catalog.js';
import { figureSvg } from './figure.js';
import { LOOKS, lookUrl } from '../../core/profile.js';
import { getSetting, setSetting } from '../../core/db.js';
import { savePhoto, deletePhoto, photoUrl } from '../../core/photos.js';

// P21: ảnh nhân vật 3D do bạn tạo (AI) — ảnh chính + ảnh riêng cho từng outfit. Lưu trên máy (bảng photos).
async function charImages() { return { main: null, outfits: {}, ...((await getSetting('charImages')) ?? {}) }; }
async function setCharImage(key, file) {
  const ci = await charImages();
  const old = key === 'main' ? ci.main : ci.outfits[key];
  const id = file ? await savePhoto(file, 1400) : null;
  if (old) await deletePhoto(old);
  if (key === 'main') ci.main = id; else if (id) ci.outfits[key] = id; else delete ci.outfits[key];
  await setSetting('charImages', ci);
  notifyChange();
}
const fileBtn = (label, onFile) => h('label', { class: 'chip file-chip' }, label, h('input', {
  type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const f = e.target.files?.[0]; if (f) await onFile(f); },
}));
export const CHAR_PROMPT = 'Cute 3D Pixar-style cartoon girl, full body, standing, long wavy brown hair, big sparkling brown eyes, small gold hoop earrings, soft smile, [MÔ TẢ BỘ ĐỒ, ví dụ: pink striped oversized shirt, light blue wide-leg jeans, white sneakers], soft warm studio lighting, plain cream background, high detail, glossy, 4k';
function charCard(ci, a) {
  return h('details', { class: 'card char-card' },
    h('summary', {}, '🖼 Dùng ảnh nhân vật 3D của bạn (đẹp như ảnh mẫu)'),
    h('p', { class: 'muted small' }, 'Tạo ảnh nhân vật bằng công cụ AI tạo ảnh (ChatGPT, Gemini, Copilot…), giữ cùng một nhân vật và đổi bộ đồ, rồi tải vào đây. Ảnh chỉ lưu trên máy bạn.'),
    h('div', { class: 'prompt-box' },
      h('code', {}, CHAR_PROMPT),
      h('button', { class: 'chip', onclick: async () => { try { await navigator.clipboard.writeText(CHAR_PROMPT); toast('Đã chép câu lệnh tạo ảnh'); } catch { toast('Không chép được, hãy bôi đen để chép'); } } }, '📋 Chép câu lệnh')),
    h('div', { class: 'presets' },
      fileBtn(ci.main ? '🔄 Đổi ảnh nhân vật chính' : '📷 Tải ảnh nhân vật chính', (f) => setCharImage('main', f)),
      ci.main ? h('button', { class: 'chip', onclick: () => setCharImage('main', null) }, '↺ Dùng hình vẽ') : null),
    a.outfits.length ? [h('h4', {}, 'Ảnh cho từng outfit (khi mặc/lịch mặc outfit đó sẽ hiện ảnh này)'),
      h('ul', { class: 'log-list' }, a.outfits.map((o) => h('li', {},
        h('span', { class: 'grow' }, o.name, ci.outfits[o.name] ? ' ✅' : ''),
        fileBtn(ci.outfits[o.name] ? 'Đổi ảnh' : '📷 Thêm ảnh', (f) => setCharImage(o.name, f)),
        ci.outfits[o.name] ? h('button', { class: 'icon-btn', 'aria-label': `Bỏ ảnh outfit ${o.name}`, onclick: () => setCharImage(o.name, null) }, '✕') : null)))] : null);
}
// Ảnh hiện trên sân khấu: ảnh của outfit đang mặc (nếu khớp) → ảnh chính → hình vẽ.
async function stageImage(ci, a, items, planned) {
  const same = (x, y) => JSON.stringify(Object.entries(x).sort()) === JSON.stringify(Object.entries(y).sort());
  const match = planned ?? a.outfits.find((o) => same(o.items, items))?.name;
  const id = (match && ci.outfits[match]) || ci.main;
  if (id) return photoUrl(id);
  // P32: không có ảnh tự tải → ảnh 3D có sẵn theo trang phục đang chọn ('svg' = dùng hình vẽ mặc đồ trong tủ).
  const look = (await getSetting('charLook')) ?? 'blue';
  return look === 'svg' ? null : lookUrl(look);
}

function lookPicker(cur) {
  const pick = async (k) => { await setSetting('charLook', k); notifyChange(); };
  return h('section', { class: 'card' },
    h('h3', {}, '👗 Chọn trang phục'),
    h('div', { class: 'look-grid', role: 'radiogroup', 'aria-label': 'Trang phục nhân vật' },
      LOOKS.map(([k, name]) => h('button', {
        class: `look-card${cur === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(cur === k), onclick: () => pick(k),
      }, h('img', { src: lookUrl(k), alt: '', loading: 'lazy' }), h('span', {}, name))),
      h('button', { class: `look-card svg${cur === 'svg' ? ' on' : ''}`, role: 'radio', 'aria-checked': String(cur === 'svg'), onclick: () => pick('svg') },
        h('span', { class: 'look-svg-ic' }, '✏️'), h('span', {}, 'Hình vẽ (mặc đồ trong tủ)'))));
}
import { getAvatar, saveAvatar, buyCloth, wear, saveOutfit, scheduleOutfit, outfitToday, expressionToday } from './home.js';

const MOUTH = { joy: 'grin', happy: 'smile', calm: 'soft', meh: 'flat', sad: 'frown', tired: 'tired' };
let filters = { style: '', season: '', occasion: '' };

// Ngoại hình nhân vật (P20: vẽ toàn thân kiểu 3D trong figure.js).
export function avatarArt(a, items, expression = 'calm', size = '') {
  const on = (slot) => (items[slot] ? clothOf(items[slot]) : null);
  const top = on('dress') ?? on('top');
  return h('div', { class: `avatar ${size} hair-${a.hair} eyes-${a.eyes} mouth-${MOUTH[expression] ?? 'soft'}`, style: `--skin:${a.skin};--hair:${a.hairColor};--top:${top?.color ?? '#cfd8c8'};--bottom:${on('bottom')?.color ?? (on('dress') ? top.color : '#7b8aa0')}`, role: 'img', 'aria-label': `Nhân vật, biểu cảm ${expression}` },
    h('div', { class: 'av-hair-back' }),
    h('div', { class: 'av-body' }, h('div', { class: `av-top${on('dress') ? ' dress' : ''}` }), h('div', { class: 'av-bottom' })),
    h('div', { class: 'av-head' }, h('div', { class: 'av-eyes' }, h('span'), h('span')), h('div', { class: 'av-blush' }), h('div', { class: 'av-mouth' })),
    h('div', { class: 'av-hair-front' }),
    on('outer') ? h('span', { class: 'av-item outer' }, on('outer').icon) : null,
    on('shoes') ? h('span', { class: 'av-item shoes' }, on('shoes').icon) : null,
    on('bag') ? h('span', { class: 'av-item bag' }, on('bag').icon) : null,
    on('acc') ? h('span', { class: 'av-item acc' }, on('acc').icon) : null,
    expression === 'tired' ? h('span', { class: 'av-item zz' }, '💤') : null);
}

function customizer(a) {
  const pick = (label, list, key, render) => h('div', { class: 'presets' }, h('span', { class: 'meta-text' }, label),
    list.map((v) => { const val = Array.isArray(v) ? v[0] : v; return h('button', {
      class: `chip${a[key] === val ? ' on' : ''}`, 'aria-pressed': String(a[key] === val), title: Array.isArray(v) ? v[1] : val,
      onclick: () => saveAvatar({ ...a, [key]: val }),
    }, render(v)); }));
  const dot = (c) => h('span', { class: 'color-dot', style: `background:${c}`, 'aria-label': c });
  return h('details', { class: 'card' }, h('summary', {}, '✂️ Tùy chỉnh ngoại hình'),
    pick('Da', SKIN, 'skin', dot), pick('Màu tóc', HAIR_COLORS, 'hairColor', dot),
    pick('Kiểu tóc', HAIR_STYLES, 'hair', (v) => v[1]), pick('Mắt', EYES, 'eyes', (v) => v[1]));
}

function shop(a, coins) {
  const month = new Date().getMonth() + 1;
  const list = CLOTHES.filter((c) => isAvailable(c, month)
    && (!filters.style || c.styles.includes(filters.style))
    && (!filters.season || c.seasons.includes(filters.season))
    && (!filters.occasion || c.occasions.includes(filters.occasion)));
  const sel = (key, label, opts) => h('label', { class: 'field-inline' }, label, h('select', {
    class: 'input', onchange: (e) => { filters = { ...filters, [key]: e.target.value }; notifyChange(); },
  }, h('option', { value: '' }, 'Tất cả'), opts.map((o) => h('option', { value: o, selected: filters[key] === o }, o))));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, '🛍️ Shop thời trang'), h('span', { class: 'coin' }, `🪙 ${coins}`)),
    h('div', { class: 'form-row' }, sel('style', 'Phong cách', STYLES), sel('season', 'Mùa', SEASONS), sel('occasion', 'Dịp', OCCASIONS)),
    h('p', { class: 'muted small' }, `Bộ sưu tập mùa ${currentSeason()} đang mở. Đồ có 🌟 là đồ giới hạn theo mùa.`),
    list.length ? h('ul', { class: 'shop grid' }, list.map((c) => {
      const own = a.owned.includes(c.id);
      const worn = Object.values(a.wearing).includes(c.id);
      return h('li', {},
        h('span', { class: 'shop-icon', style: `text-shadow:0 0 0 ${c.color}` }, c.icon),
        h('span', { class: 'grow' }, `${c.name}${LIMITED[c.id] ? ' 🌟' : ''}`, h('span', { class: 'meta-text' }, ` · ${c.collection}`)),
        own ? h('button', { class: `chip${worn ? ' on' : ''}`, onclick: () => wear(c.id) }, worn ? 'Đang mặc' : 'Mặc')
          : h('button', { class: 'chip', disabled: coins < c.price, onclick: async () => { if (await buyCloth(c.id)) { await wear(c.id); toast(`Đã mua ${c.name}`); } else toast('Chưa đủ xu'); } }, `${c.price} 🪙`));
    })) : h('p', { class: 'muted small' }, 'Không có món nào khớp bộ lọc.'));
}

function outfits(a) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i));
  return h('section', { class: 'card' },
    h('h3', {}, '👗 Outfit đã phối'),
    a.outfits.length ? h('ul', { class: 'log-list' }, a.outfits.map((o) => h('li', {},
      h('span', { class: 'grow' }, h('b', {}, o.name), ' ', Object.values(o.items).map((id) => clothOf(id)?.icon).join(' ')),
      h('button', { class: 'chip', onclick: async () => { await saveAvatar({ ...a, wearing: { ...o.items } }); toast(`Đang mặc “${o.name}”`); } }, 'Mặc'),
      h('button', { class: 'icon-btn', 'aria-label': `Xóa outfit ${o.name}`, onclick: () => saveAvatar({ ...a, outfits: a.outfits.filter((x) => x !== o) }) }, '✕')))) : h('p', { class: 'muted small' }, 'Phối đồ đang mặc rồi đặt tên để lưu.'),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const name = e.target.elements.n.value.trim();
        if (!name) return;
        if (!Object.keys(a.wearing).length) { toast('Nhân vật chưa mặc gì cả'); return; }
        await saveOutfit(name);
        toast(`Đã lưu outfit “${name}”`);
      },
    }, h('input', { class: 'input', name: 'n', maxlength: '30', placeholder: 'Tên outfit (Đi làm thứ 2…)', 'aria-label': 'Tên outfit' }), h('button', { class: 'chip', type: 'submit' }, 'Lưu')),
    a.outfits.length ? [h('h4', {}, '📅 Lịch mặc 7 ngày tới'),
      h('ul', { class: 'log-list' }, days.map((d) => h('li', {},
        h('span', { class: 'grow' }, d === todayKey() ? 'Hôm nay' : `${WEEKDAY_NAMES[toDate(d).getDay()]} ${toDate(d).getDate()}/${toDate(d).getMonth() + 1}`),
        h('select', { class: 'input', 'aria-label': `Outfit ngày ${d}`, onchange: (e) => scheduleOutfit(d, e.target.value) },
          h('option', { value: '' }, '—'), a.outfits.map((o) => h('option', { value: o.name, selected: a.schedule[d] === o.name }, o.name))))))] : null);
}

export async function renderAvatar(root) {
  const { avatar: a, items, planned } = await outfitToday();
  const expr = await expressionToday();
  const coins = (await coinSummary()).balance;
  const ci = await charImages();
  const img = await stageImage(ci, a, items, planned);
  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'avatar'), h('h2', {}, 'Nhân vật & tủ đồ')),
    h('section', { class: 'card avatar-card' },
      h('div', { class: `figure-stage${img ? ' photo' : ''}` }, img ? h('img', { class: 'char-photo', src: img, alt: 'Nhân vật của bạn' }) : figureSvg(a, items, expr)),
      h('div', {},
        h('p', {}, planned ? `Hôm nay mặc “${planned}” theo lịch.` : 'Đồ đang mặc.'),
        h('p', { class: 'muted small' }, 'Biểu cảm thay đổi theo cảm xúc bạn ghi trong Nhật ký hôm nay.'),
        h('div', { class: 'presets' }, SLOTS.filter(([s]) => items[s]).map(([s, l]) => h('span', { class: 'meta-chip' }, `${l}: ${clothOf(items[s]).name}`))))),
    lookPicker((await getSetting('charLook')) ?? 'blue'),
    charCard(ci, a),
    customizer(a),
    shop(a, coins),
    outfits(a));
}
