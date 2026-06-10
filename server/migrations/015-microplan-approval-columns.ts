import { db } from "../db";
import { sql } from "drizzle-orm";

export async function applyMicroplanApprovalColumns(): Promise<void> {
  const statements = [
    `ALTER TABLE microplans ADD COLUMN IF NOT EXISTS submitted_at timestamptz`,
    `ALTER TABLE microplans ADD COLUMN IF NOT EXISTS auto_approve_at timestamptz`,
    `ALTER TABLE microplans ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz`,
    `ALTER TABLE microplans ADD COLUMN IF NOT EXISTS district_edit_reason text`,
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
