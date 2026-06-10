import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  // Let's get the tenant ID for PNG first
  const tenantResult = await db.execute(sql`SELECT id FROM tenants WHERE code = 'PNG';`);
  const tenantId = tenantResult.rows[0].id;

  const result = await db.execute(sql`
    SELECT id, name, code, latitude, longitude, assigned_facility_id, district_id
    FROM villages
    WHERE tenant_id = ${tenantId}
    LIMIT 20;
  `);
  console.log("PNG Villages sample:", JSON.stringify(result.rows, null, 2));

  // Let's check how many have coordinates vs null:
  const coordsResult = await db.execute(sql`
    SELECT COUNT(*), COUNT(latitude) as with_coords
    FROM villages
    WHERE tenant_id = ${tenantId};
  `);
  console.log("PNG Coords stats:", JSON.stringify(coordsResult.rows, null, 2));
}

main().catch(console.error);
