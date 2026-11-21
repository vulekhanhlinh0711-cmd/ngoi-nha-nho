// P1.03: nhắc giờ phân loại Inbox (mặc định 9:00 và 16:00).
// Chỉ chạy khi app đang mở (kể cả tab nền). Nhắc khi đã đóng app cần Web Push, làm sau.
import { getSetting, setSetting } from '../../core/db.js';
import { bus, logEvent } from '../../core/events.js';
import { todayKey, nowHM } from '../../core/time.js';
import { systemNotify } from '../../core/notify.js';
import { countInbox } from '../tasks/tasks.js';

export const DEFAULT_TIMES = ['09:00', '16:00'];
let checking = false;

export async function getTriageSettings() {
  return {
    times: (await getSetting('triageTimes')) ?? DEFAULT_TIMES,
    enabled: (await getSetting('triageEnabled')) ?? true,
  };
}

export async function saveTriageSettings({ times, enabled }) {
  const clean = [...new Set(times.filter(Boolean))].sort();
  await setSetting('triageTimes', clean);
  await setSetting('triageEnabled', enabled);
}

export async function checkTriage() {
  if (checking) return;
  checking = true;
  try {
    const { times, enabled } = await getTriageSettings();
    if (!enabled) return;
    const day = todayKey();
    let log = await getSetting('triageLog');
    if (!log || log.day !== day) log = { day, fired: [] };
    const hm = nowHM();
    const due = times.filter((t) => t <= hm && !log.fired.includes(t));
    if (!due.length) return;
    log.fired.push(...due);
    await setSetting('triageLog', log);
    const count = await countInbox();
    if (!count) return;
    await logEvent('triage_reminder', { times: due, count });
    bus.dispatchEvent(new CustomEvent('triage-due', { detail: { count } }));
    systemNotify('Đến giờ phân loại Inbox', `Bạn có ${count} việc đang chờ.`, '#inbox', 'triage');
  } finally {
    checking = false;
  }
}
