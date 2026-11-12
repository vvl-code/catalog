// One offline service worker for the complete Mini Games PWA.
const CACHE = 'mini-games-v1';
const PRECACHE = [
  './', './index.html', './app.js', './styles.css', './manifest.webmanifest',
  './icons/icon.svg', './icons/blocks.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './blocks/', './blocks/index.html', './blocks/styles.css', './blocks/js/app.js', './blocks/js/engine.js',
  './match3/', './match3/index.html', './match3/styles.css', './match3/app.js', './match3/engine.js',
  './solitaire/', './solitaire/index.html', './solitaire/styles.css', './solitaire/app.js', './solitaire/engine.js',
  './arcade/', './arcade/index.html', './arcade/styles.css', './arcade/app.js', './arcade/chess.js', './arcade/pinball.js'
];
const BASE = new URL(self.registration.scope).pathname;
const KNOWN_ROUTES = new Set(['blocks', 'match3', 'solitaire', 'arcade']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('mini-games-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function offlinePage(pathname) {
  if (pathname === BASE || pathname === BASE + 'index.html') return './index.html';
  if (!pathname.startsWith(BASE)) return null;
  const path = pathname.slice(BASE.length);
  const part = path.split('/')[0];
  if (KNOWN_ROUTES.has(part) && [part, part + '/', part + '/index.html'].includes(path)) {
    return './' + part + '/index.html';
  }
  return null;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    const fallback = offlinePage(url.pathname);
    if (!fallback) return;
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(new URL(fallback, self.registration.scope).href, {ignoreSearch: true});
        return cached || Response.error();
      })
    );
    return;
  }

  event.respondWith(caches.match(request, {ignoreSearch: true}).then(cached => cached || fetch(request)));
});
