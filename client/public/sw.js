/**
 * VaxPlan Service Worker
 * Enables offline-first functionality and PWA installability on Windows & Android.
 *
 * Strategy:
 * - Static assets (JS, CSS, fonts, images): Cache-First (fast loads)
 * - Map tiles (OpenStreetMap): Cache-First with 500-tile limit (offline maps)
 * - API calls (/api/*): Network-First with stale fallback
 * - Navigation (HTML): Network-First with offline fallback page
 */

const CACHE_VERSION = "vaxplan-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const TILES_CACHE = `${CACHE_VERSION}-tiles`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
];

const TILE_HOSTS = [
  "tile.openstreetmap.org",
  "server.arcgisonline.com",
];

const MAX_TILE_CACHE_ENTRIES = 500;

// ─── Install: pre-cache critical assets ────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clean up old cache versions ──────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("vaxplan-") && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: routing logic ────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST/PATCH/DELETE go straight to network)
  if (event.request.method !== "GET") return;

  // Map tile caching (cache-first, trim to 500 entries)
  if (TILE_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // API calls: network-first, stale-while-revalidate on failure
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // HTML navigation: network-first, offline fallback
  event.respondWith(navigationStrategy(event.request));
});

// ─── Strategy: Cache-First ──────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// ─── Strategy: Network-First with stale fallback ────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline", message: "No network connection" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Strategy: Navigation (HTML pages) ─────────────────────────────────────
async function navigationStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match("/") || await cache.match("/offline.html");
    return cached || new Response("VaxPlan is offline. Please check your connection.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Strategy: Tile Cache with LRU trimming ─────────────────────────────────
async function tileStrategy(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Trim cache if over limit
      const keys = await cache.keys();
      if (keys.length >= MAX_TILE_CACHE_ENTRIES) {
        await cache.delete(keys[0]); // Remove oldest
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// ─── Background Sync for offline POST/PATCH operations ──────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-catchments") {
    event.waitUntil(syncOfflineQueue("catchments-queue"));
  }
});

async function syncOfflineQueue(storeName) {
  // Notify clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) =>
    client.postMessage({ type: "SYNC_STATUS", storeName, status: "syncing" })
  );
}
