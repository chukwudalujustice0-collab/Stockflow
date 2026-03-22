const CACHE_NAME = "stockflow-pwa-v300";
const APP_SHELL = [
  "/",
  "/index.html?v=300",
  "/login.html?v=30",
  "/signup.html?v=30",
  "/dashboard.html?v=202",
  "/products.html?v=203",
  "/sales.html?v=205",
  "/reports.html?v=206",
  "/settings.html?v=207",
  "/stores.html?v=204",
  "/receipt.html?v=208",
  "/css/style.css?v=203",
  "/js/config.js?v=202",
  "/js/supabase.js?v=202",
  "/js/shared.js?v=202",
  "/js/auth.js?v=30",
  "/js/dashboard.js?v=202",
  "/js/products.js?v=203",
  "/js/sales.js?v=205",
  "/js/reports.js?v=206",
  "/js/settings.js?v=207",
  "/js/stores.js?v=204",
  "/js/receipt.js?v=208",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("Cache add failed:", url, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Only handle same-origin requests
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html?v=300");
          }
        });
    })
  );
});

// PUSH FOUNDATION
self.addEventListener("push", (event) => {
  let data = {
    title: "StockFlow",
    body: "You have a new update.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    url: "/dashboard.html?v=202"
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (err) {
    console.warn("Push payload parse failed:", err);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      data: {
        url: data.url || "/dashboard.html?v=202"
      }
    })
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/dashboard.html?v=202";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
