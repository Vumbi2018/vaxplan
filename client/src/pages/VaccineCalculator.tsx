import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
  Syringe,
  Calculator,
  Download,
  RefreshCw,
  Users,
  Thermometer,
  Settings2,
  Plus,
  Edit2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Facility, PopulationData, Tenant, VaccineConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { offlineDb } from "../lib/offlineDb";
import { MicroplanStepper } from "@/components/MicroplanStepper";

const fallbackVaccineSchedule = [
  { id: 1, name: "BCG", target: "births", doses: 1, wastage: 40, vialsPerDose: 20, recommendedAge: "Birth" },
  { id: 2, name: "OPV-0", target: "births", doses: 1, wastage: 25, vialsPerDose: 20, recommendedAge: "Birth" },
  { id: 3, name: "OPV-1,2,3", target: "under1", doses: 3, wastage: 25, vialsPerDose: 20, recommendedAge: "6, 10, 14 weeks" },
  { id: 4, name: "Penta-1,2,3", target: "under1", doses: 3, wastage: 11, vialsPerDose: 10, recommendedAge: "6, 10, 14 weeks" },
  { id: 5, name: "PCV-1,2,3", target: "under1", doses: 3, wastage: 11, vialsPerDose: 4, recommendedAge: "6, 10, 14 weeks" },
  { id: 6, name: "IPV-1,2", target: "under1", doses: 2, wastage: 5, vialsPerDose: 5, recommendedAge: "14 weeks, 9 months" },
  { id: 7, name: "Rota-1,2", target: "under1", doses: 2, wastage: 5, vialsPerDose: 1, recommendedAge: "6, 10 weeks" },
  { id: 8, name: "MR-1", target: "under1", doses: 1, wastage: 25, vialsPerDose: 10, recommendedAge: "9 months" },
  { id: 9, name: "MR-2", target: "schoolEntry", doses: 1, wastage: 25, vialsPerDose: 10, recommendedAge: "18 months / 4-5 years" },
  { id: 10, name: "TT-1,2+", target: "pregnant", doses: 2, wastage: 25, vialsPerDose: 10, recommendedAge: "Pregnancy / Childbearing age" },
];

const defaultDemographics = {
  births: 0.032,
  under1: 0.030,
  pregnant: 0.032,
  schoolEntry: 0.027,
  schoolExit: 0.022,
};

export default function VaccineCalculator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFacility, setSelectedFacility] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const f = new URLSearchParams(window.location.search).get("facility");
    return f && !Number.isNaN(Number(f)) ? f : null;
  });
  const [selectedQuarter, setSelectedQuarter] = useState(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );
  const [coverageTarget, setCoverageTarget] = useState(95);

  // Modal edit states
  const [editingConfig, setEditingConfig] = useState<Partial<VaccineConfig> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // New config form states
  const [newConfig, setNewConfig] = useState({
    name: "",
    targetGroup: "under1",
    doses: 1,
    recommendedAge: "",
    recommendedAgeWeeks: 0,
    wastageFactor: "1.10",
    vialsPerDose: 1,
    isActive: true,
  });

  const [isCustomAntigen, setIsCustomAntigen] = useState(false);

  /*
  // Original queries (commented out to preserve working code while adding offline capabilities):
  const { data: facilities, isLoading: loadingFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: populationData, isLoading: loadingPopulation } = useQuery<PopulationData[]>({
    queryKey: ["/api/population"],
  });

  const { data: activeTenant, isLoading: loadingTenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: vaccineConfigs, isLoading: loadingConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
  });
  */

  // Updated queries with robust Dexie.js offline fallbacks and localStorage caching:
  const { data: facilities, isLoading: loadingFacilities } = useQuery<Facility[]>({
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

  const { data: populationData, isLoading: loadingPopulation } = useQuery<PopulationData[]>({
    queryKey: ["/api/population"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.populationData.toArray() as any[];
      }
      const res = await fetch("/api/population");
      if (!res.ok) throw new Error("Failed to fetch population data");
      return res.json();
    }
  });

  const { data: activeTenant, isLoading: loadingTenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("vaxplan_active_tenant");
        if (cached) return JSON.parse(cached);
        return { id: user?.tenantId || "default", name: "Ministry of Health", code: "MOH", countryCode: "ZMB", settings: {} } as Tenant;
      }
      const res = await fetch("/api/me/tenant");
      if (!res.ok) throw new Error("Failed to fetch active tenant");
      const data = await res.json();
      localStorage.setItem("vaxplan_active_tenant", JSON.stringify(data));
      return data;
    }
  });

  const { data: vaccineConfigs, isLoading: loadingConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
    queryFn: async () => {
      if (!navigator.onLine) {
        const localConfigs = await offlineDb.vaccineConfigs.toArray();
        if (localConfigs.length > 0) return localConfigs as any[];
        // Fallback schedule if no configs are synced yet
        return fallbackVaccineSchedule as any[];
      }
      const res = await fetch("/api/vaccines/config");
      if (!res.ok) throw new Error("Failed to fetch vaccine configurations");
      return res.json();
    }
  });

  // API Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof newConfig) => {
      return (await apiRequest("POST", "/api/vaccines/config", data)) as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vaccines/config"] });
      toast({ title: "Success", description: "Vaccine configuration added successfully" });
      setIsAddDialogOpen(false);
      setNewConfig({
        name: "",
        targetGroup: "under1",
        doses: 1,
        recommendedAge: "",
        recommendedAgeWeeks: 0,
        wastageFactor: "1.10",
        vialsPerDose: 1,
        isActive: true,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to add vaccine configuration", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VaccineConfig> }) => {
      return (await apiRequest("PATCH", `/api/vaccines/config/${id}`, data)) as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vaccines/config"] });
      toast({ title: "Success", description: "Vaccine configuration updated successfully" });
      setIsEditDialogOpen(false);
      setEditingConfig(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update vaccine configuration", variant: "destructive" });
    },
  });

  const isNationalAdmin = user?.role === "national_admin";

  const activeSchedule = useMemo(() => {
    if (!vaccineConfigs || vaccineConfigs.length === 0) {
      return fallbackVaccineSchedule;
    }
    return vaccineConfigs
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        name: c.name,
        target: c.targetGroup,
        doses: c.doses,
        wastage: Math.round((parseFloat(c.wastageFactor as string) - 1.0) * 100),
        vialsPerDose: c.vialsPerDose,
        recommendedAge: c.recommendedAge,
      }));
  }, [vaccineConfigs]);

  const facilityPopulation = useMemo(() => {
    if (!selectedFacility) return null;
    const facilityId = parseInt(selectedFacility);
    const popData = populationData?.filter((p) => p.facilityId === facilityId);
    if (!popData?.length) return null;
    
    const latestYear = Math.max(...popData.map((p) => p.year));
    const latest = popData.find((p) => p.year === latestYear);
    return latest;
  }, [selectedFacility, populationData]);

  const demographics = useMemo(() => {
    const settings = (activeTenant?.settings || {}) as Record<string, any>;
    return (settings.demographics || defaultDemographics) as typeof defaultDemographics;
  }, [activeTenant]);

  const calculations = useMemo(() => {
    if (!facilityPopulation) return [];

    const totalPop = facilityPopulation.totalPopulation || 10000;

    return activeSchedule.map((vaccine) => {
      let targetPop = 0;
      switch (vaccine.target) {
        case "births":
          targetPop = Math.round(totalPop * demographics.births);
          break;
        case "under1":
          targetPop = Math.round(totalPop * demographics.under1);
          break;
        case "pregnant":
          targetPop = Math.round(totalPop * demographics.pregnant);
          break;
        case "schoolEntry":
          targetPop = Math.round(totalPop * demographics.schoolEntry);
          break;
        default:
          targetPop = Math.round(totalPop * 0.03);
      }

      const adjustedTarget = Math.round((targetPop * coverageTarget) / 100);
      const dosesNeeded = adjustedTarget * vaccine.doses;
      const wastageMultiplier = 1 + vaccine.wastage / 100;
      const dosesWithWastage = Math.ceil(dosesNeeded * wastageMultiplier);
      const vialsNeeded = Math.ceil(dosesWithWastage / vaccine.vialsPerDose);
      const quarterlyVials = Math.ceil(vialsNeeded / 4);

      return {
        ...vaccine,
        targetPop: adjustedTarget,
        dosesNeeded,
        dosesWithWastage,
        vialsNeeded,
        quarterlyVials,
      };
    });
  }, [facilityPopulation, activeSchedule, coverageTarget, demographics]);

  const totalVials = calculations.reduce((sum, c) => sum + c.quarterlyVials, 0);
  const totalDoses = calculations.reduce((sum, c) => sum + c.dosesWithWastage, 0);

  const handleEditClick = (config: any) => {
    const dbConfig = vaccineConfigs?.find((c) => c.id === config.id);
    if (dbConfig) {
      setEditingConfig({ ...dbConfig });
      setIsEditDialogOpen(true);
    } else {
      // For fallback schedules, construct dummy config edit structure
      setEditingConfig({
        id: config.id,
        name: config.name,
        targetGroup: config.target,
        doses: config.doses,
        recommendedAge: config.recommendedAge,
        recommendedAgeWeeks: 0,
        wastageFactor: (1 + config.wastage / 100).toFixed(2),
        vialsPerDose: config.vialsPerDose,
        isActive: true,
      } as any);
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateConfig = () => {
    if (!editingConfig || editingConfig.id === undefined) return;
    updateMutation.mutate({
      id: editingConfig.id,
      data: editingConfig,
    });
  };

  const handleAddConfig = () => {
    createMutation.mutate(newConfig);
  };

  const [isImporting, setIsImporting] = useState(false);
  const handleImportTemplate = async () => {
    setIsImporting(true);
    try {
      let importedCount = 0;
      for (const antigen of fallbackVaccineSchedule) {
        const exists = vaccineConfigs?.some((c) => c.name.toLowerCase() === antigen.name.toLowerCase());
        if (!exists) {
          await apiRequest("POST", "/api/vaccines/config", {
            name: antigen.name,
            targetGroup: antigen.target,
            doses: antigen.doses,
            recommendedAge: antigen.recommendedAge,
            recommendedAgeWeeks: antigen.name === "BCG" || antigen.name === "OPV-0" ? 0 : 6,
            wastageFactor: (1 + antigen.wastage / 100).toFixed(2),
            vialsPerDose: antigen.vialsPerDose,
            isActive: true,
          });
          importedCount++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vaccines/config"] });
      toast({
        title: "Template Imported",
        description: importedCount > 0 
          ? `Successfully imported ${importedCount} standard EPI antigens.`
          : "All standard EPI antigens are already configured.",
      });
    } catch (err: any) {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import EPI antigens",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (loadingFacilities || loadingPopulation || loadingTenant || loadingConfigs) {
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

  return (
    <div className="p-6 space-y-6">
      <MicroplanStepper currentStep={6} facilityId={selectedFacility ? Number(selectedFacility) : null} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            EPI Vaccine Calculator
          </h1>
          <p className="text-muted-foreground text-sm">
            Calculate vaccine requirements and adjust tenant-level schedules dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isNationalAdmin && (
            <>
              <Button
                onClick={handleImportTemplate}
                variant="outline"
                className="border-dashed flex items-center gap-1.5"
                disabled={isImporting}
              >
                {isImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Import EPI Calculator Template
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="default">
                <Plus className="h-4 w-4 mr-1" />
                Add Antigen
              </Button>
            </>
          )}
          <Button variant="outline" data-testid="button-export-requirements">
            <Download className="h-4 w-4 mr-1" />
            Export Requirements
          </Button>
        </div>
      </div>

      <Card className="backdrop-blur-md bg-card/60 border border-border/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary animate-pulse" />
            Calculation Parameters
          </CardTitle>
          <CardDescription>
            Select microplanning facility, quarter and coverage targets to run estimations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Facility</Label>
              <Select
                value={selectedFacility || ""}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger data-testid="select-calculator-facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities?.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select
                value={selectedQuarter.toString()}
                onValueChange={(v) => setSelectedQuarter(parseInt(v))}
              >
                <SelectTrigger data-testid="select-calculator-quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Coverage Target (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={coverageTarget}
                  onChange={(e) => setCoverageTarget(parseInt(e.target.value) || 95)}
                  className="w-20"
                  data-testid="input-coverage-target"
                />
                <Progress value={coverageTarget} className="flex-1 h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {facilityPopulation && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Population Base</p>
                  <p className="text-3xl font-bold font-mono tracking-tight mt-1">
                    {facilityPopulation.totalPopulation?.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Doses (Q{selectedQuarter})</p>
                  <p className="text-3xl font-bold font-mono tracking-tight mt-1">
                    {totalDoses.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Syringe className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Vials Required (Q{selectedQuarter})</p>
                  <p className="text-3xl font-bold font-mono tracking-tight mt-1">
                    {totalVials.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Thermometer className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border border-border/40 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Antigen Matrix & Requirements</CardTitle>
          <CardDescription>
            Lists active immunizations, schedules, and dynamic calculations per dose requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedFacility ? (
            <div className="text-center py-12 text-muted-foreground">
              <Syringe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              Select a facility above to calculate operational vaccine requirements.
            </div>
          ) : !facilityPopulation ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500/50 mb-3" />
              No demographic population data available for this facility in {new Date().getFullYear()}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Antigen</TableHead>
                    <TableHead>Target Group</TableHead>
                    <TableHead className="text-right">Recommended Age</TableHead>
                    <TableHead className="text-right">Target Pop.</TableHead>
                    <TableHead className="text-right">Doses/Person</TableHead>
                    <TableHead className="text-right">Wastage Rate</TableHead>
                    <TableHead className="text-right">Total Doses</TableHead>
                    <TableHead className="text-right">Q{selectedQuarter} Vials</TableHead>
                    {isNationalAdmin && <TableHead className="text-center">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.name} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-primary/70" />
                          {calc.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {calc.target.replace(/([A-Z])/g, " $1").trim()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {calc.recommendedAge}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {calc.targetPop.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{calc.doses}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {calc.wastage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {calc.dosesWithWastage.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                        {calc.quarterlyVials.toLocaleString()}
                      </TableCell>
                      {isNationalAdmin && (
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditClick(calc)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Antigen Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Antigen</DialogTitle>
            <DialogDescription>
              Modify vaccine schedule targets, doses, recommended ages, and wastage multipliers.
            </DialogDescription>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Antigen Name</Label>
                <Select
                  value={fallbackVaccineSchedule.some(a => a.name === editingConfig.name) ? editingConfig.name : "Custom"}
                  onValueChange={(val) => {
                    if (val === "Custom") {
                      setEditingConfig({ ...editingConfig, name: "" });
                    } else {
                      const standard = fallbackVaccineSchedule.find((a) => a.name === val);
                      if (standard) {
                        setEditingConfig({
                          ...editingConfig,
                          name: standard.name,
                          targetGroup: standard.target,
                          doses: standard.doses,
                          recommendedAge: standard.recommendedAge,
                          wastageFactor: (1 + standard.wastage / 100).toFixed(2),
                          vialsPerDose: standard.vialsPerDose,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-edit-antigen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fallbackVaccineSchedule.map((antigen) => (
                      <SelectItem key={antigen.name} value={antigen.name}>
                        {antigen.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom / Other</SelectItem>
                  </SelectContent>
                </Select>
                {(!fallbackVaccineSchedule.some(a => a.name === editingConfig.name)) && (
                  <Input
                    className="mt-2"
                    placeholder="Enter custom antigen name"
                    value={editingConfig.name || ""}
                    onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Group</Label>
                  <Select
                    value={editingConfig.targetGroup || "under1"}
                    onValueChange={(v) => setEditingConfig({ ...editingConfig, targetGroup: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="births">Births</SelectItem>
                      <SelectItem value="under1">Under 1 Child</SelectItem>
                      <SelectItem value="pregnant">Pregnant Women</SelectItem>
                      <SelectItem value="schoolEntry">School Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Required Doses</Label>
                  <Input
                    type="number"
                    value={editingConfig.doses || 1}
                    onChange={(e) => setEditingConfig({ ...editingConfig, doses: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recommended Age weeks</Label>
                  <Input
                    type="number"
                    value={editingConfig.recommendedAgeWeeks || 0}
                    onChange={(e) => setEditingConfig({ ...editingConfig, recommendedAgeWeeks: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wastage Factor (e.g. 1.40 for 40%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingConfig.wastageFactor ? parseFloat(editingConfig.wastageFactor as string) : 1.10}
                    onChange={(e) => setEditingConfig({ ...editingConfig, wastageFactor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vials Packaging (vials/dose)</Label>
                  <Input
                    type="number"
                    value={editingConfig.vialsPerDose || 1}
                    onChange={(e) => setEditingConfig({ ...editingConfig, vialsPerDose: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recommended Age Desc</Label>
                  <Input
                    value={editingConfig.recommendedAge || ""}
                    onChange={(e) => setEditingConfig({ ...editingConfig, recommendedAge: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateConfig}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Antigen Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vaccine Config</DialogTitle>
            <DialogDescription>
              Create a custom vaccine profile for this tenant country program.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Antigen Name</Label>
              <Select
                value={isCustomAntigen ? "Custom" : newConfig.name || ""}
                onValueChange={(val) => {
                  if (val === "Custom") {
                    setIsCustomAntigen(true);
                    setNewConfig({
                      ...newConfig,
                      name: "",
                      targetGroup: "under1",
                      doses: 1,
                      recommendedAge: "",
                      recommendedAgeWeeks: 0,
                      wastageFactor: "1.10",
                      vialsPerDose: 1,
                    });
                  } else {
                    setIsCustomAntigen(false);
                    const standard = fallbackVaccineSchedule.find((a) => a.name === val);
                    if (standard) {
                      setNewConfig({
                        name: standard.name,
                        targetGroup: standard.target,
                        doses: standard.doses,
                        recommendedAge: standard.recommendedAge,
                        recommendedAgeWeeks: standard.name === "BCG" || standard.name === "OPV-0" ? 0 : 6,
                        wastageFactor: (1 + standard.wastage / 100).toFixed(2),
                        vialsPerDose: standard.vialsPerDose,
                        isActive: true,
                      });
                    }
                  }
                }}
              >
                <SelectTrigger data-testid="select-add-antigen">
                  <SelectValue placeholder="Select standard antigen..." />
                </SelectTrigger>
                <SelectContent>
                  {fallbackVaccineSchedule.map((antigen) => (
                    <SelectItem key={antigen.name} value={antigen.name}>
                      {antigen.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom / Other</SelectItem>
                </SelectContent>
              </Select>
              {isCustomAntigen && (
                <Input
                  className="mt-2"
                  placeholder="Enter custom antigen name"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Group</Label>
                <Select
                  value={newConfig.targetGroup}
                  onValueChange={(v) => setNewConfig({ ...newConfig, targetGroup: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="births">Births</SelectItem>
                    <SelectItem value="under1">Under 1 Child</SelectItem>
                    <SelectItem value="pregnant">Pregnant Women</SelectItem>
                    <SelectItem value="schoolEntry">School Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Required Doses</Label>
                <Input
                  type="number"
                  value={newConfig.doses}
                  onChange={(e) => setNewConfig({ ...newConfig, doses: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recommended Age weeks</Label>
                <Input
                  type="number"
                  value={newConfig.recommendedAgeWeeks}
                  onChange={(e) => setNewConfig({ ...newConfig, recommendedAgeWeeks: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Wastage Factor (e.g. 1.25)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newConfig.wastageFactor}
                  onChange={(e) => setNewConfig({ ...newConfig, wastageFactor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vials Packaging (vials/dose)</Label>
                <Input
                  type="number"
                  value={newConfig.vialsPerDose}
                  onChange={(e) => setNewConfig({ ...newConfig, vialsPerDose: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Recommended Age Desc</Label>
                <Input
                  placeholder="e.g. 6, 10, 14 weeks"
                  value={newConfig.recommendedAge}
                  onChange={(e) => setNewConfig({ ...newConfig, recommendedAge: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddConfig}>Create Config</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
