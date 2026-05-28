import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/DataTable";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

type DistRow = {
  districtId: number;
  districtName: string;
  dtp1: number;
  dtp3?: number;
  mcv1?: number;
  rate: number;
};
type FacRow = {
  facilityId: number;
  facilityName: string;
  districtId: number;
  districtName: string;
  dtp1: number;
  dtp3?: number;
  mcv1?: number;
  rate: number;
};

interface DropoutPayload {
  period: { months: number; start: string; end: string };
  dtp1_dtp3: { num: number; denom: number; rate: number; byDistrict: DistRow[]; byFacility: FacRow[] };
  dtp1_mcv1: { num: number; denom: number; rate: number; byDistrict: DistRow[]; byFacility: FacRow[] };
}

function rateClass(rate: number) {
  if (rate > 10) return "border-rose-500 text-rose-600";
  if (rate >= 5) return "border-amber-500 text-amber-600";
  return "border-emerald-500 text-emerald-600";
}

export default function DropoutRates() {
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [periodMonths, setPeriodMonths] = useState<string>("12");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (provinceId) p.set("provinceId", String(provinceId));
    if (districtId) p.set("districtId", String(districtId));
    if (facilityId) p.set("facilityId", String(facilityId));
    if (periodMonths && periodMonths !== "12") p.set("periodMonths", periodMonths);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [provinceId, districtId, facilityId, periodMonths]);

  const { data, isLoading } = useQuery<DropoutPayload>({
    queryKey: ["/api/indicators/dropout", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/indicators/dropout${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch dropout");
      return (await res.json()) as DropoutPayload;
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Dropout rates — DTP1 → DTP3 and DTP1 → MCV1
        </h1>
        <p className="text-sm text-muted-foreground">
          WHO formula: (DTP1 − later dose) / DTP1 × 100, computed on the
          rolling cohort of children whose DTP1 dose was administered in the
          selected period. Excludes SIA / campaign doses.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            testIdPrefix="dropout"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Cohort window</span>
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger className="w-48" data-testid="select-dropout-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">DTP1 → DTP3 dropout</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold" data-testid="text-dtp3-rate">
                  {data.dtp1_dtp3.rate}%
                </span>
                <Badge variant="outline" className={rateClass(data.dtp1_dtp3.rate)}>
                  {data.dtp1_dtp3.rate > 10 ? "High" : data.dtp1_dtp3.rate >= 5 ? "Watch" : "OK"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {data.dtp1_dtp3.num.toLocaleString()} DTP3 / {data.dtp1_dtp3.denom.toLocaleString()} DTP1
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">DTP1 → MCV1 dropout</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold" data-testid="text-mcv1-rate">
                  {data.dtp1_mcv1.rate}%
                </span>
                <Badge variant="outline" className={rateClass(data.dtp1_mcv1.rate)}>
                  {data.dtp1_mcv1.rate > 10 ? "High" : data.dtp1_mcv1.rate >= 5 ? "Watch" : "OK"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {data.dtp1_mcv1.num.toLocaleString()} MCV1 / {data.dtp1_mcv1.denom.toLocaleString()} DTP1
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By district</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <DataTable
              data={data.dtp1_dtp3.byDistrict.map((d) => {
                const mcv = data.dtp1_mcv1.byDistrict.find((x) => x.districtId === d.districtId);
                return {
                  id: d.districtId,
                  districtName: d.districtName,
                  dtp1: d.dtp1,
                  dtp3: d.dtp3 ?? 0,
                  dtp3Rate: d.rate,
                  mcv1: mcv?.mcv1 ?? 0,
                  mcv1Rate: mcv?.rate ?? 0,
                };
              })}
              searchKeys={["districtName"] as any}
              searchPlaceholder="Search district…"
              exportFileName="dropout-by-district"
              emptyMessage="No DTP1 doses in the selected scope and window."
              columns={[
                { key: "districtName", header: "District" },
                { key: "dtp1", header: "DTP1 cohort", render: (r) => r.dtp1.toLocaleString() },
                { key: "dtp3", header: "DTP3 in cohort", render: (r) => r.dtp3.toLocaleString() },
                {
                  key: "dtp3Rate",
                  header: "DTP1→DTP3 %",
                  render: (r) => (
                    <Badge variant="outline" className={rateClass(r.dtp3Rate)}>
                      {r.dtp3Rate}%
                    </Badge>
                  ),
                },
                { key: "mcv1", header: "MCV1 in cohort", render: (r) => r.mcv1.toLocaleString() },
                {
                  key: "mcv1Rate",
                  header: "DTP1→MCV1 %",
                  render: (r) => (
                    <Badge variant="outline" className={rateClass(r.mcv1Rate)}>
                      {r.mcv1Rate}%
                    </Badge>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By facility</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <DataTable
              data={data.dtp1_dtp3.byFacility.map((f) => {
                const mcv = data.dtp1_mcv1.byFacility.find((x) => x.facilityId === f.facilityId);
                return {
                  id: f.facilityId,
                  facilityName: f.facilityName,
                  districtName: f.districtName,
                  dtp1: f.dtp1,
                  dtp3: f.dtp3 ?? 0,
                  dtp3Rate: f.rate,
                  mcv1: mcv?.mcv1 ?? 0,
                  mcv1Rate: mcv?.rate ?? 0,
                };
              })}
              searchKeys={["facilityName", "districtName"] as any}
              searchPlaceholder="Search facility or district…"
              exportFileName="dropout-by-facility"
              emptyMessage="No DTP1 doses in the selected scope and window."
              columns={[
                { key: "facilityName", header: "Facility" },
                { key: "districtName", header: "District" },
                { key: "dtp1", header: "DTP1 cohort", render: (r) => r.dtp1.toLocaleString() },
                {
                  key: "dtp3Rate",
                  header: "DTP1→DTP3 %",
                  render: (r) => (
                    <Badge variant="outline" className={rateClass(r.dtp3Rate)}>
                      {r.dtp3Rate}%
                    </Badge>
                  ),
                },
                {
                  key: "mcv1Rate",
                  header: "DTP1→MCV1 %",
                  render: (r) => (
                    <Badge variant="outline" className={rateClass(r.mcv1Rate)}>
                      {r.mcv1Rate}%
                    </Badge>
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
