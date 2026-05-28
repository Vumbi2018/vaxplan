import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import type { PopulationData, Province, District, Village, Facility } from "@shared/schema";

type PopulationSource = "nso" | "hmis" | "worldpop" | "survey" | "community_census";

const formSchema = z.object({
  source: z.enum(["nso", "hmis", "worldpop", "survey", "community_census"]),
  year: z.coerce.number().min(1900).max(2100),
  locationType: z.enum(["province", "district", "village", "facility"]),
  provinceId: z.coerce.number().optional().nullable(),
  districtId: z.coerce.number().optional().nullable(),
  villageId: z.coerce.number().optional().nullable(),
  facilityId: z.coerce.number().optional().nullable(),
  totalPopulation: z.coerce.number().min(0),
  malePopulation: z.coerce.number().min(0).optional().nullable(),
  femalePopulation: z.coerce.number().min(0).optional().nullable(),
  under1Population: z.coerce.number().min(0).optional().nullable(),
  under5Population: z.coerce.number().min(0).optional().nullable(),
  pregnantWomen: z.coerce.number().min(0).optional().nullable(),
  schoolEntry: z.coerce.number().min(0).optional().nullable(),
  schoolExit: z.coerce.number().min(0).optional().nullable(),
  growthRate: z.coerce.number().optional().nullable(),
  confidenceScore: z.coerce.number().min(0).max(100).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface PopulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: PopulationData | null;
  defaultSource?: PopulationSource;
}

export function PopulationDialog({
  open,
  onOpenChange,
  editData,
  defaultSource = "nso",
}: PopulationDialogProps) {
  const { toast } = useToast();
  const isEditing = !!editData;

  const [locationType, setLocationType] = useState<string>("province");

  // Retrieve Tenant Context for multitenant support and dynamic terminology translation
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  const skipRegionLevel = tenantInfo?.settings?.skipRegionLevel ?? false;
  const rawAdminLabels = tenantInfo?.settings?.adminLevelLabels ?? {
    level1: "Region",
    level2: "Province",
    level3: "District",
    level4: "Constituency",
    level5: "Ward",
  };
  const adminLabels = skipRegionLevel ? {
    level1: rawAdminLabels.level2 || "Province",
    level2: rawAdminLabels.level3 || "District",
    level3: rawAdminLabels.level4 || "Constituency",
    level4: rawAdminLabels.level5 || "Ward",
    level5: "Village",
  } : rawAdminLabels;

  /*
  // Original Code: Standard queries which do not support tenant cache scopes
  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
  });
  */

  /*
  // Pre-Refactored Code: Scoped to tenant ID but lacked custom queryFn. 
  // This caused the default getQueryFn to fetch "/api/provinces/:tenantId", which resolved to a single province in routes.ts rather than an array.
  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    enabled: !!tenantInfo?.id,
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    enabled: !!tenantInfo?.id,
  });
  */

  // Updated Code: Scope queries to tenant ID and use custom queryFn to fetch the array of all provinces/districts for the tenant.
  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/provinces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch provinces");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/districts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: defaultSource,
      year: new Date().getFullYear(),
      locationType: "province",
      provinceId: null,
      districtId: null,
      villageId: null,
      facilityId: null,
      totalPopulation: 0,
      malePopulation: null,
      femalePopulation: null,
      under1Population: null,
      under5Population: null,
      pregnantWomen: null,
      schoolEntry: null,
      schoolExit: null,
      growthRate: null,
      confidenceScore: null,
    },
  });

  useEffect(() => {
    if (editData) {
      let locType: "province" | "district" | "village" | "facility" = "province";
      if (editData.villageId) locType = "village";
      else if (editData.facilityId) locType = "facility";
      else if (editData.districtId) locType = "district";
      
      setLocationType(locType);
      
      form.reset({
        source: editData.source as PopulationSource,
        year: editData.year,
        locationType: locType,
        provinceId: editData.provinceId,
        districtId: editData.districtId,
        villageId: editData.villageId,
        facilityId: editData.facilityId,
        totalPopulation: editData.totalPopulation,
        malePopulation: editData.malePopulation,
        femalePopulation: editData.femalePopulation,
        under1Population: editData.under1Population,
        under5Population: editData.under5Population,
        pregnantWomen: editData.pregnantWomen,
        schoolEntry: editData.schoolEntry,
        schoolExit: editData.schoolExit,
        growthRate: editData.growthRate ? Number(editData.growthRate) : null,
        confidenceScore: editData.confidenceScore ? Number(editData.confidenceScore) : null,
      });
    } else {
      form.reset({
        source: defaultSource,
        year: new Date().getFullYear(),
        locationType: "province",
        provinceId: null,
        districtId: null,
        villageId: null,
        facilityId: null,
        totalPopulation: 0,
        malePopulation: null,
        femalePopulation: null,
        under1Population: null,
        under5Population: null,
        pregnantWomen: null,
        schoolEntry: null,
        schoolExit: null,
        growthRate: null,
        confidenceScore: null,
      });
      setLocationType("province");
    }
  }, [editData, defaultSource, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload: Record<string, unknown> = {
        source: data.source,
        year: data.year,
        totalPopulation: data.totalPopulation,
        malePopulation: data.malePopulation || undefined,
        femalePopulation: data.femalePopulation || undefined,
        under1Population: data.under1Population || undefined,
        under5Population: data.under5Population || undefined,
        pregnantWomen: data.pregnantWomen || undefined,
        schoolEntry: data.schoolEntry || undefined,
        schoolExit: data.schoolExit || undefined,
        growthRate: data.growthRate?.toString() || undefined,
        confidenceScore: data.confidenceScore?.toString() || undefined,
      };

      if (data.locationType === "province" && data.provinceId) {
        payload.provinceId = data.provinceId;
      } else if (data.locationType === "district" && data.districtId) {
        payload.districtId = data.districtId;
      } else if (data.locationType === "village" && data.villageId) {
        payload.villageId = data.villageId;
      } else if (data.locationType === "facility" && data.facilityId) {
        payload.facilityId = data.facilityId;
      }

      return apiRequest("POST", "/api/population", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/population');
      }});
      toast({
        title: "Record Created",
        description: "Population record has been created successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create record.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload: Record<string, unknown> = {
        source: data.source,
        year: data.year,
        totalPopulation: data.totalPopulation,
        malePopulation: data.malePopulation || undefined,
        femalePopulation: data.femalePopulation || undefined,
        under1Population: data.under1Population || undefined,
        under5Population: data.under5Population || undefined,
        pregnantWomen: data.pregnantWomen || undefined,
        schoolEntry: data.schoolEntry || undefined,
        schoolExit: data.schoolExit || undefined,
        growthRate: data.growthRate?.toString() || undefined,
        confidenceScore: data.confidenceScore?.toString() || undefined,
      };

      if (data.locationType === "province" && data.provinceId) {
        payload.provinceId = data.provinceId;
        payload.districtId = null;
        payload.villageId = null;
        payload.facilityId = null;
      } else if (data.locationType === "district" && data.districtId) {
        payload.districtId = data.districtId;
        payload.provinceId = null;
        payload.villageId = null;
        payload.facilityId = null;
      } else if (data.locationType === "village" && data.villageId) {
        payload.villageId = data.villageId;
        payload.provinceId = null;
        payload.districtId = null;
        payload.facilityId = null;
      } else if (data.locationType === "facility" && data.facilityId) {
        payload.facilityId = data.facilityId;
        payload.provinceId = null;
        payload.districtId = null;
        payload.villageId = null;
      }

      return apiRequest("PATCH", `/api/population/${editData!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/population');
      }});
      toast({
        title: "Record Updated",
        description: "Population record has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {isEditing ? "Edit Population Record" : "Add Population Record"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the population data for this location."
              : "Enter population data for a location."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Source</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nso">NSO Census</SelectItem>
                        <SelectItem value="hmis">HMIS (eNHIS)</SelectItem>
                        <SelectItem value="worldpop">WorldPop</SelectItem>
                        <SelectItem value="survey">Survey</SelectItem>
                        <SelectItem value="community_census">Community Census</SelectItem>
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
                    <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl>
                        <SelectTrigger data-testid="select-year-form">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Type</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={(v) => {
                        field.onChange(v);
                        setLocationType(v);
                        form.setValue("provinceId", null);
                        form.setValue("districtId", null);
                        form.setValue("villageId", null);
                        form.setValue("facilityId", null);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-location-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="province">
                          {skipRegionLevel ? adminLabels.level1 : "Province"}
                        </SelectItem>
                        <SelectItem value="district">
                          {skipRegionLevel ? adminLabels.level2 : "District"}
                        </SelectItem>
                        <SelectItem value="village">Village</SelectItem>
                        <SelectItem value="facility">Facility</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {locationType === "province" && (
                <FormField
                  control={form.control}
                  name="provinceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{skipRegionLevel ? adminLabels.level1 : "Province"}</FormLabel>
                      <Select 
                        value={field.value?.toString() || ""} 
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-province-form">
                            <SelectValue placeholder={`Select ${skipRegionLevel ? adminLabels.level1.toLowerCase() : "province"}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Sort alphabetically for an exceptionally clean, premium UX */}
                          {[...(provinces || [])]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {locationType === "district" && (
                <FormField
                  control={form.control}
                  name="districtId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{skipRegionLevel ? adminLabels.level2 : "District"}</FormLabel>
                      <Select 
                        value={field.value?.toString() || ""} 
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-district-form">
                            <SelectValue placeholder={`Select ${skipRegionLevel ? adminLabels.level2.toLowerCase() : "district"}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Sort alphabetically for an exceptionally clean, premium UX */}
                          {[...(districts || [])]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {locationType === "village" && (
                <FormField
                  control={form.control}
                  name="villageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Village</FormLabel>
                      <Select 
                        value={field.value?.toString() || ""} 
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-village-form">
                            <SelectValue placeholder="Select village" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {villages?.map((v) => (
                            <SelectItem key={v.id} value={v.id.toString()}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {locationType === "facility" && (
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility</FormLabel>
                      <FacilityCascadePicker
                        value={field.value ?? null}
                        onChange={(id) => field.onChange(id)}
                        showLabels={false}
                        testIdPrefix="population-facility"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalPopulation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Population</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        data-testid="input-total-population"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="malePopulation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Male Population</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-male-population"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="femalePopulation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Female Population</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-female-population"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="under1Population"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Under 1</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-under1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="under5Population"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Under 5</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-under5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pregnantWomen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pregnant Women</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-pregnant"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidenceScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence %</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        max={100}
                        {...field} 
                        value={field.value ?? ""} 
                        data-testid="input-confidence"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="growthRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Growth Rate (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                      value={field.value ?? ""} 
                      data-testid="input-growth-rate"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save">
                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
