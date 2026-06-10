---
name: Security sweep results
description: Which issues from the VaxPlan security sweep were real vs already safe; file encoding notes
---

## Already safe (no fix needed)
- `platform-admin` endpoint (routes.ts): protected at registration time
- Dexie indexes: all tables already had `tenantId` in compound indexes
- `updateFacility` / `updateMicroplan` storage layer: already strips `tenantId` with `const { tenantId: _i, ...safe } = data as any` before the `.set()`
- `login-password` rate limiting: already used rateKey/checkLocked/recordFailure
- `Dashboard.tsx` catch{}: localStorage ops — intentional swallow, nothing useful on failure
- `realtimeClient.ts` catch{}: WebSocket close/send — intentional swallow when socket already bad
- `<a href="/api/logout">`: full page nav clears React Query + Zustand state naturally

## File encoding
All key files are CRLF. Must use Python read/write (NOT edit tool) for:
reportingService.ts, surveillance.ts, syncEngine.ts, queryClient.ts,
BudgetPlanning.tsx, MapView.tsx, passwordAuth.ts, Dashboard.tsx,
all report pages in client/src/pages/reports/*.tsx
LF-only (edit tool OK): StockLedger.tsx, MapPage.tsx, stockAlerts.ts, realtimeClient.ts, UserMenu.tsx

**Why:** Edit tool uses LF; writing CRLF files with it mangles line endings and breaks the diff.
