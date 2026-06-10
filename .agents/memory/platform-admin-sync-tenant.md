---
name: Platform-admin tenant sync bug
description: Why and how cross-country data mixing was fixed for platform super-admins.
---

## Rules

### 1 — Sync engine must use the active viewing tenant as its key
Use `getActiveSyncTenantId(user)` (from `client/src/lib/tenantCache.ts`) wherever
the sync engine needs a tenant key — `init()`, `sync()`, and the realtime-sync trigger.

**Why:** Platform super-admins can switch countries. Their `user.tenantId` is always
their home country. The sync engine used it as the IndexedDB partition key, so data
for the viewed country was stored in the home-country bucket.

**How to apply:** `getActiveSyncTenantId(user)` reads `localStorage.vaxplan_active_tenant`
for platform admins (`user.isPlatformAdmin === true`), falling back to `user.tenantId`.
Applied in: `useSyncEngine.ts`, `SyncStatus.tsx`, `Settings.tsx`, `useRealtimeSync.ts`.

### 2 — Clear Dexie on tenant change (syncEngine.init)
When `syncEngine.init(tenantId)` detects that the persisted `syncMeta.syncedTenantId`
differs from the incoming `tenantId`, it must call `clearLocalTenantCache()` and delete
`syncMeta.lastSyncAt` before proceeding, then persist the new `syncedTenantId`.

**Why:** Without clearing, records from previously-visited countries accumulate in the
shared Dexie tables forever. Both online and offline paths then return mixed results.

**How to apply:** Already implemented in `syncEngine.init()`. The `syncedTenantId` key
in `syncMeta` is the persistent record of which tenant was last synced.

### 3 — Filter all offline Dexie reads by active tenant
Every `.toArray()` in `getOfflineData()` (queryClient.ts), MapPage.tsx, and the inline
queryFns in MapView.tsx must filter by `loadActiveTenant()?.id` via a `where("tenantId").equals(tid)` clause.

**Why:** `.toArray()` returns ALL records from all tenants; without filtering, any
offline fallback (or edge-case non-JSON server response) returns mixed country data.

**How to apply:** `queryClient.ts` uses a `_byTenant()` helper; `MapPage.tsx` and
`MapView.tsx` inline the same pattern. All entity tables (`offlineDb.provinces`,
`offlineDb.facilities`, etc.) support `.where("tenantId")` because `tenantId` is
an indexed column in the Dexie schema.
