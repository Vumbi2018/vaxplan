import { db } from "../server/db";
import { clients } from "@shared/schema";
import { inArray } from "drizzle-orm";

async function run() {
  try {
    const names = [
      "Demo Agnes Mbowe",
      "Demo Hope Daka",
      "Demo Linda Zulu",
      "Demo Kofi Sakala",
      "Demo Grace Chanda",
      "Demo Joseph Mbowe",
      "Demo Amina Nyirenda"
    ];
    console.log("Checking target client records:", names);

    const foundClients = await db.select().from(clients).where(inArray(clients.name, names));
    console.log(`Found ${foundClients.length} clients:`);
    for (const c of foundClients) {
      console.log(`  - Client: "${c.name}" (ID: ${c.id}, villageId: ${c.villageId}, facilityId: ${c.facilityId})`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
