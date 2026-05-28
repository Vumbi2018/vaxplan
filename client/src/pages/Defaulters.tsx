import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import { AlertTriangle, ExternalLink, CheckCircle2, ClipboardEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

interface QuarterlyReview {
  id: number;
  facilityId: number;
  year: number;
  quarter: number;
  topDrivers: string[];
  correctiveActions: string;
  nextSurveyDate: string | null;
  updatedAt: string;
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

function currentYearQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return { year, quarter };
}

export default function Defaulters() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth() as { user: any };
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [antigen, setAntigen] = useState<string>("all");

  // Record that the user opened a defaulter review. The audit_log entry is
  // what the guided workflow Step 12 (RED 4 / RED-Q Measure) reads to mark
  // the quarterly review as opened.
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

  // ─── Quarterly review note ───
  // The note is per-facility. Facility staff can only write their own facility;
  // higher roles can pick any facility via the scope filter above.
  const { year, quarter } = currentYearQuarter();
  const roles = useMemo(() => {
    const list = new Set<string>();
    if (user?.role) list.add(user.role);
    if (Array.isArray(user?.roles)) (user.roles as string[]).forEach((r) => list.add(r));
    return list;
  }, [user]);
  const isFacilityStaff = roles.has("facility_clerk") || roles.has("facility_in_charge");
  const reviewFacilityId = isFacilityStaff ? (user?.facilityId ?? null) : facilityId;
  const canWriteReview = !!reviewFacilityId && (
    !isFacilityStaff || reviewFacilityId === user?.facilityId
  );

  const reviewQueryString = useMemo(() => {
    if (!reviewFacilityId) return "";
    const p = new URLSearchParams();
    p.set("facilityId", String(reviewFacilityId));
    p.set("year", String(year));
    p.set("quarter", String(quarter));
    return `?${p.toString()}`;
  }, [reviewFacilityId, year, quarter]);

  const { data: reviewRows = [] } = useQuery<QuarterlyReview[]>({
    queryKey: ["/api/quarterly-reviews", reviewQueryString],
    queryFn: async () => {
      if (!reviewFacilityId) return [];
      const res = await fetch(`/api/quarterly-reviews${reviewQueryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load review");
      return (await res.json()) as QuarterlyReview[];
    },
    enabled: !!reviewFacilityId,
  });
  const existingReview = reviewRows[0] ?? null;

  const [driver1, setDriver1] = useState("");
  const [driver2, setDriver2] = useState("");
  const [driver3, setDriver3] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [nextSurveyDate, setNextSurveyDate] = useState("");

  // Rehydrate the form whenever the loaded review or selected facility changes.
  useEffect(() => {
    if (existingReview) {
      const d = existingReview.topDrivers || [];
      setDriver1(d[0] ?? "");
      setDriver2(d[1] ?? "");
      setDriver3(d[2] ?? "");
      setCorrectiveActions(existingReview.correctiveActions ?? "");
      setNextSurveyDate(
        existingReview.nextSurveyDate
          ? new Date(existingReview.nextSurveyDate).toISOString().slice(0, 10)
          : "",
      );
    } else {
      setDriver1("");
      setDriver2("");
      setDriver3("");
      setCorrectiveActions("");
      setNextSurveyDate("");
    }
  }, [existingReview?.id, reviewFacilityId]);

  const saveReview = useMutation({
    mutationFn: async () => {
      const drivers = [driver1, driver2, driver3]
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return await apiRequest("POST", "/api/quarterly-reviews", {
        facilityId: reviewFacilityId,
        year,
        quarter,
        topDrivers: drivers,
        correctiveActions: correctiveActions.trim(),
        nextSurveyDate: nextSurveyDate ? nextSurveyDate : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Quarterly review saved",
        description: `Saved for Q${quarter} ${year}. Step 12 will reflect the update.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quarterly-reviews"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/indicators/defaulter-review-status"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not save review",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const driversFilled = [driver1, driver2, driver3].filter((s) => s.trim().length > 0).length;
  const formValid =
    canWriteReview &&
    driversFilled >= 1 &&
    correctiveActions.trim().length >= 5;

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

      <Card data-testid="card-quarterly-review">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4" />
            Quarterly review note — Q{quarter} {year}
            {existingReview && (
              <Badge variant="outline" className="ml-2 gap-1 border-emerald-500 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Record what the facility / district is doing about dropout this
            quarter — the top drivers, the corrective actions planned, and when
            the next coverage survey will run. This is what Step 12 of the RED
            workflow looks for, not just opening this page.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!reviewFacilityId ? (
            <div className="text-sm text-muted-foreground">
              Pick a facility in the Scope filter above to write a review note
              for it.
            </div>
          ) : !canWriteReview ? (
            <div className="text-sm text-rose-600">
              You can only write a review note for your own facility.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="driver1">Top dropout driver #1</Label>
                  <Input
                    id="driver1"
                    value={driver1}
                    onChange={(e) => setDriver1(e.target.value)}
                    placeholder="e.g. caregiver travel"
                    maxLength={255}
                    data-testid="input-review-driver-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="driver2">Top dropout driver #2</Label>
                  <Input
                    id="driver2"
                    value={driver2}
                    onChange={(e) => setDriver2(e.target.value)}
                    placeholder="e.g. stockouts in May"
                    maxLength={255}
                    data-testid="input-review-driver-2"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="driver3">Top dropout driver #3</Label>
                  <Input
                    id="driver3"
                    value={driver3}
                    onChange={(e) => setDriver3(e.target.value)}
                    placeholder="e.g. session day clashes with market"
                    maxLength={255}
                    data-testid="input-review-driver-3"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="corrective">Planned corrective actions</Label>
                <Textarea
                  id="corrective"
                  rows={4}
                  value={correctiveActions}
                  onChange={(e) => setCorrectiveActions(e.target.value)}
                  placeholder="What will the team change next quarter? Outreach to specific villages, defaulter tracing days, mobilizer follow-ups, restock plan…"
                  maxLength={4000}
                  data-testid="input-review-corrective"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nextSurvey">Date of the next coverage survey</Label>
                  <Input
                    id="nextSurvey"
                    type="date"
                    value={nextSurveyDate}
                    onChange={(e) => setNextSurveyDate(e.target.value)}
                    data-testid="input-review-next-survey"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    onClick={() => saveReview.mutate()}
                    disabled={!formValid || saveReview.isPending}
                    data-testid="button-save-review"
                  >
                    {saveReview.isPending
                      ? "Saving…"
                      : existingReview
                        ? "Update review"
                        : "Save review"}
                  </Button>
                </div>
              </div>

              {existingReview && (
                <div className="text-xs text-muted-foreground">
                  Last saved{" "}
                  {new Date(existingReview.updatedAt).toLocaleString()}.
                </div>
              )}
            </>
          )}
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
