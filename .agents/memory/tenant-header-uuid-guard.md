---
name: Tenant header UUID guard
description: Why tenantContext must validate x-tenant-id / viewTenantId as a UUID before any DB lookup.
---

The client persists the active tenant and sends it as the `x-tenant-id` header on
every fetch (global fetch interceptor in `client/src/main.tsx`). That value can be
a tenant **code** (e.g. `ZMB`) rather than the tenant UUID.

**Rule:** `tenantContext` must only accept `x-tenant-id` / `session.viewTenantId`
when it matches a UUID regex AND resolves to an *active* tenant, before persisting
it to the session or passing it to `storage.getTenant()`.

**Why:** `tenants.id` is a uuid column. Passing a non-UUID string makes Postgres
throw `22P02` (invalid input syntax for type uuid). Worse, the old code wrote the
bad header straight into `session.viewTenantId`, so a single bad request poisoned
the whole session and every subsequent request 500'd (this is what caused the
`/api/resources/geotiff?tenant=ZMB` 500s). Always purge a non-UUID/stale override
and fall back to `session.tenantId` / home tenant.

**How to apply:** Any middleware or route that reads a tenant identifier from a
header/query/session and feeds it to a uuid column needs the same UUID-shape +
active-tenant guard. Don't trust client-supplied tenant ids.
