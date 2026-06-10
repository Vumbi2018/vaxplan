---
name: Platform-admin tenant sync bug
description: Why syncEngine must use the active viewing tenant as its IndexedDB key, not the user's home tenant.
---

## Rule
Always pass `getActiveSyncTenantId(user)` (from `client/src/lib/tenantCache.ts`) wherever the sync engine needs a tenant key — `init()`, `sync()`, and the realtime-sync trigger.

**Why:** Platform super-admins can switch between countries (PNG → ZMB etc). Their `user.tenantId` is their home country (e.g. PNG) and never changes. The server correctly scopes responses to the viewed country via the session `viewTenantId` / `x-tenant-id` header. But the sync engine used `user.tenantId` as its IndexedDB partition key, so ZMB data returned by the server was stored in the PNG bucket. On subsequent incremental syncs both countries' records accumulated in the same bucket, showing mixed or stale data in the UI.

**How to apply:** `getActiveSyncTenantId(user)` reads `localStorage.vaxplan_active_tenant` for platform admins (`user.isPlatformAdmin === true`), falling back to `user.tenantId` for all other users. Use it in:
- `client/src/hooks/useSyncEngine.ts` — `init()` and `sync()` calls
- `client/src/components/SyncStatus.tsx` — manual "Sync now" handler
- `client/src/pages/Settings.tsx` — retry-outbox sync trigger
- `client/src/hooks/useRealtimeSync.ts` — silent sync on WebSocket poke
