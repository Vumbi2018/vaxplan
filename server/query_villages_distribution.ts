import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT tenant_id, COUNT(*), MIN(code), MAX(code), MIN(name), MAX(name)
    FROM villages
    GROUP BY tenant_id;
  `);
  console.log("Villages Distribution:", JSON.stringify(result.rows, null, 2));

  // Also print the tenant name for each tenant ID:
  const tenantsResult = await db.execute(sql`
    SELECT id, name, code FROM tenants;
  `);
  console.log("Tenants:", JSON.stringify(tenantsResult.rows, null, 2));
}

main().catch(console.error);
