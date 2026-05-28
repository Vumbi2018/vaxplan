import type { Microplan } from "@shared/schema";

export type StaffingRow = {
  role: string;
  headcount: number;
  days: number;
  perDiem: number;
  fundingSource?: string;
  fundingSourceOther?: string;
};

export type PersonnelCountField =
  | "vaccinatorsCount"
  | "volunteersCount"
  | "supervisorsCount"
  | "recordersCount";

export function rosterRoleToPlanCountField(
  role: string,
): PersonnelCountField | null {
  const r = (role || "").toLowerCase();
  if (r.includes("vaccinator")) return "vaccinatorsCount";
  if (r.includes("supervisor")) return "supervisorsCount";
  if (r.includes("recorder")) return "recordersCount";
  if (r.includes("mobil") || r.includes("volunteer")) return "volunteersCount";
  return null;
}

export function extractRoster(
  microplan: Microplan | undefined | null,
): StaffingRow[] {
  if (!microplan) return [];
  const raw = (microplan as any).staffing;
  if (Array.isArray(raw)) return raw as StaffingRow[];
  if (raw && Array.isArray(raw.roster)) return raw.roster as StaffingRow[];
  return [];
}

export function ratesByField(roster: StaffingRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  roster.forEach((r) => {
    const f = rosterRoleToPlanCountField(r.role);
    if (!f) return;
    if ((r.perDiem || 0) > (out[f] || 0)) out[f] = r.perDiem || 0;
  });
  return out;
}

export function personnelCostForDay(
  rates: Record<string, number>,
  counts: {
    vaccinatorsCount?: number | null;
    volunteersCount?: number | null;
    supervisorsCount?: number | null;
    recordersCount?: number | null;
  },
): number {
  return (
    (rates.vaccinatorsCount || 0) * (counts.vaccinatorsCount ?? 0) +
    (rates.volunteersCount || 0) * (counts.volunteersCount ?? 0) +
    (rates.supervisorsCount || 0) * (counts.supervisorsCount ?? 0) +
    (rates.recordersCount || 0) * (counts.recordersCount ?? 0)
  );
}
