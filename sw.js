const CACHE_NAME = 'starling-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './vendor/pdf.min.mjs',
  './vendor/pdf.worker.min.mjs',
  './vendor/pdf-lib.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&family=Noto+Serif+SC:wght@400;600&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(err => {
        console.warn('SW cache miss (non-fatal):', url, err);
      })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App shell (HTML/manifest) is network-first so deployed updates show up
// immediately; everything else (versioned vendor libs, icon, fonts) is
// cache-first since those URLs only change when their version changes.
const NETWORK_FIRST = ['/', '/index.html', '/manifest.json'];

self.addEventListener('fetch', e => {
  const path = new URL(e.request.url).pathname;
  const isNetworkFirst = e.request.mode === 'navigate' || NETWORK_FIRST.some(p => path.endsWith(p));

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
