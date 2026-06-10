/**
 * Streams a WorldPop 100m GeoTIFF (Float32) into the `population_grids` table for
 * a given tenant. Each above-threshold pixel becomes one row whose GeoJSON
 * Polygon describes the cell footprint; the PostGIS trigger on the table fills
 * in the matching `geometry` column used by the settlement detection engine.
 *
 * Designed to be reusable across tenants (PNG, ZMB, SSD, ...). Reads the raster
 * tile-by-tile so the full image is never materialised in memory, and inserts
 * rows in batched multi-row INSERTs for throughput.
 */
// NOTE: geotiff is an optional CLI-only dependency installed in node_modules but lacks
// official @types. The @ts-ignore below suppresses TS7016 (implicit any) at the import.
// Install with: npm install geotiff
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fromFile } from 'geotiff';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoTIFFImage = any;
import { pool } from '../server/db';

export interface IngestWorldPopOptions {
  tenantId: string;
  rasterPath: string;
  /** ISO-ish prefix used to namespace `raster_cell` ids (e.g. "png"). */
  cellPrefix: string;
  /**
   * Skip pixels whose population value is below this threshold. Defaults to
   * 10 — keeps the row count tractable (hundreds of thousands rather than
   * millions) while preserving every cell that could matter for missing-
   * settlement detection (engine default is 50).
   */
  minPopulation?: number;
  /** Rows per multi-row INSERT. Default 500. */
  batchSize?: number;
  /** Fraction of population that is under-5. Default 0.16. */
  under5Fraction?: number;
  /** If true (default), delete the tenant's existing population_grids first. */
  truncateExisting?: boolean;
  /** Optional progress callback fired roughly every `progressEvery` tiles. */
  onProgress?: (info: {
    tilesDone: number;
    tilesTotal: number;
    rowsInserted: number;
  }) => void;
  progressEvery?: number;
}

function classifyDensity(pop: number): string {
  if (pop >= 500) return 'Extreme';
  if (pop >= 200) return 'High';
  if (pop >= 50) return 'Medium';
  if (pop >= 10) return 'Low';
  return 'Scattered';
}

interface PendingRow {
  populationTotal: number;
  under5: number;
  geojson: string;
  rasterCell: string;
  density: string;
}

async function flushBatch(
  tenantId: string,
  rows: PendingRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const cols = 6;
  const valuePlaceholders: string[] = [];
  const params: unknown[] = [];
  for (let i = 0; i < rows.length; i++) {
    const base = i * cols;
    valuePlaceholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::jsonb, $${base + 5}, $${base + 6})`,
    );
    const r = rows[i];
    params.push(
      tenantId,
      r.populationTotal,
      r.under5,
      r.geojson,
      r.rasterCell,
      r.density,
    );
  }
  const sql = `INSERT INTO population_grids
      (tenant_id, population_total, under5_population, geojson, raster_cell, density_classification)
    VALUES ${valuePlaceholders.join(',')}`;
  await pool.query(sql, params);
}

export async function ingestWorldPopRaster(
  opts: IngestWorldPopOptions,
): Promise<{ rowsInserted: number; cellsScanned: number; cellsAboveThreshold: number }> {
  const {
    tenantId,
    rasterPath,
    cellPrefix,
    minPopulation = 10,
    batchSize = 500,
    under5Fraction = 0.16,
    truncateExisting = true,
    onProgress,
    progressEvery = 50,
  } = opts;

  const tiff = await fromFile(rasterPath);
  const image: GeoTIFFImage = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resYsigned] = image.getResolution();
  const cellW = resX;
  const cellH = Math.abs(resYsigned); // resYsigned is typically negative
  const tileW = image.getTileWidth();
  const tileH = image.getTileHeight();

  const fd = image.getFileDirectory();
  const nodataRaw = fd?.GDAL_NODATA;
  const nodata = nodataRaw !== undefined ? parseFloat(nodataRaw) : undefined;

  const tilesAcross = Math.ceil(width / tileW);
  const tilesDown = Math.ceil(height / tileH);
  const tilesTotal = tilesAcross * tilesDown;

  console.log(
    `[worldpop] ${rasterPath}: ${width}x${height} px, tile ${tileW}x${tileH} -> ${tilesTotal} tiles`,
  );
  console.log(
    `[worldpop] origin=(${originX}, ${originY}) cell=${cellW.toFixed(8)}x${cellH.toFixed(8)} deg, nodata=${nodata}`,
  );

  if (truncateExisting) {
    console.log(`[worldpop] Clearing existing population_grids for tenant ${tenantId}...`);
    await pool.query('DELETE FROM population_grids WHERE tenant_id = $1', [tenantId]);
  }

  const batch: PendingRow[] = [];
  let cellsScanned = 0;
  let cellsAboveThreshold = 0;
  let rowsInserted = 0;
  let tilesDone = 0;

  for (let ty = 0; ty < tilesDown; ty++) {
    const y0 = ty * tileH;
    const y1 = Math.min(y0 + tileH, height);
    for (let tx = 0; tx < tilesAcross; tx++) {
      const x0 = tx * tileW;
      const x1 = Math.min(x0 + tileW, width);

      const winW = x1 - x0;
      const winH = y1 - y0;

      const rasters = (await image.readRasters({
        window: [x0, y0, x1, y1],
        samples: [0],
      })) as unknown as Array<Float32Array | Uint16Array | Int16Array | Uint8Array | Int8Array | Float64Array>;
      const band = rasters[0];

      for (let py = 0; py < winH; py++) {
        const row = y0 + py;
        const latTop = originY + row * resYsigned;
        const latBottom = latTop + resYsigned;
        for (let px = 0; px < winW; px++) {
          cellsScanned++;
          const v = band[py * winW + px];
          if (!Number.isFinite(v)) continue;
          if (nodata !== undefined && v === nodata) continue;
          if (v < minPopulation) continue;

          const col = x0 + px;
          const lngLeft = originX + col * cellW;
          const lngRight = lngLeft + cellW;
          const pop = Math.round(v);
          if (pop < minPopulation) continue;

          cellsAboveThreshold++;

          const polygon = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lngLeft, latBottom],
                  [lngRight, latBottom],
                  [lngRight, latTop],
                  [lngLeft, latTop],
                  [lngLeft, latBottom],
                ],
              ],
            },
            properties: {
              population: pop,
              cell_index: `${cellPrefix}_${col}_${row}`,
              source: 'worldpop_2026_100m',
            },
          };

          batch.push({
            populationTotal: pop,
            under5: Math.round(pop * under5Fraction),
            geojson: JSON.stringify(polygon),
            rasterCell: `${cellPrefix}_${col}_${row}`,
            density: classifyDensity(pop),
          });

          if (batch.length >= batchSize) {
            await flushBatch(tenantId, batch);
            rowsInserted += batch.length;
            batch.length = 0;
          }
        }
      }

      tilesDone++;
      if (onProgress && tilesDone % progressEvery === 0) {
        onProgress({ tilesDone, tilesTotal, rowsInserted: rowsInserted + batch.length });
      }
    }
  }

  if (batch.length > 0) {
    await flushBatch(tenantId, batch);
    rowsInserted += batch.length;
    batch.length = 0;
  }

  console.log(
    `[worldpop] Done. tiles=${tilesDone}/${tilesTotal} scanned=${cellsScanned} aboveThreshold=${cellsAboveThreshold} inserted=${rowsInserted}`,
  );

  return { rowsInserted, cellsScanned, cellsAboveThreshold };
}

/**
 * CLI:
 *   tsx scripts/ingestWorldPopRaster.ts <tenantCode> [rasterPath] [minPopulation]
 *
 * Resolves the tenant id from `tenants.code` (e.g. PNG / ZMB / SSD), defaults
 * the raster path to `Resources/<iso>_pop_2026_CN_100m_R2025A_v1.tif`, then
 * streams it into `population_grids`. Useful for refreshing a single tenant
 * without re-running the full settlement-intelligence seed script.
 */
async function runCli() {
  const [, , tenantCode, rasterArg, minPopArg] = process.argv;
  if (!tenantCode) {
    console.error('Usage: tsx scripts/ingestWorldPopRaster.ts <tenantCode> [rasterPath] [minPopulation]');
    process.exit(1);
  }
  const { db } = await import('../server/db');
  const { tenants } = await import('../shared/schema');
  const { eq } = await import('drizzle-orm');
  const code = tenantCode.toUpperCase();
  const rows = await db.select().from(tenants).where(eq(tenants.code, code)).limit(1);
  if (rows.length === 0) {
    console.error(`Tenant with code '${code}' not found.`);
    process.exit(1);
  }
  const tenantId = rows[0].id;
  const rasterPath =
    rasterArg ?? `Resources/${code.toLowerCase()}_pop_2026_CN_100m_R2025A_v1.tif`;
  const result = await ingestWorldPopRaster({
    tenantId,
    rasterPath,
    cellPrefix: code.toLowerCase(),
    minPopulation: minPopArg ? parseInt(minPopArg, 10) : 25,
    onProgress: ({ tilesDone, tilesTotal, rowsInserted }) =>
      console.log(`[worldpop:${code.toLowerCase()}] tile ${tilesDone}/${tilesTotal}, rows=${rowsInserted}`),
  });
  console.log(`Done: inserted ${result.rowsInserted} cells for ${code} (${tenantId}).`);
  await pool.end();
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1] ?? '';
    return entry.includes('ingestWorldPopRaster');
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
