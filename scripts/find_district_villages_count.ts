import { db } from "../server/db";
import { villages, districts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia
    const counts = await db
      .select({
        districtId: villages.districtId,
        districtName: districts.name,
        count: sql<number>`count(*)::int`
      })
      .from(villages)
      .innerJoin(districts, eq(villages.districtId, districts.id))
      .where(eq(villages.tenantId, tenantId))
      .groupBy(villages.districtId, districts.name)
      .orderBy(sql`count(*) DESC`);

    console.log("Villages counts by district (top 20):");
    for (const row of counts.slice(0, 20)) {
      console.log(`  - District: "${row.districtName}" (ID: ${row.districtId}) | Count: ${row.count}`);
    }

    const matching = counts.filter(c => c.count === 244);
    if (matching.length > 0) {
      console.log("\nMatching districts with exactly 244 villages:");
      for (const m of matching) {
        console.log(`  - District: "${m.districtName}" (ID: ${m.districtId})`);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
