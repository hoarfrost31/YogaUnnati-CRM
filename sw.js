const CACHE_VERSION = "app-cache-v3";
const APP_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./participant-form.html",
  "./styles.css",
  "./app.js",
  "./programs.js",
  "./participant-form.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
];

function isNetworkFirstAsset(url) {
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.endsWith("/") ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".webmanifest")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();

    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => {
      client.postMessage({ type: "SW_ACTIVATED", version: CACHE_VERSION });
    });
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isNetworkFirstAsset(url)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === "basic") {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

        throw new Error("Network unavailable and asset not cached.");
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }

    const response = await fetch(event.request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(event.request, response.clone());
    }
    return response;
  })());
});
