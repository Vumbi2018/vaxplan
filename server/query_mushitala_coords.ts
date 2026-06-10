import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT v.name as village_name, v.latitude as village_lat, v.longitude as village_lng,
           f.name as facility_name, f.latitude as facility_lat, f.longitude as facility_lng
    FROM villages v
    JOIN facilities f ON f.id = v.assigned_facility_id
    WHERE f.name ILIKE '%Mushitala%'
    LIMIT 20;
  `);
  console.log("Mushitala Village Coords:", JSON.stringify(result.rows, null, 2));
}

main().catch(console.error);
