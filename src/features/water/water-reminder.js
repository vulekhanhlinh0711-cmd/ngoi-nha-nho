// P1.16: nhắc uống nước thông minh.
// Chỉ trong giờ thức · bỏ qua nếu vừa uống · ngừng khi đủ · đang Pomodoro thì để dành cho giờ nghỉ.
import { getSetting, setSetting } from '../../core/db.js';
import { logEvent } from '../../core/events.js';
import { nowHM, atTime, fmtMl } from '../../core/time.js';
import { systemNotify } from '../../core/notify.js';
import { toast } from '../../ui/toast.js';
import { getWaterSettings, waterToday, addDefaultCup } from './water.js';
import { getPomo } from '../focus/pomodoro.js';

let checking = false;

export async function checkWater() {
  if (checking) return;
  checking = true;
  try {
    const s = await getWaterSettings();
    if (!s.remind) return;
    const hm = nowHM();
    if (hm < s.wake || hm >= s.sleep) return;
    if (getPomo().phase === 'work') return;

    const { logs, total, goal } = await waterToday();
    if (total >= goal) return;
    const gap = s.intervalMin * 60_000;
    const now = Date.now();
    const lastDrink = logs.length ? new Date(logs.at(-1).at).getTime() : atTime(s.wake).getTime();
    const lastRemind = (await getSetting('waterLastRemind')) ?? 0;
    if (now - lastDrink < gap || now - lastRemind < gap) return;

    await setSetting('waterLastRemind', now);
    await logEvent('water_reminder', { total, goal });
    const left = fmtMl(goal - total);
    toast(`💧 Đến lúc uống nước rồi (còn ${left} nữa là đủ)`, {
      actionLabel: '+1 ly', onAction: addDefaultCup, duration: 15_000,
    });
    systemNotify('💧 Uống nước nhé', `Còn ${left} nữa là đủ hôm nay. Cây cũng đang chờ được tưới.`, '#water', 'water');
  } finally {
    checking = false;
  }
}
