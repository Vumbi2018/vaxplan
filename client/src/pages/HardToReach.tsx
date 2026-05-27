import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/DataTable";
import { MapView } from "@/components/MapView";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  Mountain,
  Droplets,
  Clock,
  MapPin,
  Filter,
  Shield,
  Sliders,
  Sparkles,
  Info,
  RefreshCw,
  Pencil,
  Plus,
} from "lucide-react";
import type { Village, HtrScore } from "@shared/schema";
import { MicroplanStepper } from "@/components/MicroplanStepper";
import { AddCommunityDialog } from "@/components/AddCommunityDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HtrVillageData extends Village {
  htrScore?: HtrScore;
  compositeScore?: number;
  interventionPriority?: string;
}

export default function HardToReach() {
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [isAddCommunityOpen, setIsAddCommunityOpen] = useState(false);

  // Stateful weights for the interactive WHO HTR scoring matrix
  const [distanceWeight, setDistanceWeight] = useState(20);
  const [terrainWeight, setTerrainWeight] = useState(20);
  const [seasonalWeight, setSeasonalWeight] = useState(20);
  const [coverageWeight, setCoverageWeight] = useState(20);
  const [insecurityWeight, setInsecurityWeight] = useState(20);

  const { data: villages, isLoading: loadingVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: htrScores, isLoading: loadingScores } = useQuery<HtrScore[]>({
    queryKey: ["/api/htr-scores"],
  });

  const { toast } = useToast();
  const [showHtrOnly, setShowHtrOnly] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<HtrVillageData | null>(null);

  // Edit form states
  const [editDistance, setEditDistance] = useState("");
  const [editTravelTime, setEditTravelTime] = useState("");
  const [editTerrain, setEditTerrain] = useState("1");
  const [editSeasonal, setEditSeasonal] = useState("good");
  const [editTransport, setEditTransport] = useState("road");
  const [editIsHtr, setEditIsHtr] = useState(false);
  const [editInsecurity, setEditInsecurity] = useState("1");
  const [editComments, setEditComments] = useState("");

  const editVillageMutation = useMutation({
    mutationFn: async ({ id, villageData, htrData }: { id: number; villageData: any; htrData: any }) => {
      await apiRequest("PATCH", `/api/villages/${id}`, villageData);
      await apiRequest("POST", "/api/htr-scores", htrData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/htr-scores"] });
      setIsEditOpen(false);
      setEditingVillage(null);
      toast({
        title: "Risk Profile Updated",
        description: "Vulnerability indicators saved successfully to repository.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update risk profile.",
        variant: "destructive",
      });
    },
  });

  // Dynamic presets for immunization managers
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case "equal":
        setDistanceWeight(20);
        setTerrainWeight(20);
        setSeasonalWeight(20);
        setCoverageWeight(20);
        setInsecurityWeight(20);
        break;
      case "geographic":
        setDistanceWeight(40);
        setTerrainWeight(25);
        setSeasonalWeight(15);
        setCoverageWeight(10);
        setInsecurityWeight(10);
        break;
      case "seasonal":
        setDistanceWeight(10);
        setTerrainWeight(10);
        setSeasonalWeight(50);
        setCoverageWeight(15);
        setInsecurityWeight(15);
        break;
      case "coverage":
        setDistanceWeight(10);
        setTerrainWeight(10);
        setSeasonalWeight(10);
        setCoverageWeight(50);
        setInsecurityWeight(20);
        break;
      default:
        break;
    }
  };

  // Live Score Recalculator: computes HTR composite scores and ranks villages in real-time
  const htrVillages = useMemo<HtrVillageData[]>(() => {
    if (!villages) return [];
    
    return villages
      .filter((v) => !showHtrOnly || v.isHardToReach)
      .map((v) => {
        const dbScore = htrScores?.find((s) => s.villageId === v.id);

        // Standard baseline metrics fallbacks if database htrScore is missing
        const dScore = dbScore?.distanceScore ?? Math.min(100, Math.round((Number(v.distanceToFacility) || 0) * 5));
        const tScore = dbScore?.terrainScore ?? (v.terrainDifficulty || 1) * 20;
        
        let sScore = dbScore?.seasonalScore ?? 50;
        if (!dbScore?.seasonalScore) {
          const access = String(v.seasonalAccessibility || "").toLowerCase();
          if (access.includes("poor") || access.includes("limited")) sScore = 90;
          else if (access.includes("seasonal")) sScore = 60;
          else if (access.includes("always") || access.includes("good")) sScore = 20;
        }
        
        const cScore = dbScore?.coverageScore ?? 50;
        const iScore = dbScore?.insecurityScore ?? (v.insecurityLevel || 1) * 20;

        const totalWeight = distanceWeight + terrainWeight + seasonalWeight + coverageWeight + insecurityWeight;
        const computedScore = totalWeight > 0
          ? Math.round((dScore * distanceWeight + tScore * terrainWeight + sScore * seasonalWeight + cScore * coverageWeight + iScore * insecurityWeight) / totalWeight)
          : 0;

        // Epidemiological standard priority bands
        let calculatedPriority: "high" | "medium" | "low" = "low";
        if (computedScore >= 70) {
          calculatedPriority = "high";
        } else if (computedScore >= 40) {
          calculatedPriority = "medium";
        }

        return {
          ...v,
          compositeScore: computedScore,
          interventionPriority: calculatedPriority,
          htrScore: {
            id: dbScore?.id || 0,
            tenantId: v.tenantId,
            villageId: v.id,
            distanceScore: dScore,
            terrainScore: tScore,
            seasonalScore: sScore,
            coverageScore: cScore,
            insecurityScore: iScore,
            compositeScore: computedScore,
            interventionPriority: calculatedPriority,
            comments: dbScore?.comments ?? v.comments,
            calculatedAt: dbScore?.calculatedAt ? new Date(dbScore.calculatedAt) : new Date(),
          },
        };
      })
      .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)); // Auto-rank descending
  }, [villages, htrScores, distanceWeight, terrainWeight, seasonalWeight, coverageWeight]);

  const highPriority = htrVillages.filter((v) => v.interventionPriority === "high");
  const mediumPriority = htrVillages.filter((v) => v.interventionPriority === "medium");
  const lowPriority = htrVillages.filter((v) => v.interventionPriority === "low");

  const filteredVillages = selectedPriority
    ? htrVillages.filter((v) => v.interventionPriority === selectedPriority)
    : htrVillages;

  const columns = [
    {
      key: "name",
      header: "Village",
      sortable: true,
      render: (item: HtrVillageData) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.code || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "distanceToFacility",
      header: "Distance",
      sortable: true,
      render: (item: HtrVillageData) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {item.distanceToFacility ? `${item.distanceToFacility}km` : "-"}
        </div>
      ),
    },
    {
      key: "travelTimeMinutes",
      header: "Travel Time",
      sortable: true,
      render: (item: HtrVillageData) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {item.travelTimeMinutes ? `${item.travelTimeMinutes} min` : "-"}
        </div>
      ),
    },
    {
      key: "transportMode",
      header: "Access",
      render: (item: HtrVillageData) => (
        <Badge variant="outline" className="capitalize">
          {item.transportMode || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "insecurityLevel",
      header: "Insecurity",
      sortable: true,
      render: (item: HtrVillageData) => {
        const level = item.insecurityLevel ?? 1;
        const labels: Record<number, string> = {
          1: "Secure",
          2: "Minor concerns",
          3: "Moderate",
          4: "Severe risk",
          5: "Critical",
        };
        const variants: Record<number, "secondary" | "outline" | "default" | "destructive"> = {
          1: "secondary",
          2: "outline",
          3: "default",
          4: "destructive",
          5: "destructive",
        };
        return (
          <Badge variant={variants[level] || "outline"} className="text-xs">
            {labels[level] || `Level ${level}`}
          </Badge>
        );
      },
    },
    {
      key: "comments",
      header: "Comments / Local Context",
      render: (item: HtrVillageData) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]" title={item.comments || ""}>
          {item.comments || "-"}
        </span>
      ),
    },
    {
      key: "compositeScore",
      header: "HTR Score",
      sortable: true,
      render: (item: HtrVillageData) => {
        const score = item.compositeScore || 0;
        return (
          <div className="flex items-center gap-2">
            <Progress value={score} className="w-16 h-2" />
            <span className="text-sm font-medium">{score}</span>
          </div>
        );
      },
    },
    {
      key: "interventionPriority",
      header: "Priority",
      sortable: true,
      render: (item: HtrVillageData) => {
        const priority = item.interventionPriority || "unknown";
        return (
          <Badge
            variant={
              priority === "high"
                ? "destructive"
                : priority === "medium"
                ? "secondary"
                : "outline"
            }
            className="capitalize"
          >
            {priority}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: HtrVillageData) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => {
            setEditingVillage(item);
            setEditDistance(item.distanceToFacility ? String(item.distanceToFacility) : "");
            setEditTravelTime(item.travelTimeMinutes ? String(item.travelTimeMinutes) : "");
            setEditTerrain(item.terrainDifficulty ? String(item.terrainDifficulty) : "1");
            
            const access = String(item.seasonalAccessibility || "").toLowerCase();
            if (access.includes("poor") || access.includes("limited")) setEditSeasonal("poor");
            else if (access.includes("seasonal")) setEditSeasonal("seasonal");
            else setEditSeasonal("good");

            setEditTransport(item.transportMode || "road");
            setEditIsHtr(item.isHardToReach || false);
            setEditInsecurity(item.insecurityLevel ? String(item.insecurityLevel) : "1");
            setEditComments(item.comments || "");
            setIsEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loadingVillages || loadingScores) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
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
          <div className="lg:col-span-1">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <MicroplanStepper currentStep={2} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Hard-to-Reach Planning</h1>
          <p className="text-muted-foreground text-sm">
            Simulate and prioritize immunization interventions for difficult-to-access communities
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setIsAddCommunityOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 gap-1.5 h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Add Community</span>
          </Button>
          <div className="flex items-center gap-3 bg-muted/60 dark:bg-slate-800/40 border p-2.5 px-4 rounded-xl shadow-xs">
            <Label htmlFor="toggle-htr-only" className="text-xs font-bold text-muted-foreground uppercase cursor-pointer">
              Show Hard-to-Reach Only
            </Label>
            <Switch
              id="toggle-htr-only"
              checked={showHtrOnly}
              onCheckedChange={setShowHtrOnly}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main interactive panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Priority stats summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${
                selectedPriority === "high" ? "ring-2 ring-destructive" : ""
              }`}
              onClick={() => setSelectedPriority(selectedPriority === "high" ? null : "high")}
              data-testid="card-high-priority"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                    <p className="text-2xl font-bold text-destructive">{highPriority.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${
                selectedPriority === "medium" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedPriority(selectedPriority === "medium" ? null : "medium")}
              data-testid="card-medium-priority"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Medium Priority</p>
                    <p className="text-2xl font-bold">{mediumPriority.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${
                selectedPriority === "low" ? "ring-2 ring-muted-foreground" : ""
              }`}
              onClick={() => setSelectedPriority(selectedPriority === "low" ? null : "low")}
              data-testid="card-low-priority"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Priority</p>
                    <p className="text-2xl font-bold text-muted-foreground">{lowPriority.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list" data-testid="tab-list">List View</TabsTrigger>
              <TabsTrigger value="map" data-testid="tab-map">Map View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">HTR Villages</CardTitle>
                    {selectedPriority && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPriority(null)}
                        data-testid="button-clear-filter"
                      >
                        <Filter className="h-4 w-4 mr-1" />
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <DataTable
                    data={filteredVillages}
                    columns={columns}
                    searchable
                    searchKeys={["name", "code"]}
                    emptyMessage="No hard-to-reach villages found."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <MapView
                      facilities={[]}
                      villages={filteredVillages}
                      height="100%"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Stateful Risk Matrix Side panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Scoring Weights</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Adjust scoring indicator coefficients to recalculate community vulnerability scores in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Distance Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Distance weight
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {distanceWeight}%
                  </Badge>
                </div>
                <Slider
                  value={[distanceWeight]}
                  onValueChange={(val) => setDistanceWeight(val[0])}
                  max={100}
                  step={5}
                />
              </div>

              {/* Terrain Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mountain className="h-3.5 w-3.5" />
                    Terrain Difficulty
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {terrainWeight}%
                  </Badge>
                </div>
                <Slider
                  value={[terrainWeight]}
                  onValueChange={(val) => setTerrainWeight(val[0])}
                  max={100}
                  step={5}
                />
              </div>

              {/* Seasonal Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    Seasonal Access
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {seasonalWeight}%
                  </Badge>
                </div>
                <Slider
                  value={[seasonalWeight]}
                  onValueChange={(val) => setSeasonalWeight(val[0])}
                  max={100}
                  step={5}
                />
              </div>

              {/* Coverage Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Vaccine Coverage
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {coverageWeight}%
                  </Badge>
                </div>
                <Slider
                  value={[coverageWeight]}
                  onValueChange={(val) => setCoverageWeight(val[0])}
                  max={100}
                  step={5}
                />
              </div>

              {/* Security Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 animate-pulse" />
                    Security Weight
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {insecurityWeight}%
                  </Badge>
                </div>
                <Slider
                  value={[insecurityWeight]}
                  onValueChange={(val) => setInsecurityWeight(val[0])}
                  max={100}
                  step={5}
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Quick Preset Weights
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 px-2"
                    onClick={() => applyPreset("equal")}
                  >
                    <Info className="h-3 w-3 mr-1 text-blue-500" />
                    Equal Balance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 px-2"
                    onClick={() => applyPreset("geographic")}
                  >
                    <Mountain className="h-3 w-3 mr-1 text-amber-500" />
                    Remote Biased
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 px-2"
                    onClick={() => applyPreset("seasonal")}
                  >
                    <Droplets className="h-3 w-3 mr-1 text-teal-500" />
                    Wet Season
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 px-2"
                    onClick={() => applyPreset("coverage")}
                  >
                    <Shield className="h-3 w-3 mr-1 text-emerald-500" />
                    Epi Coverage
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <p>
                  Scores dynamically normalized based on custom weighting. Villages scoring &ge; 70 fall into <strong>High Priority</strong> mobile-team targeting.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">HTR Scoring Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                title: "Distance Score",
                description: "Based on kilometers from nearest facility",
                weight: "Distance Weight Factor",
              },
              {
                title: "Terrain Score",
                description: "Difficulty of terrain (mountains, rivers)",
                weight: "Terrain Weight Factor",
              },
              {
                title: "Seasonal Score",
                description: "Accessibility during wet/dry seasons",
                weight: "Seasonal Weight Factor",
              },
              {
                title: "Coverage Score",
                description: "Historical immunization coverage rates",
                weight: "Coverage Weight Factor",
              },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{item.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.weight}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Editing HTR Community Parameters */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Sliders className="h-5 w-5 text-indigo-500" />
              Edit Community HTR Risk Profile
            </DialogTitle>
          </DialogHeader>

          {editingVillage && (
            <div className="space-y-4 pt-3">
              <div className="p-3 bg-muted/40 border rounded-xl text-xs space-y-1">
                <p className="font-bold text-foreground">Community: {editingVillage.name}</p>
                <p className="text-[10px] text-muted-foreground">Original HTR Score: {editingVillage.compositeScore}% ({editingVillage.interventionPriority} priority)</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="htr-dist" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distance to Clinic (km)</Label>
                  <Input
                    id="htr-dist"
                    type="number"
                    step="0.1"
                    value={editDistance}
                    onChange={(e) => setEditDistance(e.target.value)}
                    className="bg-background rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="htr-time" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Travel Time (mins)</Label>
                  <Input
                    id="htr-time"
                    type="number"
                    value={editTravelTime}
                    onChange={(e) => setEditTravelTime(e.target.value)}
                    className="bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="htr-terrain" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terrain Level (1-5)</Label>
                  <Select value={editTerrain} onValueChange={setEditTerrain}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1: Flat / Easy</SelectItem>
                      <SelectItem value="2">2: Moderate hills</SelectItem>
                      <SelectItem value="3">3: Mountainous / Rough</SelectItem>
                      <SelectItem value="4">4: Steep cliffs / River crossings</SelectItem>
                      <SelectItem value="5">5: Severe / Isolated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="htr-transport" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Transport</Label>
                  <Select value={editTransport} onValueChange={setEditTransport}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walking">Walking / Foot</SelectItem>
                      <SelectItem value="road">Road (Car/Motorcycle)</SelectItem>
                      <SelectItem value="boat">Riverine (Canoe/Boat)</SelectItem>
                      <SelectItem value="air">Air (Helicopter/Flight)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="htr-insecurity" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insecurity Level</Label>
                  <Select value={editInsecurity} onValueChange={setEditInsecurity}>
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
                  <Label htmlFor="htr-seasonal" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seasonal Isolation</Label>
                  <Select value={editSeasonal} onValueChange={setEditSeasonal}>
                    <SelectTrigger className="bg-background rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Always accessible (Good roads)</SelectItem>
                      <SelectItem value="seasonal">Seasonally isolated (Floods during rains)</SelectItem>
                      <SelectItem value="poor">Permanently poor accessibility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="htr-comments" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Local Remarks / Context Comments</Label>
                <Textarea
                  id="htr-comments"
                  placeholder="Describe active conflicts, security escorts needed, flood zones, or high-risk parameters..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="bg-background rounded-xl text-xs min-h-[70px]"
                />
              </div>

              <div className="flex items-center justify-between border border-dashed border-indigo-500/20 bg-indigo-500/5 rounded-xl p-3 mt-1">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-htr" className="text-xs font-bold text-foreground cursor-pointer">HTR Vulnerability Flag</Label>
                  <p className="text-[10px] text-muted-foreground">Flag as Hard-to-Reach to require outreach/mobile scheduling</p>
                </div>
                <Switch
                  id="edit-htr"
                  checked={editIsHtr}
                  onCheckedChange={setEditIsHtr}
                />
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingVillage(null); }} className="rounded-xl text-xs" type="button">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editingVillage) return;

                    const dScore = Math.min(100, Math.round(parseFloat(editDistance || "0") * 5));
                    const tScore = parseInt(editTerrain) * 20;
                    const sScore = editSeasonal === "poor" ? 90 : editSeasonal === "seasonal" ? 60 : 20;
                    const cScore = editingVillage.htrScore?.coverageScore || 50;
                    const iScore = parseInt(editInsecurity) * 20;

                    const totalWeight = distanceWeight + terrainWeight + seasonalWeight + coverageWeight + insecurityWeight;
                    const compositeScore = Math.round((dScore * distanceWeight + tScore * terrainWeight + sScore * seasonalWeight + cScore * coverageWeight + iScore * insecurityWeight) / totalWeight);

                    const interventionPriority = compositeScore >= 70 ? "high" : compositeScore >= 40 ? "medium" : "low";

                    editVillageMutation.mutate({
                      id: editingVillage.id,
                      villageData: {
                        distanceToFacility: editDistance,
                        travelTimeMinutes: parseInt(editTravelTime) || 30,
                        terrainDifficulty: parseInt(editTerrain),
                        seasonalAccessibility: editSeasonal,
                        transportMode: editTransport,
                        isHardToReach: editIsHtr,
                        insecurityLevel: parseInt(editInsecurity),
                        comments: editComments.trim() || null,
                      },
                      htrData: {
                        villageId: editingVillage.id,
                        distanceScore: dScore,
                        terrainScore: tScore,
                        seasonalScore: sScore,
                        coverageScore: cScore,
                        insecurityScore: iScore,
                        compositeScore,
                        interventionPriority,
                        comments: editComments.trim() || null,
                      },
                    });
                  }}
                  disabled={editVillageMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold px-4"
                  type="button"
                >
                  {editVillageMutation.isPending ? "Saving..." : "Save Risk Profile"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddCommunityDialog
        isOpen={isAddCommunityOpen}
        onClose={() => setIsAddCommunityOpen(false)}
        defaultFacilityId={villages?.[0]?.assignedFacilityId || null}
      />
    </div>
  );
}

