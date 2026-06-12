import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration 019 — New User Roles
 *
 * Adds the implementing partner (facility/district/province/national) roles
 * and the national_manager role to the `user_role` PostgreSQL enum.
 *
 * Uses ALTER TYPE … ADD VALUE IF NOT EXISTS so it is idempotent and safe
 * to run on every boot.  PostgreSQL 9.1+ supports IF NOT EXISTS.
 */
export async function applyNewUserRoles(): Promise<void> {
  const newRoles = [
    "facility_partner",
    "district_partner",
    "provincial_partner",
    "national_partner",
    "national_manager",
  ];

  for (const role of newRoles) {
    try {
      await db.execute(
        sql.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`),
      );
      console.log(`[migration:019] Added enum value '${role}' to user_role.`);
    } catch (err: any) {
      // Likely already exists or the DB doesn't support IF NOT EXISTS — non-fatal.
      console.warn(
        `[migration:019] Could not add role '${role}': ${err?.message ?? err}`,
      );
    }
  }
}
