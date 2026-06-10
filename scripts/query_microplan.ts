import { db } from "../server/db";
import { microplans, facilities } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  try {
    const rows = await db.select({
      id: microplans.id,
      tenantId: microplans.tenantId,
      facilityId: microplans.facilityId,
      name: microplans.name
    }).from(microplans).where(eq(microplans.facilityId, 23885));
    
    console.log(`Found ${rows.length} microplans referencing facility 23885:`);
    for (const r of rows) {
      console.log(r);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
  process.exit(0);
}

run();
