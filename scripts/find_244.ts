import { db } from "../server/db";
import { villages, districts, facilities } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia

    // Check by district
    const dst = await db
      .select({ id: districts.id, name: districts.name, count: sql<number>`count(*)::int` })
      .from(villages)
      .innerJoin(districts, eq(villages.districtId, districts.id))
      .where(eq(villages.tenantId, tenantId))
      .groupBy(districts.id, districts.name);
    
    console.log("Districts with 244 villages:");
    for (const d of dst) {
      if (d.count === 244) console.log(`  - ${d.name} (${d.id})`);
    }

    // Check by facility
    const fac = await db
      .select({ id: facilities.id, name: facilities.name, count: sql<number>`count(*)::int` })
      .from(villages)
      .innerJoin(facilities, eq(villages.assignedFacilityId, facilities.id))
      .where(eq(villages.tenantId, tenantId))
      .groupBy(facilities.id, facilities.name);
    
    console.log("Facilities with 244 villages:");
    for (const f of fac) {
      if (f.count === 244) console.log(`  - ${f.name} (${f.id})`);
    }

    // Is there any other query?
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
