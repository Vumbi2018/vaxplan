import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Pencil,
  ArrowLeft,
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  Locate,
  Satellite,
  Map as MapIcon,
  Maximize2,
  HelpCircle,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePersistedBasemap } from "@/hooks/usePersistedBasemap";
import { canApproveSessionPlan } from "@/lib/permissions";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCachedPopulation, setCachedPopulation } from "@/lib/populationCache";
import {
  estimateCatchmentPopulation,
  type CatchmentEstimateResult,
  type CatchmentCell,
} from "@/lib/worldpopCatchment";
import type {
  Microplan,
  Facility,
  Village,
  SessionPlan,
  SessionDayPlan,
  BudgetItem,
  VaccineRequirement,
  MobilizationActivity,
  SupervisionVisit,
  PopulationData,
  HtrScore,
} from "@shared/schema";
import {
  getMinScheduleDate,
  toDateInputValue,
  isAtLeastDaysAhead,
} from "@shared/schedulingDates";

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

// Task #101 / #130 — context the wizard needs to send the user back to a
// village session once the microplan exists. Persisted to sessionStorage so
// it survives hard reloads and clean-URL navigations (e.g. `/microplan/new?id=`).
type ReturnVillage = {
  villageId: number;
  name: string;
  lat: number | null;
  lng: number | null;
  isHardToReach: boolean;
};

const RETURN_VILLAGE_STORAGE_PREFIX = "microplan:returnVillage:";
const returnVillageStorageKey = (id: number | null) =>
  `${RETURN_VILLAGE_STORAGE_PREFIX}${id ?? "new"}`;

function readStoredReturnVillage(id: number | null): ReturnVillage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(returnVillageStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.villageId !== "number") return null;
    return {
      villageId: parsed.villageId,
      name: typeof parsed.name === "string" ? parsed.name : "",
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      isHardToReach: !!parsed.isHardToReach,
    };
  } catch {
    return null;
  }
}

function writeStoredReturnVillage(id: number | null, v: ReturnVillage) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(returnVillageStorageKey(id), JSON.stringify(v));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

function clearStoredReturnVillage(id: number | null) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(returnVillageStorageKey(id));
  } catch {
    /* ignore */
  }
}

// Audit metadata for a village that was removed from a facility's catchment in
// Step 2 of the wizard. Surfaced in the "Previously removed" panel so staff can
// see who removed each community, when, and (optionally) why before deciding
// whether to add it back.
type ExcludedVillageDetail = {
  villageId: number;
  removedAt: string | null;
  removedByUserId: string | null;
  removedByName: string | null;
  reason: string | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────
// Props:
//   prePlanType: when the route already declares the intent (e.g.
//   /microplans/routine vs /microplans/campaigns) the plan-type chooser is
//   locked to that value and a badge is shown in the header. /flow leaves
//   it undefined → the chooser defaults to "routine" but stays editable.
type MicroplanWizardProps = {
  prePlanType?: "routine" | "campaign";
};

export default function MicroplanWizard({ prePlanType }: MicroplanWizardProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [active, setActive] = useState(1);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [microplanId, setMicroplanId] = useState<number | null>(null);

  // ─── Plan type (routine vs SIA campaign) ──────────────────────────────
  // The wizard is the same template for both flows; only the planType and
  // a handful of SIA-only fields differ. When the route pre-selects a type
  // (Routine Microplan / SIA Campaigns sidebar entries) we lock the chooser.
  const [planType, setPlanType] = useState<"routine" | "campaign">(prePlanType ?? "routine");
  const planTypeLocked = !!prePlanType;
  useEffect(() => {
    if (prePlanType) setPlanType(prePlanType);
  }, [prePlanType]);

  // SIA-only metadata. Stored on the microplan record so per-session data
  // (forecasting, supervision plan, etc.) inherits the campaign context.
  // Defaults match the polio SIA pattern most ministries run; they're free
  // text so unusual campaigns (measles follow-up, HPV catch-up, etc.) work
  // without code changes.
  const [campaignAntigen, setCampaignAntigen] = useState("Polio");
  const [campaignTargetAge, setCampaignTargetAge] = useState("0-59 months");
  const [campaignScope, setCampaignScope] = useState<"National" | "Sub-national" | "Targeted">("National");

  // Task #101 — when the user lands here from a village pin that had no
  // routine microplan, the map passes the facility to prefill plus the
  // village context so we can hand them back to the New Session dialog
  // once a microplan exists.
  const initialQueryParams = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, []);
  const queryFacilityId = (() => {
    const raw = initialQueryParams?.get("facilityId");
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  })();
  // Task #130 — initialize from URL when present, otherwise restore from
  // sessionStorage so a hard reload or in-app revisit keeps the banner alive.
  const [returnVillage, setReturnVillage] = useState<ReturnVillage | null>(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const idRaw = sp.get("returnVillageId");
    if (idRaw) {
      const id = Number(idRaw);
      if (Number.isFinite(id)) {
        const lat = Number(sp.get("returnVillageLat"));
        const lng = Number(sp.get("returnVillageLng"));
        return {
          villageId: id,
          name: sp.get("returnVillageName") ?? "",
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          isHardToReach: sp.get("returnVillageHtr") === "1",
        };
      }
    }
    const idParam = sp.get("id");
    const wizardId =
      idParam && !Number.isNaN(Number(idParam)) ? Number(idParam) : null;
    return readStoredReturnVillage(wizardId) ?? readStoredReturnVillage(null);
  });

  const [facilityId, setFacilityId] = useState<number | null>(
    queryFacilityId ?? user?.facilityId ?? null,
  );
  const [name, setName] = useState("");
  // Year & quarter default to "today" for new microplans but must become
  // editable once we resume an existing draft so the Step 1 inputs reflect
  // the saved values instead of silently overwriting them.
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(currentQuarter());

  // Resume an existing draft via either the path param (/microplans/routine/:id,
  // /microplans/campaigns/:id) or the legacy `?id=` query string. The path-param
  // form is what SessionsHub / the map popups link to — without honouring it the
  // wizard silently stayed in "new microplan" mode and hid the saved plan
  // (along with its planned sessions) from the user.
  const [, routineParams] = useRoute("/microplans/routine/:id");
  const [, campaignParams] = useRoute("/microplans/campaigns/:id");
  const routeIdRaw = routineParams?.id ?? campaignParams?.id ?? null;
  useEffect(() => {
    if (routeIdRaw && !Number.isNaN(Number(routeIdRaw))) {
      setMicroplanId(Number(routeIdRaw));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id && !Number.isNaN(Number(id))) {
      setMicroplanId(Number(id));
    }
  }, [routeIdRaw]);

  // Sync facility from user when it arrives — but never override an explicit
  // ?facilityId= prefill coming from the village pin (Task #101).
  useEffect(() => {
    if (queryFacilityId) return;
    if (user?.facilityId && !facilityId) setFacilityId(user.facilityId);
  }, [user, facilityId, queryFacilityId]);

  // Task #130 — keep sessionStorage in sync with the live context so a reload
  // restores the banner. Once we have a real microplanId we migrate the entry
  // off the "new" bucket onto the id-keyed bucket.
  useEffect(() => {
    if (!returnVillage) return;
    if (microplanId) {
      writeStoredReturnVillage(microplanId, returnVillage);
      clearStoredReturnVillage(null);
    } else {
      writeStoredReturnVillage(null, returnVillage);
    }
  }, [returnVillage, microplanId]);

  const clearReturnVillage = () => {
    clearStoredReturnVillage(microplanId);
    clearStoredReturnVillage(null);
    setReturnVillage(null);
  };

  const continueToVillageSession = () => {
    if (!returnVillage || !microplanId) return;
    const qs = new URLSearchParams({
      unservedVillageId: String(returnVillage.villageId),
      unservedName: returnVillage.name,
      unservedHtr: returnVillage.isHardToReach ? "1" : "0",
      prefillKind: "village",
      autoOpen: "1",
    });
    if (returnVillage.lat != null) qs.set("unservedLat", String(returnVillage.lat));
    if (returnVillage.lng != null) qs.set("unservedLng", String(returnVillage.lng));
    clearReturnVillage();
    setLocation(`/sessions/microplan/${microplanId}?${qs.toString()}`);
  };

  // ─── Data fetches ───────────────────────────────────────────────────────
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });
  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });
  // Consolidated hydration: one request returns the microplan plus every
  // per-microplan / per-facility row the wizard's resume effects need. This
  // replaces 8 separate round trips (sessions, day plans, supervision visits,
  // population, htr scores, vaccine reqs, mobilization, budget) — see
  // GET /api/microplans/:id/hydration.
  type MicroplanHydration = {
    microplan: Microplan;
    sessions: SessionPlan[];
    sessionDayPlans: SessionDayPlan[];
    supervisionVisits: SupervisionVisit[];
    population: PopulationData[];
    vaccineRequirements: VaccineRequirement[];
    mobilization: MobilizationActivity[];
    budgetItems: BudgetItem[];
    htrScores: HtrScore[];
    excludedVillageIds?: number[];
    excludedVillages?: ExcludedVillageDetail[];
  };
  const { data: hydration } = useQuery<MicroplanHydration>({
    queryKey: ["/api/microplans", microplanId, "hydration"],
    queryFn: async () => {
      const res = await fetch(`/api/microplans/${microplanId}/hydration`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load microplan");
      return res.json();
    },
    enabled: !!microplanId,
  });
  const microplan = hydration?.microplan;

  useEffect(() => {
    if (microplan) {
      if (microplan.facilityId) setFacilityId(microplan.facilityId);
      if (microplan.name) setName(microplan.name);
      // Mirror the saved year/quarter/planType into Step 1 so reopening an
      // existing microplan shows it exactly as the author left it instead of
      // silently snapping back to "today's" period or the default plan type.
      if (typeof microplan.year === "number") setYear(microplan.year);
      if (typeof microplan.quarter === "number") setQuarter(microplan.quarter);
      if (microplan.planType) {
        // DB enum values are `facility_routine` / `sia_campaign`; the wizard
        // works in the shorter `routine` / `campaign` vocabulary.
        const mapped =
          microplan.planType === "sia_campaign" || microplan.planType === "campaign"
            ? "campaign"
            : "routine";
        setPlanType(mapped);
      }
    }
  }, [microplan]);

  const facility = useMemo(
    () => facilities?.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId],
  );

  // Track villages the user explicitly removed from this facility's catchment
  // in Step 2. Persisted server-side per facility (see
  // /api/facilities/:id/excluded-villages and task #167) so the choice
  // follows the user across devices, browsers, and cache clears.
  //
  // Legacy localStorage key (kept only to migrate users transitioning off the
  // browser-only persistence). Once the server has any value for the facility
  // we treat the server as the source of truth and drop the local copy.
  const legacyExcludedKey = facilityId
    ? `microplan-excluded-villages:${facilityId}`
    : null;
  const loadLegacyExcluded = (key: string | null): number[] => {
    if (!key || typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((n: any) => typeof n === "number")
        : [];
    } catch {
      return [];
    }
  };

  // Fetch the server-side list whenever a facility is selected. We also pull
  // it out of the microplan hydration response (cheaper, no extra round trip)
  // when a microplan is loaded; both paths converge on the same query cache.
  const excludedQueryKey = facilityId
    ? ["/api/facilities", facilityId, "excluded-villages"] as const
    : null;
  const { data: excludedFromServer, isSuccess: excludedLoaded } = useQuery<{
    facilityId: number;
    villageIds: number[];
    villages?: ExcludedVillageDetail[];
  }>({
    queryKey: excludedQueryKey ?? ["/api/facilities", "none", "excluded-villages"],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}/excluded-villages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load excluded villages");
      return res.json();
    },
    enabled: !!facilityId,
  });

  const [excludedVillageIds, setExcludedVillageIds] = useState<Set<number>>(
    () => new Set<number>(),
  );
  const [excludedDetails, setExcludedDetails] = useState<Map<number, ExcludedVillageDetail>>(
    () => new Map(),
  );
  const [excludedReady, setExcludedReady] = useState<boolean>(false);
  const loadedExcludedFacilityRef = useRef<number | null>(null);

  // Reset the readiness flag whenever the facility changes so the catchment
  // seed effect waits for the server response before populating from
  // facilityVillages — otherwise a previously-removed village could slip
  // back in during the moment between switch and server response.
  useEffect(() => {
    if (loadedExcludedFacilityRef.current !== facilityId) {
      setExcludedReady(false);
      setExcludedVillageIds(new Set<number>());
      setExcludedDetails(new Map());
      loadedExcludedFacilityRef.current = facilityId;
    }
  }, [facilityId]);

  // Hydrate excludedVillageIds from whichever source resolves first:
  //   1. the per-microplan hydration payload (preferred — already in flight)
  //   2. the dedicated /excluded-villages query for the facility
  //   3. legacy localStorage values (one-shot migration to the server)
  useEffect(() => {
    if (!facilityId) return;
    const fromHydrationIds = hydration?.excludedVillageIds;
    const fromHydrationDetails = hydration?.excludedVillages;
    const fromQueryIds = excludedFromServer?.villageIds;
    const fromQueryDetails = excludedFromServer?.villages;
    let serverIds: number[] | null = null;
    let serverDetails: ExcludedVillageDetail[] | null = null;
    if (Array.isArray(fromHydrationIds)) {
      serverIds = fromHydrationIds;
      serverDetails = Array.isArray(fromHydrationDetails) ? fromHydrationDetails : null;
    } else if (Array.isArray(fromQueryIds)) {
      serverIds = fromQueryIds;
      serverDetails = Array.isArray(fromQueryDetails) ? fromQueryDetails : null;
    }
    if (serverIds === null) return;

    const next = new Set<number>(serverIds);
    const detailMap = new Map<number, ExcludedVillageDetail>();
    if (serverDetails) {
      for (const d of serverDetails) {
        if (typeof d?.villageId === "number") detailMap.set(d.villageId, d);
      }
    }
    // Migrate any legacy localStorage entries the user accumulated before
    // server persistence existed. We push them to the server once and then
    // clear the key so subsequent loads use the server copy directly.
    const legacy = loadLegacyExcluded(legacyExcludedKey);
    const missing = legacy.filter((id) => !next.has(id));
    if (missing.length > 0) {
      missing.forEach((id) => next.add(id));
      void apiRequest("PUT", `/api/facilities/${facilityId}/excluded-villages`, {
        villageIds: Array.from(next),
      }).then(() => {
        try {
          if (legacyExcludedKey) localStorage.removeItem(legacyExcludedKey);
        } catch {
          // ignore
        }
        queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "excluded-villages"] });
      }).catch((e) => console.warn("Failed to migrate excluded villages:", e));
    } else if (legacyExcludedKey) {
      try {
        localStorage.removeItem(legacyExcludedKey);
      } catch {
        // ignore
      }
    }
    setExcludedVillageIds(next);
    setExcludedDetails(detailMap);
    setExcludedReady(true);
  }, [facilityId, hydration?.excludedVillageIds, hydration?.excludedVillages, excludedFromServer, excludedLoaded, legacyExcludedKey]);

  // Persist the desired exclusion set with optional per-village reason. The
  // server preserves the original removedAt/removedByUserId on entries that
  // were already excluded, so a no-op resave from a different user doesn't
  // overwrite the audit trail.
  const persistExcluded = (
    next: Set<number>,
    reasonByVillage?: Map<number, string | null>,
  ) => {
    if (!facilityId) return;
    const villageIdList: number[] = [];
    next.forEach((id) => villageIdList.push(id));
    const payloadVillages = villageIdList.map((villageId) => ({
      villageId,
      reason: reasonByVillage?.get(villageId) ?? null,
    }));
    void apiRequest("PUT", `/api/facilities/${facilityId}/excluded-villages`, {
      villages: payloadVillages,
    })
      .then((data: any) => {
        if (data && Array.isArray(data.villages)) {
          const map = new Map<number, ExcludedVillageDetail>();
          for (const d of data.villages as ExcludedVillageDetail[]) {
            if (typeof d?.villageId === "number") map.set(d.villageId, d);
          }
          setExcludedDetails(map);
        }
        queryClient.invalidateQueries({
          queryKey: ["/api/facilities", facilityId, "excluded-villages"],
        });
      })
      .catch((e) => {
        console.warn("Failed to persist excluded villages:", e);
      });
  };

  const facilityVillages = useMemo(() => {
    if (!villages || !facility) return [] as Village[];
    return villages.filter(
      (v) =>
        (v.assignedFacilityId === facility.id ||
          v.districtId === facility.districtId) &&
        !excludedVillageIds.has(v.id),
    );
  }, [villages, facility, excludedVillageIds]);

  // Villages the user previously removed from this facility's catchment.
  // Surfaced in Step 2 so a misclick is reversible without re-typing names.
  const excludedFacilityVillages = useMemo(() => {
    if (!villages || !facility) return [] as Village[];
    return villages.filter(
      (v) =>
        excludedVillageIds.has(v.id) &&
        (v.assignedFacilityId === facility.id ||
          v.districtId === facility.districtId),
    );
  }, [villages, facility, excludedVillageIds]);

  // ─── Microplan ensure (idempotent via in-flight ref) ───────────────────
  const ensureInFlight = useRef<Promise<number> | null>(null);
  const ensureMicroplan = async (): Promise<number> => {
    if (microplanId) return microplanId;
    if (ensureInFlight.current) return ensureInFlight.current;
    if (!facilityId) throw new Error("Pick a facility first.");
    const p = (async () => {
      const isCampaign = planType === "campaign";
      const created = await apiRequest<Microplan>("POST", "/api/microplans", {
        facilityId,
        name:
          name.trim() ||
          `${isCampaign ? "SIA" : "Routine"} microplan Q${quarter} ${year}`,
        planType: isCampaign ? "sia_campaign" : "facility_routine",
        year,
        quarter,
        status: "draft",
        ...(isCampaign
          ? {
              campaignAntigen,
              campaignTargetAge,
              campaignScope,
            }
          : {}),
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
  const [dayPlanIdMap, setDayPlanIdMap] = useState<Record<string, number>>({});

  // ─── Rehydration data (resume case) ─────────────────────────────────────
  // Derived from the single /api/microplans/:id/hydration call above so each
  // step's resume effect doesn't trigger its own request.
  const existingSessions = hydration?.sessions;
  const existingPopulation = hydration?.population;
  const existingHtr = hydration?.htrScores;
  const existingVaccineReqs = hydration?.vaccineRequirements;
  const existingMobilization = hydration?.mobilization;
  const existingBudget = hydration?.budgetItems;
  const existingSupervision = hydration?.supervisionVisits;
  const existingDayPlans = hydration?.sessionDayPlans;

  // ─── Save draft ────────────────────────────────────────────────────────
  const saveDraft = async () => {
    // Persist the current step through the shared save path so a manual save
    // also benefits from validation-error focus. persistStep handles its own
    // error toasts and field focus; we only add the success confirmation.
    // Capture the dispatched snapshot up front so concurrent edits aren't
    // wrongly marked clean.
    const snap = snapshotForStep(active);
    setSaveStatus("saving");
    const ok = await persistStep(active);
    if (ok) {
      savedSnapshots.current[active] = snap;
      setLastSavedAt(Date.now());
      setSaveStatus("saved");
      toast({
        title: "Draft saved",
        description: "You can leave and come back without losing progress.",
      });
    } else {
      setSaveStatus("idle");
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
    id?: number;
    villageId?: number;
    name: string;
    type: "village" | "hamlet" | "idp" | "school";
    targetPopulation: string;
    source: "nso" | "hmis" | "worldpop" | "survey" | "community_census";
    strategy: "static" | "outreach" | "mobile";
    saved?: boolean;
    rowId: string;
    latitude?: string;
    longitude?: string;
    latLngDirty?: boolean;
  };
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  // Initial seed from facility villages (only when there are no saved
  // communities to hydrate). Population merge happens in a later effect.
  useEffect(() => {
    // Wait until exclusions for the current facility have been loaded from
    // localStorage; otherwise a previously removed village can slip back into
    // the seed before `excludedVillageIds` rehydrates.
    if (!excludedReady) return;
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
        latitude: v.latitude != null ? String(v.latitude) : undefined,
        longitude: v.longitude != null ? String(v.longitude) : undefined,
      })),
    );
  }, [facilityVillages, communities.length]);

  // Rehydrate Step 2 from saved population rows for this facility & year so
  // re-saves PATCH instead of inserting duplicates.
  const hydratedRef = useRef({
    communities: false,
    risk: false,
    calendar: false,
    dayPlans: false,
    vaccines: false,
    mobilization: false,
    budget: false,
    supervision: false,
  });
  useEffect(() => {
    if (!microplanId || !existingPopulation || hydratedRef.current.communities) return;
    if (!communities.length) return;
    setCommunities((prev) =>
      prev.map((c) => {
        const hit = existingPopulation.find(
          (p) => p.villageId && p.villageId === c.villageId,
        );
        if (!hit) return c;
        const meta = (hit.metadata as any) ?? {};
        return {
          ...c,
          id: hit.id,
          targetPopulation: String(hit.totalPopulation ?? c.targetPopulation),
          source: (hit.source as any) ?? c.source,
          type: (meta.type as any) ?? c.type,
          strategy: (meta.strategy as any) ?? c.strategy,
          saved: true,
        };
      }),
    );
    hydratedRef.current.communities = true;
  }, [microplanId, existingPopulation, communities.length]);

  type RiskRow = {
    id?: number;
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

  // Rehydrate Step 3 from saved HTR scores.
  useEffect(() => {
    if (!microplanId || !existingHtr || hydratedRef.current.risk) return;
    if (!risk.length) return;
    setRisk((prev) =>
      prev.map((r) => {
        const hit = existingHtr.find((h) => h.villageId === r.villageId);
        if (!hit) return r;
        const cm = (hit.comments ?? "").toString();
        return {
          ...r,
          id: hit.id,
          distance: hit.distanceScore ?? r.distance,
          terrain: hit.terrainScore ?? r.terrain,
          season: hit.seasonalScore ?? r.season,
          insecurity: (hit as any).insecurityScore ?? r.insecurity,
          missed: cm.includes("missed_12mo"),
          zeroDose: cm.includes("zero_dose_hotspot"),
        };
      }),
    );
    hydratedRef.current.risk = true;
  }, [microplanId, existingHtr, risk.length]);

  type CalendarRow = {
    rowId: string;
    name: string;
    villageId?: number;
    sessionType: "static" | "outreach" | "mobile";
    scheduledDate: string;
    catchUp?: boolean;
  };
  const [calendar, setCalendar] = useState<CalendarRow[]>([]);

  // Rehydrate Step 4 from saved sessions, building the calendar back from
  // the persisted rows so Step 11's summary reflects what's on the server.
  useEffect(() => {
    if (!existingSessions || !microplanId || hydratedRef.current.calendar) return;
    const mine = existingSessions.filter((s) => s.microplanId === microplanId);
    if (!mine.length) return;
    const rows: CalendarRow[] = [];
    const idMap: Record<string, number> = {};
    mine
      .slice()
      .sort((a, b) => {
        const ad = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const bd = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return ad - bd;
      })
      .forEach((s, idx) => {
        const date = s.scheduledDate
          ? new Date(s.scheduledDate).toISOString().slice(0, 10)
          : "";
        // Session name format from this wizard: `${community} ${YYYY-MM-DD}`.
        // Strip a trailing date if present, otherwise fall back to full name.
        const trimmed = (s.name ?? "").replace(/\s+\d{4}-\d{2}-\d{2}$/, "").trim();
        const rowId = `srv-${s.id}`;
        rows.push({
          rowId,
          name: trimmed || s.name || `Session ${idx + 1}`,
          sessionType: (s.sessionType as any) ?? "static",
          scheduledDate: date,
        });
        idMap[rowId] = s.id;
      });
    setCalendar(rows);
    setSessionIdMap((prev) => ({ ...prev, ...idMap }));
    hydratedRef.current.calendar = true;
  }, [existingSessions, microplanId]);

  function generateCalendar(
    months: number = 12,
    startYear?: number,
    startMonth?: number,
  ) {
    if (!communities.length) return;
    // Only the four supported periods are allowed; anything else falls back to
    // a full 12-month calendar so a stale value can never produce odd lengths.
    const safeMonths = [1, 3, 6, 12].includes(months) ? months : 12;
    const today = new Date();
    // Default to the current month so existing behaviour is unchanged when the
    // planner doesn't pick a start month.
    const baseYear =
      typeof startYear === "number" ? startYear : today.getFullYear();
    const baseMonth =
      typeof startMonth === "number" ? startMonth : today.getMonth();
    // The earliest date a session is allowed to be scheduled (UTC midnight),
    // i.e. today + the lead-time minimum. Any generated session before this
    // would later fail the >=7-day lead-time check, so we skip those rows.
    const minDate = getMinScheduleDate();
    const minDateValue = toDateInputValue(minDate);
    const rows: CalendarRow[] = [];
    let skippedCount = 0;
    communities.forEach((c, idx) => {
      for (let m = 0; m < safeMonths; m++) {
        const d = new Date(baseYear, baseMonth + m, 15);
        const dateValue = d.toISOString().slice(0, 10);
        // Skip any session that falls before the lead-time minimum so the
        // generated calendar only ever contains schedulable sessions.
        if (!isAtLeastDaysAhead(dateValue)) {
          skippedCount++;
          continue;
        }
        rows.push({
          rowId: `${c.rowId}-m${m}`,
          name: c.name,
          villageId: c.villageId,
          sessionType: c.strategy,
          scheduledDate: dateValue,
        });
      }
    });
    setCalendar(rows);
    if (skippedCount > 0) {
      toast({
        title: rows.length
          ? `Skipped ${skippedCount} past ${
              skippedCount === 1 ? "session" : "sessions"
            }`
          : "No schedulable sessions",
        description: rows.length
          ? `${skippedCount} ${
              skippedCount === 1 ? "session was" : "sessions were"
            } before the earliest schedulable date (${minDateValue}) and were left out. ${
              rows.length
            } schedulable ${
              rows.length === 1 ? "session" : "sessions"
            } generated.`
          : `Every session in this range falls before the earliest schedulable date (${minDateValue}). Pick a later start month to generate sessions.`,
        variant: rows.length ? "default" : "destructive",
      });
    }
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
    id?: number;
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

  // Rehydrate Step 6 from saved vaccine requirements.
  useEffect(() => {
    if (!microplanId || !existingVaccineReqs || hydratedRef.current.vaccines) return;
    const mine = existingVaccineReqs.filter(
      (v) => v.quarter === quarter && v.year === year,
    );
    if (!mine.length) return;
    setVaccines((prev) =>
      prev.map((v) => {
        const hit = mine.find((r) => r.vaccineName === v.name);
        if (!hit) return v;
        return {
          ...v,
          id: hit.id,
          target: String(hit.targetPopulation ?? 0),
          wastage: String(hit.wastageRate ?? v.wastage),
        };
      }),
    );
    hydratedRef.current.vaccines = true;
  }, [microplanId, existingVaccineReqs, quarter, year]);

  type MobRow = {
    id?: number;
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

  // Rehydrate Step 7 by matching saved mobilization activities back to their
  // session row via the description prefix that this wizard writes.
  useEffect(() => {
    if (!microplanId || !existingMobilization || hydratedRef.current.mobilization)
      return;
    if (!mobilization.length) return;
    setMobilization((prev) =>
      prev.map((m) => {
        const hit = existingMobilization.find((a) =>
          (a.description ?? "").startsWith(m.sessionLabel),
        );
        if (!hit) return m;
        const desc = hit.description ?? "";
        const focalMatch = desc.match(/focal:\s*([^;]*?)\s*([\d+\-\s]*)?;/);
        const iecMatch = desc.match(/IEC:\s*(.*)$/);
        const channels = (hit.activityType ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const iec = iecMatch
          ? iecMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        let focalPoint = m.focalPoint;
        let focalPhone = m.focalPhone;
        if (focalMatch) {
          const inner = focalMatch[0].replace(/^focal:\s*/, "").replace(/;$/, "");
          const parts = inner.trim().split(/\s+/);
          const last = parts[parts.length - 1] ?? "";
          if (/^[\d+\-]+$/.test(last) && parts.length > 1) {
            focalPhone = last;
            focalPoint = parts.slice(0, -1).join(" ");
          } else {
            focalPoint = inner.trim();
          }
        }
        return {
          ...m,
          id: hit.id,
          channels: channels.length ? channels : m.channels,
          focalPoint,
          focalPhone,
          iec,
        };
      }),
    );
    hydratedRef.current.mobilization = true;
  }, [microplanId, existingMobilization, mobilization.length]);

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

  // Rehydrate Step 5 (staffing) + Step 8 (transport) from saved session day
  // plans. Fetched once per session whose id we know, so resaves PATCH the
  // same row instead of inserting another.
  useEffect(() => {
    if (!microplanId || hydratedRef.current.dayPlans) return;
    if (!calendar.length) return;
    if (!existingDayPlans) return;
    const sessionIds = calendar
      .map((c) => sessionIdMap[c.rowId])
      .filter((v): v is number => !!v);
    if (sessionIds.length === 0) return;
    try {
      const sessionIdSet = new Set(sessionIds);
      const bySessionId: Record<number, SessionDayPlan> = {};
      for (const dp of existingDayPlans) {
        if (!sessionIdSet.has(dp.sessionPlanId)) continue;
        // Storage orders by sessionPlanId, dayNumber, so the first row per
        // session is the lowest dayNumber — matching the prior `arr[0]` behavior.
        if (!bySessionId[dp.sessionPlanId]) bySessionId[dp.sessionPlanId] = dp;
      }
      const dayIdMap: Record<string, number> = {};
      setStaffing((prev) =>
        prev.map((s) => {
          const sid = sessionIdMap[s.rowId];
          const dp = sid ? bySessionId[sid] : undefined;
          if (!dp) return s;
          dayIdMap[s.rowId] = dp.id;
          const notes = dp.executionNotes ?? "";
          const grab = (k: string) => {
            const m = notes.match(new RegExp(`${k}:([^;]+)`));
            return m ? m[1].trim() : "";
          };
          return {
            ...s,
            vaccinator: grab("vaccinator") || s.vaccinator,
            recorder: grab("recorder") || s.recorder,
            supervisor: grab("supervisor") || s.supervisor,
            teamType: grab("team") || s.teamType,
            perDiem: grab("perDiem") || s.perDiem,
            target: String(dp.targetPopulation ?? s.target),
          };
        }),
      );
      setTransport((prev) =>
        prev.map((t) => {
          const sid = sessionIdMap[t.rowId];
          const dp = sid ? bySessionId[sid] : undefined;
          if (!dp) return t;
          const notes = dp.executionNotes ?? "";
          const vehicleMatch = notes.match(/vehicle:([^;]+)/);
          return {
            ...t,
            mode: (dp.transportType as any) ?? t.mode,
            distanceKm: String(dp.distanceKm ?? t.distanceKm),
            fuelLitres: String(dp.fuelLiters ?? t.fuelLitres),
            vehicle: vehicleMatch ? vehicleMatch[1].trim() : t.vehicle,
            cleared: /security_cleared/.test(notes),
          };
        }),
      );
      setDayPlanIdMap((prev) => ({ ...prev, ...dayIdMap }));
      hydratedRef.current.dayPlans = true;
    } catch (e) {
      console.warn("Could not hydrate session day plans:", e);
    }
  }, [microplanId, calendar, sessionIdMap, existingDayPlans]);

  type BudgetRow = {
    id?: number;
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

  // Rehydrate Step 9 from saved budget items.
  useEffect(() => {
    if (!microplanId || !existingBudget || hydratedRef.current.budget) return;
    if (!existingBudget.length) return;
    setBudget(
      existingBudget.map((b) => ({
        id: b.id,
        rowId: `srv-b-${b.id}`,
        category: b.category,
        description: b.description,
        quantity: String(b.quantity ?? "1"),
        unitCost: String(b.unitCost ?? "0"),
        fundingSource: (b.fundingSource as any) ?? "government",
      })),
    );
    hydratedRef.current.budget = true;
  }, [microplanId, existingBudget]);

  type SupRow = {
    id?: number;
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

  // Rehydrate Step 10 from saved supervision visits for this microplan.
  useEffect(() => {
    if (!microplanId || !existingSupervision || hydratedRef.current.supervision)
      return;
    if (!existingSupervision.length) return;
    setSupervision(
      existingSupervision.map((v) => {
        const dt = v.scheduledDate ? new Date(v.scheduledDate) : new Date();
        const checklistArr = Array.isArray(v.checklist) ? (v.checklist as any[]) : [];
        const checklistLabel =
          (checklistArr[0] && (checklistArr[0].label as string)) || "WHO RED checklist";
        return {
          id: v.id,
          rowId: `srv-s-${v.id}`,
          quarter: Math.ceil((dt.getUTCMonth() + 1) / 3),
          scheduledDate: dt.toISOString().slice(0, 10),
          supervisorName: v.supervisorName ?? "",
          checklist: checklistLabel,
          followUp: v.followUpActions ?? "",
        };
      }),
    );
    hydratedRef.current.supervision = true;
  }, [microplanId, existingSupervision]);

  // ─── Per-step persistence ──────────────────────────────────────────────
  const [busy, setBusy] = useState(false);

  // Inline auto-save status shown next to the Save Draft button so planners can
  // tell a background save is underway (especially on slow connections) without
  // relying on transient toasts.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // ─── Validation error focus ────────────────────────────────────────────
  // When a save (manual, auto, or on Next) detects a validation problem we
  // record which step + field/row is at fault here, switch the wizard to that
  // step, and let the step component scroll/highlight/focus the offending
  // input. Cleared at the start of every save and when the user edits the
  // flagged field.
  const [errorFocus, setErrorFocus] = useState<{
    step: number;
    rowId?: string;
    field?: string;
    message: string;
  } | null>(null);

  // ─── Background auto-save ──────────────────────────────────────────────
  // Per-step snapshot of the last-persisted user-editable data, so the
  // debounced auto-save only fires when something actually changed and the
  // first visit to a step doesn't trigger a needless save.
  const savedSnapshots = useRef<Record<number, string>>({});
  const autoSaveInFlight = useRef(false);
  // Set when a debounced save fires while another save is still in flight (or
  // when edits arrive mid-save). Bumping autoSaveTick re-runs the effect with
  // fresh state so the newer edits are persisted deterministically.
  const pendingResave = useRef(false);
  const [autoSaveTick, setAutoSaveTick] = useState(0);
  // Synchronous mirror of `busy` so the debounced auto-save callback always
  // sees the latest in-flight state without depending on a (possibly stale)
  // captured `busy` value. Set in lockstep with setBusy at every save site.
  const busyRef = useRef(false);

  // Serialise only the user-editable data for a step (no server ids / saved
  // flags) so the snapshot is stable across a save round-trip and only real
  // edits mark the step dirty.
  function snapshotForStep(step: number): string {
    switch (step) {
      case 1:
        return JSON.stringify({
          coverage,
          planType,
          campaignAntigen,
          campaignTargetAge,
          campaignScope,
        });
      case 2:
        return JSON.stringify(
          communities.map((c) => ({
            name: c.name,
            type: c.type,
            targetPopulation: c.targetPopulation,
            source: c.source,
            strategy: c.strategy,
            villageId: c.villageId,
            latitude: c.latitude,
            longitude: c.longitude,
          })),
        );
      case 3:
        return JSON.stringify(risk);
      case 4:
        return JSON.stringify(
          calendar.map((c) => ({
            name: c.name,
            villageId: c.villageId,
            sessionType: c.sessionType,
            scheduledDate: c.scheduledDate,
          })),
        );
      case 5:
        return JSON.stringify(staffing);
      case 6:
        return JSON.stringify(vaccines);
      case 7:
        return JSON.stringify(mobilization);
      case 8:
        return JSON.stringify({ staffing, transport });
      case 9:
        return JSON.stringify(budget);
      case 10:
        return JSON.stringify(supervision);
      default:
        return "";
    }
  }

  // Debounced background auto-save. After the planner stops editing the
  // current step for a short interval, persist it through the same path as a
  // manual save. We skip saving when there's no facility yet, when nothing
  // changed since the last save, on the first visit to a step (baseline only),
  // and while another save is in flight.
  useEffect(() => {
    if (!facilityId) return;
    if (active < 1 || active > 10) return; // only steps with a persist path
    const snap = snapshotForStep(active);
    const saved = savedSnapshots.current[active];
    if (saved === undefined) {
      // First time we've seen this step's data — establish a baseline so we
      // don't auto-save unedited (e.g. freshly hydrated) content.
      savedSnapshots.current[active] = snap;
      return;
    }
    if (saved === snap) return; // nothing changed
    const timer = setTimeout(async () => {
      // Another save is still in flight — don't fire a second concurrent save.
      // Use the synchronous busyRef (not the captured `busy`, which can be
      // stale) so a manual/Next save started after this timer was scheduled is
      // always observed. Remember outstanding work so we re-evaluate on settle.
      if (autoSaveInFlight.current || busyRef.current) {
        pendingResave.current = true;
        return;
      }
      autoSaveInFlight.current = true;
      setSaveStatus("saving");
      try {
        const ok = await persistStep(active, { silent: true });
        if (ok) {
          // Mark ONLY the snapshot we actually dispatched as clean — never the
          // current UI state, which may have newer edits made while the save
          // was in flight. Marking those clean would silently drop them.
          savedSnapshots.current[active] = snap;
          setLastSavedAt(Date.now());
          setSaveStatus("saved");
          toast({
            title: "Draft saved",
            description: "You can leave and come back without losing progress.",
          });
        } else {
          setSaveStatus("idle");
        }
      } finally {
        autoSaveInFlight.current = false;
        // If edits arrived during the save (snapshot moved on) or a debounced
        // save fired while we were busy, schedule another pass with fresh state.
        if (pendingResave.current || snapshotForStep(active) !== savedSnapshots.current[active]) {
          pendingResave.current = false;
          setAutoSaveTick((t) => t + 1);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSaveTick,
    active,
    facilityId,
    coverage,
    planType,
    campaignAntigen,
    campaignTargetAge,
    campaignScope,
    communities,
    risk,
    calendar,
    staffing,
    vaccines,
    mobilization,
    budget,
    supervision,
    transport,
  ]);

  // ─── Per-row deletion helpers ──────────────────────────────────────────
  // Each helper removes the row from local state and, when the row has
  // already been saved to the server, deletes the matching backend row so it
  // doesn't reappear when the microplan is reopened. Saved rows (those with a
  // server `id`) require a confirm dialog before any DELETE is sent so a
  // misclick on the trash icon can't silently destroy server data.
  type PendingDelete =
    | { kind: "community"; index: number; label: string }
    | { kind: "mobilization"; index: number; label: string }
    | { kind: "budget"; index: number; label: string }
    | { kind: "supervision"; index: number; label: string };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function performDeleteCommunity(index: number, reason?: string | null) {
    const row = communities[index];
    if (!row) return;
    if (row.id) {
      try {
        await apiRequest("DELETE", `/api/population/${row.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/population"] });
      } catch (e: any) {
        toast({
          title: "Could not delete community",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
        return;
      }
    }
    setCommunities(communities.filter((_, i) => i !== index));
    // Remember that the user explicitly removed this facility village so the
    // seed effect doesn't re-add it the next time the microplan is opened.
    if (row.villageId) {
      const trimmed = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
      const reasonValue = trimmed.length > 0 ? trimmed : null;
      setExcludedVillageIds((prev) => {
        if (prev.has(row.villageId!)) return prev;
        const next = new Set<number>(prev);
        next.add(row.villageId!);
        const reasonMap = new Map<number, string | null>();
        reasonMap.set(row.villageId!, reasonValue);
        persistExcluded(next, reasonMap);
        return next;
      });
    }
  }

  async function performDeleteMobilizationRow(index: number) {
    const row = mobilization[index];
    if (!row) return;
    if (row.id) {
      try {
        await apiRequest("DELETE", `/api/mobilization/${row.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/mobilization"] });
      } catch (e: any) {
        toast({
          title: "Could not delete mobilization row",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
        return;
      }
    }
    setMobilization(mobilization.filter((_, i) => i !== index));
  }

  async function performDeleteBudgetRow(index: number) {
    const row = budget[index];
    if (!row) return;
    if (row.id) {
      try {
        await apiRequest("DELETE", `/api/budget-items/${row.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      } catch (e: any) {
        toast({
          title: "Could not delete budget line",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
        return;
      }
    }
    setBudget(budget.filter((_, i) => i !== index));
  }

  async function performDeleteSupervisionRow(index: number) {
    const row = supervision[index];
    if (!row) return;
    if (row.id) {
      try {
        await apiRequest("DELETE", `/api/supervision-visits/${row.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      } catch (e: any) {
        toast({
          title: "Could not delete supervision visit",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
        return;
      }
    }
    setSupervision(supervision.filter((_, i) => i !== index));
  }

  // Reason capture for removing a facility village from the catchment. We
  // show this whenever the community row maps to a real `villageId` so the
  // "Previously removed" panel can later explain *why* the community was
  // taken out. For unsaved rows the dialog is purely informational; for
  // saved rows it doubles as the destructive-action confirmation.
  type PendingCommunityRemoval = {
    index: number;
    label: string;
    hasServerRow: boolean;
  };
  const [pendingCommunityRemoval, setPendingCommunityRemoval] =
    useState<PendingCommunityRemoval | null>(null);
  const [removalReason, setRemovalReason] = useState("");

  function deleteCommunity(index: number) {
    const row = communities[index];
    if (!row) return;
    // A facility-village row: prompt for an optional reason so the audit
    // trail can answer "why was this community taken out of the catchment?".
    if (row.villageId) {
      setRemovalReason("");
      setPendingCommunityRemoval({
        index,
        label: row.name?.trim() || "this community",
        hasServerRow: !!row.id,
      });
      return;
    }
    // Manually-entered communities without a villageId: no audit value in
    // capturing a reason. Keep the existing confirm-only flow for saved
    // rows and the immediate delete for unsaved ones.
    if (row.id) {
      setPendingDelete({
        kind: "community",
        index,
        label: row.name?.trim() || "this community",
      });
      return;
    }
    void performDeleteCommunity(index);
  }

  async function confirmCommunityRemoval() {
    if (!pendingCommunityRemoval) return;
    setDeleteBusy(true);
    try {
      await performDeleteCommunity(pendingCommunityRemoval.index, removalReason);
      setPendingCommunityRemoval(null);
      setRemovalReason("");
    } finally {
      setDeleteBusy(false);
    }
  }

  function deleteMobilizationRow(index: number) {
    const row = mobilization[index];
    if (!row) return;
    if (row.id) {
      setPendingDelete({
        kind: "mobilization",
        index,
        label: row.sessionLabel?.trim() || "this mobilization activity",
      });
      return;
    }
    void performDeleteMobilizationRow(index);
  }

  function deleteBudgetRow(index: number) {
    const row = budget[index];
    if (!row) return;
    if (row.id) {
      setPendingDelete({
        kind: "budget",
        index,
        label: row.description?.trim() || "this budget line",
      });
      return;
    }
    void performDeleteBudgetRow(index);
  }

  function deleteSupervisionRow(index: number) {
    const row = supervision[index];
    if (!row) return;
    if (row.id) {
      setPendingDelete({
        kind: "supervision",
        index,
        label: row.supervisorName?.trim()
          ? `the supervision visit by ${row.supervisorName.trim()}`
          : "this supervision visit",
      });
      return;
    }
    void performDeleteSupervisionRow(index);
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      if (pendingDelete.kind === "community") {
        await performDeleteCommunity(pendingDelete.index);
      } else if (pendingDelete.kind === "mobilization") {
        await performDeleteMobilizationRow(pendingDelete.index);
      } else if (pendingDelete.kind === "budget") {
        await performDeleteBudgetRow(pendingDelete.index);
      } else if (pendingDelete.kind === "supervision") {
        await performDeleteSupervisionRow(pendingDelete.index);
      }
      setPendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function persistStep(
    step: number,
    opts: { silent?: boolean } = {},
  ): Promise<boolean> {
    const { silent } = opts;
    busyRef.current = true;
    setBusy(true);
    // A fresh save attempt clears any previously flagged field.
    setErrorFocus(null);
    // Set by the per-step logic below when a validation error should pull the
    // user to a specific field/row instead of just showing a toast.
    let focusTarget:
      | { step: number; rowId?: string; field?: string; message: string }
      | null = null;
    try {
      if (!facilityId) {
        focusTarget = {
          step,
          field: "facility",
          message: "Pick a facility before saving.",
        };
        if (!silent) {
          toast({
            title: "Pick a facility first",
            description: "Choose a facility before the microplan can be saved.",
            variant: "destructive",
          });
        }
        return false;
      }
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
          let vid = row.villageId;
          const latNum =
            row.latitude && row.latitude.trim() !== "" ? row.latitude.trim() : null;
          const lngNum =
            row.longitude && row.longitude.trim() !== "" ? row.longitude.trim() : null;
          // Persist newly added (manually typed) communities to villages first.
          if (!vid && row.name.trim() && districtId) {
            // If the typed name matches a previously-excluded village for this
            // facility, reuse that village (and lift the exclusion) instead of
            // creating a duplicate. This is the un-exclude path the user gets
            // when they manually re-add a community they had removed earlier.
            const typed = row.name.trim().toLowerCase();
            const revived = (villages ?? []).find(
              (v) =>
                excludedVillageIds.has(v.id) &&
                v.name.trim().toLowerCase() === typed &&
                (v.assignedFacilityId === facilityId ||
                  v.districtId === districtId),
            );
            if (revived) {
              vid = revived.id;
              nextRows[i] = { ...row, villageId: vid, latLngDirty: false };
              setExcludedVillageIds((prev) => {
                if (!prev.has(revived.id)) return prev;
                const next = new Set<number>(prev);
                next.delete(revived.id);
                persistExcluded(next);
                return next;
              });
              if (row.latLngDirty && (latNum || lngNum)) {
                try {
                  await apiRequest("PATCH", `/api/villages/${vid}`, {
                    ...(latNum ? { latitude: latNum } : {}),
                    ...(lngNum ? { longitude: lngNum } : {}),
                  });
                } catch (e) {
                  console.warn("Could not update village coordinates:", e);
                }
              }
            } else {
              try {
                const v = await apiRequest<Village>("POST", "/api/villages", {
                  name: row.name.trim(),
                  districtId,
                  assignedFacilityId: facilityId,
                  ...(latNum ? { latitude: latNum } : {}),
                  ...(lngNum ? { longitude: lngNum } : {}),
                });
                vid = v.id;
                nextRows[i] = { ...row, villageId: vid, latLngDirty: false };
              } catch (e) {
                console.warn("Could not create village:", e);
                continue;
              }
            }
          } else if (vid && row.latLngDirty && (latNum || lngNum)) {
            // User moved/typed coordinates for an existing village — persist them.
            try {
              await apiRequest("PATCH", `/api/villages/${vid}`, {
                ...(latNum ? { latitude: latNum } : {}),
                ...(lngNum ? { longitude: lngNum } : {}),
              });
              nextRows[i] = { ...row, latLngDirty: false };
            } catch (e) {
              console.warn("Could not update village coordinates:", e);
            }
          }
        }
        // Bulk upsert population rows in a single request. Per-row results let
        // us map server-assigned ids back to local state and surface partial
        // failures without aborting the batch.
        type PopBulkResult = {
          clientId?: string;
          ok: boolean;
          id?: number;
          error?: string;
        };
        const popItems: Array<{ clientId: string; id: number | null; [k: string]: any }> = [];
        const popRowIndex: Record<string, number> = {};
        for (let i = 0; i < nextRows.length; i++) {
          const row = nextRows[i];
          const vid = row.villageId;
          if (!vid) continue;
          const target = parseInt(row.targetPopulation || "0", 10);
          if (target <= 0) continue;
          const clientRowId = `pop-${i}`;
          popRowIndex[clientRowId] = i;
          popItems.push({
            clientId: clientRowId,
            id: row.id ?? null,
            villageId: vid,
            facilityId,
            source: row.source,
            year,
            totalPopulation: target,
            approvalStatus: "draft",
            metadata: { strategy: row.strategy, type: row.type },
          });
        }
        if (popItems.length > 0) {
          const resp = await apiRequest<{ results: PopBulkResult[] }>(
            "POST",
            "/api/population/bulk",
            { items: popItems },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            const idx = typeof r.clientId === "string" ? popRowIndex[r.clientId] : undefined;
            if (r.ok && idx != null) {
              nextRows[idx] = {
                ...nextRows[idx],
                ...(r.id != null ? { id: r.id } : {}),
                saved: true,
              };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This population row could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Population bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 2,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted community — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} population row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setCommunities(nextRows);
        queryClient.invalidateQueries({ queryKey: ["/api/population"] });
      } else if (step === 3) {
        // Bulk upsert HTR scores. The single-item POST is already keyed on
        // villageId (upsert) so the bulk endpoint preserves that semantic
        // and never produces duplicate rows.
        type HtrBulkResult = {
          clientId?: string;
          ok: boolean;
          id?: number;
          error?: string;
        };
        const items: any[] = [];
        for (let i = 0; i < risk.length; i++) {
          const r = risk[i];
          if (!r.villageId) continue;
          const composite = Math.round(
            (r.distance + r.terrain + r.season + r.insecurity) * 5,
          );
          items.push({
            clientId: `htr-${i}`,
            villageId: r.villageId,
            distanceScore: r.distance,
            terrainScore: r.terrain,
            seasonalScore: r.season,
            insecurityScore: r.insecurity,
            compositeScore: composite,
            interventionPriority:
              composite >= 70 ? "high" : composite >= 50 ? "medium" : "low",
            comments:
              [r.missed ? "missed_12mo" : null, r.zeroDose ? "zero_dose_hotspot" : null]
                .filter(Boolean)
                .join("; ") || null,
          });
        }
        if (items.length > 0) {
          const resp = await apiRequest<{ results: HtrBulkResult[] }>(
            "POST",
            "/api/htr-scores/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This risk row could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`HTR bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 3,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted risk row — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} HTR row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/htr-scores"] });
      } else if (step === 4) {
        // Bulk upsert: one request for the whole calendar instead of one PATCH
        // /POST per row. Server returns per-row results so a single bad row
        // (lead-time conflict, etc.) is reported alongside the saved siblings
        // rather than aborting the batch.
        const persisted: Record<string, number> = { ...sessionIdMap };
        const items = calendar
          .filter((row) => !!row.scheduledDate)
          .map((row) => ({
            clientId: row.rowId,
            id: persisted[row.rowId] ?? null,
            facilityId,
            microplanId: mpId,
            name: `${row.name} ${row.scheduledDate}`,
            sessionType: row.sessionType,
            quarter,
            year,
            scheduledDate: row.scheduledDate,
            status: "planned",
            approvalStatus: "draft",
          }));
        if (items.length > 0) {
          type SessionBulkResult = {
            clientId?: string;
            ok: boolean;
            id?: number;
            error?: string;
          };
          const resp = await apiRequest<{ results: SessionBulkResult[] }>(
            "POST",
            "/api/sessions/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              persisted[r.clientId] = r.id;
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This session could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Session bulk save: ${failures.length} row(s) skipped:`, failures);
            // Pull the user straight to the offending row instead of leaving
            // them to hunt for it after a toast. A toast still fires for
            // context, but the highlighted date field is the primary fix path.
            focusTarget = {
              step: 4,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted session date — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} session row(s) need fixing`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setSessionIdMap(persisted);
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      } else if (step === 8) {
        // Bulk upsert day plans in a single request. Each item is either an
        // update (id) or a create (sessionPlanId) — the server picks the
        // right path per item.
        const nextIdMap: Record<string, number> = { ...dayPlanIdMap };
        const items: any[] = [];
        for (let i = 0; i < staffing.length; i++) {
          const s = staffing[i];
          const sid = sessionIdMap[s.rowId];
          if (!sid) continue;
          const t = transport[i];
          const existingId = nextIdMap[s.rowId];
          items.push({
            clientId: s.rowId,
            id: existingId ?? null,
            sessionPlanId: sid,
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
        }
        if (items.length > 0) {
          type DayBulkResult = {
            clientId?: string;
            ok: boolean;
            id?: number;
            error?: string;
          };
          const resp = await apiRequest<{ results: DayBulkResult[] }>(
            "POST",
            "/api/sessions/days/bulk",
            { items },
          );
          const failures: string[] = [];
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              nextIdMap[r.clientId] = r.id;
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            console.warn(`Day plan bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} day plan row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
          }
        }
        setDayPlanIdMap(nextIdMap);
      } else if (step === 5) {
        // Step 5 also writes a structured staffing roster to
        // microplans.staffing so supervision / budget / reports can read
        // it without parsing executionNotes. The per-session-day write
        // (vaccinator/recorder/supervisor counts + perDiem in notes)
        // still happens in step 8 alongside transport.
        const roster = staffing.map((s) => ({
          rowId: s.rowId,
          sessionLabel: s.sessionLabel,
          vaccinator: s.vaccinator ?? "",
          recorder: s.recorder ?? "",
          supervisor: s.supervisor ?? "",
          teamType: s.teamType ?? "fixed",
          target: parseInt(s.target || "0", 10),
          perDiem: parseFloat(s.perDiem || "0"),
        }));
        const prev = (microplan as any)?.staffing ?? {};
        const prevObj = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
        await patchMicroplan(mpId, {
          staffing: { ...prevObj, roster, rosterUpdatedAt: new Date().toISOString() },
        });
      } else if (step === 6) {
        // Bulk upsert vaccine requirements in a single request.
        const nextVaccines = [...vaccines];
        const indexByClientId = new Map<string, number>();
        const items: any[] = [];
        for (let i = 0; i < nextVaccines.length; i++) {
          const v = nextVaccines[i];
          const target = parseInt(v.target || "0", 10);
          if (!target) continue;
          const wast = parseFloat(v.wastage || "0");
          const dosesReq = target * v.doses;
          const dosesWithWastage = Math.ceil(dosesReq * (1 + wast / 100));
          const vials = Math.ceil(dosesWithWastage / 10);
          const clientId = `vr-${i}`;
          indexByClientId.set(clientId, i);
          items.push({
            clientId,
            id: v.id ?? null,
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
        if (items.length > 0) {
          const resp = await apiRequest<{ results: Array<{ clientId?: string; ok: boolean; id?: number; error?: string }> }>(
            "POST",
            "/api/vaccine-requirements/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextVaccines[idx] = { ...nextVaccines[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This vaccine row could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Vaccine req bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 6,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted vaccine row — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} vaccine row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setVaccines(nextVaccines);
        queryClient.invalidateQueries({ queryKey: ["/api/vaccine-requirements"] });
      } else if (step === 7) {
        const nextMob = [...mobilization];
        const indexByClientId = new Map<string, number>();
        const items: any[] = [];
        for (let i = 0; i < nextMob.length; i++) {
          const m = nextMob[i];
          if (!m.focalPoint && m.channels.length === 0) continue;
          const clientId = `mob-${i}`;
          indexByClientId.set(clientId, i);
          items.push({
            clientId,
            id: m.id ?? null,
            facilityId,
            activityType: m.channels.join(",") || "announcement",
            description: `${m.sessionLabel} — focal: ${m.focalPoint} ${m.focalPhone}; IEC: ${m.iec.join(", ")}`,
            targetAudience: "community",
            status: "planned",
          });
        }
        if (items.length > 0) {
          const resp = await apiRequest<{ results: Array<{ clientId?: string; ok: boolean; id?: number; error?: string }> }>(
            "POST",
            "/api/mobilization/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextMob[idx] = { ...nextMob[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This mobilization row could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Mobilization bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 7,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted mobilization row — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} mobilization row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setMobilization(nextMob);
        queryClient.invalidateQueries({ queryKey: ["/api/mobilization"] });
      } else if (step === 9) {
        const nextBudget = [...budget];
        const indexByClientId = new Map<string, number>();
        const items: any[] = [];
        for (let i = 0; i < nextBudget.length; i++) {
          const b = nextBudget[i];
          if (!b.description.trim()) continue;
          const qty = parseInt(b.quantity || "0", 10);
          const unit = parseFloat(b.unitCost || "0");
          const total = qty * unit;
          const clientId = `bud-${i}`;
          indexByClientId.set(clientId, i);
          items.push({
            clientId,
            id: b.id ?? null,
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
        if (items.length > 0) {
          const resp = await apiRequest<{ results: Array<{ clientId?: string; ok: boolean; id?: number; error?: string }> }>(
            "POST",
            "/api/budget-items/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextBudget[idx] = { ...nextBudget[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This budget line could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Budget bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 9,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted budget line — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} budget row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setBudget(nextBudget);
        queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      } else if (step === 10) {
        const nextSup = [...supervision];
        const indexByClientId = new Map<string, number>();
        const items: any[] = [];
        for (let i = 0; i < nextSup.length; i++) {
          const v = nextSup[i];
          if (!v.supervisorName.trim()) continue;
          const clientId = `sup-${i}`;
          indexByClientId.set(clientId, i);
          items.push({
            clientId,
            id: v.id ?? null,
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
        if (items.length > 0) {
          const resp = await apiRequest<{ results: Array<{ clientId?: string; ok: boolean; id?: number; error?: string }> }>(
            "POST",
            "/api/supervision-visits/bulk",
            { items },
          );
          const failures: string[] = [];
          let firstFailRow: string | undefined;
          let firstFailMsg: string | undefined;
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextSup[idx] = { ...nextSup[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
              if (firstFailRow === undefined && typeof r.clientId === "string") {
                firstFailRow = r.clientId;
                firstFailMsg = r.error || "This supervision visit could not be saved.";
              }
            }
          }
          if (failures.length > 0) {
            console.warn(`Supervision bulk save: ${failures.length} row(s) skipped:`, failures);
            focusTarget = {
              step: 10,
              rowId: firstFailRow,
              message:
                firstFailMsg ??
                "Fix the highlighted supervision visit — it was rejected on save.",
            };
            if (!silent) {
              toast({
                title: `${failures.length} supervision row(s) skipped`,
                description: failures[0],
                variant: "destructive",
              });
            }
          }
        }
        setSupervision(nextSup);
        queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
      }
      // A per-row validation rejection isn't a thrown error, but we still
      // treat it as a failed save so callers don't advance past the problem.
      if (focusTarget) return false;
      return true;
    } catch (e: any) {
      if (!silent) {
        toast({
          title: `Could not save step ${step}`,
          description: e?.message ?? String(e),
          variant: "destructive",
        });
      }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (focusTarget) {
        setErrorFocus(focusTarget);
        setActive(focusTarget.step);
      }
    }
  }

  async function handleNext() {
    // Capture the dispatched snapshot before the save so edits made during the
    // request aren't wrongly marked clean (mirrors the auto-save fix).
    const snap = snapshotForStep(active);
    const ok = await persistStep(active);
    if (ok) {
      // Mark the step we just saved as clean so auto-save doesn't re-fire it.
      savedSnapshots.current[active] = snap;
      if (active < 12) setActive(active + 1);
    }
  }

  async function handleSubmit() {
    if (!microplanId) {
      toast({ title: "Nothing to submit yet", variant: "destructive" });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      // File a real approval request so the microplan flows through the same
      // hierarchical approvals pipeline used by session plans, population and
      // budget items. The server-side POST /api/approvals handler mirrors the
      // submission onto microplans.status = "pending" automatically.
      await apiRequest("POST", "/api/approvals", {
        entityType: "microplan",
        entityId: microplanId,
        currentLevel: "district",
        status: "pending",
        comments: "Microplan submitted for review.",
      });
      toast({
        title: "Microplan submitted",
        description: "Sent to district approvers. Track progress on the Approvals page.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setActive(12);
    } catch (e: any) {
      toast({
        title: "Submit failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────
  const stepDef = STEPS.find((s) => s.id === active)!;
  const status = microplan?.status ?? "draft";
  const facilityLabel = facility?.name ?? "No facility selected";
  // Facility staff (clerk + in-charge) author and submit microplans; higher
  // roles act as reviewers/approvers. national_admin is included so platform
  // admins can unblock submissions during support.
  const canSubmit =
    user?.role === "facility_clerk" ||
    user?.role === "facility_in_charge" ||
    user?.role === "national_admin";

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Microplan</p>
              <Badge
                variant={planType === "campaign" ? "default" : "secondary"}
                className="gap-1"
                data-testid="badge-plan-type"
              >
                {planType === "campaign" ? (
                  <>
                    <Sparkles className="h-3 w-3" /> SIA Campaign
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3" /> Routine
                  </>
                )}
              </Badge>
            </div>
            <h1 className="truncate text-lg font-semibold" data-testid="wizard-title">
              {name ||
                `${planType === "campaign" ? "SIA" : "Routine"} microplan Q${quarter} ${year}`}
            </h1>
            <p className="text-xs text-muted-foreground">{facilityLabel}</p>
          </div>
          <Badge variant={status === "draft" ? "outline" : "default"}>
            {status}
          </Badge>
        </div>
        {/* Task #101 — return-to-village banner */}
        {returnVillage && (
          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
            data-testid="banner-return-to-village"
          >
            <span className="min-w-0">
              {microplanId ? (
                <>
                  Microplan started. You can now continue to plan a session for{" "}
                  <span className="font-semibold">
                    {returnVillage.name || "the selected village"}
                  </span>
                  .
                </>
              ) : (
                <>
                  After this microplan is saved, you'll return to plan a session
                  for{" "}
                  <span className="font-semibold">
                    {returnVillage.name || "the selected village"}
                  </span>
                  .
                </>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={microplanId ? "default" : "outline"}
                disabled={!microplanId}
                onClick={continueToVillageSession}
                data-testid="button-continue-to-village-session"
              >
                Continue to session
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={clearReturnVillage}
                aria-label="Dismiss return-to-village reminder"
                data-testid="button-dismiss-return-to-village"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Saved-microplans picker — only when no microplan is open. Gives users
          a real "list of microplans (with their planned sessions count)" entry
          point. Previously the only way to reopen a saved plan was via deep
          links from the map or SessionsHub, which made the planned sessions
          for an existing microplan effectively invisible from this page. */}
      {!microplanId && (
        <SavedMicroplansPanel
          planType={planType}
          onOpen={(id) =>
            setLocation(
              `/microplans/${planType === "campaign" ? "campaigns" : "routine"}/${id}`,
            )
          }
        />
      )}

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
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Step {stepDef.id} · {stepDef.title}
                </CardTitle>
                {returnToSummary && active !== 11 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReturnToSummary(false);
                      setActive(11);
                    }}
                    data-testid="button-back-to-summary"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to summary
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
              <WhatToDo bullets={stepDef.whatToDo} />

              {/* Facility & name (always available, drives ensureMicroplan) */}
              {!microplanId && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div
                    className={
                      errorFocus?.field === "facility"
                        ? "rounded-md ring-1 ring-destructive p-2"
                        : undefined
                    }
                  >
                    <Label className="mb-2 block">Facility</Label>
                    <FacilityCascadePicker
                      value={facilityId}
                      onChange={(id) => {
                        setFacilityId(id);
                        if (errorFocus?.field === "facility") setErrorFocus(null);
                      }}
                      required
                      testIdPrefix="wizard"
                    />
                    {errorFocus?.field === "facility" && (
                      <p
                        className="mt-1 text-xs text-destructive"
                        data-testid="facility-error"
                      >
                        {errorFocus.message}
                      </p>
                    )}
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
                  planType={planType}
                  setPlanType={setPlanType}
                  planTypeLocked={planTypeLocked}
                  campaignAntigen={campaignAntigen}
                  setCampaignAntigen={setCampaignAntigen}
                  campaignTargetAge={campaignTargetAge}
                  setCampaignTargetAge={setCampaignTargetAge}
                  campaignScope={campaignScope}
                  setCampaignScope={setCampaignScope}
                />
              )}
              {active === 2 && (
                <Step2
                  communities={communities}
                  setCommunities={setCommunities}
                  onDelete={deleteCommunity}
                  facility={facility}
                  excludedVillages={excludedFacilityVillages}
                  excludedDetails={excludedDetails}
                  onRestoreVillage={(v) => {
                    setCommunities([
                      ...communities,
                      {
                        villageId: v.id,
                        name: v.name,
                        type: "village",
                        targetPopulation: "0",
                        source: "nso",
                        strategy: v.isHardToReach ? "outreach" : "static",
                        saved: false,
                        rowId: `v${v.id}-${Date.now()}`,
                        latitude: v.latitude != null ? String(v.latitude) : undefined,
                        longitude: v.longitude != null ? String(v.longitude) : undefined,
                      },
                    ]);
                    setExcludedVillageIds((prev) => {
                      if (!prev.has(v.id)) return prev;
                      const next = new Set<number>(prev);
                      next.delete(v.id);
                      persistExcluded(next);
                      return next;
                    });
                  }}
                  errorRowId={
                    errorFocus?.step === 2 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 2 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 3 && (
                <Step3
                  risk={risk}
                  setRisk={setRisk}
                  errorRowId={
                    errorFocus?.step === 3 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 3 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 4 && (
                <Step4
                  calendar={calendar}
                  setCalendar={setCalendar}
                  generate={generateCalendar}
                  errorRowId={
                    errorFocus?.step === 4 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 4 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
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
                  errorRowId={
                    errorFocus?.step === 6 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 6 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 7 && (
                <Step7
                  mobilization={mobilization}
                  setMobilization={setMobilization}
                  onDelete={deleteMobilizationRow}
                  errorRowId={
                    errorFocus?.step === 7 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 7 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 8 && (
                <Step8 transport={transport} setTransport={setTransport} />
              )}
              {active === 9 && (
                <Step9
                  budget={budget}
                  setBudget={setBudget}
                  onDelete={deleteBudgetRow}
                  errorRowId={
                    errorFocus?.step === 9 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 9 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 10 && (
                <Step10
                  supervision={supervision}
                  setSupervision={setSupervision}
                  onDelete={deleteSupervisionRow}
                  errorRowId={
                    errorFocus?.step === 10 ? errorFocus.rowId : undefined
                  }
                  errorMessage={
                    errorFocus?.step === 10 ? errorFocus.message : undefined
                  }
                  onClearError={() => setErrorFocus(null)}
                />
              )}
              {active === 11 && (
                <Step11
                  microplan={microplan ?? null}
                  facilityLabel={facilityLabel}
                  coverage={coverage}
                  communities={communities}
                  risk={risk}
                  calendar={calendar}
                  staffing={staffing}
                  vaccines={vaccines}
                  coldChain={coldChain}
                  mobilization={mobilization}
                  transport={transport}
                  budget={budget}
                  supervision={supervision}
                  onEdit={(step) => {
                    setReturnToSummary(true);
                    setActive(step);
                  }}
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
                {saveStatus !== "idle" && (
                  <span
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    aria-live="polite"
                    data-testid="text-autosave-status"
                  >
                    {saveStatus === "saving" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {lastSavedAt
                          ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}`
                          : "All changes saved"}
                      </>
                    )}
                  </span>
                )}
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
      <DeleteConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setPendingDelete(null);
        }}
        title="Delete saved row?"
        description={
          pendingDelete
            ? `This will permanently delete ${pendingDelete.label} from this microplan. This cannot be undone.`
            : ""
        }
        onConfirm={() => void confirmPendingDelete()}
        isPending={deleteBusy}
      />
      <Dialog
        open={pendingCommunityRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) {
            setPendingCommunityRemoval(null);
            setRemovalReason("");
          }
        }}
      >
        <DialogContent data-testid="dialog-remove-community">
          <DialogHeader>
            <DialogTitle>
              Remove {pendingCommunityRemoval?.label ?? "this community"} from the catchment?
            </DialogTitle>
            <DialogDescription>
              {pendingCommunityRemoval?.hasServerRow
                ? "This deletes the saved community row from this microplan and remembers the removal so the seed list won't add it back. You can restore it later from the Previously removed panel."
                : "We'll remember this removal so the catchment won't re-add it the next time the microplan is opened. You can restore it later from the Previously removed panel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="removal-reason">Reason (optional)</Label>
            <Textarea
              id="removal-reason"
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Now served by another facility, abandoned hamlet, duplicate entry…"
              maxLength={500}
              rows={3}
              data-testid="input-removal-reason"
            />
            <p className="text-xs text-muted-foreground">
              Shown alongside the removal in the Previously removed panel so other staff
              understand why this community was taken out.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (deleteBusy) return;
                setPendingCommunityRemoval(null);
                setRemovalReason("");
              }}
              disabled={deleteBusy}
              data-testid="button-cancel-removal"
            >
              Cancel
            </Button>
            <Button
              variant={pendingCommunityRemoval?.hasServerRow ? "destructive" : "default"}
              onClick={() => void confirmCommunityRemoval()}
              disabled={deleteBusy}
              data-testid="button-confirm-removal"
            >
              {deleteBusy ? "Removing…" : "Remove from catchment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Formats the timestamp for the "Previously removed" panel. Falls back to the
// raw value when the timestamp is unparseable so we never silently hide audit
// data the server actually supplied.
function formatRemovedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  planType,
  setPlanType,
  planTypeLocked,
  campaignAntigen,
  setCampaignAntigen,
  campaignTargetAge,
  setCampaignTargetAge,
  campaignScope,
  setCampaignScope,
}: {
  coverage: any;
  setCoverage: (v: any) => void;
  planType: "routine" | "campaign";
  setPlanType: (v: "routine" | "campaign") => void;
  planTypeLocked: boolean;
  campaignAntigen: string;
  setCampaignAntigen: (v: string) => void;
  campaignTargetAge: string;
  setCampaignTargetAge: (v: string) => void;
  campaignScope: "National" | "Sub-national" | "Targeted";
  setCampaignScope: (v: "National" | "Sub-national" | "Targeted") => void;
}) {
  const dtp1 = parseFloat(coverage.dtp1 || "0");
  const dtp3 = parseFloat(coverage.dtp3 || "0");
  const mcv1 = parseFloat(coverage.mcv1 || "0");
  const dropDtp = dtp1 > 0 ? Math.round(((dtp1 - dtp3) / dtp1) * 100) : 0;
  const dropMcv = dtp1 > 0 ? Math.round(((dtp1 - mcv1) / dtp1) * 100) : 0;
  const set = (k: string, v: string) => setCoverage({ ...coverage, [k]: v });
  return (
    <div className="space-y-3">
      {/* Plan type chooser — same template, two flavours. Locked when the
          user entered via /microplans/routine or /microplans/campaigns. */}
      <div className="rounded-md border bg-muted/30 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Plan type</p>
            <p className="text-xs text-muted-foreground">
              {planType === "campaign"
                ? "Supplementary Immunization Activity (SIA / campaign)."
                : "Routine immunization microplan for the quarter."}
            </p>
          </div>
          <Select
            value={planType}
            onValueChange={(v) => setPlanType(v as "routine" | "campaign")}
            disabled={planTypeLocked}
          >
            <SelectTrigger className="w-[220px]" data-testid="select-plan-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine immunization</SelectItem>
              <SelectItem value="campaign">SIA / Campaign</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {planType === "campaign" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Antigen</Label>
              <Input
                value={campaignAntigen}
                onChange={(e) => setCampaignAntigen(e.target.value)}
                placeholder="e.g. Polio, Measles"
                data-testid="input-campaign-antigen"
              />
            </div>
            <div>
              <Label className="text-xs">Target age group</Label>
              <Input
                value={campaignTargetAge}
                onChange={(e) => setCampaignTargetAge(e.target.value)}
                placeholder="e.g. 0-59 months"
                data-testid="input-campaign-target-age"
              />
            </div>
            <div>
              <Label className="text-xs">Scope</Label>
              <Select
                value={campaignScope}
                onValueChange={(v) =>
                  setCampaignScope(v as "National" | "Sub-national" | "Targeted")
                }
              >
                <SelectTrigger data-testid="select-campaign-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="Sub-national">Sub-national</SelectItem>
                  <SelectItem value="Targeted">Targeted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
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
  onDelete,
  facility,
  excludedVillages,
  excludedDetails,
  onRestoreVillage,
  errorRowId,
  errorMessage,
  onClearError,
}: {
  communities: any[];
  setCommunities: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
  facility: Facility | null;
  excludedVillages: Village[];
  excludedDetails: Map<number, ExcludedVillageDetail>;
  onRestoreVillage: (v: Village) => void;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged community into view and focus its population input
  // whenever a new validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);
  const { toast } = useToast();
  const [estimate, setEstimate] = useState<
    | {
        index: number;
        lat: number;
        lng: number;
        radiusKm: number;
        status: "loading" | "done";
        progress: { done: number; total: number };
        streamingCells: CatchmentCell[];
        result?: CatchmentEstimateResult;
      }
    | null
  >(null);
  const estimateAbortRef = useRef<AbortController | null>(null);
  const estimateFlushTimerRef = useRef<number | null>(null);

  type BulkRowStatus =
    | { state: "pending" }
    | { state: "running" }
    | { state: "ok"; total: number }
    | { state: "nodata" }
    | { state: "error"; message: string }
    | { state: "skipped" };
  const [bulkEstimate, setBulkEstimate] = useState<
    | {
        radiusKm: number;
        phase: "confirm" | "running" | "done";
        rows: Array<{ index: number; name: string; status: BulkRowStatus }>;
      }
    | null
  >(null);
  const bulkAbortRef = useRef<AbortController | null>(null);

  const update = (i: number, patch: any) => {
    const next = [...communities];
    next[i] = { ...next[i], ...patch };
    setCommunities(next);
    // Editing the flagged row clears the highlight so the inline message
    // doesn't linger once the planner has acted on it.
    if (errorRowId && `pop-${i}` === errorRowId) onClearError?.();
  };

  const runEstimate = async (index: number, radiusKm: number) => {
    const c = communities[index];
    if (!c) return;
    const lat = parseFloat(c.latitude);
    const lng = parseFloat(c.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    estimateAbortRef.current?.abort();
    const ctrl = new AbortController();
    estimateAbortRef.current = ctrl;
    if (estimateFlushTimerRef.current != null) {
      clearTimeout(estimateFlushTimerRef.current);
      estimateFlushTimerRef.current = null;
    }
    setEstimate({
      index,
      lat,
      lng,
      radiusKm,
      status: "loading",
      progress: { done: 0, total: 0 },
      streamingCells: [],
    });
    // Buffer streaming cells and flush at most every ~100ms so a large
    // catchment doesn't trigger thousands of React renders.
    const cellBuffer: CatchmentCell[] = [];
    const flush = () => {
      estimateFlushTimerRef.current = null;
      if (ctrl.signal.aborted || cellBuffer.length === 0) return;
      const snapshot = cellBuffer.slice();
      setEstimate((prev) =>
        prev && prev.index === index && prev.radiusKm === radiusKm && prev.status === "loading"
          ? { ...prev, streamingCells: snapshot }
          : prev,
      );
    };
    const scheduleFlush = () => {
      if (estimateFlushTimerRef.current != null) return;
      estimateFlushTimerRef.current = window.setTimeout(flush, 100);
    };
    const result = await estimateCatchmentPopulation({
      lat,
      lng,
      radiusKm,
      signal: ctrl.signal,
      onProgress: (done, total) => {
        setEstimate((prev) =>
          prev && prev.index === index && prev.radiusKm === radiusKm
            ? { ...prev, progress: { done, total } }
            : prev,
        );
      },
      onCell: (cell) => {
        cellBuffer.push({ ...cell });
        scheduleFlush();
      },
    });
    if (estimateFlushTimerRef.current != null) {
      clearTimeout(estimateFlushTimerRef.current);
      estimateFlushTimerRef.current = null;
    }
    if (ctrl.signal.aborted) return;
    setEstimate((prev) =>
      prev && prev.index === index && prev.radiusKm === radiusKm
        ? { ...prev, status: "done", result, streamingCells: [] }
        : prev,
    );
  };

  const openEstimate = (index: number) => {
    runEstimate(index, 2);
  };
  const closeEstimate = () => {
    estimateAbortRef.current?.abort();
    estimateAbortRef.current = null;
    if (estimateFlushTimerRef.current != null) {
      clearTimeout(estimateFlushTimerRef.current);
      estimateFlushTimerRef.current = null;
    }
    setEstimate(null);
  };
  const acceptEstimate = () => {
    if (!estimate || estimate.result?.status !== "ok") return;
    update(estimate.index, {
      targetPopulation: String(estimate.result.total),
      source: "worldpop",
    });
    toast({
      title: "Estimate applied",
      description: `Target population set to ${estimate.result.total.toLocaleString()} from WorldPop (${estimate.radiusKm} km).`,
    });
    closeEstimate();
  };
  const openBulkEstimate = () => {
    const rows = communities
      .map((c, index) => {
        const lat = parseFloat(c.latitude);
        const lng = parseFloat(c.longitude);
        const hasCoords = !isNaN(lat) && !isNaN(lng);
        return {
          index,
          name: c.name || `Community ${index + 1}`,
          status: hasCoords
            ? ({ state: "pending" } as BulkRowStatus)
            : ({ state: "skipped" } as BulkRowStatus),
        };
      });
    setBulkEstimate({ radiusKm: 2, phase: "confirm", rows });
  };
  const closeBulkEstimate = () => {
    bulkAbortRef.current?.abort();
    bulkAbortRef.current = null;
    setBulkEstimate(null);
  };
  const runBulkEstimate = async () => {
    if (!bulkEstimate) return;
    const radiusKm = bulkEstimate.radiusKm;
    const eligible = bulkEstimate.rows.filter((r) => r.status.state !== "skipped");
    if (eligible.length === 0) {
      setBulkEstimate({ ...bulkEstimate, phase: "done" });
      return;
    }
    estimateAbortRef.current?.abort();
    estimateAbortRef.current = null;
    setEstimate(null);
    bulkAbortRef.current?.abort();
    const ctrl = new AbortController();
    bulkAbortRef.current = ctrl;

    setBulkEstimate({
      ...bulkEstimate,
      phase: "running",
      rows: bulkEstimate.rows.map((r) =>
        r.status.state === "skipped" ? r : { ...r, status: { state: "pending" } },
      ),
    });

    const updateRow = (index: number, status: BulkRowStatus) => {
      setBulkEstimate((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((r) => (r.index === index ? { ...r, status } : r)),
            }
          : prev,
      );
    };
    const successes = new Map<number, number>();

    const queue = [...eligible];
    const concurrency = Math.min(2, queue.length);
    let okCount = 0;
    let nodataCount = 0;
    let errorCount = 0;
    const worker = async () => {
      while (queue.length > 0) {
        if (ctrl.signal.aborted) return;
        const row = queue.shift()!;
        const c = communities[row.index];
        if (!c) continue;
        const lat = parseFloat(c.latitude);
        const lng = parseFloat(c.longitude);
        if (isNaN(lat) || isNaN(lng)) {
          updateRow(row.index, { state: "skipped" });
          continue;
        }
        updateRow(row.index, { state: "running" });
        try {
          const result = await estimateCatchmentPopulation({
            lat,
            lng,
            radiusKm,
            signal: ctrl.signal,
          });
          if (ctrl.signal.aborted) return;
          if (result.status === "ok") {
            successes.set(row.index, result.total);
            updateRow(row.index, { state: "ok", total: result.total });
            okCount++;
          } else if (result.status === "nodata") {
            updateRow(row.index, { state: "nodata" });
            nodataCount++;
          } else {
            updateRow(row.index, { state: "error", message: result.message });
            errorCount++;
          }
        } catch (err: any) {
          if (ctrl.signal.aborted) return;
          updateRow(row.index, {
            state: "error",
            message: err?.message || "Failed",
          });
          errorCount++;
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    if (ctrl.signal.aborted) return;
    if (successes.size > 0) {
      const next = communities.map((c, i) => {
        const total = successes.get(i);
        if (total == null) return c;
        return { ...c, targetPopulation: String(total), source: "worldpop" };
      });
      setCommunities(next);
    }
    setBulkEstimate((prev) => (prev ? { ...prev, phase: "done" } : prev));
    const allFailed = okCount === 0 && errorCount > 0;
    toast({
      title: allFailed
        ? "Bulk estimate failed"
        : errorCount > 0
        ? "Bulk estimate finished with errors"
        : "Bulk estimate complete",
      description: `${okCount} updated · ${nodataCount} no-data · ${errorCount} failed`,
      variant: allFailed ? "destructive" : undefined,
    });
  };

  const add = (lat?: number, lng?: number) => {
    const newRow: any = {
      name: "",
      type: "village",
      targetPopulation: "0",
      source: "nso",
      strategy: "static",
      rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    if (lat != null && lng != null) {
      newRow.latitude = lat.toFixed(6);
      newRow.longitude = lng.toFixed(6);
      newRow.latLngDirty = true;
    }
    const next = [...communities, newRow];
    setCommunities(next);
    setSelectedIdx(next.length - 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Click anywhere on the map to drop a new community. Drag pins to fine-tune coordinates.
          Pin numbers match the rows below.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={openBulkEstimate}
            disabled={
              communities.filter(
                (c) =>
                  c.latitude &&
                  c.longitude &&
                  !isNaN(parseFloat(c.latitude)) &&
                  !isNaN(parseFloat(c.longitude)),
              ).length === 0
            }
            title="Estimate population from WorldPop for every pinned community"
            data-testid="button-estimate-all-from-map"
          >
            <MapIcon className="mr-1 h-4 w-4" /> Estimate all from map
          </Button>
          <Button size="sm" variant="outline" onClick={() => add()} data-testid="button-add-community">
            <Plus className="mr-1 h-4 w-4" /> Add community
          </Button>
        </div>
      </div>

      <Step2Map
        facility={facility}
        communities={communities}
        selectedIdx={selectedIdx}
        onMapClick={(lat, lng) => add(lat, lng)}
        onPinDrag={(i, lat, lng) => {
          update(i, {
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            latLngDirty: true,
          });
        }}
        onPinClick={(i) => setSelectedIdx(i)}
        catchmentPreview={
          estimate
            ? {
                lat: estimate.lat,
                lng: estimate.lng,
                radiusKm: estimate.radiusKm,
                cells:
                  estimate.status === "done" && estimate.result
                    ? (estimate.result as any).cells ?? null
                    : estimate.streamingCells.length > 0
                      ? estimate.streamingCells
                      : null,
              }
            : null
        }
      />

      {excludedVillages.length > 0 && (
        <div
          className="rounded-md border border-dashed bg-muted/30 p-3"
          data-testid="section-previously-removed"
        >
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Previously removed ({excludedVillages.length})
          </div>
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-2">
              {excludedVillages.map((v) => {
                const detail = excludedDetails.get(v.id);
                const removedAtLabel = formatRemovedAt(detail?.removedAt ?? null);
                const removedBy = detail?.removedByName?.trim();
                const meta: string[] = [];
                if (removedAtLabel) meta.push(`Removed ${removedAtLabel}`);
                if (removedBy) meta.push(`by ${removedBy}`);
                const metaLine = meta.join(" ");
                const reason = detail?.reason?.trim();
                return (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-2"
                    data-testid={`excluded-village-${v.id}`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestoreVillage(v)}
                      data-testid={`button-restore-village-${v.id}`}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add back {v.name}
                    </Button>
                    {metaLine && (
                      <span
                        className="text-xs text-muted-foreground"
                        data-testid={`excluded-village-meta-${v.id}`}
                      >
                        {metaLine}
                      </span>
                    )}
                    {reason && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground"
                            aria-label={`Reason: ${reason}`}
                            data-testid={`excluded-village-reason-${v.id}`}
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold">Reason</p>
                          <p className="text-xs">{reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 w-8">#</th>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Target pop.</th>
              <th className="p-2">Source</th>
              <th className="p-2">Strategy</th>
              <th className="p-2">Coordinates</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {communities.map((c, i) => {
              const hasCoords =
                c.latitude && c.longitude &&
                !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude));
              const isError = errorRowId != null && `pop-${i}` === errorRowId;
              return (
                <tr
                  key={c.rowId}
                  className={`border-b cursor-pointer ${
                    selectedIdx === i ? "bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedIdx(i)}
                  data-testid={`row-community-${i}`}
                >
                  <td className="p-1 text-center text-xs font-mono text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="p-1">
                    <Input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-1">
                    <Select value={c.type} onValueChange={(v) => update(i, { type: v })}>
                      <SelectTrigger onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="village">Village</SelectItem>
                        <SelectItem value="hamlet">Hamlet</SelectItem>
                        <SelectItem value="idp">IDP camp</SelectItem>
                        <SelectItem value="school">School</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <div className="flex items-center gap-1">
                      <Input
                        ref={isError ? errorRowRef : undefined}
                        type="number"
                        className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                        value={c.targetPopulation}
                        onChange={(e) => update(i, { targetPopulation: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!hasCoords}
                        title={
                          hasCoords
                            ? "Estimate from map (WorldPop)"
                            : "Drop a pin first to estimate from map"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          openEstimate(i);
                        }}
                        data-testid={`button-estimate-from-map-${i}`}
                      >
                        Estimate
                      </Button>
                    </div>
                    {isError && errorMessage && (
                      <p
                        className="mt-1 text-xs text-destructive"
                        data-testid="community-row-error"
                      >
                        {errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="p-1">
                    <Select value={c.source} onValueChange={(v) => update(i, { source: v })}>
                      <SelectTrigger onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
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
                      <SelectTrigger onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Fixed</SelectItem>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1 text-xs font-mono">
                    {hasCoords ? (
                      <span className="text-foreground" data-testid={`text-coords-${i}`}>
                        {parseFloat(c.latitude).toFixed(4)}, {parseFloat(c.longitude).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">no pin</span>
                    )}
                  </td>
                  <td className="p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(i);
                      }}
                      data-testid={`button-delete-community-${i}`}
                      aria-label="Delete community"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {communities.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-sm text-muted-foreground">
                  No communities yet — click on the map to drop one, or use Add community.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={estimate !== null}
        onOpenChange={(open) => {
          if (!open) closeEstimate();
        }}
      >
        <DialogContent data-testid="dialog-estimate-catchment">
          <DialogHeader>
            <DialogTitle>Estimate population from map</DialogTitle>
            <DialogDescription>
              {estimate && (
                <>
                  Summing WorldPop 1&nbsp;km cells inside a circle around{" "}
                  <span className="font-mono">
                    {estimate.lat.toFixed(4)}, {estimate.lng.toFixed(4)}
                  </span>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {estimate && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Catchment radius
                </Label>
                <div className="mt-1 flex gap-2">
                  {[1, 2, 3].map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={estimate.radiusKm === r ? "default" : "outline"}
                      onClick={() => runEstimate(estimate.index, r)}
                      disabled={estimate.status === "loading"}
                      data-testid={`button-catchment-radius-${r}`}
                    >
                      {r} km
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {estimate.status === "loading" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sampling WorldPop cells… ({estimate.progress.done}
                    {estimate.progress.total > 0
                      ? ` / ${estimate.progress.total}`
                      : ""}
                    )
                  </div>
                )}
                {estimate.status === "done" && estimate.result?.status === "ok" && (
                  <div data-testid="text-catchment-estimate">
                    <div className="text-2xl font-semibold">
                      ≈ {estimate.result.total.toLocaleString()} people
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {estimate.result.sampledCells} cell
                      {estimate.result.sampledCells === 1 ? "" : "s"} summed
                      {estimate.result.nodataCells > 0 &&
                        ` · ${estimate.result.nodataCells} no-data`}
                      {estimate.result.errorCells > 0 &&
                        ` · ${estimate.result.errorCells} missing`}
                      <br />
                      Source: WorldPop 2020, 1&nbsp;km grid
                    </div>
                    {(() => {
                      const r = estimate.result;
                      let badgeText = "";
                      let badgeClass = "";
                      let testId = "";
                      if (r.partial) {
                        badgeText = `Partial — ${r.errorCells} cell${
                          r.errorCells === 1 ? "" : "s"
                        } missing${r.offline ? " (offline)" : ""}, ${
                          r.cachedCells
                        } from cache, ${r.liveCells} live`;
                        badgeClass =
                          "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200";
                        testId = "badge-catchment-partial";
                      } else if (r.liveCells === 0 && r.cachedCells > 0) {
                        badgeText = `Using cached data${
                          r.offline ? " (offline)" : ""
                        } — ${r.cachedCells} cell${
                          r.cachedCells === 1 ? "" : "s"
                        } from previous lookups`;
                        badgeClass =
                          "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200";
                        testId = "badge-catchment-cached";
                      } else if (r.cachedCells > 0) {
                        badgeText = `Live — ${r.liveCells} fetched, ${r.cachedCells} from cache`;
                        badgeClass =
                          "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200";
                        testId = "badge-catchment-live";
                      } else {
                        badgeText = "Live — all cells fetched";
                        badgeClass =
                          "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200";
                        testId = "badge-catchment-live";
                      }
                      return (
                        <div
                          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                          data-testid={testId}
                        >
                          {badgeText}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {estimate.status === "done" &&
                  estimate.result?.status === "nodata" && (
                    <div className="text-muted-foreground">
                      No population data for cells in this area.
                    </div>
                  )}
                {estimate.status === "done" &&
                  estimate.result?.status === "error" && (
                    <div className="text-destructive">
                      {estimate.result.message}
                    </div>
                  )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEstimate}
              data-testid="button-catchment-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={acceptEstimate}
              disabled={
                !estimate ||
                estimate.status !== "done" ||
                estimate.result?.status !== "ok"
              }
              data-testid="button-catchment-accept"
            >
              Use this estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkEstimate !== null}
        onOpenChange={(open) => {
          if (!open) closeBulkEstimate();
        }}
      >
        <DialogContent data-testid="dialog-bulk-estimate-catchment">
          <DialogHeader>
            <DialogTitle>Estimate all from map</DialogTitle>
            <DialogDescription>
              {bulkEstimate && bulkEstimate.phase === "confirm" && (
                <>
                  This will overwrite the target population on every community
                  that has a pin with a fresh WorldPop estimate. Communities
                  without coordinates will be skipped.
                </>
              )}
              {bulkEstimate && bulkEstimate.phase === "running" && (
                <>Sampling WorldPop cells for each community…</>
              )}
              {bulkEstimate && bulkEstimate.phase === "done" && (() => {
                const okN = bulkEstimate.rows.filter((r) => r.status.state === "ok").length;
                const errN = bulkEstimate.rows.filter((r) => r.status.state === "error").length;
                if (okN === 0 && errN > 0) {
                  return (
                    <>No rows could be estimated. See the per-row reason below — you can enter populations manually for now.</>
                  );
                }
                if (okN === 0) {
                  return <>No rows were updated.</>;
                }
                if (errN > 0) {
                  return (
                    <>Done — {okN} row{okN === 1 ? "" : "s"} updated from WorldPop. {errN} failed (see below).</>
                  );
                }
                return <>Done. Successful rows now use WorldPop as their source.</>;
              })()}
            </DialogDescription>
          </DialogHeader>

          {bulkEstimate && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Shared catchment radius
                </Label>
                <div className="mt-1 flex gap-2">
                  {[1, 2, 3].map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={bulkEstimate.radiusKm === r ? "default" : "outline"}
                      onClick={() =>
                        setBulkEstimate((prev) =>
                          prev ? { ...prev, radiusKm: r } : prev,
                        )
                      }
                      disabled={bulkEstimate.phase === "running"}
                      data-testid={`button-bulk-catchment-radius-${r}`}
                    >
                      {r} km
                    </Button>
                  ))}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-md border bg-muted/30 text-sm">
                <table className="w-full">
                  <thead className="sticky top-0 border-b bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Community</th>
                      <th className="p-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEstimate.rows.map((r) => (
                      <tr
                        key={r.index}
                        className="border-b last:border-0"
                        data-testid={`row-bulk-estimate-${r.index}`}
                      >
                        <td className="p-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{r.index + 1}
                          </span>{" "}
                          {r.name}
                        </td>
                        <td className="p-2 text-xs">
                          {r.status.state === "skipped" && (
                            <span className="text-muted-foreground">
                              No pin — skipped
                            </span>
                          )}
                          {r.status.state === "pending" && (
                            <span className="text-muted-foreground">
                              {bulkEstimate.phase === "running"
                                ? "Waiting…"
                                : "Ready"}
                            </span>
                          )}
                          {r.status.state === "running" && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sampling…
                            </span>
                          )}
                          {r.status.state === "ok" && (
                            <span className="text-foreground" data-testid={`text-bulk-ok-${r.index}`}>
                              ≈ {r.status.total.toLocaleString()} people
                            </span>
                          )}
                          {r.status.state === "nodata" && (
                            <span className="text-muted-foreground">
                              No data in this area
                            </span>
                          )}
                          {r.status.state === "error" && (
                            <span className="text-destructive">
                              {r.status.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkEstimate.phase === "done" && (
                <div className="text-xs text-muted-foreground">
                  {bulkEstimate.rows.filter((r) => r.status.state === "ok").length}{" "}
                  updated ·{" "}
                  {
                    bulkEstimate.rows.filter((r) => r.status.state === "nodata")
                      .length
                  }{" "}
                  no-data ·{" "}
                  {
                    bulkEstimate.rows.filter((r) => r.status.state === "error")
                      .length
                  }{" "}
                  failed ·{" "}
                  {
                    bulkEstimate.rows.filter((r) => r.status.state === "skipped")
                      .length
                  }{" "}
                  skipped
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeBulkEstimate}
              data-testid="button-bulk-catchment-cancel"
            >
              {bulkEstimate?.phase === "running" ? "Stop" : "Close"}
            </Button>
            {bulkEstimate?.phase !== "done" && (
              <Button
                type="button"
                onClick={runBulkEstimate}
                disabled={
                  !bulkEstimate ||
                  bulkEstimate.phase === "running" ||
                  bulkEstimate.rows.every((r) => r.status.state === "skipped")
                }
                data-testid="button-bulk-catchment-run"
              >
                {bulkEstimate?.phase === "confirm"
                  ? `Overwrite ${
                      bulkEstimate.rows.filter(
                        (r) => r.status.state !== "skipped",
                      ).length
                    } row(s)`
                  : "Running…"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Step 2 Map ───────────────────────────────────────────────────────────
function Step2Map({
  facility,
  communities,
  selectedIdx,
  onMapClick,
  onPinDrag,
  onPinClick,
  catchmentPreview,
}: {
  facility: Facility | null;
  communities: any[];
  selectedIdx: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onPinDrag: (i: number, lat: number, lng: number) => void;
  onPinClick: (i: number) => void;
  catchmentPreview?: {
    lat: number;
    lng: number;
    radiusKm: number;
    cells?: Array<{
      lat: number;
      lng: number;
      latStepDeg: number;
      lngStepDeg: number;
      status: "ok" | "nodata" | "error";
      value?: number;
    }> | null;
  } | null;
}) {
  // Lazy-load Leaflet so the wizard's earlier steps don't pay the bundle cost.
  const [leaflet, setLeaflet] = useState<any>(null);
  const [showPopulation, setShowPopulation] = useState(false);
  // WorldPop retired the `wpGlobal` workspace from their public GeoServer in
  // 2025; both the WMS tile overlay and the GetFeatureInfo cell sampler
  // (worldpopCatchment.ts) return 404 against the old layer name. Until we
  // wire up a replacement raster, surface the disabled state up-front instead
  // of letting users click the toggle and get a destructive error toast.
  const [populationUnavailable, setPopulationUnavailable] = useState(true);
  const [infoMode, setInfoMode] = useState(false);
  const [infoPopup, setInfoPopup] = useState<
    | {
        lat: number;
        lng: number;
        status: "loading" | "ok" | "nodata" | "error";
        value?: number;
        message?: string;
        cached?: boolean;
        cachedAt?: number;
      }
    | null
  >(null);
  const popErrorToastedRef = useRef(false);
  const { toast } = useToast();
  useEffect(() => {
    let active = true;
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      import("@/lib/mapIcons"),
      // @ts-ignore - leaflet css
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, L, icons]) => {
      if (!active) return;
      icons.applyDefaultLeafletPinIcon();
      setLeaflet({ rl, L: L.default ?? L, icons });
    });
    return () => {
      active = false;
    };
  }, []);

  const facilityLat = facility?.latitude != null ? parseFloat(String(facility.latitude)) : null;
  const facilityLng = facility?.longitude != null ? parseFloat(String(facility.longitude)) : null;

  const center = useMemo<[number, number]>(() => {
    if (facilityLat != null && facilityLng != null && !isNaN(facilityLat) && !isNaN(facilityLng)) {
      return [facilityLat, facilityLng];
    }
    const first = communities.find(
      (c) => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)),
    );
    if (first) {
      return [parseFloat(first.latitude), parseFloat(first.longitude)];
    }
    return [-13.13, 27.85]; // Zambia fallback
  }, [facilityLat, facilityLng, communities]);

  const [basemap, setBasemap] = usePersistedBasemap("osm");
  const mapRef = useRef<any>(null);

  if (!leaflet) {
    return (
      <div className="h-[360px] w-full rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, Circle: LCircle, Rectangle: LRectangle, Tooltip: LTooltip, useMapEvents, useMap } = leaflet.rl;

  function Recenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center[0], center[1]]);
    return null;
  }

  function MapRefCatcher() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  const geocodedPoints: [number, number][] = [];
  if (facilityLat != null && facilityLng != null && !isNaN(facilityLat) && !isNaN(facilityLng)) {
    geocodedPoints.push([facilityLat, facilityLng]);
  }
  for (const c of communities) {
    if (!c.latitude || !c.longitude) continue;
    const lat = parseFloat(c.latitude);
    const lng = parseFloat(c.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;
    geocodedPoints.push([lat, lng]);
  }
  const canFitBounds = geocodedPoints.length > 0;

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14),
      (err) => console.error("Geolocation error:", err),
    );
  };
  const handleFitBounds = () => {
    if (!canFitBounds || !mapRef.current) return;
    if (geocodedPoints.length === 1) {
      mapRef.current.setView(geocodedPoints[0], 14);
      return;
    }
    const bounds = leaflet.L.latLngBounds(geocodedPoints);
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  };
  const L = leaflet.L;
  const { createFilledPinIcon, createFacilityCircleIcon } = leaflet.icons;

  const facilityIcon = createFacilityCircleIcon();
  const pinBlue = createFilledPinIcon("blue");
  const pinGreen = createFilledPinIcon("green");
  const pinAmber = createFilledPinIcon("amber");

  async function fetchPopulationAt(map: any, latlng: any) {
    const lat = latlng.lat;
    const lng = latlng.lng;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;

    if (offline) {
      const hit = getCachedPopulation(lat, lng);
      if (hit) {
        return { status: "ok" as const, value: hit.value, cached: true, cachedAt: hit.cachedAt };
      }
      return { status: "error" as const, message: "Offline and no cached estimate for this spot." };
    }

    const size = map.getSize();
    const point = map.latLngToContainerPoint(latlng);
    const bounds = map.getBounds();
    const sw = L.CRS.EPSG3857.project(bounds.getSouthWest());
    const ne = L.CRS.EPSG3857.project(bounds.getNorthEast());
    const params = new URLSearchParams({
      service: "WMS",
      version: "1.3.0",
      request: "GetFeatureInfo",
      layers: "wpGlobal:ppp_2020_1km_Aggregated",
      query_layers: "wpGlobal:ppp_2020_1km_Aggregated",
      crs: "EPSG:3857",
      bbox: `${sw.x},${sw.y},${ne.x},${ne.y}`,
      width: String(size.x),
      height: String(size.y),
      i: String(Math.round(point.x)),
      j: String(Math.round(point.y)),
      info_format: "application/json",
      feature_count: "1",
    });
    const url = `https://ogc.worldpop.org/geoserver/wpGlobal/ows?${params.toString()}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const feat = json?.features?.[0];
      const props = feat?.properties ?? {};
      const raw =
        props.GRAY_INDEX ?? props.gray_index ?? props.PALETTE_INDEX ?? props.value ?? null;
      const num = raw == null ? null : Number(raw);
      if (num == null || !isFinite(num) || num < 0) {
        return { status: "nodata" as const };
      }
      setCachedPopulation(lat, lng, num);
      return { status: "ok" as const, value: num };
    } catch (err: any) {
      const hit = getCachedPopulation(lat, lng);
      if (hit) {
        return { status: "ok" as const, value: hit.value, cached: true, cachedAt: hit.cachedAt };
      }
      return {
        status: "error" as const,
        message: err?.name === "AbortError" ? "Request timed out." : "Couldn't reach WorldPop.",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function ClickCatcher() {
    const map = useMapEvents({
      click(e: any) {
        if (infoMode) {
          const { lat, lng } = e.latlng;
          setInfoPopup({ lat, lng, status: "loading" });
          fetchPopulationAt(map, e.latlng).then((res) => {
            setInfoPopup({ lat, lng, ...res });
          });
          return;
        }
        onMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  // Build a numbered DivIcon for each community
  const buildNumberedIcon = (n: number, color: string, highlighted: boolean) =>
    L.divIcon({
      className: "step2-pin",
      html:
        `<div style="position:relative;width:30px;height:38px;">` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 24 32" style="${
          highlighted ? "filter:drop-shadow(0 0 4px rgba(37,99,235,0.9));" : ""
        }">` +
        `<path d="M12 0C5.37 0 0 5.37 0 12c0 9.3 12 20 12 20s12-10.7 12-20c0-6.63-5.37-12-12-12z" fill="${color}"/>` +
        `</svg>` +
        `<span style="position:absolute;top:5px;left:0;right:0;text-align:center;color:#fff;font-size:11px;font-weight:700;font-family:sans-serif;">${n}</span>` +
        `</div>`,
      iconSize: [30, 38],
      iconAnchor: [15, 38],
      popupAnchor: [0, -38],
    });

  return (
    <div
      className={`h-[360px] w-full rounded-xl overflow-hidden border border-border shadow-inner relative ${
        infoMode ? "[&_.leaflet-container]:cursor-help" : ""
      }`}
    >
      <MapContainer center={center} zoom={11} className="h-full w-full z-0" zoomControl={false}>
        {basemap === "osm" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Imagery &copy; Esri'
          />
        )}
        {showPopulation && !populationUnavailable && (
          <WMSTileLayer
            url="https://ogc.worldpop.org/geoserver/wpGlobal/ows"
            layers="wpGlobal:ppp_2020_1km_Aggregated"
            format="image/png"
            transparent={true}
            opacity={0.6}
            version="1.3.0"
            attribution="Population &copy; WorldPop"
            eventHandlers={{
              tileerror: () => {
                if (popErrorToastedRef.current) return;
                popErrorToastedRef.current = true;
                setPopulationUnavailable(true);
                setShowPopulation(false);
                toast({
                  title: "Population layer unavailable",
                  description: "Couldn't load WorldPop tiles. The layer may be offline.",
                  variant: "destructive",
                });
              },
            }}
          />
        )}
        <MapRefCatcher />
        <ClickCatcher />
        <Recenter center={center} />

        {infoPopup && (
          <Popup
            position={[infoPopup.lat, infoPopup.lng]}
            eventHandlers={{ remove: () => setInfoPopup(null) }}
          >
            <div className="text-xs" data-testid="popup-population-info">
              <div className="font-semibold">Population estimate</div>
              <div className="text-muted-foreground">
                {infoPopup.lat.toFixed(4)}, {infoPopup.lng.toFixed(4)}
              </div>
              {infoPopup.status === "loading" && (
                <div className="mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Looking up…
                </div>
              )}
              {infoPopup.status === "ok" && infoPopup.value != null && (
                <div className="mt-1">
                  ≈ <strong>{Math.round(infoPopup.value).toLocaleString()}</strong> people/km²
                  <div className="text-muted-foreground">
                    WorldPop 2020, 1&nbsp;km grid
                  </div>
                  {infoPopup.cached && (
                    <div className="text-muted-foreground italic" data-testid="text-population-cached">
                      cached
                      {infoPopup.cachedAt
                        ? ` · ${new Date(infoPopup.cachedAt).toLocaleDateString()}`
                        : ""}
                    </div>
                  )}
                </div>
              )}
              {infoPopup.status === "nodata" && (
                <div className="mt-1 text-muted-foreground">
                  No population data for this cell.
                </div>
              )}
              {infoPopup.status === "error" && (
                <div className="mt-1 text-muted-foreground">
                  {infoPopup.message ?? "Lookup failed."}
                </div>
              )}
            </div>
          </Popup>
        )}

        {catchmentPreview?.cells && catchmentPreview.cells.length > 0 && (() => {
          // Fixed people/km² buckets (WorldPop 1km grid). Using absolute
          // thresholds keeps streamed cells stable as new samples arrive —
          // a cell never gets recoloured just because a higher-valued cell
          // showed up later in the run.
          const ramp = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
          const thresholds = [10, 50, 200, 750];
          const colorFor = (v: number) => {
            for (let i = 0; i < thresholds.length; i++) {
              if (v < thresholds[i]) return ramp[i];
            }
            return ramp[ramp.length - 1];
          };
          return catchmentPreview.cells.map((c, i) => {
            const bounds: [[number, number], [number, number]] = [
              [c.lat - c.latStepDeg / 2, c.lng - c.lngStepDeg / 2],
              [c.lat + c.latStepDeg / 2, c.lng + c.lngStepDeg / 2],
            ];
            const isOk = c.status === "ok" && typeof c.value === "number";
            const isError = c.status === "error";
            const fillColor = isOk
              ? colorFor(c.value as number)
              : isError
                ? "#dc2626"
                : "#9ca3af";
            const strokeColor = isOk ? "#7f1d1d" : isError ? "#7f1d1d" : "#6b7280";
            return (
              <LRectangle
                key={`cell-${i}`}
                bounds={bounds}
                pathOptions={{
                  color: strokeColor,
                  weight: 1,
                  opacity: isOk ? 0.6 : 0.8,
                  fillColor,
                  fillOpacity: isOk ? 0.55 : 0.25,
                  dashArray: isOk ? undefined : "3 3",
                }}
              >
                <LTooltip direction="top" sticky>
                  <div className="text-xs">
                    {isOk ? (
                      <>
                        <strong>{Math.round(c.value as number).toLocaleString()}</strong>{" "}
                        people/km²
                      </>
                    ) : isError ? (
                      <span>Lookup failed</span>
                    ) : (
                      <span>No data</span>
                    )}
                  </div>
                </LTooltip>
              </LRectangle>
            );
          });
        })()}

        {catchmentPreview && (
          <LCircle
            center={[catchmentPreview.lat, catchmentPreview.lng]}
            radius={catchmentPreview.radiusKm * 1000}
            pathOptions={{
              color: "#2563eb",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: catchmentPreview.cells && catchmentPreview.cells.length > 0 ? 0 : 0.15,
            }}
          />
        )}

        {facilityLat != null && facilityLng != null && !isNaN(facilityLat) && !isNaN(facilityLng) && (
          <Marker position={[facilityLat, facilityLng]} icon={facilityIcon}>
            <Popup>
              <strong>{facility?.name}</strong>
              <div className="text-xs text-muted-foreground">Health facility</div>
            </Popup>
          </Marker>
        )}

        {communities.map((c, i) => {
          if (!c.latitude || !c.longitude) return null;
          const lat = parseFloat(c.latitude);
          const lng = parseFloat(c.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const color =
            c.strategy === "outreach"
              ? "#f59e0b"
              : c.strategy === "mobile"
              ? "#10b981"
              : "#2563eb";
          const icon = buildNumberedIcon(i + 1, color, selectedIdx === i);
          return (
            <Marker
              key={c.rowId}
              position={[lat, lng]}
              icon={icon}
              draggable={true}
              eventHandlers={{
                dragend: (e: any) => {
                  const ll = e.target.getLatLng();
                  onPinDrag(i, ll.lat, ll.lng);
                },
                click: () => onPinClick(i),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{c.name || `Community #${i + 1}`}</div>
                  <div className="text-muted-foreground">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                  <div className="text-muted-foreground">Strategy: {c.strategy}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Unused colour locals kept for tree-shaking-friendly variable usage */}
        <span style={{ display: "none" }}>{[pinBlue, pinGreen, pinAmber].length}</span>
      </MapContainer>
      <div className="absolute top-2 right-2 z-[400] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => {
            if (populationUnavailable) {
              setInfoMode(false);
              return;
            }
            setInfoMode((v) => {
              const next = !v;
              if (next && !showPopulation) setShowPopulation(true);
              if (!next) setInfoPopup(null);
              return next;
            });
          }}
          disabled={populationUnavailable}
          title={
            populationUnavailable
              ? "Population layer is temporarily unavailable."
              : infoMode
              ? "Click the map to add a community"
              : "Click the map to look up an estimated population"
          }
          className={`rounded-full px-3 py-1 text-xs font-medium shadow transition-colors inline-flex items-center gap-1 ${
            populationUnavailable
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
              : infoMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-background/90 text-foreground hover:bg-background"
          }`}
          data-testid="button-toggle-population-info"
        >
          <HelpCircle className="h-3 w-3" />
          {infoMode ? "Info on" : "Info"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (populationUnavailable) return;
            setShowPopulation((v) => !v);
          }}
          disabled={populationUnavailable}
          title={
            populationUnavailable
              ? "Population layer is temporarily unavailable."
              : showPopulation
              ? "Hide population density"
              : "Show population density"
          }
          className={`rounded-full px-3 py-1 text-xs font-medium shadow transition-colors ${
            populationUnavailable
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
              : showPopulation
              ? "bg-orange-600 text-white hover:bg-orange-700"
              : "bg-background/90 text-foreground hover:bg-background"
          }`}
          data-testid="button-toggle-population"
        >
          Population
        </button>
        <div className="flex flex-col gap-1 rounded-lg bg-background/90 p-1 shadow border border-border">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-step2-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-step2-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLocate}
            title="Locate me"
            aria-label="Locate me"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-step2-locate"
          >
            <Locate className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleFitBounds}
            disabled={!canFitBounds}
            title="Fit all pins"
            aria-label="Fit all pins"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none"
            data-testid="button-step2-fit-bounds"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setBasemap((b) => (b === "osm" ? "satellite" : "osm"))}
            title={basemap === "osm" ? "Switch to satellite" : "Switch to street map"}
            aria-label={basemap === "osm" ? "Switch to satellite" : "Switch to street map"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-step2-basemap-toggle"
          >
            {basemap === "osm" ? <Satellite className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {(() => {
        const cells = catchmentPreview?.cells ?? [];
        const hasCells = cells.length > 0;
        const okValues = hasCells
          ? cells
              .filter((c) => c.status === "ok" && typeof c.value === "number")
              .map((c) => c.value as number)
          : [];
        const hasNoData = hasCells && cells.some((c) => c.status === "nodata");
        const hasError = hasCells && cells.some((c) => c.status === "error");
        const minV = okValues.length > 0 ? Math.min(...okValues) : null;
        const maxV = okValues.length > 0 ? Math.max(...okValues) : null;
        const ramp = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
        const popDensityBottom = hasCells ? "bottom-[88px]" : "bottom-2";
        return (
          <>
            {showPopulation && !populationUnavailable && (
              <div
                className={`absolute ${popDensityBottom} right-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow`}
              >
                <div className="mb-1 font-medium">Population density</div>
                <div
                  className="h-2 w-32 rounded"
                  style={{
                    background:
                      "linear-gradient(to right, #ffffcc, #ffeda0, #fed976, #feb24c, #fd8d3c, #fc4e2a, #e31a1c, #b10026)",
                  }}
                />
                <div className="mt-0.5 flex justify-between text-muted-foreground">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
            {hasCells && (
              <div
                className="absolute bottom-2 right-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow"
                data-testid="legend-catchment-cells"
              >
                <div className="mb-1 font-medium">Catchment cells (people/km²)</div>
                {minV != null && maxV != null ? (
                  <>
                    <div
                      className="h-2 w-32 rounded"
                      style={{
                        background: `linear-gradient(to right, ${ramp.join(", ")})`,
                      }}
                    />
                    <div className="mt-0.5 flex justify-between text-muted-foreground">
                      <span>{Math.round(minV).toLocaleString()}</span>
                      <span>{Math.round(maxV).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No sampled values</div>
                )}
                {(hasNoData || hasError) && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {hasNoData && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-4 rounded-sm border border-dashed"
                          style={{ borderColor: "#6b7280", background: "#9ca3af66" }}
                        />
                        No data
                      </span>
                    )}
                    {hasError && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-4 rounded-sm border border-dashed"
                          style={{ borderColor: "#7f1d1d", background: "#dc262640" }}
                        />
                        Lookup failed
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
      <div className="absolute bottom-2 left-2 z-[400] flex flex-wrap gap-2 rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
          Facility
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
          Fixed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Outreach
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Mobile
        </span>
      </div>
    </div>
  );
}

function Step3({
  risk,
  setRisk,
  errorRowId,
  errorMessage,
  onClearError,
}: {
  risk: any[];
  setRisk: (v: any[]) => void;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const errorRowRef = useRef<HTMLTableRowElement | null>(null);

  // Scroll the flagged risk row into view and focus it whenever a new
  // validation error points at this step. The row carries tabIndex={-1} so
  // it can receive focus even though its only controls are sliders/checkboxes.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...risk];
    next[i] = { ...next[i], ...patch };
    setRisk(next);
    // Editing the flagged row clears the highlight.
    if (errorRowId && `htr-${i}` === errorRowId) onClearError?.();
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
          {risk.map((r, i) => {
            const isError = errorRowId != null && `htr-${i}` === errorRowId;
            return (
            <tr
              key={i}
              ref={isError ? errorRowRef : undefined}
              tabIndex={isError ? -1 : undefined}
              className={`border-b outline-none ${isError ? "ring-1 ring-destructive" : ""}`}
            >
              <td className="p-2">
                {r.name}
                {isError && errorMessage && (
                  <p
                    className="mt-1 text-xs text-destructive"
                    data-testid="risk-row-error"
                  >
                    {errorMessage}
                  </p>
                )}
              </td>
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
            );
          })}
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
  errorRowId,
  errorMessage,
  onClearError,
}: {
  calendar: any[];
  setCalendar: (v: any[]) => void;
  generate: (months: number, startYear?: number, startMonth?: number) => void;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  // Chosen calendar length, in months. Drives how many monthly sessions are
  // generated per community.
  const [period, setPeriod] = useState("12");
  // Chosen start month/year for the generated calendar. Defaults to the current
  // month so behaviour is unchanged when the planner doesn't touch it.
  const now = new Date();
  const [startMonth, setStartMonth] = useState(String(now.getMonth()));
  const [startYear, setStartYear] = useState(String(now.getFullYear()));
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  // Offer the current year plus a few ahead so planners can build next-year
  // microplans in advance.
  const YEAR_OPTIONS = Array.from(
    { length: 4 },
    (_, i) => now.getFullYear() + i,
  );
  // Whether the chosen start month/year falls before the current month. Used to
  // surface a gentle, non-blocking warning since past months can collide with
  // the >=7-day lead-time check later in the wizard.
  const startIsInPast =
    Number(startYear) < now.getFullYear() ||
    (Number(startYear) === now.getFullYear() &&
      Number(startMonth) < now.getMonth());
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged row into view and focus its date input whenever a new
  // validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...calendar];
    next[i] = { ...next[i], ...patch };
    setCalendar(next);
    // Editing the flagged row clears the highlight so the inline message
    // doesn't linger once the planner has acted on it.
    if (errorRowId && calendar[i]?.rowId === errorRowId) onClearError?.();
  };
  const remove = (i: number) => setCalendar(calendar.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Label className="text-xs text-muted-foreground">Start month</Label>
        <Select value={startMonth} onValueChange={setStartMonth}>
          <SelectTrigger className="w-36" data-testid="select-calendar-start-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={startYear} onValueChange={setStartYear}>
          <SelectTrigger className="w-28" data-testid="select-calendar-start-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-xs text-muted-foreground">Calendar period</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44" data-testid="select-calendar-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 month</SelectItem>
            <SelectItem value="3">Quarterly (3 months)</SelectItem>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            generate(Number(period), Number(startYear), Number(startMonth))
          }
          data-testid="button-generate-calendar"
        >
          Generate calendar
        </Button>
      </div>
      {startIsInPast && (
        <p
          className="text-right text-xs text-amber-600 dark:text-amber-500"
          data-testid="text-start-month-past-warning"
        >
          This start month is in the past — some sessions may fail the lead-time
          check.
        </p>
      )}
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
            {calendar.map((c, i) => {
              const isError = errorRowId != null && c.rowId === errorRowId;
              return (
                <tr key={c.rowId} className="border-b">
                  <td className="p-1">{c.name}</td>
                  <td className="p-1">
                    <Input
                      ref={isError ? errorRowRef : undefined}
                      type="date"
                      className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                      value={c.scheduledDate}
                      onChange={(e) => upd(i, { scheduledDate: e.target.value })}
                      data-testid={`input-session-date-${i}`}
                    />
                    {isError && errorMessage && (
                      <p
                        className="mt-1 text-xs text-destructive"
                        data-testid="calendar-row-error"
                      >
                        {errorMessage}
                      </p>
                    )}
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
              );
            })}
            {calendar.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No sessions yet — choose a period and click "Generate calendar" to start.
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
  errorRowId,
  errorMessage,
  onClearError,
}: {
  vaccines: any[];
  setVaccines: (v: any[]) => void;
  coldChain: any;
  setColdChain: (v: any) => void;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged vaccine row into view and focus its target input
  // whenever a new validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...vaccines];
    next[i] = { ...next[i], ...patch };
    setVaccines(next);
    // Editing the flagged row clears the highlight.
    if (errorRowId && `vr-${i}` === errorRowId) onClearError?.();
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
              const isError = errorRowId != null && `vr-${i}` === errorRowId;
              return (
                <tr key={v.name} className={`border-b ${isError ? "ring-1 ring-destructive" : ""}`}>
                  <td className="p-2 font-medium">{v.name}</td>
                  <td className="p-1">
                    <Input
                      ref={isError ? errorRowRef : undefined}
                      type="number"
                      className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                      value={v.target}
                      onChange={(e) => upd(i, { target: e.target.value })}
                    />
                    {isError && errorMessage && (
                      <p
                        className="mt-1 text-xs text-destructive"
                        data-testid="vaccine-row-error"
                      >
                        {errorMessage}
                      </p>
                    )}
                  </td>
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
  onDelete,
  errorRowId,
  errorMessage,
  onClearError,
}: {
  mobilization: any[];
  setMobilization: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged mobilization row into view and focus its focal-point
  // input whenever a new validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...mobilization];
    next[i] = { ...next[i], ...patch };
    setMobilization(next);
    // Editing the flagged row clears the highlight.
    if (errorRowId && `mob-${i}` === errorRowId) onClearError?.();
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
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {mobilization.map((m, i) => {
            const isError = errorRowId != null && `mob-${i}` === errorRowId;
            return (
            <tr key={m.rowId} className={`border-b align-top ${isError ? "ring-1 ring-destructive" : ""}`}>
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
              <td className="p-1">
                <Input
                  ref={isError ? errorRowRef : undefined}
                  className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                  value={m.focalPoint}
                  onChange={(e) => upd(i, { focalPoint: e.target.value })}
                />
                {isError && errorMessage && (
                  <p
                    className="mt-1 text-xs text-destructive"
                    data-testid="mobilization-row-error"
                  >
                    {errorMessage}
                  </p>
                )}
              </td>
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
              <td className="p-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(i)}
                  data-testid={`button-delete-mobilization-${i}`}
                  aria-label="Delete mobilization row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
            );
          })}
          {mobilization.length === 0 && (
            <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Finish Step 4 first.</td></tr>
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

function Step9({
  budget,
  setBudget,
  onDelete,
  errorRowId,
  errorMessage,
  onClearError,
}: {
  budget: any[];
  setBudget: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged budget line into view and focus its description input
  // whenever a new validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...budget];
    next[i] = { ...next[i], ...patch };
    setBudget(next);
    // Editing the flagged row clears the highlight.
    if (errorRowId && `bud-${i}` === errorRowId) onClearError?.();
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
  const remove = (i: number) => onDelete(i);
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
            {budget.map((b, i) => {
              const isError = errorRowId != null && `bud-${i}` === errorRowId;
              return (
              <tr key={b.rowId} className={`border-b ${isError ? "ring-1 ring-destructive" : ""}`}>
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
                <td className="p-1">
                  <Input
                    ref={isError ? errorRowRef : undefined}
                    className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                    value={b.description}
                    onChange={(e) => upd(i, { description: e.target.value })}
                  />
                  {isError && errorMessage && (
                    <p
                      className="mt-1 text-xs text-destructive"
                      data-testid="budget-row-error"
                    >
                      {errorMessage}
                    </p>
                  )}
                </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step10({
  supervision,
  setSupervision,
  onDelete,
  errorRowId,
  errorMessage,
  onClearError,
}: {
  supervision: any[];
  setSupervision: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
  errorRowId?: string;
  errorMessage?: string;
  onClearError?: () => void;
}) {
  const errorRowRef = useRef<HTMLInputElement | null>(null);

  // Scroll the flagged supervision visit into view and focus its supervisor
  // input whenever a new validation error points at this step.
  useEffect(() => {
    if (errorRowId && errorRowRef.current) {
      errorRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRowRef.current.focus();
    }
  }, [errorRowId]);

  const upd = (i: number, patch: any) => {
    const next = [...supervision];
    next[i] = { ...next[i], ...patch };
    setSupervision(next);
    // Editing the flagged row clears the highlight.
    if (errorRowId && `sup-${i}` === errorRowId) onClearError?.();
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
  const remove = (i: number) => onDelete(i);
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
          {supervision.map((v, i) => {
            const isError = errorRowId != null && `sup-${i}` === errorRowId;
            return (
            <tr key={v.rowId} className={`border-b align-top ${isError ? "ring-1 ring-destructive" : ""}`}>
              <td className="p-1">
                <Select value={String(v.quarter)} onValueChange={(x) => upd(i, { quarter: Number(x) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (<SelectItem key={q} value={String(q)}>Q{q}</SelectItem>))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1"><Input type="date" value={v.scheduledDate} onChange={(e) => upd(i, { scheduledDate: e.target.value })} /></td>
              <td className="p-1">
                <Input
                  ref={isError ? errorRowRef : undefined}
                  className={isError ? "border-destructive ring-1 ring-destructive" : undefined}
                  value={v.supervisorName}
                  onChange={(e) => upd(i, { supervisorName: e.target.value })}
                />
                {isError && errorMessage && (
                  <p
                    className="mt-1 text-xs text-destructive"
                    data-testid="supervision-row-error"
                  >
                    {errorMessage}
                  </p>
                )}
              </td>
              <td className="p-1"><Input value={v.checklist} onChange={(e) => upd(i, { checklist: e.target.value })} /></td>
              <td className="p-1"><Textarea rows={2} value={v.followUp} onChange={(e) => upd(i, { followUp: e.target.value })} /></td>
              <td className="p-1">
                <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
            );
          })}
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

function SummaryCard({
  step,
  title,
  filled,
  onEdit,
  children,
}: {
  step: number;
  title: string;
  filled: boolean;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={`step-${step}`}
      className="rounded-md border bg-card"
      data-testid={`summary-card-${step}`}
    >
      <div className="flex items-center justify-between gap-2 pr-2">
        <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
          <span className="flex items-center gap-2 text-left">
            <Tick ok={filled} />
            <span className="text-sm font-medium">
              Step {step} · {title}
            </span>
            {filled ? (
              <Badge variant="outline" className="ml-2 text-xs">
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 border-amber-400 text-xs text-amber-700">
                Empty
              </Badge>
            )}
          </span>
        </AccordionTrigger>
        <Button
          size="sm"
          variant="ghost"
          className={filled ? undefined : "text-primary underline-offset-2 hover:underline"}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(step);
          }}
          data-testid={`button-edit-step-${step}`}
        >
          {filled ? (
            <>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </>
          )}
        </Button>
      </div>
      <AccordionContent className="px-3 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      Nothing entered yet.
    </div>
  );
}

function Step11({
  microplan,
  facilityLabel,
  coverage,
  communities,
  risk,
  calendar,
  staffing,
  vaccines,
  coldChain,
  mobilization,
  transport,
  budget,
  supervision,
  onEdit,
}: {
  microplan: Microplan | null;
  facilityLabel: string;
  coverage: any;
  communities: any[];
  risk: any[];
  calendar: any[];
  staffing: any[];
  vaccines: any[];
  coldChain: any;
  mobilization: any[];
  transport: any[];
  budget: any[];
  supervision: any[];
  onEdit: (step: number) => void;
}) {
  const status = microplan?.status ?? "draft";

  const dtp1 = parseFloat(coverage.dtp1 || "0");
  const dtp3 = parseFloat(coverage.dtp3 || "0");
  const mcv1 = parseFloat(coverage.mcv1 || "0");
  const dropDtp = dtp1 > 0 ? Math.round(((dtp1 - dtp3) / dtp1) * 100) : 0;
  const dropMcv = dtp1 > 0 ? Math.round(((dtp1 - mcv1) / dtp1) * 100) : 0;

  const filledStep1 =
    dtp1 > 0 ||
    parseFloat(coverage.dtp3 || "0") > 0 ||
    parseFloat(coverage.mcv1 || "0") > 0 ||
    parseFloat(coverage.mcv2 || "0") > 0;
  const filledStep2 = communities.length > 0;
  const filledStep3 =
    risk.length > 0 && risk.some((r) => r.missed || r.zeroDose || r.distance !== 3 || r.terrain !== 3 || r.season !== 3 || r.insecurity !== 1);
  const filledStep4 = calendar.length > 0;
  const filledStep5 =
    staffing.length > 0 && staffing.some((s) => s.vaccinator || s.recorder || s.supervisor);
  const filledStep6 = vaccines.some((v) => parseInt(v.target || "0", 10) > 0);
  const filledStep7 =
    mobilization.length > 0 &&
    mobilization.some((m) => m.focalPoint || (m.channels && m.channels.length > 0));
  const filledStep8 =
    transport.length > 0 &&
    transport.some(
      (t) => parseFloat(t.distanceKm || "0") > 0 || parseFloat(t.fuelLitres || "0") > 0 || t.vehicle,
    );
  const filledStep9 = budget.some((b) => b.description && b.description.trim());
  const filledStep10 = supervision.some((s) => s.supervisorName && s.supervisorName.trim());

  const monthsCovered = new Set(
    calendar.filter((c) => c.scheduledDate).map((c) => c.scheduledDate.slice(0, 7)),
  ).size;
  const sessionsByType = calendar.reduce<Record<string, number>>((acc, c) => {
    acc[c.sessionType] = (acc[c.sessionType] || 0) + 1;
    return acc;
  }, {});

  const budgetTotal = budget.reduce(
    (s, b) => s + parseFloat(b.unitCost || "0") * parseInt(b.quantity || "0", 10),
    0,
  );

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{facilityLabel}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Review every step below before submitting. Click <b>Edit</b> on any card to fix it — use the
          "Back to summary" button at the top of the step to return here.
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        <SummaryCard step={1} title="Coverage review" filled={filledStep1} onEdit={onEdit}>
          {filledStep1 ? (
            <div className="space-y-2 text-sm">
              <table className="w-full">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1">DTP1</th>
                    <th className="py-1">DTP3</th>
                    <th className="py-1">MCV1</th>
                    <th className="py-1">MCV2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">{coverage.dtp1 || "0"}%</td>
                    <td className="py-1">{coverage.dtp3 || "0"}%</td>
                    <td className="py-1">{coverage.mcv1 || "0"}%</td>
                    <td className="py-1">{coverage.mcv2 || "0"}%</td>
                  </tr>
                </tbody>
              </table>
              <div className="text-xs text-muted-foreground">
                Dropout DTP1→DTP3: <b>{dropDtp}%</b> · DTP1→MCV1: <b>{dropMcv}%</b>
              </div>
              <div className="text-xs text-muted-foreground">
                Stockouts: <b>{coverage.stockouts || "0"}</b> · AEFI: <b>{coverage.aefi || "0"}</b> ·
                Sessions planned/held: <b>{coverage.sessionsPlanned || "0"}</b>/
                <b>{coverage.sessionsHeld || "0"}</b>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={2} title="Catchment & communities" filled={filledStep2} onEdit={onEdit}>
          {filledStep2 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Name</th>
                    <th className="p-1">Type</th>
                    <th className="p-1">Target</th>
                    <th className="p-1">Source</th>
                    <th className="p-1">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {communities.map((c, i) => (
                    <tr key={c.rowId || i} className="border-b">
                      <td className="p-1">{c.name || <em className="text-muted-foreground">(unnamed)</em>}</td>
                      <td className="p-1">{c.type}</td>
                      <td className="p-1">{c.targetPopulation || "0"}</td>
                      <td className="p-1">{c.source}</td>
                      <td className="p-1">{c.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={3} title="Risk scoring" filled={filledStep3} onEdit={onEdit}>
          {risk.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Community</th>
                    <th className="p-1">Dist</th>
                    <th className="p-1">Terr</th>
                    <th className="p-1">Seas</th>
                    <th className="p-1">Insec</th>
                    <th className="p-1">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {risk.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.name}</td>
                      <td className="p-1">{r.distance}</td>
                      <td className="p-1">{r.terrain}</td>
                      <td className="p-1">{r.season}</td>
                      <td className="p-1">{r.insecurity}</td>
                      <td className="p-1">
                        {[r.missed && "missed", r.zeroDose && "zero-dose"].filter(Boolean).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={4} title="Session calendar" filled={filledStep4} onEdit={onEdit}>
          {filledStep4 ? (
            <div className="space-y-2 text-sm">
              <div className="text-xs text-muted-foreground">
                <b>{calendar.length}</b> sessions across <b>{monthsCovered}</b> months ·{" "}
                {Object.entries(sessionsByType)
                  .map(([t, n]) => `${t}: ${n}`)
                  .join(" · ")}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b bg-background text-left uppercase text-muted-foreground">
                    <tr>
                      <th className="p-1">Community</th>
                      <th className="p-1">Date</th>
                      <th className="p-1">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendar.map((c, i) => (
                      <tr key={c.rowId || i} className="border-b">
                        <td className="p-1">{c.name}</td>
                        <td className="p-1">{c.scheduledDate}</td>
                        <td className="p-1">{c.sessionType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={5} title="Staffing per session day" filled={filledStep5} onEdit={onEdit}>
          {staffing.length > 0 ? (
            <div className="max-h-48 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Session</th>
                    <th className="p-1">Vaccinator</th>
                    <th className="p-1">Recorder</th>
                    <th className="p-1">Supervisor</th>
                    <th className="p-1">Team</th>
                    <th className="p-1">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {staffing.map((s, i) => (
                    <tr key={s.rowId || i} className="border-b">
                      <td className="p-1">{s.sessionLabel}</td>
                      <td className="p-1">{s.vaccinator || "—"}</td>
                      <td className="p-1">{s.recorder || "—"}</td>
                      <td className="p-1">{s.supervisor || "—"}</td>
                      <td className="p-1">{s.teamType}</td>
                      <td className="p-1">{s.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={6} title="Vaccine forecasting" filled={filledStep6} onEdit={onEdit}>
          {filledStep6 ? (
            <div className="space-y-2 text-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-left uppercase text-muted-foreground">
                    <tr>
                      <th className="p-1">Antigen</th>
                      <th className="p-1">Target</th>
                      <th className="p-1">Doses</th>
                      <th className="p-1">Wastage %</th>
                      <th className="p-1">Vials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccines.map((v) => {
                      const tgt = parseInt(v.target || "0", 10);
                      const w = parseFloat(v.wastage || "0");
                      const total = Math.ceil(tgt * v.doses * (1 + w / 100));
                      const vials = Math.ceil(total / 10);
                      return (
                        <tr key={v.name} className="border-b">
                          <td className="p-1 font-medium">{v.name}</td>
                          <td className="p-1">{tgt}</td>
                          <td className="p-1">{total.toLocaleString()}</td>
                          <td className="p-1">{v.wastage}%</td>
                          <td className="p-1">{vials.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground">
                Cold chain — boxes: <b>{coldChain.coldBoxes}</b> · ice packs: <b>{coldChain.icePacks}</b> ·
                carriers/session: <b>{coldChain.carriers}</b>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={7} title="Social mobilization" filled={filledStep7} onEdit={onEdit}>
          {mobilization.length > 0 ? (
            <div className="max-h-48 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Session</th>
                    <th className="p-1">Channels</th>
                    <th className="p-1">Focal point</th>
                    <th className="p-1">Phone</th>
                    <th className="p-1">IEC</th>
                  </tr>
                </thead>
                <tbody>
                  {mobilization.map((m, i) => (
                    <tr key={m.rowId || i} className="border-b">
                      <td className="p-1">{m.sessionLabel}</td>
                      <td className="p-1">{(m.channels || []).join(", ") || "—"}</td>
                      <td className="p-1">{m.focalPoint || "—"}</td>
                      <td className="p-1">{m.focalPhone || "—"}</td>
                      <td className="p-1">{(m.iec || []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={8} title="Transport" filled={filledStep8} onEdit={onEdit}>
          {transport.length > 0 ? (
            <div className="max-h-48 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Session</th>
                    <th className="p-1">Mode</th>
                    <th className="p-1">Distance km</th>
                    <th className="p-1">Fuel L</th>
                    <th className="p-1">Vehicle</th>
                    <th className="p-1">Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {transport.map((t, i) => (
                    <tr key={t.rowId || i} className="border-b">
                      <td className="p-1">{t.sessionLabel}</td>
                      <td className="p-1">{t.mode}</td>
                      <td className="p-1">{t.distanceKm}</td>
                      <td className="p-1">{t.fuelLitres}</td>
                      <td className="p-1">{t.vehicle || "—"}</td>
                      <td className="p-1">{t.cleared ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={9} title="Budget" filled={filledStep9} onEdit={onEdit}>
          {filledStep9 ? (
            <div className="space-y-2 text-sm">
              <div className="text-xs text-muted-foreground">
                Grand total: <b>{budgetTotal.toLocaleString()}</b>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-left uppercase text-muted-foreground">
                    <tr>
                      <th className="p-1">Category</th>
                      <th className="p-1">Description</th>
                      <th className="p-1">Qty</th>
                      <th className="p-1">Unit</th>
                      <th className="p-1">Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.map((b, i) => (
                      <tr key={b.rowId || i} className="border-b">
                        <td className="p-1">{b.category}</td>
                        <td className="p-1">{b.description || "—"}</td>
                        <td className="p-1">{b.quantity}</td>
                        <td className="p-1">{b.unitCost}</td>
                        <td className="p-1">{b.fundingSource}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>

        <SummaryCard step={10} title="Supervision plan" filled={filledStep10} onEdit={onEdit}>
          {supervision.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-1">Qtr</th>
                    <th className="p-1">Date</th>
                    <th className="p-1">Supervisor</th>
                    <th className="p-1">Checklist</th>
                    <th className="p-1">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {supervision.map((v, i) => (
                    <tr key={v.rowId || i} className="border-b align-top">
                      <td className="p-1">Q{v.quarter}</td>
                      <td className="p-1">{v.scheduledDate}</td>
                      <td className="p-1">{v.supervisorName || "—"}</td>
                      <td className="p-1">{v.checklist}</td>
                      <td className="p-1">{v.followUp || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SummaryCard>
      </Accordion>

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

// Listing of saved microplans for the current planType, with a per-plan count
// of planned / completed sessions. Renders only when the wizard is in "list
// mode" (no microplanId selected). Clicking Open navigates to the path-param
// route so the wizard hydrates that plan.
function SavedMicroplansPanel({
  planType,
  onOpen,
}: {
  planType: "routine" | "campaign";
  onOpen: (id: number) => void;
}) {
  const { data: microplans } = useQuery<any[]>({
    queryKey: ["/api/microplans"],
  });
  const { data: sessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });
  const sessionsByPlan = useMemo(() => {
    const m = new Map<number, SessionPlan[]>();
    for (const s of sessions ?? []) {
      if (s.microplanId == null) continue;
      const arr = m.get(s.microplanId) ?? [];
      arr.push(s);
      m.set(s.microplanId, arr);
    }
    return m;
  }, [sessions]);

  // The DB column `plan_type` uses values like "facility_routine" /
  // "sia_campaign" while this page thinks in "routine" / "campaign". Map both.
  const filtered = (microplans ?? []).filter((m) => {
    const pt = String(m.planType ?? "");
    return planType === "campaign"
      ? pt.includes("campaign")
      : !pt.includes("campaign");
  });

  if (filtered.length === 0) return null;

  return (
    <div className="border-b bg-muted/20 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Saved microplans ({filtered.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Open one to see its planned sessions
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const rows = sessionsByPlan.get(m.id) ?? [];
          const completed = rows.filter(
            (s) => s.completedAt || (s as any).isAchieved,
          ).length;
          const planned = rows.length - completed;
          return (
            <div
              key={m.id}
              className="rounded-md border bg-background p-3 text-sm"
              data-testid={`saved-microplan-${m.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium" title={m.name}>
                    {m.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Q{m.quarter} {m.year}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpen(m.id)}
                  data-testid={`button-open-microplan-${m.id}`}
                >
                  Open
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {(() => {
                  const s = String(m.status ?? "draft").toLowerCase();
                  const label =
                    s === "pending"
                      ? "Pending approval"
                      : s === "approved"
                        ? "Approved"
                        : s === "locked"
                          ? "Locked"
                          : "Draft";
                  const variant: "default" | "secondary" | "outline" =
                    s === "approved" ? "default" : s === "pending" ? "secondary" : "outline";
                  return (
                    <Badge variant={variant} className="gap-1" data-testid={`microplan-status-${m.id}`}>
                      {label}
                    </Badge>
                  );
                })()}
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {planned} planned
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  {completed} done
                </Badge>
              </div>
            </div>
          );
        })}
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
