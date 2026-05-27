/**
 * HIS Integrations Page
 *
 * Manage Health Information System interoperability for the current tenant.
 * Supports DHIS2, HL7 FHIR R4, and generic HMIS REST integrations.
 *
 * Accessible to: national_admin, gis_specialist
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Share2,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ServerCog,
  Wifi,
  WifiOff,
  Database,
  Stethoscope,
  Globe,
  Lock,
  Info,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import type { Tenant } from "@shared/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HisIntegrationStatus {
  id: string;
  type: "dhis2" | "fhir_r4" | "hmis_generic";
  label: string;
  enabled: boolean;
  hasToken: boolean;
  baseUrl: string;
}

interface HisStatusResponse {
  tenantCode: string;
  integrationCount: number;
  integrations: HisIntegrationStatus[];
}

interface PushResult {
  integrationId: string;
  integrationLabel: string;
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
  timestamp: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const ADAPTER_LABELS: Record<string, string> = {
  dhis2: "DHIS2",
  fhir_r4: "HL7 FHIR R4",
  hmis_generic: "Generic HMIS REST",
};

const ADAPTER_COLORS: Record<string, string> = {
  dhis2:        "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300",
  fhir_r4:      "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-300",
  hmis_generic: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300",
};

const ADAPTER_ICONS: Record<string, React.ComponentType<any>> = {
  dhis2:        Database,
  fhir_r4:      Stethoscope,
  hmis_generic: Globe,
};

function IntegrationCard({ 
  integration,
  isNationalAdmin,
  onEdit 
}: { 
  integration: HisIntegrationStatus;
  isNationalAdmin: boolean;
  onEdit: () => void;
}) {
  const AdapterIcon = ADAPTER_ICONS[integration.type] ?? ServerCog;
  const isReady = integration.enabled && integration.hasToken;

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-all duration-200 group relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isReady ? "bg-indigo-500/10 text-indigo-500" : "bg-muted"}`}>
              <AdapterIcon className={`h-5 w-5 ${isReady ? "text-indigo-500 dark:text-indigo-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold leading-tight text-foreground">{integration.label}</CardTitle>
              <Badge
                variant="outline"
                className={`text-[10px] mt-1 ${ADAPTER_COLORS[integration.type]}`}
              >
                {ADAPTER_LABELS[integration.type] ?? integration.type}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {integration.enabled ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px]" variant="secondary">
                <Wifi className="h-2.5 w-2.5 mr-1" /> Enabled
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground text-[10px]" variant="secondary">
                <WifiOff className="h-2.5 w-2.5 mr-1" /> Disabled
              </Badge>
            )}
            {integration.enabled && (
              integration.hasToken ? (
                <Badge className="bg-green-500/10 text-green-700 border-green-200 text-[10px]" variant="secondary">
                  <Lock className="h-2.5 w-2.5 mr-1" /> Token OK
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-700 border-red-200 text-[10px]" variant="secondary">
                  <Lock className="h-2.5 w-2.5 mr-1" /> No Token
                </Badge>
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-12">
        <p className="text-[11px] text-muted-foreground font-mono truncate" title={integration.baseUrl}>
          {integration.baseUrl}
        </p>
        {integration.enabled && !integration.hasToken && (
          <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Set environment variable for this integration's secret.
          </p>
        )}
      </CardContent>

      {isNationalAdmin && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground border border-border bg-card shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="h-3 w-3 mr-1 text-indigo-500" />
            Edit
          </Button>
        </div>
      )}
    </Card>
  );
}

function PushResultCard({ result }: { result: PushResult }) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm space-y-1.5 ${
        result.success
          ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-red-200 bg-red-50 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-xs text-foreground">{result.integrationLabel}</span>
        {result.success ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Records: <strong>{result.recordsProcessed}</strong> · {result.durationMs}ms
      </p>
      {result.errors.length > 0 && (
        <ul className="text-[11px] text-red-700 space-y-0.5">
          {result.errors.map((e, i) => <li key={i}><span className="font-mono">{e}</span></li>)}
        </ul>
      )}
      {result.warnings.length > 0 && (
        <ul className="text-[11px] text-amber-700 space-y-0.5">
          {result.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HisIntegrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pushDialog, setPushDialog] = useState(false);
  const [pullDialog, setPullDialog] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState("");
  const [pushResults, setPushResults] = useState<PushResult[]>([]);
  const [pullResults, setPullResults] = useState<{ result: PushResult; orgUnits: any[] } | null>(null);

  // Configuration edit states
  const [isAddConfigOpen, setIsAddConfigOpen] = useState(false);
  const [isEditConfigOpen, setIsEditConfigOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const [newType, setNewType] = useState<"dhis2" | "fhir_r4" | "hmis_generic">("dhis2");
  const [newLabel, setNewLabel] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newSecretRef, setNewSecretRef] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const { data: status, isLoading, error } = useQuery<HisStatusResponse>({
    queryKey: ["/api/his/status"],
    retry: 1,
  });

  const updateSettings = useMutation({
    mutationFn: async (updatedFields: Partial<Tenant>) => {
      const response = await apiRequest("PATCH", "/api/me/tenant", updatedFields);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/tenant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/his/status"] });
      toast({
        title: "HIS Settings Updated",
        description: "Your country's interoperability configurations have been written to the database.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = { reportId: parseInt(selectedReportId) };
      if (selectedIntegration) body.integrationId = selectedIntegration;
      const resp = await apiRequest("POST", "/api/his/push-immunizations", body);
      return (resp as any).json ? (resp as any).json() : resp;
    },
    onSuccess: (data) => {
      setPushResults(data.results ?? []);
      const allOk = (data.results ?? []).every((r: PushResult) => r.success);
      toast({
        title: allOk ? "Push Successful" : "Push Completed with Errors",
        description: `${data.recordCount} records processed across ${(data.results ?? []).length} integration(s).`,
        variant: allOk ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Push Failed", description: err.message, variant: "destructive" });
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(
        `/api/his/pull-facilities?integrationId=${encodeURIComponent(selectedIntegration)}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data) => {
      setPullResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({
        title: "Org Unit Pull Complete",
        description: `Retrieved ${data.orgUnits?.length ?? 0} facility records from external HIS.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Pull Failed", description: err.message, variant: "destructive" });
    },
  });

  const isNationalAdmin = user?.role === "national_admin";
  const enabledIntegrations = status?.integrations?.filter((i) => i.enabled) ?? [];
  const currentIntegrations = (tenant?.settings as any)?.hisIntegrations || [];

  const handleAddIntegration = () => {
    if (!newLabel.trim() || !newBaseUrl.trim() || !newSecretRef.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out all configuration fields.",
        variant: "destructive",
      });
      return;
    }
    const newConfig = {
      id: `his_${Date.now()}`,
      type: newType,
      label: newLabel,
      baseUrl: newBaseUrl,
      secretRef: newSecretRef,
      enabled: newEnabled,
    };
    const updatedSettings = {
      ...(tenant?.settings as any),
      hisIntegrations: [...currentIntegrations, newConfig],
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsAddConfigOpen(false);
    // Reset
    setNewLabel("");
    setNewBaseUrl("");
    setNewSecretRef("");
    setNewEnabled(true);
  };

  const handleEditIntegration = () => {
    if (!newLabel.trim() || !newBaseUrl.trim() || !newSecretRef.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out all configuration fields.",
        variant: "destructive",
      });
      return;
    }
    if (editingConfigId === null) return;
    const updatedList = currentIntegrations.map((cfg: any) => {
      if (cfg.id === editingConfigId) {
        return {
          ...cfg,
          type: newType,
          label: newLabel,
          baseUrl: newBaseUrl,
          secretRef: newSecretRef,
          enabled: newEnabled,
        };
      }
      return cfg;
    });
    const updatedSettings = {
      ...(tenant?.settings as any),
      hisIntegrations: updatedList,
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsEditConfigOpen(false);
    setEditingConfigId(null);
  };

  const handleDeleteIntegration = (configId: string) => {
    const updatedList = currentIntegrations.filter((cfg: any) => cfg.id !== configId);
    const updatedSettings = {
      ...(tenant?.settings as any),
      hisIntegrations: updatedList,
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsEditConfigOpen(false);
    setEditingConfigId(null);
  };

  const handleOpenEdit = (integration: HisIntegrationStatus) => {
    const orig = currentIntegrations.find((x: any) => x.id === integration.id) || {};
    setEditingConfigId(integration.id);
    setNewType(integration.type);
    setNewLabel(integration.label);
    setNewBaseUrl(integration.baseUrl);
    setNewSecretRef(orig.secretRef || "");
    setNewEnabled(integration.enabled);
    setIsEditConfigOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-indigo-500" />
            HIS Interoperability Setup
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect VaxPlan to national Health Information Systems — DHIS2, HL7 FHIR R4, and custom HMIS endpoints.
          </p>
        </div>
        <div className="flex gap-2">
          {isNationalAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setNewType("dhis2");
                setNewLabel("");
                setNewBaseUrl("");
                setNewSecretRef("");
                setNewEnabled(true);
                setIsAddConfigOpen(true);
              }}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
              id="btn-add-integration"
            >
              <Plus className="h-4 w-4" />
              Add Connection Setup
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/his/status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/me/tenant"] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setPushResults([]); setPushDialog(true); }}
            disabled={enabledIntegrations.length === 0}
            className="gap-1.5"
            id="btn-push-immunizations"
          >
            <ArrowUpRight className="h-4 w-4" />
            Push Immunizations
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setPullResults(null); setPullDialog(true); }}
            disabled={enabledIntegrations.length === 0}
            className="gap-1.5"
            id="btn-pull-facilities"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Pull Facilities
          </Button>
        </div>
      </div>

      {/* ─── WHO / Standards Info Banner ─────────────────────────────── */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">WHO & UNICEF Recommended Standards</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Interoperability is implemented against WHO-endorsed open standards: <strong>DHIS2 Web API v2</strong> for 
              aggregate reporting (used in 70+ countries), <strong>HL7 FHIR R4</strong> for individual patient/immunization 
              records (IHE PIXm / mCSD compliant), and a configurable <strong>generic REST adapter</strong> for 
              country-specific national HMIS such as South Sudan eHIS and Zambia SmartCare.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Integration Cards ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-indigo-500" />
            Configured Integrations
            {!isLoading && status && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {status.integrationCount}
              </Badge>
            )}
          </h2>
          {status && (
            <Badge variant="outline" className="text-xs font-mono text-muted-foreground border-border">
              Tenant: {status.tenantCode}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6 text-center space-y-2">
              <XCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-medium text-destructive">Failed to load HIS integration status</p>
              <p className="text-xs text-muted-foreground">
                Verify you have <code>national_admin</code> or <code>gis_specialist</code> role.
              </p>
            </CardContent>
          </Card>
        ) : !status || status.integrationCount === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <ServerCog className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">No HIS integrations configured</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No connection setup discovered for this tenant. Setup your first DHIS2 or HL7 FHIR connection using the 
                <strong> Add Connection Setup</strong> button above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.integrations.map((integration) => (
              <IntegrationCard 
                key={integration.id} 
                integration={integration} 
                isNationalAdmin={isNationalAdmin}
                onEdit={() => handleOpenEdit(integration)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Add Connection Dialog ─────────────────────────────── */}
      <Dialog open={isAddConfigOpen} onOpenChange={setIsAddConfigOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-500" />
              Add HIS Integration Setup
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new aggregate reporting or individual immunization transfer channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integration Standard Type</Label>
              <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="dhis2">DHIS2 Aggregate Web API</SelectItem>
                  <SelectItem value="fhir_r4">HL7 FHIR R4 Patient REST</SelectItem>
                  <SelectItem value="hmis_generic">Generic HMIS REST Endpoint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-his-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection Label</Label>
              <Input
                id="add-his-label"
                placeholder="e.g. National DHIS2 Endpoint"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-his-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Endpoint URL</Label>
              <Input
                id="add-his-url"
                placeholder="e.g. https://dhis2-instance.gov/api"
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-his-secret" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auth Token Secret Reference (Env Var)</Label>
              <Input
                id="add-his-secret"
                placeholder="e.g. DHIS2_MOH_AUTH_TOKEN"
                value={newSecretRef}
                onChange={(e) => setNewSecretRef(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Enter the name of the system environment variable containing the bearer or basic authentication token.
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">Activate Connection</span>
                <span className="text-xs text-muted-foreground block">Allow sync tasks to utilize this integration immediately.</span>
              </div>
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} className="data-[state=checked]:bg-indigo-600" />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsAddConfigOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddIntegration} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              Save Integration Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Connection Dialog ─────────────────────────────── */}
      <Dialog open={isEditConfigOpen} onOpenChange={setIsEditConfigOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-500" />
              Edit HIS Integration Setup
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify connection parameters, base URL endpoints, or authorization keys.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integration Standard Type</Label>
              <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="dhis2">DHIS2 Aggregate Web API</SelectItem>
                  <SelectItem value="fhir_r4">HL7 FHIR R4 Patient REST</SelectItem>
                  <SelectItem value="hmis_generic">Generic HMIS REST Endpoint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-his-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection Label</Label>
              <Input
                id="edit-his-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-his-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Endpoint URL</Label>
              <Input
                id="edit-his-url"
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-his-secret" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auth Token Secret Reference (Env Var)</Label>
              <Input
                id="edit-his-secret"
                value={newSecretRef}
                onChange={(e) => setNewSecretRef(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl font-mono"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">Activate Connection</span>
                <span className="text-xs text-muted-foreground block">Allow sync tasks to utilize this integration immediately.</span>
              </div>
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} className="data-[state=checked]:bg-indigo-600" />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 flex gap-2 justify-between">
            <Button
              variant="outline"
              onClick={() => editingConfigId && handleDeleteIntegration(editingConfigId)}
              className="bg-red-500/10 hover:bg-red-500 hover:text-white border-red-500/20 text-red-500 rounded-xl font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete Setup
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditConfigOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleEditIntegration} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">
                Save Setup Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Standards Reference ────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Globe className="h-4 w-4 text-indigo-500" />
          Supported Standards
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Database,
              title: "DHIS2 Web API v2",
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/20",
              border: "border-blue-200 dark:border-blue-900/40",
              description:
                "Aggregate immunization data pushed to national DHIS2 instances via dataValueSets. Org unit pull for facility enrichment.",
              standards: ["WHO Global EPI", "UNICEF MICS", "PEPFAR DATIM"],
            },
            {
              icon: Stethoscope,
              title: "HL7 FHIR R4",
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 dark:bg-purple-950/20",
              border: "border-purple-200 dark:border-purple-900/40",
              description:
                "Patient demographics and individual Immunization resources posted to OpenMRS, HAPI FHIR, or GCP Healthcare API.",
              standards: ["IHE PIXm", "IHE mCSD", "OpenMRS FHIR"],
            },
            {
              icon: Globe,
              title: "Generic HMIS REST",
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/20",
              border: "border-amber-200 dark:border-amber-900/40",
              description:
                "Configurable REST adapter for country-specific national systems. Posts a VaxPlan-structured JSON envelope.",
              standards: ["Zambia SmartCare", "South Sudan eHIS", "Custom MOH APIs"],
            },
          ].map((card) => (
            <Card key={card.title} className={`border ${card.border} ${card.bg}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm flex items-center gap-2 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                <div className="flex flex-wrap gap-1">
                  {card.standards.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] text-muted-foreground border-border bg-card">
                      <ChevronRight className="h-2.5 w-2.5 mr-0.5" />
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── Push Immunizations Dialog ──────────────────────────────── */}
      <Dialog open={pushDialog} onOpenChange={setPushDialog}>
        <DialogContent className="max-w-lg bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ArrowUpRight className="h-5 w-5 text-indigo-500" />
              Push Immunizations to HIS
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a monthly report and target integration to push immunization records to the external HIS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-id-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Report ID</Label>
              <Input
                id="report-id-input"
                type="number"
                placeholder="Enter report ID (e.g. 42)"
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="bg-background border-border text-foreground rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Integration (leave blank for all)</Label>
              <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                <SelectTrigger id="push-integration-select" className="bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="All enabled integrations" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="">All enabled integrations</SelectItem>
                  {enabledIntegrations.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pushResults.length > 0 && (
              <>
                <Separator className="border-border" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Push Results</p>
                  {pushResults.map((r) => <PushResultCard key={r.integrationId} result={r} />)}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4 gap-2">
            <Button variant="outline" onClick={() => setPushDialog(false)} className="rounded-xl">Close</Button>
            <Button
              onClick={() => pushMutation.mutate()}
              disabled={!selectedReportId || pushMutation.isPending}
              id="btn-confirm-push"
              className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
            >
              {pushMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Pushing…</>
              ) : (
                <><ArrowUpRight className="h-4 w-4" /> Push</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Pull Facilities Dialog ──────────────────────────────────── */}
      <Dialog open={pullDialog} onOpenChange={setPullDialog}>
        <DialogContent className="max-w-lg bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ArrowDownLeft className="h-5 w-5 text-indigo-500" />
              Pull Facilities from HIS
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Download org units from a DHIS2 or FHIR integration to enrich local facility records with external IDs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Integration</Label>
              <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                <SelectTrigger id="pull-integration-select" className="bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Select an integration…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {enabledIntegrations
                    .filter((i) => i.type === "dhis2" || i.type === "fhir_r4")
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {pullResults && (
              <>
                <Separator className="border-border" />
                <PushResultCard result={pullResults.result as PushResult} />
                {pullResults.orgUnits && pullResults.orgUnits.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Retrieved <strong>{pullResults.orgUnits.length}</strong> org units.
                    Facility list has been refreshed.
                  </p>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4 gap-2">
            <Button variant="outline" onClick={() => setPullDialog(false)} className="rounded-xl">Close</Button>
            <Button
              onClick={() => pullMutation.mutate()}
              disabled={!selectedIntegration || pullMutation.isPending}
              id="btn-confirm-pull"
              className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
            >
              {pullMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Pulling…</>
              ) : (
                <><ArrowDownLeft className="h-4 w-4" /> Pull Facilities</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
