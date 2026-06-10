import { db } from "../server/db";
import { villages } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06"; // Zambia
    const chibomboVillages = await db
      .select({ id: villages.id })
      .from(villages)
      .where(
        and(
          eq(villages.tenantId, tenantId),
          eq(villages.districtId, 1213)
        )
      );
    console.log(`Villages in Chibombo District (ID 1213): ${chibomboVillages.length}`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
