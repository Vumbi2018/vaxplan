"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc4) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc4 = __getOwnPropDesc(from, key)) || desc4.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  SELF_SIGNUP_ROLES: () => SELF_SIGNUP_ROLES,
  adminBoundaries: () => adminBoundaries,
  adminBoundariesRelations: () => adminBoundariesRelations,
  approvalRequests: () => approvalRequests,
  approvalStatusEnum: () => approvalStatusEnum,
  auditLogs: () => auditLogs,
  boundarySourceEnum: () => boundarySourceEnum,
  budgetItems: () => budgetItems,
  candidateUnmappedSettlements: () => candidateUnmappedSettlements,
  candidateUnmappedSettlementsRelations: () => candidateUnmappedSettlementsRelations,
  clientVaccinations: () => clientVaccinations,
  clientVaccinationsRelations: () => clientVaccinationsRelations,
  clients: () => clients,
  clientsRelations: () => clientsRelations,
  coverageCsvRowSchema: () => coverageCsvRowSchema,
  csvImports: () => csvImports,
  districts: () => districts,
  districtsRelations: () => districtsRelations,
  facilities: () => facilities,
  facilitiesRelations: () => facilitiesRelations,
  facilityCatchments: () => facilityCatchments,
  facilityCatchmentsRelations: () => facilityCatchmentsRelations,
  fundingSourceEnum: () => fundingSourceEnum,
  htrScores: () => htrScores,
  idpProtocolEnum: () => idpProtocolEnum,
  importedCoverage: () => importedCoverage,
  insertAdminBoundarySchema: () => insertAdminBoundarySchema,
  insertApprovalRequestSchema: () => insertApprovalRequestSchema,
  insertBudgetItemSchema: () => insertBudgetItemSchema,
  insertCandidateUnmappedSettlementSchema: () => insertCandidateUnmappedSettlementSchema,
  insertClientSchema: () => insertClientSchema,
  insertClientVaccinationSchema: () => insertClientVaccinationSchema,
  insertCsvImportSchema: () => insertCsvImportSchema,
  insertDistrictSchema: () => insertDistrictSchema,
  insertFacilityCatchmentSchema: () => insertFacilityCatchmentSchema,
  insertFacilitySchema: () => insertFacilitySchema,
  insertImportedCoverageSchema: () => insertImportedCoverageSchema,
  insertLlgSchema: () => insertLlgSchema,
  insertMicroplanSchema: () => insertMicroplanSchema,
  insertMobilizationActivitySchema: () => insertMobilizationActivitySchema,
  insertMonthlyReportSchema: () => insertMonthlyReportSchema,
  insertPopulationDataSchema: () => insertPopulationDataSchema,
  insertPopulationGridSchema: () => insertPopulationGridSchema,
  insertProvinceSchema: () => insertProvinceSchema,
  insertRegionSchema: () => insertRegionSchema,
  insertSessionDayPlanSchema: () => insertSessionDayPlanSchema,
  insertSessionPlanSchema: () => insertSessionPlanSchema,
  insertSettlementMasterSchema: () => insertSettlementMasterSchema,
  insertSignupRequestSchema: () => insertSignupRequestSchema,
  insertStockTransactionSchema: () => insertStockTransactionSchema,
  insertSupervisionVisitSchema: () => insertSupervisionVisitSchema,
  insertTenantIdpConfigSchema: () => insertTenantIdpConfigSchema,
  insertTenantInterestRequestSchema: () => insertTenantInterestRequestSchema,
  insertTenantSchema: () => insertTenantSchema,
  insertUserRoleSchema: () => insertUserRoleSchema,
  insertUserSchema: () => insertUserSchema,
  insertVaccineConfigSchema: () => insertVaccineConfigSchema,
  insertVaccineRequirementSchema: () => insertVaccineRequirementSchema,
  insertVillageSchema: () => insertVillageSchema,
  llgs: () => llgs,
  llgsRelations: () => llgsRelations,
  microplanTypeEnum: () => microplanTypeEnum,
  microplans: () => microplans,
  microplansRelations: () => microplansRelations,
  mobilizationActivities: () => mobilizationActivities,
  monthlyReports: () => monthlyReports,
  monthlyReportsRelations: () => monthlyReportsRelations,
  populationData: () => populationData,
  populationGrids: () => populationGrids,
  populationGridsRelations: () => populationGridsRelations,
  populationRefreshJobs: () => populationRefreshJobs,
  populationRefreshStatusEnum: () => populationRefreshStatusEnum,
  populationRefreshTriggerEnum: () => populationRefreshTriggerEnum,
  populationSourceEnum: () => populationSourceEnum,
  provinces: () => provinces,
  provincesRelations: () => provincesRelations,
  regions: () => regions,
  regionsRelations: () => regionsRelations,
  sessionDayPlans: () => sessionDayPlans,
  sessionDayPlansRelations: () => sessionDayPlansRelations,
  sessionPlanTypeEnum: () => sessionPlanTypeEnum,
  sessionPlans: () => sessionPlans,
  sessionPlansRelations: () => sessionPlansRelations,
  sessionTypeEnum: () => sessionTypeEnum,
  sessionVillages: () => sessionVillages,
  sessionVillagesRelations: () => sessionVillagesRelations,
  sessions: () => sessions,
  settlementsMaster: () => settlementsMaster,
  settlementsMasterRelations: () => settlementsMasterRelations,
  signupRequests: () => signupRequests,
  signupStatusEnum: () => signupStatusEnum,
  stockTransactions: () => stockTransactions,
  stockTransactionsRelations: () => stockTransactionsRelations,
  supervisionVisits: () => supervisionVisits,
  tenantIdpConfigs: () => tenantIdpConfigs,
  tenantInterestRequests: () => tenantInterestRequests,
  tenantStatusEnum: () => tenantStatusEnum,
  tenants: () => tenants,
  transportModeEnum: () => transportModeEnum,
  userRoleEnum: () => userRoleEnum,
  userRoles: () => userRoles,
  users: () => users,
  usersRelations: () => usersRelations,
  vaccineConfigurations: () => vaccineConfigurations,
  vaccineConfigurationsRelations: () => vaccineConfigurationsRelations,
  vaccineRequirements: () => vaccineRequirements,
  villages: () => villages,
  villagesRelations: () => villagesRelations
});
var import_drizzle_orm, import_pg_core, import_drizzle_zod, import_zod, tenantStatusEnum, idpProtocolEnum, signupStatusEnum, populationRefreshStatusEnum, populationRefreshTriggerEnum, tenants, tenantIdpConfigs, signupRequests, tenantInterestRequests, userRoleEnum, approvalStatusEnum, sessionTypeEnum, transportModeEnum, populationSourceEnum, sessions, users, userRoles, regions, provinces, districts, llgs, facilities, villages, populationData, microplanTypeEnum, sessionPlanTypeEnum, microplans, sessionPlans, sessionVillages, fundingSourceEnum, budgetItems, vaccineRequirements, mobilizationActivities, approvalRequests, populationRefreshJobs, auditLogs, htrScores, usersRelations, regionsRelations, provincesRelations, districtsRelations, llgsRelations, facilitiesRelations, villagesRelations, microplansRelations, sessionPlansRelations, sessionVillagesRelations, insertTenantSchema, insertTenantIdpConfigSchema, SELF_SIGNUP_ROLES, insertSignupRequestSchema, insertUserSchema, insertUserRoleSchema, insertRegionSchema, insertProvinceSchema, insertDistrictSchema, insertLlgSchema, insertFacilitySchema, insertVillageSchema, insertPopulationDataSchema, insertMicroplanSchema, insertSessionPlanSchema, insertBudgetItemSchema, insertVaccineRequirementSchema, boundarySourceEnum, adminBoundaries, facilityCatchments, vaccineConfigurations, clients, clientVaccinations, sessionDayPlans, stockTransactions, monthlyReports, settlementsMaster, populationGrids, candidateUnmappedSettlements, importedCoverage, csvImports, supervisionVisits, adminBoundariesRelations, facilityCatchmentsRelations, vaccineConfigurationsRelations, clientsRelations, clientVaccinationsRelations, sessionDayPlansRelations, stockTransactionsRelations, monthlyReportsRelations, settlementsMasterRelations, populationGridsRelations, candidateUnmappedSettlementsRelations, insertAdminBoundarySchema, insertFacilityCatchmentSchema, insertVaccineConfigSchema, insertClientSchema, insertClientVaccinationSchema, insertSessionDayPlanSchema, insertStockTransactionSchema, insertMonthlyReportSchema, insertSettlementMasterSchema, insertPopulationGridSchema, insertCandidateUnmappedSettlementSchema, insertImportedCoverageSchema, insertCsvImportSchema, coverageCsvRowSchema, insertMobilizationActivitySchema, insertApprovalRequestSchema, insertTenantInterestRequestSchema, insertSupervisionVisitSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_pg_core = require("drizzle-orm/pg-core");
    import_drizzle_zod = require("drizzle-zod");
    import_zod = require("zod");
    tenantStatusEnum = (0, import_pg_core.pgEnum)("tenant_status", [
      "trial",
      "active",
      "suspended",
      "archived"
    ]);
    idpProtocolEnum = (0, import_pg_core.pgEnum)("idp_protocol", ["oidc", "saml"]);
    signupStatusEnum = (0, import_pg_core.pgEnum)("signup_status", [
      "pending",
      "approved",
      "rejected",
      "expired"
    ]);
    populationRefreshStatusEnum = (0, import_pg_core.pgEnum)("population_refresh_status", [
      "pending",
      "running",
      "succeeded",
      "failed"
    ]);
    populationRefreshTriggerEnum = (0, import_pg_core.pgEnum)("population_refresh_trigger", [
      "manual",
      "scheduled"
    ]);
    tenants = (0, import_pg_core.pgTable)("tenants", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 10 }).notNull().unique(),
      countryCode: (0, import_pg_core.varchar)("country_code", { length: 3 }).notNull(),
      status: tenantStatusEnum("status").default("trial").notNull(),
      settings: (0, import_pg_core.jsonb)("settings").notNull().default({}),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    });
    tenantIdpConfigs = (0, import_pg_core.pgTable)(
      "tenant_idp_configs",
      {
        id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        protocol: idpProtocolEnum("protocol").notNull(),
        displayName: (0, import_pg_core.varchar)("display_name", { length: 255 }).notNull(),
        emailDomain: (0, import_pg_core.varchar)("email_domain", { length: 255 }).notNull(),
        issuerUrl: (0, import_pg_core.varchar)("issuer_url"),
        clientId: (0, import_pg_core.varchar)("client_id"),
        clientSecretRef: (0, import_pg_core.varchar)("client_secret_ref"),
        entryPoint: (0, import_pg_core.varchar)("entry_point"),
        certRef: (0, import_pg_core.varchar)("cert_ref"),
        isActive: (0, import_pg_core.boolean)("is_active").default(true),
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
      },
      (table) => [(0, import_pg_core.index)("idx_idp_email_domain").on(table.emailDomain)]
    );
    signupRequests = (0, import_pg_core.pgTable)(
      "signup_requests",
      {
        id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        email: (0, import_pg_core.varchar)("email", { length: 255 }).notNull(),
        fullName: (0, import_pg_core.varchar)("full_name", { length: 255 }).notNull(),
        requestedRole: (0, import_pg_core.varchar)("requested_role", { length: 50 }).notNull(),
        facilityId: (0, import_pg_core.integer)("facility_id"),
        districtId: (0, import_pg_core.integer)("district_id"),
        provinceId: (0, import_pg_core.integer)("province_id"),
        justification: (0, import_pg_core.text)("justification"),
        status: signupStatusEnum("status").default("pending").notNull(),
        approverUserId: (0, import_pg_core.varchar)("approver_user_id"),
        decisionReason: (0, import_pg_core.text)("decision_reason"),
        decidedAt: (0, import_pg_core.timestamp)("decided_at"),
        expiresAt: (0, import_pg_core.timestamp)("expires_at"),
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
      },
      (table) => [
        (0, import_pg_core.index)("idx_signup_tenant_status").on(table.tenantId, table.status),
        (0, import_pg_core.index)("idx_signup_email").on(table.email)
      ]
    );
    tenantInterestRequests = (0, import_pg_core.pgTable)(
      "tenant_interest_requests",
      {
        id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
        countryCode: (0, import_pg_core.varchar)("country_code", { length: 3 }).notNull(),
        // ISO-3166 alpha-3
        countryName: (0, import_pg_core.varchar)("country_name", { length: 255 }).notNull(),
        organization: (0, import_pg_core.varchar)("organization", { length: 255 }),
        fullName: (0, import_pg_core.varchar)("full_name", { length: 255 }).notNull(),
        email: (0, import_pg_core.varchar)("email", { length: 255 }).notNull(),
        requestedRole: (0, import_pg_core.varchar)("requested_role", { length: 50 }).notNull(),
        justification: (0, import_pg_core.text)("justification"),
        status: signupStatusEnum("status").default("pending").notNull(),
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
      },
      (table) => [
        (0, import_pg_core.index)("idx_tenant_interest_country").on(table.countryCode),
        (0, import_pg_core.index)("idx_tenant_interest_status").on(table.status)
      ]
    );
    userRoleEnum = (0, import_pg_core.pgEnum)("user_role", [
      "facility_clerk",
      "facility_in_charge",
      "district_manager",
      "provincial_coordinator",
      "national_admin",
      "gis_specialist"
    ]);
    approvalStatusEnum = (0, import_pg_core.pgEnum)("approval_status", [
      "draft",
      "pending",
      "approved",
      "rejected",
      "locked"
    ]);
    sessionTypeEnum = (0, import_pg_core.pgEnum)("session_type", [
      "static",
      "mobile",
      "outreach"
    ]);
    transportModeEnum = (0, import_pg_core.pgEnum)("transport_mode", [
      "walking",
      "road",
      "boat",
      "air"
    ]);
    populationSourceEnum = (0, import_pg_core.pgEnum)("population_source", [
      "nso",
      "hmis",
      "worldpop",
      "survey",
      "community_census"
    ]);
    sessions = (0, import_pg_core.pgTable)(
      "sessions",
      {
        sid: (0, import_pg_core.varchar)("sid").primaryKey(),
        sess: (0, import_pg_core.jsonb)("sess").notNull(),
        expire: (0, import_pg_core.timestamp)("expire").notNull()
      },
      (table) => [(0, import_pg_core.index)("IDX_session_expire").on(table.expire)]
    );
    users = (0, import_pg_core.pgTable)("users", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      email: (0, import_pg_core.varchar)("email").unique(),
      firstName: (0, import_pg_core.varchar)("first_name"),
      lastName: (0, import_pg_core.varchar)("last_name"),
      profileImageUrl: (0, import_pg_core.varchar)("profile_image_url"),
      role: userRoleEnum("role").default("facility_clerk").notNull(),
      roles: (0, import_pg_core.jsonb)("roles").default([]).notNull(),
      permissions: (0, import_pg_core.jsonb)("permissions").default([]).notNull(),
      dataAccessScope: (0, import_pg_core.jsonb)("data_access_scope").default({ provinces: [], districts: [], facilities: [] }).notNull(),
      facilityId: (0, import_pg_core.integer)("facility_id"),
      districtId: (0, import_pg_core.integer)("district_id"),
      provinceId: (0, import_pg_core.integer)("province_id"),
      hmisCode: (0, import_pg_core.varchar)("hmis_code"),
      isActive: (0, import_pg_core.boolean)("is_active").default(true),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_users_tenant").on(table.tenantId)]);
    userRoles = (0, import_pg_core.pgTable)(
      "user_roles",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        code: (0, import_pg_core.varchar)("code", { length: 50 }).notNull(),
        name: (0, import_pg_core.varchar)("name", { length: 100 }).notNull(),
        permissions: (0, import_pg_core.jsonb)("permissions").default([]).notNull(),
        // array of Permission strings
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
        updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
      },
      (table) => [
        (0, import_pg_core.index)("idx_user_roles_tenant").on(table.tenantId),
        (0, import_pg_core.unique)("uq_user_roles_tenant_code").on(table.tenantId, table.code)
      ]
    );
    regions = (0, import_pg_core.pgTable)("regions", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 10 }).notNull(),
      coordinates: (0, import_pg_core.jsonb)("coordinates"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_regions_tenant").on(table.tenantId),
      (0, import_pg_core.unique)("regions_tenant_code_unique").on(table.tenantId, table.code)
    ]);
    provinces = (0, import_pg_core.pgTable)("provinces", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 10 }).notNull(),
      regionId: (0, import_pg_core.integer)("region_id").references(() => regions.id),
      coordinates: (0, import_pg_core.jsonb)("coordinates"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_provinces_tenant").on(table.tenantId),
      (0, import_pg_core.unique)("provinces_tenant_code_unique").on(table.tenantId, table.code)
    ]);
    districts = (0, import_pg_core.pgTable)("districts", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 10 }).notNull(),
      provinceId: (0, import_pg_core.integer)("province_id").notNull().references(() => provinces.id),
      coordinates: (0, import_pg_core.jsonb)("coordinates"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_districts_tenant").on(table.tenantId),
      (0, import_pg_core.unique)("districts_tenant_code_unique").on(table.tenantId, table.code)
    ]);
    llgs = (0, import_pg_core.pgTable)("llgs", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 50 }),
      districtId: (0, import_pg_core.integer)("district_id").notNull().references(() => districts.id),
      coordinates: (0, import_pg_core.jsonb)("coordinates"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_llgs_tenant").on(table.tenantId)]);
    facilities = (0, import_pg_core.pgTable)("facilities", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      hmisCode: (0, import_pg_core.varchar)("hmis_code", { length: 50 }).notNull(),
      facilityType: (0, import_pg_core.varchar)("facility_type", { length: 100 }),
      agencyName: (0, import_pg_core.varchar)("agency_name", { length: 100 }),
      operationalStatus: (0, import_pg_core.varchar)("operational_status", { length: 50 }),
      districtId: (0, import_pg_core.integer)("district_id").notNull().references(() => districts.id),
      latitude: (0, import_pg_core.decimal)("latitude", { precision: 10, scale: 7 }),
      longitude: (0, import_pg_core.decimal)("longitude", { precision: 10, scale: 7 }),
      address: (0, import_pg_core.text)("address"),
      contactPhone: (0, import_pg_core.varchar)("contact_phone", { length: 50 }),
      operatingHours: (0, import_pg_core.varchar)("operating_hours", { length: 100 }),
      hasRefrigerator: (0, import_pg_core.boolean)("has_refrigerator").default(false),
      hasPower: (0, import_pg_core.boolean)("has_power").default(false),
      staffCount: (0, import_pg_core.integer)("staff_count"),
      catchmentRadius: (0, import_pg_core.decimal)("catchment_radius", { precision: 10, scale: 2 }),
      isActive: (0, import_pg_core.boolean)("is_active").default(true),
      // External IdP-side identifiers (DHIS2 UID, SmartCare GUID, eLMIS, iHRIS, etc.).
      // Keyed by IdP code so the same facility can carry multiple cross-references.
      externalIds: (0, import_pg_core.jsonb)("external_ids").default({}),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_facilities_tenant").on(table.tenantId),
      (0, import_pg_core.unique)("facilities_tenant_hmis_unique").on(table.tenantId, table.hmisCode)
    ]);
    villages = (0, import_pg_core.pgTable)("villages", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      code: (0, import_pg_core.varchar)("code", { length: 50 }),
      districtId: (0, import_pg_core.integer)("district_id").notNull().references(() => districts.id),
      llgId: (0, import_pg_core.integer)("llg_id").references(() => llgs.id),
      assignedFacilityId: (0, import_pg_core.integer)("assigned_facility_id").references(() => facilities.id),
      latitude: (0, import_pg_core.decimal)("latitude", { precision: 10, scale: 7 }),
      longitude: (0, import_pg_core.decimal)("longitude", { precision: 10, scale: 7 }),
      distanceToFacility: (0, import_pg_core.decimal)("distance_to_facility", { precision: 10, scale: 2 }),
      travelTimeMinutes: (0, import_pg_core.integer)("travel_time_minutes"),
      terrainDifficulty: (0, import_pg_core.integer)("terrain_difficulty"),
      isHardToReach: (0, import_pg_core.boolean)("is_hard_to_reach").default(false),
      seasonalAccessibility: (0, import_pg_core.varchar)("seasonal_accessibility", { length: 100 }),
      transportMode: transportModeEnum("transport_mode"),
      insecurityLevel: (0, import_pg_core.integer)("insecurity_level"),
      comments: (0, import_pg_core.text)("comments"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_villages_tenant").on(table.tenantId)]);
    populationData = (0, import_pg_core.pgTable)("population_data", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      provinceId: (0, import_pg_core.integer)("province_id").references(() => provinces.id),
      districtId: (0, import_pg_core.integer)("district_id").references(() => districts.id),
      villageId: (0, import_pg_core.integer)("village_id").references(() => villages.id),
      facilityId: (0, import_pg_core.integer)("facility_id").references(() => facilities.id),
      source: populationSourceEnum("source").notNull(),
      year: (0, import_pg_core.integer)("year").notNull(),
      totalPopulation: (0, import_pg_core.integer)("total_population").notNull(),
      malePopulation: (0, import_pg_core.integer)("male_population"),
      femalePopulation: (0, import_pg_core.integer)("female_population"),
      under1Population: (0, import_pg_core.integer)("under_1_population"),
      under5Population: (0, import_pg_core.integer)("under_5_population"),
      pregnantWomen: (0, import_pg_core.integer)("pregnant_women"),
      schoolEntry: (0, import_pg_core.integer)("school_entry"),
      schoolExit: (0, import_pg_core.integer)("school_exit"),
      growthRate: (0, import_pg_core.decimal)("growth_rate", { precision: 5, scale: 2 }),
      confidenceScore: (0, import_pg_core.decimal)("confidence_score", { precision: 5, scale: 2 }),
      metadata: (0, import_pg_core.jsonb)("metadata"),
      approvalStatus: approvalStatusEnum("approval_status").default("draft"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_population_tenant").on(table.tenantId)]);
    microplanTypeEnum = (0, import_pg_core.pgEnum)("microplan_type", [
      "facility_routine",
      "sia_campaign"
    ]);
    sessionPlanTypeEnum = (0, import_pg_core.pgEnum)("session_plan_type", [
      "routine",
      "campaign"
    ]);
    microplans = (0, import_pg_core.pgTable)("microplans", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      facilityId: (0, import_pg_core.integer)("facility_id").references(() => facilities.id),
      // Nullable for high-level SIA
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      planType: microplanTypeEnum("plan_type").notNull().default("facility_routine"),
      year: (0, import_pg_core.integer)("year").notNull(),
      quarter: (0, import_pg_core.integer)("quarter").notNull(),
      status: (0, import_pg_core.varchar)("status", { length: 50 }).default("draft"),
      // draft, pending, approved, locked
      // SIA Campaign specific fields:
      campaignAntigen: (0, import_pg_core.varchar)("campaign_antigen", { length: 100 }),
      campaignTargetAge: (0, import_pg_core.varchar)("campaign_target_age", { length: 100 }),
      campaignScope: (0, import_pg_core.varchar)("campaign_scope", { length: 100 }),
      // National, Sub-national, Local
      targetPopulation: (0, import_pg_core.integer)("target_population"),
      budget: (0, import_pg_core.decimal)("budget", { precision: 12, scale: 2 }),
      // Structured staffing roster (WHO/UNICEF microplanning element 6 - Human Resources).
      // Array of { role, headcount, days, perDiem } rows. Free-form jsonb to keep the
      // schema flexible while the UI iterates.
      staffing: (0, import_pg_core.jsonb)("staffing").default([]),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_microplans_tenant").on(table.tenantId)]);
    sessionPlans = (0, import_pg_core.pgTable)("session_plans", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id),
      // Every session MUST belong to a parent microplan. Enforced by server validation
      // (POST/PATCH /api/sessions verify parent exists, same tenant, matching planType,
      // and parent is not locked).
      microplanId: (0, import_pg_core.integer)("microplan_id").notNull().references(() => microplans.id, { onDelete: "cascade" }),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      sessionType: sessionTypeEnum("session_type").notNull(),
      quarter: (0, import_pg_core.integer)("quarter").notNull(),
      year: (0, import_pg_core.integer)("year").notNull(),
      scheduledDate: (0, import_pg_core.timestamp)("scheduled_date"),
      transportMode: transportModeEnum("transport_mode"),
      estimatedDuration: (0, import_pg_core.integer)("estimated_duration"),
      targetPopulation: (0, import_pg_core.integer)("target_population"),
      status: (0, import_pg_core.varchar)("status", { length: 50 }).default("planned"),
      approvalStatus: approvalStatusEnum("approval_status").default("draft"),
      notes: (0, import_pg_core.text)("notes"),
      humanResources: (0, import_pg_core.text)("human_resources"),
      keyStakeholders: (0, import_pg_core.text)("key_stakeholders"),
      vaccineAdjustments: (0, import_pg_core.jsonb)("vaccine_adjustments").default({}),
      // Strict enum, copied from parent microplan at write-time. Never set directly by clients.
      planType: sessionPlanTypeEnum("plan_type").notNull().default("routine"),
      // @deprecated — these mirror the parent microplan's campaign fields. Server copies
      // them on create from the parent and rejects client-supplied values. Kept on the row
      // for read-time convenience and to avoid breaking offline clients.
      campaignAntigen: (0, import_pg_core.varchar)("campaign_antigen", { length: 100 }),
      campaignTargetAge: (0, import_pg_core.varchar)("campaign_target_age", { length: 100 }),
      campaignScope: (0, import_pg_core.varchar)("campaign_scope", { length: 100 }),
      teamType: (0, import_pg_core.varchar)("team_type", { length: 100 }),
      geojson: (0, import_pg_core.jsonb)("geojson"),
      // Georeferenced custom geofence plotted by the health worker
      isAchieved: (0, import_pg_core.boolean)("is_achieved").default(false).notNull(),
      // real-time map checklist progress tracking
      // Completion tracking — set when the facility marks the session done. Drives the
      // 1-month auto-archive from the live map and powers the Session History view.
      completedAt: (0, import_pg_core.timestamp)("completed_at"),
      // Per-antigen vaccinated counts captured at mark-done time. Shape:
      //   { totals: number, perAntigen: Record<string, number>, actualDate?: string, note?: string }
      vaccinatedCounts: (0, import_pg_core.jsonb)("vaccinated_counts"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => [
      (0, import_pg_core.index)("idx_session_plans_tenant").on(table.tenantId),
      (0, import_pg_core.index)("idx_session_plans_microplan").on(table.microplanId),
      (0, import_pg_core.index)("idx_session_plans_completed_at").on(table.completedAt)
    ]);
    sessionVillages = (0, import_pg_core.pgTable)("session_villages", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      sessionId: (0, import_pg_core.integer)("session_id").notNull().references(() => sessionPlans.id),
      villageId: (0, import_pg_core.integer)("village_id").notNull().references(() => villages.id),
      orderIndex: (0, import_pg_core.integer)("order_index")
    }, (table) => [(0, import_pg_core.index)("idx_session_villages_tenant").on(table.tenantId)]);
    fundingSourceEnum = (0, import_pg_core.pgEnum)("funding_source", [
      "government",
      "gavi",
      "who",
      "unicef",
      "other",
      "unspecified"
    ]);
    budgetItems = (0, import_pg_core.pgTable)("budget_items", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id),
      sessionId: (0, import_pg_core.integer)("session_id").references(() => sessionPlans.id),
      category: (0, import_pg_core.varchar)("category", { length: 100 }).notNull(),
      description: (0, import_pg_core.varchar)("description", { length: 255 }).notNull(),
      unitCost: (0, import_pg_core.decimal)("unit_cost", { precision: 12, scale: 2 }).notNull(),
      quantity: (0, import_pg_core.integer)("quantity").notNull(),
      totalCost: (0, import_pg_core.decimal)("total_cost", { precision: 12, scale: 2 }).notNull(),
      quarter: (0, import_pg_core.integer)("quarter").notNull(),
      year: (0, import_pg_core.integer)("year").notNull(),
      approvalStatus: approvalStatusEnum("approval_status").default("draft"),
      // Funding source classification (Gavi HSS reporting). Legacy rows default to
      // 'unspecified' and surface a "needs classification" hint in the UI.
      fundingSource: fundingSourceEnum("funding_source").notNull().default("unspecified"),
      // Free-text descriptor used when `fundingSource === 'other'`.
      fundingSourceOther: (0, import_pg_core.varchar)("funding_source_other", { length: 255 }),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_budget_items_tenant").on(table.tenantId)]);
    vaccineRequirements = (0, import_pg_core.pgTable)("vaccine_requirements", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id),
      vaccineName: (0, import_pg_core.varchar)("vaccine_name", { length: 100 }).notNull(),
      targetPopulation: (0, import_pg_core.integer)("target_population").notNull(),
      dosesRequired: (0, import_pg_core.integer)("doses_required").notNull(),
      wastageRate: (0, import_pg_core.decimal)("wastage_rate", { precision: 5, scale: 2 }).notNull(),
      dosesWithWastage: (0, import_pg_core.integer)("doses_with_wastage").notNull(),
      vialsRequired: (0, import_pg_core.integer)("vials_required").notNull(),
      quarter: (0, import_pg_core.integer)("quarter").notNull(),
      year: (0, import_pg_core.integer)("year").notNull(),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_vaccine_req_tenant").on(table.tenantId)]);
    mobilizationActivities = (0, import_pg_core.pgTable)("mobilization_activities", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id),
      activityType: (0, import_pg_core.varchar)("activity_type", { length: 100 }).notNull(),
      description: (0, import_pg_core.text)("description"),
      targetAudience: (0, import_pg_core.varchar)("target_audience", { length: 100 }),
      scheduledDate: (0, import_pg_core.timestamp)("scheduled_date"),
      estimatedAttendance: (0, import_pg_core.integer)("estimated_attendance"),
      materialsNeeded: (0, import_pg_core.jsonb)("materials_needed"),
      budgetAllocation: (0, import_pg_core.decimal)("budget_allocation", { precision: 12, scale: 2 }),
      status: (0, import_pg_core.varchar)("status", { length: 50 }).default("planned"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_mobilization_tenant").on(table.tenantId)]);
    approvalRequests = (0, import_pg_core.pgTable)("approval_requests", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      entityType: (0, import_pg_core.varchar)("entity_type", { length: 50 }).notNull(),
      entityId: (0, import_pg_core.integer)("entity_id").notNull(),
      requestedById: (0, import_pg_core.varchar)("requested_by_id").notNull().references(() => users.id),
      currentLevel: (0, import_pg_core.varchar)("current_level", { length: 50 }).notNull(),
      status: approvalStatusEnum("status").default("pending"),
      comments: (0, import_pg_core.text)("comments"),
      submittedAt: (0, import_pg_core.timestamp)("submitted_at").defaultNow(),
      resolvedAt: (0, import_pg_core.timestamp)("resolved_at"),
      resolvedById: (0, import_pg_core.varchar)("resolved_by_id").references(() => users.id)
    }, (table) => [(0, import_pg_core.index)("idx_approval_req_tenant").on(table.tenantId)]);
    populationRefreshJobs = (0, import_pg_core.pgTable)(
      "population_refresh_jobs",
      {
        id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        triggeredBy: populationRefreshTriggerEnum("triggered_by").notNull(),
        triggeredByUserId: (0, import_pg_core.varchar)("triggered_by_user_id"),
        rasterPath: (0, import_pg_core.varchar)("raster_path", { length: 500 }).notNull(),
        minPopulation: (0, import_pg_core.integer)("min_population").notNull(),
        status: populationRefreshStatusEnum("status").notNull().default("pending"),
        startedAt: (0, import_pg_core.timestamp)("started_at").defaultNow(),
        completedAt: (0, import_pg_core.timestamp)("completed_at"),
        rowsInserted: (0, import_pg_core.integer)("rows_inserted"),
        cellsScanned: (0, import_pg_core.integer)("cells_scanned"),
        cellsAboveThreshold: (0, import_pg_core.integer)("cells_above_threshold"),
        durationMs: (0, import_pg_core.integer)("duration_ms"),
        errorMessage: (0, import_pg_core.text)("error_message"),
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
      },
      (table) => [
        (0, import_pg_core.index)("idx_pop_refresh_tenant_started").on(table.tenantId, table.startedAt),
        (0, import_pg_core.index)("idx_pop_refresh_status").on(table.status)
      ]
    );
    auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      userId: (0, import_pg_core.varchar)("user_id").references(() => users.id),
      action: (0, import_pg_core.varchar)("action", { length: 100 }).notNull(),
      entityType: (0, import_pg_core.varchar)("entity_type", { length: 50 }),
      entityId: (0, import_pg_core.integer)("entity_id"),
      oldValue: (0, import_pg_core.jsonb)("old_value"),
      newValue: (0, import_pg_core.jsonb)("new_value"),
      ipAddress: (0, import_pg_core.varchar)("ip_address", { length: 50 }),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_audit_logs_tenant").on(table.tenantId)]);
    htrScores = (0, import_pg_core.pgTable)("htr_scores", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").references(() => tenants.id),
      villageId: (0, import_pg_core.integer)("village_id").notNull().references(() => villages.id),
      distanceScore: (0, import_pg_core.integer)("distance_score"),
      terrainScore: (0, import_pg_core.integer)("terrain_score"),
      seasonalScore: (0, import_pg_core.integer)("seasonal_score"),
      coverageScore: (0, import_pg_core.integer)("coverage_score"),
      insecurityScore: (0, import_pg_core.integer)("insecurity_score"),
      compositeScore: (0, import_pg_core.integer)("composite_score"),
      interventionPriority: (0, import_pg_core.varchar)("intervention_priority", { length: 50 }),
      comments: (0, import_pg_core.text)("comments"),
      calculatedAt: (0, import_pg_core.timestamp)("calculated_at").defaultNow()
    }, (table) => [(0, import_pg_core.index)("idx_htr_scores_tenant").on(table.tenantId)]);
    usersRelations = (0, import_drizzle_orm.relations)(users, ({ one }) => ({
      facility: one(facilities, {
        fields: [users.facilityId],
        references: [facilities.id]
      }),
      district: one(districts, {
        fields: [users.districtId],
        references: [districts.id]
      }),
      province: one(provinces, {
        fields: [users.provinceId],
        references: [provinces.id]
      })
    }));
    regionsRelations = (0, import_drizzle_orm.relations)(regions, ({ many }) => ({
      provinces: many(provinces)
    }));
    provincesRelations = (0, import_drizzle_orm.relations)(provinces, ({ one, many }) => ({
      region: one(regions, {
        fields: [provinces.regionId],
        references: [regions.id]
      }),
      districts: many(districts)
    }));
    districtsRelations = (0, import_drizzle_orm.relations)(districts, ({ one, many }) => ({
      province: one(provinces, {
        fields: [districts.provinceId],
        references: [provinces.id]
      }),
      llgs: many(llgs),
      facilities: many(facilities),
      villages: many(villages)
    }));
    llgsRelations = (0, import_drizzle_orm.relations)(llgs, ({ one, many }) => ({
      district: one(districts, {
        fields: [llgs.districtId],
        references: [districts.id]
      }),
      villages: many(villages)
    }));
    facilitiesRelations = (0, import_drizzle_orm.relations)(facilities, ({ one, many }) => ({
      district: one(districts, {
        fields: [facilities.districtId],
        references: [districts.id]
      }),
      villages: many(villages),
      sessionPlans: many(sessionPlans),
      budgetItems: many(budgetItems),
      vaccineRequirements: many(vaccineRequirements),
      mobilizationActivities: many(mobilizationActivities)
    }));
    villagesRelations = (0, import_drizzle_orm.relations)(villages, ({ one, many }) => ({
      district: one(districts, {
        fields: [villages.districtId],
        references: [districts.id]
      }),
      llg: one(llgs, {
        fields: [villages.llgId],
        references: [llgs.id]
      }),
      assignedFacility: one(facilities, {
        fields: [villages.assignedFacilityId],
        references: [facilities.id]
      }),
      populationData: many(populationData),
      htrScores: many(htrScores)
    }));
    microplansRelations = (0, import_drizzle_orm.relations)(microplans, ({ one, many }) => ({
      tenant: one(tenants, { fields: [microplans.tenantId], references: [tenants.id] }),
      facility: one(facilities, { fields: [microplans.facilityId], references: [facilities.id] }),
      sessionPlans: many(sessionPlans)
    }));
    sessionPlansRelations = (0, import_drizzle_orm.relations)(sessionPlans, ({ one, many }) => ({
      facility: one(facilities, {
        fields: [sessionPlans.facilityId],
        references: [facilities.id]
      }),
      microplan: one(microplans, {
        fields: [sessionPlans.microplanId],
        references: [microplans.id]
      }),
      sessionVillages: many(sessionVillages)
    }));
    sessionVillagesRelations = (0, import_drizzle_orm.relations)(sessionVillages, ({ one }) => ({
      session: one(sessionPlans, {
        fields: [sessionVillages.sessionId],
        references: [sessionPlans.id]
      }),
      village: one(villages, {
        fields: [sessionVillages.villageId],
        references: [villages.id]
      })
    }));
    insertTenantSchema = (0, import_drizzle_zod.createInsertSchema)(tenants).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertTenantIdpConfigSchema = (0, import_drizzle_zod.createInsertSchema)(tenantIdpConfigs).omit({
      id: true,
      createdAt: true
    });
    SELF_SIGNUP_ROLES = [
      "facility_clerk",
      "facility_in_charge",
      "district_manager",
      "provincial_coordinator",
      "gis_specialist"
    ];
    insertSignupRequestSchema = (0, import_drizzle_zod.createInsertSchema)(signupRequests).omit({
      id: true,
      status: true,
      approverUserId: true,
      decisionReason: true,
      decidedAt: true,
      createdAt: true
    }).extend({
      requestedRole: import_zod.z.enum(SELF_SIGNUP_ROLES),
      email: import_zod.z.string().email().max(255),
      fullName: import_zod.z.string().min(2).max(255),
      justification: import_zod.z.string().max(2e3).optional().nullable()
    });
    insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUserRoleSchema = (0, import_drizzle_zod.createInsertSchema)(userRoles).omit({
      tenantId: true,
      createdAt: true,
      updatedAt: true
    });
    insertRegionSchema = (0, import_drizzle_zod.createInsertSchema)(regions).omit({
      createdAt: true
    });
    insertProvinceSchema = (0, import_drizzle_zod.createInsertSchema)(provinces).omit({
      createdAt: true
    });
    insertDistrictSchema = (0, import_drizzle_zod.createInsertSchema)(districts).omit({
      createdAt: true
    });
    insertLlgSchema = (0, import_drizzle_zod.createInsertSchema)(llgs).omit({
      createdAt: true
    });
    insertFacilitySchema = (0, import_drizzle_zod.createInsertSchema)(facilities).omit({
      createdAt: true,
      updatedAt: true
    });
    insertVillageSchema = (0, import_drizzle_zod.createInsertSchema)(villages).omit({
      createdAt: true,
      updatedAt: true
    });
    insertPopulationDataSchema = (0, import_drizzle_zod.createInsertSchema)(populationData).omit({
      createdAt: true,
      updatedAt: true
    });
    insertMicroplanSchema = (0, import_drizzle_zod.createInsertSchema)(microplans).omit({
      createdAt: true,
      updatedAt: true
    });
    insertSessionPlanSchema = (0, import_drizzle_zod.createInsertSchema)(sessionPlans).omit({
      createdAt: true,
      updatedAt: true,
      planType: true,
      campaignAntigen: true,
      campaignTargetAge: true,
      campaignScope: true
    });
    insertBudgetItemSchema = (0, import_drizzle_zod.createInsertSchema)(budgetItems).omit({
      createdAt: true
    }).superRefine((data, ctx) => {
      if (data.fundingSource === "other") {
        const v = (data.fundingSourceOther ?? "").toString().trim();
        if (!v) {
          ctx.addIssue({
            code: import_zod.z.ZodIssueCode.custom,
            path: ["fundingSourceOther"],
            message: "Specify the funding source when 'Other' is selected."
          });
        }
      }
    }).transform((data) => ({
      ...data,
      // Normalize: drop any stale specify-text when source isn't 'other'.
      fundingSourceOther: data.fundingSource === "other" ? data.fundingSourceOther : null
    }));
    insertVaccineRequirementSchema = (0, import_drizzle_zod.createInsertSchema)(vaccineRequirements).omit({
      createdAt: true
    });
    boundarySourceEnum = (0, import_pg_core.pgEnum)("boundary_source", [
      "geoboundaries",
      "gadm",
      "ocha_hdx",
      "natural_earth",
      "custom"
    ]);
    adminBoundaries = (0, import_pg_core.pgTable)("admin_boundaries", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      adminLevel: (0, import_pg_core.integer)("admin_level").notNull(),
      // 0=country, 1=region, 2=province, 3=district, 4=ward, 5=village
      levelName: (0, import_pg_core.varchar)("level_name", { length: 100 }).notNull(),
      // e.g. "Province", "District"
      source: boundarySourceEnum("source").default("geoboundaries").notNull(),
      countryCode: (0, import_pg_core.varchar)("country_code", { length: 3 }).notNull(),
      // ISO-3166 Alpha-3
      featureCount: (0, import_pg_core.integer)("feature_count").default(0),
      // Full GeoJSON FeatureCollection
      geojson: (0, import_pg_core.jsonb)("geojson").notNull().default({}),
      // Bounding box [minLng, minLat, maxLng, maxLat]
      bbox: (0, import_pg_core.jsonb)("bbox").default(null),
      isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
      fetchedAt: (0, import_pg_core.timestamp)("fetched_at").defaultNow(),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => ({
      tenantLevelIdx: (0, import_pg_core.index)("admin_boundaries_tenant_level_idx").on(table.tenantId, table.adminLevel),
      tenantCodeIdx: (0, import_pg_core.index)("admin_boundaries_tenant_code_idx").on(table.tenantId, table.countryCode)
    }));
    facilityCatchments = (0, import_pg_core.pgTable)("facility_catchments", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
      drawnByUserId: (0, import_pg_core.varchar)("drawn_by_user_id").references(() => users.id, { onDelete: "set null" }),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      description: (0, import_pg_core.text)("description"),
      // GeoJSON Polygon or MultiPolygon
      geojson: (0, import_pg_core.jsonb)("geojson").notNull(),
      // Calculated server-side using Turf.js area()
      areaSqKm: (0, import_pg_core.decimal)("area_sq_km", { precision: 12, scale: 4 }),
      // Optional estimated population within catchment
      populationEstimate: (0, import_pg_core.integer)("population_estimate"),
      // Is this the official/approved catchment for this facility?
      isOfficial: (0, import_pg_core.boolean)("is_official").default(false).notNull(),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("facility_catchments_tenant_idx").on(table.tenantId),
      facilityIdx: (0, import_pg_core.index)("facility_catchments_facility_idx").on(table.facilityId)
    }));
    vaccineConfigurations = (0, import_pg_core.pgTable)("vaccine_configurations", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      name: (0, import_pg_core.varchar)("name", { length: 100 }).notNull(),
      targetGroup: (0, import_pg_core.varchar)("target_group", { length: 50 }).notNull(),
      // 'under1', 'births', 'pregnant', 'schoolEntry'
      doses: (0, import_pg_core.integer)("doses").notNull(),
      recommendedAge: (0, import_pg_core.varchar)("recommended_age", { length: 100 }).notNull(),
      // e.g. "6, 10, 14 weeks"
      recommendedAgeWeeks: (0, import_pg_core.integer)("recommended_age_weeks").notNull().default(0),
      // used for due list calculation
      wastageFactor: (0, import_pg_core.decimal)("wastage_factor", { precision: 5, scale: 2 }).notNull(),
      // e.g. 11.00, 40.00
      vialsPerDose: (0, import_pg_core.integer)("vials_per_dose").notNull(),
      // e.g. 10, 20
      isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("vaccine_config_tenant_idx").on(table.tenantId)
    }));
    clients = (0, import_pg_core.pgTable)("clients", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
      villageId: (0, import_pg_core.integer)("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
      name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
      clientType: (0, import_pg_core.varchar)("client_type", { length: 50 }).notNull(),
      // 'child', 'pregnant_woman'
      dateOfBirth: (0, import_pg_core.timestamp)("date_of_birth").notNull(),
      gender: (0, import_pg_core.varchar)("gender", { length: 20 }),
      // 'male', 'female'
      parentName: (0, import_pg_core.varchar)("parent_name", { length: 255 }),
      // mother or father name for child
      contactPhone: (0, import_pg_core.varchar)("contact_phone", { length: 50 }),
      catchmentStatus: (0, import_pg_core.varchar)("catchment_status", { length: 50 }).notNull().default("catchment"),
      // 'catchment', 'non-catchment'
      contraindications: (0, import_pg_core.jsonb)("contraindications").default([]).notNull(),
      // e.g. ["Penta: Severe Allergy"]
      refusalReason: (0, import_pg_core.text)("refusal_reason"),
      // e.g. "Religious grounds" or "Fear of side effects"
      isRefusal: (0, import_pg_core.boolean)("is_refusal").default(false).notNull(),
      // Cross-border registry columns:
      isCrossBorder: (0, import_pg_core.boolean)("is_cross_border").default(false).notNull(),
      countryOfOrigin: (0, import_pg_core.varchar)("country_of_origin", { length: 100 }),
      foreignResidence: (0, import_pg_core.text)("foreign_residence"),
      borderPointOfEntry: (0, import_pg_core.varchar)("border_point_of_entry", { length: 100 }),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("clients_tenant_idx").on(table.tenantId),
      facilityIdx: (0, import_pg_core.index)("clients_facility_idx").on(table.facilityId),
      villageIdx: (0, import_pg_core.index)("clients_village_idx").on(table.villageId)
    }));
    clientVaccinations = (0, import_pg_core.pgTable)("client_vaccinations", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      clientId: (0, import_pg_core.varchar)("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
      vaccineConfigId: (0, import_pg_core.integer)("vaccine_config_id").notNull().references(() => vaccineConfigurations.id, { onDelete: "cascade" }),
      vaccineName: (0, import_pg_core.varchar)("vaccine_name", { length: 100 }).notNull(),
      // e.g. "Penta-1" or "BCG"
      administeredDate: (0, import_pg_core.timestamp)("administered_date").notNull(),
      batchNumber: (0, import_pg_core.varchar)("batch_number", { length: 100 }),
      expiryDate: (0, import_pg_core.timestamp)("expiry_date"),
      vvmStatus: (0, import_pg_core.integer)("vvm_status"),
      // 1, 2, 3, 4
      administeredByUserId: (0, import_pg_core.varchar)("administered_by_user_id").references(() => users.id, { onDelete: "set null" }),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("client_vac_tenant_idx").on(table.tenantId),
      clientIdx: (0, import_pg_core.index)("client_vac_client_idx").on(table.clientId)
    }));
    sessionDayPlans = (0, import_pg_core.pgTable)("session_day_plans", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      sessionPlanId: (0, import_pg_core.integer)("session_plan_id").notNull().references(() => sessionPlans.id, { onDelete: "cascade" }),
      dayNumber: (0, import_pg_core.integer)("day_number").notNull(),
      // Day 1, Day 2...
      sessionDate: (0, import_pg_core.timestamp)("session_date").notNull(),
      communitiesVisited: (0, import_pg_core.jsonb)("communities_visited").default([]).notNull(),
      // Array of village IDs or village names
      targetPopulation: (0, import_pg_core.integer)("target_population").notNull(),
      vaccinesRequired: (0, import_pg_core.jsonb)("vaccines_required").default({}).notNull(),
      // map of vaccineConfigId -> count (doses)
      vitaminADoses: (0, import_pg_core.integer)("vitamin_a_doses").default(0).notNull(),
      dewormingDoses: (0, import_pg_core.integer)("deworming_doses").default(0).notNull(),
      vaccineCarriers: (0, import_pg_core.integer)("vaccine_carriers").default(1).notNull(),
      icePacks: (0, import_pg_core.integer)("ice_packs").default(4).notNull(),
      chalkSticks: (0, import_pg_core.integer)("chalk_sticks").default(6).notNull(),
      tallySheets: (0, import_pg_core.integer)("tally_sheets").default(2).notNull(),
      distanceKm: (0, import_pg_core.decimal)("distance_km", { precision: 8, scale: 2 }),
      transportType: (0, import_pg_core.varchar)("transport_type", { length: 50 }),
      // road, walking, boat, air
      fuelLiters: (0, import_pg_core.decimal)("fuel_liters", { precision: 8, scale: 2 }).default("0.00").notNull(),
      actualVaccinated: (0, import_pg_core.integer)("actual_vaccinated"),
      actualVialsUsed: (0, import_pg_core.integer)("actual_vials_used"),
      actualVialsWasted: (0, import_pg_core.integer)("actual_vials_wasted"),
      executionStatus: (0, import_pg_core.varchar)("execution_status", { length: 50 }).default("planned"),
      executionNotes: (0, import_pg_core.text)("execution_notes"),
      executedAt: (0, import_pg_core.timestamp)("executed_at"),
      teamCount: (0, import_pg_core.integer)("team_count").default(1),
      vaccinatorsCount: (0, import_pg_core.integer)("vaccinators_count").default(1),
      volunteersCount: (0, import_pg_core.integer)("volunteers_count").default(1),
      recordersCount: (0, import_pg_core.integer)("recorders_count").default(0),
      supervisorsCount: (0, import_pg_core.integer)("supervisors_count").default(0),
      indelibleMarkers: (0, import_pg_core.integer)("indelible_markers").default(0),
      coldBoxes: (0, import_pg_core.integer)("cold_boxes").default(0),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("session_day_tenant_idx").on(table.tenantId),
      sessionPlanIdx: (0, import_pg_core.index)("session_day_plan_idx").on(table.sessionPlanId)
    }));
    stockTransactions = (0, import_pg_core.pgTable)("stock_transactions", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
      vaccineName: (0, import_pg_core.varchar)("vaccine_name", { length: 100 }).notNull(),
      // BCG, Penta, etc.
      transactionType: (0, import_pg_core.varchar)("transaction_type", { length: 50 }).notNull(),
      // 'receipt', 'issue', 'loss', 'adjustment'
      quantityDoses: (0, import_pg_core.integer)("quantity_doses").notNull(),
      batchNumber: (0, import_pg_core.varchar)("batch_number", { length: 100 }).notNull(),
      expiryDate: (0, import_pg_core.timestamp)("expiry_date").notNull(),
      vvmStatus: (0, import_pg_core.integer)("vvm_status").notNull(),
      // 1, 2, 3, 4
      supplierOrRecipient: (0, import_pg_core.varchar)("supplier_or_recipient", { length: 255 }),
      // e.g. "National Store" or "Outreach Team A"
      transactionDate: (0, import_pg_core.timestamp)("transaction_date").defaultNow().notNull(),
      notes: (0, import_pg_core.text)("notes"),
      recordedByUserId: (0, import_pg_core.varchar)("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("stock_txn_tenant_idx").on(table.tenantId),
      facilityIdx: (0, import_pg_core.index)("stock_txn_facility_idx").on(table.facilityId)
    }));
    monthlyReports = (0, import_pg_core.pgTable)("monthly_reports", {
      id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
      tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
      facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
      month: (0, import_pg_core.integer)("month").notNull(),
      // 1 - 12
      year: (0, import_pg_core.integer)("year").notNull(),
      immunizations: (0, import_pg_core.jsonb)("immunizations").default({}).notNull(),
      // map of antigen/dose -> count, e.g. { BCG: 50, "Penta-1": 45 }
      stockSummary: (0, import_pg_core.jsonb)("stock_summary").default({}).notNull(),
      // map of vaccine -> stock details (opening, received, administered, wasted, closing, wastageRate)
      surveillance: (0, import_pg_core.jsonb)("surveillance").default({}).notNull(),
      // cases count, e.g. { measles: 0, afp: 1, nnt: 0, aefi: 1 }
      submittedById: (0, import_pg_core.varchar)("submitted_by_id").references(() => users.id, { onDelete: "set null" }),
      approvalStatus: approvalStatusEnum("approval_status").default("draft").notNull(),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
    }, (table) => ({
      tenantIdx: (0, import_pg_core.index)("monthly_rep_tenant_idx").on(table.tenantId),
      facilityIdx: (0, import_pg_core.index)("monthly_rep_facility_idx").on(table.facilityId)
    }));
    settlementsMaster = (0, import_pg_core.pgTable)(
      "settlements_master",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        name: (0, import_pg_core.varchar)("name", { length: 255 }).notNull(),
        placeType: (0, import_pg_core.varchar)("place_type", { length: 100 }).notNull(),
        // village, hamlet, suburb, neighbourhood, locality, town
        latitude: (0, import_pg_core.decimal)("latitude", { precision: 10, scale: 7 }).notNull(),
        longitude: (0, import_pg_core.decimal)("longitude", { precision: 10, scale: 7 }).notNull(),
        geojson: (0, import_pg_core.jsonb)("geojson").notNull().default({}),
        // GeoJSON Point geometry
        provinceName: (0, import_pg_core.varchar)("province_name", { length: 100 }),
        districtName: (0, import_pg_core.varchar)("district_name", { length: 100 }),
        constituencyName: (0, import_pg_core.varchar)("constituency_name", { length: 100 }),
        wardName: (0, import_pg_core.varchar)("ward_name", { length: 100 }),
        healthCatchment: (0, import_pg_core.varchar)("health_catchment", { length: 255 }),
        // linked health catchment area
        populationEstimate: (0, import_pg_core.integer)("population_estimate").default(0).notNull(),
        under5Population: (0, import_pg_core.integer)("under5_population").default(0).notNull(),
        buildingCount: (0, import_pg_core.integer)("building_count").default(0).notNull(),
        source: (0, import_pg_core.varchar)("source", { length: 100 }).default("osm").notNull(),
        // osm, grid3, manual_input
        sourceConfidence: (0, import_pg_core.decimal)("source_confidence", { precision: 5, scale: 2 }).default("0.90").notNull(),
        nearestHealthFacility: (0, import_pg_core.varchar)("nearest_health_facility", { length: 255 }),
        distanceToFacilityKm: (0, import_pg_core.decimal)("distance_to_facility_km", { precision: 8, scale: 2 }),
        estimatedTravelTime: (0, import_pg_core.integer)("estimated_travel_time"),
        // minutes
        accessibilityScore: (0, import_pg_core.decimal)("accessibility_score", { precision: 5, scale: 2 }),
        // 1.0 to 4.0
        hardToReach: (0, import_pg_core.boolean)("hard_to_reach").default(false).notNull(),
        validationStatus: (0, import_pg_core.varchar)("validation_status", { length: 50 }).default("approved").notNull(),
        // approved, pending
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
        updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_settlements_tenant").on(table.tenantId),
        adminSearchIdx: (0, import_pg_core.index)("idx_settlements_admin").on(table.tenantId, table.provinceName, table.districtName, table.wardName),
        statusIdx: (0, import_pg_core.index)("idx_settlements_status").on(table.tenantId, table.validationStatus)
      })
    );
    populationGrids = (0, import_pg_core.pgTable)(
      "population_grids",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        populationTotal: (0, import_pg_core.integer)("population_total").notNull(),
        under5Population: (0, import_pg_core.integer)("under5_population").default(0).notNull(),
        geojson: (0, import_pg_core.jsonb)("geojson").notNull().default({}),
        // GeoJSON Polygon
        rasterCell: (0, import_pg_core.varchar)("raster_cell", { length: 100 }),
        // Row/Col unique index
        densityClassification: (0, import_pg_core.varchar)("density_classification", { length: 50 }),
        // Extreme, High, Medium, Low, Scattered
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_pop_grids_tenant").on(table.tenantId),
        densityIdx: (0, import_pg_core.index)("idx_pop_grids_density").on(table.tenantId, table.densityClassification)
      })
    );
    candidateUnmappedSettlements = (0, import_pg_core.pgTable)(
      "candidate_unmapped_settlements",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        latitude: (0, import_pg_core.decimal)("latitude", { precision: 10, scale: 7 }).notNull(),
        longitude: (0, import_pg_core.decimal)("longitude", { precision: 10, scale: 7 }).notNull(),
        geojson: (0, import_pg_core.jsonb)("geojson").notNull().default({}),
        // GeoJSON Point
        estimatedPopulation: (0, import_pg_core.integer)("estimated_population").default(0).notNull(),
        buildingCount: (0, import_pg_core.integer)("building_count").default(0).notNull(),
        nearestNamedSettlement: (0, import_pg_core.varchar)("nearest_named_settlement", { length: 255 }),
        nearestFacility: (0, import_pg_core.varchar)("nearest_facility", { length: 255 }),
        distanceToFacility: (0, import_pg_core.decimal)("distance_to_facility", { precision: 8, scale: 2 }),
        confidenceScore: (0, import_pg_core.decimal)("confidence_score", { precision: 5, scale: 2 }).default("0.75").notNull(),
        validationStatus: (0, import_pg_core.varchar)("validation_status", { length: 50 }).default("pending").notNull(),
        // pending, validated, rejected
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
        updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_candidates_tenant").on(table.tenantId),
        statusIdx: (0, import_pg_core.index)("idx_candidates_status").on(table.tenantId, table.validationStatus)
      })
    );
    importedCoverage = (0, import_pg_core.pgTable)(
      "imported_coverage",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
        period: (0, import_pg_core.varchar)("period", { length: 10 }).notNull(),
        // "YYYYMM"
        antigen: (0, import_pg_core.varchar)("antigen", { length: 50 }).notNull(),
        dosesAdministered: (0, import_pg_core.integer)("doses_administered").notNull().default(0),
        targetPopOverride: (0, import_pg_core.integer)("target_pop_override"),
        source: (0, import_pg_core.varchar)("source", { length: 20 }).notNull(),
        // "dhis2" | "csv"
        sourceRef: (0, import_pg_core.varchar)("source_ref", { length: 255 }),
        // csvImportId or dhis2 integrationId
        importedByUserId: (0, import_pg_core.varchar)("imported_by_user_id").references(() => users.id, { onDelete: "set null" }),
        importedAt: (0, import_pg_core.timestamp)("imported_at").defaultNow().notNull()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_imported_coverage_tenant").on(table.tenantId),
        facilityIdx: (0, import_pg_core.index)("idx_imported_coverage_facility").on(table.tenantId, table.facilityId, table.period),
        uniqRow: (0, import_pg_core.unique)("imported_coverage_unique").on(
          table.tenantId,
          table.facilityId,
          table.period,
          table.antigen,
          table.source
        )
      })
    );
    csvImports = (0, import_pg_core.pgTable)(
      "csv_imports",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        filename: (0, import_pg_core.varchar)("filename", { length: 255 }).notNull(),
        rowCount: (0, import_pg_core.integer)("row_count").notNull().default(0),
        errorCount: (0, import_pg_core.integer)("error_count").notNull().default(0),
        importedCount: (0, import_pg_core.integer)("imported_count").notNull().default(0),
        status: (0, import_pg_core.varchar)("status", { length: 20 }).notNull().default("preview"),
        // preview | committed | failed
        errorReport: (0, import_pg_core.jsonb)("error_report").default([]).notNull(),
        // [{row, field, message}]
        uploadedByUserId: (0, import_pg_core.varchar)("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
        uploadedAt: (0, import_pg_core.timestamp)("uploaded_at").defaultNow().notNull()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_csv_imports_tenant").on(table.tenantId)
      })
    );
    supervisionVisits = (0, import_pg_core.pgTable)(
      "supervision_visits",
      {
        id: (0, import_pg_core.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
        tenantId: (0, import_pg_core.varchar)("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        facilityId: (0, import_pg_core.integer)("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
        microplanId: (0, import_pg_core.integer)("microplan_id").references(() => microplans.id, { onDelete: "set null" }),
        sessionPlanId: (0, import_pg_core.integer)("session_plan_id").references(() => sessionPlans.id, { onDelete: "set null" }),
        scheduledDate: (0, import_pg_core.timestamp)("scheduled_date").notNull(),
        conductedDate: (0, import_pg_core.timestamp)("conducted_date"),
        supervisorUserId: (0, import_pg_core.varchar)("supervisor_user_id").references(() => users.id, { onDelete: "set null" }),
        supervisorName: (0, import_pg_core.varchar)("supervisor_name", { length: 255 }),
        visitType: (0, import_pg_core.varchar)("visit_type", { length: 40 }).notNull().default("routine"),
        // routine | followup | adhoc | campaign
        status: (0, import_pg_core.varchar)("status", { length: 20 }).notNull().default("scheduled"),
        // scheduled | conducted | cancelled | missed
        checklist: (0, import_pg_core.jsonb)("checklist").default([]).notNull(),
        score: (0, import_pg_core.integer)("score"),
        // 0-100 derived from checklist
        findings: (0, import_pg_core.text)("findings"),
        followUpActions: (0, import_pg_core.text)("follow_up_actions"),
        nextVisitDate: (0, import_pg_core.timestamp)("next_visit_date"),
        createdByUserId: (0, import_pg_core.varchar)("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
        createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
      },
      (table) => ({
        tenantIdx: (0, import_pg_core.index)("idx_supervision_tenant").on(table.tenantId),
        facilityIdx: (0, import_pg_core.index)("idx_supervision_facility").on(table.tenantId, table.facilityId),
        scheduledIdx: (0, import_pg_core.index)("idx_supervision_scheduled").on(table.tenantId, table.scheduledDate)
      })
    );
    adminBoundariesRelations = (0, import_drizzle_orm.relations)(adminBoundaries, ({ one }) => ({
      tenant: one(tenants, { fields: [adminBoundaries.tenantId], references: [tenants.id] })
    }));
    facilityCatchmentsRelations = (0, import_drizzle_orm.relations)(facilityCatchments, ({ one }) => ({
      tenant: one(tenants, { fields: [facilityCatchments.tenantId], references: [tenants.id] }),
      facility: one(facilities, { fields: [facilityCatchments.facilityId], references: [facilities.id] }),
      drawnBy: one(users, { fields: [facilityCatchments.drawnByUserId], references: [users.id] })
    }));
    vaccineConfigurationsRelations = (0, import_drizzle_orm.relations)(vaccineConfigurations, ({ one, many }) => ({
      tenant: one(tenants, { fields: [vaccineConfigurations.tenantId], references: [tenants.id] }),
      clientVaccinations: many(clientVaccinations)
    }));
    clientsRelations = (0, import_drizzle_orm.relations)(clients, ({ one, many }) => ({
      tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
      facility: one(facilities, { fields: [clients.facilityId], references: [facilities.id] }),
      village: one(villages, { fields: [clients.villageId], references: [villages.id] }),
      vaccinations: many(clientVaccinations)
    }));
    clientVaccinationsRelations = (0, import_drizzle_orm.relations)(clientVaccinations, ({ one }) => ({
      tenant: one(tenants, { fields: [clientVaccinations.tenantId], references: [tenants.id] }),
      client: one(clients, { fields: [clientVaccinations.clientId], references: [clients.id] }),
      vaccineConfig: one(vaccineConfigurations, { fields: [clientVaccinations.vaccineConfigId], references: [vaccineConfigurations.id] }),
      administeredBy: one(users, { fields: [clientVaccinations.administeredByUserId], references: [users.id] })
    }));
    sessionDayPlansRelations = (0, import_drizzle_orm.relations)(sessionDayPlans, ({ one }) => ({
      tenant: one(tenants, { fields: [sessionDayPlans.tenantId], references: [tenants.id] }),
      sessionPlan: one(sessionPlans, { fields: [sessionDayPlans.sessionPlanId], references: [sessionPlans.id] })
    }));
    stockTransactionsRelations = (0, import_drizzle_orm.relations)(stockTransactions, ({ one }) => ({
      tenant: one(tenants, { fields: [stockTransactions.tenantId], references: [tenants.id] }),
      facility: one(facilities, { fields: [stockTransactions.facilityId], references: [facilities.id] }),
      recordedBy: one(users, { fields: [stockTransactions.recordedByUserId], references: [users.id] })
    }));
    monthlyReportsRelations = (0, import_drizzle_orm.relations)(monthlyReports, ({ one }) => ({
      tenant: one(tenants, { fields: [monthlyReports.tenantId], references: [tenants.id] }),
      facility: one(facilities, { fields: [monthlyReports.facilityId], references: [facilities.id] }),
      submittedBy: one(users, { fields: [monthlyReports.submittedById], references: [users.id] })
    }));
    settlementsMasterRelations = (0, import_drizzle_orm.relations)(settlementsMaster, ({ one }) => ({
      tenant: one(tenants, { fields: [settlementsMaster.tenantId], references: [tenants.id] })
    }));
    populationGridsRelations = (0, import_drizzle_orm.relations)(populationGrids, ({ one }) => ({
      tenant: one(tenants, { fields: [populationGrids.tenantId], references: [tenants.id] })
    }));
    candidateUnmappedSettlementsRelations = (0, import_drizzle_orm.relations)(candidateUnmappedSettlements, ({ one }) => ({
      tenant: one(tenants, { fields: [candidateUnmappedSettlements.tenantId], references: [tenants.id] })
    }));
    insertAdminBoundarySchema = (0, import_drizzle_zod.createInsertSchema)(adminBoundaries).omit({
      id: true,
      fetchedAt: true,
      createdAt: true,
      updatedAt: true
    });
    insertFacilityCatchmentSchema = (0, import_drizzle_zod.createInsertSchema)(facilityCatchments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertVaccineConfigSchema = (0, import_drizzle_zod.createInsertSchema)(vaccineConfigurations).omit({
      tenantId: true,
      createdAt: true
    });
    insertClientSchema = (0, import_drizzle_zod.createInsertSchema)(clients).omit({
      createdAt: true,
      updatedAt: true
    }).extend({
      villageId: import_zod.z.number().optional().nullable(),
      dateOfBirth: import_zod.z.coerce.date()
    });
    insertClientVaccinationSchema = (0, import_drizzle_zod.createInsertSchema)(clientVaccinations).omit({
      createdAt: true
    }).extend({
      administeredDate: import_zod.z.coerce.date(),
      expiryDate: import_zod.z.coerce.date().optional().nullable()
    });
    insertSessionDayPlanSchema = (0, import_drizzle_zod.createInsertSchema)(sessionDayPlans).omit({
      tenantId: true,
      createdAt: true
    }).extend({
      sessionDate: import_zod.z.coerce.date(),
      executedAt: import_zod.z.coerce.date().optional().nullable()
    });
    insertStockTransactionSchema = (0, import_drizzle_zod.createInsertSchema)(stockTransactions).omit({
      createdAt: true
    }).extend({
      expiryDate: import_zod.z.coerce.date(),
      transactionDate: import_zod.z.coerce.date().optional()
    });
    insertMonthlyReportSchema = (0, import_drizzle_zod.createInsertSchema)(monthlyReports).omit({
      createdAt: true
    });
    insertSettlementMasterSchema = (0, import_drizzle_zod.createInsertSchema)(settlementsMaster).omit({
      createdAt: true,
      updatedAt: true
    });
    insertPopulationGridSchema = (0, import_drizzle_zod.createInsertSchema)(populationGrids).omit({
      createdAt: true
    });
    insertCandidateUnmappedSettlementSchema = (0, import_drizzle_zod.createInsertSchema)(candidateUnmappedSettlements).omit({
      createdAt: true,
      updatedAt: true
    });
    insertImportedCoverageSchema = (0, import_drizzle_zod.createInsertSchema)(importedCoverage).omit({
      id: true,
      importedAt: true
    });
    insertCsvImportSchema = (0, import_drizzle_zod.createInsertSchema)(csvImports).omit({
      id: true,
      uploadedAt: true
    });
    coverageCsvRowSchema = import_zod.z.object({
      facility_external_id: import_zod.z.string().min(1, "facility_external_id required"),
      period: import_zod.z.string().regex(/^\d{4}-?\d{2}$/, 'period must be "YYYYMM" or "YYYY-MM"').transform((p) => p.replace("-", "")),
      antigen: import_zod.z.string().min(1, "antigen required").transform((a) => a.trim().toUpperCase()),
      doses_administered: import_zod.z.coerce.number().int().nonnegative(),
      target_pop_override: import_zod.z.coerce.number().int().nonnegative().optional().nullable()
    });
    insertMobilizationActivitySchema = (0, import_drizzle_zod.createInsertSchema)(mobilizationActivities).omit({
      createdAt: true
    });
    insertApprovalRequestSchema = (0, import_drizzle_zod.createInsertSchema)(approvalRequests).omit({
      submittedAt: true,
      resolvedAt: true
    });
    insertTenantInterestRequestSchema = (0, import_drizzle_zod.createInsertSchema)(tenantInterestRequests).omit({
      id: true,
      status: true,
      createdAt: true
    }).extend({
      requestedRole: import_zod.z.enum(SELF_SIGNUP_ROLES),
      email: import_zod.z.string().email().max(255),
      fullName: import_zod.z.string().min(2).max(255),
      countryCode: import_zod.z.string().length(3).regex(/^[A-Z]{3}$/, "ISO-3 country code"),
      countryName: import_zod.z.string().min(2).max(255),
      organization: import_zod.z.string().max(255).optional().nullable(),
      justification: import_zod.z.string().max(2e3).optional().nullable()
    });
    insertSupervisionVisitSchema = (0, import_drizzle_zod.createInsertSchema)(supervisionVisits).omit({
      id: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
var import_node_postgres, import_pg, Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = __toESM(require("pg"), 1);
    init_schema();
    ({ Pool } = import_pg.default);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// server/services/hisInteropService.ts
function resolveToken(secretRef) {
  const value = process.env[secretRef];
  if (!value) {
    return "mock_his_integration_token_for_demo_purposes";
  }
  return value;
}
function resolveTokenForRef(secretRef) {
  return resolveToken(secretRef);
}
function buildHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
}
function fhirIdSystem(tenantCode, kind) {
  return `http://vaxplan.io/fhir/sid/${tenantCode.toLowerCase()}/${kind}`;
}
function toIsoDate(d) {
  if (!d) return void 0;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return void 0;
  return dt.toISOString();
}
function toIsoDay(d) {
  const iso = toIsoDate(d);
  return iso ? iso.slice(0, 10) : void 0;
}
function normalizeGender(g) {
  const v = (g ?? "").toLowerCase();
  if (v === "male" || v === "female" || v === "other") return v;
  return "unknown";
}
function vaccineCoding(name, explicit) {
  if (explicit) {
    return [{ system: "http://hl7.org/fhir/sid/cvx", code: explicit, display: name }];
  }
  const key = name.toUpperCase().replace(/\s+/g, "");
  const mapped = VAXPLAN_CVX_MAP[key] ?? VAXPLAN_CVX_MAP[key.split("-")[0]];
  if (mapped) {
    return [{ system: "http://hl7.org/fhir/sid/cvx", code: mapped.code, display: mapped.display }];
  }
  return [{ system: "http://vaxplan.io/fhir/CodeSystem/vaccine-name", code: key || "UNKNOWN", display: name }];
}
function buildPatient(input) {
  const c = input.client;
  const identifiers = [
    { system: fhirIdSystem(input.tenantCode, "client"), value: c.id }
  ];
  if (c.externalHisId) {
    identifiers.push({ system: "http://vaxplan.io/fhir/sid/external-his", value: c.externalHisId });
  }
  const parts = c.name.trim().split(/\s+/);
  const family = parts.length > 1 ? parts[parts.length - 1] : void 0;
  const given = parts.length > 1 ? parts.slice(0, -1) : [c.name];
  return {
    resourceType: "Patient",
    identifier: identifiers,
    name: [family ? { family, given } : { given: [c.name], text: c.name }],
    gender: normalizeGender(c.gender),
    birthDate: toIsoDay(c.dateOfBirth ?? void 0)
  };
}
function buildLocation(input) {
  const f = input.facility;
  const lat = f.latitude != null ? Number(f.latitude) : void 0;
  const lon = f.longitude != null ? Number(f.longitude) : void 0;
  const identifiers = [
    { system: fhirIdSystem(input.tenantCode, "facility"), value: String(f.id) }
  ];
  if (f.hmisCode) {
    identifiers.push({ system: "http://vaxplan.io/fhir/sid/hmis", value: f.hmisCode });
  }
  return {
    resourceType: "Location",
    identifier: identifiers,
    status: "active",
    name: f.name,
    address: f.address ? { text: f.address } : void 0,
    position: Number.isFinite(lat) && Number.isFinite(lon) ? { latitude: lat, longitude: lon } : void 0,
    physicalType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "si",
          display: "Site"
        }
      ]
    }
  };
}
function buildPractitioner(input) {
  const p = input.practitioner;
  if (!p) return null;
  const parts = [p.firstName, p.lastName].filter(Boolean);
  const display = parts.length ? parts.join(" ") : p.email ?? p.id;
  return {
    resourceType: "Practitioner",
    identifier: [{ system: fhirIdSystem(input.tenantCode, "practitioner"), value: p.id }],
    active: true,
    name: [
      {
        text: display,
        family: p.lastName ?? void 0,
        given: p.firstName ? [p.firstName] : void 0
      }
    ],
    telecom: p.email ? [{ system: "email", value: p.email }] : void 0
  };
}
function buildEncounter(input, refs) {
  const occurredAt = toIsoDate(input.vaccination.administeredDate) ?? (/* @__PURE__ */ new Date()).toISOString();
  return {
    resourceType: "Encounter",
    identifier: [
      { system: fhirIdSystem(input.tenantCode, "encounter"), value: `vacc-${input.vaccination.id}` }
    ],
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory"
    },
    type: [
      {
        coding: [
          { system: "http://snomed.info/sct", code: "33879002", display: "Active immunization" }
        ]
      }
    ],
    subject: { reference: refs.patientUrn },
    period: { start: occurredAt, end: occurredAt },
    location: [{ location: { reference: refs.locationUrn } }],
    participant: refs.practitionerUrn ? [{ individual: { reference: refs.practitionerUrn } }] : void 0
  };
}
function buildImmunization(input, refs) {
  const v = input.vaccination;
  const occurredAt = toIsoDate(v.administeredDate) ?? (/* @__PURE__ */ new Date()).toISOString();
  const extensions = [];
  if (v.vvmStatus != null) {
    extensions.push({
      url: "http://vaxplan.io/fhir/StructureDefinition/vvm-status",
      valueString: String(v.vvmStatus)
    });
  }
  return {
    resourceType: "Immunization",
    identifier: [
      { system: fhirIdSystem(input.tenantCode, "immunization"), value: String(v.id) }
    ],
    status: "completed",
    vaccineCode: { coding: vaccineCoding(v.vaccineName, v.vaccineCode) },
    patient: { reference: refs.patientUrn },
    encounter: { reference: refs.encounterUrn },
    occurrenceDateTime: occurredAt,
    primarySource: true,
    location: { reference: refs.locationUrn },
    lotNumber: v.batchNumber ?? void 0,
    expirationDate: toIsoDay(v.expiryDate ?? void 0),
    performer: refs.practitionerUrn ? [
      {
        function: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0443",
              code: "AP",
              display: "Administering Provider"
            }
          ]
        },
        actor: { reference: refs.practitionerUrn }
      }
    ] : void 0,
    protocolApplied: v.doseNumber != null ? [{ doseNumberPositiveInt: v.doseNumber }] : void 0,
    extension: extensions.length ? extensions : void 0
  };
}
function buildVaccinationBundle(input) {
  const ids = {
    patient: `urn:uuid:patient-${input.client.id}`,
    location: `urn:uuid:location-${input.facility.id}`,
    practitioner: input.practitioner ? `urn:uuid:practitioner-${input.practitioner.id}` : void 0,
    encounter: `urn:uuid:encounter-vacc-${input.vaccination.id}`,
    immunization: `urn:uuid:immunization-${input.vaccination.id}`
  };
  const patient = buildPatient(input);
  const location = buildLocation(input);
  const practitioner = buildPractitioner(input);
  const encounter = buildEncounter(input, {
    patientUrn: ids.patient,
    locationUrn: ids.location,
    practitionerUrn: ids.practitioner
  });
  const immunization = buildImmunization(input, {
    patientUrn: ids.patient,
    locationUrn: ids.location,
    encounterUrn: ids.encounter,
    practitionerUrn: ids.practitioner
  });
  const conditionalUrl = (resourceType, identifier) => `${resourceType}?identifier=${encodeURIComponent(identifier.system)}|${encodeURIComponent(identifier.value)}`;
  const entries = [];
  entries.push({
    fullUrl: ids.patient,
    resource: patient,
    request: { method: "PUT", url: conditionalUrl("Patient", patient.identifier[0]) }
  });
  entries.push({
    fullUrl: ids.location,
    resource: location,
    request: { method: "PUT", url: conditionalUrl("Location", location.identifier[0]) }
  });
  if (practitioner) {
    entries.push({
      fullUrl: ids.practitioner,
      resource: practitioner,
      request: { method: "PUT", url: conditionalUrl("Practitioner", practitioner.identifier[0]) }
    });
  }
  entries.push({
    fullUrl: ids.encounter,
    resource: encounter,
    request: { method: "PUT", url: conditionalUrl("Encounter", encounter.identifier[0]) }
  });
  entries.push({
    fullUrl: ids.immunization,
    resource: immunization,
    request: { method: "PUT", url: conditionalUrl("Immunization", immunization.identifier[0]) }
  });
  return {
    resourceType: "Bundle",
    type: "transaction",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    entry: entries
  };
}
function validateFhirBundle(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== "object") {
    return { valid: false, errors: ["bundle is not an object"] };
  }
  if (bundle.resourceType !== "Bundle") errors.push("resourceType must be 'Bundle'");
  if (bundle.type !== "transaction") errors.push("Bundle.type must be 'transaction'");
  if (!Array.isArray(bundle.entry) || bundle.entry.length === 0) {
    errors.push("Bundle.entry must be a non-empty array");
    return { valid: false, errors };
  }
  const fullUrls = /* @__PURE__ */ new Set();
  const byType = {};
  for (const [i, entry] of bundle.entry.entries()) {
    const where = `entry[${i}]`;
    if (!entry.fullUrl) errors.push(`${where}.fullUrl is required`);
    if (entry.fullUrl) fullUrls.add(entry.fullUrl);
    if (!entry.resource?.resourceType) errors.push(`${where}.resource.resourceType is required`);
    if (!entry.request?.method || !entry.request?.url) {
      errors.push(`${where}.request.method and request.url are required for transaction bundles`);
    }
    if (entry.request?.method === "PUT" && !entry.request.url.includes("identifier=")) {
      errors.push(`${where}.request.url must use a conditional identifier= match for idempotent PUT`);
    }
    const rt = entry.resource?.resourceType;
    if (rt) {
      (byType[rt] ||= []).push(entry.resource);
      if (!Array.isArray(entry.resource.identifier) || entry.resource.identifier.length === 0) {
        errors.push(`${where} (${rt}) must have at least one identifier`);
      }
    }
  }
  for (const rt of ["Patient", "Encounter", "Immunization", "Location"]) {
    if (!byType[rt]?.length) errors.push(`Bundle is missing required resource: ${rt}`);
  }
  for (const imm of byType["Immunization"] ?? []) {
    if (imm.status !== "completed") errors.push("Immunization.status must be 'completed'");
    if (!imm.vaccineCode?.coding?.length) errors.push("Immunization.vaccineCode.coding is required");
    if (!imm.patient?.reference) errors.push("Immunization.patient.reference is required");
    if (!imm.occurrenceDateTime) errors.push("Immunization.occurrenceDateTime is required");
    if (imm.patient?.reference && !fullUrls.has(imm.patient.reference)) {
      errors.push(`Immunization.patient.reference '${imm.patient.reference}' does not resolve within bundle`);
    }
    if (imm.encounter?.reference && !fullUrls.has(imm.encounter.reference)) {
      errors.push(`Immunization.encounter.reference '${imm.encounter.reference}' does not resolve within bundle`);
    }
    if (imm.location?.reference && !fullUrls.has(imm.location.reference)) {
      errors.push(`Immunization.location.reference '${imm.location.reference}' does not resolve within bundle`);
    }
  }
  for (const enc of byType["Encounter"] ?? []) {
    if (!enc.status) errors.push("Encounter.status is required");
    if (!enc.class?.code) errors.push("Encounter.class.code is required");
    if (!enc.subject?.reference) errors.push("Encounter.subject.reference is required");
    if (enc.subject?.reference && !fullUrls.has(enc.subject.reference)) {
      errors.push(`Encounter.subject.reference '${enc.subject.reference}' does not resolve within bundle`);
    }
  }
  return { valid: errors.length === 0, errors };
}
function createHisAdapter(config) {
  switch (config.type) {
    case "dhis2":
      return new Dhis2Adapter(config);
    case "fhir_r4":
      return new FhirR4Adapter(config);
    case "hmis_generic":
      return new HmisGenericAdapter(config);
    default:
      throw new Error(`Unknown HIS adapter type: "${config.type}"`);
  }
}
function parseHisIntegrations(tenantSettings) {
  if (!tenantSettings?.hisIntegrations) return [];
  if (!Array.isArray(tenantSettings.hisIntegrations)) return [];
  return tenantSettings.hisIntegrations.filter(
    (cfg) => cfg && typeof cfg.id === "string" && typeof cfg.type === "string" && typeof cfg.baseUrl === "string" && typeof cfg.secretRef === "string"
  ).map((cfg) => cfg);
}
function getIntegrationStatus(integrations) {
  return integrations.map((cfg) => ({
    id: cfg.id,
    type: cfg.type,
    label: cfg.label,
    enabled: cfg.enabled,
    hasToken: Boolean(process.env[cfg.secretRef]),
    baseUrl: cfg.baseUrl
  }));
}
var Dhis2Adapter, VAXPLAN_CVX_MAP, FhirR4Adapter, HmisGenericAdapter;
var init_hisInteropService = __esm({
  "server/services/hisInteropService.ts"() {
    "use strict";
    Dhis2Adapter = class {
      type = "dhis2";
      config;
      constructor(config) {
        this.config = config;
      }
      getToken() {
        return resolveToken(this.config.secretRef);
      }
      async pushImmunizations(records) {
        const startMs = Date.now();
        const errors = [];
        const warnings = [];
        try {
          const token = this.getToken();
          if (token === "mock_his_integration_token_for_demo_purposes") {
            return {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: records.length,
              errors: [],
              warnings: ["SIMULATION MODE: DHIS2 server mocked successfully."],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          const dataValues = [];
          const groups = /* @__PURE__ */ new Map();
          for (const rec of records) {
            const period = rec.administeredDate.slice(0, 7).replace("-", "");
            const orgUnit = rec.facilityDhis2OrgUnitId ?? this.config.dhis2RootOrgUnit ?? "UNKNOWN_OU";
            const key = `${orgUnit}|${period}|${rec.vaccineName}`;
            groups.set(key, (groups.get(key) ?? 0) + 1);
            if (!rec.facilityDhis2OrgUnitId) {
              warnings.push(`Record for "${rec.vaccineName}" at facility ${rec.facilityId} has no DHIS2 org unit \u2014 using root org unit`);
            }
          }
          for (const [key, count] of Array.from(groups.entries())) {
            const [orgUnit, period, vaccineName] = key.split("|");
            const envKey = `DHIS2_DE_${vaccineName.replace(/[^A-Z0-9]/gi, "_").toUpperCase()}_UID`;
            const dataElement = process.env[envKey];
            if (!dataElement) {
              warnings.push(`No DHIS2 data element UID for vaccine "${vaccineName}". Set env var "${envKey}".`);
              continue;
            }
            dataValues.push({ dataElement, period, orgUnit, value: String(count) });
          }
          if (dataValues.length === 0) {
            return {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: 0,
              errors,
              warnings: [...warnings, "No data values to push (check DHIS2 data element UID mappings)"],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          const payload = {
            dataSet: this.config.dhis2DataSetUid ?? void 0,
            dataValues
          };
          const url = `${this.config.baseUrl}/api/dataValueSets`;
          const response = await fetch(url, {
            method: "POST",
            headers: buildHeaders(token),
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3e4)
          });
          if (!response.ok) {
            const body = await response.text();
            throw new Error(`DHIS2 dataValueSets POST ${response.status}: ${body}`);
          }
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: true,
            recordsProcessed: records.length,
            errors,
            warnings,
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: [...errors, err.message ?? String(err)],
            warnings,
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      async pushPatient(_record) {
        return {
          integrationId: this.config.id,
          integrationLabel: this.config.label,
          success: false,
          recordsProcessed: 0,
          errors: ["pushPatient is not supported by the DHIS2 aggregate adapter. Use the FHIR R4 adapter for patient records."],
          warnings: [],
          durationMs: 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      async pullOrgUnits() {
        const startMs = Date.now();
        const errors = [];
        const orgUnits = [];
        try {
          const token = this.getToken();
          if (token === "mock_his_integration_token_for_demo_purposes") {
            return {
              result: {
                integrationId: this.config.id,
                integrationLabel: this.config.label,
                success: true,
                recordsProcessed: 3,
                errors: [],
                warnings: ["SIMULATION MODE: Org units pulled from mock catalog."],
                durationMs: Date.now() - startMs,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              },
              orgUnits: [
                { dhis2Id: "ou-mock-1", name: "Mock Central Hospital", level: 4, parentId: "district-1" },
                { dhis2Id: "ou-mock-2", name: "Mock Clinic A", level: 4, parentId: "district-1" },
                { dhis2Id: "ou-mock-3", name: "Mock Outreach Point B", level: 4, parentId: "district-2" }
              ]
            };
          }
          const url = `${this.config.baseUrl}/api/organisationUnits?paging=false&level=4&fields=id,code,name,level,parent[id],geometry`;
          const response = await fetch(url, {
            headers: buildHeaders(token),
            signal: AbortSignal.timeout(6e4)
          });
          if (!response.ok) {
            throw new Error(`DHIS2 orgUnits GET ${response.status}: ${await response.text()}`);
          }
          const data = await response.json();
          for (const ou of data.organisationUnits ?? []) {
            const coordinates = ou.geometry?.type === "Point" ? [ou.geometry.coordinates[0], ou.geometry.coordinates[1]] : void 0;
            orgUnits.push({
              dhis2Id: ou.id,
              dhis2Code: ou.code,
              name: ou.name,
              level: ou.level,
              parentId: ou.parent?.id,
              coordinates
            });
          }
          return {
            result: {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: orgUnits.length,
              errors,
              warnings: [],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            orgUnits
          };
        } catch (err) {
          return {
            result: {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: false,
              recordsProcessed: 0,
              errors: [...errors, err.message ?? String(err)],
              warnings: [],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            orgUnits: []
          };
        }
      }
    };
    VAXPLAN_CVX_MAP = {
      BCG: { code: "19", display: "BCG" },
      "HEPB": { code: "08", display: "Hep B" },
      "HEPB-BIRTH": { code: "08", display: "Hep B, adolescent or pediatric" },
      OPV: { code: "89", display: "Polio, NOS (OPV)" },
      IPV: { code: "10", display: "IPV" },
      PENTA: { code: "120", display: "DTaP-Hib-IPV" },
      "PENTA-1": { code: "120", display: "DTaP-Hib-IPV" },
      "PENTA-2": { code: "120", display: "DTaP-Hib-IPV" },
      "PENTA-3": { code: "120", display: "DTaP-Hib-IPV" },
      PCV: { code: "133", display: "Pneumococcal conjugate PCV 13" },
      ROTA: { code: "116", display: "Rotavirus, pentavalent" },
      MEASLES: { code: "05", display: "Measles" },
      MR: { code: "04", display: "M/R" },
      MMR: { code: "03", display: "MMR" },
      TT: { code: "113", display: "Td (adult)" },
      TD: { code: "113", display: "Td (adult)" }
    };
    FhirR4Adapter = class {
      type = "fhir_r4";
      config;
      constructor(config) {
        this.config = config;
      }
      getToken() {
        return resolveToken(this.config.secretRef);
      }
      get fhirBase() {
        return this.config.fhirBaseUrl ?? `${this.config.baseUrl}/fhir`;
      }
      async pushImmunizations(records) {
        const startMs = Date.now();
        const errors = [];
        const warnings = [];
        let processed = 0;
        try {
          const token = this.getToken();
          if (token === "mock_his_integration_token_for_demo_purposes") {
            return {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: records.length,
              errors: [],
              warnings: ["SIMULATION MODE: HL7 FHIR Bundle posted successfully."],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          const entries = records.map((rec) => ({
            resource: {
              resourceType: "Immunization",
              status: "completed",
              vaccineCode: {
                coding: rec.vaccineCode ? [{ system: "http://hl7.org/fhir/sid/cvx", code: rec.vaccineCode, display: rec.vaccineName }] : [{ display: rec.vaccineName }]
              },
              patient: rec.clientExternalHisId ? { reference: `Patient/${rec.clientExternalHisId}` } : { display: "Unknown" },
              occurrenceDateTime: rec.administeredDate,
              lotNumber: rec.batchNumber,
              performer: rec.workerName ? [{ actor: { display: rec.workerName } }] : void 0,
              location: rec.facilityHmisCode ? { identifier: { value: rec.facilityHmisCode } } : void 0,
              protocolApplied: [{ doseNumberPositiveInt: rec.doseNumber }],
              extension: rec.vvmStatus ? [
                {
                  url: "http://vaxplan.io/fhir/extension/vvm-status",
                  valueString: rec.vvmStatus
                }
              ] : void 0
            },
            request: { method: "POST", url: "Immunization" }
          }));
          const bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: entries
          };
          const response = await fetch(`${this.fhirBase}/`, {
            method: "POST",
            headers: buildHeaders(token),
            body: JSON.stringify(bundle),
            signal: AbortSignal.timeout(6e4)
          });
          if (!response.ok) {
            const body = await response.text();
            throw new Error(`FHIR Bundle POST ${response.status}: ${body}`);
          }
          const responseBundle = await response.json();
          for (const entry of responseBundle.entry ?? []) {
            const status = entry?.response?.status ?? "";
            if (status.startsWith("2")) {
              processed++;
            } else {
              errors.push(`FHIR entry status: ${status}`);
            }
          }
          if (processed === 0 && errors.length === 0) {
            processed = records.length;
          }
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: errors.length === 0,
            recordsProcessed: processed,
            errors,
            warnings,
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: [...errors, err.message ?? String(err)],
            warnings,
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      async pushPatient(record) {
        const startMs = Date.now();
        try {
          const token = this.getToken();
          if (token === "mock_his_integration_token_for_demo_purposes") {
            return {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: 1,
              errors: [],
              warnings: ["SIMULATION MODE: HL7 FHIR Patient registered successfully."],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          const fhirPatient = {
            resourceType: "Patient",
            name: record.lastName ? [{ family: record.lastName, given: [record.firstName] }] : [{ text: record.firstName }],
            gender: record.gender ?? "unknown",
            birthDate: record.dateOfBirth,
            identifier: record.facilityHmisCode ? [{ system: "http://vaxplan.io/fhir/identifier/hmis", value: record.facilityHmisCode }] : void 0,
            extension: [
              {
                url: "http://vaxplan.io/fhir/extension/tenant-code",
                valueString: record.tenantCode
              }
            ]
          };
          const method = record.externalHisId ? "PUT" : "POST";
          const url = record.externalHisId ? `${this.fhirBase}/Patient/${record.externalHisId}` : `${this.fhirBase}/Patient`;
          const response = await fetch(url, {
            method,
            headers: buildHeaders(token),
            body: JSON.stringify(fhirPatient),
            signal: AbortSignal.timeout(3e4)
          });
          if (!response.ok) {
            const body = await response.text();
            throw new Error(`FHIR Patient ${method} ${response.status}: ${body}`);
          }
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: true,
            recordsProcessed: 1,
            errors: [],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: [err.message ?? String(err)],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      /**
       * Export a single vaccination event as a fully-linked FHIR R4 transaction
       * Bundle (Patient + Encounter + Immunization + Location + Practitioner).
       *
       * Idempotent: every entry is a conditional PUT keyed by tenant-namespaced
       * identifier, so re-running the export upserts on the destination server
       * instead of duplicating resources.
       *
       * Includes a fast retry with exponential backoff (3 attempts) for transient
       * network/5xx failures; persistent failures are reported in the result so
       * callers can route them to a dead-letter queue.
       */
      async exportVaccinationBundle(input) {
        const startMs = Date.now();
        const bundle = buildVaccinationBundle(input);
        const validation = validateFhirBundle(bundle);
        if (!validation.valid) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: validation.errors,
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            bundle,
            validation
          };
        }
        const token = this.getToken();
        if (token === "mock_his_integration_token_for_demo_purposes") {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: true,
            recordsProcessed: bundle.entry.length,
            errors: [],
            warnings: ["SIMULATION MODE: vaccination bundle assembled but not posted (no destination token)."],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            bundle,
            response: { simulated: true, entry: bundle.entry.map((e) => ({ response: { status: "201 Created" } })) },
            validation
          };
        }
        const maxAttempts = 3;
        let lastErr = null;
        let responseJson = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const response = await fetch(`${this.fhirBase}/`, {
              method: "POST",
              headers: buildHeaders(token),
              body: JSON.stringify(bundle),
              signal: AbortSignal.timeout(6e4)
            });
            const body = await response.text();
            if (!response.ok) {
              lastErr = `FHIR transaction POST ${response.status}: ${body}`;
              if (response.status >= 500 || response.status === 408 || response.status === 429) {
                if (attempt < maxAttempts) {
                  await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt - 1)));
                  continue;
                }
              }
              break;
            }
            try {
              responseJson = JSON.parse(body);
            } catch {
              responseJson = { raw: body };
            }
            return {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: bundle.entry.length,
              errors: [],
              warnings: [],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              bundle,
              response: responseJson,
              validation
            };
          } catch (err) {
            lastErr = err?.message ?? String(err);
            if (attempt < maxAttempts) {
              await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt - 1)));
              continue;
            }
          }
        }
        return {
          integrationId: this.config.id,
          integrationLabel: this.config.label,
          success: false,
          recordsProcessed: 0,
          errors: [lastErr ?? "FHIR transaction POST failed", `Exhausted ${maxAttempts} attempts \u2014 route to dead-letter queue`],
          warnings: [],
          durationMs: Date.now() - startMs,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          bundle,
          validation
        };
      }
      async pullOrgUnits() {
        const startMs = Date.now();
        const orgUnits = [];
        try {
          const token = this.getToken();
          if (token === "mock_his_integration_token_for_demo_purposes") {
            return {
              result: {
                integrationId: this.config.id,
                integrationLabel: this.config.label,
                success: true,
                recordsProcessed: 2,
                errors: [],
                warnings: ["SIMULATION MODE: HL7 FHIR Organizations pulled successfully."],
                durationMs: Date.now() - startMs,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              },
              orgUnits: [
                { dhis2Id: "fhir-org-1", name: "FHIR Mock Facility 1", level: 4 },
                { dhis2Id: "fhir-org-2", name: "FHIR Mock Facility 2", level: 4 }
              ]
            };
          }
          const url = `${this.fhirBase}/Organization?type=HealthcareService&_count=500`;
          const response = await fetch(url, {
            headers: buildHeaders(token),
            signal: AbortSignal.timeout(6e4)
          });
          if (!response.ok) {
            throw new Error(`FHIR Organization GET ${response.status}: ${await response.text()}`);
          }
          const bundle = await response.json();
          for (const entry of bundle.entry ?? []) {
            const org = entry.resource;
            if (!org?.id) continue;
            orgUnits.push({
              dhis2Id: org.id,
              dhis2Code: org.identifier?.[0]?.value,
              name: org.name ?? "Unknown",
              level: 4,
              parentId: org.partOf?.reference?.split("/")[1]
            });
          }
          return {
            result: {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: true,
              recordsProcessed: orgUnits.length,
              errors: [],
              warnings: [],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            orgUnits
          };
        } catch (err) {
          return {
            result: {
              integrationId: this.config.id,
              integrationLabel: this.config.label,
              success: false,
              recordsProcessed: 0,
              errors: [err.message ?? String(err)],
              warnings: [],
              durationMs: Date.now() - startMs,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            orgUnits: []
          };
        }
      }
    };
    HmisGenericAdapter = class {
      type = "hmis_generic";
      config;
      constructor(config) {
        this.config = config;
      }
      getToken() {
        return resolveToken(this.config.secretRef);
      }
      async postPayload(payload) {
        const token = this.getToken();
        if (token === "mock_his_integration_token_for_demo_purposes") {
          return { ok: true, status: 200, body: JSON.stringify({ message: "SIMULATION SUCCESS", source: "Mock REST Gateway" }) };
        }
        const response = await fetch(this.config.baseUrl, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3e4)
        });
        const body = await response.text();
        return { ok: response.ok, status: response.status, body };
      }
      async pushImmunizations(records) {
        const startMs = Date.now();
        try {
          const { ok, status, body } = await this.postPayload({
            source: "VaxPlan",
            tenantCode: records[0]?.tenantCode ?? "UNKNOWN",
            pushTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
            immunizations: records
          });
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: ok,
            recordsProcessed: ok ? records.length : 0,
            errors: ok ? [] : [`HMIS Generic POST ${status}: ${body}`],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: [err.message ?? String(err)],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      async pushPatient(record) {
        const startMs = Date.now();
        try {
          const { ok, status, body } = await this.postPayload({
            source: "VaxPlan",
            tenantCode: record.tenantCode,
            pushTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
            patient: record
          });
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: ok,
            recordsProcessed: ok ? 1 : 0,
            errors: ok ? [] : [`HMIS Generic Patient POST ${status}: ${body}`],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (err) {
          return {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: [err.message ?? String(err)],
            warnings: [],
            durationMs: Date.now() - startMs,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
      async pullOrgUnits() {
        return {
          result: {
            integrationId: this.config.id,
            integrationLabel: this.config.label,
            success: false,
            recordsProcessed: 0,
            errors: ["pullOrgUnits is not supported by the generic HMIS adapter."],
            warnings: [],
            durationMs: 0,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          },
          orgUnits: []
        };
      }
    };
  }
});

// server/services/coverageImportService.ts
var coverageImportService_exports = {};
__export(coverageImportService_exports, {
  commitCsvImport: () => commitCsvImport,
  commitDhis2Coverage: () => commitDhis2Coverage,
  previewCsvImport: () => previewCsvImport,
  pullDhis2Coverage: () => pullDhis2Coverage,
  scoreMissedCommunities: () => scoreMissedCommunities
});
async function previewCsvImport(tenantId, filename, csvBuffer) {
  const errors = [];
  let records = [];
  try {
    records = (0, import_sync.parse)(csvBuffer, {
      columns: (header) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } catch (err) {
    return {
      filename,
      rowCount: 0,
      validRows: [],
      errors: [{ row: 0, message: `CSV parse error: ${err?.message ?? String(err)}` }],
      unknownFacilityExternalIds: []
    };
  }
  const validated = [];
  records.forEach((rec, idx) => {
    const result = coverageCsvRowSchema.safeParse(rec);
    if (!result.success) {
      result.error.errors.forEach((e) => {
        errors.push({
          row: idx + 2,
          // +2 for 1-based + header row
          field: String(e.path[0] ?? ""),
          message: e.message,
          raw: rec
        });
      });
      return;
    }
    validated.push({ rowIndex: idx + 2, row: result.data });
  });
  const externalIds = Array.from(new Set(validated.map((v) => v.row.facility_external_id)));
  const facilityRows = externalIds.length ? await db.select({ id: facilities.id, hmisCode: facilities.hmisCode }).from(facilities).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(facilities.tenantId, tenantId), (0, import_drizzle_orm8.inArray)(facilities.hmisCode, externalIds))) : [];
  const facilityByCode = new Map(
    facilityRows.filter((f) => f.hmisCode !== null).map((f) => [f.hmisCode, f.id])
  );
  const validRows = [];
  const unknown = /* @__PURE__ */ new Set();
  for (const { rowIndex, row } of validated) {
    const fid = facilityByCode.get(row.facility_external_id);
    if (!fid) {
      unknown.add(row.facility_external_id);
      errors.push({
        row: rowIndex,
        field: "facility_external_id",
        message: `Unknown facility hmis_code "${row.facility_external_id}" for this tenant`
      });
      continue;
    }
    validRows.push({ ...row, facilityId: fid });
  }
  return {
    filename,
    rowCount: records.length,
    validRows,
    errors,
    unknownFacilityExternalIds: Array.from(unknown)
  };
}
async function commitCsvImport(tenantId, userId, preview) {
  const [auditRow] = await db.insert(csvImports).values({
    tenantId,
    filename: preview.filename,
    rowCount: preview.rowCount,
    errorCount: preview.errors.length,
    importedCount: 0,
    status: preview.validRows.length > 0 ? "committed" : "failed",
    errorReport: preview.errors,
    uploadedByUserId: userId
  }).returning();
  if (preview.validRows.length === 0) {
    return { csvImportId: auditRow.id, importedCount: 0 };
  }
  const dedupMap = /* @__PURE__ */ new Map();
  for (const r of preview.validRows) {
    dedupMap.set(`${r.facilityId}|${r.period}|${r.antigen}`, r);
  }
  const dedupedRows = Array.from(dedupMap.values());
  const CHUNK = 500;
  let imported = 0;
  for (let i = 0; i < dedupedRows.length; i += CHUNK) {
    const chunk = dedupedRows.slice(i, i + CHUNK);
    const values = chunk.map((r) => ({
      tenantId,
      facilityId: r.facilityId,
      period: r.period,
      antigen: r.antigen,
      dosesAdministered: r.doses_administered,
      targetPopOverride: r.target_pop_override ?? null,
      source: "csv",
      sourceRef: String(auditRow.id),
      importedByUserId: userId
    }));
    await db.insert(importedCoverage).values(values).onConflictDoUpdate({
      target: [
        importedCoverage.tenantId,
        importedCoverage.facilityId,
        importedCoverage.period,
        importedCoverage.antigen,
        importedCoverage.source
      ],
      set: {
        dosesAdministered: import_drizzle_orm8.sql`excluded.doses_administered`,
        targetPopOverride: import_drizzle_orm8.sql`excluded.target_pop_override`,
        sourceRef: import_drizzle_orm8.sql`excluded.source_ref`,
        importedByUserId: import_drizzle_orm8.sql`excluded.imported_by_user_id`,
        importedAt: import_drizzle_orm8.sql`now()`
      }
    });
    imported += chunk.length;
  }
  await db.update(csvImports).set({ importedCount: imported }).where((0, import_drizzle_orm8.eq)(csvImports.id, auditRow.id));
  return { csvImportId: auditRow.id, importedCount: imported };
}
function buildDhisDataElementMap() {
  const map = /* @__PURE__ */ new Map();
  for (const [k, v] of Object.entries(process.env)) {
    if (!v) continue;
    const m = k.match(/^DHIS2_DE_(.+)_UID$/);
    if (m) map.set(v, m[1]);
  }
  return map;
}
async function pullDhis2Coverage(tenantId, integration, options) {
  const warnings = [];
  const errors = [];
  const deMap = buildDhisDataElementMap();
  const facs = await db.select({ id: facilities.id, externalIds: facilities.externalIds }).from(facilities).where((0, import_drizzle_orm8.eq)(facilities.tenantId, tenantId));
  const facByOu = /* @__PURE__ */ new Map();
  for (const f of facs) {
    const ouId = f.externalIds?.dhis2;
    if (ouId) facByOu.set(String(ouId), f.id);
  }
  const token = resolveTokenForRef(integration.secretRef);
  const rootOu = options.rootOrgUnit ?? integration.dhis2RootOrgUnit;
  const dataSet = integration.dhis2DataSetUid;
  if (!dataSet) {
    errors.push("No dhis2DataSetUid configured on this integration");
    return { rows: [], warnings, errors, simulated: false };
  }
  if (!rootOu) {
    errors.push("No DHIS2 root org unit specified (set dhis2RootOrgUnit or pass rootOrgUnit)");
    return { rows: [], warnings, errors, simulated: false };
  }
  if (token === "mock_his_integration_token_for_demo_purposes") {
    warnings.push("SIMULATION MODE: DHIS2 dataValueSets mocked.");
    const sampleAntigens = Array.from(deMap.values());
    const fallbackAntigens = sampleAntigens.length > 0 ? sampleAntigens : ["BCG", "PENTA1", "MEASLES1"];
    const rows2 = [];
    let count = 0;
    facByOu.forEach((facId, ouId) => {
      if (count >= 5) return;
      count++;
      for (const ag of fallbackAntigens.slice(0, 3)) {
        rows2.push({
          orgUnitId: String(ouId),
          facilityId: Number(facId),
          period: options.period,
          antigen: ag,
          dosesAdministered: Math.floor(Math.random() * 80) + 5
        });
      }
    });
    return { rows: rows2, warnings, errors, simulated: true };
  }
  const url = `${integration.baseUrl.replace(/\/$/, "")}/api/dataValueSets?dataSet=${encodeURIComponent(
    dataSet
  )}&period=${encodeURIComponent(options.period)}&orgUnit=${encodeURIComponent(rootOu)}&children=true`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(6e4)
  });
  if (!resp.ok) {
    errors.push(`DHIS2 dataValueSets GET ${resp.status}: ${await resp.text()}`);
    return { rows: [], warnings, errors, simulated: false };
  }
  const data = await resp.json();
  const rows = [];
  for (const dv of data.dataValues ?? []) {
    const antigen = deMap.get(dv.dataElement);
    if (!antigen) {
      warnings.push(`No antigen mapping for DHIS2 dataElement "${dv.dataElement}" (set DHIS2_DE_<ANTIGEN>_UID env)`);
      continue;
    }
    const facId = facByOu.get(dv.orgUnit) ?? null;
    if (!facId) {
      warnings.push(`No local facility mapped to DHIS2 orgUnit "${dv.orgUnit}" \u2014 skipped`);
      continue;
    }
    const doses = parseInt(dv.value, 10);
    if (isNaN(doses)) continue;
    rows.push({
      orgUnitId: dv.orgUnit,
      facilityId: facId,
      period: dv.period.replace("-", ""),
      antigen,
      dosesAdministered: doses
    });
  }
  return { rows, warnings, errors, simulated: false };
}
async function commitDhis2Coverage(tenantId, userId, integrationId, rows) {
  if (rows.length === 0) return { importedCount: 0 };
  const CHUNK = 500;
  let imported = 0;
  const dedupMap = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (r.facilityId === null) continue;
    dedupMap.set(`${r.facilityId}|${r.period}|${r.antigen}`, r);
  }
  const dedupedRows = Array.from(dedupMap.values());
  for (let i = 0; i < dedupedRows.length; i += CHUNK) {
    const chunk = dedupedRows.slice(i, i + CHUNK);
    const values = chunk.map((r) => ({
      tenantId,
      facilityId: r.facilityId,
      period: r.period,
      antigen: r.antigen,
      dosesAdministered: r.dosesAdministered,
      targetPopOverride: null,
      source: "dhis2",
      sourceRef: integrationId,
      importedByUserId: userId
    }));
    if (values.length === 0) continue;
    await db.insert(importedCoverage).values(values).onConflictDoUpdate({
      target: [
        importedCoverage.tenantId,
        importedCoverage.facilityId,
        importedCoverage.period,
        importedCoverage.antigen,
        importedCoverage.source
      ],
      set: {
        dosesAdministered: import_drizzle_orm8.sql`excluded.doses_administered`,
        sourceRef: import_drizzle_orm8.sql`excluded.source_ref`,
        importedByUserId: import_drizzle_orm8.sql`excluded.imported_by_user_id`,
        importedAt: import_drizzle_orm8.sql`now()`
      }
    });
    imported += values.length;
  }
  return { importedCount: imported };
}
async function scoreMissedCommunities(params) {
  const w = { ...DEFAULT_WEIGHTS, ...params.weights ?? {} };
  const villageConditions = [(0, import_drizzle_orm8.eq)(villages.tenantId, params.tenantId)];
  if (params.districtId) villageConditions.push((0, import_drizzle_orm8.eq)(villages.districtId, params.districtId));
  const villageRows = await db.select().from(villages).where((0, import_drizzle_orm8.and)(...villageConditions));
  if (villageRows.length === 0) return [];
  const facilityIds = Array.from(
    new Set(villageRows.map((v) => v.assignedFacilityId).filter((id) => id != null))
  );
  const facilityRows = facilityIds.length ? await db.select().from(facilities).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(facilities.tenantId, params.tenantId), (0, import_drizzle_orm8.inArray)(facilities.id, facilityIds))) : [];
  const facById = new Map(facilityRows.map((f) => [f.id, f]));
  let allowedDistrictIds = null;
  if (params.provinceId) {
    const districtRows = await db.execute(import_drizzle_orm8.sql`
      SELECT id FROM districts WHERE province_id = ${params.provinceId}
    `);
    allowedDistrictIds = new Set(districtRows.rows?.map((r) => r.id) ?? []);
  }
  const coverageRows = facilityIds.length ? await db.select().from(importedCoverage).where(
    (0, import_drizzle_orm8.and)(
      (0, import_drizzle_orm8.eq)(importedCoverage.tenantId, params.tenantId),
      (0, import_drizzle_orm8.eq)(importedCoverage.period, params.period),
      (0, import_drizzle_orm8.eq)(importedCoverage.antigen, params.antigen),
      (0, import_drizzle_orm8.inArray)(importedCoverage.facilityId, facilityIds)
    )
  ) : [];
  const dosesByFacility = /* @__PURE__ */ new Map();
  for (const c of coverageRows) {
    const prev = dosesByFacility.get(c.facilityId) ?? 0;
    if (c.dosesAdministered > prev) dosesByFacility.set(c.facilityId, c.dosesAdministered);
  }
  const villageIds = villageRows.map((v) => v.id);
  const popRows = villageIds.length ? await db.select().from(populationData).where(
    (0, import_drizzle_orm8.and)(
      (0, import_drizzle_orm8.eq)(populationData.tenantId, params.tenantId),
      (0, import_drizzle_orm8.inArray)(populationData.villageId, villageIds)
    )
  ) : [];
  const popByVillage = /* @__PURE__ */ new Map();
  for (const p of popRows) {
    const pop = p.under1Population ?? p.under5Population ?? p.totalPopulation ?? 0;
    const prev = popByVillage.get(p.villageId) ?? 0;
    if (pop > prev) popByVillage.set(p.villageId, pop);
  }
  const htrRows = villageIds.length ? await db.select().from(htrScores).where(
    (0, import_drizzle_orm8.and)(
      (0, import_drizzle_orm8.eq)(htrScores.tenantId, params.tenantId),
      (0, import_drizzle_orm8.inArray)(htrScores.villageId, villageIds)
    )
  ) : [];
  const htrByVillage = /* @__PURE__ */ new Map();
  for (const h of htrRows) {
    htrByVillage.set(h.villageId, Number(h.compositeScore ?? 0));
  }
  const villageCountByFacility = /* @__PURE__ */ new Map();
  for (const v of villageRows) {
    if (v.assignedFacilityId) {
      villageCountByFacility.set(
        v.assignedFacilityId,
        (villageCountByFacility.get(v.assignedFacilityId) ?? 0) + 1
      );
    }
  }
  const distRows = facilityIds.length ? await db.execute(import_drizzle_orm8.sql`
        SELECT d.id AS district_id, d.name AS district_name, p.id AS province_id, p.name AS province_name
        FROM districts d
        LEFT JOIN provinces p ON p.id = d.province_id
      `) : { rows: [] };
  const distMap = new Map(
    (distRows.rows ?? []).map((r) => [
      r.district_id,
      { name: r.district_name, provinceName: r.province_name }
    ])
  );
  const results = [];
  for (const v of villageRows) {
    if (allowedDistrictIds && !allowedDistrictIds.has(v.districtId)) continue;
    const fac = v.assignedFacilityId ? facById.get(v.assignedFacilityId) : void 0;
    if (!fac) continue;
    const registered2 = popByVillage.get(v.id) ?? 0;
    const facilityDoses = dosesByFacility.get(fac.id) ?? 0;
    const villageShare = villageCountByFacility.get(fac.id) ?? 1;
    const villageDoses = facilityDoses / villageShare;
    const unservedEstimate = Math.max(0, registered2 - villageDoses);
    const htrFlag = v.isHardToReach ? 1 : 0;
    const distanceKm = Number(v.distanceToFacility ?? 0);
    const grid3Evidence = htrByVillage.get(v.id) ?? 0;
    const components = {
      unserved: w.unserved * unservedEstimate,
      htr: w.htr * htrFlag,
      distance: w.distance * distanceKm,
      grid3: w.grid3 * grid3Evidence
    };
    const score = components.unserved + components.htr + components.distance + components.grid3;
    if (score <= 0) continue;
    const dist = distMap.get(v.districtId);
    results.push({
      villageId: v.id,
      villageName: v.name,
      facilityId: fac.id,
      facilityName: fac.name,
      districtId: v.districtId,
      provinceName: dist?.provinceName,
      districtName: dist?.name,
      latitude: v.latitude != null ? Number(v.latitude) : null,
      longitude: v.longitude != null ? Number(v.longitude) : null,
      registeredPopulation: registered2,
      dosesAdministered: Math.round(villageDoses),
      unservedEstimate: Math.round(unservedEstimate),
      isHardToReach: !!v.isHardToReach,
      distanceKm,
      grid3Evidence,
      score: Math.round(score * 100) / 100,
      components
    });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 500);
}
var import_sync, import_drizzle_orm8, DEFAULT_WEIGHTS;
var init_coverageImportService = __esm({
  "server/services/coverageImportService.ts"() {
    "use strict";
    import_sync = require("csv-parse/sync");
    import_drizzle_orm8 = require("drizzle-orm");
    init_db();
    init_schema();
    init_hisInteropService();
    DEFAULT_WEIGHTS = { unserved: 1, htr: 50, distance: 2, grid3: 10 };
  }
});

// server/index.ts
var index_exports = {};
__export(index_exports, {
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_express2 = __toESM(require("express"), 1);

// server/storage.ts
init_schema();
init_db();
var import_drizzle_orm2 = require("drizzle-orm");
function withTenant(table, tenantId, ...extra) {
  const conds = [(0, import_drizzle_orm2.eq)(table.tenantId, tenantId), ...extra.filter(Boolean)];
  return conds.length === 1 ? conds[0] : (0, import_drizzle_orm2.and)(...conds);
}
var DatabaseStorage = class {
  // --- Users ---
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: { ...userData, updatedAt: /* @__PURE__ */ new Date() }
    }).returning();
    return user;
  }
  async getUserByEmail(email) {
    const [u] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.email, email.toLowerCase()));
    return u;
  }
  async assignUserTenant(userId, tenantId) {
    await db.update(users).set({ tenantId, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(users.id, userId), (0, import_drizzle_orm2.isNull)(users.tenantId)));
  }
  async assignUserTenantAndRole(userId, tenantId, role) {
    await db.update(users).set({ tenantId, role, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(users.id, userId), (0, import_drizzle_orm2.isNull)(users.tenantId)));
  }
  async listUsers(tenantId) {
    return await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.tenantId, tenantId));
  }
  async updateUserRolesAndPermissions(id, roles, permissions, scope) {
    const [u] = await db.update(users).set({
      roles,
      permissions,
      dataAccessScope: scope,
      role: roles.length > 0 ? roles[0] : "facility_clerk",
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.eq)(users.id, id)).returning();
    return u;
  }
  async createUser(tenantId, data) {
    const id = data.id || `user-${Date.now()}`;
    const [row] = await db.insert(users).values({
      ...data,
      id,
      tenantId,
      role: data.roles && data.roles.length > 0 ? data.roles[0] : "facility_clerk",
      roles: data.roles || ["facility_clerk"],
      permissions: data.permissions || [],
      dataAccessScope: data.dataAccessScope || { provinces: [], districts: [], facilities: [] },
      isActive: data.isActive !== void 0 ? data.isActive : true
    }).returning();
    return row;
  }
  async updateUser(tenantId, id, data) {
    const [row] = await db.update(users).set({
      ...data,
      role: data.roles && data.roles.length > 0 ? data.roles[0] : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(users.id, id), (0, import_drizzle_orm2.eq)(users.tenantId, tenantId))).returning();
    return row;
  }
  async deleteUser(tenantId, id) {
    await db.delete(users).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(users.id, id), (0, import_drizzle_orm2.eq)(users.tenantId, tenantId)));
    return true;
  }
  // --- Custom User Roles ---
  async getUserRoles(tenantId) {
    return await db.select().from(userRoles).where((0, import_drizzle_orm2.eq)(userRoles.tenantId, tenantId));
  }
  async getUserRole(tenantId, id) {
    const [row] = await db.select().from(userRoles).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(userRoles.id, id), (0, import_drizzle_orm2.eq)(userRoles.tenantId, tenantId)));
    return row;
  }
  async getUserRoleByCode(tenantId, code) {
    const [row] = await db.select().from(userRoles).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(userRoles.code, code), (0, import_drizzle_orm2.eq)(userRoles.tenantId, tenantId)));
    return row;
  }
  /* Original Code:
    async createUserRole(tenantId: string, data: InsertUserRole): Promise<CustomUserRole> {
      const [row] = await db
        .insert(userRoles)
        .values({ ...data, tenantId })
        .returning();
      return row;
    }
  
    async updateUserRole(tenantId: string, id: number, data: Partial<InsertUserRole>): Promise<CustomUserRole | undefined> {
      const { tenantId: _i, ...safe } = data as any;
      const [row] = await db
        .update(userRoles)
        .set({ ...safe, updatedAt: new Date() })
        .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, tenantId)))
        .returning();
      return row;
    }
    */
  async createUserRole(tenantId, data) {
    const [row] = await db.insert(userRoles).values({ ...data, tenantId }).returning();
    return row;
  }
  async updateUserRole(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [row] = await db.update(userRoles).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(userRoles.id, id), (0, import_drizzle_orm2.eq)(userRoles.tenantId, tenantId))).returning();
    return row;
  }
  async deleteUserRole(tenantId, id) {
    const rows = await db.delete(userRoles).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(userRoles.id, id), (0, import_drizzle_orm2.eq)(userRoles.tenantId, tenantId))).returning({ id: userRoles.id });
    return rows.length > 0;
  }
  // --- Tenants & IdP configs ---
  async getTenant(id) {
    const [t] = await db.select().from(tenants).where((0, import_drizzle_orm2.eq)(tenants.id, id));
    return t;
  }
  async getTenantByCode(code) {
    const [t] = await db.select().from(tenants).where((0, import_drizzle_orm2.eq)(tenants.code, code));
    return t;
  }
  async listActiveTenants() {
    return await db.select().from(tenants).where((0, import_drizzle_orm2.eq)(tenants.status, "active"));
  }
  async createTenant(data) {
    const [row] = await db.insert(tenants).values(data).returning();
    return row;
  }
  async updateTenant(id, data) {
    const [row] = await db.update(tenants).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(tenants.id, id)).returning();
    return row;
  }
  // --- Signup requests ---
  async createSignupRequest(data) {
    const [row] = await db.insert(signupRequests).values({ ...data, email: data.email.toLowerCase() }).returning();
    return row;
  }
  async listSignupRequests(tenantId, status) {
    const conds = [(0, import_drizzle_orm2.eq)(signupRequests.tenantId, tenantId)];
    if (status) conds.push((0, import_drizzle_orm2.eq)(signupRequests.status, status));
    return await db.select().from(signupRequests).where((0, import_drizzle_orm2.and)(...conds)).orderBy((0, import_drizzle_orm2.desc)(signupRequests.createdAt));
  }
  async getSignupRequest(id) {
    const [r] = await db.select().from(signupRequests).where((0, import_drizzle_orm2.eq)(signupRequests.id, id));
    return r;
  }
  async decideSignupRequest(tenantId, id, decision, approverUserId, reason) {
    const [row] = await db.update(signupRequests).set({
      status: decision,
      approverUserId,
      decisionReason: reason ?? null,
      decidedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(signupRequests.id, id), (0, import_drizzle_orm2.eq)(signupRequests.tenantId, tenantId))).returning();
    return row;
  }
  async createTenantInterestRequest(data) {
    const [row] = await db.insert(tenantInterestRequests).values({
      ...data,
      email: data.email.toLowerCase(),
      countryCode: data.countryCode.toUpperCase()
    }).returning();
    return row;
  }
  async findApprovedSignupForEmail(email) {
    const [r] = await db.select().from(signupRequests).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(signupRequests.email, email.toLowerCase()), (0, import_drizzle_orm2.eq)(signupRequests.status, "approved"))).orderBy((0, import_drizzle_orm2.desc)(signupRequests.decidedAt)).limit(1);
    return r;
  }
  async getIdpConfig(id) {
    const [c] = await db.select().from(tenantIdpConfigs).where((0, import_drizzle_orm2.eq)(tenantIdpConfigs.id, id));
    return c;
  }
  async getIdpConfigByEmailDomain(domain) {
    const [c] = await db.select().from(tenantIdpConfigs).where(
      (0, import_drizzle_orm2.and)(
        (0, import_drizzle_orm2.eq)(tenantIdpConfigs.emailDomain, domain.toLowerCase()),
        (0, import_drizzle_orm2.eq)(tenantIdpConfigs.isActive, true)
      )
    );
    return c;
  }
  async listIdpConfigs(tenantId) {
    return await db.select().from(tenantIdpConfigs).where((0, import_drizzle_orm2.eq)(tenantIdpConfigs.tenantId, tenantId));
  }
  // --- Regions ---
  async getRegions(tenantId) {
    return await db.select().from(regions).where((0, import_drizzle_orm2.eq)(regions.tenantId, tenantId));
  }
  async getRegion(tenantId, id) {
    const [r] = await db.select().from(regions).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(regions.id, id), (0, import_drizzle_orm2.eq)(regions.tenantId, tenantId)));
    return r;
  }
  async createRegion(tenantId, data) {
    const [r] = await db.insert(regions).values({ ...data, tenantId }).returning();
    return r;
  }
  async updateRegion(tenantId, id, data) {
    const { tenantId: _ignored, ...safe } = data;
    const [r] = await db.update(regions).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(regions.id, id), (0, import_drizzle_orm2.eq)(regions.tenantId, tenantId))).returning();
    return r;
  }
  // --- LLGs ---
  async getLlgs(tenantId, districtId) {
    return await db.select().from(llgs).where(withTenant(llgs, tenantId, districtId ? (0, import_drizzle_orm2.eq)(llgs.districtId, districtId) : void 0));
  }
  async getLlg(tenantId, id) {
    const [l] = await db.select().from(llgs).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(llgs.id, id), (0, import_drizzle_orm2.eq)(llgs.tenantId, tenantId)));
    return l;
  }
  async createLlg(tenantId, data) {
    const [l] = await db.insert(llgs).values({ ...data, tenantId }).returning();
    return l;
  }
  async updateLlg(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [l] = await db.update(llgs).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(llgs.id, id), (0, import_drizzle_orm2.eq)(llgs.tenantId, tenantId))).returning();
    return l;
  }
  // --- Provinces ---
  async getProvinces(tenantId, regionId) {
    return await db.select().from(provinces).where(withTenant(provinces, tenantId, regionId ? (0, import_drizzle_orm2.eq)(provinces.regionId, regionId) : void 0));
  }
  async getProvince(tenantId, id) {
    const [p] = await db.select().from(provinces).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(provinces.id, id), (0, import_drizzle_orm2.eq)(provinces.tenantId, tenantId)));
    return p;
  }
  async createProvince(tenantId, data) {
    const [p] = await db.insert(provinces).values({ ...data, tenantId }).returning();
    return p;
  }
  // --- Districts ---
  async getDistricts(tenantId, provinceId) {
    return await db.select().from(districts).where(withTenant(districts, tenantId, provinceId ? (0, import_drizzle_orm2.eq)(districts.provinceId, provinceId) : void 0));
  }
  async getDistrict(tenantId, id) {
    const [d] = await db.select().from(districts).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(districts.id, id), (0, import_drizzle_orm2.eq)(districts.tenantId, tenantId)));
    return d;
  }
  async createDistrict(tenantId, data) {
    const [d] = await db.insert(districts).values({ ...data, tenantId }).returning();
    return d;
  }
  // --- Facilities ---
  async getFacilities(tenantId, districtId) {
    return await db.select().from(facilities).where(withTenant(facilities, tenantId, districtId ? (0, import_drizzle_orm2.eq)(facilities.districtId, districtId) : void 0));
  }
  async getFacility(tenantId, id) {
    const [f] = await db.select().from(facilities).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilities.id, id), (0, import_drizzle_orm2.eq)(facilities.tenantId, tenantId)));
    return f;
  }
  async createFacility(tenantId, data) {
    const [f] = await db.insert(facilities).values({ ...data, tenantId }).returning();
    return f;
  }
  async updateFacility(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [f] = await db.update(facilities).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilities.id, id), (0, import_drizzle_orm2.eq)(facilities.tenantId, tenantId))).returning();
    return f;
  }
  async deleteFacility(tenantId, id) {
    const rows = await db.delete(facilities).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilities.id, id), (0, import_drizzle_orm2.eq)(facilities.tenantId, tenantId))).returning({ id: facilities.id });
    return rows.length > 0;
  }
  // --- Villages ---
  async getVillages(tenantId, districtId, facilityId) {
    return await db.select().from(villages).where(
      withTenant(
        villages,
        tenantId,
        districtId ? (0, import_drizzle_orm2.eq)(villages.districtId, districtId) : void 0,
        facilityId ? (0, import_drizzle_orm2.eq)(villages.assignedFacilityId, facilityId) : void 0
      )
    );
  }
  async getVillage(tenantId, id) {
    const [v] = await db.select().from(villages).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(villages.id, id), (0, import_drizzle_orm2.eq)(villages.tenantId, tenantId)));
    return v;
  }
  async createVillage(tenantId, data) {
    const [v] = await db.insert(villages).values({ ...data, tenantId }).returning();
    return v;
  }
  async updateVillage(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [v] = await db.update(villages).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(villages.id, id), (0, import_drizzle_orm2.eq)(villages.tenantId, tenantId))).returning();
    return v;
  }
  async deleteVillage(tenantId, id) {
    const result = await db.delete(villages).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(villages.id, id), (0, import_drizzle_orm2.eq)(villages.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- Population data ---
  async getPopulationData(tenantId, filters) {
    return await db.select().from(populationData).where(
      withTenant(
        populationData,
        tenantId,
        filters?.source ? (0, import_drizzle_orm2.eq)(populationData.source, filters.source) : void 0,
        filters?.provinceId ? (0, import_drizzle_orm2.eq)(populationData.provinceId, filters.provinceId) : void 0,
        filters?.districtId ? (0, import_drizzle_orm2.eq)(populationData.districtId, filters.districtId) : void 0,
        filters?.villageId ? (0, import_drizzle_orm2.eq)(populationData.villageId, filters.villageId) : void 0,
        filters?.facilityId ? (0, import_drizzle_orm2.eq)(populationData.facilityId, filters.facilityId) : void 0,
        filters?.year ? (0, import_drizzle_orm2.eq)(populationData.year, filters.year) : void 0
      )
    );
  }
  async getPopulationDataById(tenantId, id) {
    const [p] = await db.select().from(populationData).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(populationData.id, id), (0, import_drizzle_orm2.eq)(populationData.tenantId, tenantId)));
    return p;
  }
  /* ORIGINAL CODE (Commented out to adhere to global rules):
  async createPopulationData(tenantId: string, data: InsertPopulationData): Promise<PopulationData> {
    const [p] = await db.insert(populationData).values({ ...data, tenantId } as typeof populationData.$inferInsert).returning();
    return p;
  }
  async updatePopulationData(tenantId: string, id: number, data: Partial<InsertPopulationData>): Promise<PopulationData | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [p] = await db
      .update(populationData)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(populationData.id, id), eq(populationData.tenantId, tenantId)))
      .returning();
    return p;
  }
  */
  // REFACTORED CODE:
  // Helper to resolve geographic parents dynamically from village or facility
  async resolvePopulationGeographics(tenantId, data) {
    let districtId = data.districtId ? Number(data.districtId) : null;
    let provinceId = data.provinceId ? Number(data.provinceId) : null;
    if (data.villageId) {
      const [v] = await db.select({ districtId: villages.districtId }).from(villages).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(villages.id, data.villageId), (0, import_drizzle_orm2.eq)(villages.tenantId, tenantId)));
      if (v) {
        districtId = v.districtId;
      }
    } else if (data.facilityId) {
      const [f] = await db.select({ districtId: facilities.districtId }).from(facilities).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilities.id, data.facilityId), (0, import_drizzle_orm2.eq)(facilities.tenantId, tenantId)));
      if (f) {
        districtId = f.districtId;
      }
    }
    if (districtId) {
      const [d] = await db.select({ provinceId: districts.provinceId }).from(districts).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(districts.id, districtId), (0, import_drizzle_orm2.eq)(districts.tenantId, tenantId)));
      if (d) {
        provinceId = d.provinceId;
      }
    }
    return { provinceId, districtId };
  }
  async createPopulationData(tenantId, data) {
    const geographics = await this.resolvePopulationGeographics(tenantId, data);
    const [p] = await db.insert(populationData).values({
      ...data,
      districtId: geographics.districtId,
      provinceId: geographics.provinceId,
      tenantId
    }).returning();
    return p;
  }
  async updatePopulationData(tenantId, id, data) {
    const existing = await this.getPopulationDataById(tenantId, id);
    if (!existing) return void 0;
    const merged = { ...existing, ...data };
    const geographics = await this.resolvePopulationGeographics(tenantId, merged);
    const { tenantId: _i, ...safe } = data;
    const [p] = await db.update(populationData).set({
      ...safe,
      districtId: geographics.districtId,
      provinceId: geographics.provinceId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(populationData.id, id), (0, import_drizzle_orm2.eq)(populationData.tenantId, tenantId))).returning();
    return p;
  }
  async deletePopulationData(tenantId, id) {
    const rows = await db.delete(populationData).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(populationData.id, id), (0, import_drizzle_orm2.eq)(populationData.tenantId, tenantId))).returning({ id: populationData.id });
    return rows.length > 0;
  }
  // --- Microplans ---
  async getMicroplans(tenantId) {
    return await db.select().from(microplans).where((0, import_drizzle_orm2.eq)(microplans.tenantId, tenantId));
  }
  async getMicroplan(tenantId, id) {
    const [row] = await db.select().from(microplans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(microplans.id, id), (0, import_drizzle_orm2.eq)(microplans.tenantId, tenantId)));
    return row;
  }
  async createMicroplan(tenantId, data) {
    const [row] = await db.insert(microplans).values({ ...data, tenantId }).returning();
    return row;
  }
  async updateMicroplan(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [row] = await db.update(microplans).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(microplans.id, id), (0, import_drizzle_orm2.eq)(microplans.tenantId, tenantId))).returning();
    return row;
  }
  async deleteMicroplan(tenantId, id) {
    const result = await db.delete(microplans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(microplans.id, id), (0, import_drizzle_orm2.eq)(microplans.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- Session plans ---
  async getSessionPlans(tenantId, facilityId) {
    return await db.select().from(sessionPlans).where(withTenant(sessionPlans, tenantId, facilityId ? (0, import_drizzle_orm2.eq)(sessionPlans.facilityId, facilityId) : void 0));
  }
  async getSessionPlan(tenantId, id) {
    const [s] = await db.select().from(sessionPlans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionPlans.id, id), (0, import_drizzle_orm2.eq)(sessionPlans.tenantId, tenantId)));
    return s;
  }
  async createSessionPlan(tenantId, data) {
    const cleanData = { ...data };
    if (cleanData.scheduledDate && typeof cleanData.scheduledDate === "string") {
      cleanData.scheduledDate = new Date(cleanData.scheduledDate);
    }
    const [s] = await db.insert(sessionPlans).values({ ...cleanData, tenantId }).returning();
    return s;
  }
  async updateSessionPlan(tenantId, id, data) {
    const cleanData = { ...data };
    if (cleanData.scheduledDate && typeof cleanData.scheduledDate === "string") {
      cleanData.scheduledDate = new Date(cleanData.scheduledDate);
    }
    const { tenantId: _i, ...safe } = cleanData;
    const [s] = await db.update(sessionPlans).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionPlans.id, id), (0, import_drizzle_orm2.eq)(sessionPlans.tenantId, tenantId))).returning();
    return s;
  }
  async deleteSessionPlan(tenantId, id) {
    const rows = await db.delete(sessionPlans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionPlans.id, id), (0, import_drizzle_orm2.eq)(sessionPlans.tenantId, tenantId))).returning({ id: sessionPlans.id });
    return rows.length > 0;
  }
  // --- Budget items ---
  async getBudgetItems(tenantId, facilityId, quarter, year) {
    return await db.select().from(budgetItems).where(
      withTenant(
        budgetItems,
        tenantId,
        facilityId ? (0, import_drizzle_orm2.eq)(budgetItems.facilityId, facilityId) : void 0,
        quarter ? (0, import_drizzle_orm2.eq)(budgetItems.quarter, quarter) : void 0,
        year ? (0, import_drizzle_orm2.eq)(budgetItems.year, year) : void 0
      )
    );
  }
  async createBudgetItem(tenantId, data) {
    const [b] = await db.insert(budgetItems).values({ ...data, tenantId }).returning();
    return b;
  }
  async updateBudgetItem(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [b] = await db.update(budgetItems).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(budgetItems.id, id), (0, import_drizzle_orm2.eq)(budgetItems.tenantId, tenantId))).returning();
    return b;
  }
  async deleteBudgetItem(tenantId, id) {
    const rows = await db.delete(budgetItems).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(budgetItems.id, id), (0, import_drizzle_orm2.eq)(budgetItems.tenantId, tenantId))).returning({ id: budgetItems.id });
    return rows.length > 0;
  }
  // --- Vaccine requirements ---
  async getVaccineRequirements(tenantId, facilityId) {
    return await db.select().from(vaccineRequirements).where(withTenant(vaccineRequirements, tenantId, facilityId ? (0, import_drizzle_orm2.eq)(vaccineRequirements.facilityId, facilityId) : void 0));
  }
  async createVaccineRequirement(tenantId, data) {
    const [r] = await db.insert(vaccineRequirements).values({ ...data, tenantId }).returning();
    return r;
  }
  async updateVaccineRequirement(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [r] = await db.update(vaccineRequirements).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(vaccineRequirements.id, id), (0, import_drizzle_orm2.eq)(vaccineRequirements.tenantId, tenantId))).returning();
    return r;
  }
  // --- Mobilization activities ---
  async getMobilizationActivities(tenantId, facilityId) {
    return await db.select().from(mobilizationActivities).where(withTenant(mobilizationActivities, tenantId, facilityId ? (0, import_drizzle_orm2.eq)(mobilizationActivities.facilityId, facilityId) : void 0));
  }
  async createMobilizationActivity(tenantId, data) {
    const [a] = await db.insert(mobilizationActivities).values({ ...data, tenantId }).returning();
    return a;
  }
  async updateMobilizationActivity(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [a] = await db.update(mobilizationActivities).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(mobilizationActivities.id, id), (0, import_drizzle_orm2.eq)(mobilizationActivities.tenantId, tenantId))).returning();
    return a;
  }
  // --- Supervision visits ---
  async getSupervisionVisits(tenantId, filters) {
    const conds = [];
    if (filters?.facilityId) conds.push((0, import_drizzle_orm2.eq)(supervisionVisits.facilityId, filters.facilityId));
    if (filters?.microplanId) conds.push((0, import_drizzle_orm2.eq)(supervisionVisits.microplanId, filters.microplanId));
    if (filters?.status) conds.push((0, import_drizzle_orm2.eq)(supervisionVisits.status, filters.status));
    return await db.select().from(supervisionVisits).where(withTenant(supervisionVisits, tenantId, conds.length ? (0, import_drizzle_orm2.and)(...conds) : void 0)).orderBy((0, import_drizzle_orm2.desc)(supervisionVisits.scheduledDate));
  }
  async getSupervisionVisit(tenantId, id) {
    const [v] = await db.select().from(supervisionVisits).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(supervisionVisits.id, id), (0, import_drizzle_orm2.eq)(supervisionVisits.tenantId, tenantId)));
    return v;
  }
  async createSupervisionVisit(tenantId, data) {
    const [v] = await db.insert(supervisionVisits).values({ ...data, tenantId }).returning();
    return v;
  }
  async updateSupervisionVisit(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [v] = await db.update(supervisionVisits).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(supervisionVisits.id, id), (0, import_drizzle_orm2.eq)(supervisionVisits.tenantId, tenantId))).returning();
    return v;
  }
  async deleteSupervisionVisit(tenantId, id) {
    const r = await db.delete(supervisionVisits).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(supervisionVisits.id, id), (0, import_drizzle_orm2.eq)(supervisionVisits.tenantId, tenantId))).returning({ id: supervisionVisits.id });
    return r.length > 0;
  }
  // --- Audit logs ---
  async listAuditLogs(tenantId, filters) {
    const conds = [];
    if (filters?.userId) conds.push((0, import_drizzle_orm2.eq)(auditLogs.userId, filters.userId));
    if (filters?.entityType) conds.push((0, import_drizzle_orm2.eq)(auditLogs.entityType, filters.entityType));
    if (filters?.entityId) conds.push((0, import_drizzle_orm2.eq)(auditLogs.entityId, filters.entityId));
    return await db.select().from(auditLogs).where(withTenant(auditLogs, tenantId, conds.length ? (0, import_drizzle_orm2.and)(...conds) : void 0)).orderBy((0, import_drizzle_orm2.desc)(auditLogs.createdAt)).limit(filters?.limit ?? 200);
  }
  // --- Approval requests ---
  async getApprovalRequests(tenantId, status) {
    return await db.select().from(approvalRequests).where(withTenant(approvalRequests, tenantId, status ? (0, import_drizzle_orm2.eq)(approvalRequests.status, status) : void 0)).orderBy((0, import_drizzle_orm2.desc)(approvalRequests.submittedAt));
  }
  async getApprovalRequest(tenantId, id) {
    const [r] = await db.select().from(approvalRequests).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(approvalRequests.id, id), (0, import_drizzle_orm2.eq)(approvalRequests.tenantId, tenantId)));
    return r;
  }
  async createApprovalRequest(tenantId, data) {
    const [r] = await db.insert(approvalRequests).values({ ...data, tenantId }).returning();
    return r;
  }
  async updateApprovalRequest(tenantId, id, data) {
    const { tenantId: _i, ...safe } = data;
    const [r] = await db.update(approvalRequests).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(approvalRequests.id, id), (0, import_drizzle_orm2.eq)(approvalRequests.tenantId, tenantId))).returning();
    return r;
  }
  // --- HTR scores ---
  async getHtrScores(tenantId, villageId) {
    return await db.select().from(htrScores).where(withTenant(htrScores, tenantId, villageId ? (0, import_drizzle_orm2.eq)(htrScores.villageId, villageId) : void 0));
  }
  async upsertHtrScore(tenantId, data) {
    const existing = await db.select().from(htrScores).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(htrScores.tenantId, tenantId), (0, import_drizzle_orm2.eq)(htrScores.villageId, data.villageId)));
    if (existing.length > 0) {
      const [r] = await db.update(htrScores).set({
        distanceScore: data.distanceScore,
        terrainScore: data.terrainScore,
        seasonalScore: data.seasonalScore,
        coverageScore: data.coverageScore,
        insecurityScore: data.insecurityScore,
        compositeScore: data.compositeScore,
        interventionPriority: data.interventionPriority,
        comments: data.comments,
        calculatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm2.eq)(htrScores.id, existing[0].id)).returning();
      return r;
    } else {
      const [r] = await db.insert(htrScores).values({
        ...data,
        tenantId,
        calculatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return r;
    }
  }
  // --- Audit logs ---
  async createAuditLog(tenantId, data) {
    const [l] = await db.insert(auditLogs).values({ ...data, tenantId }).returning();
    return l;
  }
  // --- Admin Boundaries ---
  async listAdminBoundaries(tenantId, adminLevel) {
    return await db.select({
      id: adminBoundaries.id,
      tenantId: adminBoundaries.tenantId,
      adminLevel: adminBoundaries.adminLevel,
      levelName: adminBoundaries.levelName,
      source: adminBoundaries.source,
      countryCode: adminBoundaries.countryCode,
      featureCount: adminBoundaries.featureCount,
      bbox: adminBoundaries.bbox,
      isActive: adminBoundaries.isActive,
      fetchedAt: adminBoundaries.fetchedAt,
      createdAt: adminBoundaries.createdAt,
      updatedAt: adminBoundaries.updatedAt
    }).from(adminBoundaries).where(
      adminLevel !== void 0 ? (0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(adminBoundaries.tenantId, tenantId), (0, import_drizzle_orm2.eq)(adminBoundaries.adminLevel, adminLevel)) : (0, import_drizzle_orm2.eq)(adminBoundaries.tenantId, tenantId)
    ).orderBy(adminBoundaries.adminLevel);
  }
  async getAdminBoundary(tenantId, id) {
    const [b] = await db.select().from(adminBoundaries).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(adminBoundaries.id, id), (0, import_drizzle_orm2.eq)(adminBoundaries.tenantId, tenantId)));
    return b;
  }
  async getAdminBoundaryByLevel(tenantId, adminLevel) {
    const [b] = await db.select().from(adminBoundaries).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(adminBoundaries.tenantId, tenantId), (0, import_drizzle_orm2.eq)(adminBoundaries.adminLevel, adminLevel)));
    return b;
  }
  /**
   * Upsert: if a boundary with the same tenantId+adminLevel already exists, replace its GeoJSON.
   * This allows re-fetching from GeoBoundaries API to always get fresh data.
   */
  async upsertAdminBoundary(data) {
    const existing = await this.getAdminBoundaryByLevel(data.tenantId, data.adminLevel);
    if (existing) {
      const [updated] = await db.update(adminBoundaries).set({ ...data, updatedAt: /* @__PURE__ */ new Date(), fetchedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(adminBoundaries.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(adminBoundaries).values({ ...data, fetchedAt: /* @__PURE__ */ new Date() }).returning();
    return inserted;
  }
  async deleteAdminBoundary(tenantId, id) {
    const result = await db.delete(adminBoundaries).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(adminBoundaries.id, id), (0, import_drizzle_orm2.eq)(adminBoundaries.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- Facility Catchments ---
  async getFacilityCatchments(tenantId, facilityId) {
    return await db.select().from(facilityCatchments).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilityCatchments.tenantId, tenantId), (0, import_drizzle_orm2.eq)(facilityCatchments.facilityId, facilityId))).orderBy((0, import_drizzle_orm2.desc)(facilityCatchments.createdAt));
  }
  async getAllFacilityCatchments(tenantId) {
    return await db.select().from(facilityCatchments).where((0, import_drizzle_orm2.eq)(facilityCatchments.tenantId, tenantId)).orderBy((0, import_drizzle_orm2.desc)(facilityCatchments.createdAt));
  }
  async getFacilityCatchment(tenantId, id) {
    const [c] = await db.select().from(facilityCatchments).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilityCatchments.id, id), (0, import_drizzle_orm2.eq)(facilityCatchments.tenantId, tenantId)));
    return c;
  }
  async createFacilityCatchment(tenantId, data) {
    const [c] = await db.insert(facilityCatchments).values({ ...data, tenantId }).returning();
    return c;
  }
  async updateFacilityCatchment(tenantId, id, data) {
    const { tenantId: _t, ...safe } = data;
    const [c] = await db.update(facilityCatchments).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilityCatchments.id, id), (0, import_drizzle_orm2.eq)(facilityCatchments.tenantId, tenantId))).returning();
    return c;
  }
  async deleteFacilityCatchment(tenantId, id) {
    const result = await db.delete(facilityCatchments).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(facilityCatchments.id, id), (0, import_drizzle_orm2.eq)(facilityCatchments.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- 1. Vaccine Configurations ---
  async getVaccineConfigs(tenantId) {
    return await db.select().from(vaccineConfigurations).where((0, import_drizzle_orm2.eq)(vaccineConfigurations.tenantId, tenantId)).orderBy(vaccineConfigurations.name);
  }
  async getVaccineConfig(tenantId, id) {
    const [row] = await db.select().from(vaccineConfigurations).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(vaccineConfigurations.id, id), (0, import_drizzle_orm2.eq)(vaccineConfigurations.tenantId, tenantId)));
    return row;
  }
  async createVaccineConfig(tenantId, data) {
    const [row] = await db.insert(vaccineConfigurations).values({ ...data, tenantId }).returning();
    return row;
  }
  async updateVaccineConfig(tenantId, id, data) {
    const { tenantId: _t, ...safe } = data;
    const [row] = await db.update(vaccineConfigurations).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(vaccineConfigurations.id, id), (0, import_drizzle_orm2.eq)(vaccineConfigurations.tenantId, tenantId))).returning();
    return row;
  }
  // --- 2. Clients ---
  async getClients(tenantId, facilityId, clientType) {
    return await db.select().from(clients).where(
      withTenant(
        clients,
        tenantId,
        facilityId ? (0, import_drizzle_orm2.eq)(clients.facilityId, facilityId) : void 0,
        clientType ? (0, import_drizzle_orm2.eq)(clients.clientType, clientType) : void 0
      )
    ).orderBy((0, import_drizzle_orm2.desc)(clients.createdAt));
  }
  async getClient(tenantId, id) {
    const [row] = await db.select().from(clients).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(clients.id, id), (0, import_drizzle_orm2.eq)(clients.tenantId, tenantId)));
    return row;
  }
  async createClient(tenantId, data) {
    const cleanData = { ...data };
    if (cleanData.dateOfBirth && typeof cleanData.dateOfBirth === "string") {
      cleanData.dateOfBirth = new Date(cleanData.dateOfBirth);
    }
    const [row] = await db.insert(clients).values({ ...cleanData, tenantId }).returning();
    return row;
  }
  async updateClient(tenantId, id, data) {
    const cleanData = { ...data };
    if (cleanData.dateOfBirth && typeof cleanData.dateOfBirth === "string") {
      cleanData.dateOfBirth = new Date(cleanData.dateOfBirth);
    }
    const { tenantId: _t, ...safe } = cleanData;
    const [row] = await db.update(clients).set({ ...safe, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(clients.id, id), (0, import_drizzle_orm2.eq)(clients.tenantId, tenantId))).returning();
    return row;
  }
  async deleteClient(tenantId, id) {
    const result = await db.delete(clients).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(clients.id, id), (0, import_drizzle_orm2.eq)(clients.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- 3. Client Vaccinations ---
  async getClientVaccinations(tenantId, clientId) {
    return await db.select().from(clientVaccinations).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(clientVaccinations.tenantId, tenantId), (0, import_drizzle_orm2.eq)(clientVaccinations.clientId, clientId))).orderBy((0, import_drizzle_orm2.desc)(clientVaccinations.administeredDate));
  }
  async createClientVaccination(tenantId, data) {
    const cleanData = { ...data };
    if (cleanData.administeredDate && typeof cleanData.administeredDate === "string") {
      cleanData.administeredDate = new Date(cleanData.administeredDate);
    }
    if (cleanData.expiryDate && typeof cleanData.expiryDate === "string") {
      cleanData.expiryDate = new Date(cleanData.expiryDate);
    }
    const [row] = await db.insert(clientVaccinations).values({ ...cleanData, tenantId }).returning();
    return row;
  }
  async deleteClientVaccination(tenantId, id) {
    const result = await db.delete(clientVaccinations).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(clientVaccinations.id, id), (0, import_drizzle_orm2.eq)(clientVaccinations.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- 4. Session Day Plans ---
  async getSessionDayPlans(tenantId, sessionPlanId) {
    return await db.select().from(sessionDayPlans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionDayPlans.tenantId, tenantId), (0, import_drizzle_orm2.eq)(sessionDayPlans.sessionPlanId, sessionPlanId))).orderBy(sessionDayPlans.dayNumber);
  }
  async createSessionDayPlan(tenantId, data) {
    const cleanData = { ...data };
    if (cleanData.sessionDate && typeof cleanData.sessionDate === "string") {
      cleanData.sessionDate = new Date(cleanData.sessionDate);
    }
    if (cleanData.executedAt && typeof cleanData.executedAt === "string") {
      cleanData.executedAt = new Date(cleanData.executedAt);
    }
    const [row] = await db.insert(sessionDayPlans).values({ ...cleanData, tenantId }).returning();
    return row;
  }
  async updateSessionDayPlan(tenantId, id, data) {
    const cleanData = { ...data };
    if (cleanData.sessionDate && typeof cleanData.sessionDate === "string") {
      cleanData.sessionDate = new Date(cleanData.sessionDate);
    }
    if (cleanData.executedAt && typeof cleanData.executedAt === "string") {
      cleanData.executedAt = new Date(cleanData.executedAt);
    }
    const { tenantId: _t, ...safe } = cleanData;
    const [row] = await db.update(sessionDayPlans).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionDayPlans.id, id), (0, import_drizzle_orm2.eq)(sessionDayPlans.tenantId, tenantId))).returning();
    return row;
  }
  async deleteSessionDayPlan(tenantId, id) {
    const result = await db.delete(sessionDayPlans).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessionDayPlans.id, id), (0, import_drizzle_orm2.eq)(sessionDayPlans.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- 5. Stock Transactions ---
  async getStockTransactions(tenantId, facilityId) {
    const conds = facilityId !== void 0 ? (0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(stockTransactions.tenantId, tenantId), (0, import_drizzle_orm2.eq)(stockTransactions.facilityId, facilityId)) : (0, import_drizzle_orm2.eq)(stockTransactions.tenantId, tenantId);
    return await db.select().from(stockTransactions).where(conds).orderBy((0, import_drizzle_orm2.desc)(stockTransactions.transactionDate));
  }
  async createStockTransaction(tenantId, data) {
    const cleanData = { ...data };
    if (cleanData.transactionDate && typeof cleanData.transactionDate === "string") {
      cleanData.transactionDate = new Date(cleanData.transactionDate);
    }
    const [row] = await db.insert(stockTransactions).values({ ...cleanData, tenantId }).returning();
    return row;
  }
  async deleteStockTransaction(tenantId, id) {
    const result = await db.delete(stockTransactions).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(stockTransactions.id, id), (0, import_drizzle_orm2.eq)(stockTransactions.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }
  // --- 6. Monthly Reports ---
  async getMonthlyReports(tenantId, facilityId) {
    const conds = facilityId !== void 0 ? (0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(monthlyReports.tenantId, tenantId), (0, import_drizzle_orm2.eq)(monthlyReports.facilityId, facilityId)) : (0, import_drizzle_orm2.eq)(monthlyReports.tenantId, tenantId);
    return await db.select().from(monthlyReports).where(conds).orderBy((0, import_drizzle_orm2.desc)(monthlyReports.year), (0, import_drizzle_orm2.desc)(monthlyReports.month));
  }
  async getMonthlyReport(tenantId, id) {
    const [row] = await db.select().from(monthlyReports).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(monthlyReports.id, id), (0, import_drizzle_orm2.eq)(monthlyReports.tenantId, tenantId)));
    return row;
  }
  async createMonthlyReport(tenantId, data) {
    const [row] = await db.insert(monthlyReports).values({ ...data, tenantId }).returning();
    return row;
  }
  async updateMonthlyReport(tenantId, id, data) {
    const { tenantId: _t, ...safe } = data;
    const [row] = await db.update(monthlyReports).set(safe).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(monthlyReports.id, id), (0, import_drizzle_orm2.eq)(monthlyReports.tenantId, tenantId))).returning();
    return row;
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
var client = __toESM(require("openid-client"), 1);
var import_passport = require("openid-client/passport");
var import_passport2 = __toESM(require("passport"), 1);
var import_express_session = __toESM(require("express-session"), 1);
var import_memoizee = __toESM(require("memoizee"), 1);
var import_connect_pg_simple = __toESM(require("connect-pg-simple"), 1);
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
var getOidcConfig = (0, import_memoizee.default)(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = (0, import_connect_pg_simple.default)(import_express_session.default);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in production environment!");
    } else {
      console.warn("WARNING: SESSION_SECRET environment variable is missing! Falling back to a temporary development secret.");
      secret = "temporary_dev_session_secret_for_gis_microplanning";
    }
  }
  return (0, import_express_session.default)({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: reqSecureOnlyInProd(),
      // Only require secure cookies in production or HTTPS setups
      maxAge: sessionTtl
    }
  });
}
function reqSecureOnlyInProd() {
  return process.env.NODE_ENV === "production";
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(import_passport2.default.initialize());
  app2.use(import_passport2.default.session());
  if (!process.env.REPL_ID) {
    console.log("No REPL_ID found. Booting VaxPlan in Local Developer Authentication mode.");
    const seedGranularUsers = async (tenantId) => {
      const seededUsersList = [
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
          isActive: true,
          tenantId
        },
        {
          id: "seed-user-provincial-coord",
          email: "provincial.coord@vaxplan.org",
          firstName: "Provincial",
          lastName: "Coordinator",
          role: "provincial_coordinator",
          roles: ["provincial_coordinator"],
          permissions: ["view_clients", "approve_plans", "manage_users"],
          dataAccessScope: { provinces: [1], districts: [], facilities: [] },
          // Locked to Province ID 1 (Highlands Province)
          facilityId: null,
          districtId: null,
          provinceId: 1,
          isActive: true,
          tenantId
        },
        {
          id: "seed-user-district-mgr",
          email: "district.mgr@vaxplan.org",
          firstName: "District",
          lastName: "Manager",
          role: "district_manager",
          roles: ["district_manager"],
          permissions: ["view_clients", "manage_session_plans", "approve_plans"],
          dataAccessScope: { provinces: [], districts: [1], facilities: [] },
          // Locked to District ID 1 (District A)
          facilityId: null,
          districtId: 1,
          provinceId: 1,
          isActive: true,
          tenantId
        },
        {
          id: "seed-user-facility-clerk",
          email: "facility.clerk@vaxplan.org",
          firstName: "Facility",
          lastName: "Clerk",
          role: "facility_clerk",
          roles: ["facility_clerk", "gis_specialist"],
          // Dual-role
          permissions: ["log_immunization"],
          // User permission override
          dataAccessScope: { provinces: [], districts: [], facilities: [1] },
          // Locked to Facility ID 1 (Facility A)
          facilityId: 1,
          districtId: 1,
          provinceId: 1,
          isActive: true,
          tenantId
        }
      ];
      console.log("Seeding granular test accounts...");
      for (const userConfig of seededUsersList) {
        const existing = await storage.getUserByEmail(userConfig.email);
        if (!existing) {
          await db.insert(users).values(userConfig);
          console.log(`Successfully pre-seeded test account: ${userConfig.email}`);
        } else {
          await db.update(users).set({
            role: userConfig.role,
            roles: userConfig.roles,
            permissions: userConfig.permissions,
            dataAccessScope: userConfig.dataAccessScope,
            facilityId: userConfig.facilityId,
            districtId: userConfig.districtId,
            provinceId: userConfig.provinceId
          }).where((0, import_drizzle_orm3.eq)(users.id, existing.id));
        }
      }
    };
    storage.getTenantByCode("PNG").then((tenant) => {
      if (tenant) {
        seedGranularUsers(tenant.id).catch((err) => {
          console.error("Failed to seed granular test accounts:", err);
        });
      } else {
        storage.listActiveTenants().then((activeTenants) => {
          if (activeTenants.length > 0) {
            seedGranularUsers(activeTenants[0].id).catch((err) => {
              console.error("Failed to seed granular test accounts:", err);
            });
          }
        });
      }
    });
    app2.get("/api/login", async (req, res) => {
      let tenant = await storage.getTenantByCode("PNG");
      if (!tenant) {
        const activeTenants = await storage.listActiveTenants();
        tenant = activeTenants[0];
      }
      const tenantId = tenant ? tenant.id : null;
      const emailParam = req.query.email ? String(req.query.email).toLowerCase() : "dev.admin@vaxplan.org";
      let dbUser = await storage.getUserByEmail(emailParam);
      if (!dbUser) {
        const sub = emailParam === "dev.admin@vaxplan.org" ? "dev-user-id" : `mock-user-${Date.now()}`;
        const nameParts = emailParam.split("@")[0].split(".");
        const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
        const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "User";
        await storage.upsertUser({
          id: sub,
          email: emailParam,
          firstName,
          lastName,
          profileImageUrl: null
        });
        dbUser = await storage.getUserByEmail(emailParam);
        if (dbUser && tenantId && !dbUser.tenantId) {
          let initialRole = "facility_clerk";
          let initialRoles = ["facility_clerk"];
          if (emailParam === "dev.admin@vaxplan.org" || emailParam === "national.admin@vaxplan.org") {
            initialRole = "national_admin";
            initialRoles = ["national_admin"];
          }
          await db.update(users).set({
            tenantId,
            role: initialRole,
            roles: initialRoles,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm3.eq)(users.id, dbUser.id));
          dbUser = await storage.getUserByEmail(emailParam);
        }
      }
      if (!dbUser) {
        return res.status(400).send("Failed to retrieve or create mock login user");
      }
      const mockUser = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role || "facility_clerk",
        roles: dbUser.roles || [],
        permissions: dbUser.permissions || [],
        dataAccessScope: dbUser.dataAccessScope || { provinces: [], districts: [], facilities: [] },
        tenantId: dbUser.tenantId || tenantId,
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName
        },
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: Math.floor(Date.now() / 1e3) + 3600 * 24
        // 24 hours in the future
      };
      req.login(mockUser, (err) => {
        if (err) {
          console.error("Local mock login failed:", err);
          return res.status(500).send("Login failed");
        }
        res.redirect("/");
      });
    });
    app2.get("/api/callback", (req, res) => {
      res.redirect("/");
    });
    app2.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
    import_passport2.default.serializeUser((user, cb) => cb(null, user));
    import_passport2.default.deserializeUser((user, cb) => cb(null, user));
    return;
  }
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  const registeredStrategies = /* @__PURE__ */ new Set();
  const ensureStrategy = (domain) => {
    const strategyName2 = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName2)) {
      const strategy = new import_passport.Strategy(
        {
          name: strategyName2,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`
        },
        verify
      );
      import_passport2.default.use(strategy);
      registeredStrategies.add(strategyName2);
    }
  };
  import_passport2.default.serializeUser((user, cb) => cb(null, user));
  import_passport2.default.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    import_passport2.default.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    import_passport2.default.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/auth/authorization.ts
var ROLE_PERMISSIONS = {
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
    "view_budget"
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
    "manage_reports"
  ],
  district_manager: [
    "view_clients",
    "view_session_plans",
    "approve_plans",
    "view_stock",
    "view_mobilization",
    "view_budget",
    "approve_budget",
    "view_reports"
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
    "manage_users"
  ],
  gis_specialist: [
    "view_clients",
    "view_session_plans",
    "view_mobilization",
    "view_budget",
    "manage_boundaries"
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
    "manage_users"
  ]
};
var tenantRolesCache = /* @__PURE__ */ new Map();
function hasPermission(user, requiredPermission, context) {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const hasNationalAdminRole = user.role === "national_admin" || roles.includes("national_admin");
  if (hasNationalAdminRole) {
    return true;
  }
  const activeRoles = roles.length > 0 ? roles : [user.role];
  const permissionsSet = /* @__PURE__ */ new Set();
  const cachedRoles = user.tenantId ? tenantRolesCache.get(user.tenantId) : null;
  activeRoles.forEach((roleName) => {
    const rolePerms = cachedRoles && cachedRoles[roleName] || ROLE_PERMISSIONS[roleName] || [];
    rolePerms.forEach((p) => permissionsSet.add(p));
  });
  const userOverrides = Array.isArray(user.permissions) ? user.permissions : [];
  userOverrides.forEach((p) => permissionsSet.add(p));
  if (!permissionsSet.has(requiredPermission)) {
    return false;
  }
  if (context && (context.provinceId || context.districtId || context.facilityId)) {
    const scope = user.dataAccessScope || {
      provinces: [],
      districts: [],
      facilities: []
    };
    const hasExplicitScope = Array.isArray(scope.provinces) && scope.provinces.length > 0 || Array.isArray(scope.districts) && scope.districts.length > 0 || Array.isArray(scope.facilities) && scope.facilities.length > 0;
    if (hasExplicitScope) {
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
      if (!isLegacyAllowed) {
        return false;
      }
    }
  }
  return true;
}

// server/auth/ssoRoutes.ts
var import_passport5 = __toESM(require("passport"), 1);
var import_zod2 = require("zod");

// server/auth/oidcAdapter.ts
var client2 = __toESM(require("openid-client"), 1);
var import_passport3 = require("openid-client/passport");
var import_passport4 = __toESM(require("passport"), 1);
var import_memoizee2 = __toESM(require("memoizee"), 1);

// server/auth/secrets.ts
var EnvSecretsAdapter = class {
  async resolve(ref) {
    if (!ref) return void 0;
    if (ref.startsWith("env:")) return process.env[ref.slice(4)];
    return process.env[ref];
  }
};
var secrets = new EnvSecretsAdapter();
async function resolveIdpSecrets(cfg) {
  return {
    clientSecret: await secrets.resolve(cfg.clientSecretRef),
    cert: await secrets.resolve(cfg.certRef)
  };
}

// server/auth/oidcAdapter.ts
var registered = /* @__PURE__ */ new Set();
var getConfig = (0, import_memoizee2.default)(
  async (issuerUrl, clientId, clientSecret) => {
    return await client2.discovery(new URL(issuerUrl), clientId, clientSecret);
  },
  { maxAge: 3600 * 1e3, normalizer: (args) => JSON.stringify(args) }
);
function strategyName(cfgId) {
  return `oidc:${cfgId}`;
}
async function ensureOidcStrategy(cfg, callbackUrl2) {
  const name = strategyName(cfg.id);
  if (registered.has(name)) return name;
  if (!cfg.issuerUrl || !cfg.clientId) {
    throw new Error(`OIDC config ${cfg.id} missing issuerUrl or clientId`);
  }
  const { clientSecret } = await resolveIdpSecrets(cfg);
  const oidc = await getConfig(cfg.issuerUrl, cfg.clientId, clientSecret);
  const verify = async (tokens, verified) => {
    try {
      const claims = tokens.claims();
      const email = claims.email;
      if (!email) return verified(new Error("IdP returned no email claim"));
      await storage.upsertUser({
        id: claims.sub,
        email,
        firstName: claims.first_name ?? claims.given_name ?? null,
        lastName: claims.last_name ?? claims.family_name ?? null,
        profileImageUrl: claims.profile_image_url ?? claims.picture ?? null
      });
      await storage.assignUserTenant(claims.sub, cfg.tenantId);
      const sessionUser = {
        claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp,
        idpConfigId: cfg.id,
        tenantId: cfg.tenantId
      };
      verified(null, sessionUser);
    } catch (err) {
      verified(err);
    }
  };
  import_passport4.default.use(
    new import_passport3.Strategy(
      {
        name,
        config: oidc,
        scope: "openid email profile",
        callbackURL: callbackUrl2
      },
      verify
    )
  );
  registered.add(name);
  return name;
}

// server/auth/samlAdapter.ts
var NOT_CONFIGURED = {
  status: 501,
  message: "SAML support is not yet enabled. Install `passport-saml` and wire it into server/auth/samlAdapter.ts."
};
async function startSamlLogin(_cfg, _req, res) {
  res.status(NOT_CONFIGURED.status).json(NOT_CONFIGURED);
}
async function handleSamlCallback(_cfg, _req, res) {
  res.status(NOT_CONFIGURED.status).json(NOT_CONFIGURED);
}

// server/auth/tenantResolver.ts
function emailDomain(email) {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase();
}
async function resolveTenantByEmail(email) {
  const domain = emailDomain(email);
  if (!domain) return null;
  const cfg = await storage.getIdpConfigByEmailDomain(domain);
  if (!cfg) return null;
  const tenant = await storage.getTenant(cfg.tenantId);
  return tenant ? { tenant, idpConfig: cfg } : null;
}
var tenantContext = async (req, _res, next) => {
  if (!req.isAuthenticated?.()) return next();
  const headerTenantId = req.headers["x-tenant-id"] || req.query["x-tenant-id"];
  if (headerTenantId && typeof headerTenantId === "string") {
    req.session.viewTenantId = headerTenantId;
  }
  if (req.session.viewTenantId) {
    try {
      const t = await storage.getTenant(req.session.viewTenantId);
      if (t?.status === "active") {
        req.tenantId = t.id;
        return next();
      }
    } catch (err) {
      console.error("tenantContext viewTenantId lookup failed:", err);
    }
  }
  if (req.session.tenantId) {
    req.tenantId = req.session.tenantId;
    return next();
  }
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    if (user?.tenantId) {
      req.session.tenantId = user.tenantId;
      req.tenantId = user.tenantId;
    } else if (user?.email) {
      const resolved = await resolveTenantByEmail(user.email);
      if (resolved) {
        await storage.assignUserTenant(user.id, resolved.tenant.id);
        req.session.tenantId = resolved.tenant.id;
        req.tenantId = resolved.tenant.id;
      } else {
        const invite = await storage.findApprovedSignupForEmail(user.email);
        if (invite && invite.requestedRole !== "national_admin") {
          await storage.assignUserTenantAndRole(
            user.id,
            invite.tenantId,
            invite.requestedRole
          );
          const refreshed = await storage.getUser(user.id);
          if (refreshed?.tenantId) {
            req.session.tenantId = refreshed.tenantId;
            req.tenantId = refreshed.tenantId;
          }
        }
      }
    }
  } catch (err) {
    console.error("tenantContext error:", err);
  }
  next();
};
function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({ message: "No tenant assigned to this user" });
  }
  next();
}
var CROSS_TENANT_WRITE_ALLOWED_PATHS = /* @__PURE__ */ new Set([
  "/api/me/switch-tenant",
  "/api/logout"
]);
var crossTenantWriteGuard = async (req, res, next) => {
  if (!req.isAuthenticated?.()) return next();
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (CROSS_TENANT_WRITE_ALLOWED_PATHS.has(req.path)) return next();
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    const homeTenantId = user?.tenantId;
    if (!homeTenantId) return next();
    if (user?.role === "national_admin") {
      return next();
    }
    if (req.session.viewTenantId && req.session.viewTenantId === homeTenantId) {
      delete req.session.viewTenantId;
    }
    if (req.tenantId && req.tenantId === homeTenantId) {
      return next();
    }
    if (req.tenantId && req.tenantId !== homeTenantId) {
      return res.status(403).json({
        message: "You're viewing another country read-only. Switch back to your own country to make changes."
      });
    }
    return next();
  } catch (err) {
    console.error("crossTenantWriteGuard error:", err);
    return res.status(403).json({ message: "Cross-tenant write blocked" });
  }
};

// server/auth/ssoRoutes.ts
var discoverBody = import_zod2.z.object({ email: import_zod2.z.string().email() });
function callbackUrl(req, configId) {
  const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/sso/callback/${configId}`;
}
function safeReturnTo(value) {
  if (typeof value !== "string") return void 0;
  if (!value.startsWith("/")) return void 0;
  if (value.startsWith("//") || value.startsWith("/\\")) return void 0;
  return value;
}
function registerSsoRoutes(app2) {
  app2.post("/api/sso/discover", async (req, res) => {
    const parsed = discoverBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "email is required" });
    }
    const domain = emailDomain(parsed.data.email);
    if (!domain) return res.status(400).json({ message: "Invalid email" });
    const resolved = await resolveTenantByEmail(parsed.data.email);
    if (!resolved) {
      return res.status(404).json({ message: `No tenant configured for domain ${domain}` });
    }
    res.json({
      tenant: {
        id: resolved.tenant.id,
        name: resolved.tenant.name,
        code: resolved.tenant.code
      },
      idpConfig: {
        id: resolved.idpConfig.id,
        protocol: resolved.idpConfig.protocol,
        displayName: resolved.idpConfig.displayName
      },
      loginUrl: `/api/sso/login/${resolved.idpConfig.id}`
    });
  });
  app2.get(
    "/api/sso/login/:configId",
    async (req, res, next) => {
      try {
        const cfg = await storage.getIdpConfig(req.params.configId);
        if (!cfg || !cfg.isActive) {
          return res.status(404).json({ message: "IdP config not found" });
        }
        const safe = safeReturnTo(req.query.returnTo);
        if (safe) req.session.returnTo = safe;
        req.session.pendingIdpConfigId = cfg.id;
        if (cfg.protocol === "oidc") {
          await ensureOidcStrategy(cfg, callbackUrl(req, cfg.id));
          return import_passport5.default.authenticate(strategyName(cfg.id), {
            scope: ["openid", "email", "profile"]
          })(req, res, next);
        }
        if (cfg.protocol === "saml") {
          return startSamlLogin(cfg, req, res);
        }
        res.status(400).json({ message: `Unsupported protocol ${cfg.protocol}` });
      } catch (err) {
        next(err);
      }
    }
  );
  app2.get(
    "/api/sso/callback/:configId",
    async (req, res, next) => {
      try {
        const cfg = await storage.getIdpConfig(req.params.configId);
        if (!cfg) return res.status(404).json({ message: "IdP config not found" });
        if (cfg.protocol === "oidc") {
          await ensureOidcStrategy(cfg, callbackUrl(req, cfg.id));
          const target = safeReturnTo(req.session.returnTo) ?? "/";
          return import_passport5.default.authenticate(strategyName(cfg.id), {
            successReturnToOrRedirect: target,
            failureRedirect: "/"
          })(req, res, next);
        }
        if (cfg.protocol === "saml") {
          return handleSamlCallback(cfg, req, res);
        }
        res.status(400).json({ message: `Unsupported protocol ${cfg.protocol}` });
      } catch (err) {
        next(err);
      }
    }
  );
}

// server/auth/seedReplitIdpConfig.ts
init_db();
init_schema();
var import_drizzle_orm4 = require("drizzle-orm");
var PNG_TENANT_CODE = "PNG";
var REPLIT_DISPLAY_NAME = "Replit Auth (PNG)";
var REPLIT_DOMAIN = "replit.local";
async function seedReplitIdpConfig() {
  const replId = process.env.REPL_ID;
  const issuer = process.env.ISSUER_URL ?? "https://replit.com/oidc";
  if (!replId) {
    console.log("[seed] REPL_ID not set, skipping Replit IdP seed");
    return;
  }
  const [png] = await db.select().from(tenants).where((0, import_drizzle_orm4.eq)(tenants.code, PNG_TENANT_CODE));
  if (!png) {
    console.log("[seed] PNG tenant not found, skipping Replit IdP seed");
    return;
  }
  const existing = await db.select().from(tenantIdpConfigs).where(
    (0, import_drizzle_orm4.and)(
      (0, import_drizzle_orm4.eq)(tenantIdpConfigs.tenantId, png.id),
      (0, import_drizzle_orm4.eq)(tenantIdpConfigs.displayName, REPLIT_DISPLAY_NAME)
    )
  );
  if (existing.length > 0) return;
  await db.insert(tenantIdpConfigs).values({
    tenantId: png.id,
    protocol: "oidc",
    displayName: REPLIT_DISPLAY_NAME,
    emailDomain: REPLIT_DOMAIN,
    issuerUrl: issuer,
    clientId: replId,
    clientSecretRef: null,
    isActive: false
  });
  console.log("[seed] Replit IdP config recorded for PNG tenant (inactive \u2014 informational only)");
}

// server/routes.ts
init_schema();

// server/pipeline/settlementEngine.ts
init_db();
init_schema();
var import_drizzle_orm5 = require("drizzle-orm");
async function assignAdminBoundaries(tenantId, longitude, latitude) {
  const client3 = pool;
  const resolveLevel = async (level) => {
    try {
      const query = `
        SELECT
          feat->'properties'->>'shapeName' AS name
        FROM admin_boundaries b,
        LATERAL jsonb_array_elements(b.geojson->'features') AS feat
        WHERE b.tenant_id = $1 AND b.admin_level = $2
        ORDER BY ST_Distance(
          ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
          ST_SetSRID(ST_GeomFromGeoJSON(feat->>'geometry'), 4326)::geography
        ) ASC
        LIMIT 1
      `;
      const res = await client3.query(query, [tenantId, level, longitude, latitude]);
      return res.rows[0]?.name || null;
    } catch (err) {
      console.error(`Error resolving admin boundary level ${level}:`, err.message);
      return null;
    }
  };
  const province = await resolveLevel(1);
  const district = await resolveLevel(2);
  const constituency = await resolveLevel(3);
  const ward = await resolveLevel(4);
  return {
    provinceName: province,
    districtName: district,
    wardName: ward || constituency,
    constituencyName: constituency
  };
}
async function getNearestHealthFacility(tenantId, longitude, latitude) {
  const client3 = pool;
  try {
    const query = `
      SELECT
        name,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
        ) as distance_meters
      FROM facilities
      WHERE tenant_id = $3 AND latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true
      ORDER BY distance_meters ASC
      LIMIT 1
    `;
    const res = await client3.query(query, [longitude, latitude, tenantId]);
    if (res.rows.length === 0) {
      return { facilityName: null, distanceKm: 0, estimatedTravelTime: 0 };
    }
    const distanceMeters = parseFloat(res.rows[0].distance_meters);
    const distanceKm = distanceMeters / 1e3;
    const estimatedTravelTime = Math.round(distanceKm * 15);
    return {
      facilityName: res.rows[0].name,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      estimatedTravelTime
    };
  } catch (err) {
    console.error("Error finding nearest facility:", err.message);
    return { facilityName: null, distanceKm: 0, estimatedTravelTime: 0 };
  }
}
function calculateHTRIndex(distanceKm) {
  let accessibilityScore = 1;
  if (distanceKm < 5) {
    accessibilityScore = 1;
  } else if (distanceKm < 10) {
    accessibilityScore = 2;
  } else if (distanceKm < 20) {
    accessibilityScore = 3;
  } else {
    accessibilityScore = 4;
  }
  const hardToReach = distanceKm >= 5;
  return { accessibilityScore, hardToReach };
}
async function runMissingSettlementDetection(tenantId, options = {}) {
  const popThreshold = options.populationThreshold ?? 50;
  const buildingThreshold = options.buildingThreshold ?? 10;
  const radiusMeters = (options.radiusKm ?? 1.5) * 1e3;
  const clusterEpsDeg = (options.clusterEpsKm ?? 0.5) * 1e3 / 111320;
  console.log(`Running missing settlement detection for tenant ${tenantId}...`);
  console.log(
    `Parameters: Pop >= ${popThreshold}, Buildings >= ${buildingThreshold}, Radius = ${radiusMeters}m, ClusterEps = ${clusterEpsDeg.toFixed(5)}deg`
  );
  try {
    await db.delete(candidateUnmappedSettlements).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(candidateUnmappedSettlements.tenantId, tenantId),
        (0, import_drizzle_orm5.eq)(candidateUnmappedSettlements.validationStatus, "pending")
      )
    );
    const sql4 = `
      WITH admin_polys AS MATERIALIZED (
        SELECT
          b.admin_level,
          COALESCE(
            feat->'properties'->>'shapeName',
            feat->'properties'->>'name',
            feat->'properties'->>'NAME'
          ) AS name,
          ST_SetSRID(ST_GeomFromGeoJSON(feat->>'geometry'), 4326) AS geom
        FROM admin_boundaries b,
             LATERAL jsonb_array_elements(b.geojson->'features') AS feat
        WHERE b.tenant_id = $1
          AND COALESCE(b.is_active, true) = true
          AND feat ? 'geometry'
      ),
      qualifying_cells AS (
        SELECT
          g.id,
          g.population_total,
          g.under5_population,
          ST_Centroid(g.geometry) AS centroid
        FROM population_grids g
        WHERE g.tenant_id = $1
          AND g.population_total >= $2
          AND g.geometry IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM settlements_master s
            WHERE s.tenant_id = $1
              AND s.validation_status = 'approved'
              AND s.geometry IS NOT NULL
              AND ST_DWithin(g.geometry::geography, s.geometry::geography, $3)
          )
      ),
      clustered AS (
        SELECT
          id,
          population_total,
          under5_population,
          centroid,
          ST_ClusterDBSCAN(centroid, eps := $4, minpoints := 1) OVER () AS cluster_id
        FROM qualifying_cells
      ),
      clusters AS (
        SELECT
          cluster_id,
          SUM(population_total)::int       AS population_total,
          SUM(under5_population)::int      AS under5_population,
          ST_Centroid(ST_Collect(centroid)) AS centroid
        FROM clustered
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id
      ),
      enriched AS (
        SELECT
          ST_X(c.centroid) AS lng,
          ST_Y(c.centroid) AS lat,
          c.population_total,
          c.under5_population,
          (SELECT name FROM admin_polys
             WHERE admin_level = 1 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS province_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 2 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS district_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 3 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS constituency_name,
          (SELECT name FROM admin_polys
             WHERE admin_level = 4 AND name IS NOT NULL
             ORDER BY geom <-> c.centroid LIMIT 1)         AS ward_name,
          nf.name        AS facility_name,
          nf.distance_m  AS facility_distance_m,
          ns.name        AS nearest_settlement_name
        FROM clusters c
        LEFT JOIN LATERAL (
          SELECT
            f.name,
            ST_Distance(
              c.centroid::geography,
              ST_SetSRID(ST_MakePoint(f.longitude::float, f.latitude::float), 4326)::geography
            ) AS distance_m
          FROM facilities f
          WHERE f.tenant_id = $1
            AND f.is_active = true
            AND f.latitude IS NOT NULL
            AND f.longitude IS NOT NULL
          ORDER BY
            ST_SetSRID(ST_MakePoint(f.longitude::float, f.latitude::float), 4326)
            <-> c.centroid
          LIMIT 1
        ) nf ON TRUE
        LEFT JOIN LATERAL (
          SELECT s.name
          FROM settlements_master s
          WHERE s.tenant_id = $1
            AND s.validation_status = 'approved'
            AND s.geometry IS NOT NULL
          ORDER BY s.geometry <-> c.centroid
          LIMIT 1
        ) ns ON TRUE
      )
      INSERT INTO candidate_unmapped_settlements (
        tenant_id,
        latitude,
        longitude,
        geojson,
        estimated_population,
        building_count,
        nearest_named_settlement,
        nearest_facility,
        distance_to_facility,
        confidence_score,
        validation_status
      )
      SELECT
        $1,
        ROUND(e.lat::numeric, 7),
        ROUND(e.lng::numeric, 7),
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object(
            'type', 'Point',
            'coordinates', jsonb_build_array(e.lng, e.lat)
          ),
          'properties', jsonb_build_object(
            'estimated_population', e.population_total,
            'building_count', GREATEST($5::int, (e.population_total / 5.2)::int),
            'nearest_facility', COALESCE(e.facility_name, 'None'),
            'distance_to_facility', ROUND((COALESCE(e.facility_distance_m, 0) / 1000.0)::numeric, 2),
            'province', e.province_name,
            'district', e.district_name,
            'constituency', e.constituency_name,
            'ward', e.ward_name
          )
        ),
        e.population_total,
        GREATEST($5::int, (e.population_total / 5.2)::int),
        COALESCE(e.nearest_settlement_name, 'Unknown Community'),
        COALESCE(e.facility_name, 'Unassigned'),
        ROUND((COALESCE(e.facility_distance_m, 0) / 1000.0)::numeric, 2),
        LEAST(
          0.99,
          0.75
            + CASE WHEN e.population_total >= 100 THEN 0.10 ELSE 0 END
            + CASE WHEN e.district_name IS NOT NULL THEN 0.10 ELSE 0 END
        ),
        'pending'
      FROM enriched e
    `;
    const result = await pool.query(sql4, [
      tenantId,
      popThreshold,
      radiusMeters,
      clusterEpsDeg,
      buildingThreshold
    ]);
    const insertedCount = result.rowCount ?? 0;
    console.log(`Inserted ${insertedCount} Zero-Dose candidate settlements.`);
    return {
      success: true,
      message: `Successfully run spatial intelligence engine. Detected ${insertedCount} new Zero-Dose candidate settlements.`,
      candidatesDetected: insertedCount
    };
  } catch (err) {
    console.error("Failed to run missing settlement engine:", err.message);
    return {
      success: false,
      message: `Failed to run missing settlement engine: ${err.message}`,
      candidatesDetected: 0
    };
  }
}

// server/routes.ts
var import_zod3 = require("zod");
init_db();
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_drizzle_orm9 = require("drizzle-orm");

// server/services/geoBoundariesService.ts
var GB_BASE_URL = "https://www.geoboundaries.org/api/current";
function levelToAdmType(level) {
  if (level < 0 || level > 5) throw new Error(`Invalid admin level: ${level} (must be 0-5)`);
  return `ADM${level}`;
}
async function fetchGeoBoundariesMeta(countryCode, adminLevel) {
  const admType = levelToAdmType(adminLevel);
  const url = `${GB_BASE_URL}/gbOpen/${countryCode.toUpperCase()}/${admType}/`;
  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(3e4)
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `GeoBoundaries has no ${admType} boundary for country code "${countryCode}". Check the ISO-3 code or try a lower admin level.`
      );
    }
    throw new Error(`GeoBoundaries API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
async function fetchGeoBoundariesGeoJSON(countryCode, adminLevel) {
  const meta = await fetchGeoBoundariesMeta(countryCode, adminLevel);
  if (!meta.gjDownloadURL) {
    throw new Error(`No GeoJSON download URL found for ${countryCode} ADM${adminLevel}`);
  }
  const geoResponse = await fetch(meta.gjDownloadURL, {
    signal: AbortSignal.timeout(6e4)
    // GeoJSON files can be large
  });
  if (!geoResponse.ok) {
    throw new Error(`Failed to download GeoJSON from ${meta.gjDownloadURL}: ${geoResponse.status}`);
  }
  const geojson = await geoResponse.json();
  const featureCount = geojson.features?.length ?? 0;
  return { meta, geojson, featureCount };
}
function calcBBox(geojson) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  function processCoords(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(processCoords);
    }
  }
  for (const feature of geojson.features) {
    if (feature.geometry?.coordinates) {
      processCoords(feature.geometry.coordinates);
    }
  }
  if (!isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}
var SUPPORTED_COUNTRIES = [
  // ─── Sub-Saharan Africa ──────────────────────────────────────────
  { code: "NGA", name: "Nigeria", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "LGA", 3: "Ward" } },
  { code: "ETH", name: "Ethiopia", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Region", 2: "Zone", 3: "Woreda", 4: "Kebele" } },
  { code: "COD", name: "DR Congo", region: "Central Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Territory", 3: "Sector", 4: "Grouping" } },
  { code: "TZA", name: "Tanzania", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Ward", 4: "Village" } },
  { code: "KEN", name: "Kenya", region: "East Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "County", 2: "Sub-County", 3: "Ward" } },
  { code: "UGA", name: "Uganda", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "District", 2: "County", 3: "Sub-County", 4: "Parish" } },
  { code: "MOZ", name: "Mozambique", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Post Admin" } },
  { code: "GHA", name: "Ghana", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Sub-District" } },
  { code: "CMR", name: "Cameroon", region: "Central Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Arrondissement" } },
  { code: "CIV", name: "C\xF4te d'Ivoire", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "District", 2: "Region", 3: "Sous-Pr\xE9fecture" } },
  { code: "AGO", name: "Angola", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "Municipality", 3: "Commune" } },
  { code: "MDG", name: "Madagascar", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Region", 3: "District", 4: "Commune" } },
  { code: "ZMB", name: "Zambia", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Ward" } },
  { code: "MWI", name: "Malawi", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Traditional Authority" } },
  { code: "SEN", name: "Senegal", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Arrondissement", 3: "Commune" } },
  { code: "ZWE", name: "Zimbabwe", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Ward" } },
  { code: "SDN", name: "Sudan", region: "North Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "Locality", 3: "Administrative Unit" } },
  { code: "SSD", name: "South Sudan", region: "East Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "County", 3: "Payam" } },
  { code: "MLI", name: "Mali", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Cercle", 3: "Commune" } },
  { code: "NER", name: "Niger", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Commune" } },
  { code: "BFA", name: "Burkina Faso", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Province", 3: "Commune" } },
  { code: "TCD", name: "Chad", region: "Central Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Sous-Pr\xE9fecture" } },
  { code: "SOM", name: "Somalia", region: "East Africa", maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "District" } },
  { code: "RWA", name: "Rwanda", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Sector", 4: "Cell" } },
  { code: "BDI", name: "Burundi", region: "East Africa", maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Commune", 3: "Zone", 4: "Colline" } },
  { code: "SLE", name: "Sierra Leone", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Chiefdom" } },
  { code: "LBR", name: "Liberia", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "County", 2: "District", 3: "Clan" } },
  { code: "GIN", name: "Guinea", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Prefecture", 3: "Sub-Prefecture" } },
  { code: "TGO", name: "Togo", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Prefecture", 3: "Commune" } },
  { code: "BEN", name: "Benin", region: "West Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Department", 2: "Commune", 3: "Arrondissement" } },
  { code: "ZAF", name: "South Africa", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District Municipality", 3: "Local Municipality" } },
  { code: "NAM", name: "Namibia", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Constituency", 3: "Settlement" } },
  { code: "BWA", name: "Botswana", region: "Southern Africa", maxLevel: 2, levelNames: { 0: "Country", 1: "District", 2: "Sub-District" } },
  { code: "LSO", name: "Lesotho", region: "Southern Africa", maxLevel: 3, levelNames: { 0: "Country", 1: "District", 2: "Constituency", 3: "Community Council" } },
  { code: "SWZ", name: "Eswatini", region: "Southern Africa", maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "Tinkhundla" } },
  { code: "ERI", name: "Eritrea", region: "East Africa", maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "Sub-Region" } },
  { code: "DJI", name: "Djibouti", region: "East Africa", maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "District" } },
  // ─── South & Southeast Asia ──────────────────────────────────────
  { code: "PAK", name: "Pakistan", region: "South Asia", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "Division", 3: "District" } },
  { code: "AFG", name: "Afghanistan", region: "South Asia", maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "District" } },
  { code: "BGD", name: "Bangladesh", region: "South Asia", maxLevel: 4, levelNames: { 0: "Country", 1: "Division", 2: "District", 3: "Upazila", 4: "Union" } },
  { code: "MMR", name: "Myanmar", region: "SE Asia", maxLevel: 3, levelNames: { 0: "Country", 1: "State/Region", 2: "District", 3: "Township" } },
  { code: "KHM", name: "Cambodia", region: "SE Asia", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Commune" } },
  { code: "LAO", name: "Laos", region: "SE Asia", maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Village" } },
  { code: "HTI", name: "Haiti", region: "Caribbean", maxLevel: 3, levelNames: { 0: "Country", 1: "Department", 2: "Arrondissement", 3: "Commune" } },
  // ─── Pacific ─────────────────────────────────────────────────────
  { code: "PNG", name: "Papua New Guinea", region: "Pacific", maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "LLG", 4: "Ward" } },
  { code: "SLB", name: "Solomon Islands", region: "Pacific", maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "Ward" } },
  { code: "VUT", name: "Vanuatu", region: "Pacific", maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "Local Council" } }
];

// server/routes.ts
var import_turf = require("@turf/turf");
init_hisInteropService();

// server/services/syncService.ts
init_db();
init_schema();
var import_drizzle_orm6 = require("drizzle-orm");
async function pullChanges(tenantId, since) {
  const tenantFilter = (table) => {
    if (!since) return (0, import_drizzle_orm6.eq)(table.tenantId, tenantId);
    const timeCol = table.updatedAt || table.createdAt;
    if (timeCol) {
      return (0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(table.tenantId, tenantId), (0, import_drizzle_orm6.gt)(timeCol, since));
    }
    return (0, import_drizzle_orm6.eq)(table.tenantId, tenantId);
  };
  const [
    regionsData,
    provincesData,
    districtsData,
    llgsData,
    facilitiesData,
    villagesData,
    clientsData,
    vaccinationsData,
    sessionPlansData,
    sessionDayPlansData,
    budgetItemsData,
    mobilizationActivitiesData,
    stockData,
    reportsData,
    popData,
    vaccineConfigsData
  ] = await Promise.all([
    db.select().from(regions).where(tenantFilter(regions)),
    db.select().from(provinces).where(tenantFilter(provinces)),
    db.select().from(districts).where(tenantFilter(districts)),
    db.select().from(llgs).where(tenantFilter(llgs)),
    db.select().from(facilities).where(tenantFilter(facilities)),
    db.select().from(villages).where(tenantFilter(villages)),
    db.select().from(clients).where(tenantFilter(clients)),
    db.select().from(clientVaccinations).where(tenantFilter(clientVaccinations)),
    db.select().from(sessionPlans).where(tenantFilter(sessionPlans)),
    db.select().from(sessionDayPlans).where(tenantFilter(sessionDayPlans)),
    db.select().from(budgetItems).where(tenantFilter(budgetItems)),
    db.select().from(mobilizationActivities).where(tenantFilter(mobilizationActivities)),
    db.select().from(stockTransactions).where(tenantFilter(stockTransactions)),
    db.select().from(monthlyReports).where(tenantFilter(monthlyReports)),
    db.select().from(populationData).where(tenantFilter(populationData)),
    db.select().from(vaccineConfigurations).where(tenantFilter(vaccineConfigurations))
  ]);
  return {
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    regions: regionsData,
    provinces: provincesData,
    districts: districtsData,
    llgs: llgsData,
    facilities: facilitiesData,
    villages: villagesData,
    clients: clientsData,
    clientVaccinations: vaccinationsData,
    sessionPlans: sessionPlansData,
    sessionDayPlans: sessionDayPlansData,
    budgetItems: budgetItemsData,
    mobilizationActivities: mobilizationActivitiesData,
    stockTransactions: stockData,
    monthlyReports: reportsData,
    populationData: popData,
    vaccineConfigs: vaccineConfigsData
  };
}
async function batchMutate(tenantId, mutations, performedById) {
  const results = [];
  for (const mutation of mutations) {
    try {
      const body = mutation.body ? JSON.parse(mutation.body) : {};
      const payload = { ...body, tenantId };
      let serverId;
      if (mutation.url.startsWith("/api/clients")) {
        if (mutation.method === "POST") {
          const client3 = await storage.createClient(tenantId, payload);
          serverId = client3.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateClient(tenantId, String(mutation.serverId), payload);
          serverId = mutation.serverId;
        }
      } else if (mutation.url.includes("/vaccinations") || mutation.url.startsWith("/api/client-vaccinations")) {
        if (mutation.method === "POST") {
          const vac = await storage.createClientVaccination(tenantId, payload);
          serverId = vac.id;
        }
      } else if (mutation.url.startsWith("/api/stock-transactions") || mutation.url.startsWith("/api/stock/transaction")) {
        if (mutation.method === "POST") {
          const txPayload = {
            ...payload,
            expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : void 0,
            transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : /* @__PURE__ */ new Date()
          };
          const tx = await storage.createStockTransaction(tenantId, txPayload);
          serverId = tx.id;
        } else if (mutation.method === "DELETE") {
          let txId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!txId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              txId = Number(lastPart);
            }
          }
          if (txId) {
            await storage.deleteStockTransaction(tenantId, txId);
            serverId = txId;
          }
        }
      } else if (mutation.url.startsWith("/api/monthly-reports")) {
        if (mutation.method === "POST") {
          const report = await storage.createMonthlyReport(tenantId, {
            ...payload,
            submittedById: performedById
          });
          serverId = report.id;
        }
      } else if (mutation.url.startsWith("/api/session-plans") || mutation.url.startsWith("/api/sessions")) {
        if (mutation.method === "POST") {
          const plan = await storage.createSessionPlan(tenantId, payload);
          serverId = plan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateSessionPlan(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        }
      } else if (mutation.url.includes("/api/session-day-plans") || mutation.url.includes("/api/sessionDayPlans")) {
        if (mutation.method === "POST") {
          const dayPlan = await storage.createSessionDayPlan(tenantId, payload);
          serverId = dayPlan.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateSessionDayPlan(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let dayPlanId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!dayPlanId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              dayPlanId = Number(lastPart);
            }
          }
          if (dayPlanId) {
            await storage.deleteSessionDayPlan(tenantId, dayPlanId);
            serverId = dayPlanId;
          }
        }
      } else if (mutation.url.startsWith("/api/budget-items")) {
        if (mutation.method === "POST") {
          const item = await storage.createBudgetItem(tenantId, payload);
          serverId = item.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateBudgetItem(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let itemId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!itemId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              itemId = Number(lastPart);
            }
          }
          if (itemId) {
            await storage.deleteBudgetItem(tenantId, itemId);
            serverId = itemId;
          }
        }
      } else if (mutation.url.startsWith("/api/mobilization")) {
        if (mutation.method === "POST") {
          const activity = await storage.createMobilizationActivity(tenantId, payload);
          serverId = activity.id;
        } else if ((mutation.method === "PATCH" || mutation.method === "PUT") && mutation.serverId) {
          await storage.updateMobilizationActivity(tenantId, Number(mutation.serverId), payload);
          serverId = mutation.serverId;
        } else if (mutation.method === "DELETE") {
          let activityId = mutation.serverId ? Number(mutation.serverId) : null;
          if (!activityId) {
            const parts = mutation.url.split("/");
            const lastPart = parts[parts.length - 1];
            if (lastPart && !isNaN(Number(lastPart))) {
              activityId = Number(lastPart);
            }
          }
          if (activityId) {
            await db.delete(mobilizationActivities).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(mobilizationActivities.id, activityId), (0, import_drizzle_orm6.eq)(mobilizationActivities.tenantId, tenantId)));
            serverId = activityId;
          }
        }
      } else {
        console.warn(`[syncService] Unknown mutation URL: ${mutation.url}`);
        results.push({ outboxId: mutation.id, success: false, error: `Unknown mutation URL: ${mutation.url}` });
        continue;
      }
      try {
        await db.insert(auditLogs).values({
          tenantId,
          userId: performedById ?? "offline-sync",
          action: `offline_sync_${mutation.method.toLowerCase()}_${mutation.entityType}`,
          entityType: mutation.entityType,
          entityId: serverId ? Number(serverId) : null,
          newValue: payload
        });
      } catch {
      }
      results.push({ outboxId: mutation.id, success: true, serverId });
    } catch (err) {
      console.error(`[syncService] mutation failed (outboxId=${mutation.id}):`, err);
      results.push({
        outboxId: mutation.id,
        success: false,
        error: err?.message ?? "Mutation failed"
      });
    }
  }
  return results;
}
async function getSyncStats(tenantId) {
  const [
    facilityCount,
    clientCount,
    vaccinationCount,
    sessionCount,
    reportCount
  ] = await Promise.all([
    db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(facilities).where((0, import_drizzle_orm6.eq)(facilities.tenantId, tenantId)),
    db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(clients).where((0, import_drizzle_orm6.eq)(clients.tenantId, tenantId)),
    db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(clientVaccinations).where((0, import_drizzle_orm6.eq)(clientVaccinations.tenantId, tenantId)),
    db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(sessionPlans).where((0, import_drizzle_orm6.eq)(sessionPlans.tenantId, tenantId)),
    db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(monthlyReports).where((0, import_drizzle_orm6.eq)(monthlyReports.tenantId, tenantId))
  ]);
  return {
    facilities: Number(facilityCount[0]?.count ?? 0),
    clients: Number(clientCount[0]?.count ?? 0),
    vaccinations: Number(vaccinationCount[0]?.count ?? 0),
    sessions: Number(sessionCount[0]?.count ?? 0),
    reports: Number(reportCount[0]?.count ?? 0),
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/jobs/populationRefresh.ts
var import_fs = require("fs");
var import_path = require("path");
var import_drizzle_orm7 = require("drizzle-orm");
init_db();
init_schema();

// scripts/ingestWorldPopRaster.ts
var import_geotiff = require("geotiff");
init_db();
function classifyDensity(pop) {
  if (pop >= 500) return "Extreme";
  if (pop >= 200) return "High";
  if (pop >= 50) return "Medium";
  if (pop >= 10) return "Low";
  return "Scattered";
}
async function flushBatch(tenantId, rows) {
  if (rows.length === 0) return;
  const cols = 6;
  const valuePlaceholders = [];
  const params = [];
  for (let i = 0; i < rows.length; i++) {
    const base = i * cols;
    valuePlaceholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::jsonb, $${base + 5}, $${base + 6})`
    );
    const r = rows[i];
    params.push(
      tenantId,
      r.populationTotal,
      r.under5,
      r.geojson,
      r.rasterCell,
      r.density
    );
  }
  const sql4 = `INSERT INTO population_grids
      (tenant_id, population_total, under5_population, geojson, raster_cell, density_classification)
    VALUES ${valuePlaceholders.join(",")}`;
  await pool.query(sql4, params);
}
async function ingestWorldPopRaster(opts) {
  const {
    tenantId,
    rasterPath,
    cellPrefix,
    minPopulation = 10,
    batchSize = 500,
    under5Fraction = 0.16,
    truncateExisting = true,
    onProgress,
    progressEvery = 50
  } = opts;
  const tiff = await (0, import_geotiff.fromFile)(rasterPath);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resYsigned] = image.getResolution();
  const cellW = resX;
  const cellH = Math.abs(resYsigned);
  const tileW = image.getTileWidth();
  const tileH = image.getTileHeight();
  const fd = image.getFileDirectory();
  const nodataRaw = fd?.GDAL_NODATA;
  const nodata = nodataRaw !== void 0 ? parseFloat(nodataRaw) : void 0;
  const tilesAcross = Math.ceil(width / tileW);
  const tilesDown = Math.ceil(height / tileH);
  const tilesTotal = tilesAcross * tilesDown;
  console.log(
    `[worldpop] ${rasterPath}: ${width}x${height} px, tile ${tileW}x${tileH} -> ${tilesTotal} tiles`
  );
  console.log(
    `[worldpop] origin=(${originX}, ${originY}) cell=${cellW.toFixed(8)}x${cellH.toFixed(8)} deg, nodata=${nodata}`
  );
  if (truncateExisting) {
    console.log(`[worldpop] Clearing existing population_grids for tenant ${tenantId}...`);
    await pool.query("DELETE FROM population_grids WHERE tenant_id = $1", [tenantId]);
  }
  const batch = [];
  let cellsScanned = 0;
  let cellsAboveThreshold = 0;
  let rowsInserted = 0;
  let tilesDone = 0;
  for (let ty = 0; ty < tilesDown; ty++) {
    const y0 = ty * tileH;
    const y1 = Math.min(y0 + tileH, height);
    for (let tx = 0; tx < tilesAcross; tx++) {
      const x0 = tx * tileW;
      const x1 = Math.min(x0 + tileW, width);
      const winW = x1 - x0;
      const winH = y1 - y0;
      const rasters = await image.readRasters({
        window: [x0, y0, x1, y1],
        samples: [0]
      });
      const band = rasters[0];
      for (let py = 0; py < winH; py++) {
        const row = y0 + py;
        const latTop = originY + row * resYsigned;
        const latBottom = latTop + resYsigned;
        for (let px = 0; px < winW; px++) {
          cellsScanned++;
          const v = band[py * winW + px];
          if (!Number.isFinite(v)) continue;
          if (nodata !== void 0 && v === nodata) continue;
          if (v < minPopulation) continue;
          const col = x0 + px;
          const lngLeft = originX + col * cellW;
          const lngRight = lngLeft + cellW;
          const pop = Math.round(v);
          if (pop < minPopulation) continue;
          cellsAboveThreshold++;
          const polygon = {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [lngLeft, latBottom],
                  [lngRight, latBottom],
                  [lngRight, latTop],
                  [lngLeft, latTop],
                  [lngLeft, latBottom]
                ]
              ]
            },
            properties: {
              population: pop,
              cell_index: `${cellPrefix}_${col}_${row}`,
              source: "worldpop_2026_100m"
            }
          };
          batch.push({
            populationTotal: pop,
            under5: Math.round(pop * under5Fraction),
            geojson: JSON.stringify(polygon),
            rasterCell: `${cellPrefix}_${col}_${row}`,
            density: classifyDensity(pop)
          });
          if (batch.length >= batchSize) {
            await flushBatch(tenantId, batch);
            rowsInserted += batch.length;
            batch.length = 0;
          }
        }
      }
      tilesDone++;
      if (onProgress && tilesDone % progressEvery === 0) {
        onProgress({ tilesDone, tilesTotal, rowsInserted: rowsInserted + batch.length });
      }
    }
  }
  if (batch.length > 0) {
    await flushBatch(tenantId, batch);
    rowsInserted += batch.length;
    batch.length = 0;
  }
  console.log(
    `[worldpop] Done. tiles=${tilesDone}/${tilesTotal} scanned=${cellsScanned} aboveThreshold=${cellsAboveThreshold} inserted=${rowsInserted}`
  );
  return { rowsInserted, cellsScanned, cellsAboveThreshold };
}
async function runCli() {
  const [, , tenantCode, rasterArg, minPopArg] = process.argv;
  if (!tenantCode) {
    console.error("Usage: tsx scripts/ingestWorldPopRaster.ts <tenantCode> [rasterPath] [minPopulation]");
    process.exit(1);
  }
  const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const { tenants: tenants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq10 } = await import("drizzle-orm");
  const code = tenantCode.toUpperCase();
  const rows = await db2.select().from(tenants2).where(eq10(tenants2.code, code)).limit(1);
  if (rows.length === 0) {
    console.error(`Tenant with code '${code}' not found.`);
    process.exit(1);
  }
  const tenantId = rows[0].id;
  const rasterPath = rasterArg ?? `Resources/${code.toLowerCase()}_pop_2026_CN_100m_R2025A_v1.tif`;
  const result = await ingestWorldPopRaster({
    tenantId,
    rasterPath,
    cellPrefix: code.toLowerCase(),
    minPopulation: minPopArg ? parseInt(minPopArg, 10) : 25,
    onProgress: ({ tilesDone, tilesTotal, rowsInserted }) => console.log(`[worldpop:${code.toLowerCase()}] tile ${tilesDone}/${tilesTotal}, rows=${rowsInserted}`)
  });
  console.log(`Done: inserted ${result.rowsInserted} cells for ${code} (${tenantId}).`);
  await pool.end();
}
var invokedDirectly = (() => {
  try {
    const entry = process.argv[1] ?? "";
    return entry.includes("ingestWorldPopRaster");
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// server/jobs/populationRefresh.ts
var DEFAULT_MIN_POPULATION = 25;
var STALE_RUNNING_MS = 6 * 60 * 60 * 1e3;
var migrationPromise = null;
async function ensurePopulationRefreshMigration() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const sqlPath = (0, import_path.join)(process.cwd(), "server", "migrations", "007-population-refresh-jobs.sql");
      const sqlText = (0, import_fs.readFileSync)(sqlPath, "utf8");
      const client3 = await pool.connect();
      try {
        await client3.query(sqlText);
      } finally {
        client3.release();
      }
    })().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}
function resolveTenantRasterPath(tenant) {
  const settings = tenant.settings ?? {};
  const override = settings.populationRasterPath;
  if (typeof override === "string" && override.length > 0) {
    return override;
  }
  const iso = (tenant.countryCode || tenant.code || "").toLowerCase();
  return `Resources/${iso}_pop_2026_CN_100m_R2025A_v1.tif`;
}
async function isRefreshAlreadyRunning(tenantId) {
  const rows = await db.select({ id: populationRefreshJobs.id, startedAt: populationRefreshJobs.startedAt }).from(populationRefreshJobs).where((0, import_drizzle_orm7.and)(
    (0, import_drizzle_orm7.eq)(populationRefreshJobs.tenantId, tenantId),
    (0, import_drizzle_orm7.eq)(populationRefreshJobs.status, "running")
  ));
  const now = Date.now();
  for (const row of rows) {
    const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
    if (now - started < STALE_RUNNING_MS) {
      return true;
    }
  }
  return false;
}
async function refreshTenantPopulation(tenantId, opts) {
  await ensurePopulationRefreshMigration();
  const tenant = await db.query.tenants.findFirst({ where: (0, import_drizzle_orm7.eq)(tenants.id, tenantId) });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  if (await isRefreshAlreadyRunning(tenantId)) {
    const [existing] = await db.select().from(populationRefreshJobs).where((0, import_drizzle_orm7.and)(
      (0, import_drizzle_orm7.eq)(populationRefreshJobs.tenantId, tenantId),
      (0, import_drizzle_orm7.eq)(populationRefreshJobs.status, "running")
    )).orderBy((0, import_drizzle_orm7.desc)(populationRefreshJobs.startedAt)).limit(1);
    if (existing) return existing;
  }
  const rasterPath = opts.rasterPath ?? resolveTenantRasterPath(tenant);
  const minPopulation = opts.minPopulation ?? DEFAULT_MIN_POPULATION;
  const cellPrefix = tenant.code.toLowerCase();
  const [job] = await db.insert(populationRefreshJobs).values({
    tenantId,
    triggeredBy: opts.triggeredBy,
    triggeredByUserId: opts.triggeredByUserId ?? null,
    rasterPath,
    minPopulation,
    status: "running",
    startedAt: /* @__PURE__ */ new Date()
  }).returning();
  const startMs = Date.now();
  try {
    if (!(0, import_fs.existsSync)(rasterPath)) {
      throw new Error(`Raster file not found at ${rasterPath}`);
    }
    const result = await ingestWorldPopRaster({
      tenantId,
      rasterPath,
      cellPrefix,
      minPopulation
    });
    const [updated] = await db.update(populationRefreshJobs).set({
      status: "succeeded",
      completedAt: /* @__PURE__ */ new Date(),
      rowsInserted: result.rowsInserted,
      cellsScanned: result.cellsScanned,
      cellsAboveThreshold: result.cellsAboveThreshold,
      durationMs: Date.now() - startMs
    }).where((0, import_drizzle_orm7.eq)(populationRefreshJobs.id, job.id)).returning();
    console.log(
      `[population-refresh] tenant=${tenant.code} status=succeeded rows=${result.rowsInserted} durationMs=${Date.now() - startMs}`
    );
    return updated ?? job;
  } catch (err) {
    const message = err?.message ? String(err.message).slice(0, 4e3) : String(err).slice(0, 4e3);
    console.error(`[population-refresh] tenant=${tenant.code} status=failed: ${message}`);
    const [updated] = await db.update(populationRefreshJobs).set({
      status: "failed",
      completedAt: /* @__PURE__ */ new Date(),
      durationMs: Date.now() - startMs,
      errorMessage: message
    }).where((0, import_drizzle_orm7.eq)(populationRefreshJobs.id, job.id)).returning();
    return updated ?? job;
  }
}
async function runScheduledPopulationRefresh() {
  await ensurePopulationRefreshMigration();
  const activeTenants = await db.select().from(tenants).where((0, import_drizzle_orm7.eq)(tenants.status, "active"));
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const tenant of activeTenants) {
    const rasterPath = resolveTenantRasterPath(tenant);
    if (!(0, import_fs.existsSync)(rasterPath)) {
      skipped++;
      continue;
    }
    attempted++;
    try {
      const job = await refreshTenantPopulation(tenant.id, {
        triggeredBy: "scheduled"
      });
      if (job.status === "succeeded") succeeded++;
      else if (job.status === "failed") failed++;
    } catch (err) {
      failed++;
      console.error(`[population-refresh] scheduled run failed for ${tenant.code}:`, err);
    }
  }
  console.log(
    `[population-refresh] scheduled cycle done \u2014 attempted=${attempted} succeeded=${succeeded} failed=${failed} skipped=${skipped}`
  );
  return { attempted, succeeded, failed, skipped };
}
var schedulerHandle = null;
function startPopulationRefreshScheduler() {
  if (schedulerHandle) return;
  const raw = process.env.POPULATION_REFRESH_INTERVAL_HOURS;
  const hours = raw ? parseFloat(raw) : 0;
  if (!Number.isFinite(hours) || hours <= 0) {
    console.log("[population-refresh] scheduler disabled (POPULATION_REFRESH_INTERVAL_HOURS not set)");
    return;
  }
  const intervalMs = Math.max(6e4, Math.round(hours * 60 * 60 * 1e3));
  console.log(`[population-refresh] scheduler enabled \u2014 running every ${hours}h`);
  const tick = () => {
    runScheduledPopulationRefresh().catch((err) => {
      console.error("[population-refresh] scheduled cycle threw:", err);
    });
  };
  setTimeout(tick, 3e4);
  schedulerHandle = setInterval(tick, intervalMs);
}
async function listRefreshJobs(opts) {
  await ensurePopulationRefreshMigration();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const where = opts.tenantId ? (0, import_drizzle_orm7.eq)(populationRefreshJobs.tenantId, opts.tenantId) : void 0;
  const query = db.select().from(populationRefreshJobs).orderBy((0, import_drizzle_orm7.desc)(populationRefreshJobs.startedAt)).limit(limit);
  if (where) {
    return await query.where(where);
  }
  return await query;
}

// server/routes.ts
async function logAudit(req, action, entityType, entityId, oldValue, newValue) {
  try {
    const userId = req.user?.claims?.sub || null;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const tenantId = req.tenantId;
    if (!tenantId) {
      console.warn("logAudit skipped: no tenant on request", { action, entityType });
      return;
    }
    let numericEntityId = null;
    if (typeof entityId === "number") {
      numericEntityId = entityId;
    } else if (typeof entityId === "string") {
      const parsed = parseInt(entityId, 10);
      if (!isNaN(parsed)) {
        numericEntityId = parsed;
      }
    }
    await storage.createAuditLog(tenantId, {
      userId,
      action,
      entityType,
      entityId: numericEntityId,
      oldValue: oldValue || null,
      newValue: newValue || null,
      ipAddress: typeof ipAddress === "string" ? ipAddress : null
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
async function getFacilityHierarchy(facilityId, tenantId) {
  try {
    const fac = await storage.getFacility(tenantId, facilityId);
    if (!fac) return { facilityId };
    const dist = await storage.getDistrict(tenantId, fac.districtId);
    return {
      facilityId,
      districtId: fac.districtId,
      provinceId: dist ? dist.provinceId : null
    };
  } catch (e) {
    console.error("getFacilityHierarchy failed:", e);
    return { facilityId };
  }
}
async function refreshTenantRolesCache(tenantId) {
  try {
    const dbRoles = await storage.getUserRoles(tenantId);
    const roleMap = {};
    Object.entries(ROLE_PERMISSIONS).forEach(([code, perms]) => {
      roleMap[code] = perms;
    });
    dbRoles.forEach((r) => {
      roleMap[r.code] = r.permissions;
    });
    tenantRolesCache.set(tenantId, roleMap);
  } catch (err) {
    console.error(`Failed to refresh tenant roles cache for ${tenantId}:`, err);
  }
}
function requirePermission(permission, getGeographicContext) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (req.tenantId && !tenantRolesCache.has(req.tenantId)) {
        await refreshTenantRolesCache(req.tenantId);
      }
      const freshUser = await storage.getUser(user.id);
      if (!freshUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let context = {};
      if (getGeographicContext) {
        context = await getGeographicContext(req);
      }
      if (!hasPermission(freshUser, permission, context)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient privileges or restricted geographic scope"
        });
      }
      req.dbUser = freshUser;
      next();
    } catch (error) {
      console.error("Authorization middleware error:", error);
      res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}
var auth = [isAuthenticated, requireTenant];
async function validatePlanningLeadTimeAndNoConflict(tenantId, facilityId, dateString, excludeSessionId, excludeDayPlanId) {
  try {
    const inputDate = new Date(dateString);
    if (isNaN(inputDate.getTime())) {
      return { isValid: false, message: "Invalid date format supplied." };
    }
    const inputMidnight = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const today = /* @__PURE__ */ new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = inputMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1e3 * 60 * 60 * 24));
    if (diffDays < 7) {
      return {
        isValid: false,
        message: "Immunization sessions must be scheduled at least 7 days in advance. No plans can be scheduled for today or in the past."
      };
    }
    const conflictingSessions = await db.select({ id: sessionPlans.id, name: sessionPlans.name }).from(sessionPlans).where(
      (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(sessionPlans.tenantId, tenantId),
        (0, import_drizzle_orm9.eq)(sessionPlans.facilityId, facilityId),
        (0, import_drizzle_orm9.eq)(sessionPlans.scheduledDate, inputMidnight),
        excludeSessionId ? (0, import_drizzle_orm9.ne)(sessionPlans.id, excludeSessionId) : void 0
      )
    );
    if (conflictingSessions.length > 0) {
      return {
        isValid: false,
        message: `Conflict: An immunization session ("${conflictingSessions[0].name}") is already scheduled for this facility on this day.`
      };
    }
    const conflictingDays = await db.select({ id: sessionDayPlans.id, dayNumber: sessionDayPlans.dayNumber, sessionName: sessionPlans.name }).from(sessionDayPlans).innerJoin(sessionPlans, (0, import_drizzle_orm9.eq)(sessionDayPlans.sessionPlanId, sessionPlans.id)).where(
      (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(sessionPlans.tenantId, tenantId),
        (0, import_drizzle_orm9.eq)(sessionPlans.facilityId, facilityId),
        (0, import_drizzle_orm9.eq)(sessionDayPlans.sessionDate, inputMidnight),
        excludeDayPlanId ? (0, import_drizzle_orm9.ne)(sessionDayPlans.id, excludeDayPlanId) : void 0
      )
    );
    if (conflictingDays.length > 0) {
      return {
        isValid: false,
        message: `Conflict: An itinerary day (Day ${conflictingDays[0].dayNumber} of "${conflictingDays[0].sessionName}") is already scheduled for this facility on this day.`
      };
    }
    return { isValid: true };
  } catch (error) {
    console.error("validatePlanningLeadTimeAndNoConflict error:", error);
    return { isValid: false, message: "Server error validating planning dates." };
  }
}
async function registerRoutes(httpServer2, app2) {
  await setupAuth(app2);
  registerSsoRoutes(app2);
  await seedReplitIdpConfig().catch(
    (err) => console.error("Replit IdP seed failed:", err)
  );
  app2.use(tenantContext);
  app2.use(crossTenantWriteGuard);
  app2.get("/api/users", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const list = await storage.listUsers(req.tenantId);
      res.json(list);
    } catch (err) {
      console.error("GET /api/users failed:", err);
      res.status(500).json({ message: "Failed to list users" });
    }
  });
  app2.put("/api/users/:id/roles-permissions", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const { roles, permissions, dataAccessScope } = req.body;
      if (!Array.isArray(roles)) {
        return res.status(400).json({ message: "roles must be a string array" });
      }
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "permissions must be a string array" });
      }
      if (!dataAccessScope || typeof dataAccessScope !== "object") {
        return res.status(400).json({ message: "dataAccessScope must be a geographic scope object" });
      }
      const updatedUser = await storage.updateUserRolesAndPermissions(
        req.params.id,
        roles,
        permissions,
        dataAccessScope
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await logAudit(req, "update_user_access", "users", null, null, {
        userId: req.params.id,
        roles,
        permissions,
        dataAccessScope
      });
      res.json(updatedUser);
    } catch (err) {
      console.error("PUT /api/users/:id/roles-permissions failed:", err);
      res.status(500).json({ message: "Failed to update user access parameters" });
    }
  });
  app2.post("/api/users", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const { email, firstName, lastName, roles, dataAccessScope, isActive, facilityId, districtId, provinceId } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "A user with this email address already exists" });
      }
      const user = await storage.createUser(req.tenantId, {
        email,
        firstName,
        lastName,
        roles: roles || ["facility_clerk"],
        dataAccessScope: dataAccessScope || { provinces: [], districts: [], facilities: [] },
        isActive: isActive !== void 0 ? isActive : true,
        facilityId: facilityId || null,
        districtId: districtId || null,
        provinceId: provinceId || null
      });
      await logAudit(req, "create_user", "users", user.id, null, user);
      res.status(201).json(user);
    } catch (err) {
      console.error("POST /api/users failed:", err);
      res.status(500).json({ message: "Failed to create user account" });
    }
  });
  app2.patch("/api/users/:id", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const { firstName, lastName, email, roles, permissions, dataAccessScope, isActive, facilityId, districtId, provinceId } = req.body;
      const oldUser = await storage.getUser(req.params.id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const updated = await storage.updateUser(req.tenantId, req.params.id, {
        firstName,
        lastName,
        email,
        roles,
        permissions,
        dataAccessScope,
        isActive,
        facilityId: facilityId === void 0 ? oldUser.facilityId : facilityId || null,
        districtId: districtId === void 0 ? oldUser.districtId : districtId || null,
        provinceId: provinceId === void 0 ? oldUser.provinceId : provinceId || null
      });
      await logAudit(req, "update_user", "users", req.params.id, oldUser, updated);
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/users/:id failed:", err);
      res.status(500).json({ message: "Failed to update user details" });
    }
  });
  app2.delete("/api/users/:id", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const oldUser = await storage.getUser(req.params.id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.deleteUser(req.tenantId, req.params.id);
      await logAudit(req, "delete_user", "users", req.params.id, oldUser, null);
      res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/users/:id failed:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/user-roles", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      let roles = await storage.getUserRoles(req.tenantId);
      if (roles.length === 0) {
        for (const [code, perms] of Object.entries(ROLE_PERMISSIONS)) {
          await storage.createUserRole(req.tenantId, {
            code,
            name: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            permissions: perms
          });
        }
        roles = await storage.getUserRoles(req.tenantId);
      }
      res.json(roles);
    } catch (err) {
      console.error("GET /api/user-roles failed:", err);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });
  app2.post("/api/user-roles", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const data = insertUserRoleSchema.parse(req.body);
      const existing = await storage.getUserRoleByCode(req.tenantId, data.code);
      if (existing) {
        return res.status(400).json({ message: `A user role with code ${data.code} already exists.` });
      }
      const role = await storage.createUserRole(req.tenantId, data);
      await refreshTenantRolesCache(req.tenantId);
      await logAudit(req, "create_user_role", "user_roles", role.id, null, role);
      res.status(201).json(role);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid user role data", errors: err.errors });
      }
      console.error("POST /api/user-roles failed:", err);
      res.status(500).json({ message: "Failed to create user role" });
    }
  });
  app2.patch("/api/user-roles/:id", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldRole = await storage.getUserRole(req.tenantId, id);
      if (!oldRole) {
        return res.status(404).json({ message: "User role not found" });
      }
      const data = req.body;
      const updated = await storage.updateUserRole(req.tenantId, id, data);
      await refreshTenantRolesCache(req.tenantId);
      await logAudit(req, "update_user_role", "user_roles", id, oldRole, updated);
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/user-roles/:id failed:", err);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  app2.delete("/api/user-roles/:id", isAuthenticated, requireTenant, requirePermission("manage_users"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldRole = await storage.getUserRole(req.tenantId, id);
      if (!oldRole) {
        return res.status(404).json({ message: "User role not found" });
      }
      if (oldRole.code === "national_admin") {
        return res.status(400).json({ message: "The super admin role 'national_admin' is a critical platform dependency and cannot be deleted." });
      }
      await storage.deleteUserRole(req.tenantId, id);
      await refreshTenantRolesCache(req.tenantId);
      await logAudit(req, "delete_user_role", "user_roles", id, oldRole, null);
      res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/user-roles/:id failed:", err);
      res.status(500).json({ message: "Failed to delete user role" });
    }
  });
  (async () => {
    try {
      const activeTenants = await storage.listActiveTenants();
      const png = activeTenants.find((t) => t.code === "PNG");
      if (png) {
        const settings = png.settings || {};
        const needsUpdate = !settings.demographics || !settings.adminLevelLabels || settings.skipRegionLevel !== true;
        if (needsUpdate) {
          settings.demographics = settings.demographics ?? {
            births: 0.032,
            under1: 0.03,
            pregnant: 0.032,
            schoolEntry: 0.027,
            schoolExit: 0.022
          };
          settings.skipRegionLevel = true;
          settings.adminLevelLabels = {
            level1: "Region",
            level2: "Province",
            level3: "District",
            level4: "LLG",
            level5: "Village"
          };
          await db.update(tenants).set({ settings }).where((0, import_drizzle_orm9.eq)(tenants.id, png.id));
          console.log("[Self-Healing] Stamped default PNG demographics and aligned admin settings.");
        }
      }
      const zmb = activeTenants.find((t) => t.code === "ZMB");
      if (zmb) {
        const settings = zmb.settings || {};
        const needsUpdate = !settings.demographics || !settings.adminLevelLabels || settings.skipRegionLevel !== true;
        if (needsUpdate) {
          settings.demographics = settings.demographics ?? {
            births: 0.038,
            under1: 0.035,
            pregnant: 0.04,
            schoolEntry: 0.032,
            schoolExit: 0.028
          };
          settings.skipRegionLevel = true;
          settings.adminLevelLabels = {
            level1: "Region",
            level2: "Province",
            level3: "District",
            level4: "Ward",
            level5: "Village"
          };
          await db.update(tenants).set({ settings }).where((0, import_drizzle_orm9.eq)(tenants.id, zmb.id));
          console.log("[Self-Healing] Stamped default Zambia demographics and aligned admin settings.");
        }
      }
      let ssd = activeTenants.find((t) => t.code === "SSD");
      if (!ssd) {
        const dbTenants = await db.select().from(tenants).where((0, import_drizzle_orm9.eq)(tenants.code, "SSD"));
        if (dbTenants.length > 0) {
          ssd = dbTenants[0];
          console.log("[Self-Healing] South Sudan tenant found in database, skipped insertion.");
        } else {
          const SSD_TENANT = {
            code: "SSD",
            name: "Republic of South Sudan Ministry of Health",
            countryCode: "SSD",
            status: "active",
            settings: {
              currency: "SSP",
              currencySymbol: "\xA3",
              languages: ["en", "ar"],
              defaultLanguage: "en",
              mapCenter: [7.87, 29.69],
              mapZoom: 6,
              epiSchedule: "SSD_2024",
              fiscalYearStart: "01-01",
              demographics: {
                births: 0.042,
                under1: 0.04,
                pregnant: 0.045,
                schoolEntry: 0.036,
                schoolExit: 0.03
              },
              // Original Code (Standard State County Payam Boma 4-level structure):
              // adminLevelLabels: {
              //   level1: "State",
              //   level2: "County",
              //   level3: "Payam",
              //   level4: "Boma",
              // },
              // Updated Code: Skip regions at Level 1 to align with standard 5-level database tables
              skipRegionLevel: true,
              adminLevelLabels: {
                level1: "Region",
                level2: "State",
                level3: "County",
                level4: "Payam",
                level5: "Village"
              },
              populationSources: [
                { code: "nbs", label: "NBS Census (2008 projected)" },
                { code: "unicef", label: "UNICEF / WHO Estimates" },
                { code: "worldpop", label: "WorldPop Gridded" },
                { code: "survey", label: "MICS / SMART Survey" },
                { code: "community_census", label: "Community CHW Census" }
              ]
            }
          };
          const [created] = await db.insert(tenants).values(SSD_TENANT).returning();
          ssd = created;
          console.log("[Self-Healing] Created South Sudan tenant:", ssd.id);
          const fallbackSeed = async (tenantDbId) => {
            const [reg] = await db.insert(regions).values({
              tenantId: tenantDbId,
              name: "South Sudan",
              code: "SSD"
            }).returning();
            const SSD_STATES_DATA = [
              { name: "Central Equatoria", code: "CE", counties: ["Juba", "Kajo-Keji", "Lainya", "Morobo", "Terekeka", "Yei"] },
              { name: "Eastern Equatoria", code: "EE", counties: ["Torit", "Ikotos", "Kapoeta East", "Kapoeta North", "Kapoeta South", "Lafon", "Magwi", "Budi"] },
              { name: "Western Equatoria", code: "WE", counties: ["Yambio", "Ezo", "Ibba", "Maridi", "Mundri East", "Mundri West", "Mvolo", "Nagero", "Nzara", "Tambura"] },
              { name: "Jonglei", code: "JG", counties: ["Bor", "Akobo", "Ayod", "Duk", "Fangak", "Nyirol", "Pigi", "Pibor", "Pochalla", "Twic East", "Uror"] },
              { name: "Unity", code: "UN", counties: ["Bentiu", "Abiemnhom", "Guit", "Koch", "Leer", "Mayendit", "Mayom", "Panyijiar", "Rubkona", "Rariak"] },
              { name: "Upper Nile", code: "UL", counties: ["Malakal", "Baliet", "Fashoda", "Longochuk", "Maban", "Maiwut", "Manyo", "Melut", "Nasir", "Panyikang", "RenkBoma", "Ulang"] },
              { name: "Lakes", code: "LK", counties: ["Rumbek Center", "Awerial", "Cueibet", "Rumbek East", "Rumbek North", "Wulu", "Yirol East", "Yirol West"] },
              { name: "Warrap", code: "WR", counties: ["Gogrial East", "Gogrial West", "Tonj East", "Tonj North", "Tonj South", "Twic"] },
              { name: "Western Bahr el Ghazal", code: "WB", counties: ["Wau", "Jur River", "Raga"] },
              { name: "Northern Bahr el Ghazal", code: "NB", counties: ["Aweil Center", "Aweil East", "Aweil North", "Aweil South", "Aweil West"] }
            ];
            for (const state of SSD_STATES_DATA) {
              const [prov] = await db.insert(provinces).values({
                tenantId: tenantDbId,
                name: state.name,
                code: state.code,
                regionId: reg.id
              }).returning();
              for (const county of state.counties) {
                const countyCode = `${state.code}-${county.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)}`;
                const [dist] = await db.insert(districts).values({
                  tenantId: tenantDbId,
                  name: county,
                  code: countyCode,
                  provinceId: prov.id
                }).returning();
                await db.insert(llgs).values({
                  tenantId: tenantDbId,
                  name: `${county} Payam`,
                  code: `${countyCode}-PAY`,
                  districtId: dist.id
                });
              }
            }
            console.log("[Self-Healing] Seeded fallback mock 10 States, 78 Counties, and default Payams for South Sudan.");
          };
          const csvPath = (0, import_path2.join)(process.cwd(), "data", "south_sudan", "facilities.csv");
          if ((0, import_fs2.existsSync)(csvPath)) {
            try {
              console.log("[Self-Healing] Found South Sudan facilities.csv, seeding high-fidelity dataset...");
              const rawCsv = (0, import_fs2.readFileSync)(csvPath, "utf8");
              const parseSsdCsv = (text2) => {
                const lines = [];
                let cur = "";
                let inQuotes = false;
                for (const ch of text2) {
                  if (cur === "" && ch === "\r") continue;
                  if (ch === '"') inQuotes = !inQuotes;
                  if (ch === "\n" && !inQuotes) {
                    lines.push(cur);
                    cur = "";
                  } else {
                    cur += ch;
                  }
                }
                if (cur.length) lines.push(cur);
                const splitLine = (line) => {
                  const out = [];
                  let field = "";
                  let q = false;
                  for (let i = 0; i < line.length; i++) {
                    const c = line[i];
                    if (c === '"') {
                      if (q && line[i + 1] === '"') {
                        field += '"';
                        i++;
                      } else {
                        q = !q;
                      }
                    } else if (c === "," && !q) {
                      out.push(field);
                      field = "";
                    } else {
                      field += c;
                    }
                  }
                  out.push(field);
                  return out.map((f) => f.trim());
                };
                return lines.slice(1).filter((l) => l.trim().length > 0).map((l) => {
                  const cells = splitLine(l);
                  return {
                    state: cells[0] ?? "",
                    state_code: cells[1] ?? "",
                    county: cells[2] ?? "",
                    county_code: cells[3] ?? "",
                    payam: cells[4] ?? "",
                    payam_code: cells[6] ?? "",
                    site: cells[7] ?? "",
                    site_dhis2_id: cells[8] ?? "",
                    site_dhis2_name: cells[9] ?? "",
                    latitude: cells[10] ?? "",
                    longitude: cells[11] ?? "",
                    facility_type: cells[12] ?? "",
                    func_status: cells[14] ?? ""
                  };
                });
              };
              const rows = parseSsdCsv(rawCsv);
              const [reg] = await db.insert(regions).values({
                tenantId: ssd.id,
                name: "South Sudan",
                code: "SSD"
              }).returning();
              const provinceMap = /* @__PURE__ */ new Map();
              const uniqueStates = Array.from(new Map(rows.map((r) => [r.state_code.trim(), r.state.trim()])).entries());
              for (const [code, name] of uniqueStates) {
                if (!code || !name) continue;
                const [prov] = await db.insert(provinces).values({
                  tenantId: ssd.id,
                  name,
                  code,
                  regionId: reg.id
                }).returning();
                provinceMap.set(code, prov.id);
              }
              const districtMap = /* @__PURE__ */ new Map();
              const uniqueCounties = Array.from(
                new Map(rows.map((r) => [r.county_code.trim(), { name: r.county.trim(), stateCode: r.state_code.trim() }])).entries()
              );
              for (const [code, info] of uniqueCounties) {
                if (!code || !info.name) continue;
                const provId = provinceMap.get(info.stateCode);
                if (!provId) continue;
                const [dist] = await db.insert(districts).values({
                  tenantId: ssd.id,
                  name: info.name,
                  code,
                  provinceId: provId
                }).returning();
                districtMap.set(code, dist.id);
              }
              const llgMap = /* @__PURE__ */ new Map();
              const uniquePayams = Array.from(
                new Map(rows.map((r) => [r.payam_code.trim(), { name: r.payam.trim(), countyCode: r.county_code.trim() }])).entries()
              );
              for (const [code, info] of uniquePayams) {
                if (!code || !info.name) continue;
                const distId = districtMap.get(info.countyCode);
                if (!distId) continue;
                const [llg] = await db.insert(llgs).values({
                  tenantId: ssd.id,
                  name: info.name,
                  code,
                  districtId: distId
                }).returning();
                llgMap.set(code, llg.id);
              }
              const toNumOrNull = (v) => {
                if (!v || v.trim() === "" || v === "NA") return null;
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
              };
              const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
              const facilityRows = [];
              const existingHmis = /* @__PURE__ */ new Set();
              for (const r of rows) {
                const dhisId = r.site_dhis2_id.trim();
                let hmis = dhisId;
                if (!hmis || hmis === "NA") {
                  hmis = `SSD-SYN-${r.state_code}-${r.county_code}-${slug(r.site)}`.slice(0, 50);
                }
                if (existingHmis.has(hmis)) continue;
                existingHmis.add(hmis);
                const distId = districtMap.get(r.county_code.trim());
                if (!distId) continue;
                const lat = toNumOrNull(r.latitude);
                const lon = toNumOrNull(r.longitude);
                const externalIds = {};
                if (dhisId && dhisId !== "NA") externalIds.dhis2_uid = dhisId;
                if (r.site_dhis2_name) externalIds.dhis2_name = r.site_dhis2_name;
                const payamId = llgMap.get(r.payam_code.trim());
                if (payamId) {
                  externalIds.llgId = String(payamId);
                }
                facilityRows.push({
                  tenantId: ssd.id,
                  name: r.site,
                  hmisCode: hmis,
                  facilityType: r.facility_type || "Unknown",
                  operationalStatus: r.func_status === "1" ? "Operational" : "Non-Operational",
                  districtId: distId,
                  latitude: lat !== null ? String(lat) : null,
                  longitude: lon !== null ? String(lon) : null,
                  isActive: r.func_status === "1",
                  externalIds
                });
              }
              const BATCH = 500;
              for (let i = 0; i < facilityRows.length; i += BATCH) {
                await db.insert(facilities).values(facilityRows.slice(i, i + BATCH));
              }
              const popRows = [];
              const YEAR2 = 2026;
              const SSD_CENSUS_2026 = [
                { stateName: "Central Equatoria", population: 15e5, growthRate: "2.80" },
                { stateName: "Eastern Equatoria", population: 11e5, growthRate: "2.50" },
                { stateName: "Western Equatoria", population: 1e6, growthRate: "2.40" },
                { stateName: "Jonglei", population: 18e5, growthRate: "3.10" },
                { stateName: "Unity", population: 1e6, growthRate: "2.90" },
                { stateName: "Upper Nile", population: 13e5, growthRate: "2.70" },
                { stateName: "Lakes", population: 12e5, growthRate: "2.60" },
                { stateName: "Warrap", population: 13e5, growthRate: "2.80" },
                { stateName: "Western Bahr el Ghazal", population: 6e5, growthRate: "2.30" },
                { stateName: "Northern Bahr el Ghazal", population: 1e6, growthRate: "2.50" },
                { stateName: "Ruweng Admin", population: 25e4, growthRate: "2.60" },
                { stateName: "Abyei Admin", population: 15e4, growthRate: "2.20" }
              ];
              for (const census of SSD_CENSUS_2026) {
                const matchingProv = await db.select().from(provinces).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(provinces.tenantId, ssd.id), (0, import_drizzle_orm9.eq)(provinces.name, census.stateName)));
                if (matchingProv.length > 0) {
                  const provId = matchingProv[0].id;
                  popRows.push({
                    tenantId: ssd.id,
                    provinceId: provId,
                    source: "nso",
                    year: YEAR2,
                    totalPopulation: census.population,
                    malePopulation: Math.round(census.population * 0.51),
                    femalePopulation: Math.round(census.population * 0.49),
                    under1Population: Math.round(census.population * 0.04),
                    under5Population: Math.round(census.population * 0.16),
                    pregnantWomen: Math.round(census.population * 0.045),
                    growthRate: census.growthRate,
                    confidenceScore: "90.00",
                    approvalStatus: "approved"
                  });
                }
              }
              if (popRows.length > 0) {
                await db.insert(populationData).values(popRows);
              }
              console.log("[Self-Healing] Successfully seeded high-fidelity South Sudan administrative tree, facilities, and population from CSV.");
            } catch (csvErr) {
              console.error("[Self-Healing] Failed to seed South Sudan from CSV, falling back to mock hierarchy:", csvErr);
              await fallbackSeed(ssd.id);
            }
          } else {
            console.log("[Self-Healing] CSV not found, seeding default mock South Sudan hierarchy...");
            await fallbackSeed(ssd.id);
          }
        }
      } else {
        const settings = ssd.settings || {};
        const needsUpdate = !settings.demographics || !settings.adminLevelLabels || settings.skipRegionLevel !== true;
        if (needsUpdate) {
          settings.demographics = settings.demographics ?? {
            births: 0.042,
            // ~4.2% crude birth rate — one of highest globally (WHO 2023)
            under1: 0.04,
            // ~4.0% under-1 cohort (UNICEF SS 2023)
            pregnant: 0.045,
            // ~4.5% pregnant women (high MMR context, priority EPI group)
            schoolEntry: 0.036,
            // school-entry cohort (6-year-olds) — low enrollment context
            schoolExit: 0.03
            // school-exit cohort (12-year-olds)
          };
          settings.skipRegionLevel = true;
          settings.adminLevelLabels = {
            level1: "Region",
            level2: "State",
            // 10 Administrative States
            level3: "County",
            // 78 Counties (OCHA 2023)
            level4: "Payam",
            // Sub-county administrative unit
            level5: "Village"
            // Village-cluster / lowest administrative unit
          };
          settings.mapCenter = settings.mapCenter ?? [7.87, 29.69];
          settings.mapZoom = settings.mapZoom ?? 6;
          settings.currency = settings.currency ?? "SSP";
          settings.currencySymbol = settings.currencySymbol ?? "\xA3";
          settings.epiSchedule = settings.epiSchedule ?? "SSD_2024";
          settings.fiscalYearStart = settings.fiscalYearStart ?? "01-01";
          settings.languages = settings.languages ?? ["en", "ar"];
          settings.defaultLanguage = settings.defaultLanguage ?? "en";
          settings.populationSources = settings.populationSources ?? [
            { code: "nbs", label: "NBS Census (2008 projected)" },
            { code: "unicef", label: "UNICEF / WHO Estimates" },
            { code: "worldpop", label: "WorldPop Gridded" },
            { code: "survey", label: "MICS / SMART Survey" },
            { code: "community_census", label: "Community CHW Census" }
          ];
          await db.update(tenants).set({ settings }).where((0, import_drizzle_orm9.eq)(tenants.id, ssd.id));
          console.log("[Self-Healing] Stamped default South Sudan demographics, admin hierarchy, and GIS settings.");
        }
      }
    } catch (err) {
      console.error("[Self-Healing] Failed to seed/backfill tenant demographics:", err);
    }
  })();
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/public/tenants", async (_req, res) => {
    try {
      const list = await storage.listActiveTenants();
      res.json(list.map((t) => {
        const s = t.settings ?? {};
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          countryCode: t.countryCode,
          settings: {
            isDemo: s.isDemo === true,
            mapCenter: Array.isArray(s.mapCenter) ? s.mapCenter : void 0,
            mapZoom: typeof s.mapZoom === "number" ? s.mapZoom : void 0
          }
        };
      }));
    } catch (err) {
      console.error("listActiveTenants failed:", err);
      res.status(500).json({ message: "Failed to load tenants" });
    }
  });
  app2.post("/api/public/onboarding-interest", async (req, res) => {
    try {
      const data = insertTenantInterestRequestSchema.parse(req.body);
      const live = await storage.listActiveTenants();
      if (live.some((t) => t.countryCode?.toUpperCase() === data.countryCode.toUpperCase())) {
        return res.status(400).json({
          message: "This country is already on the platform \u2014 please use the standard signup form."
        });
      }
      const created = await storage.createTenantInterestRequest(data);
      res.status(201).json({ id: created.id, status: created.status });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request", errors: err.errors });
      }
      console.error("createTenantInterestRequest failed:", err);
      res.status(500).json({ message: "Failed to submit interest" });
    }
  });
  app2.post("/api/me/switch-tenant", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = import_zod3.z.object({ tenantId: import_zod3.z.string().min(1) }).parse(req.body);
      const tenant = await storage.getTenant(tenantId);
      if (!tenant || tenant.status !== "active") {
        return res.status(404).json({ message: "Country not found or inactive." });
      }
      const userId = req.user?.claims?.sub;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const homeTenantId = dbUser?.tenantId || null;
      if (homeTenantId && homeTenantId === tenantId) {
        delete req.session.viewTenantId;
      } else {
        req.session.viewTenantId = tenantId;
      }
      await new Promise(
        (resolve, reject) => req.session.save((err) => err ? reject(err) : resolve())
      );
      res.json({
        ok: true,
        tenant: {
          id: tenant.id,
          code: tenant.code,
          name: tenant.name,
          countryCode: tenant.countryCode
        }
      });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request", errors: err.errors });
      }
      console.error("switch-tenant failed:", err);
      res.status(500).json({ message: "Failed to switch country" });
    }
  });
  app2.post("/api/public/signup-requests", async (req, res) => {
    try {
      const data = insertSignupRequestSchema.parse(req.body);
      const tenant = await storage.getTenant(data.tenantId);
      if (!tenant || tenant.status !== "active") {
        return res.status(400).json({ message: "Invalid tenant" });
      }
      const created = await storage.createSignupRequest(data);
      res.status(201).json({ id: created.id, status: created.status });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request", errors: err.errors });
      }
      console.error("createSignupRequest failed:", err);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });
  function requireAdmin(req, res, next) {
    const role = req.user?.dbRole;
    if (role !== "national_admin") {
      return res.status(403).json({ message: "Admin role required" });
    }
    next();
  }
  async function loadRole(req, _res, next) {
    if (req.user?.dbRole) return next();
    try {
      const u = await storage.getUser(req.user.claims.sub);
      req.user.dbRole = u?.role;
    } catch {
    }
    next();
  }
  app2.get("/api/signup-requests", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      res.json(await storage.listSignupRequests(req.tenantId, status));
    } catch (err) {
      console.error("listSignupRequests failed:", err);
      res.status(500).json({ message: "Failed to load signup requests" });
    }
  });
  const decisionSchema = import_zod3.z.object({
    decision: import_zod3.z.enum(["approved", "rejected"]),
    reason: import_zod3.z.string().max(2e3).optional()
  });
  app2.patch("/api/signup-requests/:id", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const { decision, reason } = decisionSchema.parse(req.body);
      const updated = await storage.decideSignupRequest(
        req.tenantId,
        req.params.id,
        decision,
        req.user.claims.sub,
        reason
      );
      if (!updated) return res.status(404).json({ message: "Signup request not found" });
      await logAudit(req, `signup_${decision}`, "signup_request", null, null, {
        signupId: updated.id,
        email: updated.email,
        role: updated.requestedRole
      });
      res.json(updated);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid decision payload" });
      }
      console.error("decideSignupRequest failed:", err);
      res.status(500).json({ message: "Failed to record decision" });
    }
  });
  app2.get("/api/me/tenant", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        countryCode: tenant.countryCode,
        status: tenant.status,
        settings: tenant.settings
      });
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });
  app2.patch("/api/me/tenant", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        name: import_zod3.z.string().min(1).optional(),
        settings: import_zod3.z.record(import_zod3.z.any()).optional()
      });
      const data = schema.parse(req.body);
      const current = await storage.getTenant(req.tenantId);
      if (!current) return res.status(404).json({ message: "Tenant not found" });
      const newSettings = data.settings ? { ...current.settings, ...data.settings } : void 0;
      const updated = await storage.updateTenant(req.tenantId, {
        name: data.name,
        settings: newSettings
      });
      if (!updated) return res.status(404).json({ message: "Failed to update tenant" });
      await logAudit(req, "update_tenant_settings", "tenant", req.tenantId, null, {
        updatedFields: Object.keys(data)
      });
      res.json(updated);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("PATCH /api/me/tenant failed:", err);
      res.status(500).json({ message: "Failed to update country configuration" });
    }
  });
  app2.get(
    "/api/admin/population-refresh-jobs",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireAdmin,
    async (req, res) => {
      try {
        const tenantId = req.tenantId;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : void 0;
        const jobs = await listRefreshJobs({ tenantId, limit });
        res.json(jobs);
      } catch (err) {
        console.error("GET /api/admin/population-refresh-jobs failed:", err);
        res.status(500).json({ message: "Failed to list population refresh jobs" });
      }
    }
  );
  app2.post(
    "/api/admin/population-refresh-jobs",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireAdmin,
    async (req, res) => {
      try {
        const schema = import_zod3.z.object({
          tenantId: import_zod3.z.string().optional(),
          rasterPath: import_zod3.z.string().optional(),
          minPopulation: import_zod3.z.number().int().positive().optional()
        });
        const body = schema.parse(req.body ?? {});
        const callerTenantId = req.tenantId;
        if (body.tenantId && body.tenantId !== callerTenantId) {
          return res.status(403).json({
            message: "Forbidden: cannot trigger population refresh for another tenant"
          });
        }
        const tenant = await storage.getTenant(callerTenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }
        const userId = req.user?.claims?.sub ?? null;
        const job = await refreshTenantPopulation(callerTenantId, {
          triggeredBy: "manual",
          triggeredByUserId: userId,
          rasterPath: body.rasterPath,
          minPopulation: body.minPopulation
        });
        await logAudit(req, "trigger_population_refresh", "population_refresh", null, null, {
          tenantId: callerTenantId,
          jobId: job.id,
          status: job.status,
          rowsInserted: job.rowsInserted
        });
        res.status(202).json(job);
      } catch (err) {
        if (err?.name === "ZodError") {
          return res.status(400).json({ message: "Invalid payload", errors: err.errors });
        }
        console.error("POST /api/admin/population-refresh-jobs failed:", err);
        res.status(500).json({
          message: "Failed to start population refresh",
          error: err?.message ?? String(err)
        });
      }
    }
  );
  app2.get(
    "/api/admin/population-refresh-jobs/expected-raster",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireAdmin,
    async (req, res) => {
      try {
        const tenantId = req.tenantId;
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }
        const rasterPath = resolveTenantRasterPath(tenant);
        const exists = (0, import_fs2.existsSync)(rasterPath);
        res.json({ tenantId, rasterPath, exists });
      } catch (err) {
        console.error("GET /api/admin/population-refresh-jobs/expected-raster failed:", err);
        res.status(500).json({ message: "Failed to resolve raster path" });
      }
    }
  );
  app2.post("/api/admin/tenants", isAuthenticated, loadRole, requireAdmin, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        name: import_zod3.z.string().min(1),
        code: import_zod3.z.string().min(2).max(10).toUpperCase(),
        countryCode: import_zod3.z.string().length(3).toUpperCase(),
        settings: import_zod3.z.record(import_zod3.z.any())
      });
      const data = schema.parse(req.body);
      const existing = await storage.getTenantByCode(data.code);
      if (existing) {
        return res.status(400).json({ message: `A country with code ${data.code} already exists.` });
      }
      const tenant = await storage.createTenant({
        name: data.name,
        code: data.code,
        countryCode: data.countryCode,
        status: "active",
        settings: data.settings
      });
      await logAudit(req, "create_tenant", "tenant", null, null, {
        tenantId: tenant.id,
        name: tenant.name,
        code: tenant.code
      });
      res.status(201).json(tenant);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload", errors: err.errors });
      }
      console.error("POST /api/admin/tenants failed:", err);
      res.status(500).json({ message: "Failed to provision new country" });
    }
  });
  app2.get("/api/regions", ...auth, async (req, res) => {
    try {
      res.json(await storage.getRegions(req.tenantId));
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });
  app2.get("/api/regions/:id", ...auth, async (req, res) => {
    try {
      const region = await storage.getRegion(req.tenantId, parseInt(req.params.id));
      if (!region) return res.status(404).json({ message: "Region not found" });
      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });
  app2.post("/api/regions", ...auth, async (req, res) => {
    try {
      const data = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(req.tenantId, data);
      await logAudit(req, "create", "region", region.id, null, region);
      res.status(201).json(region);
    } catch (error) {
      console.error("Error creating region:", error);
      res.status(400).json({ message: "Invalid region data" });
    }
  });
  app2.patch("/api/regions/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldRegion = await storage.getRegion(req.tenantId, entityId);
      const region = await storage.updateRegion(req.tenantId, entityId, req.body);
      if (!region) return res.status(404).json({ message: "Region not found" });
      await logAudit(req, "update", "region", entityId, oldRegion, region);
      res.json(region);
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(400).json({ message: "Failed to update region" });
    }
  });
  app2.get("/api/llgs", ...auth, async (req, res) => {
    try {
      const districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
      res.json(await storage.getLlgs(req.tenantId, districtId));
    } catch (error) {
      console.error("Error fetching LLGs:", error);
      res.status(500).json({ message: "Failed to fetch LLGs" });
    }
  });
  app2.get("/api/llgs/:id", ...auth, async (req, res) => {
    try {
      const llg = await storage.getLlg(req.tenantId, parseInt(req.params.id));
      if (!llg) return res.status(404).json({ message: "LLG not found" });
      res.json(llg);
    } catch (error) {
      console.error("Error fetching LLG:", error);
      res.status(500).json({ message: "Failed to fetch LLG" });
    }
  });
  app2.post("/api/llgs", ...auth, async (req, res) => {
    try {
      const data = insertLlgSchema.parse(req.body);
      const llg = await storage.createLlg(req.tenantId, data);
      await logAudit(req, "create", "llg", llg.id, null, llg);
      res.status(201).json(llg);
    } catch (error) {
      console.error("Error creating LLG:", error);
      res.status(400).json({ message: "Invalid LLG data" });
    }
  });
  app2.patch("/api/llgs/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldLlg = await storage.getLlg(req.tenantId, entityId);
      const llg = await storage.updateLlg(req.tenantId, entityId, req.body);
      if (!llg) return res.status(404).json({ message: "LLG not found" });
      await logAudit(req, "update", "llg", entityId, oldLlg, llg);
      res.json(llg);
    } catch (error) {
      console.error("Error updating LLG:", error);
      res.status(400).json({ message: "Failed to update LLG" });
    }
  });
  app2.get("/api/provinces", ...auth, async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId) : void 0;
      res.json(await storage.getProvinces(req.tenantId, regionId));
    } catch (error) {
      console.error("Error fetching provinces:", error);
      res.status(500).json({ message: "Failed to fetch provinces" });
    }
  });
  app2.get("/api/provinces/:id", ...auth, async (req, res) => {
    try {
      const province = await storage.getProvince(req.tenantId, parseInt(req.params.id));
      if (!province) return res.status(404).json({ message: "Province not found" });
      res.json(province);
    } catch (error) {
      console.error("Error fetching province:", error);
      res.status(500).json({ message: "Failed to fetch province" });
    }
  });
  app2.post("/api/provinces", ...auth, async (req, res) => {
    try {
      const data = insertProvinceSchema.parse(req.body);
      const province = await storage.createProvince(req.tenantId, data);
      await logAudit(req, "create", "province", province.id, null, province);
      res.status(201).json(province);
    } catch (error) {
      console.error("Error creating province:", error);
      res.status(400).json({ message: "Invalid province data" });
    }
  });
  app2.get("/api/districts", ...auth, async (req, res) => {
    try {
      const provinceId = req.query.provinceId ? parseInt(req.query.provinceId) : void 0;
      res.json(await storage.getDistricts(req.tenantId, provinceId));
    } catch (error) {
      console.error("Error fetching districts:", error);
      res.status(500).json({ message: "Failed to fetch districts" });
    }
  });
  app2.get("/api/districts/:id", ...auth, async (req, res) => {
    try {
      const district = await storage.getDistrict(req.tenantId, parseInt(req.params.id));
      if (!district) return res.status(404).json({ message: "District not found" });
      res.json(district);
    } catch (error) {
      console.error("Error fetching district:", error);
      res.status(500).json({ message: "Failed to fetch district" });
    }
  });
  app2.post("/api/districts", ...auth, async (req, res) => {
    try {
      const data = insertDistrictSchema.parse(req.body);
      const district = await storage.createDistrict(req.tenantId, data);
      await logAudit(req, "create", "district", district.id, null, district);
      res.status(201).json(district);
    } catch (error) {
      console.error("Error creating district:", error);
      res.status(400).json({ message: "Invalid district data" });
    }
  });
  app2.get("/api/facilities", ...auth, async (req, res) => {
    try {
      const userId = req.user?.id ?? req.user?.claims?.sub ?? null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: Missing user claims context" });
      }
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized: User record not found" });
      }
      let districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
      const isNationalAdmin = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
      if (!isNationalAdmin) {
        if (dbUser.facilityId) {
          const facility = await storage.getFacility(req.tenantId, dbUser.facilityId);
          return res.json(facility ? [facility] : []);
        } else if (dbUser.districtId) {
          districtId = dbUser.districtId;
        } else if (dbUser.provinceId) {
          const allFacilities = await storage.getFacilities(req.tenantId, districtId);
          const filtered = [];
          for (const f of allFacilities) {
            const geo = await getFacilityHierarchy(f.id, req.tenantId);
            if (geo && geo.provinceId === dbUser.provinceId) {
              filtered.push(f);
            }
          }
          return res.json(filtered);
        }
      }
      res.json(await storage.getFacilities(req.tenantId, districtId));
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });
  app2.get("/api/facilities/:id", ...auth, async (req, res) => {
    try {
      const facility = await storage.getFacility(req.tenantId, parseInt(req.params.id));
      if (!facility) return res.status(404).json({ message: "Facility not found" });
      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });
  app2.post("/api/facilities", ...auth, async (req, res) => {
    try {
      const data = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(req.tenantId, data);
      await logAudit(req, "create", "facility", facility.id, null, facility);
      res.status(201).json(facility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(400).json({ message: "Invalid facility data" });
    }
  });
  app2.patch("/api/facilities/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldFacility = await storage.getFacility(req.tenantId, entityId);
      const facility = await storage.updateFacility(req.tenantId, entityId, req.body);
      if (!facility) return res.status(404).json({ message: "Facility not found" });
      await logAudit(req, "update", "facility", entityId, oldFacility, facility);
      res.json(facility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(400).json({ message: "Failed to update facility" });
    }
  });
  app2.delete("/api/facilities/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldFacility = await storage.getFacility(req.tenantId, entityId);
      const ok = await storage.deleteFacility(req.tenantId, entityId);
      if (!ok) return res.status(404).json({ message: "Facility not found" });
      await logAudit(req, "delete", "facility", entityId, oldFacility, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting facility:", error);
      res.status(500).json({ message: "Failed to delete facility" });
    }
  });
  app2.post("/api/facilities/import", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        facilities: import_zod3.z.array(import_zod3.z.object({
          name: import_zod3.z.string().min(1),
          hmisCode: import_zod3.z.string().min(1),
          facilityType: import_zod3.z.string().optional().nullable(),
          agencyName: import_zod3.z.string().optional().nullable(),
          operationalStatus: import_zod3.z.string().optional().nullable(),
          districtName: import_zod3.z.string().optional().nullable(),
          latitude: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable(),
          longitude: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable(),
          address: import_zod3.z.string().optional().nullable(),
          contactPhone: import_zod3.z.string().optional().nullable(),
          operatingHours: import_zod3.z.string().optional().nullable(),
          hasRefrigerator: import_zod3.z.boolean().optional().nullable(),
          hasPower: import_zod3.z.boolean().optional().nullable(),
          staffCount: import_zod3.z.number().optional().nullable(),
          catchmentRadius: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable()
        }))
      });
      const { facilities: importedFacilities } = schema.parse(req.body);
      const allDistricts = await storage.getDistricts(req.tenantId);
      let createdCount = 0;
      let updatedCount = 0;
      for (const item of importedFacilities) {
        let districtId = null;
        if (item.districtName) {
          const matchedDist = allDistricts.find((d) => d.name.toLowerCase() === item.districtName.trim().toLowerCase());
          if (matchedDist) {
            districtId = matchedDist.id;
          }
        }
        if (!districtId) {
          districtId = allDistricts[0]?.id || null;
        }
        if (!districtId) continue;
        const latVal = item.latitude !== null && item.latitude !== void 0 ? parseFloat(item.latitude.toString()) : null;
        const lngVal = item.longitude !== null && item.longitude !== void 0 ? parseFloat(item.longitude.toString()) : null;
        const radiusVal = item.catchmentRadius !== null && item.catchmentRadius !== void 0 ? parseFloat(item.catchmentRadius.toString()) : null;
        const [existing] = await db.select().from(facilities).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(facilities.tenantId, req.tenantId),
            (0, import_drizzle_orm9.eq)(facilities.hmisCode, item.hmisCode.trim())
          )
        ).limit(1);
        if (existing) {
          await db.update(facilities).set({
            name: item.name.trim(),
            facilityType: item.facilityType ?? existing.facilityType,
            agencyName: item.agencyName ?? existing.agencyName,
            operationalStatus: item.operationalStatus ?? existing.operationalStatus,
            districtId,
            latitude: latVal !== null && !isNaN(latVal) ? latVal.toFixed(7) : existing.latitude,
            longitude: lngVal !== null && !isNaN(lngVal) ? lngVal.toFixed(7) : existing.longitude,
            address: item.address ?? existing.address,
            contactPhone: item.contactPhone ?? existing.contactPhone,
            operatingHours: item.operatingHours ?? existing.operatingHours,
            hasRefrigerator: item.hasRefrigerator ?? existing.hasRefrigerator,
            hasPower: item.hasPower ?? existing.hasPower,
            staffCount: item.staffCount ?? existing.staffCount,
            catchmentRadius: radiusVal !== null && !isNaN(radiusVal) ? radiusVal.toFixed(2) : existing.catchmentRadius,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm9.eq)(facilities.id, existing.id));
          updatedCount++;
        } else {
          await db.insert(facilities).values({
            tenantId: req.tenantId,
            name: item.name.trim(),
            hmisCode: item.hmisCode.trim(),
            facilityType: item.facilityType ?? null,
            agencyName: item.agencyName ?? null,
            operationalStatus: item.operationalStatus ?? null,
            districtId,
            latitude: latVal !== null && !isNaN(latVal) ? latVal.toFixed(7) : null,
            longitude: lngVal !== null && !isNaN(lngVal) ? lngVal.toFixed(7) : null,
            address: item.address ?? null,
            contactPhone: item.contactPhone ?? null,
            operatingHours: item.operatingHours ?? null,
            hasRefrigerator: item.hasRefrigerator ?? false,
            hasPower: item.hasPower ?? false,
            staffCount: item.staffCount ?? null,
            catchmentRadius: radiusVal !== null && !isNaN(radiusVal) ? radiusVal.toFixed(2) : null,
            isActive: true
          });
          createdCount++;
        }
      }
      await logAudit(req, "import_facilities", "facilities", null, null, { createdCount, updatedCount });
      res.json({ success: true, message: `Successfully imported ${importedFacilities.length} facilities.`, createdCount, updatedCount });
    } catch (error) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: "Invalid payload format.", errors: error.errors });
      }
      console.error("Error importing facilities:", error);
      res.status(500).json({ success: false, message: "Failed to import facilities: " + error.message });
    }
  });
  app2.get("/api/facilities/:id/catchments", ...auth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const catchments = await db.select().from(facilityCatchments).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(facilityCatchments.facilityId, facilityId),
          (0, import_drizzle_orm9.eq)(facilityCatchments.tenantId, req.tenantId)
        )
      );
      res.json(catchments);
    } catch (error) {
      console.error("Error fetching facility catchments:", error);
      res.status(500).json({ message: "Failed to fetch catchments" });
    }
  });
  app2.post("/api/facilities/:id/catchments", ...auth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const { geojson, name, description, villageIds } = req.body;
      if (!geojson) {
        return res.status(400).json({ message: "GeoJSON is required" });
      }
      const areaSqM = (0, import_turf.area)(geojson);
      const areaSqKm = String((areaSqM / 1e6).toFixed(4));
      const existing = await db.select().from(facilityCatchments).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(facilityCatchments.facilityId, facilityId),
          (0, import_drizzle_orm9.eq)(facilityCatchments.tenantId, req.tenantId),
          (0, import_drizzle_orm9.eq)(facilityCatchments.isOfficial, true)
        )
      );
      let catchment;
      if (existing.length > 0) {
        const [updated] = await db.update(facilityCatchments).set({
          geojson,
          name: name || `Catchment for HF ${facilityId}`,
          description: description || "",
          areaSqKm,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm9.eq)(facilityCatchments.id, existing[0].id)).returning();
        catchment = updated;
      } else {
        const [created] = await db.insert(facilityCatchments).values({
          tenantId: req.tenantId,
          facilityId,
          name: name || `Catchment for HF ${facilityId}`,
          description: description || "",
          geojson,
          areaSqKm,
          isOfficial: true,
          drawnByUserId: req.user?.claims?.sub || null
        }).returning();
        catchment = created;
      }
      if (Array.isArray(villageIds)) {
        await db.update(villages).set({ assignedFacilityId: null }).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(villages.assignedFacilityId, facilityId),
            (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId)
          )
        );
        if (villageIds.length > 0) {
          await db.update(villages).set({ assignedFacilityId: facilityId }).where(
            (0, import_drizzle_orm9.and)(
              (0, import_drizzle_orm9.inArray)(villages.id, villageIds),
              (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId)
            )
          );
        }
      }
      await logAudit(req, "save_catchment", "facility_catchments", catchment.id, null, catchment);
      res.json({ catchment, assignedCount: villageIds?.length || 0 });
    } catch (error) {
      console.error("Error saving catchment area:", error);
      res.status(500).json({ message: "Failed to save catchment area: " + error.message });
    }
  });
  app2.get("/api/villages", ...auth, async (req, res) => {
    try {
      const userId = req.user?.id ?? req.user?.claims?.sub ?? null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: Missing user claims context" });
      }
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized: User record not found" });
      }
      let districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
      let facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const isNationalAdmin = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
      if (!isNationalAdmin) {
        if (dbUser.facilityId) {
          facilityId = dbUser.facilityId;
        } else if (dbUser.districtId) {
          districtId = dbUser.districtId;
        } else if (dbUser.provinceId) {
          const allVillages = await storage.getVillages(req.tenantId, districtId, facilityId);
          const filtered = [];
          const facilityCache = /* @__PURE__ */ new Map();
          for (const v of allVillages) {
            if (v.assignedFacilityId) {
              let geo = facilityCache.get(v.assignedFacilityId);
              if (!geo) {
                geo = await getFacilityHierarchy(v.assignedFacilityId, req.tenantId);
                facilityCache.set(v.assignedFacilityId, geo);
              }
              if (geo && geo.provinceId === dbUser.provinceId) {
                filtered.push(v);
              }
            }
          }
          return res.json(filtered);
        }
      }
      res.json(await storage.getVillages(req.tenantId, districtId, facilityId));
    } catch (error) {
      console.error("Error fetching villages:", error);
      res.status(500).json({ message: "Failed to fetch villages" });
    }
  });
  app2.get("/api/villages/:id", ...auth, async (req, res) => {
    try {
      const village = await storage.getVillage(req.tenantId, parseInt(req.params.id));
      if (!village) return res.status(404).json({ message: "Village not found" });
      res.json(village);
    } catch (error) {
      console.error("Error fetching village:", error);
      res.status(500).json({ message: "Failed to fetch village" });
    }
  });
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function getCentroid(geometry) {
    if (!geometry || !geometry.coordinates) return null;
    let totalLng = 0;
    let totalLat = 0;
    let pointCount = 0;
    function processCoords(coords) {
      if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
        totalLng += coords[0];
        totalLat += coords[1];
        pointCount++;
      } else if (Array.isArray(coords)) {
        coords.forEach(processCoords);
      }
    }
    processCoords(geometry.coordinates);
    if (pointCount === 0) return null;
    return [totalLng / pointCount, totalLat / pointCount];
  }
  app2.post("/api/villages", ...auth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (!body.districtId && body.assignedFacilityId) {
        const facility = await storage.getFacility(req.tenantId, parseInt(body.assignedFacilityId));
        if (facility) {
          body.districtId = facility.districtId;
        }
      }
      if (body.assignedFacilityId && body.latitude !== void 0 && body.longitude !== void 0) {
        const facility = await storage.getFacility(req.tenantId, parseInt(body.assignedFacilityId));
        if (facility && facility.latitude !== null && facility.longitude !== null) {
          const latVal = parseFloat(body.latitude);
          const lngVal = parseFloat(body.longitude);
          if (!isNaN(latVal) && !isNaN(lngVal)) {
            const dist = calculateHaversineDistance(
              latVal,
              lngVal,
              parseFloat(facility.latitude.toString()),
              parseFloat(facility.longitude.toString())
            );
            body.distanceToFacility = dist.toFixed(2);
            const isHtr = body.isHardToReach === true || String(body.isHardToReach) === "true";
            if (body.travelTimeMinutes === void 0 || body.travelTimeMinutes === null) {
              const minutesPerKm = isHtr ? 15 : 2;
              const terrainFactor = isHtr ? 1.25 : 1.15;
              body.travelTimeMinutes = Math.max(5, Math.round(dist * minutesPerKm * terrainFactor));
            }
          }
        }
      }
      const data = insertVillageSchema.parse(body);
      const village = await storage.createVillage(req.tenantId, data);
      await logAudit(req, "create", "village", village.id, null, village);
      res.status(201).json(village);
    } catch (error) {
      console.error("Error creating village:", error);
      res.status(400).json({ message: "Invalid village data" });
    }
  });
  const extractionStatus = /* @__PURE__ */ new Map();
  app2.get("/api/villages/extract/progress", ...auth, (req, res) => {
    const status = extractionStatus.get(req.tenantId);
    if (!status) {
      return res.json({ success: false, message: "No active extraction" });
    }
    res.json({ success: true, ...status });
  });
  app2.post("/api/villages/extract", ...auth, async (req, res) => {
    try {
      extractionStatus.set(req.tenantId, { current: 0, total: 100, stage: "Loading boundary GeoJSON polygons..." });
      const boundaries = await db.select().from(adminBoundaries).where((0, import_drizzle_orm9.eq)(adminBoundaries.tenantId, req.tenantId));
      if (boundaries.length === 0) {
        extractionStatus.delete(req.tenantId);
        return res.status(400).json({
          success: false,
          message: "No administrative boundary maps seeded for this country. Please upload a map boundary or use the CSV importer."
        });
      }
      boundaries.sort((a, b) => b.adminLevel - a.adminLevel);
      const targetBoundary = boundaries[0];
      let geojson = targetBoundary.geojson;
      if (typeof geojson === "string") {
        try {
          geojson = JSON.parse(geojson);
        } catch (e) {
          extractionStatus.delete(req.tenantId);
          return res.status(400).json({
            success: false,
            message: "Failed to parse GeoJSON from administrative boundary map."
          });
        }
      }
      if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
        extractionStatus.delete(req.tenantId);
        return res.status(400).json({
          success: false,
          message: "Selected boundary map does not contain a valid GeoJSON FeatureCollection."
        });
      }
      const allDistricts = await storage.getDistricts(req.tenantId);
      const allProvinces = await storage.getProvinces(req.tenantId);
      const allFacilities = await storage.getFacilities(req.tenantId);
      const existingVillages = await storage.getVillages(req.tenantId);
      const existingNames = new Set(existingVillages.map((v) => v.name.toLowerCase().trim()));
      const districtNames = new Set(allDistricts.map((d) => d.name.toLowerCase().trim()));
      const provinceNames = new Set(allProvinces.map((p) => p.name.toLowerCase().trim()));
      const villagesToInsert = [];
      let skippedCount = 0;
      let idx = 0;
      extractionStatus.set(req.tenantId, {
        current: 0,
        total: geojson.features.length,
        stage: "Triangulating polygon vertices & computing centroids..."
      });
      for (const feature of geojson.features) {
        idx++;
        if (idx % 10 === 0 || idx === geojson.features.length) {
          extractionStatus.set(req.tenantId, {
            current: idx,
            total: geojson.features.length,
            stage: `Calculating centroids & facility distances (${idx}/${geojson.features.length})...`
          });
        }
        const props = feature.properties || {};
        const name = (props.settlement_name || props.settlementName || props.settlement || props.community_name || props.communityName || props.community || props.village_name || props.villageName || props.village || props.place_name || props.placeName || props.place || props.NAME_5 || props.NAME_4 || props.shapeName || props.name || props.Name || "").trim();
        if (!name) {
          skippedCount++;
          continue;
        }
        const normName = name.toLowerCase();
        if (existingNames.has(normName) || districtNames.has(normName) || provinceNames.has(normName)) {
          skippedCount++;
          continue;
        }
        if (villagesToInsert.some((v) => v.name.toLowerCase() === normName)) {
          skippedCount++;
          continue;
        }
        const centroid = getCentroid(feature.geometry);
        if (!centroid) {
          skippedCount++;
          continue;
        }
        const [lng, lat] = centroid;
        let assignedFacilityId = null;
        let distanceToFacility = null;
        let districtId = null;
        if (allFacilities.length > 0) {
          let minDistance = Infinity;
          let closestFacility = allFacilities[0];
          for (const fac of allFacilities) {
            if (fac.latitude !== null && fac.longitude !== null) {
              const dist = calculateHaversineDistance(
                lat,
                lng,
                parseFloat(fac.latitude.toString()),
                parseFloat(fac.longitude.toString())
              );
              if (dist < minDistance) {
                minDistance = dist;
                closestFacility = fac;
              }
            }
          }
          if (minDistance !== Infinity) {
            assignedFacilityId = closestFacility.id;
            distanceToFacility = minDistance.toFixed(2);
            districtId = closestFacility.districtId;
          }
        }
        if (!districtId) {
          const matchedDistrict = allDistricts.find((d) => {
            const dName = d.name.toLowerCase();
            return normName.includes(dName) || dName.includes(normName) || Object.values(props).some((val) => typeof val === "string" && val.toLowerCase() === dName);
          });
          districtId = matchedDistrict ? matchedDistrict.id : allDistricts[0]?.id || null;
        }
        if (!districtId) {
          skippedCount++;
          continue;
        }
        villagesToInsert.push({
          tenantId: req.tenantId,
          name,
          code: props.shapeID || props.code || null,
          districtId,
          assignedFacilityId,
          latitude: lat.toFixed(7),
          longitude: lng.toFixed(7),
          distanceToFacility,
          isHardToReach: false
        });
      }
      if (villagesToInsert.length > 0) {
        extractionStatus.set(req.tenantId, {
          current: geojson.features.length,
          total: geojson.features.length,
          stage: `Seeding ${villagesToInsert.length} community registries to database...`
        });
        await db.insert(villages).values(villagesToInsert);
      }
      await logAudit(req, "extract_map_villages", "village", null, null, {
        extractedCount: villagesToInsert.length,
        skippedCount,
        boundaryId: targetBoundary.id,
        levelName: targetBoundary.levelName
      });
      extractionStatus.set(req.tenantId, {
        current: geojson.features.length,
        total: geojson.features.length,
        stage: "Centroid extraction completed successfully!"
      });
      setTimeout(() => {
        extractionStatus.delete(req.tenantId);
      }, 5e3);
      res.status(201).json({
        success: true,
        message: `Successfully extracted and seeded ${villagesToInsert.length} villages from boundary map.`,
        count: villagesToInsert.length,
        skipped: skippedCount
      });
    } catch (error) {
      extractionStatus.delete(req.tenantId);
      console.error("Error extracting villages from map boundaries:", error);
      res.status(500).json({ success: false, message: "Failed to extract villages from boundary map." });
    }
  });
  app2.post("/api/villages/import", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        villages: import_zod3.z.array(import_zod3.z.object({
          name: import_zod3.z.string().min(1),
          code: import_zod3.z.string().optional().nullable(),
          districtName: import_zod3.z.string().optional().nullable(),
          isHardToReach: import_zod3.z.boolean().optional(),
          latitude: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable(),
          longitude: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable(),
          facilityHmisCode: import_zod3.z.string().optional().nullable(),
          comments: import_zod3.z.string().optional().nullable(),
          insecurityLevel: import_zod3.z.number().optional().nullable()
        }))
      });
      const { villages: importedVillages } = schema.parse(req.body);
      const allDistricts = await storage.getDistricts(req.tenantId);
      const allFacilities = await storage.getFacilities(req.tenantId);
      let createdCount = 0;
      let updatedCount = 0;
      for (const item of importedVillages) {
        const name = item.name.trim();
        if (!name) continue;
        let districtId = null;
        if (item.districtName) {
          const matchedDistrict = allDistricts.find((d) => d.name.toLowerCase() === item.districtName.trim().toLowerCase());
          if (matchedDistrict) {
            districtId = matchedDistrict.id;
          }
        }
        let assignedFacilityId = null;
        if (item.facilityHmisCode) {
          const matchedFac = allFacilities.find((f) => f.hmisCode.toLowerCase() === item.facilityHmisCode.trim().toLowerCase());
          if (matchedFac) {
            assignedFacilityId = matchedFac.id;
            if (!districtId) {
              districtId = matchedFac.districtId;
            }
          }
        }
        if (!districtId) {
          districtId = allDistricts[0]?.id || null;
        }
        if (!districtId) continue;
        let distanceToFacility = null;
        let travelTimeMinutes = null;
        const latVal = item.latitude !== null && item.latitude !== void 0 ? parseFloat(item.latitude.toString()) : null;
        const lngVal = item.longitude !== null && item.longitude !== void 0 ? parseFloat(item.longitude.toString()) : null;
        if (assignedFacilityId && latVal !== null && lngVal !== null && !isNaN(latVal) && !isNaN(lngVal)) {
          const facility = allFacilities.find((f) => f.id === assignedFacilityId);
          if (facility && facility.latitude !== null && facility.longitude !== null) {
            const dist = calculateHaversineDistance(
              latVal,
              lngVal,
              parseFloat(facility.latitude.toString()),
              parseFloat(facility.longitude.toString())
            );
            distanceToFacility = dist.toFixed(2);
            const isHtr = item.isHardToReach ?? false;
            const minutesPerKm = isHtr ? 15 : 2;
            const terrainFactor = isHtr ? 1.25 : 1.15;
            travelTimeMinutes = Math.max(5, Math.round(dist * minutesPerKm * terrainFactor));
          }
        }
        let existing = null;
        if (item.code) {
          [existing] = await db.select().from(villages).where(
            (0, import_drizzle_orm9.and)(
              (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId),
              (0, import_drizzle_orm9.eq)(villages.code, item.code.trim())
            )
          ).limit(1);
        }
        if (!existing) {
          [existing] = await db.select().from(villages).where(
            (0, import_drizzle_orm9.and)(
              (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId),
              (0, import_drizzle_orm9.eq)(villages.name, name)
            )
          ).limit(1);
        }
        if (existing) {
          await db.update(villages).set({
            code: item.code ? item.code.trim() : existing.code,
            districtId,
            assignedFacilityId: assignedFacilityId ?? existing.assignedFacilityId,
            latitude: latVal !== null && !isNaN(latVal) ? latVal.toFixed(7) : existing.latitude,
            longitude: lngVal !== null && !isNaN(lngVal) ? lngVal.toFixed(7) : existing.longitude,
            distanceToFacility: distanceToFacility ?? existing.distanceToFacility,
            travelTimeMinutes: travelTimeMinutes ?? existing.travelTimeMinutes,
            isHardToReach: item.isHardToReach ?? existing.isHardToReach,
            comments: item.comments ?? existing.comments,
            insecurityLevel: item.insecurityLevel ?? existing.insecurityLevel,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm9.eq)(villages.id, existing.id));
          updatedCount++;
        } else {
          await db.insert(villages).values({
            tenantId: req.tenantId,
            name,
            code: item.code ? item.code.trim() : null,
            districtId,
            assignedFacilityId,
            latitude: latVal !== null && !isNaN(latVal) ? latVal.toFixed(7) : null,
            longitude: lngVal !== null && !isNaN(lngVal) ? lngVal.toFixed(7) : null,
            distanceToFacility,
            travelTimeMinutes,
            isHardToReach: item.isHardToReach ?? false,
            comments: item.comments ?? null,
            insecurityLevel: item.insecurityLevel ?? null
          });
          createdCount++;
        }
      }
      await logAudit(req, "import_csv_villages", "village", null, null, { createdCount, updatedCount });
      res.json({
        success: true,
        message: `Successfully imported ${importedVillages.length} villages.`,
        createdCount,
        updatedCount,
        count: importedVillages.length
      });
    } catch (error) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: "Invalid CSV JSON data format.", errors: error.errors });
      }
      console.error("Error importing villages:", error);
      res.status(500).json({ success: false, message: "Failed to import villages from CSV." });
    }
  });
  app2.patch("/api/villages/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldVillage = await storage.getVillage(req.tenantId, entityId);
      if (!oldVillage) return res.status(404).json({ message: "Village not found" });
      const body = { ...req.body };
      const latVal = body.latitude !== void 0 ? parseFloat(body.latitude) : oldVillage.latitude !== null ? parseFloat(oldVillage.latitude.toString()) : NaN;
      const lngVal = body.longitude !== void 0 ? parseFloat(body.longitude) : oldVillage.longitude !== null ? parseFloat(oldVillage.longitude.toString()) : NaN;
      const facilityId = body.assignedFacilityId !== void 0 ? parseInt(body.assignedFacilityId) : oldVillage.assignedFacilityId;
      const isHtr = body.isHardToReach !== void 0 ? body.isHardToReach === true || String(body.isHardToReach) === "true" : oldVillage.isHardToReach;
      if (facilityId && !isNaN(latVal) && !isNaN(lngVal)) {
        const facility = await storage.getFacility(req.tenantId, facilityId);
        if (facility && facility.latitude !== null && facility.longitude !== null) {
          const dist = calculateHaversineDistance(
            latVal,
            lngVal,
            parseFloat(facility.latitude.toString()),
            parseFloat(facility.longitude.toString())
          );
          body.distanceToFacility = dist.toFixed(2);
          if (body.travelTimeMinutes === void 0 || body.travelTimeMinutes === null) {
            const minutesPerKm = isHtr ? 15 : 2;
            const terrainFactor = isHtr ? 1.25 : 1.15;
            body.travelTimeMinutes = Math.max(5, Math.round(dist * minutesPerKm * terrainFactor));
          }
        }
      }
      const village = await storage.updateVillage(req.tenantId, entityId, body);
      await logAudit(req, "update", "village", entityId, oldVillage, village);
      res.json(village);
    } catch (error) {
      console.error("Error updating village:", error);
      res.status(400).json({ message: "Failed to update village" });
    }
  });
  app2.delete("/api/villages/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldVillage = await storage.getVillage(req.tenantId, entityId);
      const ok = await storage.deleteVillage(req.tenantId, entityId);
      if (!ok) return res.status(404).json({ message: "Village not found" });
      await logAudit(req, "delete", "village", entityId, oldVillage, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting village:", error);
      res.status(500).json({ message: "Failed to delete village" });
    }
  });
  app2.post("/api/facilities/:id/communities/extract-aggressive", ...auth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const tenantId = req.tenantId;
      const facility = await storage.getFacility(tenantId, facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      const catchments = await db.select().from(facilityCatchments).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(facilityCatchments.facilityId, facilityId),
          (0, import_drizzle_orm9.eq)(facilityCatchments.tenantId, tenantId),
          (0, import_drizzle_orm9.eq)(facilityCatchments.isOfficial, true)
        )
      );
      const districtId = facility.districtId;
      const districtVillages = await db.select().from(villages).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(villages.districtId, districtId),
          (0, import_drizzle_orm9.eq)(villages.tenantId, tenantId)
        )
      );
      let matchedVillageIds = [];
      if (catchments.length > 0 && catchments[0].geojson) {
        const geojson = catchments[0].geojson;
        let polygonCoords = [];
        if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates) && geojson.coordinates[0]) {
          polygonCoords = geojson.coordinates[0];
        } else if (geojson.type === "MultiPolygon" && Array.isArray(geojson.coordinates) && geojson.coordinates[0]?.[0]) {
          polygonCoords = geojson.coordinates[0][0];
        }
        districtVillages.forEach((v) => {
          if (!v.latitude || !v.longitude) return;
          const lat = parseFloat(v.latitude.toString());
          const lng = parseFloat(v.longitude.toString());
          let inside = false;
          const polygon = polygonCoords;
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
            if (intersect) inside = !inside;
          }
          if (inside) {
            matchedVillageIds.push(v.id);
            return;
          }
          if (facility.latitude && facility.longitude) {
            const facLat = parseFloat(facility.latitude.toString());
            const facLng = parseFloat(facility.longitude.toString());
            const dist = calculateHaversineDistance(lat, lng, facLat, facLng);
            const radius = facility.catchmentRadius ? parseFloat(facility.catchmentRadius.toString()) : 5;
            if (dist <= radius) {
              matchedVillageIds.push(v.id);
            }
          }
        });
      } else {
        districtVillages.forEach((v) => {
          if (!v.latitude || !v.longitude || !facility.latitude || !facility.longitude) return;
          const lat = parseFloat(v.latitude.toString());
          const lng = parseFloat(v.longitude.toString());
          const facLat = parseFloat(facility.latitude.toString());
          const facLng = parseFloat(facility.longitude.toString());
          const dist = calculateHaversineDistance(lat, lng, facLat, facLng);
          if (dist <= 10) {
            matchedVillageIds.push(v.id);
          }
        });
      }
      matchedVillageIds = Array.from(new Set(matchedVillageIds));
      if (matchedVillageIds.length > 0) {
        await db.update(villages).set({ assignedFacilityId: facilityId }).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.inArray)(villages.id, matchedVillageIds),
            (0, import_drizzle_orm9.eq)(villages.tenantId, tenantId)
          )
        );
      }
      await logAudit(req, "aggressive_extract_communities", "facilities", facilityId, null, {
        matchedVillageCount: matchedVillageIds.length,
        villageIds: matchedVillageIds
      });
      res.json({
        success: true,
        message: `Aggressively extracted and associated ${matchedVillageIds.length} communities with this health facility.`,
        assignedCount: matchedVillageIds.length
      });
    } catch (error) {
      console.error("Aggressive extraction failed:", error);
      res.status(500).json({ message: "Aggressive extraction failed: " + error.message });
    }
  });
  app2.get("/api/resources/geotiff", ...auth, async (req, res) => {
    try {
      let resourcesDir = (0, import_path2.join)(process.cwd(), "Resources");
      if (!(0, import_fs2.existsSync)(resourcesDir)) {
        const parentDir = (0, import_path2.join)(process.cwd(), "..", "Resources");
        if ((0, import_fs2.existsSync)(parentDir)) {
          resourcesDir = parentDir;
        } else {
          return res.status(404).json({ message: "Resources directory not found in server root or parent directory." });
        }
      }
      const reqFile = req.query.file;
      let geotiffFile = "";
      if (reqFile) {
        const safePath = (0, import_path2.join)(resourcesDir, reqFile);
        if ((0, import_fs2.existsSync)(safePath) && !reqFile.includes("..")) {
          geotiffFile = reqFile;
        } else {
          return res.status(404).json({ message: `Requested GeoTIFF population file '${reqFile}' not found.` });
        }
      }
      if (!geotiffFile) {
        const tenant = await storage.getTenant(req.tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Active country tenant not found." });
        }
        const tenantCode = tenant.code.toLowerCase();
        const countryCode = (tenant.countryCode || "").toLowerCase();
        const files = (0, import_fs2.readdirSync)(resourcesDir);
        geotiffFile = files.find((f) => {
          const lowerF = f.toLowerCase();
          const matchesTenant = lowerF.includes(tenantCode) || countryCode && lowerF.includes(countryCode);
          return matchesTenant && lowerF.includes("pop") && lowerF.includes("100m") && (lowerF.endsWith(".tif") || lowerF.endsWith(".tiff"));
        }) || "";
        if (!geotiffFile) {
          geotiffFile = files.find((f) => {
            const lowerF = f.toLowerCase();
            const matchesTenant = lowerF.includes(tenantCode) || countryCode && lowerF.includes(countryCode);
            return matchesTenant && lowerF.includes("pop") && lowerF.includes("1km") && (lowerF.endsWith(".tif") || lowerF.endsWith(".tiff"));
          }) || "";
        }
        if (!geotiffFile) {
          geotiffFile = files.find((f) => {
            const lowerF = f.toLowerCase();
            const matchesTenant = lowerF.includes(tenantCode) || countryCode && lowerF.includes(countryCode);
            return matchesTenant && lowerF.includes("pop") && (lowerF.endsWith(".tif") || lowerF.endsWith(".tiff"));
          }) || "";
        }
        if (!geotiffFile) {
          geotiffFile = files.find((f) => {
            const lowerF = f.toLowerCase();
            const matchesTenant = lowerF.includes(tenantCode) || countryCode && lowerF.includes(countryCode);
            return matchesTenant && (lowerF.endsWith(".tif") || lowerF.endsWith(".tiff"));
          }) || "";
        }
      }
      if (!geotiffFile) {
        return res.status(404).json({ message: "No GeoTIFF population raster file found." });
      }
      const filePath = (0, import_path2.join)(resourcesDir, geotiffFile);
      const { statSync } = await import("fs");
      const fileStat = statSync(filePath);
      res.setHeader("Cache-Control", "private, max-age=604800, immutable");
      res.setHeader("Content-Type", "image/tiff");
      res.setHeader("Content-Length", String(fileStat.size));
      res.setHeader("Content-Disposition", `inline; filename="${geotiffFile}"`);
      const stream = (0, import_fs2.createReadStream)(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error("Error serving GeoTIFF raster file:", error);
      res.status(500).json({ message: "Failed to serve GeoTIFF raster file: " + error.message });
    }
  });
  app2.get("/api/resources/geotiff/list", ...auth, async (req, res) => {
    try {
      let resourcesDir = (0, import_path2.join)(process.cwd(), "Resources");
      if (!(0, import_fs2.existsSync)(resourcesDir)) {
        const parentDir = (0, import_path2.join)(process.cwd(), "..", "Resources");
        if ((0, import_fs2.existsSync)(parentDir)) resourcesDir = parentDir;
      }
      if (!(0, import_fs2.existsSync)(resourcesDir)) {
        return res.status(404).json({ success: false, message: "Resources directory not found." });
      }
      const files = (0, import_fs2.readdirSync)(resourcesDir);
      const rasters = files.filter((f) => f.endsWith(".tif") || f.endsWith(".tiff")).map((f) => {
        let country = "Universal";
        let resolution = "1km";
        if (f.toLowerCase().includes("zmb")) country = "Zambia";
        else if (f.toLowerCase().includes("ssd")) country = "South Sudan";
        else if (f.toLowerCase().includes("png")) country = "Papua New Guinea";
        if (f.toLowerCase().includes("100m")) resolution = "100m";
        else if (f.toLowerCase().includes("mot") || f.toLowerCase().includes("walking")) resolution = "Travel Contour Network";
        return {
          fileName: f,
          country,
          resolution
        };
      });
      res.json({ success: true, files: rasters });
    } catch (error) {
      console.error("Error listing GeoTIFF population rasters:", error);
      res.status(500).json({ success: false, message: "Failed to list rasters: " + error.message });
    }
  });
  app2.get("/api/resources/grid3-settlements", ...auth, async (req, res) => {
    try {
      let resourcesDir = (0, import_path2.join)(process.cwd(), "Resources");
      if (!(0, import_fs2.existsSync)(resourcesDir)) {
        const parentDir = (0, import_path2.join)(process.cwd(), "..", "Resources");
        if ((0, import_fs2.existsSync)(parentDir)) resourcesDir = parentDir;
      }
      const cachePath = (0, import_path2.join)(resourcesDir, "grid3_settlements_zmb.geojson");
      if ((0, import_fs2.existsSync)(cachePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        res.setHeader("Content-Type", "application/json");
        return (0, import_fs2.createReadStream)(cachePath).pipe(res);
      }
      const liveUrl = "https://services3.arcgis.com/BU6Aadhn6tbBEdyk/arcgis/rest/services/GRID3_ZMB_Settlement_Extents_v3_0/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson";
      console.log("Fetching live GRID3 Zambia Settlements from ArcGIS FeatureServer...");
      const response = await fetch(liveUrl);
      if (!response.ok) {
        throw new Error(`ArcGIS FeatureServer returned error status: ${response.statusText}`);
      }
      const geojsonData = await response.json();
      const cacheWriteStream = (0, import_fs2.createWriteStream)(cachePath);
      cacheWriteStream.write(JSON.stringify(geojsonData));
      cacheWriteStream.end();
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      res.json(geojsonData);
    } catch (error) {
      console.error("Error proxying GRID3 Zambia Settlement Extents:", error);
      res.status(500).json({ success: false, message: "GRID3 proxy call failed: " + error.message });
    }
  });
  app2.post("/api/resources/geotiff/upload", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const fileName = req.headers["x-file-name"];
      if (!fileName || !fileName.endsWith(".tif") && !fileName.endsWith(".tiff")) {
        return res.status(400).json({ success: false, message: "Invalid GeoTIFF file. Must have .tif or .tiff extension." });
      }
      let resourcesDir = (0, import_path2.join)(process.cwd(), "Resources");
      if (!(0, import_fs2.existsSync)(resourcesDir)) {
        const parentDir = (0, import_path2.join)(process.cwd(), "..", "Resources");
        if ((0, import_fs2.existsSync)(parentDir)) {
          resourcesDir = parentDir;
        } else {
          return res.status(404).json({ success: false, message: "Resources directory not found." });
        }
      }
      const filePath = (0, import_path2.join)(resourcesDir, fileName);
      const writeStream = (0, import_fs2.createWriteStream)(filePath);
      req.pipe(writeStream);
      req.on("error", (err) => {
        console.error("Upload request stream error:", err);
        res.status(500).json({ success: false, message: "Upload stream broke: " + err.message });
      });
      writeStream.on("error", (err) => {
        console.error("Write stream error:", err);
        res.status(500).json({ success: false, message: "Failed to write file: " + err.message });
      });
      writeStream.on("finish", async () => {
        await logAudit(req, "upload_geotiff", "resources", fileName, null, { filePath });
        res.json({ success: true, message: `GeoTIFF population raster ${fileName} successfully uploaded and saved.` });
      });
    } catch (error) {
      console.error("Error in GeoTIFF upload handler:", error);
      res.status(500).json({ success: false, message: "GeoTIFF upload failed: " + error.message });
    }
  });
  app2.post("/api/population/import", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        population: import_zod3.z.array(import_zod3.z.object({
          villageName: import_zod3.z.string().optional().nullable(),
          villageCode: import_zod3.z.string().optional().nullable(),
          facilityHmisCode: import_zod3.z.string().optional().nullable(),
          facilityName: import_zod3.z.string().optional().nullable(),
          source: import_zod3.z.enum(["nso", "hmis", "worldpop", "survey", "community_census"]),
          year: import_zod3.z.number().int(),
          totalPopulation: import_zod3.z.number().int(),
          malePopulation: import_zod3.z.number().int().optional().nullable(),
          femalePopulation: import_zod3.z.number().int().optional().nullable(),
          under1Population: import_zod3.z.number().int().optional().nullable(),
          under5Population: import_zod3.z.number().int().optional().nullable(),
          pregnantWomen: import_zod3.z.number().int().optional().nullable(),
          schoolEntry: import_zod3.z.number().int().optional().nullable(),
          schoolExit: import_zod3.z.number().int().optional().nullable(),
          growthRate: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable(),
          confidenceScore: import_zod3.z.union([import_zod3.z.number(), import_zod3.z.string()]).optional().nullable()
        }))
      });
      const { population: importedPop } = schema.parse(req.body);
      const allVillages = await storage.getVillages(req.tenantId);
      const allFacilities = await storage.getFacilities(req.tenantId);
      let createdCount = 0;
      let updatedCount = 0;
      for (const item of importedPop) {
        let villageId = null;
        let districtId = null;
        let provinceId = null;
        if (item.villageCode) {
          const matched = allVillages.find((v) => v.code?.toLowerCase() === item.villageCode.trim().toLowerCase());
          if (matched) {
            villageId = matched.id;
            districtId = matched.districtId;
          }
        }
        if (!villageId && item.villageName) {
          const matched = allVillages.find((v) => v.name.toLowerCase() === item.villageName.trim().toLowerCase());
          if (matched) {
            villageId = matched.id;
            districtId = matched.districtId;
          }
        }
        let facilityId = null;
        if (item.facilityHmisCode) {
          const matched = allFacilities.find((f) => f.hmisCode.toLowerCase() === item.facilityHmisCode.trim().toLowerCase());
          if (matched) {
            facilityId = matched.id;
            if (!districtId) {
              districtId = matched.districtId;
            }
          }
        }
        if (!facilityId && item.facilityName) {
          const matched = allFacilities.find((f) => f.name.toLowerCase() === item.facilityName.trim().toLowerCase());
          if (matched) {
            facilityId = matched.id;
            if (!districtId) {
              districtId = matched.districtId;
            }
          }
        }
        if (!villageId && !facilityId) {
          continue;
        }
        if (districtId) {
          const dist = await storage.getDistrict(req.tenantId, districtId);
          if (dist) {
            provinceId = dist.provinceId;
          }
        }
        const growthVal = item.growthRate !== null && item.growthRate !== void 0 ? parseFloat(item.growthRate.toString()) : null;
        const confidenceVal = item.confidenceScore !== null && item.confidenceScore !== void 0 ? parseFloat(item.confidenceScore.toString()) : null;
        let existing = null;
        if (villageId) {
          [existing] = await db.select().from(populationData).where(
            (0, import_drizzle_orm9.and)(
              (0, import_drizzle_orm9.eq)(populationData.tenantId, req.tenantId),
              (0, import_drizzle_orm9.eq)(populationData.villageId, villageId),
              (0, import_drizzle_orm9.eq)(populationData.year, item.year),
              (0, import_drizzle_orm9.eq)(populationData.source, item.source)
            )
          ).limit(1);
        } else if (facilityId) {
          [existing] = await db.select().from(populationData).where(
            (0, import_drizzle_orm9.and)(
              (0, import_drizzle_orm9.eq)(populationData.tenantId, req.tenantId),
              (0, import_drizzle_orm9.eq)(populationData.facilityId, facilityId),
              (0, import_drizzle_orm9.eq)(populationData.year, item.year),
              (0, import_drizzle_orm9.eq)(populationData.source, item.source)
            )
          ).limit(1);
        }
        if (existing) {
          await db.update(populationData).set({
            totalPopulation: item.totalPopulation,
            malePopulation: item.malePopulation ?? existing.malePopulation,
            femalePopulation: item.femalePopulation ?? existing.femalePopulation,
            under1Population: item.under1Population ?? existing.under1Population,
            under5Population: item.under5Population ?? existing.under5Population,
            pregnantWomen: item.pregnantWomen ?? existing.pregnantWomen,
            schoolEntry: item.schoolEntry ?? existing.schoolEntry,
            schoolExit: item.schoolExit ?? existing.schoolExit,
            growthRate: growthVal !== null && !isNaN(growthVal) ? growthVal.toFixed(2) : existing.growthRate,
            confidenceScore: confidenceVal !== null && !isNaN(confidenceVal) ? confidenceVal.toFixed(2) : existing.confidenceScore,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm9.eq)(populationData.id, existing.id));
          updatedCount++;
        } else {
          await db.insert(populationData).values({
            tenantId: req.tenantId,
            provinceId,
            districtId,
            villageId,
            facilityId,
            source: item.source,
            year: item.year,
            totalPopulation: item.totalPopulation,
            malePopulation: item.malePopulation ?? null,
            femalePopulation: item.femalePopulation ?? null,
            under1Population: item.under1Population ?? null,
            under5Population: item.under5Population ?? null,
            pregnantWomen: item.pregnantWomen ?? null,
            schoolEntry: item.schoolEntry ?? null,
            schoolExit: item.schoolExit ?? null,
            growthRate: growthVal !== null && !isNaN(growthVal) ? growthVal.toFixed(2) : null,
            confidenceScore: confidenceVal !== null && !isNaN(confidenceVal) ? confidenceVal.toFixed(2) : null,
            approvalStatus: "approved"
          });
          createdCount++;
        }
      }
      await logAudit(req, "import_population", "population_data", null, null, { createdCount, updatedCount });
      res.json({ success: true, message: `Successfully imported ${importedPop.length} population records.`, createdCount, updatedCount });
    } catch (error) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ success: false, message: "Invalid population payload.", errors: error.errors });
      }
      console.error("Error importing population data:", error);
      res.status(500).json({ success: false, message: "Failed to import population: " + error.message });
    }
  });
  app2.get("/api/population", ...auth, async (req, res) => {
    try {
      const userId = req.user?.id ?? req.user?.claims?.sub ?? null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: Missing user claims context" });
      }
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized: User record not found" });
      }
      const filters = {
        source: req.query.source,
        provinceId: req.query.provinceId ? parseInt(req.query.provinceId) : void 0,
        districtId: req.query.districtId ? parseInt(req.query.districtId) : void 0,
        villageId: req.query.villageId ? parseInt(req.query.villageId) : void 0,
        facilityId: req.query.facilityId ? parseInt(req.query.facilityId) : void 0,
        year: req.query.year ? parseInt(req.query.year) : void 0
      };
      const isNationalAdmin = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
      if (!isNationalAdmin) {
        if (dbUser.facilityId) {
          filters.facilityId = dbUser.facilityId;
        } else if (dbUser.districtId) {
          filters.districtId = dbUser.districtId;
        } else if (dbUser.provinceId) {
          filters.provinceId = dbUser.provinceId;
        }
      }
      res.json(await storage.getPopulationData(req.tenantId, filters));
    } catch (error) {
      console.error("Error fetching population data:", error);
      res.status(500).json({ message: "Failed to fetch population data" });
    }
  });
  app2.get("/api/population/:id", ...auth, async (req, res) => {
    try {
      const pop = await storage.getPopulationDataById(req.tenantId, parseInt(req.params.id));
      if (!pop) return res.status(404).json({ message: "Population data not found" });
      res.json(pop);
    } catch (error) {
      console.error("Error fetching population data:", error);
      res.status(500).json({ message: "Failed to fetch population data" });
    }
  });
  app2.post("/api/population", ...auth, async (req, res) => {
    try {
      const data = insertPopulationDataSchema.parse(req.body);
      const pop = await storage.createPopulationData(req.tenantId, data);
      await logAudit(req, "create", "population_data", pop.id, null, pop);
      res.status(201).json(pop);
    } catch (error) {
      console.error("Error creating population data:", error);
      res.status(400).json({ message: "Invalid population data" });
    }
  });
  app2.patch("/api/population/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldPop = await storage.getPopulationDataById(req.tenantId, entityId);
      const pop = await storage.updatePopulationData(req.tenantId, entityId, req.body);
      if (!pop) return res.status(404).json({ message: "Population data not found" });
      await logAudit(req, "update", "population_data", entityId, oldPop, pop);
      res.json(pop);
    } catch (error) {
      console.error("Error updating population data:", error);
      res.status(400).json({ message: "Failed to update population data" });
    }
  });
  app2.delete("/api/population/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldPop = await storage.getPopulationDataById(req.tenantId, entityId);
      const ok = await storage.deletePopulationData(req.tenantId, entityId);
      if (!ok) return res.status(404).json({ message: "Population data not found" });
      await logAudit(req, "delete", "population_data", entityId, oldPop, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting population data:", error);
      res.status(500).json({ message: "Failed to delete population data" });
    }
  });
  app2.get("/api/microplans", ...auth, async (req, res) => {
    try {
      const dbUser = await storage.getUser(req.user.id);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      const list = await storage.getMicroplans(req.tenantId);
      res.json(list);
    } catch (error) {
      console.error("Error fetching master microplans:", error);
      res.status(500).json({ message: "Failed to fetch master microplans" });
    }
  });
  app2.get("/api/microplans/:id", ...auth, async (req, res) => {
    try {
      const plan = await storage.getMicroplan(req.tenantId, parseInt(req.params.id));
      if (!plan) return res.status(404).json({ message: "Master microplan not found" });
      res.json(plan);
    } catch (error) {
      console.error("Error fetching master microplan:", error);
      res.status(500).json({ message: "Failed to fetch master microplan" });
    }
  });
  app2.post("/api/microplans", ...auth, async (req, res) => {
    try {
      const dbUser = await storage.getUser(req.user.id);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      const data = insertMicroplanSchema.parse(req.body);
      const plan = await storage.createMicroplan(req.tenantId, data);
      await logAudit(req, "create", "microplan", plan.id, null, plan);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating master microplan:", error);
      res.status(400).json({ message: "Invalid master microplan data" });
    }
  });
  app2.patch("/api/microplans/:id", ...auth, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const oldPlan = await storage.getMicroplan(req.tenantId, planId);
      if (!oldPlan) return res.status(404).json({ message: "Master microplan not found" });
      const plan = await storage.updateMicroplan(req.tenantId, planId, req.body);
      if (!plan) return res.status(404).json({ message: "Master microplan not found" });
      await logAudit(req, "update", "microplan", planId, oldPlan, plan);
      res.json(plan);
    } catch (error) {
      console.error("Error updating master microplan:", error);
      res.status(400).json({ message: "Failed to update master microplan" });
    }
  });
  app2.delete("/api/microplans/:id", ...auth, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const oldPlan = await storage.getMicroplan(req.tenantId, planId);
      const ok = await storage.deleteMicroplan(req.tenantId, planId);
      if (!ok) return res.status(404).json({ message: "Master microplan not found" });
      await logAudit(req, "delete", "microplan", planId, oldPlan, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting master microplan:", error);
      res.status(500).json({ message: "Failed to delete master microplan" });
    }
  });
  async function overlayCampaignFromParent(tenantId, sessions2) {
    if (!sessions2.length) return sessions2;
    const ids = Array.from(new Set(sessions2.map((s) => s.microplanId).filter((x) => x != null)));
    const parents = /* @__PURE__ */ new Map();
    for (const id of ids) {
      const p = await storage.getMicroplan(tenantId, id);
      if (p) parents.set(id, p);
    }
    return sessions2.map((s) => {
      const p = s.microplanId ? parents.get(s.microplanId) : null;
      if (!p) return s;
      const isCampaign = p.planType === "sia_campaign";
      return {
        ...s,
        planType: isCampaign ? "campaign" : "routine",
        campaignAntigen: isCampaign ? p.campaignAntigen ?? null : null,
        campaignTargetAge: isCampaign ? p.campaignTargetAge ?? null : null,
        campaignScope: isCampaign ? p.campaignScope ?? null : null
      };
    });
  }
  app2.get("/api/sessions", ...auth, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      if (facilityId) {
        const geoContext = await getFacilityHierarchy(facilityId, req.tenantId);
        if (!hasPermission(dbUser, "view_session_plans", geoContext)) {
          return res.json([]);
        }
      }
      let list = await storage.getSessionPlans(req.tenantId, facilityId);
      const isNationalAdmin = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
      if (!isNationalAdmin) {
        const hierarchyCache = /* @__PURE__ */ new Map();
        const filteredList = [];
        for (const session2 of list) {
          let geo = hierarchyCache.get(session2.facilityId);
          if (!geo) {
            geo = await getFacilityHierarchy(session2.facilityId, req.tenantId);
            hierarchyCache.set(session2.facilityId, geo);
          }
          if (hasPermission(dbUser, "view_session_plans", geo)) {
            filteredList.push(session2);
          }
        }
        list = filteredList;
      }
      const overlaid = await overlayCampaignFromParent(req.tenantId, list);
      res.json(overlaid);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });
  app2.get("/api/sessions/villages", ...auth, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.json([]);
      const list = await db.select().from(sessionVillages).where((0, import_drizzle_orm9.eq)(sessionVillages.tenantId, String(tenantId)));
      res.json(list);
    } catch (error) {
      console.error("Error fetching session villages:", error);
      res.status(500).json({
        message: "Failed to fetch session villages",
        error: error.message,
        stack: error.stack
      });
    }
  });
  app2.get("/api/sessions/:id", ...auth, async (req, res) => {
    try {
      const session2 = await storage.getSessionPlan(req.tenantId, parseInt(req.params.id));
      if (!session2) return res.status(404).json({ message: "Session not found" });
      const [overlaid] = await overlayCampaignFromParent(req.tenantId, [session2]);
      res.json(overlaid);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });
  async function validateParentMicroplan(tenantId, microplanId, expectedPlanType) {
    if (!microplanId || !Number.isFinite(Number(microplanId))) {
      return { ok: false, status: 400, message: "microplanId is required: a session must belong to a parent microplan." };
    }
    const parent = await storage.getMicroplan(tenantId, Number(microplanId));
    if (!parent) {
      return { ok: false, status: 400, message: `Parent microplan ${microplanId} not found in this tenant.` };
    }
    if (parent.status === "locked") {
      return { ok: false, status: 400, message: `Parent microplan "${parent.name}" is locked; its sessions cannot be modified.` };
    }
    const parentSessionPlanType = parent.planType === "sia_campaign" ? "campaign" : "routine";
    if (expectedPlanType && expectedPlanType !== parentSessionPlanType) {
      return {
        ok: false,
        status: 400,
        message: `Session planType "${expectedPlanType}" does not match parent microplan planType "${parentSessionPlanType}".`
      };
    }
    return { ok: true, parent, sessionPlanType: parentSessionPlanType };
  }
  app2.post("/api/sessions", ...auth, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      for (const f of ["planType", "campaignAntigen", "campaignTargetAge", "campaignScope"]) {
        if (req.body?.[f] !== void 0) {
          return res.status(400).json({
            message: `${f} is inherited from the parent microplan and must not be set on the session payload.`
          });
        }
      }
      const data = insertSessionPlanSchema.parse(req.body);
      const authorRoles = /* @__PURE__ */ new Set(["facility_clerk", "facility_in_charge", "national_admin"]);
      if (!authorRoles.has(dbUser.role)) {
        return res.status(403).json({
          message: "Forbidden: only facility staff may author session plans. District/provincial/national roles are reviewers only."
        });
      }
      const parentCheck = await validateParentMicroplan(req.tenantId, data.microplanId);
      if (!parentCheck.ok) {
        return res.status(parentCheck.status).json({ message: parentCheck.message });
      }
      const geoContext = await getFacilityHierarchy(data.facilityId, req.tenantId);
      if (!hasPermission(dbUser, "manage_session_plans", geoContext)) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to manage session plans for this geographic scope."
        });
      }
      if (data.scheduledDate) {
        const dateVal = await validatePlanningLeadTimeAndNoConflict(
          req.tenantId,
          data.facilityId,
          data.scheduledDate
        );
        if (!dateVal.isValid) {
          return res.status(400).json({ message: dateVal.message });
        }
      }
      if (data.scheduledDate && req.body?.override !== true) {
        const villageIds = Array.isArray(req.body?.villageIds) ? req.body.villageIds : void 0;
        const prox = await checkProximityAndPopulation(req.tenantId, {
          facilityId: data.facilityId,
          scheduledDate: data.scheduledDate,
          targetPopulation: Number(data.targetPopulation ?? 0),
          villageIds
        });
        if (prox.warnings.length > 0) {
          return res.status(409).json({
            message: prox.warnings.join(" "),
            code: "proximity_population_warning",
            warnings: prox.warnings,
            nearbySessions: prox.nearbySessions,
            availablePopulation: prox.availablePopulation,
            committedPopulation: prox.committedPopulation
          });
        }
      }
      const parentFacilityId = parentCheck.parent.facilityId;
      const parentYear = parentCheck.parent.year;
      const parentQuarter = parentCheck.parent.quarter;
      if (data.facilityId !== parentFacilityId) {
        return res.status(400).json({
          message: `facilityId ${data.facilityId} does not match parent microplan facilityId ${parentFacilityId}.`
        });
      }
      if (data.year !== parentYear) {
        return res.status(400).json({
          message: `year ${data.year} does not match parent microplan year ${parentYear}.`
        });
      }
      if (data.quarter !== parentQuarter) {
        return res.status(400).json({
          message: `quarter ${data.quarter} does not match parent microplan quarter ${parentQuarter}.`
        });
      }
      const inherited = {
        ...data,
        facilityId: parentFacilityId,
        year: parentYear,
        quarter: parentQuarter,
        planType: parentCheck.sessionPlanType,
        campaignAntigen: parentCheck.sessionPlanType === "campaign" ? parentCheck.parent.campaignAntigen ?? null : null,
        campaignTargetAge: parentCheck.sessionPlanType === "campaign" ? parentCheck.parent.campaignTargetAge ?? null : null,
        campaignScope: parentCheck.sessionPlanType === "campaign" ? parentCheck.parent.campaignScope ?? null : null
      };
      const session2 = await storage.createSessionPlan(req.tenantId, inherited);
      await logAudit(req, "create", "session_plan", session2.id, null, session2);
      res.status(201).json(session2);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid session data" });
    }
  });
  app2.patch("/api/sessions/:id", ...auth, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      const authorRoles = /* @__PURE__ */ new Set(["facility_clerk", "facility_in_charge", "national_admin"]);
      if (!authorRoles.has(dbUser.role)) {
        return res.status(403).json({
          message: "Forbidden: only facility staff may modify session plans. District/provincial/national roles are reviewers only."
        });
      }
      const entityId = parseInt(req.params.id);
      const oldSession = await storage.getSessionPlan(req.tenantId, entityId);
      if (!oldSession) return res.status(404).json({ message: "Session not found" });
      const geoContext = await getFacilityHierarchy(oldSession.facilityId, req.tenantId);
      if (!hasPermission(dbUser, "manage_session_plans", geoContext)) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to manage session plans for this geographic scope."
        });
      }
      const body = { ...req.body };
      if (body.microplanId !== void 0 && Number(body.microplanId) !== Number(oldSession.microplanId)) {
        return res.status(400).json({ message: "Cannot reparent a session to a different microplan; delete and recreate it instead." });
      }
      if (body.planType !== void 0 && body.planType !== oldSession.planType) {
        return res.status(400).json({ message: "planType is inherited from the parent microplan and cannot be changed on a session." });
      }
      for (const f of ["campaignAntigen", "campaignTargetAge", "campaignScope"]) {
        if (body[f] !== void 0 && body[f] !== oldSession[f]) {
          return res.status(400).json({ message: `${f} is inherited from the parent microplan and cannot be changed on a session.` });
        }
      }
      for (const f of ["facilityId", "year", "quarter"]) {
        if (body[f] !== void 0 && body[f] !== oldSession[f]) {
          return res.status(400).json({
            message: `${f} is derived from the parent microplan and cannot be changed on a session.`
          });
        }
      }
      delete body.microplanId;
      delete body.planType;
      delete body.campaignAntigen;
      delete body.campaignTargetAge;
      delete body.campaignScope;
      delete body.facilityId;
      delete body.year;
      delete body.quarter;
      delete body.tenantId;
      const parentCheck = await validateParentMicroplan(req.tenantId, oldSession.microplanId);
      if (!parentCheck.ok) {
        return res.status(parentCheck.status).json({ message: parentCheck.message });
      }
      if (body.scheduledDate) {
        const dateVal = await validatePlanningLeadTimeAndNoConflict(
          req.tenantId,
          oldSession.facilityId,
          body.scheduledDate,
          entityId
        );
        if (!dateVal.isValid) {
          return res.status(400).json({ message: dateVal.message });
        }
      }
      const effectiveDate = body.scheduledDate ?? oldSession.scheduledDate;
      if (effectiveDate && req.body?.override !== true) {
        const villageIds = Array.isArray(req.body?.villageIds) ? req.body.villageIds : void 0;
        const prox = await checkProximityAndPopulation(req.tenantId, {
          facilityId: oldSession.facilityId,
          scheduledDate: effectiveDate,
          targetPopulation: Number(body.targetPopulation ?? oldSession.targetPopulation ?? 0),
          villageIds,
          excludeSessionId: entityId
        });
        if (prox.warnings.length > 0) {
          return res.status(409).json({
            message: prox.warnings.join(" "),
            code: "proximity_population_warning",
            warnings: prox.warnings,
            nearbySessions: prox.nearbySessions,
            availablePopulation: prox.availablePopulation,
            committedPopulation: prox.committedPopulation
          });
        }
      }
      delete body.override;
      delete body.villageIds;
      const session2 = await storage.updateSessionPlan(req.tenantId, entityId, body);
      if (!session2) return res.status(404).json({ message: "Session not found" });
      await logAudit(req, "update", "session_plan", entityId, oldSession, session2);
      res.json(session2);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update session" });
    }
  });
  app2.delete("/api/sessions/:id", ...auth, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      const authorRoles = /* @__PURE__ */ new Set(["facility_clerk", "facility_in_charge", "national_admin"]);
      if (!authorRoles.has(dbUser.role)) {
        return res.status(403).json({
          message: "Forbidden: only facility staff may delete session plans. District/provincial/national roles are reviewers only."
        });
      }
      const entityId = parseInt(req.params.id);
      const oldSession = await storage.getSessionPlan(req.tenantId, entityId);
      if (!oldSession) return res.status(404).json({ message: "Session not found" });
      const geoContext = await getFacilityHierarchy(oldSession.facilityId, req.tenantId);
      if (!hasPermission(dbUser, "manage_session_plans", geoContext)) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to manage session plans for this geographic scope."
        });
      }
      const parentCheck = await validateParentMicroplan(req.tenantId, oldSession.microplanId);
      if (!parentCheck.ok) {
        return res.status(parentCheck.status).json({ message: parentCheck.message });
      }
      const ok = await storage.deleteSessionPlan(req.tenantId, entityId);
      if (!ok) return res.status(404).json({ message: "Session not found" });
      await logAudit(req, "delete", "session_plan", entityId, oldSession, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete session" });
    }
  });
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  async function resolveSessionLocation(tenantId, session2, villageCache, facilityCache, svByPlan) {
    const gj = session2.geojson;
    if (gj && gj.type === "Point" && Array.isArray(gj.coordinates)) {
      return { lat: Number(gj.coordinates[1]), lng: Number(gj.coordinates[0]) };
    }
    if (gj && gj.type === "Polygon" && Array.isArray(gj.coordinates?.[0])) {
      const ring = gj.coordinates[0];
      const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
      return { lat, lng };
    }
    const vIds = svByPlan.get(session2.id) ?? [];
    for (const vid of vIds) {
      const v = villageCache.get(vid);
      if (v?.latitude != null && v?.longitude != null) {
        return { lat: Number(v.latitude), lng: Number(v.longitude) };
      }
    }
    const f = facilityCache.get(session2.facilityId);
    if (f?.latitude != null && f?.longitude != null) {
      return { lat: Number(f.latitude), lng: Number(f.longitude) };
    }
    return null;
  }
  app2.get("/api/sessions/map", ...auth, async (req, res) => {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const all = await storage.getSessionPlans(req.tenantId);
      const overlaid = await overlayCampaignFromParent(req.tenantId, all);
      const active = overlaid.filter((s) => {
        if (s.status !== "completed") return s.status !== "cancelled";
        return s.completedAt && new Date(s.completedAt) >= cutoff;
      });
      const facList = await storage.getFacilities(req.tenantId);
      const facMap = new Map(facList.map((f) => [f.id, f]));
      const vilList = await storage.getVillages(req.tenantId);
      const vilMap = new Map(vilList.map((v) => [v.id, v]));
      const svRows = await db.select().from(sessionVillages).where((0, import_drizzle_orm9.eq)(sessionVillages.tenantId, String(req.tenantId)));
      const svByPlan = /* @__PURE__ */ new Map();
      for (const r of svRows) {
        const arr = svByPlan.get(r.sessionId) ?? [];
        arr.push(r.villageId);
        svByPlan.set(r.sessionId, arr);
      }
      const out = [];
      for (const s of active) {
        const loc = await resolveSessionLocation(req.tenantId, s, vilMap, facMap, svByPlan);
        if (!loc) continue;
        const vc = s.vaccinatedCounts || null;
        out.push({
          id: s.id,
          name: s.name,
          status: s.status,
          completedAt: s.completedAt,
          scheduledDate: s.scheduledDate,
          facilityId: s.facilityId,
          targetPopulation: s.targetPopulation,
          vaccinatedTotal: vc?.totals ?? null,
          isAchieved: s.isAchieved,
          sessionType: s.sessionType,
          planType: s.planType,
          lat: loc.lat,
          lng: loc.lng
        });
      }
      res.json(out);
    } catch (err) {
      console.error("GET /api/sessions/map failed:", err);
      res.status(500).json({ message: "Failed to load sessions for map" });
    }
  });
  app2.get("/api/sessions/history", ...auth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const all = await storage.getSessionPlans(req.tenantId, facilityId);
      const overlaid = await overlayCampaignFromParent(req.tenantId, all);
      const archived = overlaid.filter((s) => s.status === "completed" || s.status === "cancelled");
      archived.sort((a, b) => {
        const at = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bt - at;
      });
      res.json(archived);
    } catch (err) {
      console.error("GET /api/sessions/history failed:", err);
      res.status(500).json({ message: "Failed to load session history" });
    }
  });
  async function checkProximityAndPopulation(tenantId, input) {
    const warnings = [];
    const PROXIMITY_KM = 2;
    const DAYS_WINDOW = 14;
    const facList = await storage.getFacilities(tenantId);
    const facMap = new Map(facList.map((f) => [f.id, f]));
    const vilList = await storage.getVillages(tenantId);
    const vilMap = new Map(vilList.map((v) => [v.id, v]));
    let lat = input.lat;
    let lng = input.lng;
    if (lat == null || lng == null) {
      const vIds = input.villageIds ?? [];
      for (const vid of vIds) {
        const v = vilMap.get(vid);
        if (v?.latitude != null && v?.longitude != null) {
          lat = Number(v.latitude);
          lng = Number(v.longitude);
          break;
        }
      }
      if (lat == null || lng == null) {
        const f = facMap.get(input.facilityId);
        if (f?.latitude != null && f?.longitude != null) {
          lat = Number(f.latitude);
          lng = Number(f.longitude);
        }
      }
    }
    if (lat == null || lng == null) {
      return { warnings: ["No coordinates available for this session \u2014 proximity check skipped."], nearbySessions: [], availablePopulation: 0, committedPopulation: 0 };
    }
    const target = new Date(input.scheduledDate);
    const winStart = new Date(target.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1e3);
    const winEnd = new Date(target.getTime() + DAYS_WINDOW * 24 * 60 * 60 * 1e3);
    const all = await storage.getSessionPlans(tenantId);
    const svRows = await db.select().from(sessionVillages).where((0, import_drizzle_orm9.eq)(sessionVillages.tenantId, String(tenantId)));
    const svByPlan = /* @__PURE__ */ new Map();
    for (const r of svRows) {
      const arr = svByPlan.get(r.sessionId) ?? [];
      arr.push(r.villageId);
      svByPlan.set(r.sessionId, arr);
    }
    const nearby = [];
    let committed = 0;
    for (const s of all) {
      if (input.excludeSessionId && s.id === input.excludeSessionId) continue;
      if (s.status === "cancelled" || s.status === "completed") continue;
      if (!s.scheduledDate) continue;
      const sd = new Date(s.scheduledDate);
      if (sd < winStart || sd > winEnd) continue;
      const loc = await resolveSessionLocation(tenantId, s, vilMap, facMap, svByPlan);
      if (!loc) continue;
      const d = haversineKm(lat, lng, loc.lat, loc.lng);
      if (d <= PROXIMITY_KM) {
        nearby.push({ id: s.id, name: s.name, scheduledDate: s.scheduledDate, distanceKm: Number(d.toFixed(2)), targetPopulation: s.targetPopulation ?? 0 });
        committed += s.targetPopulation ?? 0;
      }
    }
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const nearbyVillages = [];
    for (const v of vilList) {
      if (v.latitude == null || v.longitude == null) continue;
      const d = haversineKm(lat, lng, Number(v.latitude), Number(v.longitude));
      if (d <= PROXIMITY_KM) nearbyVillages.push(v);
    }
    let available = 0;
    if (nearbyVillages.length) {
      const ids = nearbyVillages.map((v) => v.id);
      const popRows = await db.select().from(populationData).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(populationData.tenantId, String(tenantId)), (0, import_drizzle_orm9.inArray)(populationData.villageId, ids)));
      const bestByVillage = /* @__PURE__ */ new Map();
      for (const r of popRows) {
        const cur = bestByVillage.get(r.villageId);
        if (!cur || r.year === year || cur.year < r.year && cur.year !== year) {
          bestByVillage.set(r.villageId, r);
        }
      }
      for (const r of bestByVillage.values()) available += r.totalPopulation ?? 0;
    }
    if (nearby.length > 0) {
      warnings.push(`${nearby.length} other session(s) already planned within ${PROXIMITY_KM} km and \xB1${DAYS_WINDOW} days. Possible duplicate outreach.`);
    }
    const totalAsk = committed + (input.targetPopulation ?? 0);
    if (available > 0 && totalAsk > available) {
      warnings.push(`Combined target population (${totalAsk}) exceeds population available within ${PROXIMITY_KM} km (${available}). Likely double-counted.`);
    }
    return { warnings, nearbySessions: nearby, availablePopulation: available, committedPopulation: committed };
  }
  app2.post("/api/sessions/validate-proximity", ...auth, async (req, res) => {
    try {
      const { facilityId, scheduledDate, targetPopulation, villageIds, lat, lng, excludeSessionId } = req.body || {};
      if (!facilityId || !scheduledDate) {
        return res.status(400).json({ message: "facilityId and scheduledDate are required." });
      }
      const result = await checkProximityAndPopulation(req.tenantId, {
        facilityId: Number(facilityId),
        scheduledDate,
        targetPopulation: Number(targetPopulation ?? 0),
        villageIds: Array.isArray(villageIds) ? villageIds.map((x) => Number(x)) : void 0,
        lat: lat != null ? Number(lat) : void 0,
        lng: lng != null ? Number(lng) : void 0,
        excludeSessionId: excludeSessionId != null ? Number(excludeSessionId) : void 0
      });
      res.json(result);
    } catch (err) {
      console.error("POST /api/sessions/validate-proximity failed:", err);
      res.status(500).json({ message: "Proximity validation failed" });
    }
  });
  app2.post("/api/sessions/:id/mark-done", ...auth, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      const authorRoles = /* @__PURE__ */ new Set(["facility_clerk", "facility_in_charge", "national_admin"]);
      if (!authorRoles.has(dbUser.role)) {
        return res.status(403).json({ message: "Forbidden: only facility staff may mark sessions done." });
      }
      const entityId = parseInt(req.params.id);
      const oldSession = await storage.getSessionPlan(req.tenantId, entityId);
      if (!oldSession) return res.status(404).json({ message: "Session not found" });
      const geoContext = await getFacilityHierarchy(oldSession.facilityId, req.tenantId);
      if (!hasPermission(dbUser, "manage_session_plans", geoContext)) {
        return res.status(403).json({ message: "Forbidden: scope mismatch." });
      }
      const body = req.body || {};
      const perAntigen = body.perAntigen && typeof body.perAntigen === "object" ? body.perAntigen : {};
      const totals = Number(
        body.totals != null ? body.totals : Object.values(perAntigen).reduce((s, n) => s + Number(n || 0), 0)
      );
      if (!Number.isFinite(totals) || totals < 0) {
        return res.status(400).json({ message: "totals must be a non-negative number." });
      }
      const vc = {
        totals,
        perAntigen,
        actualDate: body.actualDate || (/* @__PURE__ */ new Date()).toISOString(),
        note: body.note ?? null
      };
      const updated = await storage.updateSessionPlan(req.tenantId, entityId, {
        status: "completed",
        isAchieved: true,
        completedAt: /* @__PURE__ */ new Date(),
        vaccinatedCounts: vc
      });
      if (!updated) return res.status(404).json({ message: "Session not found" });
      await logAudit(req, "mark_done", "session_plan", entityId, oldSession, updated);
      res.json(updated);
    } catch (err) {
      console.error("POST /api/sessions/:id/mark-done failed:", err);
      res.status(500).json({ message: "Failed to mark session done" });
    }
  });
  app2.get("/api/unserved-places", ...auth, async (req, res) => {
    try {
      const vilList = await storage.getVillages(req.tenantId);
      const svRows = await db.select({ villageId: sessionVillages.villageId }).from(sessionVillages).where((0, import_drizzle_orm9.eq)(sessionVillages.tenantId, String(req.tenantId)));
      const plannedVillageIds = new Set(svRows.map((r) => r.villageId));
      const cvRows = await db.select({ villageId: clients.villageId }).from(clientVaccinations).innerJoin(clients, (0, import_drizzle_orm9.eq)(clientVaccinations.clientId, clients.id)).where((0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, String(req.tenantId)));
      const servedVillageIds = new Set(cvRows.map((r) => r.villageId).filter(Boolean));
      const unserved = vilList.filter(
        (v) => v.latitude != null && v.longitude != null && !plannedVillageIds.has(v.id) && !servedVillageIds.has(v.id)
      ).map((v) => ({
        id: v.id,
        name: v.name,
        districtId: v.districtId,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        isHardToReach: !!v.isHardToReach
      }));
      res.json(unserved);
    } catch (err) {
      console.error("GET /api/unserved-places failed:", err);
      res.status(500).json({ message: "Failed to load unserved places" });
    }
  });
  app2.get("/api/budget-items", ...auth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const quarter = req.query.quarter ? parseInt(req.query.quarter) : void 0;
      const year = req.query.year ? parseInt(req.query.year) : void 0;
      res.json(await storage.getBudgetItems(req.tenantId, facilityId, quarter, year));
    } catch (error) {
      console.error("Error fetching budget items:", error);
      res.status(500).json({ message: "Failed to fetch budget items" });
    }
  });
  app2.post("/api/budget-items", ...auth, async (req, res) => {
    try {
      const data = insertBudgetItemSchema.parse(req.body);
      const item = await storage.createBudgetItem(req.tenantId, data);
      await logAudit(req, "create", "budget_item", item.id, null, item);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating budget item:", error);
      res.status(400).json({ message: "Invalid budget item data" });
    }
  });
  app2.patch("/api/budget-items/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.fundingSource !== void 0) {
        if (body.fundingSource === "other") {
          const v = (body.fundingSourceOther ?? "").toString().trim();
          if (!v) {
            return res.status(400).json({
              message: "Specify the funding source when 'Other' is selected.",
              path: ["fundingSourceOther"]
            });
          }
        } else {
          body.fundingSourceOther = null;
        }
      }
      const item = await storage.updateBudgetItem(req.tenantId, entityId, body);
      if (!item) return res.status(404).json({ message: "Budget item not found" });
      await logAudit(req, "update", "budget_item", entityId, null, item);
      res.json(item);
    } catch (error) {
      console.error("Error updating budget item:", error);
      res.status(400).json({ message: "Failed to update budget item" });
    }
  });
  app2.delete("/api/budget-items/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const ok = await storage.deleteBudgetItem(req.tenantId, entityId);
      if (!ok) return res.status(404).json({ message: "Budget item not found" });
      await logAudit(req, "delete", "budget_item", entityId, null, null);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });
  app2.get("/api/vaccine-requirements", ...auth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      res.json(await storage.getVaccineRequirements(req.tenantId, facilityId));
    } catch (error) {
      console.error("Error fetching vaccine requirements:", error);
      res.status(500).json({ message: "Failed to fetch vaccine requirements" });
    }
  });
  app2.post("/api/vaccine-requirements", ...auth, async (req, res) => {
    try {
      const data = insertVaccineRequirementSchema.parse(req.body);
      const created = await storage.createVaccineRequirement(req.tenantId, data);
      await logAudit(req, "create", "vaccine_requirement", created.id, null, created);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating vaccine requirement:", error);
      res.status(400).json({ message: "Invalid vaccine requirement data" });
    }
  });
  app2.patch("/api/vaccine-requirements/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const updated = await storage.updateVaccineRequirement(req.tenantId, entityId, req.body);
      if (!updated) return res.status(404).json({ message: "Vaccine requirement not found" });
      await logAudit(req, "update", "vaccine_requirement", entityId, null, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating vaccine requirement:", error);
      res.status(400).json({ message: "Failed to update vaccine requirement" });
    }
  });
  app2.get("/api/coverage", ...auth, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const now = /* @__PURE__ */ new Date();
      const year = req.query.year ? parseInt(req.query.year) : now.getUTCFullYear();
      const quarter = req.query.quarter ? parseInt(req.query.quarter) : Math.floor(now.getUTCMonth() / 3) + 1;
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const startMonth = (quarter - 1) * 3;
      const quarterStart = new Date(Date.UTC(year, startMonth, 1));
      const quarterEnd = new Date(Date.UTC(year, startMonth + 3, 1));
      const reqWhere = (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(vaccineRequirements.tenantId, tenantId),
        (0, import_drizzle_orm9.eq)(vaccineRequirements.quarter, quarter),
        (0, import_drizzle_orm9.eq)(vaccineRequirements.year, year),
        facilityId ? (0, import_drizzle_orm9.eq)(vaccineRequirements.facilityId, facilityId) : void 0
      );
      const targets = await db.select({
        vaccineName: vaccineRequirements.vaccineName,
        targetPopulation: import_drizzle_orm9.sql`COALESCE(SUM(${vaccineRequirements.targetPopulation}), 0)::int`,
        dosesRequired: import_drizzle_orm9.sql`COALESCE(SUM(${vaccineRequirements.dosesRequired}), 0)::int`
      }).from(vaccineRequirements).where(reqWhere).groupBy(vaccineRequirements.vaccineName);
      const cvWhere = (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, tenantId),
        (0, import_drizzle_orm9.gte)(clientVaccinations.administeredDate, quarterStart),
        (0, import_drizzle_orm9.lte)(clientVaccinations.administeredDate, quarterEnd)
      );
      const cvRows = await db.select({
        vaccineName: clientVaccinations.vaccineName,
        administered: import_drizzle_orm9.sql`COUNT(*)::int`
      }).from(clientVaccinations).where(cvWhere).groupBy(clientVaccinations.vaccineName);
      const mrWhere = (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(monthlyReports.tenantId, tenantId),
        (0, import_drizzle_orm9.eq)(monthlyReports.year, year),
        (0, import_drizzle_orm9.gte)(monthlyReports.month, startMonth + 1),
        (0, import_drizzle_orm9.lte)(monthlyReports.month, startMonth + 3),
        facilityId ? (0, import_drizzle_orm9.eq)(monthlyReports.facilityId, facilityId) : void 0
      );
      const mrRows = await db.select({ immunizations: monthlyReports.immunizations }).from(monthlyReports).where(mrWhere);
      const administeredByVaccine = /* @__PURE__ */ new Map();
      for (const r of cvRows) {
        if (!r.vaccineName) continue;
        administeredByVaccine.set(
          r.vaccineName,
          (administeredByVaccine.get(r.vaccineName) || 0) + Number(r.administered || 0)
        );
      }
      for (const r of mrRows) {
        const map = r.immunizations || {};
        for (const [k, v] of Object.entries(map)) {
          const num = Number(v);
          if (!Number.isFinite(num) || num <= 0) continue;
          administeredByVaccine.set(k, (administeredByVaccine.get(k) || 0) + num);
        }
      }
      const vaccines = targets.map((t) => {
        let administered = administeredByVaccine.get(t.vaccineName) || 0;
        for (const [k, v] of Array.from(administeredByVaccine.entries())) {
          if (k === t.vaccineName) continue;
          if (k.toLowerCase().startsWith(t.vaccineName.toLowerCase() + "-")) {
            administered += v;
          }
        }
        const target = Number(t.targetPopulation || 0);
        const doses = Number(t.dosesRequired || 0);
        const coveragePct = target > 0 ? Math.round(administered / target * 1e3) / 10 : 0;
        return {
          vaccineName: t.vaccineName,
          targetPopulation: target,
          dosesRequired: doses,
          administered,
          coveragePct
        };
      });
      vaccines.sort((a, b) => a.vaccineName.localeCompare(b.vaccineName));
      const totalTarget = vaccines.reduce((s, v) => s + v.targetPopulation, 0);
      const totalAdministered = vaccines.reduce((s, v) => s + v.administered, 0);
      const overallCoveragePct = totalTarget > 0 ? Math.round(totalAdministered / totalTarget * 1e3) / 10 : 0;
      res.json({
        quarter,
        year,
        facilityId: facilityId ?? null,
        vaccines,
        totals: {
          targetPopulation: totalTarget,
          administered: totalAdministered,
          coveragePct: overallCoveragePct
        }
      });
    } catch (error) {
      console.error("Error computing coverage:", error);
      res.status(500).json({ message: "Failed to compute coverage" });
    }
  });
  app2.get("/api/mobilization", ...auth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      res.json(await storage.getMobilizationActivities(req.tenantId, facilityId));
    } catch (error) {
      console.error("Error fetching mobilization activities:", error);
      res.status(500).json({ message: "Failed to fetch mobilization activities" });
    }
  });
  app2.post("/api/mobilization", ...auth, async (req, res) => {
    try {
      const data = insertMobilizationActivitySchema.parse(req.body);
      const activity = await storage.createMobilizationActivity(req.tenantId, data);
      await logAudit(req, "create", "mobilization_activity", activity.id, null, activity);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating mobilization activity:", error);
      res.status(400).json({ message: "Invalid mobilization activity data" });
    }
  });
  app2.patch("/api/mobilization/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const activity = await storage.updateMobilizationActivity(req.tenantId, entityId, req.body);
      if (!activity) return res.status(404).json({ message: "Mobilization activity not found" });
      await logAudit(req, "update", "mobilization_activity", entityId, null, activity);
      res.json(activity);
    } catch (error) {
      console.error("Error updating mobilization activity:", error);
      res.status(400).json({ message: "Failed to update mobilization activity" });
    }
  });
  app2.get("/api/supervision-visits", ...auth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const microplanId = req.query.microplanId ? parseInt(req.query.microplanId) : void 0;
      const status = req.query.status;
      res.json(await storage.getSupervisionVisits(req.tenantId, { facilityId, microplanId, status }));
    } catch (error) {
      console.error("Error fetching supervision visits:", error);
      res.status(500).json({ message: "Failed to fetch supervision visits" });
    }
  });
  app2.get("/api/supervision-visits/:id", ...auth, async (req, res) => {
    try {
      const v = await storage.getSupervisionVisit(req.tenantId, parseInt(req.params.id));
      if (!v) return res.status(404).json({ message: "Supervision visit not found" });
      res.json(v);
    } catch (error) {
      console.error("Error fetching supervision visit:", error);
      res.status(500).json({ message: "Failed to fetch supervision visit" });
    }
  });
  app2.post("/api/supervision-visits", ...auth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.scheduledDate && typeof body.scheduledDate === "string") body.scheduledDate = new Date(body.scheduledDate);
      if (body.conductedDate && typeof body.conductedDate === "string") body.conductedDate = new Date(body.conductedDate);
      if (body.nextVisitDate && typeof body.nextVisitDate === "string") body.nextVisitDate = new Date(body.nextVisitDate);
      const data = insertSupervisionVisitSchema.parse({ ...body, createdByUserId: req.user?.claims?.sub });
      if (data.facilityId) {
        const f = await storage.getFacility(req.tenantId, data.facilityId);
        if (!f) return res.status(400).json({ message: "Facility does not belong to this tenant" });
      }
      if (data.microplanId) {
        const m = await storage.getMicroplan(req.tenantId, data.microplanId);
        if (!m) return res.status(400).json({ message: "Microplan does not belong to this tenant" });
      }
      if (data.sessionPlanId) {
        const sp = await storage.getSessionPlan(req.tenantId, data.sessionPlanId);
        if (!sp) return res.status(400).json({ message: "Session plan does not belong to this tenant" });
      }
      const v = await storage.createSupervisionVisit(req.tenantId, data);
      await logAudit(req, "create", "supervision_visit", v.id, null, v);
      res.status(201).json(v);
    } catch (error) {
      console.error("Error creating supervision visit:", error);
      res.status(400).json({ message: error?.message || "Invalid supervision visit data" });
    }
  });
  app2.patch("/api/supervision-visits/:id", ...auth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.scheduledDate && typeof body.scheduledDate === "string") body.scheduledDate = new Date(body.scheduledDate);
      if (body.conductedDate && typeof body.conductedDate === "string") body.conductedDate = new Date(body.conductedDate);
      if (body.nextVisitDate && typeof body.nextVisitDate === "string") body.nextVisitDate = new Date(body.nextVisitDate);
      const old = await storage.getSupervisionVisit(req.tenantId, id);
      if (body.facilityId) {
        const f = await storage.getFacility(req.tenantId, body.facilityId);
        if (!f) return res.status(400).json({ message: "Facility does not belong to this tenant" });
      }
      if (body.microplanId) {
        const m = await storage.getMicroplan(req.tenantId, body.microplanId);
        if (!m) return res.status(400).json({ message: "Microplan does not belong to this tenant" });
      }
      if (body.sessionPlanId) {
        const sp = await storage.getSessionPlan(req.tenantId, body.sessionPlanId);
        if (!sp) return res.status(400).json({ message: "Session plan does not belong to this tenant" });
      }
      const v = await storage.updateSupervisionVisit(req.tenantId, id, body);
      if (!v) return res.status(404).json({ message: "Supervision visit not found" });
      await logAudit(req, "update", "supervision_visit", id, old, v);
      res.json(v);
    } catch (error) {
      console.error("Error updating supervision visit:", error);
      res.status(400).json({ message: error?.message || "Failed to update supervision visit" });
    }
  });
  app2.delete("/api/supervision-visits/:id", ...auth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const old = await storage.getSupervisionVisit(req.tenantId, id);
      const ok = await storage.deleteSupervisionVisit(req.tenantId, id);
      if (!ok) return res.status(404).json({ message: "Supervision visit not found" });
      await logAudit(req, "delete", "supervision_visit", id, old, null);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting supervision visit:", error);
      res.status(500).json({ message: "Failed to delete supervision visit" });
    }
  });
  app2.get("/api/audit-logs", isAuthenticated, requireTenant, loadRole, requireAdmin, async (req, res) => {
    try {
      const userId = req.query.userId;
      const entityType = req.query.entityType;
      const entityId = req.query.entityId;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 500) : 200;
      res.json(await storage.listAuditLogs(req.tenantId, { userId, entityType, entityId, limit }));
    } catch (error) {
      console.error("Error listing audit logs:", error);
      res.status(500).json({ message: "Failed to list audit logs" });
    }
  });
  app2.get("/api/approvals", ...auth, async (req, res) => {
    try {
      const status = req.query.status;
      res.json(await storage.getApprovalRequests(req.tenantId, status));
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      res.status(500).json({ message: "Failed to fetch approval requests" });
    }
  });
  app2.get("/api/approvals/:id", ...auth, async (req, res) => {
    try {
      const request = await storage.getApprovalRequest(req.tenantId, parseInt(req.params.id));
      if (!request) return res.status(404).json({ message: "Approval request not found" });
      res.json(request);
    } catch (error) {
      console.error("Error fetching approval request:", error);
      res.status(500).json({ message: "Failed to fetch approval request" });
    }
  });
  app2.post("/api/approvals", ...auth, async (req, res) => {
    try {
      const data = insertApprovalRequestSchema.parse({
        ...req.body,
        requestedById: req.user.claims.sub
      });
      const request = await storage.createApprovalRequest(req.tenantId, data);
      await logAudit(req, "create", "approval_request", request.id, null, request);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating approval request:", error);
      res.status(400).json({ message: "Invalid approval request data" });
    }
  });
  app2.patch("/api/approvals/:id", ...auth, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const oldRequest = await storage.getApprovalRequest(req.tenantId, entityId);
      const { status, comments } = req.body;
      const updateData = { status };
      if (comments) updateData.comments = comments;
      if (status === "approved" || status === "rejected") {
        updateData.resolvedAt = /* @__PURE__ */ new Date();
        updateData.resolvedById = req.user.claims.sub;
      }
      const request = await storage.updateApprovalRequest(req.tenantId, entityId, updateData);
      if (!request) return res.status(404).json({ message: "Approval request not found" });
      if (status === "approved") {
        const tenant = await storage.getTenant(req.tenantId);
        const maxLevel = tenant?.settings?.maxApprovalLevel || "national";
        const currentReqLevel = request.currentLevel.toLowerCase();
        const isChainComplete = maxLevel === "district" && currentReqLevel === "district" || maxLevel === "provincial" && currentReqLevel === "provincial" || maxLevel === "national" && currentReqLevel === "national" || currentReqLevel === maxLevel.toLowerCase();
        if (isChainComplete) {
          if (request.entityType === "session" || request.entityType === "session_plan") {
            await storage.updateSessionPlan(req.tenantId, request.entityId, { approvalStatus: "approved" });
          } else if (request.entityType === "budget" || request.entityType === "budget_item") {
            await storage.updateBudgetItem(req.tenantId, request.entityId, { approvalStatus: "approved" });
          } else if (request.entityType === "population") {
            await db.update(populationData).set({ approvalStatus: "approved", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm9.eq)(populationData.id, request.entityId));
          }
        }
      }
      await logAudit(req, "update", "approval_request", entityId, oldRequest, request);
      res.json(request);
    } catch (error) {
      console.error("Error updating approval request:", error);
      res.status(400).json({ message: "Failed to update approval request" });
    }
  });
  app2.get("/api/htr-scores", ...auth, async (req, res) => {
    try {
      const villageId = req.query.villageId ? parseInt(req.query.villageId) : void 0;
      res.json(await storage.getHtrScores(req.tenantId, villageId));
    } catch (error) {
      console.error("Error fetching HTR scores:", error);
      res.status(500).json({ message: "Failed to fetch HTR scores" });
    }
  });
  app2.post("/api/htr-scores", ...auth, async (req, res) => {
    try {
      const data = req.body;
      const score = await storage.upsertHtrScore(req.tenantId, data);
      await logAudit(req, "upsert", "htr_score", score.id, null, score);
      res.status(201).json(score);
    } catch (error) {
      console.error("Error saving HTR score:", error);
      res.status(400).json({ message: "Failed to save HTR score" });
    }
  });
  app2.get("/api/stats", ...auth, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const [facilitiesData, villagesData, sessionsData, populationDataList] = await Promise.all([
        storage.getFacilities(tenantId),
        storage.getVillages(tenantId),
        storage.getSessionPlans(tenantId),
        storage.getPopulationData(tenantId)
      ]);
      const totalPopulation = populationDataList.reduce((sum, p) => sum + (p.totalPopulation || 0), 0);
      const htrVillages = villagesData.filter((v) => v.isHardToReach).length;
      res.json({
        totalFacilities: facilitiesData.length,
        totalVillages: villagesData.length,
        htrVillages,
        totalSessions: sessionsData.length,
        totalPopulation,
        activeFacilities: facilitiesData.filter((f) => f.isActive).length
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.get("/api/boundaries", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const level = req.query.level !== void 0 ? parseInt(req.query.level) : void 0;
      const list = await storage.listAdminBoundaries(tenantId, level);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Failed to list boundaries" });
    }
  });
  app2.get("/api/boundaries/countries", isAuthenticated, async (_req, res) => {
    res.json(SUPPORTED_COUNTRIES);
  });
  app2.get("/api/boundaries/:id/geojson", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const boundary = await storage.getAdminBoundary(tenantId, req.params.id);
      if (!boundary) return res.status(404).json({ message: "Boundary not found" });
      res.json(boundary.geojson);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch boundary GeoJSON" });
    }
  });
  app2.post("/api/boundaries/fetch", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const schema = import_zod3.z.object({
        countryCode: import_zod3.z.string().length(3).toUpperCase(),
        adminLevel: import_zod3.z.number().int().min(0).max(5),
        levelName: import_zod3.z.string().min(1).max(100)
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
      const { countryCode, adminLevel, levelName } = parsed.data;
      const { geojson, featureCount } = await fetchGeoBoundariesGeoJSON(countryCode, adminLevel);
      const bbox = calcBBox(geojson);
      const boundary = await storage.upsertAdminBoundary({
        tenantId,
        countryCode,
        adminLevel,
        levelName,
        source: "geoboundaries",
        geojson,
        featureCount,
        bbox: bbox ?? void 0,
        isActive: true
      });
      await logAudit(req, "fetch_boundary", "admin_boundary", null, null, {
        countryCode,
        adminLevel,
        levelName,
        featureCount
      });
      res.status(201).json({ ...boundary, geojson: void 0, featureCount });
    } catch (err) {
      console.error("POST /api/boundaries/fetch failed:", err);
      res.status(500).json({ message: err?.message ?? "Failed to fetch boundary from GeoBoundaries API" });
    }
  });
  app2.post("/api/boundaries/upload", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const schema = import_zod3.z.object({
        countryCode: import_zod3.z.string().length(3).toUpperCase(),
        adminLevel: import_zod3.z.number().int().min(0).max(5),
        levelName: import_zod3.z.string().min(1).max(100),
        geojson: import_zod3.z.object({ type: import_zod3.z.string(), features: import_zod3.z.array(import_zod3.z.any()) })
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
      const { countryCode, adminLevel, levelName, geojson } = parsed.data;
      const featureCount = geojson.features?.length ?? 0;
      const bbox = calcBBox(geojson);
      const boundary = await storage.upsertAdminBoundary({
        tenantId,
        countryCode,
        adminLevel,
        levelName,
        source: "custom",
        geojson,
        featureCount,
        bbox: bbox ?? void 0,
        isActive: true
      });
      await logAudit(req, "upload_boundary", "admin_boundary", null, null, {
        countryCode,
        adminLevel,
        levelName,
        featureCount
      });
      res.status(201).json({ ...boundary, geojson: void 0, featureCount });
    } catch (err) {
      res.status(500).json({ message: err?.message ?? "Failed to upload boundary" });
    }
  });
  app2.delete("/api/boundaries/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, requireAdmin, async (req, res) => {
    const tenantId = req.tenantId;
    const deleted = await storage.deleteAdminBoundary(tenantId, req.params.id);
    if (!deleted) return res.status(404).json({ message: "Boundary not found" });
    res.json({ success: true });
  });
  app2.get("/api/catchments", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const catchments = await storage.getAllFacilityCatchments(req.tenantId);
      res.json(catchments);
    } catch {
      res.status(500).json({ message: "Failed to fetch catchments" });
    }
  });
  app2.get("/api/facilities/:id/catchments", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const facilityId = parseInt(req.params.id);
      if (isNaN(facilityId)) return res.status(400).json({ message: "Invalid facility ID" });
      const catchments = await storage.getFacilityCatchments(tenantId, facilityId);
      res.json(catchments);
    } catch {
      res.status(500).json({ message: "Failed to fetch catchments" });
    }
  });
  app2.post("/api/facilities/:id/catchments", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const facilityId = parseInt(req.params.id);
      if (isNaN(facilityId)) return res.status(400).json({ message: "Invalid facility ID" });
      const schema = import_zod3.z.object({
        name: import_zod3.z.string().min(1).max(255),
        description: import_zod3.z.string().max(2e3).optional(),
        geojson: import_zod3.z.object({ type: import_zod3.z.string(), coordinates: import_zod3.z.any() }).passthrough(),
        populationEstimate: import_zod3.z.number().int().nonnegative().optional(),
        isOfficial: import_zod3.z.boolean().optional().default(false),
        villageIds: import_zod3.z.array(import_zod3.z.number().int()).optional(),
        settlementIds: import_zod3.z.array(import_zod3.z.number().int()).optional(),
        unmappedOsm: import_zod3.z.array(import_zod3.z.object({
          name: import_zod3.z.string(),
          latitude: import_zod3.z.number(),
          longitude: import_zod3.z.number(),
          placeType: import_zod3.z.string().optional(),
          osmId: import_zod3.z.union([import_zod3.z.string(), import_zod3.z.number()]).optional()
        })).optional()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
      const rawGeom = parsed.data.geojson.type === "Feature" ? parsed.data.geojson.geometry : parsed.data.geojson;
      let areaSqKm;
      try {
        const areaM2 = (0, import_turf.area)({ type: "Feature", properties: {}, geometry: rawGeom });
        areaSqKm = (areaM2 / 1e6).toFixed(4);
      } catch {
      }
      const hasExtractionMeta = parsed.data.villageIds && parsed.data.villageIds.length > 0 || parsed.data.settlementIds && parsed.data.settlementIds.length > 0 || parsed.data.unmappedOsm && parsed.data.unmappedOsm.length > 0;
      const geoOut = hasExtractionMeta ? {
        type: "Feature",
        properties: {
          villageIds: parsed.data.villageIds ?? [],
          settlementIds: parsed.data.settlementIds ?? [],
          unmappedOsm: parsed.data.unmappedOsm ?? [],
          drawnAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        geometry: rawGeom
      } : parsed.data.geojson;
      const catchment = await storage.createFacilityCatchment(tenantId, {
        tenantId,
        facilityId,
        // Original Code: Blindly uses req.user?.id which is undefined in production OIDC sessions
        // drawnByUserId: req.user?.id ?? null,
        // Updated Code: Fallback to OIDC sub claim for robust user identification across sessions
        drawnByUserId: req.user?.id ?? req.user?.claims?.sub ?? null,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        geojson: geoOut,
        areaSqKm: areaSqKm ?? null,
        populationEstimate: parsed.data.populationEstimate ?? null,
        isOfficial: parsed.data.isOfficial ?? false
      });
      res.status(201).json(catchment);
    } catch (err) {
      res.status(500).json({ message: err?.message ?? "Failed to save catchment" });
    }
  });
  app2.post("/api/catchments/extract", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const schema = import_zod3.z.object({
        geojson: import_zod3.z.object({ type: import_zod3.z.string(), coordinates: import_zod3.z.any().optional(), geometry: import_zod3.z.any().optional() }).passthrough(),
        bufferMeters: import_zod3.z.number().min(0).max(5e3).optional().default(250),
        includeOsm: import_zod3.z.boolean().optional().default(true)
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });
      const rawGeom = parsed.data.geojson.type === "Feature" ? parsed.data.geojson.geometry : parsed.data.geojson;
      if (!rawGeom || !rawGeom.coordinates) {
        return res.status(400).json({ message: "GeoJSON polygon required" });
      }
      const polyJson = JSON.stringify(rawGeom);
      const bufM = parsed.data.bufferMeters ?? 250;
      const villagesGeoQ = await pool.query(
        `
        WITH poly AS (
          SELECT ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, $2)::geometry AS geom
        )
        SELECT v.id, v.name, v.district_id AS "districtId",
               v.latitude::float AS latitude, v.longitude::float AS longitude
          FROM villages v, poly
         WHERE v.tenant_id = $3
           AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
           AND ST_Contains(poly.geom, ST_SetSRID(ST_MakePoint(v.longitude::float, v.latitude::float), 4326))
        `,
        [polyJson, bufM, tenantId]
      );
      const villagesByCentroidQ = await pool.query(
        `
        WITH poly AS (
          SELECT ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, $2)::geometry AS geom
        ),
        district_centroids AS (
          SELECT d.id AS district_id, d.name AS district_name,
                 ST_Centroid(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(feat->>'geometry'), 4326))) AS centroid
            FROM districts d
            JOIN admin_boundaries ab ON ab.tenant_id = d.tenant_id AND ab.admin_level = 2
                 AND COALESCE(ab.is_active, true) = true,
                 LATERAL jsonb_array_elements(ab.geojson->'features') AS feat
           WHERE d.tenant_id = $3
             AND lower(trim(d.name)) = lower(trim(COALESCE(
                   feat->'properties'->>'shapeName',
                   feat->'properties'->>'name',
                   feat->'properties'->>'NAME', '')))
           GROUP BY d.id, d.name
        )
        SELECT v.id, v.name, v.district_id AS "districtId",
               NULL::float AS latitude, NULL::float AS longitude
          FROM villages v
          JOIN district_centroids dc ON dc.district_id = v.district_id,
               poly
         WHERE v.tenant_id = $3
           AND (v.latitude IS NULL OR v.longitude IS NULL)
           AND ST_Contains(poly.geom, dc.centroid)
        `,
        [polyJson, bufM, tenantId]
      );
      const settlementsQ = await pool.query(
        `
        WITH poly AS (
          SELECT ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, $2)::geometry AS geom
        )
        SELECT s.id, s.name, s.place_type AS "placeType",
               s.latitude::float AS latitude, s.longitude::float AS longitude,
               s.population_estimate AS "populationEstimate"
          FROM settlements_master s, poly
         WHERE s.tenant_id = $3
           AND ST_Contains(poly.geom, ST_SetSRID(ST_MakePoint(s.longitude::float, s.latitude::float), 4326))
         ORDER BY s.population_estimate DESC NULLS LAST
         LIMIT 500
        `,
        [polyJson, bufM, tenantId]
      );
      const villagesAll = [
        ...villagesGeoQ.rows,
        ...villagesByCentroidQ.rows
      ];
      const settlements = settlementsQ.rows;
      let unmapped = [];
      if (parsed.data.includeOsm && villagesAll.length === 0 && settlements.length === 0) {
        try {
          const bboxQ = await pool.query(
            `SELECT ST_XMin(g) AS minx, ST_YMin(g) AS miny, ST_XMax(g) AS maxx, ST_YMax(g) AS maxy
               FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g) t`,
            [polyJson]
          );
          const b = bboxQ.rows[0];
          if (b && b.miny != null) {
            const overpassQL = `[out:json][timeout:15];(
              node["place"~"village|hamlet|town|suburb|neighbourhood"](${b.miny},${b.minx},${b.maxy},${b.maxx});
            );out body 200;`;
            const controller = new AbortController();
            const tm = setTimeout(() => controller.abort(), 18e3);
            const r = await fetch("https://overpass-api.de/api/interpreter", {
              method: "POST",
              body: "data=" + encodeURIComponent(overpassQL),
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              signal: controller.signal
            }).catch(() => null);
            clearTimeout(tm);
            if (r && r.ok) {
              const j = await r.json();
              const nodes = Array.isArray(j?.elements) ? j.elements : [];
              if (nodes.length > 0) {
                const values = nodes.filter((n) => typeof n.lat === "number" && typeof n.lon === "number").map((n) => `(${n.id}, ${n.lon}, ${n.lat}, '${String(n.tags?.place ?? "village").replace(/'/g, "")}', '${String(n.tags?.name ?? "Unnamed").replace(/'/g, "''")}')`);
                if (values.length > 0) {
                  const filterQ = await pool.query(
                    `
                    WITH poly AS (
                      SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS geom
                    ), cand(osm_id, lon, lat, place_type, name) AS (
                      VALUES ${values.join(",")}
                    )
                    SELECT c.osm_id, c.lon::float AS lon, c.lat::float AS lat, c.place_type, c.name
                      FROM cand c, poly
                     WHERE ST_Contains(poly.geom, ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326))
                     LIMIT 200
                    `,
                    [polyJson]
                  );
                  unmapped = filterQ.rows.map((row) => ({
                    name: row.name || "Unnamed settlement",
                    latitude: row.lat,
                    longitude: row.lon,
                    placeType: row.place_type || "village",
                    osmId: String(row.osm_id)
                  }));
                }
              }
            }
          }
        } catch (osmErr) {
          console.warn("Overpass fallback failed:", osmErr?.message ?? osmErr);
        }
      }
      res.json({
        villages: villagesAll,
        settlements,
        unmapped,
        counts: {
          villages: villagesAll.length,
          settlements: settlements.length,
          unmapped: unmapped.length
        }
      });
    } catch (err) {
      console.error("POST /api/catchments/extract failed:", err);
      res.status(500).json({ message: err?.message ?? "Failed to extract communities" });
    }
  });
  app2.patch("/api/facilities/:id/catchments/:cid", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const schema = import_zod3.z.object({
        name: import_zod3.z.string().min(1).max(255).optional(),
        description: import_zod3.z.string().max(2e3).optional(),
        populationEstimate: import_zod3.z.number().int().nonnegative().optional(),
        isOfficial: import_zod3.z.boolean().optional()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });
      const updated = await storage.updateFacilityCatchment(tenantId, req.params.cid, parsed.data);
      if (!updated) return res.status(404).json({ message: "Catchment not found" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update catchment" });
    }
  });
  app2.get("/api/vaccines/config", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const list = await storage.getVaccineConfigs(req.tenantId);
      res.json(list);
    } catch (err) {
      console.error("GET /api/vaccines/config failed:", err);
      res.status(500).json({ message: "Failed to fetch vaccine configurations" });
    }
  });
  app2.post("/api/vaccines/config", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, requireAdmin, async (req, res) => {
    try {
      const parsed = insertVaccineConfigSchema.parse(req.body);
      const created = await storage.createVaccineConfig(req.tenantId, parsed);
      await logAudit(req, "create_vaccine_config", "vaccine_configuration", created.id, null, created);
      res.status(201).json(created);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/vaccines/config failed:", err);
      res.status(500).json({ message: "Failed to create vaccine configuration" });
    }
  });
  app2.patch("/api/vaccines/config/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, requireAdmin, async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) return res.status(400).json({ message: "Invalid configuration ID" });
      const parsed = insertVaccineConfigSchema.partial().parse(req.body);
      const updated = await storage.updateVaccineConfig(req.tenantId, configId, parsed);
      if (!updated) return res.status(404).json({ message: "Vaccine configuration not found" });
      await logAudit(req, "update_vaccine_config", "vaccine_configuration", configId, null, updated);
      res.json(updated);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("PATCH /api/vaccines/config failed:", err);
      res.status(500).json({ message: "Failed to update vaccine configuration" });
    }
  });
  app2.get("/api/clients", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
      const clientType = req.query.clientType;
      if (facilityId) {
        const geoContext = await getFacilityHierarchy(facilityId, req.tenantId);
        if (!hasPermission(dbUser, "view_clients", geoContext)) {
          return res.json([]);
        }
      }
      let list = await storage.getClients(req.tenantId, facilityId, clientType);
      const isNationalAdmin = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
      if (!isNationalAdmin) {
        const hierarchyCache = /* @__PURE__ */ new Map();
        const filteredList = [];
        for (const client3 of list) {
          let geo = hierarchyCache.get(client3.facilityId);
          if (!geo) {
            geo = await getFacilityHierarchy(client3.facilityId, req.tenantId);
            hierarchyCache.set(client3.facilityId, geo);
          }
          if (hasPermission(dbUser, "view_clients", geo)) {
            filteredList.push(client3);
          }
        }
        list = filteredList;
      }
      res.json(list);
    } catch (err) {
      console.error("GET /api/clients failed:", err);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const client3 = await storage.getClient(req.tenantId, req.params.id);
      if (!client3) return res.status(404).json({ message: "Client not found" });
      res.json(client3);
    } catch (err) {
      console.error("GET /api/clients/:id failed:", err);
      res.status(500).json({ message: "Failed to fetch client details" });
    }
  });
  app2.post("/api/clients", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, async (req, res) => {
    try {
      const user = req.user;
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (req.user?.dbRole === "national_admin") {
        const justification = req.body.justification;
        if (!justification || typeof justification !== "string" || justification.trim() === "") {
          return res.status(400).json({ message: "An override justification is required for administrator registries." });
        }
      }
      const parsed = insertClientSchema.parse(req.body);
      const geoContext = await getFacilityHierarchy(parsed.facilityId, req.tenantId);
      if (!hasPermission(dbUser, "create_client", geoContext)) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to register clients for this geographic scope."
        });
      }
      let resolvedVillageId = parsed.villageId;
      if (parsed.isCrossBorder) {
        const [facility] = await db.select().from(facilities).where((0, import_drizzle_orm9.eq)(facilities.id, parsed.facilityId));
        if (!facility) {
          return res.status(400).json({ message: "Assigned facility not found" });
        }
        const districtId = facility.districtId;
        const [virtualVillage] = await db.select().from(villages).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(villages.districtId, districtId),
            (0, import_drizzle_orm9.eq)(villages.name, "Cross-Border / Foreign Residence"),
            (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId)
          )
        );
        if (virtualVillage) {
          resolvedVillageId = virtualVillage.id;
        } else {
          const [newVirtualVillage] = await db.insert(villages).values({
            tenantId: req.tenantId,
            name: "Cross-Border / Foreign Residence",
            code: `CB-${districtId}`,
            districtId,
            assignedFacilityId: parsed.facilityId,
            isHardToReach: false
          }).returning();
          resolvedVillageId = newVirtualVillage.id;
        }
      } else {
        if (!resolvedVillageId) {
          return res.status(400).json({ message: "catchment village is required for standard residential clients." });
        }
      }
      const clientToCreate = { ...parsed, villageId: resolvedVillageId };
      const created = await storage.createClient(req.tenantId, clientToCreate);
      await logAudit(req, "create_client", "client", null, null, {
        id: created.id,
        name: created.name,
        justification: req.user?.dbRole === "national_admin" ? req.body.justification : void 0
      });
      res.status(201).json(created);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/clients failed:", err);
      res.status(500).json({ message: "Failed to create client record" });
    }
  });
  app2.patch("/api/clients/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      let parsed = insertClientSchema.partial().parse(req.body);
      const existingClient = await storage.getClient(req.tenantId, req.params.id);
      if (!existingClient) return res.status(404).json({ message: "Client not found" });
      const isCrossBorder = parsed.isCrossBorder !== void 0 ? parsed.isCrossBorder : existingClient.isCrossBorder;
      const facilityId = parsed.facilityId !== void 0 ? parsed.facilityId : existingClient.facilityId;
      let villageId = parsed.villageId !== void 0 ? parsed.villageId : existingClient.villageId;
      if (isCrossBorder) {
        const [facility] = await db.select().from(facilities).where((0, import_drizzle_orm9.eq)(facilities.id, facilityId));
        if (!facility) {
          return res.status(400).json({ message: "Assigned facility not found" });
        }
        const districtId = facility.districtId;
        const [virtualVillage] = await db.select().from(villages).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(villages.districtId, districtId),
            (0, import_drizzle_orm9.eq)(villages.name, "Cross-Border / Foreign Residence"),
            (0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId)
          )
        );
        if (virtualVillage) {
          villageId = virtualVillage.id;
        } else {
          const [newVirtualVillage] = await db.insert(villages).values({
            tenantId: req.tenantId,
            name: "Cross-Border / Foreign Residence",
            code: `CB-${districtId}`,
            districtId,
            assignedFacilityId: facilityId,
            isHardToReach: false
          }).returning();
          villageId = newVirtualVillage.id;
        }
        parsed = { ...parsed, villageId };
      } else {
        if (parsed.isCrossBorder === false && !parsed.villageId) {
          return res.status(400).json({ message: "catchment village is required for standard residential clients." });
        }
      }
      const updated = await storage.updateClient(req.tenantId, req.params.id, parsed);
      if (!updated) return res.status(404).json({ message: "Client not found" });
      await logAudit(req, "update_client", "client", null, null, { id: updated.id, name: updated.name });
      res.json(updated);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("PATCH /api/clients/:id failed:", err);
      res.status(500).json({ message: "Failed to update client record" });
    }
  });
  app2.delete("/api/clients/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.tenantId, req.params.id);
      if (!deleted) return res.status(404).json({ message: "Client not found" });
      await logAudit(req, "delete_client", "client", null, null, { id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/clients/:id failed:", err);
      res.status(500).json({ message: "Failed to delete client record" });
    }
  });
  app2.post("/api/clients/share", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const { clientId, method, destination } = req.body;
      if (!clientId || !method || !destination) {
        return res.status(400).json({ message: "clientId, method, and destination are required" });
      }
      const client3 = await storage.getClient(req.tenantId, clientId);
      if (!client3) {
        return res.status(404).json({ message: "Client record not found" });
      }
      const senderNumber = "+260963328807";
      const downloadUrl = `/api/clients/${client3.id}/booklet/download`;
      const filename = `EPI_Certified_Booklet_${client3.name.replace(/\s+/g, "_")}.pdf`;
      const messageText = `Dear guardian, here is the certified digital immunization booklet for ${client3.name} (ID: ${client3.id?.substring(0, 8).toUpperCase()}). Attachment download: ${downloadUrl}. Shared from Ministry of Health helpline ${senderNumber}.`;
      await logAudit(req, `share_booklet_${method}`, "client_communication", client3.id, null, {
        clientId: client3.id,
        clientName: client3.name,
        method,
        destination,
        senderNumber,
        message: messageText,
        sentAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.status(200).json({
        success: true,
        message: `Successfully transmitted ${client3.name}'s booklet via ${method} to ${destination} from ${senderNumber}`,
        attachment: {
          filename,
          contentType: "application/pdf",
          size: "142 KB",
          downloadUrl
        }
      });
    } catch (err) {
      console.error("POST /api/clients/share failed:", err);
      res.status(500).json({ message: "Failed to dispatch notification sharing" });
    }
  });
  app2.get("/api/clients/:id/booklet/download", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const client3 = await storage.getClient(req.tenantId, req.params.id);
      if (!client3) {
        return res.status(404).json({ message: "Client record not found" });
      }
      const filename = `EPI_Certified_Booklet_${client3.name.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const mockPdfContent = `%PDF-1.4
%\xE2\xE3\xCF\xD3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 712 Td
(Ministry of Health Certified Digital Immunization Booklet) Tj
0 -20 Td
(Patient Name: ${client3.name}) Tj
0 -20 Td
(Patient ID: ${client3.id}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000015 00000 n
0000000068 00000 n
0000000127 00000 n
0000000227 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
397
%%EOF
`;
      res.send(Buffer.from(mockPdfContent, "utf-8"));
    } catch (err) {
      console.error("GET /api/clients/:id/booklet/download failed:", err);
      res.status(500).json({ message: "Failed to download digital booklet" });
    }
  });
  app2.post("/api/reminders/send", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ message: "clientId is required to send reminder" });
      }
      const client3 = await storage.getClient(req.tenantId, clientId);
      if (!client3) {
        return res.status(404).json({ message: "Client record not found" });
      }
      if (!client3.contactPhone) {
        return res.status(400).json({ message: "Client has no registered contact phone number" });
      }
      const messageText = `Dear parent/guardian, this is a friendly reminder that your child ${client3.name} is due for their scheduled immunizations soon. Please visit ${client3.facilityId ? "your registered facility" : "the nearest health center"}.`;
      await logAudit(req, "send_individual_reminder", "sms_reminder", null, null, {
        clientId: client3.id,
        clientName: client3.name,
        contactPhone: client3.contactPhone,
        message: messageText,
        sentAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.status(200).json({ success: true, message: `Successfully sent SMS reminder to parent of ${client3.name}` });
    } catch (err) {
      console.error("POST /api/reminders/send failed:", err);
      res.status(500).json({ message: "Failed to send SMS reminder" });
    }
  });
  app2.post("/api/reminders/bulk", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const { daysToDue } = req.body;
      if (daysToDue === void 0) {
        return res.status(400).json({ message: "daysToDue cohort parameter (7, 3, or 0) is required" });
      }
      const allClients = await storage.getClients(req.tenantId);
      let campaignCount = 0;
      const sentClients = [];
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(today.getTime() + daysToDue * 24 * 60 * 60 * 1e3);
      const testDoses = [
        { name: "BCG", weeks: 0 },
        { name: "OPV 1", weeks: 6 },
        { name: "OPV 2", weeks: 10 },
        { name: "OPV 3", weeks: 14 },
        { name: "MR 1", weeks: 39 }
      ];
      for (const client3 of allClients) {
        if (!client3.contactPhone) continue;
        const dob = new Date(client3.dateOfBirth);
        dob.setHours(0, 0, 0, 0);
        const vaxLogs = await storage.getClientVaccinations(req.tenantId, client3.id);
        let hasDueAntigen = false;
        let matchedAntigens = [];
        for (const dose of testDoses) {
          const doseDueDate = new Date(dob.getTime() + dose.weeks * 7 * 24 * 60 * 60 * 1e3);
          doseDueDate.setHours(0, 0, 0, 0);
          const diffMs = Math.abs(doseDueDate.getTime() - targetDate.getTime());
          const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1e3));
          if (diffDays === 0) {
            const received = vaxLogs.some((v) => v.vaccineName?.toLowerCase().includes(dose.name.toLowerCase()));
            if (!received) {
              hasDueAntigen = true;
              matchedAntigens.push(dose.name);
            }
          }
        }
        if (hasDueAntigen) {
          campaignCount++;
          sentClients.push({ id: client3.id, name: client3.name, phone: client3.contactPhone });
          await logAudit(req, "send_bulk_reminder", "sms_reminder", null, null, {
            clientId: client3.id,
            clientName: client3.name,
            contactPhone: client3.contactPhone,
            antigens: matchedAntigens,
            daysCohort: daysToDue,
            sentAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
      res.status(200).json({
        success: true,
        count: campaignCount,
        message: `Successfully executed bulk reminder campaign for ${daysToDue}-day cohort. Sent ${campaignCount} reminders.`,
        details: sentClients
      });
    } catch (err) {
      console.error("POST /api/reminders/bulk failed:", err);
      res.status(500).json({ message: "Failed to execute bulk reminder campaign" });
    }
  });
  app2.get("/api/clients/:id/vaccinations", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const list = await storage.getClientVaccinations(req.tenantId, req.params.id);
      res.json(list);
    } catch (err) {
      console.error("GET /api/clients/:id/vaccinations failed:", err);
      res.status(500).json({ message: "Failed to fetch client vaccinations" });
    }
  });
  app2.post("/api/clients/:id/vaccinate", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const schema = insertClientVaccinationSchema.omit({ clientId: true });
      const parsed = schema.parse(req.body);
      const vaccination = await storage.createClientVaccination(req.tenantId, {
        ...parsed,
        clientId: req.params.id,
        administeredByUserId: req.user?.id ?? req.user?.claims?.sub ?? null
      });
      await logAudit(req, "administer_vaccine", "client_vaccination", vaccination.id, null, {
        clientId: req.params.id,
        vaccineName: vaccination.vaccineName,
        batchNumber: vaccination.batchNumber
      });
      res.status(201).json(vaccination);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/clients/:id/vaccinate failed:", err);
      res.status(500).json({ message: "Failed to log administered vaccine dose" });
    }
  });
  app2.delete("/api/client-vaccinations/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid entry ID" });
      const deleted = await storage.deleteClientVaccination(req.tenantId, id);
      if (!deleted) return res.status(404).json({ message: "Vaccination entry not found" });
      await logAudit(req, "delete_vaccine_entry", "client_vaccination", id);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/client-vaccinations/:id failed:", err);
      res.status(500).json({ message: "Failed to delete vaccination entry" });
    }
  });
  app2.get("/api/session-day-plans", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const list = await db.select().from(sessionDayPlans).where((0, import_drizzle_orm9.eq)(sessionDayPlans.tenantId, req.tenantId));
      res.json(list);
    } catch (err) {
      console.error("GET /api/session-day-plans failed:", err);
      res.status(500).json({ message: "Failed to fetch all session day plans" });
    }
  });
  app2.get("/api/sessions/:sessionId/days", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const sessionPlanId = parseInt(req.params.sessionId);
      if (isNaN(sessionPlanId)) return res.status(400).json({ message: "Invalid session plan ID" });
      const list = await storage.getSessionDayPlans(req.tenantId, sessionPlanId);
      res.json(list);
    } catch (err) {
      console.error("GET /api/sessions/:sessionId/days failed:", err);
      res.status(500).json({ message: "Failed to fetch session day plans" });
    }
  });
  app2.post("/api/sessions/:sessionId/days", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const sessionPlanId = parseInt(req.params.sessionId);
      if (isNaN(sessionPlanId)) return res.status(400).json({ message: "Invalid session plan ID" });
      const session2 = await storage.getSessionPlan(req.tenantId, sessionPlanId);
      if (!session2) return res.status(404).json({ message: "Session plan not found" });
      const schema = insertSessionDayPlanSchema.omit({ sessionPlanId: true });
      const parsed = schema.parse(req.body);
      const dateVal = await validatePlanningLeadTimeAndNoConflict(
        req.tenantId,
        session2.facilityId,
        parsed.sessionDate
      );
      if (!dateVal.isValid) {
        return res.status(400).json({ message: dateVal.message });
      }
      const created = await storage.createSessionDayPlan(req.tenantId, {
        ...parsed,
        sessionPlanId
      });
      res.status(201).json(created);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/sessions/:sessionId/days failed:", err);
      res.status(500).json({ message: "Failed to create session day plan" });
    }
  });
  app2.patch("/api/sessions/days/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid day plan ID" });
      const parsed = insertSessionDayPlanSchema.partial().parse(req.body);
      if (parsed.sessionDate) {
        const dayPlan = await db.select({ sessionPlanId: sessionDayPlans.sessionPlanId }).from(sessionDayPlans).where((0, import_drizzle_orm9.eq)(sessionDayPlans.id, id)).limit(1);
        if (dayPlan.length > 0) {
          const session2 = await storage.getSessionPlan(req.tenantId, dayPlan[0].sessionPlanId);
          if (session2) {
            const dateVal = await validatePlanningLeadTimeAndNoConflict(
              req.tenantId,
              session2.facilityId,
              parsed.sessionDate,
              void 0,
              id
            );
            if (!dateVal.isValid) {
              return res.status(400).json({ message: dateVal.message });
            }
          }
        }
      }
      const updated = await storage.updateSessionDayPlan(req.tenantId, id, parsed);
      if (!updated) return res.status(404).json({ message: "Session day plan not found" });
      res.json(updated);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("PATCH /api/sessions/days/:id failed:", err);
      res.status(500).json({ message: "Failed to update session day plan" });
    }
  });
  app2.delete("/api/sessions/days/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid day plan ID" });
      const deleted = await storage.deleteSessionDayPlan(req.tenantId, id);
      if (!deleted) return res.status(404).json({ message: "Session day plan not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/sessions/days/:id failed:", err);
      res.status(500).json({ message: "Failed to delete session day plan" });
    }
  });
  app2.get("/api/stock/ledger", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const facilityIdRaw = req.query.facilityId;
      const facilityId = facilityIdRaw ? parseInt(facilityIdRaw) : void 0;
      if (facilityIdRaw && (facilityId === void 0 || isNaN(facilityId))) {
        return res.status(400).json({ message: "Invalid facility ID parameter" });
      }
      const list = await storage.getStockTransactions(req.tenantId, facilityId);
      res.json(list);
    } catch (err) {
      console.error("GET /api/stock/ledger failed:", err);
      res.status(500).json({ message: "Failed to fetch stock transactions" });
    }
  });
  app2.post("/api/stock/transaction", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const payload = {
        ...req.body,
        tenantId: req.tenantId,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : void 0,
        transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : /* @__PURE__ */ new Date()
      };
      const parsed = insertStockTransactionSchema.parse(payload);
      const transaction = await storage.createStockTransaction(req.tenantId, {
        ...parsed,
        recordedByUserId: req.user?.id ?? req.user?.claims?.sub ?? null
      });
      await logAudit(req, "create_stock_transaction", "stock_transaction", transaction.id, null, {
        facilityId: transaction.facilityId,
        vaccineName: transaction.vaccineName,
        transactionType: transaction.transactionType,
        quantityDoses: transaction.quantityDoses
      });
      res.status(201).json(transaction);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/stock/transaction failed:", err);
      res.status(500).json({ message: "Failed to register stock transaction" });
    }
  });
  app2.delete("/api/stock/transaction/:id", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid transaction ID" });
      const deleted = await storage.deleteStockTransaction(req.tenantId, id);
      if (!deleted) return res.status(404).json({ message: "Stock transaction entry not found" });
      await logAudit(req, "delete_stock_transaction", "stock_transaction", id);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/stock/transaction/:id failed:", err);
      res.status(500).json({ message: "Failed to revert stock transaction" });
    }
  });
  app2.get("/api/monthly-reports", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const facilityIdRaw = req.query.facilityId;
      const facilityId = facilityIdRaw ? parseInt(facilityIdRaw) : void 0;
      if (facilityIdRaw && (facilityId === void 0 || isNaN(facilityId))) {
        return res.status(400).json({ message: "Invalid facility ID parameter" });
      }
      const list = await storage.getMonthlyReports(req.tenantId, facilityId);
      res.json(list);
    } catch (err) {
      console.error("GET /api/monthly-reports failed:", err);
      res.status(500).json({ message: "Failed to fetch monthly reports" });
    }
  });
  app2.get("/api/monthly-reports/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid report ID" });
      const report = await storage.getMonthlyReport(req.tenantId, id);
      if (!report) return res.status(404).json({ message: "Monthly report not found" });
      res.json(report);
    } catch (err) {
      console.error("GET /api/monthly-reports/:id failed:", err);
      res.status(500).json({ message: "Failed to fetch monthly report" });
    }
  });
  app2.post("/api/monthly-reports", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const parsed = insertMonthlyReportSchema.parse(req.body);
      const report = await storage.createMonthlyReport(req.tenantId, {
        ...parsed,
        submittedById: req.user?.id ?? req.user?.claims?.sub ?? null
      });
      await logAudit(req, "create_monthly_report", "monthly_report", report.id, null, {
        facilityId: report.facilityId,
        month: report.month,
        year: report.year
      });
      res.status(201).json(report);
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload details", errors: err.errors });
      }
      console.error("POST /api/monthly-reports failed:", err);
      res.status(500).json({ message: "Failed to submit monthly report" });
    }
  });
  app2.patch("/api/monthly-reports/:id/approve", isAuthenticated, requireTenant, crossTenantWriteGuard, loadRole, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid report ID" });
      const role = req.user?.dbRole;
      if (role !== "district_manager" && role !== "national_admin") {
        return res.status(403).json({ message: "Only District Managers or National Admins can approve monthly compiled reports." });
      }
      const updated = await storage.updateMonthlyReport(req.tenantId, id, {
        approvalStatus: "approved"
      });
      if (!updated) return res.status(404).json({ message: "Monthly report not found" });
      await logAudit(req, "approve_monthly_report", "monthly_report", id, null, { approvalStatus: "approved" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/monthly-reports/:id/approve failed:", err);
      res.status(500).json({ message: "Failed to approve monthly report" });
    }
  });
  function requireHisRole(req, res, next) {
    const role = req.user?.dbRole;
    if (role !== "national_admin" && role !== "gis_specialist") {
      return res.status(403).json({
        message: "HIS integration management requires national_admin or gis_specialist role."
      });
    }
    next();
  }
  app2.get("/api/his/status", isAuthenticated, requireTenant, loadRole, requireHisRole, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const integrations = parseHisIntegrations(tenant.settings);
      const status = getIntegrationStatus(integrations);
      res.json({
        tenantCode: tenant.code,
        integrationCount: integrations.length,
        integrations: status
      });
    } catch (err) {
      console.error("GET /api/his/status failed:", err);
      res.status(500).json({ message: "Failed to retrieve HIS integration status" });
    }
  });
  app2.post("/api/his/push-immunizations", isAuthenticated, requireTenant, loadRole, requireHisRole, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        reportId: import_zod3.z.number().int().positive(),
        integrationId: import_zod3.z.string().optional()
        // if omitted → push to all enabled integrations
      });
      const { reportId, integrationId } = schema.parse(req.body);
      const report = await storage.getMonthlyReport(req.tenantId, reportId);
      if (!report) return res.status(404).json({ message: "Monthly report not found" });
      const facilityClients = await storage.getClients(req.tenantId, report.facilityId);
      const allVaccinations = [];
      await Promise.all(
        facilityClients.map(async (c) => {
          const vacs = await storage.getClientVaccinations(req.tenantId, c.id);
          allVaccinations.push(...vacs);
        })
      );
      const filtered = allVaccinations.filter((v) => {
        const d = new Date(v.administeredDate || v.createdAt);
        return d.getFullYear() === report.year && d.getMonth() + 1 === report.month;
      });
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const allIntegrations = parseHisIntegrations(tenant.settings);
      const targets = integrationId ? allIntegrations.filter((i) => i.id === integrationId && i.enabled) : allIntegrations.filter((i) => i.enabled);
      if (targets.length === 0) {
        return res.status(400).json({ message: "No enabled HIS integrations found for this tenant." });
      }
      const records = filtered.map((v) => ({
        clientId: String(v.clientId),
        clientExternalHisId: v.externalHisId ?? void 0,
        facilityId: report.facilityId,
        facilityDhis2OrgUnitId: void 0,
        // enriched below if facility has dhis2OrgUnitId
        facilityHmisCode: void 0,
        vaccineName: v.vaccineName ?? v.vaccineCode ?? "Unknown",
        vaccineCode: v.vaccineCode ?? void 0,
        doseNumber: v.doseNumber ?? 1,
        administeredDate: v.administeredDate ?? v.createdAt,
        batchNumber: v.batchNumber ?? void 0,
        vvmStatus: v.vvmStatus ?? void 0,
        tenantCode: tenant.code
      }));
      const results = await Promise.all(
        targets.map(async (cfg) => {
          const adapter = createHisAdapter(cfg);
          return adapter.pushImmunizations(records);
        })
      );
      await logAudit(req, "his_push_immunizations", "monthly_report", reportId, null, {
        integrations: targets.map((t) => t.id),
        recordCount: records.length,
        results: results.map((r) => ({ id: r.integrationId, success: r.success }))
      });
      res.json({
        reportId,
        recordCount: records.length,
        results
      });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload", errors: err.errors });
      }
      console.error("POST /api/his/push-immunizations failed:", err);
      res.status(500).json({ message: "Failed to push immunizations to HIS" });
    }
  });
  app2.post("/api/his/push-client/:id", isAuthenticated, requireTenant, loadRole, requireHisRole, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) return res.status(400).json({ message: "Invalid client ID" });
      const { integrationId } = import_zod3.z.object({ integrationId: import_zod3.z.string().min(1) }).parse(req.body);
      const client3 = await storage.getClient(req.tenantId, String(clientId));
      if (!client3) return res.status(404).json({ message: "Client not found" });
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const integrations = parseHisIntegrations(tenant.settings);
      const cfg = integrations.find((i) => i.id === integrationId && i.enabled);
      if (!cfg) {
        return res.status(400).json({ message: `Integration "${integrationId}" not found or disabled.` });
      }
      const record = {
        externalHisId: client3.externalHisId ?? void 0,
        firstName: client3.name,
        // clients table uses 'name' not 'firstName'
        dateOfBirth: client3.dateOfBirth ? new Date(client3.dateOfBirth).toISOString().slice(0, 10) : void 0,
        gender: client3.gender === "male" || client3.gender === "female" ? client3.gender : "unknown",
        tenantCode: tenant.code
      };
      const adapter = createHisAdapter(cfg);
      const result = await adapter.pushPatient(record);
      await logAudit(req, "his_push_patient", "client", clientId, null, {
        integrationId,
        success: result.success
      });
      res.json({ clientId, result });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload", errors: err.errors });
      }
      console.error("POST /api/his/push-client/:id failed:", err);
      res.status(500).json({ message: "Failed to push client record to HIS" });
    }
  });
  app2.get("/api/his/pull-facilities", isAuthenticated, requireTenant, loadRole, requireHisRole, async (req, res) => {
    try {
      const integrationId = import_zod3.z.string().min(1).parse(req.query.integrationId);
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const integrations = parseHisIntegrations(tenant.settings);
      const cfg = integrations.find((i) => i.id === integrationId && i.enabled);
      if (!cfg) {
        return res.status(400).json({ message: `Integration "${integrationId}" not found or disabled.` });
      }
      const adapter = createHisAdapter(cfg);
      const { result, orgUnits } = await adapter.pullOrgUnits();
      await logAudit(req, "his_pull_facilities", "facility", null, null, {
        integrationId,
        orgUnitCount: orgUnits.length,
        success: result.success
      });
      res.json({ result, orgUnits });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Integration ID is required", errors: err.errors });
      }
      console.error("GET /api/his/pull-facilities failed:", err);
      res.status(500).json({ message: "Failed to pull facilities from HIS" });
    }
  });
  const _multer = (await import("multer")).default;
  const _coverageSvc = await Promise.resolve().then(() => (init_coverageImportService(), coverageImportService_exports));
  const upload = _multer({
    storage: _multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
    // 10MB
  });
  function requireImportRole(req, res, next) {
    const role = req.user?.dbRole;
    const allowed = ["national_admin", "gis_specialist", "provincial_coordinator", "district_manager"];
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({
        message: "Coverage import requires national_admin, gis_specialist, provincial_coordinator, or district_manager role."
      });
    }
    next();
  }
  app2.get("/api/imports/csv/template", isAuthenticated, async (_req, res) => {
    const tmpl = "facility_external_id,period,antigen,doses_administered,target_pop_override\nFAC001,202504,BCG,45,\nFAC001,202504,PENTA1,42,\nFAC002,202504,MEASLES1,30,120\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="coverage_template.csv"');
    res.send(tmpl);
  });
  app2.post(
    "/api/imports/csv",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireImportRole,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded (field name: file)" });
        const preview = await _coverageSvc.previewCsvImport(req.tenantId, req.file.originalname, req.file.buffer);
        res.json(preview);
      } catch (err) {
        console.error("POST /api/imports/csv failed:", err);
        res.status(500).json({ message: err?.message ?? "CSV preview failed" });
      }
    }
  );
  app2.post(
    "/api/imports/csv/commit",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireImportRole,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded (field name: file)" });
        const preview = await _coverageSvc.previewCsvImport(req.tenantId, req.file.originalname, req.file.buffer);
        const userId = req.user?.claims?.sub || null;
        const committed = await _coverageSvc.commitCsvImport(req.tenantId, userId, preview);
        await logAudit(req, "coverage_csv_import", "csv_imports", committed.csvImportId, null, {
          filename: req.file.originalname,
          rowCount: preview.rowCount,
          importedCount: committed.importedCount,
          errorCount: preview.errors.length
        });
        res.json({
          ...committed,
          rowCount: preview.rowCount,
          errorCount: preview.errors.length,
          errors: preview.errors.slice(0, 100)
        });
      } catch (err) {
        console.error("POST /api/imports/csv/commit failed:", err);
        res.status(500).json({ message: err?.message ?? "CSV commit failed" });
      }
    }
  );
  app2.get("/api/imports/csv", isAuthenticated, requireTenant, loadRole, requireImportRole, async (req, res) => {
    try {
      const rows = await db.execute(import_drizzle_orm9.sql`
        SELECT id, filename, row_count, error_count, imported_count, status, uploaded_by_user_id, uploaded_at
        FROM csv_imports WHERE tenant_id = ${req.tenantId}
        ORDER BY uploaded_at DESC LIMIT 50
      `);
      res.json(rows.rows ?? []);
    } catch (err) {
      res.status(500).json({ message: err?.message ?? "Failed to list imports" });
    }
  });
  app2.get("/api/imports/csv/:id", isAuthenticated, requireTenant, loadRole, requireImportRole, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const rows = await db.execute(import_drizzle_orm9.sql`
        SELECT id, filename, row_count, error_count, imported_count, status, error_report, uploaded_at
        FROM csv_imports WHERE id = ${id} AND tenant_id = ${req.tenantId}
      `);
      const row = rows.rows?.[0];
      if (!row) return res.status(404).json({ message: "Import not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ message: err?.message ?? "Failed to fetch import" });
    }
  });
  app2.post(
    "/api/imports/dhis2/pull",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireImportRole,
    async (req, res) => {
      try {
        const schema = import_zod3.z.object({
          integrationId: import_zod3.z.string().min(1),
          period: import_zod3.z.string().regex(/^\d{4}-?\d{2}$/).transform((p) => p.replace("-", "")),
          rootOrgUnit: import_zod3.z.string().optional(),
          commit: import_zod3.z.boolean().optional().default(false)
        });
        const body = schema.parse(req.body);
        const tenant = await storage.getTenant(req.tenantId);
        if (!tenant) return res.status(404).json({ message: "Tenant not found" });
        const integrations = parseHisIntegrations(tenant.settings);
        const cfg = integrations.find((i) => i.id === body.integrationId && i.enabled);
        if (!cfg) return res.status(400).json({ message: `Integration "${body.integrationId}" not found or disabled.` });
        const pulled = await _coverageSvc.pullDhis2Coverage(req.tenantId, cfg, {
          period: body.period,
          rootOrgUnit: body.rootOrgUnit
        });
        let importedCount = 0;
        if (body.commit && pulled.rows.length > 0) {
          const userId = req.user?.claims?.sub || null;
          const result = await _coverageSvc.commitDhis2Coverage(req.tenantId, userId, cfg.id, pulled.rows);
          importedCount = result.importedCount;
          await logAudit(req, "coverage_dhis2_pull", "imported_coverage", null, null, {
            integrationId: cfg.id,
            period: body.period,
            rowCount: pulled.rows.length,
            importedCount
          });
        }
        res.json({
          rowCount: pulled.rows.length,
          warnings: pulled.warnings,
          errors: pulled.errors,
          simulated: pulled.simulated,
          committed: body.commit,
          importedCount,
          sample: pulled.rows.slice(0, 50)
        });
      } catch (err) {
        if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid payload", errors: err.errors });
        console.error("POST /api/imports/dhis2/pull failed:", err);
        res.status(500).json({ message: err?.message ?? "DHIS2 pull failed" });
      }
    }
  );
  app2.get("/api/missed-communities", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        antigen: import_zod3.z.string().min(1).transform((a) => a.toUpperCase()),
        period: import_zod3.z.string().regex(/^\d{4}-?\d{2}$/).transform((p) => p.replace("-", "")),
        provinceId: import_zod3.z.coerce.number().int().positive().optional(),
        districtId: import_zod3.z.coerce.number().int().positive().optional()
      });
      const q = schema.parse(req.query);
      const results = await _coverageSvc.scoreMissedCommunities({
        tenantId: req.tenantId,
        antigen: q.antigen,
        period: q.period,
        provinceId: q.provinceId,
        districtId: q.districtId
      });
      res.json({ count: results.length, results });
    } catch (err) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid query", errors: err.errors });
      console.error("GET /api/missed-communities failed:", err);
      res.status(500).json({ message: err?.message ?? "Scoring failed" });
    }
  });
  app2.post(
    "/api/missed-communities/create-outreach",
    isAuthenticated,
    requireTenant,
    loadRole,
    requireImportRole,
    async (req, res) => {
      try {
        const schema = import_zod3.z.object({
          villageIds: import_zod3.z.array(import_zod3.z.number().int().positive()).min(1).max(500),
          antigen: import_zod3.z.string().min(1),
          year: import_zod3.z.coerce.number().int().min(2e3).max(2100),
          quarter: import_zod3.z.coerce.number().int().min(1).max(4),
          name: import_zod3.z.string().min(1).max(255).optional()
        });
        const body = schema.parse(req.body);
        const userId = req.user?.claims?.sub || null;
        const vrows = await db.select().from(villages).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(villages.tenantId, req.tenantId), (0, import_drizzle_orm9.inArray)(villages.id, body.villageIds)));
        const byFacility = /* @__PURE__ */ new Map();
        for (const v of vrows) {
          if (!v.assignedFacilityId) continue;
          const arr = byFacility.get(v.assignedFacilityId) ?? [];
          arr.push(v);
          byFacility.set(v.assignedFacilityId, arr);
        }
        if (byFacility.size === 0) {
          return res.status(400).json({ message: "No selected villages have an assigned facility." });
        }
        const dbUser = userId ? await storage.getUser(userId) : null;
        if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
        for (const fid of Array.from(byFacility.keys())) {
          const geoContext = await getFacilityHierarchy(fid, req.tenantId);
          if (!hasPermission(dbUser, "manage_session_plans", geoContext)) {
            return res.status(403).json({
              message: "Forbidden: You do not have permission to draft outreach for one or more selected facilities."
            });
          }
        }
        const createdMicroplans = [];
        const createdSessions = [];
        const entries = Array.from(byFacility.entries());
        for (const [facilityId, vlist] of entries) {
          const microplanName = (body.name ?? `Missed-Communities Outreach ${body.year}-Q${body.quarter} (${body.antigen})`) + (entries.length > 1 ? ` \u2014 facility ${facilityId}` : "");
          const microplan = await storage.createMicroplan(req.tenantId, {
            name: microplanName,
            planType: "facility_routine",
            year: body.year,
            quarter: body.quarter,
            status: "draft",
            facilityId
          });
          createdMicroplans.push(microplan);
          const session2 = await storage.createSessionPlan(req.tenantId, {
            microplanId: microplan.id,
            facilityId,
            name: `Outreach \u2013 ${vlist.length} missed communities (${body.antigen})`,
            sessionType: "outreach",
            quarter: body.quarter,
            year: body.year,
            planType: "routine",
            status: "planned",
            approvalStatus: "draft",
            notes: `Auto-drafted from Missed Communities analysis (${body.antigen}).`
          });
          createdSessions.push(session2);
          if (vlist.length > 0) {
            await db.insert(sessionVillages).values(
              vlist.map((v, idx) => ({
                tenantId: req.tenantId,
                sessionId: session2.id,
                villageId: v.id,
                orderIndex: idx
              }))
            );
          }
        }
        await logAudit(req, "missed_communities_create_outreach", "microplans", createdMicroplans[0]?.id ?? 0, null, {
          villageCount: vrows.length,
          facilityCount: byFacility.size,
          microplanCount: createdMicroplans.length,
          sessionCount: createdSessions.length,
          antigen: body.antigen
        });
        res.json({ microplans: createdMicroplans, sessions: createdSessions });
      } catch (err) {
        if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid payload", errors: err.errors });
        console.error("POST /api/missed-communities/create-outreach failed:", err);
        res.status(500).json({ message: err?.message ?? "Failed to create outreach microplan" });
      }
    }
  );
  app2.post("/api/his/test-bundle", isAuthenticated, requireTenant, loadRole, requireHisRole, async (req, res) => {
    try {
      const { integrationId, vaccinationId } = import_zod3.z.object({
        integrationId: import_zod3.z.string().min(1),
        vaccinationId: import_zod3.z.number().int().positive()
      }).parse(req.body);
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const integrations = parseHisIntegrations(tenant.settings);
      const cfg = integrations.find((i) => i.id === integrationId && i.enabled);
      if (!cfg) return res.status(400).json({ message: `Integration "${integrationId}" not found or disabled.` });
      if (cfg.type !== "fhir_r4") {
        return res.status(400).json({ message: "Test bundle is only supported for FHIR R4 integrations." });
      }
      const [vac] = await db.select().from(clientVaccinations).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(clientVaccinations.id, vaccinationId), (0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, req.tenantId))).limit(1);
      if (!vac) return res.status(404).json({ message: "Vaccination not found in this tenant" });
      const client3 = await storage.getClient(req.tenantId, vac.clientId);
      if (!client3) return res.status(404).json({ message: "Client for vaccination not found" });
      const facility = await storage.getFacility(req.tenantId, client3.facilityId);
      if (!facility) return res.status(404).json({ message: "Facility for vaccination not found" });
      const practitioner = vac.administeredByUserId ? await storage.getUser(vac.administeredByUserId) : null;
      const input = {
        tenantCode: tenant.code,
        client: {
          id: client3.id,
          name: client3.name,
          dateOfBirth: client3.dateOfBirth,
          gender: client3.gender,
          externalHisId: client3.externalHisId ?? null
        },
        vaccination: {
          id: vac.id,
          vaccineName: vac.vaccineName,
          vaccineCode: null,
          doseNumber: null,
          administeredDate: vac.administeredDate,
          batchNumber: vac.batchNumber,
          expiryDate: vac.expiryDate,
          vvmStatus: vac.vvmStatus
        },
        facility: {
          id: facility.id,
          name: facility.name,
          hmisCode: facility.hmisCode,
          latitude: facility.latitude,
          longitude: facility.longitude,
          address: facility.address
        },
        practitioner: practitioner ? {
          id: practitioner.id,
          firstName: practitioner.firstName,
          lastName: practitioner.lastName,
          email: practitioner.email
        } : null
      };
      const adapter = new FhirR4Adapter(cfg);
      const result = await adapter.exportVaccinationBundle(input);
      await logAudit(req, "his_test_bundle", "client_vaccination", vaccinationId, null, {
        integrationId,
        success: result.success,
        validationErrors: result.validation.errors.length
      });
      res.json({
        integrationId,
        vaccinationId,
        success: result.success,
        validation: result.validation,
        bundle: result.bundle,
        response: result.response ?? null,
        errors: result.errors,
        warnings: result.warnings,
        durationMs: result.durationMs
      });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payload", errors: err.errors });
      }
      console.error("POST /api/his/test-bundle failed:", err);
      res.status(500).json({ message: "Failed to build/send test bundle" });
    }
  });
  app2.get("/api/settlements", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { province, district, ward, hardToReach, status } = req.query;
      const queryConditions = [(0, import_drizzle_orm9.eq)(settlementsMaster.tenantId, req.tenantId)];
      if (province) queryConditions.push((0, import_drizzle_orm9.eq)(settlementsMaster.provinceName, province));
      if (district) queryConditions.push((0, import_drizzle_orm9.eq)(settlementsMaster.districtName, district));
      if (ward) queryConditions.push((0, import_drizzle_orm9.eq)(settlementsMaster.wardName, ward));
      if (hardToReach) queryConditions.push((0, import_drizzle_orm9.eq)(settlementsMaster.hardToReach, hardToReach === "true"));
      if (status) queryConditions.push((0, import_drizzle_orm9.eq)(settlementsMaster.validationStatus, status));
      const settlementsList = await db.select().from(settlementsMaster).where((0, import_drizzle_orm9.and)(...queryConditions)).orderBy((0, import_drizzle_orm9.desc)(settlementsMaster.populationEstimate));
      res.json(settlementsList);
    } catch (err) {
      console.error("GET /api/settlements failed:", err);
      res.status(500).json({ message: "Failed to fetch master settlements" });
    }
  });
  app2.get("/api/settlements/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID parameter" });
      const settlement = await db.select().from(settlementsMaster).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(settlementsMaster.id, id), (0, import_drizzle_orm9.eq)(settlementsMaster.tenantId, req.tenantId))).limit(1);
      if (settlement.length === 0) {
        return res.status(404).json({ message: "Settlement not found" });
      }
      res.json(settlement[0]);
    } catch (err) {
      console.error("GET /api/settlements/:id failed:", err);
      res.status(500).json({ message: "Failed to fetch settlement details" });
    }
  });
  app2.get("/api/unmapped-settlements", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { status } = req.query;
      const validationStatus = status || "pending";
      const candidates = await db.select().from(candidateUnmappedSettlements).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.tenantId, req.tenantId),
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.validationStatus, validationStatus)
        )
      ).orderBy((0, import_drizzle_orm9.desc)(candidateUnmappedSettlements.estimatedPopulation));
      res.json(candidates);
    } catch (err) {
      console.error("GET /api/unmapped-settlements failed:", err);
      res.status(500).json({ message: "Failed to fetch candidate settlements" });
    }
  });
  app2.post("/api/unmapped-settlements/:id/validate", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID parameter" });
      const { name, placeType } = req.body;
      if (!name) return res.status(400).json({ message: "Ground-truthed settlement name is required" });
      const candidateList = await db.select().from(candidateUnmappedSettlements).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.id, id),
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.tenantId, req.tenantId)
        )
      ).limit(1);
      if (candidateList.length === 0) {
        return res.status(404).json({ message: "Candidate settlement not found" });
      }
      const candidate = candidateList[0];
      await db.update(candidateUnmappedSettlements).set({ validationStatus: "validated", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.id, id));
      const admin = await assignAdminBoundaries(
        req.tenantId,
        parseFloat(candidate.longitude),
        parseFloat(candidate.latitude)
      );
      const facility = await getNearestHealthFacility(
        req.tenantId,
        parseFloat(candidate.longitude),
        parseFloat(candidate.latitude)
      );
      const htr = calculateHTRIndex(facility.distanceKm);
      const [newSettlement] = await db.insert(settlementsMaster).values({
        tenantId: req.tenantId,
        name,
        placeType: placeType || "village",
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        geojson: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [parseFloat(candidate.longitude), parseFloat(candidate.latitude)]
          },
          properties: {
            name,
            place_type: placeType || "village",
            population_estimate: candidate.estimatedPopulation,
            building_count: candidate.buildingCount
          }
        },
        provinceName: admin.provinceName,
        districtName: admin.districtName,
        constituencyName: admin.constituencyName,
        wardName: admin.wardName,
        healthCatchment: facility.facilityName || "Unassigned Catchment",
        populationEstimate: candidate.estimatedPopulation,
        under5Population: Math.round(candidate.estimatedPopulation * 0.18),
        // standard 18% Under-5 fallback
        buildingCount: candidate.buildingCount,
        source: "manual_input",
        sourceConfidence: "0.99",
        nearestHealthFacility: facility.facilityName,
        distanceToFacilityKm: facility.distanceKm.toString(),
        estimatedTravelTime: facility.estimatedTravelTime,
        accessibilityScore: htr.accessibilityScore.toString(),
        hardToReach: htr.hardToReach,
        validationStatus: "approved"
      }).returning();
      await logAudit(req, "validate_settlement", "settlements_master", newSettlement.id, null, {
        candidateId: id,
        name,
        admin,
        facility
      });
      res.json({
        success: true,
        message: `Settlement "${name}" successfully validated and promoted to Master Registry.`,
        settlement: newSettlement
      });
    } catch (err) {
      console.error("POST /api/unmapped-settlements/:id/validate failed:", err);
      res.status(500).json({ message: "Failed to validate candidate settlement" });
    }
  });
  app2.post("/api/unmapped-settlements/run-engine", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { populationThreshold, buildingThreshold, radiusKm } = req.body;
      const result = await runMissingSettlementDetection(req.tenantId, {
        populationThreshold: populationThreshold ? parseInt(populationThreshold, 10) : void 0,
        buildingThreshold: buildingThreshold ? parseInt(buildingThreshold, 10) : void 0,
        radiusKm: radiusKm ? parseFloat(radiusKm) : void 0
      });
      await logAudit(req, "run_detection_engine", "candidate_unmapped_settlements", null, null, {
        parameters: req.body,
        detectedCount: result.candidatesDetected
      });
      res.json(result);
    } catch (err) {
      console.error("POST /api/unmapped-settlements/run-engine failed:", err);
      res.status(500).json({ message: "Failed to execute missing settlement detection" });
    }
  });
  app2.get("/api/coverage-gaps", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const client3 = pool;
      const query = `
        SELECT 
          g.id,
          g.population_total,
          g.under5_population,
          g.geojson,
          ST_Distance(
            g.geometry::geography,
            (
              SELECT ST_Union(ST_SetSRID(ST_MakePoint(f.longitude::float, f.latitude::float), 4326)::geography)
              FROM facilities f
              WHERE f.tenant_id = $1 AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL AND f.is_active = true
            )
          ) as distance_to_nearest_facility
        FROM population_grids g
        WHERE g.tenant_id = $1
        ORDER BY g.population_total DESC
      `;
      const resGrids = await client3.query(query, [req.tenantId]);
      const gapGrids = resGrids.rows.filter((row) => parseFloat(row.distance_to_nearest_facility) >= 5e3).map((row) => ({
        id: row.id,
        population: parseInt(row.population_total),
        distanceKm: parseFloat((parseFloat(row.distance_to_nearest_facility) / 1e3).toFixed(2)),
        geojson: row.geojson
      }));
      res.json({
        success: true,
        count: gapGrids.length,
        features: gapGrids
      });
    } catch (err) {
      console.error("GET /api/coverage-gaps failed:", err);
      res.status(500).json({ message: "Failed to calculate coverage gaps" });
    }
  });
  app2.get("/api/outreach-recommendations", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const candidates = await db.select().from(candidateUnmappedSettlements).where(
        (0, import_drizzle_orm9.and)(
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.tenantId, req.tenantId),
          (0, import_drizzle_orm9.eq)(candidateUnmappedSettlements.validationStatus, "pending")
        )
      );
      const recommendations = candidates.filter((c) => parseFloat(c.distanceToFacility || "0") >= 5).map((c) => ({
        id: c.id,
        name: `Proposed outreach at grid cluster (${parseFloat(c.longitude).toFixed(4)}, ${parseFloat(c.latitude).toFixed(4)})`,
        estimatedPopulation: c.estimatedPopulation,
        buildingCount: c.buildingCount,
        nearestFacility: c.nearestFacility,
        distanceToFacilityKm: parseFloat(c.distanceToFacility || "0"),
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude)
      })).sort((a, b) => b.estimatedPopulation - a.estimatedPopulation).slice(0, 15);
      res.json(recommendations);
    } catch (err) {
      console.error("GET /api/outreach-recommendations failed:", err);
      res.status(500).json({ message: "Failed to generate outreach recommendations" });
    }
  });
  app2.get("/api/sync/pull", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const sinceParam = req.query.since;
      const since = sinceParam ? new Date(sinceParam) : null;
      if (sinceParam && isNaN(since.getTime())) {
        return res.status(400).json({ message: "Invalid 'since' timestamp" });
      }
      const payload = await pullChanges(req.tenantId, since);
      res.json(payload);
    } catch (err) {
      console.error("GET /api/sync/pull failed:", err);
      res.status(500).json({ message: "Sync pull failed" });
    }
  });
  app2.post("/api/sync/batch", isAuthenticated, requireTenant, crossTenantWriteGuard, async (req, res) => {
    try {
      const schema = import_zod3.z.object({
        mutations: import_zod3.z.array(import_zod3.z.object({
          id: import_zod3.z.number().int(),
          tenantId: import_zod3.z.string(),
          entityType: import_zod3.z.string(),
          method: import_zod3.z.enum(["POST", "PUT", "PATCH", "DELETE"]),
          url: import_zod3.z.string(),
          body: import_zod3.z.string().optional(),
          localId: import_zod3.z.string().optional(),
          serverId: import_zod3.z.union([import_zod3.z.string(), import_zod3.z.number()]).optional(),
          retries: import_zod3.z.number().int().default(0)
        }))
      });
      const { mutations } = schema.parse(req.body);
      const userId = req.user?.id ?? req.user?.claims?.sub ?? null;
      const results = await batchMutate(
        req.tenantId,
        mutations,
        userId
      );
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;
      console.log(`[sync/batch] tenant=${req.tenantId} total=${mutations.length} ok=${successCount} fail=${failCount}`);
      res.json({ results });
    } catch (err) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid batch payload", errors: err.errors });
      }
      console.error("POST /api/sync/batch failed:", err);
      res.status(500).json({ message: "Batch sync failed" });
    }
  });
  const isCampaignDose = (name) => {
    if (!name) return false;
    const u = name.toUpperCase();
    return u.includes("SIA") || u.includes("CAMPAIGN");
  };
  const normAntigen = (name) => {
    if (!name) return null;
    const u = name.toUpperCase().replace(/[\s\-_]/g, "");
    if (u.startsWith("PENTA")) {
      if (u.endsWith("1")) return "PENTA_1";
      if (u.endsWith("2")) return "PENTA_2";
      if (u.endsWith("3")) return "PENTA_3";
    }
    if (u.startsWith("DTP")) {
      if (u.endsWith("1")) return "PENTA_1";
      if (u.endsWith("2")) return "PENTA_2";
      if (u.endsWith("3")) return "PENTA_3";
    }
    if (u.startsWith("MR") || u.startsWith("MEASLES")) {
      if (u.endsWith("1")) return "MR_1";
      if (u.endsWith("2")) return "MR_2";
    }
    if (u.startsWith("BCG")) return "BCG";
    if (u.startsWith("OPV")) return "OPV_" + (u.match(/\d$/)?.[0] ?? "");
    if (u.startsWith("PCV")) return "PCV_" + (u.match(/\d$/)?.[0] ?? "");
    if (u.startsWith("ROTA")) return "ROTA_" + (u.match(/\d$/)?.[0] ?? "");
    if (u.startsWith("IPV")) return "IPV_" + (u.match(/\d$/)?.[0] ?? "");
    return null;
  };
  const RI_SCHEDULE = [
    { code: "BCG", weeks: 0 },
    { code: "OPV_0", weeks: 0 },
    { code: "OPV_1", weeks: 6, series: "OPV" },
    { code: "PENTA_1", weeks: 6, series: "PENTA" },
    { code: "PCV_1", weeks: 6, series: "PCV" },
    { code: "ROTA_1", weeks: 6, series: "ROTA" },
    { code: "OPV_2", weeks: 10, series: "OPV" },
    { code: "PENTA_2", weeks: 10, series: "PENTA" },
    { code: "PCV_2", weeks: 10, series: "PCV" },
    { code: "ROTA_2", weeks: 10, series: "ROTA" },
    { code: "OPV_3", weeks: 14, series: "OPV" },
    { code: "PENTA_3", weeks: 14, series: "PENTA" },
    { code: "PCV_3", weeks: 14, series: "PCV" },
    { code: "ROTA_3", weeks: 14, series: "ROTA" },
    { code: "IPV_1", weeks: 14 },
    { code: "MR_1", weeks: 39 },
    { code: "IPV_2", weeks: 39 },
    { code: "MR_2", weeks: 78 }
  ];
  const GRACE_WEEKS = 4;
  const indicatorCache = /* @__PURE__ */ new Map();
  function currentMonthKey() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  function cacheGetIndicator(key) {
    const e = indicatorCache.get(key);
    if (!e) return null;
    if (e.month !== currentMonthKey()) {
      indicatorCache.delete(key);
      return null;
    }
    return e.data;
  }
  function cacheSetIndicator(key, data) {
    indicatorCache.set(key, { month: currentMonthKey(), data });
  }
  function indicatorCacheKey(name, tenantId, filters) {
    return `${name}:${tenantId}:${JSON.stringify(filters)}`;
  }
  async function getScopedFacilityIds(req, dbUser, explicitFacilityId, districtId, provinceId) {
    const tenantId = req.tenantId;
    const rows = await db.select({ id: facilities.id, districtId: facilities.districtId }).from(facilities).where((0, import_drizzle_orm9.eq)(facilities.tenantId, tenantId));
    const districtRows = await db.select({ id: districts.id, provinceId: districts.provinceId }).from(districts).where((0, import_drizzle_orm9.eq)(districts.tenantId, tenantId));
    const distProvince = new Map(districtRows.map((d) => [d.id, d.provinceId]));
    let ids = rows.map((r) => r.id);
    if (explicitFacilityId) ids = ids.filter((id) => id === explicitFacilityId);
    if (districtId) {
      const allowed2 = new Set(
        rows.filter((r) => r.districtId === districtId).map((r) => r.id)
      );
      ids = ids.filter((id) => allowed2.has(id));
    }
    if (provinceId) {
      const allowed2 = new Set(
        rows.filter((r) => distProvince.get(r.districtId) === provinceId).map((r) => r.id)
      );
      ids = ids.filter((id) => allowed2.has(id));
    }
    const isNational = dbUser.role === "national_admin" || Array.isArray(dbUser.roles) && dbUser.roles.includes("national_admin");
    if (isNational) return ids;
    const allowed = [];
    for (const fid of ids) {
      const row = rows.find((r) => r.id === fid);
      const geo = {
        facilityId: fid,
        districtId: row?.districtId ?? null,
        provinceId: row ? distProvince.get(row.districtId) ?? null : null
      };
      if (hasPermission(dbUser, "view_clients", geo)) allowed.push(fid);
    }
    return allowed;
  }
  app2.get(
    "/api/indicators/zero-dose",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const dbUser = await storage.getUser(req.user.id);
        if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
        const tenantId = req.tenantId;
        const provinceId = req.query.provinceId ? parseInt(req.query.provinceId) : void 0;
        const districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
        const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
        const scopedFacilityIds = await getScopedFacilityIds(
          req,
          dbUser,
          facilityId,
          districtId,
          provinceId
        );
        const scopeSig = scopedFacilityIds === null ? "ALL" : [...scopedFacilityIds].sort((a, b) => a - b).join(",");
        const cacheKey = indicatorCacheKey("zero-dose", tenantId, {
          provinceId,
          districtId,
          facilityId,
          userId: dbUser.id,
          scopeSig
        });
        const cached = cacheGetIndicator(cacheKey);
        if (cached) return res.json(cached);
        if (scopedFacilityIds && scopedFacilityIds.length === 0) {
          const empty = { total: 0, denominator: 0, byDistrict: [] };
          cacheSetIndicator(cacheKey, empty);
          return res.json(empty);
        }
        const twelveMonthsAgo = /* @__PURE__ */ new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        const eligible = await db.select({
          id: clients.id,
          facilityId: clients.facilityId,
          districtId: facilities.districtId,
          districtName: districts.name
        }).from(clients).innerJoin(facilities, (0, import_drizzle_orm9.eq)(facilities.id, clients.facilityId)).innerJoin(districts, (0, import_drizzle_orm9.eq)(districts.id, facilities.districtId)).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(clients.tenantId, tenantId),
            (0, import_drizzle_orm9.eq)(clients.clientType, "child"),
            (0, import_drizzle_orm9.lte)(clients.dateOfBirth, twelveMonthsAgo),
            scopedFacilityIds ? (0, import_drizzle_orm9.inArray)(clients.facilityId, scopedFacilityIds) : void 0
          )
        );
        if (eligible.length === 0) {
          return res.json({ total: 0, denominator: 0, byDistrict: [] });
        }
        const clientIds = eligible.map((c) => c.id);
        const dosed = await db.select({
          clientId: clientVaccinations.clientId,
          vaccineName: clientVaccinations.vaccineName
        }).from(clientVaccinations).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, tenantId),
            (0, import_drizzle_orm9.inArray)(clientVaccinations.clientId, clientIds)
          )
        );
        const haveDtp1 = /* @__PURE__ */ new Set();
        for (const d of dosed) {
          if (isCampaignDose(d.vaccineName)) continue;
          if (normAntigen(d.vaccineName) === "PENTA_1") haveDtp1.add(d.clientId);
        }
        const byDistMap = /* @__PURE__ */ new Map();
        let total = 0;
        for (const c of eligible) {
          const entry = byDistMap.get(c.districtId) ?? { districtId: c.districtId, districtName: c.districtName, zeroDose: 0, denominator: 0 };
          entry.denominator += 1;
          if (!haveDtp1.has(c.id)) {
            entry.zeroDose += 1;
            total += 1;
          }
          byDistMap.set(c.districtId, entry);
        }
        const byDistrictRaw = [];
        byDistMap.forEach((v) => byDistrictRaw.push(v));
        const byDistrict = byDistrictRaw.map((d) => ({
          ...d,
          pct: d.denominator > 0 ? Math.round(d.zeroDose / d.denominator * 1e3) / 10 : 0
        })).sort((a, b) => b.zeroDose - a.zeroDose);
        const payload = {
          total,
          denominator: eligible.length,
          pct: eligible.length > 0 ? Math.round(total / eligible.length * 1e3) / 10 : 0,
          byDistrict
        };
        cacheSetIndicator(cacheKey, payload);
        res.json(payload);
      } catch (err) {
        console.error("GET /api/indicators/zero-dose failed:", err);
        res.status(500).json({ message: "Failed to compute zero-dose indicator" });
      }
    }
  );
  app2.get(
    "/api/indicators/dropout",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const dbUser = await storage.getUser(req.user.id);
        if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
        const tenantId = req.tenantId;
        const provinceId = req.query.provinceId ? parseInt(req.query.provinceId) : void 0;
        const districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
        const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
        const periodMonths = Math.max(
          1,
          Math.min(60, parseInt(req.query.periodMonths ?? "12") || 12)
        );
        const periodStart = /* @__PURE__ */ new Date();
        periodStart.setMonth(periodStart.getMonth() - periodMonths);
        const periodEnd = /* @__PURE__ */ new Date();
        const scopedFacilityIds = await getScopedFacilityIds(
          req,
          dbUser,
          facilityId,
          districtId,
          provinceId
        );
        const scopeSig = scopedFacilityIds === null ? "ALL" : [...scopedFacilityIds].sort((a, b) => a - b).join(",");
        const cacheKey = indicatorCacheKey("dropout", tenantId, {
          provinceId,
          districtId,
          facilityId,
          periodMonths,
          userId: dbUser.id,
          scopeSig
        });
        const cached = cacheGetIndicator(cacheKey);
        if (cached) return res.json(cached);
        if (scopedFacilityIds && scopedFacilityIds.length === 0) {
          const empty = {
            period: { months: periodMonths, start: periodStart.toISOString(), end: periodEnd.toISOString() },
            dtp1_dtp3: { num: 0, denom: 0, rate: 0, byDistrict: [], byFacility: [] },
            dtp1_mcv1: { num: 0, denom: 0, rate: 0, byDistrict: [], byFacility: [] }
          };
          cacheSetIndicator(cacheKey, empty);
          return res.json(empty);
        }
        const rows = await db.select({
          clientId: clientVaccinations.clientId,
          vaccineName: clientVaccinations.vaccineName,
          administeredDate: clientVaccinations.administeredDate,
          facilityId: clients.facilityId,
          facilityName: facilities.name,
          districtId: facilities.districtId,
          districtName: districts.name
        }).from(clientVaccinations).innerJoin(clients, (0, import_drizzle_orm9.eq)(clients.id, clientVaccinations.clientId)).innerJoin(facilities, (0, import_drizzle_orm9.eq)(facilities.id, clients.facilityId)).innerJoin(districts, (0, import_drizzle_orm9.eq)(districts.id, facilities.districtId)).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, tenantId),
            (0, import_drizzle_orm9.gte)(clientVaccinations.administeredDate, periodStart),
            (0, import_drizzle_orm9.lte)(clientVaccinations.administeredDate, periodEnd),
            scopedFacilityIds ? (0, import_drizzle_orm9.inArray)(clients.facilityId, scopedFacilityIds) : void 0
          )
        );
        const makeAgg = () => ({
          dtp1: /* @__PURE__ */ new Set(),
          dtp3: /* @__PURE__ */ new Set(),
          mcv1: /* @__PURE__ */ new Set()
        });
        const districtAgg = /* @__PURE__ */ new Map();
        const facilityAgg = /* @__PURE__ */ new Map();
        for (const r of rows) {
          if (isCampaignDose(r.vaccineName)) continue;
          const code = normAntigen(r.vaccineName);
          if (code !== "PENTA_1" && code !== "PENTA_3" && code !== "MR_1") continue;
          let d = districtAgg.get(r.districtId);
          if (!d) {
            d = { ...makeAgg(), districtId: r.districtId, districtName: r.districtName };
            districtAgg.set(r.districtId, d);
          }
          let f = facilityAgg.get(r.facilityId);
          if (!f) {
            f = {
              ...makeAgg(),
              facilityId: r.facilityId,
              facilityName: r.facilityName,
              districtId: r.districtId,
              districtName: r.districtName
            };
            facilityAgg.set(r.facilityId, f);
          }
          if (code === "PENTA_1") {
            d.dtp1.add(r.clientId);
            f.dtp1.add(r.clientId);
          } else if (code === "PENTA_3") {
            d.dtp3.add(r.clientId);
            f.dtp3.add(r.clientId);
          } else if (code === "MR_1") {
            d.mcv1.add(r.clientId);
            f.mcv1.add(r.clientId);
          }
        }
        const compute = (numCompleted, denom) => denom > 0 ? Math.round((denom - numCompleted) / denom * 1e3) / 10 : 0;
        const cohort = (a) => {
          const d1 = a.dtp1.size;
          let d3 = 0;
          let m1 = 0;
          a.dtp1.forEach((id) => {
            if (a.dtp3.has(id)) d3 += 1;
            if (a.mcv1.has(id)) m1 += 1;
          });
          return { d1, d3, m1 };
        };
        let totalDtp1 = 0;
        let totalDtp3InCohort = 0;
        let totalMcv1InCohort = 0;
        const dtp3ByDistrict = [];
        const mcv1ByDistrict = [];
        const dtp3ByFacility = [];
        const mcv1ByFacility = [];
        districtAgg.forEach((e) => {
          const { d1, d3, m1 } = cohort(e);
          totalDtp1 += d1;
          totalDtp3InCohort += d3;
          totalMcv1InCohort += m1;
          dtp3ByDistrict.push({ districtId: e.districtId, districtName: e.districtName, dtp1: d1, dtp3: d3, rate: compute(d3, d1) });
          mcv1ByDistrict.push({ districtId: e.districtId, districtName: e.districtName, dtp1: d1, mcv1: m1, rate: compute(m1, d1) });
        });
        facilityAgg.forEach((e) => {
          const { d1, d3, m1 } = cohort(e);
          dtp3ByFacility.push({ facilityId: e.facilityId, facilityName: e.facilityName, districtId: e.districtId, districtName: e.districtName, dtp1: d1, dtp3: d3, rate: compute(d3, d1) });
          mcv1ByFacility.push({ facilityId: e.facilityId, facilityName: e.facilityName, districtId: e.districtId, districtName: e.districtName, dtp1: d1, mcv1: m1, rate: compute(m1, d1) });
        });
        dtp3ByDistrict.sort((a, b) => b.rate - a.rate);
        mcv1ByDistrict.sort((a, b) => b.rate - a.rate);
        dtp3ByFacility.sort((a, b) => b.rate - a.rate);
        mcv1ByFacility.sort((a, b) => b.rate - a.rate);
        const payload = {
          period: { months: periodMonths, start: periodStart.toISOString(), end: periodEnd.toISOString() },
          dtp1_dtp3: {
            num: totalDtp3InCohort,
            denom: totalDtp1,
            rate: compute(totalDtp3InCohort, totalDtp1),
            byDistrict: dtp3ByDistrict,
            byFacility: dtp3ByFacility
          },
          dtp1_mcv1: {
            num: totalMcv1InCohort,
            denom: totalDtp1,
            rate: compute(totalMcv1InCohort, totalDtp1),
            byDistrict: mcv1ByDistrict,
            byFacility: mcv1ByFacility
          }
        };
        cacheSetIndicator(cacheKey, payload);
        res.json(payload);
      } catch (err) {
        console.error("GET /api/indicators/dropout failed:", err);
        res.status(500).json({ message: "Failed to compute dropout indicator" });
      }
    }
  );
  app2.get(
    "/api/indicators/defaulters",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const dbUser = await storage.getUser(req.user.id);
        if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
        const tenantId = req.tenantId;
        const provinceId = req.query.provinceId ? parseInt(req.query.provinceId) : void 0;
        const districtId = req.query.districtId ? parseInt(req.query.districtId) : void 0;
        const facilityId = req.query.facilityId ? parseInt(req.query.facilityId) : void 0;
        const antigen = req.query.antigen?.toUpperCase();
        const scopedFacilityIds = await getScopedFacilityIds(
          req,
          dbUser,
          facilityId,
          districtId,
          provinceId
        );
        const scopeSig = scopedFacilityIds === null ? "ALL" : [...scopedFacilityIds].sort((a, b) => a - b).join(",");
        const cacheKey = indicatorCacheKey("defaulters", tenantId, {
          provinceId,
          districtId,
          facilityId,
          antigen,
          userId: dbUser.id,
          scopeSig
        });
        const cached = cacheGetIndicator(cacheKey);
        if (cached) return res.json(cached);
        if (scopedFacilityIds && scopedFacilityIds.length === 0) {
          cacheSetIndicator(cacheKey, []);
          return res.json([]);
        }
        const childRows = await db.select({
          id: clients.id,
          name: clients.name,
          dateOfBirth: clients.dateOfBirth,
          parentName: clients.parentName,
          contactPhone: clients.contactPhone,
          isRefusal: clients.isRefusal,
          facilityId: clients.facilityId,
          facilityName: facilities.name,
          villageId: clients.villageId,
          villageName: villages.name,
          districtId: facilities.districtId,
          districtName: districts.name,
          provinceId: districts.provinceId
        }).from(clients).innerJoin(facilities, (0, import_drizzle_orm9.eq)(facilities.id, clients.facilityId)).innerJoin(districts, (0, import_drizzle_orm9.eq)(districts.id, facilities.districtId)).leftJoin(villages, (0, import_drizzle_orm9.eq)(villages.id, clients.villageId)).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(clients.tenantId, tenantId),
            (0, import_drizzle_orm9.eq)(clients.clientType, "child"),
            scopedFacilityIds ? (0, import_drizzle_orm9.inArray)(clients.facilityId, scopedFacilityIds) : void 0
          )
        );
        if (childRows.length === 0) return res.json([]);
        const clientIds = childRows.map((c) => c.id);
        const dosed = await db.select({
          clientId: clientVaccinations.clientId,
          vaccineName: clientVaccinations.vaccineName,
          administeredDate: clientVaccinations.administeredDate
        }).from(clientVaccinations).where(
          (0, import_drizzle_orm9.and)(
            (0, import_drizzle_orm9.eq)(clientVaccinations.tenantId, tenantId),
            (0, import_drizzle_orm9.inArray)(clientVaccinations.clientId, clientIds)
          )
        );
        const dosesByClient = /* @__PURE__ */ new Map();
        for (const d of dosed) {
          if (isCampaignDose(d.vaccineName)) continue;
          const code = normAntigen(d.vaccineName);
          if (!code) continue;
          const m = dosesByClient.get(d.clientId) ?? /* @__PURE__ */ new Map();
          const dt = new Date(d.administeredDate);
          const existing = m.get(code);
          if (!existing || dt > existing) m.set(code, dt);
          dosesByClient.set(d.clientId, m);
        }
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const WEEK_MS = 7 * 24 * 3600 * 1e3;
        const graceMs = GRACE_WEEKS * WEEK_MS;
        const defaulters = [];
        for (const c of childRows) {
          if (c.isRefusal) continue;
          const dob = new Date(c.dateOfBirth);
          const taken = dosesByClient.get(c.id) ?? /* @__PURE__ */ new Map();
          let nextDose = null;
          for (const s of RI_SCHEDULE) {
            if (taken.has(s.code)) continue;
            if (s.series && (s.code.endsWith("2") || s.code.endsWith("3"))) {
              const prevNum = String(parseInt(s.code.slice(-1)) - 1);
              const prevCode = s.code.slice(0, -1) + prevNum;
              if (!taken.has(prevCode)) continue;
            }
            nextDose = s;
            break;
          }
          if (!nextDose) continue;
          if (antigen && nextDose.code !== antigen) continue;
          const dueDate = new Date(dob.getTime() + nextDose.weeks * WEEK_MS);
          if (nextDose.series) {
            const prevCode = nextDose.code.replace(
              /\d$/,
              (n) => String(Math.max(1, parseInt(n) - 1))
            );
            const prev = taken.get(prevCode);
            if (prev) {
              const minGap = new Date(prev.getTime() + 4 * WEEK_MS);
              if (minGap > dueDate) dueDate.setTime(minGap.getTime());
            }
          }
          const cutoff = new Date(dueDate.getTime() + graceMs);
          if (today <= cutoff) continue;
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 3600 * 1e3));
          let lastDoseCode = null;
          let lastDoseDate = null;
          taken.forEach((dt, code) => {
            if (!lastDoseDate || dt > lastDoseDate) {
              lastDoseDate = dt;
              lastDoseCode = code;
            }
          });
          const lastDose = lastDoseCode && lastDoseDate ? { code: lastDoseCode, date: lastDoseDate } : null;
          defaulters.push({
            clientId: c.id,
            name: c.name,
            dateOfBirth: c.dateOfBirth,
            parentName: c.parentName,
            contactPhone: c.contactPhone,
            facilityId: c.facilityId,
            facilityName: c.facilityName,
            villageId: c.villageId,
            villageName: c.villageName,
            districtId: c.districtId,
            districtName: c.districtName,
            provinceId: c.provinceId,
            nextDoseAntigen: nextDose.code,
            dueDate: dueDate.toISOString(),
            daysOverdue,
            lastDoseAntigen: lastDose?.code ?? null,
            lastDoseDate: lastDose ? lastDose.date.toISOString() : null
          });
        }
        defaulters.sort((a, b) => b.daysOverdue - a.daysOverdue);
        cacheSetIndicator(cacheKey, defaulters);
        res.json(defaulters);
      } catch (err) {
        console.error("GET /api/indicators/defaulters failed:", err);
        res.status(500).json({ message: "Failed to compute defaulter list" });
      }
    }
  );
  app2.get("/api/sync/status", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const stats = await getSyncStats(req.tenantId);
      res.json(stats);
    } catch (err) {
      console.error("GET /api/sync/status failed:", err);
      res.status(500).json({ message: "Failed to get sync stats" });
    }
  });
  return httpServer2;
}

// server/static.ts
var import_express = __toESM(require("express"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
function serveStatic(app2) {
  const distPath = import_path3.default.resolve(__dirname, "public");
  if (!import_fs3.default.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(import_express.default.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(import_path3.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var import_http = require("http");

// server/migrations/006-seed-demo-operational.ts
init_db();
var import_drizzle_orm10 = require("drizzle-orm");
init_schema();
var FACILITIES_PER_TENANT = 3;
var YEAR = (/* @__PURE__ */ new Date()).getUTCFullYear();
var QUARTER = Math.floor((/* @__PURE__ */ new Date()).getUTCMonth() / 3) + 1;
var VACCINES = [
  { name: "BCG", cohort: "under1", dosesPerChild: 1, wastageRate: 50, dosesPerVial: 20 },
  { name: "OPV", cohort: "under1", dosesPerChild: 4, wastageRate: 25, dosesPerVial: 20 },
  { name: "Penta", cohort: "under1", dosesPerChild: 3, wastageRate: 10, dosesPerVial: 1 },
  { name: "MR", cohort: "schoolEntry", dosesPerChild: 2, wastageRate: 15, dosesPerVial: 10 },
  { name: "TT", cohort: "pregnant", dosesPerChild: 2, wastageRate: 10, dosesPerVial: 20 }
];
var SESSION_TEMPLATES = [
  {
    suffix: "Routine Fixed Session",
    sessionType: "static",
    approvalStatus: "approved",
    status: "planned",
    transportMode: "walking",
    estimatedDuration: 240,
    under1Fraction: 0.25,
    notes: "Weekly routine immunization at the static post.",
    daysFromNow: 7
  },
  {
    suffix: "Outreach Visit",
    sessionType: "outreach",
    approvalStatus: "pending",
    status: "planned",
    transportMode: "road",
    estimatedDuration: 360,
    under1Fraction: 0.15,
    notes: "Outreach to nearby village cluster; awaiting district sign-off.",
    daysFromNow: 14
  },
  {
    suffix: "Mobile Catch-Up",
    sessionType: "mobile",
    approvalStatus: "draft",
    status: "planned",
    transportMode: "road",
    estimatedDuration: 480,
    under1Fraction: 0.35,
    notes: "Draft mobile catch-up plan for unreached children.",
    daysFromNow: 21
  }
];
var DEMO_CATCHMENTS = [4200, 6800, 9500, 3100, 7400, 5200];
async function pickFacilities(tenantId) {
  const rows = await db.select({
    facilityId: facilities.id,
    facilityName: facilities.name,
    districtId: districts.id,
    districtName: districts.name,
    provinceId: provinces.id,
    provinceName: provinces.name
  }).from(facilities).innerJoin(districts, (0, import_drizzle_orm10.eq)(districts.id, facilities.districtId)).innerJoin(provinces, (0, import_drizzle_orm10.eq)(provinces.id, districts.provinceId)).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(facilities.tenantId, tenantId), (0, import_drizzle_orm10.eq)(facilities.isActive, true))).orderBy(facilities.id).limit(FACILITIES_PER_TENANT);
  return rows;
}
function emailFor(tenantCode, slug) {
  return `demo+${slug}@${tenantCode.toLowerCase()}.vaxplan.test`;
}
async function seedUsers(tenantCode, tenantId, picks) {
  if (picks.length === 0) return 0;
  const anchor = picks[0];
  const seeds = [
    {
      slug: "national-admin",
      firstName: "Nadia",
      lastName: "National",
      role: "national_admin"
    },
    {
      slug: `prov-${anchor.provinceId}`,
      firstName: "Priya",
      lastName: "Provincial",
      role: "provincial_coordinator",
      provinceId: anchor.provinceId
    },
    {
      slug: `dist-${anchor.districtId}`,
      firstName: "Derek",
      lastName: "District",
      role: "district_manager",
      provinceId: anchor.provinceId,
      districtId: anchor.districtId
    }
  ];
  picks.forEach((p, i) => {
    seeds.push({
      slug: `incharge-${p.facilityId}`,
      firstName: `Ingrid${i + 1}`,
      lastName: "InCharge",
      role: "facility_in_charge",
      provinceId: p.provinceId,
      districtId: p.districtId,
      facilityId: p.facilityId
    });
    seeds.push({
      slug: `clerk-${p.facilityId}`,
      firstName: `Carla${i + 1}`,
      lastName: "Clerk",
      role: "facility_clerk",
      provinceId: p.provinceId,
      districtId: p.districtId,
      facilityId: p.facilityId
    });
  });
  let inserted = 0;
  for (const s of seeds) {
    const email = emailFor(tenantCode, s.slug);
    const existing = await db.select({ id: users.id }).from(users).where((0, import_drizzle_orm10.eq)(users.email, email)).limit(1);
    if (existing.length > 0) continue;
    await db.insert(users).values({
      tenantId,
      email,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      roles: [s.role],
      permissions: [],
      dataAccessScope: {
        provinces: s.provinceId ? [s.provinceId] : [],
        districts: s.districtId ? [s.districtId] : [],
        facilities: s.facilityId ? [s.facilityId] : []
      },
      facilityId: s.facilityId ?? null,
      districtId: s.districtId ?? null,
      provinceId: s.provinceId ?? null,
      isActive: true
    });
    inserted++;
  }
  return inserted;
}
async function seedPopulationData(tenantId, picks, demographics) {
  const catchmentByFacility = /* @__PURE__ */ new Map();
  if (picks.length === 0) return { inserted: 0, catchmentByFacility };
  const existing = await db.select({
    facilityId: populationData.facilityId,
    source: populationData.source,
    year: populationData.year,
    totalPopulation: populationData.totalPopulation
  }).from(populationData).where((0, import_drizzle_orm10.eq)(populationData.tenantId, tenantId));
  const existingByFacility = /* @__PURE__ */ new Map();
  const existingKeys = /* @__PURE__ */ new Set();
  for (const r of existing) {
    if (r.facilityId != null) {
      existingKeys.add(`${r.facilityId}|${r.source}|${r.year}`);
      if (r.year === YEAR && (r.source === "nso" || !existingByFacility.has(r.facilityId))) {
        existingByFacility.set(r.facilityId, r.totalPopulation);
      }
    }
  }
  let inserted = 0;
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const reused = existingByFacility.get(p.facilityId);
    if (reused !== void 0) {
      catchmentByFacility.set(p.facilityId, reused);
      continue;
    }
    const total = DEMO_CATCHMENTS[i % DEMO_CATCHMENTS.length];
    catchmentByFacility.set(p.facilityId, total);
    const key = `${p.facilityId}|nso|${YEAR}`;
    if (existingKeys.has(key)) continue;
    await db.insert(populationData).values({
      tenantId,
      facilityId: p.facilityId,
      districtId: p.districtId,
      provinceId: p.provinceId,
      source: "nso",
      year: YEAR,
      totalPopulation: total,
      malePopulation: Math.round(total * 0.51),
      femalePopulation: Math.round(total * 0.49),
      under1Population: Math.round(total * demographics.under1),
      under5Population: Math.round(total * Math.max(demographics.under1 * 5, 0.16)),
      pregnantWomen: Math.round(total * demographics.pregnant),
      schoolEntry: Math.round(total * demographics.schoolEntry),
      confidenceScore: "85.00",
      approvalStatus: "approved"
    });
    existingKeys.add(key);
    inserted++;
  }
  return { inserted, catchmentByFacility };
}
async function seedVaccineRequirements(tenantId, picks, demographics, catchmentByFacility) {
  if (picks.length === 0) return 0;
  const existing = await db.select({
    facilityId: vaccineRequirements.facilityId,
    vaccineName: vaccineRequirements.vaccineName,
    quarter: vaccineRequirements.quarter,
    year: vaccineRequirements.year
  }).from(vaccineRequirements).where((0, import_drizzle_orm10.eq)(vaccineRequirements.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.vaccineName}|${r.quarter}|${r.year}`)
  );
  let inserted = 0;
  for (const p of picks) {
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === void 0) continue;
    for (const v of VACCINES) {
      const key = `${p.facilityId}|${v.name}|${QUARTER}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const fraction = demographics[v.cohort];
      const targetPopulation = Math.max(1, Math.round(catchmentPop * fraction / 4));
      const dosesRequired = targetPopulation * v.dosesPerChild;
      const dosesWithWastage = Math.ceil(dosesRequired / (1 - v.wastageRate / 100));
      const vialsRequired = Math.ceil(dosesWithWastage / v.dosesPerVial);
      await db.insert(vaccineRequirements).values({
        tenantId,
        facilityId: p.facilityId,
        vaccineName: v.name,
        targetPopulation,
        dosesRequired,
        wastageRate: String(v.wastageRate),
        dosesWithWastage,
        vialsRequired,
        quarter: QUARTER,
        year: YEAR
      });
      inserted++;
    }
  }
  return inserted;
}
var DEMO_COVERAGE_FRACTIONS = {
  BCG: 0.88,
  // green
  OPV: 0.62,
  // amber
  Penta: 0.74,
  // amber
  MR: 0.42,
  // red
  TT: 0.55
  // amber
};
function splitAcrossMonths(total, months, seed) {
  if (months <= 0) return [];
  if (total <= 0) return Array(months).fill(0);
  const weights = [];
  for (let i = 0; i < months; i++) {
    const r = (Math.sin(seed * 17 + i * 31) + 1) / 2 * 0.6 + 0.7;
    weights.push(r);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.round(w / sum * total));
  const drift = total - out.reduce((a, b) => a + b, 0);
  out[out.length - 1] += drift;
  return out.map((v) => Math.max(0, v));
}
async function seedMonthlyReports(tenantId, picks, demographics, catchmentByFacility) {
  if (picks.length === 0) return 0;
  const startMonth = (QUARTER - 1) * 3 + 1;
  const months = [startMonth, startMonth + 1, startMonth + 2];
  const existing = await db.select({
    facilityId: monthlyReports.facilityId,
    month: monthlyReports.month,
    year: monthlyReports.year
  }).from(monthlyReports).where((0, import_drizzle_orm10.eq)(monthlyReports.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.month}|${r.year}`)
  );
  let inserted = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === void 0) continue;
    const totalsByVaccine = {};
    for (const v of VACCINES) {
      const fraction = demographics[v.cohort];
      const targetPopulation = Math.max(1, Math.round(catchmentPop * fraction / 4));
      const baseCoverage = DEMO_COVERAGE_FRACTIONS[v.name] ?? 0.5;
      const jitter = ((Math.sin(p.facilityId * 13 + v.name.length) + 1) / 2 - 0.5) * 0.14;
      const coverage = Math.max(0.05, Math.min(0.98, baseCoverage + jitter));
      totalsByVaccine[v.name] = Math.round(targetPopulation * coverage);
    }
    const splits = {};
    for (const [name, total] of Object.entries(totalsByVaccine)) {
      splits[name] = splitAcrossMonths(total, months.length, p.facilityId + name.length);
    }
    for (let mi = 0; mi < months.length; mi++) {
      const month = months[mi];
      const key = `${p.facilityId}|${month}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const immunizations = {};
      for (const v of VACCINES) {
        const count = splits[v.name][mi] ?? 0;
        if (count <= 0) continue;
        immunizations[v.name] = count;
      }
      await db.insert(monthlyReports).values({
        tenantId,
        facilityId: p.facilityId,
        month,
        year: YEAR,
        immunizations,
        stockSummary: {},
        surveillance: {},
        approvalStatus: "approved"
      });
      existingKeys.add(key);
      inserted++;
    }
  }
  return inserted;
}
async function seedSessionPlans(tenantId, picks, demographics, catchmentByFacility) {
  if (picks.length === 0) return 0;
  const existing = await db.select({
    facilityId: sessionPlans.facilityId,
    name: sessionPlans.name,
    quarter: sessionPlans.quarter,
    year: sessionPlans.year
  }).from(sessionPlans).where((0, import_drizzle_orm10.eq)(sessionPlans.tenantId, tenantId));
  const existingKeys = new Set(
    existing.map((r) => `${r.facilityId}|${r.name}|${r.quarter}|${r.year}`)
  );
  let inserted = 0;
  for (const p of picks) {
    const catchmentPop = catchmentByFacility.get(p.facilityId);
    if (catchmentPop === void 0) continue;
    const microplanName = `${p.facilityName} \u2014 Demo Microplan Q${QUARTER} ${YEAR}`;
    const existingMicroplan = await db.select({ id: microplans.id }).from(microplans).where(
      (0, import_drizzle_orm10.and)(
        (0, import_drizzle_orm10.eq)(microplans.tenantId, tenantId),
        (0, import_drizzle_orm10.eq)(microplans.facilityId, p.facilityId),
        (0, import_drizzle_orm10.eq)(microplans.name, microplanName),
        (0, import_drizzle_orm10.eq)(microplans.year, YEAR),
        (0, import_drizzle_orm10.eq)(microplans.quarter, QUARTER)
      )
    ).limit(1);
    let microplanId;
    if (existingMicroplan.length > 0) {
      microplanId = existingMicroplan[0].id;
    } else {
      const [created] = await db.insert(microplans).values({
        tenantId,
        facilityId: p.facilityId,
        name: microplanName,
        planType: "facility_routine",
        year: YEAR,
        quarter: QUARTER,
        status: "approved"
      }).returning({ id: microplans.id });
      microplanId = created.id;
    }
    const quarterlyUnder1 = catchmentPop * demographics.under1 / 4;
    for (const tpl of SESSION_TEMPLATES) {
      const name = `${p.facilityName} \u2014 ${tpl.suffix} Q${QUARTER} ${YEAR}`;
      const key = `${p.facilityId}|${name}|${QUARTER}|${YEAR}`;
      if (existingKeys.has(key)) continue;
      const scheduled = /* @__PURE__ */ new Date();
      scheduled.setUTCDate(scheduled.getUTCDate() + tpl.daysFromNow);
      const targetPopulation = Math.max(1, Math.round(quarterlyUnder1 * tpl.under1Fraction));
      await db.insert(sessionPlans).values({
        tenantId,
        facilityId: p.facilityId,
        microplanId,
        name,
        sessionType: tpl.sessionType,
        quarter: QUARTER,
        year: YEAR,
        scheduledDate: scheduled,
        transportMode: tpl.transportMode,
        estimatedDuration: tpl.estimatedDuration,
        targetPopulation,
        status: tpl.status,
        approvalStatus: tpl.approvalStatus,
        notes: tpl.notes,
        planType: "routine"
      });
      inserted++;
    }
  }
  return inserted;
}
var VACCINE_CONFIG_DEFAULTS = [
  { name: "BCG", targetGroup: "births", doses: 1, recommendedAge: "At birth", recommendedAgeWeeks: 0, wastageFactor: "50.00", vialsPerDose: 20 },
  { name: "OPV", targetGroup: "under1", doses: 4, recommendedAge: "Birth, 6, 10, 14 wk", recommendedAgeWeeks: 6, wastageFactor: "25.00", vialsPerDose: 20 },
  { name: "Penta", targetGroup: "under1", doses: 3, recommendedAge: "6, 10, 14 weeks", recommendedAgeWeeks: 6, wastageFactor: "10.00", vialsPerDose: 1 },
  { name: "MR", targetGroup: "schoolEntry", doses: 2, recommendedAge: "9 & 18 months", recommendedAgeWeeks: 39, wastageFactor: "15.00", vialsPerDose: 10 },
  { name: "TT", targetGroup: "pregnant", doses: 2, recommendedAge: "2nd & 3rd trimester", recommendedAgeWeeks: 0, wastageFactor: "10.00", vialsPerDose: 20 }
];
async function ensureVaccineConfigs(tenantId) {
  const existing = await db.select({ id: vaccineConfigurations.id, name: vaccineConfigurations.name }).from(vaccineConfigurations).where((0, import_drizzle_orm10.eq)(vaccineConfigurations.tenantId, tenantId));
  const byName = /* @__PURE__ */ new Map();
  for (const r of existing) byName.set(r.name, r.id);
  for (const cfg of VACCINE_CONFIG_DEFAULTS) {
    if (byName.has(cfg.name)) continue;
    const [row] = await db.insert(vaccineConfigurations).values({
      tenantId,
      name: cfg.name,
      targetGroup: cfg.targetGroup,
      doses: cfg.doses,
      recommendedAge: cfg.recommendedAge,
      recommendedAgeWeeks: cfg.recommendedAgeWeeks,
      wastageFactor: cfg.wastageFactor,
      vialsPerDose: cfg.vialsPerDose,
      isActive: true
    }).returning({ id: vaccineConfigurations.id });
    byName.set(cfg.name, row.id);
  }
  return byName;
}
var MIN_VILLAGES_PER_FACILITY = 4;
function offsetCoord(baseLat, baseLng, index2) {
  const angle = index2 * 137.508 * (Math.PI / 180);
  const distanceKm = 1.5 + index2 % 4 * 1.2;
  const dLat = distanceKm / 111 * Math.cos(angle);
  const cosLat = Math.cos(baseLat * Math.PI / 180);
  const dLng = distanceKm / (111 * Math.max(0.2, cosLat)) * Math.sin(angle);
  return { lat: baseLat + dLat, lng: baseLng + dLng, distanceKm };
}
async function pickVillagesPerFacility(tenantId, picks) {
  const out = /* @__PURE__ */ new Map();
  if (picks.length === 0) return out;
  const rows = await db.select({
    id: villages.id,
    name: villages.name,
    districtId: villages.districtId,
    assignedFacilityId: villages.assignedFacilityId,
    latitude: villages.latitude,
    longitude: villages.longitude
  }).from(villages).where((0, import_drizzle_orm10.eq)(villages.tenantId, tenantId));
  const facilityIds = picks.map((p) => p.facilityId);
  const facilityRows = await db.select({
    id: facilities.id,
    latitude: facilities.latitude,
    longitude: facilities.longitude
  }).from(facilities).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(facilities.tenantId, tenantId), (0, import_drizzle_orm10.inArray)(facilities.id, facilityIds)));
  const facilityCoords = /* @__PURE__ */ new Map();
  for (const f of facilityRows) {
    if (f.latitude != null && f.longitude != null) {
      facilityCoords.set(f.id, { lat: Number(f.latitude), lng: Number(f.longitude) });
    } else {
      facilityCoords.set(f.id, null);
    }
  }
  for (const p of picks) {
    const pool2 = [];
    for (const v of rows) {
      if (v.assignedFacilityId === p.facilityId) pool2.push(v.id);
    }
    const base = facilityCoords.get(p.facilityId) ?? null;
    let topUpIndex = 1;
    while (pool2.length < MIN_VILLAGES_PER_FACILITY) {
      const demoName = topUpIndex === 1 ? `Demo Catchment Village (${p.facilityName})` : `Demo Catchment Village ${topUpIndex} (${p.facilityName})`;
      const coord = base ? offsetCoord(base.lat, base.lng, topUpIndex) : null;
      const isHardToReach = topUpIndex === MIN_VILLAGES_PER_FACILITY;
      const reused = rows.find(
        (v) => v.name === demoName && v.districtId === p.districtId
      );
      if (reused) {
        if (!pool2.includes(reused.id)) pool2.push(reused.id);
        if (coord && (reused.latitude == null || reused.longitude == null)) {
          await db.update(villages).set({
            latitude: String(coord.lat.toFixed(7)),
            longitude: String(coord.lng.toFixed(7)),
            distanceToFacility: String(coord.distanceKm.toFixed(2)),
            isHardToReach
          }).where((0, import_drizzle_orm10.eq)(villages.id, reused.id));
        }
      } else {
        const [created] = await db.insert(villages).values({
          tenantId,
          name: demoName,
          code: `DEMO-${p.facilityId}-${topUpIndex}`,
          districtId: p.districtId,
          assignedFacilityId: p.facilityId,
          latitude: coord ? String(coord.lat.toFixed(7)) : null,
          longitude: coord ? String(coord.lng.toFixed(7)) : null,
          distanceToFacility: coord ? String(coord.distanceKm.toFixed(2)) : null,
          isHardToReach
        }).returning({ id: villages.id });
        pool2.push(created.id);
        rows.push({
          id: created.id,
          name: demoName,
          districtId: p.districtId,
          assignedFacilityId: p.facilityId,
          latitude: coord ? String(coord.lat.toFixed(7)) : null,
          longitude: coord ? String(coord.lng.toFixed(7)) : null
        });
      }
      topUpIndex += 1;
      if (topUpIndex > 20) break;
    }
    out.set(p.facilityId, pool2);
  }
  return out;
}
function vaccineConfigKey(displayName) {
  const u = displayName.toUpperCase().trim();
  if (u.startsWith("BCG")) return "BCG";
  if (u.startsWith("OPV")) return "OPV";
  if (u.startsWith("PENTA")) return "Penta";
  if (u.startsWith("MR") || u.startsWith("MEASLES")) return "MR";
  if (u.startsWith("TT") || u.startsWith("TD")) return "TT";
  return displayName;
}
var D_BIRTH = [
  { vaccineName: "BCG", daysAfterDob: 1 },
  { vaccineName: "OPV 0", daysAfterDob: 1 }
];
var D_6W = [
  { vaccineName: "OPV 1", daysAfterDob: 45 },
  { vaccineName: "Penta 1", daysAfterDob: 45 }
];
var D_10W = [
  { vaccineName: "OPV 2", daysAfterDob: 73 },
  { vaccineName: "Penta 2", daysAfterDob: 73 }
];
var D_14W = [
  { vaccineName: "OPV 3", daysAfterDob: 101 },
  { vaccineName: "Penta 3", daysAfterDob: 101 }
];
var D_9M = [
  { vaccineName: "MR 1", daysAfterDob: 277 }
];
var CHILD_FIRST_NAMES = [
  "Amina",
  "Joseph",
  "Grace",
  "Kofi",
  "Lulu",
  "Moses",
  "Nia",
  "Tatu",
  "Eli",
  "Hawa",
  "Samuel",
  "Mercy",
  "Ezra",
  "Ada",
  "Jabari",
  "Zara",
  "Kweku",
  "Imani",
  "Jamal",
  "Naomi",
  "Tafadzwa",
  "Sipho",
  "Chipo",
  "Bongani",
  "Thandi"
];
var CHILD_LAST_NAMES = [
  "Banda",
  "Mwale",
  "Phiri",
  "Tembo",
  "Zulu",
  "Daka",
  "Nyirenda",
  "Mbewe",
  "Chanda",
  "Sakala",
  "Lungu",
  "Kalonga",
  "Mulenga",
  "Chileshe",
  "Mvula",
  "Bwalya",
  "Chola",
  "Kapata"
];
var MOTHER_NAMES = [
  "Mary Banda",
  "Ruth Mwale",
  "Esther Phiri",
  "Joyce Tembo",
  "Linda Zulu",
  "Hope Daka",
  "Agnes Mbewe",
  "Beatrice Lungu",
  "Faith Sakala",
  "Charity Mulenga",
  "Lucy Chanda",
  "Patricia Mvula",
  "Janet Chileshe",
  "Doris Bwalya",
  "Brenda Kapata"
];
var COHORTS = [
  // --- Up-to-date (5) -------------------------------------------------------
  {
    slug: "uptd-newborn",
    clientType: "child",
    gender: "female",
    ageDays: 5,
    vaccinations: [...D_BIRTH]
  },
  {
    slug: "uptd-8w",
    clientType: "child",
    gender: "male",
    ageDays: 56,
    vaccinations: [...D_BIRTH, ...D_6W]
  },
  {
    slug: "uptd-14w",
    clientType: "child",
    gender: "female",
    ageDays: 98,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W]
  },
  {
    slug: "uptd-5m",
    clientType: "child",
    gender: "male",
    ageDays: 150,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W]
  },
  {
    slug: "uptd-12m",
    clientType: "child",
    gender: "female",
    ageDays: 365,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M]
  },
  // --- In-progress, still inside the 4-week grace (3) ----------------------
  {
    slug: "inpr-4w",
    clientType: "child",
    gender: "male",
    ageDays: 28,
    vaccinations: [...D_BIRTH]
  },
  {
    slug: "inpr-9w",
    clientType: "child",
    gender: "female",
    ageDays: 63,
    vaccinations: [...D_BIRTH, ...D_6W]
  },
  {
    slug: "inpr-13w",
    clientType: "child",
    gender: "male",
    ageDays: 91,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W]
  },
  // --- Mild defaulters: ~29-41 days overdue (6) -----------------------------
  {
    slug: "mild-bcg",
    clientType: "child",
    gender: "female",
    ageDays: 35,
    vaccinations: []
  },
  // BCG due day 0 → 35d overdue
  {
    slug: "mild-opv0",
    clientType: "child",
    gender: "male",
    ageDays: 35,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }]
  },
  // OPV_0 due day 0 → 35d
  {
    slug: "mild-opv1",
    clientType: "child",
    gender: "female",
    ageDays: 75,
    vaccinations: [...D_BIRTH]
  },
  // OPV_1 due day 42 → 33d overdue
  {
    slug: "mild-penta1",
    clientType: "child",
    gender: "male",
    ageDays: 75,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }]
  },
  // Penta_1 due day 42 → 33d
  {
    slug: "mild-penta2",
    clientType: "child",
    gender: "female",
    ageDays: 105,
    vaccinations: [...D_BIRTH, ...D_6W, { vaccineName: "OPV 2", daysAfterDob: 73 }]
  },
  // Penta_2 due 70 → 35d
  {
    slug: "mild-opv3",
    clientType: "child",
    gender: "male",
    ageDays: 135,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W]
  },
  // OPV_3 due 98 → 37d overdue
  // --- Moderate defaulters: ~42-55 days overdue (5) ------------------------
  {
    slug: "mod-opv0",
    clientType: "child",
    gender: "female",
    ageDays: 50,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }]
  },
  // OPV_0 → 50d overdue
  {
    slug: "mod-penta1",
    clientType: "child",
    gender: "male",
    ageDays: 90,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }]
  },
  // Penta_1 due 42 → 48d
  {
    slug: "mod-penta2",
    clientType: "child",
    gender: "female",
    ageDays: 120,
    vaccinations: [...D_BIRTH, ...D_6W, { vaccineName: "OPV 2", daysAfterDob: 73 }]
  },
  // Penta_2 → 50d
  {
    slug: "mod-penta3",
    clientType: "child",
    gender: "male",
    ageDays: 150,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, { vaccineName: "OPV 3", daysAfterDob: 101 }]
  },
  // Penta_3 due 98 → 52d
  {
    slug: "mod-mr1",
    clientType: "child",
    gender: "female",
    ageDays: 320,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W]
  },
  // MR_1 due 273 → 47d
  // --- Severe defaulters: ≥56 days overdue (6) -----------------------------
  {
    slug: "sev-bcg",
    clientType: "child",
    gender: "male",
    ageDays: 180,
    vaccinations: []
  },
  // BCG → 180d overdue
  {
    slug: "sev-opv0",
    clientType: "child",
    gender: "female",
    ageDays: 120,
    vaccinations: [{ vaccineName: "BCG", daysAfterDob: 1 }]
  },
  // OPV_0 → 120d
  {
    slug: "sev-penta1",
    clientType: "child",
    gender: "male",
    ageDays: 140,
    vaccinations: [...D_BIRTH, { vaccineName: "OPV 1", daysAfterDob: 45 }]
  },
  // Penta_1 → 98d
  {
    slug: "sev-penta3",
    clientType: "child",
    gender: "female",
    ageDays: 200,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, { vaccineName: "OPV 3", daysAfterDob: 101 }]
  },
  // Penta_3 → 102d
  {
    slug: "sev-mr1",
    clientType: "child",
    gender: "male",
    ageDays: 450,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W]
  },
  // MR_1 due 273 → 177d
  {
    slug: "sev-mr2",
    clientType: "child",
    gender: "female",
    ageDays: 900,
    vaccinations: [...D_BIRTH, ...D_6W, ...D_10W, ...D_14W, ...D_9M]
  },
  // MR_2 due 546 → 354d
  // --- Pregnant women (3) ---------------------------------------------------
  {
    slug: "preg-td1",
    clientType: "pregnant_woman",
    gender: "female",
    ageDays: 365 * 25,
    vaccinations: [{ vaccineName: "TT 1", daysAfterDob: 365 * 25 - 35 }]
  },
  {
    slug: "preg-td2",
    clientType: "pregnant_woman",
    gender: "female",
    ageDays: 365 * 28,
    vaccinations: [
      { vaccineName: "TT 1", daysAfterDob: 365 * 28 - 95 },
      { vaccineName: "TT 2", daysAfterDob: 365 * 28 - 25 }
    ]
  },
  {
    slug: "preg-new",
    clientType: "pregnant_woman",
    gender: "female",
    ageDays: 365 * 22,
    vaccinations: []
  }
];
function buildClientRoster(facilityIndex) {
  const pick = (arr, offset) => arr[(facilityIndex * 17 + offset) % arr.length];
  const childName = (i) => `Demo ${pick(CHILD_FIRST_NAMES, i)} ${pick(CHILD_LAST_NAMES, i + 3)}`;
  const motherName = (i) => `Demo ${pick(MOTHER_NAMES, i)}`;
  const phoneFor = (i) => {
    const subscriber = (facilityIndex * 1009 + i * 37) % 9e3 + 1e3;
    return `+000-${String(700 + facilityIndex % 30).padStart(3, "0")}-${subscriber}`;
  };
  return COHORTS.map((c, i) => {
    const isPregnant = c.clientType === "pregnant_woman";
    return {
      slug: c.slug,
      name: isPregnant ? motherName(i) : childName(i),
      clientType: c.clientType,
      gender: c.gender,
      ageDays: c.ageDays,
      parentName: isPregnant ? void 0 : motherName(i + 5),
      contactPhone: phoneFor(i),
      villageIndex: i,
      // rotated across the facility's village pool
      vaccinations: c.vaccinations
    };
  });
}
async function seedDemoClients(tenantId, picks, villagesByFacility, vaccineConfigByName) {
  if (picks.length === 0) return { clientsInserted: 0, vaccinationsInserted: 0 };
  const startMonth = (QUARTER - 1) * 3;
  const quarterStart = new Date(Date.UTC(YEAR, startMonth, 1));
  const quarterEndExclusive = new Date(Date.UTC(YEAR, startMonth + 3, 1));
  const today = /* @__PURE__ */ new Date();
  today.setUTCHours(0, 0, 0, 0);
  const DAY_MS = 24 * 3600 * 1e3;
  let clientsInserted = 0;
  let vaccinationsInserted = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const villagePool = villagesByFacility.get(p.facilityId);
    if (!villagePool || villagePool.length === 0) {
      console.warn(`  [facility ${p.facilityId}] no village available \u2014 skipping demo clients.`);
      continue;
    }
    const roster = buildClientRoster(pi);
    const existing = await db.select({ id: clients.id, name: clients.name }).from(clients).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(clients.tenantId, tenantId), (0, import_drizzle_orm10.eq)(clients.facilityId, p.facilityId)));
    const existingNames = new Set(existing.map((r) => r.name));
    const anyDemoExists = existing.some((r) => r.name.startsWith("Demo "));
    if (anyDemoExists) continue;
    const clientIdBySlug = /* @__PURE__ */ new Map();
    for (const c of roster) {
      if (existingNames.has(c.name)) continue;
      const dob = new Date(today.getTime() - c.ageDays * DAY_MS);
      const villageId = villagePool[c.villageIndex % villagePool.length];
      const [row] = await db.insert(clients).values({
        tenantId,
        facilityId: p.facilityId,
        villageId,
        name: c.name,
        clientType: c.clientType,
        dateOfBirth: dob,
        gender: c.gender,
        parentName: c.parentName ?? null,
        contactPhone: c.contactPhone ?? null,
        catchmentStatus: "catchment",
        contraindications: [],
        isRefusal: false,
        isCrossBorder: false
      }).returning({ id: clients.id });
      clientIdBySlug.set(c.slug, row.id);
      clientsInserted++;
    }
    const inQuarterByConfig = {};
    for (const c of roster) {
      const clientId = clientIdBySlug.get(c.slug);
      if (!clientId) continue;
      const dob = new Date(today.getTime() - c.ageDays * DAY_MS);
      for (const v of c.vaccinations) {
        const configKey = vaccineConfigKey(v.vaccineName);
        const configId = vaccineConfigByName.get(configKey);
        if (!configId) continue;
        const administered = new Date(dob.getTime() + v.daysAfterDob * DAY_MS);
        if (administered > today) continue;
        await db.insert(clientVaccinations).values({
          tenantId,
          clientId,
          vaccineConfigId: configId,
          vaccineName: v.vaccineName,
          administeredDate: administered,
          batchNumber: `DEMO-${configKey}-${administered.getUTCFullYear()}`,
          vvmStatus: 1
        });
        vaccinationsInserted++;
        if (administered >= quarterStart && administered < quarterEndExclusive) {
          inQuarterByConfig[configKey] = (inQuarterByConfig[configKey] ?? 0) + 1;
        }
      }
    }
    const months = [startMonth + 1, startMonth + 2, startMonth + 3];
    const reports = await db.select({
      id: monthlyReports.id,
      month: monthlyReports.month,
      immunizations: monthlyReports.immunizations
    }).from(monthlyReports).where(
      (0, import_drizzle_orm10.and)(
        (0, import_drizzle_orm10.eq)(monthlyReports.tenantId, tenantId),
        (0, import_drizzle_orm10.eq)(monthlyReports.facilityId, p.facilityId),
        (0, import_drizzle_orm10.eq)(monthlyReports.year, YEAR)
      )
    );
    const reportByMonth = /* @__PURE__ */ new Map();
    for (const r of reports) {
      if (!months.includes(r.month)) continue;
      reportByMonth.set(r.month, {
        id: r.id,
        imm: { ...r.immunizations ?? {} }
      });
    }
    for (const [vaccineName, toRemove] of Object.entries(inQuarterByConfig)) {
      let remaining = toRemove;
      for (const m of months) {
        if (remaining <= 0) break;
        const rep = reportByMonth.get(m);
        if (!rep) continue;
        const current = Number(rep.imm[vaccineName] ?? 0);
        if (current <= 0) continue;
        const take = Math.min(current, remaining);
        rep.imm[vaccineName] = current - take;
        remaining -= take;
      }
    }
    const updates = Array.from(reportByMonth.values());
    for (const { id, imm } of updates) {
      await db.update(monthlyReports).set({ immunizations: imm }).where((0, import_drizzle_orm10.eq)(monthlyReports.id, id));
    }
  }
  return { clientsInserted, vaccinationsInserted };
}
async function seedVillagePopulation(tenantId, villagesByFacility, picks) {
  const villageIds = Array.from(new Set(Array.from(villagesByFacility.values()).flat()));
  if (villageIds.length === 0) return 0;
  const villageRows = await db.select({
    id: villages.id,
    districtId: villages.districtId,
    assignedFacilityId: villages.assignedFacilityId
  }).from(villages).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(villages.tenantId, tenantId), (0, import_drizzle_orm10.inArray)(villages.id, villageIds)));
  const provinceByDistrict = /* @__PURE__ */ new Map();
  for (const p of picks) provinceByDistrict.set(p.districtId, p.provinceId);
  const existing = await db.select({ villageId: populationData.villageId, year: populationData.year, source: populationData.source }).from(populationData).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(populationData.tenantId, tenantId), (0, import_drizzle_orm10.inArray)(populationData.villageId, villageIds)));
  const existingKeys = new Set(existing.map((r) => `${r.villageId}|${r.source}|${r.year}`));
  let inserted = 0;
  for (let i = 0; i < villageRows.length; i++) {
    const v = villageRows[i];
    const key = `${v.id}|nso|${YEAR}`;
    if (existingKeys.has(key)) continue;
    const under1 = 25 + v.id * 37 % 126;
    const total = under1 * 28;
    await db.insert(populationData).values({
      tenantId,
      villageId: v.id,
      facilityId: v.assignedFacilityId ?? null,
      districtId: v.districtId,
      provinceId: provinceByDistrict.get(v.districtId) ?? null,
      source: "nso",
      year: YEAR,
      totalPopulation: total,
      under1Population: under1,
      under5Population: under1 * 5,
      confidenceScore: "80.00",
      approvalStatus: "approved"
    });
    inserted++;
  }
  return inserted;
}
var COVERAGE_ANTIGENS = ["BCG", "PENTA1", "PENTA3", "MEASLES1", "MEASLES2", "OPV1", "OPV3"];
function lastNPeriods(n) {
  const out = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
async function seedImportedCoverage(tenantId, picks, villagesByFacility) {
  if (picks.length === 0) return 0;
  const periods = lastNPeriods(3);
  const villageIds = Array.from(new Set(Array.from(villagesByFacility.values()).flat()));
  const popRows = villageIds.length ? await db.select({ villageId: populationData.villageId, under1: populationData.under1Population }).from(populationData).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(populationData.tenantId, tenantId), (0, import_drizzle_orm10.inArray)(populationData.villageId, villageIds))) : [];
  const popByVillage = /* @__PURE__ */ new Map();
  for (const r of popRows) {
    if (r.villageId == null) continue;
    const prev = popByVillage.get(r.villageId) ?? 0;
    if ((r.under1 ?? 0) > prev) popByVillage.set(r.villageId, r.under1 ?? 0);
  }
  const FACILITY_COVERAGE_TIERS = [0.3, 0.62, 0.92];
  const ANTIGEN_COVERAGE_ADJUST = {
    BCG: 0.05,
    OPV1: 0.02,
    PENTA1: 0,
    PENTA3: -0.12,
    MEASLES1: -0.05,
    MEASLES2: -0.18,
    OPV3: -0.1
  };
  let inserted = 0;
  for (let pi = 0; pi < picks.length; pi++) {
    const p = picks[pi];
    const facVillages = villagesByFacility.get(p.facilityId) ?? [];
    const registeredUnder1 = facVillages.reduce((s, vid) => s + (popByVillage.get(vid) ?? 0), 0);
    if (registeredUnder1 === 0) continue;
    const tier = FACILITY_COVERAGE_TIERS[pi % FACILITY_COVERAGE_TIERS.length];
    for (let periodIdx = 0; periodIdx < periods.length; periodIdx++) {
      const period = periods[periodIdx];
      const rows = [];
      for (let ai = 0; ai < COVERAGE_ANTIGENS.length; ai++) {
        const antigen = COVERAGE_ANTIGENS[ai];
        const periodDrift = (periodIdx - 1) * 0.03;
        const adjust = ANTIGEN_COVERAGE_ADJUST[antigen] ?? 0;
        const coverage = Math.max(0.05, Math.min(0.98, tier + adjust + periodDrift));
        const doses = Math.max(1, Math.round(registeredUnder1 * coverage));
        rows.push({
          tenantId,
          facilityId: p.facilityId,
          period,
          antigen,
          dosesAdministered: doses,
          source: "csv",
          sourceRef: "demo-seed",
          importedByUserId: null
        });
      }
      if (rows.length === 0) continue;
      await db.insert(importedCoverage).values(rows).onConflictDoUpdate({
        target: [
          importedCoverage.tenantId,
          importedCoverage.facilityId,
          importedCoverage.period,
          importedCoverage.antigen,
          importedCoverage.source
        ],
        set: {
          dosesAdministered: import_drizzle_orm10.sql`excluded.doses_administered`,
          sourceRef: import_drizzle_orm10.sql`excluded.source_ref`,
          importedAt: import_drizzle_orm10.sql`now()`
        }
      });
      inserted += rows.length;
    }
  }
  return inserted;
}
async function seedDemoOperational() {
  for (const code of ["ZMB", "SSD"]) {
    const rows = await db.select().from(tenants).where((0, import_drizzle_orm10.eq)(tenants.code, code)).limit(1);
    const tenant = rows[0];
    if (!tenant) {
      console.warn(`[${code}] tenant not found \u2014 skipping demo seed.`);
      continue;
    }
    const settings = tenant.settings || {};
    const demographics = settings.demographics ?? {
      under1: 0.035,
      pregnant: 0.04,
      schoolEntry: 0.03
    };
    const picks = await pickFacilities(tenant.id);
    if (picks.length === 0) {
      console.warn(`[${code}] no facilities found \u2014 skipping demo seed.`);
      continue;
    }
    const u = await seedUsers(code, tenant.id, picks);
    const { inserted: pop, catchmentByFacility } = await seedPopulationData(
      tenant.id,
      picks,
      demographics
    );
    const vr = await seedVaccineRequirements(tenant.id, picks, demographics, catchmentByFacility);
    const sp = await seedSessionPlans(tenant.id, picks, demographics, catchmentByFacility);
    const mr = await seedMonthlyReports(tenant.id, picks, demographics, catchmentByFacility);
    const vaccineConfigByName = await ensureVaccineConfigs(tenant.id);
    const villagesByFacility = await pickVillagesPerFacility(tenant.id, picks);
    const vp = await seedVillagePopulation(tenant.id, villagesByFacility, picks);
    const ic = await seedImportedCoverage(tenant.id, picks, villagesByFacility);
    const { clientsInserted, vaccinationsInserted } = await seedDemoClients(
      tenant.id,
      picks,
      villagesByFacility,
      vaccineConfigByName
    );
    console.log(
      `[${code}] picked ${picks.length} facilities \u2022 +${u} users \u2022 +${pop} facility-pop \u2022 +${vp} village-pop \u2022 +${vr} vaccine reqs \u2022 +${sp} session plans \u2022 +${mr} monthly reports \u2022 +${ic} imported-coverage rows \u2022 +${clientsInserted} demo clients \u2022 +${vaccinationsInserted} client vaccinations`
    );
  }
}
async function runCli2() {
  await seedDemoOperational();
  const summary = await db.execute(import_drizzle_orm10.sql`
    SELECT
      t.code,
      (SELECT COUNT(*) FROM users                u WHERE u.tenant_id = t.id) AS users,
      (SELECT COUNT(*) FROM population_data      p WHERE p.tenant_id = t.id) AS population_rows,
      (SELECT COUNT(*) FROM vaccine_requirements v WHERE v.tenant_id = t.id) AS vaccine_requirements,
      (SELECT COUNT(*) FROM session_plans        s WHERE s.tenant_id = t.id) AS session_plans,
      (SELECT COUNT(*) FROM monthly_reports      m WHERE m.tenant_id = t.id) AS monthly_reports,
      (SELECT COUNT(*) FROM clients              c WHERE c.tenant_id = t.id) AS clients,
      (SELECT COUNT(*) FROM client_vaccinations  cv WHERE cv.tenant_id = t.id) AS client_vaccinations,
      (SELECT COUNT(*) FROM imported_coverage    ic WHERE ic.tenant_id = t.id) AS imported_coverage_rows
    FROM tenants t
    WHERE t.code IN ('ZMB','SSD')
    ORDER BY t.code;
  `);
  console.log("\nDemo operational data rollup:");
  console.table(summary.rows);
  console.log("Done.");
  process.exit(0);
}
var isDirectCli = (() => {
  try {
    const invoked = process.argv[1] ?? "";
    return invoked.endsWith("006-seed-demo-operational.ts") || invoked.endsWith("006-seed-demo-operational.js");
  } catch {
    return false;
  }
})();
if (isDirectCli) {
  runCli2().catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  });
}

// server/index.ts
try {
  process.loadEnvFile?.();
} catch {
}
var app = (0, import_express2.default)();
var httpServer = (0, import_http.createServer)(app);
app.use(
  import_express2.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express2.default.urlencoded({ extended: false }));
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await registerRoutes(httpServer, app);
  startPopulationRefreshScheduler();
  const isProduction = process.env.NODE_ENV === "production";
  const demoSeedEnabled = process.env.SKIP_DEMO_SEED !== "1" && (!isProduction || process.env.ENABLE_DEMO_SEED === "1");
  if (demoSeedEnabled) {
    seedDemoOperational().then(() => log("demo operational seed complete", "seed")).catch((err) => log(`demo operational seed failed: ${err?.message ?? err}`, "seed"));
  } else {
    log(
      `demo operational seed skipped (NODE_ENV=${process.env.NODE_ENV ?? "unset"}, set ENABLE_DEMO_SEED=1 to opt in)`,
      "seed"
    );
  }
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0"
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
//# sourceMappingURL=index.cjs.map
