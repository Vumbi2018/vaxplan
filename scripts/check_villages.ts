import { db } from "../server/db";
import { villages, districts, provinces, facilities } from "@shared/schema";
import { inArray, eq } from "drizzle-orm";

async function run() {
  try {
    const targetVillageIds = [108278, 108279, 108280, 108281, 108282];
    console.log("Checking target village IDs:", targetVillageIds);

    const foundVillages = await db.select().from(villages).where(inArray(villages.id, targetVillageIds));
    console.log(`Found ${foundVillages.length} of the target villages:`);
    for (const v of foundVillages) {
      console.log(`  - Village: "${v.name}" (ID: ${v.id}, districtId: ${v.districtId}, assignedFacilityId: ${v.assignedFacilityId})`);
      
      const [facility] = await db.select().from(facilities).where(eq(facilities.id, v.assignedFacilityId || 0));
      if (facility) {
        console.log(`    Facility: "${facility.name}" (ID: ${facility.id}, districtId: ${facility.districtId})`);
      } else {
        console.log(`    Facility: NOT FOUND for ID: ${v.assignedFacilityId}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
