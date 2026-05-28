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
export const userRoleEnum = pgEnum("user_role", [
  "facility_clerk",
  "facility_in_charge",
  "district_manager",
  "provincial_coordinator",
  "national_admin",
  "gis_specialist",
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

export const transportModeEnum = pgEnum("transport_mode", [
  "walking",
  "road",
  "boat",
  "air",
]);

export const populationSourceEnum = pgEnum("population_source", [
  "nso",
  "hmis",
  "worldpop",
  "survey",
  "community_census",
]);

// Sessions table for Replit Auth
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_villages_tenant").on(table.tenantId)]);

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
  campaignScope: varchar("campaign_scope", { length: 100 }), // National, Sub-national, Local
  targetPopulation: integer("target_population"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  // Structured staffing roster (WHO/UNICEF microplanning element 6 - Human Resources).
  // Array of { role, headcount, days, perDiem } rows. Free-form jsonb to keep the
  // schema flexible while the UI iterates.
  staffing: jsonb("staffing").default([]),
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
    checklist: jsonb("checklist").default([]).notNull(),
    score: integer("score"), // 0-100 derived from checklist
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

// ============================================================================
// RELATIONS
// ============================================================================

export const adminBoundariesRelations = relations(adminBoundaries, ({ one }) => ({
  tenant: one(tenants, { fields: [adminBoundaries.tenantId], references: [tenants.id] }),
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
  id: true,
  importedAt: true,
});

export const insertCsvImportSchema = createInsertSchema(csvImports).omit({
  id: true,
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
export type Village = typeof villages.$inferSelect;
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
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupervisionVisit = z.infer<typeof insertSupervisionVisitSchema>;
export type SupervisionVisit = typeof supervisionVisits.$inferSelect;
export type PopulationRefreshJob = typeof populationRefreshJobs.$inferSelect;
export type InsertPopulationRefreshJob = typeof populationRefreshJobs.$inferInsert;
export type HtrScore = typeof htrScores.$inferSelect;

// New boundary and catchment types
export type AdminBoundary = typeof adminBoundaries.$inferSelect;
export type InsertAdminBoundary = z.infer<typeof insertAdminBoundarySchema>;
export type FacilityCatchment = typeof facilityCatchments.$inferSelect;
export type InsertFacilityCatchment = z.infer<typeof insertFacilityCatchmentSchema>;

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
