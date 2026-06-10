import { db } from "../server/db";
import { villages, districts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia
    
    // Count villages in Central Province (province 223)
    const centralVillages = await db
      .select({ id: villages.id })
      .from(villages)
      .innerJoin(districts, eq(villages.districtId, districts.id))
      .where(
        and(
          eq(villages.tenantId, tenantId),
          eq(districts.provinceId, 223)
        )
      );
    console.log(`Villages in Central Province (ID 223): ${centralVillages.length}`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
