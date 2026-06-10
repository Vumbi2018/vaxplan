import { db } from "../db";
import { sql } from "drizzle-orm";

export async function applyOutreachColumns(): Promise<void> {
  const statements = [
    `ALTER TABLE villages ADD COLUMN IF NOT EXISTS outreach_latitude decimal(10, 7)`,
    `ALTER TABLE villages ADD COLUMN IF NOT EXISTS outreach_longitude decimal(10, 7)`,
    `ALTER TABLE villages ADD COLUMN IF NOT EXISTS outreach_post_name varchar(255)`
  ];
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[migration] Executed statement: ${stmt}`);
    } catch (err: any) {
      console.error(`[migration] Failed statement: ${stmt} - ${err.message}`);
    }
  }
}
