// Service Worker – Grundgeruest + Web Push.
// Weiterhin ohne Caching-Strategie (Offline-Support folgt ggf. spaeter).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Bewusst kein Caching/Interception – Requests laufen normal durch,
  // bis eine Offline-Strategie definiert ist.
});

// Payload wird von lib/push.ts als JSON gesendet: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = { title: "Lions Adenau", body: "", url: "/dashboard" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Kein JSON-Payload -- Default-Werte oben beibehalten.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

// Fokussiert ein bereits offenes App-Fenster und navigiert dorthin, statt
// ein weiteres Fenster zu oeffnen -- nur wenn keines offen ist, wird eines
// neu geoeffnet.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
