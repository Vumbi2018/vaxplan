import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Starting PostGIS Migration...');
  const client = await pool.connect();
  try {
    const migrationPath = path.join(process.cwd(), 'server', 'migrations', '005-postgis-settlements.sql');
    console.log('Reading migration file from:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing SQL statements...');
    await client.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
