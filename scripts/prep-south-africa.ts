/**
 * South Africa (ZAF) data prep — Task #266
 *
 * Reads the attached "Sub-Saharan public health facilities" CSV, filters to the
 * South Africa subset, derives a district (Admin2) for every facility via a
 * point-in-polygon spatial join against GeoBoundaries ADM2 (District
 * Municipalities), and writes the aligned per-country file the seed migration
 * consumes:  data/south_africa/facilities.csv
 *
 * To keep the admin hierarchy internally consistent, BOTH province (ADM1) and
 * district (ADM2) are derived from the SAME GeoBoundaries geometry via the
 * facility coordinates — the source's own Admin1 column is only used as a
 * fallback label when a facility cannot be located (no coordinates, or a point
 * outside every polygon). Deriving them independently from source-Admin1 +
 * spatial-join produced impossible pairings (e.g. a North West district shown
 * under Free State), so we never mix the two. Unlocatable facilities are
 * bucketed into a visible "Unassigned — <Province>" district so nothing is
 * silently dropped.
 *
 * Run with:  tsx scripts/prep-south-africa.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { booleanPointInPolygon, bbox, centroid } from "@turf/turf";
import { fetchGeoBoundariesGeoJSON } from "../server/services/geoBoundariesService";

const COUNTRY = "South Africa";

// ── Lightweight CSV parser (handles quoted fields), mirrors the seed scripts ──
function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      lines.push(cur);
      cur = "";
    } else if (ch !== "\r") {
      cur += ch;
    }
  }
  if (cur.length) lines.push(cur);

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (c === "," && !q) {
        out.push(field);
        field = "";
      } else {
        field += c;
      }
    }
    out.push(field);
    return out.map((f) => f.trim());
  };

  const headers = splitLine(lines[0]);
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cells = splitLine(l);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
    });
}

function csvEscape(v: string): string {
  if (v == null) return "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toNum(v: string): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function findSourceCsv(): string {
  const dir = join(process.cwd(), "attached_assets");
  const match = readdirSync(dir).find(
    (f) => /^Sub-Saharan_public_health_facilities_.*\.csv$/i.test(f),
  );
  if (!match) {
    throw new Error(
      "Could not find Sub-Saharan_public_health_facilities_*.csv in attached_assets/",
    );
  }
  return join(dir, match);
}

function shapeNameOf(props: Record<string, any>): string {
  return (
    props.shapeName ||
    props.shapeName_1 ||
    props.ADM2_EN ||
    props.ADM1_EN ||
    props.NAME_2 ||
    props.NAME_1 ||
    props.name ||
    "Unknown"
  );
}

// Canonicalise GeoBoundaries ADM1 spelling to the official province names the
// seed migration's provinceCode() map keys on.
function canonicalProvince(name: string): string {
  const key = name.trim().toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, string> = {
    easterncape: "Eastern Cape",
    freestate: "Free State",
    gauteng: "Gauteng",
    kwazulunatal: "KwaZulu-Natal",
    limpopo: "Limpopo",
    mpumalanga: "Mpumalanga",
    northwest: "North West",
    northerncape: "Northern Cape",
    notherncape: "Northern Cape", // GeoBoundaries ADM1 carries this typo
    westerncape: "Western Cape",
  };
  return map[key] || name.trim();
}

// A polygon prepared with a bounding box for fast point rejection.
interface NamedPoly {
  name: string;
  feature: GeoJSON.Feature;
  bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

function buildPolys(features: any[]): NamedPoly[] {
  return features.map((f) => ({
    name: shapeNameOf(f.properties || {}),
    feature: f as unknown as GeoJSON.Feature,
    bbox: bbox(f as any) as [number, number, number, number],
  }));
}

// Return the polygon containing the point (lon/lat), or null.
function polyAt(lon: number, lat: number, polys: NamedPoly[]): NamedPoly | null {
  const pt: [number, number] = [lon, lat];
  for (const p of polys) {
    const [minX, minY, maxX, maxY] = p.bbox;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    if (booleanPointInPolygon(pt, p.feature as any)) return p;
  }
  return null;
}

async function run() {
  console.log("=== South Africa data prep ===\n");

  // 1. Load + filter source to South Africa.
  const srcPath = findSourceCsv();
  const allRows = parseCsv(readFileSync(srcPath, "utf8"));
  const saRows = allRows.filter((r) => (r.Country || "").trim() === COUNTRY);
  console.log(`Source: ${srcPath}`);
  console.log(`South Africa rows: ${saRows.length} (of ${allRows.length})\n`);

  // 2. Fetch ADM1 (province) and ADM2 (district) polygons from GeoBoundaries.
  //    Province and district are both derived from this geometry so the pair is
  //    always internally consistent.
  console.log("Fetching GeoBoundaries ZAF ADM1 (Provinces)…");
  const adm1 = await fetchGeoBoundariesGeoJSON("ZAF", 1);
  console.log(`  ${adm1.featureCount} province polygons (${adm1.meta.boundaryName}, ${adm1.meta.boundaryYearRepresented})`);
  console.log("Fetching GeoBoundaries ZAF ADM2 (District Municipalities)…");
  const adm2 = await fetchGeoBoundariesGeoJSON("ZAF", 2);
  console.log(`  ${adm2.featureCount} district polygons (${adm2.meta.boundaryName}, ${adm2.meta.boundaryYearRepresented})\n`);

  const provincePolys = buildPolys(adm1.geojson.features as any[]);
  const districtPolys = buildPolys(adm2.geojson.features as any[]);

  // 3. Spatial join: derive both province (ADM1) and district (ADM2) from the
  //    facility coordinates.
  const out: Record<string, string>[] = [];
  let located = 0;
  let unassigned = 0;
  let noCoords = 0;

  for (const r of saRows) {
    const sourceProvince = (r.Admin1 || "").trim() || "Unknown";
    let lat = toNum(r.Lat);
    let lon = toNum(r.Long);
    // Treat 0/0 and blanks as missing (15 rows in the SA subset).
    if (lat === 0 && lon === 0) {
      lat = null;
      lon = null;
    }

    let province = "";
    let district = "";
    if (lat !== null && lon !== null) {
      const distHit = polyAt(lon, lat, districtPolys);
      let provHit = polyAt(lon, lat, provincePolys);
      // If the point sits in a district but (due to boundary gaps) no province
      // polygon, recover the province from the district polygon's centroid so
      // province and district stay consistent.
      if (distHit && !provHit) {
        const c = centroid(distHit.feature as any).geometry.coordinates as [number, number];
        provHit = polyAt(c[0], c[1], provincePolys);
      }
      if (distHit) {
        district = distHit.name;
        located++;
      } else {
        unassigned++;
      }
      if (provHit) province = canonicalProvince(provHit.name);
    } else {
      noCoords++;
    }

    // Fall back to the source's own province label only when geometry can't
    // place the facility.
    if (!province) province = canonicalProvince(sourceProvince);
    if (!district) district = `Unassigned — ${province}`;

    out.push({
      province,
      district,
      name: (r.Facility_n || "").trim(),
      facility_type: (r.Facility_t || "").trim(),
      ownership: (r.Ownership || "").trim(),
      latitude: lat !== null ? String(lat) : "",
      longitude: lon !== null ? String(lon) : "",
      ll_source: (r.LL_source || "").trim(),
      fid: (r.FID || "").trim(),
    });
  }

  console.log("Spatial join result:");
  console.log(`  located to a district : ${located}`);
  console.log(`  point outside ADM2    : ${unassigned} (bucketed Unassigned)`);
  console.log(`  no coordinates        : ${noCoords} (bucketed Unassigned)`);
  console.log(`  total written         : ${out.length}\n`);

  // 4. Write the aligned per-country CSV.
  const headers = [
    "province",
    "district",
    "name",
    "facility_type",
    "ownership",
    "latitude",
    "longitude",
    "ll_source",
    "fid",
  ];
  const lines = [headers.join(",")];
  for (const row of out) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  const outDir = join(process.cwd(), "data", "south_africa");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "facilities.csv");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${out.length} rows → ${outPath}`);

  const distinctDistricts = new Set(out.map((r) => r.district)).size;
  const distinctProvinces = new Set(out.map((r) => r.province)).size;
  console.log(`Provinces: ${distinctProvinces} | Districts (incl. Unassigned): ${distinctDistricts}`);
  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Prep failed:", err);
  process.exit(1);
});
