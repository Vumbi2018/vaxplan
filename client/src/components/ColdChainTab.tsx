/**
 * ColdChainTab — Full CRUD for cold-chain equipment inventory inside a facility dialog.
 *
 * Features:
 * - List all active CCE items with condition badges
 * - Add / Edit via modal form (WHO EIR-compatible fields)
 * - Soft-delete (isActive = false)
 * - CSV Export (IGA interoperability)
 * - CSV Import (paste / upload)
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Download, Upload, Snowflake, Wrench,
  AlertTriangle, RefreshCw, CheckCircle2, X, Loader2, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────
type EquipmentType =
  | "refrigerator" | "freezer" | "icm" | "cold_box" | "vaccine_carrier"
  | "generator" | "temperature_logger" | "other";

type Condition =
  | "functional" | "needs_repair" | "non_functional" | "condemned" | "decommissioned";

type PowerSource =
  | "solar" | "electric" | "gas" | "kerosene" | "battery" | "solar_dc" | "none";

interface ColdChainItem {
  id: number;
  facilityId: number;
  equipmentType: EquipmentType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  catalogNumber: string | null;
  capacityLiters: string | null;
  netStorageCapacityLiters: string | null;
  temperatureMin: string | null;
  temperatureMax: string | null;
  powerSource: PowerSource | null;
  energyConsumptionKwhDay: string | null;
  manufactureYear: number | null;
  installationDate: string | null;
  purchaseCost: string | null;
  purchaseCurrency: string | null;
  warrantyExpiry: string | null;
  supplier: string | null;
  donorFunded: boolean;
  fundingSource: string | null;
  condition: Condition;
  lastServiceDate: string | null;
  nextServiceDue: string | null;
  lastTemperatureCheck: string | null;
  maintenanceNotes: string | null;
  isActive: boolean;
  notes: string | null;
  externalId: string | null;
}

interface FormData {
  equipmentType: EquipmentType;
  brand: string;
  model: string;
  serialNumber: string;
  catalogNumber: string;
  capacityLiters: string;
  netStorageCapacityLiters: string;
  temperatureMin: string;
  temperatureMax: string;
  powerSource: PowerSource | "";
  energyConsumptionKwhDay: string;
  manufactureYear: string;
  installationDate: string;
  purchaseCost: string;
  purchaseCurrency: string;
  warrantyExpiry: string;
  supplier: string;
  donorFunded: boolean;
  fundingSource: string;
  condition: Condition;
  lastServiceDate: string;
  nextServiceDue: string;
  lastTemperatureCheck: string;
  maintenanceNotes: string;
  isActive: boolean;
  notes: string;
  externalId: string;
}

const EMPTY_FORM: FormData = {
  equipmentType: "refrigerator",
  brand: "",
  model: "",
  serialNumber: "",
  catalogNumber: "",
  capacityLiters: "",
  netStorageCapacityLiters: "",
  temperatureMin: "",
  temperatureMax: "",
  powerSource: "",
  energyConsumptionKwhDay: "",
  manufactureYear: "",
  installationDate: "",
  purchaseCost: "",
  purchaseCurrency: "USD",
  warrantyExpiry: "",
  supplier: "",
  donorFunded: false,
  fundingSource: "",
  condition: "functional",
  lastServiceDate: "",
  nextServiceDue: "",
  lastTemperatureCheck: "",
  maintenanceNotes: "",
  isActive: true,
  notes: "",
  externalId: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CONDITION_STYLE: Record<Condition, string> = {
  functional: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  needs_repair: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  non_functional: "bg-red-500/10 text-red-600 border-red-500/20",
  condemned: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  decommissioned: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const CONDITION_LABELS: Record<Condition, string> = {
  functional: "Functional",
  needs_repair: "Needs Repair",
  non_functional: "Non-Functional",
  condemned: "Condemned",
  decommissioned: "Decommissioned",
};

const TYPE_LABELS: Record<EquipmentType, string> = {
  refrigerator: "Refrigerator",
  freezer: "Freezer",
  icm: "ICM (Icelined)",
  cold_box: "Cold Box",
  vaccine_carrier: "Vaccine Carrier",
  generator: "Generator",
  temperature_logger: "Temperature Logger",
  other: "Other",
};

function conditionIcon(c: Condition) {
  if (c === "functional") return <CheckCircle2 className="h-3 w-3" />;
  if (c === "needs_repair") return <Wrench className="h-3 w-3" />;
  return <AlertTriangle className="h-3 w-3" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ColdChainTab({ facilityId }: { facilityId: number | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ColdChainItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formTab, setFormTab] = useState<"basic" | "specs" | "lifecycle" | "maintenance">("basic");
  const [saving, setSaving] = useState(false);

  // ─── Query ──────────────────────────────────────────────────────────────
  const { data: items = [], isLoading, refetch } = useQuery<ColdChainItem[]>({
    queryKey: ["/api/facilities", facilityId, "cold-chain"],
    queryFn: async () => {
      const res = await fetch(`/api/facilities/${facilityId}/cold-chain`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load cold chain equipment");
      return res.json();
    },
    enabled: !!facilityId,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "cold-chain"] });
  }, [qc, facilityId]);

  const handleOpen = (item?: ColdChainItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        equipmentType: item.equipmentType,
        brand: item.brand || "",
        model: item.model || "",
        serialNumber: item.serialNumber || "",
        catalogNumber: item.catalogNumber || "",
        capacityLiters: item.capacityLiters || "",
        netStorageCapacityLiters: item.netStorageCapacityLiters || "",
        temperatureMin: item.temperatureMin || "",
        temperatureMax: item.temperatureMax || "",
        powerSource: item.powerSource || "",
        energyConsumptionKwhDay: item.energyConsumptionKwhDay || "",
        manufactureYear: item.manufactureYear?.toString() || "",
        installationDate: item.installationDate || "",
        purchaseCost: item.purchaseCost || "",
        purchaseCurrency: item.purchaseCurrency || "USD",
        warrantyExpiry: item.warrantyExpiry || "",
        supplier: item.supplier || "",
        donorFunded: item.donorFunded,
        fundingSource: item.fundingSource || "",
        condition: item.condition,
        lastServiceDate: item.lastServiceDate || "",
        nextServiceDue: item.nextServiceDue || "",
        lastTemperatureCheck: item.lastTemperatureCheck || "",
        maintenanceNotes: item.maintenanceNotes || "",
        isActive: item.isActive,
        notes: item.notes || "",
        externalId: item.externalId || "",
      });
    } else {
      setEditingItem(null);
      setForm(EMPTY_FORM);
    }
    setFormTab("basic");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!facilityId) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        ...form,
        capacityLiters: form.capacityLiters ? parseFloat(form.capacityLiters) : null,
        netStorageCapacityLiters: form.netStorageCapacityLiters ? parseFloat(form.netStorageCapacityLiters) : null,
        temperatureMin: form.temperatureMin ? parseFloat(form.temperatureMin) : null,
        temperatureMax: form.temperatureMax ? parseFloat(form.temperatureMax) : null,
        energyConsumptionKwhDay: form.energyConsumptionKwhDay ? parseFloat(form.energyConsumptionKwhDay) : null,
        manufactureYear: form.manufactureYear ? parseInt(form.manufactureYear) : null,
        purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
        powerSource: form.powerSource || null,
      };

      const url = editingItem
        ? `/api/facilities/${facilityId}/cold-chain/${editingItem.id}`
        : `/api/facilities/${facilityId}/cold-chain`;
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }
      toast({ title: editingItem ? "Equipment updated" : "Equipment added", description: `${form.brand || ""} ${form.model || ""} ${TYPE_LABELS[form.equipmentType]}`.trim() });
      setDialogOpen(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ColdChainItem) => {
    if (!confirm(`Remove ${item.brand || ""} ${item.model || ""} from inventory?`)) return;
    try {
      const res = await fetch(`/api/facilities/${facilityId}/cold-chain/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Equipment removed from inventory" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    const res = await fetch(`/api/facilities/${facilityId}/cold-chain/export?format=csv`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cold-chain-facility-${facilityId}.csv`;
    a.click();
  };

  const handleExportIGA = async () => {
    const res = await fetch(`/api/facilities/${facilityId}/cold-chain/export?format=json`, { credentials: "include" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cold-chain-iga-facility-${facilityId}.json`;
    a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !facilityId) return;
    try {
      const text = await file.text();
      // Simple CSV parse — expects header row matching equipment fields
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const items = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || null; });
        return obj;
      });
      const res = await fetch(`/api/facilities/${facilityId}/cold-chain/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      toast({ title: `Imported ${data.imported} items`, description: data.failed > 0 ? `${data.failed} rows failed` : undefined });
      invalidate();
    } catch (e: any) {
      toast({ title: "Import error", description: e.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  // ─── Summaries ──────────────────────────────────────────────────────────
  const byCondition = items.reduce((acc, it) => {
    acc[it.condition] = (acc[it.condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ─── Bulk Action State & Logic ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const runBulkAction = async (
    actionName: string,
    actionFn: (item: ColdChainItem) => Promise<void>
  ) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const total = selectedIds.length;
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i += batchSize) {
      const batch = selectedItems.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          try {
            await actionFn(item);
            successCount++;
          } catch (err) {
            failCount++;
            console.error(`Failed bulk action ${actionName} on CCE ${item.id}:`, err);
          }
        })
      );
    }

    setBulkBusy(false);
    setSelectedIds([]);
    invalidate();

    toast({
      title: `${actionName} complete`,
      description: `${successCount} items successfully processed.${failCount ? ` ${failCount} failed.` : ""}`,
      variant: failCount > 0 ? "destructive" : "default"
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected cold chain items? This cannot be undone.`)) {
      void runBulkAction(
        "Bulk Delete",
        async (item) => {
          await fetch(`/api/facilities/${facilityId}/cold-chain/${item.id}`, {
            method: "DELETE",
            credentials: "include",
          });
        }
      );
    }
  };

  const handleBulkUpdateCondition = (condition: Condition) => {
    void runBulkAction(
      "Bulk Update Condition",
      async (item) => {
        await fetch(`/api/facilities/${facilityId}/cold-chain/${item.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ condition }),
        });
      }
    );
  };

  const handleBulkUpdateActive = (isActive: boolean) => {
    void runBulkAction(
      `Bulk Set ${isActive ? 'Active' : 'Inactive'}`,
      async (item) => {
        await fetch(`/api/facilities/${facilityId}/cold-chain/${item.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        });
      }
    );
  };

  // ─── Column Visibility State ──────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    brand: true,
    equipmentType: true,
    condition: true,
    serialNumber: true,
    capacityLiters: true,
    powerSource: true,
    lastServiceDate: false,
    nextServiceDue: true,
    isActive: true,
    actions: true,
  });

  const COLUMN_LABELS: Record<string, string> = {
    brand: "Brand/Model",
    equipmentType: "Equipment Type",
    condition: "Condition",
    serialNumber: "Serial Number",
    capacityLiters: "Capacity (L)",
    powerSource: "Power Source",
    lastServiceDate: "Last Service",
    nextServiceDue: "Next Service Due",
    isActive: "Status",
    actions: "Actions",
  };

  const columns = useMemo(() => {
    const cols = [
      {
        key: "brand",
        header: "Brand/Model",
        sortable: true,
        render: (item: ColdChainItem) => (
          <span className="font-medium text-foreground">
            {item.brand && <span>{item.brand} </span>}
            {item.model && <span className="text-muted-foreground">{item.model}</span>}
            {!item.brand && !item.model && <span className="text-muted-foreground italic">Unnamed</span>}
          </span>
        ),
      },
      {
        key: "equipmentType",
        header: "Type",
        sortable: true,
        render: (item: ColdChainItem) => TYPE_LABELS[item.equipmentType] || item.equipmentType,
      },
      {
        key: "condition",
        header: "Condition",
        sortable: true,
        render: (item: ColdChainItem) => (
          <Badge className={`text-[10px] px-1.5 py-0 border flex items-center gap-0.5 w-fit ${CONDITION_STYLE[item.condition]}`}>
            {conditionIcon(item.condition)} {CONDITION_LABELS[item.condition]}
          </Badge>
        ),
      },
      {
        key: "serialNumber",
        header: "Serial Number",
        sortable: true,
        render: (item: ColdChainItem) => item.serialNumber || <span className="text-muted-foreground">—</span>,
      },
      {
        key: "capacityLiters",
        header: "Capacity",
        sortable: true,
        render: (item: ColdChainItem) => item.capacityLiters ? `${item.capacityLiters}L` : <span className="text-muted-foreground">—</span>,
      },
      {
        key: "powerSource",
        header: "Power",
        sortable: true,
        render: (item: ColdChainItem) => item.powerSource || <span className="text-muted-foreground">—</span>,
      },
      {
        key: "lastServiceDate",
        header: "Last Service",
        sortable: true,
        render: (item: ColdChainItem) => item.lastServiceDate || <span className="text-muted-foreground">—</span>,
      },
      {
        key: "nextServiceDue",
        header: "Next Service Due",
        sortable: true,
        render: (item: ColdChainItem) => item.nextServiceDue ? (
          <span className="text-amber-600 font-medium">{item.nextServiceDue}</span>
        ) : <span className="text-muted-foreground">—</span>,
      },
      {
        key: "isActive",
        header: "Status",
        sortable: true,
        render: (item: ColdChainItem) => (
          <Badge variant={item.isActive ? "default" : "outline"} className="text-[10px]">
            {item.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        render: (item: ColdChainItem) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpen(item)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ];
    return cols.filter((c) => visibleColumns[c.key]);
  }, [visibleColumns, items]);

  const bulkActionsNode = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Select onValueChange={(val) => handleBulkUpdateCondition(val as Condition)}>
        <SelectTrigger className="h-8 w-44 text-xs bg-background">
          <SelectValue placeholder="Update Condition" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={() => handleBulkUpdateActive(true)}
        disabled={bulkBusy}
      >
        Make Active
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={() => handleBulkUpdateActive(false)}
        disabled={bulkBusy}
      >
        Make Inactive
      </Button>

      <Button
        variant="destructive"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={handleBulkDelete}
        disabled={bulkBusy}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Selected
      </Button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!facilityId) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        <Snowflake className="h-8 w-8 mx-auto mb-2 text-cyan-400/40" />
        Save the facility first to manage cold chain equipment.
      </div>
    );
  }

  return (
    <div className="p-4 h-[65vh] flex flex-col gap-3 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-cyan-500" />
          <span className="font-semibold text-sm">Cold Chain Equipment</span>
          <Badge variant="secondary" className="text-[10px]">{items.length} items</Badge>
          {byCondition["needs_repair"] > 0 && (
            <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 border">
              <Wrench className="h-2.5 w-2.5 mr-0.5" />{byCondition["needs_repair"]} need repair
            </Badge>
          )}
          {byCondition["non_functional"] > 0 && (
            <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 border">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{byCondition["non_functional"]} non-functional
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1 h-8 text-xs">
            <RefreshCw className="h-3 w-3" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1 h-8 text-xs border-dashed">
            <Download className="h-3 w-3" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportIGA} className="gap-1 h-8 text-xs border-dashed border-emerald-500/50 text-emerald-600">
            <Download className="h-3 w-3" />IGA Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}
            className="gap-1 h-8 text-xs border-dashed border-blue-500/50 text-blue-600">
            <Upload className="h-3 w-3" />Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                <Settings2 className="h-3.5 w-3.5" />Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-1">
                {Object.entries(COLUMN_LABELS).map(([col, label]) => (
                  <label
                    key={col}
                    className="flex items-center gap-2 px-2 py-1 text-xs rounded-md hover:bg-muted/50 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col]: e.target.checked,
                        }))
                      }
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => handleOpen()} className="gap-1 h-8 text-xs">
            <Plus className="h-3 w-3" />Add Equipment
          </Button>
        </div>
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : (
          <DataTable
            data={items}
            columns={columns}
            searchable={true}
            searchKeys={["brand", "model", "serialNumber"]}
            pageSize={10}
            emptyMessage="No cold chain equipment recorded yet."
            searchPlaceholder="Search cold chain equipment..."
            enableSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={bulkActionsNode}
          />
        )}
      </div>

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Cold Chain Equipment" : "Add Cold Chain Equipment"}</DialogTitle>
          </DialogHeader>

          {/* Mini tab bar */}
          <div className="flex gap-1 border-b pb-2 mb-3 text-xs flex-wrap">
            {(["basic", "specs", "lifecycle", "maintenance"] as const).map((t) => (
              <button key={t} onClick={() => setFormTab(t)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${formTab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              >
                {t === "basic" ? "Basic Info" : t === "specs" ? "Specs" : t === "lifecycle" ? "Lifecycle" : "Maintenance"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {formTab === "basic" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Equipment Type *</Label>
                    <Select value={form.equipmentType} onValueChange={(v) => setForm((f) => ({ ...f, equipmentType: v as EquipmentType }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Condition *</Label>
                    <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v as Condition }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONDITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Brand</Label>
                    <Input className="h-9 text-sm" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="e.g. Vestfrost" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input className="h-9 text-sm" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. MK 244" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Serial Number</Label>
                    <Input className="h-9 text-sm" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">WHO Catalog Number (PIS)</Label>
                    <Input className="h-9 text-sm" value={form.catalogNumber} onChange={(e) => setForm((f) => ({ ...f, catalogNumber: e.target.value }))} placeholder="e.g. E001/032" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">External ID (IGA round-trip)</Label>
                  <Input className="h-9 text-sm" value={form.externalId} onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))} placeholder="IGA / DVDMT system ID" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                  <Label className="text-xs">Active (visible in inventory)</Label>
                </div>
              </>
            )}

            {formTab === "specs" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Total Capacity (Litres)</Label>
                    <Input type="number" className="h-9 text-sm" value={form.capacityLiters} onChange={(e) => setForm((f) => ({ ...f, capacityLiters: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Net Storage Capacity (L)</Label>
                    <Input type="number" className="h-9 text-sm" value={form.netStorageCapacityLiters} onChange={(e) => setForm((f) => ({ ...f, netStorageCapacityLiters: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Temp (°C)</Label>
                    <Input type="number" className="h-9 text-sm" value={form.temperatureMin} onChange={(e) => setForm((f) => ({ ...f, temperatureMin: e.target.value }))} placeholder="-20" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Temp (°C)</Label>
                    <Input type="number" className="h-9 text-sm" value={form.temperatureMax} onChange={(e) => setForm((f) => ({ ...f, temperatureMax: e.target.value }))} placeholder="8" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Power Source</Label>
                    <Select value={form.powerSource || "none"} onValueChange={(v) => setForm((f) => ({ ...f, powerSource: v === "none" ? "" : v as PowerSource }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {["solar", "electric", "gas", "kerosene", "battery", "solar_dc", "none"].map((v) => (
                          <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Energy Consumption (kWh/day)</Label>
                    <Input type="number" className="h-9 text-sm" value={form.energyConsumptionKwhDay} onChange={(e) => setForm((f) => ({ ...f, energyConsumptionKwhDay: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {formTab === "lifecycle" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manufacture Year</Label>
                    <Input type="number" className="h-9 text-sm" value={form.manufactureYear} onChange={(e) => setForm((f) => ({ ...f, manufactureYear: e.target.value }))} placeholder="2018" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Installation Date</Label>
                    <Input type="date" className="h-9 text-sm" value={form.installationDate} onChange={(e) => setForm((f) => ({ ...f, installationDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Purchase Cost</Label>
                    <Input type="number" className="h-9 text-sm" value={form.purchaseCost} onChange={(e) => setForm((f) => ({ ...f, purchaseCost: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Input className="h-9 text-sm" value={form.purchaseCurrency} onChange={(e) => setForm((f) => ({ ...f, purchaseCurrency: e.target.value }))} placeholder="USD" maxLength={5} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier</Label>
                  <Input className="h-9 text-sm" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Warranty Expiry</Label>
                  <Input type="date" className="h-9 text-sm" value={form.warrantyExpiry} onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.donorFunded} onCheckedChange={(v) => setForm((f) => ({ ...f, donorFunded: v }))} />
                  <Label className="text-xs">Donor Funded</Label>
                </div>
                {form.donorFunded && (
                  <div className="space-y-1">
                    <Label className="text-xs">Funding Source</Label>
                    <Input className="h-9 text-sm" value={form.fundingSource} onChange={(e) => setForm((f) => ({ ...f, fundingSource: e.target.value }))} placeholder="e.g. GAVI, UNICEF" />
                  </div>
                )}
              </>
            )}

            {formTab === "maintenance" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Last Service Date</Label>
                    <Input type="date" className="h-9 text-sm" value={form.lastServiceDate} onChange={(e) => setForm((f) => ({ ...f, lastServiceDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Next Service Due</Label>
                    <Input type="date" className="h-9 text-sm" value={form.nextServiceDue} onChange={(e) => setForm((f) => ({ ...f, nextServiceDue: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Temperature Check</Label>
                  <Input type="date" className="h-9 text-sm" value={form.lastTemperatureCheck} onChange={(e) => setForm((f) => ({ ...f, lastTemperatureCheck: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Maintenance Notes</Label>
                  <Textarea rows={3} className="text-sm" value={form.maintenanceNotes} onChange={(e) => setForm((f) => ({ ...f, maintenanceNotes: e.target.value }))} placeholder="Describe known issues, repairs done…" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">General Notes</Label>
                  <Textarea rows={2} className="text-sm" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editingItem ? "Save Changes" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
