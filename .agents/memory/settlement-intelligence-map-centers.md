---
name: Settlement Intelligence map centers
description: Two distinct map-center states on the SettlementIntelligence page and why they must stay separate.
---

The Settlement Intelligence map page tracks **two** centers, deliberately separate:

- `activeCenter` — drives `MapCenterController` which calls `map.setView(...)`. It is set
  *programmatically only* (tenant default `mapCenter`, average of records, or a "Locate"
  click on a cluster). It is an imperative command to move the map.
- `assetsCenter` — follows where the **user** has panned/zoomed. Updated by `MapMoveWatcher`
  (a `useMapEvents({ moveend })` child of `MapContainer`) with a ~600ms debounce, and it is
  the only thing the "Community Assets" layer query (`GET /api/geo/community-assets`) keys on.

**Why:** if the layer query keys on `activeCenter`, the layer never updates when the user
just pans the map (activeCenter only changes on Locate/tenant switch), so assets appear
"stuck" at the last programmatic center. Conversely, do NOT feed `moveend` back into
`activeCenter` — that re-triggers `setView` and risks a pan/setView feedback loop. Keep them
as separate state. The debounce keeps Overpass from being hammered mid-pan.

**How to apply:** any new map-following query on this page should key on `assetsCenter` (or
its own debounced moveend), never `activeCenter`. Programmatic "fly to" actions set
`activeCenter`; the resulting setView fires `moveend`, which naturally syncs `assetsCenter`.
