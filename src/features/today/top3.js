// P1.06: 3 việc quan trọng nhất trong ngày. Sang ngày mới thì chọn lại.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent, notifyChange } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { moveTask } from '../tasks/tasks.js';

export const TOP_MAX = 3;

export async function getTop3() {
  const v = await getSetting('top3');
  return v?.day === todayKey() ? v.ids : null;
}

export async function setTop3(ids) {
  ids = ids.slice(0, TOP_MAX);
  await setSetting('top3', { day: todayKey(), ids });
  // Việc được chọn thì chuyển luôn vào Hôm nay.
  for (const id of ids) await moveTask(id, 'today');
  await logEvent('top3_set', { ids });
  notifyChange();
}

// Gợi ý thứ tự khi chọn: đến hạn/quá hạn, rồi quan trọng & gấp, quan trọng, đã ở Hôm nay, gấp.
export function suggestScore(t, today) {
  if (t.dueDate && t.dueDate <= today) return 0;
  if (t.important && t.urgent) return 1;
  if (t.important) return 2;
  if (t.status === 'today') return 3;
  if (t.urgent) return 4;
  return 5;
}
