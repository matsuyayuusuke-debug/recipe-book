// スクショレシピ帳 service worker
// アプリを更新したら VERSION の数字を上げてください（例: v2）。
const VERSION = "v1";
const APP_CACHE = "recipe-app-" + VERSION;
const FONT_CACHE = "recipe-fonts";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./seed/recipes.json",
  "./seed/img/seed-potato_photo.jpg",
  "./seed/img/seed-potato_shot1.jpg",
  "./seed/img/seed-potato_shot2.jpg",
  "./seed/img/seed-garlic_photo.jpg",
  "./seed/img/seed-garlic_shot1.jpg",
  "./seed/img/seed-garlic_shot2.jpg",
  "./seed/img/seed-tako_photo.jpg",
  "./seed/img/seed-tako_shot1.jpg",
  "./seed/img/seed-tako_shot2.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: keep a copy so the fonts work offline too
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        } catch (e) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App files: answer from the cache right away, refresh the cache in the background
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true }) ||
        (req.mode === "navigate" ? await cache.match("./index.html") : undefined);
      const refresh = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => undefined);
      if (hit) { event.waitUntil(refresh); return hit; }
      const res = await refresh;
      return res || new Response("オフラインです", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })
  );
});
