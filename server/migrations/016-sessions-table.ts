import { db } from "../db";
import { sql } from "drizzle-orm";

export async function applySessionsTable(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`,
  ];
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[migration] sessions table ensured`);
    } catch (err: any) {
      console.error(`[migration] sessions table warning: ${err.message}`);
    }
  }
}
