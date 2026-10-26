/* Inkhorse offline helper (service worker).
   Keeps a copy of the app on the phone so it opens with no signal.
   Pages: tries the internet first (so you always get the newest version),
   and falls back to the saved copy if there's no signal or it's too slow.
   Fonts, icons and pictures: uses the saved copy, refreshes it quietly. */
const VERSION = 'inkhorse-preview-v1';
const CORE = [
  './app.html',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  '../horse.png'
];
const SLOW_NETWORK_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Save each file on its own, so one missing file can't stop the rest.
    await Promise.all(CORE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* offline during install: try again next visit */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n.startsWith('inkhorse-preview-') && n !== VERSION)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function isPage(request) {
  return request.mode === 'navigate' ||
    (request.destination === 'document') ||
    /\.html?$/.test(new URL(request.url).pathname);
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, SLOW_NETWORK_MS, 'slow'));
  try {
    const first = await Promise.race([network, slow]);
    if (first !== 'slow') return first;
    const saved = await cache.match(request, { ignoreSearch: true });
    return saved || network;
  } catch (e) {
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    const app = await cache.match('./app.html');
    if (app && request.mode === 'navigate') return app;
    throw e;
  }
}

async function savedFirst(request) {
  const cache = await caches.open(VERSION);
  const saved = await cache.match(request);
  const refresh = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return saved || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameSite = url.origin === self.location.origin;
  const trustedCdn = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ||
    url.hostname === 'cdnjs.cloudflare.com';
  if (!sameSite && !trustedCdn) return;
  if (sameSite && isPage(request)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(savedFirst(request));
  }
});
