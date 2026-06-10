import { db } from "../server/db";
import { villages, districts, provinces } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia
    const counts = await db
      .select({
        provinceId: districts.provinceId,
        provinceName: provinces.name,
        count: sql<number>`count(*)::int`
      })
      .from(villages)
      .innerJoin(districts, eq(villages.districtId, districts.id))
      .innerJoin(provinces, eq(districts.provinceId, provinces.id))
      .where(eq(villages.tenantId, tenantId))
      .groupBy(districts.provinceId, provinces.name)
      .orderBy(sql`count(*) DESC`);

    console.log("Villages counts by province:");
    for (const row of counts) {
      console.log(`  - Province: "${row.provinceName}" (ID: ${row.provinceId}) | Count: ${row.count}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
