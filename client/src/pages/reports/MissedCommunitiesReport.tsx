/**
 * MissedCommunitiesReport.tsx — R4 Missed Communities
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, XCircle, CheckCircle2, CalendarX } from "lucide-react";
import ReportTable, { defaultNumFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Props {
  filters: ReportFilters;
  setFilter?: (key: keyof ReportFilters, value: number | undefined) => void;
}

export default function MissedCommunitiesReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/missed-communities", qs],
    queryFn: () => fetch(`/api/reports/missed-communities${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      planned: acc.planned + Number(r.villages_planned ?? 0),
      missed: acc.missed + Number(r.missed_villages ?? 0),
      reached: acc.reached + Number(r.reached_villages ?? 0),
      notAchieved: acc.notAchieved + Number(r.sessions_not_achieved ?? 0),
    }),
    { planned: 0, missed: 0, reached: 0, notAchieved: 0 }
  );

  // Determine chart level dynamically based on active filter scope
  let chartLevel: "province" | "district" | "facility" = "province";
  if (filters.districtId) {
    chartLevel = "facility";
  } else if (filters.provinceId) {
    chartLevel = "district";
  }

  /* Original Code: static district level charting
  const chartData = rows
    .filter((r) => r.level === "district")
    .slice(0, 12)
    .map((r) => ({
      name: (r.name as string).length > 12 ? (r.name as string).slice(0, 12) + "…" : r.name,
      "Reached":     Number(r.reached_villages ?? 0),
      "Missed":      Number(r.missed_villages ?? 0),
    }));
  */

  // Updated Code: Dynamic level aggregates with unique ID mappings for drilldowns
  const chartData = rows
    .filter((r) => r.level === chartLevel)
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      name: (r.name as string).length > 15 ? (r.name as string).slice(0, 15) + "…" : r.name,
      fullName: r.name,
      "Reached":     Number(r.reached_villages ?? 0),
      "Missed":      Number(r.missed_villages ?? 0),
    }));

  /* Original Code: container level click handler
  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedData = state.activePayload[0].payload;
      const clickedId = Number(clickedData.id);
      if (chartLevel === "province") {
        setFilter?.("provinceId", clickedId);
      } else if (chartLevel === "district") {
        setFilter?.("districtId", clickedId);
      } else if (chartLevel === "facility") {
        setFilter?.("facilityId", clickedId);
      }
    }
  };
  */

  // Updated Code: bar-level click handler (Recharts bar-level onClick avoids event swallowing)
  const handleBarClick = (data: any) => {
    const clickedData = data?.payload || data;
    console.log("[MissedCommunitiesReport] handleBarClick clickedData:", clickedData, "chartLevel:", chartLevel);
    if (clickedData && clickedData.id) {
      const clickedId = Number(clickedData.id);
      console.log("[MissedCommunitiesReport] setFilter to id:", clickedId);
      if (chartLevel === "province") {
        setFilter?.("provinceId", clickedId);
      } else if (chartLevel === "district") {
        setFilter?.("districtId", clickedId);
      } else if (chartLevel === "facility") {
        setFilter?.("facilityId", clickedId);
      }
    }
  };

  const columns = [
    { key: "villages_planned",      label: "Planned",        format: defaultNumFormat, align: "right" as const },
    { key: "reached_villages",      label: "Reached",        format: defaultNumFormat, align: "right" as const },
    { key: "missed_villages",       label: "Missed",         format: defaultNumFormat, align: "right" as const },
    { key: "sessions_not_achieved", label: "Sessions Failed", format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Villages Planned", value: kpi.planned,     icon: Target,      color: "text-blue-500", path: "/missed-communities" },
          { label: "Reached",          value: kpi.reached,     icon: CheckCircle2, color: "text-green-500", path: "/missed-communities" },
          { label: "Missed Villages",  value: kpi.missed,      icon: XCircle,     color: "text-rose-500", path: "/missed-communities" },
          { label: "Sessions Failed",  value: kpi.notAchieved, icon: CalendarX,   color: "text-amber-500", path: "/all-sessions" },
        ].map((item) => (
          <Card
            key={item.label}
            className="border-border/60 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            onClick={() => setLocation(item.path)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{item.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Reached vs Missed by {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              {/* Original Code: standard static barchart
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Reached" fill="#22c55e" stackId="a" />
                <Bar dataKey="Missed"  fill="#f43f5e" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
              */}

              {/* Updated Code: Interactive drill-down BarChart styled with cursors, name context tooltips, and bar-level click handlers */}
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: any, props: any) => [v, `${name} (${props.payload.fullName})`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Reached" fill="#22c55e" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-reached-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Missed"  fill="#f43f5e" stackId="a" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-missed-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <ReportTable rows={rows} columns={columns} isLoading={isLoading} />
    </div>
  );
}
