const CACHE_NAME = "stockflow-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/install.html",
  "/css/style.css",
  "/js/supabase.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});