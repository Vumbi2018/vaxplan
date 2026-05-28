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

export function getWastageThreshold(antigen: string): WastageThreshold {
  if (DEFAULT_WASTAGE_THRESHOLDS[antigen]) return DEFAULT_WASTAGE_THRESHOLDS[antigen];
  const norm = antigen.replace(/[-_\s]/g, "").toLowerCase();
  for (const [key, val] of Object.entries(DEFAULT_WASTAGE_THRESHOLDS)) {
    if (key.toLowerCase() === norm) return val;
  }
  return FALLBACK_WASTAGE_THRESHOLD;
}

export type WastageStatus = "ok" | "warn" | "breach";

export function classifyWastage(antigen: string, rate: number): WastageStatus {
  const t = getWastageThreshold(antigen);
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
