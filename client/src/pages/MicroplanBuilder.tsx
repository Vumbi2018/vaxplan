import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { offlineDb } from "../lib/offlineDb";
import { AddCommunityDialog } from "@/components/AddCommunityDialog";
import RedRedQGuidedWorkflow from "@/components/RedRedQGuidedWorkflow";
import {
  Sparkles,
  Users,
  AlertTriangle,
  Calendar,
  ClipboardList,
  Syringe,
  Megaphone,
  Wallet,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Building,
  MapPin,
  Clock,
  Car,
  Footprints,
  Ship,
  Plane,
  Coins,
  Thermometer,
  Map,
} from "lucide-react";
import type {
  SessionPlan,
  Facility,
  Village,
  VaccineConfig,
  BudgetItem,
  MobilizationActivity,
  Tenant,
  Microplan,
} from "@shared/schema";

type StaffingRow = {
  role: string;
  headcount: number;
  days: number;
  perDiem: number;
};

const STAFFING_ROLES = [
  "Vaccinator",
  "Mobilizer",
  "Supervisor",
  "Driver",
  "Recorder",
];

const FUNDING_SOURCES: Array<{ value: string; label: string }> = [
  { value: "government", label: "Government" },
  { value: "gavi", label: "Gavi" },
  { value: "who", label: "WHO" },
  { value: "unicef", label: "UNICEF" },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Unspecified" },
];

const transportIcons: Record<string, typeof Car> = {
  walking: Footprints,
  road: Car,
  boat: Ship,
  air: Plane,
};

interface MicroplanBuilderProps {
  /**
   * Pre-selects the wizard plan type when the user enters via a route that
   * already declares the intent (e.g. /microplans/routine vs /microplans/campaigns).
   * When provided, the routine/campaign toggle in Step 3 is locked.
   */
  prePlanType?: "routine" | "campaign";
}

export default function MicroplanBuilder({ prePlanType }: MicroplanBuilderProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // Resume-editing: deep-link routes /microplans/routine/:id and
  // /microplans/campaigns/:id load that microplan straight into the wizard.
  const [routineMatch, routineParams] = useRoute<{ id: string }>("/microplans/routine/:id");
  const [campaignMatch, campaignParams] = useRoute<{ id: string }>("/microplans/campaigns/:id");
  const resumeMicroplanId = routineMatch
    ? routineParams?.id
    : campaignMatch
    ? campaignParams?.id
    : null;
  const [activeStep, setActiveStep] = useState(1);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);

  // Honor ?facilityId=<id> query parameter so the "Plan a new session here"
  // CTA on the live map can deep-link a HCW straight into a pre-targeted
  // wizard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fid = params.get("facilityId");
    if (fid) {
      const parsed = Number(fid);
      if (!Number.isNaN(parsed)) setSelectedFacilityId(parsed);
    }
  }, []);

  // WHO RED + Gavi RED-Q 12-step microplanning workflow.
  // Steps 1–8 reuse the existing wizard panels (renamed to fit the framework);
  // steps 9–12 are new lightweight panels added at the end of the wizard so the
  // builder fully covers the RED-Q canonical elements (Workforce, Supervision,
  // Catchment snapshot, Execution & monitoring).
  const stepTitles: Record<number, string> = {
    1: "Situation Analysis & Targets",
    2: "Hard-to-Reach & Equity",
    3: "Service Delivery & Session Calendar",
    4: "Logistics & Transport Itinerary",
    5: "Vaccine, Supplies & Cold-Chain",
    6: "Demand & Social Mobilization",
    7: "Budget with Funding Source",
    8: "Review & Approval Cascade",
    9: "Workforce & Teaming Roster",
    10: "Supportive Supervision Plan",
    11: "Catchment & Population Snapshot",
    12: "Execution, Monitoring & Quarterly Review",
  };
  const TOTAL_STEPS = 12;

  // Active Microplan Session being constructed
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, { wastageFactor?: number; vials?: number }>>({});

  // STEP 1 Form States (Facility Target Demographics)
  const [demographics, setDemographics] = useState({
    annualBirths: "3.2",
    under1: "3.0",
    pregnant: "3.2",
  });

  // STEP 2 States (HTR Risk Profiling Sliders)
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);
  const [htrWeights, setHtrWeights] = useState({
    distance: 40,
    terrain: 30,
    seasonal: 30,
  });

  // STEP 3 States (Session creation)
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<"static" | "outreach" | "mobile">("outreach");
  const [transportMode, setTransportMode] = useState("road");
  const [targetPop, setTargetPop] = useState("120");
  const [planType, setPlanType] = useState<"routine" | "campaign">(prePlanType ?? "routine");

  // Lock planType when caller pre-selected it via the route.
  useEffect(() => {
    if (prePlanType) setPlanType(prePlanType);
  }, [prePlanType]);
  const [campaignAntigen, setCampaignAntigen] = useState("Polio");
  const [campaignTargetAge, setCampaignTargetAge] = useState("0-59 months");
  const [campaignScope, setCampaignScope] = useState("National");
  const [teamType, setTeamType] = useState("house_to_house");

  // STEP 4 States (Day Schedules)
  const [dayNumber, setDayNumber] = useState(1);
  const [dayDate, setDayDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [visitedVillages, setVisitedVillages] = useState<number[]>([]);
  const [dayDistance, setDayDistance] = useState("15");
  const [dayFuel, setDayFuel] = useState("5");
  
  // Detailed SIA Campaign daily logistics states
  const [teamCount, setTeamCount] = useState("1");
  const [vaccinatorsCount, setVaccinatorsCount] = useState("1");
  const [volunteersCount, setVolunteersCount] = useState("1");
  const [recordersCount, setRecordersCount] = useState("0");
  const [supervisorsCount, setSupervisorsCount] = useState("0");
  const [indelibleMarkers, setIndelibleMarkers] = useState("0");
  const [coldBoxes, setColdBoxes] = useState("0");
  const [dayCarriers, setDayCarriers] = useState("1");
  const [dayIcePacks, setDayIcePacks] = useState("4");

  // Step 2 Form States for Insecurity & Comments
  const [insecurityLevel, setInsecurityLevel] = useState("1");
  const [comments, setComments] = useState("");

  // Add Community Dialog State
  const [isAddCommunityOpen, setIsAddCommunityOpen] = useState(false);

  // Validate that the planned date is at least 7 days ahead
  const isDateValid = useMemo(() => {
    if (!dayDate) return false;
    const selected = new Date(dayDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [dayDate]);

  // STEP 6 States (Mobilization)
  const [mobType, setMobType] = useState("public_announcement");
  const [mobTargetGroup, setMobTargetGroup] = useState("General Public");
  const [mobDate, setMobDate] = useState(new Date().toISOString().split("T")[0]);

  // STEP 7 States (Direct Costing)
  const [budgetItemCat, setBudgetItemCat] = useState("Transport");
  const [budgetItemDesc, setBudgetItemDesc] = useState("");
  const [budgetItemUnitCost, setBudgetItemUnitCost] = useState("150");
  const [budgetItemQty, setBudgetItemQty] = useState(1);

  // Load Queries
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: sessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: villages, refetch: refetchVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: vaccineConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
  });

  const { data: dayPlans, refetch: refetchDays } = useQuery<any[]>({
    queryKey: [`/api/sessions/${activeSessionId}/days`],
    enabled: !!activeSessionId,
  });

  const { data: mobilizations, refetch: refetchMobs } = useQuery<MobilizationActivity[]>({
    queryKey: ["/api/mobilization"],
  });

  const { data: budgetItems, refetch: refetchBudgets } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget-items"],
  });

  const { data: activeTenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: microplans, refetch: refetchMicroplans } = useQuery<Microplan[]>({
    queryKey: ["/api/microplans"],
  });

  // Automatically bind selected facility to user context
  useEffect(() => {
    if (user?.facilityId) {
      setSelectedFacilityId(user.facilityId);
    } else if (facilities && facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [user, facilities]);

  // Load and pre-populate HTR values for selected village catchments
  useEffect(() => {
    if (selectedVillageId && villages) {
      const v = villages.find((x) => x.id === selectedVillageId);
      if (v) {
        setHtrWeights({
          distance: v.distanceToFacility ? Math.min(100, Math.round(parseFloat(v.distanceToFacility.toString()) * 5)) : 40,
          terrain: v.terrainDifficulty ? v.terrainDifficulty * 20 : 20,
          seasonal: v.seasonalAccessibility === "poor" ? 90 : v.seasonalAccessibility === "seasonal" ? 60 : 20,
        });
        setInsecurityLevel(v.insecurityLevel ? String(v.insecurityLevel) : "1");
        setComments(v.comments || "");
      }
    }
  }, [selectedVillageId, villages]);

  // Resolve Facility details
  const activeFacility = useMemo(() => {
    if (!facilities || !selectedFacilityId) return null;
    return facilities.find((f) => f.id === selectedFacilityId) || null;
  }, [facilities, selectedFacilityId]);

  // Filter villages assigned to this facility
  const facilityVillages = useMemo(() => {
    if (!villages || !selectedFacilityId) return [];
    return villages.filter((v) => Number(v.assignedFacilityId) === Number(selectedFacilityId));
  }, [villages, selectedFacilityId]);

  // Filter sessions matching active builder selection
  const facilitySessions = useMemo(() => {
    if (!sessions || !selectedFacilityId) return [];
    return sessions.filter((s) => s.facilityId === selectedFacilityId);
  }, [sessions, selectedFacilityId]);

  const activeSession = useMemo(() => {
    if (!facilitySessions || !activeSessionId) return null;
    return facilitySessions.find((s) => s.id === activeSessionId) || null;
  }, [facilitySessions, activeSessionId]);

  useEffect(() => {
    if (activeSession && activeSession.vaccineAdjustments) {
      setLocalAdjustments(activeSession.vaccineAdjustments as Record<string, { wastageFactor?: number; vials?: number }> || {});
    } else {
      setLocalAdjustments({});
    }
  }, [activeSession, activeStep]);

  // Pre-populate session form fields reactively when an active session is loaded
  useEffect(() => {
    if (activeSession) {
      setSessionName(activeSession.name);
      setSessionType(activeSession.sessionType as any || "outreach");
      setTransportMode(activeSession.transportMode || "road");
      setTargetPop(String(activeSession.targetPopulation || 120));
      setSelectedFacilityId(activeSession.facilityId);
      setPlanType((activeSession as any).planType as any || "routine");
      setCampaignAntigen((activeSession as any).campaignAntigen || "Polio");
      setCampaignTargetAge((activeSession as any).campaignTargetAge || "0-59 months");
      setCampaignScope((activeSession as any).campaignScope || "National");
      setTeamType((activeSession as any).teamType || "house_to_house");
    }
  }, [activeSession]);

  // Dynamic Doses forecasting for vaccines based on targeted populations
  const vaccineForecast = useMemo(() => {
    const forecast: Array<{
      name: string;
      doses: number;
      vials: number;
      config: VaccineConfig;
      customWastage?: number;
      customVials?: number;
      targetPopulation: number;
    }> = [];
    if (!vaccineConfigs || !activeSession) return forecast;
    
    const pop = activeSession.targetPopulation || 100;
    
    const defaultDemographics = {
      births: 0.032,
      under1: 0.030,
      pregnant: 0.032,
      schoolEntry: 0.027,
    };
    const settings = (activeTenant?.settings || {}) as Record<string, any>;
    const demographics = (settings.demographics || defaultDemographics) as typeof defaultDemographics;
    
    vaccineConfigs.forEach((config) => {
      if (config.isActive) {
        const configId = config.id.toString();
        const adj = localAdjustments[configId] || {};
        
        let antigenTargetPop = pop;
        if (config.targetGroup === "births") {
          antigenTargetPop = Math.round(pop * (demographics.births / demographics.under1));
        } else if (config.targetGroup === "pregnant") {
          antigenTargetPop = Math.round(pop * (demographics.pregnant / demographics.under1));
        } else if (config.targetGroup === "schoolEntry") {
          antigenTargetPop = Math.round(pop * (demographics.schoolEntry / demographics.under1));
        }
        
        const wastage = adj.wastageFactor !== undefined ? adj.wastageFactor : parseFloat(config.wastageFactor);
        const doses = Math.ceil(antigenTargetPop * wastage);
        const vials = adj.vials !== undefined ? adj.vials : Math.ceil(doses / (config.vialsPerDose || 10));
        forecast.push({
          name: config.name,
          doses,
          vials,
          config,
          customWastage: adj.wastageFactor,
          customVials: adj.vials,
          targetPopulation: antigenTargetPop,
        });
      }
    });
    return forecast;
  }, [vaccineConfigs, activeSession, localAdjustments, activeTenant]);

  const antigenSummaries = useMemo(() => {
    const groups: Record<string, { name: string; items: string[]; doses: number; vials: number }> = {
      BCG: { name: "BCG", items: [], doses: 0, vials: 0 },
      OPV: { name: "OPV", items: [], doses: 0, vials: 0 },
      Penta: { name: "Penta", items: [], doses: 0, vials: 0 },
      PCV: { name: "PCV", items: [], doses: 0, vials: 0 },
      IPV: { name: "IPV", items: [], doses: 0, vials: 0 },
      Rota: { name: "Rota", items: [], doses: 0, vials: 0 },
      MR: { name: "MR", items: [], doses: 0, vials: 0 },
    };

    vaccineForecast.forEach((vax) => {
      const nameUpper = vax.name.toUpperCase();
      let matched = false;
      for (const key of Object.keys(groups)) {
        if (nameUpper.includes(key)) {
          groups[key].items.push(vax.name);
          groups[key].doses += vax.doses;
          groups[key].vials += vax.vials;
          matched = true;
          break;
        }
      }
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  }, [vaccineForecast]);

  const auditGaps = useMemo(() => {
    const gaps: string[] = [];
    if (!dayPlans || dayPlans.length === 0) {
      gaps.push("No scheduled day itineraries. A microplan requires at least one active day itinerary.");
    }
    const budgets = budgetItems?.filter(b => b.sessionId === activeSessionId) || [];
    if (budgets.length === 0) {
      gaps.push("No operational budget costing rows. Operational expenses must be detailed.");
    } else {
      const categories = budgets.map(b => b.category.toLowerCase());
      const hasPersonnel = categories.some(c => c.includes("personnel") || c.includes("allowance") || c.includes("diem"));
      const hasTransport = categories.some(c => c.includes("transport") || c.includes("fuel") || c.includes("car") || c.includes("boat") || c.includes("travel"));
      const hasSupplies = categories.some(c => c.includes("supplies") || c.includes("epi") || c.includes("supp") || c.includes("material"));
      
      if (!hasPersonnel) gaps.push("Missing 'Personnel Allowance' or per diem allocations.");
      if (!hasTransport) gaps.push("Missing 'Transport' or fuel funding lines.");
      if (!hasSupplies) gaps.push("Missing medical 'Supplies' or mobilization print expenses.");
    }
    return gaps;
  }, [dayPlans, budgetItems, activeSessionId]);

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      // Sessions must belong to a parent microplan. Find an open one for this
      // (facility, year, quarter, planType); if none exists, create one. The server
      // hard-rejects client-supplied planType/campaign* — those are inherited from
      // the parent microplan, so strip them before posting the session.
      const desiredMicroplanType = data.planType === "campaign" ? "sia_campaign" : "facility_routine";
      const allPlans = await apiRequest<any[]>("GET", "/api/microplans");
      let parent = (Array.isArray(allPlans) ? allPlans : []).find(
        (p) =>
          p.facilityId === data.facilityId &&
          p.year === data.year &&
          p.quarter === data.quarter &&
          p.planType === desiredMicroplanType &&
          p.status !== "locked",
      );
      if (!parent) {
        parent = await apiRequest<any>("POST", "/api/microplans", {
          facilityId: data.facilityId,
          name: `Q${data.quarter} ${data.year} ${desiredMicroplanType === "sia_campaign" ? "SIA" : "Routine"} microplan`,
          year: data.year,
          quarter: data.quarter,
          planType: desiredMicroplanType,
          status: "draft",
          campaignAntigen: data.campaignAntigen ?? null,
          campaignTargetAge: data.campaignTargetAge ?? null,
          campaignScope: data.campaignScope ?? null,
        });
      }
      const { planType, campaignAntigen, campaignTargetAge, campaignScope, ...sessionPayload } = data;
      return apiRequest<any>("POST", "/api/sessions", { ...sessionPayload, microplanId: parent.id });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setActiveSessionId(res.id);
      toast({
        title: "Session Drafted Successfully",
        description: `"${res.name}" has been registered in the microplan workflow.`,
      });
      setActiveStep(4); // Advance to day schedules
    },
    onError: (err: any) => {
      toast({
        title: "Drafting Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addDayMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/sessions/${activeSessionId}/days`, data),
    onSuccess: () => {
      refetchDays();
      setDayNumber((d) => d + 1);
      setVisitedVillages([]);
      toast({
        title: "Day Schedule Saved",
        description: "Itinerary day successfully logged to active session plan.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Add Itinerary",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addMobMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/mobilization", data),
    onSuccess: () => {
      refetchMobs();
      setMobTargetGroup("General Public");
      toast({
        title: "Mobilization Activity Added",
        description: "Outreach engagement task scheduled successfully.",
      });
    },
  });

  const addBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const totalCost = (parseFloat(data.unitCost) * data.quantity).toString();
      return apiRequest("POST", "/api/budget-items", { ...data, totalCost });
    },
    onSuccess: () => {
      refetchBudgets();
      setBudgetItemDesc("");
      toast({
        title: "Budget Item Allocated",
        description: "Direct costing successfully tied to active session plan.",
      });
    },
  });

  const saveHtrMutation = useMutation({
    mutationFn: async ({ id, villageData, htrData }: { id: number; villageData: any; htrData: any }) => {
      await apiRequest("PATCH", `/api/villages/${id}`, villageData);
      await apiRequest("POST", "/api/htr-scores", htrData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/htr-scores"] });
      toast({
        title: "Risk Profile Pushed",
        description: "Georeferenced HTR and Insecurity parameters saved successfully.",
      });
      setSelectedVillageId(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Save",
        description: err.message || "Failed to save risk profile.",
        variant: "destructive",
      });
    },
  });

  const adjustForecastMutation = useMutation({
    mutationFn: async (adjustments: Record<string, { wastageFactor?: number; vials?: number }>) => {
      return apiRequest("PATCH", `/api/sessions/${activeSessionId}`, {
        vaccineAdjustments: adjustments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Logistics Adjusted",
        description: "Custom wastage factors and vial counts saved successfully.",
      });
    },
  });

  const [draftRows, setDraftRows] = useState<Array<{
    tempId: string;
    category: string;
    description: string;
    unitCost: string;
    quantity: number;
    fundingSource: string;
    fundingSourceOther?: string;
  }>>([]);

  // ── Staffing roster (microplan element 6) ──────────────────────────────
  const activeMicroplan = useMemo(() => {
    if (!microplans) return null;
    if (activeSession?.microplanId) {
      return microplans.find((m) => m.id === activeSession.microplanId) || null;
    }
    if (!selectedFacilityId) return null;
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    const y = new Date().getFullYear();
    return (
      microplans.find(
        (m) =>
          m.facilityId === selectedFacilityId &&
          m.quarter === q &&
          m.year === y &&
          m.status !== "locked",
      ) || null
    );
  }, [microplans, activeSession, selectedFacilityId]);

  const [staffingRows, setStaffingRows] = useState<StaffingRow[]>([]);
  useEffect(() => {
    const raw = activeMicroplan?.staffing as any;
    const seed: StaffingRow[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.roster)
      ? raw.roster
      : [];
    setStaffingRows(
      seed.length > 0
        ? seed
        : STAFFING_ROLES.map((role) => ({ role, headcount: 0, days: 0, perDiem: 0 })),
    );
  }, [activeMicroplan]);

  const staffingTotal = useMemo(
    () =>
      staffingRows.reduce(
        (sum, r) => sum + (r.headcount || 0) * (r.days || 0) * (r.perDiem || 0),
        0,
      ),
    [staffingRows],
  );

  const saveStaffingMutation = useMutation({
    mutationFn: async () => {
      if (!activeMicroplan) throw new Error("No active microplan to attach staffing to.");
      // Envelope-preserving write: if the existing staffing column has already
      // been promoted to a { roster, __supervision } envelope (Step 10), keep
      // the supervision sidecar intact. For legacy array shape we just write
      // the array back to avoid disturbing a working format.
      const existing = activeMicroplan.staffing as any;
      const payload =
        existing && !Array.isArray(existing) && (existing.__supervision || existing.roster !== undefined)
          ? { ...existing, roster: staffingRows }
          : staffingRows;
      return apiRequest("PATCH", `/api/microplans/${activeMicroplan.id}`, {
        staffing: payload,
      });
    },
    onSuccess: () => {
      refetchMicroplans();
      toast({ title: "Staffing saved", description: "Roster updated on the microplan." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save staffing", description: err.message, variant: "destructive" });
    },
  });

  const syncStaffingToBudget = async () => {
    if (!activeSessionId || !selectedFacilityId) {
      toast({
        title: "Select a session first",
        description: "Draft or open a session plan before syncing staffing to budget.",
        variant: "destructive",
      });
      return;
    }
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    const y = new Date().getFullYear();
    let added = 0;
    for (const row of staffingRows) {
      const total = (row.headcount || 0) * (row.days || 0);
      if (total <= 0 || !row.perDiem) continue;
      await apiRequest("POST", "/api/budget-items", {
        facilityId: selectedFacilityId,
        sessionId: activeSessionId,
        category: "Per Diem",
        description: `${row.role} per-diem (${row.headcount} × ${row.days}d)`,
        unitCost: String(row.perDiem),
        quantity: total,
        totalCost: String(total * row.perDiem),
        quarter: q,
        year: y,
        approvalStatus: "draft",
        fundingSource: "unspecified",
      });
      added++;
    }
    await refetchBudgets();
    toast({
      title: added > 0 ? "Staffing pushed to budget" : "Nothing to push",
      description:
        added > 0
          ? `${added} Per Diem line(s) added. Classify funding source on the Budget Planning page.`
          : "Set headcount, days, and per-diem on at least one role first.",
    });
  };

  useEffect(() => {
    if (activeStep === 7 && activeSessionId && budgetItems) {
      const existing = budgetItems.filter(b => b.sessionId === activeSessionId);
      if (existing.length === 0 && draftRows.length === 0) {
        setDraftRows([
          { tempId: "p", category: "Personnel", description: "Team allowances & per diems", unitCost: "150", quantity: 2, fundingSource: "unspecified" },
          { tempId: "t", category: "Transport", description: "Fuel & vehicle hire", unitCost: "200", quantity: 1, fundingSource: "unspecified" },
          { tempId: "s", category: "Supplies", description: "Cotton, disposal boxes, printing", unitCost: "50", quantity: 1, fundingSource: "unspecified" },
        ]);
      }
    }
  }, [activeStep, activeSessionId, budgetItems]);

  const handleSaveDraftRow = (tempId: string) => {
    const draft = draftRows.find(r => r.tempId === tempId);
    if (!draft) return;
    if (!draft.category.trim() || !draft.description.trim()) {
      toast({ title: "Validation Error", description: "Please fill in both Category and Description.", variant: "destructive" });
      return;
    }
    if (draft.fundingSource === "other" && !(draft.fundingSourceOther ?? "").trim()) {
      toast({
        title: "Specify funding source",
        description: "Enter a funding source name when 'Other' is selected.",
        variant: "destructive",
      });
      return;
    }
    addBudgetMutation.mutate({
      facilityId: selectedFacilityId,
      sessionId: activeSessionId,
      category: draft.category,
      description: draft.description,
      unitCost: draft.unitCost,
      quantity: draft.quantity,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      approvalStatus: "draft",
      fundingSource: draft.fundingSource || "unspecified",
      fundingSourceOther: draft.fundingSource === "other" ? draft.fundingSourceOther || null : null,
    }, {
      onSuccess: () => {
        setDraftRows(prev => prev.filter(r => r.tempId !== tempId));
      }
    });
  };

  const handleDeleteDraftRow = (tempId: string) => {
    setDraftRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const [editingItems, setEditingItems] = useState<Record<number, {
    category: string;
    description: string;
    unitCost: string;
    quantity: number;
  }>>({});

  const overallTotal = useMemo(() => {
    const savedSum = (budgetItems || [])
      .filter((b) => b.sessionId === activeSessionId)
      .reduce((sum, item) => {
        const edited = editingItems[item.id];
        const cost = edited 
          ? parseFloat(edited.unitCost || "0") * (edited.quantity || 0)
          : parseFloat(item.totalCost || "0");
        return sum + cost;
      }, 0);

    const draftSum = draftRows.reduce((sum, item) => {
      const cost = parseFloat(item.unitCost || "0") * (item.quantity || 0);
      return sum + cost;
    }, 0);

    return savedSum + draftSum;
  }, [budgetItems, activeSessionId, editingItems, draftRows]);

  const handleExistingRowChange = (id: number, field: string, value: any) => {
    const item = budgetItems?.find(b => b.id === id);
    if (!item) return;
    const current = editingItems[id] || {
      category: item.category,
      description: item.description,
      unitCost: item.unitCost.toString(),
      quantity: item.quantity
    };
    setEditingItems({
      ...editingItems,
      [id]: {
        ...current,
        [field]: value
      }
    });
  };

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BudgetItem> }) => {
      const totalCost = (parseFloat(data.unitCost || "0") * (data.quantity || 0)).toString();
      return apiRequest("PATCH", `/api/budget-items/${id}`, { ...data, totalCost });
    },
    onSuccess: () => {
      refetchBudgets();
      toast({
        title: "Budget Updated",
        description: "Direct costing item updated successfully.",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/budget-items/${id}`);
    },
    onSuccess: () => {
      refetchBudgets();
      toast({
        title: "Budget Item Deleted",
        description: "Direct costing item removed successfully.",
      });
    },
  });

  const handleSaveExistingRow = (id: number) => {
    const edited = editingItems[id];
    if (!edited) return;
    updateBudgetMutation.mutate({
      id,
      data: {
        category: edited.category,
        description: edited.description,
        unitCost: edited.unitCost,
        quantity: edited.quantity
      }
    }, {
      onSuccess: () => {
        const newEditing = { ...editingItems };
        delete newEditing[id];
        setEditingItems(newEditing);
      }
    });
  };

  const updateApprovalStatusMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: number; status: string; comments?: string }) => {
      return apiRequest("PATCH", `/api/sessions/${id}`, {
        approvalStatus: status,
        notes: comments || undefined,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: `Plan ${res.approvalStatus === "approved" ? "Approved" : res.approvalStatus === "rejected" ? "Returned to Draft" : "Submitted"}`,
        description: `Microplan status updated successfully.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Workflow Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: async () => {
      // Submit BOTH the active session and (if present) its parent microplan
      // for review so the approvals workflow sees a single coherent package.
      const sessionRes = await apiRequest("PATCH", `/api/sessions/${activeSessionId}`, {
        approvalStatus: "pending",
      });
      if (activeMicroplan?.id) {
        try {
          // The microplans table tracks lifecycle on its `status` column
          // (draft / pending / approved / locked). There is no separate
          // approvalStatus or submittedAt column today, so we only bump status.
          await apiRequest("PATCH", `/api/microplans/${activeMicroplan.id}`, {
            status: "pending",
          });
        } catch {
          // Parent microplan PATCH is best-effort — the session itself is the
          // authoritative approval record for downstream workflows.
        }
      }
      return sessionRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      toast({
        title: "Microplan Submitted",
        description: "Your vaccination microplan is queued for review. Redirecting to Approvals…",
      });
      setActiveStep(1);
      setActiveSessionId(null);
      setSessionName("");
      setIsBuilding(false);
      setLocation("/approvals");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Microplan Deleted",
        description: "The microplanning session has been permanently removed.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    },
  });

  // Quick Action Triggers
  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      toast({ title: "Name Required", description: "Provide a microplan session name.", variant: "destructive" });
      return;
    }
    createSessionMutation.mutate({
      name: sessionName,
      sessionType,
      transportMode,
      targetPopulation: parseInt(targetPop) || 100,
      facilityId: selectedFacilityId,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      status: "planned",
      approvalStatus: "draft",
      planType,
      campaignAntigen: planType === "campaign" ? campaignAntigen : null,
      campaignTargetAge: planType === "campaign" ? campaignTargetAge : null,
      campaignScope: planType === "campaign" ? campaignScope : null,
      teamType: planType === "campaign" ? teamType : null,
    });
  };

  const handleAddDay = () => {
    if (visitedVillages.length === 0) {
      toast({ title: "Communities Required", description: "Check at least one village visited.", variant: "destructive" });
      return;
    }

    // Dynamic calculations
    const vaccinesRequired: Record<string, number> = {};
    if (vaccineConfigs) {
      vaccineConfigs.forEach((config) => {
        if (config.isActive) {
          vaccinesRequired[config.id.toString()] = Math.ceil(
            (parseInt(targetPop) / 5) * parseFloat(config.wastageFactor)
          );
        }
      });
    }

    addDayMutation.mutate({
      dayNumber,
      sessionDate: new Date(dayDate).toISOString(),
      communitiesVisited: visitedVillages,
      targetPopulation: Math.ceil(parseInt(targetPop) / 4),
      vitaminADoses: 20,
      dewormingDoses: 15,
      vaccineCarriers: parseInt(dayCarriers) || 1,
      icePacks: parseInt(dayIcePacks) || 4,
      distanceKm: dayDistance,
      transportType: transportMode,
      fuelLiters: dayFuel,
      vaccinesRequired,
      teamCount: planType === "campaign" ? parseInt(teamCount) || 1 : 1,
      vaccinatorsCount: planType === "campaign" ? parseInt(vaccinatorsCount) || 1 : 1,
      volunteersCount: planType === "campaign" ? parseInt(volunteersCount) || 1 : 1,
      recordersCount: planType === "campaign" ? parseInt(recordersCount) || 0 : 0,
      supervisorsCount: planType === "campaign" ? parseInt(supervisorsCount) || 0 : 0,
      indelibleMarkers: planType === "campaign" ? parseInt(indelibleMarkers) || 0 : 0,
      coldBoxes: planType === "campaign" ? parseInt(coldBoxes) || 0 : 0,
    });
  };

  const handleAddMobilization = () => {
    addMobMutation.mutate({
      facilityId: selectedFacilityId,
      activityType: mobType,
      targetGroup: mobTargetGroup,
      plannedDate: new Date(mobDate).toISOString(),
      status: "planned",
    });
  };

  const handleAddBudget = () => {
    if (!budgetItemDesc.trim()) {
      toast({ title: "Description Required", description: "Provide budget line details.", variant: "destructive" });
      return;
    }
    addBudgetMutation.mutate({
      facilityId: selectedFacilityId,
      sessionId: activeSessionId,
      category: budgetItemCat,
      description: budgetItemDesc,
      unitCost: budgetItemUnitCost,
      quantity: budgetItemQty,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      approvalStatus: "draft",
    });
  };

  // Lightweight per-step validation gating the wizard's Next button.
  // Returns { ok:true } when the user may advance, otherwise a human-readable
  // reason for the toast.
  const validateStep = (step: number): { ok: boolean; reason?: string } => {
    switch (step) {
      case 1:
        if (!selectedFacilityId) return { ok: false, reason: "Pick a facility before continuing." };
        return { ok: true };
      case 3:
        if (!activeSessionId) return { ok: false, reason: "Draft the session first so it has an ID to attach plans to." };
        if (!sessionName.trim()) return { ok: false, reason: "Give the session a name." };
        return { ok: true };
      case 4:
        if (!activeSessionId) return { ok: false, reason: "Create a session before adding itinerary days." };
        return { ok: true };
      case 7:
        if (!activeSessionId) return { ok: false, reason: "Create a session before adding budget lines." };
        return { ok: true };
      default:
        return { ok: true };
    }
  };

  // Auto-save hook called by the Next button. Today the wizard already
  // persists fields eagerly per panel via dedicated mutations, so this is a
  // toast-level confirmation; future per-step PATCH calls can hook in here.
  const autoSaveCurrentStep = () => {
    if (activeSessionId) {
      // Touching the session refreshes its updatedAt so reviewers see progress.
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    }
  };

  // Resume-edit hydration: when the route includes a :id, find that microplan
  // and jump straight into the builder seeded to its first session.
  useEffect(() => {
    if (!resumeMicroplanId || !microplans || !sessions) return;
    const mp = microplans.find((m) => String(m.id) === String(resumeMicroplanId));
    if (!mp) return;
    if (mp.facilityId && !selectedFacilityId) setSelectedFacilityId(mp.facilityId);
    // Bind only sessions that are explicitly children of THIS microplan.
    // Falling back to "first session for the same facility" risks attaching
    // the wizard to an unrelated session and writing approval actions to the
    // wrong record, so we leave activeSessionId null and let the user pick.
    const owned = sessions.find((s) => (s as any).microplanId === mp.id);
    if (owned) setActiveSessionId(owned.id);
    setIsBuilding(true);
  }, [resumeMicroplanId, microplans, sessions]);

  const steps = [
    { num: 1, title: "Situation Analysis & Targets", desc: "Coverage review & NSO denominators", icon: Users },
    { num: 2, title: "Hard-to-Reach & Equity", desc: "Remote & under-served risk factors", icon: AlertTriangle },
    { num: 3, title: "Service Delivery & Session Calendar", desc: "Static / Outreach / Mobile scope", icon: Calendar },
    { num: 4, title: "Logistics & Transport Itinerary", desc: "Day schedule matrix & routing", icon: ClipboardList },
    { num: 5, title: "Vaccine, Supplies & Cold-Chain", desc: "Antigen & cold chain forecasts", icon: Syringe },
    { num: 6, title: "Demand & Social Mobilization", desc: "Community messaging & activities", icon: Megaphone },
    { num: 7, title: "Budget with Funding Source", desc: "Direct session expenses & funder split", icon: Wallet },
    { num: 8, title: "Review & Approval Cascade", desc: "Verification & submit for approval", icon: CheckCircle },
    { num: 9, title: "Workforce & Teaming Roster", desc: "Staff roster & team composition", icon: Users },
    { num: 10, title: "Supportive Supervision Plan", desc: "Supervisor visits & checklist", icon: ClipboardList },
    { num: 11, title: "Catchment & Population Snapshot", desc: "Catchment map & population summary", icon: Map },
    { num: 12, title: "Execution, Monitoring & Quarterly Review", desc: "Day-plan execution & coverage tracking", icon: CheckCircle },
  ];

  if (!isBuilding) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto font-sans bg-slate-50/50 dark:bg-slate-900/10 min-h-[90vh]">
        {/* WHO RED + Gavi RED-Q guided workflow (12 steps) */}
        <RedRedQGuidedWorkflow />

        {/* Developed Microplans Dashboard Listing */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/40">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">EPI Developed Microplans</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Select an immunization campaign itinerary draft to continue building, or track submitted approval status.
            </p>
          </div>
          <Button
            onClick={() => {
              setActiveSessionId(null);
              setSessionName("");
              setSessionType("outreach");
              setTransportMode("road");
              setTargetPop("120");
              setSelectedVillageId(null);
              setVisitedVillages([]);
              setDemographics({ annualBirths: "3.2", under1: "3.0", pregnant: "3.2" });
              setIsBuilding(true);
              setActiveStep(1);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold px-4 py-2 shadow-md shadow-indigo-600/10"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Microplan
          </Button>
        </div>

        {/* List of Developed Session Plans */}
        <div className="space-y-4">
          {!sessions || sessions.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-border/60 p-12 text-center shadow-xs">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-foreground">No Microplans Created Yet</h3>
                  <p className="text-xs text-muted-foreground">
                    Draft your health facility catchments, antigen logs, and outreach budget lines using our high-fidelity wizard.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setActiveSessionId(null);
                    setSessionName("");
                    setSessionType("outreach");
                    setTransportMode("road");
                    setTargetPop("120");
                    setSelectedVillageId(null);
                    setVisitedVillages([]);
                    setDemographics({ annualBirths: "3.2", under1: "3.0", pregnant: "3.2" });
                    setIsBuilding(true);
                    setActiveStep(1);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold px-6"
                >
                  Create Your First Microplan
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {sessions.map((plan) => {
                const fac = (facilities ?? []).find(f => f.id === plan.facilityId);
                
                return (
                  <Card key={plan.id} className="rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-background">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <CardTitle className="text-sm font-extrabold text-foreground leading-tight">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                            Q{plan.quarter} {plan.year} · {plan.sessionType} session
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={plan.approvalStatus === "approved" ? "default" : plan.approvalStatus === "pending" ? "secondary" : "outline"} 
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-current/10"
                        >
                          {plan.approvalStatus === "approved" ? "Approved" : plan.approvalStatus === "pending" ? "Pending Incharge" : "Draft"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-y-2 text-[11px] text-muted-foreground">
                        <div>Facility Scope</div>
                        <div className="text-right font-bold text-foreground truncate">{fac?.name || `#${plan.facilityId}`}</div>
                        <div>Target Pop.</div>
                        <div className="text-right font-bold text-foreground font-mono">{plan.targetPopulation || "-"} Children</div>
                        <div>Status</div>
                        <div className="text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            plan.status === "conducted" 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : plan.status === "scheduled" 
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" 
                                : "bg-slate-500/10 text-slate-500"
                          }`}>
                            {plan.status || "Planned"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border/40">
                        <Button
                          onClick={() => {
                            setActiveSessionId(plan.id);
                            setIsBuilding(true);
                            setActiveStep(1);
                          }}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-xl text-xs font-bold h-9 gap-1"
                        >
                          Continue / Edit
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveSessionId(plan.id);
                            setIsBuilding(true);
                            setActiveStep(8);
                          }}
                          variant="outline"
                          className="h-9 px-3 rounded-xl text-xs font-bold"
                        >
                          Review & Certify
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this microplanning session? This action is irreversible.")) {
                              deleteSessionMutation.mutate(plan.id);
                            }
                          }}
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-lg mx-auto font-sans bg-slate-50/50 dark:bg-slate-900/10 min-h-[90vh]">
      
      {/* Mobile-Friendly Stepper HUD */}
      <div className="bg-background/95 dark:bg-slate-900/90 border border-border/80 backdrop-blur rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 sticky top-1 z-40">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setIsBuilding(false);
              setActiveSessionId(null);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-indigo-600 mr-1"
            title="Back to developed microplans list"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none">Microplanning Studio</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wide">
              Step {activeStep} of {TOTAL_STEPS}: {steps[activeStep - 1].title}
            </p>
          </div>
        </div>
        <div className="w-24 text-right">
          <span className="text-[10px] font-extrabold font-mono text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
            {Math.round((activeStep / TOTAL_STEPS) * 100)}% Done
          </span>
        </div>
      </div>

      <Progress value={(activeStep / TOTAL_STEPS) * 100} className="h-1 bg-indigo-600/10" />

      {/* STEP CONTAINER */}
      <div className="animate-in fade-in duration-300">
        
        {/* STEP 1: TARGET POPULATION & DENOMINATORS */}
        {activeStep === 1 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Step 1: Set Target Ratios
              </CardTitle>
              <CardDescription className="text-xs">
                WHO RED/REC alignment starts by setting annual catchment target multipliers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Target Facility</Label>
                <div className="p-3 bg-muted/40 border rounded-xl text-xs space-y-1">
                  <p className="font-bold text-foreground">{activeFacility?.name || "No Facility Pinned"}</p>
                  <p className="text-[10px] text-muted-foreground">Catchment Wards: {facilityVillages.length} Villages Registered</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="annual-births" className="text-xs">Annual Births (%)</Label>
                  <Input
                    id="annual-births"
                    value={demographics.annualBirths}
                    onChange={(e) => setDemographics({ ...demographics, annualBirths: e.target.value })}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="under-1" className="text-xs">Infants &lt;1 yr (%)</Label>
                  <Input
                    id="under-1"
                    value={demographics.under1}
                    onChange={(e) => setDemographics({ ...demographics, under1: e.target.value })}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-2">
                * These multipliers will scale the raw population counts of assigned villages to calculate vaccine quotas for child and maternal outreach.
              </p>
              <Button onClick={() => {
                toast({ title: "Ratios Seeded Locally", description: "Ratios successfully cached for this drafting session." });
                setActiveStep(2);
              }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10">
                Proceed to HTR Profiling
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: HARD TO REACH RISK PROFILING */}
        {activeStep === 2 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-indigo-600" />
                Step 2: Risk Profiling (HTR)
              </CardTitle>
              <CardDescription className="text-xs">
                Assess risk metrics for catchment villages to identify session priority levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Select Village Community</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-indigo-600 hover:text-indigo-500 font-bold px-1.5 flex items-center gap-0.5"
                    onClick={() => setIsAddCommunityOpen(true)}
                  >
                    <Plus className="h-3 w-3" /> Add Community
                  </Button>
                </div>
                <Select
                  value={selectedVillageId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedVillageId(parseInt(v))}
                >
                  <SelectTrigger className="bg-background rounded-xl text-xs">
                    <SelectValue placeholder="Pick village to profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityVillages.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.name} {v.isHardToReach ? "⚠️ HTR" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVillageId ? (
                <div className="space-y-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4 mt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between border-b pb-2 mb-2 border-indigo-500/10">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">Risk Weightings</span>
                    <Badge variant="outline" className="text-[10px] border-indigo-500/30">Composite Priority</Badge>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>Geographic Distance</span>
                        <span className="font-mono">{htrWeights.distance}km</span>
                      </div>
                      <Slider
                        defaultValue={[htrWeights.distance]}
                        max={100}
                        step={5}
                        onValueChange={(val) => setHtrWeights({ ...htrWeights, distance: val[0] })}
                        className="accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>Terrain Risk Level</span>
                        <span className="font-mono">{(htrWeights.terrain / 20).toFixed(0)} / 5</span>
                      </div>
                      <Slider
                        defaultValue={[htrWeights.terrain]}
                        max={100}
                        step={20}
                        onValueChange={(val) => setHtrWeights({ ...htrWeights, terrain: val[0] })}
                        className="accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span>Seasonal Flood Isolation</span>
                        <span className="font-mono">{(htrWeights.seasonal / 20).toFixed(0)} / 5</span>
                      </div>
                      <Slider
                        defaultValue={[htrWeights.seasonal]}
                        max={100}
                        step={20}
                        onValueChange={(val) => setHtrWeights({ ...htrWeights, seasonal: val[0] })}
                        className="accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Security / Insecurity Level</Label>
                      <Select value={insecurityLevel} onValueChange={setInsecurityLevel}>
                        <SelectTrigger className="bg-background rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1: Secure / Safe</SelectItem>
                          <SelectItem value="2">2: Minor concerns</SelectItem>
                          <SelectItem value="3">3: Moderate</SelectItem>
                          <SelectItem value="4">4: Severe risk</SelectItem>
                          <SelectItem value="5">5: Critical / Dangerous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="htr-comments" className="text-xs font-semibold text-muted-foreground uppercase">Local Remarks / Context Comments</Label>
                      <Textarea
                        id="htr-comments"
                        placeholder="Describe active conflicts, security escorts needed, flood zones..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="bg-background rounded-xl text-xs min-h-[60px]"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!selectedVillageId) return;
                      const selectedVillage = villages?.find(v => v.id === selectedVillageId);
                      if (!selectedVillage) return;

                      const dScore = htrWeights.distance;
                      const tScore = htrWeights.terrain;
                      const sScore = htrWeights.seasonal;
                      const iScore = parseInt(insecurityLevel) * 20;

                      const totalWeight = 100;
                      const compositeScore = Math.round((dScore * 40 + tScore * 30 + sScore * 30) / 100);
                      const interventionPriority = compositeScore >= 70 ? "high" : compositeScore >= 40 ? "medium" : "low";

                      saveHtrMutation.mutate({
                        id: selectedVillageId,
                        villageData: {
                          distanceToFacility: (dScore / 5).toFixed(1),
                          travelTimeMinutes: 30,
                          terrainDifficulty: Math.round(tScore / 20),
                          seasonalAccessibility: sScore === 90 ? "poor" : sScore === 60 ? "seasonal" : "good",
                          insecurityLevel: parseInt(insecurityLevel),
                          comments: comments.trim() || null,
                        },
                        htrData: {
                          villageId: selectedVillageId,
                          distanceScore: dScore,
                          terrainScore: tScore,
                          seasonalScore: sScore,
                          coverageScore: 50,
                          insecurityScore: iScore,
                          compositeScore,
                          interventionPriority,
                          comments: comments.trim() || null,
                        }
                      });
                    }}
                    disabled={saveHtrMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold h-9 mt-2 disabled:opacity-50"
                  >
                    {saveHtrMutation.isPending ? "Saving..." : "Save Village Risk Profile"}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                  Select a village from the dropdown above to profile its geographic and accessibility risk indicators.
                </div>
              )}

              <Button onClick={() => setActiveStep(3)} className="w-full bg-secondary hover:bg-muted text-secondary-foreground rounded-xl text-xs font-bold h-10 shadow-xs mt-3 flex items-center justify-center gap-1">
                <span>Continue to Session Drafting</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DRAFT SESSIONS */}
        {activeStep === 3 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Step 3: Draft Session Plan
              </CardTitle>
              <CardDescription className="text-xs">
                Draft a new vaccination session and georeferenced catchment village targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5">
              
              <div className="space-y-1">
                <Label htmlFor="sess-name" className="text-xs">Microplan Name *</Label>
                <Input
                  id="sess-name"
                  placeholder="e.g. Q1 Outreach - Riverside camps"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="bg-background rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Microplan Strategy Type</Label>
                  <Select
                    value={planType}
                    onValueChange={(v: any) => setPlanType(v)}
                    disabled={!!prePlanType}
                  >
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine Immunization (RI)</SelectItem>
                      <SelectItem value="campaign">Supplementary SIA / Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                  {prePlanType && (
                    <p className="text-[10px] text-muted-foreground">
                      Strategy locked by entry route.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sess-pop" className="text-xs">Targeted Population</Label>
                  <Input
                    id="sess-pop"
                    type="number"
                    value={targetPop}
                    onChange={(e) => setTargetPop(e.target.value)}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {planType === "campaign" && (
                <div className="border border-indigo-500/20 bg-indigo-500/5 p-4 rounded-2xl space-y-3">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> SIA Campaign Specification
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="camp-antigen" className="text-xs">Antigen</Label>
                      <Input
                        id="camp-antigen"
                        placeholder="e.g. Polio (mOPV2), Measles"
                        value={campaignAntigen}
                        onChange={(e) => setCampaignAntigen(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-target-age" className="text-xs">Target Age Cohort</Label>
                      <Input
                        id="camp-target-age"
                        placeholder="e.g. 0-59 months, 9-59 months"
                        value={campaignTargetAge}
                        onChange={(e) => setCampaignTargetAge(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Campaign Scope</Label>
                      <Select value={campaignScope} onValueChange={setCampaignScope}>
                        <SelectTrigger className="bg-background rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="National">National Campaign</SelectItem>
                          <SelectItem value="Sub-National">Sub-National / High Risk</SelectItem>
                          <SelectItem value="Local">Local Outbreak Response</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SIA Team Strategy</Label>
                      <Select value={teamType} onValueChange={setTeamType}>
                        <SelectTrigger className="bg-background rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="house_to_house">House-to-House (H2H)</SelectItem>
                          <SelectItem value="fixed_transit">Fixed & Transit Teams</SelectItem>
                          <SelectItem value="mobile">Mobile Teams</SelectItem>
                          <SelectItem value="mixed">Mixed Strategy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Session Type</Label>
                  <Select value={sessionType} onValueChange={(v: any) => setSessionType(v)}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static Clinic</SelectItem>
                      <SelectItem value="outreach">Outreach Camp</SelectItem>
                      <SelectItem value="mobile">Mobile Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Transport Mode</Label>
                  <Select value={transportMode} onValueChange={setTransportMode}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Road (Vehicle/Bike)</SelectItem>
                      <SelectItem value="walking">Walking / Foot</SelectItem>
                      <SelectItem value="boat">Boat / Riverine</SelectItem>
                      <SelectItem value="air">Air (Flight)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-10 mt-3 shadow-md shadow-indigo-600/10"
              >
                {createSessionMutation.isPending ? "Creating..." : "Save Session & Add Days"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: ITINERARY DAYS */}
        {activeStep === 4 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                Step 4: Itinerary Day Schedules
              </CardTitle>
              <CardDescription className="text-xs">
                Build a day-by-day team path, visiting scheduled villages and mapping distances.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5">
              
              <div className="p-3 bg-indigo-600/5 border border-indigo-600/20 rounded-xl text-xs space-y-0.5 mb-2">
                <p className="font-bold text-indigo-600">Active Microplan Draft</p>
                <p className="font-semibold text-foreground">{activeSession?.name || "Draft Session"}</p>
                <p className="text-[10px] text-muted-foreground">Quarterly Target: {activeSession?.targetPopulation} children</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="day-num" className="text-xs">Itinerary Day Number</Label>
                  <Input
                    id="day-num"
                    type="number"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="day-date" className="text-xs">Session Date</Label>
                  <Input
                    id="day-date"
                    type="date"
                    value={dayDate}
                    onChange={(e) => setDayDate(e.target.value)}
                    className={`bg-background rounded-xl text-xs font-semibold ${!isDateValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {!isDateValid && (
                    <p className="text-[10px] font-semibold text-red-500 mt-1">
                      ⚠️ Session date must be at least 7 days ahead.
                    </p>
                  )}
                </div>
              </div>

              {/* Village checkboxes */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-indigo-500 block">Check Visited Wards/Villages</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-indigo-600 hover:text-indigo-500 font-bold px-1.5 flex items-center gap-0.5"
                    onClick={() => setIsAddCommunityOpen(true)}
                  >
                    <Plus className="h-3 w-3" /> Add Community
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 border rounded-xl p-3 max-h-[140px] overflow-y-auto bg-muted/20">
                  {facilityVillages.map((village) => {
                    const checked = visitedVillages.includes(village.id);
                    return (
                      <div
                        key={village.id}
                        onClick={() => {
                          if (checked) {
                            setVisitedVillages(visitedVillages.filter((id) => id !== village.id));
                          } else {
                            setVisitedVillages([...visitedVillages, village.id]);
                          }
                        }}
                        className={`flex items-center gap-1.5 p-1.5 border rounded-lg cursor-pointer text-xs select-none transition-all ${
                          checked
                            ? "bg-indigo-600/10 border-indigo-600 text-indigo-600 font-semibold"
                            : "hover:bg-muted bg-background/50"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-muted-foreground"
                        }`}>
                          {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{village.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="day-dist" className="text-xs">Distance (km)</Label>
                  <Input
                    id="day-dist"
                    value={dayDistance}
                    onChange={(e) => setDayDistance(e.target.value)}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="day-fuel" className="text-xs">Fuel Needed (L)</Label>
                  <Input
                    id="day-fuel"
                    value={dayFuel}
                    onChange={(e) => setDayFuel(e.target.value)}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {activeSession?.planType === "campaign" && (
                <div className="border border-indigo-500/20 bg-indigo-500/5 p-4 rounded-2xl space-y-3 mt-2">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> SIA Campaign Team & Supplies Allocation
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="camp-team-count" className="text-[10px]">No. of Teams</Label>
                      <Input
                        id="camp-team-count"
                        type="number"
                        value={teamCount}
                        onChange={(e) => setTeamCount(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-vaccinators" className="text-[10px]">Vaccinators</Label>
                      <Input
                        id="camp-vaccinators"
                        type="number"
                        value={vaccinatorsCount}
                        onChange={(e) => setVaccinatorsCount(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-volunteers" className="text-[10px]">Volunteers</Label>
                      <Input
                        id="camp-volunteers"
                        type="number"
                        value={volunteersCount}
                        onChange={(e) => setVolunteersCount(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="camp-recorders" className="text-[10px]">Recorders</Label>
                      <Input
                        id="camp-recorders"
                        type="number"
                        value={recordersCount}
                        onChange={(e) => setRecordersCount(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-supervisors" className="text-[10px]">Supervisors</Label>
                      <Input
                        id="camp-supervisors"
                        type="number"
                        value={supervisorsCount}
                        onChange={(e) => setSupervisorsCount(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-markers" className="text-[10px]">Indelible Markers</Label>
                      <Input
                        id="camp-markers"
                        type="number"
                        value={indelibleMarkers}
                        onChange={(e) => setIndelibleMarkers(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="camp-carriers" className="text-[10px]">Vaccine Carriers</Label>
                      <Input
                        id="camp-carriers"
                        type="number"
                        value={dayCarriers}
                        onChange={(e) => setDayCarriers(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-icepacks" className="text-[10px]">Water/Ice Packs</Label>
                      <Input
                        id="camp-icepacks"
                        type="number"
                        value={dayIcePacks}
                        onChange={(e) => setDayIcePacks(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="camp-coldboxes" className="text-[10px]">Cold Boxes</Label>
                      <Input
                        id="camp-coldboxes"
                        type="number"
                        value={coldBoxes}
                        onChange={(e) => setColdBoxes(e.target.value)}
                        className="bg-background rounded-xl text-xs font-semibold h-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddDay}
                  disabled={addDayMutation.isPending || !isDateValid}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-10 shadow-xs disabled:opacity-50"
                >
                  Save Day Schedule
                </Button>
                {dayPlans && dayPlans.length > 0 && (
                  <Button
                    onClick={() => setActiveStep(5)}
                    className="bg-secondary hover:bg-muted text-secondary-foreground rounded-xl text-xs font-bold h-10 px-4"
                  >
                    Next Step
                  </Button>
                )}
              </div>

              {dayPlans && dayPlans.length > 0 && (
                <div className="border-t pt-3 mt-1 space-y-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logged Day Schedules:</h4>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {dayPlans.map((d: any) => (
                      <div key={d.id} className="flex flex-col gap-1 p-2 rounded-lg bg-muted/40 text-xs border border-border/20">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Day {d.dayNumber} ({new Date(d.sessionDate).toLocaleDateString()})</span>
                          <span className="text-[10px] text-muted-foreground">{d.distanceKm} km · {d.fuelLiters}L Fuel</span>
                        </div>
                        {activeSession?.planType === "campaign" && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-500/10 text-indigo-600 bg-indigo-500/5">
                              Teams: {d.teamCount ?? 1}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/10 text-emerald-600 bg-emerald-500/5">
                              Vaccinators: {d.vaccinatorsCount ?? 1}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/10 text-amber-600 bg-amber-500/5">
                              Volunteers: {d.volunteersCount ?? 1}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/10 text-purple-600 bg-purple-500/5">
                              Markers: {d.indelibleMarkers ?? 0}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/10 text-rose-600 bg-rose-500/5">
                              Cold Boxes: {d.coldBoxes ?? 0}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5: VACCINE CALCULATORS */}
        {activeStep === 5 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Syringe className="h-5 w-5 text-indigo-600 animate-pulse" />
                Step 5: Vaccine Logistics Forecasting
              </CardTitle>
              <CardDescription className="text-xs">
                Review and forecast logistical requirements, including antigen packages, injection devices, cold chain support, and operational PPE.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              
              <Tabs defaultValue="vaccines" className="space-y-4">
                <TabsList className="grid grid-cols-4 bg-muted/40 p-1 rounded-2xl border border-border/20 max-w-md">
                  <TabsTrigger value="vaccines" className="text-xs font-bold rounded-xl py-2 flex items-center gap-1">
                    <Syringe className="h-3.5 w-3.5" /> Antigens
                  </TabsTrigger>
                  <TabsTrigger value="devices" className="text-xs font-bold rounded-xl py-2 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Devices
                  </TabsTrigger>
                  <TabsTrigger value="coldchain" className="text-xs font-bold rounded-xl py-2 flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5" /> Cold Chain
                  </TabsTrigger>
                  <TabsTrigger value="ppe" className="text-xs font-bold rounded-xl py-2 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> PPE
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: VACCINES & DILUENTS */}
                <TabsContent value="vaccines" className="space-y-4 outline-none">
                  {/* Dynamic summaries matrix */}
                  {antigenSummaries.length > 0 && (
                    <div className="p-3 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl space-y-2">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Antigen Group Summaries</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {antigenSummaries.map((grp) => (
                          <div key={grp.name} className="p-2 rounded-xl bg-background border border-border/30 text-xs">
                            <span className="font-extrabold text-indigo-600 block">{grp.name} Group</span>
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">Doses: {grp.doses}</span>
                            <span className="text-[10px] text-muted-foreground font-mono block">Vials: {grp.vials}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Supply Chain Wastage Optimizer Panel */}
                  {(() => {
                    const criticalInsights: Array<{
                      antigen: string;
                      wastageRate: number;
                      wastageFactor: number;
                      severity: "high" | "moderate" | "optimized";
                      recommendation: string;
                    }> = [];

                    vaccineForecast.forEach((vax) => {
                      const configId = vax.config.id.toString();
                      const adj = localAdjustments[configId] || {};
                      const liveWastageFactor = adj.wastageFactor !== undefined ? adj.wastageFactor : parseFloat(vax.config.wastageFactor);
                      
                      // Derive active wastage rate: wastageRate = 1 - (1 / wastageFactor)
                      const rate = (1 - (1 / liveWastageFactor)) * 100;
                      
                      let severity: "high" | "moderate" | "optimized" = "optimized";
                      let recommendation = "";

                      if (vax.name.toUpperCase().includes("BCG")) {
                        if (rate > 50) {
                          severity = "high";
                          recommendation = `Critical BCG wastage of ${rate.toFixed(1)}% detected (Wastage Factor ${liveWastageFactor.toFixed(2)}). Recommend grouping infant cohorts into designated "BCG Days" (e.g. alternate Wednesdays) rather than opening 20-dose vials ad-hoc.`;
                        } else if (rate > 30) {
                          severity = "moderate";
                          recommendation = `Moderate BCG wastage (${rate.toFixed(1)}%). Consider coordinating with local community mobilizers to ensure a minimum of 10 infants are present before opening a reconstituted BCG vial.`;
                        }
                      } else if (vax.name.toUpperCase().includes("PENTA")) {
                        if (rate > 25) {
                          severity = "high";
                          recommendation = `High Pentavalent wastage of ${rate.toFixed(1)}% detected. Check open-vial policy adherence. If session sizes are consistently under 5 children, consider requesting 5-dose vials from the district store.`;
                        } else if (rate > 15) {
                          severity = "moderate";
                          recommendation = `Penta wastage is ${rate.toFixed(1)}%. Maintain strict cold chain monitoring and review session scheduling to consolidate outreach attendance.`;
                        }
                      } else if (vax.name.toUpperCase().includes("MR") || vax.name.toUpperCase().includes("MEASLES")) {
                        if (rate > 35) {
                          severity = "high";
                          recommendation = `High Measles-Rubella wastage of ${rate.toFixed(1)}% detected. Reconstituted MR vials must be discarded after 6 hours. Cluster 9-month and 18-month measles doses into single-day sessions.`;
                        }
                      }

                      if (severity !== "optimized") {
                        criticalInsights.push({
                          antigen: vax.name,
                          wastageRate: rate,
                          wastageFactor: liveWastageFactor,
                          severity,
                          recommendation,
                        });
                      }
                    });

                    if (criticalInsights.length === 0) return null;

                    return (
                      <div className="relative overflow-hidden bg-radial from-slate-900/10 via-slate-900/5 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent border border-emerald-500/30 dark:border-emerald-500/20 backdrop-blur-xl rounded-2xl p-4 shadow-lg animate-in fade-in duration-300 no-print">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-5 rounded bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                            <AlertTriangle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            AI Supply Chain Advisory
                          </span>
                        </div>
                        <div className="space-y-3">
                          {criticalInsights.map((insight, idx) => (
                            <div key={idx} className="bg-background/60 dark:bg-slate-900/40 border border-border/30 rounded-xl p-3 text-xs space-y-1.5 transition-all hover:bg-background/80">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-foreground">{insight.antigen} Utilization</span>
                                <Badge className={insight.severity === "high" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px]" : "bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px]"}>
                                  {insight.severity === "high" ? "Critical Wastage" : "Elevated Wastage"}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {insight.recommendation}
                              </p>
                              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/80 mt-1">
                                <span>Derived Wastage Rate: <strong className="text-rose-500">{insight.wastageRate.toFixed(1)}%</strong></span>
                                <span>Multiplier: <strong>{insight.wastageFactor.toFixed(2)}x</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500">Antigen Requirements</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {vaccineForecast.map((vax) => {
                        const configId = vax.config.id.toString();
                        const adj = localAdjustments[configId] || {};
                        const liveWastage = adj.wastageFactor !== undefined ? adj.wastageFactor : parseFloat(vax.config.wastageFactor);
                        const calculatedDoses = Math.ceil(vax.targetPopulation * liveWastage);
                        const defaultVials = Math.ceil(calculatedDoses / (vax.config.vialsPerDose || 10));

                        return (
                          <div key={vax.name} className="p-3 rounded-xl bg-muted/50 text-xs border border-border/30 space-y-2.5">
                            <div className="flex justify-between items-center border-b pb-1.5 border-border/20">
                              <div>
                                <p className="font-bold text-foreground text-sm leading-none">{vax.name}</p>
                                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1 block">
                                  Target: {vax.targetPopulation} ({vax.config.targetGroup})
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[9px]">Antigen Forecast</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Wastage Factor</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={parseFloat(vax.config.wastageFactor).toFixed(2)}
                                  value={adj.wastageFactor !== undefined ? adj.wastageFactor : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                    setLocalAdjustments({
                                      ...localAdjustments,
                                      [configId]: { ...adj, wastageFactor: val },
                                    });
                                  }}
                                  className="bg-background rounded-xl text-xs font-semibold h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Vials Needed</Label>
                                <Input
                                  type="number"
                                  placeholder={String(defaultVials)}
                                  value={adj.vials !== undefined ? adj.vials : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                    setLocalAdjustments({
                                      ...localAdjustments,
                                      [configId]: { ...adj, vials: val },
                                    });
                                  }}
                                  className="bg-background rounded-xl text-xs font-semibold h-8"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground pt-1 px-1">
                              <span>Calculated: <strong className="font-mono text-foreground">{vax.doses} doses</strong></span>
                              <span>Override Vials: <strong className="font-mono text-indigo-600">{vax.vials} vials</strong></span>
                            </div>
                          </div>
                        );
                      })}
                      {vaccineForecast.length === 0 && (
                        <p className="text-center py-4 text-xs text-muted-foreground italic">No vaccine configurations found.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: INJECTION DEVICES */}
                <TabsContent value="devices" className="space-y-4 outline-none">
                  {(() => {
                    const vax05 = vaccineForecast.filter(v => v.name.includes("BCG") || v.name.includes("Penta") || v.name.includes("PCV"));
                    const doses05 = vax05.reduce((sum, v) => sum + v.doses, 0);
                    const syringes05 = Math.ceil(doses05 * 1.10);

                    const vax01 = vaccineForecast.filter(v => v.name.includes("IPV"));
                    const doses01 = vax01.reduce((sum, v) => sum + v.doses, 0);
                    const syringes01 = Math.ceil(doses01 * 1.10);

                    const reconVax = vaccineForecast.filter(v => v.name.includes("BCG") || v.name.includes("MR"));
                    const reconVials = reconVax.reduce((sum, v) => sum + v.vials, 0);
                    const reconSyringes5ml = Math.ceil(reconVials * 1.10);

                    const totalSyringes = syringes05 + syringes01 + reconSyringes5ml;
                    const safetyBoxes = Math.ceil(totalSyringes / 100);

                    return (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500">Injection Syringes & Disposal safety</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">0.5ml AD Syringes</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For BCG, Penta, & PCV doses (includes 10% wastage buffer).</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{syringes05} Syringes</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">0.1ml AD Syringes</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For IPV intradermal doses (includes 10% wastage buffer).</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{syringes01} Syringes</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">5.0ml Reconstitution Syringes</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">1 syringe per vial for lyophilized BCG/MR.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{reconSyringes5ml} Syringes</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Safety Waste Boxes</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For secure incinerator disposal of 100 AD syringes.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-emerald-600 block mt-2">{safetyBoxes} Boxes</span>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* TAB 3: COLD CHAIN */}
                <TabsContent value="coldchain" className="space-y-4 outline-none">
                  {(() => {
                    const totalVials = vaccineForecast.reduce((sum, v) => sum + v.vials, 0);
                    const carriers = Math.max(1, Math.ceil(totalVials / 20));
                    const icePacks = carriers * 4;

                    const totalDist = dayPlans ? dayPlans.reduce((sum, d) => sum + parseFloat(d.distanceKm || "0"), 0) : 0;
                    const totalFuel = dayPlans ? dayPlans.reduce((sum, d) => sum + parseFloat(d.fuelLiters || "0"), 0) : 0;

                    return (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500">Cold Chain & Transport Logistics</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Vaccine Carriers Needed</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">To maintain +2°C to +8°C cold chain context.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{carriers} Carriers</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Conditioned Ice Packs</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">4 ice packs per carrier, conditioned to 0°C.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{icePacks} Ice Packs</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Itinerary Fuel Allowance</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">Sum of fuel allocations planned across days.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-emerald-600 block mt-2">{totalFuel} Liters</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Overall Session Distance</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">Total georeferenced travel distance planned.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-emerald-600 block mt-2">{totalDist} Kilometers</span>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* TAB 4: PPE & OPERATIONS */}
                <TabsContent value="ppe" className="space-y-4 outline-none">
                  {(() => {
                    const days = dayPlans?.length || 1;
                    const totalSyringes = vaccineForecast.reduce((sum, v) => sum + v.doses, 0);
                    const masks = days * 4;
                    const wasteBags = Math.max(1, Math.ceil(totalSyringes / 200));
                    const tallySheets = days * 2;
                    const booklets = activeSession?.targetPopulation || 100;

                    return (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500">PPE, Printing & Communication Supplies</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Face Protective Masks</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For session clinicians (allowance of 4 per scheduled day).</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{masks} Masks</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Hazardous Waste Bags</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For cotton, swabs, and non-sharp bio-waste.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-indigo-600 block mt-2">{wasteBags} Bags</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">EPI Tally Sheets & Registers</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">Session reporting printouts (includes spares).</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-emerald-600 block mt-2">{tallySheets} Tally Sheets</span>
                          </Card>
                          <Card className="p-3.5 bg-muted/40 border border-border/30 text-xs flex flex-col justify-between h-28 rounded-2xl">
                            <div>
                              <span className="font-bold text-foreground block">Immunization Cards & Booklets</span>
                              <span className="text-[10px] text-muted-foreground block leading-relaxed mt-1">For births/infants registered during clinic visits.</span>
                            </div>
                            <span className="font-mono font-extrabold text-base text-emerald-600 block mt-2">{booklets} Booklets</span>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-5 border-t mt-5">
                <Button 
                  onClick={() => adjustForecastMutation.mutate(localAdjustments)} 
                  disabled={adjustForecastMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-10 shadow-xs"
                >
                  {adjustForecastMutation.isPending ? "Saving..." : "Save Logistics Overrides"}
                </Button>
                <Button onClick={() => setActiveStep(6)} className="bg-secondary hover:bg-muted text-secondary-foreground rounded-xl text-xs font-bold h-10 px-4">
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 6: SOCIAL MOBILIZATION */}
        {activeStep === 6 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-indigo-600" />
                Step 6: Social Mobilization Campaigns
              </CardTitle>
              <CardDescription className="text-xs">
                Schedule dynamic community announcements and village group mobilization campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Activity Type</Label>
                  <Select value={mobType} onValueChange={setMobType}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public_announcement">Church/Mosque Announcement</SelectItem>
                      <SelectItem value="house_to_house">CHW Door-to-Door Talk</SelectItem>
                      <SelectItem value="school_engagement">Local School Session</SelectItem>
                      <SelectItem value="community_meeting">Chief Assembly Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mob-date" className="text-xs">Planned Date</Label>
                  <Input
                    id="mob-date"
                    type="date"
                    value={mobDate}
                    onChange={(e) => setMobDate(e.target.value)}
                    className="bg-background rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mob-target" className="text-xs">Target Audience</Label>
                <Input
                  id="mob-target"
                  placeholder="e.g. Mothers of infants, community leaders"
                  value={mobTargetGroup}
                  onChange={(e) => setMobTargetGroup(e.target.value)}
                  className="bg-background rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddMobilization}
                  disabled={addMobMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-10 shadow-xs"
                >
                  Save Mobilization Task
                </Button>
                <Button
                  onClick={() => setActiveStep(7)}
                  className="bg-secondary hover:bg-muted text-secondary-foreground rounded-xl text-xs font-bold h-10 px-4"
                >
                  Skip / Next
                </Button>
              </div>

              {/* Mobilization List */}
              {mobilizations && mobilizations.length > 0 && (
                <div className="border-t pt-3 mt-1 space-y-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scheduled Mobilizations:</h4>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {mobilizations.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/40 text-xs border border-border/20">
                        <span className="font-bold capitalize">{m.activityType?.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{new Date(m.plannedDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* STEP 7: OPERATIONAL BUDGET COSTING */}
        {activeStep === 7 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden max-w-full">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-600" />
                Step 7: Session Budget Allocation
              </CardTitle>
              <CardDescription className="text-xs">
                Manage direct operational costing lines. Edits update immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5 overflow-x-auto">

              {/* Staffing Roster (WHO microplanning element 6 — Human Resources) */}
              <div className="rounded-2xl border border-border/40 bg-muted/5 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" />
                      Staffing Roster
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Plan headcount, days, and per-diem per role. Totals can be pushed to the budget below.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mr-2">Staffing Total:</span>
                    <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                      K{staffingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[520px]">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                        <th className="py-2 px-1">Role</th>
                        <th className="py-2 px-1 w-20">Headcount</th>
                        <th className="py-2 px-1 w-16">Days</th>
                        <th className="py-2 px-1 w-24">Per-diem (K)</th>
                        <th className="py-2 px-1 w-24 text-right">Subtotal</th>
                        <th className="py-2 px-1 w-10 text-center">—</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffingRows.map((row, idx) => {
                        const subtotal = (row.headcount || 0) * (row.days || 0) * (row.perDiem || 0);
                        const update = (patch: Partial<StaffingRow>) =>
                          setStaffingRows(staffingRows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
                        return (
                          <tr key={idx} className="border-b border-border/30">
                            <td className="py-1.5 px-1">
                              <Input
                                value={row.role}
                                onChange={(e) => update({ role: e.target.value })}
                                className="bg-background rounded-lg text-xs h-8 px-2 font-semibold"
                                data-testid={`input-staff-role-${idx}`}
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <Input
                                type="number"
                                min={0}
                                value={row.headcount}
                                onChange={(e) => update({ headcount: parseInt(e.target.value) || 0 })}
                                className="bg-background rounded-lg text-xs h-8 px-2 font-mono"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <Input
                                type="number"
                                min={0}
                                value={row.days}
                                onChange={(e) => update({ days: parseInt(e.target.value) || 0 })}
                                className="bg-background rounded-lg text-xs h-8 px-2 font-mono"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={row.perDiem}
                                onChange={(e) => update({ perDiem: parseFloat(e.target.value) || 0 })}
                                className="bg-background rounded-lg text-xs h-8 px-2 font-mono"
                              />
                            </td>
                            <td className="py-1.5 px-1 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              K{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-1 text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setStaffingRows(staffingRows.filter((_, i) => i !== idx))}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStaffingRows([...staffingRows, { role: "", headcount: 0, days: 0, perDiem: 0 }])
                    }
                    className="rounded-xl text-xs font-bold border-indigo-600/30 text-indigo-600 hover:bg-indigo-50"
                    data-testid="button-add-staff-row"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Role
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveStaffingMutation.mutate()}
                    disabled={!activeMicroplan || saveStaffingMutation.isPending}
                    className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                    data-testid="button-save-staffing"
                  >
                    {saveStaffingMutation.isPending ? "Saving..." : "Save Roster"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncStaffingToBudget}
                    disabled={!activeSessionId || staffingTotal <= 0}
                    className="rounded-xl text-xs font-bold border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
                    data-testid="button-sync-staff-budget"
                  >
                    <Wallet className="h-3.5 w-3.5 mr-1" /> Push to Budget as Per-Diem
                  </Button>
                  {!activeMicroplan && (
                    <span className="text-[10px] text-muted-foreground italic">
                      Draft or open a session to attach a microplan.
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-[600px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground uppercase font-bold text-[9px] tracking-wider bg-slate-500/5">
                      <th className="py-2 px-1">Category</th>
                      <th className="py-2 px-1">Description</th>
                      <th className="py-2 px-1 w-20">Unit Cost (K)</th>
                      <th className="py-2 px-1 w-16">Qty</th>
                      <th className="py-2 px-1 w-28">Funding</th>
                      <th className="py-2 px-1 w-24 text-right">Total</th>
                      <th className="py-2 px-1 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Saved rows */}
                    {budgetItems && budgetItems.filter(b => b.sessionId === activeSessionId).map((b: any) => {
                      const edited = editingItems[b.id] || {
                        category: b.category,
                        description: b.description,
                        unitCost: b.unitCost.toString(),
                        quantity: b.quantity
                      };
                      const hasChanges = editingItems[b.id] !== undefined;
                      const rowTotal = parseFloat(edited.unitCost || "0") * edited.quantity;
                      
                      return (
                        <tr key={b.id} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                          <td className="py-1.5 px-1">
                            <Input
                              value={edited.category}
                              onChange={(e) => handleExistingRowChange(b.id, "category", e.target.value)}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-semibold"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              value={edited.description}
                              onChange={(e) => handleExistingRowChange(b.id, "description", e.target.value)}
                              className="bg-background rounded-lg text-xs h-8 px-2"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              type="number"
                              value={edited.unitCost}
                              onChange={(e) => handleExistingRowChange(b.id, "unitCost", e.target.value)}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-mono"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              type="number"
                              value={edited.quantity}
                              onChange={(e) => handleExistingRowChange(b.id, "quantity", parseInt(e.target.value) || 0)}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-mono"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            {(!b.fundingSource || b.fundingSource === "unspecified") ? (
                              <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                                Needs classification
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {b.fundingSource === "other" && b.fundingSourceOther ? b.fundingSourceOther : b.fundingSource}
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            K{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <div className="flex gap-1.5 justify-center">
                              {hasChanges && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSaveExistingRow(b.id)}
                                  className="h-7 w-7 text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteBudgetMutation.mutate(b.id)}
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Draft unsaved rows */}
                    {draftRows.map((draft) => {
                      const rowTotal = parseFloat(draft.unitCost || "0") * draft.quantity;
                      return (
                        <tr key={draft.tempId} className="border-b border-dashed border-indigo-500/20 bg-indigo-500/5 transition-colors">
                          <td className="py-1.5 px-1">
                            <Input
                              value={draft.category}
                              onChange={(e) => {
                                setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, category: e.target.value } : r));
                              }}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-semibold border-indigo-500/20"
                              placeholder="Personnel, Transport..."
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              value={draft.description}
                              onChange={(e) => {
                                setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, description: e.target.value } : r));
                              }}
                              className="bg-background rounded-lg text-xs h-8 px-2 border-indigo-500/20"
                              placeholder="Activity description..."
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              type="number"
                              value={draft.unitCost}
                              onChange={(e) => {
                                setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, unitCost: e.target.value } : r));
                              }}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-mono border-indigo-500/20"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Input
                              type="number"
                              value={draft.quantity}
                              onChange={(e) => {
                                setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, quantity: parseInt(e.target.value) || 0 } : r));
                              }}
                              className="bg-background rounded-lg text-xs h-8 px-2 font-mono border-indigo-500/20"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <Select
                              value={draft.fundingSource}
                              onValueChange={(v) => setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, fundingSource: v } : r))}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg border-indigo-500/20 bg-background" data-testid={`select-draft-funding-${draft.tempId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FUNDING_SOURCES.map((fs) => (
                                  <SelectItem key={fs.value} value={fs.value}>{fs.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {draft.fundingSource === "other" && (
                              <Input
                                value={draft.fundingSourceOther || ""}
                                onChange={(e) => setDraftRows(draftRows.map(r => r.tempId === draft.tempId ? { ...r, fundingSourceOther: e.target.value } : r))}
                                placeholder="Specify..."
                                className="mt-1 h-7 text-[11px] rounded-lg border-indigo-500/20 bg-background"
                              />
                            )}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-500">
                            K{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveDraftRow(draft.tempId)}
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteDraftRow(draft.tempId)}
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {(!budgetItems || budgetItems.filter(b => b.sessionId === activeSessionId).length === 0) && draftRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                          No costing rows allocated. Click "+ Add Custom Row" to start adding expenses.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center gap-4 pt-4 border-t flex-wrap">
                <Button
                  onClick={() => {
                    setDraftRows([
                      ...draftRows,
                      {
                        tempId: Math.random().toString(),
                        category: "",
                        description: "",
                        unitCost: "100",
                        quantity: 1,
                        fundingSource: "unspecified",
                      }
                    ]);
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold border-indigo-600/30 text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Row
                </Button>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2">Overall Total:</span>
                  <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    K{overallTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t mt-4">
                <Button
                  onClick={() => setActiveStep(8)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold h-10 shadow-md shadow-indigo-600/10"
                >
                  Save & Proceed to Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 8: REVIEW & CERTIFY */}
        {activeStep === 8 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-gradient-to-br from-indigo-500/5 to-sky-500/5">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
                Step 8: Review & Approval Cascade
              </CardTitle>
              <CardDescription className="text-xs">
                Verify the finalized vaccination microplan package and address any critical gaps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5 text-xs">
              
              <div className="space-y-3 rounded-2xl border p-4 bg-background shadow-xs">
                <h3 className="font-extrabold text-sm border-b pb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  EPI Microplanning Package
                </h3>
                
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="font-bold text-muted-foreground">Session Name</div>
                  <div className="text-right font-semibold">{activeSession?.name}</div>

                  <div className="font-bold text-muted-foreground">Scope / Type</div>
                  <div className="text-right capitalize font-semibold">{activeSession?.sessionType} Session</div>

                  <div className="font-bold text-muted-foreground">Target Population</div>
                  <div className="text-right font-semibold font-mono">{activeSession?.targetPopulation} Children</div>

                  <div className="font-bold text-muted-foreground">Itinerary Scope</div>
                  <div className="text-right font-semibold">{dayPlans?.length || 0} Scheduled Days</div>

                  <div className="font-bold text-muted-foreground">Outreach Budget</div>
                  <div className="text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    K{budgetItems
                      ?.filter((b) => b.sessionId === activeSessionId)
                      .reduce((sum, item) => sum + parseFloat(item.totalCost || "0"), 0)
                      .toLocaleString()
                    }
                  </div>
                </div>

                {/* Funding source breakdown */}
                {(() => {
                  const sessionBudget = (budgetItems || []).filter((b) => b.sessionId === activeSessionId);
                  if (sessionBudget.length === 0) return null;
                  const groups: Record<string, number> = {};
                  for (const it of sessionBudget) {
                    const fs = ((it as any).fundingSource as string) || "unspecified";
                    groups[fs] = (groups[fs] || 0) + parseFloat(it.totalCost || "0");
                  }
                  const grand = Object.values(groups).reduce((s, n) => s + n, 0);
                  if (grand <= 0) return null;
                  const unspecified = groups["unspecified"] || 0;
                  const colorOf = (k: string) =>
                    k === "government" ? "bg-blue-500" :
                    k === "gavi" ? "bg-purple-500" :
                    k === "who" ? "bg-cyan-500" :
                    k === "unicef" ? "bg-sky-500" :
                    k === "other" ? "bg-slate-500" : "bg-amber-500";
                  const labelOf = (k: string) =>
                    FUNDING_SOURCES.find((o) => o.value === k)?.label ?? "Unspecified";
                  return (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                          Budget by Funding Source
                        </div>
                        {unspecified > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-400 font-semibold">
                            Needs classification
                          </span>
                        )}
                      </div>
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
                        {Object.entries(groups).map(([k, v]) =>
                          v > 0 ? (
                            <div
                              key={k}
                              className={colorOf(k)}
                              style={{ width: `${(v / grand) * 100}%` }}
                              title={`${labelOf(k)}: K${v.toLocaleString()}`}
                            />
                          ) : null,
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        {Object.entries(groups)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className={`inline-block h-2 w-2 rounded-full ${colorOf(k)}`} />
                                {labelOf(k)}
                              </span>
                              <span className="font-mono font-semibold">
                                K{v.toLocaleString()}
                                <span className="text-muted-foreground ml-1">
                                  ({((v / grand) * 100).toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Automated Gap Review Audit Panel */}
              {auditGaps.length > 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5 text-xs text-amber-800 dark:text-amber-400">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    Planning Completeness Review Gaps
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {auditGaps.map((gap, idx) => (
                      <li key={idx} className="font-medium">{gap}</li>
                    ))}
                  </ul>
                  <div className="pt-1.5 flex gap-2">
                    {(!dayPlans || dayPlans.length === 0) && (
                      <Button onClick={() => setActiveStep(4)} size="sm" variant="outline" className="text-[10px] h-7 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 bg-background/55">
                        Go to Day Schedules (Step 4)
                      </Button>
                    )}
                    <Button onClick={() => setActiveStep(7)} size="sm" variant="outline" className="text-[10px] h-7 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 bg-background/55">
                      Go to Budget Costing (Step 7)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  All critical items (itineraries and baseline budgets) compiled perfectly! Ready for submission.
                </div>
              )}

              {/* Submit to Incharge Actions (For clerk / compiler role or drafts) */}
              {activeSession?.approvalStatus === "draft" || activeSession?.approvalStatus === "rejected" ? (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-[10px] leading-relaxed italic text-emerald-700 dark:text-emerald-400 font-semibold">
                    ⚠️ Submission Lock: Once sent for approvals, the session itineraries, antigen calculations, and budget costing items are locked to preserve audit trail integrity.
                  </div>
                  <Button
                    onClick={() => submitApprovalMutation.mutate()}
                    disabled={submitApprovalMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-10 shadow-lg shadow-emerald-600/15"
                  >
                    {submitApprovalMutation.isPending ? "Submitting..." : "Submit to In-Charge for Review"}
                  </Button>
                </div>
              ) : activeSession?.approvalStatus === "pending" && (user?.role !== "facility_in_charge" && user?.role !== "district_manager") ? (
                <div className="p-4 border border-indigo-500/15 bg-indigo-500/5 text-indigo-600 rounded-2xl text-center font-bold">
                  ⌛ Awaiting Review: This microplan is queued for review by the Facility In-Charge or District Manager.
                </div>
              ) : activeSession?.approvalStatus === "approved" ? (
                <div className="p-4 border border-emerald-500/15 bg-emerald-500/5 text-emerald-600 rounded-2xl text-center font-bold">
                  🟢 Approved: This microplan has been successfully approved and locked for implementation.
                </div>
              ) : null}

              {/* In-Charge Review Controls */}
              {activeSession?.approvalStatus === "pending" && (user?.role === "facility_in_charge" || user?.role === "district_manager") && (
                <div className="p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    In-Charge Approval Action Center
                  </h4>
                  <Textarea
                    placeholder="Enter review remarks, cold chain instructions or budgeting notes..."
                    id="review-comments"
                    className="bg-background rounded-xl text-xs min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const commentsEl = document.getElementById("review-comments") as HTMLTextAreaElement;
                        updateApprovalStatusMutation.mutate({
                          id: activeSessionId!,
                          status: "approved",
                          comments: commentsEl?.value,
                        }, {
                          onSuccess: () => {
                            setIsBuilding(false);
                            setActiveSessionId(null);
                          }
                        });
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                    >
                      Approve & Lock Plan
                    </Button>
                    <Button
                      onClick={() => {
                        const commentsEl = document.getElementById("review-comments") as HTMLTextAreaElement;
                        updateApprovalStatusMutation.mutate({
                          id: activeSessionId!,
                          status: "rejected",
                          comments: commentsEl?.value,
                        }, {
                          onSuccess: () => {
                            setIsBuilding(false);
                            setActiveSessionId(null);
                          }
                        });
                      }}
                      variant="destructive"
                      className="rounded-xl text-xs font-bold"
                    >
                      Reject to Draft
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 9: WORKFORCE & TEAMING ROSTER */}
        {activeStep === 9 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-gradient-to-br from-sky-500/5 to-indigo-500/5">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-600" />
                Step 9: Workforce & Teaming Roster
              </CardTitle>
              <CardDescription className="text-xs">
                Confirm the team composition that will deliver this microplan in the field
                (RED-Q workforce element). Detailed per-role staffing is captured under the
                Budget step; this panel summarises and locks the roster.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-5 text-xs">
              {!activeMicroplan && (
                <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-semibold">
                  Create a microplan in Step 3 first; the workforce roster attaches to that microplan.
                </div>
              )}
              {activeMicroplan && (
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const raw = activeMicroplan.staffing as any;
                    const roster: StaffingRow[] = Array.isArray(raw)
                      ? raw
                      : Array.isArray(raw?.roster)
                      ? raw.roster
                      : [];
                    return roster.length === 0 ? (
                      <div className="col-span-2 p-3 rounded-2xl border border-dashed border-border/60 text-muted-foreground italic">
                        No staffing rows yet — add them under Step 7 (Budget &amp; Staffing). They will appear here.
                      </div>
                    ) : (
                      roster.map((row, i) => (
                        <div key={i} className="rounded-2xl border border-border/60 p-3 bg-background">
                          <div className="font-extrabold text-sm">{row.role}</div>
                          <div className="text-muted-foreground mt-1">
                            {row.headcount} × {row.days}d @ K{row.perDiem}
                          </div>
                        </div>
                      ))
                    );
                  })()}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setActiveStep(7)} className="rounded-xl text-xs">
                Edit roster in Step 7
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 10: SUPPORTIVE SUPERVISION PLAN */}
        {activeStep === 10 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                Step 10: Supportive Supervision Plan
              </CardTitle>
              <CardDescription className="text-xs">
                Schedule supervisor visits, checklists and feedback loops for this round
                (RED-Q supportive supervision element).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 pt-5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 p-3 bg-background space-y-1.5">
                  <Label className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Supervisor</Label>
                  <Input id="sup-name" placeholder="Name / role" className="text-xs h-8 rounded-xl" />
                </div>
                <div className="rounded-2xl border border-border/60 p-3 bg-background space-y-1.5">
                  <Label className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Visit Date</Label>
                  <Input id="sup-date" type="date" className="text-xs h-8 rounded-xl" />
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-3 bg-background space-y-1.5">
                <Label className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Checklist Focus</Label>
                <Textarea
                  id="sup-checklist"
                  placeholder="e.g. cold chain temp logs, AEFI register, session register completeness…"
                  className="text-xs rounded-xl min-h-[80px]"
                  defaultValue={
                    activeMicroplan
                      ? (((activeMicroplan.staffing as any)?.__supervision?.checklist as string) || "")
                      : ""
                  }
                />
              </div>
              <Button
                size="sm"
                disabled={!activeMicroplan}
                onClick={() => {
                  if (!activeMicroplan?.id) return;
                  const name = (document.getElementById("sup-name") as HTMLInputElement)?.value || "";
                  const date = (document.getElementById("sup-date") as HTMLInputElement)?.value || "";
                  const checklist = (document.getElementById("sup-checklist") as HTMLTextAreaElement)?.value || "";
                  // Persist the supervision plan inside the existing `staffing`
                  // jsonb column under a reserved `__supervision` key so we
                  // don't need a schema migration to add a dedicated column.
                  // Roster rows (array entries) are preserved via the wrapper:
                  // we promote the existing array to { roster, __supervision }.
                  const existingStaffing = activeMicroplan.staffing as any;
                  const rosterRows = Array.isArray(existingStaffing)
                    ? existingStaffing
                    : Array.isArray(existingStaffing?.roster)
                    ? existingStaffing.roster
                    : [];
                  const nextStaffing = {
                    roster: rosterRows,
                    __supervision: { supervisor: name, visitDate: date, checklist },
                  };
                  apiRequest("PATCH", `/api/microplans/${activeMicroplan.id}`, {
                    staffing: nextStaffing,
                  })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
                      toast({ title: "Supervision plan saved" });
                    })
                    .catch((err: any) =>
                      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
                    );
                }}
                className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
              >
                Save Supervision Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 11: CATCHMENT & POPULATION SNAPSHOT */}
        {activeStep === 11 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Map className="h-5 w-5 text-emerald-600" />
                Step 11: Catchment &amp; Population Snapshot
              </CardTitle>
              <CardDescription className="text-xs">
                Final read-only summary of the catchment area and target denominators
                for this microplan (RED-Q catchment mapping element).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 pt-5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 p-3 bg-background">
                  <div className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Facility</div>
                  <div className="text-sm font-extrabold mt-1">{activeFacility?.name || "—"}</div>
                </div>
                <div className="rounded-2xl border border-border/60 p-3 bg-background">
                  <div className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Villages in catchment</div>
                  <div className="text-sm font-extrabold mt-1 font-mono">{facilityVillages.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 p-3 bg-background">
                  <div className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Target population (under-1)</div>
                  <div className="text-sm font-extrabold mt-1 font-mono">{activeSession?.targetPopulation || "—"}</div>
                </div>
                <div className="rounded-2xl border border-border/60 p-3 bg-background">
                  <div className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">HTR villages flagged</div>
                  <div className="text-sm font-extrabold mt-1 font-mono">
                    {facilityVillages.filter((v) => Number(v.terrainDifficulty) >= 4 || v.seasonalAccessibility === "poor").length}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/map")} className="rounded-xl text-xs">
                Open full catchment map
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 12: EXECUTION, MONITORING & QUARTERLY REVIEW */}
        {activeStep === 12 && (
          <Card className="rounded-3xl border border-border/60 shadow-xl overflow-hidden bg-gradient-to-br from-amber-500/5 to-rose-500/5">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                Step 12: Execution, Monitoring &amp; Quarterly Review
              </CardTitle>
              <CardDescription className="text-xs">
                Read-only execution dashboard for this microplan — day plans completed,
                doses administered, and outstanding gaps to feed the quarterly review
                (RED-Q monitoring &amp; review element).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 pt-5 text-xs">
              {(() => {
                const days = dayPlans || [];
                const total = days.length;
                const completed = days.filter((d: any) => d.completedAt).length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-border/60 p-3 bg-background text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Day Plans</div>
                        <div className="text-2xl font-black font-mono mt-1">{total}</div>
                      </div>
                      <div className="rounded-2xl border border-border/60 p-3 bg-background text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Completed</div>
                        <div className="text-2xl font-black font-mono mt-1 text-emerald-600">{completed}</div>
                      </div>
                      <div className="rounded-2xl border border-border/60 p-3 bg-background text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Coverage</div>
                        <div className="text-2xl font-black font-mono mt-1 text-indigo-600">{pct}%</div>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="rounded-2xl border border-border/60 p-3 bg-background space-y-1.5">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Approval status</div>
                      <Badge variant="outline" className="capitalize">
                        {activeSession?.approvalStatus || "draft"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setLocation("/reports")} className="rounded-xl text-xs">
                        Open coverage reports
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setLocation("/approvals")} className="rounded-xl text-xs">
                        Open approvals
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

      </div>

      {/* FOOTER WIZARD NAVIGATION CONTROLS */}
      {/* Original Code: Standard static Back and Next buttons without adjacent step names
      <div className="flex justify-between items-center gap-4 bg-background/80 dark:bg-slate-900/80 border border-border/80 p-3 rounded-2xl shadow-lg no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
          disabled={activeStep === 1}
          className="h-9 px-3 text-xs rounded-xl flex items-center gap-1 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <div className="text-xs font-mono font-bold text-muted-foreground">
          Step {activeStep} / {TOTAL_STEPS}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeStep === 3 && !activeSessionId) {
              toast({ title: "Draft Session First", description: "You must draft the session to generate an ID before proceeding.", variant: "destructive" });
              return;
            }
            setActiveStep((s) => Math.min(TOTAL_STEPS, s + 1));
          }}
          disabled={activeStep === TOTAL_STEPS}
          className="h-9 px-3 text-xs rounded-xl flex items-center gap-1 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      */}

      {/* Updated Code: Next/Back buttons with clear context-aware dynamic labels showing next step */}
      <div className="flex justify-between items-center gap-4 bg-background/80 dark:bg-slate-900/80 border border-border/80 p-3 rounded-2xl shadow-lg no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
          disabled={activeStep === 1}
          className="h-9 px-3 text-xs rounded-xl flex items-center gap-1 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{activeStep > 1 ? `Back: Step ${activeStep - 1} (${stepTitles[activeStep - 1]})` : "Back"}</span>
        </Button>

        <div className="text-xs font-mono font-bold text-muted-foreground">
          Step {activeStep} / {TOTAL_STEPS}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const gate = validateStep(activeStep);
            if (!gate.ok) {
              toast({ title: "Cannot advance yet", description: gate.reason, variant: "destructive" });
              return;
            }
            autoSaveCurrentStep();
            setActiveStep((s) => Math.min(TOTAL_STEPS, s + 1));
          }}
          disabled={activeStep === TOTAL_STEPS}
          className="h-9 px-3 text-xs rounded-xl flex items-center gap-1 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>{activeStep < TOTAL_STEPS ? `Next: Step ${activeStep + 1} (${stepTitles[activeStep + 1]})` : "Next"}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <AddCommunityDialog
        isOpen={isAddCommunityOpen}
        onClose={() => setIsAddCommunityOpen(false)}
        defaultFacilityId={selectedFacilityId}
        onSuccess={(newVillage) => {
          if (activeStep === 2) {
            setSelectedVillageId(newVillage.id);
          } else if (activeStep === 4) {
            setVisitedVillages((prev) => [...prev, newVillage.id]);
          }
        }}
      />
    </div>
  );
}
