// Custom service worker for push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: data.icon || "/favicon.png",
      badge: data.badge || "/favicon.png",
      data: { url: data.url || "/negotiations" },
      vibrate: [200, 100, 200],
      tag: "barndle-notification",
      renotify: true,
      requireInteraction: true,
    };

    event.waitUntil(self.registration.showNotification(data.title || "barndle' hotmarket", options));
  } catch (e) {
    // Fallback for text payload
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("barndle' hotmarket", {
        body: text,
        icon: "/favicon.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/negotiations";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if possible
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// Cache strategy for PWA
const CACHE_NAME = "barndle-v1";
const PRECACHE_URLS = ["/", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Don't cache OAuth redirects
  if (event.request.url.includes("/~oauth")) return;
  
  // Network-first strategy for API calls
  if (event.request.url.includes("supabase") || event.request.url.includes("/functions/")) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
