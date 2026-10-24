// Minimal service worker: makes the site installable and shows a friendly page when the phone is offline.
// It only touches page navigations; API calls and logged-in pages always go to the network (nothing private is cached).
const CACHE = "la-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
  }
});

// Phone notifications: show the message, and open the right page when it is tapped.
self.addEventListener("push", (event) => {
  let data = { title: "Lucky Arena", body: "You have a new message.", url: "/chat" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* plain text or empty push: use the defaults */
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/pwa-icon/192", badge: "/pwa-icon/192", data: { url: data.url }, tag: "la-chat" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
