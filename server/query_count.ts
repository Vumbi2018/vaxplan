import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT COUNT(*) FROM villages;
  `);
  console.log("Total Villages in DB:", JSON.stringify(result.rows, null, 2));
}

main().catch(console.error);
