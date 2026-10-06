const BUILD = '20261006-routine-flow-v133';
const CACHE_NAME = `gymleader-app-${BUILD}`;

// Every app-shell file carries the same build identifier in index.html. A new
// deployment therefore cannot reuse a previous script, stylesheet or logo.
const APP_SHELL = [
  '/index.html',
  `/language-boot.js?v=${BUILD}`,
  `/styles.css?v=${BUILD}`,
  `/javascript.js?v=${BUILD}`,
  `/translations.js?v=${BUILD}`,
  `/translations-fr-it-es.js?v=${BUILD}`,
  `/translations-bs-hr.js?v=${BUILD}`,
  `/catalog-translations.js?v=${BUILD}`,
  `/translations-dynamic.js?v=${BUILD}`,
  `/ui-i18n.js?v=${BUILD}`,
  `/exercise-library.js?v=${BUILD}`,
  `/exercise-history.js?v=${BUILD}`,
  `/food-library.js?v=${BUILD}`,
  `/meal-planner.js?v=${BUILD}`,
  `/manifest.webmanifest?v=${BUILD}`,
  `/assets/gymleader-mark-v2.png?v=${BUILD}`,
  `/assets/gymleader-icon.png?v=${BUILD}`,
  `/assets/home-hero-male-desktop.webp?v=${BUILD}`,
  `/assets/home-hero-male-mobile.webp?v=${BUILD}`,
  `/assets/home-hero-female-desktop.webp?v=${BUILD}`,
  `/assets/home-hero-female-mobile.webp?v=${BUILD}`,
  '/assets/flag-sr.svg',
  '/assets/flag-bs.svg',
  '/assets/flag-hr.svg',
  '/assets/flag-en.svg',
  '/assets/flag-de.svg',
  '/assets/flag-fr.svg',
  '/assets/flag-it.svg',
  '/assets/flag-es.svg',
  '/assets/gymleader-body-male.svg?v=20260930-20',
  '/assets/gymleader-body-female.svg?v=20260930-20'
];

async function saveInCurrentCache(request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

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
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('gymleader-app-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: 'GYMLEADER_BUILD_ACTIVE', build: BUILD })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isFirebaseModule = url.origin === 'https://www.gstatic.com'
    && url.pathname.startsWith('/firebasejs/');
  const isChartModule = url.origin === 'https://cdn.jsdelivr.net'
    && url.pathname === '/npm/chart.js';

  // Firebase modules and Chart.js are code dependencies, not user data. Cache
  // them after a successful online run so the local app can boot offline later.
  if (isFirebaseModule || isChartModule) {
    const networkResponse = fetch(request);
    event.waitUntil(networkResponse.then((response) => saveInCurrentCache(request, response)).catch(() => undefined));
    event.respondWith(
      networkResponse
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // HTML is always checked against the network. It is only served from cache
  // while offline, so a normal refresh receives the newest deployment.
  if (request.mode === 'navigate') {
    const networkResponse = fetch(request, { cache: 'no-store' });
    event.waitUntil(networkResponse.then((response) => saveInCurrentCache('/index.html', response)).catch(() => undefined));
    event.respondWith(
      networkResponse
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Versioned build assets use network first and the current cache offline.
  // Query versions make the browser HTTP cache and service-worker cache agree.
  const isBuildAsset = url.searchParams.get('v') === BUILD;
  if (isBuildAsset || ['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) {
    const networkResponse = fetch(request);
    event.waitUntil(networkResponse.then((response) => saveInCurrentCache(request, response)).catch(() => undefined));
    event.respondWith(
      networkResponse
        .catch(() => caches.match(request, { ignoreSearch: false })
          .then((cached) => cached || Response.error()))
    );
  }
});
