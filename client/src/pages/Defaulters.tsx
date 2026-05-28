import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface DefaulterRow {
  id: string;
  clientId: string;
  name: string;
  dateOfBirth: string;
  parentName: string | null;
  contactPhone: string | null;
  facilityId: number;
  facilityName: string;
  villageId: number | null;
  villageName: string | null;
  districtId: number;
  districtName: string;
  provinceId: number;
  nextDoseAntigen: string;
  dueDate: string;
  daysOverdue: number;
  lastDoseAntigen: string | null;
  lastDoseDate: string | null;
}

const ANTIGEN_OPTIONS = [
  { value: "all", label: "All antigens" },
  { value: "BCG", label: "BCG" },
  { value: "OPV_0", label: "OPV 0" },
  { value: "OPV_1", label: "OPV 1" },
  { value: "OPV_2", label: "OPV 2" },
  { value: "OPV_3", label: "OPV 3" },
  { value: "PENTA_1", label: "Pentavalent 1 (DTP1)" },
  { value: "PENTA_2", label: "Pentavalent 2 (DTP2)" },
  { value: "PENTA_3", label: "Pentavalent 3 (DTP3)" },
  { value: "PCV_1", label: "PCV 1" },
  { value: "PCV_2", label: "PCV 2" },
  { value: "PCV_3", label: "PCV 3" },
  { value: "ROTA_1", label: "Rotavirus 1" },
  { value: "ROTA_2", label: "Rotavirus 2" },
  { value: "ROTA_3", label: "Rotavirus 3" },
  { value: "IPV_1", label: "IPV 1" },
  { value: "IPV_2", label: "IPV 2" },
  { value: "MR_1", label: "Measles-Rubella 1 (MCV1)" },
  { value: "MR_2", label: "Measles-Rubella 2" },
];

export default function Defaulters() {
  const queryClient = useQueryClient();
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [antigen, setAntigen] = useState<string>("all");

  // Record that the user opened a defaulter review. The audit_log entry is
  // what the guided workflow Step 12 (RED 4 / RED-Q Measure) reads to mark
  // the quarterly review as done.
  useEffect(() => {
    fetch("/api/indicators/defaulters/review", {
      method: "POST",
      credentials: "include",
    })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["/api/indicators/defaulter-review-status"],
        });
      })
      .catch(() => {});
  }, [queryClient]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (provinceId) p.set("provinceId", String(provinceId));
    if (districtId) p.set("districtId", String(districtId));
    if (facilityId) p.set("facilityId", String(facilityId));
    if (antigen && antigen !== "all") p.set("antigen", antigen);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [provinceId, districtId, facilityId, antigen]);

  const { data: defaulters = [], isLoading } = useQuery<DefaulterRow[]>({
    queryKey: ["/api/indicators/defaulters", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/indicators/defaulters${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch defaulters");
      const rows = (await res.json()) as DefaulterRow[];
      return rows.map((r) => ({ ...r, id: r.clientId }));
    },
  });

  const totalOverdue = defaulters.length;
  // >=56 days past due date = >4 weeks beyond the 4-week grace cutoff
  const severe = defaulters.filter((d) => d.daysOverdue >= 56).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          Defaulter List
        </h1>
        <p className="text-sm text-muted-foreground">
          Children with a routine vaccination dose overdue by more than 4 weeks.
          Excludes SIA / campaign doses.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total defaulters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-defaulters-total">
              {totalOverdue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Severely overdue (&ge; 8 weeks past due)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{severe.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Antigen filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={antigen} onValueChange={setAntigen}>
              <SelectTrigger data-testid="select-defaulter-antigen">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANTIGEN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <GeoCascadeFilter
            provinceId={provinceId}
            districtId={districtId}
            facilityId={facilityId}
            showFacility
            onProvinceChange={(id) => {
              setProvinceId(id);
              setDistrictId(null);
              setFacilityId(null);
            }}
            onDistrictChange={(id) => {
              setDistrictId(id);
              setFacilityId(null);
            }}
            onFacilityChange={(id) => setFacilityId(id)}
            testIdPrefix="defaulters"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defaulters</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading defaulter list…
            </div>
          ) : (
            <DataTable
              data={defaulters}
              searchKeys={["name", "parentName", "facilityName", "villageName"] as any}
              searchPlaceholder="Search by name, parent, facility, village…"
              exportFileName="defaulters"
              emptyMessage="No overdue children in the selected scope."
              columns={[
                { key: "name", header: "Child name" },
                {
                  key: "dateOfBirth",
                  header: "DOB",
                  render: (r) => new Date(r.dateOfBirth).toLocaleDateString(),
                },
                { key: "parentName", header: "Parent / caregiver", render: (r) => r.parentName ?? "—" },
                { key: "villageName", header: "Home village", render: (r) => r.villageName ?? "—" },
                { key: "facilityName", header: "Facility" },
                { key: "districtName", header: "District" },
                {
                  key: "lastDoseAntigen",
                  header: "Last dose",
                  render: (r) =>
                    r.lastDoseAntigen
                      ? `${r.lastDoseAntigen.replace(/_/g, " ")} · ${new Date(r.lastDoseDate!).toLocaleDateString()}`
                      : "None",
                },
                {
                  key: "nextDoseAntigen",
                  header: "Next due",
                  render: (r) => r.nextDoseAntigen.replace(/_/g, " "),
                },
                {
                  key: "daysOverdue",
                  header: "Days overdue",
                  render: (r) => (
                    <Badge
                      variant="outline"
                      className={
                        r.daysOverdue >= 56
                          ? "border-rose-500 text-rose-600"
                          : r.daysOverdue >= 42
                            ? "border-amber-500 text-amber-600"
                            : "border-muted-foreground"
                      }
                    >
                      {r.daysOverdue}
                    </Badge>
                  ),
                },
                {
                  key: "id",
                  header: "Client",
                  render: (r) => (
                    <Link href={`/clients?selectClient=${encodeURIComponent(r.clientId)}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        data-testid={`button-view-defaulter-${r.clientId}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
