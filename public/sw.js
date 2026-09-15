// ============================================================================
// GolfSana — Service Worker
// ============================================================================
// L'ÚNIC propòsit d'aquest fitxer és fer que Android/Chrome ofereixin
// "Instal·lar app" automàticament (Chrome exigeix un service worker amb un
// gestor de "fetch" registrat per considerar l'app instal·lable).
//
// NO fa cap mena de cache agressiu de dades — GolfSana treballa amb dades
// en temps real (Firestore) i mostrar una versió antiga en cache seria pitjor
// que no tenir-hi res. Estratègia: sempre xarxa primer; el cache només
// s'utilitza com a últim recurs si no hi ha connexió (per exemple, per no
// deixar una pantalla totalment blanca si es perd la cobertura un moment).
// ============================================================================

const CACHE_NAME = "golfsana-shell-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Si algun fitxer de la carcassa falla en desar-se, no bloquegem
        // la instal·lació del service worker per això.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Només GET — mai interceptem escriptures ni peticions a Firestore/APIs
  // que no siguin simples lectures de la carcassa de l'app.
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
