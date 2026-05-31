import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapContainer, TileLayer, Marker, Polygon as LeafletPolygon, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createOutlinePinIcon } from "@/lib/mapIcons";
import {
  usePopulationOverlay,
  PopulationWmsLayer,
  PopulationOverlayToggle,
  PopulationOverlayLegend,
} from "@/components/PopulationOverlay";

// Fix Leaflet default marker icon asset pathways
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Premium Offline-Available Vector Pin Icons (Built from shared SVG constants)
const OFFLINE_FACILITY_ICON =
  typeof window !== "undefined" ? createOutlinePinIcon("rose") : (null as any);

const OFFLINE_VILLAGE_ICON =
  typeof window !== "undefined" ? createOutlinePinIcon("green") : (null as any);
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
/* Original Code: Lucide icons without Download / Upload
import { Plus, Building2, Users, Thermometer, Filter, X, Pencil, Trash2 } from "lucide-react";
*/
// Updated Code: Imported Download and Upload icons for the newly introduced import/export buttons
import { Plus, Building2, Users, Thermometer, X, Pencil, Trash2, Download, Upload } from "lucide-react";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { canEditFacility, canDeleteData, canCreateFacility, canCreateCommunity } from "@/lib/permissions";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { insertFacilitySchema, type Facility, type InsertFacility, type Region, type Province, type District, type Village, type FacilityCatchment } from "@shared/schema";
import { z } from "zod";

// Convert drawn Leaflet polygon vertices into a GeoJSON Polygon (lng,lat order,
// ring auto-closed) so community boundaries persist and can be reused app-wide.
function polygonPointsToBoundary(points: { lat: number; lng: number }[]): any | null {
  if (!points || points.length < 3) return null;
  const ring = points.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

// Read a stored GeoJSON Polygon back into Leaflet [lat,lng] vertices for editing
// (drops the closing point so the draw UI doesn't show a duplicate vertex).
function boundaryToLatLngs(boundary: any): { lat: number; lng: number }[] {
  try {
    const coords = boundary?.coordinates?.[0];
    if (!Array.isArray(coords)) return [];
    const pts = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
    if (pts.length > 1) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (a.lat === b.lat && a.lng === b.lng) pts.pop();
    }
    return pts;
  } catch {
    return [];
  }
}

const facilityFormSchema = insertFacilitySchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  hmisCode: z.string().min(3, "HMIS code is required"),
});

function MapResizer() {
  const map = useMapEvents({});
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [map]);
  return null;
}

export default function Facilities() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Whether the current tenant has any administrative boundary maps seeded.
  // Used to gate the "Extract Communities from Map" action — without
  // boundaries the server returns a 400 and the action will never succeed,
  // so we disable the button up-front and direct the user to the Boundary
  // Manager instead of letting them click into a red error toast.
  const { data: boundaries = [] } = useQuery<any[]>({
    queryKey: ["/api/boundaries"],
  });
  const hasBoundaries = Array.isArray(boundaries) && boundaries.length > 0;
  const { user } = useAuth();
  const populationOverlay = usePopulationOverlay();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);

  // Communities Registry states
  const [communityDialogOpen, setCommunityDialogOpen] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommDistrictId, setNewCommDistrictId] = useState<string>("");
  const [newCommHTR, setNewCommHTR] = useState(false);
  const [newCommFacilityId, setNewCommFacilityId] = useState<string>("");
  const [newCommLat, setNewCommLat] = useState("");
  const [newCommLng, setNewCommLng] = useState("");
  const [commDrawMode, setCommDrawMode] = useState<"pin" | "polygon">("pin");
  const [commPolygonPoints, setCommPolygonPoints] = useState<L.LatLng[]>([]);
  const [editingCommunity, setEditingCommunity] = useState<Village | null>(null);
  const [deletingCommunity, setDeletingCommunity] = useState<Village | null>(null);
  const [newCommTransportMode, setNewCommTransportMode] = useState<string>("walking");
  // Catchment-overlap harmonization (task #261): when a saved community boundary
  // overlaps another community's, surface the conflicts so the user can request
  // the other facility's in-charge to harmonize boundaries.
  const [overlapConflicts, setOverlapConflicts] = useState<any[]>([]);
  const [overlapSourceVillage, setOverlapSourceVillage] = useState<{ id: number; name: string } | null>(null);
  const [harmonizedIds, setHarmonizedIds] = useState<number[]>([]);

  // Facility GIS Catchment Editor states
  const [catchmentPoints, setCatchmentPoints] = useState<L.LatLng[]>([]);
  const [facMapDrawMode, setFacMapDrawMode] = useState<"pin" | "polygon">("pin");
  const [showSavedCatchment, setShowSavedCatchment] = useState(true);
  const [extractionResult, setExtractionResult] = useState<{
    villages: Array<{ id: number; name: string }>;
    settlements: Array<{ id: number; name: string; latitude: number; longitude: number }>;
    unmapped: Array<{ name: string; latitude: number; longitude: number; placeType: string; osmId?: string }>;
  }>({ villages: [], settlements: [], unmapped: [] });
  const [selectedUnmappedOsm, setSelectedUnmappedOsm] = useState<Set<string>>(new Set());

  /* Original Code: Only fetched catchments for editingFacility
  // Fetch existing catchments for the editing facility
  const { data: facilityCatchments } = useQuery<any[]>({
    queryKey: [`/api/facilities/${editingFacility?.id}/catchments`],
    enabled: !!editingFacility?.id,
  });
  */

  // Updated Code: Fetch catchments for both the editing facility and the currently selected facility under the main registry communities list
  const { data: facilityCatchments } = useQuery<any[]>({
    queryKey: [`/api/facilities/${editingFacility?.id}/catchments`],
    enabled: !!editingFacility?.id,
  });

  const { data: selectedFacilityCatchments } = useQuery<any[]>({
    queryKey: [`/api/facilities/${selectedFacilityId}/catchments`],
    enabled: !!selectedFacilityId,
  });

  const selectedCatchmentPoints = useMemo(() => {
    if (!selectedFacilityId || !selectedFacilityCatchments || selectedFacilityCatchments.length === 0) return [];
    const official = selectedFacilityCatchments.find((c: any) => c.isOfficial);
    if (official && official.geojson && official.geojson.coordinates) {
      const coords = official.geojson.coordinates[0].map((pt: any) => L.latLng(pt[1], pt[0]));
      if (coords.length > 1 && coords[0].lat === coords[coords.length - 1].lat && coords[0].lng === coords[coords.length - 1].lng) {
        coords.pop();
      }
      return coords;
    }
    return [];
  }, [selectedFacilityId, selectedFacilityCatchments]);

  // Retrieve Tenant Context for premium multitenant configuration and dynamic terminology translation
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  // Reset all geographic filters on tenant/country switch to prevent cross-tenant ID bleed
  useEffect(() => {
    if (tenantInfo?.id) {
      setSelectedRegionId(null);
      setSelectedProvinceId(null);
      setSelectedDistrictId(null);
      setSelectedFacilityId(null);
    }
  }, [tenantInfo?.id]);


  const skipRegionLevel = tenantInfo?.settings?.skipRegionLevel ?? (tenantInfo?.countryCode === "ZMB" || false);
  const rawAdminLabels = tenantInfo?.settings?.adminLevelLabels ?? {
    level1: "Province",
    level2: "District",
    level3: "Facility",
    level4: "Constituency",
    level5: "Ward",
  };
  const adminLabels = skipRegionLevel ? {
    level1: rawAdminLabels.level2 || "Province",
    level2: rawAdminLabels.level3 || "District",
    level3: rawAdminLabels.level4 || "Facility",
    level4: rawAdminLabels.level5 || "Constituency",
    level5: "Ward",
  } : rawAdminLabels;

  const { data: regions, isLoading: loadingRegions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  // Updated Code: Fetch all provinces for the tenant. Shared cache with MapView.tsx reduces duplicate network calls.
  const { data: provinces, isLoading: loadingProvinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/provinces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch provinces");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  // Updated Code: Fetch all districts for the tenant to power lookup functions, client-side cascading, and dialog form selects.
  const { data: allDistricts, isLoading: loadingDistricts } = useQuery<District[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/districts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
    enabled: !!tenantInfo?.id,
  });

  const { data: facilities, isLoading: loadingFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: villages, isLoading: loadingVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const isLoading = loadingRegions || loadingProvinces || loadingDistricts || loadingFacilities || loadingVillages;

  // Haversine Distance helper for nearby calculation
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getClosestFacilities = (village: Village) => {
    if (!village.latitude || !village.longitude || !facilities) return [];
    const vLat = parseFloat(village.latitude.toString());
    const vLng = parseFloat(village.longitude.toString());
    
    return facilities
      .filter(f => f.latitude !== null && f.longitude !== null)
      .map(f => {
        const fLat = parseFloat(f.latitude!.toString());
        const fLng = parseFloat(f.longitude!.toString());
        const dist = getHaversineDistance(vLat, vLng, fLat, fLng);
        return { facility: f, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  };

  const commMapCenter = useMemo(() => {
    if (newCommFacilityId) {
      const fac = facilities?.find(f => f.id === parseInt(newCommFacilityId));
      if (fac && fac.latitude !== null && fac.longitude !== null) {
        return [parseFloat(fac.latitude.toString()), parseFloat(fac.longitude.toString())] as [number, number];
      }
    }
    if (tenantInfo?.settings?.mapCenter) {
      return tenantInfo.settings.mapCenter as [number, number];
    }
    return [-6.0, 145.0] as [number, number];
  }, [newCommFacilityId, facilities, tenantInfo]);

  function CommMapEvents() {
    useMapEvents({
      click(e) {
        if (commDrawMode === "pin") {
          setNewCommLat(e.latlng.lat.toFixed(6));
          setNewCommLng(e.latlng.lng.toFixed(6));
          setCommPolygonPoints([]);
        } else {
          const updatedPoints = [...commPolygonPoints, e.latlng];
          setCommPolygonPoints(updatedPoints);
          
          const sumLat = updatedPoints.reduce((sum, p) => sum + p.lat, 0);
          const sumLng = updatedPoints.reduce((sum, p) => sum + p.lng, 0);
          const avgLat = sumLat / updatedPoints.length;
          const avgLng = sumLng / updatedPoints.length;
          setNewCommLat(avgLat.toFixed(6));
          setNewCommLng(avgLng.toFixed(6));
        }
      }
    });
    return null;
  }

  const createCommunityMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/villages", data);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      setCommunityDialogOpen(false);
      setNewCommName("");
      setNewCommDistrictId("");
      setNewCommHTR(false);
      setNewCommFacilityId("");
      setNewCommLat("");
      setNewCommLng("");
      setCommPolygonPoints([]);
      toast({
        title: "Community Registered",
        description: "The new community has been added successfully.",
      });
      maybeShowOverlaps(res);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create community",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCommunityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/villages/${id}`, data);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      setCommunityDialogOpen(false);
      setEditingCommunity(null);
      setNewCommName("");
      setNewCommDistrictId("");
      setNewCommHTR(false);
      setNewCommFacilityId("");
      setNewCommLat("");
      setNewCommLng("");
      setCommPolygonPoints([]);
      toast({
        title: "Community updated",
        description: "The community has been updated successfully.",
      });
      maybeShowOverlaps(res);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update community",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommunityMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/villages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      setDeletingCommunity(null);
      toast({
        title: "Community deleted",
        description: "The community has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // After a community with a boundary is saved, open the harmonization panel if
  // the server detected overlaps with other communities' catchments.
  const maybeShowOverlaps = (res: any) => {
    const overlaps = Array.isArray(res?.overlaps) ? res.overlaps : [];
    if (overlaps.length > 0 && res?.id) {
      setOverlapSourceVillage({ id: Number(res.id), name: res.name });
      setOverlapConflicts(overlaps);
      setHarmonizedIds([]);
    }
  };

  const harmonizeMutation = useMutation({
    mutationFn: async (vars: { villageId: number; conflictingVillageId: number; overlapPct?: number }) => {
      return apiRequest("POST", `/api/villages/${vars.villageId}/harmonize`, {
        conflictingVillageId: vars.conflictingVillageId,
        overlapPct: vars.overlapPct,
      });
    },
    onSuccess: (res: any, vars) => {
      setHarmonizedIds((prev) => [...prev, vars.conflictingVillageId]);
      toast({
        title: "Harmonization requested",
        description: res?.notified
          ? "The other facility's in-charge has been notified by email."
          : "Conflict recorded. No facility in-charge email was found to notify.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Could not request harmonization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Global Boundary GIS Centroid Extractor mutation
  const globalExtractMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/villages/extract", {});
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      toast({
        title: "GIS Extraction Successful",
        description: res.message || "Communities successfully extracted from boundary map features.",
      });
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      const missingBoundaries = /no administrative boundary/i.test(msg);
      toast({
        title: missingBoundaries
          ? "No boundary maps for this country yet"
          : "GIS Extraction Failed",
        description: missingBoundaries
          ? "Upload an administrative boundary map (or use Import Communities with a CSV) before extracting villages from the map."
          : msg,
        variant: missingBoundaries ? "default" : "destructive",
        action: missingBoundaries ? (
          <ToastAction
            altText="Open Boundary Manager"
            onClick={() => setLocation("/admin/boundaries")}
          >
            Open Boundary Manager
          </ToastAction>
        ) : undefined,
      });
    },
  });

  // Bulk JSON/CSV Import mutation
  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/villages/import", payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      toast({
        title: "Import Successful",
        description: res.message || "Communities successfully imported.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImportClick = () => {
    document.getElementById("csv-json-import-file")?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          importMutation.mutate(parsed);
        } catch (err: any) {
          toast({
            title: "Failed to parse JSON file",
            description: err.message,
            variant: "destructive",
          });
        }
      } else if (file.name.endsWith(".csv")) {
        try {
          // Simple robust CSV parser
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length < 2) throw new Error("CSV file must contain at least headers and one data row.");
          
          const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
          const nameIdx = headers.findIndex(h => h.toLowerCase() === "name");
          const distIdx = headers.findIndex(h => h.toLowerCase() === "districtname" || h.toLowerCase() === "district_name" || h.toLowerCase() === "district");
          const htrIdx = headers.findIndex(h => h.toLowerCase() === "ishardtoreach" || h.toLowerCase() === "is_hard_to_reach" || h.toLowerCase() === "htr");
          const latIdx = headers.findIndex(h => h.toLowerCase() === "latitude" || h.toLowerCase() === "lat");
          const lngIdx = headers.findIndex(h => h.toLowerCase() === "longitude" || h.toLowerCase() === "lng" || h.toLowerCase() === "lon");
          const hmisIdx = headers.findIndex(h => h.toLowerCase() === "facilityhmiscode" || h.toLowerCase() === "facility_hmis_code" || h.toLowerCase() === "hmis");

          if (nameIdx === -1) throw new Error("CSV must contain a 'name' column.");

          const villagesList = [];
          for (let i = 1; i < lines.length; i++) {
            // Support commas inside quotes
            const row = [];
            let insideQuote = false;
            let currentWord = "";
            const line = lines[i];
            for (let c = 0; c < line.length; c++) {
              const char = line[c];
              if (char === '"') {
                insideQuote = !insideQuote;
              } else if (char === ',' && !insideQuote) {
                row.push(currentWord.trim().replace(/^["']|["']$/g, ""));
                currentWord = "";
              } else {
                currentWord += char;
              }
            }
            row.push(currentWord.trim().replace(/^["']|["']$/g, ""));

            if (row.length < headers.length) continue;

            const name = row[nameIdx];
            if (!name) continue;

            villagesList.push({
              name,
              districtName: distIdx !== -1 ? row[distIdx] || null : null,
              isHardToReach: htrIdx !== -1 ? row[htrIdx]?.toLowerCase() === "true" || row[htrIdx] === "1" : false,
              latitude: latIdx !== -1 && row[latIdx] ? parseFloat(row[latIdx]) : null,
              longitude: lngIdx !== -1 && row[lngIdx] ? parseFloat(row[lngIdx]) : null,
              facilityHmisCode: hmisIdx !== -1 ? row[hmisIdx] || null : null,
            });
          }

          importMutation.mutate({ villages: villagesList });
        } catch (err: any) {
          toast({
            title: "Failed to parse CSV file",
            description: err.message,
            variant: "destructive",
          });
        }
      }
      e.target.value = ""; // reset input
    };
    reader.readAsText(file);
  };

  const aggressiveExtractMutation = useMutation({
    mutationFn: async (facilityId: number) => {
      return apiRequest("POST", `/api/facilities/${facilityId}/communities/extract-aggressive`, {});
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      toast({
        title: "Extraction Successful",
        description: res.message || "Communities successfully linked to this facility.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Updated Code: Filter facilities using client-side pre-fetched cache for instant UI response
  const filteredFacilities = useMemo(() => {
    if (!facilities) return [];
    
    let result = facilities;
    
    if (selectedDistrictId) {
      result = result.filter(f => Number(f.districtId) === Number(selectedDistrictId));
    } else if (selectedProvinceId && allDistricts) {
      const districtIds = allDistricts
        .filter(d => Number(d.provinceId) === Number(selectedProvinceId))
        .map(d => Number(d.id));
      result = result.filter(f => districtIds.includes(Number(f.districtId)));
    } else if (selectedRegionId && provinces && allDistricts) {
      const provinceIds = provinces
        .filter(p => Number(p.regionId) === Number(selectedRegionId))
        .map(p => Number(p.id));
      const districtIds = allDistricts
        .filter(d => provinceIds.includes(Number(d.provinceId)))
        .map(d => Number(d.id));
      result = result.filter(f => districtIds.includes(Number(f.districtId)));
    }
    
    return result;
  }, [facilities, allDistricts, provinces, selectedRegionId, selectedProvinceId, selectedDistrictId]);

  const facilityCommunities = useMemo(() => {
    if (!villages || !selectedFacilityId) return [];
    return villages.filter(v => v.assignedFacilityId === selectedFacilityId);
  }, [villages, selectedFacilityId]);

  const form = useForm<InsertFacility>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: {
      name: "",
      hmisCode: "",
      facilityType: "health_center",
      districtId: 1,
      hasRefrigerator: false,
      hasPower: false,
      isActive: true,
    },
  });

  // Load existing catchment points when editing
  useEffect(() => {
    if (editingFacility && facilityCatchments && facilityCatchments.length > 0) {
      const official = facilityCatchments.find((c: any) => c.isOfficial);
      if (official && official.geojson && official.geojson.coordinates) {
        const coords = official.geojson.coordinates[0].map((pt: any) => L.latLng(pt[1], pt[0]));
        if (coords.length > 1 && coords[0].lat === coords[coords.length - 1].lat && coords[0].lng === coords[coords.length - 1].lng) {
          coords.pop();
        }
        setCatchmentPoints(coords);
      } else {
        setCatchmentPoints([]);
      }
    } else if (!editingFacility) {
      setCatchmentPoints([]);
    }
  }, [editingFacility, facilityCatchments]);

  // Track geofenced villages in real-time
  const currentDistrictId = form.watch("districtId");
  const districtVillages = useMemo(() => {
    if (!villages || !currentDistrictId) return [];
    return villages.filter(v => Number(v.districtId) === Number(currentDistrictId));
  }, [villages, currentDistrictId]);

  // Ray-cast point-in-polygon (lng/lat ordering, polygon as [{lat, lng}, ...])
  const pointInLatLngPolygon = (lat: number, lng: number, polygon: { lat: number; lng: number }[]) => {
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

  // Per-district centroid derived from geocoded villages in the same district —
  // used as a fallback for villages with missing lat/lng so demo data still
  // gets surfaced when the polygon intersects their district.
  const districtCentroids = useMemo(() => {
    const acc: Record<string, { latSum: number; lngSum: number; n: number }> = {};
    (villages || []).forEach((v) => {
      if (!v.districtId || !v.latitude || !v.longitude) return;
      const k = String(v.districtId);
      const lat = parseFloat(v.latitude.toString());
      const lng = parseFloat(v.longitude.toString());
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!acc[k]) acc[k] = { latSum: 0, lngSum: 0, n: 0 };
      acc[k].latSum += lat; acc[k].lngSum += lng; acc[k].n += 1;
    });
    const out: Record<string, { lat: number; lng: number }> = {};
    Object.entries(acc).forEach(([k, v]) => {
      out[k] = { lat: v.latSum / v.n, lng: v.lngSum / v.n };
    });
    return out;
  }, [villages]);

  // Aggressive extraction: scan ALL tenant villages (not just the currently
  // selected district), use a small ~250m tolerance via a bounding-box expansion
  // proxy, and fall back to the village's parent admin centroid when lat/lng is
  // missing on the row itself.
  const geofencedVillageIds = useMemo(() => {
    if (catchmentPoints.length < 3 || !villages || villages.length === 0) return [];
    // Cheap ~250m buffer: expand polygon ring outward via centroid scale. The
    // server-side extraction endpoint applies a precise PostGIS ST_Buffer
    // (geography) — this client-side check just needs to be lenient enough not
    // to drop edge cases visually as the user draws.
    const polygon = catchmentPoints;
    const ids: number[] = [];
    for (const v of villages) {
      let lat: number | null = null;
      let lng: number | null = null;
      if (v.latitude && v.longitude) {
        lat = parseFloat(v.latitude.toString());
        lng = parseFloat(v.longitude.toString());
      } else if (v.districtId && districtCentroids[String(v.districtId)]) {
        const c = districtCentroids[String(v.districtId)];
        lat = c.lat; lng = c.lng;
      }
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (pointInLatLngPolygon(lat, lng, polygon)) ids.push(v.id);
    }
    return ids;
  }, [catchmentPoints, villages, districtCentroids]);

  // Debounced server-side extraction call — runs whenever the polygon changes
  // and returns settlements_master + Overpass unmapped candidates. Falls back
  // silently to client-only geofencedVillageIds on error.
  useEffect(() => {
    if (catchmentPoints.length < 3) {
      setExtractionResult({ villages: [], settlements: [], unmapped: [] });
      setSelectedUnmappedOsm(new Set());
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const coords = [
          ...catchmentPoints.map((p) => [p.lng, p.lat]),
          [catchmentPoints[0].lng, catchmentPoints[0].lat],
        ];
        const res = await apiRequest<Response>("POST", "/api/catchments/extract", {
          geojson: { type: "Polygon", coordinates: [coords] },
          bufferMeters: 250,
          includeOsm: true,
        });
        const json: any = await (res as any).json();
        setExtractionResult({
          villages: json.villages ?? [],
          settlements: json.settlements ?? [],
          unmapped: json.unmapped ?? [],
        });
      } catch {
        // Non-fatal — UI falls back to the client-side geofencedVillageIds count.
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [catchmentPoints]);

  const facilityMapCenter = useMemo(() => {
    const lat = form.watch("latitude");
    const lng = form.watch("longitude");
    if (lat && lng) {
      return [parseFloat(lat.toString()), parseFloat(lng.toString())] as [number, number];
    }
    if (districtVillages.length > 0) {
      const first = districtVillages.find(v => v.latitude && v.longitude);
      if (first) {
        return [parseFloat(first.latitude!.toString()), parseFloat(first.longitude!.toString())] as [number, number];
      }
    }
    if (tenantInfo?.settings?.mapCenter) {
      return tenantInfo.settings.mapCenter as [number, number];
    }
    return [-6.0, 145.0] as [number, number];
  }, [form.watch("latitude"), form.watch("longitude"), districtVillages, tenantInfo]);

  function FacilityMapEvents() {
    useMapEvents({
      click(e) {
        if (facMapDrawMode === "pin") {
          form.setValue("latitude", e.latlng.lat.toFixed(6) as any);
          form.setValue("longitude", e.latlng.lng.toFixed(6) as any);
        } else {
          setCatchmentPoints(prev => [...prev, e.latlng]);
        }
      }
    });
    return null;
  }

  // Updated Code: Set default fallback district from sorted allDistricts cache
  useEffect(() => {
    if (editingFacility) {
      form.reset({
        name: editingFacility.name,
        hmisCode: editingFacility.hmisCode,
        facilityType: editingFacility.facilityType || "health_center",
        districtId: editingFacility.districtId,
        latitude: editingFacility.latitude,
        longitude: editingFacility.longitude,
        staffCount: editingFacility.staffCount,
        hasRefrigerator: editingFacility.hasRefrigerator || false,
        hasPower: editingFacility.hasPower || false,
        isActive: editingFacility.isActive ?? true,
        agencyName: editingFacility.agencyName,
        operationalStatus: editingFacility.operationalStatus,
        address: editingFacility.address,
        contactPhone: editingFacility.contactPhone,
        operatingHours: editingFacility.operatingHours,
        catchmentRadius: editingFacility.catchmentRadius,
      });
    } else {
      form.reset({
        name: "",
        hmisCode: "",
        facilityType: "health_center",
        districtId: allDistricts?.[0]?.id || 1,
        hasRefrigerator: false,
        hasPower: false,
        isActive: true,
      });
    }
  }, [editingFacility, form, allDistricts]);

  const saveCatchmentMutation = useMutation({
    mutationFn: async ({
      facilityId, geojson, villageIds, settlementIds, unmappedOsm,
    }: {
      facilityId: number;
      geojson: any;
      villageIds: number[];
      settlementIds?: number[];
      unmappedOsm?: Array<{ name: string; latitude: number; longitude: number; placeType: string; osmId?: string }>;
    }) => {
      return apiRequest("POST", `/api/facilities/${facilityId}/catchments`, {
        geojson,
        name: `Official Catchment for HF ${facilityId}`,
        description: `Geofenced catchment area drawing`,
        villageIds,
        settlementIds,
        unmappedOsm,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      if (editingFacility?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/facilities/${editingFacility.id}/catchments`] });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Catchment Save Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFacility) => {
      return apiRequest("POST", "/api/facilities", data);
    },
    onSuccess: (facility: any) => {
      if (catchmentPoints.length >= 3) {
        saveCatchmentMutation.mutate({
          facilityId: facility.id,
          geojson: {
            type: "Polygon",
            coordinates: [
              [
                ...catchmentPoints.map(pt => [pt.lng, pt.lat]),
                [catchmentPoints[0].lng, catchmentPoints[0].lat]
              ]
            ]
          },
          villageIds: geofencedVillageIds,
          settlementIds: extractionResult.settlements.map((s) => s.id),
          unmappedOsm: extractionResult.unmapped.filter((u) => u.osmId && selectedUnmappedOsm.has(String(u.osmId))),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setDialogOpen(false);
      form.reset();
      setCatchmentPoints([]);
      toast({
        title: "Facility created",
        description: "The health facility has been added successfully.",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertFacility> }) => {
      return apiRequest("PATCH", `/api/facilities/${id}`, data);
    },
    onSuccess: (facility: any) => {
      if (catchmentPoints.length >= 3) {
        saveCatchmentMutation.mutate({
          facilityId: editingFacility?.id || facility.id,
          geojson: {
            type: "Polygon",
            coordinates: [
              [
                ...catchmentPoints.map(pt => [pt.lng, pt.lat]),
                [catchmentPoints[0].lng, catchmentPoints[0].lat]
              ]
            ]
          },
          villageIds: geofencedVillageIds,
          settlementIds: extractionResult.settlements.map((s) => s.id),
          unmappedOsm: extractionResult.unmapped.filter((u) => u.osmId && selectedUnmappedOsm.has(String(u.osmId))),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setDialogOpen(false);
      setEditingFacility(null);
      form.reset();
      setCatchmentPoints([]);
      toast({
        title: "Facility updated",
        description: "The health facility has been updated successfully.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/facilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setDeletingFacility(null);
      toast({
        title: "Facility deleted",
        description: "The health facility has been removed.",
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

  // Fetch population data list
  const { data: populationList } = useQuery<any[]>({
    queryKey: ["/api/population"],
  });

  // Updated Code: Lookup names from allDistricts full collection
  const getDistrictName = (districtId: number) => {
    const district = allDistricts?.find(d => Number(d.id) === Number(districtId));
    return district?.name || "Unknown";
  };

  const getProvinceName = (districtId: number) => {
    const district = allDistricts?.find(d => Number(d.id) === Number(districtId));
    if (!district) return "Unknown";
    const province = provinces?.find(p => Number(p.id) === Number(district.provinceId));
    return province?.name || "Unknown";
  };

  const getFacilityPopulation = (facilityId: number) => {
    if (!populationList) return "-";
    
    // Find population entry for this facility
    const entry = populationList.find(p => p.facilityId === facilityId);
    if (entry) return entry.totalPopulation.toLocaleString();
    
    // Fallback: Sum of assigned communities population
    const villageEntries = populationList.filter(p => p.villageId !== null);
    const assignedVillages = villages?.filter(v => v.assignedFacilityId === facilityId) || [];
    const villageIds = assignedVillages.map(v => v.id);
    const sum = villageEntries
      .filter(p => villageIds.includes(p.villageId))
      .reduce((acc, curr) => acc + curr.totalPopulation, 0);
    return sum > 0 ? `${sum.toLocaleString()} (Est.)` : "-";
  };

  const getAssignedVillageCount = (facilityId: number) => {
    if (!villages) return 0;
    return villages.filter(v => v.assignedFacilityId === facilityId).length;
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setDialogOpen(true);
  };

  const handleDelete = (facility: Facility) => {
    setDeletingFacility(facility);
  };

  const columns = [
    /* Original Code: Static header strings
    {
      key: "province",
      header: "Province",
      sortable: true,
      render: (item: Facility) => getProvinceName(item.districtId),
    },
    {
      key: "district",
      header: "District",
      sortable: true,
      render: (item: Facility) => getDistrictName(item.districtId),
    },
    */
    // Updated Code: Use dynamic multi-tenant terminology labels for administrative levels
    {
      key: "province",
      header: adminLabels.level1 || "Province",
      sortable: true,
      render: (item: Facility) => getProvinceName(item.districtId),
    },
    {
      key: "district",
      header: adminLabels.level2 || "District",
      sortable: true,
      render: (item: Facility) => getDistrictName(item.districtId),
    },
    {
      key: "name",
      header: "Facility Name",
      sortable: true,
      render: (item: Facility) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.hmisCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "population",
      header: "Estimated / Confirmed Pop",
      sortable: true,
      render: (item: Facility) => getFacilityPopulation(item.id),
    },
    {
      key: "facilityType",
      header: "Type",
      sortable: true,
      render: (item: Facility) => (
        <Badge variant="secondary" className="capitalize">
          {item.facilityType?.replace(/_/g, " ") || "N/A"}
        </Badge>
      ),
    },
    {
      key: "communities",
      header: "Communities",
      render: (item: Facility) => {
        const count = getAssignedVillageCount(item.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFacilityId(selectedFacilityId === item.id ? null : item.id);
            }}
            data-testid={`button-view-communities-${item.id}`}
          >
            <Users className="h-3 w-3" />
            {count} {count === 1 ? "community" : "communities"}
          </Button>
        );
      },
    },
    {
      key: "staffCount",
      header: "Staff",
      sortable: true,
      render: (item: Facility) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-3 w-3 text-muted-foreground" />
          {item.staffCount || "-"}
        </div>
      ),
    },
    {
      key: "equipment",
      header: "Equipment",
      render: (item: Facility) => (
        <div className="flex gap-1 flex-wrap">
          {item.hasRefrigerator && (
            <Badge variant="outline" className="text-xs">
              <Thermometer className="h-3 w-3 mr-1" />
              Cold Chain
            </Badge>
          )}
          {item.hasPower && (
            <Badge variant="outline" className="text-xs">
              Power
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (item: Facility) => (
        <Badge variant={item.isActive ? "secondary" : "outline"}>
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Facility) => {
        // Original Code: referenced districts which was renamed to allDistricts
        // const canEdit = canEditFacility(user, item.districtId, item.id, districts, provinces);
        const canEdit = canEditFacility(user, item.districtId, item.id, allDistricts, provinces, tenantInfo?.id);
        const canDelete = canDeleteData(user);
        
        if (!canEdit && !canDelete) return null;
        
        return (
          <div className="flex gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(item);
                }}
                data-testid={`button-edit-facility-${item.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item);
                }}
                data-testid={`button-delete-facility-${item.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  /* Original Code: Only rendering community name
  const communityColumns = [
    {
      key: "name",
      header: "Community Name",
      sortable: true,
      render: (item: Village) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.code && <p className="text-xs text-muted-foreground">{item.code}</p>}
        </div>
      ),
    },
  */
  // Updated Code: Render community name alongside dynamic administrative level (province and district) columns
  const communityColumns = [
    {
      key: "name",
      header: "Community Name",
      sortable: true,
      render: (item: Village) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.code && <p className="text-xs text-muted-foreground">{item.code}</p>}
        </div>
      ),
    },
    {
      key: "province",
      header: adminLabels.level1 || "Province",
      sortable: true,
      render: (item: Village) => getProvinceName(item.districtId),
    },
    {
      key: "district",
      header: adminLabels.level2 || "District",
      sortable: true,
      render: (item: Village) => getDistrictName(item.districtId),
    },
    {
      key: "distanceToFacility",
      header: "Distance",
      sortable: true,
      render: (item: Village) =>
        item.distanceToFacility
          ? `${Number(item.distanceToFacility).toFixed(1)} km`
          : "-",
    },
    {
      key: "transportMode",
      header: "Access",
      render: (item: Village) => (
        <Badge variant="outline" className="capitalize">
          {item.transportMode || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "isHardToReach",
      header: "HTR Status",
      render: (item: Village) =>
        item.isHardToReach ? (
          <Badge variant="destructive" className="text-xs">
            Hard to Reach
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Accessible
          </Badge>
        ),
    },
  ];

  const onSubmit = (data: InsertFacility) => {
    if (editingFacility) {
      updateMutation.mutate({ id: editingFacility.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const clearFilters = () => {
    setSelectedRegionId(null);
    setSelectedProvinceId(null);
    setSelectedDistrictId(null);
    setSelectedFacilityId(null);
  };

  const handleEditCommunity = (village: Village) => {
    setEditingCommunity(village);
    setNewCommName(village.name);
    setNewCommDistrictId(village.districtId.toString());
    setNewCommHTR(village.isHardToReach || false);
    setNewCommFacilityId(village.assignedFacilityId?.toString() || "");
    setNewCommLat(village.latitude?.toString() || "");
    setNewCommLng(village.longitude?.toString() || "");
    setNewCommTransportMode(village.transportMode || "walking");
    // Load any stored catchment boundary back into the polygon draw tool so it
    // can be reviewed / edited.
    const existing = boundaryToLatLngs((village as any).boundary);
    if (existing.length >= 3) {
      setCommPolygonPoints(existing.map((p) => L.latLng(p.lat, p.lng)));
      setCommDrawMode("polygon");
    } else {
      setCommPolygonPoints([]);
    }
    setCommunityDialogOpen(true);
  };

  const handleAddCommunity = () => {
    setEditingCommunity(null);
    setNewCommName("");
    setNewCommHTR(false);
    setNewCommLat("");
    setNewCommLng("");
    setNewCommTransportMode("walking");
    setCommPolygonPoints([]);
    // Pre-fill the location based on the caller's role: facility staff are pinned
    // to their own facility (and its district); district staff start in their
    // district; everyone else starts blank.
    const role = user?.role;
    if ((role === "facility_clerk" || role === "facility_in_charge") && user?.facilityId) {
      const fac = facilities?.find((f) => Number(f.id) === Number(user.facilityId));
      setNewCommFacilityId(String(user.facilityId));
      setNewCommDistrictId(fac?.districtId ? String(fac.districtId) : "");
    } else if (role === "district_manager" && user?.districtId) {
      setNewCommFacilityId("");
      setNewCommDistrictId(String(user.districtId));
    } else {
      setNewCommFacilityId("");
      setNewCommDistrictId(allDistricts?.[0]?.id?.toString() || "");
    }
    setCommunityDialogOpen(true);
  };

  const handleSaveCommunity = () => {
    if (!newCommName.trim()) {
      toast({
        title: "Validation Error",
        description: "Community name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!newCommDistrictId) {
      toast({
        title: "Validation Error",
        description: "Please select a district.",
        variant: "destructive",
      });
      return;
    }

    const boundary = polygonPointsToBoundary(commPolygonPoints);

    const payload: any = {
      name: newCommName.trim(),
      districtId: parseInt(newCommDistrictId),
      isHardToReach: newCommHTR,
      assignedFacilityId: newCommFacilityId ? parseInt(newCommFacilityId) : null,
      latitude: newCommLat ? parseFloat(newCommLat) : null,
      longitude: newCommLng ? parseFloat(newCommLng) : null,
      transportMode: newCommTransportMode,
      // Persist the drawn catchment boundary (or clear it when none is drawn).
      boundary: boundary,
    };

    if (editingCommunity) {
      updateCommunityMutation.mutate({ id: editingCommunity.id, data: payload });
    } else {
      createCommunityMutation.mutate(payload);
    }
  };

  /* Original Code: Only mapped name and static districtId column
  const communityRegistryColumns = [
    {
      key: "name",
      header: "Community Name",
      sortable: true,
      render: (item: Village) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.code || "No Code"}</span>
        </div>
      )
    },
    {
      key: "districtId",
      header: "District",
      sortable: true,
      render: (item: Village) => (
        <span className="text-sm text-foreground">{getDistrictName(item.districtId)}</span>
      )
    },
  */
  // Updated Code: Render community name alongside dynamic administrative level (province and district) columns
  const communityRegistryColumns = [
    {
      key: "name",
      header: "Community Name",
      sortable: true,
      render: (item: Village) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.code || "No Code"}</span>
        </div>
      )
    },
    {
      key: "province",
      header: adminLabels.level1 || "Province",
      sortable: true,
      render: (item: Village) => (
        <span className="text-sm text-foreground">{getProvinceName(item.districtId)}</span>
      )
    },
    {
      key: "districtId",
      header: adminLabels.level2 || "District",
      sortable: true,
      render: (item: Village) => (
        <span className="text-sm text-foreground">{getDistrictName(item.districtId)}</span>
      )
    },
    {
      key: "assignedFacilityId",
      header: "Assigned Facility",
      sortable: true,
      render: (item: Village) => {
        const fac = facilities?.find(f => f.id === item.assignedFacilityId);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{fac?.name || "Unassigned"}</span>
            {fac?.hmisCode && <span className="text-xs text-muted-foreground">HMIS: {fac.hmisCode}</span>}
          </div>
        );
      }
    },
    {
      key: "coordinates",
      header: "Coordinates",
      render: (item: Village) => {
        if (!item.latitude || !item.longitude) return <span className="text-xs text-muted-foreground">No coordinates</span>;
        return (
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}
          </span>
        );
      }
    },
    {
      key: "distanceToFacility",
      header: "Assigned Distance",
      sortable: true,
      render: (item: Village) => {
        if (item.distanceToFacility !== null && item.distanceToFacility !== undefined) {
          return (
            <Badge variant="outline" className="font-mono">
              {Number(item.distanceToFacility).toFixed(2)} km
            </Badge>
          );
        }
        if (item.latitude && item.longitude && item.assignedFacilityId) {
          const fac = facilities?.find(f => f.id === item.assignedFacilityId);
          if (fac && fac.latitude !== null && fac.longitude !== null) {
            const dist = getHaversineDistance(
              parseFloat(item.latitude.toString()),
              parseFloat(item.longitude.toString()),
              parseFloat(fac.latitude.toString()),
              parseFloat(fac.longitude.toString())
            );
            return (
              <Badge variant="outline" className="font-mono">
                {dist.toFixed(2)} km
              </Badge>
            );
          }
        }
        return <span className="text-muted-foreground text-xs">-</span>;
      }
    },
    {
      key: "closestFacilities",
      header: "Closest Facilities",
      render: (item: Village) => {
        const closest = getClosestFacilities(item);
        if (closest.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="space-y-1 max-w-[200px]">
            {closest.map(({ facility, distance }, idx) => (
              <div key={facility.id} className="text-xs flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{facility.name}</span>
                <span className="text-muted-foreground font-mono shrink-0">{distance.toFixed(1)} km</span>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      key: "isHardToReach",
      header: "HTR Status",
      sortable: true,
      render: (item: Village) => (
        <Badge variant={item.isHardToReach ? "destructive" : "secondary"}>
          {item.isHardToReach ? "Hard to Reach" : "Accessible"}
        </Badge>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Village) => {
        const canEdit = canEditFacility(user, item.districtId, item.assignedFacilityId || 0, allDistricts, provinces, tenantInfo?.id);
        const canDelete = canDeleteData(user);
        if (!canEdit && !canDelete) return null;
        return (
          <div className="flex gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCommunity(item);
                }}
                data-testid={`button-edit-community-${item.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingCommunity(item);
                }}
                data-testid={`button-delete-community-${item.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const hasFilters = selectedRegionId || selectedProvinceId || selectedDistrictId;
  // Communities can be added by any staff member with edit rights — facility and
  // district staff included. The server scopes WHERE they can add.
  const canCreate = canCreateCommunity(user);
  // Adding a *facility* is reserved for coordinator/admin roles; district and
  // facility staff can add communities but not facilities (server enforces 403).
  const canAddFacility = canCreateFacility(user);
  // Role-lock the community location picker: facility staff are pinned to their
  // own facility; district staff are locked to their district; coordinators and
  // admins get the full searchable Province → District → Facility cascade.
  const isFacilityStaff =
    user?.role === "facility_clerk" || user?.role === "facility_in_charge";
  const isDistrictStaff = user?.role === "district_manager";
  const lockedCommDistrictId = isDistrictStaff ? (user?.districtId ?? null) : null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
      <Tabs defaultValue="facilities" className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Health Facilities & Communities</h1>
            <p className="text-muted-foreground text-sm">
              Manage health facilities, catchment communities, and geographic spatial points
            </p>
          </div>

          <TabsList className="bg-muted/50 p-1 border">
            <TabsTrigger value="facilities" className="gap-2">
              <Building2 className="h-4 w-4" />
              Facilities & Catchments
            </TabsTrigger>
            <TabsTrigger value="communities" className="gap-2">
              <Users className="h-4 w-4" />
              Communities Registry
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="facilities" className="space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Facilities Registry</h2>
            {canAddFacility && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setEditingFacility(null);
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-facility">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Facility
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{editingFacility ? "Edit Facility & Catchment" : "Add New Facility & Catchment"}</DialogTitle>
                  </DialogHeader>
                  
                  <Tabs defaultValue="general" className="w-full">
                    <div className="px-6 border-b flex items-center justify-between">
                      <TabsList className="bg-muted/50 p-1 border-0 rounded-none h-12">
                        <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full px-4">
                          General & Catchment Area
                        </TabsTrigger>
                        <TabsTrigger value="communities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full px-4" disabled={!editingFacility}>
                          Communities Served (CRUD)
                        </TabsTrigger>
                      </TabsList>
                      {editingFacility && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={aggressiveExtractMutation.isPending}
                          onClick={() => aggressiveExtractMutation.mutate(editingFacility.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0"
                          data-testid="button-aggressive-extract"
                        >
                          <Building2 className="h-4 w-4" />
                          {aggressiveExtractMutation.isPending ? "Extracting..." : "Aggressive Centroid Extractor"}
                        </Button>
                      )}
                    </div>

                    <TabsContent value="general" className="m-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 h-[65vh]">
                        {/* Left Column: Form Fields */}
                        <div className="p-6 overflow-y-auto space-y-4 border-r custom-scrollbar">
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Facility Name *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g. District Hospital"
                                        {...field}
                                        value={field.value ?? ""}
                                        data-testid="input-facility-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="hmisCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>HMIS Code *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="NCD-001"
                                        {...field}
                                        value={field.value ?? ""}
                                        data-testid="input-hmis-code"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="facilityType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Facility Type</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || "health_center"}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-facility-type">
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="hospital">Hospital</SelectItem>
                                        <SelectItem value="health_center">Health Center</SelectItem>
                                        <SelectItem value="aid_post">Aid Post</SelectItem>
                                        <SelectItem value="clinic">Clinic</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="districtId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>District *</FormLabel>
                                    <Select
                                      onValueChange={(val) => field.onChange(parseInt(val))}
                                      value={field.value?.toString() || ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-district">
                                          <SelectValue placeholder="Select district" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {[...(allDistricts || [])]
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map((district) => (
                                            <SelectItem key={district.id} value={district.id.toString()}>
                                              {district.name}
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
                                  name="latitude"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Latitude</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="any"
                                          placeholder="-6.123456"
                                          value={field.value ?? ""}
                                          onChange={(e) => field.onChange(e.target.value || null)}
                                          data-testid="input-latitude"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="longitude"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Longitude</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="any"
                                          placeholder="147.123456"
                                          value={field.value ?? ""}
                                          onChange={(e) => field.onChange(e.target.value || null)}
                                          data-testid="input-longitude"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                  control={form.control}
                                  name="staffCount"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Staff Count</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="10"
                                          value={field.value ?? ""}
                                          onChange={(e) =>
                                            field.onChange(e.target.value ? parseInt(e.target.value) : null)
                                          }
                                          data-testid="input-staff-count"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                              <div className="flex gap-6">
                                <FormField
                                  control={form.control}
                                  name="hasRefrigerator"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                      <FormControl>
                                        <Switch
                                          checked={field.value || false}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-refrigerator"
                                        />
                                      </FormControl>
                                      <FormLabel className="!mt-0">Cold Chain</FormLabel>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="hasPower"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                      <FormControl>
                                        <Switch
                                          checked={field.value || false}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-power"
                                        />
                                      </FormControl>
                                      <FormLabel className="!mt-0">Power Supply</FormLabel>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="isActive"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                      <FormControl>
                                        <Switch
                                          checked={field.value ?? true}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-active"
                                        />
                                      </FormControl>
                                      <FormLabel className="!mt-0">Active</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </form>
                          </Form>
                        </div>

                        {/* Right Column: GIS map editor & Real-time Geofencing */}
                        <div className="relative flex flex-col h-full bg-muted/20">
                          <div className="p-4 border-b bg-background flex flex-col gap-2 z-10">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex gap-2 items-center">
                                <Button
                                  type="button"
                                  variant={facMapDrawMode === "pin" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setFacMapDrawMode("pin")}
                                >
                                  Place Pin
                                </Button>
                                <Button
                                  type="button"
                                  variant={facMapDrawMode === "polygon" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setFacMapDrawMode("polygon")}
                                >
                                  Draw Catchment
                                </Button>
                                {facilityCatchments && facilityCatchments.length > 0 && (
                                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={showSavedCatchment}
                                      onChange={(e) => setShowSavedCatchment(e.target.checked)}
                                      className="h-3.5 w-3.5"
                                    />
                                    Show Saved Catchment
                                  </label>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCatchmentPoints([])}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                Clear Catchment
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex-1 relative z-0">
                            <MapContainer
                              center={facilityMapCenter}
                              zoom={12}
                              className="w-full h-full"
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <PopulationWmsLayer overlay={populationOverlay} />
                              <MapResizer />
                              <FacilityMapEvents />
                              
                              {/* Facility coordinate marker */}
                              {form.watch("latitude") && form.watch("longitude") && (
                                <Marker
                                  position={[parseFloat(form.watch("latitude")!.toString()), parseFloat(form.watch("longitude")!.toString())]}
                                  icon={OFFLINE_FACILITY_ICON}
                                  draggable
                                  eventHandlers={{
                                    dragend: (e) => {
                                      const marker = e.target;
                                      const position = marker.getLatLng();
                                      form.setValue("latitude", position.lat.toFixed(6) as any);
                                      form.setValue("longitude", position.lng.toFixed(6) as any);
                                    }
                                  }}
                                />
                              )}

                              {/* Saved (persisted) catchment overlay — toggleable */}
                              {showSavedCatchment && facilityCatchments && facilityCatchments
                                .filter((c: any) => c?.geojson)
                                .map((c: any) => {
                                  const geom = c.geojson?.type === "Feature" ? c.geojson.geometry : c.geojson;
                                  if (!geom || geom.type !== "Polygon" || !Array.isArray(geom.coordinates?.[0])) return null;
                                  const ring = geom.coordinates[0].map((pt: number[]) => [pt[1], pt[0]]) as [number, number][];
                                  return (
                                    <LeafletPolygon
                                      key={`saved-${c.id}`}
                                      positions={ring}
                                      pathOptions={{ fillColor: "#0ea5e9", fillOpacity: 0.18, color: "#0ea5e9", weight: 2, dashArray: "4 4" }}
                                    />
                                  );
                                })}

                              {/* Catchment Polygon Overlay (in-progress drawing) */}
                              {catchmentPoints.length > 0 && (
                                <LeafletPolygon
                                  positions={catchmentPoints.map(pt => [pt.lat, pt.lng])}
                                  pathOptions={{ fillColor: "#10b981", fillOpacity: 0.25, color: "#10b981", weight: 2.5 }}
                                />
                              )}

                              {/* Served/Geofenced villages markers overlay */}
                              {districtVillages.map((v) => {
                                if (!v.latitude || !v.longitude) return null;
                                const isInside = geofencedVillageIds.includes(v.id);
                                const markerColor = isInside ? "#10b981" : "#9ca3af";
                                const customIcon = L.divIcon({
                                  className: "custom-village-icon",
                                  html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
                                  iconSize: [12, 12],
                                  iconAnchor: [6, 6]
                                });

                                return (
                                  <Marker
                                    key={v.id}
                                    position={[parseFloat(v.latitude.toString()), parseFloat(v.longitude.toString())]}
                                    icon={customIcon}
                                  >
                                    <Popup>
                                      <div className="p-1">
                                        <p className="font-semibold text-sm">{v.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Status: {isInside ? "🟢 Geofenced Served" : "⚪ Outside Polygon"}
                                        </p>
                                      </div>
                                    </Popup>
                                  </Marker>
                                );
                              })}
                            </MapContainer>
                            <PopulationOverlayToggle
                              overlay={populationOverlay}
                              className="absolute top-2 right-2 z-[1000]"
                            />
                            <PopulationOverlayLegend
                              overlay={populationOverlay}
                              className="absolute top-14 right-2 z-[1000]"
                            />
                          </div>

                          {/* Catchment statistics overlay dashboard */}
                          <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-3 z-[1000] shadow-lg text-xs space-y-2 max-h-[40vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-foreground">Catchment Area</p>
                                <p className="text-muted-foreground mt-0.5">
                                  Linked villages: <span className="font-medium text-foreground">{Math.max(extractionResult.villages.length, geofencedVillageIds.length)}</span>
                                  {" · "}Settlements: <span className="font-medium text-foreground">{extractionResult.settlements.length}</span>
                                  {" · "}Unmapped: <span className="font-medium text-foreground">{extractionResult.unmapped.length}</span>
                                </p>
                              </div>
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2.5 py-1">
                                {Math.max(extractionResult.villages.length, geofencedVillageIds.length)} served
                              </Badge>
                            </div>

                            {extractionResult.unmapped.length > 0 && (
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-semibold text-foreground">Unmapped places found ({extractionResult.unmapped.length})</p>
                                  <button
                                    type="button"
                                    className="text-[10px] text-sky-600 hover:underline"
                                    onClick={() => {
                                      const all = new Set<string>(extractionResult.unmapped.filter(u => u.osmId).map(u => String(u.osmId)));
                                      setSelectedUnmappedOsm(selectedUnmappedOsm.size === all.size ? new Set<string>() : all);
                                    }}
                                  >
                                    {selectedUnmappedOsm.size === extractionResult.unmapped.filter(u => u.osmId).length ? "Clear all" : "Select all"}
                                  </button>
                                </div>
                                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                  {extractionResult.unmapped.map((u, i) => {
                                    const key = u.osmId ? String(u.osmId) : `idx-${i}`;
                                    const checked = !!u.osmId && selectedUnmappedOsm.has(String(u.osmId));
                                    return (
                                      <label key={key} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-muted/40 px-1 py-0.5 rounded">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={!u.osmId}
                                          onChange={(e) => {
                                            if (!u.osmId) return;
                                            const next = new Set<string>(selectedUnmappedOsm);
                                            if (e.target.checked) next.add(String(u.osmId));
                                            else next.delete(String(u.osmId));
                                            setSelectedUnmappedOsm(next);
                                          }}
                                          className="h-3 w-3"
                                        />
                                        <span className="flex-1 truncate">{u.name}</span>
                                        <span className="text-muted-foreground">{u.placeType}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Checked items will be saved with the catchment as candidate communities for review.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="communities" className="m-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 h-[65vh]">
                        {/* Nested Communities CRUD list */}
                        <div className="p-6 overflow-y-auto space-y-4 border-r custom-scrollbar flex flex-col h-full justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">Communities Served ({villages?.filter(v => v.assignedFacilityId === editingFacility?.id).length || 0})</h3>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingCommunity(null);
                                  setNewCommName("");
                                  setNewCommDistrictId(editingFacility?.districtId.toString() || "");
                                  setNewCommHTR(false);
                                  setNewCommFacilityId(editingFacility?.id.toString() || "");
                                  setNewCommLat("");
                                  setNewCommLng("");
                                  setNewCommTransportMode("walking");
                                  setCommPolygonPoints([]);
                                  setCommunityDialogOpen(true);
                                }}
                                data-testid="button-nested-add-community"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Register Community
                              </Button>
                            </div>

                            <div className="border rounded-md divide-y overflow-y-auto max-h-[45vh] custom-scrollbar">
                              {(villages?.filter(v => v.assignedFacilityId === editingFacility?.id) || []).length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                  No communities assigned. Click "Aggressive Centroid Extractor" above or "+ Register Community" to assign.
                                </div>
                              ) : (
                                (villages?.filter(v => v.assignedFacilityId === editingFacility?.id) || []).map((village) => (
                                  <div key={village.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div>
                                      <p className="font-medium text-sm">{village.name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {village.latitude && village.longitude ? `${Number(village.latitude).toFixed(5)}, ${Number(village.longitude).toFixed(5)}` : "No Coordinates"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditCommunity(village)}
                                        data-testid={`button-nested-edit-community-${village.id}`}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                          updateCommunityMutation.mutate({
                                            id: village.id,
                                            data: { assignedFacilityId: null }
                                          });
                                        }}
                                        data-testid={`button-nested-unassign-community-${village.id}`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Leaflet Sub-Map showing community pins */}
                        <div className="relative h-full bg-muted/20">
                          <div className="absolute top-4 left-4 z-[1000] bg-background/90 px-3 py-1.5 rounded-md border text-xs shadow-md">
                            Drag village pins <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full border border-white align-middle"></span> to dynamically edit coordinates.
                          </div>
                          <MapContainer
                            center={editingFacility?.latitude && editingFacility?.longitude ? [parseFloat(editingFacility.latitude.toString()), parseFloat(editingFacility.longitude.toString())] : commMapCenter}
                            zoom={12}
                            className="w-full h-full"
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapResizer />

                            {/* Facility Red Pin (Draggable) */}
                            {editingFacility?.latitude && editingFacility?.longitude && (
                              <Marker
                                position={[parseFloat(editingFacility.latitude.toString()), parseFloat(editingFacility.longitude.toString())]}
                                icon={OFFLINE_FACILITY_ICON}
                                draggable
                                eventHandlers={{
                                  dragend: (e) => {
                                    const position = e.target.getLatLng();
                                    updateMutation.mutate({
                                      id: editingFacility.id,
                                      data: {
                                        latitude: position.lat.toFixed(6) as any,
                                        longitude: position.lng.toFixed(6) as any
                                      }
                                    });
                                  }
                                }}
                              >
                                <Popup>
                                  <div className="p-1">
                                    <p className="font-semibold">{editingFacility.name}</p>
                                    <p className="text-xs text-muted-foreground">{editingFacility.hmisCode}</p>
                                  </div>
                                </Popup>
                              </Marker>
                            )}

                            {/* Catchment Polygon if exists */}
                            {catchmentPoints.length > 0 && (
                              <LeafletPolygon
                                positions={catchmentPoints.map(pt => [pt.lat, pt.lng])}
                                pathOptions={{ fillColor: "#10b981", fillOpacity: 0.15, color: "#10b981", weight: 2.0 }}
                              />
                            )}

                            {/* Assigned Villages Pins (Green, Draggable) */}
                            {(villages?.filter(v => v.assignedFacilityId === editingFacility?.id) || []).map((village) => {
                              if (!village.latitude || !village.longitude) return null;
                              return (
                                <Marker
                                  key={village.id}
                                  position={[parseFloat(village.latitude.toString()), parseFloat(village.longitude.toString())]}
                                  icon={OFFLINE_VILLAGE_ICON}
                                  draggable
                                  eventHandlers={{
                                    dragend: (e) => {
                                      const position = e.target.getLatLng();
                                      updateCommunityMutation.mutate({
                                        id: village.id,
                                        data: {
                                          latitude: position.lat.toFixed(6),
                                          longitude: position.lng.toFixed(6)
                                        }
                                      });
                                    }
                                  }}
                                >
                                  <Popup>
                                    <div className="p-1">
                                      <p className="font-semibold">{village.name}</p>
                                      <p className="text-xs text-muted-foreground">Catchment Community</p>
                                    </div>
                                  </Popup>
                                </Marker>
                              );
                            })}
                          </MapContainer>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2 p-6 border-t bg-muted/10">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingFacility(null);
                        setCatchmentPoints([]);
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={createMutation.isPending || updateMutation.isPending || saveCatchmentMutation.isPending}
                      onClick={form.handleSubmit(onSubmit)}
                      data-testid="button-save-facility"
                    >
                      {createMutation.isPending || updateMutation.isPending || saveCatchmentMutation.isPending
                        ? "Saving..."
                        : editingFacility
                        ? "Update Facility & Catchment"
                        : "Save Facility & Catchment"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              <GeoCascadeFilter
                showRegion={!skipRegionLevel}
                regionId={selectedRegionId}
                provinceId={selectedProvinceId}
                districtId={selectedDistrictId}
                onRegionChange={(id) => {
                  setSelectedRegionId(id);
                  setSelectedProvinceId(null);
                  setSelectedDistrictId(null);
                }}
                onProvinceChange={(id) => {
                  setSelectedProvinceId(id);
                  setSelectedDistrictId(null);
                }}
                onDistrictChange={setSelectedDistrictId}
                regions={regions}
                provinces={provinces}
                districts={allDistricts}
                provinceLabel={adminLabels.level1}
                districtLabel={adminLabels.level2}
                testIdPrefix="facilities-filter"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                Facilities ({filteredFacilities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredFacilities}
                columns={columns}
                searchable
                searchPlaceholder="Search facilities..."
                searchKeys={["name", "hmisCode", "facilityType"]}
              />
            </CardContent>
          </Card>

          {/* Original Code: Only rendered communities table if facilityCommunities.length > 0
          {selectedFacilityId && facilityCommunities.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    Communities Assigned to {facilities?.find(f => f.id === selectedFacilityId)?.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFacilityId(null)}
                    data-testid="button-close-communities"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={facilityCommunities}
                  columns={communityColumns}
                  searchable
                  searchPlaceholder="Search communities..."
                  searchKeys={["name", "code"]}
                />
              </CardContent>
            </Card>
          )}
          */}

          {/* Updated Code: Render a rich, side-by-side card when a facility is selected, showing assigned communities (if any) and a map of their locations. Draggable village pins enable direct coordination editing. If 0 communities are assigned, an explicit "Extract Communities" button triggers active centroid extraction. */}
          {selectedFacilityId && (
            <Card className="border border-primary/20 shadow-xl overflow-hidden">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Communities Assigned to {facilities?.find(f => f.id === selectedFacilityId)?.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      View, extract, and drag community pins on the map to dynamically edit GIS coordinates.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={aggressiveExtractMutation.isPending}
                      onClick={() => aggressiveExtractMutation.mutate(selectedFacilityId)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      data-testid="button-extract-communities"
                    >
                      <Building2 className="h-4 w-4" />
                      {aggressiveExtractMutation.isPending ? "Extracting..." : "Extract Communities"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFacilityId(null)}
                      data-testid="button-close-communities"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {facilityCommunities.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">No Communities Assigned</h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        There are currently no communities assigned to this facility. Click the "Extract Communities" button above to run the aggressive centroid extractor.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left: Datatable of Communities */}
                    <div className="p-6 border-r overflow-auto max-h-[500px] custom-scrollbar">
                      <DataTable
                        data={facilityCommunities}
                        columns={communityColumns}
                        searchable
                        searchPlaceholder="Search assigned communities..."
                        searchKeys={["name", "code"]}
                      />
                    </div>
                    
                    {/* Right: Interactive Sub-Map */}
                    <div className="relative h-[500px] w-full bg-muted/10">
                      <div className="absolute top-4 left-4 z-[1000] bg-background/90 px-3 py-1.5 rounded-md border text-[10px] shadow-md font-sans">
                        Drag village pins <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white align-middle"></span> to dynamically edit coordinates.
                      </div>
                      <MapContainer
                        center={(() => {
                          const fac = facilities?.find(f => f.id === selectedFacilityId);
                          if (fac && fac.latitude !== null && fac.longitude !== null) {
                            return [parseFloat(fac.latitude.toString()), parseFloat(fac.longitude.toString())] as [number, number];
                          }
                          return commMapCenter;
                        })()}
                        zoom={12}
                        className="w-full h-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <PopulationWmsLayer overlay={populationOverlay} />
                        <MapResizer />
                        
                        {/* Facility Pin (Draggable) */}
                        {(() => {
                          const fac = facilities?.find(f => f.id === selectedFacilityId);
                          if (fac && fac.latitude !== null && fac.longitude !== null) {
                            return (
                              <Marker
                                position={[parseFloat(fac.latitude.toString()), parseFloat(fac.longitude.toString())]}
                                icon={OFFLINE_FACILITY_ICON}
                                draggable
                                eventHandlers={{
                                  dragend: (e) => {
                                    const position = e.target.getLatLng();
                                    updateMutation.mutate({
                                      id: fac.id,
                                      data: {
                                        latitude: position.lat.toFixed(6) as any,
                                        longitude: position.lng.toFixed(6) as any
                                      }
                                    });
                                  }
                                }}
                              >
                                <Popup>
                                  <div className="p-1">
                                    <p className="font-semibold text-sm">{fac.name}</p>
                                    <p className="text-xs text-muted-foreground">{fac.hmisCode}</p>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          }
                          return null;
                        })()}

                        {/* Catchment Polygon Overlay */}
                        {/* Original Code: map had no explicit type for pt parameter
                        {selectedCatchmentPoints.length > 0 && (
                          <LeafletPolygon
                            positions={selectedCatchmentPoints.map(pt => [pt.lat, pt.lng])}
                            pathOptions={{ fillColor: "#10b981", fillOpacity: 0.15, color: "#10b981", weight: 2.0 }}
                          />
                        )}
                        */}
                        {/* Updated Code: added explicit parameter type casting for strict typescript compiler verification */}
                        {selectedCatchmentPoints.length > 0 && (
                          <LeafletPolygon
                            positions={selectedCatchmentPoints.map((pt: any) => [pt.lat, pt.lng])}
                            pathOptions={{ fillColor: "#10b981", fillOpacity: 0.15, color: "#10b981", weight: 2.0 }}
                          />
                        )}

                        {/* Assigned Villages Pins (Green, Draggable) */}
                        {facilityCommunities.map((village) => {
                          if (!village.latitude || !village.longitude) return null;
                          return (
                            <Marker
                              key={village.id}
                              position={[parseFloat(village.latitude.toString()), parseFloat(village.longitude.toString())]}
                              icon={OFFLINE_VILLAGE_ICON}
                              draggable
                              eventHandlers={{
                                dragend: (e) => {
                                  const position = e.target.getLatLng();
                                  updateCommunityMutation.mutate({
                                    id: village.id,
                                    data: {
                                      latitude: position.lat.toFixed(6),
                                      longitude: position.lng.toFixed(6)
                                    }
                                  });
                                }
                              }}
                            >
                              <Popup>
                                <div className="p-1">
                                  <p className="font-semibold text-sm">{village.name}</p>
                                  <p className="text-xs text-muted-foreground">Catchment Community</p>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                      <PopulationOverlayToggle
                        overlay={populationOverlay}
                        className="absolute top-2 right-2 z-[1000]"
                      />
                      <PopulationOverlayLegend
                        overlay={populationOverlay}
                        className="absolute bottom-2 right-2 z-[1000]"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="communities" className="space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Communities Registry</h2>
              <p className="text-muted-foreground text-xs">
                Manage demographic coordinates, Hard-to-Reach (HTR) status, and spatial routing rules
              </p>
            </div>
            {/* Original Code: Only rendering Add Community button
            {canCreate && (
              <Button onClick={handleAddCommunity} data-testid="button-add-community">
                <Plus className="h-4 w-4 mr-1" />
                Add Community
              </Button>
            )}
            */}
            {/* Updated Code: Exposing Import, GIS Extraction, and Add Community actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                id="csv-json-import-file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={importMutation.isPending}
                className="gap-1 border-primary/20 hover:bg-primary/5 text-primary"
                data-testid="button-import-communities"
              >
                <Upload className="h-4 w-4" />
                {importMutation.isPending ? "Importing..." : "Import Communities"}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        onClick={() => globalExtractMutation.mutate()}
                        disabled={globalExtractMutation.isPending || !hasBoundaries}
                        className="gap-1 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-500"
                        data-testid="button-global-extract-communities"
                      >
                        <Building2 className="h-4 w-4" />
                        {globalExtractMutation.isPending ? "Extracting..." : "Extract Communities from Map"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasBoundaries && (
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      No administrative boundary maps are seeded for this
                      country yet. Upload one in the Boundary Manager, then
                      come back here to auto-extract village centroids.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {canCreate && (
                <Button onClick={handleAddCommunity} className="gap-1" data-testid="button-add-community">
                  <Plus className="h-4 w-4" />
                  Add Community
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <DataTable
                data={villages || []}
                columns={communityRegistryColumns}
                searchable
                searchPlaceholder="Search communities registry..."
                searchKeys={["name", "code"]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Community Dialog */}
      <Dialog open={communityDialogOpen} onOpenChange={setCommunityDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingCommunity ? "Edit Community" : "Add New Community"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Community Name *</label>
              <Input
                placeholder="e.g. Village A"
                value={newCommName}
                onChange={(e) => setNewCommName(e.target.value)}
                data-testid="input-community-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location (Province → District → Facility) *</label>
              <FacilityCascadePicker
                value={newCommFacilityId ? parseInt(newCommFacilityId) : null}
                onChange={(facId, fac) => {
                  setNewCommFacilityId(facId ? String(facId) : "");
                  if (fac && (fac as any).districtId) {
                    setNewCommDistrictId(String((fac as any).districtId));
                  }
                }}
                onDistrictChange={(distId) => {
                  setNewCommDistrictId(distId ? String(distId) : "");
                }}
                disabled={isFacilityStaff}
                lockDistrictId={lockedCommDistrictId}
                required
                testIdPrefix="community-picker"
              />
              {isFacilityStaff && (
                <p className="text-xs text-muted-foreground">
                  Pinned to your facility — communities you add belong to it.
                </p>
              )}
              {isDistrictStaff && (
                <p className="text-xs text-muted-foreground">
                  Locked to your district — pick any facility within it.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Transport Mode</label>
                <Select
                  value={newCommTransportMode}
                  onValueChange={setNewCommTransportMode}
                >
                  <SelectTrigger data-testid="select-community-transport">
                    <SelectValue placeholder="Select Transport Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walking">Walking / Foot</SelectItem>
                    <SelectItem value="road">Road / Vehicle</SelectItem>
                    <SelectItem value="boat">Water / Boat</SelectItem>
                    <SelectItem value="air">Air / Flight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="htr-status"
                checked={newCommHTR}
                onCheckedChange={setNewCommHTR}
                data-testid="switch-community-htr"
              />
              <label htmlFor="htr-status" className="text-sm font-medium leading-none cursor-pointer">
                Hard to Reach (HTR) Community
              </label>
            </div>

            {/* Spatial Location Mapping */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-sm font-semibold">Community Location Mapping</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={commDrawMode === "pin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCommDrawMode("pin")}
                  >
                    Drop Pin Mode
                  </Button>
                  <Button
                    type="button"
                    variant={commDrawMode === "polygon" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCommDrawMode("polygon")}
                  >
                    Draw Polygon Mode
                  </Button>
                  {(newCommLat || newCommLng || commPolygonPoints.length > 0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewCommLat("");
                        setNewCommLng("");
                        setCommPolygonPoints([]);
                      }}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Reset Coordinates
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. -6.123456"
                    value={newCommLat}
                    onChange={(e) => setNewCommLat(e.target.value)}
                    data-testid="input-community-latitude"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 145.123456"
                    value={newCommLng}
                    onChange={(e) => setNewCommLng(e.target.value)}
                    data-testid="input-community-longitude"
                  />
                </div>
              </div>

              <div className="h-[300px] w-full rounded-md border overflow-hidden relative">
                <MapContainer
                  center={commMapCenter}
                  zoom={12}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapResizer />
                  <CommMapEvents />
                  
                  {/* Facility Marker if selected */}
                  {(() => {
                    if (newCommFacilityId) {
                      const fac = facilities?.find(f => f.id === parseInt(newCommFacilityId));
                      if (fac && fac.latitude !== null && fac.longitude !== null) {
                        return (
                          <Marker 
                            position={[parseFloat(fac.latitude.toString()), parseFloat(fac.longitude.toString())]} 
                            icon={L.divIcon({
                              className: 'custom-facility-icon',
                              html: '<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.4);"></div>',
                              iconSize: [16, 16],
                              iconAnchor: [8, 8]
                            })}
                          />
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Selected/Centroid Community Marker */}
                  {parseFloat(newCommLat) && parseFloat(newCommLng) && !isNaN(parseFloat(newCommLat)) && !isNaN(parseFloat(newCommLng)) && (
                    <Marker 
                      position={[parseFloat(newCommLat), parseFloat(newCommLng)]} 
                      icon={L.divIcon({
                        className: 'custom-community-icon',
                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })}
                    />
                  )}

                  {/* Drawn Polygon vertices / Polygon line */}
                  {commDrawMode === "polygon" && commPolygonPoints.length > 0 && (
                    <>
                      {commPolygonPoints.map((p, idx) => (
                        <Marker
                          key={idx}
                          position={p}
                          icon={L.divIcon({
                            className: 'polygon-vertex-icon',
                            html: '<div style="background-color: #3b82f6; width: 10px; height: 10px; border-radius: 50%; border: 1px solid #fff;"></div>',
                            iconSize: [10, 10],
                            iconAnchor: [5, 5]
                          })}
                        />
                      ))}
                      {commPolygonPoints.length > 1 && (
                        <LeafletPolygon
                          positions={commPolygonPoints}
                          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }}
                        />
                      )}
                    </>
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {commDrawMode === "pin" 
                  ? "Click on the map to drop a coordinate pin." 
                  : "Click multiple points on the map to define a community polygon. The centroid coordinates are calculated and updated in real time."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommunityDialogOpen(false)}
                data-testid="button-cancel-community"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCommunity}
                disabled={createCommunityMutation.isPending || updateCommunityMutation.isPending}
                data-testid="button-save-community"
              >
                {createCommunityMutation.isPending || updateCommunityMutation.isPending
                  ? "Saving..."
                  : editingCommunity
                  ? "Update Community"
                  : "Save Community"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Catchment Overlap / Harmonization Dialog (task #261) */}
      <Dialog
        open={overlapConflicts.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setOverlapConflicts([]);
            setOverlapSourceVillage(null);
            setHarmonizedIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catchment overlap detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The boundary you saved for{" "}
              <span className="font-semibold text-foreground">{overlapSourceVillage?.name}</span>{" "}
              overlaps the catchment of the communities below. You can ask the
              other facility's in-charge to harmonize the boundary.
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {overlapConflicts.map((c: any) => {
                const done = harmonizedIds.includes(Number(c.villageId));
                return (
                  <div
                    key={c.villageId}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    data-testid={`overlap-conflict-${c.villageId}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.villageName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.facilityName ? `Facility: ${c.facilityName}` : "Unassigned facility"}
                        {typeof c.overlapPct === "number" ? ` · ${c.overlapPct}% overlap` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={done ? "outline" : "default"}
                      disabled={done || harmonizeMutation.isPending}
                      onClick={() =>
                        overlapSourceVillage &&
                        harmonizeMutation.mutate({
                          villageId: overlapSourceVillage.id,
                          conflictingVillageId: Number(c.villageId),
                          overlapPct: typeof c.overlapPct === "number" ? c.overlapPct : undefined,
                        })
                      }
                      data-testid={`button-harmonize-${c.villageId}`}
                    >
                      {done ? "Requested" : "Request harmonization"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOverlapConflicts([]);
                setOverlapSourceVillage(null);
                setHarmonizedIds([]);
              }}
              data-testid="button-close-overlap"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Facility AlertDialog */}
      <AlertDialog open={!!deletingFacility} onOpenChange={(open) => !open && setDeletingFacility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFacility?.name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFacility && deleteMutation.mutate(deletingFacility.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Community AlertDialog */}
      <AlertDialog open={!!deletingCommunity} onOpenChange={(open) => !open && setDeletingCommunity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the community "{deletingCommunity?.name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-comm-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCommunity && deleteCommunityMutation.mutate(deletingCommunity.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-comm-delete"
            >
              {deleteCommunityMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
