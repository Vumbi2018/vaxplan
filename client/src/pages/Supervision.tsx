import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, Calendar, Plus, CheckCircle2, AlertCircle, XCircle, MinusCircle,
  Building2, User, FileText, ListChecks, Trash2, Pencil,
} from "lucide-react";

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
  findings: string | null;
  followUpActions: string | null;
  nextVisitDate: string | null;
  createdAt: string;
};

type ChecklistItem = { key: string; label: string; response: "yes" | "no" | "na" | ""; note?: string };

// WHO RED supportive supervision checklist (seeded; tenants can evolve over time).
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

function computeScore(checklist: ChecklistItem[]): number {
  const scorable = checklist.filter((c) => c.response === "yes" || c.response === "no");
  if (!scorable.length) return 0;
  const yes = scorable.filter((c) => c.response === "yes").length;
  return Math.round((yes / scorable.length) * 100);
}

export default function Supervision() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [conductingVisit, setConductingVisit] = useState<SupervisionVisit | null>(null);

  const { data: visits = [], isLoading } = useQuery<SupervisionVisit[]>({
    queryKey: ["/api/supervision-visits", { facilityId: facilityFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (facilityFilter !== "all") params.set("facilityId", facilityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/supervision-visits${params.toString() ? "?" + params.toString() : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load visits");
      return r.json();
    },
  });

  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"] });
  const { data: microplans = [] } = useQuery<any[]>({ queryKey: ["/api/microplans"] });

  const facById = useMemo(() => {
    const m = new Map<number, any>();
    facilities.forEach((f) => m.set(f.id, f));
    return m;
  }, [facilities]);

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
      return (r as Response).json();
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
      return (r as Response).json();
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
      return (r as Response).json();
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
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-schedule-visit" className="gap-2">
              <Plus className="h-4 w-4" /> Schedule Visit
            </Button>
          </DialogTrigger>
          <ScheduleDialog
            facilities={facilities}
            microplans={microplans}
            onSubmit={(d) => scheduleMutation.mutate(d)}
            isSubmitting={scheduleMutation.isPending}
          />
        </Dialog>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total visits" value={counts.total} icon={Calendar} tone="indigo" />
        <StatCard label="Scheduled" value={counts.scheduled} icon={Calendar} tone="sky" />
        <StatCard label="Conducted" value={counts.conducted} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Missed / cancelled" value={counts.missed + counts.cancelled} icon={AlertCircle} tone="rose" />
        <StatCard label="Avg checklist score" value={`${counts.avgScore}%`} icon={ListChecks} tone="amber" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <CardTitle className="text-lg">Visit calendar</CardTitle>
            <div className="flex gap-2">
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
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="w-56" data-testid="filter-facility"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All facilities</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No supervisory visits yet.</p>
              <p className="text-sm">Schedule the first one to start your supervision plan.</p>
            </div>
          ) : (
            <div className="divide-y">
              {visits.map((v) => {
                const fac = facById.get(v.facilityId);
                return (
                  <div key={v.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3" data-testid={`visit-${v.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={STATUS_STYLES[v.status] || ""}>{v.status}</Badge>
                        <Badge variant="secondary" className="capitalize">{v.visitType}</Badge>
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
                        {v.findings && <span className="flex items-center gap-1 truncate max-w-xs"><FileText className="h-3 w-3" /> {v.findings.slice(0, 60)}{v.findings.length > 60 ? "…" : ""}</span>}
                      </div>
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

function ScheduleDialog({ facilities, microplans, onSubmit, isSubmitting }: { facilities: any[]; microplans: any[]; onSubmit: (d: any) => void; isSubmitting: boolean }) {
  const [facilityId, setFacilityId] = useState<string>("");
  const [microplanId, setMicroplanId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [visitType, setVisitType] = useState<string>("routine");

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
      </div>
      <DialogFooter>
        <Button
          disabled={!facilityId || !scheduledDate || isSubmitting}
          onClick={() => onSubmit({
            facilityId: parseInt(facilityId),
            microplanId: microplanId ? parseInt(microplanId) : null,
            scheduledDate,
            supervisorName: supervisorName || null,
            visitType,
            status: "scheduled",
            checklist: DEFAULT_CHECKLIST,
          })}
          data-testid="btn-submit-schedule"
        >
          {isSubmitting ? "Scheduling…" : "Schedule visit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ConductDialog({ visit, facility, onClose, onSave, isSaving }: { visit: SupervisionVisit; facility: any; onClose: () => void; onSave: (d: any) => void; isSaving: boolean }) {
  const initialChecklist = (visit.checklist && visit.checklist.length ? visit.checklist : DEFAULT_CHECKLIST).map((c) => ({ ...c }));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [findings, setFindings] = useState<string>(visit.findings || "");
  const [followUp, setFollowUp] = useState<string>(visit.followUpActions || "");
  const [nextVisitDate, setNextVisitDate] = useState<string>(visit.nextVisitDate ? visit.nextVisitDate.slice(0, 10) : "");
  const [status, setStatus] = useState<string>(visit.status === "scheduled" ? "conducted" : visit.status);

  const score = computeScore(checklist);
  const setResp = (idx: number, r: ChecklistItem["response"]) => {
    setChecklist((prev) => prev.map((c, i) => i === idx ? { ...c, response: r } : c));
  };
  const setNote = (idx: number, n: string) => {
    setChecklist((prev) => prev.map((c, i) => i === idx ? { ...c, note: n } : c));
  };

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

          <TabsContent value="checklist" className="space-y-2 mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Mark each item Yes / No / N/A. Score = % of Yes among Yes+No.</p>
              <Badge variant="outline" className={score >= 80 ? STATUS_STYLES.conducted : score >= 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : STATUS_STYLES.missed}>
                Current score: {score}%
              </Badge>
            </div>
            {checklist.map((c, idx) => (
              <div key={c.key} className="border rounded-lg p-3 space-y-2" data-testid={`check-${c.key}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="text-sm font-medium flex-1 min-w-[200px]">{idx + 1}. {c.label}</div>
                  <div className="flex gap-1">
                    <RespBtn active={c.response === "yes"} onClick={() => setResp(idx, "yes")} icon={CheckCircle2} label="Yes" tone="emerald" testId={`${c.key}-yes`} />
                    <RespBtn active={c.response === "no"} onClick={() => setResp(idx, "no")} icon={XCircle} label="No" tone="rose" testId={`${c.key}-no`} />
                    <RespBtn active={c.response === "na"} onClick={() => setResp(idx, "na")} icon={MinusCircle} label="N/A" tone="muted" testId={`${c.key}-na`} />
                  </div>
                </div>
                {c.response === "no" && (
                  <Input
                    placeholder="Note the gap (optional)"
                    value={c.note || ""}
                    onChange={(e) => setNote(idx, e.target.value)}
                    className="text-xs"
                  />
                )}
              </div>
            ))}
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
