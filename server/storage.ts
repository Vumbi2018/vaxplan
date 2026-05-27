import {
  users,
  regions,
  provinces,
  districts,
  llgs,
  facilities,
  villages,
  populationData,
  sessionPlans,
  sessionVillages,
  microplans,
  type Microplan,
  type InsertMicroplan,
  budgetItems,
  vaccineRequirements,
  mobilizationActivities,
  supervisionVisits,
  approvalRequests,
  auditLogs,
  htrScores,
  signupRequests,
  tenantInterestRequests,
  adminBoundaries,
  facilityCatchments,
  vaccineConfigurations,
  clients,
  clientVaccinations,
  sessionDayPlans,
  stockTransactions,
  monthlyReports,
  type User,
  type UpsertUser,
  type SignupRequest,
  type InsertSignupRequest,
  type TenantInterestRequest,
  type InsertTenantInterestRequest,
  type Region,
  type InsertRegion,
  type Province,
  type InsertProvince,
  type District,
  type InsertDistrict,
  type Llg,
  type InsertLlg,
  type Facility,
  type InsertFacility,
  type Village,
  type InsertVillage,
  type PopulationData,
  type InsertPopulationData,
  type SessionPlan,
  type InsertSessionPlan,
  type BudgetItem,
  type InsertBudgetItem,
  type VaccineRequirement,
  type InsertVaccineRequirement,
  type MobilizationActivity,
  type InsertMobilizationActivity,
  type SupervisionVisit,
  type InsertSupervisionVisit,
  type ApprovalRequest,
  type InsertApprovalRequest,
  type AuditLog,
  type HtrScore,
  type AdminBoundary,
  type InsertAdminBoundary,
  type FacilityCatchment,
  type InsertFacilityCatchment,
  tenants,
  tenantIdpConfigs,
  type Tenant,
  type TenantIdpConfig,
  type InsertTenant,
  type VaccineConfig,
  type InsertVaccineConfig,
  type Client,
  type InsertClient,
  type ClientVaccination,
  type InsertClientVaccination,
  type SessionDayPlan,
  type InsertSessionDayPlan,
  type StockTransaction,
  type InsertStockTransaction,
  type MonthlyReport,
  type InsertMonthlyReport,
  userRoles,
  type CustomUserRole,
  type InsertUserRole,
} from "@shared/schema";
import type { UserRole } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // Users (cross-tenant operations — user identity is global, tenant assigned separately)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  assignUserTenant(userId: string, tenantId: string): Promise<void>;
  assignUserTenantAndRole(userId: string, tenantId: string, role: UserRole): Promise<void>;
  listUsers(tenantId: string): Promise<User[]>;
  updateUserRolesAndPermissions(id: string, roles: string[], permissions: string[], scope: any): Promise<User | undefined>;
  createUser(tenantId: string, data: any): Promise<User>;
  updateUser(tenantId: string, id: string, data: any): Promise<User | undefined>;
  deleteUser(tenantId: string, id: string): Promise<boolean>;

  // Tenants & IdP configs (control plane)
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByCode(code: string): Promise<Tenant | undefined>;
  listActiveTenants(): Promise<Tenant[]>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<Omit<Tenant, "id" | "createdAt" | "updatedAt">>): Promise<Tenant | undefined>;
  getIdpConfig(id: string): Promise<TenantIdpConfig | undefined>;
  getIdpConfigByEmailDomain(domain: string): Promise<TenantIdpConfig | undefined>;
  listIdpConfigs(tenantId: string): Promise<TenantIdpConfig[]>;

  // Signup requests (control plane — public POST + tenant-scoped admin reads/decisions)
  createSignupRequest(data: InsertSignupRequest): Promise<SignupRequest>;
  listSignupRequests(tenantId: string, status?: string): Promise<SignupRequest[]>;
  getSignupRequest(id: string): Promise<SignupRequest | undefined>;
  decideSignupRequest(
    tenantId: string,
    id: string,
    decision: "approved" | "rejected",
    approverUserId: string,
    reason?: string,
  ): Promise<SignupRequest | undefined>;
  findApprovedSignupForEmail(email: string): Promise<SignupRequest | undefined>;

  // Tenant onboarding-interest leads (public, no auth)
  createTenantInterestRequest(data: InsertTenantInterestRequest): Promise<TenantInterestRequest>;

  // Domain reads/writes — every method is tenant-scoped.
  getRegions(tenantId: string): Promise<Region[]>;
  getRegion(tenantId: string, id: number): Promise<Region | undefined>;
  createRegion(tenantId: string, data: InsertRegion): Promise<Region>;
  updateRegion(tenantId: string, id: number, data: Partial<InsertRegion>): Promise<Region | undefined>;

  getLlgs(tenantId: string, districtId?: number): Promise<Llg[]>;
  getLlg(tenantId: string, id: number): Promise<Llg | undefined>;
  createLlg(tenantId: string, data: InsertLlg): Promise<Llg>;
  updateLlg(tenantId: string, id: number, data: Partial<InsertLlg>): Promise<Llg | undefined>;

  getProvinces(tenantId: string, regionId?: number): Promise<Province[]>;
  getProvince(tenantId: string, id: number): Promise<Province | undefined>;
  createProvince(tenantId: string, data: InsertProvince): Promise<Province>;

  getDistricts(tenantId: string, provinceId?: number): Promise<District[]>;
  getDistrict(tenantId: string, id: number): Promise<District | undefined>;
  createDistrict(tenantId: string, data: InsertDistrict): Promise<District>;

  getFacilities(tenantId: string, districtId?: number): Promise<Facility[]>;
  getFacility(tenantId: string, id: number): Promise<Facility | undefined>;
  createFacility(tenantId: string, data: InsertFacility): Promise<Facility>;
  updateFacility(tenantId: string, id: number, data: Partial<InsertFacility>): Promise<Facility | undefined>;
  deleteFacility(tenantId: string, id: number): Promise<boolean>;

  getVillages(tenantId: string, districtId?: number, facilityId?: number): Promise<Village[]>;
  getVillage(tenantId: string, id: number): Promise<Village | undefined>;
  createVillage(tenantId: string, data: InsertVillage): Promise<Village>;
  updateVillage(tenantId: string, id: number, data: Partial<InsertVillage>): Promise<Village | undefined>;
  deleteVillage(tenantId: string, id: number): Promise<boolean>;

  getPopulationData(tenantId: string, filters?: {
    source?: string;
    provinceId?: number;
    districtId?: number;
    villageId?: number;
    facilityId?: number;
    year?: number;
  }): Promise<PopulationData[]>;
  getPopulationDataById(tenantId: string, id: number): Promise<PopulationData | undefined>;
  createPopulationData(tenantId: string, data: InsertPopulationData): Promise<PopulationData>;
  updatePopulationData(tenantId: string, id: number, data: Partial<InsertPopulationData>): Promise<PopulationData | undefined>;
  deletePopulationData(tenantId: string, id: number): Promise<boolean>;

  // --- Microplans ---
  getMicroplans(tenantId: string): Promise<Microplan[]>;
  getMicroplan(tenantId: string, id: number): Promise<Microplan | undefined>;
  createMicroplan(tenantId: string, data: InsertMicroplan): Promise<Microplan>;
  updateMicroplan(tenantId: string, id: number, data: Partial<InsertMicroplan>): Promise<Microplan | undefined>;
  deleteMicroplan(tenantId: string, id: number): Promise<boolean>;

  getSessionPlans(tenantId: string, facilityId?: number): Promise<SessionPlan[]>;
  getSessionPlan(tenantId: string, id: number): Promise<SessionPlan | undefined>;
  createSessionPlan(tenantId: string, data: InsertSessionPlan): Promise<SessionPlan>;
  updateSessionPlan(tenantId: string, id: number, data: Partial<InsertSessionPlan>): Promise<SessionPlan | undefined>;
  deleteSessionPlan(tenantId: string, id: number): Promise<boolean>;

  getBudgetItems(tenantId: string, facilityId?: number, quarter?: number, year?: number): Promise<BudgetItem[]>;
  createBudgetItem(tenantId: string, data: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(tenantId: string, id: number, data: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(tenantId: string, id: number): Promise<boolean>;

  getVaccineRequirements(tenantId: string, facilityId?: number): Promise<VaccineRequirement[]>;
  createVaccineRequirement(tenantId: string, data: InsertVaccineRequirement): Promise<VaccineRequirement>;
  updateVaccineRequirement(tenantId: string, id: number, data: Partial<InsertVaccineRequirement>): Promise<VaccineRequirement | undefined>;

  getMobilizationActivities(tenantId: string, facilityId?: number): Promise<MobilizationActivity[]>;
  createMobilizationActivity(tenantId: string, data: InsertMobilizationActivity): Promise<MobilizationActivity>;
  updateMobilizationActivity(tenantId: string, id: number, data: Partial<InsertMobilizationActivity>): Promise<MobilizationActivity | undefined>;

  getSupervisionVisits(tenantId: string, filters?: { facilityId?: number; microplanId?: number; status?: string }): Promise<SupervisionVisit[]>;
  getSupervisionVisit(tenantId: string, id: number): Promise<SupervisionVisit | undefined>;
  createSupervisionVisit(tenantId: string, data: InsertSupervisionVisit): Promise<SupervisionVisit>;
  updateSupervisionVisit(tenantId: string, id: number, data: Partial<InsertSupervisionVisit>): Promise<SupervisionVisit | undefined>;
  deleteSupervisionVisit(tenantId: string, id: number): Promise<boolean>;

  listAuditLogs(tenantId: string, filters?: { userId?: string; entityType?: string; entityId?: string; limit?: number }): Promise<AuditLog[]>;

  getApprovalRequests(tenantId: string, status?: string): Promise<ApprovalRequest[]>;
  getApprovalRequest(tenantId: string, id: number): Promise<ApprovalRequest | undefined>;
  createApprovalRequest(tenantId: string, data: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(tenantId: string, id: number, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined>;

  getHtrScores(tenantId: string, villageId?: number): Promise<HtrScore[]>;
  upsertHtrScore(tenantId: string, data: any): Promise<HtrScore>;

  createAuditLog(tenantId: string, data: Omit<AuditLog, "id" | "createdAt" | "tenantId">): Promise<AuditLog>;

  // Admin Boundaries
  listAdminBoundaries(tenantId: string, adminLevel?: number): Promise<Omit<AdminBoundary, "geojson">[]>;
  getAdminBoundary(tenantId: string, id: string): Promise<AdminBoundary | undefined>;
  getAdminBoundaryByLevel(tenantId: string, adminLevel: number): Promise<AdminBoundary | undefined>;
  upsertAdminBoundary(data: InsertAdminBoundary & { tenantId: string }): Promise<AdminBoundary>;
  deleteAdminBoundary(tenantId: string, id: string): Promise<boolean>;

  // Facility Catchments
  getFacilityCatchments(tenantId: string, facilityId: number): Promise<FacilityCatchment[]>;
  getFacilityCatchment(tenantId: string, id: string): Promise<FacilityCatchment | undefined>;
  createFacilityCatchment(tenantId: string, data: InsertFacilityCatchment): Promise<FacilityCatchment>;
  updateFacilityCatchment(tenantId: string, id: string, data: Partial<InsertFacilityCatchment>): Promise<FacilityCatchment | undefined>;
  deleteFacilityCatchment(tenantId: string, id: string): Promise<boolean>;
  getAllFacilityCatchments(tenantId: string): Promise<FacilityCatchment[]>;

  // --- 1. Vaccine configurations (dynamic schedule config) ---
  getVaccineConfigs(tenantId: string): Promise<VaccineConfig[]>;
  getVaccineConfig(tenantId: string, id: number): Promise<VaccineConfig | undefined>;
  createVaccineConfig(tenantId: string, data: InsertVaccineConfig): Promise<VaccineConfig>;
  updateVaccineConfig(tenantId: string, id: number, data: Partial<InsertVaccineConfig>): Promise<VaccineConfig | undefined>;

  // --- 2. Clients ---
  getClients(tenantId: string, facilityId?: number, clientType?: string): Promise<Client[]>;
  getClient(tenantId: string, id: string): Promise<Client | undefined>;
  createClient(tenantId: string, data: InsertClient): Promise<Client>;
  updateClient(tenantId: string, id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(tenantId: string, id: string): Promise<boolean>;

  // --- 3. Client Vaccinations ---
  getClientVaccinations(tenantId: string, clientId: string): Promise<ClientVaccination[]>;
  createClientVaccination(tenantId: string, data: InsertClientVaccination): Promise<ClientVaccination>;
  deleteClientVaccination(tenantId: string, id: number): Promise<boolean>;

  // --- 4. Session Day Plans ---
  getSessionDayPlans(tenantId: string, sessionPlanId: number): Promise<SessionDayPlan[]>;
  createSessionDayPlan(tenantId: string, data: InsertSessionDayPlan): Promise<SessionDayPlan>;
  updateSessionDayPlan(tenantId: string, id: number, data: Partial<InsertSessionDayPlan>): Promise<SessionDayPlan | undefined>;
  deleteSessionDayPlan(tenantId: string, id: number): Promise<boolean>;

  // --- 5. Stock Transactions ---
  getStockTransactions(tenantId: string, facilityId?: number): Promise<StockTransaction[]>;
  createStockTransaction(tenantId: string, data: InsertStockTransaction): Promise<StockTransaction>;
  deleteStockTransaction(tenantId: string, id: number): Promise<boolean>;

  // --- 6. Monthly Reports ---
  getMonthlyReports(tenantId: string, facilityId?: number): Promise<MonthlyReport[]>;
  getMonthlyReport(tenantId: string, id: number): Promise<MonthlyReport | undefined>;
  createMonthlyReport(tenantId: string, data: InsertMonthlyReport): Promise<MonthlyReport>;
  updateMonthlyReport(tenantId: string, id: number, data: Partial<InsertMonthlyReport>): Promise<MonthlyReport | undefined>;
  
  // --- 7. Custom User Roles ---
  getUserRoles(tenantId: string): Promise<CustomUserRole[]>;
  getUserRole(tenantId: string, id: number): Promise<CustomUserRole | undefined>;
  getUserRoleByCode(tenantId: string, code: string): Promise<CustomUserRole | undefined>;
  /* Original Code:
  createUserRole(tenantId: string, data: InsertUserRole): Promise<CustomUserRole>;
  updateUserRole(tenantId: string, id: number, data: Partial<InsertUserRole>): Promise<CustomUserRole | undefined>;
  */
  createUserRole(tenantId: string, data: Omit<InsertUserRole, "tenantId">): Promise<CustomUserRole>;
  updateUserRole(tenantId: string, id: number, data: Partial<Omit<InsertUserRole, "tenantId">>): Promise<CustomUserRole | undefined>;
  deleteUserRole(tenantId: string, id: number): Promise<boolean>;
}

// Helper: AND together a tenant filter with one or more additional conditions.
function withTenant<T extends { tenantId: any }>(
  table: T,
  tenantId: string,
  ...extra: any[]
) {
  const conds = [eq(table.tenantId, tenantId), ...extra.filter(Boolean)];
  return conds.length === 1 ? conds[0] : and(...conds);
}

export class DatabaseStorage implements IStorage {
  // --- Users ---
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return u;
  }

  async assignUserTenant(userId: string, tenantId: string): Promise<void> {
    await db
      .update(users)
      .set({ tenantId, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.tenantId)));
  }

  async assignUserTenantAndRole(userId: string, tenantId: string, role: UserRole): Promise<void> {
    await db
      .update(users)
      .set({ tenantId, role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.tenantId)));
  }

  async listUsers(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async updateUserRolesAndPermissions(id: string, roles: string[], permissions: string[], scope: any): Promise<User | undefined> {
    const [u] = await db
      .update(users)
      .set({ 
        roles, 
        permissions, 
        dataAccessScope: scope,
        role: roles.length > 0 ? roles[0] as any : "facility_clerk",
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return u;
  }

  async createUser(tenantId: string, data: any): Promise<User> {
    const id = data.id || `user-${Date.now()}`;
    const [row] = await db
      .insert(users)
      .values({
        ...data,
        id,
        tenantId,
        role: data.roles && data.roles.length > 0 ? data.roles[0] as any : "facility_clerk",
        roles: data.roles || ["facility_clerk"],
        permissions: data.permissions || [],
        dataAccessScope: data.dataAccessScope || { provinces: [], districts: [], facilities: [] },
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();
    return row;
  }

  async updateUser(tenantId: string, id: string, data: any): Promise<User | undefined> {
    const [row] = await db
      .update(users)
      .set({
        ...data,
        role: data.roles && data.roles.length > 0 ? data.roles[0] as any : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteUser(tenantId: string, id: string): Promise<boolean> {
    await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
    return true;
  }

  // --- Custom User Roles ---
  async getUserRoles(tenantId: string): Promise<CustomUserRole[]> {
    return await db.select().from(userRoles).where(eq(userRoles.tenantId, tenantId));
  }

  async getUserRole(tenantId: string, id: number): Promise<CustomUserRole | undefined> {
    const [row] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, tenantId)));
    return row;
  }

  async getUserRoleByCode(tenantId: string, code: string): Promise<CustomUserRole | undefined> {
    const [row] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.code, code), eq(userRoles.tenantId, tenantId)));
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
  async createUserRole(tenantId: string, data: Omit<InsertUserRole, "tenantId">): Promise<CustomUserRole> {
    const [row] = await db
      .insert(userRoles)
      .values({ ...data, tenantId } as InsertUserRole)
      .returning();
    return row;
  }

  async updateUserRole(tenantId: string, id: number, data: Partial<Omit<InsertUserRole, "tenantId">>): Promise<CustomUserRole | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [row] = await db
      .update(userRoles)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteUserRole(tenantId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(userRoles)
      .where(and(eq(userRoles.id, id), eq(userRoles.tenantId, tenantId)))
      .returning({ id: userRoles.id });
    return rows.length > 0;
  }

  // --- Tenants & IdP configs ---
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [t] = await db.select().from(tenants).where(eq(tenants.id, id));
    return t;
  }
  async getTenantByCode(code: string): Promise<Tenant | undefined> {
    const [t] = await db.select().from(tenants).where(eq(tenants.code, code));
    return t;
  }
  async listActiveTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.status, "active"));
  }
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [row] = await db
      .insert(tenants)
      .values(data)
      .returning();
    return row;
  }
  async updateTenant(id: string, data: Partial<Omit<Tenant, "id" | "createdAt" | "updatedAt">>): Promise<Tenant | undefined> {
    const [row] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return row;
  }

  // --- Signup requests ---
  async createSignupRequest(data: InsertSignupRequest): Promise<SignupRequest> {
    const [row] = await db
      .insert(signupRequests)
      .values({ ...data, email: data.email.toLowerCase() } as typeof signupRequests.$inferInsert)
      .returning();
    return row;
  }
  async listSignupRequests(tenantId: string, status?: string): Promise<SignupRequest[]> {
    const conds = [eq(signupRequests.tenantId, tenantId)];
    if (status) conds.push(eq(signupRequests.status, status as any));
    return await db
      .select()
      .from(signupRequests)
      .where(and(...conds))
      .orderBy(desc(signupRequests.createdAt));
  }
  async getSignupRequest(id: string): Promise<SignupRequest | undefined> {
    const [r] = await db.select().from(signupRequests).where(eq(signupRequests.id, id));
    return r;
  }
  async decideSignupRequest(
    tenantId: string,
    id: string,
    decision: "approved" | "rejected",
    approverUserId: string,
    reason?: string,
  ): Promise<SignupRequest | undefined> {
    const [row] = await db
      .update(signupRequests)
      .set({
        status: decision,
        approverUserId,
        decisionReason: reason ?? null,
        decidedAt: new Date(),
      })
      .where(and(eq(signupRequests.id, id), eq(signupRequests.tenantId, tenantId)))
      .returning();
    return row;
  }
  async createTenantInterestRequest(
    data: InsertTenantInterestRequest,
  ): Promise<TenantInterestRequest> {
    const [row] = await db
      .insert(tenantInterestRequests)
      .values({
        ...data,
        email: data.email.toLowerCase(),
        countryCode: data.countryCode.toUpperCase(),
      } as typeof tenantInterestRequests.$inferInsert)
      .returning();
    return row;
  }

  async findApprovedSignupForEmail(email: string): Promise<SignupRequest | undefined> {
    const [r] = await db
      .select()
      .from(signupRequests)
      .where(and(eq(signupRequests.email, email.toLowerCase()), eq(signupRequests.status, "approved")))
      .orderBy(desc(signupRequests.decidedAt))
      .limit(1);
    return r;
  }
  async getIdpConfig(id: string): Promise<TenantIdpConfig | undefined> {
    const [c] = await db.select().from(tenantIdpConfigs).where(eq(tenantIdpConfigs.id, id));
    return c;
  }
  async getIdpConfigByEmailDomain(domain: string): Promise<TenantIdpConfig | undefined> {
    const [c] = await db
      .select()
      .from(tenantIdpConfigs)
      .where(
        and(
          eq(tenantIdpConfigs.emailDomain, domain.toLowerCase()),
          eq(tenantIdpConfigs.isActive, true),
        ),
      );
    return c;
  }
  async listIdpConfigs(tenantId: string): Promise<TenantIdpConfig[]> {
    return await db
      .select()
      .from(tenantIdpConfigs)
      .where(eq(tenantIdpConfigs.tenantId, tenantId));
  }

  // --- Regions ---
  async getRegions(tenantId: string): Promise<Region[]> {
    return await db.select().from(regions).where(eq(regions.tenantId, tenantId));
  }
  async getRegion(tenantId: string, id: number): Promise<Region | undefined> {
    const [r] = await db
      .select()
      .from(regions)
      .where(and(eq(regions.id, id), eq(regions.tenantId, tenantId)));
    return r;
  }
  async createRegion(tenantId: string, data: InsertRegion): Promise<Region> {
    const [r] = await db.insert(regions).values({ ...data, tenantId } as typeof regions.$inferInsert).returning();
    return r;
  }
  async updateRegion(tenantId: string, id: number, data: Partial<InsertRegion>): Promise<Region | undefined> {
    const { tenantId: _ignored, ...safe } = data as any;
    const [r] = await db
      .update(regions)
      .set(safe)
      .where(and(eq(regions.id, id), eq(regions.tenantId, tenantId)))
      .returning();
    return r;
  }

  // --- LLGs ---
  async getLlgs(tenantId: string, districtId?: number): Promise<Llg[]> {
    return await db
      .select()
      .from(llgs)
      .where(withTenant(llgs, tenantId, districtId ? eq(llgs.districtId, districtId) : undefined));
  }
  async getLlg(tenantId: string, id: number): Promise<Llg | undefined> {
    const [l] = await db
      .select()
      .from(llgs)
      .where(and(eq(llgs.id, id), eq(llgs.tenantId, tenantId)));
    return l;
  }
  async createLlg(tenantId: string, data: InsertLlg): Promise<Llg> {
    const [l] = await db.insert(llgs).values({ ...data, tenantId } as typeof llgs.$inferInsert).returning();
    return l;
  }
  async updateLlg(tenantId: string, id: number, data: Partial<InsertLlg>): Promise<Llg | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [l] = await db
      .update(llgs)
      .set(safe)
      .where(and(eq(llgs.id, id), eq(llgs.tenantId, tenantId)))
      .returning();
    return l;
  }

  // --- Provinces ---
  async getProvinces(tenantId: string, regionId?: number): Promise<Province[]> {
    return await db
      .select()
      .from(provinces)
      .where(withTenant(provinces, tenantId, regionId ? eq(provinces.regionId, regionId) : undefined));
  }
  async getProvince(tenantId: string, id: number): Promise<Province | undefined> {
    const [p] = await db
      .select()
      .from(provinces)
      .where(and(eq(provinces.id, id), eq(provinces.tenantId, tenantId)));
    return p;
  }
  async createProvince(tenantId: string, data: InsertProvince): Promise<Province> {
    const [p] = await db.insert(provinces).values({ ...data, tenantId } as typeof provinces.$inferInsert).returning();
    return p;
  }

  // --- Districts ---
  async getDistricts(tenantId: string, provinceId?: number): Promise<District[]> {
    return await db
      .select()
      .from(districts)
      .where(withTenant(districts, tenantId, provinceId ? eq(districts.provinceId, provinceId) : undefined));
  }
  async getDistrict(tenantId: string, id: number): Promise<District | undefined> {
    const [d] = await db
      .select()
      .from(districts)
      .where(and(eq(districts.id, id), eq(districts.tenantId, tenantId)));
    return d;
  }
  async createDistrict(tenantId: string, data: InsertDistrict): Promise<District> {
    const [d] = await db.insert(districts).values({ ...data, tenantId } as typeof districts.$inferInsert).returning();
    return d;
  }

  // --- Facilities ---
  async getFacilities(tenantId: string, districtId?: number): Promise<Facility[]> {
    return await db
      .select()
      .from(facilities)
      .where(withTenant(facilities, tenantId, districtId ? eq(facilities.districtId, districtId) : undefined));
  }
  async getFacility(tenantId: string, id: number): Promise<Facility | undefined> {
    const [f] = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, id), eq(facilities.tenantId, tenantId)));
    return f;
  }
  async createFacility(tenantId: string, data: InsertFacility): Promise<Facility> {
    const [f] = await db.insert(facilities).values({ ...data, tenantId } as typeof facilities.$inferInsert).returning();
    return f;
  }
  async updateFacility(tenantId: string, id: number, data: Partial<InsertFacility>): Promise<Facility | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [f] = await db
      .update(facilities)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(facilities.id, id), eq(facilities.tenantId, tenantId)))
      .returning();
    return f;
  }
  async deleteFacility(tenantId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(facilities)
      .where(and(eq(facilities.id, id), eq(facilities.tenantId, tenantId)))
      .returning({ id: facilities.id });
    return rows.length > 0;
  }

  // --- Villages ---
  async getVillages(tenantId: string, districtId?: number, facilityId?: number): Promise<Village[]> {
    return await db
      .select()
      .from(villages)
      .where(
        withTenant(
          villages,
          tenantId,
          districtId ? eq(villages.districtId, districtId) : undefined,
          facilityId ? eq(villages.assignedFacilityId, facilityId) : undefined,
        ),
      );
  }
  async getVillage(tenantId: string, id: number): Promise<Village | undefined> {
    const [v] = await db
      .select()
      .from(villages)
      .where(and(eq(villages.id, id), eq(villages.tenantId, tenantId)));
    return v;
  }
  async createVillage(tenantId: string, data: InsertVillage): Promise<Village> {
    const [v] = await db.insert(villages).values({ ...data, tenantId } as typeof villages.$inferInsert).returning();
    return v;
  }
  async updateVillage(tenantId: string, id: number, data: Partial<InsertVillage>): Promise<Village | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [v] = await db
      .update(villages)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(villages.id, id), eq(villages.tenantId, tenantId)))
      .returning();
    return v;
  }
  async deleteVillage(tenantId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(villages)
      .where(and(eq(villages.id, id), eq(villages.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- Population data ---
  async getPopulationData(
    tenantId: string,
    filters?: {
      source?: string;
      provinceId?: number;
      districtId?: number;
      villageId?: number;
      facilityId?: number;
      year?: number;
    },
  ): Promise<PopulationData[]> {
    return await db
      .select()
      .from(populationData)
      .where(
        withTenant(
          populationData,
          tenantId,
          filters?.source ? eq(populationData.source, filters.source as any) : undefined,
          filters?.provinceId ? eq(populationData.provinceId, filters.provinceId) : undefined,
          filters?.districtId ? eq(populationData.districtId, filters.districtId) : undefined,
          filters?.villageId ? eq(populationData.villageId, filters.villageId) : undefined,
          filters?.facilityId ? eq(populationData.facilityId, filters.facilityId) : undefined,
          filters?.year ? eq(populationData.year, filters.year) : undefined,
        ),
      );
  }
  async getPopulationDataById(tenantId: string, id: number): Promise<PopulationData | undefined> {
    const [p] = await db
      .select()
      .from(populationData)
      .where(and(eq(populationData.id, id), eq(populationData.tenantId, tenantId)));
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
  async resolvePopulationGeographics(
    tenantId: string,
    data: { villageId?: number | null; facilityId?: number | null; districtId?: number | null; provinceId?: number | null }
  ): Promise<{ provinceId: number | null; districtId: number | null }> {
    let districtId: number | null = data.districtId ? Number(data.districtId) : null;
    let provinceId: number | null = data.provinceId ? Number(data.provinceId) : null;

    if (data.villageId) {
      const [v] = await db
        .select({ districtId: villages.districtId })
        .from(villages)
        .where(and(eq(villages.id, data.villageId), eq(villages.tenantId, tenantId)));
      if (v) {
        districtId = v.districtId;
      }
    } else if (data.facilityId) {
      const [f] = await db
        .select({ districtId: facilities.districtId })
        .from(facilities)
        .where(and(eq(facilities.id, data.facilityId), eq(facilities.tenantId, tenantId)));
      if (f) {
        districtId = f.districtId;
      }
    }

    if (districtId) {
      const [d] = await db
        .select({ provinceId: districts.provinceId })
        .from(districts)
        .where(and(eq(districts.id, districtId), eq(districts.tenantId, tenantId)));
      if (d) {
        provinceId = d.provinceId;
      }
    }

    return { provinceId, districtId };
  }

  async createPopulationData(tenantId: string, data: InsertPopulationData): Promise<PopulationData> {
    const geographics = await this.resolvePopulationGeographics(tenantId, data);
    const [p] = await db
      .insert(populationData)
      .values({ 
        ...data, 
        districtId: geographics.districtId, 
        provinceId: geographics.provinceId, 
        tenantId 
      } as typeof populationData.$inferInsert)
      .returning();
    return p;
  }

  async updatePopulationData(
    tenantId: string, 
    id: number, 
    data: Partial<InsertPopulationData>
  ): Promise<PopulationData | undefined> {
    const existing = await this.getPopulationDataById(tenantId, id);
    if (!existing) return undefined;

    // Merge existing and updated to resolve geographic parents
    const merged = { ...existing, ...data };
    const geographics = await this.resolvePopulationGeographics(tenantId, merged);

    const { tenantId: _i, ...safe } = data as any;
    const [p] = await db
      .update(populationData)
      .set({ 
        ...safe, 
        districtId: geographics.districtId, 
        provinceId: geographics.provinceId, 
        updatedAt: new Date() 
      })
      .where(and(eq(populationData.id, id), eq(populationData.tenantId, tenantId)))
      .returning();
    return p;
  }
  async deletePopulationData(tenantId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(populationData)
      .where(and(eq(populationData.id, id), eq(populationData.tenantId, tenantId)))
      .returning({ id: populationData.id });
    return rows.length > 0;
  }

  // --- Microplans ---
  async getMicroplans(tenantId: string): Promise<Microplan[]> {
    return await db.select().from(microplans).where(eq(microplans.tenantId, tenantId));
  }
  async getMicroplan(tenantId: string, id: number): Promise<Microplan | undefined> {
    const [row] = await db
      .select()
      .from(microplans)
      .where(and(eq(microplans.id, id), eq(microplans.tenantId, tenantId)));
    return row;
  }
  async createMicroplan(tenantId: string, data: InsertMicroplan): Promise<Microplan> {
    const [row] = await db
      .insert(microplans)
      .values({ ...data, tenantId } as typeof microplans.$inferInsert)
      .returning();
    return row;
  }
  async updateMicroplan(tenantId: string, id: number, data: Partial<InsertMicroplan>): Promise<Microplan | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [row] = await db
      .update(microplans)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(microplans.id, id), eq(microplans.tenantId, tenantId)))
      .returning();
    return row;
  }
  async deleteMicroplan(tenantId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(microplans)
      .where(and(eq(microplans.id, id), eq(microplans.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- Session plans ---
  async getSessionPlans(tenantId: string, facilityId?: number): Promise<SessionPlan[]> {
    return await db
      .select()
      .from(sessionPlans)
      .where(withTenant(sessionPlans, tenantId, facilityId ? eq(sessionPlans.facilityId, facilityId) : undefined));
  }
  async getSessionPlan(tenantId: string, id: number): Promise<SessionPlan | undefined> {
    const [s] = await db
      .select()
      .from(sessionPlans)
      .where(and(eq(sessionPlans.id, id), eq(sessionPlans.tenantId, tenantId)));
    return s;
  }
  async createSessionPlan(tenantId: string, data: InsertSessionPlan): Promise<SessionPlan> {
    // Parse scheduledDate string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.scheduledDate && typeof cleanData.scheduledDate === "string") {
      cleanData.scheduledDate = new Date(cleanData.scheduledDate);
    }
    const [s] = await db.insert(sessionPlans).values({ ...cleanData, tenantId } as typeof sessionPlans.$inferInsert).returning();
    return s;
  }
  async updateSessionPlan(tenantId: string, id: number, data: Partial<InsertSessionPlan>): Promise<SessionPlan | undefined> {
    // Parse scheduledDate string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.scheduledDate && typeof cleanData.scheduledDate === "string") {
      cleanData.scheduledDate = new Date(cleanData.scheduledDate);
    }
    const { tenantId: _i, ...safe } = cleanData as any;
    const [s] = await db
      .update(sessionPlans)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(sessionPlans.id, id), eq(sessionPlans.tenantId, tenantId)))
      .returning();
    return s;
  }
  async deleteSessionPlan(tenantId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(sessionPlans)
      .where(and(eq(sessionPlans.id, id), eq(sessionPlans.tenantId, tenantId)))
      .returning({ id: sessionPlans.id });
    return rows.length > 0;
  }

  // --- Budget items ---
  async getBudgetItems(tenantId: string, facilityId?: number, quarter?: number, year?: number): Promise<BudgetItem[]> {
    return await db
      .select()
      .from(budgetItems)
      .where(
        withTenant(
          budgetItems,
          tenantId,
          facilityId ? eq(budgetItems.facilityId, facilityId) : undefined,
          quarter ? eq(budgetItems.quarter, quarter) : undefined,
          year ? eq(budgetItems.year, year) : undefined,
        ),
      );
  }
  async createBudgetItem(tenantId: string, data: InsertBudgetItem): Promise<BudgetItem> {
    const [b] = await db.insert(budgetItems).values({ ...data, tenantId } as typeof budgetItems.$inferInsert).returning();
    return b;
  }
  async updateBudgetItem(tenantId: string, id: number, data: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [b] = await db
      .update(budgetItems)
      .set(safe)
      .where(and(eq(budgetItems.id, id), eq(budgetItems.tenantId, tenantId)))
      .returning();
    return b;
  }
  async deleteBudgetItem(tenantId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(budgetItems)
      .where(and(eq(budgetItems.id, id), eq(budgetItems.tenantId, tenantId)))
      .returning({ id: budgetItems.id });
    return rows.length > 0;
  }

  // --- Vaccine requirements ---
  async getVaccineRequirements(tenantId: string, facilityId?: number): Promise<VaccineRequirement[]> {
    return await db
      .select()
      .from(vaccineRequirements)
      .where(withTenant(vaccineRequirements, tenantId, facilityId ? eq(vaccineRequirements.facilityId, facilityId) : undefined));
  }
  async createVaccineRequirement(tenantId: string, data: InsertVaccineRequirement): Promise<VaccineRequirement> {
    const [r] = await db.insert(vaccineRequirements).values({ ...data, tenantId } as typeof vaccineRequirements.$inferInsert).returning();
    return r;
  }
  async updateVaccineRequirement(tenantId: string, id: number, data: Partial<InsertVaccineRequirement>): Promise<VaccineRequirement | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [r] = await db
      .update(vaccineRequirements)
      .set(safe)
      .where(and(eq(vaccineRequirements.id, id), eq(vaccineRequirements.tenantId, tenantId)))
      .returning();
    return r;
  }

  // --- Mobilization activities ---
  async getMobilizationActivities(tenantId: string, facilityId?: number): Promise<MobilizationActivity[]> {
    return await db
      .select()
      .from(mobilizationActivities)
      .where(withTenant(mobilizationActivities, tenantId, facilityId ? eq(mobilizationActivities.facilityId, facilityId) : undefined));
  }
  async createMobilizationActivity(tenantId: string, data: InsertMobilizationActivity): Promise<MobilizationActivity> {
    const [a] = await db.insert(mobilizationActivities).values({ ...data, tenantId } as typeof mobilizationActivities.$inferInsert).returning();
    return a;
  }
  async updateMobilizationActivity(tenantId: string, id: number, data: Partial<InsertMobilizationActivity>): Promise<MobilizationActivity | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [a] = await db
      .update(mobilizationActivities)
      .set(safe)
      .where(and(eq(mobilizationActivities.id, id), eq(mobilizationActivities.tenantId, tenantId)))
      .returning();
    return a;
  }

  // --- Supervision visits ---
  async getSupervisionVisits(tenantId: string, filters?: { facilityId?: number; microplanId?: number; status?: string }): Promise<SupervisionVisit[]> {
    const conds: any[] = [];
    if (filters?.facilityId) conds.push(eq(supervisionVisits.facilityId, filters.facilityId));
    if (filters?.microplanId) conds.push(eq(supervisionVisits.microplanId, filters.microplanId));
    if (filters?.status) conds.push(eq(supervisionVisits.status, filters.status));
    return await db
      .select()
      .from(supervisionVisits)
      .where(withTenant(supervisionVisits, tenantId, conds.length ? and(...conds) : undefined))
      .orderBy(desc(supervisionVisits.scheduledDate));
  }
  async getSupervisionVisit(tenantId: string, id: number): Promise<SupervisionVisit | undefined> {
    const [v] = await db
      .select()
      .from(supervisionVisits)
      .where(and(eq(supervisionVisits.id, id), eq(supervisionVisits.tenantId, tenantId)));
    return v;
  }
  async createSupervisionVisit(tenantId: string, data: InsertSupervisionVisit): Promise<SupervisionVisit> {
    const [v] = await db.insert(supervisionVisits).values({ ...data, tenantId } as typeof supervisionVisits.$inferInsert).returning();
    return v;
  }
  async updateSupervisionVisit(tenantId: string, id: number, data: Partial<InsertSupervisionVisit>): Promise<SupervisionVisit | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [v] = await db
      .update(supervisionVisits)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(supervisionVisits.id, id), eq(supervisionVisits.tenantId, tenantId)))
      .returning();
    return v;
  }
  async deleteSupervisionVisit(tenantId: string, id: number): Promise<boolean> {
    const r = await db
      .delete(supervisionVisits)
      .where(and(eq(supervisionVisits.id, id), eq(supervisionVisits.tenantId, tenantId)))
      .returning({ id: supervisionVisits.id });
    return r.length > 0;
  }

  // --- Audit logs ---
  async listAuditLogs(tenantId: string, filters?: { userId?: string; entityType?: string; entityId?: string; limit?: number }): Promise<AuditLog[]> {
    const conds: any[] = [];
    if (filters?.userId) conds.push(eq(auditLogs.userId, filters.userId));
    if (filters?.entityType) conds.push(eq(auditLogs.entityType, filters.entityType));
    if (filters?.entityId) conds.push(eq(auditLogs.entityId, filters.entityId));
    return await db
      .select()
      .from(auditLogs)
      .where(withTenant(auditLogs, tenantId, conds.length ? and(...conds) : undefined))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters?.limit ?? 200);
  }

  // --- Approval requests ---
  async getApprovalRequests(tenantId: string, status?: string): Promise<ApprovalRequest[]> {
    return await db
      .select()
      .from(approvalRequests)
      .where(withTenant(approvalRequests, tenantId, status ? eq(approvalRequests.status, status as any) : undefined))
      .orderBy(desc(approvalRequests.submittedAt));
  }
  async getApprovalRequest(tenantId: string, id: number): Promise<ApprovalRequest | undefined> {
    const [r] = await db
      .select()
      .from(approvalRequests)
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.tenantId, tenantId)));
    return r;
  }
  async createApprovalRequest(tenantId: string, data: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [r] = await db.insert(approvalRequests).values({ ...data, tenantId } as typeof approvalRequests.$inferInsert).returning();
    return r;
  }
  async updateApprovalRequest(tenantId: string, id: number, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const { tenantId: _i, ...safe } = data as any;
    const [r] = await db
      .update(approvalRequests)
      .set(safe)
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.tenantId, tenantId)))
      .returning();
    return r;
  }

  // --- HTR scores ---
  async getHtrScores(tenantId: string, villageId?: number): Promise<HtrScore[]> {
    return await db
      .select()
      .from(htrScores)
      .where(withTenant(htrScores, tenantId, villageId ? eq(htrScores.villageId, villageId) : undefined));
  }

  async upsertHtrScore(tenantId: string, data: any): Promise<HtrScore> {
    const existing = await db
      .select()
      .from(htrScores)
      .where(and(eq(htrScores.tenantId, tenantId), eq(htrScores.villageId, data.villageId)));

    if (existing.length > 0) {
      const [r] = await db
        .update(htrScores)
        .set({
          distanceScore: data.distanceScore,
          terrainScore: data.terrainScore,
          seasonalScore: data.seasonalScore,
          coverageScore: data.coverageScore,
          insecurityScore: data.insecurityScore,
          compositeScore: data.compositeScore,
          interventionPriority: data.interventionPriority,
          comments: data.comments,
          calculatedAt: new Date(),
        })
        .where(eq(htrScores.id, existing[0].id))
        .returning();
      return r;
    } else {
      const [r] = await db
        .insert(htrScores)
        .values({
          ...data,
          tenantId,
          calculatedAt: new Date(),
        } as typeof htrScores.$inferInsert)
        .returning();
      return r;
    }
  }

  // --- Audit logs ---
  async createAuditLog(tenantId: string, data: Omit<AuditLog, "id" | "createdAt" | "tenantId">): Promise<AuditLog> {
    const [l] = await db.insert(auditLogs).values({ ...data, tenantId } as typeof auditLogs.$inferInsert).returning();
    return l;
  }

  // --- Admin Boundaries ---

  async listAdminBoundaries(tenantId: string, adminLevel?: number): Promise<Omit<AdminBoundary, "geojson">[]> {
    return await db
      .select({
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
        updatedAt: adminBoundaries.updatedAt,
      })
      .from(adminBoundaries)
      .where(
        adminLevel !== undefined
          ? and(eq(adminBoundaries.tenantId, tenantId), eq(adminBoundaries.adminLevel, adminLevel))
          : eq(adminBoundaries.tenantId, tenantId)
      )
      .orderBy(adminBoundaries.adminLevel);
  }

  async getAdminBoundary(tenantId: string, id: string): Promise<AdminBoundary | undefined> {
    const [b] = await db
      .select()
      .from(adminBoundaries)
      .where(and(eq(adminBoundaries.id, id), eq(adminBoundaries.tenantId, tenantId)));
    return b;
  }

  async getAdminBoundaryByLevel(tenantId: string, adminLevel: number): Promise<AdminBoundary | undefined> {
    const [b] = await db
      .select()
      .from(adminBoundaries)
      .where(and(eq(adminBoundaries.tenantId, tenantId), eq(adminBoundaries.adminLevel, adminLevel)));
    return b;
  }

  /**
   * Upsert: if a boundary with the same tenantId+adminLevel already exists, replace its GeoJSON.
   * This allows re-fetching from GeoBoundaries API to always get fresh data.
   */
  async upsertAdminBoundary(data: InsertAdminBoundary & { tenantId: string }): Promise<AdminBoundary> {
    // Check for existing record at this tenant + admin level
    const existing = await this.getAdminBoundaryByLevel(data.tenantId, data.adminLevel);
    if (existing) {
      const [updated] = await db
        .update(adminBoundaries)
        .set({ ...data, updatedAt: new Date(), fetchedAt: new Date() })
        .where(eq(adminBoundaries.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(adminBoundaries)
      .values({ ...data, fetchedAt: new Date() })
      .returning();
    return inserted;
  }

  async deleteAdminBoundary(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(adminBoundaries)
      .where(and(eq(adminBoundaries.id, id), eq(adminBoundaries.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- Facility Catchments ---

  async getFacilityCatchments(tenantId: string, facilityId: number): Promise<FacilityCatchment[]> {
    return await db
      .select()
      .from(facilityCatchments)
      .where(and(eq(facilityCatchments.tenantId, tenantId), eq(facilityCatchments.facilityId, facilityId)))
      .orderBy(desc(facilityCatchments.createdAt));
  }

  async getAllFacilityCatchments(tenantId: string): Promise<FacilityCatchment[]> {
    return await db
      .select()
      .from(facilityCatchments)
      .where(eq(facilityCatchments.tenantId, tenantId))
      .orderBy(desc(facilityCatchments.createdAt));
  }

  async getFacilityCatchment(tenantId: string, id: string): Promise<FacilityCatchment | undefined> {
    const [c] = await db
      .select()
      .from(facilityCatchments)
      .where(and(eq(facilityCatchments.id, id), eq(facilityCatchments.tenantId, tenantId)));
    return c;
  }

  async createFacilityCatchment(tenantId: string, data: InsertFacilityCatchment): Promise<FacilityCatchment> {
    const [c] = await db
      .insert(facilityCatchments)
      .values({ ...data, tenantId } as typeof facilityCatchments.$inferInsert)
      .returning();
    return c;
  }

  async updateFacilityCatchment(tenantId: string, id: string, data: Partial<InsertFacilityCatchment>): Promise<FacilityCatchment | undefined> {
    const { tenantId: _t, ...safe } = data as any;
    const [c] = await db
      .update(facilityCatchments)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(facilityCatchments.id, id), eq(facilityCatchments.tenantId, tenantId)))
      .returning();
    return c;
  }

  async deleteFacilityCatchment(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(facilityCatchments)
      .where(and(eq(facilityCatchments.id, id), eq(facilityCatchments.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- 1. Vaccine Configurations ---
  async getVaccineConfigs(tenantId: string): Promise<VaccineConfig[]> {
    return await db
      .select()
      .from(vaccineConfigurations)
      .where(eq(vaccineConfigurations.tenantId, tenantId))
      .orderBy(vaccineConfigurations.name);
  }

  async getVaccineConfig(tenantId: string, id: number): Promise<VaccineConfig | undefined> {
    const [row] = await db
      .select()
      .from(vaccineConfigurations)
      .where(and(eq(vaccineConfigurations.id, id), eq(vaccineConfigurations.tenantId, tenantId)));
    return row;
  }

  async createVaccineConfig(tenantId: string, data: InsertVaccineConfig): Promise<VaccineConfig> {
    const [row] = await db
      .insert(vaccineConfigurations)
      .values({ ...data, tenantId } as typeof vaccineConfigurations.$inferInsert)
      .returning();
    return row;
  }

  async updateVaccineConfig(tenantId: string, id: number, data: Partial<InsertVaccineConfig>): Promise<VaccineConfig | undefined> {
    const { tenantId: _t, ...safe } = data as any;
    const [row] = await db
      .update(vaccineConfigurations)
      .set(safe)
      .where(and(eq(vaccineConfigurations.id, id), eq(vaccineConfigurations.tenantId, tenantId)))
      .returning();
    return row;
  }

  // --- 2. Clients ---
  async getClients(tenantId: string, facilityId?: number, clientType?: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(
        withTenant(
          clients,
          tenantId,
          facilityId ? eq(clients.facilityId, facilityId) : undefined,
          clientType ? eq(clients.clientType, clientType) : undefined
        )
      )
      .orderBy(desc(clients.createdAt));
  }

  async getClient(tenantId: string, id: string): Promise<Client | undefined> {
    const [row] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));
    return row;
  }

  async createClient(tenantId: string, data: InsertClient): Promise<Client> {
    // Parse dateOfBirth string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.dateOfBirth && typeof cleanData.dateOfBirth === "string") {
      cleanData.dateOfBirth = new Date(cleanData.dateOfBirth);
    }
    const [row] = await db
      .insert(clients)
      .values({ ...cleanData, tenantId } as typeof clients.$inferInsert)
      .returning();
    return row;
  }

  async updateClient(tenantId: string, id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    // Parse dateOfBirth string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.dateOfBirth && typeof cleanData.dateOfBirth === "string") {
      cleanData.dateOfBirth = new Date(cleanData.dateOfBirth);
    }
    const { tenantId: _t, ...safe } = cleanData as any;
    const [row] = await db
      .update(clients)
      .set({ ...safe, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteClient(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- 3. Client Vaccinations ---
  async getClientVaccinations(tenantId: string, clientId: string): Promise<ClientVaccination[]> {
    return await db
      .select()
      .from(clientVaccinations)
      .where(and(eq(clientVaccinations.tenantId, tenantId), eq(clientVaccinations.clientId, clientId)))
      .orderBy(desc(clientVaccinations.administeredDate));
  }

  async createClientVaccination(tenantId: string, data: InsertClientVaccination): Promise<ClientVaccination> {
    // Parse administeredDate and expiryDate string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.administeredDate && typeof cleanData.administeredDate === "string") {
      cleanData.administeredDate = new Date(cleanData.administeredDate);
    }
    if (cleanData.expiryDate && typeof cleanData.expiryDate === "string") {
      cleanData.expiryDate = new Date(cleanData.expiryDate);
    }
    const [row] = await db
      .insert(clientVaccinations)
      .values({ ...cleanData, tenantId } as typeof clientVaccinations.$inferInsert)
      .returning();
    return row;
  }

  async deleteClientVaccination(tenantId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(clientVaccinations)
      .where(and(eq(clientVaccinations.id, id), eq(clientVaccinations.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- 4. Session Day Plans ---
  async getSessionDayPlans(tenantId: string, sessionPlanId: number): Promise<SessionDayPlan[]> {
    return await db
      .select()
      .from(sessionDayPlans)
      .where(and(eq(sessionDayPlans.tenantId, tenantId), eq(sessionDayPlans.sessionPlanId, sessionPlanId)))
      .orderBy(sessionDayPlans.dayNumber);
  }

  async createSessionDayPlan(tenantId: string, data: InsertSessionDayPlan): Promise<SessionDayPlan> {
    // Parse sessionDate and executedAt string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.sessionDate && typeof cleanData.sessionDate === "string") {
      cleanData.sessionDate = new Date(cleanData.sessionDate);
    }
    if (cleanData.executedAt && typeof cleanData.executedAt === "string") {
      cleanData.executedAt = new Date(cleanData.executedAt);
    }
    const [row] = await db
      .insert(sessionDayPlans)
      .values({ ...cleanData, tenantId } as typeof sessionDayPlans.$inferInsert)
      .returning();
    return row;
  }

  async updateSessionDayPlan(tenantId: string, id: number, data: Partial<InsertSessionDayPlan>): Promise<SessionDayPlan | undefined> {
    // Parse sessionDate and executedAt string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.sessionDate && typeof cleanData.sessionDate === "string") {
      cleanData.sessionDate = new Date(cleanData.sessionDate);
    }
    if (cleanData.executedAt && typeof cleanData.executedAt === "string") {
      cleanData.executedAt = new Date(cleanData.executedAt);
    }
    const { tenantId: _t, ...safe } = cleanData as any;
    const [row] = await db
      .update(sessionDayPlans)
      .set(safe)
      .where(and(eq(sessionDayPlans.id, id), eq(sessionDayPlans.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteSessionDayPlan(tenantId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(sessionDayPlans)
      .where(and(eq(sessionDayPlans.id, id), eq(sessionDayPlans.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- 5. Stock Transactions ---
  async getStockTransactions(tenantId: string, facilityId?: number): Promise<StockTransaction[]> {
    const conds = facilityId !== undefined
      ? and(eq(stockTransactions.tenantId, tenantId), eq(stockTransactions.facilityId, facilityId))
      : eq(stockTransactions.tenantId, tenantId);
    return await db
      .select()
      .from(stockTransactions)
      .where(conds)
      .orderBy(desc(stockTransactions.transactionDate));
  }

  async createStockTransaction(tenantId: string, data: InsertStockTransaction): Promise<StockTransaction> {
    // Parse transactionDate string from offline JSON outbox payloads to native Date objects
    const cleanData = { ...data };
    if (cleanData.transactionDate && typeof cleanData.transactionDate === "string") {
      cleanData.transactionDate = new Date(cleanData.transactionDate);
    }
    const [row] = await db
      .insert(stockTransactions)
      .values({ ...cleanData, tenantId } as typeof stockTransactions.$inferInsert)
      .returning();
    return row;
  }

  async deleteStockTransaction(tenantId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(stockTransactions)
      .where(and(eq(stockTransactions.id, id), eq(stockTransactions.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // --- 6. Monthly Reports ---
  async getMonthlyReports(tenantId: string, facilityId?: number): Promise<MonthlyReport[]> {
    const conds = facilityId !== undefined
      ? and(eq(monthlyReports.tenantId, tenantId), eq(monthlyReports.facilityId, facilityId))
      : eq(monthlyReports.tenantId, tenantId);
    return await db
      .select()
      .from(monthlyReports)
      .where(conds)
      .orderBy(desc(monthlyReports.year), desc(monthlyReports.month));
  }

  async getMonthlyReport(tenantId: string, id: number): Promise<MonthlyReport | undefined> {
    const [row] = await db
      .select()
      .from(monthlyReports)
      .where(and(eq(monthlyReports.id, id), eq(monthlyReports.tenantId, tenantId)));
    return row;
  }

  async createMonthlyReport(tenantId: string, data: InsertMonthlyReport): Promise<MonthlyReport> {
    const [row] = await db
      .insert(monthlyReports)
      .values({ ...data, tenantId } as typeof monthlyReports.$inferInsert)
      .returning();
    return row;
  }

  async updateMonthlyReport(tenantId: string, id: number, data: Partial<InsertMonthlyReport>): Promise<MonthlyReport | undefined> {
    const { tenantId: _t, ...safe } = data as any;
    const [row] = await db
      .update(monthlyReports)
      .set(safe)
      .where(and(eq(monthlyReports.id, id), eq(monthlyReports.tenantId, tenantId)))
      .returning();
    return row;
  }
}

export const storage = new DatabaseStorage();

