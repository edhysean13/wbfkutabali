self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "WBF Kuta-Bali";
  const options = {
    body: data.body || "Ada pemberitahuan baru.",
    tag: data.tag || "wbf",
    data: { url: data.url || "/" },
    icon: data.icon || "",
    badge: data.badge || ""
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
