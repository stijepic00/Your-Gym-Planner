const CACHE_NAME = 'gymleader-app-v8';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/javascript.js',
  '/translations.js',
  '/manifest.webmanifest',
  '/assets/gymleader-mark-v2.png',
  '/assets/gymleader-icon.png',
  '/assets/flag-sr.svg',
  '/assets/flag-en.svg',
  '/assets/flag-de.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // The app shell must still open when the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // When online, always prefer the newest scripts/styles/fonts. The cache is
  // only the fallback for offline use, so users do not get stuck on old UI.
  if (['script', 'style', 'font'].includes(request.destination)) {
    event.respondWith(
      fetch(request).then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => {
          return cached || Response.error();
        })
      )
    );
    return;
  }

  // Same-origin images and app files also prefer the network while online.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => {
          return cached || Response.error();
        })
      )
    );
  }
});
