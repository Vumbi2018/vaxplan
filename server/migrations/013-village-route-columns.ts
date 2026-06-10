import { db } from "../db";
import { sql } from "drizzle-orm";

export async function applyVillageColumns(): Promise<void> {
  const statements = [
    `ALTER TABLE villages ADD COLUMN IF NOT EXISTS accessibility_score varchar(50)`,
    `ALTER TABLE villages ADD COLUMN IF NOT EXISTS referral_route text`
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
