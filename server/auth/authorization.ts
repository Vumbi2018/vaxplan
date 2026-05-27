import type { User } from "@shared/schema";

export type Permission =
  | "view_clients"
  | "create_client"
  | "edit_client"
  | "log_immunization"
  | "send_reminders"
  | "view_session_plans"
  | "manage_session_plans"
  | "approve_plans"
  | "view_stock"
  | "manage_stock"
  | "view_mobilization"
  | "manage_mobilization"
  | "view_budget"
  | "manage_budget"
  | "approve_budget"
  | "view_reports"
  | "manage_reports"
  | "manage_boundaries"
  | "manage_users";

// Roles to Permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  facility_clerk: [
    "view_clients",
    "create_client",
    "log_immunization",
    "view_session_plans",
    "manage_session_plans",
    "view_stock",
    "manage_stock",
    "view_mobilization",
    "manage_mobilization",
    "view_budget",
  ],
  facility_in_charge: [
    "view_clients",
    "create_client",
    "edit_client",
    "log_immunization",
    "view_session_plans",
    "manage_session_plans",
    "approve_plans",
    "view_stock",
    "manage_stock",
    "view_mobilization",
    "manage_mobilization",
    "view_budget",
    "manage_budget",
    "view_reports",
    "manage_reports",
  ],
  district_manager: [
    "view_clients",
    "view_session_plans",
    "approve_plans",
    "view_stock",
    "view_mobilization",
    "view_budget",
    "approve_budget",
    "view_reports",
  ],
  provincial_coordinator: [
    "view_clients",
    "view_session_plans",
    "approve_plans",
    "view_stock",
    "view_mobilization",
    "view_budget",
    "approve_budget",
    "view_reports",
    "manage_users",
  ],
  gis_specialist: [
    "view_clients",
    "view_session_plans",
    "view_mobilization",
    "view_budget",
    "manage_boundaries",
  ],
  national_admin: [
    "view_clients",
    "create_client",
    "edit_client",
    "log_immunization",
    "send_reminders",
    "view_session_plans",
    "manage_session_plans",
    "approve_plans",
    "view_stock",
    "manage_stock",
    "view_mobilization",
    "manage_mobilization",
    "view_budget",
    "manage_budget",
    "approve_budget",
    "view_reports",
    "manage_reports",
    "manage_boundaries",
    "manage_users",
  ],
};

export interface GeographicContext {
  provinceId?: number | null;
  districtId?: number | null;
  facilityId?: number | null;
}

export interface UserDataAccessScope {
  provinces: number[];
  districts: number[];
  facilities: number[];
}

// Memory cache for tenant roles to allow synchronous evaluation inside hasPermission
export const tenantRolesCache = new Map<string, Record<string, Permission[]>>();

/**
 * Checks if a user has a specified permission, and if a geographic context is provided,
 * verifies that the user has row-level authority to access/modify that geographic scope.
 */
export function hasPermission(
  user: User,
  requiredPermission: Permission,
  context?: GeographicContext
): boolean {
  // 1. National Admin (either legacy string or JSONB array) has absolute access to everything
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
  /* Original Code: statically resolving from ROLE_PERMISSIONS
  activeRoles.forEach((roleName) => {
    const rolePerms = ROLE_PERMISSIONS[roleName] || [];
    rolePerms.forEach((p) => permissionsSet.add(p));
  });
  */
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
  if (context && (context.provinceId || context.districtId || context.facilityId)) {
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
