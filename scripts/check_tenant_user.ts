import { db } from "../server/db";
import { tenants, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const allTenants = await db.select().from(tenants);
    console.log("Seeded Tenants:");
    for (const t of allTenants) {
      console.log(`Tenant: "${t.name}" | ID: ${t.id} | Code: ${t.code}`);
    }

    const [u] = await db.select().from(users).where(eq(users.email, "lawrencemukombo2@gmail.com"));
    if (u) {
      console.log(`\nUser: ${u.email} | tenantId: ${u.tenantId}`);
      const [t] = await db.select().from(tenants).where(eq(tenants.id, u.tenantId || ""));
      if (t) {
        console.log(`User's Tenant: Name "${t.name}" | Code: ${t.code}`);
      } else {
        console.log("User's Tenant NOT FOUND in tenants table!");
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
