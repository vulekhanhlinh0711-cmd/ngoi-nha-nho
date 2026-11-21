// P1.18: chậu cây lớn theo xu kiếm được và nước đã uống. Không bao giờ chết, chỉ hơi héo.
import { h } from '../../ui/dom.js';
import { getAll } from '../../core/db.js';
import { todayKey, dayOf } from '../../core/time.js';
import { addDays } from '../../core/dates.js';
import { COIN_RULES } from './coins.js';

export const STAGES = [
  { xp: 0, icon: '🌰', name: 'Hạt giống' },
  { xp: 20, icon: '🌱', name: 'Nảy mầm' },
  { xp: 60, icon: '🌿', name: 'Cây con' },
  { xp: 140, icon: '🍀', name: 'Cây non' },
  { xp: 260, icon: '🌷', name: 'Ra nụ' },
  { xp: 420, icon: '🌻', name: 'Nở hoa' },
];
const XP_PER_GLASS = 2; // mỗi 250 ml nước

// Hoạt động "nuôi cây": việc có thưởng xu, hoặc uống nước.
const nurtures = (e) => COIN_RULES[e.type] || e.type === 'water_logged';

export async function plantState({ earned, waterTotal, waterGoal }) {
  const events = await getAll('events');
  const totalMl = events.filter((e) => e.type === 'water_logged').reduce((s, e) => s + e.hydrationMl, 0);
  const xp = earned + Math.floor(totalMl / 250) * XP_PER_GLASS;

  let i = STAGES.length - 1;
  while (STAGES[i].xp > xp) i--;
  const next = STAGES[i + 1];
  const progress = next ? (xp - STAGES[i].xp) / (next.xp - STAGES[i].xp) : 1;

  const today = todayKey();
  const yesterday = addDays(today, -1);
  const activeDays = new Set(events.filter(nurtures).map((e) => e.day ?? dayOf(e.at)));
  const isNew = !events.some(nurtures);
  // Héo nhẹ: cả hôm qua lẫn hôm nay chưa chăm. Chỉ cần 1 hành động là tươi lại.
  const wilted = !isNew && !activeDays.has(today) && !activeDays.has(yesterday);
  const thirsty = !wilted && new Date().getHours() >= 14 && waterTotal < waterGoal * 0.4;

  let mood;
  if (isNew) mood = 'Hạt giống vừa được gieo. Hoàn thành một việc hoặc uống một ly nước để cây nảy mầm nhé.';
  else if (wilted) mood = 'Cây hơi héo một chút. Chỉ cần một việc nhỏ là tươi lại ngay 💚';
  else if (thirsty) mood = 'Cây hơi khát rồi, mình cùng uống một ly nước nhé 💧';
  else if (!next) mood = 'Cây đã nở hoa rực rỡ! 🌸';
  else mood = `Cây đang lớn khỏe. Còn ${next.xp - xp} điểm nữa là ${next.name.toLowerCase()}.`;

  return { stage: STAGES[i], index: i, next, progress, xp, wilted, thirsty, mood };
}

export const plantArt = (p, big = false) => h('div', {
  class: `plant${big ? ' big' : ''}${p.wilted ? ' wilted' : ''}`, role: 'img', 'aria-label': `Chậu cây: ${p.stage.name}`,
},
  h('div', { class: 'plant-icon' }, p.stage.icon),
  h('div', { class: 'pot' }));
