(() => {
  const SUPABASE_URL = "https://wjeyyklbcrqxawoxlphk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_d26AD3NNlXOW3oVuJOgVNg_6vNoSb-E";
  const VAPID_PUBLIC_KEY = "BPOg7dQmv4KW1Z25qYuVg-cJtsiEO0cRoDtIvWY6VAhO249WkGDiaQrS24Xv2NPC0CAx5FOUeCXIGKS0n2q5BcQ";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  function deviceId() {
    let id = localStorage.getItem("wbf_push_device_id");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() :
        ("wbf-" + Date.now() + "-" + Math.random().toString(36).slice(2));
      localStorage.setItem("wbf_push_device_id", id);
    }
    return id;
  }

  function getRole() {
    return localStorage.getItem("wbf_push_role") || "customer";
  }

  function getPhone() {
    return localStorage.getItem("wbf_customer_phone") ||
           localStorage.getItem("customer_phone") || null;
  }

  async function saveSubscription(sub) {
    const keys = sub.toJSON().keys || {};
    const body = {
      device_id: deviceId(),
      role: getRole(),
      customer_phone: getPhone(),
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent,
      active: true
    };

    const res = await fetch(SUPABASE_URL + "/rest/v1/push_subscriptions", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || ("HTTP " + res.status));
    }
  }

  async function registerPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const reg = await registerServiceWorker();
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      if (!("Notification" in window)) return false;
      if (Notification.permission !== "granted") return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await saveSubscription(sub);
    localStorage.setItem("wbf_push_registered", "1");
    return true;
  }

  async function registerServiceWorker() {
    const reg = await navigator.serviceWorker.register("./wbf-app-sw.js", {
      updateViaCache: "none"
    });

    // Install the reload listener BEFORE triggering activation.
    // This prevents a fast SKIP_WAITING/controllerchange from being missed.
    if (navigator.serviceWorker.controller && !window.__WBF_SW_RELOAD_LISTENER__) {
      window.__WBF_SW_RELOAD_LISTENER__ = true;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (window.__WBF_SW_RELOADED__) return;
        window.__WBF_SW_RELOADED__ = true;
        window.location.reload();
      });
    }

    // Force a fresh service-worker update check whenever the app opens.
    try { await reg.update(); } catch (_) {}

    // If a new worker is waiting, activate it immediately.
    if (reg.waiting) {
      try { reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
    }

    return reg;
  }

  window.WBF_PUSH = {
    enable: async () => {
      if (!("Notification" in window)) throw new Error("Notifikasi tidak didukung.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Izin notifikasi ditolak.");
      return registerPush();
    },
    register: registerPush,
    setRole: role => localStorage.setItem("wbf_push_role", role === "admin" ? "admin" : "customer"),
    setCustomerPhone: phone => {
      if (phone) localStorage.setItem("wbf_customer_phone", phone);
      else localStorage.removeItem("wbf_customer_phone");
    }
  };

  // Make the manifest available without changing the existing page layout.
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "./wbf-manifest.webmanifest";
    document.head.appendChild(link);
  }

  // Register and immediately check for a newer service worker.
  if ("serviceWorker" in navigator) {
    registerServiceWorker().catch(() => {});
  }
})();
