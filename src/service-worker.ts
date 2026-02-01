const CACHE_NAME = "aqualibria-shell-v1";
const ASSETS = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (e: any) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c: any) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e: any) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e: any) => {
  e.respondWith(caches.match(e.request).then((r: any) => r || fetch(e.request)));
});
