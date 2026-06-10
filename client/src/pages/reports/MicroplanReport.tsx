/**
 * MicroplanReport.tsx — R2 Microplan Status
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Clock, Lock } from "lucide-react";
import ReportTable, { defaultNumFormat } from "./ReportTable";
import type { ReportFilters, ReportResponse } from "./types";
import { buildReportQueryString } from "./types";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props { filters: ReportFilters }

const STATUS_COLORS = {
  Draft: "#94a3b8",
  Pending: "#f59e0b",
  Approved: "#22c55e",
  Locked: "#6366f1",
};

export default function MicroplanReport({ filters }: Props) {
  const [, setLocation] = useLocation();
  const qs = buildReportQueryString(filters);
  const { data, isLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports/microplans", qs],
    queryFn: () => fetch(`/api/reports/microplans${qs}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];
  const kpi = rows
    .filter((r) => r.level === "province" || (rows.filter((x) => x.level === "province").length === 0))
    .reduce(
      (acc, r) => ({
        total: acc.total + Number(r.total_microplans ?? 0),
        routine: acc.routine + Number(r.routine ?? 0),
        campaigns: acc.campaigns + Number(r.campaigns ?? 0),
        approved: acc.approved + Number(r.approved ?? 0),
        locked: acc.locked + Number(r.locked ?? 0),
        pending: acc.pending + Number(r.pending ?? 0),
        draft: acc.draft + Number(r.draft ?? 0),
      }),
      { total: 0, routine: 0, campaigns: 0, approved: 0, locked: 0, pending: 0, draft: 0 }
    );

  const pieData = [
    { name: "Draft",    value: kpi.draft },
    { name: "Pending",  value: kpi.pending },
    { name: "Approved", value: kpi.approved },
    { name: "Locked",   value: kpi.locked },
  ].filter((d) => d.value > 0);

  const columns = [
    { key: "total_microplans", label: "Total",    format: defaultNumFormat, align: "right" as const },
    { key: "routine",          label: "Routine",  format: defaultNumFormat, align: "right" as const },
    { key: "campaigns",        label: "SIA",      format: defaultNumFormat, align: "right" as const },
    { key: "draft",            label: "Draft",    format: defaultNumFormat, align: "right" as const },
    { key: "pending",          label: "Pending",  format: defaultNumFormat, align: "right" as const },
    { key: "approved",         label: "Approved", format: defaultNumFormat, align: "right" as const },
    { key: "locked",           label: "Locked",   format: defaultNumFormat, align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Microplans", value: kpi.total,    icon: ClipboardList, color: "text-blue-500", path: "/approvals" },
          { label: "Approved",         value: kpi.approved, icon: CheckCircle,   color: "text-green-500", path: "/approvals" },
          { label: "Pending Review",   value: kpi.pending,  icon: Clock,         color: "text-amber-500", path: "/approvals" },
          { label: "Locked",           value: kpi.locked,   icon: Lock,          color: "text-indigo-500", path: "/approvals" },
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Summary card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan Type Split</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {[
              { label: "Routine (Facility EPI)", value: kpi.routine,   pct: kpi.total ? Math.round(kpi.routine / kpi.total * 100) : 0, color: "bg-blue-500" },
              { label: "SIA Campaigns",          value: kpi.campaigns, pct: kpi.total ? Math.round(kpi.campaigns / kpi.total * 100) : 0, color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.value.toLocaleString()} ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ReportTable rows={rows} columns={columns} isLoading={isLoading} />
    </div>
  );
}
