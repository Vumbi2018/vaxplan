export interface WastageThreshold {
  warn: number;
  max: number;
}

export const DEFAULT_WASTAGE_THRESHOLDS: Record<string, WastageThreshold> = {
  BCG: { warn: 40, max: 50 },
  Measles: { warn: 20, max: 25 },
  MR: { warn: 20, max: 25 },
  MMR: { warn: 20, max: 25 },
  YellowFever: { warn: 20, max: 25 },
  YF: { warn: 20, max: 25 },
  OPV: { warn: 15, max: 20 },
  bOPV: { warn: 15, max: 20 },
  IPV: { warn: 8, max: 10 },
  Penta: { warn: 8, max: 10 },
  PCV: { warn: 8, max: 10 },
  PCV13: { warn: 8, max: 10 },
  Rota: { warn: 8, max: 10 },
  Rotavirus: { warn: 8, max: 10 },
  HepB: { warn: 8, max: 10 },
  TT: { warn: 8, max: 10 },
  Td: { warn: 8, max: 10 },
  HPV: { warn: 8, max: 10 },
  COVID: { warn: 8, max: 10 },
  COVID19: { warn: 8, max: 10 },
};

export const FALLBACK_WASTAGE_THRESHOLD: WastageThreshold = { warn: 8, max: 10 };

function normalizeAntigenKey(key: string): string {
  return key.replace(/[-_\s]/g, "").toLowerCase();
}

/**
 * Merge tenant-supplied overrides on top of the WHO defaults. Overrides whose
 * values are missing, non-numeric, or otherwise invalid are ignored so a
 * partially-edited tenant config can never break the chips.
 */
export function mergeWastageThresholds(
  overrides?: Record<string, Partial<WastageThreshold>> | null,
): Record<string, WastageThreshold> {
  const merged: Record<string, WastageThreshold> = { ...DEFAULT_WASTAGE_THRESHOLDS };
  if (!overrides) return merged;
  for (const [key, val] of Object.entries(overrides)) {
    if (!val) continue;
    const warn = Number(val.warn);
    const max = Number(val.max);
    if (!Number.isFinite(warn) || !Number.isFinite(max)) continue;
    if (warn < 0 || max < 0 || max < warn) continue;
    merged[key] = { warn, max };
  }
  return merged;
}

export function getWastageThreshold(
  antigen: string,
  thresholds: Record<string, WastageThreshold> = DEFAULT_WASTAGE_THRESHOLDS,
): WastageThreshold {
  if (thresholds[antigen]) return thresholds[antigen];
  const norm = normalizeAntigenKey(antigen);
  for (const [key, val] of Object.entries(thresholds)) {
    if (normalizeAntigenKey(key) === norm) return val;
  }
  return FALLBACK_WASTAGE_THRESHOLD;
}

export type WastageStatus = "ok" | "warn" | "breach";

export function classifyWastage(
  antigen: string,
  rate: number,
  thresholds: Record<string, WastageThreshold> = DEFAULT_WASTAGE_THRESHOLDS,
): WastageStatus {
  const t = getWastageThreshold(antigen, thresholds);
  if (rate > t.max) return "breach";
  if (rate >= t.warn) return "warn";
  return "ok";
}

export function wastageChipClasses(status: WastageStatus): string {
  switch (status) {
    case "breach":
      return "bg-destructive/10 text-destructive border-destructive/40";
    case "warn":
      return "bg-amber-500/10 text-amber-600 border-amber-500/40";
    default:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/40";
  }
}
