/**
 * Zero-Dose / Under-Immunized — per-village drilldown with map.
 *
 * Drills the dashboard's zero-dose tile into a ranked village list plus a
 * Leaflet pin layer, so planners can spot exactly which catchment areas are
 * driving the missed-child counts and target outreach accordingly.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Syringe, MapPin, Layers, ArrowLeft } from "lucide-react";

interface VillageRow {
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
  missed: number;
  denominator: number;
  pct: number;
  underImmunizedPct: number;
}

interface ZeroDoseSummary {
  total: number;
  denominator: number;
  pct: number;
  underImmunized: { total: number; denominator: number; pct: number };
  byDistrict: Array<{ districtId: number; districtName: string }>;
  byVillage: VillageRow[];
}

type Mode = "zero" | "under";

export default function ZeroDoseVillages() {
  const [mode, setMode] = useState<Mode>("zero");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<ZeroDoseSummary>({
    queryKey: ["/api/indicators/zero-dose"],
  });

  const rows = data?.byVillage ?? [];

  const districts = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) m.set(r.districtId, r.districtName);
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (mode === "zero" ? r.zeroDose > 0 : r.underImmunized > 0))
      .filter((r) => !districtFilter || String(r.districtId) === districtFilter)
      .filter(
        (r) =>
          !q ||
          r.villageName.toLowerCase().includes(q) ||
          r.facilityName.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        mode === "zero"
          ? b.zeroDose - a.zeroDose
          : b.underImmunized - a.underImmunized,
      );
  }, [rows, mode, districtFilter, search]);

  const mapped = filtered.filter((v) => v.latitude != null && v.longitude != null);
  const mapCenter: [number, number] = mapped.length
    ? [mapped[0].latitude!, mapped[0].longitude!]
    : [-6.314993, 143.95555];

  const accent = mode === "zero" ? "rose" : "amber";
  const accentText = mode === "zero" ? "text-rose-600" : "text-amber-600";
  const accentBorder = mode === "zero" ? "border-rose-200" : "border-amber-200";
  const Icon = mode === "zero" ? AlertTriangle : Syringe;

  const countFor = (r: VillageRow) => (mode === "zero" ? r.zeroDose : r.underImmunized);
  const maxCount = Math.max(1, ...filtered.map(countFor));
  const colorFor = (n: number) => {
    const r = n / maxCount;
    if (mode === "zero") {
      if (r > 0.66) return "#dc2626";
      if (r > 0.33) return "#ea580c";
      return "#f59e0b";
    }
    if (r > 0.66) return "#d97706";
    if (r > 0.33) return "#f59e0b";
    return "#fbbf24";
  };

  const totalDisplay =
    mode === "zero" ? data?.total ?? 0 : data?.underImmunized.total ?? 0;
  const denominatorDisplay = data?.denominator ?? 0;
  const pctDisplay =
    mode === "zero" ? data?.pct ?? 0 : data?.underImmunized.pct ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/"
            className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline mb-2"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft className="h-3 w-3" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon className={`h-6 w-6 ${accentText}`} />
            {mode === "zero" ? "Zero-dose children" : "Under-immunized children"} by village
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            {mode === "zero"
              ? "Children ≥12 months with no DTP1 (Pentavalent-1) dose recorded, broken down by the village they live in. Use this to pick catch-up outreach targets."
              : "Children ≥12 months who received DTP1 but not DTP3 (Pentavalent-3), broken down by village. Use this to plan defaulter follow-up."}
          </p>
        </div>
      </div>

      {/* Filters + headline */}
      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Indicator</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zero">Zero-dose (no DTP1)</SelectItem>
                  <SelectItem value="under">Under-immunized (DTP1, no DTP3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">District</Label>
              <Select
                value={districtFilter || "all"}
                onValueChange={(v) => setDistrictFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger data-testid="select-district"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Search</Label>
              <Input
                placeholder="Village or facility…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <Label className="text-xs uppercase text-muted-foreground">Total in scope</Label>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${accentText}`} data-testid="text-total">
                  {totalDisplay.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  of {denominatorDisplay.toLocaleString()} · {pctDisplay}%
                </span>
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
              <Layers className={`h-4 w-4 ${accentText}`} />
              Village pins ({mapped.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : mapped.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  <MapPin className="h-5 w-5 mr-2" />
                  No mapped villages with {mode === "zero" ? "zero-dose" : "under-immunized"} children for this filter.
                </div>
              ) : (
                <MapContainer
                  key={`${mode}-${districtFilter}`}
                  center={mapCenter}
                  zoom={6}
                  className="h-full w-full"
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapped.map((v) => {
                    const n = countFor(v);
                    const color = colorFor(n);
                    const radius = 6 + Math.round((n / maxCount) * 12);
                    return (
                      <CircleMarker
                        key={`${v.villageId ?? "f" + v.facilityId}`}
                        center={[v.latitude!, v.longitude!]}
                        radius={radius}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.65,
                          weight: 1,
                        }}
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
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranked list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className={`h-4 w-4 ${accentText}`} />
              Ranked villages ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] overflow-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                  No villages have {mode === "zero" ? "zero-dose" : "under-immunized"} children for this filter.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-left">
                      <th className="p-2">Village</th>
                      <th className="p-2">Facility · District</th>
                      <th className="p-2 text-right">
                        {mode === "zero" ? "Zero-dose" : "Under-imm."}
                      </th>
                      <th className="p-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const n = countFor(r);
                      const pct = mode === "zero" ? r.pct : r.underImmunizedPct;
                      return (
                        <tr
                          key={`${r.villageId ?? "f" + r.facilityId}`}
                          className="border-b border-border/50 hover:bg-secondary/40"
                          data-testid={`row-village-${r.villageId ?? "f" + r.facilityId}`}
                        >
                          <td className="p-2">
                            <div className="font-medium flex items-center gap-1">
                              {r.latitude != null && r.longitude != null && (
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                              )}
                              {r.villageName}
                            </div>
                            {r.isHardToReach && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/10 text-amber-700 text-[10px] mt-0.5"
                              >
                                HTR
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            <div>{r.facilityName}</div>
                            <div className="text-[10px]">{r.districtName}</div>
                          </td>
                          <td className="p-2 text-right font-mono">
                            <span className={`font-semibold ${accentText}`}>{n}</span>
                            <span className="text-muted-foreground"> / {r.denominator}</span>
                          </td>
                          <td className="p-2 text-right">
                            <Badge variant="outline" className={accentBorder}>
                              {pct}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
