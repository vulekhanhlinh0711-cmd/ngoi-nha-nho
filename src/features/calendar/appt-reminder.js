// P1.07: nhắc trước giờ hẹn (mặc định 15 phút). Giờ hẹn = việc có giờ (dueTime).
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent } from '../../core/events.js';
import { todayKey } from '../../core/time.js';
import { systemNotify, beep } from '../../core/notify.js';
import { toast } from '../../ui/toast.js';
import { listOpenTasks } from '../tasks/tasks.js';

export const getLeadMin = async () => (await getSetting('apptLeadMin')) ?? 15;
export const setLeadMin = (n) => setSetting('apptLeadMin', n);

let checking = false;

export async function checkAppointments() {
  if (checking) return;
  checking = true;
  try {
    const lead = await getLeadMin();
    const day = todayKey();
    const now = Date.now();
    let fired = await getSetting('apptFired');
    if (!fired || fired.day !== day) fired = { day, keys: [] };

    const due = [];
    for (const t of await listOpenTasks()) {
      if (!t.dueTime || !t.dueDate || t.remind === -1) continue;
      // P13: mỗi việc có thể đặt nhắc riêng (phút trước giờ hẹn); không đặt thì dùng mặc định.
      const mins = t.remind ?? lead;
      const [y, mo, d] = t.dueDate.split('-').map(Number);
      const [hh, mm] = t.dueTime.split(':').map(Number);
      const at = new Date(y, mo - 1, d, hh, mm).getTime();
      const key = `${t.id}|${t.dueDate}|${t.dueTime}`;
      // Trong khoảng [trước giờ hẹn `mins` phút, sau giờ hẹn 30 phút] và chưa nhắc.
      if (fired.keys.includes(key) || now < at - mins * 60_000 || now > at + 30 * 60_000) continue;
      fired.keys.push(key);
      due.push({ t, mins: Math.round((at - now) / 60_000) });
    }
    if (!due.length) return;
    await setSetting('apptFired', fired);

    for (const { t, mins } of due) {
      const when = mins > 0 ? `còn ${mins} phút` : 'đến giờ rồi';
      toast(`⏰ ${t.dueTime} ${t.title} (${when})`, { duration: 12_000 });
      systemNotify(`⏰ ${t.dueTime} · ${t.title}`, `Lịch hẹn ${when}.`, '#calendar', `appt-${t.id}`);
      await logEvent('appt_reminder', { taskId: t.id, mins });
    }
    beep();
  } finally {
    checking = false;
  }
}
