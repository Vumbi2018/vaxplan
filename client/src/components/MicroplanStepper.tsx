import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  MapPin,
  AlertTriangle,
  CalendarRange,
  Syringe,
  Megaphone,
  Truck,
  Wallet,
  ClipboardCheck,
  ShieldCheck,
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  ChevronLeft,
  Building2,
  CalendarDays,
  Sparkles,
  Compass,
  PackageCheck,
  Rocket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface MicroplanStepperProps {
  /** Canonical WHO RED + Gavi RED-Q step number (1..12). */
  currentStep: number;
  /** Facility being scoped to. When set, the banner shows its details and
   *  appends ?facility= to every step link. */
  facilityId?: number | null;
  /** Microplan being scoped to. When set, ?microplan= is appended too. */
  microplanId?: number | null;
  /** Session ID for day-plan-scoped routes (Steps 5 / 8). */
  activeSessionId?: number;
}

type StepDef = {
  number: number;
  title: string;
  short: string;
  basePath: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
};

type PhaseDef = {
  id: "plan" | "prepare" | "deliver";
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: number[];
  /** Tailwind colour family — used for the phase chip + the active step glow. */
  accent: {
    text: string;
    bg: string;
    border: string;
    ring: string;
    dot: string;
    activeBg: string;
    activeBorder: string;
    activeShadow: string;
  };
};

const PHASES: PhaseDef[] = [
  {
    id: "plan",
    label: "Plan",
    tagline: "Know your communities",
    icon: Compass,
    steps: [1, 2, 3, 4],
    accent: {
      text: "text-sky-700 dark:text-sky-300",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      ring: "ring-sky-500/30",
      dot: "bg-sky-500",
      activeBg: "bg-sky-600",
      activeBorder: "border-sky-600",
      activeShadow: "shadow-sky-600/40",
    },
  },
  {
    id: "prepare",
    label: "Prepare",
    tagline: "People · supplies · demand · money",
    icon: PackageCheck,
    steps: [5, 6, 7, 8, 9],
    accent: {
      text: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      ring: "ring-violet-500/30",
      dot: "bg-violet-500",
      activeBg: "bg-violet-600",
      activeBorder: "border-violet-600",
      activeShadow: "shadow-violet-600/40",
    },
  },
  {
    id: "deliver",
    label: "Deliver",
    tagline: "Supervise · approve · vaccinate",
    icon: Rocket,
    steps: [10, 11, 12],
    accent: {
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      ring: "ring-emerald-500/30",
      dot: "bg-emerald-500",
      activeBg: "bg-emerald-600",
      activeBorder: "border-emerald-600",
      activeShadow: "shadow-emerald-600/40",
    },
  },
];

function buildSteps(activeSessionId?: number): StepDef[] {
  const dayPlansPath = activeSessionId ? `/sessions/${activeSessionId}/day-plans` : "/sessions";
  return [
    { number: 1,  title: "Situation Analysis",            short: "Situation",   basePath: "/",                     icon: BarChart3,       hint: "Review last year's coverage & gaps" },
    { number: 2,  title: "Catchment & Population",        short: "Catchment",   basePath: "/population",           icon: MapPin,          hint: "List every village with a denominator" },
    { number: 3,  title: "Hard-to-Reach & Equity",        short: "HTR",         basePath: "/htr",                  icon: AlertTriangle,   hint: "Score access & flag missed communities" },
    { number: 4,  title: "Service Delivery Calendar",     short: "Sessions",    basePath: "/sessions",             icon: CalendarRange,   hint: "Schedule 12 months of sessions" },
    { number: 5,  title: "Workforce & Teaming",           short: "Workforce",   basePath: dayPlansPath,            icon: Users,           hint: "Name your vaccinators & recorders" },
    { number: 6,  title: "Vaccine & Cold-Chain",          short: "Vaccines",    basePath: "/vaccines",             icon: Syringe,         hint: "Forecast doses, sized to your cold boxes" },
    { number: 7,  title: "Demand & Mobilization",         short: "Demand",      basePath: "/mobilization",         icon: Megaphone,       hint: "Tell the community when & where" },
    { number: 8,  title: "Logistics & Transport",         short: "Logistics",   basePath: dayPlansPath,            icon: Truck,           hint: "Plan vehicles, fuel & security" },
    { number: 9,  title: "Budget & Funding Source",       short: "Budget",      basePath: "/budget",               icon: Wallet,          hint: "Cost every line, tag the funder" },
    { number: 10, title: "Supportive Supervision",        short: "Supervision", basePath: "/supervision",  icon: ClipboardCheck,  hint: "Schedule a visit per facility per quarter" },
    { number: 11, title: "Approval Cascade",              short: "Approval",    basePath: "/approvals",            icon: ShieldCheck,     hint: "Submit → district → national" },
    { number: 12, title: "Execution & Review",            short: "Execution",   basePath: "/clients",              icon: Activity,        hint: "Record doses & review defaulters" },
  ];
}

function phaseFor(stepNum: number): PhaseDef {
  return PHASES.find((p) => p.steps.includes(stepNum)) ?? PHASES[0];
}

function withContext(basePath: string, facilityId?: number | null, microplanId?: number | null): string {
  const qs = new URLSearchParams();
  if (facilityId != null) qs.set("facility", String(facilityId));
  if (microplanId != null) qs.set("microplan", String(microplanId));
  const sep = basePath.includes("?") ? "&" : "?";
  return qs.toString() ? `${basePath}${sep}${qs.toString()}` : basePath;
}

function statusBadgeTone(status: string | undefined): { label: string; cls: string } {
  const s = (status || "draft").toLowerCase();
  if (s === "approved" || s === "locked") return { label: status!, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
  if (s === "pending" || s === "submitted") return { label: status!, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" };
  if (s === "rejected" || s === "returned") return { label: status!, cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" };
  return { label: status || "draft", cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" };
}

export function MicroplanStepper({ currentStep, facilityId, microplanId, activeSessionId }: MicroplanStepperProps) {
  const [, navigate] = useLocation();
  const [allStepsOpen, setAllStepsOpen] = useState(false);
  const steps = buildSteps(activeSessionId);
  const TOTAL = steps.length;
  const safeStep = Math.min(Math.max(currentStep, 1), TOTAL);
  const current = steps[safeStep - 1];
  const currentPhase = phaseFor(safeStep);
  const percent = Math.round(((safeStep - 1) / (TOTAL - 1)) * 100);
  const stepsDone = safeStep - 1;
  const stepsLeft = TOTAL - safeStep;

  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"], enabled: facilityId != null });
  const { data: microplans = [] } = useQuery<any[]>({ queryKey: ["/api/microplans"], enabled: microplanId != null });
  const facility = facilityId != null ? facilities.find((f: any) => f.id === facilityId) : null;
  const microplan = microplanId != null ? microplans.find((m: any) => m.id === microplanId) : null;
  const statusTone = statusBadgeTone(microplan?.status);

  const CurrentIcon = current.icon;
  const PhaseIcon = currentPhase.icon;
  const prev = safeStep > 1 ? steps[safeStep - 2] : null;
  const next = safeStep < TOTAL ? steps[safeStep] : null;

  const go = (basePath: string) => navigate(withContext(basePath, facilityId, microplanId));

  return (
    <Card
      className="w-full overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50/60 via-background to-background dark:from-indigo-950/30 shadow-md mb-6"
      data-testid="microplan-stepper"
    >
      <CardContent className="p-3 sm:p-4 md:p-5 space-y-3 md:space-y-4">
        {/* Top row: brand line + progress chip */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-indigo-500 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>WHO RED + Gavi RED-Q Workflow</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              12 friendly steps from "who lives here?" to "we vaccinated them."
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground tabular-nums">
              {stepsDone}/{TOTAL} done
            </span>
            <span
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${currentPhase.accent.bg} ${currentPhase.accent.text} ${currentPhase.accent.border}`}
            >
              <PhaseIcon className="h-3 w-3 inline -mt-0.5 mr-1" />
              {currentPhase.label}
            </span>
          </div>
        </div>

        {/* Context bar — facility + microplan details */}
        {(facility || microplan) && (
          <div
            className="rounded-2xl border border-indigo-500/20 bg-white/60 dark:bg-indigo-950/20 px-3 py-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px] sm:text-xs"
            data-testid="microplan-stepper-context"
          >
            {facility && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Facility:</span>
                <span className="font-bold text-foreground truncate max-w-[180px] sm:max-w-[260px]" data-testid="ctx-facility-name">
                  {facility.name}
                </span>
                {facility.code && <span className="text-muted-foreground font-mono">· {facility.code}</span>}
              </div>
            )}
            {microplan && (
              <div className="flex items-center gap-1.5 min-w-0">
                <CalendarDays className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Microplan:</span>
                <span className="font-bold text-foreground truncate max-w-[180px] sm:max-w-[260px]" data-testid="ctx-microplan-name">
                  {microplan.name}
                </span>
                <span className="text-muted-foreground font-mono">· Q{microplan.quarter} {microplan.year}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full ${statusTone.cls}`}
                  data-testid="ctx-microplan-status"
                >
                  {statusTone.label}
                </Badge>
              </div>
            )}
            {microplan?.targetPopulation != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Target:</span>
                <span className="font-bold text-foreground font-mono">{microplan.targetPopulation.toLocaleString?.() ?? microplan.targetPopulation}</span>
              </div>
            )}
          </div>
        )}

        {/* HERO active step — large, friendly, with previous / next */}
        <div className={`relative rounded-2xl border-2 ${currentPhase.accent.activeBorder} ${currentPhase.accent.bg} p-3 sm:p-4 overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 pointer-events-none" />
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl ${currentPhase.accent.activeBg} text-white flex flex-col items-center justify-center shadow-lg ${currentPhase.accent.activeShadow}`}
            >
              <CurrentIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[9px] font-bold mt-0.5 tabular-nums">{safeStep}/{TOTAL}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>You are here</span>
                <span className="text-muted-foreground/40">·</span>
                <span className={currentPhase.accent.text}>{currentPhase.label}</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold leading-tight truncate" data-testid="stepper-active-title">
                Step {safeStep}: {current.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{current.hint}</p>
            </div>
            {/* Prev/Next on tablet+ */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!prev}
                onClick={() => prev && go(prev.basePath)}
                className="h-8 px-2 rounded-full"
                data-testid="stepper-prev"
                title={prev ? `Step ${prev.number}: ${prev.title}` : "First step"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!next}
                onClick={() => next && go(next.basePath)}
                className={`h-8 px-3 rounded-full text-white ${currentPhase.accent.activeBg} hover:opacity-90`}
                data-testid="stepper-next"
                title={next ? `Step ${next.number}: ${next.title}` : "Last step"}
              >
                <span className="text-[11px] font-bold mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile prev/next */}
          <div className="sm:hidden mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!prev}
              onClick={() => prev && go(prev.basePath)}
              className="h-9 rounded-full text-[11px]"
              data-testid="stepper-prev-mobile"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              {prev ? `Step ${prev.number}` : "Start"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!next}
              onClick={() => next && go(next.basePath)}
              className={`h-9 rounded-full text-[11px] text-white ${currentPhase.accent.activeBg} hover:opacity-90`}
              data-testid="stepper-next-mobile"
            >
              {next ? `Step ${next.number}` : "Done"}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={percent} className="h-1.5 rounded-full" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {stepsLeft === 0 ? "Final step — let's finish strong." : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} to go`}
            </p>
          </div>
        </div>

        {/* Phase rail — visible md+; on smaller screens it's tucked into the "show all steps" panel */}
        <div className="hidden md:block space-y-2">
          {PHASES.map((phase) => {
            const PIcon = phase.icon;
            return (
              <div key={phase.id} className="flex items-center gap-3">
                <div className={`w-32 shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${phase.accent.text}`}>
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center ${phase.accent.bg} border ${phase.accent.border}`}>
                    <PIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{phase.label}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto custom-scrollbar pb-1">
                  {phase.steps.map((stepNum, idx) => {
                    const s = steps[stepNum - 1];
                    const isDone = s.number < safeStep;
                    const isActive = s.number === safeStep;
                    const SIcon = s.icon;
                    return (
                      <div key={s.number} className="flex items-center min-w-0">
                        <button
                          type="button"
                          onClick={() => go(s.basePath)}
                          data-testid={`stepper-step-${s.number}`}
                          title={`${s.title} — ${s.hint}`}
                          className={`group flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-all duration-200 outline-none focus-visible:ring-2 ${phase.accent.ring} ${
                            isActive
                              ? `${phase.accent.activeBg} ${phase.accent.activeBorder} text-white shadow-md ${phase.accent.activeShadow}`
                              : isDone
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                : "bg-background/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isActive
                                ? "bg-white/20"
                                : isDone
                                  ? "bg-emerald-500/20"
                                  : "bg-muted/60"
                            }`}
                          >
                            {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : <SIcon className="h-3 w-3" />}
                          </span>
                          <span className="text-[11px] font-semibold whitespace-nowrap">{s.number}. {s.short}</span>
                        </button>
                        {idx < phase.steps.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile / tablet: "show all steps" toggle expands a friendly vertical list */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setAllStepsOpen((o) => !o)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 py-2 rounded-xl hover:bg-indigo-500/5 transition-colors"
            data-testid="stepper-toggle-all"
          >
            {allStepsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {allStepsOpen ? "Hide all 12 steps" : "Show all 12 steps"}
          </button>
          {allStepsOpen && (
            <div className="mt-2 space-y-3">
              {PHASES.map((phase) => {
                const PIcon = phase.icon;
                return (
                  <div key={phase.id} className={`rounded-2xl border ${phase.accent.border} ${phase.accent.bg} p-2.5`}>
                    <div className={`flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider ${phase.accent.text}`}>
                      <PIcon className="h-3.5 w-3.5" />
                      <span>{phase.label}</span>
                      <span className="text-muted-foreground/80 font-medium normal-case tracking-normal">— {phase.tagline}</span>
                    </div>
                    <div className="space-y-1.5">
                      {phase.steps.map((stepNum) => {
                        const s = steps[stepNum - 1];
                        const isDone = s.number < safeStep;
                        const isActive = s.number === safeStep;
                        const SIcon = s.icon;
                        return (
                          <button
                            type="button"
                            key={s.number}
                            onClick={() => go(s.basePath)}
                            data-testid={`stepper-step-mobile-${s.number}`}
                            className={`w-full text-left flex items-center gap-2.5 rounded-xl px-2.5 py-2 border transition-colors ${
                              isActive
                                ? `${phase.accent.activeBg} ${phase.accent.activeBorder} text-white`
                                : isDone
                                  ? "bg-emerald-500/10 border-emerald-500/30"
                                  : "bg-background/70 border-border"
                            }`}
                          >
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                isActive ? "bg-white/20" : isDone ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <SIcon className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className={`text-[12px] font-bold leading-tight ${isActive ? "text-white" : "text-foreground"}`}>
                                {s.number}. {s.title}
                              </div>
                              <div className={`text-[10px] truncate ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                                {s.hint}
                              </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? "text-white/80" : "text-muted-foreground/50"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
