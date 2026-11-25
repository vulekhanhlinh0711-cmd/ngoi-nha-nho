// Chuỗi ngày liên tiếp, mỗi tuần (T2–CN) được nghỉ phép tối đa `rest` ngày.
// Hôm nay chưa xong thì chưa tính là đứt chuỗi.
import { addDays, weekStart } from './dates.js';

export function streakOf(doneDays, firstDay, today, rest = 2) {
  if (!firstDay) return { days: 0, restLeft: rest };
  const used = new Map();
  let days = doneDays.has(today) ? 1 : 0;
  for (let d = addDays(today, -1); d >= firstDay; d = addDays(d, -1)) {
    if (doneDays.has(d)) { days++; continue; }
    const wk = weekStart(d);
    const n = used.get(wk) ?? 0;
    if (n >= rest) break;
    used.set(wk, n + 1);
  }
  return { days, restLeft: rest - (used.get(weekStart(today)) ?? 0) };
}
