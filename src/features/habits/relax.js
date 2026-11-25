// Góc thư giãn (P6.04) — dùng ở màn Tĩnh tâm.
import { h } from '../../ui/dom.js';
import { setVolume, getVolume } from '../room/soundscape.js';

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

export function relaxCard() {
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
