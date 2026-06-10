import { db } from "../server/db";
import { provinces, districts, facilities, clients, villages } from "@shared/schema";
import { eq } from "drizzle-orm";

// Re-implement frontend geoHierarchy logic
interface GeoMaps {
  provinceMap?: Map<number, any>;
  districtMap?: Map<number, any>;
  villageMap?: Map<number, any>;
  facilityMap?: Map<number, any>;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getRecordHierarchy(record: any, maps: GeoMaps) {
  const r = record || {};
  const { provinceMap, districtMap, villageMap, facilityMap } = maps;

  let provinceId = toNum(r.provinceId);
  let districtId = toNum(r.districtId);

  if (!districtId) {
    const villageId = toNum(r.villageId);
    if (villageId && villageMap) {
      const v = villageMap.get(villageId);
      if (v) {
        districtId = toNum((v as any).districtId);
      }
    }
  }

  if (!districtId) {
    const facilityId = toNum(r.facilityId) ?? toNum(r.assignedFacilityId);
    if (facilityId && facilityMap) {
      const f = facilityMap.get(facilityId);
      if (f) {
        districtId = toNum((f as any).districtId);
      }
    }
  }

  if (!provinceId && districtId && districtMap) {
    const d = districtMap.get(districtId);
    if (d) {
      provinceId = toNum((d as any).provinceId);
    }
  }

  const provinceName =
    provinceId && provinceMap ? provinceMap.get(provinceId)?.name ?? "—" : "—";
  const districtName =
    districtId && districtMap ? districtMap.get(districtId)?.name ?? "—" : "—";

  return { provinceId, provinceName, districtId, districtName };
}

function buildGeoMaps(args: {
  provinces?: any[];
  districts?: any[];
  villages?: any[];
  facilities?: any[];
}) {
  const provinceMap = new Map<number, any>();
  (args.provinces ?? []).forEach((p) => provinceMap.set(Number(p.id), p));
  const districtMap = new Map<number, any>();
  (args.districts ?? []).forEach((d) => districtMap.set(Number(d.id), d));
  const villageMap = new Map<number, any>();
  (args.villages ?? []).forEach((v) => villageMap.set(Number(v.id), v));
  const facilityMap = new Map<number, any>();
  (args.facilities ?? []).forEach((f) => facilityMap.set(Number(f.id), f));
  return { provinceMap, districtMap, villageMap, facilityMap };
}

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia

    // Fetch collections exactly like the API does
    const provs = await db.select().from(provinces).where(eq(provinces.tenantId, tenantId));
    const dists = await db.select().from(districts).where(eq(districts.tenantId, tenantId));
    const facs = await db.select().from(facilities).where(eq(facilities.tenantId, tenantId));
    const vils = await db.select().from(villages).where(eq(villages.tenantId, tenantId));
    const clis = await db.select().from(clients).where(eq(clients.tenantId, tenantId));

    console.log(`Fetched from DB:`);
    console.log(`  Provinces: ${provs.length}`);
    console.log(`  Districts: ${dists.length}`);
    console.log(`  Facilities: ${facs.length}`);
    console.log(`  Villages: ${vils.length}`);
    console.log(`  Clients: ${clis.length}`);

    // Let's run buildGeoMaps with ALL villages
    const geoMapsAll = buildGeoMaps({ provinces: provs, districts: dists, villages: vils, facilities: facs });
    
    console.log("\n--- Resolving with ALL villages loaded ---");
    for (const client of clis.slice(0, 5)) {
      const h = getRecordHierarchy(client, geoMapsAll);
      console.log(`Client: ${client.name} | VillageID: ${client.villageId} | FacilityID: ${client.facilityId}`);
      console.log(`  Resolved Province: "${h.provinceName}" (ID: ${h.provinceId})`);
      console.log(`  Resolved District: "${h.districtName}" (ID: ${h.districtId})`);
    }

    // Now let's run buildGeoMaps with ONLY villages from Chamakubi Health Post (facilityId: 20505)
    const vilsChamakubi = vils.filter(v => v.assignedFacilityId === 20505);
    const geoMapsChamakubi = buildGeoMaps({ provinces: provs, districts: dists, villages: vilsChamakubi, facilities: facs });

    console.log("\n--- Resolving with ONLY Chamakubi villages loaded ---");
    for (const client of clis.slice(0, 5)) {
      const h = getRecordHierarchy(client, geoMapsChamakubi);
      console.log(`Client: ${client.name} | VillageID: ${client.villageId} | FacilityID: ${client.facilityId}`);
      console.log(`  Resolved Province: "${h.provinceName}" (ID: ${h.provinceId})`);
      console.log(`  Resolved District: "${h.districtName}" (ID: ${h.districtId})`);
    }

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
