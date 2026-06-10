/**
 * seed-zambia-demo-accounts.ts
 *
 * Creates three demo accounts for the Zambia (ZMB) tenant:
 *   1. facility.clerk@vaxplan.zm    — role: facility_clerk    (linked to a sample facility)
 *   2. district.officer@vaxplan.zm  — role: district_manager  (linked to a sample district)
 *   3. provincial.official@vaxplan.zm — role: provincial_coordinator (linked to a sample province)
 *
 * All accounts use bcrypt-hashed passwords and sign in via the standard
 * POST /api/auth/login-password endpoint.
 *
 * Run:
 *   npx tsx scripts/seed-zambia-demo-accounts.ts
 *
 * Safe to re-run — uses INSERT … ON CONFLICT DO UPDATE so it won't duplicate rows.
 */

import { pool } from "../server/db";
import { hash } from "bcryptjs";

// ─── Demo Credentials (change after initial setup) ─────────────────────────
const DEMO_ACCOUNTS = [
  {
    email: "facility.clerk@vaxplan.zm",
    password: "FacilityDemo2025!",
    firstName: "Agnes",
    lastName: "Mwila",
    role: "facility_clerk" as const,
    scopeType: "facility" as const,
    description: "Facility Clerk — Solwezi General Hospital",
  },
  {
    email: "district.officer@vaxplan.zm",
    password: "DistrictDemo2025!",
    firstName: "Joseph",
    lastName: "Banda",
    role: "district_manager" as const,
    scopeType: "district" as const,
    description: "District Health Officer — North-Western Province",
  },
  {
    email: "provincial.official@vaxplan.zm",
    password: "ProvinceDemo2025!",
    firstName: "Grace",
    lastName: "Tembo",
    role: "provincial_coordinator" as const,
    scopeType: "province" as const,
    description: "Provincial EPI Coordinator — North-Western Province",
  },
];

async function run() {
  const client = await pool.connect();
  try {
    // 1. Resolve the ZMB tenant
    const tenantRes = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM tenants WHERE code = 'ZMB' LIMIT 1`
    );
    if (tenantRes.rows.length === 0) {
      console.error("❌  No tenant with code ZMB found. Run the Zambia setup first.");
      process.exit(1);
    }
    const tenant = tenantRes.rows[0];
    console.log(`✅  Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Grab a sample facility, district, and province from this tenant
    const facilityRes = await client.query<{ id: number; name: string; district_id: number }>(
      `SELECT f.id, f.name, f.district_id
       FROM facilities f
       WHERE f.tenant_id = $1 AND f.is_active = true
       ORDER BY f.id
       LIMIT 1`,
      [tenant.id]
    );
    const districtRes = await client.query<{ id: number; name: string; province_id: number }>(
      `SELECT d.id, d.name, d.province_id
       FROM districts d
       WHERE d.tenant_id = $1
       ORDER BY d.id
       LIMIT 1`,
      [tenant.id]
    );
    const provinceRes = await client.query<{ id: number; name: string }>(
      `SELECT p.id, p.name FROM provinces p WHERE p.tenant_id = $1 ORDER BY p.id LIMIT 1`,
      [tenant.id]
    );

    const facility = facilityRes.rows[0];
    const district = districtRes.rows[0];
    const province = provinceRes.rows[0];

    console.log(`   Facility: ${facility?.name ?? "none"} (id=${facility?.id})`);
    console.log(`   District: ${district?.name ?? "none"} (id=${district?.id})`);
    console.log(`   Province: ${province?.name ?? "none"} (id=${province?.id})`);

    // 3. Upsert each demo account
    for (const acc of DEMO_ACCOUNTS) {
      const passwordHash = await hash(acc.password, 12);

      let facilityId: number | null = null;
      let districtId: number | null = null;
      let provinceId: number | null = null;
      let dataAccessScope: object = { provinces: [], districts: [], facilities: [] };

      if (acc.scopeType === "facility" && facility) {
        facilityId = facility.id;
        districtId = facility.district_id;
        dataAccessScope = { provinces: [], districts: [], facilities: [facility.id] };
      } else if (acc.scopeType === "district" && district) {
        districtId = district.id;
        provinceId = district.province_id;
        dataAccessScope = { provinces: [], districts: [district.id], facilities: [] };
      } else if (acc.scopeType === "province" && province) {
        provinceId = province.id;
        dataAccessScope = { provinces: [province.id], districts: [], facilities: [] };
      }

      await client.query(
        `INSERT INTO users (
           tenant_id, email, first_name, last_name,
           role, facility_id, district_id, province_id,
           password_hash, is_active, data_access_scope,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4,
           $5::user_role, $6, $7, $8,
           $9, true, $10::jsonb,
           NOW(), NOW()
         )
         ON CONFLICT (email) DO UPDATE SET
           tenant_id        = EXCLUDED.tenant_id,
           first_name       = EXCLUDED.first_name,
           last_name        = EXCLUDED.last_name,
           role             = EXCLUDED.role,
           facility_id      = EXCLUDED.facility_id,
           district_id      = EXCLUDED.district_id,
           province_id      = EXCLUDED.province_id,
           password_hash    = EXCLUDED.password_hash,
           is_active        = true,
           data_access_scope = EXCLUDED.data_access_scope,
           updated_at       = NOW()`,
        [
          tenant.id,
          acc.email,
          acc.firstName,
          acc.lastName,
          acc.role,
          facilityId,
          districtId,
          provinceId,
          passwordHash,
          JSON.stringify(dataAccessScope),
        ]
      );

      console.log(`\n✅  ${acc.description}`);
      console.log(`   📧  Email   : ${acc.email}`);
      console.log(`   🔑  Password: ${acc.password}`);
      console.log(`   🏷️  Role    : ${acc.role}`);
    }

    console.log("\n🎉  All Zambia demo accounts created / updated successfully.");
    console.log("\n─── Login URL ───────────────────────────────────────────────");
    console.log("   https://vaxplan.org/auth  (or http://localhost:5000/auth locally)");
    console.log("──────────────────────────────────────────────────────────────\n");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
