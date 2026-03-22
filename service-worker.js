const CACHE_NAME = "stockflow-v1.0.2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./signup.html",
  "./dashboard.html",
  "./products.html",
  "./sales.html",
  "./receipt.html",
  "./stores.html",
  "./staff.html",
  "./inventory.html",
  "./stock-adjustment.html",
  "./reports.html",
  "./customers.html",
  "./debt-book.html",
  "./customer-statement.html",
  "./cash-submission.html",
  "./notifications.html",
  "./pricing.html",
  "./settings.html",
  "./install.html",
  "./ask-ai.html",

  "./css/style.css",

  "./js/config.js",
  "./js/supabase.js",
  "./js/shared.js",
  "./js/auth.js",
  "./js/index.js",
  "./js/dashboard.js",
  "./js/products.js",
  "./js/sales.js",
  "./js/receipt.js",
  "./js/stores.js",
  "./js/staff.js",
  "./js/inventory.js",
  "./js/stock-adjustment.js",
  "./js/reports.js",
  "./js/customers.js",
  "./js/debt-book.js",
  "./js/customer-statement.js",
  "./js/cash-submission.js",
  "./js/notifications.js",
  "./js/pricing.js",
  "./js/settings.js",
  "./js/ask-ai.js",
  "./js/utils.js",
  "./js/error-handler.js",
  "./js/auth-guard.js",
  "./js/offline.js",
  "./js/app-shell.js",

  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./manifest.json"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});

// PUSH READY FOUNDATION
self.addEventListener("push", (event) => {
  let data = {
    title: "StockFlow",
    body: "You have a new update.",
    icon: "./icons/icon-192.png"
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error("Push parse error:", error);
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "StockFlow", {
      body: data.body || "You have a new notification.",
      icon: data.icon || "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      data: data.url || "./dashboard.html"
    })
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data || "./dashboard.html";

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
