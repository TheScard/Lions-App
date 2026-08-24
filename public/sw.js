// Service Worker – Grundgeruest.
// Aktuell ohne Caching-Strategie und ohne Push-Handling; beides folgt in
// einem spaeteren Schritt (Offline-Support bzw. Web Push fuer Termine).

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
