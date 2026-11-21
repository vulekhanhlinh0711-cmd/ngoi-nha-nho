// P5.05: nhắc hóa đơn trước hạn 3 ngày (mỗi hóa đơn nhắc tối đa 1 lần/ngày).
import { getSetting, setSetting } from '../../core/db.js';
import { todayKey } from '../../core/time.js';
import { systemNotify } from '../../core/notify.js';
import { toast } from '../../ui/toast.js';
import { listKind, fmtVND, monthOf } from './money.js';

export async function checkBills() {
  const day = todayKey();
  const month = monthOf(day);
  const d = new Date().getDate();
  let fired = await getSetting('billFired');
  if (!fired || fired.day !== day) fired = { day, ids: [] };
  const due = (await listKind('bill')).filter((b) => b.lastPaid !== month && b.dueDay - d <= 3 && !fired.ids.includes(b.id));
  if (!due.length) return;
  fired.ids.push(...due.map((b) => b.id));
  await setSetting('billFired', fired);
  for (const b of due) {
    const left = b.dueDay - d;
    const when = left > 0 ? `còn ${left} ngày` : left === 0 ? 'hạn hôm nay' : `quá hạn ${-left} ngày`;
    toast(`🧾 ${b.name} ${fmtVND(b.amount)} — ${when}`, { duration: 10_000 });
    systemNotify(`🧾 ${b.name}`, `${fmtVND(b.amount)} · ${when}`, '#budget', `bill-${b.id}`);
  }
}
