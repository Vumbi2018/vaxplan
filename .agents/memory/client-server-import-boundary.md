---
name: Client must never import from server/
description: Why "process is not defined" / pg-in-browser crashes keep recurring, and the structural fix.
---

**Rule:** No file under `client/src/` may import from `server/*`. Anything shared between client and server lives in `shared/`.

**Why:** `server/db.ts` constructs a `drizzle-orm/node-postgres` client, which transitively imports the `pg` package. `pg/lib/defaults.js` references `process.env` at module load. In the browser there is no `process`, so the moment a chunk containing `pg` is evaluated, you get an unrecoverable `ReferenceError: process is not defined` and the affected route renders as a white screen (or React error boundary if you have one).

Vite's optimize-deps pre-bundling makes this worse in two ways:
- Once Vite has bundled `pg` into its `.vite/deps` cache, the bad chunk can keep being served even after the offending import is removed — until the cache is cleared.
- The crash often appears unrelated to recent edits, because the chunk is only loaded when the user navigates to the lazy route that pulled it in.

**Symptoms to recognize:**
- Console: `ReferenceError: process is not defined` with a stack trace through `node_modules/.vite/deps/chunk-*.js` → `node_modules/pg/lib/defaults.js`.
- Often accompanied by a misleading "Invalid hook call" warning from React (because the failed module breaks the surrounding render).
- Specific routes go blank while the rest of the app works.

**How to apply (debug recipe):**
1. `rg -n "from ['\"].*server/|from ['\"]\\.\\./\\.\\./\\.\\./server" client/ --type ts` — locate the offending import.
2. Move the shared symbol(s) into `shared/<name>.ts` and re-export from the server module so existing server callers don't break.
3. Update the client to import from `@shared/<name>`.
4. `rm -rf node_modules/.vite` and restart the workflow so Vite re-scans the import graph.

If step 1 returns nothing but the crash persists, it is almost always just step 4 — the cache is stale, clear it.
