// P0.02: service worker. Ưu tiên mạng (luôn có bản mới khi online), mất mạng thì dùng bản đã lưu.
// Mọi file cùng nguồn tải thành công đều được lưu, nên sau lần mở đầu tiên app chạy được offline.
const CACHE = 'ngoi-nha-nho-v27';
const SHELL = ['./', 'index.html', 'src/styles.css', 'src/cozy.css', 'src/clean.css', 'src/clay.css', 'src/season.css', 'src/scene.css', 'src/perf.css', 'src/aero.css', 'src/vendor/qrcode.min.js', 'src/app.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      // Luôn hỏi lại máy chủ (304 nếu không đổi) → không bao giờ kẹt bản cũ trong bộ nhớ đệm trình duyệt.
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      return (await caches.match(req, { ignoreSearch: true }))
        ?? (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
    }
  })());
});

// Bấm vào thông báo: mở app và chuyển tới đúng màn.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = e.notification.data?.hash ?? '';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) {
      await all[0].focus();
      all[0].postMessage({ hash });
    } else {
      await self.clients.openWindow(`./${hash}`);
    }
  })());
});
