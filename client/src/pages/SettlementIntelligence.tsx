import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { canCreateSessionPlan } from "@/lib/permissions";
import {
  computeOutreachSuitability,
  suitabilityBand,
  type SuitabilityFactor,
} from "@shared/outreachSuitability";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Polygon,
  Polyline,
  Tooltip,
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
  Pill,
  BookOpen,
  Landmark,
  Waypoints,
  Tent,
  Loader2,
  Target,
  ArrowUpDown,
  ListOrdered,
  Plus,
  Users
} from "lucide-react";

// Sort options for the ranked Unserved Population Clusters panel.
type ClusterSortKey =
  | "suitability"
  | "population"
  | "travelTime"
  | "outreachGap"
  | "zeroDose"
  | "facilityDistance";

const CLUSTER_SORT_OPTIONS: { key: ClusterSortKey; label: string }[] = [
  { key: "suitability", label: "Suitability score" },
  { key: "population", label: "Population" },
  { key: "zeroDose", label: "Zero-dose children" },
  { key: "facilityDistance", label: "Distance to facility" },
  { key: "outreachGap", label: "Outreach gap" },
  { key: "travelTime", label: "Travel time" },
];

// Community-asset presentation helpers (icon, colour, label per OSM category)
const ASSET_META: Record<string, { label: string; color: string; icon: any }> = {
  school: { label: "School", color: "#2563eb", icon: GraduationCap },
  church: { label: "Place of worship", color: "#7c3aed", icon: Church },
  market: { label: "Market", color: "#ea580c", icon: Store },
  water_point: { label: "Water point", color: "#0891b2", icon: Droplets },
  transport: { label: "Transport node", color: "#475569", icon: Bus },
  pharmacy: { label: "Pharmacy / drug store", color: "#16a34a", icon: Pill },
  university: { label: "University / college", color: "#4338ca", icon: BookOpen },
  government: { label: "Government office", color: "#b45309", icon: Landmark },
  logistics: { label: "Transport & logistics", color: "#0f766e", icon: Waypoints },
  vulnerable_site: { label: "Vulnerable-population site", color: "#dc2626", icon: Tent },
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

// Highlights the inspected point and the route(s) to its nearest facility and
// nearest outreach site on the map while the Insights dialog is open. Each
// route draws the real OSRM road geometry when available, otherwise a dashed
// straight line. The map fits its bounds to the origin + destinations so the
// highlight is actually in view behind/around the dialog.
function InsightsRouteLayer({
  origin,
  travelTime,
}: {
  origin: { lat: number; lng: number };
  travelTime: any;
}) {
  const map = useMap();

  // Destinations resolved from the travel-time payload (facility + outreach).
  const destinations = useMemo(() => {
    const out: Array<{
      key: string;
      name: string | null;
      lat: number;
      lng: number;
      // Leaflet positions are [lat, lng]; convert from GeoJSON [lng, lat].
      path: [number, number][];
      isRoad: boolean;
      color: string;
      label: string;
    }> = [];
    if (!travelTime) return out;

    const toLatLngPath = (geometry: any): [number, number][] | null => {
      if (!Array.isArray(geometry) || geometry.length < 2) return null;
      return geometry
        .filter((c: any) => Array.isArray(c) && c.length >= 2)
        .map((c: any) => [Number(c[1]), Number(c[0])] as [number, number]);
    };

    if (
      travelTime.facilityName &&
      Number.isFinite(Number(travelTime.facilityLatitude)) &&
      Number.isFinite(Number(travelTime.facilityLongitude))
    ) {
      const lat = Number(travelTime.facilityLatitude);
      const lng = Number(travelTime.facilityLongitude);
      const road = toLatLngPath(travelTime.geometry);
      out.push({
        key: "facility",
        name: travelTime.facilityName,
        lat,
        lng,
        path: road ?? [
          [origin.lat, origin.lng],
          [lat, lng],
        ],
        isRoad: !!road,
        color: "#4f46e5", // indigo — matches facility markers
        label: "Nearest facility",
      });
    }

    const o = travelTime.outreachSite;
    if (
      o &&
      Number.isFinite(Number(o.latitude)) &&
      Number.isFinite(Number(o.longitude))
    ) {
      const lat = Number(o.latitude);
      const lng = Number(o.longitude);
      const road = toLatLngPath(o.geometry);
      out.push({
        key: "outreach",
        name: o.name,
        lat,
        lng,
        path: road ?? [
          [origin.lat, origin.lng],
          [lat, lng],
        ],
        isRoad: !!road,
        color: "#d97706", // amber — matches outreach markers
        label: "Nearest outreach site",
      });
    }
    return out;
  }, [travelTime, origin.lat, origin.lng]);

  // Fit the map to the origin + every destination route so the highlight is
  // visible. Runs when the inspected point or its resolved routes change.
  useEffect(() => {
    const pts: [number, number][] = [[origin.lat, origin.lng]];
    for (const d of destinations) {
      for (const p of d.path) pts.push(p);
      pts.push([d.lat, d.lng]);
    }
    if (pts.length < 2) {
      map.setView([origin.lat, origin.lng], 13);
      return;
    }
    try {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 14 });
    } catch {
      map.setView([origin.lat, origin.lng], 13);
    }
  }, [map, origin.lat, origin.lng, destinations]);

  return (
    <>
      {/* Inspected point */}
      <CircleMarker
        center={[origin.lat, origin.lng]}
        radius={7}
        pathOptions={{
          color: "#0f766e",
          fillColor: "#14b8a6",
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -6]} permanent>
          <span className="text-[10px] font-bold text-teal-700">Inspected point</span>
        </Tooltip>
      </CircleMarker>

      {destinations.map((d) => (
        <div key={`route-${d.key}`}>
          {/* Soft halo under the route so it reads against busy basemaps */}
          <Polyline
            positions={d.path}
            pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.7 }}
          />
          <Polyline
            positions={d.path}
            pathOptions={{
              color: d.color,
              weight: 4,
              opacity: 0.95,
              // Dashed when we only have a straight-line estimate, solid for a
              // real road route.
              dashArray: d.isRoad ? undefined : "6, 8",
            }}
          />
          <CircleMarker
            center={[d.lat, d.lng]}
            radius={8}
            pathOptions={{
              color: d.color,
              fillColor: d.color,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-[10px]">
                <div className="font-bold" style={{ color: d.color }}>{d.label}</div>
                <div className="text-slate-700">{d.name}</div>
                <div className="text-slate-400">
                  {d.isRoad ? "Road route" : "Straight-line estimate"}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        </div>
      ))}
    </>
  );
}

export default function SettlementIntelligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const canPlan = canCreateSessionPlan(user);

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
  // Travel-Time Zones profile: walking (default), driving for vehicle-based
  // outreach and supply runs, or cycling for bicycle/motorbike outreach teams.
  const [travelProfile, setTravelProfile] = useState<
    "foot-walking" | "driving-car" | "cycling-regular"
  >("foot-walking");
  // Travel-Time Zones can cover fixed facilities, active outreach sites, or
  // both. This is a client-side filter over zones already tagged with `kind`.
  const [travelZoneKind, setTravelZoneKind] = useState<
    "facility" | "outreach" | "both"
  >("both");

  // Geospatial insights dialog (real travel time + nearby community assets).
  // Carries optional population / distance hints so the dialog can refine the
  // Outreach Site Suitability Score with live travel-time + landmark data.
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsPoint, setInsightsPoint] = useState<{
    lat: number;
    lng: number;
    label: string;
    population?: number | null;
    distanceToFacilityKm?: number | null;
    outreachGapKm?: number | null;
  } | null>(null);

  // Ranked "Unserved Population Clusters" panel sort key (client-side sort).
  const [clusterSort, setClusterSort] = useState<ClusterSortKey>("suitability");

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

  // Ranked, scored unserved population clusters (server-computed suitability).
  const { data: unservedClusterData, isLoading: unservedClustersLoading } = useQuery<any>({
    queryKey: ["/api/unserved-clusters", tenantInfo?.id],
    queryFn: () => apiRequest("GET", "/api/unserved-clusters"),
    enabled: !!tenantInfo?.id
  });
  const unservedClusters: any[] = Array.isArray(unservedClusterData?.clusters)
    ? unservedClusterData.clusters
    : [];

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

  // Road/path-network walking-time zones (isochrones) for the travel-time layer.
  // Falls back to plain circles when the routing provider is unavailable.
  const { data: isochrones } = useQuery<any>({
    queryKey: ["/api/geo/isochrones", tenantInfo?.id, travelProfile],
    queryFn: () => apiRequest("GET", `/api/geo/isochrones?profile=${travelProfile}`),
    enabled: showTravelZones && !!tenantInfo?.id,
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
      queryClient.invalidateQueries({ queryKey: ["/api/unserved-clusters"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/unserved-clusters"] });
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

  const handleOpenInsights = (
    lat: number,
    lng: number,
    label: string,
    hints?: { population?: number | null; distanceToFacilityKm?: number | null; outreachGapKm?: number | null },
  ) => {
    setInsightsPoint({ lat, lng, label, ...hints });
    setInsightsOpen(true);
  };

  // Deep-link to the Session Planning page, pre-filled to start a microplan for
  // this unserved cluster (reuses the same params the map "Plan session here"
  // button emits). Only reachable when the user can author session plans.
  const handlePlanSessionForCluster = (cluster: any) => {
    const qs = new URLSearchParams({
      unservedName: cluster.nearestNamedSettlement
        ? `Near ${cluster.nearestNamedSettlement}`
        : `Unmapped Cluster #${cluster.id}`,
      unservedLat: String(cluster.latitude),
      unservedLng: String(cluster.longitude),
      unservedHtr: (cluster.distanceToFacilityKm ?? 0) >= 5 ? "1" : "0",
      autoOpen: "1",
    });
    setLocation(`/sessions?${qs.toString()}`);
  };

  // Client-side sort of the server-ranked clusters (default: suitability desc).
  const sortedClusters = useMemo(() => {
    const list = [...unservedClusters];
    const num = (v: any, fallback: number) =>
      v == null || !Number.isFinite(Number(v)) ? fallback : Number(v);
    switch (clusterSort) {
      case "population":
        list.sort((a, b) => num(b.estimatedPopulation, 0) - num(a.estimatedPopulation, 0));
        break;
      case "zeroDose":
        list.sort((a, b) => num(b.estimatedZeroDoseChildren, 0) - num(a.estimatedZeroDoseChildren, 0));
        break;
      case "facilityDistance":
        list.sort((a, b) => num(b.distanceToFacilityKm, -1) - num(a.distanceToFacilityKm, -1));
        break;
      case "outreachGap":
        // Treat "no existing outreach at all" (null) as the biggest gap.
        list.sort(
          (a, b) =>
            num(b.outreachGapKm, Number.POSITIVE_INFINITY) -
            num(a.outreachGapKm, Number.POSITIVE_INFINITY),
        );
        break;
      case "travelTime":
        list.sort((a, b) => num(b.estimatedTravelTimeMin, 0) - num(a.estimatedTravelTimeMin, 0));
        break;
      case "suitability":
      default:
        list.sort((a, b) => num(b.suitabilityScore, 0) - num(a.suitabilityScore, 0));
        break;
    }
    return list;
  }, [unservedClusters, clusterSort]);

  // Refined Outreach Site Suitability Score for the inspected point, computed
  // from the LIVE travel-time + community-asset lookups in the Insights dialog.
  const refinedSuitability = useMemo(() => {
    if (!insightsPoint || insightsPoint.population == null) return null;
    const drive = travelTime?.driving?.durationMin;
    const travelEstimated =
      travelTime?.routeClassification !== "road" || travelTime?.driving?.estimated === true;
    const landmarkCount = insightAssets?.assets?.length;
    const landmarkKnown = !insightAssetsLoading && insightAssets != null;
    return computeOutreachSuitability({
      estimatedPopulation: Number(insightsPoint.population),
      distanceToFacilityKm: insightsPoint.distanceToFacilityKm ?? null,
      outreachGapKm:
        typeof travelTime?.outreachSite?.straightLineKm === "number"
          ? travelTime.outreachSite.straightLineKm
          : insightsPoint.outreachGapKm ?? null,
      travelTimeMin: typeof drive === "number" ? drive : null,
      travelTimeEstimated: travelEstimated,
      landmarkCount: typeof landmarkCount === "number" ? landmarkCount : null,
      landmarkKnown,
    });
  }, [insightsPoint, travelTime, insightAssets, insightAssetsLoading]);

  const fmtMinutes = (min: number | null | undefined) => {
    if (min === null || min === undefined || !Number.isFinite(min)) return "—";
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  };

  // Colour classes for a suitability score badge by qualitative band.
  const suitabilityBadgeClass = (score: number) => {
    const { tone } = suitabilityBand(score);
    if (tone === "high") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (tone === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  // Render the per-factor breakdown of an Outreach Site Suitability Score as a
  // compact list of labelled progress bars.
  const renderSuitabilityFactors = (factors: SuitabilityFactor[]) => (
    <div className="space-y-1.5">
      {factors.map((f) => (
        <div key={f.key} className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              {f.label}
              {f.estimated && (
                <span className="text-[8px] text-amber-600 uppercase font-bold">est.</span>
              )}
            </span>
            <span className="font-mono text-slate-500">
              {f.points}/{f.weight}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${Math.round(f.score * 100)}%` }}
            />
          </div>
          <div className="text-[9px] text-slate-400 leading-tight">{f.detail}</div>
        </div>
      ))}
    </div>
  );

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

  // Straight-line travel-time rings for the travel-time-zone layer, used as a
  // graceful fallback when road-network isochrones are unavailable. Walking
  // assumes ~5 km/h (1/2/3 h); driving assumes ~30 km/h on rural roads
  // (30/60/90 min → 15/30/45 km); cycling assumes ~15 km/h on rural roads
  // (30/60/90 min → 7.5/15/22.5 km).
  const isDrivingProfile = travelProfile === "driving-car";
  const isCyclingProfile = travelProfile === "cycling-regular";
  const TRAVEL_RINGS = isDrivingProfile
    ? [
        { label: "30 min", radiusM: 15000, color: "#16a34a" },
        { label: "60 min", radiusM: 30000, color: "#d97706" },
        { label: "90 min", radiusM: 45000, color: "#dc2626" },
      ]
    : isCyclingProfile
      ? [
          { label: "30 min", radiusM: 7500, color: "#16a34a" },
          { label: "60 min", radiusM: 15000, color: "#d97706" },
          { label: "90 min", radiusM: 22500, color: "#dc2626" },
        ]
      : [
          { label: "1 h", radiusM: 5000, color: "#16a34a" },
          { label: "2 h", radiusM: 10000, color: "#d97706" },
          { label: "3 h", radiusM: 15000, color: "#dc2626" },
        ];
  const travelModeLabel = isDrivingProfile
    ? "drive"
    : isCyclingProfile
      ? "cycle"
      : "walk";

  // True road/path-network walking-time zones from the routing provider. When
  // available we render these isochrone polygons instead of the circles above.
  const isochroneFeatures: any[] =
    isochrones?.available && Array.isArray(isochrones?.featureCollection?.features)
      ? isochrones.featureCollection.features
      : [];
  const useIsochrones = isochroneFeatures.length > 0;

  // Fallback-ring anchors: every facility AND active outreach site the server
  // resolved (so rings cover outreach posts too, not just facilities). Falls
  // back to the facilities query if the isochrone payload predates `sites`.
  const fallbackRingSites: { name: string; latitude: number; longitude: number; kind: string }[] =
    Array.isArray(isochrones?.sites) && isochrones.sites.length > 0
      ? isochrones.sites
      : facilities
          .filter((f: any) => f.latitude && f.longitude)
          .map((f: any) => ({
            name: f.name,
            latitude: parseFloat(f.latitude),
            longitude: parseFloat(f.longitude),
            kind: "facility",
          }));

  // GeoJSON polygons are [lng, lat]; Leaflet wants [lat, lng]. A Polygon's
  // coordinates are an array of rings; MultiPolygon is an array of polygons.
  const geoJsonToLatLngs = (geometry: any): [number, number][][][] => {
    if (!geometry) return [];
    const ringsToLatLng = (rings: any[]): [number, number][][] =>
      rings.map((ring: any[]) =>
        ring.map((pos: number[]) => [pos[1], pos[0]] as [number, number]),
      );
    if (geometry.type === "Polygon") return [ringsToLatLng(geometry.coordinates)];
    if (geometry.type === "MultiPolygon")
      return geometry.coordinates.map((poly: any[]) => ringsToLatLng(poly));
    return [];
  };

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

          {/* RANKED UNSERVED POPULATION CLUSTERS — outreach-site planning view */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-bold text-teal-700">
                <ListOrdered className="h-4 w-4" />
                UNSERVED POPULATION CLUSTERS
                {unservedClusters.length > 0 && (
                  <span className="text-slate-400 font-semibold">({unservedClusters.length})</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              Ranked by an <span className="font-semibold">Outreach Site Suitability Score</span> (0–100)
              that weighs population, likely zero-dose children, distance to a facility, the gap from
              existing outreach, road access and nearby landmarks. Open{" "}
              <span className="font-semibold">Insights</span> to sharpen the score with live travel
              time and mapped landmarks.
            </p>

            {/* Sort control */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={clusterSort}
                onChange={(e) => setClusterSort(e.target.value as ClusterSortKey)}
                className="flex-1 text-[11px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                data-testid="select-cluster-sort"
              >
                {CLUSTER_SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {unservedClustersLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Scoring unserved clusters…
              </div>
            ) : sortedClusters.length === 0 ? (
              <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                No pending unserved clusters to rank yet. Run spatial detection to surface candidate
                settlements, then they'll appear here scored and ranked.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {sortedClusters.map((cl) => {
                  const band = suitabilityBand(cl.suitabilityScore);
                  return (
                    <Card
                      key={cl.id}
                      className="bg-white border-slate-200 hover:border-teal-300 transition-all p-3.5 rounded-xl border shadow-sm flex flex-col space-y-2.5"
                      data-testid={`card-unserved-cluster-${cl.id}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {cl.nearestNamedSettlement
                                ? `Near ${cl.nearestNamedSettlement}`
                                : `Unmapped Cluster #${cl.id}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {cl.distanceToFacilityKm != null
                              ? `${cl.distanceToFacilityKm.toFixed(1)} km to ${cl.nearestFacility ?? "nearest facility"}`
                              : "Distance to facility unknown"}
                          </div>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className={`flex items-center justify-center h-10 w-10 rounded-xl border font-extrabold text-sm ${suitabilityBadgeClass(cl.suitabilityScore)}`}
                            data-testid={`score-cluster-${cl.id}`}
                          >
                            {cl.suitabilityScore}
                          </div>
                          <span className="text-[8px] uppercase font-bold text-slate-400 mt-0.5">
                            {band.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-teal-500" />
                          <span>{cl.estimatedPopulation?.toLocaleString?.() ?? cl.estimatedPopulation} people</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                          <span>~{cl.estimatedZeroDoseChildren} zero-dose</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="h-3.5 w-3.5 text-slate-500" />
                          <span>~{fmtMinutes(cl.estimatedTravelTimeMin)} drive (est.)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                          <span>
                            {cl.outreachGapKm != null
                              ? `${cl.outreachGapKm.toFixed(1)} km outreach gap`
                              : "No outreach nearby"}
                          </span>
                        </div>
                      </div>

                      {/* Factor breakdown */}
                      {Array.isArray(cl.factors) && cl.factors.length > 0 && (
                        <div className="bg-white border border-slate-100 rounded-lg p-2">
                          {renderSuitabilityFactors(cl.factors)}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] h-7 text-slate-600 hover:text-slate-900 px-2.5 hover:bg-slate-100"
                          onClick={() => focusOnCoordinates(cl.latitude, cl.longitude)}
                          data-testid={`button-locate-cluster-${cl.id}`}
                        >
                          Locate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] h-7 text-teal-700 hover:text-teal-900 px-2.5 hover:bg-teal-50 flex items-center gap-1"
                          onClick={() =>
                            handleOpenInsights(
                              cl.latitude,
                              cl.longitude,
                              cl.nearestNamedSettlement
                                ? `Near ${cl.nearestNamedSettlement}`
                                : `Unmapped Cluster #${cl.id}`,
                              {
                                population: cl.estimatedPopulation,
                                distanceToFacilityKm: cl.distanceToFacilityKm,
                                outreachGapKm: cl.outreachGapKm,
                              },
                            )
                          }
                          data-testid={`button-insights-cluster-${cl.id}`}
                        >
                          <Compass className="h-3 w-3" />
                          Insights
                        </Button>
                        {canPlan && (
                          <Button
                            size="sm"
                            className="text-[10px] h-7 bg-teal-600 hover:bg-teal-700 text-white px-2.5 font-bold rounded-lg flex items-center gap-1"
                            onClick={() => handlePlanSessionForCluster(cl)}
                            data-testid={`button-plan-cluster-${cl.id}`}
                          >
                            <Plus className="h-3 w-3" />
                            Plan session
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

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

            {/* Highlight the inspected point + route(s) while the Insights dialog is open */}
            {insightsOpen && insightsPoint && (
              <InsightsRouteLayer
                origin={{ lat: insightsPoint.lat, lng: insightsPoint.lng }}
                travelTime={travelTime}
              />
            )}

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

            {/* Travel-time zones: true road/path-network walking-time isochrones
                when the routing provider is available, otherwise plain rings. */}
            {showTravelZones && useIsochrones &&
              isochroneFeatures
                .filter((feature: any) => {
                  if (travelZoneKind === "both") return true;
                  const isOutreach = feature?.properties?.locationKind === "outreach";
                  return travelZoneKind === "outreach" ? isOutreach : !isOutreach;
                })
                .flatMap((feature: any, idx: number) => {
                const label = feature?.properties?.label;
                const color = feature?.properties?.color || "#16a34a";
                const facilityName = feature?.properties?.facilityName;
                const isOutreachZone = feature?.properties?.locationKind === "outreach";
                return geoJsonToLatLngs(feature?.geometry).map((positions, pIdx) => (
                  <Polygon
                    key={`iso-${idx}-${pIdx}`}
                    positions={positions}
                    pathOptions={{
                      color,
                      weight: 1.5,
                      opacity: 0.7,
                      fillColor: color,
                      fillOpacity: 0.08
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1">
                        <span className="font-bold" style={{ color }}>~{label} {travelModeLabel}</span>
                        <div className="text-[10px] text-slate-500">
                          {facilityName ? `${facilityName}${isOutreachZone ? " (outreach site)" : ""} · ` : ""}road-network {isDrivingProfile ? "driving" : isCyclingProfile ? "cycling" : "walking"} zone
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                ));
              })}

            {/* Fallback: travel-time rings (~5 km/h walk / ~30 km/h drive) when
                isochrones unavailable — drawn around facilities AND outreach sites. */}
            {showTravelZones && !useIsochrones && fallbackRingSites
              .filter((site) => {
                if (travelZoneKind === "both") return true;
                const isOutreach = site.kind === "outreach";
                return travelZoneKind === "outreach" ? isOutreach : !isOutreach;
              })
              .map((site, sIdx) => (
              TRAVEL_RINGS.map((ring) => (
                <Circle
                  key={`zone-${site.kind}-${sIdx}-${ring.label}`}
                  center={[site.latitude, site.longitude]}
                  radius={ring.radiusM}
                  pathOptions={{
                    color: ring.color,
                    weight: 1,
                    opacity: 0.5,
                    fill: false,
                    dashArray: site.kind === "outreach" ? "2, 4" : "4, 6"
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <span className="font-bold" style={{ color: ring.color }}>~{ring.label} {travelModeLabel}</span>
                      <div className="text-[10px] text-slate-500">
                        {site.name}{site.kind === "outreach" ? " (outreach site)" : ""} · {ring.radiusM / 1000} km by {isDrivingProfile ? "road" : isCyclingProfile ? "bike" : "foot"} (approx.)
                      </div>
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

            {/* Travel-Time Zones profile toggle: walking vs driving. Shown only
                when the layer is active. */}
            {showTravelZones && (
              <div className="flex items-center gap-1 pl-3.5">
                <button
                  type="button"
                  onClick={() => setTravelProfile("foot-walking")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelProfile === "foot-walking"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-travel-walking"
                >
                  Walking
                </button>
                <button
                  type="button"
                  onClick={() => setTravelProfile("driving-car")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelProfile === "driving-car"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-travel-driving"
                >
                  Driving
                </button>
                <button
                  type="button"
                  onClick={() => setTravelProfile("cycling-regular")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelProfile === "cycling-regular"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-travel-cycling"
                >
                  Cycling
                </button>
              </div>
            )}

            {/* Travel-Time Zones scope toggle: facilities, outreach sites, or
                both. Filters zones tagged with locationKind / site.kind. */}
            {showTravelZones && (
              <div className="flex items-center gap-1 pl-3.5">
                <button
                  type="button"
                  onClick={() => setTravelZoneKind("facility")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelZoneKind === "facility"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-zonekind-facility"
                >
                  Facilities
                </button>
                <button
                  type="button"
                  onClick={() => setTravelZoneKind("outreach")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelZoneKind === "outreach"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-zonekind-outreach"
                >
                  Outreach
                </button>
                <button
                  type="button"
                  onClick={() => setTravelZoneKind("both")}
                  className={`flex-1 text-[10px] font-medium rounded-md px-2 py-1 border transition-colors ${
                    travelZoneKind === "both"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  data-testid="button-zonekind-both"
                >
                  Both
                </button>
              </div>
            )}

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
            {/* Refined Outreach Site Suitability Score — only when this point
                came from an unserved cluster (so we know its population). */}
            {refinedSuitability && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-teal-600" />
                    Outreach Site Suitability
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400">
                      {suitabilityBand(refinedSuitability.score).label}
                    </span>
                    <div
                      className={`flex items-center justify-center h-9 w-9 rounded-xl border font-extrabold text-sm ${suitabilityBadgeClass(refinedSuitability.score)}`}
                      data-testid="score-insights-refined"
                    >
                      {refinedSuitability.score}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mb-2 leading-snug">
                  Refined with live travel time and mapped landmarks. Estimated{" "}
                  <span className="font-semibold">{refinedSuitability.estimatedUnder5}</span> under-5
                  children, about{" "}
                  <span className="font-semibold">{refinedSuitability.estimatedZeroDoseChildren}</span>{" "}
                  likely zero-dose.
                </div>
                {renderSuitabilityFactors(refinedSuitability.factors)}
              </div>
            )}

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
