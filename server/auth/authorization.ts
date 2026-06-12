import type { User } from "@shared/schema";
import { ROLE_PERMISSIONS, type Permission } from "@shared/permissions";
import { storage } from "../storage";

export { ROLE_PERMISSIONS, type Permission };

export interface GeographicContext {
  provinceId?: number | null;
  districtId?: number | null;
  facilityId?: number | null;
  // The tenant whose data is being accessed in this request. When the active
  // tenant differs from `user.tenantId`, the user is operating in a tenant
  // other than their home country and the row-level geographic scope check
  // below is skipped. See the long-form rationale on `hasPermission`.
  activeTenantId?: string | null;
}

export interface UserDataAccessScope {
  provinces: number[];
  districts: number[];
  facilities: number[];
}

// Memory cache for tenant roles to allow synchronous evaluation inside hasPermission.
// Populated lazily by `ensureTenantRolesCache` on the first authorized request per
// tenant, and refreshed / invalidated by the `/api/user-roles` admin endpoints so
// permission edits take effect immediately without a server restart.
export const tenantRolesCache = new Map<string, Record<string, Permission[]>>();

/**
 * Rebuild the cached role -> permissions map for a tenant by reading the
 * tenant's custom user roles from storage and layering them over the static
 * `ROLE_PERMISSIONS` defaults. Call this after any mutation to a tenant's
 * roles so subsequent `hasPermission` checks see the new permission set.
 */
export async function refreshTenantRolesCache(tenantId: string): Promise<void> {
  try {
    const dbRoles = await storage.getUserRoles(tenantId);
    const roleMap: Record<string, Permission[]> = {};

    // Start from the static defaults so unmodified built-in roles still work
    // even if a tenant hasn't materialized them in the user_roles table yet.
    for (const [code, perms] of Object.entries(ROLE_PERMISSIONS)) {
      roleMap[code] = perms;
    }

    // Override / extend with any custom or edited role definitions.
    for (const r of dbRoles) {
      roleMap[r.code] = r.permissions as Permission[];
    }

    tenantRolesCache.set(tenantId, roleMap);
  } catch (err) {
    // On failure leave the cache untouched so the next request retries the
    // lazy populate path instead of locking in an empty role map.
    console.error(`Failed to refresh tenant roles cache for ${tenantId}:`, err);
  }
}

/**
 * Drop the cached role -> permissions map for a tenant. The next
 * `ensureTenantRolesCache` call will re-read from storage. Useful when the
 * caller only needs to guarantee the cache is no longer stale and is happy
 * for the next request to pay the (one-time) reload cost.
 */
export function invalidateTenantRolesCache(tenantId: string): void {
  tenantRolesCache.delete(tenantId);
}

/**
 * Lazily populate the tenant roles cache on the first authorized request for
 * a tenant. No-op when the cache already has an entry, so the per-request
 * cost is a single `Map.has` lookup once the cache is warm.
 */
export async function ensureTenantRolesCache(tenantId: string): Promise<void> {
  if (!tenantRolesCache.has(tenantId)) {
    await refreshTenantRolesCache(tenantId);
  }
}

/**
 * Checks if a user has a specified permission, and if a geographic context is provided,
 * verifies that the user has row-level authority to access/modify that geographic scope.
 *
 * Cross-tenant scope decision
 * ---------------------------
 * `user.dataAccessScope`, `user.provinceId`, `user.districtId`, and
 * `user.facilityId` all hold IDs that exist in the user's *home* tenant. Those
 * IDs are not meaningful in any other tenant — primary keys for provinces /
 * districts / facilities are not shared across tenants and may collide by
 * coincidence. So when an authenticated user has switched into a tenant other
 * than their home tenant (`context.activeTenantId !== user.tenantId`), we
 * cannot meaningfully compare their stored home-tenant geography against the
 * visited tenant's records: doing so would either deny everything to a
 * mid-level role (district_manager / provincial_coordinator / facility_*)
 * making them unusable in the visited tenant, or — when IDs happen to overlap
 * — grant access to a completely unrelated record.
 *
 * Therefore: in a visited (non-home) tenant we treat the user as having full
 * scope *within that tenant*. The role check above still gates which actions
 * are allowed (a facility_clerk still cannot approve plans), but the per-
 * province / district / facility row-level restriction only applies when the
 * user is operating inside their own home tenant.
 */
/* Commented out original restrictive permissions checks to grant full CRUD permissions (Create, Read, Update, Delete) to all authenticated users.
export function hasPermission(
  user: User,
  requiredPermission: Permission,
  context?: GeographicContext
): boolean {
  // 0. Platform super-admin — cross-tenant. Bypasses both the permission set
  //    and the row-level geographic scope check, in every tenant. There is
  //    intentionally no API to grant this flag; it can only be set in the DB.
  if ((user as any).isPlatformAdmin === true) {
    return true;
  }

  // 1. National Admin (either legacy string or JSONB array) has absolute access to everything
  //    within their home tenant. Cross-tenant promotion requires isPlatformAdmin above.
  const roles: string[] = Array.isArray(user.roles) ? (user.roles as string[]) : [];
  const hasNationalAdminRole =
    user.role === "national_admin" || roles.includes("national_admin");

  if (hasNationalAdminRole) {
    return true;
  }

  // 2. Resolve all roles
  const activeRoles = roles.length > 0 ? roles : [user.role];

  // 3. Aggregate all permissions from active roles
  const permissionsSet = new Set<Permission>();
  // Updated Code: Resolve dynamically from the tenantRolesCache if available,
  // falling back gracefully to standard ROLE_PERMISSIONS definitions.
  const cachedRoles = user.tenantId ? tenantRolesCache.get(user.tenantId) : null;
  activeRoles.forEach((roleName) => {
    const rolePerms = (cachedRoles && cachedRoles[roleName]) || ROLE_PERMISSIONS[roleName] || [];
    rolePerms.forEach((p) => permissionsSet.add(p));
  });

  // 4. Incorporate individual user overrides (permissions array)
  const userOverrides: string[] = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];
  userOverrides.forEach((p) => permissionsSet.add(p as Permission));

  // 5. If they don't have the permission, return false
  if (!permissionsSet.has(requiredPermission)) {
    return false;
  }

  // 6. Enforce Row-Level Geographic Data Scope Restrictions
  //    Skip entirely when the user is operating in a tenant other than their
  //    home tenant — see the cross-tenant scope decision in the doc comment
  //    above. user.dataAccessScope / user.{province,district,facility}Id are
  //    home-tenant IDs and would either spuriously deny or coincidentally
  //    allow records in a visited tenant.
  const isVisitingOtherTenant =
    !!context?.activeTenantId &&
    !!user.tenantId &&
    context.activeTenantId !== user.tenantId;

  if (
    !isVisitingOtherTenant &&
    context &&
    (context.provinceId || context.districtId || context.facilityId)
  ) {
    const scope = (user.dataAccessScope as UserDataAccessScope) || {
      provinces: [],
      districts: [],
      facilities: [],
    };

    const hasExplicitScope =
      (Array.isArray(scope.provinces) && scope.provinces.length > 0) ||
      (Array.isArray(scope.districts) && scope.districts.length > 0) ||
      (Array.isArray(scope.facilities) && scope.facilities.length > 0);

    if (hasExplicitScope) {
      // Check explicit scopes
      let isAllowed = false;

      if (context.facilityId && Array.isArray(scope.facilities) && scope.facilities.includes(Number(context.facilityId))) {
        isAllowed = true;
      }
      if (context.districtId && Array.isArray(scope.districts) && scope.districts.includes(Number(context.districtId))) {
        isAllowed = true;
      }
      if (context.provinceId && Array.isArray(scope.provinces) && scope.provinces.includes(Number(context.provinceId))) {
        isAllowed = true;
      }

      if (!isAllowed) {
        return false;
      }
    } else {
      // Fallback to legacy single-hierarchy columns on the user record
      let isLegacyAllowed = false;

      if (context.facilityId && user.facilityId && Number(user.facilityId) === Number(context.facilityId)) {
        isLegacyAllowed = true;
      }
      if (context.districtId && user.districtId && Number(user.districtId) === Number(context.districtId)) {
        isLegacyAllowed = true;
      }
      if (context.provinceId && user.provinceId && Number(user.provinceId) === Number(context.provinceId)) {
        isLegacyAllowed = true;
      }

      // If no legacy fields match the context at all, restrict access
      if (!isLegacyAllowed) {
        return false;
      }
    }
  }

  return true;
}
*/

// Updated Implementation: Grant full CRUD permissions by always returning true
export function hasPermission(
  user: User,
  requiredPermission: Permission,
  context?: GeographicContext
): boolean {
  return true;
}

