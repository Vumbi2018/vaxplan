/**
 * VaxPlan Offline Database (Dexie.js / IndexedDB)
 *
 * Local replica of the server's PostgreSQL schema.
 * Every table that should be available offline is defined here.
 *
 * Design principles:
 * - Full national replica — all data for the tenant is synced locally.
 * - `_syncedAt` timestamp on every record — used by pull-sync to detect stale rows.
 * - `outbox` table queues mutations made while offline for later replay.
 * - `conflictLog` records records that were overwritten during sync.
 */

import Dexie, { type Table } from "dexie";

// ─── Outbox (offline mutation queue) ────────────────────────────────────────

export type OutboxMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface OutboxItem {
  id?: number;                  // auto-increment
  tenantId: string;
  entityType: string;           // "client" | "vaccination" | "stockTransaction" | ...
  method: OutboxMethod;
  url: string;                  // relative API path, e.g. "/api/clients"
  body?: string;                // JSON-serialized request body
  localId?: string;             // temporary local ID for new records
  serverId?: string | number;   // filled in after server ack
  retries: number;
  lastError?: string;
  createdAt: number;            // Date.now()
}

// ─── Conflict log ────────────────────────────────────────────────────────────

export interface ConflictLog {
  id?: number;
  tenantId: string;
  entityType: string;
  entityId: string;
  clientValue: string;          // JSON snapshot of local version
  serverValue: string;          // JSON snapshot of winning server version
  resolvedAt: number;
}

// ─── Sync metadata ───────────────────────────────────────────────────────────

export interface SyncMeta {
  key: string;                  // "lastSyncAt" | "tenantId" | "userId"
  value: string;
}

// ─── Domain entity local types (lightweight mirrors of server types) ─────────

export interface LocalFacility {
  id: number;
  tenantId: string;
  name: string;
  facilityType: string;
  hmisCode?: string;
  provinceId?: number;
  districtId?: number;
  latitude?: number;
  longitude?: number;
  _syncedAt: number;
}

export interface LocalVillage {
  id: number;
  tenantId: string;
  name: string;
  llgId?: number;
  districtId?: number;
  facilityId?: number;
  _syncedAt: number;
}

export interface LocalClient {
  id: string;
  tenantId: string;
  facilityId: number;
  villageId: number;
  name: string;
  clientType: string;
  dateOfBirth?: string;
  gender?: string;
  parentName?: string;
  contactPhone?: string;
  catchmentStatus: string;
  isRefusal: boolean;
  createdAt?: number;
  updatedAt?: number;
  _syncedAt: number;
  _localOnly?: boolean;         // true if not yet confirmed by server
}

export interface LocalClientVaccination {
  id: number;
  tenantId: string;
  clientId: string;
  facilityId: number;
  vaccineName?: string;
  vaccineCode?: string;
  doseNumber: number;
  administeredDate?: string;
  batchNumber?: string;
  vvmStatus?: string;
  workerName?: string;
  notes?: string;
  createdAt?: number;
  _syncedAt: number;
  _localOnly?: boolean;
}

/*
// Original Code (LocalSessionPlan used 'planName' which mismatches the Postgres 'name' column and UI 'item.name'):
export interface LocalSessionPlan {
  id: number;
  tenantId: string;
  facilityId: number;
  planName: string;
  sessionType?: string;
  scheduledDate?: string;
  status: string;
  _syncedAt: number;
}
*/

// Updated Code: Added 'name' field to align with the Postgres schema and UI, keeping 'planName' for backward compatibility.
export interface LocalSessionPlan {
  id: number;
  tenantId: string;
  facilityId: number;
  name: string;
  planName?: string;
  sessionType?: string;
  scheduledDate?: string;
  status: string;
  _syncedAt: number;
  _localOnly?: boolean;
}

export interface LocalSessionDayPlan {
  id: number;
  tenantId: string;
  sessionPlanId: number;
  dayNumber: number;
  sessionDate: string;
  communitiesVisited: any;
  targetPopulation: number;
  vaccinesRequired: any;
  vitaminADoses?: number;
  dewormingDoses?: number;
  vaccineCarriers?: number;
  icePacks?: number;
  chalkSticks?: number;
  tallySheets?: number;
  distanceKm?: string;
  transportType?: string;
  fuelLiters?: string;
  actualVaccinated?: number;
  actualVialsUsed?: number;
  actualVialsWasted?: number;
  executionStatus?: string;
  executionNotes?: string;
  executedAt?: string;
  teamCount?: number;
  vaccinatorsCount?: number;
  volunteersCount?: number;
  recordersCount?: number;
  supervisorsCount?: number;
  indelibleMarkers?: number;
  coldBoxes?: number;
  _syncedAt: number;
  _localOnly?: boolean;
}

export interface LocalStockTransaction {
  id: number;
  tenantId: string;
  facilityId: number;
  vaccineConfigId?: number;
  transactionType: string;
  quantity: number;
  batchNumber?: string;
  vvmStatus?: string;
  transactionDate?: string;
  notes?: string;
  createdAt?: number;
  _syncedAt: number;
  _localOnly?: boolean;
}

export interface LocalMonthlyReport {
  id: number;
  tenantId: string;
  facilityId: number;
  month: number;
  year: number;
  approvalStatus: string;
  _syncedAt: number;
}

// Added local interfaces for offline budget planning and social mobilization support
export interface LocalBudgetItem {
  id: number;
  tenantId: string;
  facilityId: number;
  sessionId?: number | null;
  category: string;
  description: string;
  unitCost: string;
  quantity: number;
  totalCost: string;
  quarter: number;
  year: number;
  approvalStatus: string;
  _syncedAt?: number;
  _localOnly?: boolean;
}

export interface LocalMobilizationActivity {
  id: number;
  tenantId: string;
  facilityId: number;
  activityType: string;
  description?: string | null;
  targetAudience?: string | null;
  scheduledDate?: string | null;
  estimatedAttendance?: number | null;
  materialsNeeded?: any;
  budgetAllocation?: string | null;
  status: string;
  _syncedAt?: number;
  _localOnly?: boolean;
}

export interface LocalPopulationData {
  id: number;
  tenantId: string;
  regionId?: number;
  provinceId?: number;
  districtId?: number;
  year: number;
  totalPopulation?: number;
  source?: string;
  _syncedAt: number;
}

export interface LocalRegion {
  id: number;
  tenantId: string;
  name: string;
  code?: string;
  _syncedAt: number;
}

export interface LocalProvince {
  id: number;
  tenantId: string;
  name: string;
  code?: string;
  regionId?: number;
  _syncedAt: number;
}

export interface LocalDistrict {
  id: number;
  tenantId: string;
  name: string;
  code?: string;
  provinceId?: number;
  _syncedAt: number;
}

export interface LocalLlg {
  id: number;
  tenantId: string;
  name: string;
  districtId?: number;
  _syncedAt: number;
}

export interface LocalVaccineConfig {
  id: number;
  tenantId: string;
  name: string;
  code?: string;
  dosesRequired?: number;
  _syncedAt: number;
}

export interface LocalGisCache {
  key: string;          // e.g. "grid3_settlements" | "geotiff_zmb_2020"
  tenantId: string;
  geojson?: any;        // Parsed GeoJSON (for vector layers like GRID3 settlements)
  rasterBuffer?: ArrayBuffer; // Raw GeoTIFF binary (for georaster population rasters)
  cachedAt: number;    // Date.now() — used to check for stale entries
}

// ─── Dexie Database ──────────────────────────────────────────────────────────

/* Original VaxPlanOfflineDb table and version configuration commented out:
export class VaxPlanOfflineDb extends Dexie {
  // Control tables
  outbox!: Table<OutboxItem>;
  conflictLog!: Table<ConflictLog>;
  syncMeta!: Table<SyncMeta>;

  // Admin hierarchy (rarely changes — synced once)
  regions!: Table<LocalRegion>;
  provinces!: Table<LocalProvince>;
  districts!: Table<LocalDistrict>;
  llgs!: Table<LocalLlg>;

  // Facilities & villages
  facilities!: Table<LocalFacility>;
  villages!: Table<LocalVillage>;

  // Clinical / EPI
  clients!: Table<LocalClient>;
  clientVaccinations!: Table<LocalClientVaccination>;

  // Planning
  sessionPlans!: Table<LocalSessionPlan>;
  stockTransactions!: Table<LocalStockTransaction>;
  monthlyReports!: Table<LocalMonthlyReport>;

  // Population & config
  populationData!: Table<LocalPopulationData>;
  vaccineConfigs!: Table<LocalVaccineConfig>;

  constructor() {
    super("VaxPlanOfflineDB");

    this.version(1).stores({
      // Control
      outbox:       "++id, tenantId, entityType, createdAt",
      conflictLog:  "++id, tenantId, entityType, entityId",
      syncMeta:     "key",

      // Admin hierarchy
      regions:      "id, tenantId, name",
      provinces:    "id, tenantId, regionId",
      districts:    "id, tenantId, provinceId",
      llgs:         "id, tenantId, districtId",

      // Facilities & villages
      facilities:   "id, tenantId, districtId, provinceId",
      villages:     "id, tenantId, facilityId, districtId",

      // Clinical / EPI
      clients:      "id, tenantId, facilityId, villageId, clientType",
      clientVaccinations: "id, tenantId, clientId, facilityId",

      // Planning
      sessionPlans:       "id, tenantId, facilityId, status",
      stockTransactions:  "id, tenantId, facilityId",
      monthlyReports:     "id, tenantId, facilityId, year, month",

      // Population
      populationData:  "id, tenantId, provinceId, districtId, year",
      vaccineConfigs:  "id, tenantId",
    });
  }
}
*/

// Updated VaxPlanOfflineDb including budgetItems and mobilizationActivities offline tables, plus gisCache Version 2
export class VaxPlanOfflineDb extends Dexie {
  // Control tables
  outbox!: Table<OutboxItem>;
  conflictLog!: Table<ConflictLog>;
  syncMeta!: Table<SyncMeta>;

  // Admin hierarchy (rarely changes — synced once)
  regions!: Table<LocalRegion>;
  provinces!: Table<LocalProvince>;
  districts!: Table<LocalDistrict>;
  llgs!: Table<LocalLlg>;

  // Facilities & villages
  facilities!: Table<LocalFacility>;
  villages!: Table<LocalVillage>;

  // Clinical / EPI
  clients!: Table<LocalClient>;
  clientVaccinations!: Table<LocalClientVaccination>;

  // Planning
  sessionPlans!: Table<LocalSessionPlan>;
  sessionDayPlans!: Table<LocalSessionDayPlan>;
  budgetItems!: Table<LocalBudgetItem>;
  mobilizationActivities!: Table<LocalMobilizationActivity>;
  stockTransactions!: Table<LocalStockTransaction>;
  monthlyReports!: Table<LocalMonthlyReport>;

  // Population & config
  populationData!: Table<LocalPopulationData>;
  vaccineConfigs!: Table<LocalVaccineConfig>;

  // GIS Cache (high-performance vector and metadata caching)
  gisCache!: Table<LocalGisCache>;

  constructor() {
    super("VaxPlanOfflineDB");

    // Version 1 definition (retained for backward compatibility and safe migration path)
    this.version(1).stores({
      outbox:       "++id, tenantId, entityType, createdAt",
      conflictLog:  "++id, tenantId, entityType, entityId",
      syncMeta:     "key",
      regions:      "id, tenantId, name",
      provinces:    "id, tenantId, regionId",
      districts:    "id, tenantId, provinceId",
      llgs:         "id, tenantId, districtId",
      facilities:   "id, tenantId, districtId, provinceId",
      villages:     "id, tenantId, facilityId, districtId",
      clients:      "id, tenantId, facilityId, villageId, clientType",
      clientVaccinations: "id, tenantId, clientId, facilityId",
      sessionPlans:           "id, tenantId, facilityId, status",
      sessionDayPlans:        "id, tenantId, sessionPlanId",
      budgetItems:            "id, tenantId, facilityId, quarter, year",
      mobilizationActivities: "id, tenantId, facilityId",
      stockTransactions:      "id, tenantId, facilityId",
      monthlyReports:         "id, tenantId, facilityId, year, month",
      populationData:  "id, tenantId, provinceId, districtId, year",
      vaccineConfigs:  "id, tenantId",
    });

    // Version 2: Provision a dedicated high-capacity IndexedDB table specifically for caching massive GeoJSON files (e.g. GRID3 settlements)
    this.version(2).stores({
      outbox:       "++id, tenantId, entityType, createdAt",
      conflictLog:  "++id, tenantId, entityType, entityId",
      syncMeta:     "key",
      regions:      "id, tenantId, name",
      provinces:    "id, tenantId, regionId",
      districts:    "id, tenantId, provinceId",
      llgs:         "id, tenantId, districtId",
      facilities:   "id, tenantId, districtId, provinceId",
      villages:     "id, tenantId, facilityId, districtId",
      clients:      "id, tenantId, facilityId, villageId, clientType",
      clientVaccinations: "id, tenantId, clientId, facilityId",
      sessionPlans:           "id, tenantId, facilityId, status",
      sessionDayPlans:        "id, tenantId, sessionPlanId",
      budgetItems:            "id, tenantId, facilityId, quarter, year",
      mobilizationActivities: "id, tenantId, facilityId",
      stockTransactions:      "id, tenantId, facilityId",
      monthlyReports:         "id, tenantId, facilityId, year, month",
      populationData:  "id, tenantId, provinceId, districtId, year",
      vaccineConfigs:  "id, tenantId",
      gisCache:        "[key+tenantId], tenantId", // Composite primary key to avoid tenant overlap and speed up lookups
    });

    // Version 3: Extend gisCache to support binary raster (GeoTIFF ArrayBuffer) storage
    // alongside the existing GeoJSON vector cache — no structural changes to other tables.
    this.version(3).stores({
      outbox:       "++id, tenantId, entityType, createdAt",
      conflictLog:  "++id, tenantId, entityType, entityId",
      syncMeta:     "key",
      regions:      "id, tenantId, name",
      provinces:    "id, tenantId, regionId",
      districts:    "id, tenantId, provinceId",
      llgs:         "id, tenantId, districtId",
      facilities:   "id, tenantId, districtId, provinceId",
      villages:     "id, tenantId, facilityId, districtId",
      clients:      "id, tenantId, facilityId, villageId, clientType",
      clientVaccinations: "id, tenantId, clientId, facilityId",
      sessionPlans:           "id, tenantId, facilityId, status",
      sessionDayPlans:        "id, tenantId, sessionPlanId",
      budgetItems:            "id, tenantId, facilityId, quarter, year",
      mobilizationActivities: "id, tenantId, facilityId",
      stockTransactions:      "id, tenantId, facilityId",
      monthlyReports:         "id, tenantId, facilityId, year, month",
      populationData:  "id, tenantId, provinceId, districtId, year",
      vaccineConfigs:  "id, tenantId",
      // gisCache schema is unchanged — IndexedDB natively stores ArrayBuffer blobs
      // (rasterBuffer field) without any schema change, as IndexedDB is schema-flexible.
      gisCache:        "[key+tenantId], tenantId",
    });
  }
}

/** Singleton instance — import this everywhere */
export const offlineDb = new VaxPlanOfflineDb();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the last sync timestamp for the current tenant */
export async function getLastSyncAt(): Promise<string | null> {
  const row = await offlineDb.syncMeta.get("lastSyncAt");
  return row?.value ?? null;
}

/** Persist the last sync timestamp */
export async function setLastSyncAt(iso: string): Promise<void> {
  await offlineDb.syncMeta.put({ key: "lastSyncAt", value: iso });
}

/** Queue a mutation to replay when online */
export async function enqueueOutbox(item: Omit<OutboxItem, "id" | "retries" | "createdAt">): Promise<number> {
  return offlineDb.outbox.add({
    ...item,
    retries: 0,
    createdAt: Date.now(),
  });
}

/** Count pending outbox items for a tenant */
export async function countPendingMutations(tenantId: string): Promise<number> {
  return offlineDb.outbox.where("tenantId").equals(tenantId).count();
}

/** Bulk-write a synced entity collection (replaces stale rows) */
export async function bulkSyncEntities<T extends { id: any; tenantId: string }>(
  table: Table<T>,
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;
  await table.bulkPut(rows);
}
