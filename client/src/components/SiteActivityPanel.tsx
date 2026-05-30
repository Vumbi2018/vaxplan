import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Eye, Users, Globe, MapPin, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface OnlineUser {
  userId: string | null;
  name: string;
  role: string | null;
  path: string;
  location: string | null;
  ipAddress: string | null;
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

  const maxPage = Math.max(1, ...(data?.topPages ?? []).map((p) => p.visits));

  return (
    <Card data-testid="card-site-activity">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Site activity
          </CardTitle>
          {data && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-600">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {data.onlineCount} online now
            </Badge>
          )}
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

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Online users */}
              <div className="lg:col-span-2 space-y-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" /> Who's online
                </div>
                {data.online.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users active in the last 5 minutes.</p>
                ) : (
                  <div className="space-y-2">
                    {data.online.map((u, i) => (
                      <div
                        key={u.userId ?? `anon-${i}`}
                        className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                        data-testid={`online-user-${i}`}
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
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {timeAgo(u.lastSeen)}
                        </span>
                      </div>
                    ))}
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
