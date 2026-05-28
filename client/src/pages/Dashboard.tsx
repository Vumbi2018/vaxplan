import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  DollarSign,
  Activity,
  Syringe,
  ClipboardCheck,
  Download,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Facility, Village, SessionPlan, BudgetItem, ApprovalRequest, PopulationData, StockTransaction, VaccineConfig } from "@shared/schema";
import { deriveSessionLifecycle } from "@/lib/sessionStatus";
import { summarizeFacilityAlerts, loadStockThreshold } from "@/lib/stockAlerts";
import { Package } from "lucide-react";

interface StatsData {
  totalFacilities: number;
  totalVillages: number;
  htrVillages: number;
  totalSessions: number;
  totalPopulation: number;
  activeFacilities: number;
}

interface CoverageVaccine {
  vaccineName: string;
  targetPopulation: number;
  dosesRequired: number;
  administered: number;
  coveragePct: number;
}

interface CoverageData {
  quarter: number;
  year: number;
  facilityId: number | null;
  vaccines: CoverageVaccine[];
  totals: {
    targetPopulation: number;
    administered: number;
    coveragePct: number;
  };
}

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getUTCFullYear();
const CURRENT_QUARTER = Math.floor(CURRENT_DATE.getUTCMonth() / 3) + 1;
const COVERAGE_STORAGE_KEY = "vaxplan_dashboard_coverage_filters";

const isFacilityScopedRole = (role?: string) =>
  role === "facility_clerk" || role === "facility_in_charge";

interface ZeroDoseSummary {
  total: number;
  denominator: number;
  pct: number;
  underImmunized: { total: number; denominator: number; pct: number };
  byDistrict: Array<{
    districtId: number;
    districtName: string;
    zeroDose: number;
    underImmunized: number;
    denominator: number;
    pct: number;
    underImmunizedPct: number;
  }>;
}
interface DropoutSummary {
  dtp1_dtp3: { num: number; denom: number; rate: number; byDistrict: Array<{ districtId: number; districtName: string; dtp1: number; dtp3: number; rate: number }> };
  dtp1_mcv1: { num: number; denom: number; rate: number; byDistrict: Array<{ districtId: number; districtName: string; dtp1: number; mcv1: number; rate: number }> };
}

function dropoutBadgeClass(rate: number) {
  if (rate > 10) return "border-rose-500 text-rose-600";
  if (rate >= 5) return "border-amber-500 text-amber-600";
  return "border-emerald-500 text-emerald-600";
}

function ImmunizationIndicatorCards() {
  const { data: zd, isLoading: zdLoading } = useQuery<ZeroDoseSummary>({
    queryKey: ["/api/indicators/zero-dose"],
  });
  const { data: dr, isLoading: drLoading } = useQuery<DropoutSummary>({
    queryKey: ["/api/indicators/dropout"],
  });

  const topZeroDose = (zd?.byDistrict ?? []).slice(0, 5);
  const maxZd = Math.max(1, ...topZeroDose.map((d) => d.zeroDose));

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Card data-testid="card-zero-dose">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Zero-dose children
            </CardTitle>
            <Link
              href="/indicators/zero-dose"
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="link-zero-dose-details"
            >
              By village →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {zdLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !zd || zd.denominator === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eligible children (≥12 months) registered yet.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-600" data-testid="text-zero-dose-total">
                  {zd.total.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {zd.denominator.toLocaleString()} children ≥12 mo · {zd.pct}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Children ≥12 months with no DTP1 (Pentavalent-1) dose recorded. Excludes SIA / campaign doses.
              </p>
              <div className="space-y-1.5 pt-1">
                {topZeroDose.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All districts at 0%.</p>
                ) : (
                  topZeroDose.map((d) => (
                    <div key={d.districtId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate text-foreground">{d.districtName}</span>
                        <span className="font-mono text-muted-foreground">
                          {d.zeroDose} ({d.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${(d.zeroDose / maxZd) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-under-immunized">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="h-5 w-5 text-amber-500" />
              Under-immunized children
            </CardTitle>
            <Link
              href="/indicators/zero-dose"
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="link-under-immunized-details"
            >
              By village →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {zdLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !zd || zd.denominator === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eligible children (≥12 months) registered yet.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold text-amber-600"
                  data-testid="text-under-immunized-total"
                >
                  {zd.underImmunized.total.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {zd.underImmunized.denominator.toLocaleString()} children ≥12 mo · {zd.underImmunized.pct}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Children ≥12 months who received DTP1 but not DTP3 (Pentavalent-3). Excludes SIA / campaign doses.
              </p>
              <div className="space-y-1.5 pt-1">
                {zd.byDistrict.filter((d) => d.underImmunized > 0).length === 0 ? (
                  <p className="text-xs text-muted-foreground">All districts at 0%.</p>
                ) : (
                  [...zd.byDistrict]
                    .sort((a, b) => b.underImmunized - a.underImmunized)
                    .slice(0, 5)
                    .map((d) => {
                      const maxUI = Math.max(
                        1,
                        ...zd.byDistrict.map((x) => x.underImmunized),
                      );
                      return (
                        <div key={d.districtId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate text-foreground">
                              {d.districtName}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {d.underImmunized} ({d.underImmunizedPct}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${(d.underImmunized / maxUI) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-dropout">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Dropout rates
            </CardTitle>
            <Link
              href="/indicators/dropout"
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="link-dropout-details"
            >
              Per-facility view →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {drLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !dr || dr.dtp1_dtp3.denom === 0 ? (
            <p className="text-sm text-muted-foreground">
              No DTP1 doses recorded yet — cannot compute dropout.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">DTP1 → DTP3</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" data-testid="text-dropout-dtp3">
                      {dr.dtp1_dtp3.rate}%
                    </span>
                    <Badge variant="outline" className={dropoutBadgeClass(dr.dtp1_dtp3.rate)}>
                      {dr.dtp1_dtp3.rate > 10 ? "High" : dr.dtp1_dtp3.rate >= 5 ? "Watch" : "OK"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {dr.dtp1_dtp3.num.toLocaleString()} DTP3 of {dr.dtp1_dtp3.denom.toLocaleString()} DTP1
                  </div>
                </div>
                <div className="rounded-xl border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">DTP1 → MCV1</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" data-testid="text-dropout-mcv1">
                      {dr.dtp1_mcv1.rate}%
                    </span>
                    <Badge variant="outline" className={dropoutBadgeClass(dr.dtp1_mcv1.rate)}>
                      {dr.dtp1_mcv1.rate > 10 ? "High" : dr.dtp1_mcv1.rate >= 5 ? "Watch" : "OK"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {dr.dtp1_mcv1.num.toLocaleString()} MCV1 of {dr.dtp1_mcv1.denom.toLocaleString()} DTP1
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Top districts by DTP1→DTP3 dropout
                </p>
                {dr.dtp1_dtp3.byDistrict.slice(0, 4).map((d) => (
                  <div key={d.districtId} className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate text-foreground">{d.districtName}</span>
                    <Badge variant="outline" className={dropoutBadgeClass(d.rate)}>
                      {d.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                WHO formula: (DTP1 − DTPn) / DTP1 × 100. Routine RI doses only (excludes campaign).
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type SupervisionVisitLite = {
  id: number;
  facilityId: number;
  scheduledDate: string;
  conductedDate: string | null;
  status: string;
  score: number | null;
};

function quarterStart(year: number, quarter: number) {
  return new Date(Date.UTC(year, (quarter - 1) * 3, 1));
}
function quarterEnd(year: number, quarter: number) {
  return new Date(Date.UTC(year, quarter * 3, 1));
}

interface TenantSummary { id: string; name: string; code: string; settings?: Record<string, any> | null }

function SupervisionCoverageByDistrictCard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const { data: visits, isLoading: loadingVisits } = useQuery<SupervisionVisitLite[]>({
    queryKey: ["/api/supervision-visits"],
  });
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });
  const { data: districts } = useQuery<any[]>({
    queryKey: ["/api/districts"],
  });
  const { data: provinces } = useQuery<any[]>({
    queryKey: ["/api/provinces"],
  });
  const { data: tenant } = useQuery<TenantSummary>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const provinceOptions = useMemo(() => {
    const present = new Set<number>();
    (districts || []).forEach((d: any) => {
      const pid = Number(d.provinceId);
      if (pid) present.add(pid);
    });
    return (provinces || [])
      .filter((p: any) => present.has(Number(p.id)))
      .map((p: any) => ({ id: Number(p.id), name: String(p.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [provinces, districts]);

  const selectedProvince = useMemo(() => {
    if (provinceFilter === "all") return null;
    const pid = Number(provinceFilter);
    return provinceOptions.find((p) => p.id === pid) || null;
  }, [provinceFilter, provinceOptions]);

  const provinceLabel = selectedProvince ? selectedProvince.name : "All provinces";

  const qStart = quarterStart(CURRENT_YEAR, CURRENT_QUARTER);
  const qEnd = quarterEnd(CURRENT_YEAR, CURRENT_QUARTER);
  const overdueThresholdMs = 90 * 86_400_000;
  const now = Date.now();

  const rows = useMemo(() => {
    if (!facilities || !districts) return [];
    const facByDistrict = new Map<number, Facility[]>();
    facilities.forEach((f) => {
      const did = Number((f as any).districtId);
      if (!did) return;
      const list = facByDistrict.get(did) || [];
      list.push(f);
      facByDistrict.set(did, list);
    });

    const visitsByFacility = new Map<number, SupervisionVisitLite[]>();
    (visits || []).forEach((v) => {
      const list = visitsByFacility.get(v.facilityId) || [];
      list.push(v);
      visitsByFacility.set(v.facilityId, list);
    });

    const filteredDistricts = selectedProvince
      ? districts.filter((d: any) => Number(d.provinceId) === selectedProvince.id)
      : districts;

    return filteredDistricts
      .map((d: any) => {
        const facs = facByDistrict.get(Number(d.id)) || [];
        const total = facs.length;
        let visitedThisQuarter = 0;
        let overdue = 0;
        let scoreSum = 0;
        let scoreN = 0;
        facs.forEach((f) => {
          const fv = visitsByFacility.get(Number(f.id)) || [];
          const conducted = fv
            .filter((v) => v.status === "conducted")
            .map((v) => ({ ...v, when: new Date(v.conductedDate || v.scheduledDate) }))
            .sort((a, b) => +b.when - +a.when);
          const inQuarter = conducted.some(
            (v) => v.when >= qStart && v.when < qEnd,
          );
          if (inQuarter) visitedThisQuarter++;
          const last = conducted[0];
          if (!last || now - +last.when > overdueThresholdMs) overdue++;
          if (last && typeof last.score === "number") {
            scoreSum += last.score;
            scoreN++;
          }
        });
        return {
          districtId: Number(d.id),
          districtName: d.name as string,
          total,
          visitedThisQuarter,
          overdue,
          avgScore: scoreN ? Math.round(scoreSum / scoreN) : null,
          visitedPct: total ? Math.round((visitedThisQuarter / total) * 100) : 0,
          overduePct: total ? Math.round((overdue / total) * 100) : 0,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => a.visitedPct - b.visitedPct || b.overduePct - a.overduePct);
  }, [facilities, districts, visits, qStart.getTime(), qEnd.getTime(), selectedProvince]);

  const totals = useMemo(() => {
    const totalFac = rows.reduce((s, r) => s + r.total, 0);
    const visited = rows.reduce((s, r) => s + r.visitedThisQuarter, 0);
    const overdue = rows.reduce((s, r) => s + r.overdue, 0);
    const scored = rows.filter((r) => r.avgScore !== null);
    const avg = scored.length
      ? Math.round(scored.reduce((s, r) => s + (r.avgScore || 0), 0) / scored.length)
      : null;
    return {
      totalFac,
      visited,
      overdue,
      visitedPct: totalFac ? Math.round((visited / totalFac) * 100) : 0,
      overduePct: totalFac ? Math.round((overdue / totalFac) * 100) : 0,
      avg,
    };
  }, [rows]);

  const quarterLabel = `Q${CURRENT_QUARTER} ${CURRENT_YEAR}`;
  const qStartIso = qStart.toISOString().slice(0, 10);
  const qEndIso = qEnd.toISOString().slice(0, 10);

  const tenantBrand = useMemo(() => {
    const tenantSettings = (tenant?.settings || {}) as Record<string, any>;
    const rawColor =
      typeof tenantSettings.brandColor === "string" ? tenantSettings.brandColor.trim() : "";
    const brandColor = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : "";
    const rawLogo =
      typeof tenantSettings.brandLogoDataUrl === "string"
        ? tenantSettings.brandLogoDataUrl.trim()
        : "";
    const brandLogo = /^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,/.test(rawLogo)
      ? rawLogo
      : "";
    return {
      tenantName: tenant?.name ?? "VaxPlan",
      brandColor,
      brandLogo,
      headingColor: brandColor || "#333",
    };
  }, [tenant?.name, tenant?.settings]);

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No districts with facilities yet.",
        variant: "destructive",
      });
      return;
    }
    const lines: string[] = [];
    lines.push(escapeCsv(tenantBrand.tenantName));
    lines.push(`Supervision coverage by district — ${quarterLabel}`);
    lines.push(`Province,${provinceLabel}`);
    lines.push(`Quarter window,${qStartIso} to ${qEndIso}`);
    lines.push(`Overdue threshold,No conducted visit in last 90 days`);
    lines.push(`Generated,${new Date().toISOString()}`);
    lines.push("");
    lines.push(
      ["District", "Facilities", `Visited ${quarterLabel} (count)`, `Visited ${quarterLabel} (%)`, "Overdue (count)", "Overdue (%)", "Avg last score (%)"]
        .map(escapeCsv)
        .join(","),
    );
    for (const r of rows) {
      lines.push(
        [
          r.districtName,
          r.total,
          r.visitedThisQuarter,
          `${r.visitedPct}%`,
          r.overdue,
          `${r.overduePct}%`,
          r.avgScore === null ? "" : `${r.avgScore}%`,
        ]
          .map(escapeCsv)
          .join(","),
      );
    }
    lines.push(
      [
        "TOTAL",
        totals.totalFac,
        totals.visited,
        `${totals.visitedPct}%`,
        totals.overdue,
        `${totals.overduePct}%`,
        totals.avg === null ? "" : `${totals.avg}%`,
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const provinceSlug = selectedProvince
      ? `-${selectedProvince.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`
      : "";
    a.download = `supervision-by-district-Q${CURRENT_QUARTER}-${CURRENT_YEAR}${provinceSlug}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export ready",
      description: `${quarterLabel} supervision scorecard downloaded.`,
    });
  };

  const handleExportPdf = () => {
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No districts with facilities yet.",
        variant: "destructive",
      });
      return;
    }
    const escapeHtml = (val: any): string => {
      if (val === null || val === undefined) return "";
      return String(val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    const generatedAt = new Date().toLocaleString();
    const bodyRows = rows
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.districtName)}</td>
          <td class="num">${r.total}</td>
          <td class="num">${r.visitedThisQuarter} / ${r.total} (${r.visitedPct}%)</td>
          <td class="num">${r.overdue} (${r.overduePct}%)</td>
          <td class="num">${r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
        </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Supervision coverage by district — ${escapeHtml(quarterLabel)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; font-size: 11px; margin: 0; padding: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px 0; color: ${tenantBrand.headingColor}; }
  .meta { color: #444; font-size: 10px; margin-bottom: 2px; }
  .header { border-bottom: 3px solid ${tenantBrand.headingColor}; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 14px; }
  .header .brand-logo { max-height: 56px; max-width: 120px; object-fit: contain; }
  .header .header-text { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #bbb; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: ${tenantBrand.brandColor || "#f1f1f1"}; color: ${tenantBrand.brandColor ? "#fff" : "#111"}; font-weight: 600; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .total-row td { font-weight: 600; background: #f7f7f7; }
  .note { color: #555; font-size: 10px; margin-top: 8px; }
  .print-hint { background: #fffbe6; border: 1px solid #ffe58f; padding: 8px 12px; margin-bottom: 12px; font-size: 11px; }
  @media print { .print-hint { display: none; } }
</style>
</head>
<body>
  <div class="print-hint">Use your browser's <strong>Print</strong> dialog and choose "Save as PDF" to export.</div>
  <div class="header">
    ${tenantBrand.brandLogo ? `<img class="brand-logo" src="${escapeHtml(tenantBrand.brandLogo)}" alt="${escapeHtml(tenantBrand.tenantName)} logo" />` : ""}
    <div class="header-text">
      <h1>Supervision coverage by district</h1>
      <div class="meta"><strong>${escapeHtml(tenantBrand.tenantName)}</strong></div>
      <div class="meta">Province: <strong>${escapeHtml(provinceLabel)}</strong></div>
      <div class="meta">Quarter: <strong>${escapeHtml(quarterLabel)}</strong> (${escapeHtml(qStartIso)} to ${escapeHtml(qEndIso)})</div>
      <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>District</th>
        <th class="num">Facilities</th>
        <th class="num">Visited ${escapeHtml(quarterLabel)}</th>
        <th class="num">Overdue (&gt;90d)</th>
        <th class="num">Avg last score</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
      <tr class="total-row">
        <td>Total</td>
        <td class="num">${totals.totalFac}</td>
        <td class="num">${totals.visited} / ${totals.totalFac} (${totals.visitedPct}%)</td>
        <td class="num">${totals.overdue} (${totals.overduePct}%)</td>
        <td class="num">${totals.avg === null ? "—" : `${totals.avg}%`}</td>
      </tr>
    </tbody>
  </table>
  <p class="note">"Visited this quarter" counts facilities with at least one conducted visit in the quarter window above. "Overdue" = no conducted visit in the last 90 days.</p>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    });
  </script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast({
        title: "Pop-up blocked",
        description: "Allow pop-ups for this site to export the PDF.",
        variant: "destructive",
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    toast({
      title: "PDF ready to print",
      description: `Use your browser's print dialog and choose "Save as PDF".`,
    });
  };

  return (
    <Card data-testid="card-supervision-by-district">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-500" />
            Supervision coverage by district
            <span className="text-xs font-normal text-muted-foreground ml-1">
              · {quarterLabel}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger
                className="h-8 w-[180px] text-xs"
                data-testid="select-supervision-province"
              >
                <SelectValue placeholder="All provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-supervision-province-all">
                  All provinces
                </SelectItem>
                {provinceOptions.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={String(p.id)}
                    data-testid={`option-supervision-province-${p.id}`}
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              data-testid="button-export-supervision-csv"
              title="Download as CSV"
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPdf}
              disabled={rows.length === 0}
              data-testid="button-export-supervision-pdf"
              title="Open printable PDF view"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Link
              href="/supervision"
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="link-supervision-all"
            >
              Open supervision →
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {loadingVisits ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No districts with facilities yet, or no visits scheduled.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Facilities</div>
                <div className="text-lg font-semibold">{totals.totalFac}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Visited this quarter</div>
                <div className="text-lg font-semibold text-emerald-600">{totals.visitedPct}%</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Overdue (&gt;90d)</div>
                <div className="text-lg font-semibold text-rose-600">{totals.overduePct}%</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Avg last score</div>
                <div className="text-lg font-semibold">
                  {totals.avg === null ? "—" : `${totals.avg}%`}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 px-2 font-medium">District</th>
                    <th className="py-2 px-2 font-medium text-right">Facilities</th>
                    <th className="py-2 px-2 font-medium text-right">Visited Q{CURRENT_QUARTER}</th>
                    <th className="py-2 px-2 font-medium text-right">Overdue</th>
                    <th className="py-2 px-2 font-medium text-right">Avg score</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.districtId}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => setLocation(`/supervision?districtId=${r.districtId}`)}
                      data-testid={`row-supervision-district-${r.districtId}`}
                    >
                      <td className="py-2 px-2 font-medium">{r.districtName}</td>
                      <td className="py-2 px-2 text-right">{r.total}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant="outline"
                          className={
                            r.visitedPct >= 80
                              ? "border-emerald-500 text-emerald-600"
                              : r.visitedPct >= 50
                              ? "border-amber-500 text-amber-600"
                              : "border-rose-500 text-rose-600"
                          }
                        >
                          {r.visitedThisQuarter}/{r.total} · {r.visitedPct}%
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant="outline"
                          className={
                            r.overduePct === 0
                              ? "border-emerald-500 text-emerald-600"
                              : r.overduePct <= 25
                              ? "border-amber-500 text-amber-600"
                              : "border-rose-500 text-rose-600"
                          }
                        >
                          {r.overdue} ({r.overduePct}%)
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {r.avgScore === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              r.avgScore >= 80
                                ? "text-emerald-600 font-medium"
                                : r.avgScore >= 60
                                ? "text-amber-600 font-medium"
                                : "text-rose-600 font-medium"
                            }
                          >
                            {r.avgScore}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                        View →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              "Visited this quarter" counts facilities with at least one conducted visit between{" "}
              {qStart.toISOString().slice(0, 10)} and {qEnd.toISOString().slice(0, 10)}. "Overdue" =
              no conducted visit in the last 90 days. Click a district to see its facilities.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [liveTime, setLiveTime] = useState(new Date());

  const facilityLocked = isFacilityScopedRole(user?.role) && !!user?.facilityId;

  const [coverageFilters, setCoverageFilters] = useState(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    let stored: { quarter?: number; year?: number; facilityId?: number | null } = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COVERAGE_STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch {}
    }
    const parseInt10 = (v: string | null) =>
      v && /^\d+$/.test(v) ? parseInt(v, 10) : undefined;

    const quarter =
      parseInt10(params.get("quarter")) ?? stored.quarter ?? CURRENT_QUARTER;
    const year = parseInt10(params.get("year")) ?? stored.year ?? CURRENT_YEAR;

    let facilityId: number | null;
    if (facilityLocked) {
      facilityId = Number(user!.facilityId);
    } else {
      const fp = params.get("facilityId");
      if (fp === "all") facilityId = null;
      else if (fp && /^\d+$/.test(fp)) facilityId = parseInt(fp, 10);
      else if (stored.facilityId === null) facilityId = null;
      else if (typeof stored.facilityId === "number") facilityId = stored.facilityId;
      else facilityId = null;
    }
    return {
      quarter: quarter >= 1 && quarter <= 4 ? quarter : CURRENT_QUARTER,
      year,
      facilityId,
    };
  });

  const displayName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Officer";
  }, [user]);

  // Dynamic live date & time updating every second
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hr = liveTime.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  }, [liveTime]);

  const formattedTime = useMemo(() => {
    return (
      liveTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " · " +
      liveTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, [liveTime]);

  const { data: facilities, isLoading: loadingFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: villages, isLoading: loadingVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: budgetItems, isLoading: loadingBudget } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget-items"],
  });

  const { data: approvals, isLoading: loadingApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals"],
  });

  const { data: populationDataList, isLoading: loadingPopulation } = useQuery<PopulationData[]>({
    queryKey: ["/api/population"],
  });

  const { data: allDistricts, isLoading: loadingDistricts } = useQuery<any[]>({
    queryKey: ["/api/districts"],
  });

  const { data: provinces, isLoading: loadingProvinces } = useQuery<any[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: stockTransactions } = useQuery<StockTransaction[]>({
    queryKey: ["/api/stock/ledger"],
  });

  const { data: vaccineConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
  });

  const stockAlertSummaries = useMemo(() => {
    if (!stockTransactions) return [];
    const threshold = loadStockThreshold();
    return summarizeFacilityAlerts(stockTransactions, vaccineConfigs, threshold);
  }, [stockTransactions, vaccineConfigs]);

  const scopedStockAlerts = useMemo(() => {
    const list = user?.facilityId
      ? stockAlertSummaries.filter(
          (s) => s.facilityId === Number(user.facilityId),
        )
      : stockAlertSummaries;
    const totals = list.reduce(
      (acc, s) => {
        acc.lowStock += s.lowStockAntigens.length;
        acc.outOfStock += s.outOfStockAntigens.length;
        acc.nearExpiry += s.nearExpiryBatches;
        acc.expiringSoon += s.expiringSoonBatches;
        acc.expired += s.expiredBatches;
        if (
          s.lowStockAntigens.length +
            s.outOfStockAntigens.length +
            s.nearExpiryBatches >
          0
        )
          acc.facilitiesAtRisk++;
        return acc;
      },
      {
        lowStock: 0,
        outOfStock: 0,
        nearExpiry: 0,
        expiringSoon: 0,
        expired: 0,
        facilitiesAtRisk: 0,
      },
    );
    return { list, totals };
  }, [stockAlertSummaries, user?.facilityId]);

  const topAlertFacilities = useMemo(() => {
    if (!facilities || user?.facilityId) return [];
    const fmap = new Map(facilities.map((f) => [Number(f.id), f.name]));
    return [...scopedStockAlerts.list]
      .map((s) => ({
        ...s,
        name: fmap.get(s.facilityId) ?? `Facility #${s.facilityId}`,
        score:
          s.outOfStockAntigens.length * 3 +
          s.lowStockAntigens.length * 2 +
          s.expiringSoonBatches * 2 +
          s.nearExpiryBatches,
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [scopedStockAlerts.list, facilities, user?.facilityId]);

  const coverageQueryString = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("quarter", String(coverageFilters.quarter));
    qs.set("year", String(coverageFilters.year));
    if (coverageFilters.facilityId !== null) {
      qs.set("facilityId", String(coverageFilters.facilityId));
    }
    return qs.toString();
  }, [coverageFilters]);

  const { data: coverage, isLoading: loadingCoverage } = useQuery<CoverageData>({
    queryKey: [`/api/coverage?${coverageQueryString}`],
  });

  // Persist coverage filter selection across reloads (URL + localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        COVERAGE_STORAGE_KEY,
        JSON.stringify(coverageFilters),
      );
    } catch {}

    const params = new URLSearchParams(window.location.search);
    params.set("quarter", String(coverageFilters.quarter));
    params.set("year", String(coverageFilters.year));
    if (facilityLocked) {
      params.delete("facilityId");
    } else if (coverageFilters.facilityId === null) {
      params.set("facilityId", "all");
    } else {
      params.set("facilityId", String(coverageFilters.facilityId));
    }
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      setLocation(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverageFilters, facilityLocked]);

  // Sync state in if the user opens a fresh URL with different params.
  useEffect(() => {
    const params = new URLSearchParams(searchString || "");
    const qRaw = params.get("quarter");
    const yRaw = params.get("year");
    const fRaw = params.get("facilityId");
    setCoverageFilters((prev) => {
      const next = { ...prev };
      if (qRaw && /^[1-4]$/.test(qRaw)) next.quarter = parseInt(qRaw, 10);
      if (yRaw && /^\d{4}$/.test(yRaw)) next.year = parseInt(yRaw, 10);
      if (!facilityLocked) {
        if (fRaw === "all") next.facilityId = null;
        else if (fRaw && /^\d+$/.test(fRaw)) next.facilityId = parseInt(fRaw, 10);
      } else if (user?.facilityId) {
        next.facilityId = Number(user.facilityId);
      }
      if (
        next.quarter === prev.quarter &&
        next.year === prev.year &&
        next.facilityId === prev.facilityId
      ) {
        return prev;
      }
      return next;
    });
  }, [searchString, facilityLocked, user?.facilityId]);

  const facilityOptions = useMemo<Facility[]>(() => {
    if (!facilities) return [];
    return [...facilities].sort((a: Facility, b: Facility) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [facilities]);

  const selectedFacilityName = useMemo(() => {
    if (coverageFilters.facilityId === null) return "All facilities";
    const f = facilityOptions.find(
      (f: Facility) => Number(f.id) === coverageFilters.facilityId,
    );
    return f?.name || `Facility #${coverageFilters.facilityId}`;
  }, [coverageFilters.facilityId, facilityOptions]);

  const yearOptions = useMemo<number[]>(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR - 3; y <= CURRENT_YEAR + 1; y++) years.push(y);
    if (!years.includes(coverageFilters.year)) years.push(coverageFilters.year);
    return years.sort((a, b) => b - a);
  }, [coverageFilters.year]);

  const htrVillages = stats?.htrVillages || 0;
  const pendingSessions = sessions?.filter((s) => s.status === "planned")?.length || 0;

  // Task #51: surface sessions that should already have been implemented
  // (pending or in-progress with a scheduled date today or earlier). These
  // are the ones HCWs need to either report on or replan.
  const sessionsPendingImplementation = useMemo(() => {
    if (!sessions) return { total: 0, overdue: 0 };
    let total = 0;
    let overdue = 0;
    for (const s of sessions) {
      const lc = deriveSessionLifecycle(s as any);
      if (lc.phase === "pending" || lc.phase === "in_progress") {
        total++;
        if (lc.isOverdue) overdue++;
      }
    }
    return { total, overdue };
  }, [sessions]);

  // Resolve scoped annual population for the logged entity
  const annualPopulationDisplay = useMemo(() => {
    if (!populationDataList) {
      return { value: stats?.totalPopulation || 0, label: "Target Population" };
    }

    const availableYears = Array.from(new Set(populationDataList.map((p) => p.year))).sort(
      (a, b) => b - a
    );
    const yearsToScan = availableYears.length > 0 ? availableYears : [2026, 2025, 2024, 2023, 2022];

    const findRecordForYears = (criteriaFn: (p: PopulationData) => boolean) => {
      for (const year of yearsToScan) {
        const found = populationDataList.find((p) => p.year === year && criteriaFn(p));
        if (found) {
          return found;
        }
      }
      return null;
    };

    // 1. Facility level
    if (user?.facilityId) {
      const facilityIdNum = Number(user.facilityId);
      const record = findRecordForYears(
        (p) => Number(p.facilityId) === facilityIdNum && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `Facility Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 2. District level
    let targetDistrictId: number | null = null;
    if (user?.districtId) {
      targetDistrictId = Number(user.districtId);
    } else if (user?.facilityId && facilities) {
      const facilityIdNum = Number(user.facilityId);
      const facility = facilities.find((f) => Number(f.id) === facilityIdNum);
      if (facility?.districtId) {
        targetDistrictId = Number(facility.districtId);
      }
    }

    if (targetDistrictId) {
      const record = findRecordForYears(
        (p) => Number(p.districtId) === targetDistrictId && !p.facilityId && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `District Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 3. Provincial level
    let targetProvinceId: number | null = null;
    if (user?.provinceId) {
      targetProvinceId = Number(user.provinceId);
    } else if (targetDistrictId && allDistricts) {
      const district = allDistricts.find((d) => Number(d.id) === targetDistrictId);
      if (district?.provinceId) {
        targetProvinceId = Number(district.provinceId);
      }
    }

    if (targetProvinceId) {
      const record = findRecordForYears(
        (p) => Number(p.provinceId) === targetProvinceId && !p.districtId && !p.facilityId && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `Provincial Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 4. National level
    const record = findRecordForYears(
      (p) => !p.provinceId && !p.districtId && !p.facilityId && !p.villageId
    );
    if (record) {
      return {
        value: record.totalPopulation,
        label: `National Annual (${record.year} · ${record.source.toUpperCase()})`,
      };
    }

    // 5. Fallback
    return {
      value: stats?.totalPopulation || 0,
      label: "Target Population",
    };
  }, [user, populationDataList, facilities, allDistricts, provinces, stats]);

  // ─── Dynamic Microplanning Progress Metrics ───────────────────────────────
  
  // 1. Sessions Conducted / Completed
  const completedSessionsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.filter((s) => s.status === "conducted" || s.status === "completed").length;
  }, [sessions]);

  const totalSessionsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.length;
  }, [sessions]);

  const sessionsPercentage = useMemo(() => {
    if (totalSessionsCount === 0) return 0;
    return Math.round((completedSessionsCount / totalSessionsCount) * 100);
  }, [completedSessionsCount, totalSessionsCount]);

  // 2. Catchment Villages Assigned to Facilities
  const assignedVillagesCount = useMemo(() => {
    if (!villages) return 0;
    return villages.filter((v) => v.assignedFacilityId !== null).length;
  }, [villages]);

  const totalVillagesCount = useMemo(() => {
    if (!villages) return 0;
    return villages.length;
  }, [villages]);

  const villagesPercentage = useMemo(() => {
    if (totalVillagesCount === 0) return 0;
    return Math.round((assignedVillagesCount / totalVillagesCount) * 100);
  }, [assignedVillagesCount, totalVillagesCount]);

  // 3. Approved Budgets
  const totalBudgetSum = useMemo(() => {
    if (!budgetItems) return 0;
    return budgetItems.reduce((sum, item) => sum + Number(item.totalCost), 0);
  }, [budgetItems]);

  const approvedBudgetSum = useMemo(() => {
    if (!budgetItems) return 0;
    return budgetItems
      .filter((item) => item.approvalStatus === "approved")
      .reduce((sum, item) => sum + Number(item.totalCost), 0);
  }, [budgetItems]);

  const budgetPercentage = useMemo(() => {
    if (totalBudgetSum === 0) return 0;
    return Math.round((approvedBudgetSum / totalBudgetSum) * 100);
  }, [approvedBudgetSum, totalBudgetSum]);

  // 4. Pending Approvals list
  const pendingApprovals = useMemo(() => {
    if (!approvals) return [];
    return approvals.filter((a) => a.status === "pending");
  }, [approvals]);

  // 5. Recent Context-aware Activity Feed
  const recentActivities = useMemo(() => {
    const list = [];
    
    if (sessions && sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => b.id - a.id).slice(0, 2);
      sorted.forEach((s) => {
        list.push({
          action: s.status === "planned" ? "Microplan drafted" : `Session marked ${s.status}`,
          facility: s.name,
          time: "Just now",
          status: s.approvalStatus || "draft",
        });
      });
    }
    
    if (budgetItems && budgetItems.length > 0) {
      const sorted = [...budgetItems].sort((a, b) => b.id - a.id).slice(0, 2);
      sorted.forEach((b) => {
        list.push({
          action: `Budget item: ${b.description}`,
          facility: `Allocated cost: $${Number(b.totalCost).toLocaleString()}`,
          time: "Recently updated",
          status: b.approvalStatus || "draft",
        });
      });
    }

    // Standard Fallbacks
    if (list.length < 4) {
      list.push(
        {
          action: "HTR assessment completed",
          facility: "Hilltop Aid Post",
          time: "2 hours ago",
          status: "pending",
        },
        {
          action: "Population data updated",
          facility: "Mountview Health Centre",
          time: "5 hours ago",
          status: "approved",
        }
      );
    }
    
    return list.slice(0, 4);
  }, [sessions, budgetItems]);

  const isLoading = 
    loadingFacilities || 
    loadingVillages || 
    loadingSessions || 
    loadingStats || 
    loadingBudget || 
    loadingApprovals ||
    loadingPopulation ||
    loadingDistricts ||
    loadingProvinces;

  const coverageBarColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/5 rounded-full filter blur-2xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse shrink-0" />
              {greeting}, {displayName}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Welcome back to VaxPlan GIS-Microplanning panel.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background/50 border backdrop-blur-md px-4 py-2 rounded-xl text-xs font-mono font-bold text-muted-foreground shadow-sm w-fit shrink-0">
            <Clock className="h-4 w-4 text-primary shrink-0 animate-spin animate-duration-10000" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Health Facilities"
              value={facilities?.length || 0}
              subtitle="Active facilities in system"
              icon={Building2}
              trend={{ value: 5, isPositive: true }}
              href="/facilities"
              testId="stats-health-facilities"
            />
            <StatsCard
              title="Annual Population"
              value={annualPopulationDisplay.value.toLocaleString()}
              subtitle={annualPopulationDisplay.label}
              icon={Users}
              href="/population"
              testId="stats-annual-population"
            />
            <StatsCard
              title="Planned Sessions"
              value={pendingSessions}
              subtitle="Sessions pending this quarter"
              icon={Calendar}
              href="/microplans/routine"
              testId="stats-planned-sessions"
            />
            <StatsCard
              title="Hard-to-Reach"
              value={htrVillages}
              subtitle="Villages requiring special attention"
              icon={AlertTriangle}
              href="/htr"
              testId="stats-hard-to-reach"
            />
            <StatsCard
              title="Pending Implementation"
              value={sessionsPendingImplementation.total}
              subtitle={
                sessionsPendingImplementation.overdue > 0
                  ? `${sessionsPendingImplementation.overdue} overdue — needs attention`
                  : "Sessions to conduct or report"
              }
              icon={Clock}
              href="/microplans/routine"
              testId="link-pending-implementation"
            />
            <StatsCard
              title="Stock Alerts"
              value={
                scopedStockAlerts.totals.lowStock +
                scopedStockAlerts.totals.outOfStock +
                scopedStockAlerts.totals.nearExpiry
              }
              subtitle={
                user?.facilityId
                  ? `${scopedStockAlerts.totals.lowStock + scopedStockAlerts.totals.outOfStock} low/out · ${scopedStockAlerts.totals.nearExpiry} expiring ≤60d`
                  : `${scopedStockAlerts.totals.facilitiesAtRisk} facilities at risk · ${scopedStockAlerts.totals.expiringSoon} batches ≤30d`
              }
              icon={Package}
              href="/stock"
              testId="link-stock-alerts"
            />
          </>
        )}
      </div>

      {/* Stock Alerts detail panel */}
      {(scopedStockAlerts.totals.lowStock +
        scopedStockAlerts.totals.outOfStock +
        scopedStockAlerts.totals.nearExpiry >
        0) && (
        <Card data-testid="card-stock-alerts">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                Vaccine Stock Alerts
              </CardTitle>
              <Link
                href="/stock"
                className="text-xs font-semibold text-primary hover:underline"
                data-testid="link-open-stock-ledger"
              >
                Open stock ledger →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Out of stock</p>
                <p className="text-2xl font-bold text-rose-600" data-testid="text-stock-out">
                  {scopedStockAlerts.totals.outOfStock}
                </p>
                <p className="text-[11px] text-muted-foreground">antigens at zero balance</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Low stock</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-stock-low">
                  {scopedStockAlerts.totals.lowStock}
                </p>
                <p className="text-[11px] text-muted-foreground">below configured months of stock</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Expiring ≤30d</p>
                <p className="text-2xl font-bold text-rose-600" data-testid="text-stock-expiring-30">
                  {scopedStockAlerts.totals.expiringSoon}
                </p>
                <p className="text-[11px] text-muted-foreground">batches with remaining doses</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Expiring ≤60d</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-stock-expiring-60">
                  {scopedStockAlerts.totals.nearExpiry}
                </p>
                <p className="text-[11px] text-muted-foreground">batches with remaining doses</p>
              </div>
            </div>
            {topAlertFacilities.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Facilities with the most active stock issues
                </p>
                {topAlertFacilities.map((f) => (
                  <div
                    key={f.facilityId}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                    data-testid={`row-stock-alert-${f.facilityId}`}
                  >
                    <span className="text-sm font-medium truncate text-foreground">
                      {f.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {f.outOfStockAntigens.length > 0 && (
                        <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-500/10 text-[10px]">
                          {f.outOfStockAntigens.length} out
                        </Badge>
                      )}
                      {f.lowStockAntigens.length > 0 && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10 text-[10px]">
                          {f.lowStockAntigens.length} low
                        </Badge>
                      )}
                      {f.expiringSoonBatches > 0 && (
                        <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-500/10 text-[10px]">
                          {f.expiringSoonBatches} ≤30d
                        </Badge>
                      )}
                      {f.nearExpiryBatches > f.expiringSoonBatches && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10 text-[10px]">
                          {f.nearExpiryBatches - f.expiringSoonBatches} ≤60d
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ImmunizationIndicatorCards />

      <SupervisionCoverageByDistrictCard />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Facility Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80">
              <MapView
                facilities={facilities || []}
                villages={villages || []}
                height="100%"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.facility}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge
                    variant={activity.status === "approved" ? "secondary" : "outline"}
                    className="text-xs flex-shrink-0 capitalize"
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="h-5 w-5 text-primary" />
              Vaccine Coverage
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(coverageFilters.quarter)}
                onValueChange={(v) =>
                  setCoverageFilters((p) => ({ ...p, quarter: parseInt(v, 10) }))
                }
              >
                <SelectTrigger className="h-8 w-[110px]" data-testid="select-coverage-quarter">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Q{q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(coverageFilters.year)}
                onValueChange={(v) =>
                  setCoverageFilters((p) => ({ ...p, year: parseInt(v, 10) }))
                }
              >
                <SelectTrigger className="h-8 w-[110px]" data-testid="select-coverage-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {facilityLocked ? (
                <Badge variant="outline" data-testid="badge-coverage-facility-locked">
                  {selectedFacilityName}
                </Badge>
              ) : (
                <Select
                  value={
                    coverageFilters.facilityId === null
                      ? "all"
                      : String(coverageFilters.facilityId)
                  }
                  onValueChange={(v) =>
                    setCoverageFilters((p) => ({
                      ...p,
                      facilityId: v === "all" ? null : parseInt(v, 10),
                    }))
                  }
                >
                  <SelectTrigger className="h-8 w-[200px]" data-testid="select-coverage-facility">
                    <SelectValue placeholder="Facility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All facilities</SelectItem>
                    {facilityOptions.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {coverage && (
                <Badge variant="secondary">
                  {coverage.totals.coveragePct}% overall
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {loadingCoverage ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !coverage || coverage.vaccines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border border-dashed rounded-xl bg-muted/20">
              <Syringe className="h-8 w-8 text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold text-foreground">No vaccine targets set</p>
              <p className="text-xs text-muted-foreground max-w-[320px]">
                Add vaccine requirements for this quarter to track coverage against target population.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coverage.vaccines.map((v) => (
                <div
                  key={v.vaccineName}
                  className="rounded-xl border bg-card p-3 space-y-2"
                  data-testid={`coverage-${v.vaccineName}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {v.vaccineName}
                    </span>
                    <span className="text-base font-mono font-bold text-foreground">
                      {v.coveragePct}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${coverageBarColor(v.coveragePct)}`}
                      style={{ width: `${Math.min(v.coveragePct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {v.administered.toLocaleString()} administered of{" "}
                    {v.targetPopulation.toLocaleString()} target
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Quarterly Microplanning Goals</CardTitle>
              <Badge variant="secondary">Q4 2026</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-3">
            {[
              { 
                label: "Sessions Completed", 
                current: completedSessionsCount, 
                target: totalSessionsCount, 
                percent: sessionsPercentage,
                description: `${completedSessionsCount} of ${totalSessionsCount} microplans conducted`
              },
              { 
                label: "Villages Catchment Coverage", 
                current: assignedVillagesCount, 
                target: totalVillagesCount, 
                percent: villagesPercentage,
                description: `${assignedVillagesCount} of ${totalVillagesCount} communities registered to facilities`
              },
              { 
                label: "Approved Budget Allocation", 
                current: approvedBudgetSum, 
                target: totalBudgetSum, 
                percent: budgetPercentage,
                description: `$${approvedBudgetSum.toLocaleString()} approved of $${totalBudgetSum.toLocaleString()} allocated`
              },
            ].map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{metric.label}</span>
                  <span className="text-muted-foreground font-mono font-bold">
                    {metric.percent}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${metric.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border border-dashed rounded-xl bg-muted/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold text-foreground">All Tasks Fully Approved</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">There are no pending microplans or budget items awaiting review.</p>
                </div>
              ) : (
                pendingApprovals.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border hover:bg-muted/65 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {item.entityType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-primary" />
                        Submitted {new Date(item.submittedAt || "").toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs font-semibold px-2 py-0.5">
                      {item.currentLevel} Level
                    </Badge>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full text-xs font-bold gap-1 mt-2 rounded-xl"
                asChild
                data-testid="button-view-approvals"
              >
                <Link href="/approvals">
                  View All Approvals
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
