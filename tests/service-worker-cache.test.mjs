import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const build = source.match(/const BUILD = '([^']+)'/)?.[1];
assert.ok(build, 'Service Worker build identifier is missing');
const cacheName = `gymleader-app-${build}`;
const listeners = new Map();
const stores = new Map();
let networkCalls = 0;
let skipWaitingCalls = 0;
let failNetwork = false;

function keyFor(request) {
  return typeof request === 'string' ? new URL(request, 'https://gymleader.app').href : request.url;
}

function cacheFor(name) {
  if (!stores.has(name)) stores.set(name, new Map());
  const entries = stores.get(name);
  return {
    async match(request) { return entries.get(keyFor(request))?.clone(); },
    async put(request, response) { entries.set(keyFor(request), response.clone()); }
  };
}

const caches = {
  open: async (name) => cacheFor(name),
  match: async (request) => {
    for (const entries of stores.values()) {
      const response = entries.get(keyFor(request));
      if (response) return response.clone();
    }
    return undefined;
  },
  keys: async () => [...stores.keys()],
  delete: async (name) => stores.delete(name)
};

const context = {
  self: {
    location: { origin: 'https://gymleader.app' },
    clients: { claim: async () => {}, matchAll: async () => [] },
    addEventListener: (name, callback) => listeners.set(name, callback),
    skipWaiting: async () => { skipWaitingCalls++; }
  },
  caches,
  URL,
  Request,
  Response,
  AbortController,
  Promise,
  Set,
  setTimeout,
  clearTimeout,
  fetch: async (request) => {
    networkCalls++;
    if (failNetwork) throw new Error('offline');
    const url = typeof request === 'string' ? request : request.url;
    return new Response(`network:${url}`, { status: 200, headers: { 'content-type': 'text/css' } });
  }
};
vm.runInNewContext(source, context);

function dispatchFetch(request) {
  let responsePromise;
  const waits = [];
  listeners.get('fetch')({
    request,
    respondWith(promise) { responsePromise = Promise.resolve(promise); },
    waitUntil(promise) { waits.push(Promise.resolve(promise)); }
  });
  return { responsePromise, waits };
}

// The worker installation tolerates an unavailable individual shell file.
{
  const waits = [];
  listeners.get('install')({ waitUntil: (promise) => waits.push(Promise.resolve(promise)) });
  await Promise.all(waits);
  assert.equal(skipWaitingCalls, 1);
  const cache = await caches.open(cacheName);
  assert.ok(await cache.match(`https://gymleader.app/styles.css?v=${build}`));
  assert.doesNotMatch(source, /cache\.addAll\(/);
}

// A cached versioned stylesheet is returned immediately without network access.
{
  const before = networkCalls;
  const cache = await caches.open(cacheName);
  await cache.put(`https://gymleader.app/styles.css?v=${build}`, new Response('cached-css'));
  const result = dispatchFetch({ method: 'GET', url: `https://gymleader.app/styles.css?v=${build}`, destination: 'style', mode: 'cors' });
  assert.equal(await (await result.responsePromise).text(), 'cached-css');
  assert.equal(networkCalls, before);
}

// A cache miss is fetched and saved for later offline use.
{
  const result = dispatchFetch({ method: 'GET', url: `https://gymleader.app/app.js?v=${build}`, destination: 'script', mode: 'cors' });
  assert.match(await (await result.responsePromise).text(), /^network:/);
  await Promise.all(result.waits);
  assert.ok(await caches.match(`https://gymleader.app/app.js?v=${build}`));
}

// Unversioned static assets return cached content while refreshing quietly.
{
  const cache = await caches.open(cacheName);
  await cache.put('https://gymleader.app/assets/flag-sr.svg', new Response('cached-flag'));
  const before = networkCalls;
  const result = dispatchFetch({ method: 'GET', url: 'https://gymleader.app/assets/flag-sr.svg', destination: 'image', mode: 'cors' });
  assert.equal(await (await result.responsePromise).text(), 'cached-flag');
  await Promise.all(result.waits);
  assert.equal(networkCalls, before + 1);
  assert.match(await (await caches.match('https://gymleader.app/assets/flag-sr.svg')).text(), /^network:/);
}

// A cached static file remains available when its network request fails.
{
  const cache = await caches.open(cacheName);
  await cache.put('https://gymleader.app/styles.css?v=offline-test', new Response('offline-css'));
  failNetwork = true;
  const result = dispatchFetch({ method: 'GET', url: 'https://gymleader.app/styles.css?v=offline-test', destination: 'style', mode: 'cors' });
  assert.equal(await (await result.responsePromise).text(), 'offline-css');
  failNetwork = false;
}

// Private admin files and non-GET requests do not enter the app cache.
{
  const before = networkCalls;
  const privateFile = dispatchFetch({ method: 'GET', url: 'https://gymleader.app/admin.js', destination: 'script', mode: 'same-origin' });
  assert.equal(privateFile.responsePromise, undefined);
  const post = dispatchFetch({ method: 'POST', url: 'https://gymleader.app/workout', destination: '', mode: 'same-origin' });
  assert.equal(post.responsePromise, undefined);
  assert.equal(networkCalls, before);
}

console.log('PASS: shell install, cache-first versioned CSS/JS, network cache fill, private route and POST exclusions');
