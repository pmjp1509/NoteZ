// Empty service worker to prevent fetch errors
// This file exists to stop browser errors when trying to fetch sw.js

self.addEventListener('install', () => {
  console.log('Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service worker activated');
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests without caching
  event.respondWith(fetch(event.request));
});
