import { db } from "../server/db";
import { provinces, districts, villages } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia

    const [p] = await db.select().from(provinces).where(eq(provinces.id, 169));
    if (p) {
      console.log(`Province 169 Name: "${p.name}"`);
      const vils = await db
        .select({ id: villages.id })
        .from(villages)
        .innerJoin(districts, eq(villages.districtId, districts.id))
        .where(and(eq(villages.tenantId, tenantId), eq(districts.provinceId, 169)));
      console.log(`Villages count in Province 169: ${vils.length}`);
    } else {
      console.log("Province 169 not found.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
