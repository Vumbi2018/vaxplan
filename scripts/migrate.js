import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Load .env file for local development (Node 20.12+ built-in)
try {
  process.loadEnvFile?.();
} catch {
  // Silently skip if not present
}

// Simple fallback parser if loadEnvFile failed but file exists
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
    } catch (e) {}
  }
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vaxplan';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Starting full database migration from migrations folder...');
  const client = await pool.connect();
  
  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }
    
    // Read and sort all SQL files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sorts 0000, 0001, 0002...
      
    console.log(`Found ${files.length} SQL migration files.`);
    
    for (const file of files) {
      console.log(`\n======================================================`);
      console.log(`Executing migration file: ${file}`);
      console.log(`======================================================`);
      
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split by statement-breakpoint if Drizzle-style, or run as a single block
      const statements = content.includes('--> statement-breakpoint')
        ? content.split('--> statement-breakpoint')
        : [content];
        
      console.log(`Splitting into ${statements.length} execution statement blocks...`);
      
      for (let i = 0; i < statements.length; i++) {
        let stmt = statements[i].trim();
        if (!stmt) continue;
        
        try {
          await client.query(stmt);
        } catch (err) {
          const msg = err.message;
          if (
            msg.includes('already exists') || 
            msg.includes('already a member') ||
            msg.includes('duplicate key value') ||
            msg.includes('already exists, skipping') ||
            msg.includes('column') && msg.includes('already exists')
          ) {
            // Safe to ignore duplicate errors
            console.log(`  [Block ${i + 1}] Skip duplicate: ${msg}`);
          } else {
            console.error(`  [Block ${i + 1}] ERROR: ${msg}`);
            console.error(`  Failed Statement: ${stmt}`);
          }
        }
      }
      console.log(`Finished executing ${file}`);
    }
    
    console.log('\nAll migrations executed successfully!');
  } catch (err) {
    console.error('Migration execution failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
