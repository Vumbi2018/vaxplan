import { db } from "../server/db";
import { facilities, tenants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const [fac] = await db.select().from(facilities).where(eq(facilities.id, 23885));
    if (fac) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, fac.tenantId));
      console.log(`Facility 23885:`);
      console.log(`  Name: ${fac.name}`);
      console.log(`  Tenant: ${tenant ? tenant.code : "Unknown"} (${fac.tenantId})`);
    } else {
      console.log("Facility 23885 not found.");
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
  process.exit(0);
}

run();
