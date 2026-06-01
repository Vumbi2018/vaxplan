---
name: Default queryFn joins queryKey into the request URL
description: Why a new TanStack useQuery can silently 404 in this repo's client
---

The shared default query function in `client/src/lib/queryClient.ts` builds the
request URL as `queryKey.join("/")`. So a query like
`useQuery({ queryKey: ["/api/foo", tenantInfo?.id] })` with NO explicit
`queryFn` actually fetches `/api/foo/<tenantId>`, not `/api/foo`.

**Why:** the codebase commonly adds a tenantId (or similar) to the queryKey to
partition the cache per tenant. That extra segment is harmless only if a
matching `/:param` server route exists; otherwise the request 404s and the
panel renders empty with no obvious error.

**How to apply:** whenever a new useQuery's key carries non-URL segments (ids
used purely for cache partitioning), give it an explicit
`queryFn: () => apiRequest("GET", "/api/foo")` (matching the travel-time /
community-assets queries in SettlementIntelligence.tsx). And invalidate using
the BARE prefix `["/api/foo"]` after related mutations so the partitioned
entries refetch.
