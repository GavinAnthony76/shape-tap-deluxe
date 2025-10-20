// Service Worker for Shape Tap Deluxe PWA
const CACHE_NAME = 'shape-tap-v2';
const urlsToCache = [
  '/shape-tap-deluxe/',
  '/shape-tap-deluxe/index.html',
  '/shape-tap-deluxe/css/styles.css',
  '/shape-tap-deluxe/js/game.js',
  '/shape-tap-deluxe/manifest.json',
  '/shape-tap-deluxe/assets/game-start.mp3',
  '/shape-tap-deluxe/assets/winner-game-sound.mp3'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
