import { db } from "../server/db";
import { tenants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Updating tenant demographics inside settings...");

  // Update PNG tenant
  const pngTenants = await db.select().from(tenants).where(eq(tenants.code, "PNG"));
  if (pngTenants.length > 0) {
    const png = pngTenants[0];
    const settings = (png.settings || {}) as Record<string, any>;
    settings.demographics = {
      births: 0.032,
      under1: 0.030,
      pregnant: 0.032,
      schoolEntry: 0.027,
      schoolExit: 0.022,
    };
    await db.update(tenants)
      .set({ settings })
      .where(eq(tenants.id, png.id));
    console.log("Updated PNG tenant settings with demographics!");
  } else {
    console.log("PNG tenant not found.");
  }

  // Update Zambia tenant
  const zambiaTenants = await db.select().from(tenants).where(eq(tenants.code, "ZMB"));
  if (zambiaTenants.length > 0) {
    const zmb = zambiaTenants[0];
    const settings = (zmb.settings || {}) as Record<string, any>;
    settings.demographics = {
      births: 0.038,
      under1: 0.035,
      pregnant: 0.040,
      schoolEntry: 0.032,
      schoolExit: 0.028,
    };
    await db.update(tenants)
      .set({ settings })
      .where(eq(tenants.id, zmb.id));
    console.log("Updated Zambia tenant settings with demographics!");
  } else {
    console.log("Zambia tenant not found.");
  }

  console.log("All done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to update tenant demographics:", err);
  process.exit(1);
});
