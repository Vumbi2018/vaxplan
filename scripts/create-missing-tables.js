import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Creating missing tables (supervision_visits and page_views)...');
  const client = await pool.connect();
  
  try {
    const createPageViewsSql = `
      CREATE TABLE IF NOT EXISTS "page_views" (
        "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "tenant_id" varchar REFERENCES "tenants"("id") ON DELETE CASCADE,
        "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "path" varchar(300) NOT NULL,
        "ip_address" varchar(100),
        "country" varchar(120),
        "region" varchar(120),
        "city" varchar(120),
        "latitude" numeric(10, 6),
        "longitude" numeric(10, 6),
        "user_agent" varchar(400),
        "created_at" timestamp with time zone DEFAULT now(),
        "last_seen_at" timestamp with time zone
      );
      CREATE INDEX IF NOT EXISTS "idx_page_views_tenant_created" ON "page_views" ("tenant_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_page_views_tenant_user" ON "page_views" ("tenant_id", "user_id");
      CREATE INDEX IF NOT EXISTS "idx_page_views_tenant_last_seen" ON "page_views" ("tenant_id", "last_seen_at");
    `;
    
    const createSupervisionVisitsSql = `
      CREATE TABLE IF NOT EXISTS "supervision_visits" (
        "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "facility_id" integer NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
        "microplan_id" integer REFERENCES "microplans"("id") ON DELETE SET NULL,
        "session_plan_id" integer REFERENCES "session_plans"("id") ON DELETE SET NULL,
        "scheduled_date" timestamp NOT NULL,
        "conducted_date" timestamp,
        "supervisor_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "supervisor_name" varchar(255),
        "visit_type" varchar(40) NOT NULL DEFAULT 'routine',
        "status" varchar(20) NOT NULL DEFAULT 'scheduled',
        "template_id" integer,
        "checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
        "score" integer,
        "gps_latitude" numeric(10, 6),
        "gps_longitude" numeric(10, 6),
        "findings" text,
        "follow_up_actions" text,
        "next_visit_date" timestamp,
        "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    
    console.log('Creating page_views...');
    await client.query(createPageViewsSql);
    
    console.log('Creating supervision_visits...');
    await client.query(createSupervisionVisitsSql);
    
    console.log('Missing tables created successfully!');
  } catch (err) {
    console.error('Error creating missing tables:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
