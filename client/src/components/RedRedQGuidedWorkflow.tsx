import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  CalendarRange,
  Users,
  Syringe,
  Megaphone,
  Truck,
  Wallet,
  ClipboardCheck,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canApproveSessionPlan } from "@/lib/permissions";

type StepStatus = "done" | "todo" | "pending";

interface Step {
  num: number;
  title: string;
  redComponent: string;
  redQLayer?: string;
  purpose: string;
  whatToDo: string[];
  outputs: string[];
  module: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: StepStatus;
  statusDetail: string;
  pendingTask?: string;
}

// Antigens considered "active" for routine EPI in Step 6's completeness check.
const ACTIVE_ANTIGENS = ["BCG", "OPV", "PENTA", "PCV", "IPV", "MR", "ROTA"];

function statusBadge(status: StepStatus, detail: string) {
  if (status === "done") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
        <CheckCircle2 className="h-3 w-3 mr-1" /> {detail || "Complete"}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
        <Clock className="h-3 w-3 mr-1" /> Not yet wired
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
      <ArrowRight className="h-3 w-3 mr-1" /> {detail || "To do"}
    </Badge>
  );
}

export default function RedRedQGuidedWorkflow() {
  const { user } = useAuth() as { user: any };
  // Workflow authoring is restricted to facility staff only. All higher
  // roles (district / provincial / national, incl. national_admin) are
  // read-only here and only act at Step 11 via canApproveSessionPlan.
  const canEdit = user?.role === "facility_clerk" || user?.role === "facility_in_charge";
  const canApprove = canApproveSessionPlan(user);

  // Pull existing data to compute completion. Endpoints already used elsewhere.
  const { data: microplans = [] } = useQuery<any[]>({ queryKey: ["/api/microplans"] });
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/sessions"] });
  const { data: villages = [] } = useQuery<any[]>({ queryKey: ["/api/villages"] });
  const { data: mobilization = [] } = useQuery<any[]>({ queryKey: ["/api/mobilization"] });
  const { data: budgetItems = [] } = useQuery<any[]>({ queryKey: ["/api/budget-items"] });
  const { data: populationRows = [] } = useQuery<any[]>({ queryKey: ["/api/population"] });
  const { data: htrScores = [] } = useQuery<any[]>({ queryKey: ["/api/htr-scores"] });
  const { data: supervisionVisits = [] } = useQuery<any[]>({ queryKey: ["/api/supervision-visits"] });
  const { data: defaulterReview } = useQuery<{
    reviewedThisQuarter: boolean;
    reviewsThisQuarter: number;
    lastReviewedAt: string | null;
    quarterStart: string;
  }>({ queryKey: ["/api/indicators/defaulter-review-status"] });

  const steps: Step[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    // Step 1 — Situation analysis: marked done if any microplan exists from prior year (a coverage baseline was reviewed).
    const haveHistory = microplans.some((m: any) => m.year && m.year < currentYear);

    // Step 2 — Catchment & population: every village must have at least one population_data row WITH a recorded source.
    const villageIdsWithSource = new Set(
      (populationRows || [])
        .filter((p: any) => p.source && p.villageId != null)
        .map((p: any) => p.villageId)
    );
    const villagesCovered = villages.filter((v: any) => villageIdsWithSource.has(v.id));
    const step2Done = villages.length > 0 && villagesCovered.length === villages.length;

    // Step 3 — HTR & equity: every village has an htr_score row OR a terrainDifficulty / isHardToReach tag.
    const htrVillageIds = new Set((htrScores || []).map((h: any) => h.villageId));
    const villageWithHtr = villages.filter((v: any) =>
      htrVillageIds.has(v.id) || v.terrainDifficulty != null || v.isHardToReach === true
    );
    const step3Done = villages.length > 0 && villageWithHtr.length === villages.length;

    // Step 4 — Session calendar: 12-month rolling calendar = sessions covering the next 4 quarters from now.
    const requiredQuarters: string[] = [];
    for (let i = 0; i < 4; i++) {
      const q = ((currentQuarter - 1 + i) % 4) + 1;
      const y = currentYear + Math.floor((currentQuarter - 1 + i) / 4);
      requiredQuarters.push(`${y}-Q${q}`);
    }
    const sessionQuarters = new Set(sessions.map((s: any) => `${s.year}-Q${s.quarter}`));
    const coveredQuarters = requiredQuarters.filter((q) => sessionQuarters.has(q));
    const currentMicroplans = microplans.filter((m: any) => m.year === currentYear && m.quarter === currentQuarter);
    const step4Done = currentMicroplans.length > 0 && coveredQuarters.length === requiredQuarters.length;

    // Step 5 — Workforce: pending (structured staffing roster not yet on the microplan).

    // Step 6 — Vaccine forecast: every active antigen has a non-zero forecast across this-quarter's sessions.
    const quarterSessions = sessions.filter((s: any) => s.year === currentYear && s.quarter === currentQuarter);
    const antigensSeen = new Set<string>();
    for (const s of quarterSessions) {
      const va = s.vaccineAdjustments;
      if (va && typeof va === "object") {
        for (const key of Object.keys(va)) {
          const u = key.toUpperCase();
          for (const a of ACTIVE_ANTIGENS) {
            if (u.includes(a)) antigensSeen.add(a);
          }
        }
      }
    }
    const step6Done = quarterSessions.length > 0 && ACTIVE_ANTIGENS.every((a) => antigensSeen.has(a));

    // Step 7 — Mobilization: every facility that has scheduled sessions this quarter must have at least one
    // mobilization activity scheduled in the same quarter (per-facility join — mobilization has no sessionId column).
    const facilitiesWithSessions = new Set(quarterSessions.map((s: any) => s.facilityId));
    const quarterMob = (mobilization || []).filter((m: any) => {
      const d = m.scheduledDate ? new Date(m.scheduledDate) : null;
      if (!d) return false;
      const mq = Math.ceil((d.getMonth() + 1) / 3);
      return d.getFullYear() === currentYear && mq === currentQuarter;
    });
    const facilitiesWithMob = new Set(quarterMob.map((m: any) => m.facilityId));
    const facilitiesCovered = Array.from(facilitiesWithSessions).filter((fid) => facilitiesWithMob.has(fid));
    const step7Done =
      facilitiesWithSessions.size > 0 && facilitiesCovered.length === facilitiesWithSessions.size;

    // Step 8 — Logistics: every current-quarter session has transportMode + distance — pending until day-plan rollup exists.
    // Step 9 — Budget: current quarter has at least Personnel + Transport + Supplies category lines.
    const quarterBudget = budgetItems.filter((b: any) => b.year === currentYear && b.quarter === currentQuarter);
    const cats: string[] = quarterBudget.map((b: any) => (b.category || "").toString().toLowerCase());
    const step9Done = ["personnel", "transport", "supplies"].every((c) =>
      cats.some((k) => k.includes(c))
    );

    // Step 10 — Supportive supervision: every facility with sessions this quarter has ≥1
    // supervisory visit whose scheduledDate falls in the current quarter.
    const qStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
    const qEnd = new Date(currentYear, currentQuarter * 3, 1);
    const quarterVisitFacilityIds = new Set(
      (supervisionVisits || [])
        .filter((v: any) => {
          const d = v.scheduledDate ? new Date(v.scheduledDate) : null;
          return d && d >= qStart && d < qEnd;
        })
        .map((v: any) => v.facilityId)
    );
    const supFacilitiesCovered = Array.from(facilitiesWithSessions).filter((fid) =>
      quarterVisitFacilityIds.has(fid)
    );
    const step10Done =
      facilitiesWithSessions.size > 0 && supFacilitiesCovered.length === facilitiesWithSessions.size;

    // Step 11 — Approval: any current-quarter microplan reached approved.
    const step11Done = currentMicroplans.some((m: any) => m.status === "approved" || m.status === "locked");

    // Step 12 — Execution: defaulter list + zero-dose + dropout dependencies are still pending.
    // Per the reference doc, Step 12 stays "not yet wired" until those features ship. We surface progress
    // on actual doses recorded as an informational hint, but the badge remains "pending".
    const sessionsConducted = sessions.filter((s: any) =>
      s.year === currentYear && s.quarter === currentQuarter && s.status === "conducted"
    ).length;

    return [
      {
        num: 1,
        title: "Situation analysis & coverage review",
        redComponent: "RED 5 — Planning & management",
        redQLayer: "RED-Q Monitor",
        purpose: "Review last year's DTP1/DTP3/MCV1 coverage, dropout, zero-dose and stockouts before planning.",
        whatToDo: [
          "Pull last full year of DTP1 / DTP3 / MCV1 / MCV2 coverage.",
          "Note DTP1→DTP3 and DTP1→MCV1 dropout %.",
          "List stockout events, AEFI cases, sessions planned vs held.",
        ],
        outputs: [
          "One-page coverage & equity snapshot per facility with sub-village breakdown.",
          "List of bottom-decile communities to prioritize next year.",
        ],
        module: "Dashboard + Standards Alignment",
        href: "/",
        icon: BarChart3,
        status: haveHistory ? "done" : "todo",
        statusDetail: haveHistory
          ? "Prior-year microplan exists — baseline available"
          : "No prior-year microplan to review",
      },
      {
        num: 2,
        title: "Catchment & population mapping",
        redComponent: "RED 1 — Re-establish outreach",
        redQLayer: "RED-Q Identify",
        purpose: "Confirm catchment polygon and assign a population denominator with source to every community.",
        whatToDo: [
          "Confirm the catchment polygon for the facility.",
          "List every village, hamlet, IDP camp, school in the catchment.",
          "For each community capture target population AND its source (NSO, HMIS, WorldPop, community census).",
          "Assign each community a primary delivery strategy (fixed / outreach / mobile).",
        ],
        outputs: [
          "Geocoded community list with target-pop denominator.",
          "A population_data row WITH a non-empty source for every village.",
        ],
        module: "Boundary Manager + Population",
        href: "/population",
        icon: MapPin,
        status: step2Done ? "done" : "todo",
        statusDetail: villages.length === 0
          ? "No villages in catchment"
          : `${villagesCovered.length} / ${villages.length} villages have a population row with a recorded source`,
      },
      {
        num: 3,
        title: "Hard-to-reach & equity profiling",
        redComponent: "RED 1 — Re-establish outreach",
        redQLayer: "RED-Q Identify + Reach",
        purpose: "Score every village by access difficulty and tag missed-community / zero-dose hotspots.",
        whatToDo: [
          "Score each village on distance, terrain, seasonal accessibility and insecurity.",
          "Tag missed communities (no immunization contact in the past 12 months).",
          "Tag zero-dose hotspots (clusters with high % of children without DTP1).",
        ],
        outputs: [
          "HTR composite score per village.",
          "Missed-community flag and zero-dose tag per village.",
        ],
        module: "Hard-to-Reach",
        href: "/htr",
        icon: AlertTriangle,
        status: step3Done ? "done" : "todo",
        statusDetail: villages.length === 0
          ? "No villages to profile"
          : `${villageWithHtr.length} / ${villages.length} villages have an HTR / access tag`,
      },
      {
        num: 4,
        title: "Service delivery strategy & session calendar",
        redComponent: "RED 1 — Re-establish outreach",
        purpose: "Pick fixed / outreach / mobile per community and build a rolling 12-month session calendar.",
        whatToDo: [
          "Per community pick fixed-post / outreach / mobile delivery.",
          "Build a 12-month rolling calendar covering the next four quarters.",
          "Schedule catch-up / periodic intensification sessions for missed communities.",
        ],
        outputs: [
          "Microplan exists for the current quarter.",
          "Sessions exist for each of the next 4 quarters (12-month rolling calendar).",
        ],
        module: "Routine Microplan + SIA Campaigns",
        href: "/sessions",
        icon: CalendarRange,
        status: step4Done ? "done" : "todo",
        statusDetail: currentMicroplans.length === 0
          ? `No microplan for Q${currentQuarter} ${currentYear}`
          : `Sessions cover ${coveredQuarters.length} / 4 of the next four quarters`,
      },
      {
        num: 5,
        title: "Workforce & teaming",
        redComponent: "WHO core element 6 — Human resources",
        purpose: "Per session-day name vaccinator, recorder, supervisor; for SIA add team type and daily target.",
        whatToDo: [
          "Per session-day assign vaccinator(s), recorder and supervisor.",
          "For SIAs add team type (house-to-house / fixed post) and per-team daily target.",
          "Record per-diem rates for each role.",
        ],
        outputs: [
          "Every scheduled session-day has at least one named vaccinator.",
          "A staffing roster exists at microplan level with counts per role.",
        ],
        module: "Session Day Plans",
        href: "/sessions",
        icon: Users,
        status: "pending",
        statusDetail: "Not yet wired — completion check ships with the staffing roster",
        pendingTask: "Staffing + funding source on microplan",
      },
      {
        num: 6,
        title: "Vaccine, supplies & cold-chain forecast",
        redComponent: "WHO core element 4 — Logistics",
        purpose: "Apply per-antigen wastage, size cold-chain capacity, and forecast doses + AD syringes + safety boxes.",
        whatToDo: [
          "Apply wastage factors (BCG ~40%, MR/OPV ~25%, Penta/PCV ~11%, IPV/Rota ~5%) per antigen.",
          "Forecast doses + diluents + AD syringes + safety boxes for the plan period.",
          "Size cold boxes, ice packs and carriers per session.",
        ],
        outputs: [
          "Vaccine forecast row for every active antigen for the plan period.",
          "Cold-chain capacity check vs forecast volume (pending until cold-chain inventory ships).",
        ],
        module: "Vaccine Calculator + Stock Ledger",
        href: "/vaccines",
        icon: Syringe,
        status: step6Done ? "done" : "todo",
        statusDetail: quarterSessions.length === 0
          ? "No current-quarter sessions to forecast against"
          : `${antigensSeen.size} / ${ACTIVE_ANTIGENS.length} active antigens have a forecast this quarter (${ACTIVE_ANTIGENS.join(", ")})`,
        pendingTask: "Cold-chain inventory + temperature logs + stockout/wastage + GTIN-lot-expiry are pending",
      },
      {
        num: 7,
        title: "Demand generation & social mobilization",
        redComponent: "RED 3 — Community links",
        redQLayer: "RED-Q Reach",
        purpose: "Schedule announcement channel and named focal point per session; pre-position IEC materials.",
        whatToDo: [
          "Per session schedule the announcement channel (megaphone, religious leader, SMS).",
          "Name a community focal point per session.",
          "Pre-position IEC materials at the delivery point.",
        ],
        outputs: [
          "Each facility with scheduled sessions this quarter has ≥1 mobilization activity scheduled in the same quarter.",
          "(per-session linkage ships when mobilizationActivities gets a sessionId column).",
        ],
        module: "Social Mobilization",
        href: "/mobilization",
        icon: Megaphone,
        status: step7Done ? "done" : "todo",
        statusDetail: facilitiesWithSessions.size === 0
          ? "No sessions to mobilize for this quarter"
          : `${facilitiesCovered.length} / ${facilitiesWithSessions.size} facilities with sessions also have a mobilization activity this quarter`,
      },
      {
        num: 8,
        title: "Logistics & transport",
        redComponent: "WHO core element 5 — Logistics",
        purpose: "Record transport mode, distance, fuel and security clearance for every session-day.",
        whatToDo: [
          "Per session-day record transport mode, distance and estimated fuel.",
          "Where applicable record vehicle / boat / escort and security clearance.",
        ],
        outputs: [
          "Every scheduled session-day has a transport mode + estimated distance.",
          "Microplan-level transport rollup view (pending).",
        ],
        module: "Session Day Plans",
        href: "/sessions",
        icon: Truck,
        status: "pending",
        statusDetail: "Not yet wired — completion check ships with the session-day rollup",
        pendingTask: "Per-session-day transport rollup on the microplan view",
      },
      {
        num: 9,
        title: "Budget with funding source",
        redComponent: "WHO core element 8 — Financing",
        purpose: "Itemize Personnel, Transport, Supplies, Per Diem, Cold Chain — each tagged to a funder.",
        whatToDo: [
          "Itemize budget lines under Personnel / Transport / Supplies / Per Diem / Cold Chain / Training / Communication.",
          "Tag every line with a funding source (Govt / Gavi / WHO / UNICEF / Other).",
        ],
        outputs: [
          "Quarterly budget has ≥1 line each for Personnel, Transport, Supplies.",
          "Funding source set on every line (pending until the funding-source enum ships).",
        ],
        module: "Budget Planning",
        href: "/budget",
        icon: Wallet,
        status: step9Done ? "done" : "todo",
        statusDetail: step9Done
          ? `Personnel + Transport + Supplies budgeted for Q${currentQuarter}`
          : `Missing one of Personnel / Transport / Supplies for Q${currentQuarter}`,
        pendingTask: "Structured funding-source enum (Govt / Gavi / WHO / UNICEF / Other) is pending",
      },
      {
        num: 10,
        title: "Supportive supervision plan",
        redComponent: "RED 2 — Supportive supervision",
        purpose: "Schedule at least one supervisory visit per facility per quarter with a standard checklist.",
        whatToDo: [
          "Per facility schedule ≥1 supervisory visit this quarter.",
          "Name the supervisor and the checklist to use.",
          "Capture follow-up actions after every visit.",
        ],
        outputs: [
          "≥1 supervisory visit scheduled this quarter for every facility with sessions.",
          "Checklist captured (Yes / No / N/A) with a derived score and follow-up actions per visit.",
        ],
        module: "Supportive Supervision",
        href: "/supervision",
        icon: ClipboardCheck,
        status: step10Done ? "done" : "todo",
        statusDetail: facilitiesWithSessions.size === 0
          ? "No sessions this quarter — schedule sessions before planning supervision"
          : `${supFacilitiesCovered.length} / ${facilitiesWithSessions.size} facilities with sessions have a supervisory visit scheduled for Q${currentQuarter}`,
      },
      {
        num: 11,
        title: "Approval cascade",
        redComponent: "RED 5 — Planning & management",
        purpose: "Facility submits → district → provincial → national; national approval locks the plan.",
        whatToDo: canApprove
          ? [
              "Open Approvals and pick the current-quarter microplan in your queue.",
              "Verify catchment coverage, denominators, session calendar, budget tags, equity flags.",
              "Approve to advance, or return with comments to send the plan back to the facility.",
            ]
          : [
              "Facility in-charge submits the microplan from Approvals.",
              "District → provincial → national reviewers approve or return with comments.",
              "Final national approval locks the plan for execution.",
            ],
        outputs: [
          "Microplan reaches approval_status = approved at the terminal review level.",
          "Audit trail captures who approved, when, and any comments.",
        ],
        module: canApprove ? "Approvals (approve / return here)" : "Approvals",
        href: "/approvals",
        icon: ShieldCheck,
        status: step11Done ? "done" : "todo",
        statusDetail: step11Done
          ? "Current-quarter microplan approved (or locked)"
          : "Awaiting submission / approval for the current quarter",
      },
      (() => {
        const reviewed = !!defaulterReview?.reviewedThisQuarter;
        const step12Done = sessionsConducted > 0 && reviewed;
        const lastReviewedAt = defaulterReview?.lastReviewedAt
          ? new Date(defaulterReview.lastReviewedAt).toLocaleDateString()
          : null;
        return {
          num: 12,
          title: "Execution, monitoring & quarterly review",
          redComponent: "RED 4 — Monitoring for action",
          redQLayer: "RED-Q Measure",
          purpose: "Record doses given, run defaulter review, re-rank missed communities, feed back into Step 1.",
          whatToDo: [
            "Record doses given per session in the Client Logbook.",
            "Open the Defaulter List at least once this quarter and follow up overdue children.",
            "Re-rank missed communities every quarter; trigger a coverage survey after every SIA.",
          ],
          outputs: [
            "Sessions for the current quarter are marked conducted with actual doses recorded.",
            "A defaulter review has been opened this quarter (audit-logged when the Defaulter List page loads).",
          ],
          module: "Defaulter List + Dropout Rates",
          href: "/clients/defaulters",
          icon: Activity,
          status: step12Done ? "done" : "todo",
          statusDetail: step12Done
            ? `${sessionsConducted} session(s) conducted this quarter; defaulter review opened${
                lastReviewedAt ? ` (last ${lastReviewedAt})` : ""
              }`
            : sessionsConducted === 0
              ? "No sessions conducted yet this quarter"
              : reviewed
                ? "Sessions conducted but defaulter review not yet opened this quarter"
                : "Open the Defaulter List this quarter to complete the quarterly review",
        } as Step;
      })(),
    ];
  }, [microplans, sessions, villages, mobilization, budgetItems, populationRows, htrScores, supervisionVisits, canApprove, defaulterReview]);

  const doneCount = steps.filter((s) => s.status === "done").length;
  const pendingCount = steps.filter((s) => s.status === "pending").length;
  const todoCount = steps.length - doneCount - pendingCount;
  const percent = Math.round((doneCount / steps.length) * 100);

  const groups: { label: string; component: string; nums: number[] }[] = [
    { label: "RED 5 + RED-Q Monitor", component: "Planning baseline", nums: [1] },
    { label: "RED 1 + RED-Q Identify", component: "Reach every community", nums: [2, 3, 4] },
    { label: "WHO core 4–6", component: "People · Vaccines · Logistics", nums: [5, 6, 8] },
    { label: "RED 3 + RED-Q Reach", component: "Demand", nums: [7] },
    { label: "WHO core 8", component: "Financing", nums: [9] },
    { label: "RED 2", component: "Supportive supervision", nums: [10] },
    { label: "RED 5", component: "Approval & lock", nums: [11] },
    { label: "RED 4 + RED-Q Measure", component: "Execution & review", nums: [12] },
  ];

  return (
    <Card className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50/60 via-background to-background dark:from-indigo-950/30 shadow-sm overflow-hidden" data-testid="card-red-redq-workflow">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Guided Workflow — WHO RED + Gavi RED-Q (12 steps)
            </CardTitle>
            <CardDescription className="text-xs">
              The annual immunization microplanning cycle, computed against your current data.
              {canEdit && " You can author each step."}
              {!canEdit && canApprove && " You have read-only access; approval action is at Step 11."}
              {!canEdit && !canApprove && " Read-only view."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/docs/microplanning-workflow.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1"
              data-testid="link-workflow-reference"
            >
              <BookOpen className="h-3.5 w-3.5" /> Reference doc <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold rounded-full px-2 py-0.5" data-testid="badge-done">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {doneCount} done
          </Badge>
          <Badge variant="outline" className="text-[10px] font-bold rounded-full px-2 py-0.5" data-testid="badge-todo">
            {todoCount} to do
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold rounded-full px-2 py-0.5" data-testid="badge-pending">
            <Clock className="h-3 w-3 mr-1" /> {pendingCount} not yet wired
          </Badge>
          <span className="text-[11px] text-muted-foreground font-semibold">{percent}% of wired steps complete</span>
          {!canEdit && (
            <Badge variant="outline" className="text-[10px] font-bold rounded-full px-2 py-0.5 border-amber-500/40 text-amber-700 dark:text-amber-300" data-testid="badge-readonly">
              <Lock className="h-3 w-3 mr-1" /> Read-only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Accordion type="multiple" className="space-y-2">
          {groups.map((g) => {
            const groupSteps = steps.filter((s) => g.nums.includes(s.num));
            const groupDone = groupSteps.every((s) => s.status === "done");
            return (
              <AccordionItem
                key={g.label}
                value={g.label}
                className="border border-border/60 rounded-2xl bg-background/60 px-3"
                data-testid={`group-${g.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
              >
                <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                  <div className="flex items-center justify-between gap-3 w-full pr-2">
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-indigo-600 dark:text-indigo-400">{g.label}</span>
                      <span className="text-muted-foreground font-medium">· {g.component}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                      Steps {g.nums.join(", ")} {groupDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-1" />}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3 space-y-2">
                  {groupSteps.map((s) => {
                    const Icon = s.icon;
                    const isApprovalStep = s.num === 11;
                    const showApprovalCta = isApprovalStep && canApprove;
                    const showEditCta = !isApprovalStep && canEdit && s.status !== "pending";
                    return (
                      <div
                        key={s.num}
                        className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2"
                        data-testid={`step-${s.num}`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-extrabold text-muted-foreground">
                                  STEP {s.num.toString().padStart(2, "0")}
                                </span>
                                <h4 className="text-sm font-extrabold text-foreground leading-tight">{s.title}</h4>
                              </div>
                              <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 uppercase tracking-wide">
                                {s.redComponent}
                                {s.redQLayer && <span className="text-muted-foreground"> · {s.redQLayer}</span>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.purpose}</p>

                              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                                <div className="rounded-lg bg-muted/40 p-2">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                                    What to do
                                  </p>
                                  <ul className="space-y-0.5">
                                    {s.whatToDo.map((item, i) => (
                                      <li key={i} className="text-[11px] text-foreground/90 leading-snug flex gap-1">
                                        <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="rounded-lg bg-muted/40 p-2">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                                    Required outputs — what good looks like
                                  </p>
                                  <ul className="space-y-0.5">
                                    {s.outputs.map((item, i) => (
                                      <li key={i} className="text-[11px] text-foreground/90 leading-snug flex gap-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <p className="text-[11px] text-foreground/80 mt-2">
                                <span className="font-bold">Module:</span> {s.module}
                              </p>
                              <p className="text-[11px] mt-1">
                                <span className="font-bold text-muted-foreground">Completion check:</span>{" "}
                                <span
                                  className={
                                    s.status === "done"
                                      ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                                      : s.status === "pending"
                                        ? "text-amber-700 dark:text-amber-300 font-semibold"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {s.statusDetail}
                                </span>
                              </p>
                              {s.pendingTask && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 italic">
                                  Pending — tracked in follow-up: <span className="font-semibold">{s.pendingTask}</span>
                                </p>
                              )}
                              {isApprovalStep && !canEdit && !canApprove && (
                                <p className="text-[10px] text-muted-foreground mt-1 italic">
                                  Approve / return action is available to district, provincial and national reviewers in Approvals.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {statusBadge(s.status, "")}
                            {showApprovalCta && (
                              <Link href={s.href}>
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                                  data-testid={`link-step-${s.num}`}
                                >
                                  Review & approve in Approvals
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                            {!showApprovalCta && showEditCta && (
                              <Link href={s.href}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] font-bold rounded-lg"
                                  data-testid={`link-step-${s.num}`}
                                >
                                  Open module
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                            {!showApprovalCta && !showEditCta && (
                              <Link href={s.href}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] font-bold rounded-lg text-muted-foreground"
                                  data-testid={`link-step-${s.num}`}
                                >
                                  View <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
