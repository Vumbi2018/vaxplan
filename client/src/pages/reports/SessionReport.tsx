/**
 * SessionReport.tsx — R1 Session Summary
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle, Target, Activity } from "lucide-react";
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

export default function SessionReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/sessions", qs],
    queryFn: () => fetch(`/api/reports/sessions${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const provinceRows = rows.filter((r) => r.level === "province");

  // KPI totals from province level (or facility if only one facility)
  const totals = rows
    .filter((r) => r.level === "province")
    .reduce(
      (acc, r) => ({
        total: acc.total + Number(r.total_sessions ?? 0),
        achieved: acc.achieved + Number(r.achieved ?? 0),
        completed: acc.completed + Number(r.completed ?? 0),
        target: acc.target + Number(r.target_population ?? 0),
        vaccinated: acc.vaccinated + Number(r.vaccinated_totals ?? 0),
      }),
      { total: 0, achieved: 0, completed: 0, target: 0, vaccinated: 0 }
    );

  // If no provinces (single facility scope), sum from facility rows
  const sumRows = totals.total === 0 ? rows : rows.filter((r) => r.level === "province");
  const kpi = sumRows.reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_sessions ?? 0),
      achieved: acc.achieved + Number(r.achieved ?? 0),
      completed: acc.completed + Number(r.completed ?? 0),
      target: acc.target + Number(r.target_population ?? 0),
      vaccinated: acc.vaccinated + Number(r.vaccinated_totals ?? 0),
    }),
    { total: 0, achieved: 0, completed: 0, target: 0, vaccinated: 0 }
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
    .slice(0, 15)
    .map((r) => ({
      name: (r.name as string).length > 14 ? (r.name as string).slice(0, 14) + "…" : r.name,
      Outreach: Number(r.outreach_sessions ?? 0),
      Mobile: Number(r.mobile_sessions ?? 0),
      Static: Number(r.static_sessions ?? 0),
    }));
  */

  // Updated Code: Dynamic level aggregates with unique ID mappings for drilldowns
  const chartData = rows
    .filter((r) => r.level === chartLevel)
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      name: (r.name as string).length > 14 ? (r.name as string).slice(0, 14) + "…" : r.name,
      fullName: r.name,
      Outreach: Number(r.outreach_sessions ?? 0),
      Mobile: Number(r.mobile_sessions ?? 0),
      Static: Number(r.static_sessions ?? 0),
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
    console.log("[SessionReport] handleBarClick clickedData:", clickedData, "chartLevel:", chartLevel);
    if (clickedData && clickedData.id) {
      const clickedId = Number(clickedData.id);
      console.log("[SessionReport] setFilter to id:", clickedId);
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
    { key: "total_sessions",  label: "Total",     format: defaultNumFormat, align: "right" as const },
    { key: "outreach_sessions", label: "Outreach", format: defaultNumFormat, align: "right" as const },
    { key: "mobile_sessions", label: "Mobile",    format: defaultNumFormat, align: "right" as const },
    { key: "static_sessions", label: "Static",    format: defaultNumFormat, align: "right" as const },
    { key: "achieved",        label: "Achieved",  format: defaultNumFormat, align: "right" as const },
    { key: "completed",       label: "Completed", format: defaultNumFormat, align: "right" as const },
    { key: "target_population", label: "Target Pop", format: defaultNumFormat, align: "right" as const },
    { key: "vaccinated_totals", label: "Vaccinated", format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: kpi.total, icon: CalendarDays, color: "text-blue-500", path: "/all-sessions" },
          { label: "Achieved",       value: kpi.achieved, icon: CheckCircle, color: "text-green-500", path: "/all-sessions" },
          { label: "Target Population", value: kpi.target, icon: Target, color: "text-purple-500", path: "/population" },
          { label: "Vaccinated",     value: kpi.vaccinated, icon: Activity, color: "text-orange-500", path: "/clients" },
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
              <p className="text-2xl font-bold tabular-nums">
                {item.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Sessions by {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"} &amp; Type
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
                <Bar dataKey="Outreach" fill="#f97316" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="Mobile"   fill="#3b82f6" stackId="a" />
                <Bar dataKey="Static"   fill="#22c55e" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
              */}

              {/* Updated Code: Interactive drill-down stacked BarChart with bar-level click handlers */}
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: any, props: any) => [v, `${name} (${props.payload.fullName})`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Outreach" fill="#f97316" stackId="a" radius={[0,0,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-outreach-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Mobile"   fill="#3b82f6" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-mobile-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Static"   fill="#22c55e" stackId="a" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-static-${index}`}
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

      {/* Hierarchical Table */}
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} />
    </div>
  );
}
