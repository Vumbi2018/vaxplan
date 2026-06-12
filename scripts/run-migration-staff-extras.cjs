/**
 * run-migration-staff-extras.cjs
 * Adds nrc, employee_id and history columns to facility_staff if they don't exist.
 * Safe to re-run.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        connectionString = match[1].trim().replace(/(^['"]|['"]$)/g, "");
      }
    }
  } catch (err) {
    // Ignore error
  }
}

if (!connectionString) {
  connectionString = "postgresql://postgres:postgres@localhost:5432/vaxplan";
}

const p = new Pool({ connectionString });

const SQL = `
ALTER TABLE facility_staff
  ADD COLUMN IF NOT EXISTS nrc         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS history     JSONB DEFAULT '[]';
`;

p.query(SQL)
  .then(() => {
    console.log("✅ facility_staff columns added: nrc, employee_id, history");
    p.end();
  })
  .catch(e => {
    console.error("❌ Migration failed:", e.message);
    p.end();
    process.exit(1);
  });
