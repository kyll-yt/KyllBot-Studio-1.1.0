const CACHE = 'kyllbot-studio-1.1.3-commandes-serveur';
const PRECACHE = [
  '/login',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/logo.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/css/v17/site.css',
  '/css/v17/app.css',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* un asset absent ne doit pas bloquer l'installation */
          }
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return (await caches.match('/offline.html')) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match(request)) || new Response('', { status: 504, statusText: 'Offline' });
      }
    })(),
  );
});
