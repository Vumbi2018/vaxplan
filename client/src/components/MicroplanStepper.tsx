import { Link, useLocation } from "wouter";
import {
  Users,
  AlertTriangle,
  Calendar,
  ClipboardList,
  Syringe,
  Megaphone,
  Wallet,
  Check,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MicroplanStepperProps {
  currentStep: number; // 1 to 7
  activeSessionId?: number; // Optional ID for session day plans
}

export function MicroplanStepper({ currentStep, activeSessionId }: MicroplanStepperProps) {
  const [location] = useLocation();

  const steps = [
    {
      number: 1,
      title: "Target Population",
      path: "/population",
      icon: Users,
      description: "Step 1: Denominators",
    },
    {
      number: 2,
      title: "HTR Profiling",
      path: "/htr",
      icon: AlertTriangle,
      description: "Step 2: Risk Profile",
    },
    {
      number: 3,
      title: "Session Drafts",
      path: "/sessions",
      icon: Calendar,
      description: "Step 3: Microplans",
    },
    {
      number: 4,
      title: "Itinerary Day Plans",
      path: activeSessionId ? `/sessions/${activeSessionId}/day-plans` : "/sessions",
      icon: ClipboardList,
      description: "Step 4: Day schedules",
    },
    {
      number: 5,
      title: "Vaccine Needs",
      path: "/vaccines",
      icon: Syringe,
      description: "Step 5: Cold chain needs",
    },
    {
      number: 6,
      title: "Social Mobilization",
      path: "/mobilization",
      icon: Megaphone,
      description: "Step 6: Community outreach",
    },
    {
      number: 7,
      title: "Budget Allocations",
      path: "/budget",
      icon: Wallet,
      description: "Step 7: Direct costing",
    },
  ];

  return (
    <Card className="w-full shadow-lg border border-white/10 bg-background/85 backdrop-blur-md overflow-hidden rounded-2xl mb-6">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">
                WHO RED/REC Standard Workflow
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Follow the 7-step sequence to construct a robust, georeferenced facility microplan.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/10">
                Step {currentStep} of 7: {steps[currentStep - 1]?.title}
              </span>
            </div>
          </div>

          {/* Stepper bar */}
          <div className="flex items-center w-full overflow-x-auto custom-scrollbar py-2 gap-1.5 md:gap-3 md:grid md:grid-cols-7 select-none">
            {steps.map((step) => {
              const isCompleted = step.number < currentStep;
              const isActive = step.number === currentStep;
              const Icon = step.icon;

              return (
                <div key={step.number} className="flex items-center min-w-[140px] md:min-w-0 md:w-full group">
                  {/* Step Item */}
                  <Link href={step.path} className="flex flex-row md:flex-col items-center md:text-center flex-1 gap-2.5 md:gap-1.5 cursor-pointer outline-none">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
                        isActive
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                          : isCompleted
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/5"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 md:items-center">
                      <span
                        className={`text-xs font-semibold truncate transition-colors duration-200 ${
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400 font-bold"
                            : isCompleted
                              ? "text-foreground font-medium"
                              : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate hidden md:inline max-w-full">
                        {step.description}
                      </span>
                    </div>
                  </Link>

                  {/* Connecting Chevron (except last item) */}
                  {step.number < 7 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-1 shrink-0 md:hidden" />
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
