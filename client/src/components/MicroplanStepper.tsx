import { Link, useLocation } from "wouter";
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
  Building2,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MicroplanStepperProps {
  /**
   * Canonical WHO RED + Gavi RED-Q step number (1..12) the user is currently on.
   * See attached_assets/Pasted--Immunization-Microplanning-Workflow-WHO-RED-Gavi-RED-Q*.txt.
   */
  currentStep: number;
  /** Facility being scoped to. When set, the stepper renders a context bar and
   *  appends ?facility= to every step link so the target module preselects it. */
  facilityId?: number | null;
  /** Microplan being scoped to. When set, ?microplan= is appended to every link. */
  microplanId?: number | null;
  /** Session ID for day-plan-scoped routes (Steps 5 / 8). */
  activeSessionId?: number;
}

// Canonical 12-step sequence (see RedRedQGuidedWorkflow + reference doc).
type StepDef = {
  number: number;
  title: string;
  short: string;
  basePath: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

function buildSteps(activeSessionId?: number): StepDef[] {
  const dayPlansPath = activeSessionId ? `/sessions/${activeSessionId}/day-plans` : "/sessions";
  return [
    { number: 1, title: "Situation Analysis", short: "Situation", basePath: "/", icon: BarChart3, description: "Coverage & dropout review" },
    { number: 2, title: "Catchment & Population", short: "Catchment", basePath: "/population", icon: MapPin, description: "Denominators per community" },
    { number: 3, title: "HTR & Equity", short: "HTR", basePath: "/htr", icon: AlertTriangle, description: "Hard-to-reach scoring" },
    { number: 4, title: "Service Delivery & Calendar", short: "Sessions", basePath: "/sessions", icon: CalendarRange, description: "12-month session calendar" },
    { number: 5, title: "Workforce & Teaming", short: "Workforce", basePath: dayPlansPath, icon: Users, description: "Vaccinator / recorder roster" },
    { number: 6, title: "Vaccine & Cold-Chain", short: "Vaccines", basePath: "/vaccines", icon: Syringe, description: "Forecast & cold-chain sizing" },
    { number: 7, title: "Demand & Mobilization", short: "Demand", basePath: "/mobilization", icon: Megaphone, description: "Community outreach" },
    { number: 8, title: "Logistics & Transport", short: "Logistics", basePath: dayPlansPath, icon: Truck, description: "Per session-day transport" },
    { number: 9, title: "Budget & Funding Source", short: "Budget", basePath: "/budget", icon: Wallet, description: "Cost lines tagged by funder" },
    { number: 10, title: "Supportive Supervision", short: "Supervision", basePath: "/standards-alignment", icon: ClipboardCheck, description: "Quarterly visits & checklist" },
    { number: 11, title: "Approval Cascade", short: "Approval", basePath: "/approvals", icon: ShieldCheck, description: "Submit → district → national" },
    { number: 12, title: "Execution & Review", short: "Execution", basePath: "/clients", icon: Activity, description: "Doses given & defaulters" },
  ];
}

function withContext(basePath: string, facilityId?: number | null, microplanId?: number | null): string {
  const qs = new URLSearchParams();
  if (facilityId != null) qs.set("facility", String(facilityId));
  if (microplanId != null) qs.set("microplan", String(microplanId));
  const sep = basePath.includes("?") ? "&" : "?";
  return qs.toString() ? `${basePath}${sep}${qs.toString()}` : basePath;
}

export function MicroplanStepper({ currentStep, facilityId, microplanId, activeSessionId }: MicroplanStepperProps) {
  const [, navigate] = useLocation();
  const steps = buildSteps(activeSessionId);
  const TOTAL = steps.length;

  // Fetch facility + microplan summaries so the context bar can show real names.
  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    enabled: facilityId != null,
  });
  const { data: microplans = [] } = useQuery<any[]>({
    queryKey: ["/api/microplans"],
    enabled: microplanId != null,
  });
  const facility = facilityId != null ? facilities.find((f: any) => f.id === facilityId) : null;
  const microplan = microplanId != null ? microplans.find((m: any) => m.id === microplanId) : null;

  const currentDef = steps[currentStep - 1];

  return (
    <Card className="w-full shadow-lg border border-white/10 bg-background/85 backdrop-blur-md overflow-hidden rounded-2xl mb-6" data-testid="microplan-stepper">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">
                WHO RED + Gavi RED-Q Standard Workflow
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Follow the 12-step canonical sequence to construct a robust, georeferenced facility microplan.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/10">
                Step {currentStep} of {TOTAL}: {currentDef?.title || ""}
              </span>
            </div>
          </div>

          {/* Context bar: facility + microplan details when scoped. */}
          {(facility || microplan) && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 px-3 py-2 flex items-center gap-4 flex-wrap text-[11px]" data-testid="microplan-stepper-context">
              {facility && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Facility:</span>
                  <span className="font-bold text-foreground truncate" data-testid="ctx-facility-name">{facility.name}</span>
                  {facility.code && <span className="text-muted-foreground font-mono">· {facility.code}</span>}
                </div>
              )}
              {microplan && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <CalendarDays className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Microplan:</span>
                  <span className="font-bold text-foreground truncate" data-testid="ctx-microplan-name">{microplan.name}</span>
                  <span className="text-muted-foreground font-mono">
                    · Q{microplan.quarter} {microplan.year}
                  </span>
                  <Badge
                    variant={microplan.status === "approved" || microplan.status === "locked" ? "default" : microplan.status === "pending" ? "secondary" : "outline"}
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full"
                    data-testid="ctx-microplan-status"
                  >
                    {microplan.status || "draft"}
                  </Badge>
                </div>
              )}
              {microplan?.targetPopulation != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Target:</span>
                  <span className="font-bold text-foreground font-mono">{microplan.targetPopulation}</span>
                </div>
              )}
            </div>
          )}

          {/* Stepper bar — 12 steps, scrollable on narrow screens. */}
          <div className="flex items-center w-full overflow-x-auto custom-scrollbar py-2 gap-1.5 md:gap-2 select-none">
            {steps.map((step) => {
              const isCompleted = step.number < currentStep;
              const isActive = step.number === currentStep;
              const Icon = step.icon;
              const href = withContext(step.basePath, facilityId, microplanId);

              return (
                <div key={step.number} className="flex items-center min-w-[120px] md:min-w-[100px] flex-1 group">
                  <button
                    type="button"
                    onClick={() => navigate(href)}
                    data-testid={`stepper-step-${step.number}`}
                    className="flex flex-col items-center text-center flex-1 gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
                        isActive
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                          : isCompleted
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/5"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex flex-col min-w-0 items-center">
                      <span
                        className={`text-[10px] font-semibold truncate max-w-full transition-colors duration-200 ${
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400 font-bold"
                            : isCompleted
                              ? "text-foreground font-medium"
                              : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {step.short}
                      </span>
                      <span className="text-[8px] text-muted-foreground/80 truncate hidden md:inline max-w-full font-mono">
                        Step {step.number}
                      </span>
                    </div>
                  </button>
                  {step.number < TOTAL && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 mx-0.5 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
