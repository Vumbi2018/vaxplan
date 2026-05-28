import type { VaccineConfig } from "./schema";

export interface DoseStage {
  code: string;
  label: string;
  antigen: string;
  doseNumber: number;
  configId: number;
}

const DOSE_LIST_SUFFIX = /^(.+?)[-_\s]+(\d+(?:\s*[,/]\s*\d+)*\+?)\s*$/;

function stripDoseListSuffix(name: string): string {
  const m = name.match(DOSE_LIST_SUFFIX);
  return m ? m[1].trim() : name;
}

function normalizeCode(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "_");
}

export interface CanonicalizePerAntigenResult {
  perAntigen: Record<string, number>;
  perAntigenUnmapped: Record<string, number>;
  unmappedCodes: string[];
}

/**
 * Validate a perAntigen payload against the tenant's vaccine schedule.
 * Known codes are canonicalized to the schedule's exact code (case- and
 * whitespace-insensitive). Unknown codes are kept under `perAntigenUnmapped`
 * so older offline-outbox entries / stale clients still count toward totals
 * without polluting per-antigen rollups.
 */
export function canonicalizePerAntigen(
  raw: Record<string, unknown> | null | undefined,
  configs: VaccineConfig[] | undefined | null,
): CanonicalizePerAntigenResult {
  const stages = expandVaccineSchedule(configs);
  const lookup = new Map<string, string>();
  for (const s of stages) {
    lookup.set(s.code, s.code);
    lookup.set(s.code.toUpperCase(), s.code);
    lookup.set(s.code.replace(/\s+/g, "_").toUpperCase(), s.code);
  }
  const perAntigen: Record<string, number> = {};
  const perAntigenUnmapped: Record<string, number> = {};
  for (const [rawKey, rawVal] of Object.entries(raw ?? {})) {
    const key = String(rawKey).trim();
    if (!key) continue;
    const val = Number(rawVal);
    if (!Number.isFinite(val) || val < 0) continue;
    const canonical =
      lookup.get(key) ??
      lookup.get(key.toUpperCase()) ??
      lookup.get(key.replace(/\s+/g, "_").toUpperCase());
    if (canonical) {
      perAntigen[canonical] = (perAntigen[canonical] ?? 0) + val;
    } else {
      perAntigenUnmapped[key] = (perAntigenUnmapped[key] ?? 0) + val;
    }
  }
  return {
    perAntigen,
    perAntigenUnmapped,
    unmappedCodes: Object.keys(perAntigenUnmapped),
  };
}

export function expandVaccineSchedule(
  configs: VaccineConfig[] | undefined | null,
): DoseStage[] {
  if (!configs || configs.length === 0) return [];

  const stages: DoseStage[] = [];

  for (const cfg of configs) {
    if (!cfg || (cfg as any).isActive === false) continue;
    const doses = Math.max(1, Number(cfg.doses) || 1);
    const rawName = (cfg.name || "").trim();
    if (!rawName) continue;

    if (doses === 1) {
      stages.push({
        code: normalizeCode(rawName),
        label: rawName,
        antigen: rawName,
        doseNumber: 1,
        configId: cfg.id,
      });
      continue;
    }

    const antigenLabel = stripDoseListSuffix(rawName);
    const codeBase = normalizeCode(antigenLabel);

    for (let i = 1; i <= doses; i++) {
      stages.push({
        code: `${codeBase}-${i}`,
        label: `${antigenLabel}-${i}`,
        antigen: antigenLabel,
        doseNumber: i,
        configId: cfg.id,
      });
    }
  }

  return stages;
}
