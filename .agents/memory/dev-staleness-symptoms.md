---
name: "Blank pages / non-JSON / blurry" dev staleness symptoms
description: Two recurring false-alarm symptoms in dev — transient non-JSON API fallback during restarts, and a duplicate empty canvas iframe.
---

# Dev staleness symptoms (usually not real bugs)

**"Server returned non-JSON, falling back to local IndexedDB"** (from
queryClient's offline fallback): clusters of these in the browser console line
up exactly with workflow restarts / Vite HMR. During a restart Vite briefly
serves the SPA HTML shell for `/api/*` requests, so the client sees HTML, not
JSON, and falls back to IndexedDB. This is transient — the warnings stop after
the final clean restart. Before chasing it as a server bug, confirm the
endpoint actually works (curl it / log in and hit it). A genuinely blank
map/page right after editing is usually this, not a data/logic bug.

**"Blurry pages" on the canvas:** recurs as a duplicate, EMPTY artifact iframe
stacked exactly on top of the live app frame (same x/y/w/h). Spot it in
`getCanvasState`: two `artifact:...default-start-application` shapes, one with a
real `url` and one with `url: ""`. Delete the empty one
(`applyCanvasActions` delete by its shapeId) — artifact frames CAN be deleted
here despite the skill's general note. It reappears periodically; just delete
again.

**Stale service worker:** a hand-written SW (`client/public/sw.js`) caches
static assets cache-first in production (it's unregistered in dev). If published
users report stale UI, bump `CACHE_VERSION` — the activate handler purges older
versions on next load. The SW already bypasses `/api/*`, so it is NOT a source
of non-JSON API responses.
