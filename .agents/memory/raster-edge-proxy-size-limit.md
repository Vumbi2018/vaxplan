---
name: GeoTIFF raster edge-proxy size limit
description: Why large population rasters 500 in production and how the serve endpoint must stay safe
---

# Large population rasters fail at the hosting edge proxy

WorldPop 100m gridded-population GeoTIFFs are huge for big countries (Zambia
`zmb_pop_*_100m_*.tif` ≈ 63 MB; SSD ≈ 20 MB; PNG ≈ 14 MB). The binary serve at
`GET /api/resources/geotiff` for the ~63 MB file dies at the Replit edge proxy
and the client receives a hard **HTTP 500** (the binary serve never even shows
in production app logs — only `/list` does). Smaller files stream fine.

**Rule:** the map only needs a coarse density heatmap, so ship an optimized
~1km raster (`*_1km_*.tif`, a few MB) and serve THAT by default.
- Generate with GDAL `gdalwarp -r average` (nodata-aware mean preserves the
  density color-ramp scale) + `-co COMPRESS=DEFLATE -co PREDICTOR=3`. GDAL is
  not a permanent dep — pull on demand via `nix-shell -p gdal`. Reusable script:
  `scripts/optimize-population-rasters.sh`.
- Do NOT try to downsample in pure JS via geotiff.js + worker Pool: decoding a
  ~293M-pixel band and transferring tiles across worker boundaries took >5 min
  per file and is impractical. geotiff.js writer is uint8-only anyway.
- The `/api/resources/geotiff` auto-resolution must PREFER `*_1km_*` over
  `*_100m_*`. `/list` must hide a country's heavy 100m pop file when a 1km
  version exists (group by ISO3 token via `^([a-z]{3})_pop_` regex, not a blind
  3-char slice) so the manual picker can't re-trigger the 500.

**Why:** background `nohup`/`nix-shell` jobs spawned from a bash tool call can be
reaped between turns — the first parallel run left Zambia's output truncated
("buffer error" on re-read). Use `setsid ... </dev/null` and poll for an
explicit done-marker within the SAME tool call for the long file.

**Security:** the `?file=` explicit-selection path must be locked to basename
only (no path components), `.tif/.tiff` extension, and membership in
`readdirSync(Resources)` — `join()+!includes("..")` alone is insufficient
hygiene for an authenticated arbitrary-file read.
