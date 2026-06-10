#!/usr/bin/env bash
#
# optimize-population-rasters.sh
# -----------------------------------------------------------------------------
# WorldPop gridded population GeoTIFFs ship at 100m resolution. For a large
# country (e.g. Zambia) that file is ~63 MB, which exceeds the hosting edge
# proxy's response budget and fails to stream to the browser as a hard
# "HTTP Error 500". The map only needs a coarse density heatmap, so we
# downsample each "*_100m_*.tif" to ~1km ("*_1km_*.tif"), which is a few MB and
# streams reliably while caching cheaply for offline use.
#
# Downsampling uses GDAL's `gdalwarp -r average`, which averages only the valid
# (non-nodata) source cells inside each coarse cell — preserving the population
# density scale that drives the color ramp. Output is DEFLATE + floating-point
# predictor compressed.
#
# GDAL is not a permanent project dependency; this script pulls it on demand via
# `nix-shell -p gdal`. Run it whenever a new country's 100m raster is added.
#
# Usage:
#   bash scripts/optimize-population-rasters.sh [RESOURCES_DIR]
# Defaults RESOURCES_DIR to ./Resources
set -euo pipefail

RES_DIR="${1:-Resources}"

if [ ! -d "$RES_DIR" ]; then
  echo "Resources directory not found: $RES_DIR" >&2
  exit 1
fi

run_warp() {
  shopt -s nullglob
  local found=0
  for in in "$RES_DIR"/*_100m_*.tif "$RES_DIR"/*_100m_*.tiff; do
    found=1
    local out="${in/_100m_/_1km_}"
    echo ">> $(basename "$in") -> $(basename "$out")"
    gdalwarp -overwrite \
      -tr 0.0083333333 0.0083333333 \
      -r average \
      -co COMPRESS=DEFLATE -co PREDICTOR=3 -co ZLEVEL=9 -co TILED=YES \
      "$in" "$out"
    ls -la "$out"
  done
  if [ "$found" -eq 0 ]; then
    echo "No '*_100m_*.tif' rasters found in $RES_DIR — nothing to do."
  fi
}

export -f run_warp
export RES_DIR

if command -v gdalwarp >/dev/null 2>&1; then
  run_warp
else
  nix-shell -p gdal --run "bash -c run_warp"
fi

echo "Done."
