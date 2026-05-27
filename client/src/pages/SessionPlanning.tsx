import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/DataTable";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { buildGeoMaps, withGeoColumns } from "@/lib/geoHierarchy";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { MicroplanStepper } from "@/components/MicroplanStepper";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canCreateSessionPlan, canApproveSessionPlan } from "@/lib/permissions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { offlineDb, enqueueOutbox } from "@/lib/offlineDb";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Car,
  Footprints,
  Ship,
  Plane,
  ShieldCheck,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  insertSessionPlanSchema,
  type SessionPlan,
  type Facility,
  type Province,
  type District,
  type InsertSessionPlan,
  type Microplan,
} from "@shared/schema";
import { z } from "zod";

const sessionFormSchema = insertSessionPlanSchema.extend({
  name: z.string().min(2, "Name is required"),
  facilityId: z.number({ required_error: "Pick a facility before saving" }),
  microplanId: z.number({ required_error: "Pick a parent microplan before saving" }),
});

type PlanTypeFilter = "routine" | "campaign";

const transportIcons: Record<string, typeof Car> = {
  walking: Footprints,
  road: Car,
  boat: Ship,
  air: Plane,
};

export default function SessionPlanning({
  planTypeFilter = "routine",
  lockedMicroplanId,
}: { planTypeFilter?: PlanTypeFilter; lockedMicroplanId?: number } = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isDetailMode = lockedMicroplanId != null;
  const parentMicroplanTypeForRoute: "facility_routine" | "sia_campaign" =
    planTypeFilter === "campaign" ? "sia_campaign" : "facility_routine";
  const pageTitle = planTypeFilter === "campaign" ? "SIA Campaigns" : "Routine Microplan";
  const pageSubtitle =
    planTypeFilter === "campaign"
      ? "Plan supplementary immunization campaigns (measles, polio, MR catch-up) and the sessions inside each campaign microplan."
      : "Plan routine immunization sessions inside each facility's quarterly microplan.";
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  const skipRegionLevel = tenantInfo?.settings?.skipRegionLevel ?? (tenantInfo?.countryCode === "ZMB" || false);
  const rawAdminLabels = tenantInfo?.settings?.adminLevelLabels ?? {
    level1: "Province",
    level2: "District",
    level3: "Facility",
    level4: "Constituency",
    level5: "Ward",
  };
  const adminLabels = useMemo(() => {
    return skipRegionLevel ? {
      level1: rawAdminLabels.level2 || "Province",
      level2: rawAdminLabels.level3 || "District",
      level3: rawAdminLabels.level4 || "Facility",
    } : {
      level1: rawAdminLabels.level2 || "Province",
      level2: rawAdminLabels.level3 || "District",
      level3: rawAdminLabels.level4 || "Facility",
    };
  }, [skipRegionLevel, rawAdminLabels]);

  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  // Geo cascade filter (separate from create-dialog selection)
  const [geoFilterProvinceId, setGeoFilterProvinceId] = useState<number | null>(null);
  const [geoFilterDistrictId, setGeoFilterDistrictId] = useState<number | null>(null);
  const [geoFilterFacilityId, setGeoFilterFacilityId] = useState<number | null>(null);

  const isCreator = canCreateSessionPlan(user);
  const isReviewer = canApproveSessionPlan(user);

  /*
  // Original Code: Direct online-only useQuery fetch calls that fail when offline.
  const { data: sessions, isLoading: loadingSessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: facilities } = useQuery<Facility[]>({ queryKey: ["/api/facilities"] });
  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
    enabled: isCreator,
  });
  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
    enabled: isCreator,
  });
  */

  // Updated Code: Offline-aware useQuery configurations returning local Dexie IndexedDB cache when navigator.onLine is false.
  const { data: sessions, isLoading: loadingSessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.sessionPlans.toArray()) as unknown as SessionPlan[];
      }
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.facilities.toArray()) as unknown as Facility[];
      }
      const res = await fetch("/api/facilities");
      if (!res.ok) throw new Error("Failed to load facilities");
      return res.json();
    },
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
    enabled: isCreator,
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.provinces.toArray()) as unknown as Province[];
      }
      const res = await fetch("/api/provinces");
      if (!res.ok) throw new Error("Failed to load provinces");
      return res.json();
    },
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
    enabled: isCreator,
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.districts.toArray()) as unknown as District[];
      }
      const res = await fetch("/api/districts");
      if (!res.ok) throw new Error("Failed to load districts");
      return res.json();
    },
  });

  // Master microplans of the route's planType. Required for the cascade:
  // a session must belong to a parent microplan of matching planType.
  const { data: allMicroplans } = useQuery<Microplan[]>({
    queryKey: ["/api/microplans"],
    queryFn: async () => {
      const res = await fetch("/api/microplans");
      if (!res.ok) throw new Error("Failed to load microplans");
      return res.json();
    },
  });

  const microplansOfRouteType = useMemo(
    () =>
      (allMicroplans ?? []).filter(
        (m) => m.planType === parentMicroplanTypeForRoute,
      ),
    [allMicroplans, parentMicroplanTypeForRoute],
  );

  const filteredDistricts = useMemo(
    () => (provinceId ? (districts ?? []).filter((d) => Number(d.provinceId) === Number(provinceId)) : []),
    [districts, provinceId],
  );
  const filteredFacilities = useMemo(
    () => (districtId ? (facilities ?? []).filter((f) => Number(f.districtId) === Number(districtId)) : []),
    [facilities, districtId],
  );

  // Pre-fill cascade if the user is already pinned to a facility/district/province
  useEffect(() => {
    if (!isCreator || !user || !facilities || !districts) return;
    if (user.facilityId) {
      const f = facilities.find((x) => x.id === user.facilityId);
      if (f) {
        const d = districts.find((x) => x.id === f.districtId);
        if (d) {
          setProvinceId((p) => p ?? d.provinceId);
          setDistrictId((d2) => d2 ?? f.districtId);
        }
      }
    } else if (user.districtId) {
      const d = districts.find((x) => x.id === user.districtId);
      if (d) {
        setProvinceId((p) => p ?? d.provinceId);
        setDistrictId((d2) => d2 ?? user.districtId!);
      }
    } else if (user.provinceId) {
      setProvinceId((p) => p ?? user.provinceId!);
    }
  }, [isCreator, user, facilities, districts]);

  const form = useForm<InsertSessionPlan>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: "",
      sessionType: "static",
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      status: "planned",
      approvalStatus: "draft",
      facilityId: user?.facilityId ?? undefined,
      microplanId: (lockedMicroplanId ?? undefined) as any,
    },
  });

  // In detail mode, keep the form's microplanId pinned to the locked id.
  useEffect(() => {
    if (lockedMicroplanId != null) {
      form.setValue("microplanId" as any, lockedMicroplanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedMicroplanId]);

  // When a parent microplan is picked, copy its facility/quarter/year into the
  // session form so the user does not have to re-enter them (and they always match).
  const watchedMicroplanId = form.watch("microplanId" as any);
  useEffect(() => {
    if (!watchedMicroplanId) return;
    const mp = microplansOfRouteType.find((m) => m.id === Number(watchedMicroplanId));
    if (!mp) return;
    if (mp.facilityId) {
      form.setValue("facilityId", mp.facilityId);
      const fac = (facilities ?? []).find((f) => f.id === mp.facilityId);
      if (fac) {
        const d = (districts ?? []).find((x) => x.id === fac.districtId);
        if (d) {
          setProvinceId(d.provinceId);
          setDistrictId(fac.districtId);
        }
      }
    }
    if (mp.quarter) form.setValue("quarter", mp.quarter);
    if (mp.year) form.setValue("year", mp.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedMicroplanId, microplansOfRouteType, facilities, districts]);

  // Keep facilityId in the form synced with the cascade
  useEffect(() => {
    const current = form.getValues("facilityId");
    if (current && filteredFacilities.length && !filteredFacilities.find((f) => f.id === current)) {
      form.setValue("facilityId", undefined as any);
    }
  }, [filteredFacilities, form]);

  /*
  // Original Code: Direct online-only useMutation apiRequest post call.
  const createMutation = useMutation({
    mutationFn: async (data: InsertSessionPlan) => apiRequest("POST", "/api/sessions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      form.reset({
        name: "",
        sessionType: "static",
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        year: new Date().getFullYear(),
        status: "planned",
        approvalStatus: "draft",
        facilityId: user?.facilityId ?? undefined,
      });
      toast({
        title: "Microplan submitted",
        description:
          "Your microplan has been saved as a draft. Submit it for approval when you're ready.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });
  */

  // Updated Code: Offline-aware useMutation that writes directly to offlineDb and enqueues to sync outbox when offline.
  const createMutation = useMutation({
    mutationFn: async (data: InsertSessionPlan) => {
      if (!navigator.onLine) {
        // Generate a random temporary negative ID for local tracking
        const newId = -Math.floor(Math.random() * 1000000);
        const localSession = {
          id: newId,
          tenantId: user?.tenantId ?? "SSD",
          facilityId: data.facilityId,
          microplanId: (data as any).microplanId,
          planType: planTypeFilter,
          name: data.name,
          sessionType: data.sessionType,
          quarter: data.quarter,
          year: data.year,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() as any : null,
          transportMode: data.transportMode ?? null,
          estimatedDuration: data.estimatedDuration ?? null,
          targetPopulation: data.targetPopulation ?? null,
          status: data.status ?? "planned",
          approvalStatus: data.approvalStatus ?? "draft",
          notes: data.notes ?? null,
          _syncedAt: 0,
          _localOnly: true,
        };

        // Save locally to IndexedDB
        await offlineDb.sessionPlans.put(localSession as any);

        // Queue to sync outbox
        await enqueueOutbox({
          tenantId: user?.tenantId ?? "SSD",
          entityType: "sessionPlan",
          method: "POST",
          url: "/api/sessions",
          body: JSON.stringify(data),
        });

        return localSession;
      }

      return apiRequest("POST", "/api/sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      form.reset({
        name: "",
        sessionType: "static",
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        year: new Date().getFullYear(),
        status: "planned",
        approvalStatus: "draft",
        facilityId: user?.facilityId ?? undefined,
        microplanId: undefined as any,
      });
      toast({
        title: navigator.onLine ? "Session saved" : "Session queued offline",
        description: navigator.onLine
          ? `Your ${planTypeFilter === "campaign" ? "campaign" : "routine"} session has been saved as a draft. Submit it for approval when you're ready.`
          : "Saved locally. Your session will sync automatically once internet is restored.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    },
  });

  // Edit & Delete CRUD modal state & mutations
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SessionPlan | null>(null);

  const [editName, setEditName] = useState("");
  const [editSessionType, setEditSessionType] = useState<"static" | "outreach" | "mobile">("static");
  const [editQuarter, setEditQuarter] = useState<number>(1);
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());
  const [editTargetPop, setEditTargetPop] = useState<number>(0);
  const [editTransportMode, setEditTransportMode] = useState<string>("road");
  const [editStatus, setEditStatus] = useState<string>("planned");
  const [editHR, setEditHR] = useState("");
  const [editStakeholders, setEditStakeholders] = useState("");
  const [editProvinceId, setEditProvinceId] = useState<number | null>(null);
  const [editDistrictId, setEditDistrictId] = useState<number | null>(null);
  const [editFacilityId, setEditFacilityId] = useState<number | null>(null);

  const isLocked = editingPlan?.approvalStatus === "approved" || editingPlan?.approvalStatus === "locked";

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/sessions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsEditOpen(false);
      setEditingPlan(null);
      toast({
        title: "Microplan updated",
        description: "Your session plan changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsEditOpen(false);
      setEditingPlan(null);
      toast({
        title: "Microplan deleted",
        description: "The microplan has been permanently removed.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenEditModal = (plan: SessionPlan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditSessionType(plan.sessionType as any || "static");
    setEditQuarter(plan.quarter);
    setEditYear(plan.year);
    setEditTargetPop(plan.targetPopulation || 0);
    setEditTransportMode(plan.transportMode || "road");
    setEditStatus(plan.status || "planned");
    setEditHR((plan as any).humanResources || "");
    setEditStakeholders((plan as any).keyStakeholders || "");

    const fac = (facilities ?? []).find((f) => f.id === plan.facilityId);
    if (fac) {
      const dist = (districts ?? []).find((d) => d.id === fac.districtId);
      setEditProvinceId(dist ? dist.provinceId : null);
      setEditDistrictId(fac.districtId);
      setEditFacilityId(plan.facilityId);
    } else {
      setEditProvinceId(null);
      setEditDistrictId(null);
      setEditFacilityId(plan.facilityId);
    }

    setIsEditOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!editingPlan) return;
    if (!editName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please supply a microplan name.",
        variant: "destructive",
      });
      return;
    }
    if (!editFacilityId) {
      toast({
        title: "Validation Error",
        description: "Please assign a facility location.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: editName,
      sessionType: editSessionType,
      quarter: editQuarter,
      year: editYear,
      targetPopulation: editTargetPop,
      transportMode: editTransportMode,
      status: editStatus,
      humanResources: editHR,
      keyStakeholders: editStakeholders,
      facilityId: editFacilityId,
    };

    updateMutation.mutate({ id: editingPlan.id, data: payload });
  };

  const facilityNameById = useMemo(() => {
    const m = new Map<number, string>();
    (facilities ?? []).forEach((f) => m.set(f.id, f.name));
    return m;
  }, [facilities]);

  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages: [], facilities }),
    [provinces, districts, facilities],
  );

  const filteredSessions = useMemo(() => {
    // Build a fast lookup of microplanId → microplan.planType so we can filter
    // sessions to those whose parent matches the route's planType. We trust the
    // session.planType column too (it is server-copied from the parent), but
    // joining the parent keeps the UI consistent if legacy rows ever drift.
    const microplanTypeById = new Map<number, string>();
    (allMicroplans ?? []).forEach((m) => microplanTypeById.set(m.id, m.planType));

    const enriched = withGeoColumns((sessions ?? []) as any[], geoMaps);
    return enriched.filter((item) => {
      const parentType = item.microplanId ? microplanTypeById.get(Number(item.microplanId)) : undefined;
      const sessionPlanType: string =
        parentType === "sia_campaign"
          ? "campaign"
          : parentType === "facility_routine"
            ? "routine"
            : (item as any).planType || "routine";
      if (sessionPlanType !== planTypeFilter) return false;
      if (lockedMicroplanId != null && Number(item.microplanId) !== Number(lockedMicroplanId)) return false;
      if (geoFilterProvinceId !== null && item._geoProvinceId !== geoFilterProvinceId) return false;
      if (geoFilterDistrictId !== null && item._geoDistrictId !== geoFilterDistrictId) return false;
      if (geoFilterFacilityId !== null && Number((item as any).facilityId) !== geoFilterFacilityId) return false;
      return true;
    });
  }, [sessions, allMicroplans, geoMaps, geoFilterProvinceId, geoFilterDistrictId, geoFilterFacilityId, planTypeFilter]);

  const columns = [
    {
      key: "_geoProvinceName",
      header: adminLabels.level1 || "Province",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoProvinceName || "—"}</span>
      ),
    },
    {
      key: "_geoDistrictName",
      header: adminLabels.level2 || "District",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoDistrictName || "—"}</span>
      ),
    },
    {
      key: "name",
      header: "Microplan",
      sortable: true,
      render: (item: SessionPlan) => (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => handleOpenEditModal(item)}
        >
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:underline transition-all">
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Q{item.quarter} {item.year}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "facilityId",
      header: "Geo Scope / Facility",
      render: (item: SessionPlan) => {
        const fac = (facilities ?? []).find((f) => f.id === item.facilityId);
        if (!fac) return `#${item.facilityId}`;
        const dist = (districts ?? []).find((d) => d.id === fac.districtId);
        const prov = dist ? (provinces ?? []).find((p) => p.id === dist.provinceId) : undefined;
        return (
          <div className="flex flex-col text-xs space-y-0.5">
            <span className="font-semibold text-foreground">{fac.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {prov?.name || "Unknown Province"} · {dist?.name || "Unknown District"}
            </span>
          </div>
        );
      },
    },
    {
      key: "sessionType",
      header: "Type",
      sortable: true,
      render: (item: SessionPlan) => (
        <Badge variant="secondary" className="capitalize">
          {item.sessionType}
        </Badge>
      ),
    },
    {
      key: "transportMode",
      header: "Transport",
      render: (item: SessionPlan) => {
        if (!item.transportMode) return "-";
        const Icon = transportIcons[item.transportMode] || Car;
        return (
          <div className="flex items-center gap-1 capitalize text-sm">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {item.transportMode}
          </div>
        );
      },
    },
    {
      key: "targetPopulation",
      header: "Target Pop.",
      sortable: true,
      render: (item: SessionPlan) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-3 w-3 text-muted-foreground" />
          {item.targetPopulation?.toLocaleString() || "-"}
        </div>
      ),
    },
    {
      key: "approvalStatus",
      header: "Approval",
      render: (item: SessionPlan) => <ApprovalBadge status={item.approvalStatus || "draft"} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: SessionPlan) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 h-8 px-2 rounded-lg text-xs"
            onClick={() => handleOpenEditModal(item)}
          >
            Edit
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1 text-primary hover:bg-primary/10 h-8 px-2 rounded-lg text-xs" data-testid={`btn-day-plans-${item.id}`}>
            <Link href={`/sessions/${item.id}/day-plans`}>
              <span>Day Plans</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = (data: InsertSessionPlan) => {
    // In detail mode the parent microplan is locked to the route id; force it
    // server-side regardless of any client tampering.
    if (lockedMicroplanId != null) {
      (data as any).microplanId = lockedMicroplanId;
    }
    // Avoid duplicates scoped to (parent microplan, sessionType): same session
    // type cannot appear twice inside one microplan.
    const exists = (sessions ?? []).some(
      (s) =>
        Number((s as any).microplanId) === Number((data as any).microplanId) &&
        s.sessionType === data.sessionType
    );
    if (exists) {
      toast({
        title: "Duplicate session blocked",
        description: "A session of this type already exists inside the selected microplan.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(data);
  };

  const plannedSessions = filteredSessions.filter((s) => s.status === "planned");
  const scheduledSessions = filteredSessions.filter((s) => s.status === "scheduled");
  const conductedSessions = filteredSessions.filter((s) => s.status === "conducted");
  const pendingApproval = filteredSessions.filter(
    (s) => s.approvalStatus && s.approvalStatus !== "draft" && s.approvalStatus !== "approved",
  );

  if (loadingSessions) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LIST MODE: when not scoped to a specific microplan, this workspace shows
  // the microplans of the route's planType (Routine or SIA). Sessions are
  // created and viewed *inside* a microplan-detail page, never from here.
  if (!isDetailMode) {
    const lockedParentBase = planTypeFilter === "campaign" ? "/microplans/campaigns" : "/microplans/routine";
    return (
      <div className="p-6 space-y-6">
        <MicroplanStepper currentStep={3} />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm">{pageSubtitle}</p>
          </div>
          {isCreator && (
            <Link href="/develop-microplan">
              <Button variant="outline" data-testid="button-open-microplan-builder">
                <Plus className="h-4 w-4 mr-1" />
                New microplan (Builder)
              </Button>
            </Link>
          )}
        </div>

        {microplansOfRouteType.length === 0 ? (
          <Alert className="max-w-2xl">
            <Info className="h-4 w-4" />
            <AlertTitle>No {planTypeFilter === "campaign" ? "campaign" : "routine"} microplan yet</AlertTitle>
            <AlertDescription>
              {isCreator
                ? <>Create one in the{" "}<Link href="/develop-microplan" className="underline font-medium">Microplan Builder</Link>{" "}to start adding sessions.</>
                : <>There are no microplans of this type to review yet.</>}
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{planTypeFilter === "campaign" ? "Campaign microplans" : "Routine microplans"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y" data-testid="list-microplans">
                {microplansOfRouteType.map((m) => {
                  const childCount = (sessions ?? []).filter((s) => (s as any).microplanId === m.id).length;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between py-3 gap-4"
                      data-testid={`row-microplan-${m.id}`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Q{m.quarter} {m.year} · {childCount} session{childCount === 1 ? "" : "s"}
                          {m.status === "locked" ? " · locked" : ""}
                        </div>
                      </div>
                      <Link href={`${lockedParentBase}/${m.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-open-microplan-${m.id}`}>
                          Open <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // DETAIL MODE: scoped to a single microplan. Sessions are listed and created here.
  const lockedParent = microplansOfRouteType.find((m) => m.id === lockedMicroplanId)
    ?? (allMicroplans ?? []).find((m) => m.id === lockedMicroplanId);
  const parentIsLocked = lockedParent?.status === "locked";
  const backHref = planTypeFilter === "campaign" ? "/microplans/campaigns" : "/microplans/routine";

  return (
    <div className="p-6 space-y-6">
      <MicroplanStepper currentStep={3} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={backHref} className="text-xs text-muted-foreground hover:underline">
            ← Back to {pageTitle}
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {lockedParent?.name ?? `Microplan #${lockedMicroplanId}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            Sessions inside this {planTypeFilter === "campaign" ? "campaign" : "routine"} microplan.
            {parentIsLocked && " This microplan is locked — sessions cannot be added or modified."}
          </p>
        </div>

        {isCreator && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-add-session"
                disabled={parentIsLocked}
                title={parentIsLocked ? "Parent microplan is locked" : undefined}
              >
                <Plus className="h-4 w-4 mr-1" />
                New session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Add a session to a {planTypeFilter === "campaign" ? "campaign" : "routine"} microplan
                </DialogTitle>
                <DialogDescription>
                  Pick the parent microplan first — facility, quarter, and year are inherited from it
                  and cannot be changed on the session.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormItem>
                    <FormLabel>Parent microplan</FormLabel>
                    <div
                      className="text-sm border rounded-md px-3 py-2 bg-muted"
                      data-testid="locked-parent-microplan"
                    >
                      {lockedParent?.name ?? `Microplan #${lockedMicroplanId}`}
                      {lockedParent ? ` · Q${lockedParent.quarter} ${lockedParent.year}` : ""}
                      {parentIsLocked ? " · locked" : ""}
                    </div>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Q1 outreach — Riverside village"
                            {...field}
                            data-testid="input-session-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cascading Province → District → Facility */}
                  <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Where is this microplan for?
                    </div>

                    <div>
                      <FormLabel className="text-xs">Province</FormLabel>
                      <Select
                        value={provinceId?.toString() ?? ""}
                        onValueChange={(v) => {
                          setProvinceId(parseInt(v));
                          setDistrictId(null);
                          form.setValue("facilityId", undefined as any);
                        }}
                      >
                        <SelectTrigger data-testid="select-province" className="mt-1">
                          <SelectValue placeholder="Pick a province" />
                        </SelectTrigger>
                        <SelectContent>
                          {(provinces ?? []).map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id.toString()}
                              data-testid={`option-province-${p.id}`}
                            >
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <FormLabel className="text-xs">District</FormLabel>
                      <Select
                        value={districtId?.toString() ?? ""}
                        onValueChange={(v) => {
                          setDistrictId(parseInt(v));
                          form.setValue("facilityId", undefined as any);
                        }}
                        disabled={!provinceId}
                      >
                        <SelectTrigger data-testid="select-district" className="mt-1">
                          <SelectValue
                            placeholder={provinceId ? "Pick a district" : "Pick a province first"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDistricts.map((d) => (
                            <SelectItem
                              key={d.id}
                              value={d.id.toString()}
                              data-testid={`option-district-${d.id}`}
                            >
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <FormField
                      control={form.control}
                      name="facilityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Facility *</FormLabel>
                          <Select
                            value={field.value?.toString() ?? ""}
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            disabled={!districtId}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-facility" className="mt-1">
                                <SelectValue
                                  placeholder={
                                    districtId
                                      ? filteredFacilities.length
                                        ? "Pick your facility"
                                        : "No facilities in this district yet"
                                      : "Pick a district first"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredFacilities.map((f) => (
                                <SelectItem
                                  key={f.id}
                                  value={f.id.toString()}
                                  data-testid={`option-facility-${f.id}`}
                                >
                                  {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "static"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-session-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="static">Static</SelectItem>
                              <SelectItem value="mobile">Mobile</SelectItem>
                              <SelectItem value="outreach">Outreach</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transportMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-transport">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="walking">Walking</SelectItem>
                              <SelectItem value="road">Road</SelectItem>
                              <SelectItem value="boat">Boat</SelectItem>
                              <SelectItem value="air">Air</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quarter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quarter</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-quarter">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Q1</SelectItem>
                              <SelectItem value="2">Q2</SelectItem>
                              <SelectItem value="3">Q3</SelectItem>
                              <SelectItem value="4">Q4</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="targetPopulation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target population</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="500"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : null)
                            }
                            data-testid="input-target-population"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Anything reviewers should know — staffing, fuel, vaccine cold-chain, hard-to-reach villages…"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-session"
                    >
                      {createMutation.isPending ? "Saving…" : "Save microplan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isReviewer && (
        <Alert data-testid="alert-reviewer-mode">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>You're a reviewer</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              Microplans are authored by facility staff. Your job is to review and
              approve submissions from your{" "}
              {user?.role === "district_manager"
                ? "district"
                : user?.role === "provincial_coordinator"
                  ? "province"
                  : "country"}
              . {pendingApproval.length > 0 && (
                <strong>{pendingApproval.length} awaiting your action.</strong>
              )}
            </span>
            <Button asChild size="sm" variant="outline" data-testid="link-to-approvals">
              <Link href="/approvals">
                Open Approvals <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isCreator && (
        <Alert data-testid="alert-creator-mode">
          <Info className="h-4 w-4" />
          <AlertTitle>How approvals work</AlertTitle>
          <AlertDescription>
            Save your microplan as a draft, then submit it for approval. It travels
            up the chain: <strong>Facility</strong> → <strong>District</strong> →{" "}
            <strong>Province</strong> → <strong>National</strong>. You'll be
            notified when each level acts on it.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold" data-testid="text-count-planned">{plannedSessions.length}</p>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold" data-testid="text-count-scheduled">{scheduledSessions.length}</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conducted</p>
                <p className="text-2xl font-bold" data-testid="text-count-conducted">{conductedSessions.length}</p>
              </div>
              <Badge variant="default">Complete</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isCreator ? "My microplans" : "All microplans"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <GeoCascadeFilter
            provinceId={geoFilterProvinceId}
            districtId={geoFilterDistrictId}
            facilityId={geoFilterFacilityId}
            onProvinceChange={setGeoFilterProvinceId}
            onDistrictChange={setGeoFilterDistrictId}
            onFacilityChange={setGeoFilterFacilityId}
            showFacility
            provinces={provinces}
            districts={districts}
            facilities={facilities}
            provinceLabel={adminLabels.level1 || "Province"}
            districtLabel={adminLabels.level2 || "District"}
            facilityLabel={adminLabels.level3 || "Facility"}
            testIdPrefix="session"
          />
          <DataTable
            data={filteredSessions}
            columns={columns}
            searchable
            searchKeys={["name"]}
            emptyMessage={
              isCreator
                ? "No microplans yet. Click 'New microplan' to start your first one."
                : "No microplans submitted yet."
            }
          />
        </CardContent>
      </Card>

      {/* Edit Plan Dialog CRUD Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Edit Microplan: {editName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {isLocked && (
              <Alert variant="destructive" className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 rounded-2xl">
                <Info className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="font-bold">Approved & Locked</AlertTitle>
                <AlertDescription className="text-xs">
                  This microplan has been officially approved and locked. Modifications are disabled to preserve execution audit trails.
                </AlertDescription>
              </Alert>
            )}

            {/* Cascading Province → District → Facility */}
            <div className="space-y-3 rounded-2xl border p-4 bg-muted/20">
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider block flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-500" />
                Assign Microplan Location Scope
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{adminLabels.level1}</Label>
                  <Select
                    value={editProvinceId?.toString() ?? ""}
                    onValueChange={(v) => {
                      const val = v ? parseInt(v) : null;
                      setEditProvinceId(val);
                      setEditDistrictId(null);
                      setEditFacilityId(null);
                    }}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="bg-background rounded-xl text-xs h-9">
                      <SelectValue placeholder={`Select ${adminLabels.level1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(provinces ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{adminLabels.level2}</Label>
                  <Select
                    value={editDistrictId?.toString() ?? ""}
                    onValueChange={(v) => {
                      const val = v ? parseInt(v) : null;
                      setEditDistrictId(val);
                      setEditFacilityId(null);
                    }}
                    disabled={!editProvinceId || isLocked}
                  >
                    <SelectTrigger className="bg-background rounded-xl text-xs h-9 disabled:opacity-50">
                      <SelectValue
                        placeholder={editProvinceId ? `Select ${adminLabels.level2}` : `Select ${adminLabels.level1} first`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(districts ?? [])
                        .filter((d) => Number(d.provinceId) === Number(editProvinceId))
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id.toString()}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{adminLabels.level3} *</Label>
                  <Select
                    value={editFacilityId?.toString() ?? ""}
                    onValueChange={(v) => {
                      const val = v ? parseInt(v) : null;
                      setEditFacilityId(val);
                    }}
                    disabled={!editDistrictId || isLocked}
                  >
                    <SelectTrigger className="bg-background rounded-xl text-xs h-9 disabled:opacity-50">
                      <SelectValue
                        placeholder={
                          editDistrictId
                            ? (facilities ?? []).filter((f) => Number(f.districtId) === Number(editDistrictId)).length
                              ? `Select ${adminLabels.level3}`
                              : `No facilities in this district`
                            : `Select ${adminLabels.level2} first`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(facilities ?? [])
                        .filter((f) => Number(f.districtId) === Number(editDistrictId))
                        .map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-plan-name" className="text-xs font-semibold text-muted-foreground uppercase">
                  Microplan Name *
                </Label>
                <Input
                  id="edit-plan-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-background rounded-xl"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-plan-type" className="text-xs font-semibold text-muted-foreground uppercase">
                  Session Type
                </Label>
                <Select
                  value={editSessionType}
                  onValueChange={(v) => setEditSessionType(v as any)}
                  disabled={isLocked}
                >
                  <SelectTrigger id="edit-plan-type" className="bg-background rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Static Session</SelectItem>
                    <SelectItem value="outreach">Outreach Session</SelectItem>
                    <SelectItem value="mobile">Mobile Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-plan-quarter" className="text-xs font-semibold text-muted-foreground uppercase">
                  Quarter
                </Label>
                <Select
                  value={editQuarter.toString()}
                  onValueChange={(v) => setEditQuarter(parseInt(v))}
                  disabled={isLocked}
                >
                  <SelectTrigger id="edit-plan-quarter" className="bg-background rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-plan-year" className="text-xs font-semibold text-muted-foreground uppercase">
                  Year
                </Label>
                <Input
                  id="edit-plan-year"
                  type="number"
                  value={editYear}
                  onChange={(e) => setEditYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="bg-background rounded-xl"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-plan-targetpop" className="text-xs font-semibold text-muted-foreground uppercase">
                  Target Population
                </Label>
                <Input
                  id="edit-plan-targetpop"
                  type="number"
                  value={editTargetPop}
                  onChange={(e) => setEditTargetPop(parseInt(e.target.value) || 0)}
                  className="bg-background rounded-xl"
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-plan-transport" className="text-xs font-semibold text-muted-foreground uppercase">
                  Transport Mode
                </Label>
                <Select
                  value={editTransportMode}
                  onValueChange={setEditTransportMode}
                  disabled={isLocked}
                >
                  <SelectTrigger id="edit-plan-transport" className="bg-background rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">Road (Car/Bike)</SelectItem>
                    <SelectItem value="walking">Walking / Foot</SelectItem>
                    <SelectItem value="boat">Boat / Riverine</SelectItem>
                    <SelectItem value="air">Air (Flight)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-plan-status" className="text-xs font-semibold text-muted-foreground uppercase">
                  Execution Status
                </Label>
                <Select
                  value={editStatus}
                  onValueChange={setEditStatus}
                  disabled={isLocked}
                >
                  <SelectTrigger id="edit-plan-status" className="bg-background rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="conducted">Conducted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Premium HR and Stakeholders layout fields */}
            <div className="border border-border rounded-2xl p-4 bg-muted/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                Staff Allocation & Stakeholder Engagement
              </h4>
              
              <div className="space-y-1">
                <Label htmlFor="edit-plan-hr" className="text-xs font-semibold text-muted-foreground uppercase">
                  Human Resources (HR) & Staffing
                </Label>
                <Textarea
                  id="edit-plan-hr"
                  placeholder="e.g. Vaccinators: John Doe, Mary Smith. Social Mobilizers: Chief Joseph. Logistics Guides: Peter..."
                  value={editHR}
                  onChange={(e) => setEditHR(e.target.value)}
                  className="bg-background rounded-xl"
                  rows={3}
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-plan-stakeholders" className="text-xs font-semibold text-muted-foreground uppercase">
                  Key Stakeholders Engagement
                </Label>
                <Textarea
                  id="edit-plan-stakeholders"
                  placeholder="e.g. Church leaders, local chiefs, NGO coordinators, community health workers..."
                  value={editStakeholders}
                  onChange={(e) => setEditStakeholders(e.target.value)}
                  className="bg-background rounded-xl"
                  rows={3}
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Danger Zone: Delete Plan */}
            {isCreator && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Danger Zone: Delete Microplan
                  </h4>
                  <Badge variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400">
                    Irreversible Action
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this microplanning session plan. This deletes all associated day itinerary records too.
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (editingPlan && confirm("Are you absolutely sure you want to delete this microplanning session? This action is irreversible.")) {
                        deletePlanMutation.mutate(editingPlan.id);
                      }
                    }}
                    disabled={deletePlanMutation.isPending || isLocked}
                    className="rounded-xl text-xs h-9 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletePlanMutation.isPending ? "Deleting..." : "Delete Microplan"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingPlan(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePlan}
              disabled={updateMutation.isPending || isLocked}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
