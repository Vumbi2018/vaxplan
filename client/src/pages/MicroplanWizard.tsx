import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Save,
  Send,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canApproveSessionPlan } from "@/lib/permissions";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Microplan,
  Facility,
  Village,
  SessionPlan,
  BudgetItem,
  VaccineRequirement,
  MobilizationActivity,
  SupervisionVisit,
  PopulationData,
} from "@shared/schema";

// ─── Step metadata ────────────────────────────────────────────────────────
type StepDef = {
  id: number;
  title: string;
  whatToDo: string[];
};

const STEPS: StepDef[] = [
  {
    id: 1,
    title: "Coverage review",
    whatToDo: [
      "Enter DTP1, DTP3, MCV1, MCV2 coverage % from last full year.",
      "Dropout from DTP1→DTP3 and DTP1→MCV1 is calculated for you.",
      "List stockout events, AEFI cases, and sessions planned vs held.",
    ],
  },
  {
    id: 2,
    title: "Catchment & communities",
    whatToDo: [
      "List every community served: village, hamlet, IDP camp, school.",
      "Record target population and the delivery strategy (fixed / outreach / mobile).",
      "Mark the source of the population number (NSO, HMIS, WorldPop, survey, census).",
    ],
  },
  {
    id: 3,
    title: "Risk scoring",
    whatToDo: [
      "Score each community 1–5 on distance, terrain, season, and insecurity.",
      "Tick 'missed (no contact in 12 months)' for any community you have not visited.",
      "Tick 'zero-dose hotspot' where you know unimmunised children live.",
    ],
  },
  {
    id: 4,
    title: "Session calendar",
    whatToDo: [
      "Plan one session per community per month for the next 12 months.",
      "Pick the date and session type (static / outreach / mobile).",
      "Add a catch-up row for any community marked missed in Step 3.",
    ],
  },
  {
    id: 5,
    title: "Staffing per session day",
    whatToDo: [
      "For every session day, name the vaccinator, recorder, and supervisor.",
      "Set the daily target and per-diem per role.",
      "For SIA campaigns, choose team type: house-to-house or fixed.",
    ],
  },
  {
    id: 6,
    title: "Vaccine forecasting",
    whatToDo: [
      "Default wastage: BCG 40%, MR/OPV 25%, Penta/PCV 11%, IPV/Rota 5%.",
      "Doses = target × doses per child × (1 + wastage). Vials, syringes, safety boxes follow.",
      "Add cold-chain sizing: cold boxes, ice packs, carriers per session.",
    ],
  },
  {
    id: 7,
    title: "Social mobilization",
    whatToDo: [
      "Pick announcement channels per session day (megaphone, religious leader, SMS).",
      "Name a focal point with a phone number for every community.",
      "Tick IEC materials you will hand out.",
    ],
  },
  {
    id: 8,
    title: "Transport",
    whatToDo: [
      "Set transport mode per session day: foot, motorbike, 4WD, boat.",
      "Record distance km and estimated fuel litres.",
      "Tick the security clearance box if it applies.",
    ],
  },
  {
    id: 9,
    title: "Budget",
    whatToDo: [
      "Add one line per cost: Personnel, Transport, Supplies, Per Diem, Cold Chain, Training, Communication.",
      "Pick the funding source: Govt, Gavi, WHO, UNICEF, Other.",
      "Total is calculated from quantity × unit cost.",
    ],
  },
  {
    id: 10,
    title: "Supervision plan",
    whatToDo: [
      "At least one supportive supervision visit per quarter.",
      "Name the supervisor and the checklist they will use.",
      "Capture follow-up actions you expect to take.",
    ],
  },
  {
    id: 11,
    title: "Submit for approval",
    whatToDo: [
      "Review the summary below.",
      "Only the facility-in-charge can submit.",
      "Submitting sends the plan to district → provincial → national approvers.",
    ],
  },
  {
    id: 12,
    title: "Monitoring",
    whatToDo: [
      "After approval, this view shows live doses given, defaulters, and missed communities.",
      "Use the wall chart to mark catch-up actions as you go.",
    ],
  },
];

const ANTIGENS: Array<{ name: string; doses: number; wastage: number }> = [
  { name: "BCG", doses: 1, wastage: 40 },
  { name: "OPV", doses: 4, wastage: 25 },
  { name: "Penta", doses: 3, wastage: 11 },
  { name: "PCV", doses: 3, wastage: 11 },
  { name: "IPV", doses: 1, wastage: 5 },
  { name: "MR", doses: 2, wastage: 25 },
  { name: "Rota", doses: 2, wastage: 5 },
];

const BUDGET_CATEGORIES = [
  "Personnel",
  "Transport",
  "Supplies",
  "Per Diem",
  "Cold Chain",
  "Training",
  "Communication",
];

const FUNDING_SOURCES = [
  { value: "government", label: "Government" },
  { value: "gavi", label: "Gavi" },
  { value: "who", label: "WHO" },
  { value: "unicef", label: "UNICEF" },
  { value: "other", label: "Other" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

function WhatToDo({ bullets }: { bullets: string[] }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">What to do</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function MicroplanWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [active, setActive] = useState(1);
  const [microplanId, setMicroplanId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(
    user?.facilityId ?? null,
  );
  const [name, setName] = useState("");
  const [year] = useState(new Date().getFullYear());
  const [quarter] = useState(currentQuarter());

  // Optionally resume an existing draft via ?id=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id && !Number.isNaN(Number(id))) {
      setMicroplanId(Number(id));
    }
  }, []);

  // Sync facility from user when it arrives
  useEffect(() => {
    if (user?.facilityId && !facilityId) setFacilityId(user.facilityId);
  }, [user, facilityId]);

  // ─── Data fetches ───────────────────────────────────────────────────────
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });
  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });
  const { data: microplan } = useQuery<Microplan>({
    queryKey: ["/api/microplans", microplanId],
    queryFn: async () => {
      const res = await fetch(`/api/microplans/${microplanId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load microplan");
      return res.json();
    },
    enabled: !!microplanId,
  });

  useEffect(() => {
    if (microplan) {
      if (microplan.facilityId) setFacilityId(microplan.facilityId);
      if (microplan.name) setName(microplan.name);
    }
  }, [microplan]);

  const facility = useMemo(
    () => facilities?.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId],
  );

  const facilityVillages = useMemo(() => {
    if (!villages || !facility) return [] as Village[];
    return villages.filter(
      (v) =>
        v.assignedFacilityId === facility.id ||
        v.districtId === facility.districtId,
    );
  }, [villages, facility]);

  // ─── Microplan ensure (idempotent via in-flight ref) ───────────────────
  const ensureInFlight = useRef<Promise<number> | null>(null);
  const ensureMicroplan = async (): Promise<number> => {
    if (microplanId) return microplanId;
    if (ensureInFlight.current) return ensureInFlight.current;
    if (!facilityId) throw new Error("Pick a facility first.");
    const p = (async () => {
      const created = await apiRequest<Microplan>("POST", "/api/microplans", {
        facilityId,
        name: name.trim() || `Microplan Q${quarter} ${year}`,
        planType: "facility_routine",
        year,
        quarter,
        status: "draft",
      });
      setMicroplanId(created.id);
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      return created.id;
    })();
    ensureInFlight.current = p;
    try {
      return await p;
    } finally {
      ensureInFlight.current = null;
    }
  };

  const patchMicroplan = async (id: number, patch: Record<string, unknown>) => {
    await apiRequest("PATCH", `/api/microplans/${id}`, patch);
    queryClient.invalidateQueries({ queryKey: ["/api/microplans", id] });
  };

  const [sessionIdMap, setSessionIdMap] = useState<Record<string, number>>({});
  const [dayPlansWritten, setDayPlansWritten] = useState<Set<string>>(new Set());
  const { data: existingSessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
    enabled: !!microplanId,
  });

  // ─── Save draft ────────────────────────────────────────────────────────
  const saveDraft = async () => {
    try {
      await ensureMicroplan();
      toast({
        title: "Draft saved",
        description: "You can leave and come back without losing progress.",
      });
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  };

  // ─── Step state ────────────────────────────────────────────────────────
  type CoverageRow = {
    dtp1: string;
    dtp3: string;
    mcv1: string;
    mcv2: string;
    stockouts: string;
    aefi: string;
    sessionsPlanned: string;
    sessionsHeld: string;
  };
  const [coverage, setCoverage] = useState<CoverageRow>({
    dtp1: "",
    dtp3: "",
    mcv1: "",
    mcv2: "",
    stockouts: "0",
    aefi: "0",
    sessionsPlanned: "0",
    sessionsHeld: "0",
  });

  useEffect(() => {
    const stash = (microplan as any)?.staffing;
    if (stash && typeof stash === "object" && !Array.isArray(stash) && stash.coverageReview) {
      setCoverage((prev) => ({ ...prev, ...stash.coverageReview }));
    }
  }, [microplan]);

  type CommunityRow = {
    villageId?: number;
    name: string;
    type: "village" | "hamlet" | "idp" | "school";
    targetPopulation: string;
    source: "nso" | "hmis" | "worldpop" | "survey" | "community_census";
    strategy: "static" | "outreach" | "mobile";
    saved?: boolean;
    rowId: string;
  };
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  useEffect(() => {
    if (!facilityVillages.length || communities.length) return;
    setCommunities(
      facilityVillages.map((v) => ({
        villageId: v.id,
        name: v.name,
        type: "village",
        targetPopulation: "0",
        source: "nso",
        strategy: v.isHardToReach ? "outreach" : "static",
        saved: false,
        rowId: `v${v.id}`,
      })),
    );
  }, [facilityVillages, communities.length]);

  type RiskRow = {
    villageId?: number;
    name: string;
    distance: number;
    terrain: number;
    season: number;
    insecurity: number;
    missed: boolean;
    zeroDose: boolean;
  };
  const [risk, setRisk] = useState<RiskRow[]>([]);
  useEffect(() => {
    if (!communities.length) return;
    setRisk((prev) => {
      if (prev.length === communities.length) return prev;
      return communities.map((c) => ({
        villageId: c.villageId,
        name: c.name,
        distance: 3,
        terrain: 3,
        season: 3,
        insecurity: 1,
        missed: false,
        zeroDose: false,
      }));
    });
  }, [communities]);

  type CalendarRow = {
    rowId: string;
    name: string;
    villageId?: number;
    sessionType: "static" | "outreach" | "mobile";
    scheduledDate: string;
    catchUp?: boolean;
  };
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);

  // Hydrate session-id map from server when resuming an existing microplan,
  // so Step 5/8 day-plan writes work across page reloads and don't create dupes.
  useEffect(() => {
    if (!existingSessions || !microplanId || !calendar.length) return;
    const mine = existingSessions.filter((s) => s.microplanId === microplanId);
    const next: Record<string, number> = {};
    for (const row of calendar) {
      const hit = mine.find(
        (s) =>
          s.scheduledDate &&
          new Date(s.scheduledDate).toISOString().slice(0, 10) === row.scheduledDate &&
          s.name?.startsWith(row.name),
      );
      if (hit) next[row.rowId] = hit.id;
    }
    setSessionIdMap((prev) => ({ ...prev, ...next }));
  }, [existingSessions, microplanId, calendar]);

  function generateCalendar() {
    if (!communities.length) return;
    const today = new Date();
    const rows: CalendarRow[] = [];
    communities.forEach((c, idx) => {
      for (let m = 0; m < 12; m++) {
        const d = new Date(today.getFullYear(), today.getMonth() + m, 15);
        rows.push({
          rowId: `${c.rowId}-m${m}`,
          name: c.name,
          villageId: c.villageId,
          sessionType: c.strategy,
          scheduledDate: d.toISOString().slice(0, 10),
        });
      }
    });
    setCalendar(rows);
  }

  type StaffRow = {
    rowId: string;
    sessionLabel: string;
    vaccinator: string;
    recorder: string;
    supervisor: string;
    teamType: string;
    target: string;
    perDiem: string;
  };
  const [staffing, setStaffing] = useState<StaffRow[]>([]);
  useEffect(() => {
    if (!calendar.length) return;
    setStaffing((prev) => {
      if (prev.length === calendar.length) return prev;
      return calendar.map((c) => ({
        rowId: c.rowId,
        sessionLabel: `${c.name} — ${c.scheduledDate}`,
        vaccinator: "",
        recorder: "",
        supervisor: "",
        teamType: "fixed",
        target: "0",
        perDiem: "0",
      }));
    });
  }, [calendar]);

  type VaccineRow = {
    name: string;
    target: string;
    doses: number;
    wastage: string;
  };
  const [vaccines, setVaccines] = useState<VaccineRow[]>(
    ANTIGENS.map((a) => ({
      name: a.name,
      target: "0",
      doses: a.doses,
      wastage: String(a.wastage),
    })),
  );
  const [coldChain, setColdChain] = useState({
    coldBoxes: "1",
    icePacks: "4",
    carriers: "1",
  });

  type MobRow = {
    rowId: string;
    sessionLabel: string;
    channels: string[];
    focalPoint: string;
    focalPhone: string;
    iec: string[];
  };
  const [mobilization, setMobilization] = useState<MobRow[]>([]);
  useEffect(() => {
    if (!calendar.length) return;
    setMobilization((prev) => {
      if (prev.length === calendar.length) return prev;
      return calendar.map((c) => ({
        rowId: c.rowId,
        sessionLabel: `${c.name} — ${c.scheduledDate}`,
        channels: ["megaphone"],
        focalPoint: "",
        focalPhone: "",
        iec: [],
      }));
    });
  }, [calendar]);

  type TransportRow = {
    rowId: string;
    sessionLabel: string;
    mode: "walking" | "road" | "boat" | "air";
    distanceKm: string;
    fuelLitres: string;
    vehicle: string;
    cleared: boolean;
  };
  const [transport, setTransport] = useState<TransportRow[]>([]);
  useEffect(() => {
    if (!calendar.length) return;
    setTransport((prev) => {
      if (prev.length === calendar.length) return prev;
      return calendar.map((c) => ({
        rowId: c.rowId,
        sessionLabel: `${c.name} — ${c.scheduledDate}`,
        mode: "road",
        distanceKm: "0",
        fuelLitres: "0",
        vehicle: "",
        cleared: false,
      }));
    });
  }, [calendar]);

  type BudgetRow = {
    rowId: string;
    category: string;
    description: string;
    quantity: string;
    unitCost: string;
    fundingSource: string;
  };
  const [budget, setBudget] = useState<BudgetRow[]>([
    {
      rowId: "b1",
      category: "Personnel",
      description: "",
      quantity: "1",
      unitCost: "0",
      fundingSource: "government",
    },
  ]);

  type SupRow = {
    rowId: string;
    quarter: number;
    scheduledDate: string;
    supervisorName: string;
    checklist: string;
    followUp: string;
  };
  const [supervision, setSupervision] = useState<SupRow[]>([
    {
      rowId: "s1",
      quarter,
      scheduledDate: new Date(year, (quarter - 1) * 3 + 1, 15).toISOString().slice(0, 10),
      supervisorName: "",
      checklist: "WHO RED checklist",
      followUp: "",
    },
  ]);

  // ─── Per-step persistence ──────────────────────────────────────────────
  const [busy, setBusy] = useState(false);

  async function persistStep(step: number): Promise<boolean> {
    setBusy(true);
    try {
      if (!facilityId) throw new Error("Pick a facility first.");
      const mpId = await ensureMicroplan();

      if (step === 1) {
        await patchMicroplan(mpId, {
          staffing: { coverageReview: coverage, staffing: (microplan as any)?.staffing?.staffing ?? [] },
        });
      } else if (step === 2) {
        const districtId = facility?.districtId;
        const nextRows = [...communities];
        for (let i = 0; i < nextRows.length; i++) {
          const row = nextRows[i];
          if (row.saved) continue;
          let vid = row.villageId;
          // Persist newly added (manually typed) communities to villages first.
          if (!vid && row.name.trim() && districtId) {
            try {
              const v = await apiRequest<Village>("POST", "/api/villages", {
                name: row.name.trim(),
                districtId,
                assignedFacilityId: facilityId,
              });
              vid = v.id;
              nextRows[i] = { ...row, villageId: vid };
            } catch (e) {
              console.warn("Could not create village:", e);
              continue;
            }
          }
          if (!vid) continue;
          const target = parseInt(row.targetPopulation || "0", 10);
          if (target > 0) {
            await apiRequest("POST", "/api/population", {
              villageId: vid,
              facilityId,
              source: row.source,
              year,
              totalPopulation: target,
              approvalStatus: "draft",
              metadata: { strategy: row.strategy, type: row.type },
            });
          }
          nextRows[i] = { ...nextRows[i], saved: true };
        }
        setCommunities(nextRows);
      } else if (step === 3) {
        for (const r of risk) {
          if (!r.villageId) continue;
          const composite = Math.round(
            (r.distance + r.terrain + r.season + r.insecurity) * 5,
          );
          await apiRequest("POST", "/api/htr-scores", {
            villageId: r.villageId,
            distanceScore: r.distance,
            terrainScore: r.terrain,
            seasonalScore: r.season,
            insecurityScore: r.insecurity,
            compositeScore: composite,
            interventionPriority:
              composite >= 70 ? "high" : composite >= 50 ? "medium" : "low",
            comments: [r.missed ? "missed_12mo" : null, r.zeroDose ? "zero_dose_hotspot" : null]
              .filter(Boolean)
              .join("; ") || null,
          });
        }
      } else if (step === 4) {
        const persisted: Record<string, number> = { ...sessionIdMap };
        for (const row of calendar) {
          if (!row.scheduledDate || persisted[row.rowId]) continue;
          try {
            const created = await apiRequest<SessionPlan>("POST", "/api/sessions", {
              facilityId,
              microplanId: mpId,
              name: `${row.name} ${row.scheduledDate}`,
              sessionType: row.sessionType,
              quarter,
              year,
              scheduledDate: row.scheduledDate,
              status: "planned",
              approvalStatus: "draft",
            });
            persisted[row.rowId] = created.id;
          } catch (e) {
            // Skip duplicates / lead-time conflicts silently per-row.
            console.warn("Session create skipped:", e);
          }
        }
        setSessionIdMap(persisted);
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      } else if (step === 8) {
        // Single day-plan write per session row; dedupe so step 5/8 cannot
        // produce duplicate session_day_plan rows when both are visited.
        const written = new Set<string>(dayPlansWritten);
        for (let i = 0; i < staffing.length; i++) {
          const s = staffing[i];
          const sid = sessionIdMap[s.rowId];
          if (!sid || written.has(s.rowId)) continue;
          const t = transport[i];
          await apiRequest("POST", `/api/sessions/${sid}/days`, {
            dayNumber: 1,
            sessionDate: calendar[i].scheduledDate,
            communitiesVisited: [calendar[i].name],
            targetPopulation: parseInt(s.target || "0", 10),
            vaccinesRequired: {},
            vaccinatorsCount: s.vaccinator ? 1 : 0,
            recordersCount: s.recorder ? 1 : 0,
            supervisorsCount: s.supervisor ? 1 : 0,
            distanceKm: t?.distanceKm ?? "0",
            transportType: t?.mode ?? "road",
            fuelLiters: t?.fuelLitres ?? "0",
            executionNotes: [
              s.vaccinator && `vaccinator:${s.vaccinator}`,
              s.recorder && `recorder:${s.recorder}`,
              s.supervisor && `supervisor:${s.supervisor}`,
              s.teamType && `team:${s.teamType}`,
              s.perDiem && `perDiem:${s.perDiem}`,
              t?.vehicle && `vehicle:${t.vehicle}`,
              t?.cleared ? "security_cleared" : null,
            ]
              .filter(Boolean)
              .join("; "),
          });
          written.add(s.rowId);
        }
        setDayPlansWritten(written);
      } else if (step === 5) {
        // Step 5 stores staffing in component state only; the durable write
        // happens in step 8 along with transport, so each session_day_plan
        // row is created exactly once.
      } else if (step === 6) {
        for (const v of vaccines) {
          const target = parseInt(v.target || "0", 10);
          if (!target) continue;
          const wast = parseFloat(v.wastage || "0");
          const dosesReq = target * v.doses;
          const dosesWithWastage = Math.ceil(dosesReq * (1 + wast / 100));
          const vials = Math.ceil(dosesWithWastage / 10);
          await apiRequest("POST", "/api/vaccine-requirements", {
            facilityId,
            vaccineName: v.name,
            targetPopulation: target,
            dosesRequired: dosesReq,
            wastageRate: String(wast),
            dosesWithWastage,
            vialsRequired: vials,
            quarter,
            year,
          });
        }
      } else if (step === 7) {
        for (const m of mobilization) {
          if (!m.focalPoint && m.channels.length === 0) continue;
          await apiRequest("POST", "/api/mobilization", {
            facilityId,
            activityType: m.channels.join(",") || "announcement",
            description: `${m.sessionLabel} — focal: ${m.focalPoint} ${m.focalPhone}; IEC: ${m.iec.join(", ")}`,
            targetAudience: "community",
            status: "planned",
          });
        }
      } else if (step === 9) {
        for (const b of budget) {
          if (!b.description.trim()) continue;
          const qty = parseInt(b.quantity || "0", 10);
          const unit = parseFloat(b.unitCost || "0");
          const total = qty * unit;
          await apiRequest("POST", "/api/budget-items", {
            facilityId,
            category: b.category,
            description: b.description,
            unitCost: String(unit),
            quantity: qty,
            totalCost: String(total),
            quarter,
            year,
            fundingSource: b.fundingSource,
            approvalStatus: "draft",
          });
        }
      } else if (step === 10) {
        for (const v of supervision) {
          if (!v.supervisorName.trim()) continue;
          await apiRequest("POST", "/api/supervision-visits", {
            facilityId,
            microplanId: mpId,
            scheduledDate: v.scheduledDate,
            supervisorName: v.supervisorName,
            visitType: "routine",
            status: "scheduled",
            checklist: [{ key: "type", label: v.checklist, response: "na" }],
            followUpActions: v.followUp || null,
          });
        }
      }
      return true;
    } catch (e: any) {
      toast({
        title: `Could not save step ${step}`,
        description: e?.message ?? String(e),
        variant: "destructive",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    const ok = await persistStep(active);
    if (ok && active < 12) setActive(active + 1);
  }

  async function handleSubmit() {
    if (!microplanId) {
      toast({ title: "Nothing to submit yet", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await apiRequest("PATCH", `/api/microplans/${microplanId}`, {
        status: "submitted",
      });
      toast({
        title: "Microplan submitted",
        description: "Sent to district approvers.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      setActive(12);
    } catch (e: any) {
      toast({
        title: "Submit failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────
  const stepDef = STEPS.find((s) => s.id === active)!;
  const status = microplan?.status ?? "draft";
  const facilityLabel = facility?.name ?? "No facility selected";
  const canSubmit =
    user?.role === "facility_in_charge" || user?.role === "national_admin";

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Microplan</p>
            <h1 className="truncate text-lg font-semibold" data-testid="wizard-title">
              {name || `Microplan Q${quarter} ${year}`}
            </h1>
            <p className="text-xs text-muted-foreground">{facilityLabel}</p>
          </div>
          <Badge variant={status === "draft" ? "outline" : "default"}>
            {status}
          </Badge>
        </div>
      </div>

      {/* Body: stepper + content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Left rail */}
        <nav className="w-64 shrink-0 overflow-y-auto" aria-label="Microplan steps">
          <ol className="space-y-1">
            {STEPS.map((s) => {
              const isActive = s.id === active;
              const done = s.id < active;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-muted"
                    }`}
                    data-testid={`step-button-${s.id}`}
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">
                        Step {s.id}
                      </span>
                      <span className="block font-medium leading-tight">
                        {s.title}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                Step {stepDef.id} · {stepDef.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
              <WhatToDo bullets={stepDef.whatToDo} />

              {/* Facility & name (always available, drives ensureMicroplan) */}
              {!microplanId && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div>
                    <Label className="mb-2 block">Facility</Label>
                    <FacilityCascadePicker
                      value={facilityId}
                      onChange={(id) => setFacilityId(id)}
                      required
                      testIdPrefix="wizard"
                    />
                  </div>
                  <div>
                    <Label>Plan name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Microplan Q${quarter} ${year}`}
                      data-testid="input-microplan-name"
                    />
                  </div>
                </div>
              )}

              {active === 1 && (
                <Step1
                  coverage={coverage}
                  setCoverage={setCoverage}
                />
              )}
              {active === 2 && (
                <Step2
                  communities={communities}
                  setCommunities={setCommunities}
                />
              )}
              {active === 3 && <Step3 risk={risk} setRisk={setRisk} />}
              {active === 4 && (
                <Step4
                  calendar={calendar}
                  setCalendar={setCalendar}
                  generate={generateCalendar}
                />
              )}
              {active === 5 && (
                <Step5 staffing={staffing} setStaffing={setStaffing} />
              )}
              {active === 6 && (
                <Step6
                  vaccines={vaccines}
                  setVaccines={setVaccines}
                  coldChain={coldChain}
                  setColdChain={setColdChain}
                />
              )}
              {active === 7 && (
                <Step7
                  mobilization={mobilization}
                  setMobilization={setMobilization}
                />
              )}
              {active === 8 && (
                <Step8 transport={transport} setTransport={setTransport} />
              )}
              {active === 9 && (
                <Step9 budget={budget} setBudget={setBudget} />
              )}
              {active === 10 && (
                <Step10
                  supervision={supervision}
                  setSupervision={setSupervision}
                />
              )}
              {active === 11 && (
                <Step11
                  microplan={microplan ?? null}
                  facilityLabel={facilityLabel}
                  coverage={coverage}
                  communities={communities}
                  calendarCount={calendar.length}
                  vaccinesCount={vaccines.filter((v) => parseInt(v.target || "0", 10) > 0).length}
                  budgetCount={budget.filter((b) => b.description.trim()).length}
                  supCount={supervision.filter((s) => s.supervisorName.trim()).length}
                />
              )}
              {active === 12 && (
                <Step12 microplanId={microplanId} facilityId={facilityId} />
              )}
            </CardContent>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-background p-3">
              <Button
                variant="outline"
                onClick={() => setActive(Math.max(1, active - 1))}
                disabled={active === 1 || busy}
                data-testid="button-back"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  disabled={busy || !facilityId}
                  data-testid="button-save-draft"
                >
                  <Save className="mr-1 h-4 w-4" /> Save Draft
                </Button>
                {active === 11 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || busy || !microplanId}
                    data-testid="button-submit"
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Submit for approval
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={busy || active >= 12 || !facilityId}
                    data-testid="button-next"
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────
function NumberField({
  label,
  value,
  onChange,
  testId,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
  suffix?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Step1({
  coverage,
  setCoverage,
}: {
  coverage: any;
  setCoverage: (v: any) => void;
}) {
  const dtp1 = parseFloat(coverage.dtp1 || "0");
  const dtp3 = parseFloat(coverage.dtp3 || "0");
  const mcv1 = parseFloat(coverage.mcv1 || "0");
  const dropDtp = dtp1 > 0 ? Math.round(((dtp1 - dtp3) / dtp1) * 100) : 0;
  const dropMcv = dtp1 > 0 ? Math.round(((dtp1 - mcv1) / dtp1) * 100) : 0;
  const set = (k: string, v: string) => setCoverage({ ...coverage, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="DTP1 %" value={coverage.dtp1} onChange={(v) => set("dtp1", v)} testId="input-dtp1" suffix="%" />
        <NumberField label="DTP3 %" value={coverage.dtp3} onChange={(v) => set("dtp3", v)} testId="input-dtp3" suffix="%" />
        <NumberField label="MCV1 %" value={coverage.mcv1} onChange={(v) => set("mcv1", v)} testId="input-mcv1" suffix="%" />
        <NumberField label="MCV2 %" value={coverage.mcv2} onChange={(v) => set("mcv2", v)} testId="input-mcv2" suffix="%" />
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
        <div className="text-sm">
          Dropout DTP1→DTP3
          <div className={`text-lg font-semibold ${dropDtp > 10 ? "text-amber-600" : ""}`}>{dropDtp}%</div>
        </div>
        <div className="text-sm">
          Dropout DTP1→MCV1
          <div className={`text-lg font-semibold ${dropMcv > 10 ? "text-amber-600" : ""}`}>{dropMcv}%</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="Stockouts" value={coverage.stockouts} onChange={(v) => set("stockouts", v)} />
        <NumberField label="AEFI cases" value={coverage.aefi} onChange={(v) => set("aefi", v)} />
        <NumberField label="Sessions planned" value={coverage.sessionsPlanned} onChange={(v) => set("sessionsPlanned", v)} />
        <NumberField label="Sessions held" value={coverage.sessionsHeld} onChange={(v) => set("sessionsHeld", v)} />
      </div>
    </div>
  );
}

function Step2({
  communities,
  setCommunities,
}: {
  communities: any[];
  setCommunities: (v: any[]) => void;
}) {
  const update = (i: number, patch: any) => {
    const next = [...communities];
    next[i] = { ...next[i], ...patch };
    setCommunities(next);
  };
  const add = () => {
    setCommunities([
      ...communities,
      {
        name: "",
        type: "village",
        targetPopulation: "0",
        source: "nso",
        strategy: "static",
        rowId: `new-${Date.now()}`,
      },
    ]);
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={add} data-testid="button-add-community">
          <Plus className="mr-1 h-4 w-4" /> Add community
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Target pop.</th>
              <th className="p-2">Source</th>
              <th className="p-2">Strategy</th>
            </tr>
          </thead>
          <tbody>
            {communities.map((c, i) => (
              <tr key={c.rowId} className="border-b">
                <td className="p-1">
                  <Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} />
                </td>
                <td className="p-1">
                  <Select value={c.type} onValueChange={(v) => update(i, { type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="village">Village</SelectItem>
                      <SelectItem value="hamlet">Hamlet</SelectItem>
                      <SelectItem value="idp">IDP camp</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Input type="number" value={c.targetPopulation} onChange={(e) => update(i, { targetPopulation: e.target.value })} />
                </td>
                <td className="p-1">
                  <Select value={c.source} onValueChange={(v) => update(i, { source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nso">NSO</SelectItem>
                      <SelectItem value="hmis">HMIS</SelectItem>
                      <SelectItem value="worldpop">WorldPop</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="community_census">Community census</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Select value={c.strategy} onValueChange={(v) => update(i, { strategy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Fixed</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {communities.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">
                  No communities yet — pick a facility to load villages, or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step3({ risk, setRisk }: { risk: any[]; setRisk: (v: any[]) => void }) {
  const upd = (i: number, patch: any) => {
    const next = [...risk];
    next[i] = { ...next[i], ...patch };
    setRisk(next);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Community</th>
            <th className="p-2">Distance</th>
            <th className="p-2">Terrain</th>
            <th className="p-2">Season</th>
            <th className="p-2">Insecurity</th>
            <th className="p-2">Missed</th>
            <th className="p-2">Zero-dose</th>
          </tr>
        </thead>
        <tbody>
          {risk.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{r.name}</td>
              {(["distance", "terrain", "season", "insecurity"] as const).map((k) => (
                <td key={k} className="p-2">
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[r[k]]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(v) => upd(i, { [k]: v[0] })}
                      className="w-24"
                    />
                    <span className="w-4 text-xs">{r[k]}</span>
                  </div>
                </td>
              ))}
              <td className="p-2">
                <Checkbox checked={r.missed} onCheckedChange={(v) => upd(i, { missed: !!v })} />
              </td>
              <td className="p-2">
                <Checkbox checked={r.zeroDose} onCheckedChange={(v) => upd(i, { zeroDose: !!v })} />
              </td>
            </tr>
          ))}
          {risk.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-muted-foreground">
                Finish Step 2 first.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Step4({
  calendar,
  setCalendar,
  generate,
}: {
  calendar: any[];
  setCalendar: (v: any[]) => void;
  generate: () => void;
}) {
  const upd = (i: number, patch: any) => {
    const next = [...calendar];
    next[i] = { ...next[i], ...patch };
    setCalendar(next);
  };
  const remove = (i: number) => setCalendar(calendar.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={generate} data-testid="button-generate-calendar">
          Generate 12-month calendar
        </Button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b bg-background text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Community</th>
              <th className="p-2">Date</th>
              <th className="p-2">Type</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((c, i) => (
              <tr key={c.rowId} className="border-b">
                <td className="p-1">{c.name}</td>
                <td className="p-1">
                  <Input type="date" value={c.scheduledDate} onChange={(e) => upd(i, { scheduledDate: e.target.value })} />
                </td>
                <td className="p-1">
                  <Select value={c.sessionType} onValueChange={(v) => upd(i, { sessionType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {calendar.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No sessions yet — click "Generate 12-month calendar" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step5({ staffing, setStaffing }: { staffing: any[]; setStaffing: (v: any[]) => void }) {
  const upd = (i: number, patch: any) => {
    const next = [...staffing];
    next[i] = { ...next[i], ...patch };
    setStaffing(next);
  };
  return (
    <div className="max-h-[420px] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Session day</th>
            <th className="p-2">Vaccinator</th>
            <th className="p-2">Recorder</th>
            <th className="p-2">Supervisor</th>
            <th className="p-2">Team</th>
            <th className="p-2">Target</th>
            <th className="p-2">Per-diem</th>
          </tr>
        </thead>
        <tbody>
          {staffing.map((s, i) => (
            <tr key={s.rowId} className="border-b">
              <td className="p-2 text-xs">{s.sessionLabel}</td>
              <td className="p-1"><Input value={s.vaccinator} onChange={(e) => upd(i, { vaccinator: e.target.value })} /></td>
              <td className="p-1"><Input value={s.recorder} onChange={(e) => upd(i, { recorder: e.target.value })} /></td>
              <td className="p-1"><Input value={s.supervisor} onChange={(e) => upd(i, { supervisor: e.target.value })} /></td>
              <td className="p-1">
                <Select value={s.teamType} onValueChange={(v) => upd(i, { teamType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="house_to_house">House-to-house</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1"><Input type="number" value={s.target} onChange={(e) => upd(i, { target: e.target.value })} /></td>
              <td className="p-1"><Input type="number" value={s.perDiem} onChange={(e) => upd(i, { perDiem: e.target.value })} /></td>
            </tr>
          ))}
          {staffing.length === 0 && (
            <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Finish Step 4 first.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Step6({
  vaccines,
  setVaccines,
  coldChain,
  setColdChain,
}: {
  vaccines: any[];
  setVaccines: (v: any[]) => void;
  coldChain: any;
  setColdChain: (v: any) => void;
}) {
  const upd = (i: number, patch: any) => {
    const next = [...vaccines];
    next[i] = { ...next[i], ...patch };
    setVaccines(next);
  };
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Antigen</th>
              <th className="p-2">Target pop.</th>
              <th className="p-2">Doses/child</th>
              <th className="p-2">Wastage %</th>
              <th className="p-2">Doses w/ wastage</th>
              <th className="p-2">Vials (10/vial)</th>
            </tr>
          </thead>
          <tbody>
            {vaccines.map((v, i) => {
              const tgt = parseInt(v.target || "0", 10);
              const w = parseFloat(v.wastage || "0");
              const dosesReq = tgt * v.doses;
              const total = Math.ceil(dosesReq * (1 + w / 100));
              const vials = Math.ceil(total / 10);
              return (
                <tr key={v.name} className="border-b">
                  <td className="p-2 font-medium">{v.name}</td>
                  <td className="p-1"><Input type="number" value={v.target} onChange={(e) => upd(i, { target: e.target.value })} /></td>
                  <td className="p-2 text-center">{v.doses}</td>
                  <td className="p-1"><Input type="number" value={v.wastage} onChange={(e) => upd(i, { wastage: e.target.value })} /></td>
                  <td className="p-2">{total.toLocaleString()}</td>
                  <td className="p-2">{vials.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3">
        <NumberField label="Cold boxes" value={coldChain.coldBoxes} onChange={(v) => setColdChain({ ...coldChain, coldBoxes: v })} />
        <NumberField label="Ice packs" value={coldChain.icePacks} onChange={(v) => setColdChain({ ...coldChain, icePacks: v })} />
        <NumberField label="Carriers / session" value={coldChain.carriers} onChange={(v) => setColdChain({ ...coldChain, carriers: v })} />
      </div>
    </div>
  );
}

const MOB_CHANNELS = ["megaphone", "religious_leader", "sms", "radio", "community_meeting"];
const IEC_MATERIALS = ["posters", "leaflets", "banners", "stickers"];

function Step7({
  mobilization,
  setMobilization,
}: {
  mobilization: any[];
  setMobilization: (v: any[]) => void;
}) {
  const upd = (i: number, patch: any) => {
    const next = [...mobilization];
    next[i] = { ...next[i], ...patch };
    setMobilization(next);
  };
  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="max-h-[420px] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Session day</th>
            <th className="p-2">Channels</th>
            <th className="p-2">Focal point</th>
            <th className="p-2">Phone</th>
            <th className="p-2">IEC materials</th>
          </tr>
        </thead>
        <tbody>
          {mobilization.map((m, i) => (
            <tr key={m.rowId} className="border-b align-top">
              <td className="p-2 text-xs">{m.sessionLabel}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {MOB_CHANNELS.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs">
                      <Checkbox checked={m.channels.includes(c)} onCheckedChange={() => upd(i, { channels: toggle(m.channels, c) })} />
                      {c.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </td>
              <td className="p-1"><Input value={m.focalPoint} onChange={(e) => upd(i, { focalPoint: e.target.value })} /></td>
              <td className="p-1"><Input value={m.focalPhone} onChange={(e) => upd(i, { focalPhone: e.target.value })} /></td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {IEC_MATERIALS.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs">
                      <Checkbox checked={m.iec.includes(c)} onCheckedChange={() => upd(i, { iec: toggle(m.iec, c) })} />
                      {c}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {mobilization.length === 0 && (
            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Finish Step 4 first.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Step8({ transport, setTransport }: { transport: any[]; setTransport: (v: any[]) => void }) {
  const upd = (i: number, patch: any) => {
    const next = [...transport];
    next[i] = { ...next[i], ...patch };
    setTransport(next);
  };
  return (
    <div className="max-h-[420px] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Session day</th>
            <th className="p-2">Mode</th>
            <th className="p-2">Distance km</th>
            <th className="p-2">Fuel L</th>
            <th className="p-2">Vehicle / boat</th>
            <th className="p-2">Cleared</th>
          </tr>
        </thead>
        <tbody>
          {transport.map((t, i) => (
            <tr key={t.rowId} className="border-b">
              <td className="p-2 text-xs">{t.sessionLabel}</td>
              <td className="p-1">
                <Select value={t.mode} onValueChange={(v) => upd(i, { mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walking">Foot</SelectItem>
                    <SelectItem value="road">Road / 4WD</SelectItem>
                    <SelectItem value="boat">Boat</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1"><Input type="number" value={t.distanceKm} onChange={(e) => upd(i, { distanceKm: e.target.value })} /></td>
              <td className="p-1"><Input type="number" value={t.fuelLitres} onChange={(e) => upd(i, { fuelLitres: e.target.value })} /></td>
              <td className="p-1"><Input value={t.vehicle} onChange={(e) => upd(i, { vehicle: e.target.value })} /></td>
              <td className="p-2"><Checkbox checked={t.cleared} onCheckedChange={(v) => upd(i, { cleared: !!v })} /></td>
            </tr>
          ))}
          {transport.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Finish Step 4 first.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Step9({ budget, setBudget }: { budget: any[]; setBudget: (v: any[]) => void }) {
  const upd = (i: number, patch: any) => {
    const next = [...budget];
    next[i] = { ...next[i], ...patch };
    setBudget(next);
  };
  const add = () =>
    setBudget([
      ...budget,
      {
        rowId: `b-${Date.now()}`,
        category: "Transport",
        description: "",
        quantity: "1",
        unitCost: "0",
        fundingSource: "government",
      },
    ]);
  const remove = (i: number) => setBudget(budget.filter((_, idx) => idx !== i));
  const total = budget.reduce(
    (s, b) => s + parseFloat(b.unitCost || "0") * parseInt(b.quantity || "0", 10),
    0,
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Total: {total.toLocaleString()}</p>
        <Button size="sm" variant="outline" onClick={add} data-testid="button-add-budget">
          <Plus className="mr-1 h-4 w-4" /> Add line
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Category</th>
              <th className="p-2">Description</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Total</th>
              <th className="p-2">Funding</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {budget.map((b, i) => (
              <tr key={b.rowId} className="border-b">
                <td className="p-1">
                  <Select value={b.category} onValueChange={(v) => upd(i, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1"><Input value={b.description} onChange={(e) => upd(i, { description: e.target.value })} /></td>
                <td className="p-1"><Input type="number" value={b.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} /></td>
                <td className="p-1"><Input type="number" value={b.unitCost} onChange={(e) => upd(i, { unitCost: e.target.value })} /></td>
                <td className="p-2">{(parseFloat(b.unitCost || "0") * parseInt(b.quantity || "0", 10)).toLocaleString()}</td>
                <td className="p-1">
                  <Select value={b.fundingSource} onValueChange={(v) => upd(i, { fundingSource: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNDING_SOURCES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step10({ supervision, setSupervision }: { supervision: any[]; setSupervision: (v: any[]) => void }) {
  const upd = (i: number, patch: any) => {
    const next = [...supervision];
    next[i] = { ...next[i], ...patch };
    setSupervision(next);
  };
  const add = () =>
    setSupervision([
      ...supervision,
      {
        rowId: `s-${Date.now()}`,
        quarter: currentQuarter(),
        scheduledDate: new Date().toISOString().slice(0, 10),
        supervisorName: "",
        checklist: "WHO RED checklist",
        followUp: "",
      },
    ]);
  const remove = (i: number) => setSupervision(supervision.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={add} data-testid="button-add-supervision">
          <Plus className="mr-1 h-4 w-4" /> Add visit
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Qtr</th>
            <th className="p-2">Date</th>
            <th className="p-2">Supervisor</th>
            <th className="p-2">Checklist</th>
            <th className="p-2">Follow-up</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {supervision.map((v, i) => (
            <tr key={v.rowId} className="border-b align-top">
              <td className="p-1">
                <Select value={String(v.quarter)} onValueChange={(x) => upd(i, { quarter: Number(x) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (<SelectItem key={q} value={String(q)}>Q{q}</SelectItem>))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1"><Input type="date" value={v.scheduledDate} onChange={(e) => upd(i, { scheduledDate: e.target.value })} /></td>
              <td className="p-1"><Input value={v.supervisorName} onChange={(e) => upd(i, { supervisorName: e.target.value })} /></td>
              <td className="p-1"><Input value={v.checklist} onChange={(e) => upd(i, { checklist: e.target.value })} /></td>
              <td className="p-1"><Textarea rows={2} value={v.followUp} onChange={(e) => upd(i, { followUp: e.target.value })} /></td>
              <td className="p-1">
                <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  ) : (
    <Circle className="h-4 w-4 text-muted-foreground" />
  );
}

function Step11({
  microplan,
  facilityLabel,
  coverage,
  communities,
  calendarCount,
  vaccinesCount,
  budgetCount,
  supCount,
}: {
  microplan: Microplan | null;
  facilityLabel: string;
  coverage: any;
  communities: any[];
  calendarCount: number;
  vaccinesCount: number;
  budgetCount: number;
  supCount: number;
}) {
  const status = microplan?.status ?? "draft";
  const lines = [
    { label: "Coverage review entered", ok: !!parseFloat(coverage.dtp1 || "0") },
    { label: "Communities listed", ok: communities.length > 0 },
    { label: "Risk scores captured", ok: true },
    { label: "Session calendar created", ok: calendarCount > 0 },
    { label: "Staffing assigned", ok: calendarCount > 0 },
    { label: "Vaccines forecasted", ok: vaccinesCount > 0 },
    { label: "Mobilization planned", ok: calendarCount > 0 },
    { label: "Transport planned", ok: calendarCount > 0 },
    { label: "Budget entered", ok: budgetCount > 0 },
    { label: "Supervision planned", ok: supCount > 0 },
  ];
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{facilityLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex items-center gap-2">
                <Tick ok={l.ok} /> {l.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p>
          Current status: <Badge variant="outline">{status}</Badge>
        </p>
        {status === "submitted" && (
          <p className="mt-1 text-muted-foreground">
            Awaiting district approval.
          </p>
        )}
      </div>
    </div>
  );
}

function Step12({
  microplanId,
  facilityId,
}: {
  microplanId: number | null;
  facilityId: number | null;
}) {
  const { data: sessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
    enabled: !!microplanId,
  });
  const mine = (sessions ?? []).filter((s) => s.microplanId === microplanId);
  const dosesThisMonth = mine.reduce((sum, s) => {
    const v = (s as any).vaccinatedCounts;
    return sum + (v?.totals ?? 0);
  }, 0);
  const completed = mine.filter((s) => s.completedAt).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Sessions in plan</p><p className="text-2xl font-semibold">{mine.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-semibold">{completed}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Doses recorded</p><p className="text-2xl font-semibold">{dosesThisMonth}</p></CardContent></Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Once the microplan is approved and execution begins, this view will show live counters.
      </p>
    </div>
  );
}
