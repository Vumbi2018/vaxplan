// Original imports (commented out to preserve working code):
// import { useState } from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/DataTable";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { buildGeoMaps, withGeoColumns } from "@/lib/geoHierarchy";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import { offlineDb, enqueueOutbox } from "../lib/offlineDb";
// Original icons (commented out to preserve working code):
// import {
//   Plus,
//   Wallet,
//   TrendingUp,
//   PiggyBank,
//   FileText,
//   Download,
// } from "lucide-react";
import {
  Plus,
  Wallet,
  TrendingUp,
  PiggyBank,
  FileText,
  Download,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  insertBudgetItemSchema,
  type BudgetItem,
  type InsertBudgetItem,
  type Facility,
  type SessionPlan,
  type Province,
  type District,
} from "@shared/schema";
import { MicroplanStepper } from "@/components/MicroplanStepper";
import { z } from "zod";

const budgetFormSchema = z
  .object({
    facilityId: z.coerce.number(),
    sessionId: z.coerce.number().optional().nullable(),
    category: z.string().min(1, "Category is required"),
    description: z.string().min(2, "Description is required"),
    unitCost: z.string().min(1, "Unit cost is required"),
    quantity: z.coerce.number().min(1),
    totalCost: z.string().optional(),
    quarter: z.coerce.number(),
    year: z.coerce.number(),
    approvalStatus: z.string().optional(),
    fundingSource: z.enum(["government", "gavi", "who", "unicef", "other", "unspecified"]),
    fundingSourceOther: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.fundingSource === "other" && !(data.fundingSourceOther ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fundingSourceOther"],
        message: "Specify the funding source when 'Other' is selected.",
      });
    }
  });

const budgetCategories = [
  "Personnel",
  "Transport",
  "Supplies",
  "Per Diem",
  "Cold Chain",
  "Training",
  "Communication",
  "Other",
];

const fundingSourceOptions: Array<{ value: string; label: string; color: string }> = [
  { value: "government", label: "Government", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "gavi", label: "Gavi", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  { value: "who", label: "WHO", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  { value: "unicef", label: "UNICEF", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { value: "other", label: "Other", color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
];

export default function BudgetPlanning() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFunder, setBulkFunder] = useState<string>("government");
  const [bulkOther, setBulkOther] = useState<string>("");
  const [bulkScope, setBulkScope] = useState<"filtered" | "all">("filtered");
  const [selectedQuarter, setSelectedQuarter] = useState(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );
  const [geoProvinceId, setGeoProvinceId] = useState<number | null>(null);
  const [geoDistrictId, setGeoDistrictId] = useState<number | null>(null);
  const [geoFacilityId, setGeoFacilityId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const f = new URLSearchParams(window.location.search).get("facility");
    return f && !Number.isNaN(Number(f)) ? Number(f) : null;
  });

  /*
  // Original queries and mutation (commented out to preserve working code while adding offline capabilities):
  const { data: budgetItems, isLoading: loadingBudget } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget-items"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBudgetItem) => {
      return apiRequest("POST", "/api/budget-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Budget item created",
        description: "The budget item has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  */

  // Updated queries and mutations with Dexie.js offline fallbacks:
  const { data: budgetItems, isLoading: loadingBudget } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget-items"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.budgetItems.toArray() as any[];
      }
      const res = await fetch("/api/budget-items");
      if (!res.ok) throw new Error("Failed to fetch budget items");
      return res.json();
    }
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.facilities.toArray() as any[];
      }
      const res = await fetch("/api/facilities");
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    }
  });

  const { data: sessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.sessionPlans.toArray() as any[];
      }
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch session plans");
      return res.json();
    }
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
    queryFn: async () => {
      const res = await fetch("/api/provinces", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch provinces");
      return res.json();
    },
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
    queryFn: async () => {
      const res = await fetch("/api/districts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
  });

  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages: [], facilities }),
    [provinces, districts, facilities],
  );

  const form = useForm<InsertBudgetItem>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "Transport",
      quarter: selectedQuarter,
      year: new Date().getFullYear(),
      quantity: 1,
      approvalStatus: "draft",
      fundingSource: "government",
    },
  });

  const formFundingSource = form.watch("fundingSource");

  const formFacilityId = form.watch("facilityId");
  const formQuarter = form.watch("quarter");
  const formYear = form.watch("year");

  const filteredSessions = useMemo(() => {
    if (!sessions || !formFacilityId) return [];
    return sessions.filter(
      (s) =>
        s.facilityId === Number(formFacilityId) &&
        s.quarter === Number(formQuarter) &&
        s.year === Number(formYear)
    );
  }, [sessions, formFacilityId, formQuarter, formYear]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertBudgetItem) => {
      if (!navigator.onLine) {
        const localId = Math.floor(Math.random() * -1000000);
        const totalCost = (parseFloat(data.unitCost as string) * data.quantity).toString();
        const localItem = {
          ...data,
          id: localId,
          totalCost,
          _localOnly: true,
          _syncedAt: Date.now(),
        } as any;

        await offlineDb.budgetItems.add(localItem);

        // Queue in outbox
        await enqueueOutbox({
          tenantId: data.tenantId || "default",
          entityType: "budget_item",
          method: "POST",
          url: "/api/budget-items",
          body: JSON.stringify({ ...data, totalCost }),
          localId: String(localId),
        });

        return localItem;
      }
      return apiRequest("POST", "/api/budget-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: navigator.onLine ? "Budget item created" : "Budget item saved locally",
        description: navigator.onLine
          ? "The budget item has been added successfully."
          : "Saved locally. It will sync automatically when you are back online.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBudgetItem> }) => {
      return apiRequest("PATCH", `/api/budget-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Budget item updated",
        description: "Funding source and other fields saved.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkClassifyMutation = useMutation({
    mutationFn: async (payload: { fundingSource: string; fundingSourceOther: string | null; ids?: number[] }) => {
      return apiRequest("POST", "/api/budget-items/bulk-classify", payload);
    },
    onSuccess: (res: any) => {
      const count = res?.updated ?? 0;
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      setBulkOpen(false);
      setBulkOther("");
      toast({
        title: "Funding source applied",
        description: `${count} budget line${count === 1 ? "" : "s"} reclassified.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!navigator.onLine) {
        if (itemId < 0) {
          await offlineDb.budgetItems.delete(itemId);
        } else {
          await offlineDb.budgetItems.delete(itemId);
          await enqueueOutbox({
            tenantId: user?.tenantId || "default",
            entityType: "budget_item",
            method: "DELETE",
            url: `/api/budget-items/${itemId}`,
            localId: String(itemId),
          });
        }
        return itemId;
      }
      return apiRequest("DELETE", `/api/budget-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-items"] });
      toast({
        title: navigator.onLine ? "Budget item deleted" : "Budget item deleted locally",
        description: navigator.onLine
          ? "The budget item has been successfully removed."
          : "Removed locally. This deletion will sync when you are back online.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const quarterItemsRaw = budgetItems?.filter(
    (b) => b.quarter === selectedQuarter && b.year === new Date().getFullYear()
  ) || [];

  const quarterItems = useMemo(() => {
    const enriched = withGeoColumns(quarterItemsRaw as any[], geoMaps);
    return enriched.filter((item) => {
      if (geoProvinceId !== null && item._geoProvinceId !== geoProvinceId) return false;
      if (geoDistrictId !== null && item._geoDistrictId !== geoDistrictId) return false;
      if (geoFacilityId !== null && Number((item as any).facilityId) !== geoFacilityId) return false;
      return true;
    });
  }, [quarterItemsRaw, geoMaps, geoProvinceId, geoDistrictId, geoFacilityId]);

  const totalBudget = quarterItems.reduce(
    (sum, item) => sum + parseFloat(item.totalCost || "0"),
    0
  );

  const approvedBudget = quarterItems
    .filter((b) => b.approvalStatus === "approved")
    .reduce((sum, item) => sum + parseFloat(item.totalCost || "0"), 0);

  const pendingBudget = quarterItems
    .filter((b) => b.approvalStatus === "pending")
    .reduce((sum, item) => sum + parseFloat(item.totalCost || "0"), 0);

  const categoryTotals = budgetCategories.map((cat) => ({
    category: cat,
    total: quarterItems
      .filter((b) => b.category === cat)
      .reduce((sum, item) => sum + parseFloat(item.totalCost || "0"), 0),
  })).filter((c) => c.total > 0);

  const fundingTotals = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const item of quarterItems) {
      const fs = ((item as any).fundingSource as string) || "unspecified";
      groups[fs] = (groups[fs] || 0) + parseFloat(item.totalCost || "0");
    }
    return groups;
  }, [quarterItems]);

  // Count in the currently visible slice (drives the "filtered" bulk scope).
  const unspecifiedCount = useMemo(
    () =>
      quarterItems.filter(
        (i) => !(i as any).fundingSource || (i as any).fundingSource === "unspecified",
      ).length,
    [quarterItems],
  );

  // Tenant-wide count — drives banner visibility so legacy rows in other
  // quarters/years/geos still surface for cleanup even when filters hide them.
  const tenantUnspecifiedCount = useMemo(
    () =>
      (budgetItems ?? []).filter(
        (i: any) => !i.fundingSource || i.fundingSource === "unspecified",
      ).length,
    [budgetItems],
  );

  const fundingGrandTotal = Object.values(fundingTotals).reduce((s, n) => s + n, 0);

  const fundingSourceLabel = (fs: string, other?: string | null) => {
    if (fs === "other" && other) return other;
    const opt = fundingSourceOptions.find((o) => o.value === fs);
    return opt?.label || (fs === "unspecified" ? "Unspecified" : fs);
  };

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExportCsv = () => {
    const year = new Date().getFullYear();
    const lines: string[] = [];
    lines.push(
      `Gavi HSS Funding Report — Q${selectedQuarter} ${year}`,
    );

    const geoBits: string[] = [];
    if (geoProvinceId !== null) {
      const p = provinces?.find((x) => x.id === geoProvinceId);
      if (p) geoBits.push(`Province: ${p.name}`);
    }
    if (geoDistrictId !== null) {
      const d = districts?.find((x) => x.id === geoDistrictId);
      if (d) geoBits.push(`District: ${d.name}`);
    }
    if (geoFacilityId !== null) {
      const f = facilities?.find((x) => x.id === geoFacilityId);
      if (f) geoBits.push(`Facility: ${f.name}`);
    }
    lines.push(geoBits.length ? `Filter: ${geoBits.join(" / ")}` : "Filter: All geographies");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    // Section 1: Summary by funding source
    lines.push("Summary by Funding Source");
    lines.push(["Funding Source", "Total (K)", "% of Total"].map(escapeCsv).join(","));
    const sourceOrder = ["government", "gavi", "who", "unicef", "other"];
    for (const src of sourceOrder) {
      const amount = fundingTotals[src] || 0;
      if (amount <= 0) continue;
      const pct = fundingGrandTotal > 0 ? ((amount / fundingGrandTotal) * 100).toFixed(1) : "0.0";
      lines.push([fundingSourceLabel(src), amount.toFixed(2), `${pct}%`].map(escapeCsv).join(","));
    }
    lines.push(["Total (classified)", (fundingGrandTotal - (fundingTotals["unspecified"] || 0)).toFixed(2), ""].map(escapeCsv).join(","));
    lines.push("");

    // Section 2: Breakdown by funding source × category
    lines.push("Breakdown by Funding Source and Category");
    lines.push(["Funding Source", "Category", "Total (K)"].map(escapeCsv).join(","));
    for (const src of sourceOrder) {
      const rows = quarterItems.filter(
        (i: any) => (i.fundingSource || "unspecified") === src,
      );
      if (rows.length === 0) continue;
      const byCat: Record<string, number> = {};
      for (const r of rows) {
        const cat = (r as any).category || "Uncategorized";
        byCat[cat] = (byCat[cat] || 0) + parseFloat((r as any).totalCost || "0");
      }
      Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, total]) => {
          lines.push([fundingSourceLabel(src), cat, total.toFixed(2)].map(escapeCsv).join(","));
        });
    }
    lines.push("");

    // Section 3: Line item detail (classified)
    lines.push("Line Item Detail (Classified)");
    const detailHeader = [
      "Province",
      "District",
      "Facility",
      "Funding Source",
      "Category",
      "Description",
      "Quantity",
      "Unit Cost (K)",
      "Total (K)",
      "Approval Status",
    ];
    lines.push(detailHeader.map(escapeCsv).join(","));
    const classified = quarterItems.filter(
      (i: any) => i.fundingSource && i.fundingSource !== "unspecified",
    );
    for (const item of classified) {
      const facName = facilities?.find((f) => f.id === (item as any).facilityId)?.name || "";
      lines.push(
        [
          (item as any)._geoProvinceName || "",
          (item as any)._geoDistrictName || "",
          facName,
          fundingSourceLabel((item as any).fundingSource, (item as any).fundingSourceOther),
          (item as any).category,
          (item as any).description,
          (item as any).quantity,
          parseFloat((item as any).unitCost || "0").toFixed(2),
          parseFloat((item as any).totalCost || "0").toFixed(2),
          (item as any).approvalStatus || "draft",
        ]
          .map(escapeCsv)
          .join(","),
      );
    }
    lines.push("");

    // Section 4: Unspecified gap (called out so the report doesn't hide it)
    const unspecifiedItems = quarterItems.filter(
      (i: any) => !i.fundingSource || i.fundingSource === "unspecified",
    );
    const unspecifiedTotal = unspecifiedItems.reduce(
      (s, i: any) => s + parseFloat(i.totalCost || "0"),
      0,
    );
    lines.push(
      `Unspecified / Needs Classification (${unspecifiedItems.length} line${unspecifiedItems.length === 1 ? "" : "s"}, K${unspecifiedTotal.toFixed(2)})`,
    );
    if (unspecifiedItems.length === 0) {
      lines.push("None — every line in scope has a funding source.");
    } else {
      lines.push(detailHeader.map(escapeCsv).join(","));
      for (const item of unspecifiedItems) {
        const facName = facilities?.find((f) => f.id === (item as any).facilityId)?.name || "";
        lines.push(
          [
            (item as any)._geoProvinceName || "",
            (item as any)._geoDistrictName || "",
            facName,
            "Unspecified",
            (item as any).category,
            (item as any).description,
            (item as any).quantity,
            parseFloat((item as any).unitCost || "0").toFixed(2),
            parseFloat((item as any).totalCost || "0").toFixed(2),
            (item as any).approvalStatus || "draft",
          ]
            .map(escapeCsv)
            .join(","),
        );
      }
    }

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const geoSuffix =
      geoFacilityId !== null
        ? `facility-${geoFacilityId}`
        : geoDistrictId !== null
          ? `district-${geoDistrictId}`
          : geoProvinceId !== null
            ? `province-${geoProvinceId}`
            : "all";
    a.href = url;
    a.download = `gavi-hss-funding-Q${selectedQuarter}-${year}-${geoSuffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export ready",
      description: `Q${selectedQuarter} ${year} funding report downloaded.`,
    });
  };

  const columns = [
    {
      key: "_geoProvinceName",
      header: "Province",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoProvinceName || "—"}</span>
      ),
    },
    {
      key: "_geoDistrictName",
      header: "District",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoDistrictName || "—"}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      render: (item: BudgetItem) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.description}</p>
            <p className="text-xs text-muted-foreground">
              Q{item.quarter} {item.year}
            </p>
            {item.sessionId && (
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 uppercase tracking-wider">
                Linked: {(sessions ?? []).find(s => s.id === item.sessionId)?.name || `Session #${item.sessionId}`}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (item: BudgetItem) => (
        <Badge variant="outline">{item.category}</Badge>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      sortable: true,
      render: (item: BudgetItem) => item.quantity,
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      sortable: true,
      render: (item: BudgetItem) => (
        <span className="font-mono text-sm">
          K{parseFloat(item.unitCost || "0").toLocaleString()}
        </span>
      ),
    },
    {
      key: "totalCost",
      header: "Total",
      sortable: true,
      render: (item: BudgetItem) => (
        <span className="font-mono text-sm font-medium">
          K{parseFloat(item.totalCost || "0").toLocaleString()}
        </span>
      ),
    },
    {
      key: "fundingSource",
      header: "Funding",
      sortable: true,
      render: (item: BudgetItem) => {
        const fs = (item as any).fundingSource || "unspecified";
        if (fs === "unspecified") {
          return (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400">
              Needs classification
            </Badge>
          );
        }
        const opt = fundingSourceOptions.find((o) => o.value === fs);
        const label =
          fs === "other" && (item as any).fundingSourceOther
            ? (item as any).fundingSourceOther
            : opt?.label || fs;
        return (
          <Badge variant="outline" className={`text-[10px] ${opt?.color || ""}`}>
            {label}
          </Badge>
        );
      },
    },
    {
      key: "approvalStatus",
      header: "Status",
      render: (item: BudgetItem) => (
        <ApprovalBadge status={item.approvalStatus || "draft"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: BudgetItem) => {
        const linkedSession = item.sessionId
          ? (sessions ?? []).find((s) => s.id === item.sessionId)
          : null;
        const isLocked =
          linkedSession?.approvalStatus === "approved" ||
          linkedSession?.approvalStatus === "locked";

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(item)}
              disabled={isLocked}
              className="h-8 px-2 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
              data-testid={`button-edit-budget-${item.id}`}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Are you sure you want to delete this budget item?")) {
                  deleteMutation.mutate(item.id);
                }
              }}
              disabled={isLocked}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const onSubmit = (data: InsertBudgetItem) => {
    const totalCost = (parseFloat(data.unitCost as string) * data.quantity).toString();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...data, totalCost } });
    } else {
      createMutation.mutate({ ...data, totalCost });
    }
  };

  const openEditDialog = (item: BudgetItem) => {
    setEditingItem(item);
    form.reset({
      facilityId: item.facilityId,
      sessionId: item.sessionId ?? undefined,
      category: item.category,
      description: item.description,
      unitCost: item.unitCost,
      quantity: item.quantity,
      quarter: item.quarter,
      year: item.year,
      approvalStatus: item.approvalStatus || "draft",
      fundingSource: ((item as any).fundingSource as any) || "unspecified",
      fundingSourceOther: (item as any).fundingSourceOther || "",
    } as any);
    setDialogOpen(true);
  };

  if (loadingBudget) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <MicroplanStepper currentStep={9} facilityId={geoFacilityId} />
      {tenantUnspecifiedCount > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
          data-testid="banner-needs-classification"
        >
          <div className="flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {tenantUnspecifiedCount} budget line{tenantUnspecifiedCount === 1 ? "" : "s"} need a funding source
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
              Legacy rows default to "Unspecified" and are excluded from the Gavi HSS / by-funder rollup.
              {unspecifiedCount < tenantUnspecifiedCount
                ? ` ${unspecifiedCount} are visible under the current filters; the rest sit in other quarters or facilities.`
                : ""} Tag them in bulk to clear the backlog.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 bg-white/60 dark:bg-transparent"
            onClick={() => {
              setBulkScope(unspecifiedCount > 0 ? "filtered" : "all");
              setBulkFunder("government");
              setBulkOther("");
              setBulkOpen(true);
            }}
            data-testid="button-open-bulk-classify"
          >
            Bulk classify
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Budget Planning</h1>
          <p className="text-muted-foreground text-sm">
            Plan and track immunization budget allocations
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedQuarter.toString()}
            onValueChange={(v) => setSelectedQuarter(parseInt(v))}
          >
            <SelectTrigger className="w-24" data-testid="select-quarter-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            data-testid="button-export-budget"
            onClick={handleExportCsv}
            disabled={quarterItems.length === 0}
            title={
              quarterItems.length === 0
                ? "No budget items in the current quarter / filter to export"
                : "Download Gavi HSS funding report (CSV)"
            }
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingItem(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-budget-item">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Budget Item" : "Add Budget Item"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility *</FormLabel>
                        <FacilityCascadePicker
                          value={field.value ?? null}
                          onChange={(id) => field.onChange(id ?? undefined)}
                          required
                          showLabels={false}
                          testIdPrefix="budget-facility"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linked Microplan Session (Optional)</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v && v !== "__none__" ? parseInt(v) : undefined)}
                          value={field.value?.toString() ?? "__none__"}
                          disabled={!formFacilityId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-budget-session">
                              <SelectValue placeholder={formFacilityId ? (filteredSessions.length > 0 ? "Select linked session" : "No active session plans this quarter") : "Select a facility first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None / Facility Level</SelectItem>
                            {filteredSessions.map((s) => {
                              const isSessLocked = s.approvalStatus === "approved" || s.approvalStatus === "locked";
                              return (
                                <SelectItem
                                  key={s.id}
                                  value={s.id.toString()}
                                  disabled={isSessLocked}
                                >
                                  {s.name} ({s.sessionType}){isSessLocked ? " 🔒 (Approved)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {budgetCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Fuel for outreach sessions"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="100.00"
                              {...field}
                              data-testid="input-unit-cost"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quarter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quarter</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-budget-quarter">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Q1</SelectItem>
                              <SelectItem value="2">Q2</SelectItem>
                              <SelectItem value="3">Q3</SelectItem>
                              <SelectItem value="4">Q4</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-budget-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="fundingSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Source *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={(field.value as string) || "government"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-funding-source">
                              <SelectValue placeholder="Select funding source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fundingSourceOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {formFundingSource === "other" && (
                    <FormField
                      control={form.control}
                      name="fundingSourceOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify funding source *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={(field.value as string) || ""}
                              placeholder="e.g. Bilateral donor, NGO partner..."
                              data-testid="input-funding-source-other"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-budget"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingItem
                          ? "Save Changes"
                          : "Add Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">K{totalBudget.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  K{approvedBudget.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  K{pendingBudget.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Budget Items</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <GeoCascadeFilter
              provinceId={geoProvinceId}
              districtId={geoDistrictId}
              facilityId={geoFacilityId}
              onProvinceChange={setGeoProvinceId}
              onDistrictChange={setGeoDistrictId}
              onFacilityChange={setGeoFacilityId}
              showFacility
              provinces={provinces}
              districts={districts}
              facilities={facilities}
              testIdPrefix="budget"
            />
            <DataTable
              data={quarterItems}
              columns={columns}
              searchable
              searchKeys={["description", "category"]}
              emptyMessage="No budget items for this quarter."
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryTotals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No budget allocations yet
                  </p>
                ) : (
                  categoryTotals.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="font-mono text-sm">
                        K{cat.total.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>By Funding Source</span>
                {unspecifiedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400">
                    {unspecifiedCount} unclassified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fundingGrandTotal === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No budget allocations yet
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                    {[...fundingSourceOptions, { value: "unspecified", label: "Unspecified", color: "bg-amber-500/60" }].map((opt) => {
                      const amount = fundingTotals[opt.value] || 0;
                      if (amount <= 0) return null;
                      const pct = (amount / fundingGrandTotal) * 100;
                      const fillClass =
                        opt.value === "government" ? "bg-blue-500" :
                        opt.value === "gavi" ? "bg-purple-500" :
                        opt.value === "who" ? "bg-cyan-500" :
                        opt.value === "unicef" ? "bg-sky-500" :
                        opt.value === "other" ? "bg-slate-500" :
                        "bg-amber-500";
                      return (
                        <div
                          key={opt.value}
                          className={fillClass}
                          style={{ width: `${pct}%` }}
                          title={`${opt.label}: K${amount.toLocaleString()}`}
                        />
                      );
                    })}
                  </div>
                  {[...fundingSourceOptions, { value: "unspecified", label: "Unspecified", color: "" }].map((opt) => {
                    const amount = fundingTotals[opt.value] || 0;
                    if (amount <= 0) return null;
                    const pct = ((amount / fundingGrandTotal) * 100).toFixed(1);
                    return (
                      <div key={opt.value} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                            opt.value === "government" ? "bg-blue-500" :
                            opt.value === "gavi" ? "bg-purple-500" :
                            opt.value === "who" ? "bg-cyan-500" :
                            opt.value === "unicef" ? "bg-sky-500" :
                            opt.value === "other" ? "bg-slate-500" :
                            "bg-amber-500"
                          }`} />
                          {opt.label}
                        </span>
                        <span className="font-mono text-sm">
                          K{amount.toLocaleString()} <span className="text-muted-foreground text-xs">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk classify funding source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply one funding source to every budget line still flagged as
              "Unspecified". Lines that already have a funder are never overwritten.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Apply to</label>
              <Select value={bulkScope} onValueChange={(v) => setBulkScope(v as "filtered" | "all")}>
                <SelectTrigger data-testid="select-bulk-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtered" disabled={unspecifiedCount === 0}>
                    Currently visible rows ({unspecifiedCount})
                  </SelectItem>
                  <SelectItem value="all">
                    All unspecified rows in this tenant ({tenantUnspecifiedCount})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Funding source</label>
              <Select value={bulkFunder} onValueChange={setBulkFunder}>
                <SelectTrigger data-testid="select-bulk-funder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fundingSourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bulkFunder === "other" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Specify funder</label>
                <Input
                  value={bulkOther}
                  onChange={(e) => setBulkOther(e.target.value)}
                  placeholder="e.g. Rotary International"
                  data-testid="input-bulk-other"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const ids =
                    bulkScope === "filtered"
                      ? quarterItems
                          .filter(
                            (i: any) => !i.fundingSource || i.fundingSource === "unspecified",
                          )
                          .map((i: any) => i.id)
                      : undefined;
                  bulkClassifyMutation.mutate({
                    fundingSource: bulkFunder,
                    fundingSourceOther: bulkFunder === "other" ? bulkOther.trim() : null,
                    ids,
                  });
                }}
                disabled={
                  bulkClassifyMutation.isPending ||
                  (bulkFunder === "other" && !bulkOther.trim())
                }
                data-testid="button-confirm-bulk-classify"
              >
                {bulkClassifyMutation.isPending ? "Applying…" : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
