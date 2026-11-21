// P7: dữ liệu ngôi nhà, nhân vật, outfit, mood board, tủ đồ thật (lưu trong settings, ảnh trong bảng photos).
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange, queryEvents } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { deletePhoto } from '../../core/photos.js';
import { coinSummary } from '../rewards/coins.js';
import { furnitureOf, clothOf, ROOMS, levelOf } from './catalog.js';

async function load(key, def) { return { ...def, ...((await getSetting(key)) ?? {}) }; }
async function store(key, v) { await setSetting(key, v); notifyChange(); }

async function spend(amount, item) {
  if ((await coinSummary()).balance < amount) return false;
  await logEvent('coins_spent', { amount, item, day: todayKey() });
  return true;
}

// ---- Nhà ----
const HOUSE = { rooms: {}, inventory: {}, walls: {} };
export const getHouse = () => load('house', HOUSE);
export async function houseLevel() {
  const level = levelOf((await coinSummary()).earned);
  return { level, unlocked: ROOMS.filter((r) => r.level <= level).map((r) => r.id), next: ROOMS.find((r) => r.level > level) };
}

export async function buyFurniture(id) {
  const f = furnitureOf(id);
  if (!(await spend(f.price, `furniture:${id}`))) return false;
  const h = await getHouse();
  h.inventory[id] = (h.inventory[id] ?? 0) + 1;
  await store('house', h);
  return true;
}
export async function placeItem(room, id) {
  const h = await getHouse();
  if (!(h.inventory[id] > 0)) return null;
  h.inventory[id] -= 1;
  const item = { uid: `${id}-${Date.now()}`, id, x: 35 + Math.random() * 30, y: 80 + Math.random() * 10, rot: 0, hue: 0, size: 1 };
  (h.rooms[room] ??= []).push(item);
  await store('house', h);
  return item;
}
export async function updateItem(room, uid, patch, silent = false) {
  const h = await getHouse();
  const it = h.rooms[room]?.find((x) => x.uid === uid);
  if (!it) return;
  Object.assign(it, patch);
  if (silent) await setSetting('house', h); else await store('house', h);
}
export async function storeItem(room, uid) {
  const h = await getHouse();
  const it = h.rooms[room]?.find((x) => x.uid === uid);
  if (!it) return;
  h.rooms[room] = h.rooms[room].filter((x) => x.uid !== uid);
  h.inventory[it.id] = (h.inventory[it.id] ?? 0) + 1;
  await store('house', h);
}
export async function setRoomColors(room, colors) {
  const h = await getHouse();
  h.walls[room] = { ...(h.walls[room] ?? {}), ...colors };
  await store('house', h);
}

// ---- Nhân vật & tủ đồ game ----
const AVATAR = { skin: '#eec1a0', hair: 'long', hairColor: '#5a3a29', eyes: 'round', owned: [], wearing: {}, outfits: [], schedule: {} };
export const getAvatar = () => load('avatar', AVATAR);
export const saveAvatar = (a) => store('avatar', a);
export async function buyCloth(id) {
  const a = await getAvatar();
  if (a.owned.includes(id)) return true;
  const c = clothOf(id);
  if (!(await spend(c.price, `cloth:${id}`))) return false;
  a.owned.push(id);
  await store('avatar', a);
  return true;
}
export async function wear(id) {
  const a = await getAvatar();
  const c = clothOf(id);
  if (!a.owned.includes(id)) return;
  if (a.wearing[c.slot] === id) delete a.wearing[c.slot];
  else {
    a.wearing[c.slot] = id;
    // Đầm thay cho áo + quần và ngược lại.
    if (c.slot === 'dress') { delete a.wearing.top; delete a.wearing.bottom; }
    if (c.slot === 'top' || c.slot === 'bottom') delete a.wearing.dress;
  }
  await store('avatar', a);
}
export async function saveOutfit(name) {
  const a = await getAvatar();
  a.outfits = [...a.outfits.filter((o) => o.name !== name), { name, items: { ...a.wearing } }];
  await store('avatar', a);
}
export async function scheduleOutfit(day, name) {
  const a = await getAvatar();
  if (name) a.schedule[day] = name; else delete a.schedule[day];
  await store('avatar', a);
}
// Outfit cho hôm nay: theo lịch nếu có, không thì đồ đang mặc.
export async function outfitToday() {
  const a = await getAvatar();
  const planned = a.outfits.find((o) => o.name === a.schedule[todayKey()]);
  return { avatar: a, items: planned?.items ?? a.wearing, planned: planned?.name ?? null };
}

// Biểu cảm theo trạng thái trong ngày (cảm xúc đã ghi, hoặc ngày mệt).
export async function expressionToday() {
  const moods = (await queryEvents('mood_logged')).filter((e) => e.day === todayKey());
  const mood = moods.at(-1)?.mood;
  if ((await getSetting('tiredDay')) === todayKey()) return 'tired';
  return mood ? ['sad', 'meh', 'calm', 'happy', 'joy'][mood - 1] : 'calm';
}

// ---- Mood board (P7.10) ----
export async function boards() { return (await getSetting('moodboards')) ?? [{ id: 'b1', name: 'Cảm hứng', pins: [] }]; }
export async function saveBoards(list) { await store('moodboards', list); }
export async function removePin(boardId, i) {
  const list = await boards();
  const b = list.find((x) => x.id === boardId);
  const [pin] = b.pins.splice(i, 1);
  if (pin?.photoId) await deletePhoto(pin.photoId);
  await saveBoards(list);
}

// ---- Tủ đồ thật (P7.11) ----
export async function closet() { return (await getSetting('closet')) ?? []; }
export async function saveCloset(list) { await store('closet', list); }
// Tránh mua trùng: món cùng loại và cùng màu đã có.
export function similarIn(list, { category, color }) {
  return list.filter((x) => x.category === category && x.color && color && x.color.toLowerCase() === color.toLowerCase());
}
