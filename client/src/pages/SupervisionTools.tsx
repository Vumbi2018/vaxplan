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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, CheckCircle2, AlertCircle, XCircle, Building2, Calendar, Loader2, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import {
  templateToAnswers,
  computeChecklistScore,
  isAnswerVisible,
  makeRepeatAnswer,
  type ChecklistAnswer,
  type ChecklistTemplate,
} from "@shared/supervisionChecklist";
import { ChecklistQuestion } from "@/components/ChecklistQuestion";

// ─── Campaign Supervision Checklist ─────────────────────────────────────────
// WHO-recommended items for SIA / campaign supervisory visits. These mirror
// the structure used in the existing routine Supervision page so the same
// scoring engine can be applied.
const CAMPAIGN_SUPERVISION_CHECKLIST: ChecklistAnswer[] = [
  { key: "cs_microplan_available", label: "Campaign microplan is available and up-to-date at facility", response: "" },
  { key: "cs_targets_known", label: "Vaccination targets (children 0-59m) are known to the team", response: "" },
  { key: "cs_tally_sheets", label: "Adequate tally sheets and monitoring forms are available", response: "" },
  { key: "cs_vaccine_cold_chain", label: "Vaccines stored at correct temperature (2-8°C) and cold chain is functional", response: "" },
  { key: "cs_sufficient_supplies", label: "Sufficient vaccine doses, diluents, syringes, and safety boxes available", response: "" },
  { key: "cs_team_trained", label: "Vaccination team has received campaign orientation/training", response: "" },
  { key: "cs_community_mobilization", label: "Community mobilization activities completed before campaign day", response: "" },
  { key: "cs_house_marking", label: "House-to-house marking/tracking system is in place", response: "" },
  { key: "cs_aefi_protocol", label: "AEFI reporting protocol is understood by the team", response: "" },
  { key: "cs_waste_management", label: "Safe waste disposal (safety box, sharps bin) in place", response: "" },
  { key: "cs_missed_children", label: "Process for identifying and tracking missed children is established", response: "" },
  { key: "cs_daily_reporting", label: "Daily tally reporting to district level is occurring", response: "" },
];

type SupervisionVisit = {
  id: number;
  facilityId: number;
  scheduledDate: string;
  conductedDate: string | null;
  supervisorName: string | null;
  visitType: string;
  status: string;
  checklist: ChecklistAnswer[];
  score: number | null;
  findings: string | null;
  followUpActions: string | null;
  templateId?: number | null;
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/* COMMENTED OUT IN FAVOR OF SHARED ChecklistQuestion COMPONENT
function ChecklistEditor({
  items,
  onChange,
}: {
  items: any[];
  onChange: (items: any[]) => void;
}) {
  return null;
}
*/

export default function SupervisionTools() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filterFacilityId, setFilterFacilityId] = useState<number | null>(null);
  const [filterProvinceId, setFilterProvinceId] = useState<number | null>(null);
  const [filterDistrictId, setFilterDistrictId] = useState<number | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [findings, setFindings] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [templateId, setTemplateId] = useState<string>("__default__");
  const [checklistItems, setChecklistItems] = useState<ChecklistAnswer[]>(
    CAMPAIGN_SUPERVISION_CHECKLIST.map((c) => ({ ...c, response: "" })),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [conductedDate, setConductedDate] = useState("");

  const { data: visits = [], isLoading } = useQuery<SupervisionVisit[]>({
    queryKey: ["/api/supervision-visits", { visitType: "campaign" }],
    queryFn: async () => {
      const res = await fetch("/api/supervision-visits?visitType=campaign", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/supervision-checklist-templates", { category: "campaign" }],
    queryFn: async () => {
      const res = await fetch("/api/supervision-checklist-templates?category=campaign", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaign templates");
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
    mutationFn: async (data: any) => {
      if (editingId) {
        return apiRequest("PATCH", `/api/supervision-visits/${editingId}`, data);
      }
      return apiRequest("POST", "/api/supervision-visits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      setDialogOpen(false);
      resetDialog();
      toast({ title: editingId ? "Visit updated" : "Visit created", description: "Campaign supervision visit saved." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/supervision-visits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      toast({ title: "Visit deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetDialog() {
    setEditingId(null);
    setFacilityId(null);
    setScheduledDate("");
    setConductedDate("");
    setSupervisorName("");
    setFindings("");
    setFollowUpActions("");
    setTemplateId("__default__");
    setChecklistItems(CAMPAIGN_SUPERVISION_CHECKLIST.map((c) => ({ ...c, response: "" })));
  }

  function openEdit(v: SupervisionVisit) {
    setEditingId(v.id);
    setFacilityId(v.facilityId);
    setScheduledDate(v.scheduledDate ? v.scheduledDate.slice(0, 10) : "");
    setConductedDate(v.conductedDate ? v.conductedDate.slice(0, 10) : "");
    setSupervisorName(v.supervisorName || "");
    setFindings(v.findings || "");
    setFollowUpActions(v.followUpActions || "");
    setTemplateId(v.templateId ? String(v.templateId) : "__default__");
    if (v.templateId) {
      setChecklistItems((v.checklist || []).map((c: any) => ({ ...c })));
    } else {
      const merged = CAMPAIGN_SUPERVISION_CHECKLIST.map((def) => {
        const saved = (v.checklist || []).find((s: any) => s.key === def.key);
        return saved ? { ...def, response: (saved.response || "") as ChecklistAnswer["response"], note: saved.note } : { ...def, response: "" as ChecklistAnswer["response"] };
      });
      setChecklistItems(merged);
    }
    setDialogOpen(true);
  }

  function handleSave() {
    if (!facilityId || !scheduledDate) {
      toast({ title: "Missing fields", description: "Facility and scheduled date are required.", variant: "destructive" });
      return;
    }
    const score = computeChecklistScore(checklistItems);
    saveMutation.mutate({
      facilityId,
      scheduledDate: new Date(scheduledDate).toISOString(),
      conductedDate: conductedDate ? new Date(conductedDate).toISOString() : null,
      supervisorName,
      visitType: "campaign",
      status: conductedDate ? "conducted" : "scheduled",
      checklist: checklistItems,
      score,
      findings,
      followUpActions,
      templateId: templateId === "__default__" ? null : parseInt(templateId),
    });
  }

  const displayedVisits = filterFacilityId
    ? visits.filter((v) => v.facilityId === filterFacilityId)
    : visits;

  function getFacilityName(id: number) {
    return (facilities as any[]).find((f) => f.id === id)?.name ?? `Facility #${id}`;
  }

  const statusIcon = (s: string) => {
    if (s === "conducted") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === "missed") return <XCircle className="h-4 w-4 text-rose-500" />;
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-500" />
            Campaign Supervision Tools
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            WHO RED Step 10 — supportive supervision visits scoped to SIA campaigns
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
              <Button className="gap-2" data-testid="btn-new-supervision-visit">
                <Plus className="h-4 w-4" /> New Visit
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Campaign Supervision Visit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Facility *</Label>
                  <FacilityCascadePicker
                    value={facilityId}
                    onChange={(id) => setFacilityId(id)}
                    facilityLabel="Facility"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Supervisor name</Label>
                  <Input
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Full name"
                    data-testid="input-supervisor-name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Scheduled date *</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    data-testid="input-scheduled-date"
                  />
                </div>
                <div>
                  <Label className="text-xs">Conducted date</Label>
                  <Input
                    type="date"
                    value={conductedDate}
                    onChange={(e) => setConductedDate(e.target.value)}
                    data-testid="input-conducted-date"
                  />
                </div>
              </div>

              {/* Score preview */}
              {checklistItems.some((i) => i.response !== "" || i.value !== undefined) && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">Score</span>
                    <span className={`font-bold text-lg ${scoreColor(computeChecklistScore(checklistItems))}`}>
                      {computeChecklistScore(checklistItems)}%
                    </span>
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
                      setChecklistItems(CAMPAIGN_SUPERVISION_CHECKLIST.map((c) => ({ ...c, response: "" })));
                    } else {
                      const chosen = templates.find((t) => String(t.id) === v);
                      if (chosen) {
                        setChecklistItems(templateToAnswers(chosen.items));
                      }
                    }
                  }}
                  disabled={!!editingId}
                >
                  <SelectTrigger data-testid="select-campaign-template"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default Campaign Checklist</SelectItem>
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
                <Label className="text-xs">Findings / observations</Label>
                <Textarea
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  rows={3}
                  placeholder="Key findings from the visit"
                  data-testid="textarea-findings"
                />
              </div>
              <div>
                <Label className="text-xs">Follow-up actions</Label>
                <Textarea
                  value={followUpActions}
                  onChange={(e) => setFollowUpActions(e.target.value)}
                  rows={2}
                  placeholder="Agreed follow-up actions"
                  data-testid="textarea-follow-up"
                />
              </div>

              <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full" data-testid="btn-save-visit">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Update Visit" : "Create Visit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filter */}
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

      {/* Visit list */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({displayedVisits.length})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({displayedVisits.filter((v) => v.status === "scheduled").length})
          </TabsTrigger>
          <TabsTrigger value="conducted">
            Conducted ({displayedVisits.filter((v) => v.status === "conducted").length})
          </TabsTrigger>
        </TabsList>

        {["all", "scheduled", "conducted"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div className="grid gap-3 mt-3">
                {displayedVisits
                  .filter((v) => tab === "all" || v.status === tab)
                  .map((v) => (
                    <Card key={v.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {statusIcon(v.status)}
                              <span className="font-medium text-sm">{getFacilityName(v.facilityId)}</span>
                              <Badge variant={v.status === "conducted" ? "default" : "secondary"} className="text-xs">
                                {v.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(v.scheduledDate).toLocaleDateString()}
                              </span>
                              {v.supervisorName && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {v.supervisorName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {v.score != null && (
                              <span className={`text-lg font-bold ${scoreColor(v.score)}`}>
                                {v.score}%
                              </span>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => deleteMutation.mutate(v.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        {v.findings && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{v.findings}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                {displayedVisits.filter((v) => tab === "all" || v.status === tab).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                    <ClipboardCheck className="h-8 w-8 opacity-30" />
                    No {tab === "all" ? "" : tab} campaign supervision visits yet.
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
