import { db } from "../server/db";
import { clients, facilities, districts, provinces, villages } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const list = await db
      .select()
      .from(clients)
      .where(eq(clients.name, "Lawrence Mukombo"));

    console.log("Client records matching Lawrence Mukombo:", JSON.stringify(list, null, 2));

    if (list.length > 0) {
      const c = list[0];
      const v = await db.select().from(villages).where(eq(villages.id, c.villageId));
      console.log("Village record for client:", JSON.stringify(v, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
