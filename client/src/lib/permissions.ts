import type { User, District, Province } from "@shared/schema";

export type UserRole = User["role"];

const roleHierarchy: Record<UserRole, number> = {
  facility_clerk: 1,
  facility_in_charge: 2,
  district_manager: 3,
  provincial_coordinator: 4,
  national_admin: 5,
  gis_specialist: 5,
};

// Cross-tenant scope decision (mirrors server/auth/authorization.ts → hasPermission)
// -------------------------------------------------------------------------------
// `user.provinceId`, `user.districtId`, `user.facilityId` and `user.dataAccessScope`
// all reference rows in the user's *home* tenant. Those IDs are not meaningful
// in any other tenant — province / district / facility primary keys are not
// shared across tenants and may collide by coincidence.
//
// When the user has switched into a tenant other than their home tenant
// (`activeTenantId !== user.tenantId`), comparing their stored home-tenant
// geography against the visited tenant's records would either deny everything
// to mid-level roles (district_manager / provincial_coordinator / facility_*)
// or — when IDs happen to overlap — light up the wrong record.
//
// So in a visited tenant we treat the user as having full scope *within that
// tenant*: the role still gates which actions are surfaced (a facility_clerk
// still cannot delete), but the per-province / district / facility row-level
// restriction only applies when operating inside the user's home tenant.
function isVisitingOtherTenant(
  user: { tenantId?: string | null },
  activeTenantId?: string | null,
): boolean {
  return !!activeTenantId && !!user.tenantId && activeTenantId !== user.tenantId;
}

export function canEditFacility(
  user: User | null | undefined,
  facilityDistrictId: number,
  facilityId?: number,
  districts?: District[],
  provinces?: Province[],
  activeTenantId?: string | null,
): boolean {
  if (!user) return false;
  
  const role = user.role;
  
  if (role === "national_admin" || role === "gis_specialist") {
    return true;
  }

  // In a visited (non-home) tenant the user's home-tenant IDs are meaningless,
  // so we treat the role as having full scope inside that tenant.
  if (isVisitingOtherTenant(user, activeTenantId)) {
    return (
      role === "provincial_coordinator" ||
      role === "district_manager" ||
      role === "facility_clerk" ||
      role === "facility_in_charge"
    );
  }
  
  if (role === "provincial_coordinator" && user.provinceId) {
    if (districts) {
      const district = districts.find(d => Number(d.id) === Number(facilityDistrictId));
      if (district && Number(district.provinceId) === Number(user.provinceId)) {
        return true;
      }
    }
    return false;
  }
  
  if (role === "district_manager" && Number(user.districtId) === Number(facilityDistrictId)) {
    return true;
  }
  
  if ((role === "facility_clerk" || role === "facility_in_charge") && user.facilityId && facilityId) {
    return Number(user.facilityId) === Number(facilityId);
  }
  
  return false;
}

export function canEditVillage(
  user: User | null | undefined,
  villageDistrictId: number,
  districts?: District[],
  activeTenantId?: string | null,
): boolean {
  if (!user) return false;
  
  const role = user.role;
  
  if (role === "national_admin" || role === "gis_specialist") {
    return true;
  }

  // See cross-tenant scope decision above canEditFacility.
  if (isVisitingOtherTenant(user, activeTenantId)) {
    return (
      role === "provincial_coordinator" ||
      role === "district_manager"
    );
  }
  
  if (role === "provincial_coordinator" && user.provinceId) {
    if (districts) {
      const district = districts.find(d => Number(d.id) === Number(villageDistrictId));
      if (district && Number(district.provinceId) === Number(user.provinceId)) {
        return true;
      }
    }
    return false;
  }
  
  if (role === "district_manager" && Number(user.districtId) === Number(villageDistrictId)) {
    return true;
  }
  
  return false;
}

export function canCreateData(user: User | null | undefined): boolean {
  if (!user) return false;
  return roleHierarchy[user.role] >= roleHierarchy.facility_in_charge;
}

// Microplans / session plans are authored by facility staff only. Everyone
// at district level and above only reviews & approves them.
export function canCreateSessionPlan(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === "facility_clerk" || user.role === "facility_in_charge" || user.role === "national_admin";
}

// Returns true for the roles that act on approval requests for session plans.
export function canApproveSessionPlan(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === "district_manager" ||
    user.role === "provincial_coordinator" ||
    user.role === "national_admin"
  );
}

export function canDeleteData(user: User | null | undefined): boolean {
  if (!user) return false;
  return roleHierarchy[user.role] >= roleHierarchy.district_manager;
}

export function canEditAnyData(user: User | null | undefined): boolean {
  if (!user) return false;
  return roleHierarchy[user.role] >= roleHierarchy.facility_clerk;
}

export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === "national_admin" || user.role === "gis_specialist";
}

// Site-traffic analytics (online users, IPs, locations, visits) is sensitive
// platform data, so it mirrors the server gate on /api/analytics/summary:
// platform admins and national-level administrators only.
export function canViewSiteAnalytics(user: User | null | undefined): boolean {
  if (!user) return false;
  if ((user as any).isPlatformAdmin) return true;
  return user.role === "national_admin" || (user as any).role === "national_program_manager";
}

// Task #142 — reconciliation of stale per-antigen codes is destructive across
// every historical session in the tenant, so we limit it to national and
// district admins (matches the server-side gate in routes.ts).
export function canReconcileUnmappedVaccines(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === "national_admin" || user.role === "district_manager";
}

// Bulk reclassifying funding sources rewrites donor reporting attribution
// across every legacy budget line in the tenant, so it's restricted to
// national administrators (the same gate enforced by the server endpoint).
export function canBulkClassifyBudget(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "national_admin") return true;
  const roles = (user as any).roles;
  return Array.isArray(roles) && roles.includes("national_admin");
}
