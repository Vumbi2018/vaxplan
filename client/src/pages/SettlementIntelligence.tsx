import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Polygon,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_TILE_ATTRIBUTION } from "@/data/dataSources";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Globe,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Sliders,
  Search,
  Building2,
  Clock,
  Zap,
  Layers,
  Sparkles,
  TrendingUp,
  Map as MapIcon,
  Compass,
  Car,
  Footprints,
  Route,
  GraduationCap,
  Church,
  Store,
  Droplets,
  Bus,
  Loader2
} from "lucide-react";

// Community-asset presentation helpers (icon, colour, label per OSM category)
const ASSET_META: Record<string, { label: string; color: string; icon: any }> = {
  school: { label: "School", color: "#2563eb", icon: GraduationCap },
  church: { label: "Place of worship", color: "#7c3aed", icon: Church },
  market: { label: "Market", color: "#ea580c", icon: Store },
  water_point: { label: "Water point", color: "#0891b2", icon: Droplets },
  transport: { label: "Transport node", color: "#475569", icon: Bus },
};

// Map center management helper
function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Keeps the community-asset layer query in sync with where the user has panned/zoomed.
// Debounced so we don't hammer Overpass while the map is still moving.
function MapMoveWatcher({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const map = useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const c = map.getCenter();
        onCenterChange([c.lat, c.lng]);
      }, 600);
    }
  });
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  return null;
}

export default function SettlementIntelligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active configurations
  const [popThreshold, setPopThreshold] = useState<number>(50);
  const [buildThreshold, setBuildThreshold] = useState<number>(10);
  const [radiusKm, setRadiusKm] = useState<number>(1.5);
  
  // Layer visibility toggles
  const [showMasterSettlements, setShowMasterSettlements] = useState(true);
  const [showZeroDoseCandidates, setShowZeroDoseCandidates] = useState(true);
  const [showCoverageGaps, setShowCoverageGaps] = useState(false);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showOutreachRecs, setShowOutreachRecs] = useState(false);
  const [showCommunityAssets, setShowCommunityAssets] = useState(false);
  const [showTravelZones, setShowTravelZones] = useState(false);

  // Geospatial insights dialog (real travel time + nearby community assets)
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsPoint, setInsightsPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Validation Promotion controls
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [groundTruthedName, setGroundTruthedName] = useState("");
  const [promotionPlaceType, setPromotionPlaceType] = useState("village");

  // Dynamic coordinates focusing
  const [activeCenter, setActiveCenter] = useState<[number, number]>([-13.13, 27.84]); // Default Zambia Center
  // Tracks where the user has panned/zoomed; drives the community-asset layer query so it follows the map.
  const [assetsCenter, setAssetsCenter] = useState<[number, number]>([-13.13, 27.84]);
  const [activeZoom, setActiveZoom] = useState<number>(6);

  // Queries
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"]
  });

  const { data: activeTenant } = useQuery<any>({
    queryKey: ["/api/public/tenants"],
    select: (tenants: any[]) => tenants.find((t) => t.id === tenantInfo?.id)
  });

  const { data: settlements = [] } = useQuery<any[]>({
    queryKey: ["/api/settlements", tenantInfo?.id],
    enabled: !!tenantInfo?.id
  });

  const { data: candidates = [] } = useQuery<any[]>({
    queryKey: ["/api/unmapped-settlements", tenantInfo?.id],
    enabled: !!tenantInfo?.id
  });

  const { data: coverageGaps } = useQuery<any>({
    queryKey: ["/api/coverage-gaps", tenantInfo?.id],
    enabled: !!tenantInfo?.id && showCoverageGaps
  });

  const { data: outreachRecs = [] } = useQuery<any[]>({
    queryKey: ["/api/outreach-recommendations", tenantInfo?.id],
    enabled: !!tenantInfo?.id
  });

  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities", tenantInfo?.id],
    enabled: !!tenantInfo?.id
  });

  // Real road-network travel time to nearest facility for the inspected point
  const { data: travelTime, isLoading: travelTimeLoading } = useQuery<any>({
    queryKey: ["/api/geo/travel-time", insightsPoint?.lat, insightsPoint?.lng],
    queryFn: () =>
      apiRequest("GET", `/api/geo/travel-time?lng=${insightsPoint!.lng}&lat=${insightsPoint!.lat}`),
    enabled: insightsOpen && !!insightsPoint,
    staleTime: 6 * 60 * 60 * 1000
  });

  // Nearby community assets (OSM Overpass) for the inspected point
  const { data: insightAssets, isLoading: insightAssetsLoading } = useQuery<any>({
    queryKey: ["/api/geo/community-assets", "insight", insightsPoint?.lat, insightsPoint?.lng],
    queryFn: () =>
      apiRequest("GET", `/api/geo/community-assets?lng=${insightsPoint!.lng}&lat=${insightsPoint!.lat}&radiusKm=3`),
    enabled: insightsOpen && !!insightsPoint,
    staleTime: 24 * 60 * 60 * 1000
  });

  // Community-asset map layer: discover assets around the current map centre
  const { data: layerAssets, isLoading: layerAssetsLoading } = useQuery<any>({
    queryKey: ["/api/geo/community-assets", "layer", assetsCenter[0], assetsCenter[1]],
    queryFn: () =>
      apiRequest("GET", `/api/geo/community-assets?lng=${assetsCenter[1]}&lat=${assetsCenter[0]}&radiusKm=5`),
    enabled: showCommunityAssets,
    staleTime: 24 * 60 * 60 * 1000
  });

  // Center maps dynamically based on tenant center or facility average
  useEffect(() => {
    if (activeTenant?.settings?.mapCenter) {
      setActiveCenter(activeTenant.settings.mapCenter);
      if (activeTenant.settings.mapZoom) {
        setActiveZoom(activeTenant.settings.mapZoom);
      }
    } else if (facilities.length > 0) {
      const activeFacs = facilities.filter(f => f.latitude && f.longitude);
      if (activeFacs.length > 0) {
        const avgLat = activeFacs.reduce((s, f) => s + parseFloat(f.latitude), 0) / activeFacs.length;
        const avgLng = activeFacs.reduce((s, f) => s + parseFloat(f.longitude), 0) / activeFacs.length;
        setActiveCenter([avgLat, avgLng]);
        setActiveZoom(8);
      }
    }
  }, [activeTenant, facilities]);

  // Mutations
  const detectionMutation = useMutation({
    mutationFn: async (params: any) => {
      return (await apiRequest("POST", "/api/unmapped-settlements/run-engine", params)) as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/unmapped-settlements"] });
      toast({
        title: "Spatial Detection Completed",
        description: `Successfully scanned national grids. Detected ${data.candidatesDetected} potential unmapped settlements.`,
        variant: "default"
      });
    },
    onError: (err: any) => {
      toast({
        title: "Detection Engine Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      return (await apiRequest("POST", `/api/unmapped-settlements/${id}/validate`, payload)) as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/unmapped-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-recommendations"] });
      setValidationModalOpen(false);
      setGroundTruthedName("");
      toast({
        title: "Settlement Promoted!",
        description: `Successfully added "${data.settlement.name}" as an official validated settlement registry entry.`,
        className: "bg-emerald-600 text-white border-none shadow-lg"
      });
    },
    onError: (err: any) => {
      toast({
        title: "Validation Promotion Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  // Filters
  const filteredSettlements = useMemo(() => {
    if (!searchQuery) return settlements;
    const lower = searchQuery.toLowerCase();
    return settlements.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.districtName && s.districtName.toLowerCase().includes(lower)) ||
        (s.wardName && s.wardName.toLowerCase().includes(lower))
    );
  }, [settlements, searchQuery]);

  const handleRunDetection = () => {
    detectionMutation.mutate({
      populationThreshold: popThreshold,
      buildingThreshold: buildThreshold,
      radiusKm: radiusKm
    });
  };

  const handleOpenValidation = (candidate: any) => {
    setSelectedCandidate(candidate);
    setPromotionPlaceType("village");
    setGroundTruthedName("");
    setValidationModalOpen(true);
  };

  const handleConfirmValidation = () => {
    if (!groundTruthedName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a valid ground-truthed settlement name.",
        variant: "destructive"
      });
      return;
    }
    validateMutation.mutate({
      id: selectedCandidate.id,
      payload: {
        name: groundTruthedName.trim(),
        placeType: promotionPlaceType
      }
    });
  };

  const focusOnCoordinates = (lat: number, lng: number) => {
    setActiveCenter([lat, lng]);
    setActiveZoom(13);
  };

  const handleOpenInsights = (lat: number, lng: number, label: string) => {
    setInsightsPoint({ lat, lng, label });
    setInsightsOpen(true);
  };

  const fmtMinutes = (min: number | null | undefined) => {
    if (min === null || min === undefined || !Number.isFinite(min)) return "—";
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  };

  // Render one routed destination (nearest facility or nearest outreach site).
  const renderTravelDestination = (
    dest: {
      name: string | null;
      driving?: { durationMin?: number; estimated?: boolean };
      walking?: { durationMin?: number; estimated?: boolean };
      roadDistanceKm?: number | null;
      straightLineKm?: number | null;
      routeClassification?: string;
    },
    label: string,
    icon: React.ReactNode,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{label}</div>
      </div>
      <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        {icon}
        {dest.name}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-2">
          <Car className="h-4 w-4 text-teal-600" />
          <div>
            <div className="font-extrabold text-slate-800">{fmtMinutes(dest.driving?.durationMin)}</div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">
              Driving{dest.driving?.estimated ? " (est.)" : ""}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-2">
          <Footprints className="h-4 w-4 text-amber-600" />
          <div>
            <div className="font-extrabold text-slate-800">{fmtMinutes(dest.walking?.durationMin)}</div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">
              Walking{dest.walking?.estimated ? " (est.)" : ""}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
        <span>
          {dest.roadDistanceKm != null
            ? `${dest.roadDistanceKm} km by road`
            : `${dest.straightLineKm} km straight-line`}
        </span>
        <Badge
          variant="secondary"
          className={`text-[9px] px-1.5 py-0 border ${
            dest.routeClassification === "road"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}
        >
          {dest.routeClassification === "road" ? "Road route" : "Straight-line estimate"}
        </Badge>
      </div>
    </div>
  );

  // Walking-time rings (km radius at ~5 km/h) for the travel-time-zone layer
  const TRAVEL_RINGS = [
    { hours: 1, radiusM: 5000, color: "#16a34a" },
    { hours: 2, radiusM: 10000, color: "#d97706" },
    { hours: 3, radiusM: 15000, color: "#dc2626" },
  ];

  return (
    <div className="flex h-[calc(100vh-4.5rem)] w-full overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* LEFT SIDEBAR HUD: ANALYTICS & ALERTS CONTROL HUB */}
      <div className="w-[400px] border-r border-slate-200 bg-white/95 backdrop-blur-md flex flex-col h-full min-w-[400px] z-10 shadow-sm">
        
        {/* Header Block */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Globe className="h-5 w-5 text-teal-600 animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Settlement Intelligence</h1>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Fusing OpenStreetMap names, GRID3 footprint structures, and high-resolution WorldPop population grids.
          </p>
        </div>

        {/* Dynamic Config Controls inside Glass Card */}
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-teal-600" />
              DETECTION THRESHOLDS
            </span>
            <Badge variant="secondary" className="bg-teal-50 text-teal-700 border border-teal-100 text-[10px] px-1.5 py-0">
              PostGIS Spatial Engine
            </Badge>
          </div>

          <div className="space-y-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 shadow-sm">
            {/* Pop Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-semibold">Min. Population</span>
                <span className="font-mono text-teal-600 font-bold">{popThreshold} people</span>
              </div>
              <Slider
                value={[popThreshold]}
                onValueChange={(val) => setPopThreshold(val[0])}
                min={10}
                max={500}
                step={5}
                className="py-1 cursor-pointer"
              />
            </div>

            {/* Building Footprint Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-semibold">Min. Building Footprints</span>
                <span className="font-mono text-teal-600 font-bold">{buildThreshold} units</span>
              </div>
              <Slider
                value={[buildThreshold]}
                onValueChange={(val) => setBuildThreshold(val[0])}
                min={2}
                max={100}
                step={1}
                className="py-1 cursor-pointer"
              />
            </div>

            {/* Search Radius Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-semibold">Exclusion Radius</span>
                <span className="font-mono text-teal-600 font-bold">{radiusKm} km</span>
              </div>
              <Slider
                value={[radiusKm]}
                onValueChange={(val) => setRadiusKm(val[0])}
                min={0.5}
                max={5.0}
                step={0.1}
                className="py-1 cursor-pointer"
              />
            </div>

            <Button
              className="w-full mt-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 shadow-sm rounded-lg flex items-center justify-center gap-1.5"
              onClick={handleRunDetection}
              disabled={detectionMutation.isPending}
            >
              <Zap className="h-3.5 w-3.5" />
              {detectionMutation.isPending ? "RUNNING SPATIAL ALGORITHM..." : "RUN SPATIAL DETECTION"}
            </Button>
          </div>
        </div>

        {/* ALERTS FEED & SEARCH HUB */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {/* Active Alerts HUD */}
          {candidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-rose-600">
                <AlertTriangle className="h-4 w-4 animate-bounce" />
                ZERO-DOSE CLUSTER ALERTS ({candidates.length})
              </div>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {candidates.map((c) => (
                  <Card key={c.id} className="bg-rose-50/30 border-rose-100 hover:bg-rose-50/50 transition-all p-3.5 rounded-xl border shadow-sm flex flex-col space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-rose-800">Unmapped Cluster #{c.id}</span>
                        <div className="text-[10px] text-slate-500">Near: {c.nearestNamedSettlement}</div>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 border border-rose-200/50 text-[9px] px-1.5 font-bold">
                        {c.estimatedPopulation} people
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-white/80 p-2 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-rose-500" />
                        <span>{c.buildingCount} footprint units</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-rose-500" />
                        <span>{parseFloat(c.distanceToFacility).toFixed(1)} km to facility</span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7 text-slate-600 hover:text-slate-900 px-2.5 hover:bg-slate-100"
                        onClick={() => focusOnCoordinates(parseFloat(c.latitude), parseFloat(c.longitude))}
                      >
                        Locate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7 text-teal-700 hover:text-teal-900 px-2.5 hover:bg-teal-50 flex items-center gap-1"
                        onClick={() => handleOpenInsights(parseFloat(c.latitude), parseFloat(c.longitude), `Unmapped Cluster #${c.id}`)}
                      >
                        <Compass className="h-3 w-3" />
                        Insights
                      </Button>
                      <Button
                        size="sm"
                        className="text-[10px] h-7 bg-rose-600 hover:bg-rose-700 text-white px-2.5 font-bold rounded-lg"
                        onClick={() => handleOpenValidation(c)}
                      >
                        Validate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Master Search Bar */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-teal-600" />
              MASTER REGISTRY SEARCH
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search villages, districts, wards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white border-slate-200 text-slate-950 placeholder-slate-400 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500"
              />
            </div>
          </div>

          {/* Registry List Feed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Settlement Records ({filteredSettlements.length})</span>
              <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Filtered</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredSettlements.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  No validated settlement records found.
                </div>
              ) : (
                filteredSettlements.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-all flex justify-between items-center text-xs text-slate-800"
                    onClick={() => focusOnCoordinates(parseFloat(s.latitude), parseFloat(s.longitude))}
                  >
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1 text-slate-900">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {s.provinceName} · {s.districtName} · {s.wardName}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <Badge className="bg-teal-50 text-teal-700 border border-teal-100 text-[9px] px-1.5">
                          {s.populationEstimate} pop
                        </Badge>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                          {s.placeType}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Geospatial insights"
                        className="h-7 w-7 text-teal-600 hover:text-teal-800 hover:bg-teal-50 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInsights(parseFloat(s.latitude), parseFloat(s.longitude), s.name);
                        }}
                      >
                        <Compass className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer Statistics */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 text-[10px] text-slate-500 flex justify-between items-center px-4">
          <span>Active Registry: <strong className="text-slate-800 font-bold">{settlements.length}</strong> settlements</span>
          <span>Pending Validation: <strong className="text-rose-600 font-bold">{candidates.length}</strong> nodes</span>
        </div>

      </div>

      {/* CENTER INTERACTIVE GIS MAP & ANALYTICS HUD OVERLAY */}
      <div className="flex-1 h-full relative flex flex-col">
        
        {/* INTERACTIVE LEAFLET MAP ELEMENT */}
        <div className="flex-1 w-full bg-slate-100 z-0">
          <MapContainer
            center={activeCenter}
            zoom={activeZoom}
            zoomControl={false}
            className="h-full w-full"
            style={{ background: "#f8fafc" }}
          >
            {/* Beautiful light Voyager map tiles matching light aesthetic */}
            <TileLayer
              attribution={`${OSM_TILE_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`}
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapCenterController center={activeCenter} zoom={activeZoom} />
            <MapMoveWatcher onCenterChange={setAssetsCenter} />

            {/* Render 5km Service Coverage Gap Polygons */}
            {showCoverageGaps && coverageGaps?.features && (
              coverageGaps.features.map((feature: any) => (
                <Polygon
                  key={feature.id}
                  positions={
                    feature.geojson.geometry.type === "Polygon"
                      ? feature.geojson.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]])
                      : feature.geojson.geometry.coordinates[0][0].map((coord: any) => [coord[1], coord[0]])
                  }
                  pathOptions={{
                    color: "#f43f5e",
                    fillColor: "#f43f5e",
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: "3, 5"
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-1">
                      <span className="font-bold text-rose-600">Zero-Dose Service Coverage Gap</span>
                      <div>Est. Population: <strong>{feature.population}</strong> people</div>
                      <div>Distance to Service: <strong>{feature.distanceKm} km</strong></div>
                    </div>
                  </Popup>
                </Polygon>
              ))
            )}

            {/* Render Master Settlements as Lightweight, Translucent Circle Markers */}
            {showMasterSettlements && settlements.map((s) => (
              <CircleMarker
                key={`master-${s.id}`}
                center={[parseFloat(s.latitude), parseFloat(s.longitude)]}
                radius={4}
                pathOptions={{
                  color: "#0d9488", // Teal outline
                  fillColor: "#2dd4bf", // Light teal fill
                  fillOpacity: 0.6,
                  weight: 1
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5">
                    <div className="font-bold text-teal-700 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      {s.name}
                    </div>
                    <hr className="border-slate-100" />
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <span className="text-slate-500">Hierarchy:</span>
                      <span className="text-slate-800 font-semibold">{s.provinceName} · {s.districtName}</span>
                      <span className="text-slate-500">Classification:</span>
                      <span className="text-slate-800 font-semibold">{s.placeType}</span>
                      <span className="text-slate-500">Est. Population:</span>
                      <span className="text-slate-800 font-bold">{s.populationEstimate}</span>
                      <span className="text-slate-500">Access Rating:</span>
                      <span className={`font-bold ${s.hardToReach ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {s.hardToReach ? 'Hard to Reach' : 'Easy Access'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Render Zero-Dose Candidates as Pulsing Red Circle Markers */}
            {showZeroDoseCandidates && candidates.map((c) => (
              <CircleMarker
                key={`candidate-${c.id}`}
                center={[parseFloat(c.latitude), parseFloat(c.longitude)]}
                radius={6}
                pathOptions={{
                  color: "#e11d48", // Rose outline
                  fillColor: "#fb7185", // Light rose fill
                  fillOpacity: 0.8,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-xs p-2 space-y-2 w-64">
                    <div className="font-bold text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Zero-Dose Cluster Candidate
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      This populated cluster has no nearby named settlement within {radiusKm}km and lies outside normal outreach catchment limits.
                    </p>
                    <hr className="border-slate-100" />
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                      <span className="text-slate-500">Est. Population:</span>
                      <span className="text-slate-800 font-bold">{c.estimatedPopulation}</span>
                      <span className="text-slate-500">Building Count:</span>
                      <span className="text-slate-800 font-bold">{c.buildingCount} footprints</span>
                      <span className="text-slate-500">Nearest Clinic:</span>
                      <span className="text-slate-800 font-medium">{c.nearestFacility}</span>
                      <span className="text-slate-500">Facility Distance:</span>
                      <span className="text-slate-800 font-bold">{parseFloat(c.distanceToFacility).toFixed(1)} km</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-7"
                      onClick={() => handleOpenValidation(c)}
                    >
                      Promote to Master Registry
                    </Button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Render Outreach Recommendations as Amber Circle Markers */}
            {showOutreachRecs && outreachRecs.map((r) => (
              <CircleMarker
                key={`rec-${r.id}`}
                center={[r.latitude, r.longitude]}
                radius={5.5}
                pathOptions={{
                  color: "#d97706", // Amber outline
                  fillColor: "#fbbf24", // Light amber fill
                  fillOpacity: 0.8,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-xs p-2 space-y-1.5">
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      Suggested Outreach Site
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Optimal outreach outpost coordinates generated by the engine to cover surrounding Zero-Dose clusters.
                    </p>
                    <hr className="border-slate-100" />
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                      <span className="text-slate-500">Target Pop:</span>
                      <span className="text-slate-800 font-bold">{r.estimatedPopulation}</span>
                      <span className="text-slate-500">Nearest Base:</span>
                      <span className="text-slate-800 font-medium">{r.nearestFacility}</span>
                      <span className="text-slate-500">Base Distance:</span>
                      <span className="text-slate-800 font-bold">{r.distanceToFacilityKm.toFixed(1)} km</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Render Base Health Facilities as Indigo Circle Markers */}
            {showFacilities && facilities.map((f) => (
              f.latitude && f.longitude && (
                <CircleMarker
                  key={`facility-${f.id}`}
                  center={[parseFloat(f.latitude), parseFloat(f.longitude)]}
                  radius={5.5}
                  pathOptions={{
                    color: "#4f46e5", // Indigo outline
                    fillColor: "#818cf8", // Indigo fill
                    fillOpacity: 0.85,
                    weight: 1.5
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-1">
                      <span className="font-bold text-indigo-700 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                        {f.name}
                      </span>
                      <hr className="border-slate-100 my-1" />
                      <div>Type: <strong>{f.facilityType || "Health Center"}</strong></div>
                      <div>HMIS Code: <strong>{f.hmisCode}</strong></div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            ))}

            {/* Travel-time zones: walking-time rings (~5 km/h) around facilities */}
            {showTravelZones && facilities.map((f) => (
              f.latitude && f.longitude && TRAVEL_RINGS.map((ring) => (
                <Circle
                  key={`zone-${f.id}-${ring.hours}`}
                  center={[parseFloat(f.latitude), parseFloat(f.longitude)]}
                  radius={ring.radiusM}
                  pathOptions={{
                    color: ring.color,
                    weight: 1,
                    opacity: 0.5,
                    fill: false,
                    dashArray: "4, 6"
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <span className="font-bold" style={{ color: ring.color }}>~{ring.hours} h walk</span>
                      <div className="text-[10px] text-slate-500">{f.name} · {ring.radiusM / 1000} km on foot</div>
                    </div>
                  </Popup>
                </Circle>
              ))
            ))}

            {/* Community assets discovered around the current map centre */}
            {showCommunityAssets && (layerAssets?.assets || []).map((a: any, i: number) => {
              const meta = ASSET_META[a.type] || ASSET_META.transport;
              return (
                <CircleMarker
                  key={`asset-${i}-${a.latitude}-${a.longitude}`}
                  center={[a.latitude, a.longitude]}
                  radius={4.5}
                  pathOptions={{ color: meta.color, fillColor: meta.color, fillOpacity: 0.85, weight: 1 }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-0.5">
                      <span className="font-bold" style={{ color: meta.color }}>{a.name}</span>
                      <div className="text-[10px] text-slate-500">{meta.label} · {a.distanceKm} km from centre</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          </MapContainer>
        </div>

        {/* FLOATING MAP LAYER CONTROLLER PANEL */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200/80 p-4 rounded-xl shadow-lg w-60 z-[1000] space-y-3">
          <div className="text-xs font-bold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Layers className="h-4 w-4 text-teal-600" />
            MAP LAYERS CONTROL
          </div>
          
          <div className="space-y-2.5">
            {/* Master settlements layer switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-master" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                Master Settlements
              </Label>
              <Switch
                id="layer-master"
                checked={showMasterSettlements}
                onCheckedChange={setShowMasterSettlements}
              />
            </div>

            {/* Zero-dose candidates layer switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-zerodose" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                Zero-Dose Candidates
              </Label>
              <Switch
                id="layer-zerodose"
                checked={showZeroDoseCandidates}
                onCheckedChange={setShowZeroDoseCandidates}
              />
            </div>

            {/* Outreach Recommendations switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-recs" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Suggested Outreach Sites
              </Label>
              <Switch
                id="layer-recs"
                checked={showOutreachRecs}
                onCheckedChange={setShowOutreachRecs}
              />
            </div>

            {/* Service Coverage Gaps switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-gaps" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 border border-dashed border-rose-500 bg-rose-100 rounded"></span>
                5km Coverage Gaps
              </Label>
              <Switch
                id="layer-gaps"
                checked={showCoverageGaps}
                onCheckedChange={setShowCoverageGaps}
              />
            </div>

            {/* Base Facilities switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-facilities" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                Health Facilities
              </Label>
              <Switch
                id="layer-facilities"
                checked={showFacilities}
                onCheckedChange={setShowFacilities}
              />
            </div>

            {/* Travel-time zones switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-zones" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full border border-dashed border-emerald-500"></span>
                Travel-Time Zones
              </Label>
              <Switch
                id="layer-zones"
                checked={showTravelZones}
                onCheckedChange={setShowTravelZones}
              />
            </div>

            {/* Community assets switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="layer-assets" className="text-[11px] text-slate-700 cursor-pointer flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Community Assets
              </Label>
              <Switch
                id="layer-assets"
                checked={showCommunityAssets}
                onCheckedChange={setShowCommunityAssets}
              />
            </div>

            {showCommunityAssets && (
              <div className="text-[9px] text-slate-400 leading-tight flex items-center gap-1 pt-0.5">
                {layerAssetsLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Searching OpenStreetMap near map centre…</>
                ) : (
                  <span>{(layerAssets?.assets?.length ?? 0)} assets within 5 km of map centre</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM STATISTICS PANEL OVERLAY */}
        <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 grid grid-cols-4 gap-4 z-10 text-slate-800 shadow-md">
          <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="h-10 w-10 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center shadow-sm">
              <MapIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Validated Registry</div>
              <div className="text-lg font-mono font-extrabold text-slate-800">{settlements.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center animate-pulse shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Zero-Dose Candidates</div>
              <div className="text-lg font-mono font-extrabold text-slate-800">{candidates.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="h-10 w-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Suggested Outreach</div>
              <div className="text-lg font-mono font-extrabold text-slate-800">{outreachRecs.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Facilities Mapped</div>
              <div className="text-lg font-mono font-extrabold text-slate-800">{facilities.length}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ONE-CLICK VALIDATION & PROMOTION DOCK/DIALOG MODAL */}
      <Dialog open={validationModalOpen} onOpenChange={setValidationModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-teal-700">
              <Sparkles className="h-5 w-5 text-teal-600 animate-pulse" />
              Promote Settlement to Master Registry
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Accept and promote unmapped node #{selectedCandidate?.id} to the official country registry database.
              The spatial engine will inherit district boundaries and nearest facility networks automatically!
            </DialogDescription>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80 shadow-inner">
                <div>
                  <span className="text-slate-500 font-semibold">Gridded Population:</span>
                  <div className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedCandidate.estimatedPopulation} people</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Building Footprints:</span>
                  <div className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedCandidate.buildingCount} units</div>
                </div>
                <div className="col-span-2 mt-1.5 pt-1.5 border-t border-slate-200/60">
                  <span className="text-slate-500 font-semibold">Nearest Base Health Facility:</span>
                  <div className="font-bold text-teal-700 mt-0.5">{selectedCandidate.nearestFacility} ({parseFloat(selectedCandidate.distanceToFacility).toFixed(1)} km)</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settlement-name" className="text-xs text-slate-700 font-bold">
                  Official Ground-Truthed Settlement Name
                </Label>
                <Input
                  id="settlement-name"
                  placeholder="Enter community/village name (e.g. Macha Village)"
                  value={groundTruthedName}
                  onChange={(e) => setGroundTruthedName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settlement-type" className="text-xs text-slate-700 font-bold">
                  Settlement Type Classification
                </Label>
                <select
                  id="settlement-type"
                  value={promotionPlaceType}
                  onChange={(e) => setPromotionPlaceType(e.target.value)}
                  className="w-full h-9 rounded-lg bg-white border border-slate-200 text-xs px-3 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="village">Village (Rural Community)</option>
                  <option value="hamlet">Hamlet (Scattered Dwellings)</option>
                  <option value="locality">Locality (Outpost Settlement)</option>
                  <option value="suburb">Suburb (Peri-urban extension)</option>
                  <option value="neighbourhood">Neighbourhood (Urban Sector)</option>
                  <option value="town">Town (Trade/Census Center)</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setValidationModalOpen(false)}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmValidation}
              disabled={validateMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {validateMutation.isPending ? "PROMOTING NODE..." : "PROMOTE SETTLEMENT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GEOSPATIAL INSIGHTS DIALOG — real travel time + nearby community assets */}
      <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-teal-700">
              <Compass className="h-5 w-5 text-teal-600" />
              Geospatial Insights
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              {insightsPoint?.label} — travel time to the nearest facility and community
              assets nearby, from live open data (OSM road network &amp; points of interest).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-1">
            {/* Travel time block — nearest facility and nearest outreach site */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-inner">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Route className="h-4 w-4 text-teal-600" />
                Travel time to nearest sites
              </div>
              {travelTimeLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating road route…
                </div>
              ) : !travelTime || (!travelTime.facilityName && !travelTime.outreachSite) ? (
                <div className="text-xs text-slate-500 py-1">
                  No active facility or outreach site found to route to.
                </div>
              ) : (
                <div className="space-y-3">
                  {travelTime.facilityName && renderTravelDestination(
                    {
                      name: travelTime.facilityName,
                      driving: travelTime.driving,
                      walking: travelTime.walking,
                      roadDistanceKm: travelTime.roadDistanceKm,
                      straightLineKm: travelTime.straightLineKm,
                      routeClassification: travelTime.routeClassification,
                    },
                    "Nearest facility",
                    <Building2 className="h-4 w-4 text-indigo-500" />,
                  )}
                  {travelTime.outreachSite && renderTravelDestination(
                    {
                      name: travelTime.outreachSite.name,
                      driving: travelTime.outreachSite.driving,
                      walking: travelTime.outreachSite.walking,
                      roadDistanceKm: travelTime.outreachSite.roadDistanceKm,
                      straightLineKm: travelTime.outreachSite.straightLineKm,
                      routeClassification: travelTime.outreachSite.routeClassification,
                    },
                    "Nearest outreach site",
                    <MapPin className="h-4 w-4 text-amber-500" />,
                  )}
                </div>
              )}
            </div>

            {/* Community assets block */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-inner">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Layers className="h-4 w-4 text-teal-600" />
                Community assets within 3 km
              </div>
              {insightAssetsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching OpenStreetMap…
                </div>
              ) : !insightAssets || (insightAssets.assets?.length ?? 0) === 0 ? (
                <div className="text-xs text-slate-500 py-1">
                  No mapped community assets found nearby (or the lookup is temporarily
                  unavailable). This can be normal for very remote clusters.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {insightAssets.assets.map((a: any, i: number) => {
                    const meta = ASSET_META[a.type] || ASSET_META.transport;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={`ia-${i}`}
                        className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                          <span className="font-medium text-slate-800 truncate">{a.name}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">{meta.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">{a.distanceKm} km</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInsightsOpen(false)}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
