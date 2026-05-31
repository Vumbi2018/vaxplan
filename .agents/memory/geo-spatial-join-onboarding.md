---
name: Spatial-join country onboarding (province/district consistency)
description: When deriving admin hierarchy from facility coordinates, take province AND district from the same geometry source — never mix a source CSV's province with a geometry-derived district.
---

# Deriving admin hierarchy from coordinates

When onboarding a country from an open facility CSV that only carries a
province label (Admin1) and GPS, recover the missing district by
point-in-polygon against GeoBoundaries ADM2.

**Rule:** derive BOTH province (ADM1 PIP) and district (ADM2 PIP) from the
same geometry. Use the source CSV's own province ONLY as a fallback label
for facilities that can't be located at all.

**Why:** mixing the source's declared province with a geometry-derived
district produces impossible pairings — the source province and the
coordinates frequently disagree, so you get a district shown under the
wrong province (e.g. ZAF showed a North West district under Free State).
The seed then persists those bad `(province, district)` pairs as durable
rows.

**How to apply:**
- ADM1 PIP for province, ADM2 PIP for district. If a point lands in a
  district polygon but no province polygon (boundary gaps), recover the
  province from the district polygon's centroid so the pair stays
  consistent.
- Canonicalise the geometry-derived province name to the official list —
  GeoBoundaries' own data can carry typos (ZAF ADM1 ships "Nothern Cape"),
  which otherwise creates a duplicate/misspelled province and breaks the
  seed's name→code map.
- The seed migrations skip existing rows (idempotent), so they will NOT
  repair an already-corrupted hierarchy. To fix bad data you must delete
  the tenant's geo rows (facilities → districts → provinces → regions,
  scoped by tenant_id) and re-run the seed.
- Verify after seeding: no district name should map to >1 province
  (excluding the per-province "Unassigned — <Province>" buckets).
