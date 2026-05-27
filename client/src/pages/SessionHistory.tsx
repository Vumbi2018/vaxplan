import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, History as HistoryIcon, Search } from "lucide-react";

type HistoryRow = {
  id: number;
  name: string;
  status: string;
  sessionType: string;
  planType?: string;
  facilityId?: number;
  scheduledDate?: string | null;
  completedAt?: string | null;
  targetPopulation?: number | null;
  vaccinatedCounts?: Record<string, number> | null;
};

function vaccinatedTotal(vc: Record<string, number> | null | undefined) {
  if (!vc) return 0;
  return Object.values(vc).reduce((s, n) => s + (Number(n) || 0), 0);
}

function toCsv(rows: HistoryRow[]) {
  const headers = ["id", "name", "status", "planType", "sessionType", "scheduledDate", "completedAt", "targetPopulation", "vaccinatedTotal"];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id,
      r.name,
      r.status,
      r.planType ?? "",
      r.sessionType,
      r.scheduledDate ?? "",
      r.completedAt ?? "",
      r.targetPopulation ?? "",
      vaccinatedTotal(r.vaccinatedCounts),
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

export default function SessionHistory() {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery<HistoryRow[]>({
    queryKey: ["/api/sessions/history"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/sessions/history");
      if (!res.ok) throw new Error("Failed to load session history");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.status, r.sessionType, r.planType].some((v) => (v ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Session History</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-testid="input-history-search"
              placeholder="Search by name, type, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button data-testid="button-export-history" variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Completed & cancelled sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No archived sessions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Scheduled</th>
                    <th className="text-left p-2">Completed</th>
                    <th className="text-right p-2">Target</th>
                    <th className="text-right p-2">Vaccinated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-history-${r.id}`}>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 capitalize">{r.planType ?? "—"} / {r.sessionType}</td>
                      <td className="p-2">
                        <Badge variant={r.status === "completed" ? "default" : "destructive"} className="capitalize">
                          {String(r.status).replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-2">{r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : "—"}</td>
                      <td className="p-2">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}</td>
                      <td className="p-2 text-right">{r.targetPopulation?.toLocaleString() ?? "—"}</td>
                      <td className="p-2 text-right font-semibold">{vaccinatedTotal(r.vaccinatedCounts).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
