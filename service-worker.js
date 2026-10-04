const CACHE_PREFIX = 'nivareq-pulse-';
const CACHE = 'nivareq-pulse-statezect-public-v1-0-0-v1';
const CANONICAL_SHELL = './';
const SHELL = [
  CANONICAL_SHELL,
  './styles.css?v=statezect-public-v1-0-0',
  './manifest.webmanifest?v=statezect-public-v1-0-0',
  './icons/icon-180.png?v=statezect-public-v1-0-0',
  './icons/icon-192.png?v=statezect-public-v1-0-0',
  './icons/icon-512.png?v=statezect-public-v1-0-0',
  './src/app.js?v=statezect-public-v1-0-0',
  './src/pwa-runtime.js?v=statezect-public-v1-0-0',
  './src/domain.js?v=statezect-public-v1-0-0',
  './src/db.js?v=statezect-public-v1-0-0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // The build marker is deliberately network-only/no-store. It is the authority
  // for deciding whether the currently visible document is really stale.
  if (url.pathname.endsWith('/app-version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok && !response.redirected) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(CANONICAL_SHELL, copy)));
        }
        return response;
      } catch {
        return (await caches.match(CANONICAL_SHELL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response.ok && !response.redirected) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
      }
      return response;
    } catch {
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
