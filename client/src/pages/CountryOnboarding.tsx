import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Globe,
  Plus,
  CheckCircle,
  MapPin,
  DollarSign,
  Users,
  Info,
  RefreshCw,
  Layers,
  Activity,
} from "lucide-react";

interface PublicTenant {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  status: string;
  settings?: Record<string, any>;
}

interface NewCountryForm {
  name: string;
  code: string;
  countryCode: string;
  mapLat: string;
  mapLng: string;
  mapZoom: string;
  currency: string;
  currencySymbol: string;
  births: string;
  under1: string;
  pregnant: string;
  schoolEntry: string;
  schoolExit: string;
  adminLevelL1: string;
  adminLevelL2: string;
  adminLevelL3: string;
  adminLevelL4: string;
  epiSchedule: string;
  fiscalYearStart: string;
}

const DEFAULTS: NewCountryForm = {
  name: "",
  code: "",
  countryCode: "",
  mapLat: "0",
  mapLng: "20",
  mapZoom: "6",
  currency: "USD",
  currencySymbol: "$",
  births: "3.5",
  under1: "3.2",
  pregnant: "3.6",
  schoolEntry: "3.0",
  schoolExit: "2.5",
  adminLevelL1: "Region",
  adminLevelL2: "Province",
  adminLevelL3: "District",
  adminLevelL4: "Ward",
  epiSchedule: "WHO_EPI_STANDARD",
  fiscalYearStart: "01-01",
};

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {hint && <p className="text-[10px] text-muted-foreground italic">{hint}</p>}
      {children}
    </div>
  );
}

const ISO_ALPHA3_TO_2: Record<string, string> = {
  PNG: "pg", ZMB: "zm", KEN: "ke", UGA: "ug", TZA: "tz",
  RWA: "rw", ETH: "et", NGA: "ng", MWI: "mw", GHA: "gh",
  SEN: "sn", MOZ: "mz", AGO: "ao", ZAF: "za", LBR: "lr",
  SLE: "sl", ZWE: "zw", SSD: "ss", SOM: "so", SDN: "sd",
  COD: "cd", COG: "cg", BDI: "bi", CMR: "cm", TCD: "td",
  CAF: "cf", MDG: "mg", GMB: "gm", GIN: "gn", GNB: "gw",
  CIV: "ci", NER: "ne", MLI: "ml", BFA: "bf", MRT: "mr",
  BEN: "bj", TGO: "tg", NGA_AL2: "ng", EGY: "eg", LBY: "ly",
  TUN: "tn", DZA: "dz", MAR: "ma", ESH: "eh", ERI: "er",
  DJI: "dj", GAB: "ga", GNQ: "gq", STP: "st", CPV: "cv",
  MUS: "mu", COM: "km", SYC: "sc", MDV: "mv", LKA: "lk",
  USA: "us", GBR: "gb", CAN: "ca", AUS: "au", FRA: "fr",
  DEU: "de", ITA: "it", ESP: "es", PRT: "pt", CHE: "ch",
  IND: "in", CHN: "cn", JPN: "jp", KOR: "kr", SGP: "sg",
};

function CountryCard({ tenant }: { tenant: PublicTenant }) {
  const s = tenant.settings ?? {};
  const demo = s.demographics ?? {};
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Original Code: rendered standard Globe icon for every country card
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            */}
            {/* Updated Code: Exposing high-fidelity country flags with CDNs and smooth fallback mechanisms */}
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-primary/5 flex items-center justify-center shrink-0 border border-border shadow-sm">
              {(() => {
                const code2 = ISO_ALPHA3_TO_2[tenant.countryCode.toUpperCase()];
                if (code2) {
                  return (
                    <img
                      src={`https://flagcdn.com/w80/${code2}.png`}
                      alt={`${tenant.name} Flag`}
                      className="h-full w-full object-cover transition-opacity duration-300 hover:opacity-90 animate-in fade-in"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  );
                }
                return <Globe className="h-5 w-5 text-primary" />;
              })()}
            </div>
            <div>
              <CardTitle className="text-base leading-tight">{tenant.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs">{tenant.code}</Badge>
                <span className="text-xs text-muted-foreground">{tenant.countryCode}</span>
              </div>
            </div>
          </div>
          <Badge
            className={
              tenant.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                : "bg-amber-500/10 text-amber-600"
            }
            variant="secondary"
          >
            <Activity className="h-3 w-3 mr-1" />
            {tenant.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {s.mapCenter && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                {Array.isArray(s.mapCenter)
                  ? `${Number(s.mapCenter[0]).toFixed(2)}°, ${Number(s.mapCenter[1]).toFixed(2)}°`
                  : "—"}
              </span>
            </div>
          )}
          {s.currency && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{s.currencySymbol ?? ""} {s.currency}</span>
            </div>
          )}
          {demo.births != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Births: {(demo.births * 100).toFixed(1)}%</span>
            </div>
          )}
          {demo.under1 != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Under-1: {(demo.under1 * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {s.adminLevelLabels && (
          <div className="flex flex-wrap gap-1">
            {Object.values(s.adminLevelLabels as Record<string, string>).map((lbl) => (
              <Badge key={lbl} variant="outline" className="text-[10px]">
                <Layers className="h-2.5 w-2.5 mr-1" />
                {lbl}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CountryOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewCountryForm>(DEFAULTS);

  /*
  // Original queries (commented out to preserve working code while adding offline capabilities):
  const { data: tenants, isLoading } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
  });

  // Use the authenticated tenant list endpoint for admin views
  const { data: allTenants, isLoading: loadingAll } = useQuery<PublicTenant[]>({
    queryKey: ["/api/admin/tenants"],
    queryFn: async () => {
      const r = await fetch("/api/public/tenants", { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });
  */

  // Updated queries with robust offline check fallbacks:
  const { data: tenants, isLoading } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const r = await fetch("/api/public/tenants");
      if (!r.ok) throw new Error("Failed to fetch tenants");
      return r.json();
    }
  });

  // Use the authenticated tenant list endpoint for admin views
  const { data: allTenants, isLoading: loadingAll } = useQuery<PublicTenant[]>({
    queryKey: ["/api/admin/tenants"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const r = await fetch("/api/public/tenants", { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const provision = useMutation({
    mutationFn: async (payload: object) =>
      apiRequest("POST", "/api/admin/tenants", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/tenants"] });
      setDialogOpen(false);
      setForm(DEFAULTS);
      toast({
        title: "Country Provisioned Successfully",
        description: `${form.name} has been registered as an active tenant.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to provision country",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateField = (key: keyof NewCountryForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim() || !form.countryCode.trim()) {
      toast({
        title: "Missing required fields",
        description: "Country Name, Tenant Code, and ISO Country Code are required.",
        variant: "destructive",
      });
      return;
    }
    if (form.countryCode.length !== 3) {
      toast({
        title: "Invalid ISO Country Code",
        description: "ISO country code must be exactly 3 uppercase letters (e.g. PNG, ZMB, KEN).",
        variant: "destructive",
      });
      return;
    }

    provision.mutate({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      countryCode: form.countryCode.trim().toUpperCase(),
      settings: {
        currency: form.currency.trim().toUpperCase() || "USD",
        currencySymbol: form.currencySymbol.trim() || "$",
        mapCenter: [parseFloat(form.mapLat) || 0, parseFloat(form.mapLng) || 20],
        mapZoom: parseInt(form.mapZoom) || 6,
        epiSchedule: form.epiSchedule.trim() || "WHO_EPI_STANDARD",
        fiscalYearStart: form.fiscalYearStart.trim() || "01-01",
        adminLevelLabels: {
          level1: form.adminLevelL1 || "Region",
          level2: form.adminLevelL2 || "Province",
          level3: form.adminLevelL3 || "District",
          level4: form.adminLevelL4 || "Ward",
        },
        demographics: {
          births: (parseFloat(form.births) || 3.5) / 100,
          under1: (parseFloat(form.under1) || 3.2) / 100,
          pregnant: (parseFloat(form.pregnant) || 3.6) / 100,
          schoolEntry: (parseFloat(form.schoolEntry) || 3.0) / 100,
          schoolExit: (parseFloat(form.schoolExit) || 2.5) / 100,
        },
      },
    });
  };

  const displayTenants = allTenants ?? tenants ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* ─── Header ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Country Onboarding
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Register new countries as active microplanning tenants on the VaxPlan platform.
            All settings are fully configurable — no hardcoding required.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 font-semibold shadow"
          data-testid="button-new-country"
        >
          <Plus className="h-4 w-4" />
          Add New Country
        </Button>
      </div>

      {/* ─── WHO Info Banner ───────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">WHO Global Standard Configuration</p>
            <p className="text-xs text-muted-foreground">
              Each country tenant is independently configured with WHO EPI schedule parameters,
              country-specific demographic ratios, administrative hierarchy labels, and GIS map bounds.
              These settings drive all vaccine demand forecasting, budget calculations, and microplan generation —
              ensuring accurate, country-specific results for every Ministry of Health.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Active Countries Grid ─────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Active Countries
            {!isLoading && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {displayTenants.length}
              </Badge>
            )}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/public/tenants"] })}
            data-testid="button-refresh-tenants"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || loadingAll ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : displayTenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No countries provisioned yet. Click "Add New Country" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTenants.map((t) => (
              <CountryCard key={t.id} tenant={t} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Provisioning Dialog ────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(DEFAULTS); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Register New Country Tenant
            </DialogTitle>
            <DialogDescription>
              Configure all settings for the new country. These parameters drive WHO-standard vaccine demand
              forecasting, GIS mapping, and microplan generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Identity */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Globe className="h-4 w-4" /> Country Identity
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="country-name" className="text-xs">
                    Ministry of Health / Country Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="country-name"
                    value={form.name}
                    onChange={updateField("name")}
                    placeholder="e.g. Republic of Kenya Ministry of Health"
                    data-testid="input-country-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-code" className="text-xs">
                    Tenant Code <span className="text-destructive">*</span>
                    <span className="text-muted-foreground ml-1">(2–10 chars, uppercase)</span>
                  </Label>
                  <Input
                    id="tenant-code"
                    value={form.code}
                    onChange={updateField("code")}
                    placeholder="e.g. KEN"
                    className="font-mono"
                    data-testid="input-tenant-code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iso-code" className="text-xs">
                    ISO-3166 Alpha-3 Code <span className="text-destructive">*</span>
                    <span className="text-muted-foreground ml-1">(exactly 3 chars)</span>
                  </Label>
                  <Input
                    id="iso-code"
                    value={form.countryCode}
                    onChange={updateField("countryCode")}
                    placeholder="e.g. KEN"
                    className="font-mono"
                    maxLength={3}
                    data-testid="input-country-code"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Demographics */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Users className="h-4 w-4" /> WHO Target Demographic Ratios (Annual %)
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Sourced from National Statistics Office (NSO) or World Bank. Used to calculate vaccine demand from total population.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {([
                  ["births", "Annual Births", "form.births"],
                  ["under1", "Infants (<1yr)", "form.under1"],
                  ["pregnant", "Pregnant Women", "form.pregnant"],
                  ["schoolEntry", "School Entry", "form.schoolEntry"],
                  ["schoolExit", "School Exit", "form.schoolExit"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`demo-${key}`} className="text-xs">{label}</Label>
                    <div className="relative">
                      <Input
                        id={`demo-${key}`}
                        value={form[key as keyof NewCountryForm]}
                        onChange={updateField(key as keyof NewCountryForm)}
                        className="pr-7 font-mono text-sm"
                        data-testid={`input-demo-${key}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financial */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> Financial Settings
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currency-code" className="text-xs">Currency Code</Label>
                  <Input
                    id="currency-code"
                    value={form.currency}
                    onChange={updateField("currency")}
                    placeholder="e.g. KES, USD, ZMW"
                    className="font-mono"
                    data-testid="input-currency-code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency-symbol" className="text-xs">Currency Symbol</Label>
                  <Input
                    id="currency-symbol"
                    value={form.currencySymbol}
                    onChange={updateField("currencySymbol")}
                    placeholder="e.g. KSh, $, K"
                    className="font-mono"
                    data-testid="input-currency-symbol"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="epi-schedule" className="text-xs">EPI Schedule ID</Label>
                  <Input
                    id="epi-schedule"
                    value={form.epiSchedule}
                    onChange={updateField("epiSchedule")}
                    placeholder="e.g. KEN_2024, WHO_EPI_STANDARD"
                    className="font-mono text-sm"
                    data-testid="input-epi-schedule"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fiscal-year" className="text-xs">Fiscal Year Start (MM-DD)</Label>
                  <Input
                    id="fiscal-year"
                    value={form.fiscalYearStart}
                    onChange={updateField("fiscalYearStart")}
                    placeholder="e.g. 01-01, 07-01"
                    className="font-mono text-sm"
                    data-testid="input-fiscal-year"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* GIS */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> GIS Map Configuration
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="map-lat" className="text-xs">Default Latitude</Label>
                  <Input
                    id="map-lat"
                    value={form.mapLat}
                    onChange={updateField("mapLat")}
                    placeholder="-1.28"
                    className="font-mono text-sm"
                    data-testid="input-map-lat"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-lng" className="text-xs">Default Longitude</Label>
                  <Input
                    id="map-lng"
                    value={form.mapLng}
                    onChange={updateField("mapLng")}
                    placeholder="36.82"
                    className="font-mono text-sm"
                    data-testid="input-map-lng"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-zoom" className="text-xs">Default Zoom</Label>
                  <Input
                    id="map-zoom"
                    value={form.mapZoom}
                    onChange={updateField("mapZoom")}
                    placeholder="6"
                    className="font-mono text-sm"
                    data-testid="input-map-zoom"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Admin Hierarchy */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Administrative Hierarchy Labels
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Customise the names used for each administrative level in this country (replaces generic Level 1–4 labels in the UI).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  ["adminLevelL1", "Level 1"],
                  ["adminLevelL2", "Level 2"],
                  ["adminLevelL3", "Level 3"],
                  ["adminLevelL4", "Level 4"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`admin-${key}`} className="text-xs">{label}</Label>
                    <Input
                      id={`admin-${key}`}
                      value={form[key as keyof NewCountryForm]}
                      onChange={updateField(key as keyof NewCountryForm)}
                      placeholder={label}
                      className="text-sm"
                      data-testid={`input-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setDialogOpen(false); setForm(DEFAULTS); }}
              data-testid="button-cancel-provision"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={provision.isPending}
              className="gap-2 font-semibold"
              data-testid="button-confirm-provision"
            >
              {provision.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Provisioning…</>
              ) : (
                <><CheckCircle className="h-4 w-4" /> Provision Country</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
