// P4.06, P5.13: khóa PIN cho từng khu vực (nhật ký, tài chính).
// Đây là lớp che màn hình cho người khác cầm máy, KHÔNG mã hóa dữ liệu trong trình duyệt.
// Mở khóa có hiệu lực 10 phút hoặc tới khi tải lại trang.
import { getSetting, setSetting } from './db.js';
import { h } from '../ui/dom.js';

const UNLOCK_MS = 10 * 60_000;
const unlocked = new Map(); // area → hết hạn lúc

async function hash(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pins() {
  return (await getSetting('pins')) ?? {};
}

export async function hasPin(area) {
  return !!(await pins())[area];
}

export async function setPin(area, pin) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN gồm 4–8 chữ số.');
  const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
  const all = await pins();
  all[area] = { salt, hash: await hash(pin, salt) };
  await setSetting('pins', all);
  unlocked.set(area, Date.now() + UNLOCK_MS);
}

export async function checkPin(area, pin) {
  const p = (await pins())[area];
  return !!p && (await hash(pin, p.salt)) === p.hash;
}

export async function removePin(area, pin) {
  if (!(await checkPin(area, pin))) throw new Error('PIN không đúng.');
  const all = await pins();
  delete all[area];
  await setSetting('pins', all);
}

export async function isLocked(area) {
  if (!(await hasPin(area))) return false;
  return !(unlocked.get(area) > Date.now());
}

export const lockNow = (area) => unlocked.delete(area);

// Màn khóa: nhập PIN, đúng thì gọi onUnlock.
export function lockScreen(area, title, onUnlock) {
  const msg = h('p', { class: 'muted small', role: 'alert' });
  const input = h('input', {
    class: 'input pin-input', type: 'password', inputmode: 'numeric', autocomplete: 'off',
    maxlength: '8', 'aria-label': 'Nhập PIN', placeholder: '••••',
  });
  return h('section', { class: 'card lock-card' },
    h('div', { class: 'lock-icon' }, '🔒'),
    h('h3', {}, title),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        if (await checkPin(area, input.value)) {
          unlocked.set(area, Date.now() + UNLOCK_MS);
          input.value = '';
          onUnlock();
        } else {
          msg.textContent = 'PIN chưa đúng, thử lại nhé.';
          input.value = '';
          input.focus();
        }
      },
    }, input, h('button', { class: 'btn', type: 'submit' }, 'Mở')),
    msg);
}

// Khung cài đặt PIN cho một khu vực (dùng trong màn Cài đặt).
export async function pinSettings(area, label, onChange) {
  const has = await hasPin(area);
  const msg = h('p', { class: 'muted small', role: 'status' });
  return h('div', { class: 'pin-setting' },
    h('h4', {}, label),
    h('p', { class: 'muted small' }, has ? 'Đang bật khóa PIN.' : 'Chưa đặt PIN.'),
    h('form', {
      class: 'inline-form', onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        try {
          if (has) { await removePin(area, f.pin.value); msg.textContent = 'Đã tắt khóa PIN.'; }
          else { await setPin(area, f.pin.value); msg.textContent = 'Đã đặt PIN. Hãy nhớ kỹ, quên PIN thì phải xóa dữ liệu trình duyệt để mở lại.'; }
          onChange?.();
        } catch (err) { msg.textContent = err.message; }
      },
    },
      h('input', { class: 'input pin-input', name: 'pin', type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: has ? 'PIN hiện tại' : 'PIN mới (4–8 số)', 'aria-label': has ? 'PIN hiện tại' : 'PIN mới' }),
      h('button', { class: 'chip', type: 'submit' }, has ? 'Tắt khóa' : 'Đặt PIN')),
    msg);
}
