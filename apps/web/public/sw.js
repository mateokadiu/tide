// tide service worker — minimal offline reader cache.
// Strategy:
//   - HTML navigations: network-first, fall back to a cached "offline" reader if present.
//   - Reader pages (/reader/[id]): stale-while-revalidate on the article HTML.
//   - Static assets: cache-first.
const CACHE = 'tide-v0.1';
const READER_CACHE = 'tide-reader-v0.1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(['/library', '/save', '/manifest.webmanifest']).catch(() => {}),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE && k !== READER_CACHE).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/reader/')) {
    event.respondWith(staleWhileRevalidate(req, READER_CACHE));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, CACHE));
    return;
  }
});

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response('offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached ?? (await fetchPromise) ?? new Response('offline', { status: 503 });
}
