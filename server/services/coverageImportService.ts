/**
 * Coverage Import Service — Task #40
 *
 * Parses CSV uploads + DHIS2 dataValueSets pulls of immunization coverage,
 * validates rows against tenant facilities (via hmis_code for CSV and
 * facilities.externalIds.dhis2 for DHIS2), and writes idempotent rows into
 * imported_coverage. Also exposes the missed-communities scorer.
 */
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { eq, and, inArray, sql as dsql } from "drizzle-orm";
import { db } from "../db";
import {
  importedCoverage,
  csvImports,
  facilities,
  villages,
  populationData,
  htrScores,
  type CoverageCsvRow,
  coverageCsvRowSchema,
  type Facility,
} from "@shared/schema";
import { resolveTokenForRef } from "./hisInteropService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvRowError {
  row: number;
  field?: string;
  message: string;
  raw?: Record<string, any>;
}

export interface CsvPreviewResult {
  filename: string;
  rowCount: number;
  validRows: Array<CoverageCsvRow & { facilityId: number }>;
  errors: CsvRowError[];
  unknownFacilityExternalIds: string[];
}

export interface DhisCoverageRow {
  orgUnitId: string;
  facilityId: number | null;
  period: string;
  antigen: string;
  dosesAdministered: number;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/**
 * Parse + validate a CSV buffer. Returns valid rows mapped to facility IDs
 * (via tenant-scoped facilities.hmisCode) plus a per-row error report.
 * Does NOT write to the database — call commitCsvImport() after the user
 * confirms the preview.
 */
export async function previewCsvImport(
  tenantId: string,
  filename: string,
  csvBuffer: Buffer,
): Promise<CsvPreviewResult> {
  const errors: CsvRowError[] = [];
  let records: Record<string, any>[] = [];
  try {
    records = parseCsv(csvBuffer, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err: any) {
    return {
      filename,
      rowCount: 0,
      validRows: [],
      errors: [{ row: 0, message: `CSV parse error: ${err?.message ?? String(err)}` }],
      unknownFacilityExternalIds: [],
    };
  }

  // Validate each row with Zod
  const validated: Array<{ rowIndex: number; row: CoverageCsvRow }> = [];
  records.forEach((rec, idx) => {
    const result = coverageCsvRowSchema.safeParse(rec);
    if (!result.success) {
      result.error.errors.forEach((e) => {
        errors.push({
          row: idx + 2, // +2 for 1-based + header row
          field: String(e.path[0] ?? ""),
          message: e.message,
          raw: rec,
        });
      });
      return;
    }
    validated.push({ rowIndex: idx + 2, row: result.data });
  });

  // Look up facilities by hmisCode for this tenant
  const externalIds: string[] = Array.from(new Set(validated.map((v) => v.row.facility_external_id)));
  const facilityRows: Array<{ id: number; hmisCode: string | null }> = externalIds.length
    ? (await db
        .select({ id: facilities.id, hmisCode: facilities.hmisCode })
        .from(facilities)
        .where(and(eq(facilities.tenantId, tenantId), inArray(facilities.hmisCode, externalIds as any))) as any)
    : [];
  const facilityByCode = new Map<string, number>(
    facilityRows.filter((f) => f.hmisCode !== null).map((f) => [f.hmisCode as string, f.id]),
  );

  const validRows: Array<CoverageCsvRow & { facilityId: number }> = [];
  const unknown = new Set<string>();
  for (const { rowIndex, row } of validated) {
    const fid = facilityByCode.get(row.facility_external_id);
    if (!fid) {
      unknown.add(row.facility_external_id);
      errors.push({
        row: rowIndex,
        field: "facility_external_id",
        message: `Unknown facility hmis_code "${row.facility_external_id}" for this tenant`,
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
    unknownFacilityExternalIds: Array.from(unknown),
  };
}

/**
 * Commit a previously-previewed CSV import. Idempotent: re-running with the
 * same (facility_id, period, antigen, source="csv") rows will UPSERT the
 * doses_administered value instead of duplicating.
 */
export async function commitCsvImport(
  tenantId: string,
  userId: string | null,
  preview: CsvPreviewResult,
): Promise<{ csvImportId: number; importedCount: number }> {
  const [auditRow] = await db
    .insert(csvImports)
    .values({
      tenantId,
      filename: preview.filename,
      rowCount: preview.rowCount,
      errorCount: preview.errors.length,
      importedCount: 0,
      status: preview.validRows.length > 0 ? "committed" : "failed",
      errorReport: preview.errors as any,
      uploadedByUserId: userId,
    })
    .returning();

  if (preview.validRows.length === 0) {
    return { csvImportId: auditRow.id, importedCount: 0 };
  }

  // Dedupe within the batch on the upsert key (last-write-wins) — Postgres'
  // ON CONFLICT cannot affect the same row twice in a single statement.
  type ValidRow = CsvPreviewResult["validRows"][number];
  const dedupMap = new Map<string, ValidRow>();
  for (const r of preview.validRows as ValidRow[]) {
    dedupMap.set(`${r.facilityId}|${r.period}|${r.antigen}`, r);
  }
  const dedupedRows: ValidRow[] = Array.from(dedupMap.values());

  // Upsert in chunks
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
      source: "csv" as const,
      sourceRef: String(auditRow.id),
      importedByUserId: userId,
    }));
    await db
      .insert(importedCoverage)
      .values(values)
      .onConflictDoUpdate({
        target: [
          importedCoverage.tenantId,
          importedCoverage.facilityId,
          importedCoverage.period,
          importedCoverage.antigen,
          importedCoverage.source,
        ],
        set: {
          dosesAdministered: dsql`excluded.doses_administered`,
          targetPopOverride: dsql`excluded.target_pop_override`,
          sourceRef: dsql`excluded.source_ref`,
          importedByUserId: dsql`excluded.imported_by_user_id`,
          importedAt: dsql`now()`,
        },
      });
    imported += chunk.length;
  }

  await db
    .update(csvImports)
    .set({ importedCount: imported })
    .where(eq(csvImports.id, auditRow.id));

  return { csvImportId: auditRow.id, importedCount: imported };
}

// ---------------------------------------------------------------------------
// DHIS2 inbound pull
// ---------------------------------------------------------------------------

/**
 * Map a DHIS2 dataElement UID → antigen code using env-driven reverse lookup:
 *   DHIS2_DE_<ANTIGEN>_UID = <dhis2_uid>
 * (Same mapping the outbound push side uses.)
 */
function buildDhisDataElementMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(process.env)) {
    if (!v) continue;
    const m = k.match(/^DHIS2_DE_(.+)_UID$/);
    if (m) map.set(v, m[1]);
  }
  return map;
}

/**
 * Pull dataValueSets from DHIS2 for a given period range + dataSet.
 * Returns coverage rows mapped to local facilities via externalIds.dhis2.
 */
export async function pullDhis2Coverage(
  tenantId: string,
  integration: { id: string; baseUrl: string; secretRef: string; dhis2DataSetUid?: string; dhis2RootOrgUnit?: string },
  options: { period: string; rootOrgUnit?: string },
): Promise<{
  rows: DhisCoverageRow[];
  warnings: string[];
  errors: string[];
  simulated: boolean;
}> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const deMap = buildDhisDataElementMap();

  // Resolve tenant facilities by DHIS2 org-unit ID
  const facs = await db
    .select({ id: facilities.id, externalIds: facilities.externalIds })
    .from(facilities)
    .where(eq(facilities.tenantId, tenantId));
  const facByOu = new Map<string, number>();
  for (const f of facs) {
    const ouId = (f.externalIds as any)?.dhis2;
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

  // Simulation when no real token is configured
  if (token === "mock_his_integration_token_for_demo_purposes") {
    warnings.push("SIMULATION MODE: DHIS2 dataValueSets mocked.");
    const sampleAntigens: string[] = Array.from(deMap.values()) as string[];
    const fallbackAntigens: string[] = sampleAntigens.length > 0 ? sampleAntigens : ["BCG", "PENTA1", "MEASLES1"];
    const rows: DhisCoverageRow[] = [];
    let count = 0;
    facByOu.forEach((facId, ouId) => {
      if (count >= 5) return;
      count++;
      for (const ag of fallbackAntigens.slice(0, 3)) {
        rows.push({
          orgUnitId: String(ouId),
          facilityId: Number(facId),
          period: options.period,
          antigen: ag,
          dosesAdministered: Math.floor(Math.random() * 80) + 5,
        });
      }
    });
    return { rows, warnings, errors, simulated: true };
  }

  const url = `${integration.baseUrl.replace(/\/$/, "")}/api/dataValueSets?dataSet=${encodeURIComponent(
    dataSet,
  )}&period=${encodeURIComponent(options.period)}&orgUnit=${encodeURIComponent(rootOu)}&children=true`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    errors.push(`DHIS2 dataValueSets GET ${resp.status}: ${await resp.text()}`);
    return { rows: [], warnings, errors, simulated: false };
  }
  const data = (await resp.json()) as { dataValues?: Array<{ dataElement: string; period: string; orgUnit: string; value: string }> };
  const rows: DhisCoverageRow[] = [];
  for (const dv of data.dataValues ?? []) {
    const antigen = deMap.get(dv.dataElement);
    if (!antigen) {
      warnings.push(`No antigen mapping for DHIS2 dataElement "${dv.dataElement}" (set DHIS2_DE_<ANTIGEN>_UID env)`);
      continue;
    }
    const facId = facByOu.get(dv.orgUnit) ?? null;
    if (!facId) {
      warnings.push(`No local facility mapped to DHIS2 orgUnit "${dv.orgUnit}" — skipped`);
      continue;
    }
    const doses = parseInt(dv.value, 10);
    if (isNaN(doses)) continue;
    rows.push({
      orgUnitId: dv.orgUnit,
      facilityId: facId,
      period: dv.period.replace("-", ""),
      antigen,
      dosesAdministered: doses,
    });
  }
  return { rows, warnings, errors, simulated: false };
}

/**
 * Commit DHIS2-pulled coverage rows to imported_coverage. Idempotent on
 * (tenant_id, facility_id, period, antigen, source='dhis2').
 */
export async function commitDhis2Coverage(
  tenantId: string,
  userId: string | null,
  integrationId: string,
  rows: DhisCoverageRow[],
): Promise<{ importedCount: number }> {
  if (rows.length === 0) return { importedCount: 0 };
  const CHUNK = 500;
  let imported = 0;
  // Dedupe within batch on the upsert key — ON CONFLICT cannot touch the same row twice.
  const dedupMap = new Map<string, DhisCoverageRow>();
  for (const r of rows) {
    if (r.facilityId === null) continue;
    dedupMap.set(`${r.facilityId}|${r.period}|${r.antigen}`, r);
  }
  const dedupedRows: DhisCoverageRow[] = Array.from(dedupMap.values());
  for (let i = 0; i < dedupedRows.length; i += CHUNK) {
    const chunk: DhisCoverageRow[] = dedupedRows.slice(i, i + CHUNK);
    const values = chunk.map((r: DhisCoverageRow) => ({
      tenantId,
      facilityId: r.facilityId!,
      period: r.period,
      antigen: r.antigen,
      dosesAdministered: r.dosesAdministered,
      targetPopOverride: null,
      source: "dhis2" as const,
      sourceRef: integrationId,
      importedByUserId: userId,
    }));
    if (values.length === 0) continue;
    await db
      .insert(importedCoverage)
      .values(values)
      .onConflictDoUpdate({
        target: [
          importedCoverage.tenantId,
          importedCoverage.facilityId,
          importedCoverage.period,
          importedCoverage.antigen,
          importedCoverage.source,
        ],
        set: {
          dosesAdministered: dsql`excluded.doses_administered`,
          sourceRef: dsql`excluded.source_ref`,
          importedByUserId: dsql`excluded.imported_by_user_id`,
          importedAt: dsql`now()`,
        },
      });
    imported += values.length;
  }
  return { importedCount: imported };
}

// ---------------------------------------------------------------------------
// Missed-communities scorer
// ---------------------------------------------------------------------------

export interface MissedCommunityRow {
  villageId: number;
  villageName: string;
  facilityId: number;
  facilityName: string;
  districtId: number;
  provinceName?: string;
  districtName?: string;
  latitude: number | null;
  longitude: number | null;
  registeredPopulation: number;
  dosesAdministered: number;
  unservedEstimate: number;
  isHardToReach: boolean;
  distanceKm: number;
  grid3Evidence: number;
  score: number;
  components: {
    unserved: number;
    htr: number;
    distance: number;
    grid3: number;
  };
}

export interface ScoreMissedParams {
  tenantId: string;
  antigen: string;
  period: string; // YYYYMM
  provinceId?: number;
  districtId?: number;
  weights?: { unserved?: number; htr?: number; distance?: number; grid3?: number };
}

const DEFAULT_WEIGHTS = { unserved: 1, htr: 50, distance: 2, grid3: 10 };

/**
 * Deterministic missedness scorer. For each village in scope:
 *   score = w1*max(0, registered_pop - aggregated_doses_for_its_facility/villages_in_facility)
 *         + w2*(isHardToReach ? 1 : 0)
 *         + w3*distance_km
 *         + w4*grid3_evidence
 * Villages are ordered by score desc; results capped at 500 rows.
 */
export async function scoreMissedCommunities(
  params: ScoreMissedParams,
): Promise<MissedCommunityRow[]> {
  const w = { ...DEFAULT_WEIGHTS, ...(params.weights ?? {}) };

  // 1. Pull all villages in scope
  const villageConditions: any[] = [eq(villages.tenantId, params.tenantId)];
  if (params.districtId) villageConditions.push(eq(villages.districtId, params.districtId));
  const villageRows = await db
    .select()
    .from(villages)
    .where(and(...villageConditions));

  if (villageRows.length === 0) return [];

  // 2. Pull facilities for those villages
  const facilityIds = Array.from(
    new Set(villageRows.map((v) => v.assignedFacilityId).filter((id): id is number => id != null)),
  );
  const facilityRows: any[] = facilityIds.length
    ? ((await db
        .select()
        .from(facilities)
        .where(and(eq(facilities.tenantId, params.tenantId), inArray(facilities.id, facilityIds as any)))) as any)
    : [];
  const facById = new Map<number, any>(facilityRows.map((f: any) => [f.id as number, f]));

  // Province filter — facilities reference districts which reference provinces.
  // We do a lighter filter at the village level: districtId only. Province
  // filtering is applied client-side via the district list (the route layer
  // resolves provinceId → districtIds before calling here, or we just return
  // all and the route filters). To keep this self-contained, we accept
  // provinceId here and filter at the end via a districts join.
  let allowedDistrictIds: Set<number> | null = null;
  if (params.provinceId) {
    const districtRows = await db.execute(dsql`
      SELECT id FROM districts WHERE province_id = ${params.provinceId}
    `);
    allowedDistrictIds = new Set((districtRows as any).rows?.map((r: any) => r.id) ?? []);
  }

  // 3. Pull facility-level imported coverage for this antigen + period
  const coverageRows = facilityIds.length
    ? await db
        .select()
        .from(importedCoverage)
        .where(
          and(
            eq(importedCoverage.tenantId, params.tenantId),
            eq(importedCoverage.period, params.period),
            eq(importedCoverage.antigen, params.antigen),
            inArray(importedCoverage.facilityId, facilityIds as any),
          ),
        )
    : [];
  // Aggregate across sources (csv + dhis2) per facility — take max as the
  // most-recent / most-authoritative figure to avoid double-counting.
  const dosesByFacility = new Map<number, number>();
  for (const c of coverageRows) {
    const prev = dosesByFacility.get(c.facilityId) ?? 0;
    if (c.dosesAdministered > prev) dosesByFacility.set(c.facilityId, c.dosesAdministered);
  }

  // 4. Pull population for villages (under-1 / under-5 as registered pop)
  const villageIds = villageRows.map((v) => v.id);
  const popRows = villageIds.length
    ? await db
        .select()
        .from(populationData)
        .where(
          and(
            eq(populationData.tenantId, params.tenantId),
            inArray(populationData.villageId, villageIds),
          ),
        )
    : [];
  const popByVillage = new Map<number, number>();
  for (const p of popRows) {
    const pop = p.under1Population ?? p.under5Population ?? p.totalPopulation ?? 0;
    const prev = popByVillage.get(p.villageId!) ?? 0;
    if (pop > prev) popByVillage.set(p.villageId!, pop);
  }

  // 5. Pull HTR scores for villages (GRID3 evidence proxy)
  const htrRows = villageIds.length
    ? await db
        .select()
        .from(htrScores)
        .where(
          and(
            eq(htrScores.tenantId, params.tenantId),
            inArray(htrScores.villageId, villageIds),
          ),
        )
    : [];
  const htrByVillage = new Map<number, number>();
  for (const h of htrRows) {
    htrByVillage.set(h.villageId, Number(h.compositeScore ?? 0));
  }

  // 6. Compute per-village registered population share of facility coverage
  //    so a facility's reported doses are distributed across its villages.
  const villageCountByFacility = new Map<number, number>();
  for (const v of villageRows) {
    if (v.assignedFacilityId) {
      villageCountByFacility.set(
        v.assignedFacilityId,
        (villageCountByFacility.get(v.assignedFacilityId) ?? 0) + 1,
      );
    }
  }

  // 7. Pull district/province names for context
  const distRows = facilityIds.length
    ? await db.execute(dsql`
        SELECT d.id AS district_id, d.name AS district_name, p.id AS province_id, p.name AS province_name
        FROM districts d
        LEFT JOIN provinces p ON p.id = d.province_id
      `)
    : { rows: [] as any[] };
  const distMap = new Map<number, { name: string; provinceName?: string }>(
    ((distRows as any).rows ?? []).map((r: any) => [
      r.district_id,
      { name: r.district_name, provinceName: r.province_name },
    ]),
  );

  // 8. Score each village
  const results: MissedCommunityRow[] = [];
  for (const v of villageRows) {
    if (allowedDistrictIds && !allowedDistrictIds.has(v.districtId)) continue;
    const fac = v.assignedFacilityId ? facById.get(v.assignedFacilityId) : undefined;
    if (!fac) continue;

    const registered = popByVillage.get(v.id) ?? 0;
    const facilityDoses = dosesByFacility.get(fac.id) ?? 0;
    const villageShare = villageCountByFacility.get(fac.id) ?? 1;
    const villageDoses = facilityDoses / villageShare;
    const unservedEstimate = Math.max(0, registered - villageDoses);
    const htrFlag = v.isHardToReach ? 1 : 0;
    const distanceKm = Number(v.distanceToFacility ?? 0);
    const grid3Evidence = htrByVillage.get(v.id) ?? 0;

    const components = {
      unserved: w.unserved * unservedEstimate,
      htr: w.htr * htrFlag,
      distance: w.distance * distanceKm,
      grid3: w.grid3 * grid3Evidence,
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
      registeredPopulation: registered,
      dosesAdministered: Math.round(villageDoses),
      unservedEstimate: Math.round(unservedEstimate),
      isHardToReach: !!v.isHardToReach,
      distanceKm,
      grid3Evidence,
      score: Math.round(score * 100) / 100,
      components,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 500);
}
