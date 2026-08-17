const CACHE_NAME = "wbf-app-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./wbf-logo-online-order.png",
  "./wbf-manifest.webmanifest",
  "./admin.html",
  "./wbf-admin-manifest.webmanifest",
  "./wbf-admin-icon-192.png",
  "./wbf-admin-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || "WBF Kuta-Bali";
  const options = {
    body: data.body || data.message || "Ada pemberitahuan baru.",
    tag: data.tag || "wbf-notification",
    data: { url: data.url || "./" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "./";
  event.waitUntil(clients.openWindow(url));
});
