import fs from "fs";
import path from "path";
import https from "https";
import readline from "readline";
import { execSync } from "child_process";
import { db } from "../server/db";
import { eq, and } from "drizzle-orm";
import { tenants, settlementsMaster } from "../shared/schema";

// ============================ CONFIGURATION ============================
// Specify where you want the final dataset saved
const OUTPUT_CSV = "C:/Users/Public/global_multi_source_communities.csv";

// The 8 target countries from your list
const TARGET_COUNTRIES = ["ZM", "ZA", "PG", "SS", "ZW", "MW", "UG", "MG"];

const COUNTRY_TO_TENANT_MAP: Record<string, string> = {
  ZM: "ZMB",
  ZA: "ZAF",
  PG: "PNG",
  SS: "SSD",
  ZW: "ZWE",
  MW: "MWI",
  UG: "UGA",
  MG: "MDG",
};
// =======================================================================

interface RecordRow {
  Location_Name: string;
  Country: string;
  Classification: string;
  Latitude: number;
  Longitude: number;
  Source: string;
  Alternate_Names: string;
}

// Download a file from URL to local file path
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Decompress zip file using system commands (cross-platform)
function decompressZip(zipPath: string, destDir: string): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const isWindows = process.platform === "win32";
  if (isWindows) {
    // Windows PowerShell native Expand-Archive
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "ignore" }
    );
  } else {
    // macOS/Linux native unzip
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: "ignore" });
  }
}

// Read geonames text file line-by-line using readline stream
async function parseGeonamesFile(filePath: string, countryCode: string): Promise<RecordRow[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const records: RecordRow[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = line.split("\t");
    if (fields.length < 15) continue;

    // Feature class 'P' (populated places: cities, towns, villages, etc.)
    if (fields[6] === "P") {
      const lat = parseFloat(fields[4]);
      const lng = parseFloat(fields[5]);
      if (isNaN(lat) || isNaN(lng)) continue;

      records.append ? null : records.push({
        Location_Name: fields[1],
        Country: countryCode,
        Classification: fields[7] || "PPL",
        Latitude: lat,
        Longitude: lng,
        Source: "Official Gazetteer",
        Alternate_Names: fields[3] && fields[3].trim() ? fields[3] : "None Mined",
      });
    }
  }
  return records;
}

async function run() {
  const args = process.argv.slice(2);
  const shouldSeedDb = args.includes("--db");

  console.log("Initiating global offline matrix extractor...");
  const tempDir = path.join(process.cwd(), "scratch/geonames_temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const masterRecords: RecordRow[] = [];

  for (const country of TARGET_COUNTRIES) {
    const zipPath = path.join(tempDir, `${country}.zip`);
    const extractDir = path.join(tempDir, country);
    const txtPath = path.join(extractDir, `${country}.txt`);

    console.log(`[${country}] Downloading compressed spatial archive...`);
    const url = `https://download.geonames.org/export/dump/${country}.zip`;
    
    try {
      await downloadFile(url, zipPath);
      console.log(`[${country}] Extracting zip archive...`);
      decompressZip(zipPath, extractDir);

      if (fs.existsSync(txtPath)) {
        console.log(`[${country}] Parsing features...`);
        const countryData = await parseGeonamesFile(txtPath, country);
        console.log(`-> Successfully extracted ${countryData.length} micro-locations.`);
        masterRecords.push(...countryData);

        if (shouldSeedDb) {
          const tenantCode = COUNTRY_TO_TENANT_MAP[country];
          if (tenantCode) {
            console.log(`[${country}] Seeding to database under tenant: ${tenantCode}...`);
            const [tenant] = await db.select().from(tenants).where(eq(tenants.code, tenantCode)).limit(1);
            if (tenant) {
              // Delete old GeoNames entries for this tenant to allow clean updates
              await db
                .delete(settlementsMaster)
                .where(and(eq(settlementsMaster.tenantId, tenant.id), eq(settlementsMaster.source, "geonames")));

              // Batch insert settlements
              const batchSize = 1000;
              for (let i = 0; i < countryData.length; i += batchSize) {
                const batch = countryData.slice(i, i + batchSize);
                await db.insert(settlementsMaster).values(
                  batch.map((item) => ({
                    tenantId: tenant.id,
                    name: item.Location_Name,
                    placeType: item.Classification.toLowerCase(),
                    latitude: item.Latitude.toString(),
                    longitude: item.Longitude.toString(),
                    geojson: {
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: [item.Longitude, item.Latitude],
                      },
                      properties: {
                        name: item.Location_Name,
                        place_type: item.Classification,
                        alternate_names: item.Alternate_Names,
                      },
                    },
                    source: "geonames",
                    sourceConfidence: "0.95",
                    validationStatus: "approved",
                  }))
                );
              }
              console.log(`[${country}] Database seed complete for tenant ${tenantCode} (${countryData.length} records).`);
            } else {
              console.warn(`[${country}] Tenant code ${tenantCode} not found in database. Skipping DB seed.`);
            }
          } else {
            console.warn(`[${country}] No tenant mapping found. Skipping DB seed.`);
          }
        }
      } else {
        console.error(`[!] Extracted text file not found at: ${txtPath}`);
      }
    } catch (err: any) {
      console.error(`[!] Processing failed for ${country}: ${err.message}`);
    }
  }

  // Cleanup temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Temporary directory cleaned up.");
  } catch (cleanupErr: any) {
    console.warn(`Warning: failed to clean up temp files: ${cleanupErr.message}`);
  }

  // Write CSV output
  if (masterRecords.length > 0) {
    const csvDir = path.dirname(OUTPUT_CSV);
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    const headers = ["Location_Name", "Country", "Classification", "Latitude", "Longitude", "Source", "Alternate_Names"];
    const csvWriter = fs.createWriteStream(OUTPUT_CSV, { encoding: "utf8" });
    csvWriter.write(headers.join(",") + "\n");

    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    for (const rec of masterRecords) {
      const line = [
        escapeCSV(rec.Location_Name),
        escapeCSV(rec.Country),
        escapeCSV(rec.Classification),
        rec.Latitude,
        rec.Longitude,
        escapeCSV(rec.Source),
        escapeCSV(rec.Alternate_Names),
      ].join(",");
      csvWriter.write(line + "\n");
    }
    csvWriter.end();

    const successMsg = `SUCCESS! Extracted ${masterRecords.length} unique multi-country locations directly to: ${OUTPUT_CSV}`;
    console.log("\n" + "=".repeat(75));
    console.log(successMsg);
    console.log("=".repeat(75));
  } else {
    console.log("[!] Execution finished, but dataset compilation returned empty.");
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal execution error:", err);
    process.exit(1);
  });
