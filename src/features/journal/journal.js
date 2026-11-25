// P4: dữ liệu nhật ký (bảng journal) và cảm xúc hằng ngày (sự kiện mood_logged).
import { get, put, del, getAll, getAllByIndex } from '../../core/db.js';
import { logEvent, queryEvents, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { deletePhoto } from '../../core/photos.js';

export const KINDS = [
  ['memory', '📸 Kỷ niệm', 'Lưu khoảnh khắc đẹp lâu dài'],
  ['vent', '🌧️ Xả stress', 'Kể hết ra đây, viết xong chọn giữ lại hoặc thả trôi'],
  ['gratitude', '🙏 Biết ơn', '1–3 điều nhỏ, viết trong 1 phút'],
];
export const MOODS = [
  [1, '😢', 'Buồn'], [2, '😕', 'Hơi tệ'], [3, '😐', 'Bình thường'], [4, '🙂', 'Vui'], [5, '😄', 'Rất vui'],
];
export const moodOf = (v) => MOODS.find((m) => m[0] === v);
export const DEFAULT_TAGS = ['công việc', 'gia đình', 'niềm vui nhỏ', 'biết ơn'];

const now = () => new Date().toISOString();

export async function saveEntry(entry) {
  const e = { tags: [], photoIds: [], ...entry, day: entry.day ?? todayKey(), updatedAt: now() };
  e.createdAt ??= now();
  e.id = await put('journal', e);
  // Chỉ ghi nhận là có viết (không lưu nội dung vào nhật ký sự kiện).
  if (!entry.id) await logEvent('journal_written', { kind: e.kind, day: e.day });
  notifyChange();
  return e;
}

export const getEntry = (id) => get('journal', id);

// P4.03: xóa thật khỏi máy (cả ảnh đính kèm).
export async function deleteEntry(id) {
  const e = await get('journal', id);
  if (!e) return;
  for (const p of e.photoIds ?? []) await deletePhoto(p);
  await del('journal', id);
  notifyChange();
}
export async function releaseEntry(id, how) {
  const e = await get('journal', id);
  await deleteEntry(id);
  await logEvent('vent_released', { how, day: e?.day ?? todayKey() });
}

export async function allEntries() {
  return (await getAll('journal')).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export const entriesOn = (day) => getAllByIndex('journal', 'day', day);

export async function logMood(mood, note = '') {
  await logEvent('mood_logged', { mood, note, day: todayKey() });
  notifyChange();
}
// Cảm xúc theo ngày (lần ghi sau cùng trong ngày).
export async function moodByDay() {
  const map = new Map();
  for (const e of (await queryEvents('mood_logged')).sort((a, b) => a.id - b.id)) map.set(e.day, e);
  return map;
}

export async function allTags() {
  const set = new Set(DEFAULT_TAGS);
  for (const e of await getAll('journal')) for (const t of e.tags ?? []) set.add(t);
  return [...set];
}
