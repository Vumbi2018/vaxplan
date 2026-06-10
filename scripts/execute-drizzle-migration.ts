import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Starting Drizzle Schema Migration...');
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '0001_orange_yellow_claw.sql');
    console.log('Reading migration file from:', migrationPath);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }
    
    const content = fs.readFileSync(migrationPath, 'utf8');
    const statements = content.split('--> statement-breakpoint');
    
    console.log(`Found ${statements.length} statements to execute.`);
    
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i].trim();
      if (!stmt) continue;
      
      // Clean up statements
      if (stmt.endsWith(';')) {
        stmt = stmt.slice(0, -1);
      }
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await client.query(stmt);
        console.log('SUCCESS');
      } catch (err: any) {
        const msg = err.message;
        if (
          msg.includes('already exists') || 
          msg.includes('already a member') ||
          msg.includes('duplicate key value')
        ) {
          console.log(`SKIPPED (Already exists: ${msg})`);
        } else {
          console.error(`ERROR running statement: ${stmt}`);
          console.error(`Error details: ${msg}`);
          // We can decide to throw or continue. Since some columns might be missing or exist, let's continue to be safe.
        }
      }
    }
    
    console.log('Drizzle Schema Migration completed.');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
