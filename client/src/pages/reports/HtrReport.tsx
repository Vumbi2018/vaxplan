/**
 * HtrReport.tsx — R6 Hard-to-Reach Status
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Shield, AlertTriangle, MapPin, BarChart2 } from "lucide-react";
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

export default function HtrReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/htr", qs],
    queryFn: () => fetch(`/api/reports/htr${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_villages ?? 0),
      htr: acc.htr + Number(r.htr_villages ?? 0),
      critical: acc.critical + Number(r.critical ?? 0),
      high: acc.high + Number(r.high_priority ?? 0),
    }),
    { total: 0, htr: 0, critical: 0, high: 0 }
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
      Critical: Number(r.critical ?? 0),
      High:     Number(r.high_priority ?? 0),
      Medium:   Number(r.medium_priority ?? 0),
      Low:      Number(r.low_priority ?? 0),
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
      Critical: Number(r.critical ?? 0),
      High:     Number(r.high_priority ?? 0),
      Medium:   Number(r.medium_priority ?? 0),
      Low:      Number(r.low_priority ?? 0),
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
    console.log("[HtrReport] handleBarClick clickedData:", clickedData, "chartLevel:", chartLevel);
    if (clickedData && clickedData.id) {
      const clickedId = Number(clickedData.id);
      console.log("[HtrReport] setFilter to id:", clickedId);
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
    { key: "total_villages", label: "Total Villages",   format: defaultNumFormat, align: "right" as const },
    { key: "htr_villages",   label: "HTR Villages",     format: defaultNumFormat, align: "right" as const },
    { key: "critical",       label: "Critical",         format: defaultNumFormat, align: "right" as const },
    { key: "high_priority",  label: "High",             format: defaultNumFormat, align: "right" as const },
    { key: "medium_priority", label: "Medium",          format: defaultNumFormat, align: "right" as const },
    { key: "low_priority",   label: "Low",              format: defaultNumFormat, align: "right" as const },
    { key: "avg_htr_score",  label: "Avg HTR Score",    format: (v: unknown) => v != null ? `${Number(v).toFixed(1)}` : "—", align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Villages",  value: kpi.total,    icon: MapPin,       color: "text-blue-500", path: "/population" },
          { label: "HTR Villages",    value: kpi.htr,      icon: Shield,       color: "text-amber-500", path: "/htr" },
          { label: "Critical",        value: kpi.critical, icon: AlertTriangle, color: "text-rose-500", path: "/htr" },
          { label: "High Priority",   value: kpi.high,     icon: BarChart2,    color: "text-orange-500", path: "/htr" },
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
              HTR Villages by Priority Level &amp; {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"}
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
                <Bar dataKey="Critical" fill="#f43f5e" stackId="a" />
                <Bar dataKey="High"     fill="#f97316" stackId="a" />
                <Bar dataKey="Medium"   fill="#f59e0b" stackId="a" />
                <Bar dataKey="Low"      fill="#22c55e" stackId="a" radius={[4,4,0,0]} />
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
                <Bar dataKey="Critical" fill="#f43f5e" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-critical-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="High"     fill="#f97316" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-high-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Medium"   fill="#f59e0b" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-medium-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Low"      fill="#22c55e" stackId="a" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-low-${index}`}
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
