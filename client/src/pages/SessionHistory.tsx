import { Fragment, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronDown, ChevronRight, Download, History as HistoryIcon, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VaccineConfig } from "@shared/schema";
import { expandVaccineSchedule } from "@shared/vaccineSchedule";
import { offlineDb } from "@/lib/offlineDb";

type VaccinatedCounts = {
  totals?: number | null;
  perAntigen?: Record<string, number> | null;
  /**
   * Task #106 — codes the mark-done endpoint could not match against the
   * tenant's vaccine schedule. Present (non-empty) means the session was
   * saved with unrecognised vaccines and needs a sync / app refresh.
   */
  perAntigenUnmapped?: Record<string, number> | null;
  actualDate?: string | null;
  note?: string | null;
};

function unmappedAntigenEntries(
  vc: VaccinatedCounts | null | undefined,
): Array<[string, number]> {
  const pa = vc?.perAntigenUnmapped;
  if (!pa || typeof pa !== "object") return [];
  return Object.entries(pa)
    .map(([code, n]) => [code, Number(n) || 0] as [string, number])
    .filter(([, n]) => n > 0);
}

type HistoryRow = {
  id: number;
  name: string;
  status: string;
  sessionType: string;
  planType?: string;
  facilityId?: number;
  scheduledDate?: string | null;
  completedAt?: string | null;
  targetPopulation?: number | null;
  vaccinatedCounts?: VaccinatedCounts | null;
};

function perAntigenEntries(vc: VaccinatedCounts | null | undefined): Array<[string, number]> {
  const pa = vc?.perAntigen;
  if (!pa || typeof pa !== "object") return [];
  return Object.entries(pa)
    .map(([code, n]) => [code, Number(n) || 0] as [string, number])
    .filter(([, n]) => n > 0);
}

function vaccinatedTotal(vc: VaccinatedCounts | null | undefined): number {
  if (!vc) return 0;
  const sum = perAntigenEntries(vc).reduce((s, [, n]) => s + n, 0);
  // Prefer recomputed sum so totals always reconcile with the per-antigen
  // breakdown. Fall back to the stored totals only when perAntigen is empty.
  if (sum > 0) return sum;
  const stored = Number(vc.totals);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

function toCsv(rows: HistoryRow[], codeToLabel: (code: string) => string) {
  const headers = [
    "id",
    "name",
    "status",
    "planType",
    "sessionType",
    "scheduledDate",
    "completedAt",
    "targetPopulation",
    "vaccinatedTotal",
    "perAntigen",
  ];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    const breakdown = perAntigenEntries(r.vaccinatedCounts)
      .map(([code, n]) => `${codeToLabel(code)}: ${n}`)
      .join("; ");
    lines.push([
      r.id,
      r.name,
      r.status,
      r.planType ?? "",
      r.sessionType,
      r.scheduledDate ?? "",
      r.completedAt ?? "",
      r.targetPopulation ?? "",
      vaccinatedTotal(r.vaccinatedCounts),
      breakdown,
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

export default function SessionHistory() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: rows = [], isLoading } = useQuery<HistoryRow[]>({
    queryKey: ["/api/sessions/history"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/sessions/history");
      if (!res.ok) throw new Error("Failed to load session history");
      return res.json();
    },
  });

  // Tenant antigen schedule — used to translate stable codes captured at
  // mark-done time (e.g. PENTA-1) back into friendly labels.
  const { data: vaccineConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.vaccineConfigs.toArray()) as unknown as VaccineConfig[];
      }
      const res = await fetch("/api/vaccines/config");
      if (!res.ok) throw new Error("Failed to load vaccine configs");
      return res.json();
    },
  });

  const codeToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of expandVaccineSchedule(vaccineConfigs)) {
      map.set(stage.code, stage.label);
    }
    return (code: string) => map.get(code) ?? code;
  }, [vaccineConfigs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.status, r.sessionType, r.planType].some((v) => (v ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const handleExport = () => {
    const csv = toCsv(filtered, codeToLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Session History</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-testid="input-history-search"
              placeholder="Search by name, type, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button data-testid="button-export-history" variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Completed & cancelled sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No archived sessions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Scheduled</th>
                    <th className="text-left p-2">Completed</th>
                    <th className="text-right p-2">Target</th>
                    <th className="text-right p-2">Vaccinated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const entries = perAntigenEntries(r.vaccinatedCounts);
                    const unmappedEntries = unmappedAntigenEntries(r.vaccinatedCounts);
                    const hasUnmapped = unmappedEntries.length > 0;
                    const total = vaccinatedTotal(r.vaccinatedCounts);
                    const isOpen = !!expanded[r.id];
                    const canExpand = entries.length > 0 || hasUnmapped;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className={
                            "border-b last:border-0 hover:bg-muted/30" +
                            (hasUnmapped ? " bg-amber-50/40 dark:bg-amber-900/10" : "")
                          }
                          data-testid={`row-history-${r.id}`}
                        >
                          <td className="p-2 align-top">
                            {canExpand ? (
                              <button
                                type="button"
                                data-testid={`button-toggle-history-${r.id}`}
                                onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={isOpen ? "Hide breakdown" : "Show breakdown"}
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="p-2 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {hasUnmapped && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      data-testid={`badge-unmapped-${r.id}`}
                                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Unrecognised vaccines
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    Saved with codes outside your vaccine schedule:{" "}
                                    {unmappedEntries.map(([c]) => c).join(", ")}. Sync or
                                    refresh the app so future sessions record them correctly.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                          <td className="p-2 capitalize">{r.planType ?? "—"} / {r.sessionType}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                r.status === "completed" || r.status === "archived"
                                  ? "default"
                                  : "destructive"
                              }
                              className="capitalize"
                            >
                              {String(r.status).replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="p-2">{r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : "—"}</td>
                          <td className="p-2">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}</td>
                          <td className="p-2 text-right">{r.targetPopulation?.toLocaleString() ?? "—"}</td>
                          <td className="p-2 text-right font-semibold">{total.toLocaleString()}</td>
                        </tr>
                        {isOpen && canExpand && (
                          <tr
                            className="border-b last:border-0 bg-muted/20"
                            data-testid={`row-history-breakdown-${r.id}`}
                          >
                            <td></td>
                            <td colSpan={7} className="p-3">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Vaccinated by antigen
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {entries.map(([code, n]) => (
                                  <div
                                    key={code}
                                    data-testid={`chip-antigen-${r.id}-${code.toLowerCase()}`}
                                    className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1"
                                  >
                                    <span className="text-xs font-medium">{codeToLabel(code)}</span>
                                    <span className="text-xs font-semibold tabular-nums">
                                      {n.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {hasUnmapped && (
                                <div className="mt-3" data-testid={`block-unmapped-${r.id}`}>
                                  <div className="text-xs font-semibold uppercase tracking-wider mb-1 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Unrecognised vaccines (saved as unmapped)
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {unmappedEntries.map(([code, n]) => (
                                      <div
                                        key={code}
                                        data-testid={`chip-unmapped-${r.id}-${code.toLowerCase()}`}
                                        className="inline-flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-50 px-2 py-1 dark:bg-amber-900/20"
                                      >
                                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{code}</span>
                                        <span className="text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                                          {n.toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    These codes aren't in your current vaccine schedule. Sync or
                                    refresh the app so future sessions record them under a known code.
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-muted-foreground">
                                Sum of per-antigen counts: <span className="font-semibold">{total.toLocaleString()}</span>
                                {r.vaccinatedCounts?.totals != null &&
                                  Number(r.vaccinatedCounts.totals) !== total && (
                                    <span className="ml-2 text-amber-600">
                                      (recorded total {Number(r.vaccinatedCounts.totals).toLocaleString()} differs)
                                    </span>
                                  )}
                                {r.vaccinatedCounts?.note ? (
                                  <span className="ml-2">· Note: {r.vaccinatedCounts.note}</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
