import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users, MapPin, Clock, RefreshCw, Radio, AlertCircle,
  Activity, Wifi, WifiOff, Navigation,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldTeamMember = {
  userId: string | null;
  name: string;
  role: string | null;
  districtId: number | null;
  path: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  lastSeen: string | Date;
};

type FieldTeamsResponse = {
  teams: FieldTeamMember[];
  timestamp: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  facility_clerk: "Facility Clerk",
  facility_in_charge: "Facility In-Charge",
  district_manager: "District Manager",
  provincial_coordinator: "Provincial Coordinator",
  national_admin: "National Admin",
  gis_specialist: "GIS Specialist",
  facility_partner: "Implementing Partner (Facility)",
  district_partner: "Implementing Partner (District)",
  provincial_partner: "Implementing Partner (Province)",
  national_partner: "Implementing Partner (National)",
  national_manager: "National Manager",
};

const ROLE_COLORS: Record<string, string> = {
  facility_clerk: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  facility_in_charge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  district_manager: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  provincial_coordinator: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  national_admin: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  gis_specialist: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  facility_partner: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  district_partner: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  provincial_partner: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  national_partner: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  national_manager: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
};

const PATH_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/all-sessions": "Sessions Hub",
  "/sessions": "Session Planning",
  "/facilities": "Facilities",
  "/map": "Map View",
  "/clients": "Client Logbook",
  "/supervision": "Supervision",
  "/population": "Population",
  "/stock": "Stock Ledger",
};

function friendlyPath(path: string | null): string {
  if (!path) return "Unknown page";
  const exact = PATH_LABELS[path];
  if (exact) return exact;
  // strip query params and try again
  const base = path.split("?")[0];
  return PATH_LABELS[base] ?? path;
}

function timeAgo(lastSeen: string | Date): string {
  const ms = Date.now() - new Date(lastSeen).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function isRecentlyActive(lastSeen: string | Date): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000; // 10 min
}

// ─── Map component — only loaded when the user has GPS data ───────────────────

function TeamMap({ teams }: { teams: FieldTeamMember[] }) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  const teamsWithGps = teams.filter((t) => t.lat != null && t.lng != null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let active = true;

    (async () => {
      const L = (await import("leaflet")).default;
      // Fix default icon paths broken by Vite asset hashing
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!active || !mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoom: 7,
          center: [0, 25],
          zoomControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxNativeZoom: 19,
          maxZoom: 22,
        }).addTo(mapRef.current);
      }

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (!active) return;

      teamsWithGps.forEach((member) => {
        const active = isRecentlyActive(member.lastSeen);
        const circle = L.circleMarker([member.lat!, member.lng!], {
          radius: 10,
          fillColor: active ? "#22c55e" : "#94a3b8",
          color: active ? "#15803d" : "#64748b",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        })
          .bindPopup(
            `<div style="min-width:160px">
              <strong>${member.name}</strong><br/>
              <span style="color:#64748b;font-size:0.75rem">${ROLE_LABELS[member.role ?? ""] ?? (member.role ?? "Unknown")}</span><br/>
              <span style="font-size:0.75rem">📍 ${member.location ?? "GPS only"}</span><br/>
              <span style="font-size:0.75rem">📄 ${friendlyPath(member.path)}</span><br/>
              <span style="font-size:0.75rem;color:${active ? "#15803d" : "#94a3b8"}">
                ● ${timeAgo(member.lastSeen)}
              </span>
            </div>`
          )
          .addTo(mapRef.current!);
        markersRef.current.push(circle);
      });

      // Fit map to markers if any
      if (teamsWithGps.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(teamsWithGps.map((t) => [t.lat!, t.lng!]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      }
    })();

    return () => {
      active = false;
    };
  }, [teamsWithGps]);

  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (teamsWithGps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground text-sm gap-2">
        <Navigation className="h-8 w-8 opacity-40" />
        <p>No GPS data available yet.</p>
        <p className="text-xs">Teams share location when they open VaxPlan on a GPS-enabled device.</p>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-[340px] w-full rounded-md overflow-hidden" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FieldTeams() {
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data, isLoading, error, refetch, isFetching } = useQuery<FieldTeamsResponse>({
    queryKey: ["/api/field-teams"],
    queryFn: async () => {
      const r = await fetch("/api/field-teams", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load field teams");
      return r.json();
    },
    refetchInterval: 30_000, // Auto-refresh every 30 s to match heartbeat cycle
    staleTime: 20_000,
  });

  useEffect(() => {
    if (data) setLastRefresh(new Date());
  }, [data]);

  const teams = data?.teams ?? [];
  const activeTeams = teams.filter((t) => isRecentlyActive(t.lastSeen));
  const inactiveTeams = teams.filter((t) => !isRecentlyActive(t.lastSeen));

  if (!user) return null;

  const ALLOWED = ["district_manager", "provincial_coordinator", "national_admin", "gis_specialist", "national_manager", "national_partner", "provincial_partner", "district_partner"];
  const userRole = (user as any).role ?? "";
  if (!ALLOWED.includes(userRole)) {
    return (
      <div className="container mx-auto px-4 py-10 text-center space-y-3">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">This page is available to district managers and above.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radio className="h-7 w-7 text-emerald-500" />
            Field Teams — Live
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time view of vaccination teams currently active in VaxPlan.
            Updates every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="btn-refresh-field-teams"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Teams online now"
          value={isLoading ? "…" : String(activeTeams.length)}
          icon={Wifi}
          tone="emerald"
        />
        <SummaryCard
          label="Recently active"
          value={isLoading ? "…" : String(inactiveTeams.length)}
          icon={Activity}
          tone="amber"
        />
        <SummaryCard
          label="Total in system"
          value={isLoading ? "…" : String(teams.length)}
          icon={Users}
          tone="sky"
        />
        <SummaryCard
          label="With GPS"
          value={isLoading ? "…" : String(teams.filter((t) => t.lat != null).length)}
          icon={MapPin}
          tone="violet"
        />
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            Team locations
            <span className="text-xs font-normal text-muted-foreground ml-1">
              (GPS positions are approximate ±11 km for privacy)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-6">
          {isLoading ? (
            <Skeleton className="h-[340px] w-full rounded-md" />
          ) : (
            <TeamMap teams={teams} />
          )}
        </CardContent>
      </Card>

      {/* Active teams table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-500" />
            Active now
            <Badge variant="secondary" className="ml-1">{activeTeams.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Could not load field teams. You may not have permission.
            </div>
          ) : activeTeams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No team members are currently active in the system.
            </div>
          ) : (
            <div className="divide-y rounded-md border overflow-hidden">
              {activeTeams.map((member, idx) => (
                <TeamRow key={member.userId ?? idx} member={member} active />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently inactive teams */}
      {inactiveTeams.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recently active (last 5 min)
              <Badge variant="outline" className="ml-1">{inactiveTeams.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border overflow-hidden">
              {inactiveTeams.map((member, idx) => (
                <TeamRow key={member.userId ?? idx} member={member} active={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone: string;
}) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamRow({ member, active }: { member: FieldTeamMember; active: boolean }) {
  return (
    <div className="px-3 py-3 flex items-center gap-3 flex-wrap">
      {/* Online indicator */}
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
          active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
        }`}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
          {member.name}
          <Badge
            variant="outline"
            className={`text-xs ${ROLE_COLORS[member.role ?? ""] ?? "bg-muted text-muted-foreground"}`}
          >
            {ROLE_LABELS[member.role ?? ""] ?? member.role ?? "Unknown"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
          {member.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {member.location}
            </span>
          )}
          {!member.location && member.lat != null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              GPS: {member.lat.toFixed(1)}°, {member.lng?.toFixed(1)}°
            </span>
          )}
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {friendlyPath(member.path)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(member.lastSeen)}
          </span>
        </div>
      </div>
    </div>
  );
}
