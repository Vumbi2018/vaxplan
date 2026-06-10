/**
 * SupervisionReport.tsx — R8 Supervision Activity
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ClipboardCheck, CheckCircle2, XCircle, Star } from "lucide-react";
import ReportTable, { defaultNumFormat, pctFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface Props {
  filters: ReportFilters;
  setFilter?: (key: keyof ReportFilters, value: number | undefined) => void;
}

export default function SupervisionReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/supervision", qs],
    queryFn: () => fetch(`/api/reports/supervision${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_visits ?? 0),
      conducted: acc.conducted + Number(r.conducted ?? 0),
      missed: acc.missed + Number(r.missed ?? 0),
      scoreSum: acc.scoreSum + Number(r.avg_score ?? 0),
      scoreCount: acc.scoreCount + (Number(r.avg_score ?? 0) > 0 ? 1 : 0),
    }),
    { total: 0, conducted: 0, missed: 0, scoreSum: 0, scoreCount: 0 }
  );
  const avgScore = kpi.scoreCount > 0 ? (kpi.scoreSum / kpi.scoreCount).toFixed(1) : "—";
  const completionPct = kpi.total > 0 ? ((kpi.conducted / kpi.total) * 100).toFixed(1) : "0.0";

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
      Conducted:  Number(r.conducted ?? 0),
      Missed:     Number(r.missed ?? 0),
      Cancelled:  Number(r.cancelled ?? 0),
      "Avg Score": Number(r.avg_score ?? 0),
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
      Conducted:  Number(r.conducted ?? 0),
      Missed:     Number(r.missed ?? 0),
      Cancelled:  Number(r.cancelled ?? 0),
      "Avg Score": Number(r.avg_score ?? 0),
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
    if (clickedData && clickedData.id) {
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

  const columns = [
    { key: "total_visits",     label: "Total",       format: defaultNumFormat, align: "right" as const },
    { key: "conducted",        label: "Conducted",   format: defaultNumFormat, align: "right" as const },
    { key: "scheduled",        label: "Pending",     format: defaultNumFormat, align: "right" as const },
    { key: "missed",           label: "Missed",      format: defaultNumFormat, align: "right" as const },
    { key: "cancelled",        label: "Cancelled",   format: defaultNumFormat, align: "right" as const },
    { key: "avg_score",        label: "Avg Score",   format: (v: unknown) => v != null ? `${Number(v).toFixed(1)}` : "—", align: "right" as const },
    { key: "completion_rate",  label: "Completion %", format: pctFormat,       align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Visits",   value: kpi.total.toLocaleString(),    icon: ClipboardCheck, color: "text-blue-500", path: "/supervision" },
          { label: "Conducted",      value: kpi.conducted.toLocaleString(), icon: CheckCircle2,  color: "text-green-500", path: "/supervision" },
          { label: "Missed",         value: kpi.missed.toLocaleString(),    icon: XCircle,       color: "text-rose-500", path: "/supervision" },
          { label: "Avg Score",      value: `${avgScore}/100`,              icon: Star,          color: "text-amber-500", path: "/supervision" },
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
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Rate banner */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Overall Supervision Completion Rate</p>
          <p className="text-3xl font-bold">{completionPct}%</p>
        </div>
        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              Number(completionPct) >= 80 ? "bg-green-500" :
              Number(completionPct) >= 60 ? "bg-amber-500" : "bg-rose-500"
            }`}
            style={{ width: `${Math.min(Number(completionPct), 100)}%` }}
          />
        </div>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Visit Outcomes by {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"}
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
                <Bar dataKey="Conducted"  fill="#22c55e" stackId="a" />
                <Bar dataKey="Missed"     fill="#f43f5e" stackId="a" />
                <Bar dataKey="Cancelled"  fill="#94a3b8" stackId="a" radius={[4,4,0,0]} />
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
                <Bar dataKey="Conducted"  fill="#22c55e" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-conducted-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Missed"     fill="#f43f5e" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-missed-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Cancelled"  fill="#94a3b8" stackId="a" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-cancelled-${index}`}
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
