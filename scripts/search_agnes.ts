import { db } from "../server/db";
import { clients } from "@shared/schema";
import { like } from "drizzle-orm";

async function run() {
  try {
    const found = await db.select().from(clients).where(like(clients.name, "%Agnes%"));
    console.log(`Found ${found.length} clients with Agnes in name:`);
    for (const c of found) {
      console.log(`  - Name: "${c.name}" | ID: ${c.id} | villageId: ${c.villageId} | facilityId: ${c.facilityId} | tenantId: ${c.tenantId}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
