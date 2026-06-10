import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import {
  tenants,
  regions,
  provinces,
  districts,
  facilities,
  villages,
} from "../shared/schema";

interface CSVRow {
  region: string;
  province: string;
  district: string;
  normalized_name: string;
  eNHIS_code: string;
  latitude: string;
  longitude: string;
  agency_name: string;
  hf_type: string;
  operational_status: string;
}

function normalizeRegion(region: string): string {
  if (!region) return "";
  const normalized = region.toLowerCase().trim();
  if (normalized === "southern") return "Southern";
  if (normalized === "highlands") return "Highlands";
  if (normalized === "islands") return "Islands";
  if (normalized === "momase") return "Momase";
  return region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
}

function normalizeProvince(province: string): string {
  if (!province) return "";
  return province.toLowerCase().trim().split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
}

function normalizeDistrict(district: string): string {
  if (!district) return "";
  return district.toLowerCase().trim().split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function generateCode(name: string, prefix: string = ""): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  return prefix ? `${prefix}-${cleaned}` : cleaned;
}

async function importFromCSV() {
  console.log("Starting import from CSV...");
  
  const csvPath = path.join(process.cwd(), "attached_assets/Full_list_to_clean_1765623823590_1779865327920.csv");
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }
  
  const workbook = XLSX.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: CSVRow[] = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Loaded ${rawData.length} rows from CSV`);
  
  const uniqueRegions = new Map<string, { name: string; code: string }>();
  const uniqueProvinces = new Map<string, { name: string; code: string; region: string }>();
  const uniqueDistricts = new Map<string, { name: string; code: string; province: string }>();
  const facilitiesData: Array<{
    name: string;
    hmisCode: string;
    facilityType: string;
    agencyName: string;
    operationalStatus: string;
    district: string;
    latitude: string;
    longitude: string;
  }> = [];
  const villagesData: Array<{
    name: string;
    district: string;
    latitude: string;
    longitude: string;
  }> = [];
  
  for (const row of rawData) {
    const region = normalizeRegion(row.region);
    let province = normalizeProvince(row.province);
    let district = normalizeDistrict(row.district);

    // Clean up "Rigo District" spelling variations and prevent Milne Bay typo mapping
    if (district.toLowerCase().trim() === "rigo district") {
      district = "Rigo";
    }
    if (district.toLowerCase().trim() === "rigo" && province.toLowerCase().trim() === "milne bay") {
      province = "Central";
    }
    
    if (region && !uniqueRegions.has(region)) {
      uniqueRegions.set(region, {
        name: region,
        code: generateCode(region),
      });
    }
    
    const provinceKey = `${region}-${province}`;
    if (province && region && !uniqueProvinces.has(provinceKey)) {
      uniqueProvinces.set(provinceKey, {
        name: province,
        code: generateCode(province, generateCode(region).slice(0, 3)),
        region: region,
      });
    }
    
    if (district && province && !uniqueDistricts.has(district)) {
      uniqueDistricts.set(district, {
        name: district,
        code: generateCode(district),
        province: province,
      });
    }
    
    const name = row.normalized_name?.trim();
    if (!name || !district) continue;
    
    const hfType = String(row.hf_type || "").trim();
    if (hfType) {
      const hmisCode = String(row.eNHIS_code || "").trim();
      if (hmisCode) {
        facilitiesData.push({
          name: name,
          hmisCode: hmisCode,
          facilityType: hfType,
          agencyName: String(row.agency_name || "").trim(),
          operationalStatus: String(row.operational_status || "").trim(),
          district: district,
          latitude: String(row.latitude || ""),
          longitude: String(row.longitude || ""),
        });
      }
    } else {
      villagesData.push({
        name: name,
        district: district,
        latitude: String(row.latitude || ""),
        longitude: String(row.longitude || ""),
      });
    }
  }
  
  if (!uniqueRegions.has("Unknown")) {
    uniqueRegions.set("Unknown", { name: "Unknown", code: "UNK" });
  }
  if (!uniqueProvinces.has("Unknown-Unknown")) {
    uniqueProvinces.set("Unknown-Unknown", { name: "Unknown", code: "UNK-UNKN", region: "Unknown" });
  }
  if (!uniqueDistricts.has("Unknown")) {
    uniqueDistricts.set("Unknown", { name: "Unknown", code: "UNKNOWN", province: "Unknown" });
  }
  
  console.log(`Found ${uniqueRegions.size} unique regions`);
  console.log(`Found ${uniqueProvinces.size} unique provinces`);
  console.log(`Found ${uniqueDistricts.size} unique districts`);
  console.log(`Found ${facilitiesData.length} facilities`);
  console.log(`Found ${villagesData.length} communities/villages`);
  
  await db.transaction(async (tx) => {
    console.log("\nClearing existing data...");
    await tx.execute(sql`DELETE FROM client_vaccinations`);
    await tx.execute(sql`DELETE FROM clients`);
    await tx.execute(sql`DELETE FROM stock_transactions`);
    await tx.execute(sql`DELETE FROM monthly_reports`);
    await tx.execute(sql`DELETE FROM imported_coverage`);
    await tx.execute(sql`DELETE FROM microplans`);
    await tx.execute(sql`DELETE FROM population_data`);
    await tx.execute(sql`DELETE FROM session_villages`);
    await tx.execute(sql`DELETE FROM vaccine_requirements`);
    await tx.execute(sql`DELETE FROM budget_items`);
    await tx.execute(sql`DELETE FROM session_plans`);
    await tx.execute(sql`DELETE FROM mobilization_activities`);
    await tx.execute(sql`DELETE FROM htr_scores`);
    await tx.execute(sql`DELETE FROM villages`);
    await tx.execute(sql`DELETE FROM facilities`);
    await tx.execute(sql`DELETE FROM llgs`);
    await tx.execute(sql`DELETE FROM districts`);
    await tx.execute(sql`DELETE FROM provinces`);
    await tx.execute(sql`DELETE FROM regions`);
    console.log("Cleared existing data.");
    
    // Resolve PNG tenant to populate its facilities and boundary assets
    const [pngTenant] = await tx.select().from(tenants).where(eq(tenants.code, "PNG"));
    const tenantId = pngTenant?.id;
    if (!tenantId) {
      throw new Error("Papua New Guinea tenant not found in database. Please run country onboarding first.");
    }
    console.log(`Resolved active PNG tenant ID: ${tenantId}`);
    
    console.log("\nInserting regions...");
    const regionValues = Array.from(uniqueRegions.values());
    const insertedRegions = await tx
      .insert(regions)
      .values(regionValues.map(r => ({ name: r.name, code: r.code, tenantId })))
      .returning();
    console.log(`Inserted ${insertedRegions.length} regions`);
    
    const regionMap: Record<string, number> = {};
    for (const r of insertedRegions) {
      regionMap[r.name] = r.id;
    }
    
    console.log("\nInserting provinces...");
    const provinceValues = Array.from(uniqueProvinces.values()).filter(p => regionMap[p.region]);
    const insertedProvinces = await tx
      .insert(provinces)
      .values(provinceValues.map(p => ({
        name: p.name,
        code: p.code,
        regionId: regionMap[p.region],
        tenantId,
      })))
      .returning();
    console.log(`Inserted ${insertedProvinces.length} provinces`);
    
    const provinceMap: Record<string, number> = {};
    for (const p of insertedProvinces) {
      provinceMap[p.name] = p.id;
    }
    
    console.log("\nInserting districts...");
    const districtValues = Array.from(uniqueDistricts.values()).filter(d => provinceMap[d.province]);
    
    const seenDistrictCodes = new Map<string, number>();
    const uniqueDistrictValues = districtValues.map(d => {
      const baseCode = d.code;
      const count = seenDistrictCodes.get(baseCode) || 0;
      if (count > 0) {
        d.code = `${baseCode}${count}`;
      }
      seenDistrictCodes.set(baseCode, count + 1);
      return d;
    });
    
    const insertedDistricts = await tx
      .insert(districts)
      .values(uniqueDistrictValues.map(d => ({
        name: d.name,
        code: d.code,
        provinceId: provinceMap[d.province],
        tenantId,
      })))
      .returning();
    console.log(`Inserted ${insertedDistricts.length} districts`);
    
    const districtMap: Record<string, number> = {};
    for (const d of insertedDistricts) {
      districtMap[d.name] = d.id;
    }
    
    console.log("\nInserting facilities...");
    let facilitiesWithUnknownDistrict = 0;
    const mappedFacilities = facilitiesData.map(f => {
      if (!districtMap[f.district]) {
        facilitiesWithUnknownDistrict++;
        return { ...f, district: "Unknown" };
      }
      return f;
    });
    if (facilitiesWithUnknownDistrict > 0) {
      console.log(`  ${facilitiesWithUnknownDistrict} facilities assigned to 'Unknown' district`);
    }
    
    const seenHmisCodes = new Set<string>();
    const uniqueFacilities = mappedFacilities.filter(f => {
      if (seenHmisCodes.has(f.hmisCode)) {
        return false;
      }
      seenHmisCodes.add(f.hmisCode);
      return true;
    });
    
    let insertedFacilitiesCount = 0;
    const batchSize = 100;
    const allInsertedFacilities: Array<{ id: number; districtId: number | null; latitude: string | null; longitude: string | null }> = [];
    
    for (let i = 0; i < uniqueFacilities.length; i += batchSize) {
      const batch = uniqueFacilities.slice(i, i + batchSize);
      const inserted = await tx
        .insert(facilities)
        .values(batch.map(f => ({
          name: f.name,
          hmisCode: f.hmisCode,
          facilityType: f.facilityType,
          agencyName: f.agencyName || null,
          operationalStatus: f.operationalStatus || null,
          districtId: districtMap[f.district],
          latitude: f.latitude || null,
          longitude: f.longitude || null,
          tenantId,
        })))
        .returning({
          id: facilities.id,
          districtId: facilities.districtId,
          latitude: facilities.latitude,
          longitude: facilities.longitude,
        });
      
      insertedFacilitiesCount += inserted.length;
      allInsertedFacilities.push(...inserted);
    }
    console.log(`Inserted ${insertedFacilitiesCount} facilities`);

    // Group facilities by district for spatial nearest-neighbor search
    const facilitiesInDistrict = new Map<number, typeof allInsertedFacilities>();
    for (const f of allInsertedFacilities) {
      if (f.districtId) {
        const arr = facilitiesInDistrict.get(f.districtId) ?? [];
        arr.push(f);
        facilitiesInDistrict.set(f.districtId, arr);
      }
    }
    
    console.log("\nInserting villages/communities...");
    let villagesWithUnknownDistrict = 0;
    const mappedVillages = villagesData.map(v => {
      if (!districtMap[v.district]) {
        villagesWithUnknownDistrict++;
        return { ...v, district: "Unknown" };
      }
      return v;
    });
    if (villagesWithUnknownDistrict > 0) {
      console.log(`  ${villagesWithUnknownDistrict} villages assigned to 'Unknown' district`);
    }
    
    let insertedVillagesCount = 0;
    for (let i = 0; i < mappedVillages.length; i += batchSize) {
      const batch = mappedVillages.slice(i, i + batchSize);
      const inserted = await tx
        .insert(villages)
        .values(batch.map((v, idx) => {
          const districtId = districtMap[v.district];
          const districtFacs = facilitiesInDistrict.get(districtId) || [];
          let assignedFacilityId: number | null = null;
          let minDistance = Infinity;
          let distanceVal: string | null = null;

          const vLat = Number(v.latitude);
          const vLng = Number(v.longitude);

          if (vLat && vLng && districtFacs.length > 0) {
            for (const f of districtFacs) {
              if (f.latitude && f.longitude) {
                const dist = getDistance(vLat, vLng, Number(f.latitude), Number(f.longitude));
                if (dist < minDistance) {
                  minDistance = dist;
                  assignedFacilityId = f.id;
                }
              }
            }
          }

          // Fallback to the first facility in the same district if coordinates are missing/zero
          if (!assignedFacilityId && districtFacs.length > 0) {
            assignedFacilityId = districtFacs[0].id;
          }

          if (assignedFacilityId && minDistance !== Infinity) {
            distanceVal = minDistance.toFixed(2);
          }

          return {
            name: v.name,
            code: `COM-${i + idx + 1}`,
            districtId,
            assignedFacilityId,
            latitude: v.latitude || null,
            longitude: v.longitude || null,
            distanceToFacility: distanceVal,
            travelTimeMinutes: distanceVal ? Math.round(minDistance * 12) : null,
            tenantId,
          };
        }))
        .returning();
      insertedVillagesCount += inserted.length;
    }
    console.log(`Inserted ${insertedVillagesCount} villages/communities`);
  });
  
  console.log("\nImport completed successfully!");
}

importFromCSV()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
