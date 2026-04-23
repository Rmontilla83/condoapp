// Atryum service worker — DEPRECATED.
//
// Hasta nuevo aviso este SW se auto-desinstala: cacheaba HTML/RSC y
// causaba que router.refresh() devolviera data stale (y era un riesgo
// de privacidad entre usuarios). PWA se mantiene vía manifest.json +
// Next.js edge caching, sin necesidad de SW propio.
//
// Al cargar esta versión, el browser:
//   1. Instala este SW nuevo.
//   2. Borra todos los caches previos.
//   3. Se auto-desregistra.
//   4. Recarga los clientes conectados para romper cualquier cache en
//      memoria.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch {
        // noop
      }
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Pass-through: no intercepta ningún request.
  return;
});
