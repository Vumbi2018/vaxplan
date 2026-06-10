import { db } from "../server/db";
import { clients } from "@shared/schema";

async function run() {
  try {
    const all = await db.select().from(clients);
    console.log(`Total clients in DB: ${all.length}`);
    for (const c of all) {
      console.log(`  - Name: "${c.name}" | ID: ${c.id} | villageId: ${c.villageId} | facilityId: ${c.facilityId}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
