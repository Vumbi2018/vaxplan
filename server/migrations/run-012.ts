import { db } from "../../server/db.js";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

const migration = readFileSync("./server/migrations/012-campaign-scope-details.sql", "utf8");
async function main() {
  await db.execute(sql.raw(migration));
  console.log("Migration 012 applied OK");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration 012 failed:", err);
  process.exit(1);
});
