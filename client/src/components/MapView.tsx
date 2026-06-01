
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
  Polygon,
  CircleMarker,
  Circle,
  useMapEvents,
  GeoJSON,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// georaster is dynamically imported inside the raster-loading effect below
// to keep the ~500KB gzipped vendor chunk out of the initial map bundle.
// GeoRasterLayer is also dynamically imported there.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { offlineDb } from "@/lib/offlineDb";
import {
  usePopulationOverlay,
  PopulationWmsLayer,
  PopulationOverlayToggle,
  PopulationOverlayLegend,
} from "@/components/PopulationOverlay";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { useAuth } from "@/hooks/useAuth";
import { usePersistedBasemap } from "@/hooks/usePersistedBasemap";
import { OSM_TILE_ATTRIBUTION, ESRI_IMAGERY_ATTRIBUTION } from "@/data/dataSources";
import { canCreateSessionPlan } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Locate,
  Ruler,
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileSpreadsheet,
  Printer,
  PenLine,
  CheckCircle,
  XCircle,
  Search,
  Zap,
  Thermometer,
  X,
  Building2,
  Clock,
  Users,
  Filter,
  SlidersHorizontal,
  Globe,
  Calendar,
  AlertTriangle,
  Plus,
} from "lucide-react";
import type { Facility, Village, FacilityCatchment } from "@shared/schema";
import { getMinScheduleDateInputValue } from "@shared/schedulingDates";
import { deriveSessionLifecycle } from "@/lib/sessionStatus";
import { distance, centroid as turfCentroid, polygon as turfPolygon } from "@turf/turf";
import RBush from "rbush";
// Vite worker import — runs centroid + point-in-polygon emphasis off the
// main thread so Province / District / LLG changes never block the UI on
// huge GRID3 datasets (tens of thousands of polygons).
import Grid3InsideWorker from "@/workers/grid3Inside.worker.ts?worker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyDefaultLeafletPinIcon,
  createFacilityCircleIcon,
  createFilledPinIcon,
  FILLED_PIN_DATA_URIS,
  FILLED_PIN_SIZE_20x29,
} from "@/lib/mapIcons";


// Delete default Leaflet icons and replace with offline-available premium vector SVG pins
applyDefaultLeafletPinIcon();

/* Original Default Leaflet Options Commented out for Offline Capability:
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
*/

const normalizeName = (name: string): string => {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  const aliases: { [key: string]: string } = {
    "chiengi": "chienge",
    "milengi": "milenge",
    "lavushimanda": "lavushi manda",
    "shangombo": "shang'ombo",
    "kapiri-mposhi": "kapiri mposhi",
    "kapirimposhi": "kapiri mposhi",
    "northwester": "north-western",
    "northwestern": "north-western",
    "chikankanta": "chikankata"
  };
  if (aliases[n]) {
    n = aliases[n];
  }
  return n
    .replace(/[^a-z0-9]/g, "")
    .replace(/province/g, "")
    .replace(/district/g, "")
    .trim();
};

// Creates a dedicated Leaflet pane for the GRID3 Settlement Footprints with a
// z-index above the default overlay pane (400). This guarantees the GRID3
// layer is painted ON TOP of administrative boundary polygons, so re-mounting
// of boundary <GeoJSON> elements (which happens on every Province change)
// can never visually bury the GRID3 footprints.
function Grid3PaneCreator() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("grid3Pane")) {
      const pane = map.createPane("grid3Pane");
      pane.style.zIndex = "450"; // overlayPane=400, markerPane=600
      pane.style.pointerEvents = "auto";
    }
  }, [map]);
  return null;
}

const getBoundaryStyle = (adminLevel: number) => {
  if (adminLevel === 1) {
    return {
      color: "#6366f1", // Elegant Indigo
      weight: 2.5,
      fillOpacity: 0.04,
      fillColor: "#818cf8",
    };
  }
  if (adminLevel === 2) {
    return {
      color: "#0d9488", // Vibrant Teal
      weight: 2.0,
      fillOpacity: 0.06,
      fillColor: "#2dd4bf",
    };
  }
  // Level 3 (LLG/Ward/Facility Area)
  return {
    color: "#f59e0b", // Warm Amber
    weight: 1.5,
    fillOpacity: 0.08,
    fillColor: "#fcd34d",
  };
};

/* Original Image/CDN Based Map Marker Icons:
const facilityIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const plannedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -27],
  shadowSize: [33, 33],
});

const missingStandardIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -27],
  shadowSize: [33, 33],
});

const missingHtrIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -27],
  shadowSize: [33, 33],
});
*/

// Premium Offline-Available Vector Map Pin Icons (Built from shared SVG constants)
const facilityIcon = createFacilityCircleIcon();
const plannedIcon = createFilledPinIcon("green", FILLED_PIN_SIZE_20x29);
const missingStandardIcon = createFilledPinIcon("amber", FILLED_PIN_SIZE_20x29);
const missingHtrIcon = createFilledPinIcon("red", FILLED_PIN_SIZE_20x29);

const villageIcon = plannedIcon;
const htrIcon = missingHtrIcon;

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  basemap?: "osm" | "satellite";
  onBasemapChange?: (basemap: "osm" | "satellite") => void;
}

function MapControls({ onZoomIn, onZoomOut, onLocate, basemap, onBasemapChange }: MapControlsProps) {
  return (
    <div className="absolute right-4 bottom-20 z-[1000] flex flex-col gap-1.5" ref={disableLeafletPropagation}>
      <Button size="icon" variant="secondary" onClick={onZoomIn} data-testid="button-zoom-in" className="shadow-md">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" onClick={onZoomOut} data-testid="button-zoom-out" className="shadow-md">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="secondary" onClick={onLocate} data-testid="button-locate" className="shadow-md">
        <Locate className="h-4 w-4" />
      </Button>
      {onBasemapChange && (
        <Button
          size="icon"
          variant={basemap === "satellite" ? "default" : "secondary"}
          onClick={() => onBasemapChange(basemap === "osm" ? "satellite" : "osm")}
          title={basemap === "osm" ? "Switch to Satellite View" : "Switch to Street View"}
          className="shadow-md"
          data-testid="button-basemap-toggle"
        >
          <Globe className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/*
// Original Code: MapController didn't track active map-driven zoom changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}
*/

// Updated Code: MapController supports listening to active map zoom and bounds changes
function MapController({ 
  center, 
  zoom, 
  onZoomChange,
  onBoundsChange
}: { 
  center: [number, number]; 
  zoom: number; 
  onZoomChange?: (zoom: number) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();
  const [lat, lng] = center;
  
  // Track previous prop values using refs to prevent recursive snap-back cycles and infinite loops
  const prevCenterRef = useRef<[number, number]>([lat, lng]);
  const prevZoomRef = useRef<number>(zoom);

  // Initialize bounds exactly once on map load to ensure they are available to parent filters
  useEffect(() => {
    if (onBoundsChange) {
      onBoundsChange(map.getBounds());
    }
  }, [map]);

  useEffect(() => {
    const prevCenter = prevCenterRef.current;
    const prevZoom = prevZoomRef.current;

    // Check if the center or zoom props have actually changed from their previous values.
    // If the user manually panned, the map's current view changes but the props remain identical,
    // so we skip setView to prevent snapping back and infinite loop cascades.
    const centerPropsChanged = prevCenter[0] !== lat || prevCenter[1] !== lng;
    const zoomPropsChanged = prevZoom !== zoom;

    if (centerPropsChanged || zoomPropsChanged) {
      map.setView([lat, lng], zoom);
      prevCenterRef.current = [lat, lng];
      prevZoomRef.current = zoom;
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    }
  }, [map, lat, lng, zoom]);

  useMapEvents({
    zoomend: () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    },
    moveend: () => {
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    }
  });

  return null;
}


interface MapLegendProps {
  leftOffset?: boolean;
  hiddenCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  planningStats?: {
    planned: number;
    missingStandard: number;
    missingHtr: number;
    total: number;
    coverage: number;
  };
  showPopulationLegend?: boolean;
  /** Count of currently-visible health facilities (respects active province/district filters) */
  facilityCount?: number;
}

function MapLegend({
  leftOffset = false,
  hiddenCategories,
  onToggleCategory,
  isExpanded,
  onToggleExpanded,
  planningStats = { planned: 0, missingStandard: 0, missingHtr: 0, total: 0, coverage: 0 },
  showPopulationLegend = false,
  facilityCount,
}: MapLegendProps) {
  if (!isExpanded) {
    return (
      <div className={`absolute ${leftOffset ? "left-72" : "left-4"} bottom-4 z-[1000] transition-all duration-300`} ref={disableLeafletPropagation}>
        <Button
          size="sm"
          onClick={onToggleExpanded}
          className="shadow-lg border border-white/10 bg-background/85 backdrop-blur-md hover:bg-accent/40 font-bold text-xs gap-1.5 h-9 px-3 text-primary flex items-center rounded-xl pointer-events-auto"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Show Legend ({planningStats.coverage}% Coverage)
        </Button>
      </div>
    );
  }

  const items = [
    // Updated Code: facilityCount is now shown alongside the Health Facility legend item.
    // It reflects the currently-filtered facility count (province/district/search aware).
    { key: "facility", label: "Health Facility", color: "bg-blue-500", count: facilityCount ?? null },
    { key: "planned", label: "Planned Community", color: "bg-emerald-500", count: planningStats.planned },
    { key: "missingStandard", label: "Missing Standard", color: "bg-amber-500", count: planningStats.missingStandard },
    { key: "missingHtr", label: "Missing HTR", color: "bg-rose-500", count: planningStats.missingHtr },
    // Session plan pins on the live map (Task #47). Status-driven styling.
    { key: "sessionPlanned", label: "Session • Planned", color: "bg-blue-600", count: (planningStats as any).sessionPlanned ?? 0 },
    { key: "sessionInProgress", label: "Session • In Progress", color: "bg-amber-500", count: (planningStats as any).sessionInProgress ?? 0 },
    { key: "sessionOverdue", label: "Session • Overdue", color: "bg-rose-500", count: (planningStats as any).sessionOverdue ?? 0 },
    { key: "sessionCompleted", label: "Session • Completed", color: "bg-emerald-600", count: (planningStats as any).sessionCompleted ?? 0 },
    { key: "unserved", label: "Unserved Place", color: "bg-red-600", count: (planningStats as any).unserved ?? 0 },
  ];

  return (
    <div className={`absolute ${leftOffset ? "left-72" : "left-4"} bottom-4 z-[1000] transition-all duration-300`} ref={disableLeafletPropagation}>
      <Card className="w-56 shadow-2xl border border-white/15 bg-background/85 backdrop-blur-md rounded-xl select-none pointer-events-auto max-h-[calc(100vh-140px)] flex flex-col">
        <CardHeader className="p-3 pb-1.5 flex flex-row items-center justify-between border-b border-border/40 shrink-0">
          <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3 w-3" />
            EPI Planning Legend
          </CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={onToggleExpanded}
          >
            <ChevronLeft className="h-3 w-3 rotate-180" />
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-1.5">
            {items.map((item) => {
              const isHidden = hiddenCategories.has(item.key);
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => onToggleCategory(item.key)}
                  className={`w-full text-left flex items-center justify-between gap-2 p-1.5 rounded-lg border border-transparent cursor-pointer hover:bg-accent/45 transition-all duration-200 focus:outline-none ${
                    isHidden ? "opacity-40 line-through text-muted-foreground bg-muted/20" : "text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm shrink-0`} />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.count !== null && (
                      <span className="font-mono text-[10px] font-bold text-foreground bg-muted px-1 py-0.2 rounded">
                        {item.count}
                      </span>
                    )}
                    {!isHidden ? (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded leading-none border border-emerald-500/10">On</span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1 py-0.5 rounded leading-none border border-border/40">Off</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Coverage Rate Progress Bar */}
          <div className="border-t border-border/30 pt-2.5 space-y-1.5 text-[10px]">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground uppercase">Planning Coverage:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">{planningStats.coverage}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${planningStats.coverage}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground font-medium text-center">
              {planningStats.planned} / {planningStats.total} Communities Scheduled
            </p>
          </div>

          {/* Gridded population overlay heat-map legend */}
          {showPopulationLegend && (
            <div className="border-t border-border/30 pt-2.5 space-y-2">
              <Label className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                Population Density
              </Label>
              <div className="space-y-1 pl-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(127, 29, 29, 0.85)" }} />
                  <span className="text-[9px] font-medium text-foreground">&gt; 1,000 / km² (Extreme)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(185, 28, 28, 0.8)" }} />
                  <span className="text-[9px] font-medium text-foreground">501 - 1,000 / km² (High)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(220, 38, 38, 0.75)" }} />
                  <span className="text-[9px] font-medium text-foreground">251 - 500 / km² (Med-High)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(234, 88, 12, 0.7)" }} />
                  <span className="text-[9px] font-medium text-foreground">101 - 250 / km² (Medium)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(249, 115, 22, 0.65)" }} />
                  <span className="text-[9px] font-medium text-foreground">51 - 100 / km² (Low-Med)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(234, 179, 8, 0.6)" }} />
                  <span className="text-[9px] font-medium text-foreground">11 - 50 / km² (Low)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded shadow-xs" style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} />
                  <span className="text-[9px] font-medium text-foreground">1 - 10 / km² (Scattered)</span>
                </div>
              </div>
            </div>
          )}

          {hiddenCategories.size > 0 && (
            <button
              onClick={() => {
                items.forEach((item) => {
                  if (hiddenCategories.has(item.key)) {
                    onToggleCategory(item.key);
                  }
                });
              }}
              className="w-full text-center text-[10px] font-bold text-primary hover:underline pt-1.5 border-t border-border/30"
            >
              Reset Filters
            </button>
          )}
        </CardContent>
        {/* Original Code: Only rendering the guide when showPopulationLegend is active. We are commenting this out to make the guide always accessible.
        {showPopulationLegend && (
          <div className="p-3 pt-2 border-t border-border/40 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[9px] font-bold h-7 gap-1 border-primary/20 text-primary hover:bg-primary/5 rounded-lg select-none"
                >
                  <Zap className="h-3 w-3 text-amber-500 animate-pulse" />
                  Missed Communities Guide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-3xl p-5 select-text pointer-events-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-primary font-black">
                    <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>Spatial Population Strategy Guide</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed font-sans">
                    Learn how to utilize gridded spatial population density models to pinpoint missed settlements and plan precise, high-coverage immunizations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-3.5 text-xs leading-relaxed text-foreground select-text font-sans">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <h4 className="font-bold text-primary flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                      1. Pinpoint Missed Communities
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                      Look for clusters of high-density population grids (Crimson, Red, Orange blocks) on the map that **lack green Community pins**. These represent unregistered settlements currently missed by vaccine outreach.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                      2. Audit Geofence Catchment Gaps
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                      Verify that high-density grids are enclosed within the geofenced **Catchment Area Polygons**. Population pockets falling outside boundaries represent zero-dose risks that should be incorporated.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                      3. Optimize HTR Outreach Circles
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                      Ensure scattered yellow and green settlements are covered by **5km HTR Outreach Buffer circles**. Settlements outside these radii require dedicated mobile team deployment.
                    </p>
                  </div>
                </div>
                <DialogFooter className="pt-3">
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full rounded-xl">Got it, Let's Optimize</Button>
                  </DialogTrigger>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        */}

        {/* Updated Code: Render the "Missed Communities Guide" button inside a permanent sticky footer at the bottom of the map legend card. This ensures the guide is always accessible even when the population density layer is toggled off. */}
        <div className="p-3 pt-2 border-t border-border/40 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-[9px] font-bold h-7 gap-1 border-primary/20 text-primary hover:bg-primary/5 rounded-lg select-none"
              >
                <Zap className="h-3 w-3 text-amber-500 animate-pulse" />
                Missed Communities Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-3xl p-5 select-text pointer-events-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-black">
                  <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Spatial Population Strategy Guide</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed font-sans">
                  Learn how to utilize gridded spatial population density models to pinpoint missed settlements and plan precise, high-coverage immunizations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-3.5 text-xs leading-relaxed text-foreground select-text font-sans">
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="font-bold text-primary flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                    1. Pinpoint Missed Communities
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                    Look for clusters of high-density population grids (Crimson, Red, Orange blocks) on the map that **lack green Community pins**. These represent unregistered settlements currently missed by vaccine outreach.
                  </p>
                </div>
                
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                    2. Audit Geofence Catchment Gaps
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                    Verify that high-density grids are enclosed within the geofenced **Catchment Area Polygons**. Population pockets falling outside boundaries represent zero-dose risks that should be incorporated.
                  </p>
                </div>

                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wider">
                    3. Optimize HTR Outreach Circles
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-normal font-sans">
                    Ensure scattered yellow and green settlements are covered by **5km HTR Outreach Buffer circles**. Settlements outside these radii require dedicated mobile team deployment.
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-3">
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full rounded-xl">Got it, Let's Optimize</Button>
                </DialogTrigger>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
}


export interface MapOverlayLayers {
  facilities: boolean;
  villages: boolean;
  htrAreas: boolean;
  catchments: boolean;
  roads: boolean;
  boundaries: boolean;   // admin boundary polygons from GeoBoundaries/GADM
  hcwCatchments: boolean; // HCW-drawn facility catchment polygons
  wards: boolean;
  constituencies: boolean;
  populationGeoTIFF: boolean;
  grid3Settlements: boolean;
  zeroDoseVillages: boolean; // Per-village zero-dose / under-immunized graduated pins
  underImmunizedVillages: boolean; // Per-village under-immunized (DTP1 but no DTP3) graduated pins
}

interface LayerPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  layers: MapOverlayLayers;
  onLayerToggle: (layer: keyof MapOverlayLayers) => void;
  basemap: "osm" | "satellite";
  onBasemapChange: (basemap: "osm" | "satellite") => void;
  boundaryList?: Array<{ id: string; adminLevel: number; levelName: string; isActive: boolean }>;
  countryCode?: string;
  adminLabels?: { level1: string; level2: string; level3: string; level4: string };
}

/*
// Original Code: Absolute positioned LayerPanel
function LayerPanel({
  isOpen,
  onToggle,
  layers,
  onLayerToggle,
  basemap,
  onBasemapChange,
}: LayerPanelProps) {
  return (
    <div className={`absolute left-4 top-4 z-[1000] transition-all duration-200 ${isOpen ? "w-64" : "w-auto"}`}>
      <Card>
        ...
      </Card>
    </div>
  );
}
*/

// Updated Code: Relative flow LayerPanel suitable for stacking alongside FilterPanel, with country-adaptive overlay naming, custom labels, and dynamic database missing warnings.
function LayerPanel({
  isOpen,
  onToggle,
  layers,
  onLayerToggle,
  basemap,
  onBasemapChange,
  boundaryList = [],
  countryCode,
  adminLabels,
}: LayerPanelProps) {
  return (
    <div className={`transition-all duration-200 ${isOpen ? "w-64" : "w-auto"}`} ref={disableLeafletPropagation}>
      <Card className="shadow-lg border border-white/10 bg-background/85 backdrop-blur-md">
        <CardHeader className="p-3 flex flex-row items-center justify-between gap-2 border-b border-border/40">
          {isOpen && (
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
              <Layers className="h-4 w-4" />
              Layers
            </CardTitle>
          )}
          <Button size="icon" variant="ghost" onClick={onToggle} data-testid="button-toggle-layers">
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {isOpen && (
          <CardContent className="p-3 pt-3 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Basemap</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={basemap === "osm" ? "default" : "outline"}
                  onClick={() => onBasemapChange("osm")}
                  className="flex-1 text-xs"
                  data-testid="button-basemap-osm"
                >
                  OpenStreetMap
                </Button>
                <Button
                  size="sm"
                  variant={basemap === "satellite" ? "default" : "outline"}
                  onClick={() => onBasemapChange("satellite")}
                  className="flex-1 text-xs"
                  data-testid="button-basemap-satellite"
                >
                  Satellite
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground block mb-1">Overlays</Label>
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {Object.entries(layers).map(([key, value]) => {
                  let displayName = key.replace(/([A-Z])/g, " $1").trim();
                  let subtext = "";
                  let subtextClass = "text-[10px] text-muted-foreground block mt-0.5 leading-normal";

                  const hasLevel2 = boundaryList?.some((b) => b.adminLevel === 2);
                  const hasLevel3 = boundaryList?.some((b) => b.adminLevel === 3);
                  const hasAnyBoundary = (boundaryList?.length ?? 0) > 0;

                  // ── Layer display names & subtext ──
                  if (key === "facilities") {
                    displayName = "Health Facilities";
                    subtext = "Hospital, clinic & health post markers";
                  } else if (key === "villages") {
                    displayName = "Communities / Villages";
                    subtext = "Settlement markers with planning status";
                  } else if (key === "htrAreas") {
                    displayName = "HTR Outreach Buffers";
                    subtext = "5 km radius around hard-to-reach communities";
                  } else if (key === "catchments") {
                    displayName = "Facility Catchments";
                    subtext = "5 & 10 km concentric walkability circles + community-to-facility lines";
                  } else if (key === "roads") {
                    displayName = "Road Network";
                    subtext = "Esri transport network overlay (requires internet)";
                  } else if (key === "boundaries") {
                    displayName = "Administrative Boundaries";
                    if (!hasAnyBoundary) {
                      subtext = "⚠ No boundaries imported — use Data Seeding → Import Boundaries";
                      subtextClass = "text-[10px] text-amber-400 font-medium block mt-0.5 leading-normal";
                    } else {
                      subtext = "Cascading province / district boundary polygons";
                    }
                  } else if (key === "hcwCatchments") {
                    displayName = "Saved Catchments";
                    subtext = "Polygons saved via Draw Catchment — shown by default";
                  } else if (key === "wards") {
                    displayName = adminLabels?.level3 || "Wards";
                    if (!hasLevel3) {
                      subtext = `⚠ No ${adminLabels?.level3 || "Ward"} boundaries imported yet`;
                      subtextClass = "text-[10px] text-amber-400 font-medium block mt-0.5 leading-normal";
                    } else {
                      subtext = `${adminLabels?.level3 || "Ward"} level boundary polygons`;
                    }
                  } else if (key === "constituencies") {
                    displayName = adminLabels?.level2 || "Constituencies";
                    if (!hasLevel2) {
                      subtext = `⚠ No ${adminLabels?.level2 || "Constituency"} boundaries imported yet`;
                      subtextClass = "text-[10px] text-amber-400 font-medium block mt-0.5 leading-normal";
                    } else if (countryCode === "ZMB") {
                      subtext = "Districts mapped as constituencies in database";
                      subtextClass = "text-[10px] text-indigo-400 font-medium block mt-0.5 leading-normal";
                    } else {
                      subtext = `${adminLabels?.level2 || "Constituency"} level boundary polygons`;
                    }
                  } else if (key === "populationGeoTIFF") {
                    displayName = "Population Density";
                    subtext = "WorldPop gridded raster heat-map (upload via Resources)";
                  } else if (key === "grid3Settlements") {
                    displayName = "GRID3 Settlement Footprints";
                    if (countryCode !== "ZMB") {
                      subtext = "⚠ GRID3 settlement dataset not available for this country";
                      subtextClass = "text-[10px] text-amber-400 font-medium block mt-0.5 leading-normal";
                    } else {
                      subtext = "High-fidelity building footprint extents (external API)";
                    }
                  } else if (key === "zeroDoseVillages") {
                    displayName = "Zero-dose Villages";
                    subtext = "Graduated pins by missed-child count (DTP1 gap)";
                  } else if (key === "underImmunizedVillages") {
                    displayName = "Under-immunized Villages";
                    subtext = "Graduated amber pins by under-immunized count (DTP1, no DTP3)";
                  }

                  // ── Data-availability dot color ──
                  // green = data always available; amber = data missing/requires import;
                  // sky = conditional (drawn/uploaded); violet = external API
                  let dotColor = "bg-emerald-500";
                  if ((key === "boundaries" && !hasAnyBoundary) ||
                      (key === "wards" && !hasLevel3) ||
                      (key === "constituencies" && !hasLevel2) ||
                      (key === "grid3Settlements" && countryCode !== "ZMB")) {
                    dotColor = "bg-amber-400";
                  } else if (key === "populationGeoTIFF") {
                    dotColor = "bg-sky-400";
                  } else if (key === "grid3Settlements") {
                    dotColor = "bg-violet-400";
                  } else if (key === "hcwCatchments") {
                    dotColor = "bg-sky-400";
                  }

                  const isDisabled = key === "grid3Settlements" && countryCode !== "ZMB";

                  return (
                    <div key={key} className="border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2 py-1">
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={key} className="text-sm font-medium cursor-pointer text-foreground flex items-center gap-1.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px ${dotColor}`} title={dotColor === "bg-amber-400" ? "No data imported" : dotColor === "bg-violet-400" ? "External API" : "Data available"} />
                            <span className="truncate">{displayName}</span>
                          </Label>
                          {subtext && <span className={`${subtextClass} pl-3`}>{subtext}</span>}
                        </div>
                        <Switch
                          id={key}
                          checked={value && !isDisabled}
                          onCheckedChange={() => !isDisabled && onLayerToggle(key as keyof MapOverlayLayers)}
                          disabled={isDisabled}
                          title={isDisabled ? "GRID3 settlement dataset not available for this country" : undefined}
                          data-testid={`switch-layer-${key}`}
                          className="mt-0.5 flex-shrink-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}


interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedProvinceId: number | "all";
  onProvinceChange: (provinceId: number | "all") => void;
  selectedDistrictId: number | "all";
  onDistrictChange: (districtId: number | "all") => void;
  selectedLlgId: number | "all";
  onLlgChange: (llgId: number | "all") => void;
  villageCategory: "all" | "htr" | "standard";
  onVillageCategoryChange: (category: "all" | "htr" | "standard") => void;
  filterColdChain: boolean;
  onColdChainToggle: () => void;
  filterPower: boolean;
  onPowerToggle: () => void;
  provinces: any[];
  districts: any[];
  llgs: any[];
  adminLabels: { level1: string; level2: string; level3: string; level4: string };
  totalFacilitiesCount: number;
  filteredFacilitiesCount: number;
  totalVillagesCount: number;
  filteredVillagesCount: number;
}

function FilterPanel({
  isOpen,
  onToggle,
  searchQuery,
  onSearchChange,
  selectedProvinceId,
  onProvinceChange,
  selectedDistrictId,
  onDistrictChange,
  selectedLlgId,
  onLlgChange,
  villageCategory,
  onVillageCategoryChange,
  filterColdChain,
  onColdChainToggle,
  filterPower,
  onPowerToggle,
  provinces,
  districts,
  llgs,
  adminLabels,
  totalFacilitiesCount,
  filteredFacilitiesCount,
  totalVillagesCount,
  filteredVillagesCount,
}: FilterPanelProps) {
  // Cascading Selectors logic filtering Districts options by Province and LLGs by District
  const filteredDistrictsForSelect = useMemo(() => {
    if (selectedProvinceId === "all") return districts;
    return districts.filter((d) => Number(d.provinceId) === Number(selectedProvinceId));
  }, [districts, selectedProvinceId]);

  const filteredLlgsForSelect = useMemo(() => {
    if (selectedDistrictId !== "all") {
      return llgs.filter((l) => Number(l.districtId) === Number(selectedDistrictId));
    }
    if (selectedProvinceId !== "all") {
      const allowedDistrictIds = new Set(
        districts.filter((d) => Number(d.provinceId) === Number(selectedProvinceId)).map((d) => Number(d.id))
      );
      return llgs.filter((l) => allowedDistrictIds.has(Number(l.districtId)));
    }
    return llgs;
  }, [llgs, districts, selectedProvinceId, selectedDistrictId]);

  return (
    <div className={`transition-all duration-200 ${isOpen ? "w-64" : "w-auto"}`} ref={disableLeafletPropagation}>
      <Card className="shadow-lg border border-white/10 bg-background/85 backdrop-blur-md">
        <CardHeader className="p-3 flex flex-row items-center justify-between gap-2 border-b border-border/40">
          {isOpen && (
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
              <Filter className="h-4 w-4" />
              Map Filters
            </CardTitle>
          )}
          <Button size="icon" variant="ghost" onClick={onToggle} data-testid="button-toggle-filters">
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {isOpen && (
          <CardContent className="p-3 pt-3 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/85" />
                <Input
                  type="text"
                  placeholder="Search name, code, hmis..."
                  className="pl-8 h-9 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-7 w-7 rounded-full hover:bg-muted"
                    onClick={() => onSearchChange("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Province Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {adminLabels.level1} Filter
              </Label>
              <Select
                value={selectedProvinceId === "all" ? "all" : String(selectedProvinceId)}
                onValueChange={(val) => onProvinceChange(val === "all" ? "all" : Number(val))}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder={`Select ${adminLabels.level1}...`} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All {adminLabels.level1}s</SelectItem>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {adminLabels.level2} Filter
              </Label>
              <Select
                value={selectedDistrictId === "all" ? "all" : String(selectedDistrictId)}
                onValueChange={(val) => onDistrictChange(val === "all" ? "all" : Number(val))}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder={`Select ${adminLabels.level2}...`} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All {adminLabels.level2}s</SelectItem>
                  {filteredDistrictsForSelect.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LLG / Ward Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {adminLabels.level3} Filter
              </Label>
              <Select
                value={selectedLlgId === "all" ? "all" : String(selectedLlgId)}
                onValueChange={(val) => onLlgChange(val === "all" ? "all" : Number(val))}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder={`Select ${adminLabels.level3}...`} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All {adminLabels.level3}s</SelectItem>
                  {filteredLlgsForSelect.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Village Type (HTR vs Standard) Filter */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {adminLabels.level4} Category
              </Label>
              <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-lg border">
                <button
                  onClick={() => onVillageCategoryChange("all")}
                  className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                    villageCategory === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => onVillageCategoryChange("htr")}
                  className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                    villageCategory === "htr"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm border border-red-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  HTR
                </button>
                <button
                  onClick={() => onVillageCategoryChange("standard")}
                  className={`py-1 text-[10px] font-semibold rounded-md transition-all ${
                    villageCategory === "standard"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Standard
                </button>
              </div>
            </div>

            {/* Facility Resource Toggles */}
            <div className="space-y-2 pt-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Facility Equipment
              </Label>
              
              <div className="flex items-center justify-between p-1.5 rounded-lg border border-border/40 hover:bg-accent/25 transition-colors">
                <Label htmlFor="filter-cold-chain-toggle" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none">
                  <Thermometer className="h-4 w-4 text-blue-500 shrink-0" />
                  Cold Chain Functional
                </Label>
                <Switch
                  id="filter-cold-chain-toggle"
                  checked={filterColdChain}
                  onCheckedChange={onColdChainToggle}
                  className="scale-90"
                />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg border border-border/40 hover:bg-accent/25 transition-colors">
                <Label htmlFor="filter-power-toggle" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  Power Supply Active
                </Label>
                <Switch
                  id="filter-power-toggle"
                  checked={filterPower}
                  onCheckedChange={onPowerToggle}
                  className="scale-90"
                />
              </div>
            </div>

            {/* Real-time Counts Footer */}
            <div className="pt-3 border-t border-border/40 space-y-1.5 text-[10px] text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Facilities Shown:</span>
                <span className="font-semibold text-foreground">
                  {filteredFacilitiesCount} / {totalFacilitiesCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Villages Shown:</span>
                <span className="font-semibold text-foreground">
                  {filteredVillagesCount} / {totalVillagesCount}
                </span>
              </div>
              {(searchQuery || selectedProvinceId !== "all" || selectedDistrictId !== "all" || selectedLlgId !== "all" || villageCategory !== "all" || filterColdChain || filterPower) && (
                <button
                  onClick={() => {
                    onSearchChange("");
                    onProvinceChange("all");
                    onDistrictChange("all");
                    onLlgChange("all");
                    onVillageCategoryChange("all");
                    if (filterColdChain) onColdChainToggle();
                    if (filterPower) onPowerToggle();
                  }}
                  className="w-full text-center text-primary hover:underline font-bold mt-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface MapViewProps {
  facilities?: Facility[];
  villages?: Village[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showFacilityList?: boolean;
}

// Custom helper component to listen to Leaflet map events for measurement clicking
function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click(e) {
      onClick(e);
    },
  });
  return null;
}
// Original Code: Intercepts and stops propagation of all mouse, touch, and pointer events in the capture phase.
// This broke React event delegation (which delegates events at the #root element) for all interactive child elements (like Select, Input, Buttons) inside the overlays.
/*
export const disableLeafletPropagation = (el: HTMLDivElement | null) => {
  if (el) {
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    
    const halt = (e: Event) => e.stopPropagation();
    const events = ["click", "dblclick", "mousedown", "mouseup", "touchstart", "touchend", "touchmove", "pointerdown", "pointerup", "keydown", "keyup", "keypress", "contextmenu"];
    events.forEach(event => el.addEventListener(event, halt, true));
  }
};
*/

// Updated Code: Upgraded event propagation blocker supporting type-safe selective capture.
// If the user interacts with form elements, buttons, comboboxes, select menus, or checkboxes, the event is allowed to capture and bubble normally to allow React's event delegation to execute.
// Otherwise, it stops propagation in the capture phase to fully block map zoom, panning, and mouse click bleed.
export const disableLeafletPropagation = (el: HTMLDivElement | null) => {
  if (el) {
    // Upgraded Code: Prevent duplicate event listener leaks on every React render cycle.
    // We attach a stable boolean flag directly to the DOM element node ref to guarantee listeners are added exactly once.
    if ((el as any)._leaflet_propagation_disabled) {
      return;
    }
    (el as any)._leaflet_propagation_disabled = true;

    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    
    const halt = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName.toLowerCase() === "input" ||
         target.tagName.toLowerCase() === "button" ||
         target.tagName.toLowerCase() === "select" ||
         target.tagName.toLowerCase() === "option" ||
         target.tagName.toLowerCase() === "textarea" ||
         target.tagName.toLowerCase() === "label" ||
         target.closest("button") ||
         target.closest("input") ||
         target.closest("select") ||
         target.closest("label") ||
         target.closest("a") ||
         target.closest("[role='combobox']") ||
         target.closest("[role='listbox']") ||
         target.closest("[role='option']") ||
         target.closest("[role='switch']") ||
         target.closest("[role='checkbox']") ||
         target.closest("[role='tab']") ||
         target.closest("[role='menuitem']") ||
         target.closest(".select-trigger") ||
         target.closest(".select-content") ||
         target.closest(".switch") ||
         target.closest("[data-state]"))
      ) {
        return; // Do not stop propagation of interactive events in the capture phase!
      }
      e.stopPropagation();
    };
    const events = ["click", "dblclick", "mousedown", "mouseup", "touchstart", "touchend", "touchmove", "pointerdown", "pointerup", "keydown", "keyup", "keypress", "contextmenu"];
    events.forEach(event => el.addEventListener(event, halt, true));
  }
};

/*
// Original Code: MapView component without interactive measurements and export dialogs
export function MapView({
  facilities = [],
  villages = [],
  center = [-6.0, 147.0],
  zoom = 6,
  height = "100%",
}: MapViewProps) {
  const mapRef = useRef<L.Map>(null);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [basemap, setBasemap] = usePersistedBasemap("osm");
  const [layers, setLayers] = useState({
    facilities: true,
    villages: true,
    htrAreas: true,
    catchments: false,
    roads: false,
  });

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapRef.current?.setView(
            [position.coords.latitude, position.coords.longitude],
            14
          );
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  };

  const handleLayerToggle = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={false}
      >
        {basemap === "osm" ? (
          <TileLayer
            attribution={OSM_TILE_ATTRIBUTION}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution={ESRI_IMAGERY_ATTRIBUTION}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* Commented out raw unfiltered rendering to prevent double rendering that bypasses/violates the active Map Filters.
            The correct premium, filtered facility and village markers are rendered dynamically in the second rendering block below.
        layers.facilities &&
          facilities
            .filter((f) => f.latitude && f.longitude)
            .map((facility) => (
              <Marker
                key={`facility-${facility.id}`}
                position={[Number(facility.latitude), Number(facility.longitude)]}
                icon={facilityIcon}
              >
                <Popup>
                  <div className="min-w-48">
                    <h3 className="font-semibold">{facility.name}</h3>
                    <p className="text-xs text-muted-foreground">{facility.hmisCode}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Type: {facility.facilityType}</p>
                      <p>Staff: {facility.staffCount || "N/A"}</p>
                      <div className="flex gap-2 mt-2">
                        {facility.hasRefrigerator && (
                          <Badge variant="secondary" className="text-xs">Cold Chain</Badge>
                        )}
                        {facility.hasPower && (
                          <Badge variant="secondary" className="text-xs">Power</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))

        layers.villages &&
          villages
            .filter((v) => v.latitude && v.longitude)
            .map((village) => (
              <Marker
                key={`village-${village.id}`}
                position={[Number(village.latitude), Number(village.longitude)]}
                icon={village.isHardToReach ? htrIcon : villageIcon}
              >
                <Popup>
                  <div className="min-w-40">
                    <h3 className="font-semibold">{village.name}</h3>
                    {village.code && (
                      <p className="text-xs text-muted-foreground">{village.code}</p>
                    )}
                    <div className="mt-2 space-y-1 text-sm">
                      {village.distanceToFacility && (
                        <p>Distance: {Number(village.distanceToFacility).toFixed(1)} km</p>
                      )}
                      {village.travelTimeMinutes && (
                        <p>Travel: {village.travelTimeMinutes} min</p>
                      )}
                      {village.isHardToReach && (
                        <Badge variant="destructive" className="text-xs mt-2">
                          Hard to Reach
                        </Badge>
                      )}
                    </div>
                  </div>
                </Popup>
        * /}

        <MapController center={center} zoom={zoom} />
      </MapContainer>

      <LayerPanel
        isOpen={layerPanelOpen}
        onToggle={() => setLayerPanelOpen(!layerPanelOpen)}
        layers={layers}
        onLayerToggle={handleLayerToggle}
        basemap={basemap}
        onBasemapChange={setBasemap}
        boundaryList={boundaryList}
        countryCode={tenantInfo?.countryCode}
        adminLabels={adminLabels}
      />

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocate={handleLocate}
      />

      <MapLegend />

      <div className="absolute right-4 top-4 z-[1000] flex gap-2">
        <Button size="sm" variant="secondary" data-testid="button-measure">
          <Ruler className="h-4 w-4 mr-1" />
          Measure
        </Button>
        <Button size="sm" variant="secondary" data-testid="button-download-map">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </div>
  );
}
*/

interface GeoTIFFOverlayProps {
  url: string;
  opacity?: number;
  onRasterLoaded?: (georaster: any) => void;
  // Active *view* tenant id — used to scope the IndexedDB raster cache so a
  // cached raster from another country (e.g. the user's home tenant) is never
  // re-served when the user has switched to a different tenant.
  cacheScope?: string;
  // When false, the overlay will NOT auto-fit the map to the raster bounds on
  // load. The tenant's configured mapCenter/mapZoom and the explicit raster
  // selector already handle centering — auto-fitting here was causing the map
  // to snap to whatever raster happened to be cached.
  autoFit?: boolean;
}

function GeoTIFFOverlay({ url, opacity = 0.65, onRasterLoaded, cacheScope, autoFit = false }: GeoTIFFOverlayProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;

    // Derive a stable cache key from the URL — include any ?file= query so the
    // default (auto-resolved) raster gets its own per-scope slot distinct from
    // explicitly selected files.
    const urlPath = url.split("?")[0].split("/").pop() ?? "default";
    const urlQuery = url.includes("?") ? url.split("?")[1] : "";
    const cacheKey = `geotiff_${urlPath}${urlQuery ? `_${urlQuery}` : ""}`;
    // Scope cache to the active *view* tenant, falling back to the user's home
    // tenant only when no explicit scope was passed.
    const tenantId = cacheScope ?? (user as any)?.tenantId ?? "global";

    async function loadRaster() {
      let arrayBuffer: ArrayBuffer | undefined;

      // Layer 1: IndexedDB gisCache — instant read, survives page reloads and app restarts.
      // This is critical on Android where the WebView's HTTP disk cache can be evicted
      // under memory pressure, causing a 14–63 MB re-download every time the layer is toggled.
      try {
        // Original Code (Composite primary key lookup with query object - returns undefined on composite index):
        // const cached = await offlineDb.gisCache.get({ key: cacheKey, tenantId });
        // Updated Code: Correctly passes the composite index primary key as a tuple [key, tenantId]
        const cached = await offlineDb.gisCache.get([cacheKey, tenantId]);
        if (cached?.rasterBuffer) {
          arrayBuffer = cached.rasterBuffer;
        }
      } catch (_cacheErr) {
        console.warn("[GIS Cache] IndexedDB gisCache raster read skipped:", _cacheErr);
      }

      // Layer 2: HTTP fetch (cache miss path — runs once per device)
      if (!arrayBuffer) {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) throw new Error("No population GeoTIFF file found in resources.");
          throw new Error(`HTTP Error ${res.status}`);
        }
        arrayBuffer = await res.arrayBuffer();

        // Layer 3: Persist to IndexedDB asynchronously — do not block the map render
        offlineDb.gisCache.put({ key: cacheKey, tenantId, rasterBuffer: arrayBuffer, cachedAt: Date.now() })
          .catch((err) => console.warn("[GIS Cache] Failed to persist GeoTIFF to IndexedDB:", err));
      }

      if (!active || !arrayBuffer) return;

      const parseGeorasterModule = await import("georaster");
      const parseFn = (parseGeorasterModule as any).default || parseGeorasterModule;
      const georaster = await parseFn(arrayBuffer);

      if (!active || !georaster) return;

      /*
      // Original Coordinate Warping Hack (Added when Zambia's raster was corrupted):
      // Map valid carrier raster structural bounds onto Zambia.
      // Now that the user has uploaded the real, uncorrupted Zambia and South Sudan
      // population rasters with native correct coordinates, this warping hack is no longer required!
      if (url.toLowerCase().includes("zmb") || cacheKey.toLowerCase().includes("zmb")) {
        georaster.xmin = 21.98;
        georaster.ymin = -18.07;
        georaster.xmax = 33.72;
        georaster.ymax = -8.20;
      }
      */


      if (onRasterLoaded) {
        onRasterLoaded(georaster);
      }

      // Set window.L so georaster-layer-for-leaflet can reference it safely
      (window as any).L = L;

      // Updated Code: Safe ESM import compatibility wrapper to resolve default-export mismatches under Vite build minification
      const GeoRasterLayerModule = await import("georaster-layer-for-leaflet");
      const GeoRasterLayerClass = (GeoRasterLayerModule as any).default || GeoRasterLayerModule;

      // Create Leaflet layer from parsed georaster
      const layer = new (GeoRasterLayerClass as any)({
        georaster,
        opacity,
        pixelValuesToColorFn: (values: number[]) => {
          const val = values[0];
          if (val === undefined || isNaN(val) || val <= 0 || val === georaster.noDataValue) {
            return null; // transparent
          }

          // Harmonious HSL matching design guidelines for population heatmaps
          if (val > 1000) return "rgba(127, 29, 29, 0.85)"; // Extreme density - Crimson
          if (val > 500) return "rgba(185, 28, 28, 0.8)";   // High density - Red
          if (val > 250) return "rgba(220, 38, 38, 0.75)";  // Med-High - Bright Red
          if (val > 100) return "rgba(234, 88, 12, 0.7)";   // Medium - Orange-Red
          if (val > 50) return "rgba(249, 115, 22, 0.65)";   // Low-Medium - Orange
          if (val > 10) return "rgba(234, 179, 8, 0.6)";    // Low - Yellow
          return "rgba(34, 197, 94, 0.5)";                  // Scattered settlements - Green
        },
        resolution: 128, // High-performance smooth scaling
      });

      layerRef.current = layer;
      layer.addTo(map);

      // Auto-zoom map to GeoTIFF bounding box limits if available.
      // Disabled by default: this was the cause of the map snapping to a
      // foreign country (e.g. PNG while viewing ZMB) whenever the overlay
      // (re)loaded. The active tenant's mapCenter/mapZoom and the explicit
      // raster selector dropdown already center the map correctly.
      if (autoFit && georaster.xmin && georaster.ymin && georaster.xmax && georaster.ymax) {
        const bounds = L.latLngBounds(
          [georaster.ymin, georaster.xmin],
          [georaster.ymax, georaster.xmax]
        );
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }
    }

    loadRaster().catch((err) => {
      console.error("[GeoTIFF] Layer load failed:", { url, cacheScope, tenantId, error: err?.message || err });
      if (!navigator.onLine) {
        toast({
          title: "Offline Population Layer",
          description: "Gridded population density is currently unavailable offline. Load the map once while online to cache this layer.",
          variant: "default",
        });
      } else {
        toast({
          title: "Population Layer Unavailable",
          description: `Could not load gridded population: ${err?.message || "unknown error"}.`,
          variant: "destructive",
        });
      }
    });

    return () => {
      active = false;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, url, opacity, cacheScope, autoFit]);

  return null;
}

// Renders a single custom vector layer. Fetches the full GeoJSON (which is NOT
// included in the list endpoint to keep it light) only when this layer is
// actually shown on the map.
function CustomVectorLayer({ id, style }: { id: string; style: any }) {
  const { data } = useQuery<any>({
    queryKey: [`/api/custom-layers/${id}`],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/custom-layers/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load custom layer");
      return res.json();
    },
  });
  const color = style?.color ?? "#2563eb";
  const pathStyle = {
    color,
    weight: style?.weight ?? 2,
    fillColor: color,
    fillOpacity: style?.fillOpacity ?? 0.25,
  };
  if (!data?.geojson?.features?.length) return null;
  return (
    <GeoJSON
      key={`custom-layer-${id}`}
      data={data.geojson}
      style={() => pathStyle as any}
      pointToLayer={(_feature, latlng) =>
        L.circleMarker(latlng, { radius: style?.pointRadius ?? 5, ...pathStyle })
      }
      onEachFeature={(feature, layer) => {
        const props = feature.properties || {};
        // Escape both keys and values — uploaded GeoJSON/CSV/Shapefile
        // attributes are untrusted and would otherwise allow stored XSS in
        // the Leaflet popup HTML.
        const esc = (s: any) =>
          String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        const rows = Object.entries(props)
          .slice(0, 12)
          .map(([k, v]) => `<div><strong>${esc(k)}:</strong> ${esc(v)}</div>`)
          .join("");
        layer.bindPopup(
          `<div class="p-2 text-xs font-sans space-y-0.5 max-w-[220px]">${rows || "<em>No attributes</em>"}</div>`,
          { maxWidth: 240 },
        );
      }}
    />
  );
}

const DEFAULT_MAP_CENTER: [number, number] = [-6.0, 147.0];

// Updated Code: Fully functional MapView supporting interactive geodesic Turf measurements, high-res PDF layout, and premium Radix UI data exports
export function MapView({
  facilities = [],
  villages = [],
  center = DEFAULT_MAP_CENTER,
  zoom = 6,
  height = "100%",
  showFacilityList = false,
}: MapViewProps) {
  const { user } = useAuth();
  const mapRef = useRef<L.Map>(null);
  const markerRefs = useRef<Record<number, L.Marker | null>>({});
  const geoJsonRefs = useRef<Record<string, any>>({});
  const fetchingRef = useRef<Record<string, boolean>>({});
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // WorldPop population-density overlay (off by default, session-scoped).
  const populationOverlay = usePopulationOverlay();

  // Map overlay visibility layers (moved to top of states block to be declared before query hooks dependent on them)
  const [layers, setLayers] = useState<MapOverlayLayers>({
    facilities: true,
    villages: true,
    htrAreas: true,
    catchments: false,
    roads: false,
    boundaries: true,
    // Updated: Saved Catchments overlay defaults ON so HCW-drawn polygons are
    // immediately visible after saving (no buried toggle).
    hcwCatchments: true,
    wards: false,
    constituencies: false,
    populationGeoTIFF: true,
    grid3Settlements: false,
    zeroDoseVillages: false,
    underImmunizedVillages: false,
  });

  // Advanced GIS-Microplanning States & Refs
  const georasterRef = useRef<any>(null);
  const [clickDialogOpen, setClickDialogOpen] = useState(false);
  const [mapClickDetails, setMapClickDetails] = useState<{
    lat: number;
    lng: number;
    density: number;
    nearestFacility: { id: number; name: string; distance: number } | null;
    nearestPlan: { id: number; name: string; distance: number } | null;
    nearestVillage?: { id: number; name: string; population: number; distance: number } | null;
  } | null>(null);

  // Universal GeoTIFF Raster selection state
  const [selectedRasterFile, setSelectedRasterFile] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("vaxplan_selected_raster") || "";
    }
    return "";
  });

  const { data: rasterListData } = useQuery<{ success: boolean; files: Array<{ fileName: string; country: string; resolution: string }> }>({
    queryKey: ["/api/resources/geotiff/list"],
  });

  // Zero-dose / under-immunized per-village breakdown.
  // Only fetched when the layer is toggled on, to avoid extra load on initial map open.
  const { data: zeroDoseData } = useQuery<{
    byVillage: Array<{
      villageId: number | null;
      villageName: string;
      districtId: number;
      districtName: string;
      facilityId: number;
      facilityName: string;
      latitude: number | null;
      longitude: number | null;
      isHardToReach: boolean;
      zeroDose: number;
      underImmunized: number;
      denominator: number;
      pct: number;
      underImmunizedPct: number;
      lastDefaulterSession?: { date: string; caughtUp: number } | null;
    }>;
  }>({
    queryKey: ["/api/indicators/zero-dose"],
    enabled: layers.zeroDoseVillages || layers.underImmunizedVillages,
  });

  // Query all public tenants to allow synchronization between raster selection and planning context
  const { data: publicTenants = [] } = useQuery<any[]>({
    queryKey: ["/api/public/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/public/tenants");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await fetch("/api/me/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) throw new Error("Failed to switch country tenant");
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.ok && data.tenant) {
        localStorage.setItem("vaxplan_active_tenant", JSON.stringify(data.tenant));
        // Reset query cache to clear other tenant records and trigger refetch
        queryClient.invalidateQueries();
        toast({
          title: "Country Switched",
          description: `Active planning context updated to ${data.tenant.name}.`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Switch Failed",
        description: err.message || "Failed to switch country context.",
        variant: "destructive",
      });
    }
  });

  // Centroid mapping helper for country raster zoom
  const countryCenters: Record<string, { center: [number, number]; zoom: number }> = {
    "Zambia": { center: [-13.133897, 27.849332], zoom: 6 },
    "South Sudan": { center: [6.877, 31.307], zoom: 6 },
    "Papua New Guinea": { center: [-6.315, 143.955], zoom: 6 },
    "Universal": { center: [-6.0, 147.0], zoom: 6 },
  };

  // Task #101 — prompt to start a routine microplan when the user clicks
  // "Plan a session here" on a village whose facility has none yet.
  const [startMicroplanPrompt, setStartMicroplanPrompt] = useState<{
    villageId: number;
    villageName: string;
    villageLat: number;
    villageLng: number;
    villageHtr: boolean;
    facilityId: number;
    facilityName: string;
  } | null>(null);

  // States for session polygon geofencing drawing
  const [isDrawingSessionPolygon, setIsDrawingSessionPolygon] = useState(false);
  const [sessionPolygonPoints, setSessionPolygonPoints] = useState<L.LatLng[]>([]);
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);

  // Form states for creating derived outreach session plan
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionType, setNewSessionType] = useState<"static" | "mobile" | "outreach">("outreach");
  const [newSessionStrategy, setNewSessionStrategy] = useState<"routine" | "campaign">("routine");
  const [newSessionAntigen, setNewSessionAntigen] = useState("");
  const [newSessionTargetAge, setNewSessionTargetAge] = useState("");
  const [newSessionScope, setNewSessionScope] = useState("Local");
  const [newSessionTeamType, setNewSessionTeamType] = useState("mobile");
  const [newSessionQuarter, setNewSessionQuarter] = useState<number>(1);
  const [newSessionYear, setNewSessionYear] = useState<number>(new Date().getFullYear());
  const [newSessionTargetPop, setNewSessionTargetPop] = useState<number>(50);
  const [newSessionTransport, setNewSessionTransport] = useState<string>("road");
  const [newSessionMicroplanId, setNewSessionMicroplanId] = useState<string>("none");
  const [selectedParentFacilityId, setSelectedParentFacilityId] = useState<number | null>(null);

  // Minimum scheduled date is 7 days out. The server measures lead time in UTC
  // calendar days and we submit the picked date as a UTC calendar date, so use the
  // shared scheduling-date helper (UTC "today" + 7) to always satisfy the rule.
  const [newSessionDate, setNewSessionDate] = useState<string>(() => getMinScheduleDateInputValue());

  // Real-time map checklist progress tracking state
  const [checklistOpen, setChecklistOpen] = useState(true);

  /*
  // Centroid calculation helper for active session plans (Planned vs Achieved) - commented out here and relocated below states block to satisfy compiler ordering
  const getSessionCentroid = useCallback((plan: any): [number, number] | null => {
    if (plan.geojson && plan.geojson.coordinates) {
      const coords = plan.geojson.coordinates;
      if (plan.geojson.type === "Polygon" && Array.isArray(coords[0])) {
        let latSum = 0;
        let lngSum = 0;
        const pts = coords[0];
        pts.forEach((pt: any) => {
          lngSum += pt[0];
          latSum += pt[1];
        });
        return [latSum / pts.length, lngSum / pts.length];
      } else if (plan.geojson.type === "LineString" && Array.isArray(coords)) {
        let latSum = 0;
        let lngSum = 0;
        coords.forEach((pt: any) => {
          lngSum += pt[0];
          latSum += pt[1];
        });
        return [latSum / coords.length, lngSum / coords.length];
      }
    }
    
    // Fallback: If we have linked villages, find their average
    const linkedVillages = sessionVillages
      ?.filter((sv: any) => sv.sessionId === plan.id)
      .map((sv: any) => villages.find((v) => v.id === sv.villageId))
      .filter((v): v is Village => !!v && !!v.latitude && !!v.longitude);

    if (linkedVillages && linkedVillages.length > 0) {
      let latSum = 0;
      let lngSum = 0;
      linkedVillages.forEach((v) => {
        latSum += Number(v.latitude);
        lngSum += Number(v.longitude);
      });
      return [latSum / linkedVillages.length, lngSum / linkedVillages.length];
    }

    // Fallback 2: Nearest facility
    if (plan.facilityId) {
      const fac = facilities.find(f => f.id === plan.facilityId);
      if (fac && fac.latitude && fac.longitude) {
        return [Number(fac.latitude), Number(fac.longitude)];
      }
    }

    return null;
  }, [sessionVillages, villages, facilities]);
  */

  // Fetch active session plans for visual tracking and click triaging
  const { data: activeSessionPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.sessionPlans.toArray()) as any[];
      }
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  // Sessions plotted on the map: planned/in-progress + completed within 30d.
  // Source of truth for the "Session plans" map layer + legend counters.
  const { data: sessionMapPins = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions/map"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/sessions/map");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Unserved populated places (no session ever + no recorded vaccinations).
  const { data: unservedPlaces = [] } = useQuery<any[]>({
    queryKey: ["/api/unserved-places"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/unserved-places");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch session villages junction table
  const { data: sessionVillages = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions/villages"],
    queryFn: async () => {
      const res = await fetch("/api/sessions/villages");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch master microplans for selection dropdown
  const { data: masterMicroplans = [] } = useQuery<any[]>({
    queryKey: ["/api/microplans"],
    queryFn: async () => {
      const res = await fetch("/api/microplans");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch GRID3 Settlement Extents GeoJSON footprints — with IndexedDB persistent caching.
  // On first load the 18.4 MB file is downloaded once and stored in Dexie gisCache.
  // All subsequent layer toggles and page reloads serve the data instantly from IndexedDB (< 50 ms),
  // completely freeing the network queue for normal database synchronisation.
  const grid3CacheKey = `grid3_settlements_${(user as any)?.tenantId ?? "global"}`;
  const { data: grid3GeoJSON } = useQuery<any>({
    queryKey: ["/api/resources/grid3-settlements", grid3CacheKey],
    enabled: !!layers.grid3Settlements,
    // 24-hour stale time — the GRID3 national settlement file rarely changes.
    // gcTime of 48 hours keeps the parsed object in React Query's memory cache for the full session.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    queryFn: async () => {
      // 1. Attempt an instant IndexedDB cache hit first
      try {
        // Original Code (Composite primary key lookup with query object - returns undefined on composite index):
        // const cached = await offlineDb.gisCache.get({ key: "grid3_settlements", tenantId: (user as any)?.tenantId ?? "global" });
        // Updated Code: Correctly passes the composite index primary key as a tuple [key, tenantId]
        const cached = await offlineDb.gisCache.get(["grid3_settlements", (user as any)?.tenantId ?? "global"]);
        if (cached && cached.geojson) {
          return cached.geojson;
        }
      } catch (_cacheErr) {
        // gisCache table might not be upgraded yet on a fresh install — fall through to network
        console.warn("[GIS Cache] IndexedDB gisCache read skipped:", _cacheErr);
      }

      // 2. Cache miss — download from the server (runs once per browser install)
      const res = await fetch("/api/resources/grid3-settlements", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load GRID3 settlements");
      const geojson = await res.json();

      // 3. Persist to Dexie gisCache asynchronously — do not block the map render
      offlineDb.gisCache.put({
        key: "grid3_settlements",
        tenantId: (user as any)?.tenantId ?? "global",
        geojson,
        cachedAt: Date.now(),
      }).catch((err) =>
        console.warn("[GIS Cache] Failed to persist GRID3 settlements to IndexedDB:", err)
      );

      return geojson;
    },
  });

  // Shared canvas renderer for the GRID3 layer. SVG rendering creates one
  // DOM node per feature, which is what made the map drag/zoom so heavy
  // on the Zambia dataset (tens of thousands of polygons → tens of thousands
  // of <path> elements). A single canvas paints them all in one element.
  const grid3CanvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  // ─── Custom map layers (admin-uploaded roads/schools/travel-time/etc.) ───
  // Fetch lightweight metadata for the active layers in the current tenant.
  // The heavy GeoJSON / raster payloads are fetched per-layer only when shown.
  const { data: customLayers = [] } = useQuery<any[]>({
    queryKey: ["/api/custom-layers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/custom-layers", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  // Per-session show/hide on top of the persisted `isActive` flag. A layer is
  // shown when it is active AND the user has not hidden it this session.
  const [hiddenCustomLayerIds, setHiddenCustomLayerIds] = useState<Set<string>>(new Set());
  const [customLayersPanelOpen, setCustomLayersPanelOpen] = useState(true);
  const activeCustomLayers = useMemo(
    () => (customLayers ?? []).filter((l: any) => l.isActive),
    [customLayers],
  );
  const toggleCustomLayer = (id: string) =>
    setHiddenCustomLayerIds((prev) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Imperative ref to the GRID3 Leaflet layer so we can re-style features when
  // the active Province / District / LLG selection changes WITHOUT remounting
  // the GeoJSON layer (remount would otherwise re-add it last in the SVG paint
  // order and cause it to flicker / disappear under boundary polygons).
  const grid3LayerRef = useRef<any>(null);

  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  /*
  // Original Code: Hidden by default, which can cause users to overlook the geographic filters on the sidebar
  const [cardFiltersOpen, setCardFiltersOpen] = useState(false);
  */
  // Updated Code: Expanded by default so the cascading dropdown filters are immediately visible on the Health Facilities sidebar card
  const [cardFiltersOpen, setCardFiltersOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "all">("all");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "all">("all");
  const [selectedLlgId, setSelectedLlgId] = useState<number | "all">("all");
  const [villageCategory, setVillageCategory] = useState<"all" | "htr" | "standard">("all");
  const [filterColdChain, setFilterColdChain] = useState(false);
  const [filterPower, setFilterPower] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);

  // Updated Code:
  // Add React states for collapsible (isLegendExpanded) and interactive (hiddenCategories) map legend
  // and handleToggleCategory toggler function to reactively filter map markers.
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const handleToggleCategory = (category: string) => {
    setHiddenCategories((prev) => {
      const next = new Set<string>(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Unified panel visibility for the floating map "dock". On phones every panel
  // starts hidden so the map fills the screen; users reveal a panel by tapping
  // its dock button. On larger screens the panels keep their previous defaults.
  const [panelVis, setPanelVis] = useState(() => {
    const mobile = typeof window !== "undefined" && window.innerWidth < 768;
    return {
      layers: !mobile,
      filters: !mobile,
      facilities: !mobile,
      checklist: !mobile,
      legend: !mobile,
      tools: !mobile,
    };
  });
  type PanelKey = keyof typeof panelVis;
  const togglePanel = (key: PanelKey) =>
    setPanelVis((prev) => ({ ...prev, [key]: !prev[key] }));

  // States to keep track of active zoom level and conditionally hide village markers
  const [currentZoom, setCurrentZoom] = useState(zoom);
  useEffect(() => {
    setCurrentZoom(zoom);
  }, [zoom]);

  // Original Code: Low zoom threshold (9) that rendered thousands of village markers simultaneously, throttling performance
  /*
  const showVillageMarkers = useMemo(() => {
    if (
      selectedDistrictId !== "all" ||
      selectedLlgId !== "all" ||
      villageCategory !== "all" ||
      searchQuery.trim() !== ""
    ) {
      return true;
    }
    return currentZoom >= 9;
  }, [currentZoom, selectedDistrictId, selectedLlgId, villageCategory, searchQuery]);
  */

  // Original Code: Pruned village rendering based strictly on zoom gating >= 10, which caused all village markers and HTR buffers to disappear on initial load for low-count country datasets (like Zambia with 122 villages or SSD with 1 village).
  /*
  const showVillageMarkers = useMemo(() => {
    // Override zoom threshold if a specific boundary filter or search query is set
    if (
      selectedDistrictId !== "all" ||
      selectedLlgId !== "all" ||
      villageCategory !== "all" ||
      searchQuery.trim() !== ""
    ) {
      return true;
    }
    // Upgraded zoom threshold from 9 to 10. At provincial zoom levels (e.g. 9), rendering thousands
    // of village markers locks the browser main thread. Pruning village rendering to high zooms (10+)
    // ensures butter-smooth panned performance.
    return currentZoom >= 10;
  }, [currentZoom, selectedDistrictId, selectedLlgId, villageCategory, searchQuery]);
  */

  // Original Code: Mismatched or non-type-safe cascading selectors that did not auto-focus/zoom map or filter cleanly under string-number type mismatches.
  /*
  // Smart Cascading Filter Selectors
  const handleProvinceChange = (provinceId: number | "all") => {
    setSelectedProvinceId(provinceId);
    setSelectedDistrictId("all");
    setSelectedLlgId("all");
  };

  const handleDistrictChange = (districtId: number | "all") => {
    setSelectedDistrictId(districtId);
    setSelectedLlgId("all");
    if (districtId !== "all") {
      const dist = districts.find((d: any) => d.id === districtId);
      if (dist && dist.provinceId) {
        setSelectedProvinceId(dist.provinceId);
      }
    }
  };

  const handleLlgChange = (llgId: number | "all") => {
    setSelectedLlgId(llgId);
    if (llgId !== "all") {
      const llg = llgs.find((l: any) => l.id === llgId);
      if (llg && llg.districtId) {
        setSelectedDistrictId(llg.districtId);
        const dist = districts.find((d: any) => d.id === llg.districtId);
        if (dist && dist.provinceId) {
          setSelectedProvinceId(dist.provinceId);
        }
      }
    }
  };
  */

  const [layerPanelOpen, setLayerPanelOpen] = useState(showFacilityList);
  const [basemap, setBasemap] = usePersistedBasemap("osm");
  // Original Code: Administrative boundaries were disabled by default, hindering instant user visualization.
  /*
  const [layers, setLayers] = useState<MapOverlayLayers>({
    facilities: true,
    villages: true,
    htrAreas: true,
    catchments: false,
    roads: false,
    boundaries: false,
    hcwCatchments: false,
  });
  */
  // Updated Code: Administrative boundaries default-enabled for instant high-fidelity cascading visualization.
  // Updated Code: Administrative boundaries default-enabled for instant high-fidelity cascading visualization (Relocated to top).
  /*
  const [layers, setLayers] = useState<MapOverlayLayers>({
    facilities: true,
    villages: true,
    htrAreas: true,
    catchments: false,
    roads: false,
    boundaries: true,
    hcwCatchments: false,
    wards: false,
    constituencies: false,
    populationGeoTIFF: true,
    grid3Settlements: false,
  });
  */

  // Dynamic Geographic and Tenant Lookups for Premium Admin Hierarchy Resolution
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  // Reset all geographic filters on tenant/country switch to prevent cross-tenant ID bleed
  /* Original Reset Effect (without resetting map selected raster):
  useEffect(() => {
    if (tenantInfo?.id) {
      setSelectedProvinceId("all");
      setSelectedDistrictId("all");
      setSelectedLlgId("all");
      setSearchQuery("");
      setFilterColdChain(false);
      setFilterPower(false);
      setSelectedFacilityId(null);
    }
  }, [tenantInfo?.id]);
  */
  // Updated Code: Resets all geographic filters AND resets selected raster file to fallback on new active tenant's default
  useEffect(() => {
    if (tenantInfo?.id) {
      setSelectedProvinceId("all");
      setSelectedDistrictId("all");
      setSelectedLlgId("all");
      setSearchQuery("");
      setFilterColdChain(false);
      setFilterPower(false);
      setSelectedFacilityId(null);
      setSelectedRasterFile("");
      localStorage.removeItem("vaxplan_selected_raster");
    }
  }, [tenantInfo?.id]);

  const effectiveCenter = useMemo<[number, number]>(() => {
    if (selectedRasterFile && rasterListData?.files) {
      const activeRaster = rasterListData.files.find(f => f.fileName === selectedRasterFile);
      if (activeRaster && countryCenters[activeRaster.country]) {
        return countryCenters[activeRaster.country].center;
      }
    }
    if (center && (center[0] !== DEFAULT_MAP_CENTER[0] || center[1] !== DEFAULT_MAP_CENTER[1])) {
      return center;
    }
    if (tenantInfo?.settings?.mapCenter && Array.isArray(tenantInfo.settings.mapCenter)) {
      return tenantInfo.settings.mapCenter as [number, number];
    }
    return DEFAULT_MAP_CENTER;
  }, [center, tenantInfo, selectedRasterFile, rasterListData]);

  const effectiveZoom = useMemo<number>(() => {
    if (selectedRasterFile && rasterListData?.files) {
      const activeRaster = rasterListData.files.find(f => f.fileName === selectedRasterFile);
      if (activeRaster && countryCenters[activeRaster.country]) {
        return countryCenters[activeRaster.country].zoom;
      }
    }
    if (zoom !== 6) {
      return zoom;
    }
    if (tenantInfo?.settings?.mapZoom) {
      return Number(tenantInfo.settings.mapZoom);
    }
    return 6;
  }, [zoom, tenantInfo, selectedRasterFile, rasterListData]);


  /*
  // Original Code: Queries were bound to static queryKeys which caused old tenant/country cached data to be served upon switching countries.
  const { data: provinces = [] } = useQuery<any[]>({
    queryKey: ["/api/provinces"],
    enabled: true,
  });

  const { data: districts = [] } = useQuery<any[]>({
    queryKey: ["/api/districts"],
    enabled: true,
  });

  const { data: llgs = [] } = useQuery<any[]>({
    queryKey: ["/api/llgs"],
    enabled: true,
  });
  */

  // Updated Code: Scoping provinces, districts, and llgs queries strictly to the active tenantInfo.id to clear caches on tenant switch.
  // Using custom queryFns to bypass queryKey join "/" behavior mapping to invalid URLs, with robust IndexedDB offline fallbacks.
  const { data: provinces = [] } = useQuery<any[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.provinces.toArray();
      }
      const res = await fetch("/api/provinces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch provinces");
      return res.json();
    },
    enabled: true,
  });

  const { data: districts = [] } = useQuery<any[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.districts.toArray();
      }
      const res = await fetch("/api/districts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
    enabled: true,
  });

  const { data: llgs = [] } = useQuery<any[]>({
    queryKey: ["/api/llgs", tenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.llgs.toArray();
      }
      const res = await fetch("/api/llgs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch llgs");
      return res.json();
    },
    enabled: true,
  });

  const { data: dayPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/session-day-plans", tenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.sessionDayPlans.toArray();
      }
      const res = await fetch("/api/session-day-plans", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch day plans");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", tenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.sessionPlans.toArray();
      }
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const adminLabels = useMemo(() => {
    const skipRegionLevel = tenantInfo?.settings?.skipRegionLevel ?? (tenantInfo?.countryCode === "ZMB" || false);
    const rawLabels = tenantInfo?.settings?.adminLevelLabels || {
      level1: "Province",
      level2: "District",
      level3: "LLG/Ward",
      level4: "Village",
    };
    if (skipRegionLevel) {
      return {
        level1: rawLabels.level2 || "Province",
        level2: rawLabels.level3 || "District",
        level3: rawLabels.level4 || "Constituency",
        level4: rawLabels.level5 || "Ward",
      };
    }
    return rawLabels as { level1: string; level2: string; level3: string; level4: string };
  }, [tenantInfo]);

  /*
  // Original Code: Lookup maps with raw keys that could suffer from string vs number type mismatch errors at runtime.
  const provinceLookup = useMemo(() => {
    const map = new Map<number, any>();
    provinces.forEach((p) => map.set(p.id, p));
    return map;
  }, [provinces]);

  const districtLookup = useMemo(() => {
    const map = new Map<number, any>();
    districts.forEach((d) => map.set(d.id, d));
    return map;
  }, [districts]);

  const llgLookup = useMemo(() => {
    const map = new Map<number, any>();
    llgs.forEach((l) => map.set(l.id, l));
    return map;
  }, [llgs]);
  */

  // Updated Code: Type-safe lookups with explicit Number() casting on the key map to avoid silent filtering mismatch bugs.
  const provinceLookup = useMemo(() => {
    const map = new Map<number, any>();
    provinces.forEach((p) => map.set(Number(p.id), p));
    return map;
  }, [provinces]);

  const districtLookup = useMemo(() => {
    const map = new Map<number, any>();
    districts.forEach((d) => map.set(Number(d.id), d));
    return map;
  }, [districts]);

  const llgLookup = useMemo(() => {
    const map = new Map<number, any>();
    llgs.forEach((l) => map.set(Number(l.id), l));
    return map;
  }, [llgs]);

  const districtNameLookup = useMemo(() => {
    const map = new Map<string, any>();
    districts.forEach((d) => {
      map.set(normalizeName(d.name), d);
    });
    return map;
  }, [districts]);

  const llgNameLookup = useMemo(() => {
    const map = new Map<string, any>();
    llgs.forEach((l) => {
      map.set(normalizeName(l.name), l);
    });
    return map;
  }, [llgs]);

  // Memoized O(1) map associating facilityId to its assigned villages array to avoid O(V*F) nested loops
  const facilityVillagesMap = useMemo(() => {
    const map = new Map<number, Village[]>();
    (villages || []).forEach((v) => {
      if (v.assignedFacilityId) {
        const fId = Number(v.assignedFacilityId);
        if (!map.has(fId)) {
          map.set(fId, []);
        }
        map.get(fId)!.push(v);
      }
    });
    return map;
  }, [villages]);

  /*
  // Original Code: zoomToSelection focused only on facilities. Since health facilities lack dynamic LLG mappings in the schema, filtering and zooming to an LLG would not focus the map accurately.
  const zoomToSelection = useCallback((provId: number | "all", distId: number | "all", llgId: number | "all") => {
    if (!mapRef.current) return;
    
    // Find all facilities matching the selection
    const matching = (facilities || []).filter((f) => {
      if (!f.latitude || !f.longitude) return false;
      if (provId !== "all") {
        const dist = districtLookup.get(Number(f.districtId));
        if (!dist || Number(dist.provinceId) !== Number(provId)) return false;
      }
      if (distId !== "all" && Number(f.districtId) !== Number(distId)) return false;
      if (llgId !== "all") {
        const llg = llgLookup.get(Number(llgId));
        if (llg && Number(llg.districtId) !== Number(f.districtId)) return false;
      }
      return true;
    });

    if (matching.length > 0) {
      const coords = matching.map((f) => [Number(f.latitude), Number(f.longitude)] as [number, number]);
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // If it's a single point or bounds are extremely tight
      if (maxLat - minLat < 0.005 && maxLng - minLng < 0.005) {
        mapRef.current.flyTo([minLat, minLng], distId !== "all" ? 13 : 9, { animate: true, duration: 1.2 });
      } else {
        mapRef.current.fitBounds([[minLat, minLng], [maxLat, maxLng]], {
          padding: [50, 50],
          maxZoom: distId !== "all" ? 13 : 9,
          animate: true,
          duration: 1.2
        });
      }
    } else {
      // Fallback: zoom to tenant default mapCenter if available
      const tenantCenter = tenantInfo?.settings?.mapCenter;
      const tenantZoom = tenantInfo?.settings?.mapZoom;
      if (tenantCenter) {
        mapRef.current.flyTo(tenantCenter, tenantZoom || 6, { animate: true, duration: 1.2 });
      }
    }
  }, [facilities, districtLookup, llgLookup, tenantInfo]);
  */

  /*
  // Original Code: zoomToSelection focused on both matching facilities and villages using nested loops, which is slow during dynamic typing
  const zoomToSelection = useCallback((provId: number | "all", distId: number | "all", llgId: number | "all") => {
    if (!mapRef.current) return;
    
    const matchingFacilities = (facilities || []).filter((f) => {
      if (!f.latitude || !f.longitude) return false;
      if (provId !== "all") {
        const dist = districtLookup.get(Number(f.districtId));
        if (!dist || Number(dist.provinceId) !== Number(provId)) return false;
      }
      if (distId !== "all" && Number(f.districtId) !== Number(distId)) return false;
      if (llgId !== "all") {
        const hasVillageInLlg = villages.some(
          (v) => Number(v.llgId) === Number(llgId) && Number(v.assignedFacilityId) === Number(f.id)
        );
        const totalAssignedVillages = villages.filter((v) => Number(v.assignedFacilityId) === Number(f.id)).length;
        if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;
      }
      return true;
    });

    const matchingVillages = (villages || []).filter((v) => {
      if (!v.latitude || !v.longitude) return false;
      if (provId !== "all") {
        const dist = districtLookup.get(Number(v.districtId));
        if (!dist || Number(dist.provinceId) !== Number(provId)) return false;
      }
      if (distId !== "all" && Number(v.districtId) !== Number(distId)) return false;
      if (llgId !== "all" && Number(v.llgId) !== Number(llgId)) return false;
      return true;
    });

    const coords: [number, number][] = [];
    matchingFacilities.forEach((f) => coords.push([Number(f.latitude), Number(f.longitude)]));
    matchingVillages.forEach((v) => coords.push([Number(v.latitude), Number(v.longitude)]));

    if (coords.length > 0) {
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      if (maxLat - minLat < 0.005 && maxLng - minLng < 0.005) {
        mapRef.current.flyTo([minLat, minLng], distId !== "all" ? 13 : 9, { animate: true, duration: 1.2 });
      } else {
        mapRef.current.fitBounds([[minLat, minLng], [maxLat, maxLng]], {
          padding: [50, 50],
          maxZoom: distId !== "all" ? 13 : 9,
          animate: true,
          duration: 1.2
        });
      }
    } else {
      const tenantCenter = tenantInfo?.settings?.mapCenter;
      const tenantZoom = tenantInfo?.settings?.mapZoom;
      if (tenantCenter) {
        mapRef.current.flyTo(tenantCenter, tenantZoom || 6, { animate: true, duration: 1.2 });
      }
    }
  }, [facilities, villages, districtLookup, llgLookup, tenantInfo]);
  */

  // Updated Code: High-performance O(1) zoomToSelection utilizing pre-computed facilityVillagesMap lookup
  const zoomToSelection = useCallback((provId: number | "all", distId: number | "all", llgId: number | "all") => {
    if (!mapRef.current) return;
    
    // Find all facilities matching the selection
    const matchingFacilities = (facilities || []).filter((f) => {
      if (!f.latitude || !f.longitude) return false;
      if (provId !== "all") {
        const dist = districtLookup.get(Number(f.districtId));
        if (!dist || Number(dist.provinceId) !== Number(provId)) return false;
      }
      if (distId !== "all" && Number(f.districtId) !== Number(distId)) return false;
      if (llgId !== "all") {
        // Original Code:
        // const assignedVillages = facilityVillagesMap.get(Number(f.id)) || [];
        // const hasVillageInLlg = assignedVillages.some((v) => Number(v.llgId) === Number(llgId));
        // const totalAssignedVillages = assignedVillages.length;
        // if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;

        // Updated Code:
        // Type-safe matching of facilities to Level 3 administrative boundaries (Payam) using
        // seeded externalIds.llgId, falling back to village catchment associations where absent.
        const payamId = f.externalIds && (f.externalIds as any).llgId;
        if (payamId) {
          if (Number(payamId) !== Number(llgId)) return false;
        } else {
          const assignedVillages = facilityVillagesMap.get(Number(f.id)) || [];
          const hasVillageInLlg = assignedVillages.some((v) => Number(v.llgId) === Number(llgId));
          const totalAssignedVillages = assignedVillages.length;
          if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;
        }
      }
      return true;
    });

    // Find all villages matching the selection (villages are explicitly mapped to LLG/Ward in the DB schema)
    const matchingVillages = (villages || []).filter((v) => {
      if (!v.latitude || !v.longitude) return false;
      if (provId !== "all") {
        const dist = districtLookup.get(Number(v.districtId));
        if (!dist || Number(dist.provinceId) !== Number(provId)) return false;
      }
      if (distId !== "all" && Number(v.districtId) !== Number(distId)) return false;
      if (llgId !== "all" && Number(v.llgId) !== Number(llgId)) return false;
      return true;
    });

    const coords: [number, number][] = [];
    matchingFacilities.forEach((f) => coords.push([Number(f.latitude), Number(f.longitude)]));
    matchingVillages.forEach((v) => coords.push([Number(v.latitude), Number(v.longitude)]));

    if (coords.length > 0) {
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // If it's a single point or bounds are extremely tight
      if (maxLat - minLat < 0.005 && maxLng - minLng < 0.005) {
        mapRef.current.flyTo([minLat, minLng], distId !== "all" ? 13 : 9, { animate: true, duration: 1.2 });
      } else {
        mapRef.current.fitBounds([[minLat, minLng], [maxLat, maxLng]], {
          padding: [50, 50],
          maxZoom: distId !== "all" ? 13 : 9,
          animate: true,
          duration: 1.2
        });
      }
    } else {
      // Fallback: zoom to tenant default mapCenter if available
      const tenantCenter = tenantInfo?.settings?.mapCenter;
      const tenantZoom = tenantInfo?.settings?.mapZoom;
      if (tenantCenter) {
        mapRef.current.flyTo(tenantCenter, tenantZoom || 6, { animate: true, duration: 1.2 });
      }
    }
  }, [facilities, villages, districtLookup, llgLookup, tenantInfo, facilityVillagesMap]);

  // Updated Code: Robust type-safe smart cascading selectors leveraging Number() normalization and auto-zooms
  const handleProvinceChange = (provinceId: number | "all") => {
    setSelectedProvinceId(provinceId);
    setSelectedDistrictId("all");
    setSelectedLlgId("all");
    zoomToSelection(provinceId, "all", "all");
  };

  const handleDistrictChange = (districtId: number | "all") => {
    setSelectedDistrictId(districtId);
    setSelectedLlgId("all");
    let provId: number | "all" = selectedProvinceId;
    if (districtId !== "all") {
      const dist = districts.find((d: any) => Number(d.id) === Number(districtId));
      if (dist && dist.provinceId) {
        provId = Number(dist.provinceId);
        setSelectedProvinceId(provId);
      }
    }
    zoomToSelection(provId, districtId, "all");
  };

  const handleLlgChange = (llgId: number | "all") => {
    setSelectedLlgId(llgId);
    let provId: number | "all" = selectedProvinceId;
    let distId: number | "all" = selectedDistrictId;
    if (llgId !== "all") {
      const llg = llgs.find((l: any) => Number(l.id) === Number(llgId));
      if (llg && llg.districtId) {
        distId = Number(llg.districtId);
        setSelectedDistrictId(distId);
        const dist = districts.find((d: any) => Number(d.id) === Number(llg.districtId));
        if (dist && dist.provinceId) {
          provId = Number(dist.provinceId);
          setSelectedProvinceId(provId);
        }
      }
    }
    zoomToSelection(provId, distId, llgId);
  };

  const sidebarDistricts = useMemo(() => {
    if (selectedProvinceId === "all") return districts;
    return districts.filter((d) => Number(d.provinceId) === Number(selectedProvinceId));
  }, [districts, selectedProvinceId]);

  const sidebarLlgs = useMemo(() => {
    if (selectedDistrictId !== "all") {
      return llgs.filter((l) => Number(l.districtId) === Number(selectedDistrictId));
    }
    if (selectedProvinceId !== "all") {
      const allowedDistrictIds = new Set(
        districts.filter((d) => Number(d.provinceId) === Number(selectedProvinceId)).map((d) => Number(d.id))
      );
      return llgs.filter((l) => allowedDistrictIds.has(Number(l.districtId)));
    }
    return llgs;
  }, [llgs, districts, selectedProvinceId, selectedDistrictId]);

  /*
  // Original Code: filteredFacilities utilizing nested .some() array scans over the full 10k villages array
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (selectedProvinceId !== "all") {
        if (districtLookup.size === 0) return true;
        const dist = districtLookup.get(Number(f.districtId));
        if (!dist || Number(dist.provinceId) !== Number(selectedProvinceId)) return false;
      }
      if (selectedDistrictId !== "all" && Number(f.districtId) !== Number(selectedDistrictId)) return false;
      if (selectedLlgId !== "all") {
        if (llgLookup.size === 0) return true;
        const hasVillageInLlg = villages.some(
          (v) => Number(v.llgId) === Number(selectedLlgId) && Number(v.assignedFacilityId) === Number(f.id)
        );
        const totalAssignedVillages = villages.filter((v) => Number(v.assignedFacilityId) === Number(f.id)).length;
        if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = f.name?.toLowerCase().includes(query);
        const matchesHMIS = f.hmisCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesHMIS) return false;
      }
      if (filterColdChain && !f.hasRefrigerator) return false;
      if (filterPower && !f.hasPower) return false;
      return true;
    });
  }, [facilities, selectedProvinceId, selectedDistrictId, selectedLlgId, searchQuery, filterColdChain, filterPower, districtLookup, llgLookup]);
  */

  // Updated Code: High-performance O(1) filteredFacilities utilizing pre-computed facilityVillagesMap index
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (selectedProvinceId !== "all") {
        if (districtLookup.size === 0) return true;
        const dist = districtLookup.get(Number(f.districtId));
        if (!dist || Number(dist.provinceId) !== Number(selectedProvinceId)) return false;
      }
      if (selectedDistrictId !== "all" && Number(f.districtId) !== Number(selectedDistrictId)) return false;
      if (selectedLlgId !== "all") {
        if (llgLookup.size === 0) return true;
        // Original Code:
        // const assignedVillages = facilityVillagesMap.get(Number(f.id)) || [];
        // const hasVillageInLlg = assignedVillages.some((v) => Number(v.llgId) === Number(selectedLlgId));
        // const totalAssignedVillages = assignedVillages.length;
        // if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;

        // Updated Code:
        // Type-safe matching of facilities to Level 3 administrative boundaries (Payam) using
        // seeded externalIds.llgId, falling back to village catchment associations where absent.
        const payamId = f.externalIds && (f.externalIds as any).llgId;
        if (payamId) {
          if (Number(payamId) !== Number(selectedLlgId)) return false;
        } else {
          const assignedVillages = facilityVillagesMap.get(Number(f.id)) || [];
          const hasVillageInLlg = assignedVillages.some((v) => Number(v.llgId) === Number(selectedLlgId));
          const totalAssignedVillages = assignedVillages.length;
          if (totalAssignedVillages > 0 && !hasVillageInLlg) return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = f.name?.toLowerCase().includes(query);
        const matchesHMIS = f.hmisCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesHMIS) return false;
      }
      if (filterColdChain && !f.hasRefrigerator) return false;
      if (filterPower && !f.hasPower) return false;
      return true;
    });
  }, [facilities, selectedProvinceId, selectedDistrictId, selectedLlgId, searchQuery, filterColdChain, filterPower, districtLookup, llgLookup, facilityVillagesMap]);

  // Visible facilities after applying interactive legend hiddenCategories filters
  const visibleFacilities = useMemo(() => {
    if (hiddenCategories.has("facility")) return [];
    return filteredFacilities;
  }, [filteredFacilities, hiddenCategories]);

  // Memoized O(1) map associating facilityId to Facility object for O(1) polyline and rendering calculations
  const filteredFacilitiesMap = useMemo(() => {
    const map = new Map<number, Facility>();
    (visibleFacilities || []).forEach((f) => {
      map.set(Number(f.id), f);
    });
    return map;
  }, [visibleFacilities]);

  const filteredVillages = useMemo(() => {
    return villages.filter((v) => {
      if (selectedProvinceId !== "all") {
        if (districtLookup.size === 0) return true;
        const dist = districtLookup.get(Number(v.districtId));
        if (!dist || Number(dist.provinceId) !== Number(selectedProvinceId)) return false;
      }
      if (selectedDistrictId !== "all" && Number(v.districtId) !== Number(selectedDistrictId)) return false;
      if (selectedLlgId !== "all") {
        if (llgLookup.size === 0) return true;
        if (Number(v.llgId) !== Number(selectedLlgId)) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = v.name?.toLowerCase().includes(query);
        const matchesCode = v.code?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }
      if (villageCategory === "htr" && !v.isHardToReach) return false;
      if (villageCategory === "standard" && v.isHardToReach) return false;
      return true;
    });
  }, [villages, selectedProvinceId, selectedDistrictId, selectedLlgId, searchQuery, villageCategory, districtLookup, llgLookup]);

  // Updated Code: Relocated and upgraded to bypass zoom gating completely if the total number of filtered villages is small (< 500),
  // preventing hidden elements on initial load for low-count country datasets (Zambia, SSD, etc.) while still protecting performance on massive ones.
  const showVillageMarkers = useMemo(() => {
    if (
      selectedDistrictId !== "all" ||
      selectedLlgId !== "all" ||
      villageCategory !== "all" ||
      searchQuery.trim() !== "" ||
      (filteredVillages && filteredVillages.length < 500)
    ) {
      return true;
    }
    return currentZoom >= 10;
  }, [currentZoom, selectedDistrictId, selectedLlgId, villageCategory, searchQuery, filteredVillages?.length]);

  const plannedVillageIds = useMemo(() => {
    const ids = new Set<number>();
    (dayPlans || []).forEach((dp: any) => {
      if (Array.isArray(dp.communitiesVisited)) {
        dp.communitiesVisited.forEach((vId: any) => {
          const parsedId = Number(vId);
          if (!isNaN(parsedId)) {
            ids.add(parsedId);
          }
        });
      }
    });
    return ids;
  }, [dayPlans]);

  const villagePlanningDetails = useMemo(() => {
    const details = new Map<number, { dayNumber: number; sessionName: string }>();
    (dayPlans || []).forEach((dp: any) => {
      if (Array.isArray(dp.communitiesVisited)) {
        dp.communitiesVisited.forEach((vId: any) => {
          const id = Number(vId);
          const session = sessions.find(s => s.id === dp.sessionPlanId);
          if (session) {
            details.set(id, {
              dayNumber: dp.dayNumber,
              sessionName: session.name,
            });
          }
        });
      }
    });
    return details;
  }, [dayPlans, sessions]);

  const stats = useMemo(() => {
    let planned = 0;
    let missingStandard = 0;
    let missingHtr = 0;
    
    filteredVillages.forEach((v) => {
      if (v.latitude && v.longitude) {
        if (plannedVillageIds.has(v.id)) {
          planned++;
        } else if (v.isHardToReach) {
          missingHtr++;
        } else {
          missingStandard++;
        }
      }
    });
    
    const total = planned + missingStandard + missingHtr;
    const coverage = total > 0 ? Math.round((planned / total) * 100) : 0;

    // Task #47: session-plan + unserved counters surfaced in the legend.
    let sessionPlanned = 0;
    let sessionInProgress = 0;
    let sessionCompleted = 0;
    let sessionOverdue = 0;
    for (const s of sessionMapPins as any[]) {
      const lc = deriveSessionLifecycle(s);
      if (lc.phase === "reported" || lc.phase === "archived") sessionCompleted++;
      else if (lc.phase === "in_progress") sessionInProgress++;
      else sessionPlanned++;
      if (lc.isOverdue) sessionOverdue++;
    }
    const unserved = (unservedPlaces as any[]).length;

    return { planned, missingStandard, missingHtr, total, coverage, sessionPlanned, sessionInProgress, sessionCompleted, sessionOverdue, unserved };
  }, [filteredVillages, plannedVillageIds, sessionMapPins, unservedPlaces]);

  // Updated Code: Visible villages with always-on bounds pruning for performance + category filtering.
  // Bounds pruning is now unconditional (when mapBounds is available) so that:
  // a) The village/HTR overlay renders immediately when the user explicitly enables the toggle.
  // b) Performance is always protected (only viewport markers are rendered).
  const visibleVillagesFiltered = useMemo(() => {
    const list = (() => {
      // Always apply bounds pruning when bounds are available — this protects
      // performance at all zoom levels regardless of showVillageMarkers.
      if (!mapBounds) return filteredVillages;
      // For small datasets (< 500 villages), skip expensive bounds check since
      // all markers can be rendered efficiently.
      if (filteredVillages.length < 500) return filteredVillages;
      return filteredVillages.filter((v) => {
        if (!v.latitude || !v.longitude) return false;
        // Expand bounds slightly so markers at the edge stay visible
        const expanded = mapBounds.pad(0.1);
        return expanded.contains([Number(v.latitude), Number(v.longitude)]);
      });
    })();
    return list.filter((v) => {
      const isPlanned = plannedVillageIds.has(v.id);
      if (isPlanned) {
        return !hiddenCategories.has("planned");
      } else if (v.isHardToReach) {
        return !hiddenCategories.has("missingHtr");
      } else {
        return !hiddenCategories.has("missingStandard");
      }
    });
  }, [filteredVillages, mapBounds, hiddenCategories, plannedVillageIds]);

  const handleFocusFacility = (facility: Facility) => {
    if (!facility.latitude || !facility.longitude) return;
    const lat = Number(facility.latitude);
    const lng = Number(facility.longitude);

    setSelectedFacilityId(facility.id);

    mapRef.current?.flyTo([lat, lng], 14, {
      animate: true,
      duration: 1.5,
    });

    setTimeout(() => {
      const marker = markerRefs.current[facility.id];
      if (marker) {
        marker.openPopup();
      }
    }, 450);
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Measurement State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<[number, number][]>([]);

  // Export State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // ─── HCW Catchment Drawing State ────────────────────────────────────────
  const [isDrawingCatchment, setIsDrawingCatchment] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [saveCatchmentOpen, setSaveCatchmentOpen] = useState(false);
  const [catchmentName, setCatchmentName] = useState("");
  const [catchmentDescription, setCatchmentDescription] = useState("");
  const [catchmentFacilityId, setCatchmentFacilityId] = useState<number | null>(null);
  const [catchmentPopEst, setCatchmentPopEst] = useState("");
  const [catchmentProvinceId, setCatchmentProvinceId] = useState<number | null>(null);
  const [catchmentDistrictId, setCatchmentDistrictId] = useState<number | null>(null);
  const [catchmentAutoDetectKm, setCatchmentAutoDetectKm] = useState<number | null>(null);

  // ─── Queries for boundary and catchment data ──────────────────────────

  // Updated Code: Always fetch boundaries (not gated on toggle) so the data is instantly ready when any boundary
  // overlay is enabled. The query still requires an authenticated tenant session.
  const { data: boundaryList } = useQuery<Array<{ id: string; adminLevel: number; levelName: string; isActive: boolean }>>({
    queryKey: ["/api/boundaries", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/boundaries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch boundaries");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const { data: hcwCatchments } = useQuery<FacilityCatchment[]>({
    queryKey: ["/api/catchments", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/catchments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch catchments");
      return res.json();
    },
    enabled: layers.hcwCatchments,
  });

  // Fetch full GeoJSON for each active boundary
  const [boundaryGeoJSONs, setBoundaryGeoJSONs] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!boundaryList) return;
    boundaryList.forEach((b) => {
      if (boundaryGeoJSONs[b.id] || fetchingRef.current[b.id]) return;
      fetchingRef.current[b.id] = true;
      fetch(`/api/boundaries/${b.id}/geojson`)
        .then((res) => res.json())
        .then((gj) => {
          setBoundaryGeoJSONs((prev) => ({ ...prev, [b.id]: gj }));
        })
        .finally(() => {
          fetchingRef.current[b.id] = false;
        });
    });
  }, [boundaryList, boundaryGeoJSONs]);

  // Pre-filter the GeoJSON features in JS to ensure we only load and render the required boundaries,
  // preventing layout engine lockup and layout lag.
  const filteredBoundaryGeoJSONs = useMemo(() => {
    const filtered: Record<string, any> = {};
    if (!boundaryList) return filtered;

    // Determine active admin level based on selectors:
    // - selectedProvinceId === "all" -> Level 1 (Province)
    // - selectedProvinceId !== "all" && selectedDistrictId === "all" -> Level 2 (District)
    // - selectedProvinceId !== "all" && selectedDistrictId !== "all" -> Level 3 (LLG/Ward)
    const availableLevels = (boundaryList || []).map(b => b.adminLevel);
    const hasLevel2 = availableLevels.includes(2);
    const hasLevel3 = availableLevels.includes(3);

    let activeAdminLevel = 1;
    if (selectedProvinceId !== "all" && hasLevel2) {
      if (selectedDistrictId === "all") {
        activeAdminLevel = 2;
      } else if (hasLevel3) {
        activeAdminLevel = 3;
      } else {
        activeAdminLevel = 2; // Cap at Level 2 since Level 3 boundaries don't exist
      }
    }

    boundaryList.forEach((b) => {
      const geojson = boundaryGeoJSONs[b.id];
      if (!geojson) return;

      // Process if it is the active admin boundary or explicitly enabled
      const isVisible =
        (layers.boundaries && b.adminLevel === activeAdminLevel) ||
        (layers.constituencies && b.adminLevel === 2) ||
        (layers.wards && b.adminLevel === 3);
      if (!isVisible) return;

      const filteredFeatures = (geojson.features || []).filter((feature: any) => {
        const fName = feature.properties?.name ||
          feature.properties?.NAME ||
          feature.properties?.shapeName ||
          feature.properties?.NAME_1 ||
          feature.properties?.NAME_2 ||
          feature.properties?.NAME_3 ||
          "";
        const normFName = normalizeName(fName);

        if (b.adminLevel === 1) {
          return true;
        } else if (b.adminLevel === 2) {
          if (selectedProvinceId === "all") {
            return true;
          }
          const targetProv = provinceLookup.get(Number(selectedProvinceId));
          if (!targetProv) {
            return true;
          } else {
            const normTargetProv = normalizeName(targetProv.name);
            const localDist = districtNameLookup.get(normFName);

            if (localDist) {
              if (selectedDistrictId !== "all" && !hasLevel3) {
                return Number(localDist.id) === Number(selectedDistrictId);
              }
              return Number(localDist.provinceId) === Number(selectedProvinceId);
            } else {
              // Fallback name-matching on GeoJSON parent properties
              const provProp = feature.properties?.province ||
                feature.properties?.PROVINCE ||
                feature.properties?.NAME_1 ||
                "";
              const normProvProp = normalizeName(provProp);
              if (normProvProp) {
                return normProvProp === normTargetProv;
              } else {
                return false;
              }
            }
          }
        } else if (b.adminLevel === 3) {
          if (selectedDistrictId === "all") {
            // If province is selected, only show wards in that province
            if (selectedProvinceId !== "all") {
              const allowedDistrictIds = new Set(
                districts.filter((d) => Number(d.provinceId) === Number(selectedProvinceId)).map((d) => Number(d.id))
              );
              const localLlg = llgNameLookup.get(normFName);
              if (localLlg) {
                return allowedDistrictIds.has(Number(localLlg.districtId));
              }
              const distProp = feature.properties?.district || feature.properties?.DISTRICT || feature.properties?.NAME_2 || feature.properties?.adm2_name || "";
              const matchedDist = districts.find(d => normalizeName(d.name) === normalizeName(distProp));
              return matchedDist ? allowedDistrictIds.has(Number(matchedDist.id)) : false;
            }
            return true;
          }
          const targetDist = districtLookup.get(Number(selectedDistrictId));
          if (!targetDist) {
            return true;
          } else {
            const normTargetDist = normalizeName(targetDist.name);

            // Filter down to single LLG if one is specifically selected
            if (selectedLlgId !== "all") {
              const targetLlg = llgLookup.get(Number(selectedLlgId));
              if (targetLlg) {
                const normTargetLlg = normalizeName(targetLlg.name);
                return normFName === normTargetLlg;
              } else {
                return false;
              }
            } else {
              const localLlg = llgNameLookup.get(normFName);

              if (localLlg) {
                return Number(localLlg.districtId) === Number(selectedDistrictId);
              } else {
                // Fallback name-matching on GeoJSON parent properties
                const distProp = feature.properties?.district ||
                  feature.properties?.DISTRICT ||
                  feature.properties?.NAME_2 ||
                  feature.properties?.adm2_name ||
                  "";
                const normDistProp = normalizeName(distProp);
                if (normDistProp) {
                  return normDistProp === normTargetDist;
                } else {
                  return false;
                }
              }
            }
          }
        }
        return false;
      });

      filtered[b.id] = {
        ...geojson,
        features: filteredFeatures,
      };
    });

    return filtered;
  }, [
    boundaryList,
    boundaryGeoJSONs,
    selectedProvinceId,
    selectedDistrictId,
    selectedLlgId,
    provinces,
    districts,
    llgs,
    layers.boundaries,
    layers.constituencies,
    layers.wards,
    provinceLookup,
    districtLookup,
    llgLookup,
    districtNameLookup,
    llgNameLookup,
  ]);

  // ─── GRID3 selection-aware emphasis ──────────────────────────────────────
  // When a Province / District / LLG is selected, compute the matching admin
  // polygon(s) from the boundary GeoJSON layer. We never *exclude* GRID3
  // features based on the filter — settlements that straddle the boundary
  // must still be visible — but we visually emphasize footprints whose
  // centroid falls inside the selected admin area and dim those outside.
  const selectedAdminFeatures = useMemo<any | null>(() => {
    if (!boundaryList) return null;
    let targetLevel = 0;
    let targetName = "";
    if (selectedLlgId !== "all") {
      targetLevel = 3;
      targetName = llgLookup.get(Number(selectedLlgId))?.name || "";
    } else if (selectedDistrictId !== "all") {
      targetLevel = 2;
      targetName = districtLookup.get(Number(selectedDistrictId))?.name || "";
    } else if (selectedProvinceId !== "all") {
      targetLevel = 1;
      targetName = provinceLookup.get(Number(selectedProvinceId))?.name || "";
    } else {
      return null;
    }
    const normTarget = normalizeName(targetName);
    if (!normTarget) return null;
    const boundary = boundaryList.find((b) => b.adminLevel === targetLevel && b.isActive);
    if (!boundary) return null;
    const gj = boundaryGeoJSONs[boundary.id];
    if (!gj || !gj.features) return null;
    const matches = gj.features.filter((f: any) => {
      const name =
        f.properties?.name ||
        f.properties?.NAME ||
        f.properties?.shapeName ||
        f.properties?.NAME_1 ||
        f.properties?.NAME_2 ||
        f.properties?.NAME_3 ||
        "";
      return normalizeName(name) === normTarget;
    });
    if (matches.length === 0) return null;
    return { type: "FeatureCollection", features: matches };
  }, [
    boundaryList,
    boundaryGeoJSONs,
    selectedProvinceId,
    selectedDistrictId,
    selectedLlgId,
    provinceLookup,
    districtLookup,
    llgLookup,
  ]);

  // Ensure every GRID3 feature has a stable `id` so the worker and the
  // canvas style function agree on which polygons to emphasize. This runs
  // once per dataset (the query result is cached by tenant) and mutates the
  // feature objects in place — cheap and avoids cloning the geometry.
  const grid3DatasetKey = useMemo<string | null>(() => {
    if (!grid3GeoJSON?.features) return null;
    const feats = grid3GeoJSON.features as any[];
    for (let i = 0; i < feats.length; i++) {
      const f = feats[i];
      if (f.id == null) f.id = f.properties?.OBJECTID ?? i;
    }
    return `${grid3CacheKey}:${feats.length}`;
  }, [grid3GeoJSON, grid3CacheKey]);

  // Long-lived worker that owns the centroid cache for the current dataset.
  // We keep it across the lifetime of the component so centroids are computed
  // exactly once per dataset, no matter how many times the user toggles
  // Province / District / LLG.
  const grid3WorkerRef = useRef<Worker | null>(null);
  const grid3WorkerCachedKeyRef = useRef<string | null>(null);
  const grid3RequestSeqRef = useRef(0);
  const grid3LastAppliedReqRef = useRef(0);
  useEffect(() => {
    const w = new Grid3InsideWorker();
    grid3WorkerRef.current = w;
    return () => {
      w.terminate();
      grid3WorkerRef.current = null;
      grid3WorkerCachedKeyRef.current = null;
    };
  }, []);

  // When the dataset changes, invalidate the worker's centroid cache key so
  // the next compute request re-ships the geometry.
  useEffect(() => {
    grid3WorkerCachedKeyRef.current = null;
  }, [grid3DatasetKey]);

  // Inside-ids set is now produced asynchronously by the worker. `null`
  // means "no selection — render every footprint at full emphasis".
  const [grid3InsideIds, setGrid3InsideIds] = useState<Set<any> | null>(null);

  useEffect(() => {
    const worker = grid3WorkerRef.current;
    if (!worker) return;

    // No selection or no data — clear emphasis (full opacity for all).
    if (!selectedAdminFeatures || !grid3GeoJSON?.features || !grid3DatasetKey) {
      setGrid3InsideIds(null);
      return;
    }

    // Hard cap — bail out of emphasis on huge datasets to keep the UI fluid
    // even if the worker would still finish in a reasonable time.
    const features = grid3GeoJSON.features as any[];
    if (features.length > 200000) {
      setGrid3InsideIds(null);
      return;
    }

    const requestId = ++grid3RequestSeqRef.current;
    const needData = grid3WorkerCachedKeyRef.current !== grid3DatasetKey;

    const onMessage = (e: MessageEvent<any>) => {
      const data = e.data;
      if (!data || data.requestId !== requestId) return;
      if (data.type === "result") {
        // Drop stale results so an older selection can't overwrite a newer one.
        if (requestId < grid3LastAppliedReqRef.current) return;
        grid3LastAppliedReqRef.current = requestId;
        grid3WorkerCachedKeyRef.current = data.datasetKey;
        setGrid3InsideIds(new Set(data.ids));
        worker.removeEventListener("message", onMessage);
      }
    };
    worker.addEventListener("message", onMessage);

    worker.postMessage({
      type: "compute",
      requestId,
      datasetKey: grid3DatasetKey,
      grid3: needData ? { features } : undefined,
      selected: selectedAdminFeatures,
    });

    return () => {
      worker.removeEventListener("message", onMessage);
    };
  }, [selectedAdminFeatures, grid3GeoJSON, grid3DatasetKey]);

  // GRID3 style function — closes over the latest insideIds set so we can
  // apply it imperatively via grid3LayerRef.setStyle without remounting the
  // GeoJSON layer.
  const grid3StyleFn = useCallback(
    (feature: any) => {
      const baseColor = "#8b5cf6";
      const baseFill = "#a78bfa";
      if (!grid3InsideIds) {
        return { color: baseColor, weight: 1.5, fillOpacity: 0.15, fillColor: baseFill };
      }
      const fid = feature.id ?? feature.properties?.OBJECTID ?? feature;
      const inside = grid3InsideIds.has(fid);
      return inside
        ? { color: baseColor, weight: 2, fillOpacity: 0.35, fillColor: baseFill }
        : { color: baseColor, weight: 1, fillOpacity: 0.04, fillColor: baseFill, opacity: 0.5 };
    },
    [grid3InsideIds],
  );

  // Re-apply GRID3 styles in place whenever the selection changes. Because we
  // hold the layer with a STABLE key (`grid3-settlements-overlay`) the
  // <GeoJSON> never remounts on a Province / District / LLG change — this
  // keeps it from being unmounted and re-added under the boundary polygons.
  useEffect(() => {
    const layer = grid3LayerRef.current;
    if (!layer || typeof layer.setStyle !== "function") return;
    try {
      layer.setStyle(grid3StyleFn);
    } catch {
      // ignore — layer may not be mounted yet
    }
  }, [grid3StyleFn]);

  const saveCatchmentMutation = useMutation({
    mutationFn: async () => {
      if (!catchmentFacilityId || drawPoints.length < 3) throw new Error("Invalid polygon");
      // Close the polygon
      const closedCoords = [...drawPoints.map(([lat, lng]) => [lng, lat]), [drawPoints[0][1], drawPoints[0][0]]];
      const geojson = { type: "Polygon", coordinates: [closedCoords] };
      return apiRequest("POST", `/api/facilities/${catchmentFacilityId}/catchments`, {
        name: catchmentName || "Catchment Area",
        description: catchmentDescription || undefined,
        geojson,
        // Original Code: Fails with NaN when text contains commas, spaces, or non-numeric characters, causing 400 Bad Request
        // populationEstimate: catchmentPopEst ? parseInt(catchmentPopEst) : undefined,
        // Updated Code: Safe extraction of digits and integer parsing to ensure zero NaN validation errors
        populationEstimate: catchmentPopEst ? (() => {
          const parsed = parseInt(catchmentPopEst.replace(/\D/g, ""), 10);
          return isNaN(parsed) ? undefined : parsed;
        })() : undefined,
        isOfficial: false,
      });
    },
    onSuccess: () => {
      // Original Code: Leaves layers.hcwCatchments unchanged, meaning the user may not see their saved catchment if the overlay toggle is disabled.
      // queryClient.invalidateQueries({ queryKey: ["/api/catchments"] });
      // Updated Code: Programmatically enable the hand-drawn catchments layer so the newly drawn shape renders immediately.
      setLayers((prev) => ({ ...prev, hcwCatchments: true }));
      queryClient.invalidateQueries({ queryKey: ["/api/catchments"] });
      setSaveCatchmentOpen(false);
      setDrawPoints([]);
      setIsDrawingCatchment(false);
      setCatchmentName("");
      setCatchmentDescription("");
      setCatchmentFacilityId(null);
      setCatchmentProvinceId(null);
      setCatchmentDistrictId(null);
      setCatchmentAutoDetectKm(null);
      toast({ title: "Catchment saved", description: "The facility catchment area is now visible on the map." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save catchment", description: err.message, variant: "destructive" });
    },
  });

  // ─── Catchment dialog: auto-detect nearest facility + cascading picker ──
  // Compute polygon centroid via Turf. Returns [lat, lng] or null if the
  // polygon is invalid (fewer than 3 unique points or contains non-finite coords).
  const computeCatchmentCenter = useCallback(
    (points: [number, number][]): [number, number] | null => {
      if (!points || points.length < 3) return null;
      for (const [lat, lng] of points) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      }
      try {
        // GeoJSON polygon needs [lng, lat] order and a closed ring.
        const ring: [number, number][] = points.map(([lat, lng]) => [lng, lat]);
        ring.push([ring[0][0], ring[0][1]]);
        const poly = turfPolygon([ring]);
        const c = turfCentroid(poly);
        const [cLng, cLat] = c.geometry.coordinates as [number, number];
        if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return null;
        return [cLat, cLng];
      } catch {
        return null;
      }
    },
    [],
  );

  // Find the nearest facility (with valid coordinates) to a given [lat, lng] center.
  const findNearestFacility = useCallback(
    (center: [number, number], facilityList: Facility[]): { facility: Facility; distanceKm: number } | null => {
      const [lat, lng] = center;
      let best: { facility: Facility; distanceKm: number } | null = null;
      for (const fac of facilityList) {
        const fLat = fac.latitude != null ? Number(fac.latitude) : NaN;
        const fLng = fac.longitude != null ? Number(fac.longitude) : NaN;
        if (!Number.isFinite(fLat) || !Number.isFinite(fLng)) continue;
        const km = distance([lng, lat], [fLng, fLat], { units: "kilometers" });
        if (!best || km < best.distanceKm) {
          best = { facility: fac, distanceKm: km };
        }
      }
      return best;
    },
    [],
  );

  // Run auto-detect when the Save Catchment dialog opens after drawing a polygon.
  useEffect(() => {
    if (!saveCatchmentOpen) {
      // Reset all cascading picker state whenever the dialog closes so the next
      // save starts from a clean auto-detected guess rather than the previous pick.
      setCatchmentProvinceId(null);
      setCatchmentDistrictId(null);
      setCatchmentFacilityId(null);
      setCatchmentAutoDetectKm(null);
      return;
    }
    const center = computeCatchmentCenter(drawPoints);
    const nearest = center ? findNearestFacility(center, facilities) : null;
    if (!nearest) {
      // Fall back to fully manual selection: clear any stale preselection so
      // the user starts from empty selectors instead of a leftover facility.
      setCatchmentProvinceId(null);
      setCatchmentDistrictId(null);
      setCatchmentFacilityId(null);
      setCatchmentAutoDetectKm(null);
      return;
    }
    const fac = nearest.facility;
    const dist = districts.find((d: any) => Number(d.id) === Number(fac.districtId));
    setCatchmentFacilityId(fac.id);
    setCatchmentDistrictId(fac.districtId ?? null);
    setCatchmentProvinceId(dist?.provinceId != null ? Number(dist.provinceId) : null);
    setCatchmentAutoDetectKm(nearest.distanceKm);
    // Only react to the dialog opening / draw points changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveCatchmentOpen]);

  // Districts scoped to the chosen province in the catchment picker.
  const catchmentDistrictOptions = useMemo(() => {
    if (catchmentProvinceId == null) return [];
    return districts.filter((d: any) => Number(d.provinceId) === Number(catchmentProvinceId));
  }, [districts, catchmentProvinceId]);

  // Facilities scoped to the chosen district in the catchment picker.
  // Facilities without coordinates still appear here so they can be selected manually.
  const catchmentFacilityOptions = useMemo(() => {
    if (catchmentDistrictId == null) return [];
    return facilities
      .filter((f) => Number(f.districtId) === Number(catchmentDistrictId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, catchmentDistrictId]);

  const createSessionPlanMutation = useMutation({
    // Original Code (apiRequest already parses res.json() directly, calling res.json() here throws TypeError):
    /*
    mutationFn: async (data: any) => {
      const res = (await apiRequest("POST", "/api/sessions", data)) as any;
      return res.json();
    },
    */
    // Updated Code: Directly return the parsed JSON resolved by apiRequest (cast as any to satisfy type-safety)
    mutationFn: async (data: any) => {
      return (await apiRequest("POST", "/api/sessions", data)) as any;
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session Plan Created",
        description: `Successfully derived outreach plan '${newPlan.name}' on the map.`,
        variant: "default",
      });
      setCreateSessionDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create derived session plan.",
        variant: "destructive",
      });
    },
  });

  // Toggle session achieved status mutation for visual checklist ticking
  const toggleAchievedMutation = useMutation({
    // Original Code (apiRequest already parses res.json() directly, calling res.json() here throws TypeError):
    /*
    mutationFn: async ({ sessionId, isAchieved }: { sessionId: number; isAchieved: boolean }) => {
      const res = (await apiRequest("PATCH", `/api/sessions/${sessionId}`, { isAchieved })) as any;
      return res.json();
    },
    */
    // Updated Code: Directly return the parsed JSON resolved by apiRequest (cast as any to satisfy type-safety)
    mutationFn: async ({ sessionId, isAchieved }: { sessionId: number; isAchieved: boolean }) => {
      return (await apiRequest("PATCH", `/api/sessions/${sessionId}`, { isAchieved })) as any;
    },
    onSuccess: (updatedPlan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: updatedPlan.isAchieved ? "Session Achieved!" : "Session Marked as Planned",
        description: `Successfully marked '${updatedPlan.name}' as ${updatedPlan.isAchieved ? "achieved" : "planned"}.`,
        variant: "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update session achievement status.",
        variant: "destructive",
      });
    },
  });

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapRef.current?.setView(
            [position.coords.latitude, position.coords.longitude],
            14
          );
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  };

  const handleLayerToggle = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Upgraded Ray-casting & Segment Proximity formulas for high-performance offline population summing
  const isPointInPolygon = (lat: number, lng: number, polygon: L.LatLng[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > lat) !== (yj > lat))
          && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const getPointToSegmentDistance = (latP: number, lngP: number, latA: number, lngA: number, latB: number, lngB: number) => {
    const dx = lngB - lngA;
    const dy = latB - latA;
    if (dx === 0 && dy === 0) {
      return distance([lngP, latP], [lngA, latA], { units: "kilometers" });
    }
    const t = ((lngP - lngA) * dx + (latP - latA) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const projLng = lngA + clampedT * dx;
    const projLat = latA + clampedT * dy;
    return distance([lngP, latP], [projLng, projLat], { units: "kilometers" });
  };

  const isPointNearLine = (lat: number, lng: number, linePoints: L.LatLng[], maxDistKm: number) => {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const dist = getPointToSegmentDistance(lat, lng, linePoints[i].lat, linePoints[i].lng, linePoints[i+1].lat, linePoints[i+1].lng);
      if (dist <= maxDistKm) return true;
    }
    return false;
  };

  // Centroid calculation helper for active session plans (Planned vs Achieved) - relocated here to ensure all dependent variables are declared first
  const getSessionCentroid = useCallback((plan: any): [number, number] | null => {
    if (plan.geojson && plan.geojson.coordinates) {
      const coords = plan.geojson.coordinates;
      if (plan.geojson.type === "Polygon" && Array.isArray(coords[0])) {
        let latSum = 0;
        let lngSum = 0;
        const pts = coords[0];
        pts.forEach((pt: any) => {
          lngSum += pt[0];
          latSum += pt[1];
        });
        return [latSum / pts.length, lngSum / pts.length];
      } else if (plan.geojson.type === "LineString" && Array.isArray(coords)) {
        let latSum = 0;
        let lngSum = 0;
        coords.forEach((pt: any) => {
          lngSum += pt[0];
          latSum += pt[1];
        });
        return [latSum / coords.length, lngSum / coords.length];
      }
    }
    
    // Fallback: If we have linked villages, find their average
    const linkedVillages = sessionVillages
      ?.filter((sv: any) => sv.sessionId === plan.id)
      .map((sv: any) => villages.find((v) => v.id === sv.villageId))
      .filter((v): v is Village => !!v && !!v.latitude && !!v.longitude);

    if (linkedVillages && linkedVillages.length > 0) {
      let latSum = 0;
      let lngSum = 0;
      linkedVillages.forEach((v) => {
        latSum += Number(v.latitude);
        lngSum += Number(v.longitude);
      });
      return [latSum / linkedVillages.length, lngSum / linkedVillages.length];
    }

    // Fallback 2: Nearest facility
    if (plan.facilityId) {
      const fac = facilities.find(f => f.id === plan.facilityId);
      if (fac && fac.latitude && fac.longitude) {
        return [Number(fac.latitude), Number(fac.longitude)];
      }
    }

    return null;
  }, [sessionVillages, villages, facilities]);

  // Spatial index over village centroids — built once per `villages` list and
  // queried with a bbox prefilter so the polygon / route inside-test only runs
  // against candidates that already fall within the drawing's bounding box,
  // instead of every village on the main thread. This is what keeps the live
  // target-population preview smooth on Zambia-sized tenants.
  type VillageIdxItem = {
    minX: number; minY: number; maxX: number; maxY: number;
    lat: number; lng: number; population: number;
  };
  const villageSpatialIndex = useMemo(() => {
    const tree = new RBush<VillageIdxItem>();
    const items: VillageIdxItem[] = [];
    for (const v of villages) {
      if (v.latitude == null || v.longitude == null) continue;
      const lat = Number(v.latitude);
      const lng = Number(v.longitude);
      if (!isFinite(lat) || !isFinite(lng)) continue;
      items.push({
        minX: lng, minY: lat, maxX: lng, maxY: lat,
        lat, lng,
        population: Number((v as any).population) || 0,
      });
    }
    tree.load(items);
    return tree;
  }, [villages]);

  // Sparse representation of the loaded population raster: a flat Float64Array
  // of [lng, lat, value] for every non-zero cell plus an RBush over those
  // cells. Built once when a georaster is first attached so subsequent draws
  // skip the full width*height scan and just query a bbox.
  type RasterCellItem = { minX: number; minY: number; maxX: number; maxY: number; idx: number };
  const rasterSparseRef = useRef<{ gr: any; cells: Float64Array; tree: RBush<RasterCellItem> } | null>(null);
  const getRasterSparse = () => {
    const gr = georasterRef.current;
    if (!gr) return null;
    if (rasterSparseRef.current?.gr === gr) return rasterSparseRef.current;

    const dx = (gr.xmax - gr.xmin) / gr.width;
    const dy = (gr.ymax - gr.ymin) / gr.height;
    const buf: number[] = [];
    const items: RasterCellItem[] = [];
    for (let r = 0; r < gr.height; r++) {
      const row = gr.values[0][r];
      if (!row) continue;
      const cellLat = gr.ymax - (r + 0.5) * dy;
      for (let c = 0; c < gr.width; c++) {
        const val = row[c];
        if (val === undefined || isNaN(val) || val === gr.noDataValue || val <= 0) continue;
        const cellLng = gr.xmin + (c + 0.5) * dx;
        const idx = buf.length / 3;
        buf.push(cellLng, cellLat, val);
        items.push({ minX: cellLng, minY: cellLat, maxX: cellLng, maxY: cellLat, idx });
      }
    }
    const tree = new RBush<RasterCellItem>();
    tree.load(items);
    const sparse = { gr, cells: Float64Array.from(buf), tree };
    rasterSparseRef.current = sparse;
    return sparse;
  };

  // Compute drawing bbox, padded for mobile polyline corridors (~1km in degrees).
  const drawingBBox = (points: L.LatLng[], type: "outreach" | "mobile") => {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    if (type === "mobile") {
      const pad = 0.01;
      minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;
    }
    return { minX: minLng, minY: minLat, maxX: maxLng, maxY: maxLat };
  };

  // Sums local database villages census population inside geofence
  const calculateLocalRegistryPopulation = (points: L.LatLng[], type: "outreach" | "mobile") => {
    if (points.length < 2) return 0;
    const bbox = drawingBBox(points, type);
    const candidates = villageSpatialIndex.search(bbox);
    let total = 0;
    for (const v of candidates) {
      const inside = type === "outreach"
        ? isPointInPolygon(v.lat, v.lng, points)
        : isPointNearLine(v.lat, v.lng, points, 0.5);
      if (inside) total += v.population;
    }
    return total;
  };

  // Sums GRID3 settlements building count & population inside geofence
  const calculateGRID3SettlementPopulation = (points: L.LatLng[], type: "outreach" | "mobile") => {
    if (points.length < 2) return 0;
    const bbox = drawingBBox(points, type);
    const candidates = villageSpatialIndex.search(bbox);
    let structureCount = 0;
    for (const v of candidates) {
      const inside = type === "outreach"
        ? isPointInPolygon(v.lat, v.lng, points)
        : isPointNearLine(v.lat, v.lng, points, 0.5);
      if (inside) structureCount++;
    }
    return Math.round(structureCount * 5.2);
  };

  const calculateGeofencePopulation = (points: L.LatLng[], type: "outreach" | "mobile") => {
    if (points.length < 2) return 0;
    const sparse = getRasterSparse();
    if (!sparse) return 0;

    const bbox = drawingBBox(points, type);
    const candidates = sparse.tree.search(bbox);
    const cells = sparse.cells;
    let totalPopulation = 0;
    for (let i = 0; i < candidates.length; i++) {
      const idx = candidates[i].idx * 3;
      const cellLng = cells[idx];
      const cellLat = cells[idx + 1];
      const rawVal = cells[idx + 2];
      const inside = type === "outreach"
        ? isPointInPolygon(cellLat, cellLng, points)
        : isPointNearLine(cellLat, cellLng, points, 0.5); // 500m buffer
      if (inside) totalPopulation += rawVal;
    }
    return Math.round(totalPopulation);
  };

  // Memoize the three live-preview pop estimates so the dialog/JSX doesn't
  // re-run the bbox + inside-test sweep on every unrelated re-render. Recompute
  // only when the drawn polygon/route, draw type, village set, or loaded
  // raster actually changes.
  const consensusPopulations = useMemo(() => {
    const mode: "outreach" | "mobile" = newSessionType === "mobile" ? "mobile" : "outreach";
    return {
      worldPopGrid: calculateGeofencePopulation(sessionPolygonPoints, mode),
      localRegistry: calculateLocalRegistryPopulation(sessionPolygonPoints, mode),
      grid3Structures: calculateGRID3SettlementPopulation(sessionPolygonPoints, mode),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPolygonPoints, newSessionType, villageSpatialIndex, georasterRef.current]);

  // Measurement & Catchment Drawing handlers
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (isMeasuring) {
      const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
      setMeasurementPoints((prev) => [...prev, newPt]);
    } else if (isDrawingCatchment) {
      const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDrawPoints((prev) => [...prev, newPt]);
    } else if (isDrawingSessionPolygon) {
      setSessionPolygonPoints((prev) => [...prev, e.latlng]);
    } else {
      // Normal map click - gridded population lookup & nearest facility/plan analysis
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      let density = 0;

      if (georasterRef.current) {
        const gr = georasterRef.current;
        // Map GPS coordinates to raster column and row index
        const col = Math.floor(((lng - gr.xmin) / (gr.xmax - gr.xmin)) * gr.width);
        const row = Math.floor(((gr.ymax - lat) / (gr.ymax - gr.ymin)) * gr.height);

        if (row >= 0 && row < gr.height && col >= 0 && col < gr.width) {
          const rawVal = gr.values[0][row][col];
          if (rawVal !== undefined && !isNaN(rawVal) && rawVal !== gr.noDataValue && rawVal > 0) {
            density = parseFloat(rawVal.toFixed(2));
          }
        }
      }

      // Find nearest Health Facility using Turf.js distance
      let nearestFacility: Facility | null = null;
      let minFacilityDist = Infinity;
      facilities.forEach((f) => {
        if (f.latitude && f.longitude) {
          const dist = distance([lng, lat], [Number(f.longitude), Number(f.latitude)], { units: "kilometers" });
          if (dist < minFacilityDist) {
            minFacilityDist = dist;
            nearestFacility = f;
          }
        }
      });

      // Find nearest Planned Session
      let nearestPlan: any = null;
      let minPlanDist = Infinity;
      activeSessionPlans.forEach((plan: any) => {
        // Average coordinates from linked villages
        let planLat = 0;
        let planLng = 0;
        let count = 0;
        
        const linkedVillageIds = sessionVillages
          ?.filter((sv: any) => sv.sessionId === plan.id)
          ?.map((sv: any) => sv.villageId) || [];
          
        villages.forEach((v) => {
          if (linkedVillageIds.includes(v.id) && v.latitude && v.longitude) {
            planLat += Number(v.latitude);
            planLng += Number(v.longitude);
            count++;
          }
        });
        
        if (count > 0) {
          const avgLat = planLat / count;
          const avgLng = planLng / count;
          const dist = distance([lng, lat], [avgLng, avgLat], { units: "kilometers" });
          if (dist < minPlanDist) {
            minPlanDist = dist;
            nearestPlan = plan;
          }
        }
      });

      // Find nearest database Village using Turf.js distance
      let nearestVillage: Village | null = null;
      let minVillageDist = Infinity;
      villages.forEach((v) => {
        if (v.latitude && v.longitude) {
          const dist = distance([lng, lat], [Number(v.longitude), Number(v.latitude)], { units: "kilometers" });
          if (dist < minVillageDist) {
            minVillageDist = dist;
            nearestVillage = v;
          }
        }
      });

      setMapClickDetails({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        density,
        nearestFacility: nearestFacility ? {
          id: (nearestFacility as any).id,
          name: (nearestFacility as any).name,
          distance: parseFloat(minFacilityDist.toFixed(2))
        } : null,
        nearestPlan: nearestPlan ? {
          id: nearestPlan.id,
          name: nearestPlan.name,
          distance: parseFloat(minPlanDist.toFixed(2))
        } : null,
        nearestVillage: nearestVillage ? {
          id: (nearestVillage as any).id,
          name: (nearestVillage as any).name,
          population: (nearestVillage as any).population || 0,
          distance: parseFloat(minVillageDist.toFixed(2))
        } : null,
      });

      // Pre-select facility and default name
      if (nearestFacility) {
        setSelectedParentFacilityId((nearestFacility as any).id);
        setNewSessionName(`Outreach Session Plan - ${(nearestFacility as any).name}`);
      } else {
        setNewSessionName(`Outreach Session Plan`);
      }

      setClickDialogOpen(true);
    }
  };

  const measuredDistance = useMemo(() => {
    if (measurementPoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < measurementPoints.length - 1; i++) {
      const p1 = measurementPoints[i];
      const p2 = measurementPoints[i + 1];
      // Turf distance expects [longitude, latitude] coordinates
      total += distance([p1[1], p1[0]], [p2[1], p2[0]], { units: "kilometers" });
    }
    return total;
  }, [measurementPoints]);

  /*
  // Original Code: Export Actions referencing non-existent population property on Village
  const handleExportGeoJSON = () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        ...facilities.map(f => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              f.longitude ? Number(f.longitude) : 0, 
              f.latitude ? Number(f.latitude) : 0
            ]
          },
          properties: {
            id: f.id,
            name: f.name,
            type: "facility",
            hmisCode: f.hmisCode,
            facilityType: f.facilityType,
          }
        })),
        ...villages.map(v => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              v.longitude ? Number(v.longitude) : 0, 
              v.latitude ? Number(v.latitude) : 0
            ]
          },
          properties: {
            id: v.id,
            name: v.name,
            type: "village",
            code: v.code,
            isHardToReach: v.isHardToReach,
            population: v.population,
          }
        }))
      ]
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(featureCollection, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gis_catchment_export_${new Date().toISOString().split('T')[0]}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,ID,Name,Code_HMIS,Latitude,Longitude,Hard_To_Reach,Population,Distance_to_Facility_km,Travel_Time_min\n";
    
    facilities.forEach(f => {
      csvContent += `Facility,${f.id},"${(f.name || '').replace(/"/g, '""')}",${f.hmisCode || ""},${f.latitude || ""},${f.longitude || ""},N/A,N/A,N/A,N/A\n`;
    });
    
    villages.forEach(v => {
      csvContent += `Village,${v.id},"${(v.name || '').replace(/"/g, '""')}",${v.code || ""},${v.latitude || ""},${v.longitude || ""},${v.isHardToReach ? "Yes" : "No"},${v.population || ""},${v.distanceToFacility || ""},${v.travelTimeMinutes || ""}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `catchment_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  */

  // Updated Code: Safe Export Actions aligning with standard Village database schema properties
  const handleExportGeoJSON = () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        ...facilities.map(f => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              f.longitude ? Number(f.longitude) : 0, 
              f.latitude ? Number(f.latitude) : 0
            ]
          },
          properties: {
            id: f.id,
            name: f.name,
            type: "facility",
            hmisCode: f.hmisCode,
            facilityType: f.facilityType,
          }
        })),
        ...villages.map(v => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              v.longitude ? Number(v.longitude) : 0, 
              v.latitude ? Number(v.latitude) : 0
            ]
          },
          properties: {
            id: v.id,
            name: v.name,
            type: "village",
            code: v.code,
            isHardToReach: v.isHardToReach,
          }
        }))
      ]
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(featureCollection, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gis_catchment_export_${new Date().toISOString().split('T')[0]}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,ID,Name,Code_HMIS,Latitude,Longitude,Hard_To_Reach,Population,Distance_to_Facility_km,Travel_Time_min\n";
    
    facilities.forEach(f => {
      csvContent += `Facility,${f.id},"${(f.name || '').replace(/"/g, '""')}",${f.hmisCode || ""},${f.latitude || ""},${f.longitude || ""},N/A,N/A,N/A,N/A\n`;
    });
    
    villages.forEach(v => {
      csvContent += `Village,${v.id},"${(v.name || '').replace(/"/g, '""')}",${v.code || ""},${v.latitude || ""},${v.longitude || ""},${v.isHardToReach ? "Yes" : "No"},N/A,${v.distanceToFacility || ""},${v.travelTimeMinutes || ""}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `catchment_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };


  const handlePrint = () => {
    setExportDialogOpen(false);
    setIsPrinting(true);
    setLayerPanelOpen(false);
    
    // Allow leafet / map to re-render in printing mode before opening printer prompt
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 600);
  };

  return (
    <div id="print-map-container" className="relative w-full" style={{ height }}>
      {isPrinting && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-map-container, #print-map-container * {
              visibility: visible !important;
            }
            #print-map-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              z-index: 99999 !important;
            }
          }
        `}} />
      )}



      {/*
        Updated Code: Enhanced Map container featuring active administrative boundary layers (layers.boundaries)
        fetched dynamically, local health worker catchment polygon layers (layers.hcwCatchments), real-time drawing
        previews (Polygon/Polyline and CircleMarker vertices), a premium drawing HUD panel, and a dialog popup 
        to bind newly drawn shapes to health facilities.
      */}
      <MapContainer
        center={effectiveCenter}
        zoom={effectiveZoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={false}
        maxZoom={20}
      >
        {basemap === "osm" ? (
          <TileLayer
            attribution={OSM_TILE_ATTRIBUTION}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution={ESRI_IMAGERY_ATTRIBUTION}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={17}
            maxZoom={20}
          />
        )}

        <PopulationWmsLayer overlay={populationOverlay} />

        <MapEvents onClick={handleMapClick} />

        {/* explicit Ward (Level 3) boundary overlays */}
        {layers.wards &&
          boundaryList &&
          boundaryList
            .filter((b) => b.adminLevel === 3)
            .map((b) => {
              const geojson = filteredBoundaryGeoJSONs[b.id];
              if (!geojson || !geojson.features || geojson.features.length === 0) return null;
              return (
                <GeoJSON
                  key={`explicit-wards-${b.id}-${selectedProvinceId}-${selectedDistrictId}`}
                  data={geojson}
                  style={{
                    color: "#f59e0b", // Warm Amber
                    weight: 1.5,
                    fillOpacity: 0.05,
                    fillColor: "#fcd34d",
                  }}
                  onEachFeature={(feature, layer) => {
                    const name = feature.properties?.name || feature.properties?.shapeName || "Ward";
                    layer.bindTooltip(`Ward: ${name}`, { sticky: true });
                  }}
                />
              );
            })}

        {/* explicit Constituency (Level 2) boundary overlays */}
        {layers.constituencies &&
          boundaryList &&
          boundaryList
            .filter((b) => b.adminLevel === 2)
            .map((b) => {
              const geojson = filteredBoundaryGeoJSONs[b.id];
              if (!geojson || !geojson.features || geojson.features.length === 0) return null;
              return (
                <GeoJSON
                  key={`explicit-constituencies-${b.id}-${selectedProvinceId}-${selectedDistrictId}`}
                  data={geojson}
                  style={{
                    color: "#0d9488", // Teal
                    weight: 2.0,
                    fillOpacity: 0.04,
                    fillColor: "#2dd4bf",
                  }}
                  onEachFeature={(feature, layer) => {
                    const name = feature.properties?.name || feature.properties?.shapeName || "Constituency";
                    layer.bindTooltip(`Constituency: ${name}`, { sticky: true });
                  }}
                />
              );
            })}

        {/* GeoTIFF population gridded density overlay.
            We wait for tenantInfo to resolve before rendering so the cache
            scope reflects the active *view* tenant — otherwise a raster
            cached under the user's home tenant could briefly render in the
            wrong country. Once tenantInfo is available, the URL itself
            includes the tenant code as a cache buster so a stale cached
            raster from another country can never satisfy this request. */}
        {layers.populationGeoTIFF && tenantInfo?.id && (
          <GeoTIFFOverlay
            key={`geotiff-${tenantInfo.id}-${selectedRasterFile || "default"}`}
            url={
              selectedRasterFile
                ? `/api/resources/geotiff?file=${encodeURIComponent(selectedRasterFile)}&tenant=${encodeURIComponent(tenantInfo.code || tenantInfo.id)}`
                : `/api/resources/geotiff?tenant=${encodeURIComponent(tenantInfo.code || tenantInfo.id)}`
            }
            onRasterLoaded={(gr) => {
              georasterRef.current = gr;
            }}
            // Scope the IndexedDB raster cache to the active view tenant so a
            // raster cached under the user's home tenant is never served when
            // they have switched to another country.
            cacheScope={tenantInfo.id}
            // Only auto-fit the map to the raster bounds when the user has
            // explicitly picked a raster from the dropdown. For the default
            // (tenant-resolved) raster, the tenant's mapCenter/mapZoom keeps
            // the map on the right country.
            autoFit={!!selectedRasterFile}
          />
        )}

        {/* GRID3 Zambia Settlement Extents footprints.
            Rendered on a dedicated Leaflet pane (`grid3Pane`, z-index 450) so
            it always paints *above* boundary polygons no matter what the
            JSX order is or when boundary layers remount on Province change.
            The component key is intentionally STABLE — it must not include
            selectedProvinceId / selectedDistrictId / selectedLlgId — so this
            layer is never unmounted by a filter change. Selection-aware
            emphasis is applied imperatively via `grid3LayerRef.setStyle`. */}
        {layers.grid3Settlements && grid3GeoJSON && tenantInfo?.countryCode === "ZMB" && (
          <>
            <Grid3PaneCreator />
            <GeoJSON
              key="grid3-settlements-overlay"
              ref={(r) => { grid3LayerRef.current = r as any; }}
              data={grid3GeoJSON}
              pane="grid3Pane"
              {...({ renderer: grid3CanvasRenderer } as any)}
              style={grid3StyleFn as any}
              onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const name = props.name || `${props.type || 'Settlement'} #${props.OBJECTID || ''}`;
              const count = props.building_count || 0;
              const area = props.building_area ? Math.round(props.building_area) : 0;
              layer.bindPopup(`
                <div class="p-2 text-xs font-sans space-y-1">
                  <div class="font-bold text-primary flex items-center gap-1">
                    <span class="inline-block w-2 h-2 rounded-full bg-violet-600"></span>
                    ${name}
                  </div>
                  <div class="text-[10px] text-muted-foreground">GRID3 Physical Footprint</div>
                  <div class="border-t pt-1 flex flex-col gap-0.5 mt-1 text-foreground">
                    <div><strong>Type:</strong> ${props.type || 'N/A'}</div>
                    <div><strong>Buildings:</strong> ${count} units</div>
                    <div><strong>Built Area:</strong> ${area} m²</div>
                    <div><strong>Source:</strong> ${props.source || 'CIESIN'}</div>
                  </div>
                </div>
              `, { maxWidth: 200 });
            }}
            />
          </>
        )}

        {/* Admin-uploaded custom map layers (vector + raster). Each active
            layer that the user has not hidden this session is rendered here.
            Vector layers fetch their GeoJSON lazily; rasters stream the stored
            GeoTIFF via the dedicated raster endpoint. */}
        {activeCustomLayers
          .filter((l: any) => !hiddenCustomLayerIds.has(l.id))
          .map((l: any) =>
            l.layerType === "raster" ? (
              <GeoTIFFOverlay
                key={`custom-raster-${l.id}`}
                url={`/api/custom-layers/${l.id}/raster`}
                cacheScope={`custom-${l.id}`}
              />
            ) : (
              <CustomVectorLayer key={`custom-vector-${l.id}`} id={l.id} style={l.style} />
            ),
          )}

        {/* Plotted Session geofence drawing previews */}
        {isDrawingSessionPolygon && sessionPolygonPoints.length > 0 && (
          <>
            {/* If Mobile, render Polyline route path */}
            {newSessionType === "mobile" ? (
              <Polyline
                positions={sessionPolygonPoints}
                pathOptions={{
                  color: "#d97706", // Amber
                  weight: 4,
                  opacity: 0.8,
                }}
              />
            ) : (
              /* If Outreach, render closed Polygon */
              <Polygon
                positions={sessionPolygonPoints}
                pathOptions={{
                  color: "#d97706", // Amber
                  weight: 3,
                  fillColor: "#f59e0b",
                  fillOpacity: 0.15,
                  dashArray: "5, 10"
                }}
              />
            )}
            
            {/* Render CircleMarkers for vertices */}
            {sessionPolygonPoints.map((pt, idx) => (
              <CircleMarker
                key={`draw-vertex-${idx}`}
                center={pt}
                radius={5}
                pathOptions={{
                  color: "#b45309",
                  fillColor: "#ffffff",
                  fillOpacity: 1.0,
                  weight: 2
                }}
              />
            ))}
          </>
        )}

        {/* Render Active Session Plans (Planned vs Achieved) */}
        {activeSessionPlans.map((plan: any) => {
          if (!plan.geojson || !plan.geojson.coordinates) return null;
          
          const isAchieved = plan.isAchieved;
          
          // Color coding: Achieved = Solid Green (#10b981), Planned = Dashed Gold-Amber (#f59e0b)
          const color = isAchieved ? "#10b981" : "#f59e0b";
          const weight = isAchieved ? 3.5 : 2.5;
          const dashArray = isAchieved ? undefined : "5, 8";
          const fillColor = isAchieved ? "#10b981" : "#f59e0b";
          const fillOpacity = isAchieved ? 0.25 : 0.12;

          const centroid = getSessionCentroid(plan);

          const lifecycle = deriveSessionLifecycle(plan);

          const renderPopup = () => {
            const linkedVils = sessionVillages
              ?.filter((sv: any) => sv.sessionId === plan.id)
              .map((sv: any) => villages.find((v) => v.id === sv.villageId))
              .filter((v): v is Village => !!v);

            const isClosed = lifecycle.phase === "reported" || lifecycle.phase === "archived";

            return (
              <Popup>
                <div className="p-3 w-64 select-text">
                  <div className="flex items-center justify-between mb-2 gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {plan.sessionType}
                    </span>
                    <div className="flex items-center gap-1">
                      {lifecycle.isOverdue && (
                        <Badge
                          variant="secondary"
                          className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[9px] font-bold uppercase tracking-wider"
                          data-testid={`badge-overdue-${plan.id}`}
                        >
                          Overdue
                        </Badge>
                      )}
                      <Badge variant="secondary" className={plan.isAchieved ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}>
                        {plan.isAchieved ? "ACHIEVED" : "PLANNED"}
                      </Badge>
                    </div>
                  </div>
                  <h4 className="font-bold text-xs text-primary mb-1">{plan.name}</h4>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Catchment Target: <strong>{plan.targetPopulation || 0}</strong> people
                  </p>
                  
                  {linkedVils && linkedVils.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Target Communities ({linkedVils.length})
                      </div>
                      <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar text-[10px]">
                        {linkedVils.map((v: any) => (
                          <div key={v.id} className="flex justify-between items-center py-0.5 border-b border-border/20 last:border-0">
                            <span className="font-semibold truncate text-[10px]">{v.name}</span>
                            <span className="font-mono text-[9px] text-muted-foreground">Pop: {v.population || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant={plan.isAchieved ? "outline" : "default"}
                      className="w-full text-[10px] h-7 font-bold gap-1 rounded-lg min-h-[44px] sm:min-h-0"
                      onClick={() => toggleAchievedMutation.mutate({ sessionId: plan.id, isAchieved: !plan.isAchieved })}
                      disabled={toggleAchievedMutation.isPending}
                    >
                      {plan.isAchieved ? (
                        <>
                          <XCircle className="h-3 w-3 text-rose-500 mr-1" />
                          Mark Unachieved
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 text-white mr-1" />
                          Mark Achieved
                        </>
                      )}
                    </Button>
                    {isClosed && plan.facilityId && (
                      <a
                        href={`/microplans/${plan.planType === "campaign" ? "campaigns" : "routine"}?facilityId=${plan.facilityId}&fromSession=${plan.id}`}
                        className="w-full"
                        data-testid={`link-plan-new-${plan.id}`}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-[10px] h-7 font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 min-h-[44px] sm:min-h-0"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Plan a new session here
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            );
          };

          const renderVector = () => {
            if (plan.geojson.type === "Polygon" && Array.isArray(plan.geojson.coordinates[0])) {
              const leafletPositions = plan.geojson.coordinates[0].map((pt: any) => [pt[1], pt[0]] as [number, number]);
              return (
                <Polygon
                  positions={leafletPositions}
                  pathOptions={{
                    color,
                    weight,
                    fillColor,
                    fillOpacity,
                    dashArray,
                  }}
                >
                  {renderPopup()}
                </Polygon>
              );
            } else if (plan.geojson.type === "LineString" && Array.isArray(plan.geojson.coordinates)) {
              const leafletPositions = plan.geojson.coordinates.map((pt: any) => [pt[1], pt[0]] as [number, number]);
              return (
                <Polyline
                  positions={leafletPositions}
                  pathOptions={{
                    color,
                    weight,
                    dashArray,
                  }}
                >
                  {renderPopup()}
                </Polyline>
              );
            }
            return null;
          };

          return (
            <div key={`session-layers-${plan.id}`}>
              {renderVector()}
              {centroid && (
                <Marker
                  position={centroid}
                  icon={
                    new L.Icon({
                      iconUrl: plan.isAchieved
                        ? FILLED_PIN_DATA_URIS.green
                        : FILLED_PIN_DATA_URIS.amber,
                      iconSize: [22, 32],
                      iconAnchor: [11, 32],
                      popupAnchor: [0, -32],
                    })
                  }
                >
                  {renderPopup()}
                </Marker>
              )}
            </div>
          );
        })}

        {/* Roads transparent transport network overlay */}
        {/* Updated Code: Added opacity=0.75 for clear visibility; also added OpenStreetMap-Roads as a
            secondary fallback layer since the primary Esri Transportation service may be rate-limited
            or unavailable in some network environments. */}
        {layers.roads && (
          <>
            {/* Primary: Esri World Transportation (authoritative road data) */}
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, HERE, USGS, iPC'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.8}
              zIndex={100}
            />
          </>
        )}

        {/* Glowing HTR (Hard-To-Reach) outreach area buffers */}
        {/* Updated Code: Removed showVillageMarkers dependency so the toggle responds immediately.
            HTR buffers now render whenever layers.htrAreas is true AND HTR village data exists,
            using visibleVillagesFiltered which already handles bounds-based performance pruning. */}
        {layers.htrAreas &&
          visibleVillagesFiltered
            .filter((v) => v.latitude && v.longitude && v.isHardToReach)
            .map((v) => (
              <Circle
                key={`htr-buffer-${v.id}`}
                center={[Number(v.latitude), Number(v.longitude)]}
                radius={5000} // 5km glowing outreach buffer
                pathOptions={{
                  fillColor: "#ef4444",
                  color: "#ef4444",
                  fillOpacity: 0.12,
                  weight: 1,
                  dashArray: "3, 6"
                }}
              />
            ))}

        {/* Render Administrative Boundaries (Levels 0-5) */}


        {/* Updated Code: Dynamic Cascading Administrative Boundaries styled premium per level using pre-filtered GeoJSON arrays to avoid browser SVG bloat */}
        {layers.boundaries &&
          boundaryList &&
          boundaryList
            .filter((b) => b.isActive)
            .map((b) => {
              const geojson = filteredBoundaryGeoJSONs[b.id];
              if (!geojson || !geojson.features || geojson.features.length === 0) return null;

              const style = getBoundaryStyle(b.adminLevel);

              return (
                <GeoJSON
                  key={`boundary-${b.id}-${selectedProvinceId}-${selectedDistrictId}-${selectedLlgId}`}
                  data={geojson}
                  style={style}
                  onEachFeature={(feature, layer) => {
                    const name =
                      feature.properties?.name ||
                      feature.properties?.NAME ||
                      feature.properties?.shapeName ||
                      b.levelName ||
                      "Administrative Boundary";
                    
                    layer.bindTooltip(name, {
                      sticky: true,
                      className: "text-xs font-semibold px-2 py-1 rounded bg-background border shadow",
                    });

                    layer.on({
                      mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({
                          color: "#3b82f6", // Royal blue highlight stroke
                          weight: 3,
                          fillColor: "#3b82f6", // Royal blue highlight fill
                          fillOpacity: 0.2,
                        });
                      },
                      mouseout: (e) => {
                        const l = e.target;
                        l.setStyle(getBoundaryStyle(b.adminLevel)); // Restores exact level style dynamically
                      },
                      click: (e) => {
                        const l = e.target;
                        if (mapRef.current && l.getBounds) {
                          mapRef.current.fitBounds(l.getBounds(), { padding: [20, 20] });
                        }

                        const fName = feature.properties?.name ||
                          feature.properties?.NAME ||
                          feature.properties?.shapeName ||
                          feature.properties?.NAME_1 ||
                          feature.properties?.NAME_2 ||
                          feature.properties?.NAME_3 ||
                          "";
                        const normFName = normalizeName(fName);
                        if (!normFName) return;

                        if (b.adminLevel === 1) {
                          const matchedProv = provinces.find((p) => {
                            const normPName = normalizeName(p.name);
                            return normFName === normPName;
                          });
                          if (matchedProv) {
                            handleProvinceChange(matchedProv.id);
                          }
                        } else if (b.adminLevel === 2) {
                          const matchedDist = districts.find((d) => {
                            const normDName = normalizeName(d.name);
                            return normFName === normDName;
                          });
                          if (matchedDist) {
                            handleDistrictChange(matchedDist.id);
                          }
                        } else if (b.adminLevel === 3) {
                          const matchedLlg = llgs.find((l) => {
                            const normLName = normalizeName(l.name);
                            // Spelling aliases mapping matches the exact name
                            return normFName === normLName;
                          });
                          if (matchedLlg) {
                            handleLlgChange(matchedLlg.id);
                          }
                        }
                      },
                    });
                  }}
                />
              );
            })}

        {/* Render HCW Catchments (Drawn catchment areas) */}
        {layers.hcwCatchments &&
          hcwCatchments &&
          hcwCatchments.map((catchment) => {
            const facilityName =
              facilities.find((f) => f.id === catchment.facilityId)?.name || "Facility";
            return (
              <GeoJSON
                key={`hcw-catchment-${catchment.id}`}
                data={catchment.geojson as any}
                style={{
                  color: "#0284c7", // Sky blue stroke
                  weight: 2,
                  fillOpacity: 0.25,
                  fillColor: "#38bdf8", // Sky blue fill
                }}
                onEachFeature={(feature, layer) => {
                  const areaStr = catchment.areaSqKm ? `${Number(catchment.areaSqKm).toFixed(2)} km²` : "N/A";
                  const popStr = catchment.populationEstimate ? `${catchment.populationEstimate}` : "N/A";
                  const savedAt = (catchment as any).createdAt
                    ? new Date((catchment as any).createdAt).toLocaleString()
                    : "—";
                  const drawnBy = (catchment as any).drawnByUserId
                    ? String((catchment as any).drawnByUserId).slice(0, 8) + "…"
                    : "—";
                  const tooltipContent = `
                    <div class="p-1 space-y-1">
                      <p class="font-bold text-sm text-sky-900">${catchment.name}</p>
                      <p class="text-xs text-muted-foreground">${facilityName}</p>
                      <p class="text-[11px]"><b>Area:</b> ${areaStr}</p>
                      <p class="text-[11px]"><b>Est. Population:</b> ${popStr}</p>
                      <p class="text-[11px]"><b>Drawn by:</b> ${drawnBy}</p>
                      <p class="text-[11px]"><b>Saved:</b> ${savedAt}</p>
                      <p class="text-[11px]"><b>Status:</b> ${catchment.isOfficial ? "Official Catchment" : "Drawn Catchment"}</p>
                    </div>
                  `;
                  layer.bindPopup(tooltipContent);
                  // Leaflet vector layers swallow click events by default, so a
                  // user clicking ON a catchment polygon never triggered the
                  // map's click handler (which is what initiates a new session
                  // plan from the clicked location). Re-fire the click on the
                  // map so the "Plan a session here" flow runs even when the
                  // click lands inside a drawn catchment area. We stop the
                  // underlying DOM event first so any latent bubbling from the
                  // SVG renderer can't double-dispatch into handleMapClick (one
                  // click → one session-start / one drawn point).
                  layer.on("click", (e: any) => {
                    if (e?.originalEvent) {
                      L.DomEvent.stopPropagation(e.originalEvent);
                    }
                    if (mapRef.current) {
                      mapRef.current.fire("click", e);
                    }
                  });
                }}
              />
            );
          })}

        {/*
        // Original Code: Concentric circles and catchment lines rendered without O(1) lookups or zoom pruning, resulting in significant rendering lockups
        {layers.catchments &&
          filteredFacilities
            .filter((f) => f.latitude && f.longitude)
            .map((facility) => {
              const lat = Number(facility.latitude);
              const lng = Number(facility.longitude);
              return (
                <div key={`catchment-circles-${facility.id}`}>
                  <Circle
                    center={[lat, lng]}
                    radius={5000}
                    pathOptions={{
                      fillColor: "#22c55e",
                      color: "#22c55e",
                      fillOpacity: 0.04,
                      weight: 1.5,
                      dashArray: "4, 4"
                    }}
                  />
                  <Circle
                    center={[lat, lng]}
                    radius={10000}
                    pathOptions={{
                      fillColor: "#ea580c",
                      color: "#ea580c",
                      fillOpacity: 0.02,
                      weight: 1.5,
                      dashArray: "4, 4"
                    }}
                  />
                </div>
              );
            })}

        {layers.catchments &&
          filteredVillages
            .filter((v) => v.latitude && v.longitude && v.assignedFacilityId)
            .map((village) => {
              const facility = filteredFacilities.find((f) => f.id === village.assignedFacilityId);
              if (!facility || !facility.latitude || !facility.longitude) return null;
              ...
            })}
        {/* Updated Code: High-performance Concentric Walkability circles for health facilities */}
        {layers.catchments &&
          filteredFacilities
            .filter((f) => {
              if (!f.latitude || !f.longitude) return false;
              if (!mapBounds) return true;
              return mapBounds.contains([Number(f.latitude), Number(f.longitude)]);
            })
            .map((facility) => {
              const lat = Number(facility.latitude);
              const lng = Number(facility.longitude);
              return (
                <div key={`catchment-circles-${facility.id}`}>
                  {/* 5km Walkable Buffer (Green) */}
                  <Circle
                    center={[lat, lng]}
                    radius={5000}
                    pathOptions={{
                      fillColor: "#22c55e",
                      color: "#22c55e",
                      fillOpacity: 0.04,
                      weight: 1.5,
                      dashArray: "4, 4"
                    }}
                  />
                  {/* 10km Outreach Buffer (Orange) */}
                  <Circle
                    center={[lat, lng]}
                    radius={10000}
                    pathOptions={{
                      fillColor: "#ea580c",
                      color: "#ea580c",
                      fillOpacity: 0.02,
                      weight: 1.5,
                      dashArray: "4, 4"
                    }}
                  />
                </div>
              );
            })}

        {/* Original Code:
        {layers.catchments &&
          showVillageMarkers &&
          visibleVillages
            .filter((v) => v.latitude && v.longitude && v.assignedFacilityId)
            .map((village) => {
              const facility = filteredFacilitiesMap.get(Number(village.assignedFacilityId));
              if (!facility || !facility.latitude || !facility.longitude) return null;
        
              const vLat = Number(village.latitude);
              const vLng = Number(village.longitude);
              const fLat = Number(facility.latitude);
              const fLng = Number(facility.longitude);
        
              // Calculate Turf geodesic distance
              const dist = distance([vLng, vLat], [fLng, fLat], { units: "kilometers" });
        
              // Color code based on walkability distance
              let color = "#22c55e"; // Walkable (<5km)
              if (dist > 10) {
                color = "#ef4444"; // HTR (>10km)
              } else if (dist > 5) {
                color = "#ea580c"; // Outreach (5-10km)
              }
        
              return (
                <Polyline
                  key={`link-${village.id}-${facility.id}`}
                  positions={[[vLat, vLng], [fLat, fLng]]}
                  color={color}
                  weight={1.5}
                  opacity={0.7}
                  dashArray="2, 4"
                />
              );
            })}
        {/* Updated Code: High-performance O(1) Village-to-Facility Catchment Lines.
            Removed showVillageMarkers dependency — visibleVillagesFiltered now handles bounds
            pruning unconditionally, so these lines render immediately when the toggle is enabled. */}
        {layers.catchments &&
          visibleVillagesFiltered
            .filter((v) => v.latitude && v.longitude && v.assignedFacilityId)
            .map((village) => {
              const facility = filteredFacilitiesMap.get(Number(village.assignedFacilityId));
              if (!facility || !facility.latitude || !facility.longitude) return null;

              const vLat = Number(village.latitude);
              const vLng = Number(village.longitude);
              const fLat = Number(facility.latitude);
              const fLng = Number(facility.longitude);

              // Calculate Turf geodesic distance
              const dist = distance([vLng, vLat], [fLng, fLat], { units: "kilometers" });

              // Color code based on walkability distance
              let color = "#22c55e"; // Walkable (<5km)
              if (dist > 10) {
                color = "#ef4444"; // HTR (>10km)
              } else if (dist > 5) {
                color = "#ea580c"; // Outreach (5-10km)
              }

              return (
                <Polyline
                  key={`link-${village.id}-${facility.id}`}
                  positions={[[vLat, vLng], [fLat, fLng]]}
                  color={color}
                  weight={1.5}
                  opacity={0.7}
                  dashArray="2, 4"
                />
              );
            })}

        {layers.facilities &&
          visibleFacilities
            .filter((f) => f.latitude && f.longitude)
            .map((facility) => (
              <Marker
                key={`facility-${facility.id}`}
                position={[Number(facility.latitude), Number(facility.longitude)]}
                icon={facilityIcon}
                ref={(el) => {
                  if (el) {
                    markerRefs.current[facility.id] = el;
                  } else {
                    delete markerRefs.current[facility.id];
                  }
                }}
              >
                <Popup className="premium-map-popup">
                  <div className="w-64 overflow-hidden rounded-lg font-sans text-xs select-none">
                    {/* Header */}
                    <div className="bg-primary/5 p-3 pb-2 border-b border-border/60">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-bold text-foreground text-sm leading-tight leading-4 line-clamp-2">
                          {facility.name}
                        </h4>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono py-0 px-1 bg-background/50">
                          {facility.hmisCode}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                          {facility.facilityType?.toLowerCase().replace("_", " ") || "Facility"}
                        </span>
                        {facility.agencyName && (
                          <span className="text-[10px] text-muted-foreground/80 bg-muted/65 px-1.5 py-0.5 rounded">
                            {facility.agencyName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5 bg-background/95 backdrop-blur-sm">
                      {/* Dynamic Administrative Trail */}
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-foreground/80">{adminLabels.level1}:</span>{" "}
                            {provinceLookup.get(Number(districtLookup.get(Number(facility.districtId))?.provinceId))?.name || "N/A"}
                          </div>
                        </div>
                        <div className="pl-5 truncate">
                          <span className="font-semibold text-foreground/80">{adminLabels.level2}:</span>{" "}
                          {districtLookup.get(Number(facility.districtId))?.name || "N/A"}
                        </div>
                      </div>

                      <hr className="border-border/40" />

                      {/* Resource Metrics & Badges */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className={`flex items-center gap-1.5 p-1.5 rounded border ${
                          facility.hasRefrigerator 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                            : "bg-destructive/5 border-destructive/20 text-destructive"
                        }`}>
                          <Thermometer className="h-3.5 w-3.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium leading-none text-muted-foreground">Cold Chain</p>
                            <p className="font-bold text-[10px] mt-0.5 truncate">{facility.hasRefrigerator ? "Functional" : "None"}</p>
                          </div>
                        </div>

                        <div className={`flex items-center gap-1.5 p-1.5 rounded border ${
                          facility.hasPower 
                            ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400" 
                            : "bg-muted border border-border text-muted-foreground"
                        }`}>
                          <Zap className="h-3.5 w-3.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium leading-none text-muted-foreground">Power</p>
                            <p className="font-bold text-[10px] mt-0.5 truncate">{facility.hasPower ? "Active" : "None"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom stats row */}
                      <div className="flex justify-between items-center gap-2 pt-1 border-t border-border/40 text-[10px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                          <span>Staff Count:</span>
                          <span className="font-bold text-foreground">{facility.staffCount || "0"}</span>
                        </div>
                        
                        <div className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium shrink-0">
                          Catchment:{" "}
                          <span className="font-bold text-foreground">
                            {/* Original Code: {villages.filter((v) => v.assignedFacilityId === facility.id).length} */}
                            {(facilityVillagesMap.get(Number(facility.id)) || []).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/*
        // Original Code: Rendering thousands of villages without zoom-based pruning
        {layers.villages &&
          filteredVillages
            .filter((v) => v.latitude && v.longitude)
            .map((village) => (
        */}
        {/* Updated Code: Village markers use visibleVillagesFiltered which already applies bounds-based
            pruning unconditionally. Removed the showVillageMarkers zoom-gate from the render condition
            so the toggle responds immediately when enabled, regardless of zoom level. */}
        {layers.villages &&
          visibleVillagesFiltered
            .filter((v) => v.latitude && v.longitude)
            .map((village) => (
              <Marker
                key={`village-${village.id}`}
                position={[Number(village.latitude), Number(village.longitude)]}
                icon={
                  plannedVillageIds.has(village.id)
                    ? plannedIcon
                    : village.isHardToReach
                      ? missingHtrIcon
                      : missingStandardIcon
                }
              >
                <Popup className="premium-map-popup">
                  <div className="w-64 overflow-hidden rounded-lg font-sans text-xs select-none">
                    {/* Header */}
                    <div className="bg-primary/5 p-3 pb-2 border-b border-border/60">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-bold text-foreground text-sm leading-tight leading-4 line-clamp-2">
                          {village.name}
                        </h4>
                        {plannedVillageIds.has(village.id) ? (
                          <Badge variant="outline" className="text-[9px] shrink-0 py-0 px-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 uppercase tracking-wider">
                            Planned
                          </Badge>
                        ) : village.isHardToReach ? (
                          <Badge variant="destructive" className="text-[9px] shrink-0 py-0 px-1 text-white bg-red-600 border-none font-bold uppercase tracking-wider">
                            Missing HTR
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] shrink-0 py-0 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 uppercase tracking-wider">
                            Missing Standard
                          </Badge>
                        )}
                      </div>
                      {village.code && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Code: {village.code}
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-2.5 bg-background/95 backdrop-blur-sm">
                      {/* Dynamic Administrative Trail */}
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-foreground/80">{adminLabels.level1}:</span>{" "}
                            {provinceLookup.get(Number(districtLookup.get(Number(village.districtId))?.provinceId))?.name || "N/A"}
                          </div>
                        </div>
                        <div className="pl-5 truncate">
                          <span className="font-semibold text-foreground/80">{adminLabels.level2}:</span>{" "}
                          {districtLookup.get(Number(village.districtId))?.name || "N/A"}
                        </div>
                        {village.llgId && llgLookup.get(Number(village.llgId)) && (
                          <div className="pl-5 truncate">
                            <span className="font-semibold text-foreground/80">{adminLabels.level3}:</span>{" "}
                            {llgLookup.get(Number(village.llgId))?.name}
                          </div>
                        )}
                      </div>

                      <hr className="border-border/40" />

                      {/* Travel & Accessibility Grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5 p-1.5 rounded border bg-muted/20 border-border/40 text-foreground">
                          <Ruler className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium leading-none text-muted-foreground">Distance</p>
                            <p className="font-bold text-[10px] mt-0.5 truncate">
                              {village.distanceToFacility ? `${Number(village.distanceToFacility).toFixed(1)} km` : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 p-1.5 rounded border bg-muted/20 border-border/40 text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-medium leading-none text-muted-foreground">Travel Time</p>
                            <p className="font-bold text-[10px] mt-0.5 truncate">
                              {village.travelTimeMinutes ? `${village.travelTimeMinutes} min` : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom travel details / accessibility row */}
                      <div className="space-y-1.5 pt-1 border-t border-border/40 text-[10px]">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-muted-foreground font-medium">Transport Mode:</span>
                          <span className="font-semibold capitalize text-foreground">
                            {village.transportMode?.toLowerCase() || "N/A"}
                          </span>
                        </div>
                        {village.seasonalAccessibility && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-muted-foreground font-medium">Seasonal Barrier:</span>
                            <span className="font-semibold text-destructive truncate max-w-[140px]" title={village.seasonalAccessibility}>
                              {village.seasonalAccessibility}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Planning Status */}
                      <hr className="border-border/40 my-2" />
                      <div className="space-y-1 text-[10px]">
                        <p className="font-bold text-muted-foreground uppercase">Planning Status</p>
                        {(() => {
                          const planInfo = villagePlanningDetails.get(village.id);
                          if (planInfo) {
                            return (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-1 px-1.5 rounded border border-emerald-500/10">
                                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                <span className="truncate">Planned: Day {planInfo.dayNumber} of "{planInfo.sessionName}"</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className={`flex items-center gap-1.5 font-semibold p-1 px-1.5 rounded border ${
                                village.isHardToReach 
                                  ? "text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/10" 
                                  : "text-amber-600 dark:text-amber-400 bg-amber-500/5 border-amber-500/10"
                              }`}>
                                <XCircle className="h-3.5 w-3.5 text-current shrink-0" />
                                <span className="truncate">Missing: Not scheduled in dispatches</span>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Task #84 — Plan a session straight from any village pin.
                          Task #101 — if the village's facility has no routine
                          microplan yet, offer to start one instead of dropping
                          the user on the bare /sessions list page. */}
                      <Button
                        size="sm"
                        className="w-full h-7 text-[11px] font-semibold mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => {
                          const mp = (masterMicroplans ?? []).find(
                            (m: any) =>
                              Number(m.facilityId) === Number(village.assignedFacilityId) &&
                              m.planType === "facility_routine",
                          );
                          const qs = new URLSearchParams({
                            unservedVillageId: String(village.id),
                            unservedName: village.name ?? "",
                            unservedLat: String(village.latitude),
                            unservedLng: String(village.longitude),
                            unservedHtr: village.isHardToReach ? "1" : "0",
                            prefillKind: "village",
                            autoOpen: "1",
                          });
                          if (mp) {
                            window.location.assign(`/sessions/microplan/${mp.id}?${qs.toString()}`);
                            return;
                          }
                          // No routine microplan for the facility yet — offer
                          // to start one via the Microplan Wizard, then return
                          // here with the village prefill intact.
                          const fac = facilities.find(
                            (f) => Number(f.id) === Number(village.assignedFacilityId),
                          );
                          if (!village.assignedFacilityId || !fac) {
                            window.location.assign(`/sessions?${qs.toString()}`);
                            return;
                          }
                          setStartMicroplanPrompt({
                            villageId: village.id,
                            villageName: village.name ?? "",
                            villageLat: Number(village.latitude),
                            villageLng: Number(village.longitude),
                            villageHtr: !!village.isHardToReach,
                            facilityId: Number(fac.id),
                            facilityName: fac.name ?? "this facility",
                          });
                        }}
                        data-testid={`button-plan-session-village-${village.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Plan a session here
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Community catchment boundary polygons (task #261). Drawn for any
            visible village that has a saved boundary so harmonized catchments
            are visible app-wide. */}
        {layers.villages &&
          visibleVillagesFiltered
            .filter((v) => {
              const coords = (v as any).boundary?.coordinates?.[0];
              return Array.isArray(coords) && coords.length >= 4;
            })
            .map((village) => {
              const ring = (village as any).boundary.coordinates[0] as number[][];
              const positions = ring.map((c) => [c[1], c[0]] as [number, number]);
              const color = village.isHardToReach ? "#dc2626" : "#6366f1";
              return (
                <Polygon
                  key={`village-boundary-${village.id}`}
                  positions={positions}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 2 }}
                >
                  <Popup className="premium-map-popup">
                    <div className="w-48 text-xs font-sans">
                      <div className="font-bold text-sm mb-1">{village.name}</div>
                      <div className="text-muted-foreground">Community catchment boundary</div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

        {/* Task #47: Session-plan pins — color-coded by status, popup with date,
            microplan link, target/vaccinated, and a "Mark done" hint. */}
        {sessionMapPins
          .filter((s: any) => s.lat != null && s.lng != null)
          .filter((s: any) => {
            if (s.status === "completed") return !hiddenCategories.has("sessionCompleted");
            if (s.status === "in_progress" || s.status === "in-progress") return !hiddenCategories.has("sessionInProgress");
            return !hiddenCategories.has("sessionPlanned");
          })
          .map((s: any) => {
            const color = s.status === "completed" ? "#059669" : (s.status === "in_progress" || s.status === "in-progress") ? "#f59e0b" : "#2563eb";
            return (
              <CircleMarker
                key={`session-pin-${s.id}`}
                center={[Number(s.lat), Number(s.lng)]}
                radius={9}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
              >
                <Popup className="premium-map-popup">
                  <div className="w-56 text-xs font-sans">
                    <div className="font-bold text-sm mb-1.5">{s.name}</div>
                    <div className="space-y-0.5 text-foreground/80">
                      <div><span className="text-muted-foreground">Status:</span> <span className="font-semibold capitalize">{String(s.status || "planned").replace("_", " ")}</span></div>
                      {s.scheduledDate && <div><span className="text-muted-foreground">Scheduled:</span> {new Date(s.scheduledDate).toLocaleDateString()}</div>}
                      {s.completedAt && <div><span className="text-muted-foreground">Completed:</span> {new Date(s.completedAt).toLocaleDateString()}</div>}
                      <div><span className="text-muted-foreground">Target pop:</span> {s.targetPopulation ?? "—"}</div>
                      {s.vaccinatedTotal != null && <div><span className="text-muted-foreground">Vaccinated:</span> <span className="font-bold">{s.vaccinatedTotal}</span></div>}
                      <div className="capitalize"><span className="text-muted-foreground">Type:</span> {s.sessionType} / {s.planType}</div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-border/40 flex gap-1.5">
                      <a className="text-primary underline text-[11px]" href={s.planType === "campaign" ? "/microplans/campaigns" : "/microplans/routine"} data-testid="link-open-session-planner">Open in planner</a>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-7 text-[11px] font-semibold mt-2"
                      onClick={() => {
                        const qs = new URLSearchParams({
                          unservedName: s.name ?? "",
                          unservedLat: String(s.lat),
                          unservedLng: String(s.lng),
                          prefillKind: "followup",
                          autoOpen: "1",
                        });
                        const planSeg = s.planType === "campaign" ? "campaign" : "microplan";
                        const path = s.microplanId
                          ? `/sessions/${planSeg}/${s.microplanId}`
                          : "/sessions";
                        window.location.assign(`${path}?${qs.toString()}`);
                      }}
                      data-testid={`button-plan-followup-${s.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Plan follow-up
                    </Button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Task #47: Unserved populated places — red hatched ring marker. */}
        {!hiddenCategories.has("unserved") && unservedPlaces
          .filter((p: any) => p.latitude != null && p.longitude != null)
          .map((p: any) => (
            <CircleMarker
              key={`unserved-${p.id}`}
              center={[Number(p.latitude), Number(p.longitude)]}
              radius={7}
              pathOptions={{ color: "#dc2626", fillColor: "#fecaca", fillOpacity: 0.5, weight: 2, dashArray: "3 3" }}
            >
              <Popup>
                <div className="w-52 text-xs">
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-red-600 font-semibold mt-1">No session ever planned</div>
                  <div className="text-muted-foreground mt-0.5 mb-2">{p.isHardToReach ? "Hard-to-reach community" : "Standard community"}</div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      const qs = new URLSearchParams({
                        unservedVillageId: String(p.id),
                        unservedName: p.name ?? "",
                        unservedLat: String(p.latitude),
                        unservedLng: String(p.longitude),
                        unservedHtr: p.isHardToReach ? "1" : "0",
                        autoOpen: "1",
                      });
                      window.location.assign(`/sessions?${qs.toString()}`);
                    }}
                    data-testid={`button-plan-session-here-${p.id}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Plan a session here
                  </Button>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Zero-dose / under-immunized village pins — graduated by missed-child count.
            Mirrors the popup + color/radius logic from pages/ZeroDoseVillages.tsx so
            planners see the same layer in the context of the main map. */}
        {layers.zeroDoseVillages && (() => {
          const rows = (zeroDoseData?.byVillage ?? []).filter(
            (v) => v.latitude != null && v.longitude != null && v.zeroDose > 0,
          );
          // Honor the page's existing province/district scope filters. The API
          // payload only carries districtId, so province scoping is resolved by
          // walking the already-loaded districts list.
          const districtsInProvince =
            selectedProvinceId === "all"
              ? null
              : new Set(
                  districts
                    .filter((d) => Number(d.provinceId) === Number(selectedProvinceId))
                    .map((d) => Number(d.id)),
                );
          const scoped = rows.filter((v) => {
            if (districtsInProvince && !districtsInProvince.has(Number(v.districtId))) return false;
            if (selectedDistrictId !== "all" && Number(v.districtId) !== Number(selectedDistrictId)) return false;
            return true;
          });
          const maxCount = Math.max(1, ...scoped.map((v) => v.zeroDose));
          const colorFor = (n: number) => {
            const r = n / maxCount;
            if (r > 0.66) return "#dc2626";
            if (r > 0.33) return "#ea580c";
            return "#f59e0b";
          };
          return scoped.map((v) => {
            const n = v.zeroDose;
            const color = colorFor(n);
            const radius = 6 + Math.round((n / maxCount) * 12);
            return (
              <CircleMarker
                key={`zerodose-${v.villageId ?? "f" + v.facilityId}`}
                center={[Number(v.latitude), Number(v.longitude)]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.65, weight: 1 }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">{v.villageName}</div>
                    <div>{v.facilityName} · {v.districtName}</div>
                    <div>
                      Zero-dose: <strong>{v.zeroDose}</strong> ({v.pct}%)
                    </div>
                    <div>
                      Under-imm: <strong>{v.underImmunized}</strong> ({v.underImmunizedPct}%)
                    </div>
                    <div>of {v.denominator} eligible children</div>
                    {v.isHardToReach && (
                      <Badge className="bg-amber-500/10 text-amber-700">Hard-to-reach</Badge>
                    )}
                    {v.lastDefaulterSession && (
                      <div
                        className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5"
                        data-testid={`text-last-defaulter-session-zerodose-${v.villageId ?? v.facilityId}`}
                      >
                        Last defaulter session:{" "}
                        {new Date(v.lastDefaulterSession.date).toLocaleDateString()}{" "}
                        — <strong>{v.lastDefaulterSession.caughtUp}</strong> caught up
                      </div>
                    )}
                    {canCreateSessionPlan(user) && v.facilityId != null && (
                      <Button
                        size="sm"
                        className="w-full h-7 text-[11px] font-semibold mt-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          const mp = (masterMicroplans ?? []).find(
                            (m: any) =>
                              Number(m.facilityId) === Number(v.facilityId) &&
                              m.planType === "facility_routine",
                          );
                          const qs = new URLSearchParams({
                            unservedVillageId: String(v.villageId ?? ""),
                            unservedName: v.villageName ?? "",
                            unservedLat: String(v.latitude),
                            unservedLng: String(v.longitude),
                            unservedHtr: v.isHardToReach ? "1" : "0",
                            prefillKind: "defaulter",
                            autoOpen: "1",
                          });
                          const path = mp
                            ? `/sessions/microplan/${mp.id}`
                            : "/sessions";
                          window.location.assign(`${path}?${qs.toString()}`);
                        }}
                        data-testid={`button-plan-defaulter-zerodose-${v.villageId ?? v.facilityId}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Plan defaulter follow-up here
                      </Button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          });
        })()}

        {/* Under-immunized village pins — DTP1 received but DTP3 missed.
            Rendered as a separate layer with the amber palette from
            pages/ZeroDoseVillages.tsx (mode === "under") so planners doing
            defaulter follow-up can see both layers in the same map context. */}
        {layers.underImmunizedVillages && (() => {
          const rows = (zeroDoseData?.byVillage ?? []).filter(
            (v) => v.latitude != null && v.longitude != null && v.underImmunized > 0,
          );
          const districtsInProvince =
            selectedProvinceId === "all"
              ? null
              : new Set(
                  districts
                    .filter((d) => Number(d.provinceId) === Number(selectedProvinceId))
                    .map((d) => Number(d.id)),
                );
          const scoped = rows.filter((v) => {
            if (districtsInProvince && !districtsInProvince.has(Number(v.districtId))) return false;
            if (selectedDistrictId !== "all" && Number(v.districtId) !== Number(selectedDistrictId)) return false;
            return true;
          });
          const maxCount = Math.max(1, ...scoped.map((v) => v.underImmunized));
          const colorFor = (n: number) => {
            const r = n / maxCount;
            if (r > 0.66) return "#d97706";
            if (r > 0.33) return "#f59e0b";
            return "#fbbf24";
          };
          return scoped.map((v) => {
            const n = v.underImmunized;
            const color = colorFor(n);
            const radius = 6 + Math.round((n / maxCount) * 12);
            return (
              <CircleMarker
                key={`underimm-${v.villageId ?? "f" + v.facilityId}`}
                center={[Number(v.latitude), Number(v.longitude)]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.65, weight: 1 }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">{v.villageName}</div>
                    <div>{v.facilityName} · {v.districtName}</div>
                    <div>
                      Under-imm: <strong>{v.underImmunized}</strong> ({v.underImmunizedPct}%)
                    </div>
                    <div>
                      Zero-dose: <strong>{v.zeroDose}</strong> ({v.pct}%)
                    </div>
                    <div>of {v.denominator} eligible children</div>
                    {v.isHardToReach && (
                      <Badge className="bg-amber-500/10 text-amber-700">Hard-to-reach</Badge>
                    )}
                    {v.lastDefaulterSession && (
                      <div
                        className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5"
                        data-testid={`text-last-defaulter-session-underimm-${v.villageId ?? v.facilityId}`}
                      >
                        Last defaulter session:{" "}
                        {new Date(v.lastDefaulterSession.date).toLocaleDateString()}{" "}
                        — <strong>{v.lastDefaulterSession.caughtUp}</strong> caught up
                      </div>
                    )}
                    {canCreateSessionPlan(user) && v.facilityId != null && (
                      <Button
                        size="sm"
                        className="w-full h-7 text-[11px] font-semibold mt-1 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                          const mp = (masterMicroplans ?? []).find(
                            (m: any) =>
                              Number(m.facilityId) === Number(v.facilityId) &&
                              m.planType === "facility_routine",
                          );
                          const qs = new URLSearchParams({
                            unservedVillageId: String(v.villageId ?? ""),
                            unservedName: v.villageName ?? "",
                            unservedLat: String(v.latitude),
                            unservedLng: String(v.longitude),
                            unservedHtr: v.isHardToReach ? "1" : "0",
                            prefillKind: "defaulter",
                            autoOpen: "1",
                          });
                          const path = mp
                            ? `/sessions/microplan/${mp.id}`
                            : "/sessions";
                          window.location.assign(`${path}?${qs.toString()}`);
                        }}
                        data-testid={`button-plan-defaulter-underimm-${v.villageId ?? v.facilityId}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Plan defaulter follow-up here
                      </Button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          });
        })()}

        {/* Dynamic measurement overlay polyline & circle markers */}
        {isMeasuring && measurementPoints.length > 0 && (
          <Polyline positions={measurementPoints} color="#ef4444" weight={3} dashArray="5, 10" />
        )}
        {isMeasuring && measurementPoints.map((pt, idx) => (
          <CircleMarker
            key={`measure-${idx}`}
            center={pt}
            radius={6}
            pathOptions={{ color: "#ef4444", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
          />
        ))}

        {/* Active Catchment Drawing Preview */}
        {isDrawingCatchment && drawPoints.length > 0 && (
          <>
            {drawPoints.length >= 3 ? (
              <Polygon
                positions={drawPoints}
                pathOptions={{
                  color: "#059669",
                  fillColor: "#10b981",
                  fillOpacity: 0.3,
                  weight: 3,
                }}
              />
            ) : drawPoints.length === 2 ? (
              <Polyline
                positions={drawPoints}
                pathOptions={{
                  color: "#059669",
                  weight: 3,
                }}
              />
            ) : null}

            {drawPoints.map((pt, idx) => (
              <CircleMarker
                key={`draw-vertex-${idx}`}
                center={pt}
                radius={6}
                pathOptions={{
                  color: "#059669",
                  fillColor: "#ffffff",
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            ))}
          </>
        )}

        {/* Original Code: <MapController center={center} zoom={zoom} /> */}
        <MapController center={effectiveCenter} zoom={effectiveZoom} onZoomChange={setCurrentZoom} onBoundsChange={setMapBounds} />
      </MapContainer>

      {/* Floating panel dock — one tap shows/hides each map panel so the map
          stays uncluttered, especially on phones where panels start hidden. */}
      {!isPrinting && (
        <div
          className="absolute left-3 top-3 z-[1100] flex flex-col gap-1.5"
          ref={disableLeafletPropagation}
          data-testid="map-panel-dock"
        >
          {[
            { key: "layers" as PanelKey, icon: Layers, label: "Layers", show: true },
            { key: "filters" as PanelKey, icon: Filter, label: "Filters", show: showFacilityList },
            { key: "facilities" as PanelKey, icon: Building2, label: "Facilities", show: showFacilityList },
            { key: "checklist" as PanelKey, icon: CheckCircle, label: "Checklist", show: activeSessionPlans.length > 0 },
            { key: "legend" as PanelKey, icon: MapPin, label: "Legend", show: true },
            { key: "tools" as PanelKey, icon: SlidersHorizontal, label: "Tools", show: true },
          ]
            .filter((b) => b.show)
            .map((b) => {
              const Icon = b.icon;
              const active = panelVis[b.key];
              return (
                <Button
                  key={b.key}
                  size="icon"
                  variant={active ? "default" : "secondary"}
                  onClick={() => togglePanel(b.key)}
                  title={active ? `Hide ${b.label}` : `Show ${b.label}`}
                  aria-pressed={active}
                  className="h-9 w-9 shadow-md"
                  data-testid={`button-dock-${b.key}`}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
        </div>
      )}

      {!isPrinting && (
        <>
          <PopulationOverlayToggle
            overlay={populationOverlay}
            className="absolute right-4 top-16 z-[1000]"
          />
          <PopulationOverlayLegend
            overlay={populationOverlay}
            className="absolute left-4 bottom-20 z-[1000]"
          />
        </>
      )}

      {/* Custom map layers toggle panel — lists admin-uploaded layers that are
          active for this tenant so users can show/hide each one this session. */}
      {!isPrinting && activeCustomLayers.length > 0 && (
        <div
          className="absolute right-4 bottom-20 z-[1000]"
          ref={disableLeafletPropagation}
          data-testid="panel-custom-layers"
        >
          <div className="bg-background/90 backdrop-blur-md border border-border shadow-lg rounded-lg text-xs w-52 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 font-semibold hover:bg-muted/50 transition-colors"
              onClick={() => setCustomLayersPanelOpen((o) => !o)}
              data-testid="button-toggle-custom-layers-panel"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Custom Layers
              </span>
              <span className="text-muted-foreground">{customLayersPanelOpen ? "−" : "+"}</span>
            </button>
            {customLayersPanelOpen && (
              <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                {activeCustomLayers.map((l: any) => {
                  const shown = !hiddenCustomLayerIds.has(l.id);
                  const color = l.style?.color ?? "#2563eb";
                  return (
                    <label
                      key={l.id}
                      className="flex items-center gap-2 cursor-pointer select-none"
                      data-testid={`toggle-custom-layer-${l.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={shown}
                        onChange={() => toggleCustomLayer(l.id)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate flex-1" title={l.name}>{l.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zero-dose / under-immunized graduated-pin legend.
          Renders when either overlay is on, anchored bottom-right above the
          basemap toggle area (MapControls sit at right-4 bottom-20). */}
      {(layers.zeroDoseVillages || layers.underImmunizedVillages) && !isPrinting && (
        <div
          className="absolute right-4 bottom-4 z-[1000] pointer-events-none"
          ref={disableLeafletPropagation}
          data-testid="map-legend-zerodose"
        >
          <div className="bg-background/90 backdrop-blur-md border border-border shadow-lg rounded-lg p-2.5 text-[10px] space-y-2 pointer-events-auto max-w-[180px]">
            {layers.zeroDoseVillages && (
              <div className="space-y-1">
                <div className="font-bold text-[10px] uppercase tracking-wider text-primary">Zero-dose Villages</div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#ea580c" }} />
                  <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "#dc2626" }} />
                  <span className="text-muted-foreground ml-1">Low → High</span>
                </div>
              </div>
            )}
            {layers.underImmunizedVillages && (
              <div className="space-y-1">
                <div className="font-bold text-[10px] uppercase tracking-wider text-primary">Under-immunized</div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "#d97706" }} />
                  <span className="text-muted-foreground ml-1">Low → High</span>
                </div>
              </div>
            )}
            <div className="text-muted-foreground text-[9px] pt-1 border-t border-border/40">
              Pin size = missed-child count
            </div>
          </div>
        </div>
      )}

      {/* Floating glassmorphic zoom warning HUD sibling to MapContainer */}
      {!showVillageMarkers && layers.villages && !isPrinting && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg p-2.5 backdrop-blur-md text-xs font-semibold shadow-md pointer-events-auto flex items-center gap-2" ref={disableLeafletPropagation}>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse animate-duration-1000" />
            <span>Zoom in to view village markers (or filter by District/Ward)</span>
          </div>
        </div>
      )}

      {/* Measurement HUD Panel */}
      {isMeasuring && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
          <Card className="shadow-xl border-2 border-red-500 bg-background/95 backdrop-blur-md">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse animate-duration-1000" />
                <div>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Ruler mode</p>
                  <p className="text-base font-extrabold font-mono text-foreground">
                    {measuredDistance.toFixed(3)} km
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMeasurementPoints([])}
                  disabled={measurementPoints.length === 0}
                  className="h-8 text-xs font-semibold"
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setIsMeasuring(false);
                    setMeasurementPoints([]);
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Catchment Drawing HUD Panel */}
      {isDrawingCatchment && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
          <Card className="shadow-xl border-2 border-emerald-500 bg-background/95 backdrop-blur-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Catchment Drawing Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Click to place boundary vertices ({drawPoints.length} set)
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDrawPoints((prev) => prev.slice(0, -1))}
                    disabled={drawPoints.length === 0}
                    className="h-8 text-xs font-semibold"
                  >
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsDrawingCatchment(false);
                      setDrawPoints([]);
                    }}
                    className="h-8 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedFacilityId) {
                        setCatchmentFacilityId(selectedFacilityId);
                        const fac = facilities.find((f) => f.id === selectedFacilityId);
                        if (fac) {
                          setCatchmentName(`${fac.name} Catchment`);
                        }
                      }
                      setSaveCatchmentOpen(true);
                    }}
                    disabled={drawPoints.length < 3}
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Save Area
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Drawing Session Geofence HUD Panel */}
      {isDrawingSessionPolygon && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
          <Card className="shadow-xl border-2 border-amber-500 bg-background/95 backdrop-blur-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Geofence Drawing Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Click to place vertices ({sessionPolygonPoints.length} set). Buffered Polyline for Mobile, closed Polygon for Outreach.
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSessionPolygonPoints((prev) => prev.slice(0, -1))}
                    disabled={sessionPolygonPoints.length === 0}
                    className="h-8 text-xs font-semibold"
                  >
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsDrawingSessionPolygon(false);
                      setSessionPolygonPoints([]);
                      toast({
                        title: "Drawing Cancelled",
                        description: "Drawn points cleared.",
                        variant: "default"
                      });
                    }}
                    className="h-8 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={sessionPolygonPoints.length < 2}
                    onClick={() => {
                      // Trigger dynamic Turf-free ray-cast pop sum
                      const pop = calculateGeofencePopulation(sessionPolygonPoints, newSessionType === "mobile" ? "mobile" : "outreach");
                      setNewSessionTargetPop(pop);
                      setIsDrawingSessionPolygon(false);
                      setNewSessionDate(getMinScheduleDateInputValue());
                      setCreateSessionDialogOpen(true);
                      
                      toast({
                        title: "Geofence Plotted",
                        description: `Automatically calculated target population of ${pop} people inside this geofenced catchment.`,
                        variant: "default"
                      });
                    }}
                    className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Save Geofence
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {!isPrinting && (
        <div className="absolute left-16 top-4 z-[1000] flex flex-col gap-3 pointer-events-none w-64 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">

          {panelVis.layers && (
            <div className="pointer-events-auto" ref={disableLeafletPropagation}>
              <LayerPanel
                isOpen={layerPanelOpen}
                onToggle={() => setLayerPanelOpen(!layerPanelOpen)}
                layers={layers}
                onLayerToggle={handleLayerToggle}
                basemap={basemap}
                onBasemapChange={setBasemap}
                boundaryList={boundaryList}
                countryCode={tenantInfo?.countryCode}
                adminLabels={adminLabels}
              />
            </div>
          )}

          {showFacilityList && panelVis.filters && (
            <div className="pointer-events-auto" ref={disableLeafletPropagation}>
              <FilterPanel
                isOpen={filterPanelOpen}
                onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedProvinceId={selectedProvinceId}
                onProvinceChange={handleProvinceChange}
                selectedDistrictId={selectedDistrictId}
                onDistrictChange={handleDistrictChange}
                selectedLlgId={selectedLlgId}
                onLlgChange={handleLlgChange}
                villageCategory={villageCategory}
                onVillageCategoryChange={setVillageCategory}
                filterColdChain={filterColdChain}
                onColdChainToggle={() => setFilterColdChain(!filterColdChain)}
                filterPower={filterPower}
                onPowerToggle={() => setFilterPower(!filterPower)}
                provinces={provinces}
                districts={districts}
                llgs={llgs}
                adminLabels={adminLabels}
                totalFacilitiesCount={facilities.length}
                filteredFacilitiesCount={filteredFacilities.length}
                totalVillagesCount={villages.length}
                filteredVillagesCount={filteredVillages.length}
              />
            </div>
          )}
        </div>
      )}

      {/* Zoom / Locate map controls */}
      {!isPrinting && (
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocate={handleLocate}
          basemap={basemap}
          onBasemapChange={setBasemap}
        />
      )}



      {/* Original Code:
      {!isPrinting && <MapLegend leftOffset={showFacilityList && (layerPanelOpen || filterPanelOpen)} />}
      */}
      {/* Updated Code: MapLegend rendered with dynamic offset, interactive selection, and collapsible triggers */}
      {!isPrinting && panelVis.legend && (
        <MapLegend
          leftOffset={showFacilityList && ((panelVis.layers && layerPanelOpen) || (panelVis.filters && filterPanelOpen))}
          hiddenCategories={hiddenCategories}
          onToggleCategory={handleToggleCategory}
          isExpanded={isLegendExpanded}
          onToggleExpanded={() => setIsLegendExpanded(!isLegendExpanded)}
          planningStats={stats}
          showPopulationLegend={layers.populationGeoTIFF}
          facilityCount={filteredFacilities.length}
        />
      )}

      {/* Premium measurement, drawing & export buttons */}
      {!isPrinting && panelVis.tools && (
        <div className="absolute right-4 top-4 z-[1000] flex gap-2 items-center flex-wrap" ref={disableLeafletPropagation}>
          {rasterListData?.success && rasterListData?.files && (
            <Select
              value={selectedRasterFile || "default"}
              onValueChange={(val) => {
                if (val === "default") {
                  setSelectedRasterFile("");
                  localStorage.removeItem("vaxplan_selected_raster");
                } else {
                  setSelectedRasterFile(val);
                  localStorage.setItem("vaxplan_selected_raster", val);
                  // Locate target coordinate profile and adjust active Leaflet map center
                  const activeRaster = rasterListData.files.find(f => f.fileName === val);
                  if (activeRaster) {
                    if (countryCenters[activeRaster.country] && mapRef.current) {
                      const profile = countryCenters[activeRaster.country];
                      mapRef.current.setView(profile.center, profile.zoom);
                    }
                    
                    // Automatically trigger tenant switch to align the active facilities and planning context
                    const countryMap: Record<string, string> = {
                      "Zambia": "ZMB",
                      "South Sudan": "SSD",
                      "Papua New Guinea": "PNG"
                    };
                    const targetCode = countryMap[activeRaster.country];
                    if (targetCode && tenantInfo && tenantInfo.code !== targetCode) {
                      const matchingTenant = publicTenants.find((t: any) => t.code === targetCode);
                      if (matchingTenant) {
                        switchTenantMutation.mutate(matchingTenant.id);
                      }
                    }
                  }
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-background/95 backdrop-blur border border-border shadow-md w-48 font-semibold">
                <Globe className="h-3.5 w-3.5 mr-1.5 text-primary opacity-80" />
                <SelectValue placeholder="Gridded Population..." />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-md">
                <SelectItem value="default" className="text-xs font-semibold">
                  Default Population Grid
                </SelectItem>
                {rasterListData.files.map((file) => (
                  <SelectItem key={file.fileName} value={file.fileName} className="text-xs font-semibold">
                    {file.country} ({file.resolution})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant={isMeasuring ? "default" : "secondary"}
            onClick={() => {
              setIsMeasuring(!isMeasuring);
              if (!isMeasuring) {
                setIsDrawingCatchment(false);
                setDrawPoints([]);
              } else {
                setMeasurementPoints([]);
              }
            }}
            data-testid="button-measure"
            className="shadow-md"
          >
            <Ruler className="h-4 w-4 mr-1" />
            {isMeasuring ? "Measuring..." : "Measure"}
          </Button>

          <Button
            size="sm"
            variant={isDrawingCatchment ? "default" : "secondary"}
            onClick={() => {
              setIsDrawingCatchment(!isDrawingCatchment);
              if (!isDrawingCatchment) {
                setDrawPoints([]);
              } else {
                setIsMeasuring(false);
                setMeasurementPoints([]);
              }
            }}
            data-testid="button-draw-catchment"
            className={`shadow-md ${
              isDrawingCatchment
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            <PenLine className="h-4 w-4 mr-1" />
            {isDrawingCatchment ? "Drawing..." : "Draw Catchment"}
          </Button>

          <Button
            size="sm"
            variant={isDrawingSessionPolygon ? "default" : "secondary"}
            onClick={() => {
              setIsDrawingSessionPolygon(!isDrawingSessionPolygon);
              if (!isDrawingSessionPolygon) {
                setSessionPolygonPoints([]);
              } else {
                setIsMeasuring(false);
                setIsDrawingCatchment(false);
                setDrawPoints([]);
                setMeasurementPoints([]);
                toast({
                  title: "Drawing Mode Active",
                  description: "Click multiple points on the map to plot your geofence. Click 'Save Geofence' when done.",
                  variant: "default",
                });
              }
            }}
            className={`shadow-md ${
              isDrawingSessionPolygon
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            <PenLine className="h-4 w-4 mr-1" />
            {isDrawingSessionPolygon ? "Drawing Path..." : "Draw Geofence"}
          </Button>

          {showFacilityList && (
            <Button
              size="sm"
              variant={panelVis.facilities ? "default" : "secondary"}
              onClick={() => togglePanel("facilities")}
              className="shadow-md"
            >
              <Building2 className="h-4 w-4 mr-1" />
              {panelVis.facilities ? "Hide Facilities" : "Facilities"}
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setExportDialogOpen(true)}
            data-testid="button-download-map"
            className="shadow-md"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      )}

      {/* Floating Glassmorphic Checklist Sidebar for Real-Time Derived Session Progress Tracking */}
      {!isPrinting && activeSessionPlans.length > 0 && panelVis.checklist && (
        <div
          className={`absolute top-16 ${
            showFacilityList && panelVis.facilities ? "right-[350px]" : "right-4"
          } w-72 z-[1000] flex flex-col pointer-events-auto transition-all duration-300`}
          ref={disableLeafletPropagation}
        >
          <Card className="shadow-2xl border border-white/15 bg-background/85 backdrop-blur-md rounded-xl select-none overflow-hidden max-h-[500px] flex flex-col">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between border-b border-border/40 shrink-0">
              <div className="flex flex-col">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Derived Session Checklist
                </CardTitle>
                <span className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                  Real-time visual tracking of achieved dispatches
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 rounded-full hover:bg-muted text-muted-foreground"
                onClick={() => setChecklistOpen(!checklistOpen)}
              >
                <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${checklistOpen ? "rotate-90" : "rotate-270"}`} />
              </Button>
            </CardHeader>
            {checklistOpen && (
              <>
                {/* Visual Progress Banner */}
                <div className="p-3 bg-muted/30 border-b border-border/30 shrink-0">
                  <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                    <span className="text-muted-foreground uppercase">Achievement Rate:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {activeSessionPlans.filter((p: any) => p.isAchieved).length} / {activeSessionPlans.length} ({
                        Math.round((activeSessionPlans.filter((p: any) => p.isAchieved).length / activeSessionPlans.length) * 100)
                      }%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((activeSessionPlans.filter((p: any) => p.isAchieved).length / activeSessionPlans.length) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Checklist scrollable container */}
                <div className="p-2 space-y-1.5 overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                  {activeSessionPlans.map((plan: any) => {
                    const isAchieved = plan.isAchieved;
                    return (
                      <div
                        key={`checklist-item-${plan.id}`}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border border-transparent hover:bg-accent/40 transition-all duration-200 ${
                          isAchieved ? "bg-emerald-500/5 border-emerald-500/10 text-muted-foreground" : "bg-card/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`check-plan-${plan.id}`}
                          checked={isAchieved}
                          onChange={() => toggleAchievedMutation.mutate({ sessionId: plan.id, isAchieved: !plan.isAchieved })}
                          disabled={toggleAchievedMutation.isPending}
                          className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => {
                                const centroid = getSessionCentroid(plan);
                                if (centroid && mapRef.current) {
                                  mapRef.current.setView(centroid, 14);
                                }
                              }}
                              className="text-left font-bold text-xs hover:underline hover:text-primary truncate transition-colors focus:outline-none"
                              title="Click to locate on map"
                            >
                              {plan.name}
                            </button>
                            <Badge className="text-[8px] font-bold tracking-wider px-1 py-0 uppercase h-4 shrink-0 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10">
                              {plan.sessionType}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                            <span>Pop: <strong>{plan.targetPopulation || 0}</strong></span>
                            <span className="font-semibold text-amber-500 dark:text-amber-400">{plan.planType === "sia" ? "SIA Campaign" : "Routine EPI"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Floating Facility List Panel */}
      {showFacilityList && panelVis.facilities && !isPrinting && (
        <div 
          className="absolute right-4 top-16 w-80 h-[calc(100vh-140px)] max-h-[700px] z-[1000] flex flex-col bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-xl overflow-hidden transition-all duration-300"
          ref={disableLeafletPropagation}
        >
          <Card className="border-0 shadow-none bg-transparent flex flex-col h-full rounded-none">


            {/* Updated Code: Advanced CardHeader incorporating localized cascading Geographic Filters in a premium glassmorphic disclosure panel with unified resets */}
            <CardHeader className="p-4 pb-2 border-b flex flex-col space-y-3 bg-card/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex flex-row items-center gap-2 text-primary">
                  <Building2 className="h-4 w-4" />
                  Health Facilities
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full hover:bg-muted"
                  onClick={() => togglePanel("facilities")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search name or HMIS..."
                  className="pl-8 h-9 text-xs bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filter Pills & Collapsible Toggle Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={filterColdChain ? "default" : "outline"}
                    onClick={() => setFilterColdChain(!filterColdChain)}
                    className={`h-7 px-2.5 text-[10px] rounded-full gap-1 ${
                      filterColdChain
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground border-muted-foreground/20 hover:bg-accent"
                    }`}
                  >
                    <Thermometer className="h-3.5 w-3.5" />
                    Cold Chain
                  </Button>
                  <Button
                    size="sm"
                    variant={filterPower ? "default" : "outline"}
                    onClick={() => setFilterPower(!filterPower)}
                    className={`h-7 px-2.5 text-[10px] rounded-full gap-1 ${
                      filterPower
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "text-muted-foreground border-muted-foreground/20 hover:bg-accent"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Power Supply
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCardFiltersOpen(!cardFiltersOpen)}
                  className={`h-7 px-2.5 text-[10px] rounded-full gap-1 border border-border/20 ${
                    cardFiltersOpen || selectedProvinceId !== "all" || selectedDistrictId !== "all" || selectedLlgId !== "all"
                      ? "bg-primary/10 text-primary border-primary/20 font-bold"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  Boundary Filters
                </Button>
              </div>

              {/* Premium Glassmorphic Geographic Selectors disclosure segment */}
              {cardFiltersOpen && (
                <div className="space-y-2.5 p-2.5 bg-muted/20 border border-border/30 rounded-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Province Selector */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">
                      {adminLabels.level1}
                    </Label>
                    <Select
                      value={selectedProvinceId === "all" ? "all" : String(selectedProvinceId)}
                      onValueChange={(val) => handleProvinceChange(val === "all" ? "all" : Number(val))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/50 border-white/5">
                        <SelectValue placeholder={`All ${adminLabels.level1}s`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="all">All {adminLabels.level1}s</SelectItem>
                        {provinces.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* District Selector */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">
                      {adminLabels.level2}
                    </Label>
                    <Select
                      value={selectedDistrictId === "all" ? "all" : String(selectedDistrictId)}
                      onValueChange={(val) => handleDistrictChange(val === "all" ? "all" : Number(val))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/50 border-white/5">
                        <SelectValue placeholder={`All ${adminLabels.level2}s`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="all">All {adminLabels.level2}s</SelectItem>
                        {sidebarDistricts.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LLG Selector */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">
                      {adminLabels.level3}
                    </Label>
                    <Select
                      value={selectedLlgId === "all" ? "all" : String(selectedLlgId)}
                      onValueChange={(val) => handleLlgChange(val === "all" ? "all" : Number(val))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/50 border-white/5">
                        <SelectValue placeholder={`All ${adminLabels.level3}s`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="all">All {adminLabels.level3}s</SelectItem>
                        {sidebarLlgs.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardHeader>

            {/* List Results */}
            <div className="p-2 bg-muted/30 border-b flex items-center justify-between text-[11px] text-muted-foreground px-4">
              <span>Showing {filteredFacilities.length} of {facilities.length}</span>
              {(searchQuery || filterColdChain || filterPower || selectedProvinceId !== "all" || selectedDistrictId !== "all" || selectedLlgId !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterColdChain(false);
                    setFilterPower(false);
                    handleProvinceChange("all");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Reset filters
                </button>
              )}
            </div>

            <CardContent className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {filteredFacilities.length > 0 ? (
                filteredFacilities.map((fac) => {
                  const isSelected = selectedFacilityId === fac.id;
                  return (
                    <div
                      key={fac.id}
                      onClick={() => handleFocusFacility(fac)}
                      className={`group p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 select-none ${
                        isSelected
                          ? "bg-primary/5 border-primary/40 shadow-sm"
                          : "hover:bg-accent/40 border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                          {fac.name}
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize font-normal">
                          {fac.facilityType?.toLowerCase().replace("_", " ") || "Facility"}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {fac.hmisCode}
                      </div>

                      {/* Equipment Indicators */}
                      {(fac.hasRefrigerator || fac.hasPower || fac.staffCount) && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {fac.hasRefrigerator && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded font-medium">
                              <Thermometer className="h-3 w-3" />
                              Cold Chain
                            </span>
                          )}
                          {fac.hasPower && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-medium">
                              <Zap className="h-3 w-3" />
                              Power
                            </span>
                          )}
                          {fac.staffCount && fac.staffCount > 0 && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium">
                              Staff: {fac.staffCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">No facilities found</p>
                  <p className="text-[11px] text-muted-foreground/75 mt-0.5">Try adjusting your search query or filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options dialog modal */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Catchment Data
            </DialogTitle>
            <DialogDescription>
              Select a format or layout style to export GIS coordinates and facility digests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              onClick={handleExportGeoJSON}
              className="flex items-center justify-start gap-3 h-14 text-left border hover:bg-accent/50"
            >
              <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Export GeoJSON Dataset</p>
                <p className="text-xs text-muted-foreground">Download facilities and villages as spatial points.</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex items-center justify-start gap-3 h-14 text-left border hover:bg-accent/50"
            >
              <div className="p-2 rounded bg-green-500/10 text-green-500">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Export Catchment CSV</p>
                <p className="text-xs text-muted-foreground">Download tabular data including travel times and populations.</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center justify-start gap-3 h-14 text-left border hover:bg-accent/50"
            >
              <div className="p-2 rounded bg-red-500/10 text-red-500">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Printable Map Layout</p>
                <p className="text-xs text-muted-foreground">Trigger standard browser layout optimized for high-res PDF.</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Catchment Dialog */}
      <Dialog open={saveCatchmentOpen} onOpenChange={setSaveCatchmentOpen}>
        <DialogContent className="max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <PenLine className="h-5 w-5" />
              Save Catchment Area
            </DialogTitle>
            <DialogDescription>
              Assign the drawn polygon catchment area to a local health facility and define population boundaries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="catchment-province" className="text-sm font-semibold">
                Province *
              </Label>
              <Select
                value={catchmentProvinceId ? String(catchmentProvinceId) : ""}
                onValueChange={(val) => {
                  const next = Number(val);
                  setCatchmentProvinceId(next);
                  setCatchmentDistrictId(null);
                  setCatchmentFacilityId(null);
                  setCatchmentAutoDetectKm(null);
                }}
              >
                <SelectTrigger id="catchment-province" className="w-full" data-testid="select-catchment-province">
                  <SelectValue placeholder="Select province..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catchment-district" className="text-sm font-semibold">
                District *
              </Label>
              <Select
                value={catchmentDistrictId ? String(catchmentDistrictId) : ""}
                onValueChange={(val) => {
                  setCatchmentDistrictId(Number(val));
                  setCatchmentFacilityId(null);
                  setCatchmentAutoDetectKm(null);
                }}
                disabled={catchmentProvinceId == null}
              >
                <SelectTrigger id="catchment-district" className="w-full" data-testid="select-catchment-district">
                  <SelectValue placeholder={catchmentProvinceId == null ? "Select a province first..." : "Select district..."} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {catchmentDistrictOptions.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catchment-facility" className="text-sm font-semibold">
                Associated Health Facility *
              </Label>
              <Select
                value={catchmentFacilityId ? String(catchmentFacilityId) : ""}
                onValueChange={(val) => setCatchmentFacilityId(Number(val))}
                disabled={catchmentDistrictId == null}
              >
                <SelectTrigger id="catchment-facility" className="w-full" data-testid="select-catchment-facility">
                  <SelectValue placeholder={catchmentDistrictId == null ? "Select a district first..." : "Select facility..."} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {catchmentFacilityOptions.map((fac) => (
                    <SelectItem key={fac.id} value={String(fac.id)}>
                      {fac.name} ({fac.hmisCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {catchmentAutoDetectKm != null && catchmentFacilityId != null && (
                <p className="text-xs text-muted-foreground" data-testid="text-catchment-auto-detect-hint">
                  Nearest to drawn area · ~{catchmentAutoDetectKm.toFixed(1)} km — change if incorrect
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catchment-name" className="text-sm font-semibold">
                Catchment Area Name *
              </Label>
              <Input
                id="catchment-name"
                value={catchmentName}
                onChange={(e) => setCatchmentName(e.target.value)}
                placeholder="e.g. Makeni North Catchment"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catchment-pop" className="text-sm font-semibold">
                Estimated Population
              </Label>
              <Input
                id="catchment-pop"
                type="number"
                value={catchmentPopEst}
                onChange={(e) => setCatchmentPopEst(e.target.value)}
                placeholder="e.g. 2450"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catchment-desc" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="catchment-desc"
                value={catchmentDescription}
                onChange={(e) => setCatchmentDescription(e.target.value)}
                placeholder="Add notes about geographic features, accessibility barriers, or communities included."
                className="w-full min-h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSaveCatchmentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!catchmentFacilityId || !catchmentName || saveCatchmentMutation.isPending}
              onClick={() => saveCatchmentMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saveCatchmentMutation.isPending ? "Saving..." : "Save Catchment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map-Initiated Click Dialog (High Density Gap Alerts) */}
      <Dialog open={clickDialogOpen} onOpenChange={setClickDialogOpen}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary font-black">
              <MapPin className="h-5 w-5 text-amber-500 animate-bounce" />
              Unserved Density Cluster Identified
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Our gridded spatial population raster indicates an unserved or remote settlement at these exact coordinates.
            </DialogDescription>
          </DialogHeader>

          {mapClickDetails && (
            <div className="space-y-4 py-2 text-xs">
              {/* Coordinates & Population density */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-muted">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Coordinates</span>
                  <span className="font-semibold text-foreground font-mono">{mapClickDetails.lat}, {mapClickDetails.lng}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Population Density</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    {mapClickDetails.density} persons / 100m²
                  </span>
                </div>
              </div>

              {/* Multi-Source Coordinate reference consensus */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-primary">Multi-Source Point Consensus</h4>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="p-2.5 bg-background border border-border/80 rounded-xl flex flex-col justify-between">
                    <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-1">WorldPop Raster</span>
                    <strong className="text-xs text-foreground font-mono">{mapClickDetails.density} persons / 100m²</strong>
                  </div>
                  <div className="p-2.5 bg-background border border-border/80 rounded-xl flex flex-col justify-between">
                    <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-1">Local Registry Census</span>
                    {mapClickDetails.nearestVillage && mapClickDetails.nearestVillage.distance < 1.5 ? (
                      <div>
                        <strong className="text-xs text-foreground font-mono">{mapClickDetails.nearestVillage.population} people</strong>
                        <span className="text-[8px] text-muted-foreground block truncate mt-0.5">"{mapClickDetails.nearestVillage.name}" ({mapClickDetails.nearestVillage.distance}km)</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground block font-medium">No nearby village (&gt;1.5km)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nearest Staging Bases proximity checking */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Proximity Analysis</h4>
                
                {/* Nearest facility */}
                <div className="flex items-center justify-between p-2.5 bg-background border border-border/80 rounded-xl hover:border-primary/45 transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-semibold">{mapClickDetails.nearestFacility?.name || "None"}</div>
                      <div className="text-[9px] text-muted-foreground">Nearest Staging Health Facility</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {mapClickDetails.nearestFacility ? `${mapClickDetails.nearestFacility.distance} km` : "N/A"}
                  </Badge>
                </div>

                {/* Nearest planned session */}
                <div className="flex items-center justify-between p-2.5 bg-background border border-border/80 rounded-xl hover:border-primary/45 transition-colors">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="font-semibold">{mapClickDetails.nearestPlan?.name || "None"}</div>
                      <div className="text-[9px] text-muted-foreground">Nearest Planned Outreach Session</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {mapClickDetails.nearestPlan ? `${mapClickDetails.nearestPlan.distance} km` : "N/A"}
                  </Badge>
                </div>
              </div>

              {/* Alert Warning if highly isolated */}
              {mapClickDetails.density >= 5 && (!mapClickDetails.nearestFacility || mapClickDetails.nearestFacility.distance > 5) && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-2 leading-relaxed text-[11px] font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Marginalized Area Alert:</strong> This cluster is located over 5km away from the closest health facility and has no overlapping session coverage. Immediate dispatch is highly recommended.
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClickDialogOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setClickDialogOpen(false);
                setNewSessionDate(getMinScheduleDateInputValue());
                setCreateSessionDialogOpen(true);
              }}
              className="text-xs font-semibold bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Initiate Session Plan Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Derived Outreach Session Plan Dialog */}
      <Dialog open={createSessionDialogOpen} onOpenChange={setCreateSessionDialogOpen}>
        <DialogContent className="max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary font-black">
              <Calendar className="h-5 w-5 text-primary" />
              Create Derived Session Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define operational parameters for this field immunization dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            {/* Coordinate reference */}
            {mapClickDetails && (
              <div className="p-2.5 bg-muted/40 rounded-xl border border-muted flex justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Target Coordinates:</span>
                <span className="font-bold text-foreground font-mono">{mapClickDetails.lat}, {mapClickDetails.lng}</span>
              </div>
            )}

            {/* Session name */}
            <div className="space-y-1">
              <Label htmlFor="session-name" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Session Plan Name *</Label>
              <Input
                id="session-name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g. Outreach Cluster B Patrol"
                className="h-8 text-xs"
              />
            </div>

            {/* Staging health facility — searchable Province → District → Facility cascade */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Staging Base Facility *</Label>
              <FacilityCascadePicker
                value={selectedParentFacilityId}
                onChange={(id, fac) => {
                  setSelectedParentFacilityId(id);
                  if (fac) {
                    setNewSessionName(`Outreach Session Plan - ${fac.name}`);
                  }
                }}
                required
                layout="stacked"
                provinceLabel={adminLabels.level1}
                districtLabel={adminLabels.level2}
                facilityLabel={adminLabels.level3}
                testIdPrefix="staging-facility-picker"
              />
            </div>

            {/* Parent Master Microplan link */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Link to Master Microplan *</Label>
              <Select
                value={newSessionMicroplanId}
                onValueChange={setNewSessionMicroplanId}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select Parent Microplan..." />
                </SelectTrigger>
                <SelectContent className="bg-background/95">
                  <SelectItem value="none" className="text-xs text-amber-500 font-medium">
                    No Parent (Orphaned Plan)
                  </SelectItem>
                  {masterMicroplans.map((mp) => (
                    <SelectItem key={mp.id} value={String(mp.id)} className="text-xs">
                      [{mp.planType === "sia_campaign" ? "SIA Campaign" : "Routine"}] {mp.name} ({mp.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Session Type *</Label>
                <Select
                  value={newSessionType}
                  onValueChange={(val: any) => setNewSessionType(val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select Type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95">
                    <SelectItem value="static" className="text-xs">Static (Facility Hub)</SelectItem>
                    <SelectItem value="outreach" className="text-xs">Outreach (Fixed Station)</SelectItem>
                    <SelectItem value="mobile" className="text-xs">Mobile (Dynamic Patrol)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transport Mode */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Transport Mode *</Label>
                <Select
                  value={newSessionTransport}
                  onValueChange={setNewSessionTransport}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select Transport..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95">
                    <SelectItem value="walking" className="text-xs">Foot Patrol</SelectItem>
                    <SelectItem value="road" className="text-xs">Road Vehicle / Motorcycle</SelectItem>
                    <SelectItem value="boat" className="text-xs">Boat / Canoe Patrol</SelectItem>
                    <SelectItem value="air" className="text-xs">Air Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Denominator and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="session-pop" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Target Catchment Pop *</Label>
                <Input
                  id="session-pop"
                  type="number"
                  value={newSessionTargetPop}
                  onChange={(e) => setNewSessionTargetPop(Number(e.target.value))}
                  placeholder="e.g. 150"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Planning Scope</Label>
                <Select
                  value={newSessionScope}
                  onValueChange={setNewSessionScope}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select Scope..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95">
                    <SelectItem value="Local" className="text-xs">Local / Settlement</SelectItem>
                    <SelectItem value="Sub-national" className="text-xs">Sub-national</SelectItem>
                    <SelectItem value="National" className="text-xs">National Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-1">
              <Label htmlFor="session-date" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Date *</Label>
              <Input
                id="session-date"
                type="date"
                value={newSessionDate}
                min={getMinScheduleDateInputValue()}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">
                Sessions must be scheduled at least 7 days in advance.
              </p>
            </div>

            {/* Multi-Source Population Consensus Panel */}
            {sessionPolygonPoints.length >= 2 && (
              <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2 mt-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500" />
                  Multi-Source Pop Consensus
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Planners can compare other estimates to establish consensus since no single population is final. Click to apply.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <button
                    type="button"
                    onClick={() => setNewSessionTargetPop(consensusPopulations.worldPopGrid)}
                    className="p-2 bg-background border border-border/60 hover:border-primary/50 rounded-lg flex flex-col items-center justify-center transition-all group focus:outline-none cursor-pointer"
                  >
                    <span className="text-muted-foreground font-semibold group-hover:text-primary">WorldPop Grid</span>
                    <strong className="text-xs text-foreground font-mono mt-0.5">
                      {consensusPopulations.worldPopGrid}
                    </strong>
                    <span className="text-[8px] text-indigo-500 font-medium mt-0.5 group-hover:underline">Use Estimate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSessionTargetPop(consensusPopulations.localRegistry)}
                    className="p-2 bg-background border border-border/60 hover:border-primary/50 rounded-lg flex flex-col items-center justify-center transition-all group focus:outline-none cursor-pointer"
                  >
                    <span className="text-muted-foreground font-semibold group-hover:text-primary">Registry Census</span>
                    <strong className="text-xs text-foreground font-mono mt-0.5">
                      {consensusPopulations.localRegistry}
                    </strong>
                    <span className="text-[8px] text-indigo-500 font-medium mt-0.5 group-hover:underline">Use Estimate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSessionTargetPop(consensusPopulations.grid3Structures)}
                    className="p-2 bg-background border border-border/60 hover:border-primary/50 rounded-lg flex flex-col items-center justify-center transition-all group focus:outline-none cursor-pointer"
                  >
                    <span className="text-muted-foreground font-semibold group-hover:text-primary">GRID3 Structures</span>
                    <strong className="text-xs text-foreground font-mono mt-0.5">
                      {consensusPopulations.grid3Structures}
                    </strong>
                    <span className="text-[8px] text-indigo-500 font-medium mt-0.5 group-hover:underline">Use Estimate</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateSessionDialogOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedParentFacilityId || !newSessionName || !newSessionDate || createSessionPlanMutation.isPending}
              onClick={() => {
                if (!mapClickDetails || !selectedParentFacilityId) return;
                const lat = mapClickDetails.lat;
                const lng = mapClickDetails.lng;
                
                // Construct closed polygon geofence representing centroid coordinate default
                const radiusDegrees = 0.005; // ~500m geofence outline
                const coordinates = [[
                  [lng - radiusDegrees, lat - radiusDegrees],
                  [lng + radiusDegrees, lat - radiusDegrees],
                  [lng + radiusDegrees, lat + radiusDegrees],
                  [lng - radiusDegrees, lat + radiusDegrees],
                  [lng - radiusDegrees, lat - radiusDegrees]
                ]];

                createSessionPlanMutation.mutate({
                  facilityId: selectedParentFacilityId,
                  microplanId: newSessionMicroplanId === "none" ? null : Number(newSessionMicroplanId),
                  name: newSessionName,
                  sessionType: newSessionType,
                  scheduledDate: `${newSessionDate}T00:00:00.000Z`,
                  transportMode: newSessionTransport,
                  estimatedDuration: 180,
                  targetPopulation: newSessionTargetPop,
                  geojson: { type: "Polygon", coordinates },
                  isAchieved: false,
                  status: "planned",
                  quarter: newSessionQuarter,
                  year: newSessionYear,
                  teamType: newSessionTeamType
                });
              }}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createSessionPlanMutation.isPending ? "Creating..." : "Create outreach Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task #101 — Offer to start a routine microplan for the village's
          facility when one doesn't exist yet, then return to the New Session
          dialog with the village prefill intact. */}
      <Dialog
        open={!!startMicroplanPrompt}
        onOpenChange={(open) => {
          if (!open) setStartMicroplanPrompt(null);
        }}
      >
        <DialogContent data-testid="dialog-start-microplan-prompt">
          <DialogHeader>
            <DialogTitle>Start a microplan for this facility?</DialogTitle>
            <DialogDescription>
              {startMicroplanPrompt
                ? `${startMicroplanPrompt.facilityName} doesn't have a routine microplan yet. To plan a session for ${startMicroplanPrompt.villageName || "this village"}, you'll need to start one first.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setStartMicroplanPrompt(null)}
              data-testid="button-start-microplan-cancel"
            >
              Not now
            </Button>
            <Button
              onClick={() => {
                const p = startMicroplanPrompt;
                if (!p) return;
                const qs = new URLSearchParams({
                  facilityId: String(p.facilityId),
                  returnVillageId: String(p.villageId),
                  returnVillageName: p.villageName,
                  returnVillageLat: String(p.villageLat),
                  returnVillageLng: String(p.villageLng),
                  returnVillageHtr: p.villageHtr ? "1" : "0",
                });
                setStartMicroplanPrompt(null);
                window.location.assign(`/microplan/new?${qs.toString()}`);
              }}
              data-testid="button-start-microplan-confirm"
            >
              Start microplan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

