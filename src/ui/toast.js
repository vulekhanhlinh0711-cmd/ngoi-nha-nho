import { h } from './dom.js';

let timer;

function hide() {
  document.getElementById('toast').hidden = true;
}

// Thông báo ngắn, có nút Hoàn tác nếu truyền onAction.
export function toast(message, { onAction, actionLabel = 'Hoàn tác', duration = 5000 } = {}) {
  const root = document.getElementById('toast');
  root.replaceChildren(h('span', {}, message));
  if (onAction) {
    root.append(h('button', {
      class: 'toast-action',
      onclick: () => { hide(); onAction(); },
    }, actionLabel));
  }
  root.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(hide, duration);
}
