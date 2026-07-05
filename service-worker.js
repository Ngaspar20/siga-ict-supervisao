/* ══════════════════════════════════════════════════
   SERVICE WORKER  — SIGA-ICT offline caching
   Cache-first for app shell; network-first for API calls.
══════════════════════════════════════════════════ */

const CACHE_NAME = 'siga-ict-v4';

/* Files to cache on install (the full app shell) */
const APP_SHELL = [
  './index.html',
  './js/config.js',
  './js/store.js',
  './js/sync.js',
  './js/form.js',
  './js/dashboard.js',
  './js/app.js',
  './manifest.json',
  /* Google Fonts are cached at runtime — see fetch handler */
];

/* ── Install: pre-cache app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: purge old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for app shell, network-first for API ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Never intercept Google Apps Script calls — must hit the network */
  if (url.hostname === 'script.google.com') return;

  /* Cache-first for same-origin assets + Google Fonts */
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaqueredirect') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
