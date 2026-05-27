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

export function canEditFacility(
  user: User | null | undefined,
  facilityDistrictId: number,
  facilityId?: number,
  districts?: District[],
  provinces?: Province[]
): boolean {
  if (!user) return false;
  
  const role = user.role;
  
  if (role === "national_admin" || role === "gis_specialist") {
    return true;
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
  districts?: District[]
): boolean {
  if (!user) return false;
  
  const role = user.role;
  
  if (role === "national_admin" || role === "gis_specialist") {
    return true;
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
