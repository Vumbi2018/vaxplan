import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

let connString = process.env.DATABASE_URL;
if (
  (connString.includes("neon.tech") || connString.includes("supabase.co") || connString.includes("upstash.io")) &&
  !connString.includes("sslmode=")
) {
  connString += connString.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connString,
  },
});
