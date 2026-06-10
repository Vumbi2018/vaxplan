import { db } from "../server/db";
import { clients, villages, districts, provinces, facilities } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    console.log("Checking client geography chain in database...");

    const allClients = await db.select().from(clients).limit(10);
    console.log(`Fetched ${allClients.length} sample clients.`);

    for (const client of allClients) {
      console.log(`\n--- Client: ${client.name} (ID: ${client.id}) ---`);
      console.log(`  villageId: ${client.villageId}`);
      console.log(`  facilityId: ${client.facilityId}`);

      // Resolve village
      const [village] = await db.select().from(villages).where(eq(villages.id, client.villageId));
      if (village) {
        console.log(`  [OK] Village: "${village.name}" (districtId: ${village.districtId}, assignedFacilityId: ${village.assignedFacilityId})`);
        
        // Resolve district
        const [district] = await db.select().from(districts).where(eq(districts.id, village.districtId));
        if (district) {
          console.log(`    [OK] District: "${district.name}" (provinceId: ${district.provinceId})`);
          
          // Resolve province
          const [province] = await db.select().from(provinces).where(eq(provinces.id, district.provinceId));
          if (province) {
            console.log(`      [OK] Province: "${province.name}"`);
          } else {
            console.log(`      [FAIL] Province not found for ID: ${district.provinceId}`);
          }
        } else {
          console.log(`    [FAIL] District not found for ID: ${village.districtId}`);
        }
      } else {
        console.log(`  [FAIL] Village not found for ID: ${client.villageId}`);
      }

      // Resolve facility
      const [facility] = await db.select().from(facilities).where(eq(facilities.id, client.facilityId));
      if (facility) {
        console.log(`  [OK] Facility: "${facility.name}" (districtId: ${facility.districtId})`);
        
        // Resolve facility's district
        const [facDistrict] = await db.select().from(districts).where(eq(districts.id, facility.districtId));
        if (facDistrict) {
          console.log(`    [OK] Facility District: "${facDistrict.name}" (provinceId: ${facDistrict.provinceId})`);
          
          // Resolve facility's province
          const [facProvince] = await db.select().from(provinces).where(eq(provinces.id, facDistrict.provinceId));
          if (facProvince) {
            console.log(`      [OK] Facility Province: "${facProvince.name}"`);
          } else {
            console.log(`      [FAIL] Facility Province not found for ID: ${facDistrict.provinceId}`);
          }
        } else {
          console.log(`    [FAIL] Facility District not found for ID: ${facility.districtId}`);
        }
      } else {
        console.log(`  [FAIL] Facility not found for ID: ${client.facilityId}`);
      }
    }
  } catch (err) {
    console.error("Error running script:", err);
  }
  process.exit(0);
}

run();
