const CACHE_PREFIX = 'neuro-exam-toolkit';
const APP_CACHE = `${CACHE_PREFIX}-app-v1`;
const REMOTE_CACHE = `${CACHE_PREFIX}-validated-v1`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/favicon-64.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// These are authoritative/public resources already used by the app.
// They are prefetched best-effort. A failure never prevents the app shell
// from installing, and literature/reference links are intentionally not copied.
const VALIDATED_REMOTE_RESOURCES = [
  'https://upload.wikimedia.org/wikipedia/commons/4/4b/Ishihara_1.PNG',
  'https://upload.wikimedia.org/wikipedia/commons/c/c3/Ishihara_11.PNG',
  'https://upload.wikimedia.org/wikipedia/commons/b/b1/Ishihara_9.svg',
  'https://upload.wikimedia.org/wikipedia/commons/f/f0/Ishihara_23.PNG',
  'https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const appCache = await caches.open(APP_CACHE);
    await appCache.addAll(APP_SHELL);

    const remoteCache = await caches.open(REMOTE_CACHE);
    await Promise.allSettled(
      VALIDATED_REMOTE_RESOURCES.map(async url => {
        const request = new Request(url, {
          mode: 'no-cors',
          cache: 'reload',
          credentials: 'omit'
        });
        const response = await fetch(request);
        if (response) await remoteCache.put(request, response);
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, REMOTE_CACHE]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && !keep.has(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request) {
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

async function cacheFirstSameOrigin(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    fetch(request).then(response => {
      if (response && response.ok && response.status !== 206) {
        cache.put(request, response.clone()).catch(() => {});
      }
    }).catch(() => {});
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok && response.status !== 206) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirstValidatedRemote(request) {
  const cache = await caches.open(REMOTE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status !== 206) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    return (
      (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
      (await cache.match(request.url, { ignoreSearch: true, ignoreVary: true }))
    );
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (sameOrigin) {
    event.respondWith(cacheFirstSameOrigin(request));
    return;
  }

  if (VALIDATED_REMOTE_RESOURCES.includes(request.url)) {
    event.respondWith(networkFirstValidatedRemote(request));
  }
});
