import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Polygon as LeafletPolygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Label } from "@/components/ui/label";
import {
  applyDefaultLeafletPinIcon,
  createFilledPinIcon,
} from "@/lib/mapIcons";
import {
  usePopulationOverlay,
  PopulationWmsLayer,
  PopulationOverlayToggle,
  PopulationOverlayLegend,
} from "@/components/PopulationOverlay";

// Fix standard Leaflet default marker icon displacement/missing asset issues and replace with offline-available premium vector SVG pins
applyDefaultLeafletPinIcon();

// Premium Offline-Available Vector Pin Icons (Built from shared SVG constants)
const OFFLINE_FACILITY_ICON =
  typeof window !== "undefined" ? createFilledPinIcon("blue") : (null as any);

const OFFLINE_VILLAGE_ICON =
  typeof window !== "undefined" ? createFilledPinIcon("green") : (null as any);
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { offlineDb } from "@/lib/offlineDb";
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Car,
  Footprints,
  Ship,
  Plane,
  Plus,
  Trash2,
  FileSpreadsheet,
  ArrowLeft,
  Settings,
  Flame,
  Thermometer,
  Layers,
  Check,
  Info,
  ClipboardList,
  TrendingUp,
  CloudOff,
} from "lucide-react";
import {
  insertSessionDayPlanSchema,
  type SessionPlan,
  type SessionDayPlan,
  type Village,
  type VaccineConfig,
  type Facility,
  type InsertSessionDayPlan,
  type Microplan,
} from "@shared/schema";

import {
  extractRoster,
  ratesByField,
  personnelCostForDay,
  rosterRoleToPlanCountField,
} from "@/lib/personnelCost";
import { z } from "zod";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { MicroplanStepper } from "@/components/MicroplanStepper";

const transportIcons: Record<string, typeof Car> = {
  walking: Footprints,
  road: Car,
  boat: Ship,
  air: Plane,
};

const dayPlanFormSchema = z.object({
  dayNumber: z.number().min(1, "Day number is required"),
  sessionDate: z.string().min(1, "Session date is required").refine((val) => {
    const selected = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, "Session date must be scheduled at least 7 days in advance"),
  communitiesVisited: z.array(z.number()).min(1, "Select at least one community"),
  targetPopulation: z.number().min(1, "Target population must be at least 1"),
  vitaminADoses: z.number().min(0),
  dewormingDoses: z.number().min(0),
  vaccineCarriers: z.number().min(1),
  icePacks: z.number().min(0),
  chalkSticks: z.number().min(0),
  tallySheets: z.number().min(0),
  distanceKm: z.number().min(0),
  transportType: z.enum(["walking", "road", "boat", "air"]),
  fuelLiters: z.number().min(0),
  teamCount: z.number().min(1).optional(),
  vaccinatorsCount: z.number().min(0).optional(),
  volunteersCount: z.number().min(0).optional(),
  recordersCount: z.number().min(0).optional(),
  supervisorsCount: z.number().min(0).optional(),
  indelibleMarkers: z.number().min(0).optional(),
  coldBoxes: z.number().min(0).optional(),
  leadVaccinator: z.string().trim().min(1, "Name a lead vaccinator for this session-day"),
});

type FormValues = z.infer<typeof dayPlanFormSchema>;

export default function SessionDayPlans() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const populationOverlay = usePopulationOverlay();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SessionDayPlan | null>(null);

  // Execution Outcome Logging States
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [selectedDayPlan, setSelectedDayPlan] = useState<SessionDayPlan | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<string>("conducted");
  const [actualVaccinated, setActualVaccinated] = useState<number>(0);
  const [actualVialsUsed, setActualVialsUsed] = useState<number>(0);
  const [actualVialsWasted, setActualVialsWasted] = useState<number>(0);
  const [executedAt, setExecutedAt] = useState<string>("");
  const [executionNotes, setExecutionNotes] = useState<string>("");

  // Mutation to save Execution Outcome Logs
  const logOutcomeMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      executionStatus: string;
      actualVaccinated?: number | null;
      actualVialsUsed?: number | null;
      actualVialsWasted?: number | null;
      executedAt?: string | null;
      executionNotes?: string | null;
    }) => {
      return apiRequest("PATCH", `/api/sessions/days/${payload.id}`, {
        executionStatus: payload.executionStatus,
        actualVaccinated: payload.executionStatus === "conducted" ? payload.actualVaccinated : null,
        actualVialsUsed: payload.executionStatus === "conducted" ? payload.actualVialsUsed : null,
        actualVialsWasted: payload.executionStatus === "conducted" ? payload.actualVialsWasted : null,
        executedAt: payload.executedAt ? new Date(payload.executedAt).toISOString() : null,
        executionNotes: payload.executionNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${id}/days`] });
      setOutcomeDialogOpen(false);
      toast({
        title: "Execution Outcome Saved",
        description: "Successfully updated daily session execution metrics and triangulation records.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Save Outcome",
        description: err.message || "Failed to update daily execution records.",
        variant: "destructive",
      });
    },
  });

  const handleOpenOutcomeDialog = (plan: SessionDayPlan) => {
    setSelectedDayPlan(plan);
    setOutcomeStatus(plan.executionStatus || "conducted");
    setActualVaccinated(plan.actualVaccinated ?? plan.targetPopulation);
    // Default vials used: assume 10 doses per vial
    setActualVialsUsed(plan.actualVialsUsed ?? Math.ceil(plan.targetPopulation / 10));
    setActualVialsWasted(plan.actualVialsWasted ?? 0);
    setExecutedAt(plan.executedAt ? new Date(plan.executedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setExecutionNotes(plan.executionNotes ?? "");
    setOutcomeDialogOpen(true);
  };


  // Fetch Parent Session Plan
  const { data: sessionPlan, isLoading: loadingSession } = useQuery<SessionPlan>({
    queryKey: [`/api/sessions/${id}`],
    enabled: !!id,
  });

  // Task #196 — Mirror the "Pending sync" badge from the microplan list onto
  // this drill-down so a clerk who navigates straight into a session's day
  // plans can still see that their last save (a PATCH or a mark-done) is
  // queued offline and avoid double-editing it. Polls the same outbox the
  // microplan list uses so the badge clears once syncEngine flushes the
  // entry.
  const sessionIdNum = id ? Number(id) : null;
  const { data: pendingSessionSync } = useQuery<{ pending: boolean }>({
    queryKey: ["offline-outbox", "sessionPlan", sessionIdNum],
    enabled: sessionIdNum != null && Number.isFinite(sessionIdNum),
    queryFn: async () => {
      const entries = await offlineDb.outbox
        .where("entityType")
        .equals("sessionPlan")
        .toArray();
      const pending = entries.some(
        (e) => typeof e.serverId === "number" && e.serverId === sessionIdNum,
      );
      return { pending };
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    staleTime: 1000,
  });
  const isSessionPendingSync = !!pendingSessionSync?.pending;

  // Fetch the parent microplan so we can reuse its staffing roster (per-diem
  // rates + headcount) to compute personnel cost per session-day without
  // making facility staff retype rates here.
  const { data: parentMicroplan } = useQuery<Microplan>({
    queryKey: [`/api/microplans/${sessionPlan?.microplanId}`],
    enabled: !!sessionPlan?.microplanId,
  });

  const roster = useMemo(() => extractRoster(parentMicroplan), [parentMicroplan]);
  const rosterRates = useMemo(() => ratesByField(roster), [roster]);
  const rosterHeadcounts = useMemo(() => {
    const out: Record<string, number> = {};
    roster.forEach((r) => {
      const f = rosterRoleToPlanCountField(r.role);
      if (!f) return;
      out[f] = (out[f] || 0) + (r.headcount || 0);
    });
    return out;
  }, [roster]);
  const hasRosterRates = useMemo(
    () => Object.values(rosterRates).some((v) => v > 0),
    [rosterRates],
  );

  // Fetch Day Plans
  const { data: dayPlans, isLoading: loadingDays } = useQuery<SessionDayPlan[]>({
    queryKey: [`/api/sessions/${id}/days`],
    enabled: !!id,
  });

  // Fetch Vaccine Configurations
  const { data: vaccineConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
  });

  // Fetch Villages for the parent facility
  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
    select: (list) =>
      sessionPlan
        ? list.filter((v) => Number(v.assignedFacilityId) === Number(sessionPlan.facilityId))
        : [],
    enabled: !!sessionPlan,
  });

  // Fetch All Facilities for names
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: provinces } = useQuery<any[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: districts } = useQuery<any[]>({
    queryKey: ["/api/districts"],
  });

  // Triangulation & Coverage computations
  const stats = useMemo(() => {
    if (!dayPlans) return {
      totalDays: 0,
      conductedDays: 0,
      plannedDays: 0,
      cancelledDays: 0,
      completionRate: 0,
      targetPop: 0,
      actualVaccinated: 0,
      coverageRate: 0,
      totalVialsUsed: 0,
      totalVialsWasted: 0,
      totalVials: 0,
      wastageRate: 0
    };

    const totalDays = dayPlans.length;
    let conductedDays = 0;
    let plannedDays = 0;
    let cancelledDays = 0;
    let targetPop = 0;
    let actualVaccinated = 0;
    let totalVialsUsed = 0;
    let totalVialsWasted = 0;

    dayPlans.forEach(plan => {
      targetPop += plan.targetPopulation || 0;
      
      if (plan.executionStatus === "conducted") {
        conductedDays++;
        actualVaccinated += plan.actualVaccinated || 0;
        totalVialsUsed += plan.actualVialsUsed || 0;
        totalVialsWasted += plan.actualVialsWasted || 0;
      } else if (plan.executionStatus === "cancelled") {
        cancelledDays++;
      } else {
        plannedDays++;
      }
    });

    const completionRate = totalDays > 0 ? Math.round((conductedDays / totalDays) * 100) : 0;
    const coverageRate = targetPop > 0 ? Math.round((actualVaccinated / targetPop) * 100) : 0;
    const totalVials = totalVialsUsed + totalVialsWasted;
    const wastageRate = totalVials > 0 ? parseFloat(((totalVialsWasted / totalVials) * 100).toFixed(1)) : 0;

    return {
      totalDays,
      conductedDays,
      plannedDays,
      cancelledDays,
      completionRate,
      targetPop,
      actualVaccinated,
      coverageRate,
      totalVialsUsed,
      totalVialsWasted,
      totalVials,
      wastageRate
    };
  }, [dayPlans]);

  const isLocked = sessionPlan?.approvalStatus === "approved" || sessionPlan?.approvalStatus === "locked";

  const facilityName = useMemo(() => {
    if (!sessionPlan || !facilities) return "";
    return facilities.find((f) => f.id === sessionPlan.facilityId)?.name ?? `#${sessionPlan.facilityId}`;
  }, [sessionPlan, facilities]);

  const fullGeoHeader = useMemo(() => {
    if (!sessionPlan || !facilities || !provinces || !districts) return facilityName;
    const fac = facilities.find((f) => f.id === sessionPlan.facilityId);
    if (!fac) return facilityName;
    const dist = districts.find((d) => d.id === fac.districtId);
    const prov = dist ? provinces.find((p) => p.id === dist.provinceId) : undefined;
    
    const provName = prov?.name ?? "Unknown Province";
    const distName = dist?.name ?? "Unknown District";
    return `${provName} · ${distName} · ${fac.name}`;
  }, [sessionPlan, facilities, provinces, districts, facilityName]);

  const activeFacility = useMemo(() => {
    if (!sessionPlan || !facilities) return null;
    return facilities.find((f) => f.id === sessionPlan.facilityId);
  }, [sessionPlan, facilities]);

  const [geoProvinceId, setGeoProvinceId] = useState<number | null>(null);
  const [geoDistrictId, setGeoDistrictId] = useState<number | null>(null);
  const [geoFacilityId, setGeoFacilityId] = useState<number | null>(null);

  const sessionFacilityGeo = useMemo(() => {
    const fac = activeFacility;
    if (!fac) return { provinceId: null as number | null, districtId: null as number | null, facilityId: null as number | null };
    const dist = districts?.find((d) => d.id === fac.districtId);
    const prov = dist ? provinces?.find((p) => p.id === dist.provinceId) : null;
    return {
      provinceId: prov?.id ?? null,
      districtId: dist?.id ?? null,
      facilityId: fac.id ?? null,
    };
  }, [activeFacility, districts, provinces]);

  const filteredDayPlans = useMemo(() => {
    if (!dayPlans) return [];
    if (geoProvinceId === null && geoDistrictId === null && geoFacilityId === null) return dayPlans;
    if (geoProvinceId !== null && sessionFacilityGeo.provinceId !== geoProvinceId) return [];
    if (geoDistrictId !== null && sessionFacilityGeo.districtId !== geoDistrictId) return [];
    if (geoFacilityId !== null && sessionFacilityGeo.facilityId !== geoFacilityId) return [];
    return dayPlans;
  }, [dayPlans, geoProvinceId, geoDistrictId, geoFacilityId, sessionFacilityGeo]);

  const tableTotals = useMemo(() => {
    if (!filteredDayPlans) return null;

    const totals: Record<string, number> = {
      targetPop: 0,
      vitaminA: 0,
      deworming: 0,
      carriers: 0,
      icePacks: 0,
      distance: 0,
      fuel: 0,
      actualVacc: 0,
      vialsUsed: 0,
      vialsWasted: 0,
      teams: 0,
      vaccinators: 0,
      volunteers: 0,
      recorders: 0,
      supervisors: 0,
      markers: 0,
      coldBoxes: 0,
      personnelCost: 0,
    };

    const vaccineTotals: Record<string, number> = {};

    filteredDayPlans.forEach((plan) => {
      totals.targetPop += plan.targetPopulation || 0;
      totals.vitaminA += plan.vitaminADoses || 0;
      totals.deworming += plan.dewormingDoses || 0;
      totals.carriers += plan.vaccineCarriers || 0;
      totals.icePacks += plan.icePacks || 0;
      totals.distance += parseFloat(plan.distanceKm?.toString() || "0");
      totals.fuel += parseFloat(plan.fuelLiters?.toString() || "0");
      totals.actualVacc += plan.actualVaccinated || 0;
      totals.vialsUsed += plan.actualVialsUsed || 0;
      totals.vialsWasted += plan.actualVialsWasted || 0;
      totals.teams += plan.teamCount || 0;
      totals.vaccinators += plan.vaccinatorsCount || 0;
      totals.volunteers += plan.volunteersCount || 0;
      totals.recorders += plan.recordersCount || 0;
      totals.supervisors += plan.supervisorsCount || 0;
      totals.markers += plan.indelibleMarkers || 0;
      totals.coldBoxes += plan.coldBoxes || 0;
      totals.personnelCost += personnelCostForDay(rosterRates, {
        vaccinatorsCount: plan.vaccinatorsCount,
        volunteersCount: plan.volunteersCount,
        supervisorsCount: plan.supervisorsCount,
        recordersCount: plan.recordersCount,
      });

      const vReq = (plan.vaccinesRequired || {}) as Record<string, number>;
      Object.entries(vReq).forEach(([key, val]) => {
        vaccineTotals[key] = (vaccineTotals[key] || 0) + val;
      });
    });

    return { totals, vaccineTotals };
  }, [filteredDayPlans, rosterRates]);

  const mapCenter = useMemo(() => {
    if (activeFacility && activeFacility.latitude && activeFacility.longitude) {
      return [parseFloat(activeFacility.latitude.toString()), parseFloat(activeFacility.longitude.toString())] as [number, number];
    }
    return [-4.85, 31.6] as [number, number]; // South Sudan default
  }, [activeFacility]);

  // Quick Add Village States
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newVillageName, setNewVillageName] = useState("");
  const [newVillageHtr, setNewVillageHtr] = useState(false);
  const [newVillageLat, setNewVillageLat] = useState("");
  const [newVillageLng, setNewVillageLng] = useState("");
  const [drawMode, setDrawMode] = useState<"pin" | "polygon">("pin");
  const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>([]);

  function QuickAddMapEvents() {
    useMapEvents({
      click(e) {
        if (drawMode === "pin") {
          setNewVillageLat(e.latlng.lat.toFixed(6));
          setNewVillageLng(e.latlng.lng.toFixed(6));
          setPolygonPoints([]);
        } else {
          const updatedPoints = [...polygonPoints, e.latlng];
          setPolygonPoints(updatedPoints);
          
          // Calculate average centroid coordinates
          const sumLat = updatedPoints.reduce((sum, p) => sum + p.lat, 0);
          const sumLng = updatedPoints.reduce((sum, p) => sum + p.lng, 0);
          const avgLat = sumLat / updatedPoints.length;
          const avgLng = sumLng / updatedPoints.length;
          setNewVillageLat(avgLat.toFixed(6));
          setNewVillageLng(avgLng.toFixed(6));
        }
      }
    });
    return null;
  }

  const handleQuickAddVillage = async () => {
    if (!newVillageName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please supply a community/village name.",
        variant: "destructive",
      });
      return;
    }
    if (!newVillageLat || !newVillageLng) {
      toast({
        title: "Validation Error",
        description: "Please drop a pin or draw a polygon on the map to set coordinates.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest<any>("POST", "/api/villages", {
        name: newVillageName,
        assignedFacilityId: Number(sessionPlan?.facilityId),
        isHardToReach: newVillageHtr,
        latitude: newVillageLat,
        longitude: newVillageLng,
      });

      // Refetch villages list
      await queryClient.invalidateQueries({ queryKey: ["/api/villages"] });

      // Automatically check the newly added village in the react-hook-form checklist!
      const currentVisited = form.getValues("communitiesVisited") || [];
      form.setValue("communitiesVisited", [...currentVisited, response.id]);

      toast({
        title: "Community Registered",
        description: `Successfully added "${newVillageName}" and checked it in your itinerary.`,
      });

      // Clear states
      setNewVillageName("");
      setNewVillageHtr(false);
      setNewVillageLat("");
      setNewVillageLng("");
      setPolygonPoints([]);
      setQuickAddOpen(false);
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "Could not register new village.",
        variant: "destructive",
      });
    }
  };

  const villageMap = useMemo(() => {
    const m = new Map<number, string>();
    (villages ?? []).forEach((v) => m.set(v.id, v.name));
    return m;
  }, [villages]);

  const form = useForm<FormValues>({
    resolver: zodResolver(dayPlanFormSchema),
    defaultValues: {
      dayNumber: 1,
      sessionDate: new Date().toISOString().split("T")[0],
      communitiesVisited: [],
      targetPopulation: 50,
      vitaminADoses: 0,
      dewormingDoses: 0,
      vaccineCarriers: 1,
      icePacks: 4,
      chalkSticks: 6,
      tallySheets: 2,
      distanceKm: 10,
      transportType: "road",
      fuelLiters: 2,
    },
  });

  const targetPopInput = form.watch("targetPopulation");
  const watchedVaccinators = form.watch("vaccinatorsCount");
  const watchedVolunteers = form.watch("volunteersCount");
  const watchedSupervisors = form.watch("supervisorsCount");
  const watchedRecorders = form.watch("recordersCount");

  const formPersonnelCost = useMemo(
    () =>
      personnelCostForDay(rosterRates, {
        vaccinatorsCount: watchedVaccinators ?? 0,
        volunteersCount: watchedVolunteers ?? 0,
        supervisorsCount: watchedSupervisors ?? 0,
        recordersCount: watchedRecorders ?? 0,
      }),
    [rosterRates, watchedVaccinators, watchedVolunteers, watchedSupervisors, watchedRecorders],
  );

  // Automatically calculate dynamic dosages shown in the form as user types
  const calculatedFormDoses = useMemo(() => {
    const doses: Record<string, number> = {};
    if (!vaccineConfigs || !targetPopInput) return doses;
    vaccineConfigs.forEach((config) => {
      if (config.isActive) {
        doses[config.name] = Math.ceil(targetPopInput * parseFloat(config.wastageFactor));
      }
    });
    return doses;
  }, [vaccineConfigs, targetPopInput]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const created: any = await apiRequest("POST", `/api/sessions/${id}/days`, data);
      // Snapshot personnel cost at creation time by writing one Personnel
      // budget line per (day, role) using the parent microplan's roster
      // rates. Matches the prefix used by the microplan-level
      // "Sync to Budget" action so future re-syncs find and update the
      // same rows instead of duplicating them.
      const snapshotResult = { written: 0, skipped: 0, failed: 0 };
      if (created?.id && sessionPlan && roster.length > 0) {
        const dayNumber = created.dayNumber ?? data.dayNumber;
        const roleSpecs: Array<{
          field: "vaccinatorsCount" | "volunteersCount" | "supervisorsCount" | "recordersCount";
        }> = [
          { field: "vaccinatorsCount" },
          { field: "volunteersCount" },
          { field: "supervisorsCount" },
          { field: "recordersCount" },
        ];
        for (const spec of roleSpecs) {
          const count = Number((created as any)[spec.field] ?? 0);
          const perDiem = rosterRates[spec.field] || 0;
          if (count <= 0 || perDiem <= 0) continue;
          // Use the same role normalization the rates table uses so
          // "Mobilizer" rows correctly back the volunteersCount bucket
          // (and any other free-text variants).
          const sourceRow = roster.find(
            (r) => rosterRoleToPlanCountField(r.role) === spec.field,
          );
          const fundingSource = sourceRow?.fundingSource || "unspecified";
          const fundingSourceOther =
            fundingSource === "other"
              ? (sourceRow?.fundingSourceOther || "").trim() || null
              : null;
          // Server rejects "unspecified" and "other" without a descriptor —
          // skip those lines and report so the user knows to classify.
          if (
            fundingSource === "unspecified" ||
            (fundingSource === "other" && !fundingSourceOther)
          ) {
            snapshotResult.skipped++;
            continue;
          }
          const roleLabel = sourceRow?.role || spec.field;
          const description = `Personnel · Day ${dayNumber} · ${roleLabel} — ${count} × K${perDiem}`;
          try {
            await apiRequest("POST", "/api/budget-items", {
              facilityId: sessionPlan.facilityId,
              sessionId: sessionPlan.id,
              category: "Personnel",
              description,
              unitCost: String(perDiem),
              quantity: count,
              totalCost: String(count * perDiem),
              quarter: sessionPlan.quarter,
              year: sessionPlan.year,
              approvalStatus: "draft",
              fundingSource,
              fundingSourceOther,
              source: "roster_sync",
            });
            snapshotResult.written++;
          } catch (e) {
            // Per-line failures don't roll back the day plan — surface
            // them in the toast so the user can fix and re-sync.
            console.warn("Personnel budget line snapshot failed", e);
            snapshotResult.failed++;
          }
        }
      }
      return { created, snapshotResult };
    },
    onSuccess: ({ snapshotResult }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${id}/days`] });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      form.reset();
      const { written, skipped, failed } = snapshotResult;
      let description = "Your session day-by-day plan has been registered successfully.";
      let variant: "default" | "destructive" = "default";
      if (hasRosterRates) {
        if (written > 0 && failed === 0 && skipped === 0) {
          description = `Day plan saved. Wrote ${written} Personnel budget line(s) from the roster.`;
        } else if (written > 0 || skipped > 0 || failed > 0) {
          const parts: string[] = [];
          if (written > 0) parts.push(`${written} written`);
          if (skipped > 0) parts.push(`${skipped} skipped (set funding source)`);
          if (failed > 0) parts.push(`${failed} failed`);
          description = `Day plan saved. Personnel budget: ${parts.join(", ")}.`;
          if (failed > 0 || skipped > 0) variant = "destructive";
        }
      }
      toast({ title: "Day Plan Saved", description, variant });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: number) => apiRequest("DELETE", `/api/sessions/days/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${id}/days`] });
      toast({ title: "Day Plan Deleted", description: "The day plan has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: FormValues) => {
    // Generate vaccinesRequired payload based on configs
    const vaccinesRequired: Record<string, number> = {};
    if (vaccineConfigs) {
      vaccineConfigs.forEach((config) => {
        if (config.isActive) {
          vaccinesRequired[config.id.toString()] = Math.ceil(
            values.targetPopulation * parseFloat(config.wastageFactor)
          );
        }
      });
    }

    const payload = {
      ...values,
      sessionDate: new Date(values.sessionDate).toISOString(),
      distanceKm: values.distanceKm.toString(),
      fuelLiters: values.fuelLiters.toString(),
      vaccinesRequired,
      teamCount: values.teamCount ?? 1,
      vaccinatorsCount: values.vaccinatorsCount ?? 1,
      volunteersCount: values.volunteersCount ?? 1,
      recordersCount: values.recordersCount ?? 0,
      supervisorsCount: values.supervisorsCount ?? 0,
      indelibleMarkers: values.indelibleMarkers ?? 0,
      coldBoxes: values.coldBoxes ?? 0,
      leadVaccinator: values.leadVaccinator.trim(),
    };

    createMutation.mutate(payload);
  };

  const handleOpenAddDialog = () => {
    setEditingPlan(null);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    form.reset({
      dayNumber: (dayPlans?.length ?? 0) + 1,
      sessionDate: d.toISOString().split("T")[0],
      communitiesVisited: [],
      targetPopulation: 50,
      vitaminADoses: 25,
      dewormingDoses: 20,
      vaccineCarriers: 1,
      icePacks: 4,
      chalkSticks: 6,
      tallySheets: 2,
      distanceKm: 15,
      transportType: sessionPlan?.transportMode as any || "road",
      fuelLiters: 5,
      teamCount: 1,
      // Pre-fill role counts from the parent microplan's staffing roster
      // headcount so facility staff don't retype what's already planned.
      // Falls back to sensible defaults when no roster is attached.
      vaccinatorsCount: rosterHeadcounts.vaccinatorsCount || 2,
      volunteersCount: rosterHeadcounts.volunteersCount || 2,
      recordersCount: rosterHeadcounts.recordersCount || 1,
      supervisorsCount: rosterHeadcounts.supervisorsCount || 1,
      indelibleMarkers: 2,
      coldBoxes: 1,
      leadVaccinator: "",
    });
    setDialogOpen(true);
  };

  // Export to Excel Engine
  const exportToExcel = () => {
    if (!dayPlans || dayPlans.length === 0 || !vaccineConfigs) return;

    const isCampaign = sessionPlan?.planType === "campaign";
    // Prepare headers
    const headers = [
      "Day",
      "Date",
      "Communities Visited",
      "Target Population",
      ...vaccineConfigs.filter(c => c.isActive).map(c => `${c.name} Doses`),
      "Vit A Doses",
      "Deworming Doses",
      "Vaccine Carriers",
      "Ice Packs",
      ...(isCampaign ? ["Teams", "Vaccinators", "Volunteers", "Recorders", "Supervisors", "Indelible Markers", "Cold Boxes"] : []),
      "Chalk Sticks",
      "Tally Sheets",
      "Distance (km)",
      "Transport Type",
      "Fuel (liters)",
      "Personnel Cost (K)",
    ];

    // Prepare rows
    const rows = dayPlans.map((plan) => {
      const vReq = (plan.vaccinesRequired || {}) as Record<string, number>;
      const vaccineCols = vaccineConfigs
        .filter(c => c.isActive)
        .map((config) => vReq[config.id.toString()] ?? 0);

      const comms = Array.isArray(plan.communitiesVisited)
        ? plan.communitiesVisited.map((cId) => villageMap.get(cId) ?? `#${cId}`).join(", ")
        : "";

      return [
        `Day ${plan.dayNumber}`,
        format(new Date(plan.sessionDate), "yyyy-MM-dd"),
        comms,
        plan.targetPopulation,
        ...vaccineCols,
        plan.vitaminADoses,
        plan.dewormingDoses,
        plan.vaccineCarriers,
        plan.icePacks,
        ...(isCampaign ? [
          plan.teamCount ?? 1,
          plan.vaccinatorsCount ?? 1,
          plan.volunteersCount ?? 1,
          plan.recordersCount ?? 0,
          plan.supervisorsCount ?? 0,
          plan.indelibleMarkers ?? 0,
          plan.coldBoxes ?? 0
        ] : []),
        plan.chalkSticks,
        plan.tallySheets,
        parseFloat(plan.distanceKm?.toString() || "0"),
        plan.transportType,
        parseFloat(plan.fuelLiters?.toString() || "0"),
        hasRosterRates
          ? personnelCostForDay(rosterRates, {
              vaccinatorsCount: plan.vaccinatorsCount,
              volunteersCount: plan.volunteersCount,
              supervisorsCount: plan.supervisorsCount,
              recordersCount: plan.recordersCount,
            })
          : 0,
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`UNICEF Digital EPI Session Itinerary & Commodity Plan - ${sessionPlan?.name || "Microplan"}`],
      [`Health Facility: ${facilityName}`],
      [],
      headers,
      ...rows,
    ]);

    // Apply some styling metadata
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Session Day Plans");

    // Output file
    XLSX.writeFile(workbook, `${sessionPlan?.name || "microplan"}_day_plans.xlsx`);
    toast({
      title: "Excel Exported Successfully",
      description: "Your professional UNICEF vaccination planner spreadsheet has been downloaded.",
    });
  };

  if (loadingSession || loadingDays) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <MicroplanStepper currentStep={8} activeSessionId={Number(id)} facilityId={sessionPlan?.facilityId ?? null} />

      {isLocked && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-3 text-xs font-semibold shadow-md flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <Info className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>This microplan is Approved & Locked. Dynamic editing or day itinerary adjustments are restricted.</span>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{sessionPlan?.name}</h1>
              <Badge variant="secondary" className="capitalize">
                {sessionPlan?.sessionType} Session
              </Badge>
              {isSessionPendingSync && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-medium px-1.5 py-0 h-5"
                  data-testid={`badge-pending-sync-${sessionIdNum}`}
                  title="This session has changes saved on this device that haven't reached the server yet."
                >
                  <CloudOff className="h-3 w-3" />
                  Pending sync
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {fullGeoHeader} · Q{sessionPlan?.quarter} {sessionPlan?.year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dayPlans && dayPlans.length > 0 && (
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export UNICEF Excel</span>
            </Button>
          )}

          <Button onClick={handleOpenAddDialog} disabled={isLocked} className="gap-1 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" />
            <span>Add Session Day</span>
          </Button>
        </div>
      </div>

      {/* Geo cascade filter (Province → District → Facility) */}
      <GeoCascadeFilter
        provinceId={geoProvinceId}
        districtId={geoDistrictId}
        facilityId={geoFacilityId}
        onProvinceChange={setGeoProvinceId}
        onDistrictChange={setGeoDistrictId}
        onFacilityChange={setGeoFacilityId}
        showFacility
        provinces={provinces ?? []}
        districts={districts ?? []}
        facilities={facilities ?? []}
        testIdPrefix="sessiondayplans"
      />

      {/* Triangulation Dashboard Grid */}
      {dayPlans && dayPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {/* Card 1: Itinerary Completion */}
          <Card className="border-border/40 bg-card/45 backdrop-blur-md shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span>Itinerary Completion</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{stats.conductedDays}</span>
                <span className="text-xs text-muted-foreground">/ {stats.totalDays} Days Conducted</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span>{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-500" style={{ width: `${stats.completionRate}%` }}></div>
                </div>
              </div>
              <div className="flex gap-3 mt-3 text-[11px] text-muted-foreground">
                <span>Planned: {stats.plannedDays}</span>
                <span>•</span>
                <span>Cancelled: {stats.cancelledDays}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Demographic Coverage */}
          <Card className="border-border/40 bg-card/45 backdrop-blur-md shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span>Demographic Coverage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{stats.actualVaccinated.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ {stats.targetPop.toLocaleString()} Target Pop</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Coverage Rate</span>
                  <span>{stats.coverageRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${Math.min(stats.coverageRate, 100)}%` }}></div>
                </div>
              </div>
              {stats.coverageRate > 100 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> Exceeded baseline target population
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Vaccine Utilization & Wastage */}
          <Card className="border-border/40 bg-card/45 backdrop-blur-md shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Vaccine Utilization & Wastage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{stats.wastageRate}%</span>
                <span className="text-xs text-muted-foreground">Wastage Rate</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Used: {stats.totalVialsUsed} vials</span>
                  <span>Wasted: {stats.totalVialsWasted} vials</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(0, 100 - stats.wastageRate)}%` }}></div>
                </div>
              </div>
              {stats.wastageRate > 15 ? (
                <div className="mt-2.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-2.5 text-[10px] font-semibold flex items-start gap-1.5 leading-snug">
                  <Info className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                  <span>WARNING: Vaccine wastage rate is {stats.wastageRate}%, exceeding the WHO standard 15% threshold! Review cold chain storage, open vials limits, and outreach planning immediately.</span>
                </div>
              ) : (
                stats.totalVials > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Wastage rate within acceptable limits
                  </p>
                )
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid View */}
      {dayPlans && dayPlans.length > 0 ? (
        <Card className="border-border/40 backdrop-blur-md bg-card/45 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
              Day-by-Day Commodity & Dosing Grid (16-Column Planners)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1400px]">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/40 font-semibold border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 border-r border-border/40">Day</th>
                  <th className="px-4 py-3 border-r border-border/40">Date</th>
                  <th className="px-4 py-3 border-r border-border/40">Province</th>
                  <th className="px-4 py-3 border-r border-border/40">District</th>
                  <th className="px-4 py-3 border-r border-border/40">Facility</th>
                  <th className="px-4 py-3 border-r border-border/40 min-w-[200px]">Communities Visited</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Target Pop</th>
                  {vaccineConfigs?.filter(c => c.isActive).map((config) => (
                    <th key={config.id} className="px-4 py-3 border-r border-border/40 text-center bg-primary/5">
                      {config.name} (doses)
                    </th>
                  ))}
                  <th className="px-4 py-3 border-r border-border/40 text-center">Vit A</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Deworm</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Carriers</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Ice Packs</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Distance</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Fuel (L)</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Personnel Cost (K)</th>
                  {sessionPlan?.planType === "campaign" && (
                    <>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Teams</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Vaccinators</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Volunteers</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Recorders</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Supervisors</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Markers</th>
                      <th className="px-3 py-3 border-r border-border/40 text-center">Cold Boxes</th>
                    </>
                  )}
                  <th className="px-4 py-3 border-r border-border/40 text-center">Execution Status</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Actual Vacc</th>
                  <th className="px-4 py-3 border-r border-border/40 text-center">Vials (U/W)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredDayPlans.map((plan) => {
                  const vReq = (plan.vaccinesRequired || {}) as Record<string, number>;
                  const TransportIcon = transportIcons[plan.transportType || "road"] || Car;

                  return (
                    <tr key={plan.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-semibold border-r border-border/30">Day {plan.dayNumber}</td>
                      <td className="px-4 py-3 border-r border-border/30">
                        {format(new Date(plan.sessionDate), "MMM dd, yyyy")}
                      </td>
                      <td className="px-4 py-3 border-r border-border/30 text-muted-foreground text-xs">
                        {(() => {
                          const fac = activeFacility;
                          const dist = fac ? districts?.find((d) => d.id === fac.districtId) : null;
                          const prov = dist ? provinces?.find((p) => p.id === dist.provinceId) : null;
                          return prov?.name ?? "—";
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r border-border/30 text-muted-foreground text-xs">
                        {(() => {
                          const fac = activeFacility;
                          const dist = fac ? districts?.find((d) => d.id === fac.districtId) : null;
                          return dist?.name ?? "—";
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r border-border/30 text-muted-foreground text-xs">
                        {activeFacility?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 border-r border-border/30">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(plan.communitiesVisited) &&
                            plan.communitiesVisited.map((cId) => (
                              <Badge key={cId} variant="outline" className="bg-background/40">
                                {villageMap.get(cId) ?? `#${cId}`}
                              </Badge>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium border-r border-border/30 text-amber-600 dark:text-amber-400">
                        {plan.targetPopulation}
                      </td>
                      {vaccineConfigs?.filter(c => c.isActive).map((config) => (
                        <td key={config.id} className="px-4 py-3 text-center border-r border-border/30 bg-primary/5 font-semibold text-primary">
                          {vReq[config.id.toString()] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center border-r border-border/30">{plan.vitaminADoses}</td>
                      <td className="px-4 py-3 text-center border-r border-border/30">{plan.dewormingDoses}</td>
                      <td className="px-4 py-3 text-center border-r border-border/30 font-semibold">{plan.vaccineCarriers}</td>
                      <td className="px-4 py-3 text-center border-r border-border/30">{plan.icePacks}</td>
                      <td className="px-4 py-3 text-center border-r border-border/30">
                        <div className="flex items-center justify-center gap-1">
                          <TransportIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{plan.distanceKm} km</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-border/30 font-medium text-blue-600 dark:text-blue-400">
                        {plan.fuelLiters} L
                      </td>
                      <td className="px-4 py-3 text-center border-r border-border/30 font-semibold text-purple-600 dark:text-purple-400">
                        {hasRosterRates
                          ? `K ${personnelCostForDay(rosterRates, {
                              vaccinatorsCount: plan.vaccinatorsCount,
                              volunteersCount: plan.volunteersCount,
                              supervisorsCount: plan.supervisorsCount,
                              recordersCount: plan.recordersCount,
                            }).toLocaleString()}`
                          : "—"}
                      </td>
                      {sessionPlan?.planType === "campaign" && (
                        <>
                          <td className="px-3 py-3 text-center border-r border-border/30 font-medium">{plan.teamCount ?? 1}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.vaccinatorsCount ?? 1}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.volunteersCount ?? 1}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.recordersCount ?? 0}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.supervisorsCount ?? 0}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.indelibleMarkers ?? 0}</td>
                          <td className="px-3 py-3 text-center border-r border-border/30">{plan.coldBoxes ?? 0}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center border-r border-border/30">
                        {plan.executionStatus === "conducted" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold uppercase text-[10px]">Conducted</Badge>
                        ) : plan.executionStatus === "cancelled" ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-semibold uppercase text-[10px]">Cancelled</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold uppercase text-[10px]">Planned</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-border/30 font-medium text-emerald-600 dark:text-emerald-400">
                        {plan.executionStatus === "conducted" ? plan.actualVaccinated : "-"}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-border/30 text-xs">
                        {plan.executionStatus === "conducted" ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {plan.actualVialsUsed} U / {plan.actualVialsWasted} W
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenOutcomeDialog(plan)}
                            className="h-8 px-2.5 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/5"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>Log Outcome</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(plan.id)}
                            disabled={isLocked}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/30 border-t-2 border-border/50 font-semibold text-foreground text-xs">
                <tr>
                  <td className="px-4 py-3 border-r border-border/30">Total</td>
                  <td className="px-4 py-3 border-r border-border/30">-</td>
                  <td className="px-4 py-3 border-r border-border/30">-</td>
                  <td className="px-4 py-3 border-r border-border/30">-</td>
                  <td className="px-4 py-3 border-r border-border/30">-</td>
                  <td className="px-4 py-3 border-r border-border/30">-</td>
                  <td className="px-4 py-3 text-center border-r border-border/30 text-amber-600 dark:text-amber-400">
                    {tableTotals?.totals.targetPop.toLocaleString()}
                  </td>
                  {vaccineConfigs?.filter(c => c.isActive).map((config) => (
                    <td key={config.id} className="px-4 py-3 text-center border-r border-border/30 bg-primary/5 text-primary">
                      {tableTotals?.vaccineTotals[config.id.toString()]?.toLocaleString() ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center border-r border-border/30">{tableTotals?.totals.vitaminA.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center border-r border-border/30">{tableTotals?.totals.deworming.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center border-r border-border/30">{tableTotals?.totals.carriers.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center border-r border-border/30">{tableTotals?.totals.icePacks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center border-r border-border/30">
                    {tableTotals?.totals.distance.toFixed(1)} km
                  </td>
                  <td className="px-4 py-3 text-center border-r border-border/30 text-blue-600 dark:text-blue-400">
                    {tableTotals?.totals.fuel.toFixed(1)} L
                  </td>
                  <td className="px-4 py-3 text-center border-r border-border/30 text-purple-600 dark:text-purple-400">
                    {hasRosterRates
                      ? `K ${(tableTotals?.totals.personnelCost ?? 0).toLocaleString()}`
                      : "—"}
                  </td>
                  {sessionPlan?.planType === "campaign" && (
                    <>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.teams.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.vaccinators.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.volunteers.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.recorders.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.supervisors.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.markers.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center border-r border-border/30">{tableTotals?.totals.coldBoxes.toLocaleString()}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-center border-r border-border/30">-</td>
                  <td className="px-4 py-3 text-center border-r border-border/30 text-emerald-600 dark:text-emerald-400">
                    {stats.conductedDays > 0 ? tableTotals?.totals.actualVacc.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-center border-r border-border/30">
                    {stats.conductedDays > 0 ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {tableTotals?.totals.vialsUsed} U / {tableTotals?.totals.vialsWasted} W
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 backdrop-blur-sm bg-card/45 p-12 text-center">
          <div className="mx-auto max-w-sm space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">No days planned yet</h2>
            <p className="text-sm text-muted-foreground">
              Define the day-by-day vaccination team itinerary, targeted population, visited villages, and necessary commodity supplies.
            </p>
            <Button onClick={handleOpenAddDialog} className="shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Day 1 Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vaccination Session Itinerary Day</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                const errorMsg =
                  errors.communitiesVisited?.message ||
                  errors.targetPopulation?.message ||
                  errors.dayNumber?.message ||
                  "Please select at least one community/village visited.";
                toast({
                  title: "Itinerary Validation Failed",
                  description: errorMsg,
                  variant: "destructive",
                });
              })}
              className="space-y-6 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dayNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Visited Villages Selector */}
              <FormField
                control={form.control}
                name="communitiesVisited"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between items-center w-full">
                      <span>Communities / Villages Visited *</span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setQuickAddOpen(!quickAddOpen)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 p-0 h-auto hover:no-underline"
                      >
                        {quickAddOpen ? "Hide Quick-Add" : "Quick-Add Village / Community"}
                      </Button>
                    </FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-3 max-h-[160px] overflow-y-auto bg-muted/20">
                      {(villages ?? []).map((village) => {
                        const checked = field.value.includes(village.id);
                        return (
                          <div
                            key={village.id}
                            onClick={() => {
                              if (checked) {
                                field.onChange(field.value.filter((id) => id !== village.id));
                              } else {
                                field.onChange([...field.value, village.id]);
                              }
                            }}
                            className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer text-xs select-none transition-all ${
                              checked
                                ? "bg-primary/10 border-primary text-primary font-semibold"
                                : "hover:bg-muted"
                            }`}
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                            }`}>
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <span className="truncate">{village.name}</span>
                          </div>
                        );
                      })}
                      {(!villages || villages.length === 0) && (
                        <div className="col-span-full text-center text-xs text-muted-foreground py-4">
                          No villages assigned to this facility.
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collapsible Quick-Add Community Sub-form */}
              {quickAddOpen && (
                <div className="space-y-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      Quick-Add Community / Village
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setQuickAddOpen(false);
                        setPolygonPoints([]);
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="new-village-name" className="text-xs font-semibold text-muted-foreground uppercase">
                        Village / Community Name *
                      </Label>
                      <Input
                        id="new-village-name"
                        placeholder="e.g. Nimule A"
                        value={newVillageName}
                        onChange={(e) => setNewVillageName(e.target.value)}
                        className="bg-background rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="new-village-htr"
                        checked={newVillageHtr}
                        onChange={(e) => setNewVillageHtr(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-background accent-indigo-600"
                      />
                      <Label htmlFor="new-village-htr" className="text-xs font-semibold text-foreground select-none cursor-pointer">
                        Mark as Hard-to-Reach (HTR)
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="new-village-lat" className="text-xs font-semibold text-muted-foreground uppercase">
                        Latitude
                      </Label>
                      <Input
                        id="new-village-lat"
                        placeholder="-4.85"
                        value={newVillageLat}
                        readOnly
                        className="bg-background/50 rounded-xl cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-village-lng" className="text-xs font-semibold text-muted-foreground uppercase">
                        Longitude
                      </Label>
                      <Input
                        id="new-village-lng"
                        placeholder="31.6"
                        value={newVillageLng}
                        readOnly
                        className="bg-background/50 rounded-xl cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Select Interactive Mapping Mode
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={drawMode === "pin" ? "default" : "outline"}
                          onClick={() => {
                            setDrawMode("pin");
                            setPolygonPoints([]);
                          }}
                          className="h-7 text-xs rounded-lg"
                        >
                          Drop Pin Mode
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={drawMode === "polygon" ? "default" : "outline"}
                          onClick={() => setDrawMode("polygon")}
                          className="h-7 text-xs rounded-lg"
                        >
                          Draw Polygon Mode
                        </Button>
                        {drawMode === "polygon" && polygonPoints.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPolygonPoints([]);
                              setNewVillageLat("");
                              setNewVillageLng("");
                            }}
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          >
                            Reset Polygon
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="relative h-[200px] w-full rounded-xl overflow-hidden border border-border/80 sticky z-10">
                      <MapContainer
                        center={mapCenter}
                        zoom={13}
                        className="h-full w-full"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap contributors"
                        />
                        <PopulationWmsLayer overlay={populationOverlay} />
                        <QuickAddMapEvents />
                        {newVillageLat && newVillageLng && drawMode === "pin" && (
                          <Marker position={[parseFloat(newVillageLat), parseFloat(newVillageLng)]} icon={OFFLINE_VILLAGE_ICON} />
                        )}
                        {drawMode === "polygon" && polygonPoints.length > 0 && (
                          <>
                            {polygonPoints.map((p, idx) => (
                              <Marker key={idx} position={p} icon={OFFLINE_VILLAGE_ICON} />
                            ))}
                            <LeafletPolygon positions={polygonPoints} pathOptions={{ color: "indigo" }} />
                          </>
                        )}
                      </MapContainer>
                      <PopulationOverlayToggle
                        overlay={populationOverlay}
                        className="absolute top-2 right-2 z-[400]"
                      />
                      <PopulationOverlayLegend
                        overlay={populationOverlay}
                        className="absolute bottom-2 right-2 z-[400]"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                      {drawMode === "pin"
                        ? "Click anywhere on the map to drop a coordinate marker pin."
                        : `Click multiple locations on the map to outline the catchment boundary. Average centroid: ${polygonPoints.length} vertices plotted.`}
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleQuickAddVillage}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs h-9"
                    >
                      Save New Community & Auto-Select
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="targetPopulation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Population</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vitaminADoses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vitamin A Doses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dewormingDoses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deworming Doses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dynamic calculations details block */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Layers className="h-4 w-4" />
                  <span>Calculated Vaccine Supplies (Target * Wastage Factor)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {vaccineConfigs?.filter(c => c.isActive).map((config) => {
                    const reqDoses = calculatedFormDoses[config.name] ?? 0;
                    return (
                      <div key={config.id} className="p-2 border rounded-md bg-background/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold truncate">
                          {config.name}
                        </p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{reqDoses}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cold chain logistics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-sky-500" />
                  <span>Cold Chain & Logistics</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="vaccineCarriers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Carriers</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="icePacks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ice Packs</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chalkSticks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Chalk Sticks</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tallySheets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tally Sheets</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Campaign Human Resources & Supplies (UNICEF Day-by-Day Logistics) */}
              {sessionPlan?.planType === "campaign" && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Users className="h-4 w-4" />
                    <span>SIA Campaign Staff & Supplies</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="teamCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Teams</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leadVaccinator"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">Lead Vaccinator (name) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Nurse Mary Aluko"
                              data-testid="input-lead-vaccinator"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vaccinatorsCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Vaccinators</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="volunteersCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Volunteers / Mobilizers</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recordersCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Recorders</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supervisorsCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Supervisors</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="indelibleMarkers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Indelible Markers</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="coldBoxes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cold Boxes</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Live personnel cost preview — derived from the parent
                      microplan's staffing roster per-diem × the role counts
                      typed above. Surfaces what this session-day will cost
                      before it's even saved. */}
                  <div
                    className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
                    data-testid="form-personnel-cost"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Personnel cost (from microplan roster)
                      </div>
                      <div className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                        K{formPersonnelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {!hasRosterRates ? (
                      <div className="text-[10px] text-muted-foreground mt-1 italic">
                        No per-diem rates set on the microplan staffing roster yet — open the microplan to add them.
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {(watchedVaccinators ?? 0)} vacc × K{rosterRates.vaccinatorsCount || 0}
                        {" · "}
                        {(watchedVolunteers ?? 0)} vol × K{rosterRates.volunteersCount || 0}
                        {" · "}
                        {(watchedSupervisors ?? 0)} sup × K{rosterRates.supervisorsCount || 0}
                        {" · "}
                        {(watchedRecorders ?? 0)} rec × K{rosterRates.recordersCount || 0}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transport logistics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>Transport & Distance</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="distanceKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Distance (km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pick mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="road">Road (Car/Bike)</SelectItem>
                            <SelectItem value="walking">Walking / Foot</SelectItem>
                            <SelectItem value="boat">Boat / Riverine</SelectItem>
                            <SelectItem value="air">Air (Flight)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuelLiters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Fuel Needed (liters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving Plan..." : "Add to Itinerary"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Execution Outcome Logging Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>Log Execution Outcome - Day {selectedDayPlan?.dayNumber}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Execution Status</Label>
              <Select value={outcomeStatus} onValueChange={(val) => setOutcomeStatus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned (Unexecuted)</SelectItem>
                  <SelectItem value="conducted">Conducted (Executed)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {outcomeStatus === "conducted" && (
              <div className="space-y-4 border rounded-xl p-4 bg-muted/20 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                      <span>Actually Vaccinated *</span>
                      <span className="text-amber-500 font-medium">Target: {selectedDayPlan?.targetPopulation}</span>
                    </Label>
                    <Input
                      type="number"
                      value={actualVaccinated}
                      onChange={(e) => setActualVaccinated(parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Vials Used *</Label>
                      <Input
                        type="number"
                        value={actualVialsUsed}
                        onChange={(e) => setActualVialsUsed(parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Vials Wasted *</Label>
                      <Input
                        type="number"
                        value={actualVialsWasted}
                        onChange={(e) => setActualVialsWasted(parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                  </div>

                  {actualVialsUsed + actualVialsWasted > 0 && (
                    <div className="mt-2 text-xs flex justify-between font-medium">
                      <span>Total Vials: {actualVialsUsed + actualVialsWasted}</span>
                      <span className={((actualVialsWasted / (actualVialsUsed + actualVialsWasted)) * 100) > 15 ? "text-red-500 font-bold animate-pulse" : "text-emerald-500 font-semibold"}>
                        Wastage Rate: {((actualVialsWasted / (actualVialsUsed + actualVialsWasted)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Execution Date</Label>
              <Input
                type="date"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Execution Notes / Remarks</Label>
              <textarea
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter any qualitative feedback from the field (e.g. cold chain delays, weather barriers, population migration)."
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOutcomeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedDayPlan) {
                  logOutcomeMutation.mutate({
                    id: selectedDayPlan.id,
                    executionStatus: outcomeStatus,
                    actualVaccinated: outcomeStatus === "conducted" ? actualVaccinated : null,
                    actualVialsUsed: outcomeStatus === "conducted" ? actualVialsUsed : null,
                    actualVialsWasted: outcomeStatus === "conducted" ? actualVialsWasted : null,
                    executedAt: executedAt || null,
                    executionNotes: executionNotes || null,
                  });
                }
              }}
              disabled={logOutcomeMutation.isPending}
            >
              {logOutcomeMutation.isPending ? "Saving..." : "Save Outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
