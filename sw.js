// Mini Games offline worker. Network-first avoids mixing old modules with new HTML.
// All cached assets are retained for offline use, with no change to localStorage.
const CACHE = 'mini-games-v10';
const PRECACHE = [
  './shared/compact.css', './shared/play-ui.js', './shared/host-ui.js',
  './', './index.html', './app.js', './styles.css', './manifest.webmanifest',
  './icons/icon.svg', './icons/blocks.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './blocks/', './blocks/index.html', './blocks/styles.css', './blocks/js/app.js', './blocks/js/engine.js',
  './match3/', './match3/index.html', './match3/styles.css', './match3/app.js', './match3/engine.js',
  './solitaire/', './solitaire/index.html', './solitaire/styles.css', './solitaire/app.js',
  './solitaire/motion.js', './solitaire/engine.js',
  './arcade/', './arcade/index.html', './arcade/styles.css', './arcade/app.js',
  './arcade/chess.js', './arcade/pinball.js', './arcade/pinball-engine.js',
  './arcade/pinball-cabinet.css', './arcade/pinball-art.js'
];
const BASE = new URL(self.registration.scope).pathname;
const GAME_ROUTES = new Set(['blocks','match3','solitaire','arcade']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(PRECACHE))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith('mini-games-') && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function offlinePage(path) {
  if (path === BASE || path === BASE+'index.html') return './index.html';
  if (!path.startsWith(BASE)) return null;
  const relative = path.slice(BASE.length);
  const folder = relative.split('/')[0];
  if (!GAME_ROUTES.has(folder)) return null;
  if ([folder,folder+'/',folder+'/index.html'].includes(relative))
    return './'+folder+'/index.html';
  return null;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  const fallback = request.mode === 'navigate' ? offlinePage(url.pathname) : null;
  if (request.mode === 'navigate' && !fallback) return;

  // Normalize the cache key. Query strings are for cache busting/versioning,
  // not for differentiating HTML game modes (e.g. ?game=chess).
  const cacheKey = new URL(fallback || url.pathname, self.registration.scope).href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Browser cache revalidation keeps this fast, but prevents old SW cache
      // entries from overriding a new build whenever the network is available.
      const response = await fetch(request, {cache:'no-cache'});
      if (response.ok && response.type !== 'opaque') {
        await cache.put(cacheKey, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const stored = await cache.match(cacheKey);
      return stored || Response.error();
    }
  })());
});
