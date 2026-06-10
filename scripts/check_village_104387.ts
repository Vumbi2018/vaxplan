import { db } from "../server/db";
import { villages } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const [v] = await db.select().from(villages).where(eq(villages.id, 104387));
    if (v) {
      console.log(`Village 104387 Name: "${v.name}" | District ID: ${v.districtId} | Facility ID: ${v.assignedFacilityId} | Tenant ID: ${v.tenantId}`);
    } else {
      console.log("Village 104387 not found.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
