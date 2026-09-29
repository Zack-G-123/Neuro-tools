const CACHE_PREFIX = 'neuro-exam-toolkit';
const APP_CACHE = `${CACHE_PREFIX}-app-v2`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-v2`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon-64.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && ![APP_CACHE, RUNTIME_CACHE].includes(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put('./index.html', response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return (await cache.match('./index.html')) || (await cache.match('./'));
  }
}

async function cacheFirst(request) {
  const appCache = await caches.open(APP_CACHE);
  const cached = await appCache.match(request, {ignoreSearch: true});
  if (cached) return cached;

  const runtime = await caches.open(RUNTIME_CACHE);
  const runtimeCached = await runtime.match(request, {ignoreSearch: true, ignoreVary: true});
  if (runtimeCached) return runtimeCached;

  const response = await fetch(request);
  if (response && response.status !== 206) {
    runtime.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // External clinical/reference assets are runtime-cached only after they are
  // actually requested. They NEVER block PWA installation/activation.
  if (
    url.hostname === 'upload.wikimedia.org' ||
    url.hostname === 'www.ninds.nih.gov'
  ) {
    event.respondWith(cacheFirst(request));
  }
});
