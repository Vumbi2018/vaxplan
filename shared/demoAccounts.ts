// Pre-seeded demo ("Select a Test Identity") accounts.
//
// These are the one-click demo logins shown on the public landing page. They
// are real email/password accounts (not Replit OIDC), seeded into the default
// tenant at startup so the demo cards can sign in directly via
// POST /api/auth/login-password — no Replit login redirect involved.
//
// The password is intentionally shared between client and server so the demo
// cards can log in with one click. These accounts only ever see demo data.

export const DEMO_ACCOUNT_PASSWORD = "VaxPlanDemo!2026";

export interface DemoAccountSeed {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles: string[];
  permissions: string[];
  dataAccessScope: { provinces: number[]; districts: number[]; facilities: number[] };
  facilityId: number | null;
  districtId: number | null;
  provinceId: number | null;
}

export const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    id: "seed-user-national-admin",
    email: "national.admin@vaxplan.org",
    firstName: "National",
    lastName: "Admin",
    role: "national_admin",
    roles: ["national_admin"],
    permissions: [],
    dataAccessScope: { provinces: [], districts: [], facilities: [] },
    facilityId: null,
    districtId: null,
    provinceId: null,
  },
  {
    id: "seed-user-provincial-coord",
    email: "provincial.coord@vaxplan.org",
    firstName: "Provincial",
    lastName: "Coordinator",
    role: "provincial_coordinator",
    roles: ["provincial_coordinator"],
    permissions: ["view_clients", "approve_plans", "manage_users"],
    // Locked to Province ID 1 (Highlands Province)
    dataAccessScope: { provinces: [1], districts: [], facilities: [] },
    facilityId: null,
    districtId: null,
    provinceId: 1,
  },
  {
    id: "seed-user-district-mgr",
    email: "district.mgr@vaxplan.org",
    firstName: "District",
    lastName: "Manager",
    role: "district_manager",
    roles: ["district_manager"],
    permissions: ["view_clients", "manage_session_plans", "approve_plans"],
    // Locked to District ID 1 (District A)
    dataAccessScope: { provinces: [], districts: [1], facilities: [] },
    facilityId: null,
    districtId: 1,
    provinceId: 1,
  },
  {
    id: "seed-user-facility-clerk",
    email: "facility.clerk@vaxplan.org",
    firstName: "Facility",
    lastName: "Clerk",
    role: "facility_clerk",
    // Dual-role
    roles: ["facility_clerk", "gis_specialist"],
    permissions: ["log_immunization"],
    // Locked to Facility ID 1 (Facility A)
    dataAccessScope: { provinces: [], districts: [], facilities: [1] },
    facilityId: 1,
    districtId: 1,
    provinceId: 1,
  },
];
