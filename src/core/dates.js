// Tiện ích ngày dạng khóa 'YYYY-MM-DD' theo giờ máy.
const pad = (n) => String(n).padStart(2, '0');
export const makeKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function toDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const fromDate = (dt) => makeKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());

export const addDays = (key, n) => {
  const dt = toDate(key);
  dt.setDate(dt.getDate() + n);
  return fromDate(dt);
};

export const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / 86_400_000);

export function isValidDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// Thứ trong tuần kế tiếp (luôn sau hôm nay). weekday: 0 = Chủ nhật … 6 = Thứ 7.
export function nextWeekday(key, weekday) {
  const diff = (weekday - toDate(key).getDay() + 7) % 7 || 7;
  return addDays(key, diff);
}

export const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function dateLabel(key, today) {
  const n = diffDays(today, key);
  const dt = toDate(key);
  const dm = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;
  if (n === 0) return { text: 'Hôm nay', overdue: false };
  if (n === 1) return { text: 'Mai', overdue: false };
  if (n === -1) return { text: 'Hôm qua', overdue: true };
  if (n < 0) return { text: `Quá hạn ${dm}`, overdue: true };
  if (n < 7) return { text: `${WEEKDAY_NAMES[dt.getDay()]} ${dm}`, overdue: false };
  const sameYear = dt.getFullYear() === toDate(today).getFullYear();
  return { text: sameYear ? dm : `${dm}/${dt.getFullYear()}`, overdue: false };
}

// Thứ 2 đầu tuần chứa ngày key.
export const weekStart = (key) => addDays(key, -((toDate(key).getDay() + 6) % 7));
