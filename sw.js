// Offline support. Online: always load the newest files (network first, short timeout).
// Offline or slow network: fall back to the cached copy. Bump CACHE when you change files.
const CACHE = 'quicksynth-v15';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/rajdhani-500.woff2', 'fonts/rajdhani-700.woff2'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never caches stale files
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    net.catch(() => {});
    const timeout = new Promise(r => setTimeout(r, 2500));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch (err) { /* offline */ }
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || net;
  })());
});
