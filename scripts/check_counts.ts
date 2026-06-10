import { db } from "../server/db";
import { tenants, provinces, districts, facilities, users, clients, sessionPlans, populationData } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  try {
    console.log("=== Tenant Operational Counts ===");
    const allTenants = await db.select().from(tenants);
    
    for (const t of allTenants) {
      const [prov] = await db.select({ count: sql<number>`count(*)` }).from(provinces).where(eq(provinces.tenantId, t.id));
      const [dist] = await db.select({ count: sql<number>`count(*)` }).from(districts).where(eq(districts.tenantId, t.id));
      const [fac] = await db.select({ count: sql<number>`count(*)` }).from(facilities).where(eq(facilities.tenantId, t.id));
      const [usr] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.tenantId, t.id));
      const [clt] = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.tenantId, t.id));
      const [sess] = await db.select({ count: sql<number>`count(*)` }).from(sessionPlans).where(eq(sessionPlans.tenantId, t.id));
      const [pop] = await db.select({ count: sql<number>`count(*)` }).from(populationData).where(eq(populationData.tenantId, t.id));
      
      console.log(`\nTenant [${t.code}] - ${t.name}:`);
      console.log(`  Provinces:          ${prov.count}`);
      console.log(`  Districts:          ${dist.count}`);
      console.log(`  Facilities:         ${fac.count}`);
      console.log(`  Users:              ${usr.count}`);
      console.log(`  Clients (Roster):   ${clt.count}`);
      console.log(`  Session Plans:      ${sess.count}`);
      console.log(`  Population Records: ${pop.count}`);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
  process.exit(0);
}

run();
