/* Inkhorse. Copyright (c) 2026 Steve Claude Patient (StyleKnight). All rights reserved.
   No license is granted to copy, modify or redistribute this code. */
/* Inkhorse offline helper (service worker).
   Keeps a copy of the app on the phone so it opens with no signal.
   Pages: tries the internet first (so you always get the newest version),
   and falls back to the saved copy if there's no signal or it's too slow.
   Fonts, icons and pictures: uses the saved copy, refreshes it quietly. */
const VERSION = 'inkhorse-v3';
/* Several cores for Meilin (rev 117): the app page is made "cross-origin isolated" by adding two headers here,
   because GitHub Pages can't send them. If Meilin can't work that way on a device, the page leaves a note
   in this cache and the headers stop. */
const OFF_CACHE = 'inkhorse-preview-coi';
async function coiOff() { try { const c = await caches.open(OFF_CACHE); return !!(await c.match('off')); } catch (e) { return false; } }
function withHeaders(res, extra) { const h = new Headers(res.headers); for (const k in extra) h.set(k, extra[k]);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h }); }
async function isolate(resPromise) { const res = await resPromise;
  if (!res || res.type === 'opaqueredirect' || res.status === 0 || await coiOff()) return res;
  return withHeaders(res, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }); }
const CORE = [
  './app.html',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './about.html',
  './horse.png'
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
      .filter((n) => (n.startsWith('inkhorse-v') || (n.startsWith('inkhorse-preview-') && n !== OFF_CACHE)) && n !== VERSION)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function isPage(request) {
  return request.mode === 'navigate' ||
    (request.destination === 'document') ||
    /\.html?$/.test(new URL(request.url).pathname);
}

async function networkFirst(request, event) {
  const cache = await caches.open(VERSION);
  const network = fetch(request).then(async (res) => {
    if (res && res.ok) await cache.put(request, res.clone());
    return res;
  });
  // Keep the download going even after the saved copy is shown, so the newest
  // version is ready next time (otherwise a slow connection could leave the phone
  // stuck on an old copy).
  if (event) event.waitUntil(network.catch(() => null));
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
  const cross = new URL(request.url).origin !== self.location.origin;
  // from other sites, ask with permission and mark the file as fine for an isolated page (fonts, PDF reader)
  const get = cross ? fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' })).then((r) => withHeaders(r, { 'Cross-Origin-Resource-Policy': 'cross-origin' })).catch(() => fetch(request))
                    : fetch(request);
  const refresh = get.then((res) => {
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
    const app = request.mode === 'navigate' && /^\/(app\.html|preview\/next\.html)$/.test(url.pathname);
    event.respondWith(app ? isolate(networkFirst(request, event)) : networkFirst(request, event));
  } else {
    event.respondWith(savedFirst(request));
  }
});
