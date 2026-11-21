// Màn Thói quen (P6.01–P6.03) + góc thư giãn (P6.04).
import { h, mount } from '../../ui/dom.js';
import { subnav } from '../../ui/subnav.js';
import { toast } from '../../ui/toast.js';
import { notifyChange } from '../../core/events.js';
import { logExercise, EXERCISES } from '../food/body.js';
import { setVolume, getVolume } from '../room/soundscape.js';
import {
  habitStatus, checkHabit, uncheckHabit, logSleep, addCustomHabit, removeCustomHabit,
  isTiredDay, setTiredDay, checkTiredWin, REST_PER_WEEK_LABEL,
} from './habits.js';

export const QUOTES = [
  'Chậm một chút cũng không sao, miễn là mình vẫn đi.',
  'Hôm nay làm được một việc nhỏ cũng là thắng rồi.',
  'Bạn không cần hoàn hảo, chỉ cần bắt đầu.',
  'Nghỉ ngơi cũng là một phần của tiến bộ.',
  'Hãy đối xử với bản thân dịu dàng như với người bạn thân.',
  'Mỗi ly nước, mỗi bước chân đều đang chăm sóc bạn.',
  'Không ai thấy hết những cố gắng của bạn, nhưng chúng vẫn có ý nghĩa.',
  'Ngày mai là một trang mới, hôm nay cứ thả lỏng.',
  'Bạn đã vượt qua 100% những ngày khó khăn trước đây.',
  'Tập trung vào điều mình kiểm soát được thôi.',
  'Một hơi thở sâu có thể thay đổi cả buổi chiều.',
  'Cây không lớn trong một ngày, bạn cũng vậy.',
  'Biết dừng lại đúng lúc là một kỹ năng.',
  'Cảm xúc nào cũng được phép ghé qua.',
  'Bạn xứng đáng được nghỉ ngơi mà không thấy tội lỗi.',
];
const quote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

let breathTimer = null;
function startBreath(box) {
  clearInterval(breathTimer);
  const steps = [['Hít vào', 4, 'in'], ['Giữ', 4, 'hold'], ['Thở ra', 6, 'out']];
  let left = 60, i = 0, t = steps[0][1];
  const circle = box.querySelector('.breath-circle');
  const label = box.querySelector('.breath-label');
  const count = box.querySelector('.breath-count');
  const show = () => {
    circle.className = `breath-circle ${steps[i][2]}`;
    circle.style.transitionDuration = `${steps[i][1]}s`;
    label.textContent = steps[i][0];
  };
  show();
  breathTimer = setInterval(() => {
    left--; t--;
    count.textContent = `${left}s`;
    if (t <= 0) { i = (i + 1) % steps.length; t = steps[i][1]; show(); }
    if (left <= 0 || !box.isConnected) {
      clearInterval(breathTimer);
      if (box.isConnected) { label.textContent = 'Xong rồi. Bạn thấy nhẹ hơn chưa? 🌿'; circle.className = 'breath-circle'; }
    }
  }, 1000);
}

function relaxCard() {
  const box = h('div', { class: 'breath' },
    h('div', { class: 'breath-circle' }), h('p', { class: 'breath-label' }, 'Sẵn sàng'), h('p', { class: 'breath-count muted small' }, '60s'));
  const q = h('p', { class: 'quote' }, `“${quote()}”`);
  const music = getVolume('rain') > 0;
  return h('section', { class: 'card relax' },
    h('h3', {}, '🌿 Góc thư giãn'),
    box,
    h('div', { class: 'presets' },
      h('button', { class: 'btn', onclick: () => startBreath(box) }, '🌬️ Hít thở 1 phút'),
      h('button', {
        class: `chip${music ? ' on' : ''}`, 'aria-pressed': String(music),
        onclick: (e) => {
          const on = getVolume('rain') > 0;
          setVolume('rain', on ? 0 : 0.35); setVolume('stream', on ? 0 : 0.3);
          e.currentTarget.classList.toggle('on', !on);
          e.currentTarget.setAttribute('aria-pressed', String(!on));
        },
      }, '🎵 Âm thanh nhẹ'),
      h('button', { class: 'chip', onclick: () => { q.textContent = `“${quote()}”`; } }, '💌 Câu động viên khác')),
    q);
}

const HABIT_COLORS = { water: '#5fc1e6', breakfast: '#f4a28c', exercise: '#b48cf0', english: '#6fa3f2', sleep: '#8c95ee' };
const PALETTE = ['#7ccf9a', '#f5c062', '#f08fb0', '#6fd1c7', '#f2a65a', '#a3b6f5'];
const colorOf = (hb, i) => HABIT_COLORS[hb.id] ?? PALETTE[i % PALETTE.length];

// P13: dải 7 ngày, mỗi ngày là vòng tròn theo tỉ lệ thói quen đã làm.
function weekStrip(list) {
  if (!list.length) return null;
  return h('div', { class: 'habit-week', 'aria-label': 'Tỉ lệ thói quen 7 ngày qua' }, list[0].week.map(({ day }, i) => {
    const done = list.filter((hb) => hb.week[i].done).length;
    const d = new Date(`${day}T00:00`);
    return h('div', { class: `hw-day${i === 6 ? ' today' : ''}`, title: `${done}/${list.length} thói quen` },
      h('small', {}, ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]),
      h('div', { class: 'hw-ring', style: `--r:${done / list.length}` }, h('span', {}, d.getDate())));
  }));
}

function habitRow(hb, i = 0) {
  const extra = [];
  if (!hb.doneToday && hb.id === 'exercise') {
    extra.push(h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const m = Number(e.target.elements.m.value);
        if (m > 0) { await logExercise(e.target.elements.k.value, m); toast('💪 Đã ghi vận động'); }
      },
    }, h('select', { class: 'input', name: 'k', 'aria-label': 'Loại vận động' }, EXERCISES.map(([k, l]) => h('option', { value: k }, l))),
      h('input', { class: 'input num', name: 'm', type: 'number', min: '1', value: '20', 'aria-label': 'Số phút' }), h('button', { class: 'chip', type: 'submit' }, 'Ghi')));
  }
  if (!hb.doneToday && hb.id === 'english') {
    extra.push(h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        await checkHabit('english', { minutes: Number(f.m.value) || 0, words: Number(f.w.value) || 0 });
        toast('📚 Giỏi quá!');
      },
    }, h('label', { class: 'field-inline' }, h('input', { class: 'input num', name: 'm', type: 'number', min: '0', placeholder: 'phút', 'aria-label': 'Số phút học' }), 'phút'),
      h('label', { class: 'field-inline' }, h('input', { class: 'input num', name: 'w', type: 'number', min: '0', placeholder: 'từ', 'aria-label': 'Số từ mới' }), 'từ mới'),
      h('button', { class: 'chip', type: 'submit' }, 'Xong')));
  }
  if (!hb.doneToday && hb.id === 'sleep') {
    extra.push(h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        await logSleep(e.target.elements.b.value, e.target.elements.w.value);
        toast('😴 Đã ghi giấc ngủ');
      },
    }, h('label', { class: 'field-inline' }, 'Ngủ', h('input', { class: 'input', name: 'b', type: 'time', value: '23:00', 'aria-label': 'Giờ đi ngủ' })),
      h('label', { class: 'field-inline' }, 'Dậy', h('input', { class: 'input', name: 'w', type: 'time', value: '07:00', 'aria-label': 'Giờ thức dậy' })),
      h('button', { class: 'chip', type: 'submit' }, 'Ghi')));
  }
  const manual = !hb.auto && !['english', 'sleep'].includes(hb.id);
  return h('li', { class: `habit${hb.doneToday ? ' done' : ''}`, style: `--hc:${colorOf(hb, i)}` },
    h('div', { class: 'habit-top' },
      h('span', { class: 'habit-bubble', 'aria-hidden': 'true' }, hb.icon),
      h('div', { class: 'grow' },
        h('b', {}, hb.name),
        h('span', { class: 'meta-text' }, hb.auto ? ` · ${hb.auto}` : '')),
      h('span', { class: 'streak', title: `Còn ${hb.streak.restLeft} ngày nghỉ phép tuần này` }, hb.streak.days ? `🔥 ${hb.streak.days}` : ''),
      h('span', { class: 'habit-total' }, h('b', {}, hb.totalDays ?? 0), h('small', {}, 'tổng số ngày')),
      hb.doneToday
        ? h('span', { class: 'habit-tick on', role: 'img', 'aria-label': 'Đã xong hôm nay' }, '✓')
        : manual ? h('button', { class: 'habit-tick', 'aria-label': `Đánh dấu xong: ${hb.name}`, title: 'Xong hôm nay', onclick: () => checkHabit(hb.id) }) : null,
      hb.doneToday && !hb.auto ? h('button', { class: 'icon-btn', 'aria-label': `Bỏ tích ${hb.name}`, onclick: () => uncheckHabit(hb.id) }, '↺') : null,
      hb.custom ? h('button', { class: 'icon-btn', 'aria-label': `Xóa thói quen ${hb.name}`, onclick: () => confirm('Xóa thói quen này?') && removeCustomHabit(hb.id) }, '✕') : null,
      hb.link && !hb.doneToday ? h('a', { class: 'chip', href: hb.link }, 'Mở') : null),
    extra);
}

export async function renderHabits(root) {
  const tired = await isTiredDay();
  const won = await checkTiredWin();
  const list = await habitStatus();
  const done = list.filter((x) => x.doneToday).length;

  mount(root,
    h('div', { class: 'view-head' }, subnav('health', 'habits'), h('h2', {}, 'Thói quen')),
    h('section', { class: `card tired${tired ? ' on' : ''}` },
      h('div', { class: 'card-head' },
        h('div', {}, h('h3', {}, tired ? '🫶 Hôm nay là ngày mệt' : 'Hôm nay bạn thấy mệt?'),
          h('p', { class: 'muted small' }, tired
            ? won ? '🏆 Bạn đã thắng hôm nay rồi! Chuỗi ngày của mọi thói quen được giữ nguyên.' : 'Chỉ cần làm 1 việc nhỏ bất kỳ (1 ly nước, 1 việc, 1 dòng nhật ký) là tính thắng cả ngày.'
            : 'Bật chế độ ngày mệt: 1 việc nhỏ cũng được tính là thắng.')),
        h('button', { class: `chip${tired ? ' on' : ''}`, 'aria-pressed': String(tired), onclick: () => setTiredDay(!tired) }, tired ? 'Tắt' : 'Bật ngày mệt'))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Hôm nay', h('span', { class: 'count' }, `${done}/${list.length}`)),
        h('span', { class: 'muted small' }, `Mỗi tuần được nghỉ ${REST_PER_WEEK_LABEL} ngày mà không đứt chuỗi`)),
      weekStrip(list),
      h('ul', { class: 'habit-list' }, list.map((hb, i) => habitRow(hb, i))),
      h('form', {
        class: 'inline-form', onsubmit: async (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const name = f.name.value.trim();
          if (name) { await addCustomHabit(name, f.icon.value.trim() || '⭐'); }
        },
      }, h('input', { class: 'input num', name: 'icon', maxlength: '4', placeholder: '⭐', 'aria-label': 'Biểu tượng' }),
        h('input', { class: 'input', name: 'name', maxlength: '40', placeholder: 'Thêm thói quen của bạn (đọc sách, thiền…)', 'aria-label': 'Tên thói quen mới' }),
        h('button', { class: 'chip', type: 'submit' }, '+ Thêm'))),
    relaxCard(),
  );
}

export { notifyChange };
