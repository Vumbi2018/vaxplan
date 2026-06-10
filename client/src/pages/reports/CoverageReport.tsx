/**
 * CoverageReport.tsx — R5 Vaccination Coverage
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Syringe, TrendingUp, Target, Activity } from "lucide-react";
import ReportTable, { defaultNumFormat, pctFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface Props {
  filters: ReportFilters;
  setFilter?: (key: keyof ReportFilters, value: number | undefined) => void;
}

export default function CoverageReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/coverage", qs],
    queryFn: () => fetch(`/api/reports/coverage${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      target: acc.target + Number(r.target_population ?? 0),
      vaccinated: acc.vaccinated + Number(r.vaccinated_total ?? 0),
      sessions: acc.sessions + Number(r.total_sessions ?? 0),
      completed: acc.completed + Number(r.completed_sessions ?? 0),
    }),
    { target: 0, vaccinated: 0, sessions: 0, completed: 0 }
  );
  const coveragePct = kpi.target > 0 ? ((kpi.vaccinated / kpi.target) * 100).toFixed(1) : "0.0";

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
      "Coverage %": Number(r.coverage_pct ?? 0),
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
      "Coverage %": Number(r.coverage_pct ?? 0),
    }));

  const handleBarClick = (data: any) => {
    const clickedData = data?.payload || data;
    console.log("[CoverageReport] handleBarClick clickedData:", clickedData, "chartLevel:", chartLevel);
    if (clickedData && clickedData.id) {
      const clickedId = Number(clickedData.id);
      console.log("[CoverageReport] setFilter to id:", clickedId);
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
    { key: "target_population",  label: "Target Pop",  format: defaultNumFormat, align: "right" as const },
    { key: "vaccinated_total",   label: "Vaccinated",  format: defaultNumFormat, align: "right" as const },
    { key: "coverage_pct",       label: "Coverage %",  format: pctFormat,        align: "right" as const },
    { key: "total_sessions",     label: "Sessions",    format: defaultNumFormat, align: "right" as const },
    { key: "completed_sessions", label: "Completed",   format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Target Population", value: kpi.target.toLocaleString(),     icon: Target,     color: "text-blue-500", path: "/population" },
          { label: "Vaccinated",        value: kpi.vaccinated.toLocaleString(),  icon: Syringe,    color: "text-green-500", path: "/clients" },
          { label: "Coverage Rate",     value: `${coveragePct}%`,               icon: TrendingUp, color: "text-purple-500", path: "/indicators/dropout" },
          { label: "Sessions Done",     value: kpi.completed.toLocaleString(),   icon: Activity,   color: "text-orange-500", path: "/all-sessions" },
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

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Coverage Rate by {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"} (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              {/* Original Code: standard static barchart
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => [`${v}%`, "Coverage"]}
                />
                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "80% target", fill: "#22c55e", fontSize: 11 }} />
                <Bar
                  dataKey="Coverage %"
                  radius={[4, 4, 0, 0]}
                  fill="#6366f1"
                />
              </BarChart>
              */}

              {/* Updated Code: Interactive drill-down BarChart styled dynamically by active hierarchy depth */}
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: any, props: any) => [`${v}%`, `Coverage (${props.payload.fullName})`]}
                />
                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "80% target", fill: "#22c55e", fontSize: 11 }} />
                <Bar
                  dataKey="Coverage %"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                      fill={chartLevel === "province" ? "#6366f1" : chartLevel === "district" ? "#0d9488" : "#d97706"}
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
