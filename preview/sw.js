/* Inkhorse. Copyright (c) 2026 Steve Claude Patient (StyleKnight). All rights reserved.
   No license is granted to copy, modify or redistribute this code. */
/* Inkhorse preview helper (service worker for the /preview/ pages only; the live app keeps its own).
   Why it exists: Meilin, the natural voice, can use several processor cores at once only when the page is
   "cross-origin isolated". GitHub Pages can't send the two headers that turn that on, so this helper adds them
   to preview/next.html. Files from other sites (fonts, the PDF and zip readers) are fetched with permission
   so the isolated page can still use them.
   Off switch: if Meilin can't work this way on a device, the page leaves a note in the cache below and this
   helper stops adding the headers there, so she goes back to one core. */
const OFF_CACHE = 'inkhorse-preview-coi';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function isOff() {
  try { const c = await caches.open(OFF_CACHE); return !!(await c.match('off')); } catch (e) { return false; }
}

function withHeaders(res, extra) {
  const h = new Headers(res.headers);
  for (const k in extra) h.set(k, extra[k]);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // The preview page itself: add the two headers (unless switched off on this device).
  if (request.mode === 'navigate') {
    if (url.origin !== self.location.origin || !/\/preview\/next\.html$/.test(url.pathname)) return;
    event.respondWith((async () => {
      const res = await fetch(request);
      if (res.type === 'opaqueredirect' || res.status === 0 || await isOff()) return res;
      return withHeaders(res, {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      });
    })());
    return;
  }

  // A file from another site asked for without permission (a font style sheet, a script):
  // ask again with permission, and mark it as fine to use in an isolated page.
  if (url.origin !== self.location.origin && request.mode === 'no-cors') {
    event.respondWith((async () => {
      try {
        const res = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }));
        return withHeaders(res, { 'Cross-Origin-Resource-Policy': 'cross-origin' });
      } catch (e) {
        return fetch(request);
      }
    })());
  }
});
