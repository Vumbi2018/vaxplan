/**
 * BudgetReport.tsx — R7 Budget & Resources
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { DollarSign, CheckCircle, Layers, FileText } from "lucide-react";
import ReportTable, { currencyFormat, defaultNumFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Props {
  filters: ReportFilters;
  setFilter?: (key: keyof ReportFilters, value: number | undefined) => void;
}

export default function BudgetReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/budget", qs],
    queryFn: () => fetch(`/api/reports/budget${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_budget ?? 0),
      approved: acc.approved + Number(r.approved_budget ?? 0),
      gavi: acc.gavi + Number(r.gavi_funding ?? 0),
      government: acc.government + Number(r.government_funding ?? 0),
      lines: acc.lines + Number(r.budget_line_count ?? 0),
    }),
    { total: 0, approved: 0, gavi: 0, government: 0, lines: 0 }
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
      Government: Number(r.government_funding ?? 0),
      Gavi:       Number(r.gavi_funding ?? 0),
      UNICEF:     Number(r.unicef_funding ?? 0),
      WHO:        Number(r.who_funding ?? 0),
      Other:      Number(r.other_funding ?? 0),
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
      Government: Number(r.government_funding ?? 0),
      Gavi:       Number(r.gavi_funding ?? 0),
      UNICEF:     Number(r.unicef_funding ?? 0),
      WHO:        Number(r.who_funding ?? 0),
      Other:      Number(r.other_funding ?? 0),
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
    { key: "total_budget",       label: "Total Budget",    format: currencyFormat,   align: "right" as const },
    { key: "approved_budget",    label: "Approved",        format: currencyFormat,   align: "right" as const },
    { key: "government_funding", label: "Government",      format: currencyFormat,   align: "right" as const },
    { key: "gavi_funding",       label: "Gavi",            format: currencyFormat,   align: "right" as const },
    { key: "unicef_funding",     label: "UNICEF",          format: currencyFormat,   align: "right" as const },
    { key: "who_funding",        label: "WHO",             format: currencyFormat,   align: "right" as const },
    { key: "budget_line_count",  label: "Lines",           format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Budget",   value: `K ${kpi.total.toLocaleString()}`,    icon: DollarSign,  color: "text-blue-500", path: "/microplans/routine" },
          { label: "Approved",       value: `K ${kpi.approved.toLocaleString()}`,  icon: CheckCircle, color: "text-green-500", path: "/approvals" },
          { label: "Gavi Funded",    value: `K ${kpi.gavi.toLocaleString()}`,      icon: Layers,      color: "text-purple-500", path: "/microplans/routine" },
          { label: "Budget Lines",   value: kpi.lines.toLocaleString(),             icon: FileText,    color: "text-orange-500", path: "/microplans/routine" },
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
              Budget by Funding Source &amp; {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              {/* Original Code: standard static barchart
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `K${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => [`K ${v.toLocaleString()}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Government" fill="#3b82f6" stackId="a" />
                <Bar dataKey="Gavi"       fill="#8b5cf6" stackId="a" />
                <Bar dataKey="UNICEF"     fill="#06b6d4" stackId="a" />
                <Bar dataKey="WHO"        fill="#22c55e" stackId="a" />
                <Bar dataKey="Other"      fill="#94a3b8" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
              */}

              {/* Updated Code: Interactive drill-down stacked BarChart with bar-level click handlers */}
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `K ${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: any, props: any) => [`K ${v.toLocaleString()}`, `${name} (${props.payload.fullName})`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Government" fill="#3b82f6" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-gov-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Gavi"       fill="#8b5cf6" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-gavi-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="UNICEF"     fill="#06b6d4" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-unicef-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="WHO"        fill="#22c55e" stackId="a">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-who-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Other"      fill="#94a3b8" stackId="a" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-other-${index}`}
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
