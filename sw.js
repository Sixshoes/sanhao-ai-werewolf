/**
 * 三好・雲起茶席 PWA Service Worker
 * - 重資產（.vrm / portraits / sky / textures / vendor JS）採 Cache-First，二次開啟秒載入
 * - 核心網頁與腳本採 Network-First（離線自動降級快取）
 * - /api/* 即時動態端點永不快取
 */
const CACHE_NAME = "sanhao-tea-v12.1";
const IMMUTABLE_RE = /\/(?:assets\/(?:models\/[^/]+\.vrm|(?:portraits|portraits_vrm|sky|textures)\/)|js\/vendor\/)/i;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          return k !== CACHE_NAME ? caches.delete(k) : Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (!req || req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") !== -1) return;

  if (IMMUTABLE_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (resp) {
            if (resp && resp.ok && resp.status === 200) {
              cache.put(req, resp.clone()).catch(function () {});
            }
            return resp;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(function (resp) {
        if (resp && resp.ok && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone).catch(function () {});
          });
        }
        return resp;
      })
      .catch(function () {
        return caches.match(req);
      })
  );
});
