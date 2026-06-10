/**
 * ZeroDoseReport.tsx — R3 Zero-Dose Communities
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertOctagon, Users, MapPin, Shield } from "lucide-react";
import ReportTable, { defaultNumFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  filters: ReportFilters;
  setFilter?: (key: keyof ReportFilters, value: number | undefined) => void;
}

export default function ZeroDoseReport({ filters, setFilter }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/zero-dose", qs],
    queryFn: () => fetch(`/api/reports/zero-dose${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const topRows = rows.filter((r) => r.level === "province");
  const kpi = (topRows.length ? topRows : rows).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_villages ?? 0),
      zeroDose: acc.zeroDose + Number(r.zero_dose_villages ?? 0),
      htr: acc.htr + Number(r.zero_dose_htr ?? 0),
      under1: acc.under1 + Number(r.under1_at_risk ?? 0),
    }),
    { total: 0, zeroDose: 0, htr: 0, under1: 0 }
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
      "Zero-dose": Number(r.zero_dose_villages ?? 0),
      "HTR Zero-dose": Number(r.zero_dose_htr ?? 0),
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
      "Zero-dose": Number(r.zero_dose_villages ?? 0),
      "HTR Zero-dose": Number(r.zero_dose_htr ?? 0),
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
    console.log("[ZeroDoseReport] handleBarClick clickedData:", clickedData, "chartLevel:", chartLevel);
    if (clickedData && clickedData.id) {
      const clickedId = Number(clickedData.id);
      console.log("[ZeroDoseReport] setFilter to id:", clickedId);
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
    { key: "total_villages",   label: "Villages",       format: defaultNumFormat, align: "right" as const },
    { key: "zero_dose_villages", label: "Zero-Dose",    format: defaultNumFormat, align: "right" as const },
    { key: "zero_dose_htr",    label: "HTR Zero-Dose",  format: defaultNumFormat, align: "right" as const },
    { key: "under1_at_risk",   label: "Under-1 At Risk", format: defaultNumFormat, align: "right" as const },
    { key: "under5_at_risk",   label: "Under-5 At Risk", format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Villages",      value: kpi.total,    icon: MapPin,       color: "text-blue-500", path: "/population" },
          { label: "Zero-Dose Villages",  value: kpi.zeroDose, icon: AlertOctagon, color: "text-rose-500", path: "/indicators/zero-dose" },
          { label: "HTR Zero-Dose",       value: kpi.htr,      icon: Shield,       color: "text-amber-500", path: "/indicators/zero-dose" },
          { label: "Under-1 At Risk",     value: kpi.under1,   icon: Users,        color: "text-purple-500", path: "/indicators/zero-dose" },
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
              Zero-Dose Villages by {chartLevel === "province" ? "Province" : chartLevel === "district" ? "District" : "Health Facility"}
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
                <Bar dataKey="Zero-dose"     fill="#f43f5e" radius={[0,0,0,0]} />
                <Bar dataKey="HTR Zero-dose" fill="#f59e0b" radius={[4,4,0,0]} />
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
                <Bar dataKey="Zero-dose"     fill="#f43f5e" radius={[0,0,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-zd-${index}`}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick(entry)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="HTR Zero-dose" fill="#f59e0b" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-zdhtr-${index}`}
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
