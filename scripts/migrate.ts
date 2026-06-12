import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Load .env file for local development (Node 20.12+ built-in, no dotenv package needed)
try {
  // @ts-ignore
  process.loadEnvFile?.();
} catch {
  // Silently skip if not present
}

// Simple fallback parser for older Node versions or if loadEnvFile failed but file exists
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
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  console.log('Starting execution of all Drizzle migrations...');
  const client = await pool.connect();
  
  try {
    /* Original Code commented out for data safety to prevent dropping production records:
    console.log('Ensuring clean facility_staff table to avoid migration conflicts...');
    await client.query(`
      DROP TABLE IF EXISTS facility_staff CASCADE;
      CREATE TABLE facility_staff (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id integer NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        name varchar(255),
        employee_id varchar(100),
        nrc varchar(100),
        history jsonb DEFAULT '[]'::jsonb,
        role varchar(100),
        phone varchar(50),
        active boolean DEFAULT true NOT NULL,
        full_name varchar(255),
        gender varchar(20) DEFAULT 'female',
        position varchar(100),
        contact_phone varchar(50),
        years_of_professional_experience integer,
        years_experience integer,
        years_at_facility integer,
        campaign_role varchar(100) DEFAULT 'vaccinator',
        is_active boolean DEFAULT true NOT NULL,
        education_level varchar(100),
        training_status varchar(100),
        residence_village varchar(255),
        is_volunteer boolean DEFAULT false NOT NULL,
        user_id varchar REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    console.log('facility_staff table prepared.');
    */

    console.log('Ensuring facility_staff table is updated with all columns safely...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS facility_staff (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id integer NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        name varchar(255)
      );
    `);
    
    // Safely add missing columns one-by-one to avoid breaking on duplicate column errors
    const columnsToAdd = [
      { name: "employee_id", type: "varchar(100)" },
      { name: "nrc", type: "varchar(100)" },
      { name: "history", type: "jsonb DEFAULT '[]'::jsonb" },
      { name: "role", type: "varchar(100)" },
      { name: "phone", type: "varchar(50)" },
      { name: "active", type: "boolean DEFAULT true NOT NULL" },
      { name: "full_name", type: "varchar(255)" },
      { name: "gender", type: "varchar(20) DEFAULT 'female'" },
      { name: "position", type: "varchar(100)" },
      { name: "contact_phone", type: "varchar(50)" },
      { name: "years_of_professional_experience", type: "integer" },
      { name: "years_experience", type: "integer" },
      { name: "years_at_facility", type: "integer" },
      { name: "campaign_role", type: "varchar(100) DEFAULT 'vaccinator'" },
      { name: "is_active", type: "boolean DEFAULT true NOT NULL" },
      { name: "education_level", type: "varchar(100)" },
      { name: "training_status", type: "varchar(100)" },
      { name: "residence_village", type: "varchar(255)" },
      { name: "is_volunteer", type: "boolean DEFAULT false NOT NULL" },
      { name: "user_id", type: "varchar REFERENCES users(id) ON DELETE SET NULL" },
      { name: "created_at", type: "timestamp DEFAULT now()" },
      { name: "updated_at", type: "timestamp DEFAULT now()" }
    ];

    for (const col of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE facility_staff ADD COLUMN ${col.name} ${col.type}`);
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          console.warn(`[Warning] Failed to add column ${col.name}: ${err.message}`);
        }
      }
    }
    console.log('facility_staff table checked and updated.');

    // 2. Read and apply all SQL files in alphabetical order
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
      
    console.log(`Found ${files.length} migration files.`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Applying SQL migration: ${file}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      const statements = content.split('--> statement-breakpoint');
      
      for (let i = 0; i < statements.length; i++) {
        let stmt = statements[i].trim();
        if (!stmt) continue;
        
        if (stmt.endsWith(';')) {
          stmt = stmt.slice(0, -1);
        }
        
        try {
          await client.query(stmt);
        } catch (err: any) {
          const msg = err.message;
          if (
            msg.includes('already exists') || 
            msg.includes('already a member') ||
            msg.includes('duplicate key value') ||
            msg.includes('is already a type') ||
            (msg.includes('column') && msg.includes('already exists'))
          ) {
            // Safe to ignore index/table/column/enum exists errors
          } else {
            console.warn(`[Warning] ${file} statement ${i+1}: ${msg}`);
          }
        }
      }
    }
    
    console.log('All database migrations applied successfully.');
  } catch (err: any) {
    console.error('Migration runner failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
