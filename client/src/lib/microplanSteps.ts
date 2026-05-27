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
  Compass,
  PackageCheck,
  Rocket,
} from "lucide-react";

export type PhaseId = "plan" | "prepare" | "deliver";

export interface MicroplanStepDef {
  number: number;
  title: string;
  short: string;
  /** Module page this step opens in. Use `dayPlansPathFor(sessionId)` for steps 5 / 8. */
  basePath: string;
  /** Lucide icon for the step. */
  icon: React.ComponentType<{ className?: string }>;
  /** One-line plain-language hint for HCWs. */
  hint: string;
  /** WHO/Gavi reference component. */
  redComponent: string;
  /** Optional RED-Q layer. */
  redQLayer?: string;
  /** Bulleted "what to do" — friendly imperative voice. */
  whatToDo: string[];
  /** "Looks like" success criteria. */
  outputs: string[];
  /** Module label shown on the CTA button. */
  moduleLabel: string;
  /** Which of the three phases this step belongs to. */
  phase: PhaseId;
}

export interface PhaseDef {
  id: PhaseId;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: number[];
  accent: {
    text: string;
    bg: string;
    border: string;
    ring: string;
    dot: string;
    activeBg: string;
    activeBorder: string;
    activeShadow: string;
    softGradient: string;
  };
}

export const PHASES: PhaseDef[] = [
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
      softGradient: "from-sky-500/20 via-sky-500/5 to-transparent",
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
      softGradient: "from-violet-500/20 via-violet-500/5 to-transparent",
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
      softGradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    },
  },
];

export function dayPlansPathFor(sessionId?: number | null): string {
  return sessionId ? `/sessions/${sessionId}/day-plans` : "/sessions";
}

export function buildMicroplanSteps(activeSessionId?: number | null): MicroplanStepDef[] {
  const dp = dayPlansPathFor(activeSessionId);
  return [
    {
      number: 1, title: "Situation Analysis & Coverage Review", short: "Situation",
      basePath: "/", icon: BarChart3, phase: "plan",
      hint: "Review last year's coverage, dropout and stockouts.",
      redComponent: "RED 5 — Planning & management", redQLayer: "RED-Q Monitor",
      whatToDo: [
        "Pull last full year of DTP1 / DTP3 / MCV1 / MCV2 coverage.",
        "Note DTP1→DTP3 and DTP1→MCV1 dropout %.",
        "List stockout events, AEFI cases, sessions planned vs held.",
      ],
      outputs: [
        "One-page coverage & equity snapshot per facility.",
        "List of bottom-decile communities to prioritize.",
      ],
      moduleLabel: "Open Dashboard",
    },
    {
      number: 2, title: "Catchment & Population Mapping", short: "Catchment",
      basePath: "/population", icon: MapPin, phase: "plan",
      hint: "List every village and give it a population denominator.",
      redComponent: "RED 1 — Re-establish outreach", redQLayer: "RED-Q Identify",
      whatToDo: [
        "Confirm the catchment polygon for the facility.",
        "List every village, hamlet, IDP camp, school in the catchment.",
        "Capture target population AND source per community (NSO / HMIS / WorldPop / census).",
        "Assign each community a delivery strategy (fixed / outreach / mobile).",
      ],
      outputs: [
        "Geocoded community list with denominators.",
        "A population row WITH a source on every village.",
      ],
      moduleLabel: "Open Population Hub",
    },
    {
      number: 3, title: "Hard-to-Reach & Equity Profiling", short: "HTR",
      basePath: "/htr", icon: AlertTriangle, phase: "plan",
      hint: "Score access difficulty and flag missed communities.",
      redComponent: "RED 1 — Re-establish outreach", redQLayer: "RED-Q Identify + Reach",
      whatToDo: [
        "Score each village on distance, terrain, season, insecurity.",
        "Tag missed communities (no immunization contact in 12 months).",
        "Tag zero-dose hotspots.",
      ],
      outputs: [
        "HTR composite score per village.",
        "Missed-community + zero-dose tag per village.",
      ],
      moduleLabel: "Open Hard-to-Reach",
    },
    {
      number: 4, title: "Service Delivery Strategy & Session Calendar", short: "Sessions",
      basePath: "/sessions", icon: CalendarRange, phase: "plan",
      hint: "Build a rolling 12-month session calendar.",
      redComponent: "RED 1 — Re-establish outreach",
      whatToDo: [
        "Per community pick fixed-post / outreach / mobile.",
        "Build a 12-month rolling calendar covering the next four quarters.",
        "Schedule catch-up sessions for missed communities.",
      ],
      outputs: [
        "Microplan exists for the current quarter.",
        "Sessions exist for each of the next 4 quarters.",
      ],
      moduleLabel: "Open Session Planning",
    },
    {
      number: 5, title: "Workforce & Teaming", short: "Workforce",
      basePath: dp, icon: Users, phase: "prepare",
      hint: "Name your vaccinators, recorders and supervisors.",
      redComponent: "WHO core element 6 — Human resources",
      whatToDo: [
        "Per session-day assign vaccinator(s), recorder and supervisor.",
        "For SIAs add team type (house-to-house / fixed) and daily target.",
        "Record per-diem rates for each role.",
      ],
      outputs: [
        "Every scheduled session-day has a named vaccinator.",
        "Staffing roster exists at microplan level.",
      ],
      moduleLabel: "Open Day Plans",
    },
    {
      number: 6, title: "Vaccine, Supplies & Cold-Chain Forecast", short: "Vaccines",
      basePath: "/vaccines", icon: Syringe, phase: "prepare",
      hint: "Forecast doses, syringes and cold-chain capacity.",
      redComponent: "WHO core element 4 — Logistics",
      whatToDo: [
        "Apply wastage factors per antigen (BCG ~40%, MR/OPV ~25%, Penta/PCV ~11%, IPV/Rota ~5%).",
        "Forecast doses + diluents + AD syringes + safety boxes.",
        "Size cold boxes, ice packs and carriers per session.",
      ],
      outputs: [
        "Forecast row for every active antigen.",
        "Cold-chain capacity check vs forecast volume.",
      ],
      moduleLabel: "Open Vaccine Calculator",
    },
    {
      number: 7, title: "Demand Generation & Social Mobilization", short: "Demand",
      basePath: "/mobilization", icon: Megaphone, phase: "prepare",
      hint: "Tell every community when & where to come.",
      redComponent: "RED 3 — Community links", redQLayer: "RED-Q Reach",
      whatToDo: [
        "Schedule announcement channel per session (megaphone, religious leader, SMS).",
        "Name a community focal point per session.",
        "Pre-position IEC materials at the delivery point.",
      ],
      outputs: [
        "≥1 mobilization activity for every facility with sessions this quarter.",
      ],
      moduleLabel: "Open Social Mobilization",
    },
    {
      number: 8, title: "Logistics & Transport", short: "Logistics",
      basePath: dp, icon: Truck, phase: "prepare",
      hint: "Plan vehicles, fuel and security for every session-day.",
      redComponent: "WHO core element 5 — Logistics",
      whatToDo: [
        "Per session-day record transport mode, distance and estimated fuel.",
        "Where applicable record vehicle / boat / escort and security clearance.",
      ],
      outputs: [
        "Every scheduled session-day has a transport mode + distance.",
      ],
      moduleLabel: "Open Day Plans",
    },
    {
      number: 9, title: "Budget with Funding Source", short: "Budget",
      basePath: "/budget", icon: Wallet, phase: "prepare",
      hint: "Cost every line and tag the funder.",
      redComponent: "WHO core element 8 — Financing",
      whatToDo: [
        "Itemize Personnel / Transport / Supplies / Per Diem / Cold Chain / Training / Communication.",
        "Tag every line with a funding source (Govt / Gavi / WHO / UNICEF / Other).",
      ],
      outputs: [
        "Quarterly budget has ≥1 line each for Personnel, Transport, Supplies.",
        "Funding source set on every line.",
      ],
      moduleLabel: "Open Budget Planning",
    },
    {
      number: 10, title: "Supportive Supervision Plan", short: "Supervision",
      basePath: "/supervision", icon: ClipboardCheck, phase: "deliver",
      hint: "Schedule a supervisory visit per facility per quarter.",
      redComponent: "RED 2 — Supportive supervision",
      whatToDo: [
        "Per facility schedule ≥1 supervisory visit this quarter.",
        "Name the supervisor and the checklist to use.",
        "Capture follow-up actions after every visit.",
      ],
      outputs: [
        "Supervisory visit calendar with checklist references.",
      ],
      moduleLabel: "Open Supervision",
    },
    {
      number: 11, title: "Approval Cascade", short: "Approval",
      basePath: "/approvals", icon: ShieldCheck, phase: "deliver",
      hint: "Submit → district → provincial → national.",
      redComponent: "RED 5 — Planning & management",
      whatToDo: [
        "Facility in-charge submits the microplan from Approvals.",
        "District → provincial → national reviewers approve or return with comments.",
        "Final national approval locks the plan for execution.",
      ],
      outputs: [
        "Microplan reaches approval_status = approved.",
        "Audit trail captures who approved, when, and any comments.",
      ],
      moduleLabel: "Open Approvals",
    },
    {
      number: 12, title: "Execution, Monitoring & Quarterly Review", short: "Execution",
      basePath: "/clients", icon: Activity, phase: "deliver",
      hint: "Record doses, review defaulters, feed back into Step 1.",
      redComponent: "RED 4 — Monitoring for action", redQLayer: "RED-Q Measure",
      whatToDo: [
        "Record doses given per session in the Client Logbook.",
        "Update the wall chart and review defaulters monthly.",
        "Re-rank missed communities every quarter; coverage survey after every SIA.",
      ],
      outputs: [
        "Monthly tally + defaulter list + quarterly review note.",
        "Sessions for the current quarter are marked conducted with actual doses recorded.",
      ],
      moduleLabel: "Open Client Logbook",
    },
  ];
}

export function phaseFor(stepNum: number): PhaseDef {
  return PHASES.find((p) => p.steps.includes(stepNum)) ?? PHASES[0];
}

export function withContext(
  basePath: string,
  facilityId?: number | null,
  microplanId?: number | null,
): string {
  const qs = new URLSearchParams();
  if (facilityId != null) qs.set("facility", String(facilityId));
  if (microplanId != null) qs.set("microplan", String(microplanId));
  const sep = basePath.includes("?") ? "&" : "?";
  return qs.toString() ? `${basePath}${sep}${qs.toString()}` : basePath;
}
