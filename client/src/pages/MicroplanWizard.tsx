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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePersistedBasemap } from "@/hooks/usePersistedBasemap";
import { canApproveSessionPlan } from "@/lib/permissions";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// ─── Page ─────────────────────────────────────────────────────────────────
export default function MicroplanWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [active, setActive] = useState(1);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [microplanId, setMicroplanId] = useState<number | null>(null);

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
      loadedExcludedFacilityRef.current = facilityId;
    }
  }, [facilityId]);

  // Hydrate excludedVillageIds from whichever source resolves first:
  //   1. the per-microplan hydration payload (preferred — already in flight)
  //   2. the dedicated /excluded-villages query for the facility
  //   3. legacy localStorage values (one-shot migration to the server)
  useEffect(() => {
    if (!facilityId) return;
    const fromHydration = hydration?.excludedVillageIds;
    const fromQuery = excludedFromServer?.villageIds;
    let serverIds: number[] | null = null;
    if (Array.isArray(fromHydration)) serverIds = fromHydration;
    else if (Array.isArray(fromQuery)) serverIds = fromQuery;
    if (serverIds === null) return;

    const next = new Set<number>(serverIds);
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
    setExcludedReady(true);
  }, [facilityId, hydration?.excludedVillageIds, excludedFromServer, excludedLoaded, legacyExcludedKey]);

  const persistExcluded = (next: Set<number>) => {
    if (!facilityId) return;
    const villageIds = Array.from(next);
    void apiRequest("PUT", `/api/facilities/${facilityId}/excluded-villages`, {
      villageIds,
    }).catch((e) => {
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

  async function performDeleteCommunity(index: number) {
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
      setExcludedVillageIds((prev) => {
        if (prev.has(row.villageId!)) return prev;
        const next = new Set<number>(prev);
        next.add(row.villageId!);
        persistExcluded(next);
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

  function deleteCommunity(index: number) {
    const row = communities[index];
    if (!row) return;
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
            }
          }
          if (failures.length > 0) {
            console.warn(`Population bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} population row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
          for (const r of resp.results ?? []) {
            if (!r.ok) failures.push(r.error || "unknown error");
          }
          if (failures.length > 0) {
            console.warn(`HTR bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} HTR row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              persisted[r.clientId] = r.id;
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            // Match the pre-existing per-row "skipped silently" behavior — the
            // wizard didn't fail the whole save when one row 4xx'd. We still
            // surface the count so the user knows something didn't land.
            console.warn(`Session bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} session row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
        // Step 5 stores staffing in component state only; the durable write
        // happens in step 8 along with transport, so each session_day_plan
        // row is created exactly once.
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
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextVaccines[idx] = { ...nextVaccines[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            console.warn(`Vaccine req bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} vaccine row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextMob[idx] = { ...nextMob[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            console.warn(`Mobilization bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} mobilization row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextBudget[idx] = { ...nextBudget[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            console.warn(`Budget bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} budget row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
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
          for (const r of resp.results ?? []) {
            if (r.ok && r.id != null && typeof r.clientId === "string") {
              const idx = indexByClientId.get(r.clientId);
              if (idx != null) nextSup[idx] = { ...nextSup[idx], id: r.id };
            } else if (!r.ok) {
              failures.push(r.error || "unknown error");
            }
          }
          if (failures.length > 0) {
            console.warn(`Supervision bulk save: ${failures.length} row(s) skipped:`, failures);
            toast({
              title: `${failures.length} supervision row(s) skipped`,
              description: failures[0],
              variant: "destructive",
            });
          }
        }
        setSupervision(nextSup);
        queryClient.invalidateQueries({ queryKey: ["/api/supervision-visits"] });
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
                  onDelete={deleteCommunity}
                  facility={facility}
                  excludedVillages={excludedFacilityVillages}
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
                  onDelete={deleteMobilizationRow}
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
                />
              )}
              {active === 10 && (
                <Step10
                  supervision={supervision}
                  setSupervision={setSupervision}
                  onDelete={deleteSupervisionRow}
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
  onDelete,
  facility,
  excludedVillages,
  onRestoreVillage,
}: {
  communities: any[];
  setCommunities: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
  facility: Facility | null;
  excludedVillages: Village[];
  onRestoreVillage: (v: Village) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const update = (i: number, patch: any) => {
    const next = [...communities];
    next[i] = { ...next[i], ...patch };
    setCommunities(next);
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
        <Button size="sm" variant="outline" onClick={() => add()} data-testid="button-add-community">
          <Plus className="mr-1 h-4 w-4" /> Add community
        </Button>
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
      />

      {excludedVillages.length > 0 && (
        <div
          className="rounded-md border border-dashed bg-muted/30 p-3"
          data-testid="section-previously-removed"
        >
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Previously removed ({excludedVillages.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {excludedVillages.map((v) => (
              <Button
                key={v.id}
                size="sm"
                variant="outline"
                onClick={() => onRestoreVillage(v)}
                data-testid={`button-restore-village-${v.id}`}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add back {v.name}
              </Button>
            ))}
          </div>
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
                    <Input
                      type="number"
                      value={c.targetPopulation}
                      onChange={(e) => update(i, { targetPopulation: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
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
}: {
  facility: Facility | null;
  communities: any[];
  selectedIdx: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onPinDrag: (i: number, lat: number, lng: number) => void;
  onPinClick: (i: number) => void;
}) {
  // Lazy-load Leaflet so the wizard's earlier steps don't pay the bundle cost.
  const [leaflet, setLeaflet] = useState<any>(null);
  const [showPopulation, setShowPopulation] = useState(false);
  const [populationUnavailable, setPopulationUnavailable] = useState(false);
  const [infoMode, setInfoMode] = useState(false);
  const [infoPopup, setInfoPopup] = useState<
    | { lat: number; lng: number; status: "loading" | "ok" | "nodata" | "error"; value?: number; message?: string }
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

  const { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, useMap } = leaflet.rl;

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
      return { status: "ok" as const, value: num };
    } catch (err: any) {
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
              ? "Population layer unavailable offline."
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
              ? "Population layer unavailable offline."
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
      {showPopulation && !populationUnavailable && (
        <div className="absolute bottom-2 right-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow">
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
  onDelete,
}: {
  mobilization: any[];
  setMobilization: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
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
            <th className="p-2"></th>
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
          ))}
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
}: {
  budget: any[];
  setBudget: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
}) {
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

function Step10({
  supervision,
  setSupervision,
  onDelete,
}: {
  supervision: any[];
  setSupervision: (v: any[]) => void;
  onDelete: (index: number) => void | Promise<void>;
}) {
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
