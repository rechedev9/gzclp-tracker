const CACHE_VERSION = 'v1';
const CACHE_NAME = `trhtc-${CACHE_VERSION}`;

/** File extensions eligible for cache-first. */
const CACHEABLE_EXT = /\.(js|css|webp|png|jpg|svg|woff2?|ico|webmanifest)$/;

// ---------------------------------------------------------------------------
// Install — activate immediately, no pre-caching (Next.js hashes filenames
// so runtime caching with cache-first is sufficient).
// ---------------------------------------------------------------------------
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — claim all clients and purge old caches.
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — strategy depends on request type:
//   • Static assets (JS/CSS/images/fonts) → cache-first
//   • Navigation (HTML)                   → network-first with cache fallback
//   • Everything else                     → network only
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests from our own origin.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests → network-first.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets → cache-first.
  if (CACHEABLE_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // All other requests — pass through to network.
});
