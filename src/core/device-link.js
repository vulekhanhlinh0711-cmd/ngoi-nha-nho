// P22: chuyển kết nối (khóa Claude API, Client ID YouTube) sang điện thoại / iPad bằng mã QR — không cần máy chủ.
// Dữ liệu nằm sau dấu # của đường link: trình duyệt KHÔNG gửi phần này lên máy chủ GitHub.
// Mở link trên máy mới → app hỏi xác nhận → lưu vào trình duyệt máy đó → xóa phần # khỏi thanh địa chỉ.
import { h } from '../ui/dom.js';
import { getSetting, setSetting } from './db.js';
import { notifyChange } from './events.js';

const KEY = 'ket-noi=';
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export async function linkPayload() {
  const ai = (await getSetting('ai'))?.apiKey ?? '';
  const yt = (await getSetting('youtube'))?.clientId ?? '';
  const { syncConfig } = await import('./sync.js');
  const sc = syncConfig();
  return { v: 1, ai, yt, su: sc.url, sk: sc.key };
}
export async function buildLink() {
  return `${location.origin}${location.pathname}#${KEY}${b64(JSON.stringify(await linkPayload()))}`;
}

// Gọi khi mở app: nếu link có phần kết nối thì nhận vào.
export async function applyLinkFromHash() {
  const hash = location.hash.slice(1);
  if (!hash.startsWith(KEY)) return false;
  history.replaceState(null, '', `${location.pathname}#today`);
  let data;
  try { data = JSON.parse(unb64(hash.slice(KEY.length))); } catch { alert('Mã kết nối không hợp lệ.'); return false; }
  const parts = [data.ai && 'khóa Trợ lý AI (Claude)', data.yt && 'kết nối YouTube', data.su && 'cài đặt đồng bộ'].filter(Boolean);
  if (!parts.length) return false;
  if (!confirm(`Nhận ${parts.join(' và ')} cho máy này?`)) return false;
  if (data.ai) await setSetting('ai', { ...((await getSetting('ai')) ?? {}), apiKey: data.ai });
  if (data.yt) await setSetting('youtube', { ...((await getSetting('youtube')) ?? {}), clientId: data.yt });
  if (data.su && data.sk) (await import('./sync.js')).setSyncConfig(data.su, data.sk);
  notifyChange();
  return parts;
}

function loadQrLib() {
  if (window.QRCode) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'src/vendor/qrcode.min.js'; // qrcodejs 1.0.0 (MIT), lưu sẵn trong app
    s.onload = ok; s.onerror = () => fail(new Error('Không tải được thư viện QR'));
    document.head.append(s);
  });
}

// Thẻ trong Cài đặt.
export async function deviceLinkCard(toast) {
  const p = await linkPayload();
  const box = h('div', { class: 'qr-box', hidden: true });
  let timer;
  const show = async () => {
    if (!p.ai && !p.yt && !p.su) { toast('Chưa có khóa AI, YouTube hay đồng bộ nào để chuyển.'); return; }
    await loadQrLib();
    const link = await buildLink();
    box.replaceChildren();
    const qr = h('div', { class: 'qr' });
    box.append(qr,
      h('p', { class: 'small' }, '📱 Mở Camera trên điện thoại/iPad, quét mã → bấm vào đường link hiện ra → bấm OK. Mã tự ẩn sau 2 phút.'),
      h('button', { class: 'chip', onclick: async () => { try { await navigator.clipboard.writeText(link); toast('Đã chép link (gửi qua Zalo/AirDrop cho chính bạn)'); } catch { toast('Không chép được'); } } }, '📋 Chép link thay cho QR'));
    new window.QRCode(qr, { text: link, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.L });
    box.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { box.hidden = true; box.replaceChildren(); }, 120_000);
  };
  return h('section', { class: 'card' },
    h('h3', {}, '📲 Kết nối điện thoại / iPad'),
    h('p', { class: 'muted small' },
      'Cài khóa AI và YouTube một lần ở đây, rồi chuyển sang máy khác bằng mã QR. ',
      h('b', {}, 'Mã QR chứa khóa API của bạn — đừng chụp gửi cho người khác.')),
    h('p', { class: 'small' }, `Đang có: ${p.ai ? '✅ Khóa AI' : '⬜ Khóa AI'} · ${p.yt ? '✅ YouTube' : '⬜ YouTube'} · ${p.su ? '✅ Đồng bộ' : '⬜ Đồng bộ'}`),
    h('button', { class: 'btn', onclick: show }, '🔳 Hiện mã QR kết nối'),
    box);
}
