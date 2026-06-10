import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, CheckCircle2, AlertCircle, XCircle, Building2, Calendar, Loader2, Settings2 } from "lucide-react";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  templateToAnswers,
  computeChecklistScore,
  isAnswerVisible,
  makeRepeatAnswer,
  type ChecklistAnswer,
  type ChecklistTemplate,
} from "@shared/supervisionChecklist";
import { ChecklistQuestion } from "@/components/ChecklistQuestion";

// ─── Post-Campaign Evaluation (PCE) Checklist ───────────────────────────────
// Based on WHO / UNICEF PCE standard data collection items for OPV / measles
// and multi-antigen SIA campaigns.
const PCE_CHECKLIST: ChecklistAnswer[] = [
  // Coverage & Reach
  { key: "pce_coverage_targets_met", label: "Campaign coverage target (≥95%) achieved in the catchment area", response: "" },
  { key: "pce_htr_reached", label: "Hard-to-reach communities and mobile populations were reached", response: "" },
  { key: "pce_missed_children_tracked", label: "Missed / unvaccinated children have been identified and listed", response: "" },

  // Cold chain & logistics
  { key: "pce_vaccine_utilization", label: "Vaccine utilization rate within acceptable range (80-120%)", response: "" },
  { key: "pce_no_waste", label: "No significant open-vial or expiry waste reported", response: "" },
  { key: "pce_cold_chain_maintained", label: "Cold chain maintained throughout campaign (no temperature breaches)", response: "" },

  // Data & recording
  { key: "pce_tally_complete", label: "Tally sheets / recording forms completed and submitted for all teams", response: "" },
  { key: "pce_data_verified", label: "Administrative data verified against independent estimate or survey", response: "" },
  { key: "pce_aefi_reported", label: "All AEFI events investigated and reported within 24 hours", response: "" },

  // Community & communication
  { key: "pce_community_feedback", label: "Community feedback collected and documented", response: "" },
  { key: "pce_rumours_addressed", label: "Vaccine rumours or refusals addressed promptly by mobilizers", response: "" },

  // Waste & environment
  { key: "pce_waste_disposed", label: "All sharps and medical waste safely disposed of post-campaign", response: "" },

  // Financial
  { key: "pce_budget_reconciled", label: "Campaign budget reconciled and financial report submitted", response: "" },
];

type SupervisionVisit = {
  id: number; facilityId: number; scheduledDate: string; conductedDate: string | null;
  supervisorName: string | null; visitType: string; status: string;
  checklist: ChecklistAnswer[]; score: number | null; findings: string | null; followUpActions: string | null;
  templateId?: number | null;
};

function scoreColor(s: number) {
  return s >= 80 ? "text-emerald-600 dark:text-emerald-400" : s >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

/* COMMENTED OUT IN FAVOR OF SHARED ChecklistQuestion COMPONENT
function ChecklistEditor({ items, onChange }: { items: any[]; onChange: (i: any[]) => void }) {
  return null;
}
*/

export default function PCE() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filterFacilityId, setFilterFacilityId] = useState<number | null>(null);
  const [filterProvinceId, setFilterProvinceId] = useState<number | null>(null);
  const [filterDistrictId, setFilterDistrictId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [conductedDate, setConductedDate] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [findings, setFindings] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [templateId, setTemplateId] = useState<string>("__default__");
  const [checklistItems, setChecklistItems] = useState<ChecklistAnswer[]>(
    PCE_CHECKLIST.map((c) => ({ ...c, response: "" })),
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: visits = [], isLoading } = useQuery<SupervisionVisit[]>({
    queryKey: ["/api/supervision-visits", { visitType: "pce" }],
    queryFn: async () => {
      const res = await fetch("/api/supervision-visits?visitType=pce", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch PCE visits");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/supervision-checklist-templates", { category: "pce" }],
    queryFn: async () => {
      const res = await fetch("/api/supervision-checklist-templates?category=pce", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch PCE templates");
      return res.json();
    },
  });

  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"] });

  const setResp = (key: string, r: ChecklistAnswer["response"]) => {
    setChecklistItems((prev) => prev.map((c) => c.key === key ? { ...c, response: r } : c));
  };
  const setNote = (key: string, n: string) => {
    setChecklistItems((prev) => prev.map((c) => c.key === key ? { ...c, note: n } : c));
  };
  const setValue = (key: string, v: unknown) => {
    setChecklistItems((prev) => prev.map((c) => c.key === key ? { ...c, value: v } : c));
  };

  const addRepeat = (baseKey: string) => {
    setChecklistItems((prev) => {
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
    setChecklistItems((prev) => prev.filter((c) => c.key !== key));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => editingId
      ? apiRequest("PATCH", `/api/supervision-visits/${editingId}`, data)
      : apiRequest("POST", "/api/supervision-visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      setDialogOpen(false); resetDialog();
      toast({ title: editingId ? "PCE updated" : "PCE created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/supervision-visits/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] }); toast({ title: "PCE deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetDialog() {
    setEditingId(null); setFacilityId(null); setScheduledDate(""); setConductedDate("");
    setSupervisorName(""); setFindings(""); setFollowUpActions("");
    setTemplateId("__default__");
    setChecklistItems(PCE_CHECKLIST.map((c) => ({ ...c, response: "" })));
  }

  function openEdit(v: SupervisionVisit) {
    setEditingId(v.id); setFacilityId(v.facilityId);
    setScheduledDate(v.scheduledDate?.slice(0, 10) ?? "");
    setConductedDate(v.conductedDate?.slice(0, 10) ?? "");
    setSupervisorName(v.supervisorName || ""); setFindings(v.findings || ""); setFollowUpActions(v.followUpActions || "");
    setTemplateId(v.templateId ? String(v.templateId) : "__default__");
    if (v.templateId) {
      setChecklistItems((v.checklist || []).map((c: any) => ({ ...c })));
    } else {
      const merged = PCE_CHECKLIST.map((def) => {
        const saved = (v.checklist || []).find((s: any) => s.key === def.key);
        return saved ? { ...def, response: (saved.response || "") as ChecklistAnswer["response"], note: saved.note } : { ...def, response: "" as ChecklistAnswer["response"] };
      });
      setChecklistItems(merged);
    }
    setDialogOpen(true);
  }

  function handleSave() {
    if (!facilityId || !scheduledDate) {
      toast({ title: "Missing fields", description: "Facility and scheduled date are required.", variant: "destructive" }); return;
    }
    saveMutation.mutate({
      facilityId, scheduledDate: new Date(scheduledDate).toISOString(),
      conductedDate: conductedDate ? new Date(conductedDate).toISOString() : null,
      supervisorName, visitType: "pce",
      status: conductedDate ? "conducted" : "scheduled",
      checklist: checklistItems, score: computeChecklistScore(checklistItems), findings, followUpActions,
      templateId: templateId === "__default__" ? null : parseInt(templateId),
    });
  }

  const displayed = filterFacilityId ? visits.filter((v) => v.facilityId === filterFacilityId) : visits;
  const getFacilityName = (id: number) => (facilities as any[]).find((f) => f.id === id)?.name ?? `Facility #${id}`;
  const statusIcon = (s: string) =>
    s === "conducted" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      : s === "missed" ? <XCircle className="h-4 w-4 text-rose-500" />
        : <AlertCircle className="h-4 w-4 text-amber-500" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-violet-500" />
            Post-Campaign Evaluation (PCE)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structured post-campaign evaluation to assess coverage, data quality, and lessons learned
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "national_admin" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/supervision/templates")}
              data-testid="btn-manage-checklists"
            >
              <Settings2 className="h-4 w-4" /> Manage Checklists
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="btn-new-pce">
                <Plus className="h-4 w-4" /> New PCE
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Post-Campaign Evaluation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Facility *</Label>
                  <FacilityCascadePicker value={facilityId} onChange={(id) => setFacilityId(id)} facilityLabel="Facility" required />
                </div>
                <div>
                  <Label className="text-xs">Evaluator name</Label>
                  <Input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="Full name" data-testid="input-evaluator-name" />
                </div>
                <div>
                  <Label className="text-xs">Scheduled date *</Label>
                  <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} data-testid="input-scheduled-date" />
                </div>
                <div>
                  <Label className="text-xs">Conducted date</Label>
                  <Input type="date" value={conductedDate} onChange={(e) => setConductedDate(e.target.value)} data-testid="input-conducted-date" />
                </div>
              </div>

              {checklistItems.some((i) => i.response !== "" || i.value !== undefined) && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">PCE Score</span>
                    <span className={`font-bold text-lg ${scoreColor(computeChecklistScore(checklistItems))}`}>{computeChecklistScore(checklistItems)}%</span>
                  </div>
                  <Progress value={computeChecklistScore(checklistItems)} className="h-2" />
                </div>
              )}

              <div>
                <Label className="text-xs mb-2 block">Checklist Form</Label>
                <Select
                  value={templateId}
                  onValueChange={(v) => {
                    setTemplateId(v);
                    if (v === "__default__") {
                      setChecklistItems(PCE_CHECKLIST.map((c) => ({ ...c, response: "" })));
                    } else {
                      const chosen = templates.find((t) => String(t.id) === v);
                      if (chosen) {
                        setChecklistItems(templateToAnswers(chosen.items));
                      }
                    }
                  }}
                  disabled={!!editingId}
                >
                  <SelectTrigger data-testid="select-pce-template"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default PCE Checklist</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs">Questions</Label>
                {(() => {
                  let visibleNumber = 0;
                  const facilityObj = facilities.find((f) => f.id === facilityId);
                  const defaultCenter = facilityObj?.latitude != null && facilityObj?.longitude != null
                    ? [Number(facilityObj.latitude), Number(facilityObj.longitude)] as [number, number]
                    : null;

                  return checklistItems.map((c) => {
                    if (!isAnswerVisible(c, checklistItems)) return null;
                    const isFollowUp = !!c.parentId;
                    const repeatIndex = c.repeatIndex ?? 0;
                    const isEntryZero = repeatIndex === 0;
                    if (isEntryZero && !isFollowUp) visibleNumber += 1;

                    const instances = c.repeatable ? checklistItems.filter((x) => (x.baseKey || x.key) === (c.baseKey || c.key)) : [];
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
                          defaultCenter={defaultCenter}
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
                  });
                })()}
              </div>

              <div>
                <Label className="text-xs">Key findings</Label>
                <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} placeholder="Evaluation findings and observations" data-testid="textarea-findings" />
              </div>
              <div>
                <Label className="text-xs">Recommendations / follow-up</Label>
                <Textarea value={followUpActions} onChange={(e) => setFollowUpActions(e.target.value)} rows={2} placeholder="Recommendations for next campaign" data-testid="textarea-follow-up" />
              </div>

              <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full" data-testid="btn-save-pce">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Update PCE" : "Create PCE"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <GeoCascadeFilter
            provinceId={filterProvinceId}
            districtId={filterDistrictId}
            onProvinceChange={(id) => { setFilterProvinceId(id); setFilterDistrictId(null); setFilterFacilityId(null); }}
            onDistrictChange={(id) => { setFilterDistrictId(id); setFilterFacilityId(null); }}
            onFacilityChange={(id) => setFilterFacilityId(id)}
            showFacility
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({displayed.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({displayed.filter((v) => v.status === "scheduled").length})</TabsTrigger>
          <TabsTrigger value="conducted">Conducted ({displayed.filter((v) => v.status === "conducted").length})</TabsTrigger>
        </TabsList>
        {["all", "scheduled", "conducted"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="grid gap-3 mt-3">
                {displayed.filter((v) => tab === "all" || v.status === tab).map((v) => (
                  <Card key={v.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {statusIcon(v.status)}
                            <span className="font-medium text-sm">{getFacilityName(v.facilityId)}</span>
                            <Badge variant={v.status === "conducted" ? "default" : "secondary"} className="text-xs">{v.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(v.scheduledDate).toLocaleDateString()}</span>
                            {v.supervisorName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{v.supervisorName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {v.score != null && <span className={`text-lg font-bold ${scoreColor(v.score)}`}>{v.score}%</span>}
                          <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => deleteMutation.mutate(v.id)}>Delete</Button>
                        </div>
                      </div>
                      {v.findings && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{v.findings}</p>}
                    </CardContent>
                  </Card>
                ))}
                {displayed.filter((v) => tab === "all" || v.status === tab).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                    <Activity className="h-8 w-8 opacity-30" />
                    No {tab === "all" ? "" : tab} PCE records yet.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
