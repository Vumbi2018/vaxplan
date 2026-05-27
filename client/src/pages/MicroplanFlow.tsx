import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load the Plan-phase module pages so they only load when their step is open.
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const PopulationPage = lazy(() => import("@/pages/Population"));
const HardToReachPage = lazy(() => import("@/pages/HardToReach"));
const SessionPlanningPage = lazy(() => import("@/pages/SessionPlanning"));
const SupervisionPage = lazy(() => import("@/pages/Supervision"));

// Which step renders which module inline (Plan phase only, per user brief).
const INLINE_MODULES: Record<number, React.ComponentType<any>> = {
  1: DashboardPage,
  2: PopulationPage,
  3: HardToReachPage,
  4: SessionPlanningPage,
  10: SupervisionPage,
};
import {
  PHASES,
  buildMicroplanSteps,
  phaseFor,
  withContext,
  type MicroplanStepDef,
  type PhaseId,
} from "@/lib/microplanSteps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Check,
  Hand,
  BookOpen,
  Target,
} from "lucide-react";

type StepStatus = "done" | "todo" | "pending";
type StepProgress = { status: StepStatus; detail: string; pct?: number };

const ACTIVE_ANTIGENS = ["BCG", "OPV", "PENTA", "PCV", "IPV", "MR", "ROTA"];

function statusToneBg(status: StepStatus) {
  if (status === "done") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (status === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
}

function statusIcon(status: StepStatus) {
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "pending") return <Clock className="h-3.5 w-3.5" />;
  return <Circle className="h-3.5 w-3.5" />;
}

function statusLabel(status: StepStatus) {
  if (status === "done") return "Done";
  if (status === "pending") return "Coming soon";
  return "To do";
}

function microplanStatusTone(status?: string) {
  const s = (status || "draft").toLowerCase();
  if (s === "approved" || s === "locked")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (s === "pending" || s === "submitted")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (s === "rejected" || s === "returned")
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
}

export default function MicroplanFlow() {
  const [location, navigate] = useLocation();

  // --- URL params for facility + microplan + step ---
  const params = useMemo(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search), [location]);
  const facilityIdParam = params.get("facility");
  const microplanIdParam = params.get("microplan");
  const stepParam = params.get("step");

  const [facilityId, setFacilityId] = useState<number | null>(
    facilityIdParam && !Number.isNaN(Number(facilityIdParam)) ? Number(facilityIdParam) : null,
  );
  const [microplanId, setMicroplanId] = useState<number | null>(
    microplanIdParam && !Number.isNaN(Number(microplanIdParam)) ? Number(microplanIdParam) : null,
  );
  const initialStep = stepParam && !Number.isNaN(Number(stepParam))
    ? Math.min(Math.max(Number(stepParam), 1), 12)
    : 1;
  const [activeStep, setActiveStep] = useState<number>(initialStep);

  // Sync URL on changes so deeplinks stay shareable.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (facilityId != null) qs.set("facility", String(facilityId));
    if (microplanId != null) qs.set("microplan", String(microplanId));
    qs.set("step", String(activeStep));
    const next = `/flow?${qs.toString()}`;
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [facilityId, microplanId, activeStep]);

  // --- Data ---
  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"] });
  const { data: microplans = [] } = useQuery<any[]>({ queryKey: ["/api/microplans"] });
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/sessions"] });
  const { data: villages = [] } = useQuery<any[]>({ queryKey: ["/api/villages"] });
  const { data: mobilization = [] } = useQuery<any[]>({ queryKey: ["/api/mobilization"] });
  const { data: budgetItems = [] } = useQuery<any[]>({ queryKey: ["/api/budget-items"] });
  const { data: populationRows = [] } = useQuery<any[]>({ queryKey: ["/api/population"] });
  const { data: htrScores = [] } = useQuery<any[]>({ queryKey: ["/api/htr-scores"] });

  const facility = facilityId != null ? facilities.find((f: any) => f.id === facilityId) : null;
  const microplan = microplanId != null ? microplans.find((m: any) => m.id === microplanId) : null;

  // Auto-pick a sensible default microplan once data lands and the user hasn't chosen.
  useEffect(() => {
    if (microplanId == null && microplans.length > 0) {
      const now = new Date();
      const cy = now.getFullYear();
      const cq = Math.ceil((now.getMonth() + 1) / 3);
      const candidate =
        microplans.find((m: any) => m.year === cy && m.quarter === cq && (facilityId == null || m.facilityId === facilityId)) ??
        microplans.find((m: any) => facilityId == null || m.facilityId === facilityId) ??
        microplans[0];
      if (candidate) {
        setMicroplanId(candidate.id);
        if (facilityId == null && candidate.facilityId != null) setFacilityId(candidate.facilityId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microplans]);

  // --- Per-step progress, scoped to the chosen microplan (and its facility/quarter) when applicable ---
  const stepProgress: Record<number, StepProgress> = useMemo(() => {
    const now = new Date();
    // When a microplan is selected, anchor scope to that plan's facility, year, quarter.
    // Otherwise fall back to the selected facility (if any) and the current calendar quarter.
    const effFacilityId: number | null = microplan?.facilityId != null
      ? Number(microplan.facilityId)
      : facilityId;
    const cy: number = microplan?.year ?? now.getFullYear();
    const cq: number = microplan?.quarter ?? Math.ceil((now.getMonth() + 1) / 3);
    const scopeNote = microplan ? `for ${microplan.name} · Q${cq} ${cy}` : `for Q${cq} ${cy}`;

    const scopedVillages = effFacilityId == null
      ? villages
      : villages.filter((v: any) => Number(v.assignedFacilityId) === effFacilityId || Number(v.facilityId) === effFacilityId);
    const scopedSessions = sessions.filter((s: any) => effFacilityId == null || Number(s.facilityId) === effFacilityId);
    const scopedMicroplans = microplans.filter((m: any) => effFacilityId == null || Number(m.facilityId) === effFacilityId);
    const scopedMob = mobilization.filter((m: any) => effFacilityId == null || Number(m.facilityId) === effFacilityId);
    const scopedBudget = budgetItems.filter((b: any) => effFacilityId == null || Number(b.facilityId) === effFacilityId);

    // 1 — Situation analysis: any prior-year microplan exists.
    const haveHistory = scopedMicroplans.some((m: any) => m.year && m.year < cy);

    // 2 — Catchment & population.
    const villageIdsWithSource = new Set(
      populationRows
        .filter((p: any) => p.source && p.villageId != null)
        .filter((p: any) => facilityId == null || Number(p.facilityId) === facilityId || scopedVillages.some((v: any) => v.id === p.villageId))
        .map((p: any) => p.villageId),
    );
    const villagesCovered = scopedVillages.filter((v: any) => villageIdsWithSource.has(v.id));

    // 3 — HTR.
    const htrVillageIds = new Set(htrScores.map((h: any) => h.villageId));
    const villageWithHtr = scopedVillages.filter(
      (v: any) => htrVillageIds.has(v.id) || v.terrainDifficulty != null || v.isHardToReach === true,
    );

    // 4 — Sessions covering the next 4 quarters.
    const requiredQuarters: string[] = [];
    for (let i = 0; i < 4; i++) {
      const q = ((cq - 1 + i) % 4) + 1;
      const y = cy + Math.floor((cq - 1 + i) / 4);
      requiredQuarters.push(`${y}-Q${q}`);
    }
    const sessionQuarters = new Set(scopedSessions.map((s: any) => `${s.year}-Q${s.quarter}`));
    const coveredQuarters = requiredQuarters.filter((q) => sessionQuarters.has(q));
    const currentMicroplans = scopedMicroplans.filter((m: any) => m.year === cy && m.quarter === cq);

    // 6 — Vaccine forecast for current quarter.
    const quarterSessions = scopedSessions.filter((s: any) => s.year === cy && s.quarter === cq);
    const antigensSeen = new Set<string>();
    for (const s of quarterSessions) {
      const va = s.vaccineAdjustments;
      if (va && typeof va === "object") {
        for (const key of Object.keys(va)) {
          const u = key.toUpperCase();
          for (const a of ACTIVE_ANTIGENS) if (u.includes(a)) antigensSeen.add(a);
        }
      }
    }

    // 7 — Mobilization.
    const facilitiesWithSessions = new Set(quarterSessions.map((s: any) => s.facilityId));
    const quarterMob = scopedMob.filter((m: any) => {
      const d = m.scheduledDate ? new Date(m.scheduledDate) : null;
      if (!d) return false;
      const mq = Math.ceil((d.getMonth() + 1) / 3);
      return d.getFullYear() === cy && mq === cq;
    });
    const facilitiesWithMob = new Set(quarterMob.map((m: any) => m.facilityId));
    const facilitiesCovered = Array.from(facilitiesWithSessions).filter((fid) => facilitiesWithMob.has(fid));

    // 9 — Budget.
    const quarterBudget = scopedBudget.filter((b: any) => b.year === cy && b.quarter === cq);
    const cats: string[] = quarterBudget.map((b: any) => (b.category || "").toString().toLowerCase());
    const step9Done = ["personnel", "transport", "supplies"].every((c) => cats.some((k) => k.includes(c)));

    // 11 — Approval.
    const step11Done = currentMicroplans.some((m: any) => m.status === "approved" || m.status === "locked");

    // 12 — Execution.
    const sessionsConducted = quarterSessions.filter((s: any) => s.status === "conducted").length;

    return {
      1: { status: haveHistory ? "done" : "todo",
           detail: haveHistory ? "Prior-year microplan exists — baseline available" : "No prior-year microplan to review",
           pct: haveHistory ? 100 : 0 },
      2: { status: scopedVillages.length > 0 && villagesCovered.length === scopedVillages.length ? "done" : "todo",
           detail: scopedVillages.length === 0 ? "No villages in catchment" : `${villagesCovered.length} / ${scopedVillages.length} villages have a population row with a source`,
           pct: scopedVillages.length === 0 ? 0 : Math.round((villagesCovered.length / scopedVillages.length) * 100) },
      3: { status: scopedVillages.length > 0 && villageWithHtr.length === scopedVillages.length ? "done" : "todo",
           detail: scopedVillages.length === 0 ? "No villages to profile" : `${villageWithHtr.length} / ${scopedVillages.length} villages have an HTR / access tag`,
           pct: scopedVillages.length === 0 ? 0 : Math.round((villageWithHtr.length / scopedVillages.length) * 100) },
      4: { status: currentMicroplans.length > 0 && coveredQuarters.length === requiredQuarters.length ? "done" : "todo",
           detail: currentMicroplans.length === 0 ? `No microplan ${scopeNote}` : `Sessions cover ${coveredQuarters.length} / 4 of the next four quarters ${scopeNote}`,
           pct: Math.round((coveredQuarters.length / requiredQuarters.length) * 100) },
      5: { status: "pending",
           detail: "Staffing roster ships with the workforce module",
           pct: 0 },
      6: { status: quarterSessions.length > 0 && ACTIVE_ANTIGENS.every((a) => antigensSeen.has(a)) ? "done" : "todo",
           detail: quarterSessions.length === 0 ? `No sessions ${scopeNote} to forecast against` : `${antigensSeen.size} / ${ACTIVE_ANTIGENS.length} active antigens have a forecast ${scopeNote}`,
           pct: Math.round((antigensSeen.size / ACTIVE_ANTIGENS.length) * 100) },
      7: { status: facilitiesWithSessions.size > 0 && facilitiesCovered.length === facilitiesWithSessions.size ? "done" : "todo",
           detail: facilitiesWithSessions.size === 0 ? `No sessions to mobilize ${scopeNote}` : `${facilitiesCovered.length} / ${facilitiesWithSessions.size} facilities with sessions have a mobilization activity ${scopeNote}`,
           pct: facilitiesWithSessions.size === 0 ? 0 : Math.round((facilitiesCovered.length / facilitiesWithSessions.size) * 100) },
      8: { status: "pending", detail: "Transport rollup ships with the session-day module", pct: 0 },
      9: { status: step9Done ? "done" : "todo",
           detail: step9Done ? `Personnel + Transport + Supplies budgeted ${scopeNote}` : `Missing one of Personnel / Transport / Supplies ${scopeNote}`,
           pct: ["personnel", "transport", "supplies"].filter((c) => cats.some((k) => k.includes(c))).length * 33 },
      10: { status: "pending", detail: "Supervision module is on the roadmap", pct: 0 },
      11: { status: step11Done ? "done" : "todo",
            detail: step11Done ? `Microplan approved (or locked) ${scopeNote}` : `Awaiting submission / approval ${scopeNote}`,
            pct: step11Done ? 100 : 0 },
      12: { status: "pending",
            detail: `${sessionsConducted} session${sessionsConducted === 1 ? "" : "s"} marked conducted ${scopeNote}; defaulter / zero-dose views pending`,
            pct: 0 },
    };
  }, [villages, sessions, microplans, mobilization, budgetItems, populationRows, htrScores, facilityId, microplan]);

  // Resolve a sensible session id so steps 5 & 8 can deep-link straight to Day Plans.
  // Prefer a session inside the selected microplan's facility + quarter; fallback to the most recent.
  const activeSessionId: number | null = useMemo(() => {
    const facScope = microplan?.facilityId ?? facilityId;
    const yr = microplan?.year ?? new Date().getFullYear();
    const qt = microplan?.quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);
    const inScope = sessions.filter((s: any) =>
      (facScope == null || Number(s.facilityId) === Number(facScope)) &&
      s.year === yr && s.quarter === qt,
    );
    const pick = inScope[0] ?? sessions.find((s: any) => facScope == null || Number(s.facilityId) === Number(facScope)) ?? null;
    return pick ? Number(pick.id) : null;
  }, [sessions, microplan, facilityId]);

  // --- Step list + summary ---
  const steps = useMemo(() => buildMicroplanSteps(activeSessionId), [activeSessionId]);
  const doneCount = useMemo(() => steps.filter((s) => stepProgress[s.number]?.status === "done").length, [steps, stepProgress]);
  const pendingCount = useMemo(() => steps.filter((s) => stepProgress[s.number]?.status === "pending").length, [steps, stepProgress]);
  const overallPct = Math.round((doneCount / steps.length) * 100);

  const current = steps[activeStep - 1];
  const currentPhase = phaseFor(activeStep);
  const currentProgress = stepProgress[activeStep];
  const prev = activeStep > 1 ? steps[activeStep - 2] : null;
  const next = activeStep < steps.length ? steps[activeStep] : null;

  const goModule = (step: MicroplanStepDef) => {
    navigate(withContext(step.basePath, facilityId, microplanId));
  };

  const setStep = (n: number) => {
    setActiveStep(Math.min(Math.max(n, 1), steps.length));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter microplan options by selected facility for a cleaner picker.
  const microplanOptions = useMemo(
    () => microplans.filter((m: any) => facilityId == null || Number(m.facilityId) === facilityId),
    [microplans, facilityId],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/40 via-background to-background dark:from-indigo-950/20">
      <div className="max-w-7xl mx-auto p-3 sm:p-5 md:p-6 space-y-4 md:space-y-5">
        {/* ============ HERO ============ */}
        <Card className="overflow-hidden rounded-3xl border border-indigo-500/20 shadow-md">
          <div className={`bg-gradient-to-br ${currentPhase.accent.softGradient} relative`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-indigo-500 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Microplan Flow · WHO RED + Gavi RED-Q</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1 leading-tight">
                    Plan your next quarter in 12 friendly steps
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                    From "who lives here?" to "we vaccinated them" — one calm flow, with your facility and plan kept in context the whole way.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Overall progress
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">{doneCount}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/ {steps.length} done</span>
                  </div>
                  <Progress value={overallPct} className="h-1.5 rounded-full w-28 sm:w-36" />
                  {pendingCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{pendingCount} step{pendingCount === 1 ? "" : "s"} coming soon</span>
                  )}
                </div>
              </div>

              {/* Pickers + context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Facility
                  </label>
                  <Select
                    value={facilityId != null ? String(facilityId) : ""}
                    onValueChange={(v) => {
                      const id = v ? Number(v) : null;
                      setFacilityId(id);
                      if (microplanId != null) {
                        const mp = microplans.find((m: any) => m.id === microplanId);
                        if (mp && id != null && Number(mp.facilityId) !== id) setMicroplanId(null);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl bg-background" data-testid="select-facility">
                      <SelectValue placeholder="Choose a health facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((f: any) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}{f.code ? ` · ${f.code}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Microplan
                  </label>
                  <Select
                    value={microplanId != null ? String(microplanId) : ""}
                    onValueChange={(v) => setMicroplanId(v ? Number(v) : null)}
                  >
                    <SelectTrigger className="h-9 rounded-xl bg-background" data-testid="select-microplan">
                      <SelectValue placeholder={microplanOptions.length === 0 ? "No microplans yet" : "Choose a microplan"} />
                    </SelectTrigger>
                    <SelectContent>
                      {microplanOptions.map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} · Q{m.quarter} {m.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active context strip */}
              {(facility || microplan) && (
                <div className="mt-3 rounded-2xl border border-indigo-500/20 bg-white/70 dark:bg-indigo-950/30 px-3 py-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px] sm:text-xs">
                  {facility && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-foreground truncate max-w-[200px]" data-testid="ctx-facility-name">{facility.name}</span>
                      {facility.code && <span className="text-muted-foreground font-mono">· {facility.code}</span>}
                    </div>
                  )}
                  {microplan && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CalendarDays className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-foreground truncate max-w-[200px]" data-testid="ctx-microplan-name">{microplan.name}</span>
                      <span className="text-muted-foreground font-mono">· Q{microplan.quarter} {microplan.year}</span>
                      <Badge variant="outline" className={`text-[9px] font-bold uppercase px-1.5 py-0 rounded-full ${microplanStatusTone(microplan.status)}`}>
                        {microplan.status || "draft"}
                      </Badge>
                    </div>
                  )}
                  {microplan?.targetPopulation != null && (
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-muted-foreground uppercase tracking-wider font-semibold">Target:</span>
                      <span className="font-bold text-foreground font-mono">
                        {Number(microplan.targetPopulation).toLocaleString?.() ?? microplan.targetPopulation}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* ============ PHASE RAIL ============ */}
        <Card className="rounded-3xl border bg-background/80 backdrop-blur shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {PHASES.map((phase) => {
                const PIcon = phase.icon;
                const phaseSteps = phase.steps.map((n) => steps[n - 1]);
                const phaseDone = phaseSteps.filter((s) => stepProgress[s.number]?.status === "done").length;
                const isActivePhase = phase.id === currentPhase.id;
                return (
                  <div
                    key={phase.id}
                    className={`rounded-2xl border p-3 transition-all ${
                      isActivePhase
                        ? `${phase.accent.border} ${phase.accent.bg} shadow-md ring-1 ${phase.accent.ring}`
                        : "border-border bg-background/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ${phase.accent.activeBg} text-white shadow ${phase.accent.activeShadow}`}>
                          <PIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-wider ${phase.accent.text}`}>{phase.label}</div>
                          <div className="text-[10px] text-muted-foreground">{phase.tagline}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                        {phaseDone}/{phaseSteps.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {phaseSteps.map((s) => {
                        const sStatus = stepProgress[s.number]?.status ?? "todo";
                        const isActive = s.number === activeStep;
                        const SIcon = s.icon;
                        return (
                          <button
                            type="button"
                            key={s.number}
                            onClick={() => setStep(s.number)}
                            data-testid={`phase-step-${s.number}`}
                            title={`${s.title} — ${s.hint}`}
                            className={`group flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border transition-all outline-none focus-visible:ring-2 ${phase.accent.ring} ${
                              isActive
                                ? `${phase.accent.activeBg} ${phase.accent.activeBorder} text-white shadow-md ${phase.accent.activeShadow}`
                                : sStatus === "done"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isActive ? "bg-white/20" : sStatus === "done" ? "bg-emerald-500/20" : "bg-muted/60"
                            }`}>
                              {sStatus === "done" ? <Check className="h-3 w-3 stroke-[3]" /> : <SIcon className="h-3 w-3" />}
                            </span>
                            <span className="text-[10px] font-bold whitespace-nowrap">{s.number}. {s.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ============ ACTIVE STEP DEEP CARD ============ */}
        <Card className={`rounded-3xl border-2 ${currentPhase.accent.activeBorder} ${currentPhase.accent.bg} shadow-lg overflow-hidden`}>
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Step header */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl ${currentPhase.accent.activeBg} text-white flex flex-col items-center justify-center shadow-lg ${currentPhase.accent.activeShadow}`}>
                <current.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-[10px] font-bold mt-0.5 tabular-nums">{activeStep}/{steps.length}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-wrap">
                  <span className={currentPhase.accent.text}>{currentPhase.label}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{current.redComponent}</span>
                  {current.redQLayer && <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{current.redQLayer}</span>
                  </>}
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold leading-tight mt-0.5" data-testid="flow-active-title">
                  Step {activeStep}: {current.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{current.hint}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${statusToneBg(currentProgress?.status ?? "todo")}`} data-testid="flow-active-status">
                <span className="mr-1">{statusIcon(currentProgress?.status ?? "todo")}</span>
                {statusLabel(currentProgress?.status ?? "todo")}
              </Badge>
            </div>

            {/* Live progress widget */}
            <div className="rounded-2xl bg-background/70 border border-border/60 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Hand className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">Live progress</span>
                </div>
                {currentProgress?.pct != null && (
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{currentProgress.pct}%</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-foreground/80 mb-2">{currentProgress?.detail || "—"}</p>
              {currentProgress?.pct != null && (
                <Progress value={currentProgress.pct} className="h-2 rounded-full" />
              )}
            </div>

            {/* What to do + outputs side-by-side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-2xl bg-background/70 border border-border/60 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs sm:text-sm font-bold">What to do</span>
                </div>
                <ul className="space-y-1.5">
                  {current.whatToDo.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${currentPhase.accent.dot} shrink-0`} />
                      <span className="text-foreground/85">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-background/70 border border-border/60 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-bold">Looks like</span>
                </div>
                <ul className="space-y-1.5">
                  {current.outputs.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-foreground/85">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <Button
                type="button"
                size="lg"
                onClick={() => goModule(current)}
                className={`flex-1 sm:flex-none rounded-2xl h-12 px-5 text-white ${currentPhase.accent.activeBg} hover:opacity-90 shadow-md ${currentPhase.accent.activeShadow}`}
                data-testid="flow-open-module"
              >
                {current.moduleLabel}
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={!prev}
                  onClick={() => prev && setStep(prev.number)}
                  className="rounded-2xl h-12 px-4 flex-1 sm:flex-none"
                  data-testid="flow-prev"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Step {prev?.number ?? "—"}</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={!next}
                  onClick={() => next && setStep(next.number)}
                  className={`rounded-2xl h-12 px-4 flex-1 sm:flex-none text-white ${currentPhase.accent.activeBg} hover:opacity-90`}
                  data-testid="flow-next"
                >
                  <span className="hidden sm:inline">Step {next?.number ?? "—"}</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ INLINE LIVE MODULE ============ */}
        {INLINE_MODULES[activeStep] && (
          <Card className="rounded-3xl border bg-background/80 backdrop-blur shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className={`flex items-center gap-2 px-4 sm:px-5 py-3 border-b ${currentPhase.accent.bg} ${currentPhase.accent.border}`}>
                <current.icon className={`h-4 w-4 ${currentPhase.accent.text}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${currentPhase.accent.text}`}>
                  Live workspace
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {current.moduleLabel} — your edits save to the same tables you'd use on the full page
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 rounded-full text-[11px]"
                  onClick={() => goModule(current)}
                  data-testid="flow-open-full"
                >
                  Open full page
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="microplan-flow-embed">
                <Suspense
                  fallback={
                    <div className="p-6 space-y-3">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  }
                >
                  {(() => {
                    const Embedded = INLINE_MODULES[activeStep];
                    return <Embedded key={`embed-${activeStep}-${facilityId ?? "none"}-${microplanId ?? "none"}`} />;
                  })()}
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ ALL STEPS GRID — quick jump ============ */}
        <Card className="rounded-3xl border bg-background/80 backdrop-blur shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">All 12 steps at a glance</h3>
              <span className="text-[11px] text-muted-foreground">Tap a step to jump there</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {steps.map((s) => {
                const sProg = stepProgress[s.number];
                const isActive = s.number === activeStep;
                const phase = phaseFor(s.number);
                const SIcon = s.icon;
                return (
                  <button
                    type="button"
                    key={s.number}
                    onClick={() => setStep(s.number)}
                    data-testid={`grid-step-${s.number}`}
                    className={`text-left rounded-2xl border p-2.5 transition-all outline-none focus-visible:ring-2 ${phase.accent.ring} ${
                      isActive
                        ? `${phase.accent.activeBorder} ${phase.accent.bg} shadow-md`
                        : "border-border bg-background hover:border-indigo-300/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? `${phase.accent.activeBg} text-white` :
                        sProg?.status === "done" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {sProg?.status === "done" ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <SIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${phase.accent.text}`}>
                        {s.number}
                      </span>
                    </div>
                    <div className="text-xs font-bold leading-tight truncate">{s.short}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{s.hint}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
