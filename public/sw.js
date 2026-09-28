// Service worker Kabanalouer — notifications Web Push uniquement.
// Volontairement AUCUN gestionnaire "fetch" ni cache : les pages restent
// toujours servies par le réseau (pas de contenu périmé après un déploiement).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Kabanalouer";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/badge-96.png",
    data: { url: payload.url || "/messages" },
  };
  // Même tag = une seule notification par conversation (la plus récente
  // remplace la précédente), renotify pour quand même faire vibrer/sonner.
  if (payload.tag) {
    options.tag = payload.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/messages",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== target) {
            try {
              await client.navigate(target);
            } catch {
              // navigate() refusé (client non contrôlé) — la fenêtre est au moins au premier plan
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
