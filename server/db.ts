import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon and Supabase require SSL. Automatically append sslmode if missing.
let connString = process.env.DATABASE_URL;
if (
  (connString.includes("neon.tech") || connString.includes("supabase.co") || connString.includes("upstash.io")) &&
  !connString.includes("sslmode=")
) {
  connString += connString.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

export const pool = new Pool({ connectionString: connString });
export const db = drizzle(pool, { schema });
