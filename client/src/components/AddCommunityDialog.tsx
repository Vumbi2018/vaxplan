import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { MapPin, Plus, Sliders, Navigation, Footprints, AlertTriangle } from "lucide-react";
import type { Facility, Llg } from "@shared/schema";

// Import Leaflet components for the interactive coordinate selector map
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix standard Leaflet default marker icon displacement/missing asset issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface AddCommunityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFacilityId?: number | null;
  onSuccess?: (newVillage: any) => void;
}

export function AddCommunityDialog({
  isOpen,
  onClose,
  defaultFacilityId,
  onSuccess,
}: AddCommunityDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Role-based scoping for WHERE a community can be added (task #261):
  // - Facility staff are pinned & locked to their own facility.
  // - District managers are scoped to their district (province + district locked).
  // - Everyone else (admins / coordinators) gets the full searchable cascade.
  const role = (user as any)?.role;
  const isFacilityStaff = role === "facility_clerk" || role === "facility_in_charge";
  const isDistrictStaff = role === "district_manager";
  const lockedFacilityId = isFacilityStaff ? (user as any)?.facilityId ?? null : null;
  const lockedDistrictId = isDistrictStaff ? (user as any)?.districtId ?? null : null;

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [assignedFacilityId, setAssignedFacilityId] = useState<string>("");
  const [llgId, setLlgId] = useState<string>("none");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [distanceToFacility, setDistanceToFacility] = useState("");
  const [travelTimeMinutes, setTravelTimeMinutes] = useState("");
  const [terrainDifficulty, setTerrainDifficulty] = useState("1");
  const [seasonalAccessibility, setSeasonalAccessibility] = useState("good");
  const [transportMode, setTransportMode] = useState("road");
  const [isHardToReach, setIsHardToReach] = useState(false);
  const [insecurityLevel, setInsecurityLevel] = useState("1");
  const [comments, setComments] = useState("");

  // Queries
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: tenant } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
    enabled: isOpen,
  });

  // Set default facility if supplied. Facility staff are always pinned to their
  // own facility regardless of any default passed in.
  useEffect(() => {
    if (!isOpen) return;
    if (lockedFacilityId) {
      setAssignedFacilityId(String(lockedFacilityId));
    } else if (defaultFacilityId) {
      setAssignedFacilityId(defaultFacilityId.toString());
    } else if (facilities && facilities.length > 0 && !assignedFacilityId) {
      setAssignedFacilityId(facilities[0].id.toString());
    }
  }, [defaultFacilityId, facilities, isOpen, lockedFacilityId]);

  // Resolve active facility and its district to fetch Wards (LLGs)
  const activeFacility = useMemo(() => {
    if (!facilities || !assignedFacilityId) return null;
    return facilities.find((f) => f.id.toString() === assignedFacilityId) || null;
  }, [facilities, assignedFacilityId]);

  // Fetch Wards (LLGs) cascading based on the active facility's district
  const { data: llgs } = useQuery<Llg[]>({
    queryKey: [`/api/llgs`, { districtId: activeFacility?.districtId }],
    enabled: !!activeFacility?.districtId && isOpen,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setCode("");
      setLlgId("none");
      setLatitude("");
      setLongitude("");
      setDistanceToFacility("");
      setTravelTimeMinutes("");
      setTerrainDifficulty("1");
      setSeasonalAccessibility("good");
      setTransportMode("road");
      setIsHardToReach(false);
      setInsecurityLevel("1");
      setComments("");
    }
  }, [isOpen]);

  const createVillageMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/villages", data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      toast({
        title: "Community Registered",
        description: `"${res.name}" has been registered inside the active facility catchment.`,
      });
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Registration Failed",
        description: err.message || "Failed to add community.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please specify the community or village name.",
        variant: "destructive",
      });
      return;
    }
    if (!assignedFacilityId) {
      toast({
        title: "Facility Required",
        description: "Please assign the community to a health facility.",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      name: name.trim(),
      code: code.trim() || null,
      assignedFacilityId: parseInt(assignedFacilityId),
      isHardToReach,
      terrainDifficulty: parseInt(terrainDifficulty),
      seasonalAccessibility,
      transportMode,
      insecurityLevel: parseInt(insecurityLevel),
      comments: comments.trim() || null,
    };

    if (llgId && llgId !== "none") {
      payload.llgId = parseInt(llgId);
    }
    if (latitude.trim()) payload.latitude = latitude.trim();
    if (longitude.trim()) payload.longitude = longitude.trim();
    if (distanceToFacility.trim()) payload.distanceToFacility = distanceToFacility.trim();
    if (travelTimeMinutes.trim()) payload.travelTimeMinutes = parseInt(travelTimeMinutes);

    createVillageMutation.mutate(payload);
  };

  // Interactive Leaflet Map Event handler
  function MapEvents() {
    useMapEvents({
      click(e) {
        setLatitude(e.latlng.lat.toFixed(6));
        setLongitude(e.latlng.lng.toFixed(6));
      }
    });
    return null;
  }

  // Resolve standard map view coordinates
  const mapCenter = useMemo(() => {
    if (activeFacility && activeFacility.latitude && activeFacility.longitude) {
      return [parseFloat(activeFacility.latitude.toString()), parseFloat(activeFacility.longitude.toString())] as [number, number];
    }
    // Check country/tenant center or fall back to Zambia Lusaka Center
    if (tenant?.settings?.mapCenter && Array.isArray(tenant.settings.mapCenter)) {
      return [tenant.settings.mapCenter[0], tenant.settings.mapCenter[1]] as [number, number];
    }
    return [-15.42, 28.29] as [number, number];
  }, [activeFacility, tenant]);

  const latVal = latitude ? parseFloat(latitude) : null;
  const lngVal = longitude ? parseFloat(longitude) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[95vw] md:max-w-lg bg-card border border-border text-foreground rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] p-4 md:p-6 font-sans">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base md:text-lg font-black flex items-center gap-2 text-foreground">
            <Plus className="h-5 w-5 text-indigo-500" />
            Add New Village/Community
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a new community or administrative ward on the fly during microplanning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Section 1: Basic Info */}
          <div className="space-y-3 p-3 bg-muted/30 dark:bg-slate-800/20 border border-border/40 rounded-2xl">
            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Basic Identifiers
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="comm-name" className="text-xs font-semibold">Community/Village Name *</Label>
                <Input
                  id="comm-name"
                  placeholder="e.g. Mukuni Village"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background rounded-xl text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comm-code" className="text-xs font-semibold">Village/Ward Code</Label>
                <Input
                  id="comm-code"
                  placeholder="e.g. ZM-102"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-background rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold">Assigned Health Facility *</Label>
                <FacilityCascadePicker
                  value={assignedFacilityId ? Number(assignedFacilityId) : null}
                  onChange={(id) => setAssignedFacilityId(id ? String(id) : "")}
                  required
                  showLabels={false}
                  testIdPrefix="add-community-facility"
                  disabled={isFacilityStaff}
                  lockDistrictId={lockedDistrictId}
                />
                {isFacilityStaff && (
                  <p className="text-[10px] text-muted-foreground italic">
                    New communities are added under your facility's catchment.
                  </p>
                )}
                {isDistrictStaff && (
                  <p className="text-[10px] text-muted-foreground italic">
                    You can add communities to any facility in your district.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Administrative Ward (LLG)</Label>
                <Select
                  value={llgId}
                  onValueChange={setLlgId}
                  disabled={!llgs || llgs.length === 0}
                >
                  <SelectTrigger className="bg-background rounded-xl text-xs">
                    <SelectValue placeholder={llgs && llgs.length > 0 ? "Select Ward" : "No Wards in district"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Direct catchment)</SelectItem>
                    {llgs?.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: GIS Location */}
          <div className="space-y-3 p-3 bg-muted/30 dark:bg-slate-800/20 border border-border/40 rounded-2xl">
            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Geographic Location
            </h4>
            
            {/* Interactive Leaflet Map picker */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground italic leading-tight">
                Click a point on the map below to select coordinates, or type them manually in the fields:
              </Label>
              <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-border relative mt-1.5 shadow-inner">
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  className="h-full w-full z-10"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapEvents />
                  {latVal !== null && lngVal !== null && !isNaN(latVal) && !isNaN(lngVal) && (
                    <Marker position={[latVal, lngVal]} />
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="comm-lat" className="text-xs font-semibold">Latitude</Label>
                <Input
                  id="comm-lat"
                  type="number"
                  step="any"
                  placeholder="e.g. -15.42"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="bg-background rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comm-lng" className="text-xs font-semibold">Longitude</Label>
                <Input
                  id="comm-lng"
                  type="number"
                  step="any"
                  placeholder="e.g. 28.29"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="bg-background rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Risk Profiling */}
          <div className="space-y-3 p-3 bg-muted/30 dark:bg-slate-800/20 border border-border/40 rounded-2xl">
            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="h-3 w-3" /> HTR Accessibility Risk Profiling
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="comm-dist" className="text-xs font-semibold">Distance to Facility (km)</Label>
                <Input
                  id="comm-dist"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12.5"
                  value={distanceToFacility}
                  onChange={(e) => setDistanceToFacility(e.target.value)}
                  className="bg-background rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comm-time" className="text-xs font-semibold">Travel Time (Minutes)</Label>
                <Input
                  id="comm-time"
                  type="number"
                  placeholder="e.g. 45"
                  value={travelTimeMinutes}
                  onChange={(e) => setTravelTimeMinutes(e.target.value)}
                  className="bg-background rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Terrain Difficulty</Label>
                <Select value={terrainDifficulty} onValueChange={setTerrainDifficulty}>
                  <SelectTrigger className="bg-background rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1: Flat / Good road</SelectItem>
                    <SelectItem value="2">2: Moderate hills</SelectItem>
                    <SelectItem value="3">3: Mountainous / Offroad</SelectItem>
                    <SelectItem value="4">4: Steep cliffs / Riverine</SelectItem>
                    <SelectItem value="5">5: Severe risk / Forest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Primary Transport Mode</Label>
                <Select value={transportMode} onValueChange={setTransportMode}>
                  <SelectTrigger className="bg-background rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">Vehicle/Motorcycle</SelectItem>
                    <SelectItem value="walking">Walking / Foot</SelectItem>
                    <SelectItem value="boat">Canoe / Boat</SelectItem>
                    <SelectItem value="air">Air (Flight/Helicopter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Seasonal Isolation</Label>
              <Select value={seasonalAccessibility} onValueChange={setSeasonalAccessibility}>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Security / Insecurity Level</Label>
                <Select value={insecurityLevel} onValueChange={setInsecurityLevel}>
                  <SelectTrigger className="bg-background rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1: Secure / Safe</SelectItem>
                    <SelectItem value="2">2: Minor concerns</SelectItem>
                    <SelectItem value="3">3: Moderate insecurity</SelectItem>
                    <SelectItem value="4">4: Severe conflict risk</SelectItem>
                    <SelectItem value="5">5: Critical / No-go zone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="comm-comments" className="text-xs font-semibold">Comments / Local Context</Label>
                <Input
                  id="comm-comments"
                  placeholder="e.g. escorts required, flood zones"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="bg-background rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border border-dashed border-indigo-500/20 bg-indigo-500/5 rounded-xl p-3 mt-1">
              <div className="space-y-0.5">
                <Label htmlFor="comm-htr" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-indigo-500" />
                  Hard-to-Reach (HTR) Vulnerability
                </Label>
                <p className="text-[10px] text-muted-foreground">Flag as Hard-to-Reach to prioritize outreach operations.</p>
              </div>
              <Switch
                id="comm-htr"
                checked={isHardToReach}
                onCheckedChange={setIsHardToReach}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 flex flex-row justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createVillageMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10"
            >
              {createVillageMutation.isPending ? "Registering..." : "Add Community"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
