import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { offlineDb, enqueueOutbox } from "../lib/offlineDb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { MicroplanStepper } from "@/components/MicroplanStepper";
import {
  Plus,
  Megaphone,
  Users,
  Radio,
  BookOpen,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  insertMobilizationActivitySchema,
  type MobilizationActivity,
  type InsertMobilizationActivity,
  type Facility,
  type Province,
  type District,
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const activityFormSchema = insertMobilizationActivitySchema.extend({
  activityType: z.string().min(2, "Activity type is required"),
});

const activityTypes = [
  { value: "community_meeting", label: "Community Meeting", icon: Users },
  { value: "radio_announcement", label: "Radio Announcement", icon: Radio },
  { value: "school_visit", label: "School Visit", icon: BookOpen },
  { value: "church_announcement", label: "Church Announcement", icon: Megaphone },
  { value: "door_to_door", label: "Door-to-Door", icon: MapPin },
  { value: "health_talk", label: "Health Talk", icon: Users },
];

const targetAudiences = [
  "Parents",
  "Caregivers",
  "Pregnant Women",
  "Community Leaders",
  "Teachers",
  "Health Workers",
  "General Public",
];

export default function SocialMobilization() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [geoProvinceId, setGeoProvinceId] = useState<number | null>(null);
  const [geoDistrictId, setGeoDistrictId] = useState<number | null>(null);
  const [geoFacilityId, setGeoFacilityId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const f = new URLSearchParams(window.location.search).get("facility");
    return f && !Number.isNaN(Number(f)) ? Number(f) : null;
  });

  /*
  // Original queries and mutation (commented out to preserve working code while adding offline capabilities):
  const { data: activities, isLoading: loadingActivities } = useQuery<MobilizationActivity[]>({
    queryKey: ["/api/mobilization"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMobilizationActivity) => {
      return apiRequest("POST", "/api/mobilization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobilization"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Activity created",
        description: "The mobilization activity has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  */

  // Updated queries and mutations with Dexie.js offline fallbacks:
  const { data: activities, isLoading: loadingActivities } = useQuery<MobilizationActivity[]>({
    queryKey: ["/api/mobilization"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.mobilizationActivities.toArray() as any[];
      }
      const res = await fetch("/api/mobilization");
      if (!res.ok) throw new Error("Failed to fetch mobilization activities");
      return res.json();
    }
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.facilities.toArray() as any[];
      }
      const res = await fetch("/api/facilities");
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    }
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
    queryFn: async () => {
      const res = await fetch("/api/provinces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch provinces");
      return res.json();
    },
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
    queryFn: async () => {
      const res = await fetch("/api/districts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
  });

  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages: [], facilities }),
    [provinces, districts, facilities],
  );

  const enrichedActivities = useMemo(() => {
    const enriched = withGeoColumns((activities ?? []) as any[], geoMaps);
    return enriched.filter((item) => {
      if (geoProvinceId !== null && item._geoProvinceId !== geoProvinceId) return false;
      if (geoDistrictId !== null && item._geoDistrictId !== geoDistrictId) return false;
      if (geoFacilityId !== null && Number((item as any).facilityId) !== geoFacilityId) return false;
      return true;
    });
  }, [activities, geoMaps, geoProvinceId, geoDistrictId, geoFacilityId]);

  const form = useForm<InsertMobilizationActivity>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activityType: "community_meeting",
      status: "planned",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMobilizationActivity) => {
      if (!navigator.onLine) {
        const localId = Math.floor(Math.random() * -1000000);
        const localItem = {
          ...data,
          id: localId,
          _localOnly: true,
          _syncedAt: Date.now(),
        } as any;

        await offlineDb.mobilizationActivities.add(localItem);

        // Queue in outbox (also registers Background Sync if supported)
        await enqueueOutbox({
          tenantId: data.tenantId || "default",
          entityType: "mobilization_activity",
          method: "POST",
          url: "/api/mobilization",
          body: JSON.stringify(data),
          localId: String(localId),
        });

        return localItem;
      }
      return apiRequest("POST", "/api/mobilization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobilization"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: navigator.onLine ? "Activity created" : "Activity saved locally",
        description: navigator.onLine
          ? "The mobilization activity has been added successfully."
          : "Saved locally. It will sync automatically when you are back online.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const plannedActivities = activities?.filter((a) => a.status === "planned") || [];
  const completedActivities = activities?.filter((a) => a.status === "completed") || [];
  const totalEstimatedReach = activities?.reduce(
    (sum, a) => sum + (a.estimatedAttendance || 0),
    0
  ) || 0;

  const columns = [
    {
      key: "_geoProvinceName",
      header: "Province",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoProvinceName || "—"}</span>
      ),
    },
    {
      key: "_geoDistrictName",
      header: "District",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoDistrictName || "—"}</span>
      ),
    },
    {
      key: "activityType",
      header: "Activity",
      sortable: true,
      render: (item: MobilizationActivity) => {
        const actType = activityTypes.find((t) => t.value === item.activityType);
        const Icon = actType?.icon || Megaphone;
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {actType?.label || item.activityType}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {item.description}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "targetAudience",
      header: "Audience",
      render: (item: MobilizationActivity) => (
        <Badge variant="outline">{item.targetAudience || "General"}</Badge>
      ),
    },
    {
      key: "scheduledDate",
      header: "Date",
      sortable: true,
      render: (item: MobilizationActivity) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {item.scheduledDate
            ? format(new Date(item.scheduledDate), "MMM d, yyyy")
            : "-"}
        </div>
      ),
    },
    {
      key: "estimatedAttendance",
      header: "Est. Reach",
      sortable: true,
      render: (item: MobilizationActivity) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-3 w-3 text-muted-foreground" />
          {item.estimatedAttendance?.toLocaleString() || "-"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: MobilizationActivity) => (
        <Badge
          variant={
            item.status === "completed"
              ? "default"
              : item.status === "in_progress"
              ? "secondary"
              : "outline"
          }
          className="capitalize"
        >
          {item.status}
        </Badge>
      ),
    },
  ];

  const onSubmit = (data: InsertMobilizationActivity) => {
    createMutation.mutate(data);
  };

  if (loadingActivities) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
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

  return (
    <div className="p-6 space-y-6">
      <MicroplanStepper currentStep={7} facilityId={geoFacilityId} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Social Mobilization</h1>
          <p className="text-muted-foreground text-sm">
            Plan community engagement and awareness activities
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-activity">
              <Plus className="h-4 w-4 mr-1" />
              New Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Plan Mobilization Activity</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility *</FormLabel>
                      <FacilityCascadePicker
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id ?? undefined)}
                        required
                        showLabels={false}
                        testIdPrefix="mobilization-facility"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-activity-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activityTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the activity..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-activity-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-audience">
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetAudiences.map((audience) => (
                            <SelectItem key={audience} value={audience}>
                              {audience}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedAttendance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Attendance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            data-testid="input-attendance"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budgetAllocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="500"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            data-testid="input-activity-budget"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
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
                    data-testid="button-save-activity"
                  >
                    {createMutation.isPending ? "Saving..." : "Create Activity"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold">{plannedActivities.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedActivities.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Total Reach</p>
                <p className="text-2xl font-bold">{totalEstimatedReach.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">All Activities</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <GeoCascadeFilter
            provinceId={geoProvinceId}
            districtId={geoDistrictId}
            facilityId={geoFacilityId}
            onProvinceChange={setGeoProvinceId}
            onDistrictChange={setGeoDistrictId}
            onFacilityChange={setGeoFacilityId}
            showFacility
            provinces={provinces}
            districts={districts}
            facilities={facilities}
            testIdPrefix="mobilization"
          />
          <DataTable
            data={enrichedActivities}
            columns={columns}
            searchable
            searchKeys={["activityType", "description", "targetAudience"]}
            emptyMessage="No mobilization activities planned yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Types Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activityTypes.map((type) => (
              <div key={type.value} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <type.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
