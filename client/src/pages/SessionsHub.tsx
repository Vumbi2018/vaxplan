import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Calendar as CalendarIcon,
  ListChecks,
  MapPin,
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { cn } from "@/lib/utils";
import type { Facility } from "@shared/schema";

interface SessionPlanRow {
  id: number;
  name: string;
  sessionType: string;
  status: string;
  isAchieved: boolean;
  completedAt: string | null;
  scheduledDate: string | null;
  facilityId: number;
  microplanId: number;
  planType: "routine" | "campaign";
  targetPopulation: number | null;
  quarter: number;
  year: number;
}

type StatusFilter = "all" | "planned" | "overdue" | "conducted" | "cancelled";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function classifyStatus(s: SessionPlanRow): StatusFilter {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "conducted" || s.isAchieved || s.completedAt) return "conducted";
  if (s.scheduledDate) {
    const sched = startOfDay(new Date(s.scheduledDate));
    const today = startOfDay(new Date());
    if (sched < today) return "overdue";
  }
  return "planned";
}

const STATUS_META: Record<
  StatusFilter,
  { label: string; icon: any; color: string }
> = {
  all: { label: "All", icon: ListChecks, color: "text-foreground" },
  planned: { label: "Planned", icon: Clock, color: "text-blue-600" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-rose-600" },
  conducted: { label: "Conducted", icon: CheckCircle2, color: "text-emerald-600" },
  cancelled: { label: "Cancelled", icon: Ban, color: "text-muted-foreground" },
};

export default function SessionsHub() {
  const [, setLocation] = useLocation();
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: sessions = [], isLoading } = useQuery<SessionPlanRow[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: districtsList = [] } = useQuery<any[]>({
    queryKey: ["/api/districts"],
  });

  const districtToProvince = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of districtsList) m.set(d.id, d.provinceId);
    return m;
  }, [districtsList]);

  const facilityById = useMemo(() => {
    const m = new Map<number, Facility>();
    for (const f of facilities) m.set(f.id, f);
    return m;
  }, [facilities]);

  // Apply geo cascade (province/district resolved via facility row)
  const geoFiltered = useMemo(() => {
    if (!provinceId && !districtId && !facilityId) return sessions;
    return sessions.filter((s) => {
      const f = facilityById.get(s.facilityId);
      if (!f) return false;
      if (facilityId && f.id !== facilityId) return false;
      if (districtId && f.districtId !== districtId) return false;
      if (provinceId && districtToProvince.get(f.districtId) !== provinceId) return false;
      return true;
    });
  }, [sessions, facilityById, provinceId, districtId, facilityId, districtToProvince]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: geoFiltered.length,
      planned: 0,
      overdue: 0,
      conducted: 0,
      cancelled: 0,
    };
    for (const s of geoFiltered) c[classifyStatus(s)]++;
    return c;
  }, [geoFiltered]);

  const statusFiltered = useMemo(() => {
    if (status === "all") return geoFiltered;
    return geoFiltered.filter((s) => classifyStatus(s) === status);
  }, [geoFiltered, status]);

  // ----- Calendar tab data -----
  // Group sessions with a scheduledDate by day-key (yyyy-mm-dd) for the active month.
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionPlanRow[]>();
    for (const s of geoFiltered) {
      if (!s.scheduledDate) continue;
      const d = new Date(s.scheduledDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [geoFiltered]);

  const datesWithSessions = useMemo(() => {
    const out: Date[] = [];
    sessionsByDay.forEach((_v, key) => {
      const [y, m, d] = key.split("-").map(Number);
      out.push(new Date(y, m, d));
    });
    return out;
  }, [sessionsByDay]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return sessionsByDay.get(key) ?? [];
  }, [sessionsByDay, selectedDate]);

  const unscheduledCount = useMemo(
    () => geoFiltered.filter((s) => !s.scheduledDate).length,
    [geoFiltered],
  );

  const openSession = (s: SessionPlanRow) => {
    const route =
      s.planType === "campaign"
        ? `/sessions/campaign/${s.microplanId}`
        : `/sessions/microplan/${s.microplanId}`;
    setLocation(route);
  };

  // Calendar → new session. Encode the picked day so SessionPlanning can
  // prefill the form's scheduledDate. Route into the New Session flow
  // (`/sessions`) — NOT the Microplan Wizard (`/microplans/routine`). The
  // session list lets the user pick a parent microplan; selecting one carries
  // the query string into detail mode, where the New Session dialog auto-opens
  // with the date already filled in.
  const planSessionOnSelectedDate = () => {
    if (!selectedDate) return;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const qs = new URLSearchParams({
      scheduledDate: `${y}-${m}-${d}`,
      autoOpen: "1",
    });
    if (facilityId) qs.set("facilityId", String(facilityId));
    setLocation(`/sessions?${qs.toString()}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Sessions
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Every session-plan across your microplans — planned, overdue,
            conducted, or cancelled. Switch to the Calendar view to see what's
            coming up by day and jump straight into a session.
          </p>
        </div>
      </div>

      {/* Geo filters apply to both tabs */}
      <Card>
        <CardContent className="p-4">
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
            testIdPrefix="sessions-hub-geo"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-sessions-list">
            <ListChecks className="h-4 w-4 mr-2" /> List
            <Badge variant="secondary" className="ml-2">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-sessions-calendar">
            <CalendarIcon className="h-4 w-4 mr-2" /> Calendar
          </TabsTrigger>
        </TabsList>

        {/* ---------------- LIST TAB ---------------- */}
        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_META) as StatusFilter[]).map((k) => {
              const meta = STATUS_META[k];
              const Icon = meta.icon;
              const active = status === k;
              return (
                <Button
                  key={k}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setStatus(k)}
                  className="gap-1.5"
                  data-testid={`btn-status-${k}`}
                >
                  <Icon className={cn("h-3.5 w-3.5", !active && meta.color)} />
                  {meta.label}
                  <Badge
                    variant="secondary"
                    className={cn("ml-1", active && "bg-primary-foreground/20")}
                  >
                    {counts[k]}
                  </Badge>
                </Button>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : statusFiltered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No sessions match the current filters.
                </div>
              ) : (
                <SessionList
                  rows={statusFiltered}
                  facilityById={facilityById}
                  onOpen={openSession}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- CALENDAR TAB ---------------- */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-[auto_1fr] gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Pick a day
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  modifiers={{ hasSession: datesWithSessions }}
                  modifiersClassNames={{
                    hasSession:
                      "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                  }}
                  className="rounded-md"
                />
                <div className="px-2 pt-2 pb-1 text-[11px] text-muted-foreground">
                  Dots mark days with scheduled sessions.
                  {unscheduledCount > 0 && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {unscheduledCount} session{unscheduledCount === 1 ? "" : "s"} without a scheduled date
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {selectedDate ? fmtDate(selectedDate) : "Pick a day"}
                  <Badge variant="secondary" className="ml-1">
                    {selectedDaySessions.length} session{selectedDaySessions.length === 1 ? "" : "s"}
                  </Badge>
                  {selectedDate && (
                    <Button
                      size="sm"
                      className="ml-auto gap-1.5"
                      onClick={planSessionOnSelectedDate}
                      data-testid="btn-calendar-plan-session"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Plan a session on this day
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedDaySessions.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground space-y-3">
                    <div>No sessions scheduled for this day.</div>
                    {selectedDate && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={planSessionOnSelectedDate}
                        data-testid="btn-calendar-plan-session-empty"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Plan a session on {fmtDate(selectedDate)}
                      </Button>
                    )}
                  </div>
                ) : (
                  <SessionList
                    rows={selectedDaySessions}
                    facilityById={facilityById}
                    onOpen={openSession}
                    showStart
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SessionList({
  rows,
  facilityById,
  onOpen,
  showStart = false,
}: {
  rows: SessionPlanRow[];
  facilityById: Map<number, Facility>;
  onOpen: (s: SessionPlanRow) => void;
  showStart?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((s) => {
        const cls = classifyStatus(s);
        const meta = STATUS_META[cls];
        const Icon = meta.icon;
        const f = facilityById.get(s.facilityId);
        const sched = s.scheduledDate ? new Date(s.scheduledDate) : null;
        const canStart =
          showStart && (cls === "planned" || cls === "overdue");
        return (
          <li
            key={s.id}
            className="p-3 sm:p-4 hover:bg-secondary/30 transition-colors"
            data-testid={`session-row-${s.id}`}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                  cls === "overdue"
                    ? "bg-rose-500/10"
                    : cls === "conducted"
                      ? "bg-emerald-500/10"
                      : cls === "cancelled"
                        ? "bg-muted"
                        : "bg-primary/10",
                )}
              >
                <Icon className={cn("h-4 w-4", meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onOpen(s)}
                    className="font-medium text-sm hover:underline text-left"
                    data-testid={`btn-open-${s.id}`}
                  >
                    {s.name}
                  </button>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {s.sessionType}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px]", meta.color)}
                  >
                    {meta.label}
                  </Badge>
                  {s.planType === "campaign" && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Campaign
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {f ? f.name : `Facility #${s.facilityId}`}
                  </span>
                  <span>Q{s.quarter} {s.year}</span>
                  {sched && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {fmtDate(sched)}
                    </span>
                  )}
                  {s.targetPopulation != null && (
                    <span>Target: {s.targetPopulation}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => onOpen(s)}
                    className="gap-1.5"
                    data-testid={`btn-start-${s.id}`}
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Start
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpen(s)}
                  className="gap-1.5"
                  data-testid={`btn-view-${s.id}`}
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
