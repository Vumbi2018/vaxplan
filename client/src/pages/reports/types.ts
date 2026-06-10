/**
 * Shared TypeScript types for the Reporting Engine client.
 */

export type ReportLevel = "national" | "province" | "district" | "facility";

export interface HierarchyRow {
  level: ReportLevel;
  id:   number | string;
  name: string;
  parent_id?: number | string | null;
  [key: string]: unknown;
}

export interface ReportMeta {
  generatedAt: string;
  filters: {
    year:       number | null;
    quarter:    number | null;
    provinceId: number | null;
    districtId: number | null;
    facilityId: number | null;
  };
}

export interface ReportResponse {
  success: boolean;
  data: HierarchyRow[];
  meta: ReportMeta;
}

export interface ReportFilters {
  year?:       number;
  quarter?:    number;
  provinceId?: number;
  districtId?: number;
  facilityId?: number;
}

export function buildReportQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.year)       params.set("year",       String(filters.year));
  if (filters.quarter)    params.set("quarter",    String(filters.quarter));
  if (filters.provinceId) params.set("provinceId", String(filters.provinceId));
  if (filters.districtId) params.set("districtId", String(filters.districtId));
  if (filters.facilityId) params.set("facilityId", String(filters.facilityId));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const LEVEL_INDENT: Record<ReportLevel, number> = {
  national: 0,
  province: 0,
  district: 1,
  facility: 2,
};

export const LEVEL_COLOR: Record<ReportLevel, string> = {
  national: "text-foreground font-bold",
  province: "text-blue-700 dark:text-blue-400 font-semibold",
  district: "text-green-700 dark:text-green-400 font-medium",
  facility: "text-muted-foreground font-normal",
};

export const LEVEL_BADGE: Record<ReportLevel, string> = {
  national: "bg-slate-500/10 text-slate-600 border-slate-300",
  province: "bg-blue-500/10 text-blue-700 border-blue-200",
  district: "bg-green-500/10 text-green-700 border-green-200",
  facility: "bg-orange-500/10 text-orange-700 border-orange-200",
};
