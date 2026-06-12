import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// MULTITENANT CONTROL PLANE
// ============================================================================

export const tenantStatusEnum = pgEnum("tenant_status", [
  "trial",
  "active",
  "suspended",
  "archived",
]);

export const idpProtocolEnum = pgEnum("idp_protocol", ["oidc", "saml"]);

export const signupStatusEnum = pgEnum("signup_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const populationRefreshStatusEnum = pgEnum("population_refresh_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const populationRefreshTriggerEnum = pgEnum("population_refresh_trigger", [
  "manual",
  "scheduled",
]);

// Tenants — one per country / Ministry of Health
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  status: tenantStatusEnum("status").default("trial").notNull(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Per-tenant SSO/IdP configuration. Secrets live in an external secret manager;
// this table only stores references.
export const tenantIdpConfigs = pgTable(
  "tenant_idp_configs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    protocol: idpProtocolEnum("protocol").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    emailDomain: varchar("email_domain", { length: 255 }).notNull(),
    issuerUrl: varchar("issuer_url"),
    clientId: varchar("client_id"),
    clientSecretRef: varchar("client_secret_ref"),
    entryPoint: varchar("entry_point"),
    certRef: varchar("cert_ref"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_idp_email_domain").on(table.emailDomain)]
);

// Self-service signup requests with hierarchical approval
export const signupRequests = pgTable(
  "signup_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    requestedRole: varchar("requested_role", { length: 50 }).notNull(),
    facilityId: integer("facility_id"),
    districtId: integer("district_id"),
    provinceId: integer("province_id"),
    justification: text("justification"),
    status: signupStatusEnum("status").default("pending").notNull(),
    approverUserId: varchar("approver_user_id"),
    decisionReason: text("decision_reason"),
    decidedAt: timestamp("decided_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_signup_tenant_status").on(table.tenantId, table.status),
    index("idx_signup_email").on(table.email),
  ]
);

// Country onboarding interest — captured from the signup form when a visitor
// picks a country that doesn't yet have a tenant on the platform.
// These are *leads*, not user accounts. They never grant access on their own;
// a national_admin (or platform operator) reviews them and provisions a tenant
// out-of-band before any user from that country can sign up.
export const tenantInterestRequests = pgTable(
  "tenant_interest_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    countryCode: varchar("country_code", { length: 3 }).notNull(), // ISO-3166 alpha-3
    countryName: varchar("country_name", { length: 255 }).notNull(),
    organization: varchar("organization", { length: 255 }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    requestedRole: varchar("requested_role", { length: 50 }).notNull(),
    justification: text("justification"),
    status: signupStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_tenant_interest_country").on(table.countryCode),
    index("idx_tenant_interest_status").on(table.status),
  ]
);

// ============================================================================
// DOMAIN ENUMS
// ============================================================================

// Enums
/* Original Code:
export const userRoleEnum = pgEnum("user_role", [
  "facility_clerk",
  "facility_in_charge",
  "district_manager",
  "provincial_coordinator",
  "national_admin",
  "gis_specialist",
]);
*/
export const userRoleEnum = pgEnum("user_role", [
  "facility_clerk",
  "facility_in_charge",
  "district_manager",
  "provincial_coordinator",
  "national_admin",
  "gis_specialist",
  "facility_partner",
  "district_partner",
  "provincial_partner",
  "national_partner",
  "national_manager",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "locked",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "static",
  "mobile",
  "outreach",
]);

/* Original Code commented out for backward-compatibility:
export const transportModeEnum = pgEnum("transport_mode", [
  "walking",
  "road",    // kept for backward-compat with existing rows
  "boat",
  "air",
  "car",      // replaces Road/4WD in UI
  "motorbike",
  "donkey",
  "chopper",  // Air/Helicopter
]);
*/

export const transportModeEnum = pgEnum("transport_mode", [
  "walking",
  "road",
  "car",
  "motorbike",
  "donkey",
  "boat",
  "air",
  "chopper",
]);

export const populationSourceEnum = pgEnum("population_source", [
  "nso",
  "hmis",
  "worldpop",
  "survey",
  "community_census",
]);

// Sessions table for express-session persistence
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("facility_clerk").notNull(),
  roles: jsonb("roles").default([]).notNull(),
  permissions: jsonb("permissions").default([]).notNull(),
  dataAccessScope: jsonb("data_access_scope").default({ provinces: [], districts: [], facilities: [] }).notNull(),
  facilityId: integer("facility_id"),
  districtId: integer("district_id"),
  provinceId: integer("province_id"),
  hmisCode: varchar("hmis_code"),
  isActive: boolean("is_active").default(true),
  // Optional bcrypt password hash. Populated only for users who sign in via
  // the email+password path (POST /api/auth/login-password). Users who sign
  // in via tenant SSO, OIDC, or device tokens leave this null. The
  // column is intentionally not selected in any list endpoint.
  passwordHash: varchar("password_hash"),
  // Cross-tenant platform super-admin. Orthogonal to `role` (which is still
  // tenant-scoped — e.g. national_admin OF a specific Ministry). When true,
  // hasPermission() short-circuits to allow everything in every tenant.
  // Set this *only* via direct DB action — there is intentionally no API to
  // grant it, so a compromised tenant admin can never escalate to platform.
  isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
  // Per-user notification preferences. Currently honoured: { supervisionDigest: boolean }.
  // Default is "opt-in" (key absent or true → digest is sent); set to false to opt out.
  notificationPrefs: jsonb("notification_prefs").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_users_tenant").on(table.tenantId)]);

// Dynamic User Roles and their assigned permissions
export const userRoles = pgTable(
  "user_roles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    permissions: jsonb("permissions").default([]).notNull(), // array of Permission strings
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_roles_tenant").on(table.tenantId),
    unique("uq_user_roles_tenant_code").on(table.tenantId, table.code)
  ]
);

// Dynamic User Permissions and descriptions
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 100 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_permissions_tenant").on(table.tenantId),
    unique("uq_user_permissions_tenant_code").on(table.tenantId, table.code)
  ]
);

// Device-bound offline auth tokens (Task #232).
// Issued by the server after a successful online login on a specific
// installer build (Windows .exe / Android .apk). The client stores the
// token plaintext in the device's secure store (Electron safeStorage,
// Android Keystore via Capacitor Preferences) and presents it back on
// `POST /api/auth/device-token/validate` to restore the session on
// app launch without forcing a fresh OIDC round-trip.
// `tokenHash` is sha256(token) so a DB leak doesn't expose live tokens.
export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  platform: varchar("platform", { length: 32 }).notNull(), // "windows" | "android" | "web"
  deviceLabel: varchar("device_label", { length: 255 }), // user-friendly label, e.g. hostname
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("idx_device_tokens_user").on(table.userId),
  index("idx_device_tokens_hash").on(table.tokenHash),
]);

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = typeof deviceTokens.$inferInsert;

// Regions (top-level: Southern, Highlands, Islands, Momase)
export const regions = pgTable("regions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  coordinates: jsonb("coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_regions_tenant").on(table.tenantId),
  unique("regions_tenant_code_unique").on(table.tenantId, table.code),
]);

// Provinces
export const provinces = pgTable("provinces", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  regionId: integer("region_id").references(() => regions.id),
  coordinates: jsonb("coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_provinces_tenant").on(table.tenantId),
  unique("provinces_tenant_code_unique").on(table.tenantId, table.code),
]);

// Districts
export const districts = pgTable("districts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  coordinates: jsonb("coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_districts_tenant").on(table.tenantId),
  unique("districts_tenant_code_unique").on(table.tenantId, table.code),
]);

// Local Level Governments (LLGs / Wards) - between districts and villages
export const llgs = pgTable("llgs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  coordinates: jsonb("coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_llgs_tenant").on(table.tenantId)]);

// Health Facilities
export const facilities = pgTable("facilities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  hmisCode: varchar("hmis_code", { length: 50 }).notNull(),
  facilityType: varchar("facility_type", { length: 100 }),
  agencyName: varchar("agency_name", { length: 100 }),
  operationalStatus: varchar("operational_status", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: text("address"),
  contactPhone: varchar("contact_phone", { length: 50 }),
  operatingHours: varchar("operating_hours", { length: 100 }),
  hasRefrigerator: boolean("has_refrigerator").default(false),
  hasPower: boolean("has_power").default(false),
  staffCount: integer("staff_count"),
  catchmentRadius: decimal("catchment_radius", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  // GeoJSON polygon describing the HF's drawn catchment area boundary.
  // Drawn in Step 2 of the wizard; locked after first save.
  catchmentPolygon: jsonb("catchment_polygon"),
  // Estimated total population inside the catchment polygon from grid tiles.
  catchmentGridPopulation: integer("catchment_grid_population"),
  // External IdP-side identifiers (DHIS2 UID, SmartCare GUID, eLMIS, iHRIS, etc.).
  // Keyed by IdP code so the same facility can carry multiple cross-references.
  externalIds: jsonb("external_ids").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_facilities_tenant").on(table.tenantId),
  unique("facilities_tenant_hmis_unique").on(table.tenantId, table.hmisCode),
]);

/*
// Original villages table definition preserved for backward compatibility
export const villages = pgTable("villages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  llgId: integer("llg_id").references(() => llgs.id),
  assignedFacilityId: integer("assigned_facility_id").references(() => facilities.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  distanceToFacility: decimal("distance_to_facility", { precision: 10, scale: 2 }),
  travelTimeMinutes: integer("travel_time_minutes"),
  terrainDifficulty: integer("terrain_difficulty"),
  isHardToReach: boolean("is_hard_to_reach").default(false),
  seasonalAccessibility: varchar("seasonal_accessibility", { length: 100 }),
  transportMode: transportModeEnum("transport_mode"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_villages_tenant").on(table.tenantId)]);
*/

// Villages/Settlements (Communities) - Updated to include insecurity level and qualitative remarks
/* Original villages pgTable definition commented out for backward compatibility:
export const villages = pgTable("villages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  llgId: integer("llg_id").references(() => llgs.id),
  assignedFacilityId: integer("assigned_facility_id").references(() => facilities.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  distanceToFacility: decimal("distance_to_facility", { precision: 10, scale: 2 }),
  travelTimeMinutes: integer("travel_time_minutes"),
  terrainDifficulty: integer("terrain_difficulty"),
  isHardToReach: boolean("is_hard_to_reach").default(false),
  seasonalAccessibility: varchar("seasonal_accessibility", { length: 100 }),
  transportMode: transportModeEnum("transport_mode"),
  insecurityLevel: integer("insecurity_level"),
  comments: text("comments"),
  accessibilityScore: varchar("accessibility_score", { length: 50 }),
  referralRoute: text("referral_route"),
  boundary: jsonb("boundary"),
  // Drawn community polygon (Step 2 wizard). Distinct from boundary: this is
  // the polygon drawn by the HF planner inside their catchment, used for
  // population estimation and coverage gap detection.
  catchmentPolygon: jsonb("catchment_polygon"),
  // Population estimated from WorldPop/GHS-POP grid tiles intersecting this polygon.
  griddedPopulation: integer("gridded_population"),
  // Human-readable label for the manual population source (NSO, HMIS, survey, etc.)
  populationSourceLabel: varchar("population_source_label", { length: 100 }),
  // Color hex code for rendering this community's polygon on the map.
  polygonColor: varchar("polygon_color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_villages_tenant").on(table.tenantId)]);
*/

// Updated villages/communities definition adding outreach post name and location fields
/* Original Code commented out for backward-compatibility:
export const villages = pgTable("villages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  llgId: integer("llg_id").references(() => llgs.id),
  assignedFacilityId: integer("assigned_facility_id").references(() => facilities.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  distanceToFacility: decimal("distance_to_facility", { precision: 10, scale: 2 }),
  travelTimeMinutes: integer("travel_time_minutes"),
  terrainDifficulty: integer("terrain_difficulty"),
  isHardToReach: boolean("is_hard_to_reach").default(false),
  seasonalAccessibility: varchar("seasonal_accessibility", { length: 100 }),
  transportMode: transportModeEnum("transport_mode"),
  insecurityLevel: integer("insecurity_level"),
  comments: text("comments"),
  accessibilityScore: varchar("accessibility_score", { length: 50 }),
  referralRoute: text("referral_route"),
  boundary: jsonb("boundary"),
  
  // Outreach Post Configuration
  outreachLatitude: decimal("outreach_latitude", { precision: 10, scale: 7 }),
  outreachLongitude: decimal("outreach_longitude", { precision: 10, scale: 7 }),
  outreachPostName: varchar("outreach_post_name", { length: 255 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_villages_tenant").on(table.tenantId)]);
*/

export const villages = pgTable("villages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  districtId: integer("district_id").notNull().references(() => districts.id),
  llgId: integer("llg_id").references(() => llgs.id),
  assignedFacilityId: integer("assigned_facility_id").references(() => facilities.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  distanceToFacility: decimal("distance_to_facility", { precision: 10, scale: 2 }),
  travelTimeMinutes: integer("travel_time_minutes"),
  terrainDifficulty: integer("terrain_difficulty"),
  isHardToReach: boolean("is_hard_to_reach").default(false),
  seasonalAccessibility: varchar("seasonal_accessibility", { length: 100 }),
  transportMode: transportModeEnum("transport_mode"),
  insecurityLevel: integer("insecurity_level"),
  comments: text("comments"),
  accessibilityScore: varchar("accessibility_score", { length: 50 }),
  referralRoute: text("referral_route"),
  boundary: jsonb("boundary"),
  // Drawn community polygon (Step 2 wizard). Distinct from boundary: this is
  // the polygon drawn by the HF planner inside their catchment, used for
  // population estimation and coverage gap detection.
  catchmentPolygon: jsonb("catchment_polygon"),
  // Population estimated from WorldPop/GHS-POP grid tiles intersecting this polygon.
  griddedPopulation: integer("gridded_population"),
  // Human-readable label for the manual population source (NSO, HMIS, survey, etc.)
  populationSourceLabel: varchar("population_source_label", { length: 100 }),
  // Color hex code for rendering this community's polygon on the map.
  polygonColor: varchar("polygon_color", { length: 7 }),
  
  // Outreach Post Configuration
  outreachLatitude: decimal("outreach_latitude", { precision: 10, scale: 7 }),
  outreachLongitude: decimal("outreach_longitude", { precision: 10, scale: 7 }),
  outreachPostName: varchar("outreach_post_name", { length: 255 }),

  // Focal Person / Social Mobilization details
  focalPersonName: varchar("focal_person_name", { length: 255 }),
  focalPersonPhone: varchar("focal_person_phone", { length: 50 }),
  focalPersonCommChecked: boolean("focal_person_comm_checked").default(false).notNull(),
  outsideFollowUpMade: boolean("outside_follow_up_made").default(false).notNull(),

  // Cross-border and crossing point details
  isCrossBorder: boolean("is_cross_border").default(false).notNull(),
  borderCountry: varchar("border_country", { length: 100 }),
  isCrossingPoint: boolean("is_crossing_point").default(false).notNull(),
  crossingType: varchar("crossing_type", { length: 50 }), // 'formal' | 'informal'
  dailyMovementVolume: integer("daily_movement_volume"),

  // Sheet 1.1 — Border village inter-country coordination
  // Which country is responsible for vaccinating this border village?
  borderVillageCountry: varchar("border_village_country", { length: 100 }),
  // Which health facility across the border is the responsible counterpart?
  borderVillageFacilityName: varchar("border_village_facility_name", { length: 255 }),

  // Sheet 1.0 — Settlement classification (15 types)
  // Values: village | estate | market | transport_station | school | church | mosque |
  //         temple | seasonal | nomadic | pastoral | border_village | high_risk |
  //         hard_to_reach | crossing_point
  settlementType: varchar("settlement_type", { length: 50 }).default("village"),

  // Sheet 1.0 — High-risk classification
  highRisk: boolean("high_risk").default(false).notNull(),
  highRiskReason: varchar("high_risk_reason", { length: 255 }), // border, informal_settlement, mobile_pop, outbreak_area

  // Sheet 1.0 — Direct population capture per settlement
  // (Supplements populationData table which holds historical multi-source records)
  totalCatchmentPopulation: integer("total_catchment_population"),
  under5Population: integer("under5_population"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_villages_tenant").on(table.tenantId)]);


// Catchment overlap conflicts: recorded when a newly drawn/edited community
// boundary overlaps another community's claimed boundary. Lightweight record
// that drives the "request harmonization" notification to the other facility's
// in-charge so the two sides can agree on the boundary (see task #261).
export const catchmentConflicts = pgTable("catchment_conflicts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  villageId: integer("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  conflictingVillageId: integer("conflicting_village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  conflictingFacilityId: integer("conflicting_facility_id").references(() => facilities.id, { onDelete: "set null" }),
  overlapPct: decimal("overlap_pct", { precision: 6, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  requestedByUserId: varchar("requested_by_user_id"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [index("idx_catchment_conflicts_tenant").on(table.tenantId)]);

// Per-facility list of villages that staff have explicitly removed from the
// microplan catchment in Step 2 of the wizard. Persisted server-side (rather
// than in the browser's localStorage) so the choice follows the user across
// devices and browsers — see task #167. A row's presence means "do not seed
// this village into the catchment", and the row is deleted when a user
// re-adds the community.
export const facilityExcludedVillages = pgTable("facility_excluded_villages", {
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  villageId: integer("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  removedByUserId: varchar("removed_by_user_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("facility_excluded_villages_pk").on(table.tenantId, table.facilityId, table.villageId),
  index("idx_facility_excluded_villages_facility").on(table.tenantId, table.facilityId),
]);

// Population Data (Multi-source)
export const populationData = pgTable("population_data", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  provinceId: integer("province_id").references(() => provinces.id),
  districtId: integer("district_id").references(() => districts.id),
  villageId: integer("village_id").references(() => villages.id),
  facilityId: integer("facility_id").references(() => facilities.id),
  source: populationSourceEnum("source").notNull(),
  year: integer("year").notNull(),
  totalPopulation: integer("total_population").notNull(),
  malePopulation: integer("male_population"),
  femalePopulation: integer("female_population"),
  under1Population: integer("under_1_population"),
  under5Population: integer("under_5_population"),
  pregnantWomen: integer("pregnant_women"),
  schoolEntry: integer("school_entry"),
  schoolExit: integer("school_exit"),
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  metadata: jsonb("metadata"),
  approvalStatus: approvalStatusEnum("approval_status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_population_tenant").on(table.tenantId)]);

// ============================================================================
// MICROPLANS — Differentiated SIA & Health Facility Master Microplans
// ============================================================================
export const microplanTypeEnum = pgEnum("microplan_type", [
  "facility_routine",
  "sia_campaign",
]);

// Session-plan-side planType enum. Mirrors the parent microplan's planType in
// short form ('routine' ↔ 'facility_routine', 'campaign' ↔ 'sia_campaign').
// Sessions must always inherit this from their parent microplan; the server
// copies it at write time and rejects mismatched values.
export const sessionPlanTypeEnum = pgEnum("session_plan_type", [
  "routine",
  "campaign",
]);

/* Original Code commented out for backward-compatibility:
export const microplans = pgTable("microplans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").references(() => facilities.id), // Nullable for high-level SIA
  name: varchar("name", { length: 255 }).notNull(),
  planType: microplanTypeEnum("plan_type").notNull().default("facility_routine"),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  status: varchar("status", { length: 50 }).default("draft"), // draft, pending, approved, locked
  // SIA Campaign specific fields:
  campaignAntigen: varchar("campaign_antigen", { length: 100 }),
  campaignTargetAge: varchar("campaign_target_age", { length: 100 }),
  campaignScope: varchar("campaign_scope", { length: 100 }), // National, Sub-national, Targeted
  // When campaignScope is "Sub-national" or "Targeted", this stores the selected
  // geographic scope: { provinceIds: number[], districtIds: number[], facilityIds: number[] }
  campaignScopeDetails: jsonb("campaign_scope_details").$type<{
    provinceIds?: number[];
    districtIds?: number[];
    facilityIds?: number[];
  }>(),
  targetPopulation: integer("target_population"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  // Structured staffing roster (WHO/UNICEF microplanning element 6 - Human Resources).
  // Array of { role, headcount, days, perDiem } rows. Free-form jsonb to keep the
  // schema flexible while the UI iterates.
  staffing: jsonb("staffing").default([]),
  // Approval workflow timestamps
  submittedAt: timestamp("submitted_at"),
  autoApprovedAt: timestamp("auto_approved_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_microplans_tenant").on(table.tenantId)]);
*/

export const microplans = pgTable("microplans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").references(() => facilities.id), // Nullable for high-level SIA
  name: varchar("name", { length: 255 }).notNull(),
  planType: microplanTypeEnum("plan_type").notNull().default("facility_routine"),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  status: varchar("status", { length: 50 }).default("draft"), // draft, pending, approved, locked, auto_approved
  // SIA Campaign specific fields:
  campaignAntigen: varchar("campaign_antigen", { length: 100 }),
  campaignTargetAge: varchar("campaign_target_age", { length: 100 }),
  campaignScope: varchar("campaign_scope", { length: 100 }), // National, Sub-national, Targeted
  // When campaignScope is "Sub-national" or "Targeted", this stores the selected
  // geographic scope: { provinceIds: number[], districtIds: number[], facilityIds: number[] }
  campaignScopeDetails: jsonb("campaign_scope_details").$type<{
    provinceIds?: number[];
    districtIds?: number[];
    facilityIds?: number[];
  }>(),
  targetPopulation: integer("target_population"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  // Structured staffing roster (WHO/UNICEF microplanning element 6 - Human Resources).
  // Array of { role, headcount, days, perDiem } rows. Free-form jsonb to keep the
  // schema flexible while the UI iterates.
  staffing: jsonb("staffing").default([]),

  // Notification and Auto-Approval tracking
  submittedAt: timestamp("submitted_at"),
  autoApproveAt: timestamp("auto_approve_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  districtEditReason: text("district_edit_reason"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_microplans_tenant").on(table.tenantId)]);


// Session Plans (Vaccination) - Modified to include microplanId link, custom polygon geofencing geojson, and isAchieved tick status.
// Original Code commented out for backward-compatibility and strict traceability:
/*
export const sessionPlans = pgTable("session_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  name: varchar("name", { length: 255 }).notNull(),
  sessionType: sessionTypeEnum("session_type").notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  transportMode: transportModeEnum("transport_mode"),
  estimatedDuration: integer("estimated_duration"),
  targetPopulation: integer("target_population"),
  status: varchar("status", { length: 50 }).default("planned"),
  approvalStatus: approvalStatusEnum("approval_status").default("draft"),
  notes: text("notes"),
  humanResources: text("human_resources"),
  keyStakeholders: text("key_stakeholders"),
  vaccineAdjustments: jsonb("vaccine_adjustments").default({}),
  planType: varchar("plan_type", { length: 50 }).default("routine"),
  campaignAntigen: varchar("campaign_antigen", { length: 100 }),
  campaignTargetAge: varchar("campaign_target_age", { length: 100 }),
  campaignScope: varchar("campaign_scope", { length: 100 }),
  teamType: varchar("team_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_session_plans_tenant").on(table.tenantId)]);
*/

export const sessionPlans = pgTable("session_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  // Every session MUST belong to a parent microplan. Enforced by server validation
  // (POST/PATCH /api/sessions verify parent exists, same tenant, matching planType,
  // and parent is not locked).
  microplanId: integer("microplan_id").notNull().references(() => microplans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sessionType: sessionTypeEnum("session_type").notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  transportMode: transportModeEnum("transport_mode"),
  estimatedDuration: integer("estimated_duration"),
  targetPopulation: integer("target_population"),
  status: varchar("status", { length: 50 }).default("planned"),
  approvalStatus: approvalStatusEnum("approval_status").default("draft"),
  notes: text("notes"),
  humanResources: text("human_resources"),
  keyStakeholders: text("key_stakeholders"),
  vaccineAdjustments: jsonb("vaccine_adjustments").default({}),
  // Strict enum, copied from parent microplan at write-time. Never set directly by clients.
  planType: sessionPlanTypeEnum("plan_type").notNull().default("routine"),
  // @deprecated — these mirror the parent microplan's campaign fields. Server copies
  // them on create from the parent and rejects client-supplied values. Kept on the row
  // for read-time convenience and to avoid breaking offline clients.
  campaignAntigen: varchar("campaign_antigen", { length: 100 }),
  campaignTargetAge: varchar("campaign_target_age", { length: 100 }),
  campaignScope: varchar("campaign_scope", { length: 100 }),
  teamType: varchar("team_type", { length: 100 }),
  geojson: jsonb("geojson"), // Georeferenced custom geofence plotted by the health worker
  isAchieved: boolean("is_achieved").default(false).notNull(), // real-time map checklist progress tracking
  // Outreach intent — set automatically when a session is created from a map
  // prefill (e.g. the "Plan defaulter follow-up here" button on the zero-dose /
  // under-immunized pins). Persisting an explicit purpose keeps the signal
  // alive even if a planner renames the session, so downstream views can
  // filter and badge defaulter follow-ups reliably. Null for sessions created
  // through the normal flow.
  outreachPurpose: varchar("outreach_purpose", { length: 32 }),
  // Completion tracking — set when the facility marks the session done. Drives the
  // 1-month auto-archive from the live map and powers the Session History view.
  completedAt: timestamp("completed_at"),
  // Per-antigen vaccinated counts captured at mark-done time. Shape:
  //   { totals: number, perAntigen: Record<string, number>, actualDate?: string, note?: string }
  vaccinatedCounts: jsonb("vaccinated_counts"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_session_plans_tenant").on(table.tenantId),
  index("idx_session_plans_microplan").on(table.microplanId),
  index("idx_session_plans_completed_at").on(table.completedAt),
]);

// Session Villages (junction table)
export const sessionVillages = pgTable("session_villages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  sessionId: integer("session_id").notNull().references(() => sessionPlans.id),
  villageId: integer("village_id").notNull().references(() => villages.id),
  orderIndex: integer("order_index"),
}, (table) => [index("idx_session_villages_tenant").on(table.tenantId)]);

// Funding-source enum for budget items. Tracks Gavi HSS reporting categories.
// `unspecified` is used as the safe default for legacy rows pre-dating this column.
export const fundingSourceEnum = pgEnum("funding_source", [
  "government",
  "gavi",
  "who",
  "unicef",
  "other",
  "unspecified",
]);

// Budget Items
export const budgetItems = pgTable("budget_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  sessionId: integer("session_id").references(() => sessionPlans.id),
  category: varchar("category", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  approvalStatus: approvalStatusEnum("approval_status").default("draft"),
  // Funding source classification (Gavi HSS reporting). Legacy rows default to
  // 'unspecified' and surface a "needs classification" hint in the UI.
  fundingSource: fundingSourceEnum("funding_source").notNull().default("unspecified"),
  // Free-text descriptor used when `fundingSource === 'other'`.
  fundingSourceOther: varchar("funding_source_other", { length: 255 }),
  // Provenance of this budget line. 'manual' for hand-entered rows,
  // 'roster_sync' for lines auto-created by the microplan roster sync
  // (Sync to Budget action / per-day Personnel snapshot). Lets reviewers
  // tell auto-computed lines apart from typed ones at a glance.
  source: varchar("source", { length: 32 }).notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_budget_items_tenant").on(table.tenantId)]);

// Vaccine Requirements
export const vaccineRequirements = pgTable("vaccine_requirements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  vaccineName: varchar("vaccine_name", { length: 100 }).notNull(),
  targetPopulation: integer("target_population").notNull(),
  dosesRequired: integer("doses_required").notNull(),
  wastageRate: decimal("wastage_rate", { precision: 5, scale: 2 }).notNull(),
  dosesWithWastage: integer("doses_with_wastage").notNull(),
  vialsRequired: integer("vials_required").notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_vaccine_req_tenant").on(table.tenantId)]);

// Social Mobilization Activities
export const mobilizationActivities = pgTable("mobilization_activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  activityType: varchar("activity_type", { length: 100 }).notNull(),
  description: text("description"),
  targetAudience: varchar("target_audience", { length: 100 }),
  scheduledDate: timestamp("scheduled_date"),
  estimatedAttendance: integer("estimated_attendance"),
  materialsNeeded: jsonb("materials_needed"),
  budgetAllocation: decimal("budget_allocation", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).default("planned"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_mobilization_tenant").on(table.tenantId)]);

// Approval Workflow
export const approvalRequests = pgTable("approval_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  currentLevel: varchar("current_level", { length: 50 }).notNull(),
  status: approvalStatusEnum("status").default("pending"),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id").references(() => users.id),
}, (table) => [index("idx_approval_req_tenant").on(table.tenantId)]);

// Population refresh jobs — one row per WorldPop ETL run (scheduled or admin-triggered).
// Visible to national admins so they can confirm a refresh ran, see how many cells
// were inserted, and read the error message when one fails.
export const populationRefreshJobs = pgTable(
  "population_refresh_jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    triggeredBy: populationRefreshTriggerEnum("triggered_by").notNull(),
    triggeredByUserId: varchar("triggered_by_user_id"),
    rasterPath: varchar("raster_path", { length: 500 }).notNull(),
    minPopulation: integer("min_population").notNull(),
    status: populationRefreshStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    rowsInserted: integer("rows_inserted"),
    cellsScanned: integer("cells_scanned"),
    cellsAboveThreshold: integer("cells_above_threshold"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_pop_refresh_tenant_started").on(table.tenantId, table.startedAt),
    index("idx_pop_refresh_status").on(table.status),
  ]
);

// Audit Log
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_audit_logs_tenant").on(table.tenantId)]);

// Page Views — lightweight site-traffic / activity analytics.
// One row per authenticated page navigation. Powers the dashboard "Site
// activity" panel: visits over time, visits today, online users (rows in the
// last few minutes), top pages and login locations. Geo fields are best-effort
// (resolved from the request IP) and may be null when lookup is unavailable.
export const pageViews = pgTable("page_views", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  path: varchar("path", { length: 300 }).notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  country: varchar("country", { length: 120 }),
  region: varchar("region", { length: 120 }),
  city: varchar("city", { length: 120 }),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  userAgent: varchar("user_agent", { length: 400 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  // Presence freshness, kept separate from createdAt so heartbeats can mark a
  // user "still here" without mutating the immutable event time that visit/
  // trend/top-page analytics are aggregated on.
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
}, (table) => [
  index("idx_page_views_tenant_created").on(table.tenantId, table.createdAt),
  index("idx_page_views_tenant_user").on(table.tenantId, table.userId),
  index("idx_page_views_tenant_last_seen").on(table.tenantId, table.lastSeenAt),
]);
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = Omit<PageView, "id" | "createdAt" | "tenantId" | "lastSeenAt">;

/*
// Original htr_scores table definition preserved for backward compatibility
export const htrScores = pgTable("htr_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  villageId: integer("village_id").notNull().references(() => villages.id),
  distanceScore: integer("distance_score"),
  terrainScore: integer("terrain_score"),
  seasonalScore: integer("seasonal_score"),
  coverageScore: integer("coverage_score"),
  compositeScore: integer("composite_score"),
  interventionPriority: varchar("intervention_priority", { length: 50 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => [index("idx_htr_scores_tenant").on(table.tenantId)]);
*/

// HTR Scores - Updated to support conflict/insecurity ratings and local context remarks
export const htrScores = pgTable("htr_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  villageId: integer("village_id").notNull().references(() => villages.id),
  distanceScore: integer("distance_score"),
  terrainScore: integer("terrain_score"),
  seasonalScore: integer("seasonal_score"),
  coverageScore: integer("coverage_score"),
  insecurityScore: integer("insecurity_score"),
  compositeScore: integer("composite_score"),
  interventionPriority: varchar("intervention_priority", { length: 50 }),
  comments: text("comments"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => [index("idx_htr_scores_tenant").on(table.tenantId)]);

// ============================================================================
// HEALTH FACILITY GOVERNANCE & HUMAN RESOURCES (Sheets 8, 9, 10)
// ============================================================================

// Sheet 9 — Health Facility Committee (HFC) Board members
export const hfcCommitteeMembers = pgTable(
  "hfc_committee_members",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
    memberName: varchar("member_name", { length: 255 }).notNull(),
    gender: varchar("gender", { length: 20 }).notNull().default("female"),
    position: varchar("position", { length: 100 }).notNull().default("Member"),
    yearsOfService: integer("years_of_service"),
    isChairperson: boolean("is_chairperson").default(false).notNull(),
    contactPhone: varchar("contact_phone", { length: 50 }),
    committeeEstablishedDate: timestamp("committee_established_date"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_hfc_members_facility").on(table.tenantId, table.facilityId),
  ]
);

// Sheet 10 — Community Health Volunteers (CHV) Profile
export const chvProfiles = pgTable(
  "chv_profiles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
    assignedVillageId: integer("assigned_village_id").references(() => villages.id, { onDelete: "set null" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    gender: varchar("gender", { length: 20 }).notNull().default("female"),
    age: integer("age"),
    educationLevel: varchar("education_level", { length: 50 }).default("primary"),
    trainingReceived: text("training_received"),
    roleDescription: text("role_description"),
    contactPhone: varchar("contact_phone", { length: 50 }),
    yearsOfService: integer("years_of_service"),
    // SIA campaign role: vaccinator | mobilizer | volunteer | supervisor
    siaRole: varchar("sia_role", { length: 50 }).default("mobilizer"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_chv_profiles_facility").on(table.tenantId, table.facilityId),
    index("idx_chv_profiles_village").on(table.assignedVillageId),
  ]
);

// Sheet 8 — Health Facility Staff Profile
export const facilityStaff = pgTable(
  "facility_staff",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    employeeId: varchar("employee_id", { length: 100 }),
    nrc: varchar("nrc", { length: 100 }),
    history: jsonb("history").default([]),
    gender: varchar("gender", { length: 20 }).default("female"),
    position: varchar("position", { length: 100 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    phone: varchar("phone", { length: 50 }),
    yearsOfProfessionalExperience: integer("years_of_professional_experience"),
    yearsExperience: integer("years_experience"),
    yearsAtFacility: integer("years_at_facility"),
    role: varchar("role", { length: 100 }),
    campaignRole: varchar("campaign_role", { length: 100 }).default("vaccinator"),
    isActive: boolean("is_active").default(true).notNull(),
    active: boolean("active").default(true).notNull(),
    educationLevel: varchar("education_level", { length: 100 }),
    trainingStatus: varchar("training_status", { length: 100 }),
    residenceVillage: varchar("residence_village", { length: 255 }),
    isVolunteer: boolean("is_volunteer").default(false).notNull(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_facility_staff_facility").on(table.tenantId, table.facilityId),
    index("idx_facility_staff_user").on(table.userId),
  ]
);

// Uncovered communities — flagged when parts of a catchment polygon have no
// corresponding community polygon drawn, or when a known settlement has no
// microplan session assigned to it.
export const uncoveredCommunities = pgTable(
  "uncovered_communities",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
    // If linked to a known village record
    villageId: integer("village_id").references(() => villages.id, { onDelete: "cascade" }),
    // For uncovered areas that don't map to a village yet (geometry-only gap)
    villageName: varchar("village_name", { length: 255 }),
    estimatedPopulation: integer("estimated_population"),
    // Which administrative level was notified
    flaggedLevel: varchar("flagged_level", { length: 30 }).default("district"),
    flaggedAt: timestamp("flagged_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: varchar("resolved_by_user_id"),
    note: text("note"),
  },
  (table) => [
    index("idx_uncovered_communities_facility").on(table.tenantId, table.facilityId),
    index("idx_uncovered_communities_resolved").on(table.resolvedAt),
  ]
);

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  district: one(districts, {
    fields: [users.districtId],
    references: [districts.id],
  }),
  province: one(provinces, {
    fields: [users.provinceId],
    references: [provinces.id],
  }),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  provinces: many(provinces),
}));

export const provincesRelations = relations(provinces, ({ one, many }) => ({
  region: one(regions, {
    fields: [provinces.regionId],
    references: [regions.id],
  }),
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id],
  }),
  llgs: many(llgs),
  facilities: many(facilities),
  villages: many(villages),
}));

export const llgsRelations = relations(llgs, ({ one, many }) => ({
  district: one(districts, {
    fields: [llgs.districtId],
    references: [districts.id],
  }),
  villages: many(villages),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  district: one(districts, {
    fields: [facilities.districtId],
    references: [districts.id],
  }),
  villages: many(villages),
  sessionPlans: many(sessionPlans),
  budgetItems: many(budgetItems),
  vaccineRequirements: many(vaccineRequirements),
  mobilizationActivities: many(mobilizationActivities),
}));

export const villagesRelations = relations(villages, ({ one, many }) => ({
  district: one(districts, {
    fields: [villages.districtId],
    references: [districts.id],
  }),
  llg: one(llgs, {
    fields: [villages.llgId],
    references: [llgs.id],
  }),
  assignedFacility: one(facilities, {
    fields: [villages.assignedFacilityId],
    references: [facilities.id],
  }),
  populationData: many(populationData),
  htrScores: many(htrScores),
}));

export const microplansRelations = relations(microplans, ({ one, many }) => ({
  tenant: one(tenants, { fields: [microplans.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [microplans.facilityId], references: [facilities.id] }),
  sessionPlans: many(sessionPlans),
}));

export const sessionPlansRelations = relations(sessionPlans, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [sessionPlans.facilityId],
    references: [facilities.id],
  }),
  microplan: one(microplans, {
    fields: [sessionPlans.microplanId],
    references: [microplans.id],
  }),
  sessionVillages: many(sessionVillages),
}));

export const sessionVillagesRelations = relations(sessionVillages, ({ one }) => ({
  session: one(sessionPlans, {
    fields: [sessionVillages.sessionId],
    references: [sessionPlans.id],
  }),
  village: one(villages, {
    fields: [sessionVillages.villageId],
    references: [villages.id],
  }),
}));

// Insert Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantIdpConfigSchema = createInsertSchema(tenantIdpConfigs).omit({
  id: true,
  createdAt: true,
});

// Self-service signups can only ask for non-admin roles; elevation to
// `national_admin` must be done by an existing admin, never via the public form.
// (The DB column is `varchar(50)` so this Zod refinement is the *only* place
// that constrains the value — keep it tight.)
export const SELF_SIGNUP_ROLES = [
  "facility_clerk",
  "facility_in_charge",
  "district_manager",
  "provincial_coordinator",
  "gis_specialist",
] as const;
export const insertSignupRequestSchema = createInsertSchema(signupRequests).omit({
  id: true,
  status: true,
  approverUserId: true,
  decisionReason: true,
  decidedAt: true,
  createdAt: true,
}).extend({
  requestedRole: z.enum(SELF_SIGNUP_ROLES),
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(255),
  justification: z.string().max(2000).optional().nullable(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/* Original Code:
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  createdAt: true,
  updatedAt: true,
});
*/
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type CustomUserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type CustomUserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/*
// Original Code (failed compile under drizzle-zod v0.7.0 due to generatedAlwaysAsIdentity identity column auto-exclusion)
export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
});

export const insertProvinceSchema = createInsertSchema(provinces).omit({
  id: true,
  createdAt: true,
});

export const insertDistrictSchema = createInsertSchema(districts).omit({
  id: true,
  createdAt: true,
});

export const insertLlgSchema = createInsertSchema(llgs).omit({
  id: true,
  createdAt: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVillageSchema = createInsertSchema(villages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPopulationDataSchema = createInsertSchema(populationData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionPlanSchema = createInsertSchema(sessionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
});

export const insertVaccineRequirementSchema = createInsertSchema(vaccineRequirements).omit({
  id: true,
  createdAt: true,
});

export const insertMobilizationActivitySchema = createInsertSchema(mobilizationActivities).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  submittedAt: true,
  resolvedAt: true,
});
*/

// Updated Code: drizzle-zod automatically excludes 'generatedAlwaysAsIdentity' columns (like 'id' here) from insert schemas,
// so omitting 'id' explicitly causes a compiler type error ("Type 'boolean' is not assignable to type 'never'").
// We resolve this by removing 'id' from the omit filter, as it is already excluded.

export const insertRegionSchema = createInsertSchema(regions).omit({
  createdAt: true,
});

export const insertProvinceSchema = createInsertSchema(provinces).omit({
  createdAt: true,
});

export const insertDistrictSchema = createInsertSchema(districts).omit({
  createdAt: true,
});

export const insertLlgSchema = createInsertSchema(llgs).omit({
  createdAt: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertVillageSchema = createInsertSchema(villages).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPopulationDataSchema = createInsertSchema(populationData).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMicroplanSchema = createInsertSchema(microplans).omit({
  createdAt: true,
  updatedAt: true,
});
export type Microplan = typeof microplans.$inferSelect;
export type InsertMicroplan = z.infer<typeof insertMicroplanSchema>;

// Campaign fields and planType are *inherited* from the parent microplan. The
// server copies them at write-time from the microplan referenced by microplanId,
// so they must NOT be accepted from clients (the API would silently let routine
// sessions claim campaign metadata otherwise).
export const insertSessionPlanSchema = createInsertSchema(sessionPlans).omit({
  createdAt: true,
  updatedAt: true,
  planType: true,
  campaignAntigen: true,
  campaignTargetAge: true,
  campaignScope: true,
});
// export type SessionPlan = typeof sessionPlans.$inferSelect;

export const insertBudgetItemSchema = createInsertSchema(budgetItems)
  .omit({
    createdAt: true,
  })
  .superRefine((data, ctx) => {
    // Funding source is required on create — 'unspecified' is only allowed for
    // legacy rows that pre-date the funding-source enum. WHO core element 8
    // (Financing) and Gavi HSS reporting both require an explicit funder.
    if (!data.fundingSource || data.fundingSource === "unspecified") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fundingSource"],
        message: "Pick a funding source (Govt / Gavi / WHO / UNICEF / Other).",
      });
    }
    if (data.fundingSource === "other") {
      const v = (data.fundingSourceOther ?? "").toString().trim();
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fundingSourceOther"],
          message: "Specify the funding source when 'Other' is selected.",
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    // Normalize: drop any stale specify-text when source isn't 'other'.
    fundingSourceOther: data.fundingSource === "other" ? data.fundingSourceOther : null,
  }));

export const insertVaccineRequirementSchema = createInsertSchema(vaccineRequirements).omit({
  createdAt: true,
});

// ============================================================================
// ADMIN BOUNDARIES — GeoJSON admin level polygons per tenant
// Sourced from GeoBoundaries API, GADM, OCHA HDX, or custom upload
// ============================================================================

export const boundarySourceEnum = pgEnum("boundary_source", [
  "geoboundaries",
  "gadm",
  "ocha_hdx",
  "natural_earth",
  "custom",
]);

export const adminBoundaries = pgTable("admin_boundaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  adminLevel: integer("admin_level").notNull(), // 0=country, 1=region, 2=province, 3=district, 4=ward, 5=village
  levelName: varchar("level_name", { length: 100 }).notNull(), // e.g. "Province", "District"
  source: boundarySourceEnum("source").default("geoboundaries").notNull(),
  countryCode: varchar("country_code", { length: 3 }).notNull(), // ISO-3166 Alpha-3
  featureCount: integer("feature_count").default(0),
  // Full GeoJSON FeatureCollection
  geojson: jsonb("geojson").notNull().default({}),
  // Bounding box [minLng, minLat, maxLng, maxLat]
  bbox: jsonb("bbox").default(null),
  isActive: boolean("is_active").default(true).notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantLevelIdx: index("admin_boundaries_tenant_level_idx").on(table.tenantId, table.adminLevel),
  tenantCodeIdx: index("admin_boundaries_tenant_code_idx").on(table.tenantId, table.countryCode),
}));

// ============================================================================
// CUSTOM MAP LAYERS — admin-uploaded geographic overlays (roads, travel-time,
// schools, etc.) in GeoJSON / Shapefile / CSV / GeoTIFF formats.
// ============================================================================

export const customLayerCategoryEnum = pgEnum("custom_layer_category", [
  "road_network",
  "travel_time",
  "schools",
  "health_features",
  "water",
  "terrain",
  "settlement",
  "other",
]);

export const customLayerTypeEnum = pgEnum("custom_layer_type", [
  "vector",
  "raster",
]);

export const customLayerFormatEnum = pgEnum("custom_layer_format", [
  "geojson",
  "shapefile",
  "csv",
  "geotiff",
]);

export const customLayers = pgTable("custom_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: customLayerCategoryEnum("category").default("other").notNull(),
  layerType: customLayerTypeEnum("layer_type").notNull(),
  format: customLayerFormatEnum("format").notNull(),
  // Vector layers store their GeoJSON FeatureCollection here.
  geojson: jsonb("geojson").default(null),
  featureCount: integer("feature_count").default(0),
  // Raster layers (GeoTIFF) store a server file path instead of inline geojson.
  filePath: varchar("file_path", { length: 500 }),
  fileSizeBytes: integer("file_size_bytes"),
  // Bounding box [minLng, minLat, maxLng, maxLat]
  bbox: jsonb("bbox").default(null),
  // Display styling for vector layers: { color, weight, fillOpacity, pointRadius }
  style: jsonb("style").default({}),
  // Tag so planning/calculation features can pull this layer in.
  usableInPlanning: boolean("usable_in_planning").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("custom_layers_tenant_idx").on(table.tenantId),
  tenantCategoryIdx: index("custom_layers_tenant_category_idx").on(table.tenantId, table.category),
}));

// ============================================================================
// FACILITY CATCHMENTS — HCW-drawn polygon catchment areas
// ============================================================================

export const facilityCatchments = pgTable("facility_catchments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  drawnByUserId: varchar("drawn_by_user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // GeoJSON Polygon or MultiPolygon
  geojson: jsonb("geojson").notNull(),
  // Calculated server-side using Turf.js area()
  areaSqKm: decimal("area_sq_km", { precision: 12, scale: 4 }),
  // Optional estimated population within catchment
  populationEstimate: integer("population_estimate"),
  // Is this the official/approved catchment for this facility?
  isOfficial: boolean("is_official").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("facility_catchments_tenant_idx").on(table.tenantId),
  facilityIdx: index("facility_catchments_facility_idx").on(table.facilityId),
}));

// ============================================================================
// VACCINE CONFIGURATIONS — Dynamic tenant vaccine schedules
// ============================================================================
export const vaccineConfigurations = pgTable("vaccine_configurations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  targetGroup: varchar("target_group", { length: 50 }).notNull(), // 'under1', 'births', 'pregnant', 'schoolEntry'
  doses: integer("doses").notNull(),
  recommendedAge: varchar("recommended_age", { length: 100 }).notNull(), // e.g. "6, 10, 14 weeks"
  recommendedAgeWeeks: integer("recommended_age_weeks").notNull().default(0), // used for due list calculation
  wastageFactor: decimal("wastage_factor", { precision: 5, scale: 2 }).notNull(), // e.g. 11.00, 40.00
  vialsPerDose: integer("vials_per_dose").notNull(), // e.g. 10, 20
  isActive: boolean("is_active").default(true).notNull(),
  // WHO SMART Guidelines IMMZ alignment — standard codes for interoperability
  // with HL7 FHIR Immunization.vaccineCode (CVX) and WHO ATC drug codes.
  // Nullable until tenants run the backfill (/api/admin/vaccine-codes/backfill).
  cvxCode: varchar("cvx_code", { length: 16 }),
  whoAtcCode: varchar("who_atc_code", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("vaccine_config_tenant_idx").on(table.tenantId),
}));

// ============================================================================
// CLIENTS — Child & Pregnant Woman logbook demographics
// ============================================================================
/*
// Original clients table definition preserved for backward compatibility
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  villageId: integer("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  clientType: varchar("client_type", { length: 50 }).notNull(), // 'child', 'pregnant_woman'
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }), // 'male', 'female'
  parentName: varchar("parent_name", { length: 255 }), // mother or father name for child
  contactPhone: varchar("contact_phone", { length: 50 }),
  catchmentStatus: varchar("catchment_status", { length: 50 }).notNull().default("catchment"), // 'catchment', 'non-catchment'
  contraindications: jsonb("contraindications").default([]).notNull(), // e.g. ["Penta: Severe Allergy"]
  refusalReason: text("refusal_reason"), // e.g. "Religious grounds" or "Fear of side effects"
  isRefusal: boolean("is_refusal").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("clients_tenant_idx").on(table.tenantId),
  facilityIdx: index("clients_facility_idx").on(table.facilityId),
  villageIdx: index("clients_village_idx").on(table.villageId),
}));
*/

// Updated clients table with cross-border fields added for tracking foreign and cross-border clients.
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  villageId: integer("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  clientType: varchar("client_type", { length: 50 }).notNull(), // 'child', 'pregnant_woman'
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }), // 'male', 'female'
  parentName: varchar("parent_name", { length: 255 }), // mother or father name for child
  contactPhone: varchar("contact_phone", { length: 50 }),
  catchmentStatus: varchar("catchment_status", { length: 50 }).notNull().default("catchment"), // 'catchment', 'non-catchment'
  contraindications: jsonb("contraindications").default([]).notNull(), // e.g. ["Penta: Severe Allergy"]
  refusalReason: text("refusal_reason"), // e.g. "Religious grounds" or "Fear of side effects"
  isRefusal: boolean("is_refusal").default(false).notNull(),
  
  // Cross-border registry columns:
  isCrossBorder: boolean("is_cross_border").default(false).notNull(),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  foreignResidence: text("foreign_residence"),
  borderPointOfEntry: varchar("border_point_of_entry", { length: 100 }),

  // UCE Communication Preferences
  whatsappAvailable: boolean("whatsapp_available").default(false).notNull(),
  hasApp: boolean("has_app").default(false).notNull(),
  email: varchar("email", { length: 255 }),
  preferredLanguage: varchar("preferred_language", { length: 50 }).default("en").notNull(),
  preferredChannel: varchar("preferred_channel", { length: 50 }),

  clientId: varchar("client_id", { length: 100 }),
  serialNumber: integer("serial_number"),
  registrationYear: integer("registration_year"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("clients_tenant_idx").on(table.tenantId),
  facilityIdx: index("clients_facility_idx").on(table.facilityId),
  villageIdx: index("clients_village_idx").on(table.villageId),
}));

// ============================================================================
// CLIENT VACCINATIONS — Logs individual vaccinations administered
// ============================================================================
export const clientVaccinations = pgTable("client_vaccinations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  vaccineConfigId: integer("vaccine_config_id").notNull().references(() => vaccineConfigurations.id, { onDelete: "cascade" }),
  vaccineName: varchar("vaccine_name", { length: 100 }).notNull(), // e.g. "Penta-1" or "BCG"
  administeredDate: timestamp("administered_date").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  vvmStatus: integer("vvm_status"), // 1, 2, 3, 4
  administeredByUserId: varchar("administered_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("client_vac_tenant_idx").on(table.tenantId),
  clientIdx: index("client_vac_client_idx").on(table.clientId),
}));

// ============================================================================
// SESSION DAY PLANS — UNICEF Day-by-Day session activity planning
// ============================================================================
export const sessionDayPlans = pgTable("session_day_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sessionPlanId: integer("session_plan_id").notNull().references(() => sessionPlans.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // Day 1, Day 2...
  sessionDate: timestamp("session_date").notNull(),
  communitiesVisited: jsonb("communities_visited").default([]).notNull(), // Array of village IDs or village names
  targetPopulation: integer("target_population").notNull(),
  vaccinesRequired: jsonb("vaccines_required").default({}).notNull(), // map of vaccineConfigId -> count (doses)
  vitaminADoses: integer("vitamin_a_doses").default(0).notNull(),
  dewormingDoses: integer("deworming_doses").default(0).notNull(),
  vaccineCarriers: integer("vaccine_carriers").default(1).notNull(),
  icePacks: integer("ice_packs").default(4).notNull(),
  chalkSticks: integer("chalk_sticks").default(6).notNull(),
  tallySheets: integer("tally_sheets").default(2).notNull(),
  distanceKm: decimal("distance_km", { precision: 8, scale: 2 }),
  transportType: varchar("transport_type", { length: 50 }), // road, walking, boat, air
  fuelLiters: decimal("fuel_liters", { precision: 8, scale: 2 }).default("0.00").notNull(),
  actualVaccinated: integer("actual_vaccinated"),
  actualVialsUsed: integer("actual_vials_used"),
  actualVialsWasted: integer("actual_vials_wasted"),
  executionStatus: varchar("execution_status", { length: 50 }).default("planned"),
  executionNotes: text("execution_notes"),
  executedAt: timestamp("executed_at"),
  teamCount: integer("team_count").default(1),
  vaccinatorsCount: integer("vaccinators_count").default(1),
  volunteersCount: integer("volunteers_count").default(1),
  recordersCount: integer("recorders_count").default(0),
  supervisorsCount: integer("supervisors_count").default(0),
  // Named lead vaccinator for this session-day. Required by WHO core element 6
  // (Human Resources): every scheduled session-day must have a named accountable
  // vaccinator. Drives Step 5 ("Workforce & teaming") completion in the guided workflow.
  leadVaccinator: varchar("lead_vaccinator", { length: 255 }),
  indelibleMarkers: integer("indelible_markers").default(0),
  coldBoxes: integer("cold_boxes").default(0),
  // Sheet 3 — Vitamin A capsule types (per WHO SIA planning)
  // Blue capsules: 6-11 months (100,000 IU). Red capsules: 12-59 months (200,000 IU).
  vitaminABlueCaps: integer("vitamin_a_blue_caps").default(0).notNull(),
  vitaminARedCaps: integer("vitamin_a_red_caps").default(0).notNull(),
  // Sheet 3 — Scissors for OPV polio campaigns
  scissorsCount: integer("scissors_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("session_day_tenant_idx").on(table.tenantId),
  sessionPlanIdx: index("session_day_plan_idx").on(table.sessionPlanId),
}));

// ============================================================================
// STOCK TRANSACTIONS — WHO RED stock card transactions
// ============================================================================
export const stockTransactions = pgTable("stock_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  vaccineName: varchar("vaccine_name", { length: 100 }).notNull(), // BCG, Penta, etc.
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // 'receipt', 'issue', 'loss', 'adjustment'
  quantityDoses: integer("quantity_doses").notNull(),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  vvmStatus: integer("vvm_status").notNull(), // 1, 2, 3, 4
  supplierOrRecipient: varchar("supplier_or_recipient", { length: 255 }), // e.g. "National Store" or "Outreach Team A"
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  notes: text("notes"),
  recordedByUserId: varchar("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("stock_txn_tenant_idx").on(table.tenantId),
  facilityIdx: index("stock_txn_facility_idx").on(table.facilityId),
}));

// ============================================================================
// MONTHLY REPORTS — WHO RED monthly compiled facility report
// ============================================================================
export const monthlyReports = pgTable("monthly_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1 - 12
  year: integer("year").notNull(),
  immunizations: jsonb("immunizations").default({}).notNull(), // map of antigen/dose -> count, e.g. { BCG: 50, "Penta-1": 45 }
  stockSummary: jsonb("stock_summary").default({}).notNull(), // map of vaccine -> stock details (opening, received, administered, wasted, closing, wastageRate)
  surveillance: jsonb("surveillance").default({}).notNull(), // cases count, e.g. { measles: 0, afp: 1, nnt: 0, aefi: 1 }
  submittedById: varchar("submitted_by_id").references(() => users.id, { onDelete: "set null" }),
  approvalStatus: approvalStatusEnum("approval_status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("monthly_rep_tenant_idx").on(table.tenantId),
  facilityIdx: index("monthly_rep_facility_idx").on(table.facilityId),
}));

// ============================================================================
// NATIONAL SETTLEMENT MASTER REGISTRY & DETECTION ENGINE TABLES
// ============================================================================

export const settlementsMaster = pgTable(
  "settlements_master",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    placeType: varchar("place_type", { length: 100 }).notNull(), // village, hamlet, suburb, neighbourhood, locality, town
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    geojson: jsonb("geojson").notNull().default({}), // GeoJSON Point geometry
    provinceName: varchar("province_name", { length: 100 }),
    districtName: varchar("district_name", { length: 100 }),
    constituencyName: varchar("constituency_name", { length: 100 }),
    wardName: varchar("ward_name", { length: 100 }),
    healthCatchment: varchar("health_catchment", { length: 255 }), // linked health catchment area
    populationEstimate: integer("population_estimate").default(0).notNull(),
    under5Population: integer("under5_population").default(0).notNull(),
    buildingCount: integer("building_count").default(0).notNull(),
    source: varchar("source", { length: 100 }).default("osm").notNull(), // osm, grid3, manual_input
    sourceConfidence: decimal("source_confidence", { precision: 5, scale: 2 }).default("0.90").notNull(),
    nearestHealthFacility: varchar("nearest_health_facility", { length: 255 }),
    distanceToFacilityKm: decimal("distance_to_facility_km", { precision: 8, scale: 2 }),
    estimatedTravelTime: integer("estimated_travel_time"), // minutes
    accessibilityScore: decimal("accessibility_score", { precision: 5, scale: 2 }), // 1.0 to 4.0
    hardToReach: boolean("hard_to_reach").default(false).notNull(),
    validationStatus: varchar("validation_status", { length: 50 }).default("approved").notNull(), // approved, pending
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_settlements_tenant").on(table.tenantId),
    adminSearchIdx: index("idx_settlements_admin").on(table.tenantId, table.provinceName, table.districtName, table.wardName),
    statusIdx: index("idx_settlements_status").on(table.tenantId, table.validationStatus),
  })
);

export const populationGrids = pgTable(
  "population_grids",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    populationTotal: integer("population_total").notNull(),
    under5Population: integer("under5_population").default(0).notNull(),
    geojson: jsonb("geojson").notNull().default({}), // GeoJSON Polygon
    rasterCell: varchar("raster_cell", { length: 100 }), // Row/Col unique index
    densityClassification: varchar("density_classification", { length: 50 }), // Extreme, High, Medium, Low, Scattered
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_pop_grids_tenant").on(table.tenantId),
    densityIdx: index("idx_pop_grids_density").on(table.tenantId, table.densityClassification),
  })
);

export const candidateUnmappedSettlements = pgTable(
  "candidate_unmapped_settlements",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    geojson: jsonb("geojson").notNull().default({}), // GeoJSON Point
    estimatedPopulation: integer("estimated_population").default(0).notNull(),
    buildingCount: integer("building_count").default(0).notNull(),
    nearestNamedSettlement: varchar("nearest_named_settlement", { length: 255 }),
    nearestFacility: varchar("nearest_facility", { length: 255 }),
    distanceToFacility: decimal("distance_to_facility", { precision: 8, scale: 2 }),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).default("0.75").notNull(),
    validationStatus: varchar("validation_status", { length: 50 }).default("pending").notNull(), // pending, validated, rejected
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_candidates_tenant").on(table.tenantId),
    statusIdx: index("idx_candidates_status").on(table.tenantId, table.validationStatus),
  })
);

// ============================================================================
// IMPORTED COVERAGE — Inbound DHIS2 / CSV immunization data for missed-community analysis
// ============================================================================

export const importedCoverage = pgTable(
  "imported_coverage",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 10 }).notNull(), // "YYYYMM"
    antigen: varchar("antigen", { length: 50 }).notNull(),
    dosesAdministered: integer("doses_administered").notNull().default(0),
    targetPopOverride: integer("target_pop_override"),
    source: varchar("source", { length: 20 }).notNull(), // "dhis2" | "csv"
    sourceRef: varchar("source_ref", { length: 255 }), // csvImportId or dhis2 integrationId
    importedByUserId: varchar("imported_by_user_id").references(() => users.id, { onDelete: "set null" }),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_imported_coverage_tenant").on(table.tenantId),
    facilityIdx: index("idx_imported_coverage_facility").on(table.tenantId, table.facilityId, table.period),
    uniqRow: unique("imported_coverage_unique").on(
      table.tenantId,
      table.facilityId,
      table.period,
      table.antigen,
      table.source,
    ),
  }),
);

export const csvImports = pgTable(
  "csv_imports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    rowCount: integer("row_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("preview"), // preview | committed | failed
    errorReport: jsonb("error_report").default([]).notNull(), // [{row, field, message}]
    uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_csv_imports_tenant").on(table.tenantId),
  }),
);

// ============================================================================
// VPD SURVEILLANCE MODULE
// ============================================================================

export const vpdDiseasesEnum = pgEnum("vpd_diseases", [
  "afp",
  "measles",
  "nnt",
  "yellow_fever",
  "cholera",
  "covid19",
  "other"
]);

export const caseClassificationEnum = pgEnum("case_classification", [
  "suspected",
  "probable",
  "confirmed",
  "discarded"
]);

export const vpdLinelistTemplates = pgTable(
  "vpd_linelist_templates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    disease: vpdDiseasesEnum("disease").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    fields: jsonb("fields").default([]).notNull(), // Custom form fields definition
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_vpd_linelist_template_tenant").on(table.tenantId),
  }),
);

export const tenantVpdConfigurations = pgTable(
  "tenant_vpd_configurations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    disease: vpdDiseasesEnum("disease").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    targetIncidenceRate: decimal("target_incidence_rate", { precision: 8, scale: 2 }), // per 100k
    alertThreshold: integer("alert_threshold").default(1),
    notifyRoles: jsonb("notify_roles").default(["district_manager", "provincial_coordinator"]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_tenant_vpd_config_tenant").on(table.tenantId),
    uniqTenantDisease: unique("uq_tenant_vpd_config_disease").on(table.tenantId, table.disease),
  }),
);

export const surveillanceCases = pgTable(
  "surveillance_cases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    villageId: integer("village_id").references(() => villages.id, { onDelete: "set null" }),
    clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }), // Optional link to existing client
    disease: vpdDiseasesEnum("disease").notNull(),
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientAgeMonths: integer("patient_age_months"),
    patientGender: varchar("patient_gender", { length: 20 }),
    dateOfOnset: timestamp("date_of_onset").notNull(),
    dateReported: timestamp("date_reported").defaultNow().notNull(),
    classification: caseClassificationEnum("classification").default("suspected").notNull(),
    investigatorUserId: varchar("investigator_user_id").references(() => users.id, { onDelete: "set null" }),
    investigationDate: timestamp("investigation_date"),
    clinicalNotes: text("clinical_notes"),
    gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
    gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
    status: varchar("status", { length: 50 }).default("open").notNull(), // open, under_investigation, closed
    templateId: integer("template_id").references(() => vpdLinelistTemplates.id, { onDelete: "set null" }),
    formData: jsonb("form_data").default({}).notNull(), // Custom fields answers
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_surveillance_cases_tenant").on(table.tenantId),
    facilityIdx: index("idx_surveillance_cases_facility").on(table.facilityId),
    diseaseIdx: index("idx_surveillance_cases_disease").on(table.tenantId, table.disease),
  }),
);

export const labSamples = pgTable(
  "lab_samples",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: varchar("case_id")
      .notNull()
      .references(() => surveillanceCases.id, { onDelete: "cascade" }),
    sampleType: varchar("sample_type", { length: 100 }).notNull(), // Stool, Blood, Swab
    dateCollected: timestamp("date_collected").notNull(),
    dateSent: timestamp("date_sent"),
    dateReceived: timestamp("date_received"),
    dateResults: timestamp("date_results"),
    result: varchar("result", { length: 100 }), // positive, negative, inconclusive, pending
    labName: varchar("lab_name", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    caseIdx: index("idx_lab_samples_case").on(table.caseId),
  }),
);

// Supportive Supervision (WHO RED Step 10).
// A supervisory visit is scheduled per facility, optionally tied to a microplan
// and/or a specific session day. The checklist is captured as a JSON array of
// {key, label, response: "yes"|"no"|"na", note?: string} items so a tenant can
// evolve checklists without a schema change.
export const supervisionVisits = pgTable(
  "supervision_visits",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    microplanId: integer("microplan_id").references(() => microplans.id, { onDelete: "set null" }),
    sessionPlanId: integer("session_plan_id").references(() => sessionPlans.id, { onDelete: "set null" }),
    scheduledDate: timestamp("scheduled_date").notNull(),
    conductedDate: timestamp("conducted_date"),
    supervisorUserId: varchar("supervisor_user_id").references(() => users.id, { onDelete: "set null" }),
    supervisorName: varchar("supervisor_name", { length: 255 }),
    visitType: varchar("visit_type", { length: 40 }).notNull().default("routine"), // routine | followup | adhoc | campaign
    status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | conducted | cancelled | missed
    templateId: integer("template_id"), // optional configurable checklist template used for this visit
    checklist: jsonb("checklist").default([]).notNull(),
    score: integer("score"), // 0-100 derived from checklist
    gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 6 }), // captured visit GPS
    gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 6 }),
    findings: text("findings"),
    followUpActions: text("follow_up_actions"),
    nextVisitDate: timestamp("next_visit_date"),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_supervision_tenant").on(table.tenantId),
    facilityIdx: index("idx_supervision_facility").on(table.tenantId, table.facilityId),
    scheduledIdx: index("idx_supervision_scheduled").on(table.tenantId, table.scheduledDate),
  }),
);

// Configurable supervision checklist templates. National admins author these and
// publish them (isActive=true) so every lower level in the tenant can pick one
// when scheduling/conducting a supervisory visit. The questions are stored as a
// JSON array of items (see ChecklistTemplateItem in shared/supervisionChecklist.ts)
// so admins can add varied question types without a schema change.
export const supervisionChecklistTemplates = pgTable(
  "supervision_checklist_templates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull().default("supervision"),
    description: text("description"),
    items: jsonb("items").default([]).notNull(), // ChecklistTemplateItem[]
    isActive: boolean("is_active").notNull().default(true), // published & usable by lower levels
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_supervision_template_tenant").on(table.tenantId),
  }),
);

export const insertSupervisionChecklistTemplateSchema = createInsertSchema(supervisionChecklistTemplates).omit({
  tenantId: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as any).extend({
  isActive: z.boolean().optional(),
});
export type InsertSupervisionChecklistTemplate = z.infer<typeof insertSupervisionChecklistTemplateSchema>;
export type SupervisionChecklistTemplate = typeof supervisionChecklistTemplates.$inferSelect;

// Annual national immunization plan (NIMP / cMYP). One row per (tenant, year).
// Owned by national_admin / platform_admin. HF microplans inherit targets and
// budget envelope from it.
export const annualImmunizationPlans = pgTable(
  "annual_immunization_plans",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | submitted | approved | superseded
    totalTargetPopulation: integer("total_target_population"),
    survivingInfants: integer("surviving_infants"),
    pregnantWomen: integer("pregnant_women"),
    budgetEnvelope: decimal("budget_envelope", { precision: 14, scale: 2 }),
    fundingMix: jsonb("funding_mix").default({}), // { government: pct, gavi: pct, who: pct, unicef: pct, other: pct }
    priorities: text("priorities"), // narrative — top strategic priorities for the year
    targetsByAntigen: jsonb("targets_by_antigen").default({}), // { BCG: pct, DTP3: pct, MCV1: pct, ... }
    narrative: text("narrative"), // long-form plan text / link to PDF
    approvedAt: timestamp("approved_at"),
    approvedByUserId: varchar("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_annual_plan_tenant").on(table.tenantId),
    yearIdx: index("idx_annual_plan_tenant_year").on(table.tenantId, table.year),
  }),
);

export const insertAnnualImmunizationPlanSchema = createInsertSchema(annualImmunizationPlans).omit({
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});
export type AnnualImmunizationPlan = typeof annualImmunizationPlans.$inferSelect;
export type InsertAnnualImmunizationPlan = z.infer<typeof insertAnnualImmunizationPlanSchema>;

// Quarterly review notes (RED 4 / RED-Q Measure — Step 12).
// A facility (or higher-level user acting on its behalf) records what action
// is being taken on dropout / zero-dose / defaulters each quarter: the top
// drivers, the corrective actions planned, and when the next coverage survey
// will run. One row per (tenant, facility, year, quarter) — re-saves update
// the same row so the latest note is always the current quarter's plan.
export const quarterlyReviews = pgTable(
  "quarterly_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    facilityId: integer("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    topDrivers: jsonb("top_drivers").default([]).notNull(),
    correctiveActions: text("corrective_actions").notNull(),
    nextSurveyDate: timestamp("next_survey_date"),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedByUserId: varchar("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_quarterly_reviews_tenant").on(table.tenantId),
    facilityIdx: index("idx_quarterly_reviews_facility").on(table.tenantId, table.facilityId),
    uqFacilityPeriod: unique("uq_quarterly_reviews_facility_period").on(
      table.tenantId, table.facilityId, table.year, table.quarter,
    ),
  }),
);

// ============================================================================
// RELATIONS
// ============================================================================

export const adminBoundariesRelations = relations(adminBoundaries, ({ one }) => ({
  tenant: one(tenants, { fields: [adminBoundaries.tenantId], references: [tenants.id] }),
}));

export const customLayersRelations = relations(customLayers, ({ one }) => ({
  tenant: one(tenants, { fields: [customLayers.tenantId], references: [tenants.id] }),
  uploadedBy: one(users, { fields: [customLayers.uploadedByUserId], references: [users.id] }),
}));

export const facilityCatchmentsRelations = relations(facilityCatchments, ({ one }) => ({
  tenant: one(tenants, { fields: [facilityCatchments.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [facilityCatchments.facilityId], references: [facilities.id] }),
  drawnBy: one(users, { fields: [facilityCatchments.drawnByUserId], references: [users.id] }),
}));

export const vaccineConfigurationsRelations = relations(vaccineConfigurations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [vaccineConfigurations.tenantId], references: [tenants.id] }),
  clientVaccinations: many(clientVaccinations),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [clients.facilityId], references: [facilities.id] }),
  village: one(villages, { fields: [clients.villageId], references: [villages.id] }),
  vaccinations: many(clientVaccinations),
}));

export const clientVaccinationsRelations = relations(clientVaccinations, ({ one }) => ({
  tenant: one(tenants, { fields: [clientVaccinations.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [clientVaccinations.clientId], references: [clients.id] }),
  vaccineConfig: one(vaccineConfigurations, { fields: [clientVaccinations.vaccineConfigId], references: [vaccineConfigurations.id] }),
  administeredBy: one(users, { fields: [clientVaccinations.administeredByUserId], references: [users.id] }),
}));

export const sessionDayPlansRelations = relations(sessionDayPlans, ({ one }) => ({
  tenant: one(tenants, { fields: [sessionDayPlans.tenantId], references: [tenants.id] }),
  sessionPlan: one(sessionPlans, { fields: [sessionDayPlans.sessionPlanId], references: [sessionPlans.id] }),
}));

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
  tenant: one(tenants, { fields: [stockTransactions.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [stockTransactions.facilityId], references: [facilities.id] }),
  recordedBy: one(users, { fields: [stockTransactions.recordedByUserId], references: [users.id] }),
}));

export const monthlyReportsRelations = relations(monthlyReports, ({ one }) => ({
  tenant: one(tenants, { fields: [monthlyReports.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [monthlyReports.facilityId], references: [facilities.id] }),
  submittedBy: one(users, { fields: [monthlyReports.submittedById], references: [users.id] }),
}));

export const settlementsMasterRelations = relations(settlementsMaster, ({ one }) => ({
  tenant: one(tenants, { fields: [settlementsMaster.tenantId], references: [tenants.id] }),
}));

export const populationGridsRelations = relations(populationGrids, ({ one }) => ({
  tenant: one(tenants, { fields: [populationGrids.tenantId], references: [tenants.id] }),
}));

export const candidateUnmappedSettlementsRelations = relations(candidateUnmappedSettlements, ({ one }) => ({
  tenant: one(tenants, { fields: [candidateUnmappedSettlements.tenantId], references: [tenants.id] }),
}));

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertAdminBoundarySchema = createInsertSchema(adminBoundaries).omit({
  id: true,
  fetchedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilityCatchmentSchema = createInsertSchema(facilityCatchments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomLayerSchema = createInsertSchema(customLayers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVaccineConfigSchema = createInsertSchema(vaccineConfigurations).omit({
  tenantId: true,
  createdAt: true,
});

/*
// Original insertClientSchema preserved for reference
export const insertClientSchema = createInsertSchema(clients).omit({
  createdAt: true,
  updatedAt: true,
});
*/

// Updated insertClientSchema: villageId is made optional/nullable in frontend inputs,
// Original insertClientSchema, insertClientVaccinationSchema, insertSessionDayPlanSchema, and insertStockTransactionSchema preserved:
/*
export const insertClientSchema = createInsertSchema(clients).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  villageId: z.number().optional().nullable(),
});

export const insertClientVaccinationSchema = createInsertSchema(clientVaccinations).omit({
  createdAt: true,
});

export const insertSessionDayPlanSchema = createInsertSchema(sessionDayPlans).omit({
  createdAt: true,
});

export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({
  createdAt: true,
});
*/

// Updated insert schemas: Date columns are explicitly coerced using z.coerce.date()
// because JSON serialization converts Date objects to ISO strings, causing server-side
// Zod validation to fail if strict z.date() expectations are kept.
export const insertClientSchema = createInsertSchema(clients).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  villageId: z.number().optional().nullable(),
  dateOfBirth: z.coerce.date(),
});

export const insertClientVaccinationSchema = createInsertSchema(clientVaccinations).omit({
  createdAt: true,
}).extend({
  administeredDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const insertSessionDayPlanSchema = createInsertSchema(sessionDayPlans).omit({
  tenantId: true,
  createdAt: true,
}).extend({
  sessionDate: z.coerce.date(),
  executedAt: z.coerce.date().optional().nullable(),
});

export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({
  createdAt: true,
}).extend({
  expiryDate: z.coerce.date(),
  transactionDate: z.coerce.date().optional(),
});


export const insertMonthlyReportSchema = createInsertSchema(monthlyReports).omit({
  createdAt: true,
});

export const insertSettlementMasterSchema = createInsertSchema(settlementsMaster).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPopulationGridSchema = createInsertSchema(populationGrids).omit({
  createdAt: true,
});

export const insertCandidateUnmappedSettlementSchema = createInsertSchema(candidateUnmappedSettlements).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertImportedCoverageSchema = createInsertSchema(importedCoverage).omit({
  importedAt: true,
});

export const insertCsvImportSchema = createInsertSchema(csvImports).omit({
  uploadedAt: true,
});

// Standard CSV row shape for immunization coverage imports.
// Required columns: facility_external_id, period (YYYYMM or YYYY-MM), antigen, doses_administered
// Optional: target_pop_override
export const coverageCsvRowSchema = z.object({
  facility_external_id: z.string().min(1, "facility_external_id required"),
  period: z
    .string()
    .regex(/^\d{4}-?\d{2}$/, 'period must be "YYYYMM" or "YYYY-MM"')
    .transform((p) => p.replace("-", "")),
  antigen: z.string().min(1, "antigen required").transform((a) => a.trim().toUpperCase()),
  doses_administered: z.coerce.number().int().nonnegative(),
  target_pop_override: z.coerce.number().int().nonnegative().optional().nullable(),
});

export type CoverageCsvRow = z.infer<typeof coverageCsvRowSchema>;

// ============================================================================
// INSERT SCHEMAS — existing domain tables (restored)
// ============================================================================

export const insertMobilizationActivitySchema = createInsertSchema(mobilizationActivities).omit({
  createdAt: true,
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  submittedAt: true,
  resolvedAt: true,
});

export const insertTenantInterestRequestSchema = createInsertSchema(tenantInterestRequests).omit({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  requestedRole: z.enum(SELF_SIGNUP_ROLES),
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(255),
  countryCode: z.string().length(3).regex(/^[A-Z]{3}$/, "ISO-3 country code"),
  countryName: z.string().min(2).max(255),
  organization: z.string().max(255).optional().nullable(),
  justification: z.string().max(2000).optional().nullable(),
});

// ============================================================================
// TYPES — all exported types (existing + new)
// ============================================================================

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenantIdpConfig = z.infer<typeof insertTenantIdpConfigSchema>;
export type TenantIdpConfig = typeof tenantIdpConfigs.$inferSelect;
export type InsertSignupRequest = z.infer<typeof insertSignupRequestSchema>;
export type SignupRequest = typeof signupRequests.$inferSelect;
export type InsertTenantInterestRequest = z.infer<typeof insertTenantInterestRequestSchema>;
export type TenantInterestRequest = typeof tenantInterestRequests.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;
export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type Province = typeof provinces.$inferSelect;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districts.$inferSelect;
export type InsertLlg = z.infer<typeof insertLlgSchema>;
export type Llg = typeof llgs.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;
export type InsertVillage = z.infer<typeof insertVillageSchema>;
/* Original Code:
export type Village = typeof villages.$inferSelect;
*/
export type Village = typeof villages.$inferSelect & {
  population?: number | null;
};
export type InsertPopulationData = z.infer<typeof insertPopulationDataSchema>;
export type PopulationData = typeof populationData.$inferSelect;
export type InsertSessionPlan = z.infer<typeof insertSessionPlanSchema>;
export type SessionPlan = typeof sessionPlans.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertVaccineRequirement = z.infer<typeof insertVaccineRequirementSchema>;
export type VaccineRequirement = typeof vaccineRequirements.$inferSelect;
export type InsertMobilizationActivity = z.infer<typeof insertMobilizationActivitySchema>;
export type MobilizationActivity = typeof mobilizationActivities.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export const insertSupervisionVisitSchema = createInsertSchema(supervisionVisits).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupervisionVisit = z.infer<typeof insertSupervisionVisitSchema>;
export type SupervisionVisit = typeof supervisionVisits.$inferSelect;

export const insertQuarterlyReviewSchema = createInsertSchema(quarterlyReviews).omit({
  tenantId: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  facilityId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  quarter: z.number().int().min(1).max(4),
  topDrivers: z.array(z.string().trim().min(1).max(255)).min(1).max(3),
  correctiveActions: z.string().trim().min(5).max(4000),
  nextSurveyDate: z.union([z.string(), z.date()]).nullable().optional(),
});
export type InsertQuarterlyReview = z.infer<typeof insertQuarterlyReviewSchema>;
export type QuarterlyReview = typeof quarterlyReviews.$inferSelect;
export type PopulationRefreshJob = typeof populationRefreshJobs.$inferSelect;
export type InsertPopulationRefreshJob = typeof populationRefreshJobs.$inferInsert;
export type HtrScore = typeof htrScores.$inferSelect;

// New boundary and catchment types
export type AdminBoundary = typeof adminBoundaries.$inferSelect;
export type InsertAdminBoundary = z.infer<typeof insertAdminBoundarySchema>;
export type FacilityCatchment = typeof facilityCatchments.$inferSelect;
export type InsertFacilityCatchment = z.infer<typeof insertFacilityCatchmentSchema>;
export type CustomLayer = typeof customLayers.$inferSelect;
export type InsertCustomLayer = z.infer<typeof insertCustomLayerSchema>;

// New WHO RED & UNICEF types
export type VaccineConfig = typeof vaccineConfigurations.$inferSelect;
export type InsertVaccineConfig = z.infer<typeof insertVaccineConfigSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientVaccination = typeof clientVaccinations.$inferSelect;
export type InsertClientVaccination = z.infer<typeof insertClientVaccinationSchema>;
export type SessionDayPlan = typeof sessionDayPlans.$inferSelect;
export type InsertSessionDayPlan = z.infer<typeof insertSessionDayPlanSchema>;
export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;
export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type InsertMonthlyReport = z.infer<typeof insertMonthlyReportSchema>;

// Settlement Master Intelligence types
export type SettlementMaster = typeof settlementsMaster.$inferSelect;
export type InsertSettlementMaster = z.infer<typeof insertSettlementMasterSchema>;
export type PopulationGrid = typeof populationGrids.$inferSelect;
export type InsertPopulationGrid = z.infer<typeof insertPopulationGridSchema>;
export type CandidateUnmappedSettlement = typeof candidateUnmappedSettlements.$inferSelect;
export type InsertCandidateUnmappedSettlement = z.infer<typeof insertCandidateUnmappedSettlementSchema>;

// Inbound coverage import types (Task #40)
export type ImportedCoverage = typeof importedCoverage.$inferSelect;
export type InsertImportedCoverage = z.infer<typeof insertImportedCoverageSchema>;
export type CsvImport = typeof csvImports.$inferSelect;
export type InsertCsvImport = z.infer<typeof insertCsvImportSchema>;

// ============================================================================
// NOTIFICATIONS — In-app digests (e.g. stock alerts)
// ============================================================================
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    data: jsonb("data").default({}).notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user_unread").on(table.userId, table.readAt),
    index("idx_notifications_tenant").on(table.tenantId),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Stock-alert digest tenant settings shape (lives inside tenants.settings.stockAlertDigest).
export type StockAlertDigestFrequency = "daily" | "weekly";
export interface StockAlertDigestSettings {
  enabled: boolean;
  frequency: StockAlertDigestFrequency;
  thresholdMonths: number;
  // Optional recipient role override. Defaults to ["facility_clerk", "facility_in_charge"].
  recipientRoles?: string[];
}
export const DEFAULT_STOCK_ALERT_DIGEST: StockAlertDigestSettings = {
  enabled: true,
  frequency: "weekly",
  thresholdMonths: 1,
  recipientRoles: ["facility_clerk", "facility_in_charge"],
};
export const stockAlertDigestSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly"]),
  thresholdMonths: z.number().positive(),
  recipientRoles: z.array(z.string()).optional(),
});

export interface TenantSecuritySettings {
  idleTimeoutMinutes?: number;
}
export const tenantSecuritySettingsSchema = z.object({
  idleTimeoutMinutes: z.number().min(1).max(1440).optional(),
});

// Per-tenant email sender settings (lives inside tenants.settings.email).
// Read by server/services/mailer.ts to send notifications from the tenant's
// own verified domain. See docs/email-setup.md for the SPF/DKIM setup.
export interface TenantEmailSettings {
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}
const emailOrEmpty = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Must be a valid email address",
  });
export const tenantEmailSettingsSchema = z.object({
  fromAddress: emailOrEmpty.optional(),
  fromName: z.string().trim().max(120).optional(),
  replyTo: emailOrEmpty.optional(),
});

// ─── Catchment conflict (overlap harmonization) ──────────────────────────────
export const insertCatchmentConflictSchema = createInsertSchema(catchmentConflicts).omit({
  createdAt: true,
  resolvedAt: true,
});
export type CatchmentConflict = typeof catchmentConflicts.$inferSelect;
export type InsertCatchmentConflict = z.infer<typeof insertCatchmentConflictSchema>;

// Roles allowed to create a *facility* (and its catchment). Facility staff and
// district managers may create *communities* but NOT facilities — these roles
// are the only ones permitted to author a facility, enforced both in the UI and
// on the server (POST /api/facilities returns 403 for everyone else). Shared so
// the client and server agree (never import server/* into the client — task #261).
export const FACILITY_AUTHOR_ROLES = [
  "provincial_coordinator",
  "national_admin",
  "gis_specialist",
] as const;

// ─── Indicator Manual Schema ──────────────────────────────
/*
// Original indicatorManual pgTable commented out to satisfy rule 1
export const indicatorManual = pgTable(
  "indicator_manual",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 255 }).notNull(),
    subCategory: varchar("sub_category", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    numerator: text("numerator").notNull(),
    denominator: text("denominator").notNull(),
    source: text("source").notNull(),
    calculation: text("calculation").notNull(),
    reference: text("reference"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_indicator_manual_tenant").on(table.tenantId),
  ],
);
*/

export const indicatorManual = pgTable(
  "indicator_manual",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 255 }).notNull(),
    subCategory: varchar("sub_category", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    numerator: text("numerator").notNull(),
    numeratorSource: text("numerator_source").notNull(),
    denominator: text("denominator").notNull(),
    denominatorSource: text("denominator_source").notNull(),
    calculation: text("calculation").notNull(),
    calculationExample: text("calculation_example").notNull(),
    reference: text("reference"),
    referenceUrl: text("reference_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_indicator_manual_tenant").on(table.tenantId),
  ],
);

export const insertIndicatorManualSchema = createInsertSchema(indicatorManual).omit({
  createdAt: true,
  updatedAt: true,
});

export type IndicatorManualEntry = typeof indicatorManual.$inferSelect;
export type InsertIndicatorManualEntry = z.infer<typeof insertIndicatorManualSchema>;

// ============================================================================
// UNIFIED COMMUNICATION ENGINE (UCE)
// ============================================================================

export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  eventId: varchar("event_id"), 
  recipientId: varchar("recipient_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  messageType: varchar("message_type", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communicationChannels = pgTable("communication_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").notNull().references(() => communications.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull(),
  attempted: boolean("attempted").default(false).notNull(),
  delivered: boolean("delivered").default(false).notNull(),
  responseCode: varchar("response_code", { length: 100 }),
  deliveryTime: timestamp("delivery_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deliveryLogs = pgTable("delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").notNull().references(() => communications.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  response: text("response"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const communicationLogs = pgTable("communication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  channel: text("channel").notNull(), // 'whatsapp', 'sms', 'email'
  destination: text("destination").notNull(),
  status: text("status").notNull(), // 'delivered', 'failed', 'queued'
  providerResponse: text("provider_response"),
  fallbackTriggered: boolean("fallback_triggered").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// NEW TYPES EXPORTS
// ============================================================================

export type VpdLinelistTemplate = typeof vpdLinelistTemplates.$inferSelect;
export const insertVpdLinelistTemplateSchema = createInsertSchema(vpdLinelistTemplates).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertVpdLinelistTemplate = z.infer<typeof insertVpdLinelistTemplateSchema>;

export type TenantVpdConfiguration = typeof tenantVpdConfigurations.$inferSelect;
export const insertTenantVpdConfigurationSchema = createInsertSchema(tenantVpdConfigurations).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertTenantVpdConfiguration = z.infer<typeof insertTenantVpdConfigurationSchema>;

export type SurveillanceCase = typeof surveillanceCases.$inferSelect;
export const insertSurveillanceCaseSchema = createInsertSchema(surveillanceCases).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  dateOfOnset: z.coerce.date(),
  dateReported: z.coerce.date().optional(),
});
export type InsertSurveillanceCase = z.infer<typeof insertSurveillanceCaseSchema>;

export type LabSample = typeof labSamples.$inferSelect;
export const insertLabSampleSchema = createInsertSchema(labSamples).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  dateCollected: z.coerce.date(),
  dateSent: z.coerce.date().optional().nullable(),
  dateReceived: z.coerce.date().optional().nullable(),
  dateResults: z.coerce.date().optional().nullable(),
});
export type InsertLabSample = z.infer<typeof insertLabSampleSchema>;


// ============================================================================
// FACILITY STAFF RELATIONS & SCHEMAS
// ============================================================================
export const facilityStaffRelations = relations(facilityStaff, ({ one }) => ({
  tenant: one(tenants, { fields: [facilityStaff.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [facilityStaff.facilityId], references: [facilities.id] }),
}));

export const insertFacilityStaffSchema = createInsertSchema(facilityStaff).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFacilityStaff = z.infer<typeof insertFacilityStaffSchema>;
export type FacilityStaff = typeof facilityStaff.$inferSelect;

// ============================================================================
// HFC COMMITTEE — Health Facility Committee (Sheet 9)
// Community governance structure overseeing the facility and campaigns.
// ============================================================================
export const hfcCommittee = pgTable("hfc_committee", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  memberName: varchar("member_name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 20 }),             // male | female | other
  position: varchar("position", { length: 100 }),        // Chairperson, Secretary, Treasurer, Member
  yearsOfService: integer("years_of_service"),
  isChairperson: boolean("is_chairperson").default(false).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  committeeEstablishedDate: varchar("committee_established_date", { length: 20 }), // ISO date string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hfc_committee_tenant").on(table.tenantId),
  index("idx_hfc_committee_facility").on(table.facilityId),
]);

export const hfcCommitteeRelations = relations(hfcCommittee, ({ one }) => ({
  tenant: one(tenants, { fields: [hfcCommittee.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [hfcCommittee.facilityId], references: [facilities.id] }),
}));

export const insertHfcCommitteeSchema = createInsertSchema(hfcCommittee).omit({
  createdAt: true,
  updatedAt: true,
});
export type CampaignHfcCommitteeMember = typeof hfcCommittee.$inferSelect;
export type InsertCampaignHfcCommitteeMember = z.infer<typeof insertHfcCommitteeSchema>;

// ============================================================================
// COMMUNITY HEALTH VOLUNTEERS — CHV Profile Register (Sheet 10)
// Distinct from facility staff — these are community-based volunteers
// who assist with social mobilization, guidance, recording, and vaccination.
// ============================================================================
export const communityHealthVolunteers = pgTable("community_health_volunteers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
  villageId: integer("village_id").references(() => villages.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 20 }),
  yearsOfService: integer("years_of_service"),
  educationLevel: varchar("education_level", { length: 100 }),  // Primary, Secondary, Certificate, Diploma, Degree
  trainingStatus: varchar("training_status", { length: 50 }).default("untrained"), // trained | untrained
  communityUnit: varchar("community_unit", { length: 255 }),  // The community health unit they belong to
  campaignRole: varchar("campaign_role", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chv_tenant").on(table.tenantId),
  index("idx_chv_facility").on(table.facilityId),
]);

export const communityHealthVolunteersRelations = relations(communityHealthVolunteers, ({ one }) => ({
  tenant: one(tenants, { fields: [communityHealthVolunteers.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [communityHealthVolunteers.facilityId], references: [facilities.id] }),
  village: one(villages, { fields: [communityHealthVolunteers.villageId], references: [villages.id] }),
}));

export const insertCommunityHealthVolunteerSchema = createInsertSchema(communityHealthVolunteers).omit({
  createdAt: true,
  updatedAt: true,
});
export type CampaignCommunityHealthVolunteer = typeof communityHealthVolunteers.$inferSelect;
export type InsertCampaignCommunityHealthVolunteer = z.infer<typeof insertCommunityHealthVolunteerSchema>;

// ─── Governance & Human Resources insert schemas + types ─────────────────────
export const insertHfcCommitteeMemberSchema = createInsertSchema(hfcCommitteeMembers).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHfcCommitteeMember = z.infer<typeof insertHfcCommitteeMemberSchema>;
export type HfcCommitteeMember = typeof hfcCommitteeMembers.$inferSelect;

export const insertChvProfileSchema = createInsertSchema(chvProfiles).omit({
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChvProfile = z.infer<typeof insertChvProfileSchema>;
export type ChvProfile = typeof chvProfiles.$inferSelect;

export const insertUncoveredCommunitySchema = createInsertSchema(uncoveredCommunities).omit({
  tenantId: true,
  flaggedAt: true,
  resolvedAt: true,
});
export type InsertUncoveredCommunity = z.infer<typeof insertUncoveredCommunitySchema>;
export type UncoveredCommunity = typeof uncoveredCommunities.$inferSelect;

// ============================================================================
// COLD CHAIN EQUIPMENT INVENTORY
// Documents ALL cold-chain equipment at each facility (WHO EIR-compatible).
// Can be imported from / exported to external IGA (Inventory & Gap Analysis)
// systems via the /api/facilities/:id/cold-chain/export endpoint.
// ============================================================================
export const coldChainEquipment = pgTable("cold_chain_equipment", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),

  // Equipment classification
  equipmentType: varchar("equipment_type", { length: 60 }).notNull(),
  // refrigerator | freezer | icm | cold_box | vaccine_carrier | generator | temperature_logger | other

  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  catalogNumber: varchar("catalog_number", { length: 100 }), // WHO PIS catalog ref

  // Physical specs
  capacityLiters: decimal("capacity_liters", { precision: 8, scale: 2 }),
  netStorageCapacityLiters: decimal("net_storage_capacity_liters", { precision: 8, scale: 2 }),
  temperatureMin: decimal("temperature_min", { precision: 5, scale: 1 }), // °C
  temperatureMax: decimal("temperature_max", { precision: 5, scale: 1 }), // °C

  // Power & energy
  powerSource: varchar("power_source", { length: 40 }),
  // solar | electric | gas | kerosene | battery | solar_dc | none
  energyConsumptionKwhDay: decimal("energy_consumption_kwh_day", { precision: 6, scale: 2 }),

  // Provenance & lifecycle
  manufactureYear: integer("manufacture_year"),
  installationDate: varchar("installation_date", { length: 20 }), // ISO date string YYYY-MM-DD
  purchaseCost: decimal("purchase_cost", { precision: 14, scale: 2 }),
  purchaseCurrency: varchar("purchase_currency", { length: 5 }).default("USD"),
  warrantyExpiry: varchar("warranty_expiry", { length: 20 }),
  supplier: varchar("supplier", { length: 255 }),
  donorFunded: boolean("donor_funded").default(false),
  fundingSource: varchar("funding_source", { length: 100 }),

  // Maintenance & condition
  condition: varchar("condition", { length: 30 }).notNull().default("functional"),
  // functional | needs_repair | non_functional | condemned | decommissioned
  lastServiceDate: varchar("last_service_date", { length: 20 }),
  nextServiceDue: varchar("next_service_due", { length: 20 }),
  lastTemperatureCheck: varchar("last_temperature_check", { length: 20 }),
  maintenanceNotes: text("maintenance_notes"),

  // Flags & metadata
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  externalId: varchar("external_id", { length: 100 }), // for IGA system round-trip matching

  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cce_tenant").on(table.tenantId),
  index("idx_cce_facility").on(table.facilityId),
  index("idx_cce_condition").on(table.tenantId, table.condition),
]);

export const coldChainEquipmentRelations = relations(coldChainEquipment, ({ one }) => ({
  tenant: one(tenants, { fields: [coldChainEquipment.tenantId], references: [tenants.id] }),
  facility: one(facilities, { fields: [coldChainEquipment.facilityId], references: [facilities.id] }),
  createdBy: one(users, { fields: [coldChainEquipment.createdByUserId], references: [users.id] }),
}));

export const insertColdChainEquipmentSchema = createInsertSchema(coldChainEquipment).omit({
  tenantId: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  equipmentType: z.enum([
    "refrigerator", "freezer", "icm", "cold_box", "vaccine_carrier",
    "generator", "temperature_logger", "other",
  ]),
  condition: z.enum([
    "functional", "needs_repair", "non_functional", "condemned", "decommissioned",
  ]).default("functional"),
  powerSource: z.enum([
    "solar", "electric", "gas", "kerosene", "battery", "solar_dc", "none",
  ]).optional().nullable(),
  capacityLiters: z.coerce.number().positive().optional().nullable(),
  netStorageCapacityLiters: z.coerce.number().positive().optional().nullable(),
  temperatureMin: z.coerce.number().optional().nullable(),
  temperatureMax: z.coerce.number().optional().nullable(),
  manufactureYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  purchaseCost: z.coerce.number().nonnegative().optional().nullable(),
  energyConsumptionKwhDay: z.coerce.number().nonnegative().optional().nullable(),
  donorFunded: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type ColdChainEquipment = typeof coldChainEquipment.$inferSelect;
export type InsertColdChainEquipment = z.infer<typeof insertColdChainEquipmentSchema>;
