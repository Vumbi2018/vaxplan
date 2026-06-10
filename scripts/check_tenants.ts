import { db } from "../server/db";
import { tenants, provinces, districts, facilities, users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  try {
    console.log("=== Tenant Diagnostic ===");
    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants in database:`);
    
    for (const t of allTenants) {
      // Get counts of provinces, districts, facilities for this tenant
      const [provCount] = await db.select({ count: sql<number>`count(*)` }).from(provinces).where(eq(provinces.tenantId, t.id));
      const [distCount] = await db.select({ count: sql<number>`count(*)` }).from(districts).where(eq(districts.tenantId, t.id));
      const [facCount] = await db.select({ count: sql<number>`count(*)` }).from(facilities).where(eq(facilities.tenantId, t.id));
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.tenantId, t.id));
      
      console.log(`- Tenant [${t.code}]: ${t.name} (ID: ${t.id}, Status: ${t.status})`);
      console.log(`  Provinces: ${provCount.count} | Districts: ${distCount.count} | Facilities: ${facCount.count} | Users: ${userCount.count}`);
    }
    
  } catch (err: any) {
    console.error("Diagnostic failed:", err.message);
  }
  process.exit(0);
}

run();
