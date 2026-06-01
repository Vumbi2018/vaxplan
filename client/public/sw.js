/**
 * VaxPlan Service Worker
 * Enables offline-first functionality, PWA installability, and
 * Background Sync for the offline mutation outbox.
 *
 * Strategy:
 * - Static assets (JS, CSS, fonts, images): Cache-First (fast loads)
 * - Map tiles (OpenStreetMap / CartoDB): Cache-First with 500-tile LRU
 * - API calls (/api/*): Network-First with stale fallback
 * - Navigation (HTML): Network-First with offline fallback page
 * - 'sync' event (tag: outbox-flush): drain Dexie outbox via
 *   POST /api/sync/batch even when the page/PWA is closed.
 */

const CACHE_VERSION = "vaxplan-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const TILES_CACHE = `${CACHE_VERSION}-tiles`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = ["/", "/manifest.json", "/offline.html"];
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com", "basemaps.cartocdn.com"];
const MAX_TILE_CACHE_ENTRIES = 500;

const OUTBOX_SYNC_TAG = "outbox-flush";
const OUTBOX_DB_NAME = "VaxPlanOfflineDB";
const OUTBOX_STORE = "outbox";
const CONFLICT_STORE = "conflictLog";
const SYNC_META_STORE = "syncMeta";
const OUTBOX_LEASE_KEY = "outbox-flush-lease";
const OUTBOX_LEASE_TTL_MS = 30_000;
const MAX_RETRIES = 5;
const BATCH_ENDPOINT = "/api/sync/batch";

// Reference the Workbox precache manifest token so vite-plugin-pwa
// (when configured with strategies: 'injectManifest') can swap in the
// real precache list. Safe no-op if not present.
// eslint-disable-next-line no-undef
const WB_MANIFEST = self.__WB_MANIFEST || [];

// ─── Install: pre-cache critical assets ────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      // Best-effort precache of build-pinned URLs from Workbox manifest.
      const manifestUrls = WB_MANIFEST.map((e) => (typeof e === "string" ? e : e.url)).filter(
        Boolean,
      );
      if (manifestUrls.length) {
        try {
          await cache.addAll(manifestUrls);
        } catch {
          /* ignore individual failures */
        }
      }
      // Notify any open clients that a new SW is waiting to activate.
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: "SW_INSTALLED", version: CACHE_VERSION }));
    })(),
  );
});

// ─── Activate: clean up old cache versions ──────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("vaxplan-") && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "SW_ACTIVATED", version: CACHE_VERSION }));
    })(),
  );
});

// Allow page to trigger immediate skipWaiting (e.g. "Reload to update" button).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "TRIGGER_OUTBOX_FLUSH") {
    event.waitUntil(drainOutbox());
  }
});

// ─── Fetch: routing logic ────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;

  if (TILE_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(tileStrategy(event.request));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    // Per Task #38 spec, /api/* requests bypass the SW cache so the
    // app always sees fresh data and the outbox/Background-Sync flow
    // is the single source of truth for offline writes.
    return;
  }
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }
  event.respondWith(navigationStrategy(event.request));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "offline", message: "No network connection" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

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
    const cached = (await cache.match("/")) || (await cache.match("/offline.html"));
    return (
      cached ||
      new Response("VaxPlan is offline. Please check your connection.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function tileStrategy(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const keys = await cache.keys();
      if (keys.length >= MAX_TILE_CACHE_ENTRIES) {
        await cache.delete(keys[0]);
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// ─── Background Sync: flush the offline outbox ──────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === OUTBOX_SYNC_TAG) {
    event.waitUntil(drainOutbox());
  }
});

async function notifyClients(type, payload = {}) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type, ...payload }));
}

/**
 * Open the Dexie-managed IndexedDB without creating/upgrading it.
 * We rely on the page having already created the DB with its schema —
 * the SW only reads/writes existing object stores.
 */
function openOutboxDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAll(db, storeName) {
  return new Promise((resolve, reject) => {
    let store;
    try {
      store = db.transaction(storeName, "readonly").objectStore(storeName);
    } catch (err) {
      reject(err);
      return;
    }
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbUpdate(db, storeName, key, patch) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        resolve();
        return;
      }
      store.put({ ...existing, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    } catch (err) {
      reject(err);
      return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function acquireLease(db, owner) {
  // Read-then-write inside one txn for atomicity.
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(SYNC_META_STORE, "readwrite");
    } catch (err) {
      // syncMeta store missing — treat as no lease available rather than crash.
      resolve(false);
      return;
    }
    const store = tx.objectStore(SYNC_META_STORE);
    const getReq = store.get(OUTBOX_LEASE_KEY);
    let granted = false;
    getReq.onsuccess = () => {
      const existing = getReq.result;
      const now = Date.now();
      let parsed = null;
      if (existing && typeof existing.value === "string") {
        try { parsed = JSON.parse(existing.value); } catch { parsed = null; }
      }
      if (parsed && typeof parsed.expiresAt === "number" && parsed.expiresAt > now) {
        granted = false;
        return;
      }
      store.put({
        key: OUTBOX_LEASE_KEY,
        value: JSON.stringify({ ownerId: owner, expiresAt: now + OUTBOX_LEASE_TTL_MS }),
      });
      granted = true;
    };
    tx.oncomplete = () => resolve(granted);
    tx.onerror = () => reject(tx.error);
  });
}

async function releaseLease(db, owner) {
  return new Promise((resolve) => {
    let tx;
    try {
      tx = db.transaction(SYNC_META_STORE, "readwrite");
    } catch {
      resolve();
      return;
    }
    const store = tx.objectStore(SYNC_META_STORE);
    const getReq = store.get(OUTBOX_LEASE_KEY);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      let parsed = null;
      if (existing && typeof existing.value === "string") {
        try { parsed = JSON.parse(existing.value); } catch { parsed = null; }
      }
      if (parsed && parsed.ownerId === owner) {
        store.delete(OUTBOX_LEASE_KEY);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function drainOutbox() {
  await notifyClients("OUTBOX_SYNC_STARTED");

  let db;
  try {
    db = await openOutboxDb();
  } catch (err) {
    await notifyClients("OUTBOX_SYNC_FINISHED", { ok: false, reason: "db-open-failed" });
    return;
  }

  // Try to take the cross-context flush lease. If the page-side
  // syncEngine.flush() currently holds it, bail — it will broadcast
  // its own completion and the SW will be re-triggered if anything
  // still needs flushing.
  const owner = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let leased = false;
  try {
    leased = await acquireLease(db, owner);
  } catch {
    leased = false;
  }
  if (!leased) {
    await notifyClients("OUTBOX_SYNC_FINISHED", { ok: false, reason: "leased" });
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let succeededFinish = false;
  let earlyExitReason = null;
  let conflicts = 0;

  try {
    const all = await idbAll(db, OUTBOX_STORE);
    // Group by tenantId so each batch matches what /api/sync/batch expects.
    const byTenant = new Map();
    for (const item of all) {
      if ((item.retries || 0) >= MAX_RETRIES) continue;
      const key = item.tenantId || "default";
      if (!byTenant.has(key)) byTenant.set(key, []);
      byTenant.get(key).push(item);
    }

    for (const [tenantId, pending] of byTenant) {
      if (!pending.length) continue;
      processed += pending.length;

      let resp;
      try {
        resp = await fetch(BATCH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": tenantId,
          },
          credentials: "include",
          body: JSON.stringify({ mutations: pending }),
        });
      } catch {
        // Network died mid-flight — the browser will fire 'sync' again
        // automatically when connectivity returns. Bail without bumping
        // retry counters so we don't burn the budget on transient errors.
        earlyExitReason = "network";
        break;
      }

      if (resp.status === 401 || resp.status === 403) {
        // Auth lost — leave items in place; user will log in and we
        // try again on the next sync trigger.
        earlyExitReason = "auth";
        break;
      }

      if (!resp.ok) {
        // Server-side error — bump retries on the whole batch.
        for (const item of pending) {
          if (item.id != null) {
            await idbUpdate(db, OUTBOX_STORE, item.id, {
              retries: (item.retries || 0) + 1,
              lastError: `HTTP ${resp.status}`,
            });
          }
        }
        continue;
      }

      let parsed = { results: [] };
      try {
        parsed = await resp.json();
      } catch {
        /* tolerate empty body */
      }
      const results = (parsed && parsed.results) || [];

      for (const result of results) {
        const item = pending.find((p) => p.id === result.outboxId);
        if (!item) continue;
        if (result.success) {
          succeeded += 1;
          if (item.id != null) await idbDelete(db, OUTBOX_STORE, item.id);
        } else {
          // Treat 409-style errors as conflicts; everything else as retryable.
          const isConflict =
            result.error &&
            /conflict|version|already exists|duplicate/i.test(String(result.error));
          if (isConflict) {
            conflicts += 1;
            try {
              await idbPut(db, CONFLICT_STORE, {
                tenantId: item.tenantId,
                entityType: item.entityType,
                localId: item.localId,
                serverError: String(result.error),
                attemptedPayload: item.body,
                detectedAt: Date.now(),
                resolved: false,
              });
            } catch {
              /* conflictLog store may not exist on older DB versions */
            }
            if (item.id != null) await idbDelete(db, OUTBOX_STORE, item.id);
          } else if (item.id != null) {
            await idbUpdate(db, OUTBOX_STORE, item.id, {
              retries: (item.retries || 0) + 1,
              lastError: String(result.error || "Unknown error"),
            });
          }
        }
      }
    }
    succeededFinish = !earlyExitReason;
  } catch (err) {
    earlyExitReason = "exception";
  } finally {
    await releaseLease(db, owner);
  }

  if (succeededFinish) {
    await notifyClients("OUTBOX_SYNC_FINISHED", {
      ok: true,
      processed,
      succeeded,
      conflicts,
    });
  } else {
    await notifyClients("OUTBOX_SYNC_FINISHED", {
      ok: false,
      reason: earlyExitReason || "unknown",
    });
  }
}
