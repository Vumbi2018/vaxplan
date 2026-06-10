import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Eye,
  Users,
  Globe,
  MapPin,
  Clock,
  Shield,
  Monitor,
  Mail,
  Network,
  ChevronDown,
  Map as MapIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_TILE_ATTRIBUTION } from "@/data/dataSources";

interface OnlineUser {
  userId: string | null;
  name: string;
  email: string | null;
  role: string | null;
  path: string;
  location: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  latitude: number | null;
  longitude: number | null;
  lastSeen: string | null;
}

interface TrafficAnalytics {
  online: OnlineUser[];
  onlineCount: number;
  visitsToday: number;
  uniqueVisitorsToday: number;
  visitsLast30Days: number;
  visitsOverTime: Array<{ date: string; visits: number; visitors: number }>;
  topPages: Array<{ path: string; visits: number }>;
  locations: Array<{ location: string; visits: number; visitors: number }>;
  viewerIsPlatformAdmin?: boolean;
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iOS"
      : /Android/i.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown OS";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} · ${os}`;
}

const ROLE_LABELS: Record<string, string> = {
  facility_clerk: "Facility Clerk",
  facility_in_charge: "Facility In-Charge",
  district_manager: "District Manager",
  provincial_coordinator: "Provincial Coordinator",
  national_admin: "National Admin",
  national_program_manager: "National Program Manager",
  gis_specialist: "GIS Specialist",
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/map": "Map View",
  "/facilities": "Facilities",
  "/population": "Population Hub",
  "/clients": "Client Logbook",
  "/all-sessions": "Sessions",
  "/stock": "Stock Ledger",
  "/htr": "Hard-to-Reach",
  "/approvals": "Approvals",
  "/supervision": "Supervision",
  "/settlement-intelligence": "Settlement Intel",
  "/missed-communities": "Missed Communities",
  "/national-plan": "National Plan",
  "/standards-alignment": "Standards Alignment",
  "/settings": "Settings",
  "/help": "Help",
  "/microplans/routine": "Routine Microplan",
  "/microplans/campaigns": "SIA Campaigns",
  "/indicators/zero-dose": "Zero-dose Villages",
  "/indicators/dropout": "Dropout Rates",
  "/clients/defaulters": "Defaulter List",
};

function labelForPath(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  // Match known prefixes for detail routes (e.g. /microplans/routine/123).
  for (const key of Object.keys(PAGE_LABELS)) {
    if (key !== "/" && path.startsWith(key + "/")) return PAGE_LABELS[key];
  }
  return path;
}

function roleLabel(role: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  return mins === 1 ? "1 min ago" : `${mins} mins ago`;
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className={accent}>{icon}</span>
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function SiteActivityPanel() {
  const { data, isLoading } = useQuery<TrafficAnalytics>({
    queryKey: ["/api/analytics/summary"],
    refetchInterval: 30000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const maxPage = Math.max(1, ...(data?.topPages ?? []).map((p) => p.visits));
  const isSuperAdmin = data?.viewerIsPlatformAdmin === true;
  const mapped = (data?.online ?? []).filter(
    (u) => typeof u.latitude === "number" && typeof u.longitude === "number",
  );
  const mapCenter: [number, number] =
    mapped.length > 0
      ? [
          mapped.reduce((s, u) => s + (u.latitude as number), 0) / mapped.length,
          mapped.reduce((s, u) => s + (u.longitude as number), 0) / mapped.length,
        ]
      : [10, 0];

  return (
    <Card data-testid="card-site-activity">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Site activity
          </CardTitle>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Badge variant="outline" className="border-violet-500 text-violet-600">
                <Shield className="mr-1 h-3 w-3" />
                Super admin view
              </Badge>
            )}
            {data && (
              <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {data.onlineCount} online now
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No activity data available yet.</p>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Users className="h-4 w-4" />}
                label="Online now"
                value={data.onlineCount}
                hint="Active in last 5 min"
                accent="text-emerald-500"
              />
              <KpiCard
                icon={<Eye className="h-4 w-4" />}
                label="Visits today"
                value={data.visitsToday}
                hint={`${data.uniqueVisitorsToday.toLocaleString()} unique ${data.uniqueVisitorsToday === 1 ? "user" : "users"}`}
                accent="text-primary"
              />
              <KpiCard
                icon={<Users className="h-4 w-4" />}
                label="Unique users today"
                value={data.uniqueVisitorsToday}
                hint="Distinct people"
                accent="text-violet-500"
              />
              <KpiCard
                icon={<Activity className="h-4 w-4" />}
                label="Visits (30 days)"
                value={data.visitsLast30Days}
                hint="Rolling total"
                accent="text-amber-500"
              />
            </div>

            {/* Visits over time */}
            <div>
              <div className="text-sm font-semibold mb-2">Visits over time (last 14 days)</div>
              <div className="h-56 w-full" data-testid="chart-visits-over-time">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.visitsOverTime} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      labelFormatter={(l) => shortDate(String(l))}
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      name="Visits"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#visitsFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name="Unique users"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live map of online users */}
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-emerald-500" /> Where users are right now
              </div>
              {mapped.length === 0 ? (
                <div className="flex h-[260px] w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No pinpointed locations for users online right now.
                </div>
              ) : (
                <div className="h-[260px] w-full overflow-hidden rounded-lg border" data-testid="map-online-users">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapped.length === 1 ? 5 : 2}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution={OSM_TILE_ATTRIBUTION}
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxNativeZoom={19}
                      maxZoom={22}
                    />
                    {mapped.map((u, i) => (
                      <CircleMarker
                        key={u.userId ?? `pin-${i}`}
                        center={[u.latitude as number, u.longitude as number]}
                        radius={8}
                        pathOptions={{
                          color: "#10b981",
                          fillColor: "#10b981",
                          fillOpacity: 0.7,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-muted-foreground">{roleLabel(u.role)}</div>
                            <div>{u.location || "Unknown location"}</div>
                            <div className="text-muted-foreground">Viewing {labelForPath(u.path)}</div>
                            {isSuperAdmin && u.email && <div className="mt-1">{u.email}</div>}
                            {isSuperAdmin && u.ipAddress && (
                              <div className="font-mono">{u.ipAddress}</div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Online users */}
              <div className="lg:col-span-2 space-y-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" /> Who's online
                  {isSuperAdmin && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      — tap a person for full details
                    </span>
                  )}
                </div>
                {data.online.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users active in the last 5 minutes.</p>
                ) : (
                  <div className="space-y-2">
                    {data.online.map((u, i) => {
                      const key = u.userId ?? `anon-${i}`;
                      const isOpen = expanded === key;
                      return (
                        <div
                          key={key}
                          className="rounded-lg border"
                          data-testid={`online-user-${i}`}
                        >
                          <button
                            type="button"
                            onClick={() => isSuperAdmin && setExpanded(isOpen ? null : key)}
                            className={`flex w-full items-center justify-between gap-3 p-2.5 text-left ${isSuperAdmin ? "cursor-pointer hover:bg-muted/50 rounded-lg" : "cursor-default"}`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-sm truncate">{u.name}</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {roleLabel(u.role)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 pl-4">
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {u.location || "Unknown location"}
                                </span>
                                <span className="truncate">Viewing {labelForPath(u.path)}</span>
                              </div>
                            </div>
                            <span className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" />
                              {timeAgo(u.lastSeen)}
                              {isSuperAdmin && (
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                />
                              )}
                            </span>
                          </button>
                          {isSuperAdmin && isOpen && (
                            <div className="grid gap-1.5 border-t bg-muted/30 px-4 py-2.5 text-[11px]">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium truncate">{u.email || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Network className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">IP:</span>
                                <span className="font-mono truncate">{u.ipAddress || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Monitor className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Device:</span>
                                <span className="font-medium truncate">{deviceLabel(u.userAgent)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Coords:</span>
                                <span className="font-mono">
                                  {u.latitude != null && u.longitude != null
                                    ? `${u.latitude.toFixed(4)}, ${u.longitude.toFixed(4)}`
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Login locations (30 days)
                </div>
                {data.locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No location data yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.locations.map((loc) => (
                      <div key={loc.location} className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground">{loc.location}</span>
                        <span className="font-mono text-muted-foreground shrink-0">
                          {loc.visits.toLocaleString()} ({loc.visitors})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top pages */}
            <div className="space-y-2">
              <div className="text-sm font-semibold">Most-visited pages (7 days)</div>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page visits recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.topPages.map((p) => (
                    <div key={p.path} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate text-foreground">{labelForPath(p.path)}</span>
                        <span className="font-mono text-muted-foreground">{p.visits.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(p.visits / maxPage) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
