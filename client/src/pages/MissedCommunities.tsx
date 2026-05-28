/**
 * Missed Communities Analysis Page — Task #40
 *
 * Reads `/api/missed-communities` (deterministic scorer) and presents a map +
 * ranked list with antigen / period / district filters. Users can multi-select
 * villages and click "Create outreach sessions" to draft a routine microplan
 * with child outreach session-plans pre-populated.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapContainer, CircleMarker, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, MapPin, Target, ArrowRight, RefreshCw, Layers } from "lucide-react";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import {
  BasemapSwitcher,
  BasemapTileLayer,
  usePersistedBasemap,
} from "@/components/map/BasemapToggle";

interface MissedRow {
  villageId: number;
  villageName: string;
  facilityId: number;
  facilityName: string;
  districtId: number;
  districtName?: string;
  provinceName?: string;
  latitude: number | null;
  longitude: number | null;
  registeredPopulation: number;
  dosesAdministered: number;
  unservedEstimate: number;
  isHardToReach: boolean;
  distanceKm: number;
  grid3Evidence: number;
  score: number;
  components: { unserved: number; htr: number; distance: number; grid3: number };
}

const DEFAULT_ANTIGENS = ["BCG", "PENTA1", "PENTA3", "MEASLES1", "MEASLES2", "OPV1", "OPV3"];

export default function MissedCommunities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [antigen, setAntigen] = useState("PENTA3");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [basemap, setBasemap] = usePersistedBasemap("osm");

  const { data, isLoading, refetch, isFetching } = useQuery<{ count: number; results: MissedRow[] }>({
    queryKey: ["/api/missed-communities", antigen, period, districtId],
    queryFn: async () => {
      const params = new URLSearchParams({ antigen, period });
      if (districtId) params.set("districtId", String(districtId));
      const r = await fetch(`/api/missed-communities?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const allRows = data?.results ?? [];
  // Apply client-side facility filter (server filters by district)
  const rows = useMemo(
    () => (facilityId ? allRows.filter((r) => r.facilityId === facilityId) : allRows),
    [allRows, facilityId],
  );

  const mapped = rows.filter((r) => r.latitude != null && r.longitude != null);
  const mapCenter: [number, number] = mapped.length
    ? [mapped[0].latitude!, mapped[0].longitude!]
    : [-6.314993, 143.95555]; // PNG fallback

  const toggleSelect = (vid: number) => {
    setSelected((prev) => {
      const next = new Set<number>(prev);
      if (next.has(vid)) next.delete(vid); else next.add(vid);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(rows.slice(0, 50).map((r) => r.villageId)));
  const clearAll = () => setSelected(new Set());

  const createOutreach = useMutation({
    mutationFn: async () => {
      const d = new Date();
      const year = d.getFullYear();
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return await apiRequest<any>("POST", "/api/missed-communities/create-outreach", {
        villageIds: Array.from(selected),
        antigen,
        year,
        quarter,
      });
    },
    onSuccess: (res) => {
      toast({
        title: "Draft microplan created",
        description: `${res.sessions.length} outreach session(s) drafted across ${selected.size} villages. Opening builder…`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      setSelected(new Set());
      const first = res.microplans?.[0] ?? res.microplan;
      if (first?.id) setLocation(`/microplans/routine/${first.id}`);
    },
    onError: (err: Error) => toast({ title: "Failed to create microplan", description: err.message, variant: "destructive" }),
  });

  const scoreMax = rows[0]?.score ?? 1;
  const colorForScore = (s: number) => {
    const r = s / scoreMax;
    if (r > 0.66) return "#dc2626"; // red
    if (r > 0.33) return "#ea580c"; // orange
    return "#ca8a04"; // amber
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-rose-500" />
            Missed Communities
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ranked villages with unimmunized children, based on imported facility coverage vs. registered population, weighted by hard-to-reach status, distance, and GRID3 evidence.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <GeoCascadeFilter
            provinceId={provinceId}
            districtId={districtId}
            facilityId={facilityId}
            onProvinceChange={(id) => {
              setProvinceId(id);
              setDistrictId(null);
              setFacilityId(null);
            }}
            onDistrictChange={(id) => {
              setDistrictId(id);
              setFacilityId(null);
            }}
            onFacilityChange={setFacilityId}
            showFacility
            testIdPrefix="missed-geo"
          />
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Antigen</Label>
              <Select value={antigen} onValueChange={setAntigen}>
                <SelectTrigger data-testid="select-antigen"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_ANTIGENS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Period (YYYYMM)</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="font-mono"
                data-testid="input-period"
              />
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <Label className="text-xs uppercase text-muted-foreground">Results</Label>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{rows.length} villages</Badge>
                <Badge className="bg-rose-500/10 text-rose-700 border-rose-200" variant="secondary">
                  {selected.size} selected
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-rose-500" />
              Geographic distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] relative">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : mapped.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  <MapPin className="h-5 w-5 mr-2" />
                  No mapped villages with missed-community scores for this filter.
                </div>
              ) : (
                <>
                  <MapContainer center={mapCenter} zoom={6} className="h-full w-full" scrollWheelZoom>
                    <BasemapTileLayer basemap={basemap} />
                    {mapped.map((v) => (
                    <CircleMarker
                      key={v.villageId}
                      center={[v.latitude!, v.longitude!]}
                      radius={selected.has(v.villageId) ? 12 : 8}
                      pathOptions={{
                        color: selected.has(v.villageId) ? "#1d4ed8" : colorForScore(v.score),
                        fillColor: colorForScore(v.score),
                        fillOpacity: 0.7,
                        weight: selected.has(v.villageId) ? 3 : 1,
                      }}
                      eventHandlers={{ click: () => toggleSelect(v.villageId) }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-semibold">{v.villageName}</div>
                          <div>{v.facilityName} · {v.districtName}</div>
                          <div>Score: <strong>{v.score}</strong></div>
                          <div>Unserved est: {v.unservedEstimate} / {v.registeredPopulation}</div>
                          {v.isHardToReach && <Badge className="bg-amber-500/10 text-amber-700">Hard-to-reach</Badge>}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                  </MapContainer>
                  <BasemapSwitcher basemap={basemap} onChange={setBasemap} />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranked list */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Ranked missed communities
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs">Select top 50</Button>
              <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs">Clear</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] overflow-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : rows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                  No missed communities for this filter. Make sure imported coverage exists for this antigen + period.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-left">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Village</th>
                      <th className="p-2">Facility · District</th>
                      <th className="p-2 text-right">Unserved</th>
                      <th className="p-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.villageId}
                        className={`border-b border-border/50 hover:bg-secondary/40 ${selected.has(r.villageId) ? "bg-rose-500/5" : ""}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selected.has(r.villageId)}
                            onCheckedChange={() => toggleSelect(r.villageId)}
                            data-testid={`checkbox-village-${r.villageId}`}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{r.villageName}</div>
                          {r.isHardToReach && (
                            <Badge className="bg-amber-500/10 text-amber-700 text-[10px] mt-0.5" variant="secondary">HTR</Badge>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          <div>{r.facilityName}</div>
                          <div className="text-[10px]">{r.districtName}</div>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {r.unservedEstimate}/{r.registeredPopulation}
                        </td>
                        <td className="p-2 text-right">
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: colorForScore(r.score) + "20", color: colorForScore(r.score), borderColor: colorForScore(r.score) }}
                          >
                            {r.score}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Card className="shadow-2xl border-rose-200">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-sm font-medium">
              {selected.size} village{selected.size === 1 ? "" : "s"} selected
            </span>
            <Button
              size="sm"
              disabled={selected.size === 0 || createOutreach.isPending}
              onClick={() => createOutreach.mutate()}
              className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
              data-testid="btn-create-outreach"
            >
              {createOutreach.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating…</>
                : <>Create outreach microplan <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
