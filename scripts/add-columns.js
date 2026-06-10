import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Adding missing cvx_code and who_atc_code columns to vaccine_configurations table...');
  const client = await pool.connect();
  
  try {
    const addColumnsSql = `
      ALTER TABLE "vaccine_configurations" ADD COLUMN IF NOT EXISTS "cvx_code" varchar(16);
      ALTER TABLE "vaccine_configurations" ADD COLUMN IF NOT EXISTS "who_atc_code" varchar(16);
    `;
    
    await client.query(addColumnsSql);
    console.log('Columns added successfully!');
  } catch (err) {
    console.error('Error adding columns:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
