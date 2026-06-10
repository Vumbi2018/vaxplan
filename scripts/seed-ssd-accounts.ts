/**
 * seed-ssd-accounts.ts
 *
 * Creates or updates the requested stakeholder accounts under the South Sudan (SSD) tenant
 * with the role 'national_admin'.
 *
 * Run with:
 *   npx tsx --env-file=.env scripts/seed-ssd-accounts.ts
 */

import { db } from "../server/db";
import { users, tenants } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

const SSD_STAKEHOLDERS = [
  {
    email: "bhavan.bhavsar@tatvacare.in",
    password: "Vaxplan-test-2026",
    firstName: "Bhavan",
    lastName: "Bhavsar",
    role: "national_admin" as const,
  },
  {
    email: "pmusanhu@gavi.org",
    password: "vaxplan-test-2026",
    firstName: "Patience",
    lastName: "Musanhu",
    role: "national_admin" as const,
  },
  {
    email: "evansmokaya@googlemail.com",
    password: "vaxplan-test-2026",
    firstName: "Evans",
    lastName: "Mokaya",
    role: "national_admin" as const,
  },
  {
    email: "maleghemis@who.int",
    password: "Testadmin@2026",
    firstName: "Sylvester",
    lastName: "Maleghemi",
    role: "national_admin" as const,
  },
];

async function run() {
  try {
    // 1. Resolve South Sudan tenant ID
    const ssdTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.code, "SSD"))
      .limit(1);

    if (ssdTenant.length === 0) {
      console.error("❌ Error: SSD tenant not found. Make sure baseline migrations have run.");
      process.exit(1);
    }
    const tenantId = ssdTenant[0].id;
    console.log(`Resolved SSD Tenant ID: ${tenantId}`);

    // 2. Upsert each user
    for (const stakeholder of SSD_STAKEHOLDERS) {
      const passwordHash = await hash(stakeholder.password, 12);
      
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, stakeholder.email))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(users)
          .set({
            tenantId,
            firstName: stakeholder.firstName,
            lastName: stakeholder.lastName,
            role: stakeholder.role,
            roles: [stakeholder.role],
            passwordHash,
            isActive: true,
            dataAccessScope: { provinces: [], districts: [], facilities: [] },
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id));
        console.log(`🔄 Updated stakeholder account: ${stakeholder.email}`);
      } else {
        // Insert new user
        await db.insert(users).values({
          tenantId,
          email: stakeholder.email,
          firstName: stakeholder.firstName,
          lastName: stakeholder.lastName,
          role: stakeholder.role,
          roles: [stakeholder.role],
          permissions: [],
          dataAccessScope: { provinces: [], districts: [], facilities: [] },
          passwordHash,
          isActive: true,
        });
        console.log(`➕ Created stakeholder account: ${stakeholder.email}`);
      }
    }
    console.log("🎉 All South Sudan stakeholder accounts successfully processed.");
  } catch (err: any) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
  process.exit(0);
}

run();
