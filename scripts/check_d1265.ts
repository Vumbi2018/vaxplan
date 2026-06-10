import { db } from "../server/db";
import { villages, districts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia
    
    const d1265 = await db
      .select({ id: villages.id })
      .from(villages)
      .where(and(eq(villages.tenantId, tenantId), eq(villages.districtId, 1265)));
    console.log(`Villages in District 1265: ${d1265.length}`);

    const all = await db
      .select({ id: districts.id, name: districts.name })
      .from(districts)
      .where(eq(districts.tenantId, tenantId));
    console.log(`Total districts: ${all.length}`);
    
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
