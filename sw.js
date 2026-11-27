/**
 * 三好AI狼人殺 — 離線快取 Service Worker（v25.6.0 雙快取池架構）
 * - SHELL_CACHE（sanhao-shell-v25.6.0）：核心 HTML / CSS / JS / manifest，採 Network-First 策略，確保回訪即得最新版
 * - ASSET_CACHE（sanhao-assets-v25.6.0）：大型 3D VRM / 靜態語音包 / 立繪 / 360 天穹 / PBR 貼圖 / Vendor 函式庫，
 *   採 Cache-First 策略（上限 200 筆），快取未命中時以 no-cache 向伺服器校驗 ETag，與程式外殼完全隔離、絕不互相擠出快取
 * - /api/* 即時端點一律跳過快取
 */
"use strict";

const SHELL_CACHE = "sanhao-shell-v25.6.0";
const ASSET_CACHE = "sanhao-assets-v25.6.0";
const ACTIVE_CACHES = [SHELL_CACHE, ASSET_CACHE];
const MAX_ASSET_ENTRIES = 200;
const MAX_SHELL_ENTRIES = 90;

const CORE_SHELL_URLS = [
  "./",
  "./index.html",
  "./ai.html",
  "./manifest.webmanifest",
  "./css/tailwind-local.css",
  "./css/theme.css",
  "./css/components.css"
];

const IMMUTABLE_RE = /^(?!.*\/manifest\.json$).*(?:\/assets\/(?:models|sky|textures|portraits|portraits_vrm|voice_pack)\/|\/js\/vendor\/|\.(?:vrm|glb|png|jpe?g|webp|woff2?|mp3|wav)$)/i;

function isCoreShellUrl(urlStr) {
  return CORE_SHELL_URLS.some(function (u) {
    const clean = u.replace(/^\.\//, "");
    return clean ? urlStr.endsWith("/" + clean) : urlStr.endsWith("/");
  });
}

async function trimCacheIfNeeded(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    let excess = keys.length - maxEntries;
    for (let i = 0; i < keys.length && excess > 0; i++) {
      const req = keys[i];
      if (cacheName === SHELL_CACHE && isCoreShellUrl(req.url)) continue;
      await cache.delete(req);
      excess -= 1;
    }
  } catch (e) { }
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return Promise.all(
        CORE_SHELL_URLS.map(function (u) {
          return cache.add(u).catch(function () { return null; });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (ACTIVE_CACHES.indexOf(k) === -1) return caches.delete(k);
          return Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event && event.data === "GET_SW_VERSION" && event.ports && event.ports[0]) {
    try { event.ports[0].postMessage(SHELL_CACHE); } catch (e) {}
  }
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0 || url.pathname.indexOf("/_vercel/") === 0) return;

  // Pool A: Large immutable static assets (VRM / voice_pack / portraits / sky / textures / vendor) -> Cache-First
  if (IMMUTABLE_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(function (cache) {
        return cache.match(req, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          return fetch(req, { cache: "no-cache" }).then(function (resp) {
            if (resp && resp.status === 200 && resp.type === "basic") {
              cache.put(req, resp.clone()).then(function () {
                return trimCacheIfNeeded(ASSET_CACHE, MAX_ASSET_ENTRIES);
              }).catch(function () { return null; });
            }
            return resp;
          }).catch(function () {
            return new Response("Offline asset unavailable", { status: 503, statusText: "Service Unavailable" });
          });
        });
      }).catch(function () {
        return new Response("Offline asset unavailable", { status: 503, statusText: "Service Unavailable" });
      })
    );
    return;
  }

  // Pool B: App shell HTML / CSS / JS / manifest -> Network-First (always fresh on return visits, offline fallback)
  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(function (resp) {
        if (resp && resp.status === 200 && resp.type === "basic") {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then(function (cache) {
            return cache.put(req, clone).then(function () {
              return trimCacheIfNeeded(SHELL_CACHE, MAX_SHELL_ENTRIES);
            });
          }).catch(function () { return null; });
        }
        return resp;
      })
      .catch(function () {
        return caches.open(SHELL_CACHE).then(function (cache) {
          return cache.match(req, { ignoreSearch: true }).then(function (hit) {
            if (hit) return hit;
            if (req.mode === "navigate") {
              return cache.match("./ai.html", { ignoreSearch: true }).then(function (navHit) {
                return navHit || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
              });
            }
            return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
          });
        }).catch(function () {
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});
