// P7.02–P7.06: ngôi nhà — kéo thả/xoay/đổi màu nội thất, shop, mở phòng theo cấp,
// đồ đặc biệt dẫn tới Focus Room / nhật ký / heo đất, tường ảnh kỷ niệm.
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { getAll } from '../../core/db.js';
import { photoUrl } from '../../core/photos.js';
import { coinSummary } from '../rewards/coins.js';
import { openRoom } from '../room/room.js';
import { getGarden, seedOf } from '../garden/garden.js';
import { kitchenCard, vasesIn, vaseEl, dishOf } from '../garden/kitchen.js';
import { FURNITURE, furnitureOf, ROOMS, XP_PER_LEVEL } from './catalog.js';
import { sceneSvg, spriteSvg, timeOfDay } from './art.js';
import { isoHouse } from './iso.js';
import { savePhoto, deletePhoto } from '../../core/photos.js';
import { getSetting, setSetting } from '../../core/db.js';
import { getHouse, houseLevel, buyFurniture, placeItem, updateItem, storeItem, setRoomColors } from './home.js';

let roomId = 'living';
export function goRoom(id) { roomId = id; } // P45: mở thẳng một phòng (vd. từ Khu vườn vào Bếp)
let selected = null; // uid đồ đang chọn

// Đồ đặc biệt gắn vào tranh (P7.05, P12.09): bấm để đi tới tính năng tương ứng. Tọa độ % trên khung 800×500.
const HOTSPOTS = {
  living: [
    { icon: '📔', label: 'Sổ nhật ký', x: 50, y: 79, go: '#journal' },
    { icon: '🐷', label: 'Heo đất tiết kiệm', x: 92, y: 84, go: '#saving' },
    { icon: '📚', label: 'Kệ sách → Học', x: 16, y: 34, go: '#ielts' },
  ],
  bedroom: [
    { icon: '🌙', label: 'Thói quen trước khi ngủ', x: 28, y: 58, go: '#habits' },
    { icon: '🧸', label: 'Hôm nay bạn thấy thế nào? → Nhật ký', x: 41, y: 50, go: '#journal' },
    { icon: '🧘', label: 'Góc thiền → Tĩnh tâm', x: 80, y: 74, go: '#mindful' },
    { icon: '🌈', label: 'Vision board', x: 70, y: 24, go: '#vision' },
  ],
  study: [
    { icon: '🖥️', label: 'Bàn làm việc → Focus Room', x: 28, y: 52, room: true },
    { icon: '📌', label: 'Bảng ghim → Bảng việc', x: 54, y: 28, go: '#board' },
    { icon: '📖', label: 'Tủ sách → Kiến thức tài chính', x: 79, y: 40, go: '#lessons' },
    { icon: '📚', label: 'Góc đọc sách của bạn', x: 86, y: 66, go: '#books' },
  ],
  kitchen: [
    { icon: '🥗', label: 'Nhật ký ăn uống', x: 19, y: 46, go: '#food' },
    { icon: '💧', label: 'Uống nước', x: 50, y: 48, go: '#water' },
  ],
  bathroom: [
    { icon: '🪞', label: 'Gương → Nhân vật', x: 18, y: 28, go: '#avatar' },
    { icon: '🛁', label: 'Ngâm mình thư giãn → Focus Room', x: 66, y: 64, room: true },
  ],
  dressing: [
    { icon: '👗', label: 'Tủ đồ thật', x: 16, y: 36, go: '#closet' },
    { icon: '🪞', label: 'Gương → Nhân vật & outfit', x: 47, y: 40, go: '#avatar' },
    { icon: '✨', label: 'Tư vấn phong cách', x: 84, y: 36, go: '#stylist' },
    { icon: '📌', label: 'Mood board', x: 70, y: 82, go: '#moodboard' },
  ],
  yard: [
    { icon: '🌱', label: 'Ra vườn trồng cây', x: 58, y: 64, go: '#garden' },
    { icon: '🐦', label: 'Nhà chim → Thói quen', x: 89, y: 52, go: '#habits' },
  ],
  balcony: [
    { icon: '☕', label: 'Cà phê ban công → Focus Room', x: 50, y: 78, room: true },
    { icon: '🌸', label: 'Bồn hoa → Khu vườn', x: 22, y: 46, go: '#garden' },
  ],
};

function dragItem(el, it) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    selected = it.uid;
    el.parentElement.querySelectorAll('.furn.sel').forEach((n) => n.classList.remove('sel'));
    el.classList.add('sel');
    const canvas = el.parentElement.getBoundingClientRect();
    el.setPointerCapture(e.pointerId);
    let moved = false;
    const move = (ev) => {
      moved = true;
      it.x = Math.max(3, Math.min(97, ((ev.clientX - canvas.left) / canvas.width) * 100));
      it.y = Math.max(8, Math.min(95, ((ev.clientY - canvas.top) / canvas.height) * 100));
      el.style.left = `${it.x}%`;
      el.style.top = `${it.y}%`;
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      if (moved) updateItem(roomId, it.uid, { x: it.x, y: it.y });
      else notifyChange();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}

function furnEl(it) {
  const f = furnitureOf(it.id);
  const el = h('button', {
    class: `furn${selected === it.uid ? ' sel' : ''}`, title: f.name, 'aria-label': `${f.name} (kéo để di chuyển)`,
    style: `left:${it.x}%;top:${it.y}%;--rot:${it.rot}deg;--hue:${it.hue}deg;--size:${it.size}`,
    onkeydown: (e) => {
      const step = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
      if (step) { e.preventDefault(); updateItem(roomId, it.uid, { x: Math.max(3, Math.min(97, it.x + step[0])), y: Math.max(8, Math.min(95, it.y + step[1])) }); }
    },
    onfocus: () => { if (selected !== it.uid) { selected = it.uid; notifyChange(); } },
  }, spriteSvg(it.id));
  dragItem(el, it);
  return el;
}

function toolbar(it) {
  const f = furnitureOf(it.id);
  return h('div', { class: 'furn-tools' },
    h('b', {}, f.name),
    h('button', { class: 'chip', 'aria-label': 'Xoay trái', onclick: () => updateItem(roomId, it.uid, { rot: it.rot - 15 }) }, '↺'),
    h('button', { class: 'chip', 'aria-label': 'Xoay phải', onclick: () => updateItem(roomId, it.uid, { rot: it.rot + 15 }) }, '↻'),
    h('button', { class: 'chip', 'aria-label': 'Nhỏ lại', onclick: () => updateItem(roomId, it.uid, { size: Math.max(0.6, it.size - 0.2) }) }, '−'),
    h('button', { class: 'chip', 'aria-label': 'To ra', onclick: () => updateItem(roomId, it.uid, { size: Math.min(2.4, it.size + 0.2) }) }, '+'),
    h('label', { class: 'field-inline' }, 'Màu',
      h('input', { type: 'range', min: '0', max: '360', value: it.hue, 'aria-label': 'Đổi màu', onchange: (e) => updateItem(roomId, it.uid, { hue: Number(e.target.value) }) })),
    h('button', { class: 'chip', onclick: () => { selected = null; storeItem(roomId, it.uid); } }, 'Cất vào kho'));
}

// P14.03: bản đồ isometric; bấm phòng để vào.
function isoMap(house, lv, light) {
  const colors = Object.fromEntries(ROOMS.map((r) => [r.id, { wall: r.wall, floor: r.floor, ...(house.walls[r.id] ?? {}) }]));
  const svgEl = isoHouse({ rooms: ROOMS, unlocked: lv.unlocked, active: roomId, colors, light });
  const pickRoom = (e) => {
    const g = e.target.closest?.('.iso-room');
    if (!g || g.classList.contains('locked')) { if (g) toast(`Phòng này mở ở cấp ${ROOMS.find((r) => r.id === g.dataset.room).level}`); return; }
    roomId = g.dataset.room; selected = null; notifyChange();
    setTimeout(() => document.querySelector('.room-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  svgEl.addEventListener('click', pickRoom);
  svgEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickRoom(e); } });
  return h('section', { class: 'iso-wrap' }, svgEl);
}

// Thẻ phòng nhỏ trên bản đồ nhà (dùng lại tranh của phòng, thu nhỏ).
function roomCard(r, open, active, light) {
  return h('button', {
    class: `house-room time-${light.id}${active ? ' on' : ''}${open ? '' : ' locked'}`, role: 'tab', 'aria-selected': String(active),
    disabled: !open, title: open ? r.name : `Mở ở cấp ${r.level}`,
    style: `--wall:${r.wall};--floor:${r.floor};--sky1:${light.sky1};--sky2:${light.sky2};--sun:${light.sun};--dim:${light.dim}`,
    onclick: () => { roomId = r.id; selected = null; notifyChange(); document.querySelector('.room-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
  }, sceneSvg(r.id), h('span', { class: 'house-room-name' }, open ? `${r.icon} ${r.name}` : `🔒 ${r.name} · cấp ${r.level}`));
}

export async function renderHouse(root) {
  const house = await getHouse();
  const lv = await houseLevel();
  const coins = await coinSummary();
  if (!lv.unlocked.includes(roomId)) roomId = 'living';
  const room = ROOMS.find((r) => r.id === roomId);
  const colors = { wall: room.wall, floor: room.floor, ...(house.walls[roomId] ?? {}) };
  const items = house.rooms[roomId] ?? [];
  const sel = items.find((x) => x.uid === selected);
  const owned = FURNITURE.filter((f) => house.inventory[f.id] > 0);
  const lightPref = (await getSetting('houseLight')) ?? 'auto';
  const light = timeOfDay(lightPref);

  // Tường ảnh kỷ niệm (P7.06, P35): ảnh bạn chọn "Treo lên tường"; nếu chưa chọn ảnh nào thì dùng trang kỷ niệm đã treo.
  let gallery = null;
  if (roomId === 'living') {
    const { wallPhotos, lightbox } = await import('../journal/photo-ui.js');
    let pics = (await Promise.all((await wallPhotos()).map(async (id) => ({ id, url: await photoUrl(id) })))).filter((x) => x.url);
    if (!pics.length) {
      const wall = (await getAll('journal')).filter((e) => e.onWall && e.photoIds?.[0]).slice(0, 3);
      pics = (await Promise.all(wall.map(async (e) => ({ id: e.photoIds[0], url: await photoUrl(e.photoIds[0]) })))).filter((x) => x.url);
    }
    if (pics.length) {
      gallery = h('div', { class: 'gallery wall-gallery' }, pics.map((p, i) => h('button', {
        class: 'frame', title: 'Xem ảnh', style: `--tilt:${[-3, 2, -1, 3, -2, 1][i % 6]}deg`, onclick: () => lightbox(pics, i),
      }, h('img', { src: p.url, alt: 'Ảnh kỷ niệm' }))));
    }
  }
  const gdn = await getGarden();
  const harvest = roomId === 'kitchen' ? [...Object.entries(gdn.harvest ?? {}).map(([id, n]) => `${seedOf(id).icon}×${n}`), ...Object.entries(gdn.dishes ?? {}).map(([id, n]) => `${dishOf(id)?.icon ?? '🍽️'}×${n}`)] : [];
  const vases = await vasesIn(roomId);
  const bgUrl = house.bg?.[roomId] ? await photoUrl(house.bg[roomId]) : null;
  const nextNeed = lv.next ? (lv.next.level - 1) * XP_PER_LEVEL - coins.earned : 0;

  mount(root,
    h('div', { class: 'view-head' }, subnav('home', 'house'), h('h2', {}, 'Ngôi nhà nhỏ'),
      h('p', { class: 'muted' }, `Cấp ${lv.level}`, lv.next ? ` · kiếm thêm ${nextNeed} xu để mở ${lv.next.name}` : ' · đã mở hết các phòng'),
      h('div', { class: 'presets light-pick', role: 'radiogroup', 'aria-label': 'Ánh sáng' },
        [['auto', `🕰 Theo giờ (${timeOfDay('auto').name.toLowerCase()})`], ['morning', '🌅 Sáng'], ['day', '☀️ Ngày'], ['evening', '🌇 Hoàng hôn'], ['night', '🌙 Tối']].map(([k, label]) => h('button', {
          class: `chip${lightPref === k ? ' on' : ''}`, role: 'radio', 'aria-checked': String(lightPref === k),
          onclick: async () => { await setSetting('houseLight', k); notifyChange(); },
        }, label)))),
    isoMap(house, lv, light),
    h('section', {
      class: `room-canvas time-${light.id}`, 'aria-label': `${room.name}, ${items.length} món đồ`,
      style: `--wall:${colors.wall};--floor:${colors.floor};--sky1:${light.sky1};--sky2:${light.sky2};--sun:${light.sun};--dim:${light.dim}`,
    },
      bgUrl ? h('img', { class: 'scene-photo', src: bgUrl, alt: '' }) : sceneSvg(roomId),
      h('h3', { class: 'room-title' }, `${room.icon} ${room.name}`),
      gallery,
      (HOTSPOTS[roomId] ?? []).map((s) => h('button', {
        class: 'hotspot', style: `left:${s.x}%;top:${s.y}%`, 'aria-label': s.label,
        onclick: () => (s.room ? openRoom() : (location.hash = s.go)),
      }, h('span', { class: 'hotspot-icon' }, s.icon), h('span', { class: 'hotspot-label' }, s.label))),
      harvest.length ? h('button', { class: 'basket', title: 'Nông sản & món ăn — bấm để vào bếp', onclick: () => document.querySelector('.kitchen-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, '🧺 ', harvest.join(' ')) : null,
      vases.map(vaseEl),
      items.map(furnEl)),
    sel ? toolbar(sel) : h('p', { class: 'muted small' }, 'Bấm các biểu tượng sáng trong tranh để đi tới tính năng. Bấm một món đồ để xoay, đổi màu, đổi cỡ; kéo để di chuyển (hoặc phím mũi tên).'),
    roomId === 'kitchen' ? await kitchenCard() : null,
    h('div', { class: 'house-cards' },
      h('section', { class: 'card' },
        h('h3', {}, '🎨 Màu phòng'),
        h('div', { class: 'form-row' },
          room.outdoor ? null : h('label', { class: 'field-inline' }, 'Tường', h('input', { type: 'color', value: colors.wall, onchange: (e) => setRoomColors(roomId, { wall: e.target.value }) })),
          room.tiled ? null : h('label', { class: 'field-inline' }, room.outdoor ? 'Sàn gỗ' : 'Sàn', h('input', { type: 'color', value: colors.floor, onchange: (e) => setRoomColors(roomId, { floor: e.target.value }) })),
          h('button', { class: 'chip', onclick: () => setRoomColors(roomId, { wall: room.wall, floor: room.floor }) }, 'Màu gốc')),
        h('h4', {}, '🖼 Ảnh nền phòng'),
        h('p', { class: 'muted small' }, 'Dùng tranh/ảnh bạn thích (ví dụ ảnh trong thư mục Mẫu thiết kế) làm nền cho phòng này. Ảnh chỉ lưu trên máy bạn.'),
        h('div', { class: 'presets' },
          h('label', { class: 'chip file-chip' }, '📷 Chọn ảnh…', h('input', {
            type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const id = await savePhoto(f);
              const hs = await getHouse();
              if (hs.bg?.[roomId]) await deletePhoto(hs.bg[roomId]);
              hs.bg = { ...(hs.bg ?? {}), [roomId]: id };
              await setSetting('house', hs); notifyChange();
              toast('Đã đặt ảnh nền cho phòng');
            },
          })),
          bgUrl ? h('button', {
            class: 'chip', onclick: async () => {
              const hs = await getHouse();
              await deletePhoto(hs.bg[roomId]); delete hs.bg[roomId];
              await setSetting('house', hs); notifyChange();
            },
          }, '↺ Dùng tranh vẽ mặc định') : null)),
      h('section', { class: 'card' },
        h('h3', {}, '📦 Kho đồ'),
        owned.length ? h('div', { class: 'inv-grid' }, owned.map((f) => h('button', {
          class: 'inv-item', title: `Đặt ${f.name} vào ${room.name}`,
          onclick: async () => { const it = await placeItem(roomId, f.id); if (it) { selected = it.uid; notifyChange(); } },
        }, spriteSvg(f.id), h('span', {}, f.name), h('b', {}, `×${house.inventory[f.id]}`)))) : h('p', { class: 'muted small' }, 'Kho trống. Mua đồ ở cửa hàng rồi bấm vào món đồ trong kho để đặt vào phòng.'))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, '🏪 Cửa hàng nội thất & cây hoa'), h('span', { class: 'coin' }, `🪙 ${coins.balance}`)),
      h('ul', { class: 'shop-grid' }, FURNITURE.map((f) => h('li', { class: 'shop-card' },
        spriteSvg(f.id), h('span', { class: 'shop-name' }, f.name),
        h('button', {
          class: 'chip', disabled: coins.balance < f.price,
          onclick: async () => { toast((await buyFurniture(f.id)) ? `Đã mua ${f.name}. Vào Kho đồ để đặt vào phòng.` : 'Chưa đủ xu'); },
        }, `${f.price} 🪙`))))),
  );
}
