const BUILD = '20261015-offline-cache-v158';
const CACHE_NAME = `gymleader-app-${BUILD}`;
const CACHE_PREFIX = 'gymleader-app-';

// Keep install-time work small so worker activation is quick. The main module,
// its local dependencies and other assets are cached when the page requests them.
const APP_SHELL = [
  '/index.html',
  `/language-boot.js?v=${BUILD}`,
  `/styles.css?v=${BUILD}`,
  `/manifest.webmanifest?v=${BUILD}`,
  `/assets/gymleader-mark-v2.png?v=${BUILD}`,
  `/assets/gymleader-icon.png?v=${BUILD}`
];

const REQUIRED_APP_ASSETS = [
  ...APP_SHELL,
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
  `/meal-planner.js?v=${BUILD}`
];

const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image', 'manifest']);
const PRIVATE_PATHS = new Set(['/admin.html', '/admin.js', '/admin.css']);

function cacheRequest(request) {
  return typeof request === 'string' ? new Request(new URL(request, self.location.origin)) : request;
}

async function saveInCurrentCache(request, response, { allowOpaque = false } = {}) {
  if (!response || (!response.ok && !(allowOpaque && response.type === 'opaque'))) return;
  if (/\bno-store\b/i.test(response.headers?.get?.('cache-control') || '')) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(cacheRequest(request), response.clone());
  await removeOldCachesWhenShellIsReady();
}

async function removeOldCachesWhenShellIsReady() {
  const cache = await caches.open(CACHE_NAME);
  const shellReady = await Promise.all(REQUIRED_APP_ASSETS.map((url) => cache.match(cacheRequest(url))))
    .then((responses) => responses.every(Boolean));
  if (!shellReady) return;
  const keys = await caches.keys();
  await Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map((key) => caches.delete(key)));
}

async function precacheShellAsset(cache, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const request = new Request(new URL(url, self.location.origin), {
      cache: url === '/index.html' ? 'no-store' : 'default',
      signal: controller.signal
    });
    const response = await fetch(request);
    if (response.ok) await cache.put(cacheRequest(url), response);
  } catch {
    // A single unavailable shell asset must not reject the whole worker install.
  } finally {
    clearTimeout(timeout);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((url) => precacheShellAsset(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await removeOldCachesWhenShellIsReady();
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'GYMLEADER_BUILD_ACTIVE', build: BUILD }));
  })());
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

  // These are public code dependencies. Cache them only after successful GETs.
  if (isFirebaseModule || isChartModule) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) {
        // Firebase URLs are versioned. Chart.js uses an unversioned CDN URL, so
        // refresh it in the background while returning the cached copy now.
        if (isChartModule) {
          event.waitUntil(fetch(request)
            .then((response) => saveInCurrentCache(request, response, { allowOpaque: true }))
            .catch(() => undefined));
        }
        return cached;
      }
      const response = await fetch(request);
      event.waitUntil(saveInCurrentCache(request, response.clone(), { allowOpaque: isChartModule }).catch(() => undefined));
      return response;
    })().catch(() => caches.match(request).then((cached) => cached || Response.error())));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PATHS.has(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        event.waitUntil(saveInCurrentCache('/index.html', response.clone()).catch(() => undefined));
        return response;
      } catch {
        return (await caches.match(cacheRequest('/index.html'))) || Response.error();
      }
    })());
    return;
  }

  if (!STATIC_DESTINATIONS.has(request.destination)) return;

  const isVersioned = url.searchParams.has('v');
  event.respondWith((async () => {
    // Versioned static URLs are immutable for that build, so serve cached files
    // immediately. Unversioned files use stale-while-revalidate once cached.
    if (isVersioned) {
      const cached = await caches.match(request);
      if (cached) return cached;
    } else {
      const cached = await caches.match(request);
      if (cached) {
        event.waitUntil(fetch(request)
          .then((response) => saveInCurrentCache(request, response))
          .catch(() => undefined));
        return cached;
      }
    }
    try {
      const response = await fetch(request);
      event.waitUntil(saveInCurrentCache(request, response.clone()).catch(() => undefined));
      return response;
    } catch {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
