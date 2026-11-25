// Ngày theo giờ máy, dạng YYYY-MM-DD.
export const todayKey = (d = new Date()) => d.toLocaleDateString('sv-SE');

// Giờ phút hiện tại, dạng HH:MM.
export const nowHM = (d = new Date()) => d.toTimeString().slice(0, 5);

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'vừa xong';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export const dayOf = (iso) => todayKey(new Date(iso));

// 1500000 → "25:00"
export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// "HH:MM" của hôm nay → Date
export function atTime(hm, base = new Date()) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export const fmtMl = (ml) => `${Math.round(ml).toLocaleString('vi-VN')} ml`;
