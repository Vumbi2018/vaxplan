import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, Calendar, Plus, CheckCircle2, AlertCircle, XCircle, MinusCircle,
  Building2, User, FileText, ListChecks, Trash2, Pencil, Activity, Mail, NotebookPen,
  Settings2, MapPin, Camera, Star, Loader2, Crosshair, MapPinned,
} from "lucide-react";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { useAuth } from "@/hooks/useAuth";
import {
  templateToAnswers,
  computeChecklistScore,
  isAnswerVisible,
  makeRepeatAnswer,
  type ChecklistAnswer,
  type ChecklistTemplate,
  type ChecklistQuestionType,
} from "@shared/supervisionChecklist";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250] as const;

function ListPager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  testIdPrefix,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  testIdPrefix: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-20" data-testid={`${testIdPrefix}-page-size`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <span data-testid={`${testIdPrefix}-range`}>
          {total === 0 ? "0 of 0" : `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          data-testid={`${testIdPrefix}-prev`}
        >
          Previous
        </Button>
        <span className="px-2" data-testid={`${testIdPrefix}-page-indicator`}>
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          data-testid={`${testIdPrefix}-next`}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

type SupervisionVisit = {
  id: number;
  tenantId: string;
  facilityId: number;
  microplanId: number | null;
  sessionPlanId: number | null;
  scheduledDate: string;
  conductedDate: string | null;
  supervisorUserId: string | null;
  supervisorName: string | null;
  visitType: string;
  status: string;
  checklist: ChecklistItem[];
  score: number | null;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  findings: string | null;
  followUpActions: string | null;
  nextVisitDate: string | null;
  createdAt: string;
};

// Captured-answer shape, shared with the server and the configurable templates.
type ChecklistItem = ChecklistAnswer;

// WHO RED supportive supervision checklist (seeded; used when no configurable
// template is chosen). Tenants can also build their own checklists — see the
// "Manage checklists" builder (national admins) at /supervision/templates.
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "cold_chain_temp", label: "Cold chain log shows in-range temps for last 7 days", response: "" },
  { key: "vaccines_in_stock", label: "All antigens in stock with ≥1 month buffer", response: "" },
  { key: "expiry_check", label: "No expired or VVM-3/4 vials in fridge", response: "" },
  { key: "ad_syringes", label: "AD syringes and safety boxes adequate for sessions", response: "" },
  { key: "microplan_visible", label: "Microplan / session calendar posted at facility", response: "" },
  { key: "register_updated", label: "Vaccination register updated, no >5% missing entries", response: "" },
  { key: "defaulter_tracking", label: "Defaulter list reviewed and action taken this month", response: "" },
  { key: "outreach_held", label: "Planned outreach sessions held (≥80% of plan)", response: "" },
  { key: "aefi_kit", label: "AEFI kit complete and staff know reporting flow", response: "" },
  { key: "waste_disposal", label: "Sharps and biohazard waste disposed per protocol", response: "" },
  { key: "staff_trained", label: "All vaccinators trained on current schedule", response: "" },
  { key: "community_engagement", label: "Recent community sensitisation activity logged", response: "" },
];

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  conducted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  missed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

// Server appends "[Auto-cancelled] <reason>" to findings when a visit is
// auto-cancelled because its parent microplan was un-approved or deleted.
// See cancelSeededSupervisionVisitsForMicroplan in server/routes.ts.
const AUTO_CANCEL_MARKER = "[Auto-cancelled]";
function parseAutoCancel(findings: string | null | undefined): { reason: string; rest: string } | null {
  if (!findings) return null;
  const idx = findings.indexOf(AUTO_CANCEL_MARKER);
  if (idx === -1) return null;
  const after = findings.slice(idx + AUTO_CANCEL_MARKER.length).trim();
  const reason = after.split(/\n\n+/)[0].trim();
  const before = findings.slice(0, idx).trim();
  return { reason: reason || "Parent microplan was removed.", rest: before };
}

function computeScore(checklist: ChecklistItem[]): number {
  return computeChecklistScore(checklist);
}

export default function Supervision() {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = (user as any)?.role === "national_admin";
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlProvinceId = useMemo(() => {
    const p = new URLSearchParams(searchString);
    const raw = p.get("provinceId");
    return raw ? Number(raw) : null;
  }, [searchString]);
  const urlDistrictId = useMemo(() => {
    const p = new URLSearchParams(searchString);
    const raw = p.get("districtId");
    return raw ? Number(raw) : null;
  }, [searchString]);
  const urlFacilityId = useMemo(() => {
    const p = new URLSearchParams(searchString);
    const raw = p.get("facilityId");
    return raw ? Number(raw) : null;
  }, [searchString]);
  const [provinceFilter, setProvinceFilter] = useState<number | null>(urlProvinceId);
  const [districtFilter, setDistrictFilter] = useState<number | null>(urlDistrictId);
  const [facilityFilter, setFacilityFilter] = useState<number | null>(urlFacilityId);
  useEffect(() => { setProvinceFilter(urlProvinceId); }, [urlProvinceId]);
  useEffect(() => { setDistrictFilter(urlDistrictId); }, [urlDistrictId]);
  useEffect(() => { setFacilityFilter(urlFacilityId); }, [urlFacilityId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (provinceFilter !== null) params.set("provinceId", String(provinceFilter));
    if (districtFilter !== null) params.set("districtId", String(districtFilter));
    if (facilityFilter !== null) params.set("facilityId", String(facilityFilter));
    const qs = params.toString();
    const next = qs ? `/supervision?${qs}` : `/supervision`;
    const current = `/supervision${searchString ? `?${searchString.replace(/^\?/, "")}` : ""}`;
    if (next !== current) setLocation(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceFilter, districtFilter, facilityFilter]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [presetFacilityId, setPresetFacilityId] = useState<number | null>(null);
  const [conductingVisit, setConductingVisit] = useState<SupervisionVisit | null>(null);
  const [statusSort, setStatusSort] = useState<"status" | "lastVisit" | "name">("status");
  const [statusBadgeFilter, setStatusBadgeFilter] = useState<"all" | "overdue" | "due_soon" | "current">("all");
  const [fsPage, setFsPage] = useState(1);
  const [fsPageSize, setFsPageSize] = useState<number>(10);
  useEffect(() => { setFsPage(1); }, [statusBadgeFilter, statusSort, provinceFilter, districtFilter, facilityFilter]);
  const [hideAutoCancelled, setHideAutoCancelled] = useState<boolean>(true);

  const { data: visits = [], isLoading } = useQuery<SupervisionVisit[]>({
    queryKey: ["/api/supervision-visits", { facilityId: facilityFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (facilityFilter !== null) params.set("facilityId", String(facilityFilter));
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/supervision-visits${params.toString() ? "?" + params.toString() : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load visits");
      return r.json();
    },
  });

  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"] });
  const { data: districts = [] } = useQuery<any[]>({ queryKey: ["/api/districts"] });
  const { data: allVisits = [] } = useQuery<SupervisionVisit[]>({
    queryKey: ["/api/supervision-visits", "all"],
    queryFn: async () => {
      const r = await fetch(`/api/supervision-visits`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load visits");
      return r.json();
    },
  });
  const { data: microplans = [] } = useQuery<any[]>({ queryKey: ["/api/microplans"] });
  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({ queryKey: ["/api/supervision-checklist-templates"] });
  const activeTemplates = useMemo(() => templates.filter((t) => t.isActive), [templates]);

  const facById = useMemo(() => {
    const m = new Map<number, any>();
    facilities.forEach((f) => m.set(f.id, f));
    return m;
  }, [facilities]);

  const facilityStatus = useMemo(() => {
    type Row = {
      facility: any;
      lastConducted: SupervisionVisit | null;
      lastScheduled: SupervisionVisit | null;
      daysSinceLast: number | null;
      lastScore: number | null;
      status: "overdue" | "due_soon" | "current" | "never";
    };
    const now = Date.now();
    const districtById = new Map<number, any>();
    districts.forEach((d: any) => districtById.set(Number(d.id), d));
    const scoped = facilities.filter((f: any) => {
      if (facilityFilter !== null && Number(f.id) !== facilityFilter) return false;
      if (districtFilter !== null && Number(f.districtId) !== districtFilter) return false;
      if (provinceFilter !== null) {
        const d = districtById.get(Number(f.districtId));
        if (!d || Number(d.provinceId) !== provinceFilter) return false;
      }
      return true;
    });
    const rows: Row[] = scoped.map((f: any) => {
      const visitsForFac = allVisits.filter((v) => v.facilityId === f.id);
      const conducted = visitsForFac
        .filter((v) => v.status === "conducted" && (v.conductedDate || v.scheduledDate))
        .sort((a, b) => +new Date(b.conductedDate || b.scheduledDate) - +new Date(a.conductedDate || a.scheduledDate));
      const lastConducted = conducted[0] || null;
      const lastScheduled = visitsForFac
        .filter((v) => v.status === "scheduled")
        .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate))[0] || null;
      const lastDate = lastConducted ? new Date(lastConducted.conductedDate || lastConducted.scheduledDate) : null;
      const daysSinceLast = lastDate ? Math.floor((now - +lastDate) / 86_400_000) : null;
      const lastScore = lastConducted && typeof lastConducted.score === "number" ? lastConducted.score : null;
      let status: Row["status"];
      if (!lastConducted) status = "overdue";
      else if ((daysSinceLast ?? 0) > 90 || (lastScore !== null && lastScore < 60)) status = "overdue";
      else if ((daysSinceLast ?? 0) > 60) status = "due_soon";
      else status = "current";
      return { facility: f, lastConducted, lastScheduled, daysSinceLast, lastScore, status };
    });
    return rows;
  }, [facilities, districts, allVisits, provinceFilter, districtFilter, facilityFilter]);

  const filteredFacilityStatus = useMemo(() => {
    let rows = facilityStatus;
    if (statusBadgeFilter !== "all") {
      rows = rows.filter((r) => r.status === statusBadgeFilter || (statusBadgeFilter === "overdue" && r.status === "overdue"));
    }
    const statusOrder: Record<string, number> = { overdue: 0, due_soon: 1, current: 2, never: 0 };
    rows = [...rows].sort((a, b) => {
      if (statusSort === "name") return (a.facility.name || "").localeCompare(b.facility.name || "");
      if (statusSort === "lastVisit") {
        const da = a.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
        const db = b.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
        return db - da;
      }
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      const da = a.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
      const db = b.daysSinceLast ?? Number.MAX_SAFE_INTEGER;
      return db - da;
    });
    return rows;
  }, [facilityStatus, statusBadgeFilter, statusSort]);

  const statusCounts = useMemo(() => {
    const c = { overdue: 0, due_soon: 0, current: 0 };
    facilityStatus.forEach((r) => {
      if (r.status === "overdue" || r.status === "never") c.overdue++;
      else if (r.status === "due_soon") c.due_soon++;
      else c.current++;
    });
    return c;
  }, [facilityStatus]);

  const openScheduleFor = (facilityId: number | null) => {
    setPresetFacilityId(facilityId);
    setScheduleOpen(true);
  };

  const counts = useMemo(() => {
    const c = { scheduled: 0, conducted: 0, missed: 0, cancelled: 0, total: visits.length, avgScore: 0 };
    let scoreSum = 0, scoreN = 0;
    visits.forEach((v) => {
      (c as any)[v.status] = ((c as any)[v.status] || 0) + 1;
      if (typeof v.score === "number") { scoreSum += v.score; scoreN++; }
    });
    c.avgScore = scoreN ? Math.round(scoreSum / scoreN) : 0;
    return c;
  }, [visits]);

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiRequest("POST", "/api/supervision-visits", data);
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      toast({ title: "Visit scheduled", description: "Supervisory visit added to the calendar." });
      setScheduleOpen(false);
    },
    onError: (e: any) => toast({ title: "Could not schedule", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiRequest("PATCH", `/api/supervision-visits/${id}`, data);
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      toast({ title: "Visit updated" });
      setConductingVisit(null);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("DELETE", `/api/supervision-visits/${id}`);
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      toast({ title: "Visit removed" });
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-indigo-500" />
            Supportive Supervision
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            WHO RED step 10 — schedule and document supervisory visits at every facility, every quarter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DigestPrefsPopover />
          {admin && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/supervision/templates")}
              data-testid="btn-manage-checklists"
            >
              <Settings2 className="h-4 w-4" /> Manage Checklists
            </Button>
          )}
          <Dialog open={scheduleOpen} onOpenChange={(o) => { setScheduleOpen(o); if (!o) setPresetFacilityId(null); }}>
            <DialogTrigger asChild>
              <Button data-testid="btn-schedule-visit" className="gap-2" onClick={() => setPresetFacilityId(null)}>
                <Plus className="h-4 w-4" /> Schedule Visit
              </Button>
            </DialogTrigger>
            <ScheduleDialog
              key={presetFacilityId ?? "new"}
              facilities={facilities}
              microplans={microplans}
              templates={activeTemplates}
              initialFacilityId={presetFacilityId}
              onSubmit={(d) => scheduleMutation.mutate(d)}
              isSubmitting={scheduleMutation.isPending}
            />
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total visits" value={counts.total} icon={Calendar} tone="indigo" />
        <StatCard label="Scheduled" value={counts.scheduled} icon={Calendar} tone="sky" />
        <StatCard label="Conducted" value={counts.conducted} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Missed / cancelled" value={counts.missed + counts.cancelled} icon={AlertCircle} tone="rose" />
        <StatCard label="Avg checklist score" value={`${counts.avgScore}%`} icon={ListChecks} tone="amber" />
      </div>

      <QuarterlyReviewCoverage />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" />
                Facility supervision status
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Overdue = no visit in the last 90 days, or last score &lt; 60%. Due soon = last visit 61–90 days ago. Click a row to schedule the next visit.
              </p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> {statusCounts.overdue} overdue</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {statusCounts.due_soon} due soon</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {statusCounts.current} current</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusBadgeFilter} onValueChange={(v) => setStatusBadgeFilter(v as any)}>
                <SelectTrigger className="w-40" data-testid="filter-supervision-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="overdue">Overdue only</SelectItem>
                  <SelectItem value="due_soon">Due soon</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusSort} onValueChange={(v) => setStatusSort(v as any)}>
                <SelectTrigger className="w-44" data-testid="sort-supervision"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Sort: Status</SelectItem>
                  <SelectItem value="lastVisit">Sort: Days since visit</SelectItem>
                  <SelectItem value="name">Sort: Facility name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <GeoCascadeFilter
              provinceId={provinceFilter}
              districtId={districtFilter}
              facilityId={facilityFilter}
              showFacility
              onProvinceChange={(id) => {
                setProvinceFilter(id);
                setDistrictFilter(null);
                setFacilityFilter(null);
              }}
              onDistrictChange={(id) => {
                setDistrictFilter(id);
                setFacilityFilter(null);
              }}
              onFacilityChange={(id) => {
                setFacilityFilter(id);
              }}
              testIdPrefix="supervision-status"
            />
          </div>
        </CardHeader>
        <CardContent>
          {facilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No facilities in this tenant yet.</div>
          ) : provinceFilter === null && districtFilter === null && facilityFilter === null ? (
            <div className="text-center py-8 px-4 text-sm text-muted-foreground border rounded-md bg-muted/30">
              <div className="font-medium text-foreground mb-1">
                {facilities.length.toLocaleString()} facilities in this tenant
              </div>
              <div>
                Use the Province → District → Facility filters above to narrow the list.
                Showing every facility at once would be overwhelming on most networks.
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y border rounded-md">
                {filteredFacilityStatus
                  .slice((Math.min(fsPage, Math.max(1, Math.ceil(filteredFacilityStatus.length / fsPageSize))) - 1) * fsPageSize, Math.min(fsPage, Math.max(1, Math.ceil(filteredFacilityStatus.length / fsPageSize))) * fsPageSize)
                  .map((row) => {
                    const tone =
                      row.status === "overdue"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40"
                        : row.status === "due_soon"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
                    const label =
                      row.status === "overdue" ? "Overdue" : row.status === "due_soon" ? "Due soon" : "Current";
                    return (
                      <button
                        key={row.facility.id}
                        type="button"
                        onClick={() => openScheduleFor(row.facility.id)}
                        className="w-full text-left px-3 py-2.5 hover-elevate flex items-center gap-3 flex-wrap"
                        data-testid={`supervision-row-${row.facility.id}`}
                      >
                        <Badge variant="outline" className={`${tone} min-w-[5.5rem] justify-center`}>{label}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {row.facility.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                            {row.lastConducted ? (
                              <>
                                <span>Last visit: {new Date(row.lastConducted.conductedDate || row.lastConducted.scheduledDate).toLocaleDateString()}</span>
                                <span>{row.daysSinceLast} days ago</span>
                                {row.lastScore !== null && <span>Score {row.lastScore}%</span>}
                              </>
                            ) : (
                              <span>No visit recorded yet</span>
                            )}
                            {row.lastScheduled && (
                              <span className="text-sky-700 dark:text-sky-300">Next scheduled: {new Date(row.lastScheduled.scheduledDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Schedule →</span>
                      </button>
                    );
                  })}
                {filteredFacilityStatus.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No facilities match this filter.</div>
                )}
              </div>
              {filteredFacilityStatus.length > 0 && (
                <ListPager
                  page={fsPage}
                  pageSize={fsPageSize}
                  total={filteredFacilityStatus.length}
                  onPageChange={setFsPage}
                  onPageSizeChange={setFsPageSize}
                  testIdPrefix="supervision-status"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <CardTitle className="text-lg">Visit calendar</CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                type="button"
                onClick={() => setHideAutoCancelled((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  hideAutoCancelled
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
                data-testid="toggle-hide-auto-cancelled"
                title="Hide visits that were auto-cancelled because their parent microplan was removed"
              >
                <XCircle className="h-3 w-3" />
                {hideAutoCancelled ? "Hiding auto-cancelled" : "Showing auto-cancelled"}
              </button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="filter-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="conducted">Conducted</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <GeoCascadeFilter
              provinceId={provinceFilter}
              districtId={districtFilter}
              facilityId={facilityFilter}
              showFacility
              onProvinceChange={(id) => {
                setProvinceFilter(id);
                setDistrictFilter(null);
                setFacilityFilter(null);
              }}
              onDistrictChange={(id) => {
                setDistrictFilter(id);
                setFacilityFilter(null);
              }}
              onFacilityChange={(id) => {
                setFacilityFilter(id);
              }}
              testIdPrefix="supervision-visits"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (() => {
            const visibleVisits = hideAutoCancelled
              ? visits.filter((v) => !(v.status === "cancelled" && parseAutoCancel(v.findings)))
              : visits;
            const hiddenCount = visits.length - visibleVisits.length;
            if (visits.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No supervisory visits yet.</p>
                  <p className="text-sm">Schedule the first one to start your supervision plan.</p>
                </div>
              );
            }
            return (
              <>
                {hiddenCount > 0 && (
                  <div className="mb-3 text-xs text-muted-foreground" data-testid="auto-cancelled-hidden-count">
                    {hiddenCount} auto-cancelled visit{hiddenCount === 1 ? "" : "s"} hidden.{" "}
                    <button
                      type="button"
                      className="underline hover:text-foreground"
                      onClick={() => setHideAutoCancelled(false)}
                      data-testid="link-show-auto-cancelled"
                    >
                      Show them
                    </button>
                  </div>
                )}
                {visibleVisits.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    All visits matching the current filters were auto-cancelled.
                  </div>
                ) : (
                  <div className="divide-y">
                    {visibleVisits.map((v) => {
                      const fac = facById.get(v.facilityId);
                      const autoCancel = v.status === "cancelled" ? parseAutoCancel(v.findings) : null;
                      const findingsForPreview = autoCancel ? autoCancel.rest : v.findings || "";
                      return (
                        <div key={v.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3" data-testid={`visit-${v.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={STATUS_STYLES[v.status] || ""}>{v.status}</Badge>
                              <Badge variant="secondary" className="capitalize">{v.visitType}</Badge>
                              {autoCancel && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  data-testid={`badge-auto-cancelled-${v.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Auto-cancelled
                                </Badge>
                              )}
                              {typeof v.score === "number" && (
                                <Badge variant="outline" className={v.score >= 80 ? STATUS_STYLES.conducted : v.score >= 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : STATUS_STYLES.missed}>
                                  Score {v.score}%
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm font-medium flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {fac?.name || `Facility #${v.facilityId}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(v.scheduledDate).toLocaleDateString()}</span>
                              {v.supervisorName && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {v.supervisorName}</span>}
                              {findingsForPreview && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <FileText className="h-3 w-3" /> {findingsForPreview.slice(0, 60)}{findingsForPreview.length > 60 ? "…" : ""}
                                </span>
                              )}
                            </div>
                            {autoCancel && (
                              <div
                                className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200"
                                data-testid={`callout-auto-cancelled-${v.id}`}
                              >
                                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span><span className="font-medium">Cancelled automatically:</span> {autoCancel.reason}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 self-start md:self-center">
                            <Button size="sm" variant="outline" onClick={() => setConductingVisit(v)} data-testid={`btn-conduct-${v.id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              {v.status === "conducted" ? "View / edit" : "Conduct"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this visit?")) deleteMutation.mutate(v.id); }} data-testid={`btn-delete-${v.id}`}>
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {conductingVisit && (
        <ConductDialog
          visit={conductingVisit}
          facility={facById.get(conductingVisit.facilityId)}
          onClose={() => setConductingVisit(null)}
          onSave={(data) => updateMutation.mutate({ id: conductingVisit.id, data })}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: string }) {
  const toneMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DigestPrefsPopover() {
  const { toast } = useToast();
  const { data: prefs } = useQuery<{ supervisionDigest: boolean }>({
    queryKey: ["/api/me/notification-prefs"],
    queryFn: async () => {
      const r = await fetch("/api/me/notification-prefs", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load preferences");
      return r.json();
    },
  });
  const enabled = prefs?.supervisionDigest !== false;
  const updateMutation = useMutation({
    mutationFn: async (supervisionDigest: boolean) => {
      const r = await apiRequest<{ supervisionDigest: boolean }>("PATCH", "/api/me/notification-prefs", { supervisionDigest });
      return r;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/me/notification-prefs"], data);
      toast({
        title: data.supervisionDigest ? "Digest enabled" : "Digest disabled",
        description: data.supervisionDigest
          ? "You'll get the weekly overdue list every Monday."
          : "You won't receive the weekly supervision digest.",
      });
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="btn-digest-prefs">
          <Mail className="h-4 w-4" />
          Weekly digest
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Weekly overdue digest</div>
            <p className="text-xs text-muted-foreground mt-1">
              Every Monday morning, get an email listing facilities in your scope that are overdue
              for a supervisory visit (no visit in 90 days, or last score below 60%).
            </p>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Label htmlFor="digest-toggle" className="text-sm">Email me each Monday</Label>
            <Switch
              id="digest-toggle"
              data-testid="switch-digest"
              checked={enabled}
              disabled={updateMutation.isPending}
              onCheckedChange={(checked) => updateMutation.mutate(checked)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ScheduleDialog({ facilities, microplans, templates, onSubmit, isSubmitting, initialFacilityId }: { facilities: any[]; microplans: any[]; templates: ChecklistTemplate[]; onSubmit: (d: any) => void; isSubmitting: boolean; initialFacilityId?: number | null }) {
  const [facilityId, setFacilityId] = useState<string>(initialFacilityId ? String(initialFacilityId) : "");
  const [microplanId, setMicroplanId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [visitType, setVisitType] = useState<string>("routine");
  const [templateId, setTemplateId] = useState<string>("__default__");

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Schedule supervisory visit</DialogTitle>
        <DialogDescription>Pick the facility, date, and supervisor. You can record the checklist when the visit is conducted.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label>Facility *</Label>
          <FacilityCascadePicker
            value={facilityId ? Number(facilityId) : null}
            onChange={(id) => setFacilityId(id ? String(id) : "")}
            required
            showLabels={false}
            testIdPrefix="schedule-facility"
          />
        </div>
        <div>
          <Label>Microplan (optional)</Label>
          <Select value={microplanId || "__none__"} onValueChange={(v) => setMicroplanId(v === "__none__" ? "" : v)}>
            <SelectTrigger data-testid="schedule-microplan"><SelectValue placeholder="Link to a microplan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {microplans.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name || `Microplan #${m.id}`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Scheduled date *</Label>
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} data-testid="schedule-date" />
        </div>
        <div>
          <Label>Visit type</Label>
          <Select value={visitType} onValueChange={setVisitType}>
            <SelectTrigger data-testid="schedule-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine quarterly</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="adhoc">Ad-hoc</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supervisor name</Label>
          <Input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="e.g. District Health Officer" data-testid="schedule-supervisor" />
        </div>
        <div>
          <Label>Checklist</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger data-testid="schedule-template"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Default WHO checklist</SelectItem>
              {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {templateId === "__default__"
              ? "The built-in WHO supportive-supervision checklist will be used."
              : "This custom checklist will be filled in when the visit is conducted."}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!facilityId || !scheduledDate || isSubmitting}
          onClick={() => {
            const chosen = templateId !== "__default__"
              ? templates.find((t) => String(t.id) === templateId)
              : undefined;
            const checklist = chosen ? templateToAnswers(chosen.items) : DEFAULT_CHECKLIST;
            onSubmit({
              facilityId: parseInt(facilityId),
              microplanId: microplanId ? parseInt(microplanId) : null,
              scheduledDate,
              supervisorName: supervisorName || null,
              visitType,
              status: "scheduled",
              checklist,
              templateId: chosen ? chosen.id : null,
            });
          }}
          data-testid="btn-submit-schedule"
        >
          {isSubmitting ? "Scheduling…" : "Schedule visit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ChecklistQuestion({
  item,
  displayNumber,
  instanceLabel,
  onRemove,
  setResp,
  setNote,
  setValue,
}: {
  item: ChecklistItem;
  displayNumber?: number;
  instanceLabel?: string;
  onRemove?: () => void;
  setResp: (key: string, r: ChecklistItem["response"]) => void;
  setNote: (key: string, n: string) => void;
  setValue: (key: string, v: unknown) => void;
}) {
  const { toast } = useToast();
  const [capturing, setCapturing] = useState(false);
  const type: ChecklistQuestionType = item.type || "yes_no";
  const key = item.key;

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not available", description: "This device can't report its location.", variant: "destructive" });
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue(key, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setCapturing(false);
      },
      (err) => {
        setCapturing(false);
        toast({ title: "Couldn't get location", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const onImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use a photo under 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue(key, { dataUrl: reader.result as string, name: file.name });
    reader.readAsDataURL(file);
  };

  const gps = (item.value as any) || null;
  const img = (item.value as any) || null;
  const multi: string[] = Array.isArray(item.value) ? (item.value as string[]) : [];

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${item.parentId ? "ml-4 border-l-2 border-l-indigo-400/60 bg-muted/30" : ""}`} data-testid={`check-${item.key}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="text-sm font-medium flex-1 min-w-[200px]">
          {instanceLabel ? <span className="text-muted-foreground">{instanceLabel}: </span> : displayNumber != null ? `${displayNumber}. ` : ""}
          {item.label}
          {item.required && <span className="text-rose-500 ml-1">*</span>}
          {item.helpText && <p className="text-xs text-muted-foreground font-normal mt-0.5">{item.helpText}</p>}
        </div>

        <div className="flex items-center gap-1">
          {(type === "yes_no" || type === "true_false") && (
            <div className="flex gap-1">
              <RespBtn active={item.response === "yes"} onClick={() => setResp(key, "yes")} icon={CheckCircle2} label={type === "true_false" ? "True" : "Yes"} tone="emerald" testId={`${item.key}-yes`} />
              <RespBtn active={item.response === "no"} onClick={() => setResp(key, "no")} icon={XCircle} label={type === "true_false" ? "False" : "No"} tone="rose" testId={`${item.key}-no`} />
              <RespBtn active={item.response === "na"} onClick={() => setResp(key, "na")} icon={MinusCircle} label="N/A" tone="muted" testId={`${item.key}-na`} />
            </div>
          )}
          {onRemove && (
            <Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={onRemove} data-testid={`${item.key}-remove`} title="Remove this entry">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {type === "text" && (
        <Textarea
          rows={2}
          placeholder="Type the answer"
          value={(item.value as string) || ""}
          onChange={(e) => setValue(key, e.target.value)}
          data-testid={`${item.key}-text`}
        />
      )}

      {type === "number" && (
        <Input
          type="number"
          placeholder="Enter a number"
          value={item.value === undefined || item.value === null ? "" : String(item.value)}
          onChange={(e) => setValue(key, e.target.value === "" ? null : Number(e.target.value))}
          data-testid={`${item.key}-number`}
        />
      )}

      {type === "date" && (
        <Input
          type="date"
          value={(item.value as string) || ""}
          onChange={(e) => setValue(key, e.target.value)}
          data-testid={`${item.key}-date`}
        />
      )}

      {type === "rating" && (
        <div className="flex gap-1" data-testid={`${item.key}-rating`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              size="icon"
              variant={Number(item.value) >= n ? "default" : "outline"}
              className="h-8 w-8"
              onClick={() => setValue(key, n)}
              data-testid={`${item.key}-rating-${n}`}
            >
              <Star className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {type === "single_select" && (
        <Select value={(item.value as string) || ""} onValueChange={(v) => setValue(key, v)}>
          <SelectTrigger data-testid={`${item.key}-single`}><SelectValue placeholder="Pick one" /></SelectTrigger>
          <SelectContent>
            {(item.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {type === "multi_select" && (
        <div className="space-y-1" data-testid={`${item.key}-multi`}>
          {(item.options || []).map((o) => {
            const checked = multi.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...multi, o] : multi.filter((x) => x !== o);
                    setValue(key, next);
                  }}
                />
                {o}
              </label>
            );
          })}
        </div>
      )}

      {type === "gps" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={captureGps} disabled={capturing} data-testid={`${item.key}-gps`}>
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {capturing ? "Capturing…" : gps?.lat != null ? "Re-capture location" : "Capture location"}
          </Button>
          {gps?.lat != null && (
            <span className="text-xs text-muted-foreground">
              {Number(gps.lat).toFixed(5)}, {Number(gps.lng).toFixed(5)}
              {gps.accuracy != null ? ` (±${Math.round(gps.accuracy)}m)` : ""}
            </span>
          )}
        </div>
      )}

      {type === "image" && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted" data-testid={`${item.key}-image-label`}>
            <Camera className="h-4 w-4" />
            {img?.dataUrl ? "Replace photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onImage(e.target.files?.[0])}
              data-testid={`${item.key}-image`}
            />
          </label>
          {img?.dataUrl && (
            <img src={img.dataUrl} alt={img.name || "captured"} className="max-h-40 rounded-md border" />
          )}
        </div>
      )}

      {(type === "yes_no" || type === "true_false") && item.response === "no" && (
        <Input
          placeholder="Note the gap (optional)"
          value={item.note || ""}
          onChange={(e) => setNote(key, e.target.value)}
          className="text-xs"
        />
      )}
    </div>
  );
}

function ConductDialog({ visit, facility, onClose, onSave, isSaving }: { visit: SupervisionVisit; facility: any; onClose: () => void; onSave: (d: any) => void; isSaving: boolean }) {
  const { toast } = useToast();
  const initialChecklist = (visit.checklist && visit.checklist.length ? visit.checklist : DEFAULT_CHECKLIST).map((c) => ({ ...c }));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [findings, setFindings] = useState<string>(visit.findings || "");
  const [followUp, setFollowUp] = useState<string>(visit.followUpActions || "");
  const [nextVisitDate, setNextVisitDate] = useState<string>(visit.nextVisitDate ? visit.nextVisitDate.slice(0, 10) : "");
  const [status, setStatus] = useState<string>(visit.status === "scheduled" ? "conducted" : visit.status);
  const [facilityId, setFacilityId] = useState<number | null>(visit.facilityId ?? null);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(
    visit.gpsLatitude != null && visit.gpsLongitude != null
      ? { lat: Number(visit.gpsLatitude), lng: Number(visit.gpsLongitude) }
      : null,
  );
  const [capturingGps, setCapturingGps] = useState(false);

  const captureVisitGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not available", description: "This device can't report its location.", variant: "destructive" });
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setCapturingGps(false);
        toast({ title: "Location captured", description: "The visit's GPS location was recorded." });
      },
      (err) => {
        setCapturingGps(false);
        toast({ title: "Couldn't get location", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const score = computeScore(checklist);

  // Progress = how many of the visible questions have an answer.
  const visibleItems = checklist.filter((c) => isAnswerVisible(c, checklist));
  const isAnswered = (c: ChecklistItem): boolean => {
    const t = c.type || "yes_no";
    if (t === "yes_no" || t === "true_false") return !!c.response;
    if (t === "multi_select") return Array.isArray(c.value) && c.value.length > 0;
    if (t === "gps" || t === "image") return c.value != null;
    return c.value !== undefined && c.value !== null && c.value !== "";
  };
  const answeredCount = visibleItems.filter(isAnswered).length;
  const totalCount = visibleItems.length;
  const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const setResp = (key: string, r: ChecklistItem["response"]) => {
    setChecklist((prev) => prev.map((c) => c.key === key ? { ...c, response: r } : c));
  };
  const setNote = (key: string, n: string) => {
    setChecklist((prev) => prev.map((c) => c.key === key ? { ...c, note: n } : c));
  };
  const setValue = (key: string, v: unknown) => {
    setChecklist((prev) => prev.map((c) => c.key === key ? { ...c, value: v } : c));
  };

  const addRepeat = (baseKey: string) => {
    setChecklist((prev) => {
      const instances = prev.filter((c) => (c.baseKey || c.key) === baseKey);
      const base = instances[0];
      if (!base) return prev;
      if (base.maxRepeats && instances.length >= base.maxRepeats) return prev;
      const nextIndex = Math.max(...instances.map((c) => c.repeatIndex ?? 0)) + 1;
      const inst = makeRepeatAnswer(base, nextIndex);
      let lastIdx = -1;
      prev.forEach((c, i) => { if ((c.baseKey || c.key) === baseKey) lastIdx = i; });
      const next = [...prev];
      next.splice(lastIdx + 1, 0, inst);
      return next;
    });
  };
  const removeRepeat = (key: string) => {
    setChecklist((prev) => prev.filter((c) => c.key !== key));
  };

  // Number only the visible, top-level (entry-0, non-follow-up) base questions.
  let visibleNumber = 0;

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supervisory visit — {facility?.name || `Facility #${visit.facilityId}`}</DialogTitle>
          <DialogDescription>Scheduled {new Date(visit.scheduledDate).toLocaleDateString()} · {visit.visitType}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="checklist" className="mt-2">
          <TabsList>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="findings">Findings & follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-3 mt-3">
            {/* Progress + live score header */}
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="h-4 w-4 text-primary" />
                  {answeredCount} of {totalCount} answered
                </div>
                <Badge variant="outline" className={`text-sm ${score >= 80 ? STATUS_STYLES.conducted : score >= 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : STATUS_STYLES.missed}`}>
                  Current score: {score}%
                </Badge>
              </div>
              <Progress value={pct} className="h-2" data-testid="checklist-progress" />
              <p className="text-xs text-muted-foreground">
                Score = average of the scored questions (Yes/No, True/False, and any ratings the author counts). Follow-up questions appear based on earlier answers.
              </p>
            </div>

            {/* Visit location — smart Province → District → Facility cascade + GPS */}
            <div className="rounded-xl border bg-card p-4 space-y-3" data-testid="conduct-location-card">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPinned className="h-4 w-4 text-indigo-500" /> Visit location
              </div>
              <p className="text-xs text-muted-foreground">
                Confirm where this visit took place. Pick the Province, District and Health Facility, then capture the on-site GPS point.
              </p>
              <FacilityCascadePicker
                value={facilityId}
                onChange={(id) => setFacilityId(id)}
                showLabels
              />
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={captureVisitGps}
                  disabled={capturingGps}
                  data-testid="btn-capture-visit-gps"
                >
                  {capturingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  {capturingGps ? "Capturing…" : gps ? "Re-capture GPS" : "Capture GPS"}
                </Button>
                {gps && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="visit-gps-readout">
                    <MapPin className="h-3 w-3" />
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                    {gps.accuracy != null ? ` (±${Math.round(gps.accuracy)}m)` : ""}
                  </span>
                )}
              </div>
            </div>
            {checklist.map((c) => {
              if (!isAnswerVisible(c, checklist)) return null;
              const isFollowUp = !!c.parentId;
              const repeatIndex = c.repeatIndex ?? 0;
              const isEntryZero = repeatIndex === 0;
              if (isEntryZero && !isFollowUp) visibleNumber += 1;

              const instances = c.repeatable ? checklist.filter((x) => (x.baseKey || x.key) === (c.baseKey || c.key)) : [];
              const isLastInstance = c.repeatable && instances[instances.length - 1]?.key === c.key;
              const entryLabelBase = c.repeatLabel?.trim() || "Entry";
              const instanceLabel = c.repeatable ? `${entryLabelBase} ${repeatIndex + 1}` : undefined;
              const canAddMore = c.repeatable && (!c.maxRepeats || instances.length < c.maxRepeats);

              return (
                <div key={c.key} className="space-y-2">
                  <ChecklistQuestion
                    item={c}
                    displayNumber={isEntryZero && !isFollowUp ? visibleNumber : undefined}
                    instanceLabel={instanceLabel}
                    onRemove={c.repeatable && !isEntryZero ? () => removeRepeat(c.key) : undefined}
                    setResp={setResp}
                    setNote={setNote}
                    setValue={setValue}
                  />
                  {isLastInstance && canAddMore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 ml-1"
                      onClick={() => addRepeat(c.baseKey || c.key)}
                      data-testid={`add-repeat-${c.baseKey || c.key}`}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add another {entryLabelBase.toLowerCase()}
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="findings" className="space-y-3 mt-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="conducted">Conducted</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Findings / observations</Label>
              <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={4} placeholder="What did you observe? What worked well?" data-testid="input-findings" />
            </div>
            <div>
              <Label>Follow-up actions</Label>
              <Textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={4} placeholder="Who does what, by when?" data-testid="input-followup" />
            </div>
            <div>
              <Label>Next visit date (optional)</Label>
              <Input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} data-testid="input-next-visit" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={isSaving}
            onClick={() => onSave({
              checklist,
              findings: findings || null,
              followUpActions: followUp || null,
              status,
              score,
              facilityId: facilityId ?? visit.facilityId,
              gpsLatitude: gps ? String(gps.lat) : null,
              gpsLongitude: gps ? String(gps.lng) : null,
              conductedDate: status === "conducted" ? new Date().toISOString() : visit.conductedDate,
              nextVisitDate: nextVisitDate || null,
            })}
            data-testid="btn-save-visit"
          >
            {isSaving ? "Saving…" : "Save visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type QuarterlyReviewCoverageRow = {
  facilityId: number;
  facilityName: string;
  districtId: number | null;
  districtName: string | null;
  provinceId: number | null;
  provinceName: string | null;
  hasReview: boolean;
  reviewId: number | null;
  updatedAt: string | null;
  nextSurveyDate: string | null;
};

type QuarterlyReviewCoverageTrendPoint = {
  year: number;
  quarter: number;
  totalFacilities: number;
  facilitiesWithReview: number;
  coveragePct: number;
};

type QuarterlyReviewCoverageResponse = {
  year: number;
  quarter: number;
  totalFacilities: number;
  facilitiesWithReview: number;
  facilitiesWithoutReview: number;
  coveragePct: number;
  facilities: QuarterlyReviewCoverageRow[];
  trend?: QuarterlyReviewCoverageTrendPoint[];
};

type QuarterlyReviewNote = {
  id: number;
  facilityId: number;
  year: number;
  quarter: number;
  topDrivers: Array<{ key?: string; label?: string; count?: number } | string> | unknown;
  correctiveActions: string;
  nextSurveyDate: string | null;
  updatedAt: string;
};

const NOW = new Date();
const CURRENT_YEAR = NOW.getUTCFullYear();
const CURRENT_QUARTER = Math.floor(NOW.getUTCMonth() / 3) + 1;
const QUARTER_YEAR_OPTIONS: Array<{ year: number; quarter: number }> = (() => {
  const list: Array<{ year: number; quarter: number }> = [];
  let y = CURRENT_YEAR;
  let q = CURRENT_QUARTER;
  for (let i = 0; i < 6; i++) {
    list.push({ year: y, quarter: q });
    q -= 1;
    if (q < 1) { q = 4; y -= 1; }
  }
  return list;
})();

function QuarterlyCoverageTrend({
  trend,
  currentYear,
  currentQuarter,
  onSelectPeriod,
}: {
  trend: QuarterlyReviewCoverageTrendPoint[] | undefined;
  currentYear: number;
  currentQuarter: number;
  onSelectPeriod: (year: number, quarter: number) => void;
}) {
  const points: Array<QuarterlyReviewCoverageTrendPoint | null> =
    trend && trend.length > 0
      ? trend
      : Array.from({ length: 4 }, () => null);
  const barCount = points.length;
  return (
    <div
      className="flex items-end gap-0.5 h-10 shrink-0"
      data-testid="qrc-trend-chart"
      aria-label="Coverage trend across the last 4 quarters"
    >
      {points.map((p, i) => {
        const pct = p?.coveragePct ?? 0;
        const tone =
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
            ? "bg-amber-500"
            : pct > 0
            ? "bg-rose-500"
            : "bg-muted";
        const isCurrent =
          !!p && p.year === currentYear && p.quarter === currentQuarter;
        const title = p
          ? `Q${p.quarter} ${p.year}: ${p.coveragePct}% (${p.facilitiesWithReview}/${p.totalFacilities})`
          : "No data";
        const heightPct = p ? Math.max(6, Math.min(pct, 100)) : 6;
        const ariaLabel = p
          ? `Jump to Q${p.quarter} ${p.year} — ${p.coveragePct}% coverage (${p.facilitiesWithReview} of ${p.totalFacilities} facilities)`
          : "No data for this quarter";
        return (
          <button
            key={p ? `${p.year}-${p.quarter}` : `empty-${i}`}
            type="button"
            title={title}
            aria-label={ariaLabel}
            aria-pressed={isCurrent}
            disabled={!p}
            onClick={() => { if (p) onSelectPeriod(p.year, p.quarter); }}
            className={`w-2 rounded-sm ${tone} ${isCurrent ? "ring-1 ring-offset-1 ring-foreground/40" : ""} ${!p ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"}`}
            style={{ height: `${heightPct}%` }}
            data-testid={`qrc-trend-bar-${barCount - 1 - i}`}
          />
        );
      })}
    </div>
  );
}

function QuarterlyReviewCoverage() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<number>(CURRENT_QUARTER);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "done">("all");
  const [openFacilityId, setOpenFacilityId] = useState<number | null>(null);
  const [qrcPage, setQrcPage] = useState(1);
  const [qrcPageSize, setQrcPageSize] = useState<number>(10);
  useEffect(() => { setQrcPage(1); }, [statusFilter, provinceId, districtId, facilityId, year, quarter]);
  const hasScopeFilter = provinceId !== null || districtId !== null || facilityId !== null;

  const queryParams = new URLSearchParams();
  queryParams.set("year", String(year));
  queryParams.set("quarter", String(quarter));
  queryParams.set("includeTrend", "1");
  queryParams.set("trendQuarters", "4");
  if (provinceId) queryParams.set("provinceId", String(provinceId));
  if (districtId) queryParams.set("districtId", String(districtId));
  if (facilityId) queryParams.set("facilityId", String(facilityId));
  const queryStr = queryParams.toString();

  const { data, isLoading } = useQuery<QuarterlyReviewCoverageResponse>({
    queryKey: ["/api/indicators/quarterly-review-coverage", year, quarter, provinceId, districtId, facilityId, "trend4"],
    queryFn: async () => {
      const r = await fetch(`/api/indicators/quarterly-review-coverage?${queryStr}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load quarterly review coverage");
      return r.json();
    },
  });

  const rows = data?.facilities ?? [];
  const filteredRows = rows.filter((r) => {
    if (statusFilter === "missing") return !r.hasReview;
    if (statusFilter === "done") return r.hasReview;
    return true;
  });

  const coveragePct = data?.coveragePct ?? 0;
  const coverageTone =
    coveragePct >= 80
      ? "bg-emerald-500"
      : coveragePct >= 50
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <Card data-testid="card-quarterly-review-coverage">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-indigo-500" />
              Quarterly review coverage
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              WHO RED step 12 — which facilities have documented this quarter's review of coverage, dropouts and corrective actions, and which still owe one.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={`${year}-${quarter}`}
              onValueChange={(v) => {
                const [y, q] = v.split("-").map(Number);
                setYear(y);
                setQuarter(q);
              }}
            >
              <SelectTrigger className="w-40" data-testid="select-quarterly-period"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUARTER_YEAR_OPTIONS.map((o) => (
                  <SelectItem key={`${o.year}-${o.quarter}`} value={`${o.year}-${o.quarter}`}>
                    Q{o.quarter} {o.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40" data-testid="select-quarterly-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                <SelectItem value="missing">Missing note</SelectItem>
                <SelectItem value="done">Has note</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <GeoCascadeFilter
            provinceId={provinceId}
            districtId={districtId}
            facilityId={facilityId}
            showFacility
            onProvinceChange={(id) => { setProvinceId(id); setDistrictId(null); setFacilityId(null); }}
            onDistrictChange={(id) => { setDistrictId(id); setFacilityId(null); }}
            onFacilityChange={setFacilityId}
            testIdPrefix="qrc-geo"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <SummaryTile label="Facilities in scope" value={data?.totalFacilities ?? 0} tone="indigo" />
          <SummaryTile label="With review note" value={data?.facilitiesWithReview ?? 0} tone="emerald" />
          <SummaryTile label="Missing note" value={data?.facilitiesWithoutReview ?? 0} tone="rose" />
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Coverage</div>
                <div className="text-2xl font-bold font-mono mt-1" data-testid="qrc-coverage-pct">{coveragePct}%</div>
              </div>
              <QuarterlyCoverageTrend
                trend={data?.trend}
                currentYear={year}
                currentQuarter={quarter}
                onSelectPeriod={(y, q) => { setYear(y); setQuarter(q); }}
              />
            </div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${coverageTone} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(coveragePct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
            {rows.length === 0
              ? "No facilities in this scope yet."
              : "No facilities match this filter."}
          </div>
        ) : (
          <>
          <div className="divide-y border rounded-md">
            {filteredRows
              .slice((Math.min(qrcPage, Math.max(1, Math.ceil(filteredRows.length / qrcPageSize))) - 1) * qrcPageSize, Math.min(qrcPage, Math.max(1, Math.ceil(filteredRows.length / qrcPageSize))) * qrcPageSize)
              .map((row) => (
              <button
                type="button"
                key={row.facilityId}
                onClick={() => row.hasReview && setOpenFacilityId(row.facilityId)}
                disabled={!row.hasReview}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 flex-wrap ${row.hasReview ? "hover-elevate cursor-pointer" : "cursor-default opacity-90"}`}
                data-testid={`qrc-row-${row.facilityId}`}
              >
                <Badge
                  variant="outline"
                  className={`min-w-[5.5rem] justify-center ${row.hasReview
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40"}`}
                >
                  {row.hasReview ? "Documented" : "Missing"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {row.facilityName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                    {row.provinceName && <span>{row.provinceName}</span>}
                    {row.districtName && <span>· {row.districtName}</span>}
                    {row.hasReview && row.updatedAt && (
                      <span>· Saved {new Date(row.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {row.hasReview && <span className="text-xs text-muted-foreground">View note →</span>}
              </button>
            ))}
          </div>
          <ListPager
            page={qrcPage}
            pageSize={qrcPageSize}
            total={filteredRows.length}
            onPageChange={setQrcPage}
            onPageSizeChange={setQrcPageSize}
            testIdPrefix="qrc"
          />
          </>
        )}
      </CardContent>

      <QuarterlyReviewNoteDialog
        facility={
          openFacilityId
            ? rows.find((r) => r.facilityId === openFacilityId) ?? null
            : null
        }
        year={year}
        quarter={quarter}
        onClose={() => setOpenFacilityId(null)}
      />
    </Card>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "indigo" | "emerald" | "rose" }) {
  const toneClass: Record<string, string> = {
    indigo: "text-indigo-700 dark:text-indigo-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    rose: "text-rose-700 dark:text-rose-300",
  };
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${toneClass[tone]}`}>{value}</div>
    </div>
  );
}

function QuarterlyReviewNoteDialog({
  facility,
  year,
  quarter,
  onClose,
}: {
  facility: QuarterlyReviewCoverageRow | null;
  year: number;
  quarter: number;
  onClose: () => void;
}) {
  const open = !!facility;
  const { data: notes, isLoading } = useQuery<QuarterlyReviewNote[]>({
    queryKey: ["/api/quarterly-reviews", facility?.facilityId, year, quarter],
    enabled: open && !!facility?.facilityId,
    queryFn: async () => {
      const r = await fetch(
        `/api/quarterly-reviews?facilityId=${facility!.facilityId}&year=${year}&quarter=${quarter}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error("Failed to load review note");
      return r.json();
    },
  });
  const note = notes?.[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="dialog-quarterly-review-note">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-indigo-500" />
            Q{quarter} {year} review — {facility?.facilityName}
          </DialogTitle>
          <DialogDescription>
            Read-only view of the quarterly review note documented by facility staff.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !note ? (
          <div className="text-sm text-muted-foreground py-4">
            No saved review note for this quarter.
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="text-xs text-muted-foreground">
              Last updated {new Date(note.updatedAt).toLocaleString()}
              {note.nextSurveyDate && (
                <> · Next survey {new Date(note.nextSurveyDate).toLocaleDateString()}</>
              )}
            </div>

            {Array.isArray(note.topDrivers) && note.topDrivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Top drivers
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(note.topDrivers as any[]).map((d, i) => {
                    const label = typeof d === "string" ? d : (d?.label || d?.key || "");
                    const count = typeof d === "object" && d?.count != null ? d.count : null;
                    if (!label) return null;
                    return (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {label}{count != null ? ` · ${count}` : ""}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Corrective actions
              </div>
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {note.correctiveActions || "—"}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="btn-close-quarterly-review">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RespBtn({ active, onClick, icon: Icon, label, tone, testId }: { active: boolean; onClick: () => void; icon: any; label: string; tone: string; testId: string }) {
  const map: Record<string, string> = {
    emerald: active ? "bg-emerald-500 text-white border-emerald-500" : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10",
    rose: active ? "bg-rose-500 text-white border-rose-500" : "border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",
    muted: active ? "bg-muted-foreground text-background border-muted-foreground" : "border-border text-muted-foreground hover:bg-muted",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`resp-${testId}`}
      className={`h-7 px-2 rounded-md border text-xs font-medium inline-flex items-center gap-1 transition-colors ${map[tone]}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
