// Pre-seeded demo ("Select a Test Identity") accounts.
//
// These are the one-click demo logins shown on the public landing page. They
// are real accounts seeded into the demo tenant (Zambia) at startup. The
// landing-page cards sign in directly via POST /api/auth/demo-login — no Replit
// login redirect, and no password is shipped in the client bundle. The
// demo-login endpoint only accepts the allowlisted emails below.
//
// Only low-privilege, geographically-scoped roles are exposed publicly
// (Provincial Coordinator, District Manager, Facility Clerk). The National
// Admin role is intentionally NOT a public demo identity.

// Country (tenant) the demo accounts live in. Resolved by tenant `code`.
export const DEMO_TENANT_CODE = "ZMB";

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
    id: "seed-user-provincial-coord",
    email: "provincial.coord@vaxplan.org",
    firstName: "Provincial",
    lastName: "Coordinator",
    role: "provincial_coordinator",
    roles: ["provincial_coordinator"],
    permissions: ["view_clients", "approve_plans", "manage_users"],
    // Locked to Lusaka Province (Zambia, province ID 7)
    dataAccessScope: { provinces: [7], districts: [], facilities: [] },
    facilityId: null,
    districtId: null,
    provinceId: 7,
  },
  {
    id: "seed-user-district-mgr",
    email: "district.mgr@vaxplan.org",
    firstName: "District",
    lastName: "Manager",
    role: "district_manager",
    roles: ["district_manager"],
    permissions: ["view_clients", "manage_session_plans", "approve_plans"],
    // Locked to Lusaka District (Zambia, district ID 64, in Lusaka Province)
    dataAccessScope: { provinces: [], districts: [64], facilities: [] },
    facilityId: null,
    districtId: 64,
    provinceId: 7,
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
    // Locked to Airport Urban Health Centre (Zambia, facility ID 12, Lusaka District)
    dataAccessScope: { provinces: [], districts: [], facilities: [12] },
    facilityId: 12,
    districtId: 64,
    provinceId: 7,
  },
];

// Allowlist of emails the public demo-login endpoint will accept.
export const DEMO_LOGIN_EMAILS: string[] = DEMO_ACCOUNTS.map((a) => a.email.toLowerCase());

// Immutable set of demo account IDs. The demo-login endpoint asserts the
// resolved user's ID against this set (not just its email) so a renamed or
// re-pointed email can never be used to log in as a non-demo account.
export const DEMO_ACCOUNT_IDS: string[] = DEMO_ACCOUNTS.map((a) => a.id);

// Demo identities that must NOT be publicly loginable. Seeding deactivates
// these and clears any password, so an earlier-seeded National Admin demo
// account can't be used to sign in.
export const RETIRED_DEMO_ACCOUNT_IDS: string[] = ["seed-user-national-admin"];
