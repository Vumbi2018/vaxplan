---
name: WorldPop raster values are people-per-cell (not density)
description: How to interpret and present the gridded population raster so health workers see real people, not an abstract density.
---

# WorldPop raster = people per ~100m cell (headcount), not a /km² density

The gridded population raster values (one per ~100m × 100m cell ≈ 1 hectare)
are an **absolute people count for that cell**, not a density ratio. So:

- Summing cell values over an area (polygon, route buffer, or a radius circle)
  yields a **real headcount** — this is what calculateGeofencePopulation and the
  radius-sum on map click both do (reuse getRasterSparse's rbush + turf
  distance; no uniform-density assumption).
- The heatmap color thresholds (pixelValuesToColorFn: val>1000/>500/>250/>100/
  >50/>10) are **per-cell people counts**. The legend must read in "people per
  cell", NOT "/km²" — the old "/km²" labels were wrong and never matched the
  colors.

**Why:** PRD constraint — "health workers cannot calculate population from
density." Any surface that shows the raster (legend, map-click popup) must
present real people, and the app must do the math (e.g. people within 1 km of a
clicked point), never make the user convert a density figure.

**How to apply:** when touching the population overlay/legend/popup, keep units
as people. If a future product uses a true people/km² density raster instead,
do NOT sum its cells for headcount — multiply by cell area first.
