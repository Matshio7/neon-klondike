/* KLONDAIRE service worker — network-first so the homescreen app always
   loads the newest version when online, and still works offline from cache.
   Bump VER on every release to clear the old cache. */
const VER = 'klondaire-v0.7.7';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // let cross-origin (web fonts) pass through normally
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(VER).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request))      // offline → serve last cached version
  );
});
