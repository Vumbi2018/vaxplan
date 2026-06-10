# Onboarding a country from the Sub-Saharan facility dataset

This is the repeatable recipe for standing up a new country tenant from
the open **Sub-Saharan public health facilities** dataset (the CSV in
`attached_assets/Sub-Saharan_public_health_facilities_*.csv`). It was
used to onboard **South Africa (ZAF)** and works for any country in that
file.

The dataset only carries **province (Admin1)** for each facility — not
district. VaxPlan recovers the hierarchy by matching each facility's GPS
coordinates against **GeoBoundaries** polygons (point-in-polygon), so you
get a full Country → Province → District → Facility hierarchy without a
separate district list.

> **Derive province and district from the SAME geometry.** Always take
> *both* the province (ADM1) and the district (ADM2) from the spatial
> join — never mix the source CSV's own province label with a
> geometry-derived district. Doing so produces impossible pairings (a
> district shown under the wrong province) because the source province
> and the coordinates can disagree. The source's `Admin1` is used only as
> a fallback label for facilities that can't be located at all.
>
> **Watch for typos in GeoBoundaries names.** GeoBoundaries' own data can
> carry spelling errors (ZAF ADM1 ships "Nothern Cape"). Canonicalise the
> derived province name to your official list so the seed's
> `provinceCode()` map keys correctly and you don't get duplicate
> provinces.

## Prerequisites

- `@turf/turf` installed (already a dependency).
- Network access to `geoboundaries.org` (the prep step fetches ADM1 and
  ADM2 polygons on the fly).
- `facilities.external_ids` column present (added by
  `003-facility-external-ids.sql`; the seed also ensures it).

## Step 1 — Prepare the per-country CSV (spatial join)

`scripts/prep-south-africa.ts` filters the attached dataset to one
country, fetches its ADM1 (province) and ADM2 (district) boundaries from
GeoBoundaries, assigns every facility to a province and district by
point-in-polygon (both from the same geometry — see the box above), and
writes a clean `data/<country>/facilities.csv`. Facilities with no
coordinates, or whose point falls outside every ADM2 polygon, are bucketed
into a visible `Unassigned — <Province>` district so **nothing is silently
dropped**.

```bash
tsx scripts/prep-south-africa.ts
```

Output columns: `province, district, name, facility_type, ownership,
latitude, longitude, ll_source, fid`.

**To onboard a different country:** copy the script, change the `COUNTRY`
constant and the ISO-3 code passed to `fetchGeoBoundariesGeoJSON` (both
the ADM1 and ADM2 calls), update `canonicalProvince()` to your country's
official province names, and point the output at
`data/<country>/facilities.csv`. Confirm the country reaches ADM2 in
`SUPPORTED_COUNTRIES` (`server/services/geoBoundariesService.ts`) — most
do; a few top out at ADM1, in which case provinces are the lowest
auto-derivable level.

## Step 2 — Seed the tenant

`server/migrations/010-seed-south-africa.ts` upserts the tenant and its
settings (currency, map centre/zoom, admin-level labels, default EPI
schedule id, demographic ratios, population sources), then loads the
region → provinces → districts → facilities from the CSV. It is
**idempotent**: re-running refreshes tenant settings and skips rows that
already exist (by tenant + code, and tenant + HMIS code).

```bash
tsx server/migrations/010-seed-south-africa.ts
```

The GIS FID and coordinate source from the source file are preserved in
`facilities.external_ids` (`gis_fid`, `coordinate_source`).

**To onboard a different country:** copy the migration, then adjust:

- The tenant block: `code`, `name`, `countryCode`, and `settings`
  (currency/symbol, languages, `mapCenter`/`mapZoom`, `adminLevelLabels`,
  `epiSchedule`, `fiscalYearStart`, `demographics`).
- `provinceCode()` — map the country's official province/region names to
  short stable codes (≤3 chars leaves room for district codes).
- The CSV path.

District codes are `varchar(10)`; the migration derives
`<PROV>-<slug>` and auto-dedupes on collision (several metros share a
slug), so you don't have to hand-maintain district codes.

## Step 3 — Boundaries for the map (optional but recommended)

The seed gives you the data hierarchy. To draw province/district
boundaries on the maps, a national admin fetches them once from
**Boundary Manager → Fetch from GeoBoundaries API** (ADM1 and ADM2), or
uploads custom GeoJSON. See `docs/USER_GUIDE.md` §10.

## Notes & gotchas

- An ADM2 polygon can straddle a provincial border, so the count of
  distinct `(province, district)` pairs can exceed the number of ADM2
  shapes. That's expected and harmless — the district name is still
  correct; it's just associated with the facility's source-declared
  province.
- The source has no catchment-population column, so the seed does not
  create `population_data` rows. Load population separately (census
  import or WorldPop) once the tenant is live.
- Re-run safety: both scripts can be run repeatedly without creating
  duplicates.
