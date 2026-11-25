// Thông báo hệ thống (khi app không ở trước mặt) và tiếng "ting" nhẹ.
export async function systemNotify(title, body, hash = '', tag = '') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  if (document.visibilityState === 'visible') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, data: { hash }, icon: 'icons/icon-192.png' });
      return true;
    }
  } catch { /* dùng cách dưới */ }
  const n = new Notification(title, { body, tag });
  n.onclick = () => { window.focus(); if (hash) location.hash = hash; n.close(); };
  return true;
}

let audio;
export function beep() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, t);
    o.frequency.setValueAtTime(880, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.75);
  } catch { /* trình duyệt chặn âm thanh khi chưa tương tác: bỏ qua */ }
}
