const CACHE_NAME = 'vialo-shell-v1';
const TILE_CACHE_NAME = 'vialo-tiles-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/map.js',
  './js/routing.js',
  './js/geolocation.js',
  './js/poi.js',
  './js/gpx.js',
  './js/storage.js',
  './js/overpass.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  // Local resources
  './js/leaflet.js',
  './css/leaflet.css',
  './js/lucide.min.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/outfit/v11/QId5dD19y-q_866LoNPy2q_O.woff2'
];

// Install Service Worker and cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch interception
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // We only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Determine if it is a map tile request
  const isTileRequest = 
    requestUrl.hostname.includes('tile.openstreetmap.org') ||
    requestUrl.hostname.includes('tile.opentopomap.org') ||
    requestUrl.hostname.includes('tile.thunderforest.com') ||
    requestUrl.hostname.includes('tile.openstreetmap.de') ||
    requestUrl.pathname.includes('/tile/');

  if (isTileRequest) {
    // Cache-first, fall back to network, stale-while-revalidate for map tiles
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Ignore network errors in background
          });

          // Return cached tile if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // Network-first with cache fallback for app shell assets
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            // Cache local files and CDN assets in the main cache list
            const isLocal = requestUrl.origin === self.location.origin;
            const isCdn = ASSETS_TO_CACHE.some(asset => event.request.url.includes(asset));
            
            if (isLocal || isCdn) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((response) => {
            if (response) return response;
            // Fallback for document navigation if offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
        })
    );
  }
});
