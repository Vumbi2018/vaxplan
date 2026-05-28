import { useState, useMemo, useEffect } from "react";
import type { Province, District, Village } from "@shared/schema";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { buildGeoMaps } from "@/lib/geoHierarchy";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FacilityCascadePicker } from "@/components/FacilityCascadePicker";
import {
  Package,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ClipboardList,
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle,
  FileText,
  User,
  ShieldAlert,
} from "lucide-react";
import {
  insertStockTransactionSchema,
  insertMonthlyReportSchema,
  type StockTransaction,
  type MonthlyReport,
  type VaccineConfig,
  type Facility,
  type Client,
  type ClientVaccination,
} from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { offlineDb, enqueueOutbox } from "@/lib/offlineDb";

const transactionFormSchema = z.object({
  facilityId: z.number({ required_error: "Pick a facility" }),
  vaccineName: z.string().min(1, "Antigen name is required"),
  transactionType: z.enum(["receipt", "issue", "loss", "adjustment"]),
  quantityDoses: z.number().min(1, "Quantity must be at least 1 dose"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  vvmStatus: z.number().min(1).max(4),
  supplierOrRecipient: z.string().min(1, "Supplier/Recipient name is required"),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export default function StockLedger() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ledger");
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [geoProvinceId, setGeoProvinceId] = useState<number | null>(null);
  const [geoDistrictId, setGeoDistrictId] = useState<number | null>(null);
  
  // Dialog Open States
  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Wizard Steps for Monthly Report
  const [wizardStep, setWizardStep] = useState(1);

  const { data: provinces = [] } = useQuery<Province[]>({ queryKey: ["/api/provinces"] });
  const { data: districts = [] } = useQuery<District[]>({ queryKey: ["/api/districts"] });

  // Load facilities for drop-down or pre-fill
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.facilities.toArray()) as unknown as Facility[];
      }
      const res = await fetch("/api/facilities");
      if (!res.ok) throw new Error("Failed to load facilities");
      return res.json();
    },
  });

  // Load vaccine configurations
  const { data: vaccineConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.vaccineConfigs.toArray()) as unknown as VaccineConfig[];
      }
      const res = await fetch("/api/vaccines/config");
      if (!res.ok) throw new Error("Failed to load configs");
      return res.json();
    },
  });

  // Pre-fill user facility context
  useEffect(() => {
    if (user?.facilityId) {
      setSelectedFacilityId(user.facilityId);
    } else if (facilities && facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [user, facilities]);

  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages: [] as Village[], facilities: facilities ?? [] }),
    [provinces, districts, facilities],
  );

  const facilityGeo = useMemo(() => {
    if (!selectedFacilityId) return { provinceName: null as string | null, districtName: null as string | null, facilityName: null as string | null };
    const fac = geoMaps.facilityMap.get(selectedFacilityId);
    if (!fac) return { provinceName: null, districtName: null, facilityName: null };
    const dist = fac.districtId ? geoMaps.districtMap.get(fac.districtId) : null;
    const prov = dist?.provinceId ? geoMaps.provinceMap.get(dist.provinceId) : null;
    return {
      provinceName: prov?.name ?? null,
      districtName: dist?.name ?? null,
      facilityName: fac.name ?? null,
    };
  }, [selectedFacilityId, geoMaps]);

  // Load Stock Ledger Transactions (all in tenant; client filters by cascade)
  const { data: allTransactions, isLoading: loadingTxns } = useQuery<StockTransaction[]>({
    queryKey: [`/api/stock/ledger`, { facilityId: null }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const localTxns = await offlineDb.stockTransactions.toArray();
        return (localTxns as unknown as StockTransaction[]).sort(
          (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
      }
      const res = await fetch(`/api/stock/ledger`);
      if (!res.ok) throw new Error("Failed to load stock ledger");
      return res.json();
    },
  });

  // Load Monthly Reports (all in tenant; client filters by cascade)
  const { data: allReports, isLoading: loadingReports } = useQuery<MonthlyReport[]>({
    queryKey: [`/api/monthly-reports`, { facilityId: null }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const localReports = await offlineDb.monthlyReports.toArray();
        return localReports as unknown as MonthlyReport[];
      }
      const res = await fetch(`/api/monthly-reports`);
      if (!res.ok) throw new Error("Failed to load monthly reports");
      return res.json();
    },
  });

  const resolveRowGeo = (facilityId: number | null | undefined) => {
    if (!facilityId) return { provinceName: null as string | null, districtName: null as string | null, provinceId: null as number | null, districtId: null as number | null };
    const fac = geoMaps.facilityMap.get(Number(facilityId));
    if (!fac) return { provinceName: null, districtName: null, provinceId: null, districtId: null };
    const dist = fac.districtId ? geoMaps.districtMap.get(fac.districtId) : null;
    const prov = dist?.provinceId ? geoMaps.provinceMap.get(dist.provinceId) : null;
    return {
      provinceName: prov?.name ?? null,
      districtName: dist?.name ?? null,
      provinceId: prov?.id ?? null,
      districtId: dist?.id ?? null,
    };
  };

  const transactions = useMemo(() => {
    const list = allTransactions ?? [];
    return list.filter((tx) => {
      const g = resolveRowGeo(tx.facilityId);
      if (geoProvinceId !== null && g.provinceId !== geoProvinceId) return false;
      if (geoDistrictId !== null && g.districtId !== geoDistrictId) return false;
      if (selectedFacilityId !== null && Number(tx.facilityId) !== selectedFacilityId) return false;
      return true;
    });
  }, [allTransactions, geoMaps, geoProvinceId, geoDistrictId, selectedFacilityId]);

  const reports = useMemo(() => {
    const list = allReports ?? [];
    return list.filter((rep) => {
      const g = resolveRowGeo(rep.facilityId);
      if (geoProvinceId !== null && g.provinceId !== geoProvinceId) return false;
      if (geoDistrictId !== null && g.districtId !== geoDistrictId) return false;
      if (selectedFacilityId !== null && Number(rep.facilityId) !== selectedFacilityId) return false;
      return true;
    });
  }, [allReports, geoMaps, geoProvinceId, geoDistrictId, selectedFacilityId]);

  // Load clients and vaccinations for monthly report aggregation
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients", { facilityId: selectedFacilityId }],
    queryFn: async () => {
      if (!selectedFacilityId) return [];
      if (!navigator.onLine) {
        return (await offlineDb.clients
          .where("facilityId")
          .equals(selectedFacilityId)
          .toArray()) as unknown as Client[];
      }
      const res = await fetch(`/api/clients?facilityId=${selectedFacilityId}`);
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json();
    },
    enabled: !!selectedFacilityId && reportDialogOpen,
  });

  // Calculate dynamic Stock on Hand (SOH) per antigen
  const stockOnHand = useMemo(() => {
    const soh: Record<string, number> = {};
    if (!transactions) return soh;

    // Initialize with active configs
    if (vaccineConfigs) {
      vaccineConfigs.forEach(c => {
        if (c.isActive) soh[c.name] = 0;
      });
    }

    transactions.forEach((tx) => {
      const type = tx.transactionType;
      const doses = tx.quantityDoses;
      if (!soh[tx.vaccineName]) soh[tx.vaccineName] = 0;

      if (type === "receipt" || type === "adjustment") {
        soh[tx.vaccineName] += doses;
      } else if (type === "issue" || type === "loss") {
        soh[tx.vaccineName] -= doses;
      }
    });

    return soh;
  }, [transactions, vaccineConfigs]);

  // Transaction form setup
  const txnForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      facilityId: selectedFacilityId ?? undefined,
      vaccineName: "",
      transactionType: "receipt",
      quantityDoses: 100,
      batchNumber: "",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      vvmStatus: 1,
      supplierOrRecipient: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (selectedFacilityId) {
      txnForm.setValue("facilityId", selectedFacilityId);
    }
  }, [selectedFacilityId, txnForm]);

  const saveTxnMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      if (!navigator.onLine) {
        // Generate a random temporary negative ID
        const newId = -Math.floor(Math.random() * 1000000);
        const localTxn = {
          id: newId,
          tenantId: user?.tenantId ?? "SSD",
          facilityId: data.facilityId,
          vaccineName: data.vaccineName,
          transactionType: data.transactionType,
          quantityDoses: data.quantityDoses,
          batchNumber: data.batchNumber,
          expiryDate: new Date(data.expiryDate).toISOString() as any,
          vvmStatus: data.vvmStatus,
          supplierOrRecipient: data.supplierOrRecipient,
          transactionDate: new Date().toISOString() as any,
          notes: data.notes ?? null,
          recordedByUserId: user?.id ?? null,
          _syncedAt: 0,
          _localOnly: true,
        };

        // Save locally to IndexedDB
        await offlineDb.stockTransactions.put(localTxn as any);

        // Queue to sync outbox
        await enqueueOutbox({
          tenantId: user?.tenantId ?? "SSD",
          entityType: "stockTransaction",
          method: "POST",
          url: "/api/stock/transaction",
          body: JSON.stringify({
            ...data,
            expiryDate: new Date(data.expiryDate).toISOString(),
          }),
        });

        return localTxn;
      }

      return apiRequest("POST", "/api/stock/transaction", {
        ...data,
        expiryDate: new Date(data.expiryDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stock/ledger`, { facilityId: selectedFacilityId }] });
      setTxnDialogOpen(false);
      txnForm.reset({
        facilityId: selectedFacilityId ?? undefined,
        vaccineName: "",
        transactionType: "receipt",
        quantityDoses: 100,
        batchNumber: "",
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        vvmStatus: 1,
        supplierOrRecipient: "",
        notes: "",
      });
      toast({
        title: navigator.onLine ? "Transaction Registered" : "Transaction Queued Offline",
        description: navigator.onLine 
          ? "Your stock card transaction was successfully updated."
          : "Saved locally. Transaction will sync automatically once internet is restored.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteTxnMutation = useMutation({
    mutationFn: async (txId: number) => {
      if (!navigator.onLine) {
        if (txId < 0) {
          // Local-only transaction: delete directly from local DB
          await offlineDb.stockTransactions.delete(txId);
        } else {
          // Sync-enabled transaction: queue deletion to outbox
          await enqueueOutbox({
            tenantId: user?.tenantId ?? "SSD",
            entityType: "stockTransaction",
            method: "DELETE",
            url: `/api/stock/transaction/${txId}`,
            serverId: txId,
          });
        }
        return { success: true };
      }
      return apiRequest("DELETE", `/api/stock/transaction/${txId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stock/ledger`, { facilityId: selectedFacilityId }] });
      toast({ title: "Transaction Reverted", description: "The stock ledger entry has been reverted." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to revert", description: err.message, variant: "destructive" });
    },
  });

  // Monthly Report form wizard setup
  const [reportPeriod, setReportPeriod] = useState({
    month: new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  // Stepper state variables
  const [compiledImmunizations, setCompiledImmunizations] = useState<Record<string, number>>({});
  const [compiledStock, setCompiledStock] = useState<Record<string, any>>({});
  const [surveillanceData, setSurveillanceData] = useState({
    measles: 0,
    afp: 0,
    nnt: 0,
    aefi: 0,
  });

  // Auto-fill Wizard details based on Period selected
  const handleCompileWizardData = async () => {
    if (!selectedFacilityId || !clients) return;

    // STEP 2: Compile immunizations from client registrations
    // Simulate fetching vaccinations. In real production, it aggregates from API.
    // Let's call the backend client details or fetch vaccinations for all facility clients.
    try {
      const compiledImms: Record<string, number> = {};
      
      // Seed with standard configs
      if (vaccineConfigs) {
        vaccineConfigs.forEach(vc => {
          compiledImms[vc.name] = 0;
        });
      }

      // We do a bulk fetch of all vaccinations for facility clients, or estimate based on active logs
      for (const client of clients) {
        const res = await fetch(`/api/clients/${client.id}/vaccinations`);
        if (res.ok) {
          const vacs: ClientVaccination[] = await res.json();
          vacs.forEach((v) => {
            const date = new Date(v.administeredDate);
            if (
              date.getMonth() + 1 === reportPeriod.month &&
              date.getFullYear() === reportPeriod.year
            ) {
              compiledImms[v.vaccineName] = (compiledImms[v.vaccineName] || 0) + 1;
            }
          });
        }
      }

      setCompiledImmunizations(compiledImms);

      // STEP 3: Compile stock details for the period from stock transactions
      const compiledStk: Record<string, any> = {};
      
      if (vaccineConfigs) {
        vaccineConfigs.forEach(vc => {
          // Aggregate ledger transactions for this month/year
          let received = 0;
          let administered = compiledImms[vc.name] || 0; // matching logbook admin
          let wasted = 0;

          if (transactions) {
            transactions.forEach(tx => {
              if (tx.vaccineName !== vc.name) return;
              const date = new Date(tx.transactionDate);
              const txInPeriod = date.getMonth() + 1 === reportPeriod.month && date.getFullYear() === reportPeriod.year;

              if (txInPeriod) {
                if (tx.transactionType === "receipt") received += tx.quantityDoses;
                if (tx.transactionType === "loss") wasted += tx.quantityDoses;
              }
            });
          }

          // Dynamic math
          const opening = stockOnHand[vc.name] ? Math.max(0, stockOnHand[vc.name] - received + administered + wasted) : 0;
          const closing = Math.max(0, opening + received - administered - wasted);
          const totalReceived = received;
          const totalWasted = wasted;
          
          const denominator = administered + totalWasted;
          const wastageRate = denominator > 0 ? parseFloat(((totalWasted / denominator) * 100).toFixed(2)) : 0;

          compiledStk[vc.name] = {
            opening,
            received: totalReceived,
            administered,
            wasted: totalWasted,
            closing,
            wastageRate,
          };
        });
      }

      setCompiledStock(compiledStk);
      setWizardStep(2); // advance to next step
    } catch (err: any) {
      toast({ title: "Failed to compile data", description: err.message, variant: "destructive" });
    }
  };

  const saveReportMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/monthly-reports", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-reports`, { facilityId: selectedFacilityId }] });
      setReportDialogOpen(false);
      setWizardStep(1);
      toast({
        title: "WHO Monthly Report Submitted",
        description: "Your compiled facility monthly report has been locked and submitted for review.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit report", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitMonthlyReport = () => {
    if (!selectedFacilityId) return;

    const payload = {
      facilityId: selectedFacilityId,
      month: reportPeriod.month,
      year: reportPeriod.year,
      immunizations: compiledImmunizations,
      stockSummary: compiledStock,
      surveillance: surveillanceData,
      approvalStatus: "pending", // locked-submits for manager approval
    };

    saveReportMutation.mutate(payload);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Section */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">WHO RED Stock Ledger & Monthly Reports</h1>
          <p className="text-sm text-muted-foreground">
            Track cold chain transaction ledgers and compile monthly facility immunization coverage reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Facility Selector */}
          {!user?.facilityId && facilities && (
            <div className="flex items-center gap-2 min-w-[640px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Facility:</span>
              <div className="flex-1">
                <FacilityCascadePicker
                  value={selectedFacilityId ?? null}
                  onChange={(id) => setSelectedFacilityId(id ?? undefined as any)}
                  showLabels={false}
                  testIdPrefix="stock-facility"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogOpen(true);
                setWizardStep(1);
              }}
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              <ClipboardList className="h-4 w-4" />
              <span>Compile Monthly Report</span>
            </Button>

            <Button onClick={() => setTxnDialogOpen(true)} className="gap-1 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              <span>Stock Card Action</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Geo cascade filter (Province → District → Facility — each level independently narrows table rows) */}
      <GeoCascadeFilter
        provinceId={geoProvinceId}
        districtId={geoDistrictId}
        facilityId={selectedFacilityId}
        onProvinceChange={(id) => { setGeoProvinceId(id); setGeoDistrictId(null); setSelectedFacilityId(null); }}
        onDistrictChange={(id) => { setGeoDistrictId(id); setSelectedFacilityId(null); }}
        onFacilityChange={setSelectedFacilityId}
        showFacility
        provinces={provinces}
        districts={districts}
        facilities={facilities ?? []}
        testIdPrefix="stockledger"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="ledger" className="gap-1.5">
            <Package className="h-4 w-4" />
            <span>Stock Ledger Cards</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span>Monthly Compiled Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Stock Card Ledger */}
        <TabsContent value="ledger" className="space-y-6 outline-none">
          {/* Active Balances SOH Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {vaccineConfigs?.filter(c => c.isActive).map((config) => {
              const balance = stockOnHand[config.name] ?? 0;
              const lowStock = balance < 100;

              return (
                <Card
                  key={config.id}
                  className={`border-border/40 backdrop-blur-md bg-card/45 shadow transition-all hover:scale-[1.02] ${
                    lowStock ? "border-amber-500/20 bg-amber-500/5" : ""
                  }`}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider truncate">
                          {config.name}
                        </span>
                        {lowStock && (
                          <Badge variant="outline" className="border-amber-500/20 text-amber-600 bg-amber-500/10 text-[9px] px-1 py-0 h-4">
                            Low SOH
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                        {balance.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2 border-t pt-1 border-border/20">
                      Wastage factor: {config.wastageFactor}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Ledger Transaction History */}
          <Card className="border-border/40 backdrop-blur-md bg-card/45 shadow-xl">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
              <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Stock Card Transactions Ledger</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loadingTxns ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : transactions && transactions.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                  <thead className="text-xs uppercase text-muted-foreground bg-muted/40 font-semibold border-b border-border/40">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Province</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3">Antigen / Vaccine</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-center">Qty (Doses)</th>
                      <th className="px-4 py-3">Batch Number</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3 text-center">VVM</th>
                      <th className="px-4 py-3">Supplier/Recipient</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {transactions.map((tx) => {
                      const typeColors: Record<string, string> = {
                        receipt: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        issue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        loss: "bg-destructive/10 text-destructive border-destructive/20",
                        adjustment: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      };

                      const vvmStatuses: Record<number, string> = {
                        1: "1-Good",
                        2: "2-Use First",
                        3: "3-Discard",
                        4: "4-Discarded",
                      };

                      const rowGeo = resolveRowGeo(tx.facilityId);
                      return (
                        <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">{format(new Date(tx.transactionDate), "yyyy-MM-dd HH:mm")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rowGeo.provinceName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rowGeo.districtName ?? "—"}</td>
                          <td className="px-4 py-3 font-semibold text-primary">{tx.vaccineName}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`capitalize ${typeColors[tx.transactionType] || ""}`}>
                              {tx.transactionType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{tx.quantityDoses}</td>
                          <td className="px-4 py-3 font-mono text-xs">{tx.batchNumber}</td>
                          <td className="px-4 py-3">{format(new Date(tx.expiryDate), "yyyy-MM-dd")}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={tx.vvmStatus > 2 ? "border-destructive text-destructive" : ""}>
                              {vvmStatuses[tx.vvmStatus] ?? tx.vvmStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{tx.supplierOrRecipient}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTxnMutation.mutate(tx.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  No stock transactions logged yet. Click "Stock Card Action" to register cold chain arrivals or issues.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Monthly Reports List */}
        <TabsContent value="reports" className="space-y-6 outline-none">
          <Card className="border-border/40 backdrop-blur-md bg-card/45 shadow-xl">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
              <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                WHO RED Facility Monthly Immunization Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loadingReports ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : reports && reports.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                  <thead className="text-xs uppercase text-muted-foreground bg-muted/40 font-semibold border-b border-border/40">
                    <tr>
                      <th className="px-4 py-3">Reporting Period</th>
                      <th className="px-4 py-3">Province</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3">Immunizations Count</th>
                      <th className="px-4 py-3">Stock Wastage Summaries</th>
                      <th className="px-4 py-3">Surveillance Status</th>
                      <th className="px-4 py-3">Approval Status</th>
                      <th className="px-4 py-3">Submission Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {reports.map((rep) => {
                      const months = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December",
                      ];
                      
                      const imms = (rep.immunizations || {}) as Record<string, number>;
                      const stock = (rep.stockSummary || {}) as Record<string, any>;
                      const surv = (rep.surveillance || {}) as Record<string, number>;

                      const rowGeo = resolveRowGeo(rep.facilityId);
                      return (
                        <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-semibold">
                            {months[rep.month - 1]} {rep.year}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{rowGeo.provinceName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rowGeo.districtName ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs max-w-[200px]">
                              {Object.entries(imms).slice(0, 4).map(([k, v]) => (
                                <div key={k} className="flex justify-between">
                                  <span className="text-muted-foreground">{k}:</span>
                                  <span className="font-bold">{v}</span>
                                </div>
                              ))}
                              {Object.keys(imms).length > 4 && (
                                <div className="text-[10px] text-muted-foreground col-span-2">
                                  + {Object.keys(imms).length - 4} other antigens
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs space-y-1 max-w-[200px]">
                              {Object.entries(stock).slice(0, 2).map(([k, v]: [string, any]) => (
                                <div key={k} className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">{k}:</span>
                                  <span className="font-bold">
                                    Wasted: {v.wasted} (Rate: {v.wastageRate}%)
                                  </span>
                                </div>
                              ))}
                              {Object.keys(stock).length > 2 && (
                                <div className="text-[10px] text-muted-foreground col-span-2">
                                  + {Object.keys(stock).length - 2} other stocks
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className={surv.measles > 0 ? "border-destructive text-destructive bg-destructive/5" : ""}>
                                Measles: {surv.measles ?? 0}
                              </Badge>
                              <Badge variant="outline" className={surv.aefi > 0 ? "border-amber-500 text-amber-600 bg-amber-500/5" : ""}>
                                AEFI: {surv.aefi ?? 0}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                rep.approvalStatus === "approved"
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : rep.approvalStatus === "pending"
                                    ? "bg-amber-500 hover:bg-amber-600"
                                    : "bg-secondary"
                              }
                            >
                              {rep.approvalStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              <span>Submitted {rep.createdAt ? format(new Date(rep.createdAt), "yyyy-MM-dd") : "N/A"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  No monthly facility reports compiled yet. Click "Compile Monthly Report" to trigger automated WHO RED assemblies.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* dialog 1: Add transaction */}
      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Card Registry Action</DialogTitle>
          </DialogHeader>

          <Form {...txnForm}>
            <form onSubmit={txnForm.handleSubmit((d) => saveTxnMutation.mutate(d))} className="space-y-4 pt-4">
              <FormField
                control={txnForm.control}
                name="vaccineName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antigen / Vaccine Name</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick vaccine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vaccineConfigs?.filter(c => c.isActive).map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={txnForm.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="receipt">Receipt (Arrival)</SelectItem>
                          <SelectItem value="issue">Issue (Deployment)</SelectItem>
                          <SelectItem value="loss">Loss (Wastage)</SelectItem>
                          <SelectItem value="adjustment">Adjustment (+)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={txnForm.control}
                  name="quantityDoses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (Doses)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={txnForm.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BCG-9923" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={txnForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={txnForm.control}
                  name="vvmStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VVM Status</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="VVM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Stage 1: Good</SelectItem>
                          <SelectItem value="2">Stage 2: Use First</SelectItem>
                          <SelectItem value="3">Stage 3: Discard</SelectItem>
                          <SelectItem value="4">Stage 4: Discarded</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={txnForm.control}
                  name="supplierOrRecipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier / Recipient</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. National Store" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={txnForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Vial damages, temperature alerts..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setTxnDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveTxnMutation.isPending}>
                  {saveTxnMutation.isPending ? "Logging Card..." : "Save Stock Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* dialog 2: Compile Monthly Report Wizard */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>WHO RED Monthly Compilation Compiler (Step {wizardStep} of 4)</span>
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Select Period */}
          {wizardStep === 1 && (
            <div className="space-y-6 pt-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <h4 className="font-semibold text-sm mb-1">EPI Auto-Compile Wizard</h4>
                <p className="text-xs text-muted-foreground">
                  The system will automatically query the digital client registry logs and stock card ledger logs
                  to assemble your monthly WHO RED coverage metrics.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Month</label>
                  <Select
                    value={reportPeriod.month.toString()}
                    onValueChange={(v) => setReportPeriod((p) => ({ ...p, month: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December",
                      ].map((m, idx) => (
                        <SelectItem key={m} value={(idx + 1).toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Year</label>
                  <Input
                    type="number"
                    value={reportPeriod.year}
                    onChange={(e) =>
                      setReportPeriod((p) => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))
                    }
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCompileWizardData} className="gap-1">
                  <span>Start Assembly</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2: Review Compiled Coverage */}
          {wizardStep === 2 && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Step 2: Compiled Facility Immunization Totals</h3>
                <p className="text-xs text-muted-foreground">
                  Verify the compiled numbers aggregated from child logs for this facility in the reporting month.
                </p>
              </div>

              <div className="border rounded-md overflow-hidden bg-background">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 font-semibold border-b">
                    <tr>
                      <th className="px-4 py-2">Vaccine / Antigen</th>
                      <th className="px-4 py-2 text-center">Compiled Vaccinations</th>
                      <th className="px-4 py-2 text-right">Manual Correction Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(compiledImmunizations).map(([name, count]) => (
                      <tr key={name}>
                        <td className="px-4 py-2 font-medium">{name}</td>
                        <td className="px-4 py-2 text-center font-bold text-primary">{count}</td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            className="h-7 w-20 ml-auto text-right text-xs"
                            value={compiledImmunizations[name] ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setCompiledImmunizations((prev) => ({
                                ...prev,
                                [name]: val,
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="pt-4 border-t gap-2 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Back</span>
                </Button>
                <Button onClick={() => setWizardStep(3)} className="gap-1">
                  <span>Stock Compilation</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Stock Summary */}
          {wizardStep === 3 && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Step 3: Compiled Cold Chain & Stock Ledgers</h3>
                <p className="text-xs text-muted-foreground">
                  The stock balance compilation calculates starting balances, receptions, losses, and active wastage factors.
                </p>
              </div>

              <div className="border rounded-md overflow-hidden bg-background max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 font-semibold border-b">
                    <tr>
                      <th className="px-3 py-2">Antigen</th>
                      <th className="px-3 py-2 text-center">Opening</th>
                      <th className="px-3 py-2 text-center">Received</th>
                      <th className="px-3 py-2 text-center">Administered</th>
                      <th className="px-3 py-2 text-center">Wasted (Loss)</th>
                      <th className="px-3 py-2 text-center">Closing</th>
                      <th className="px-3 py-2 text-right">Wastage %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(compiledStock).map(([name, details]: [string, any]) => {
                      const lowRate = details.wastageRate < 10;
                      return (
                        <tr key={name}>
                          <td className="px-3 py-2 font-medium">{name}</td>
                          <td className="px-3 py-2 text-center">{details.opening}</td>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-600">{details.received}</td>
                          <td className="px-3 py-2 text-center text-primary">{details.administered}</td>
                          <td className="px-3 py-2 text-center text-destructive">{details.wasted}</td>
                          <td className="px-3 py-2 text-center font-bold">{details.closing}</td>
                          <td className={`px-3 py-2 text-right font-bold ${lowRate ? "text-emerald-600" : "text-amber-500"}`}>
                            {details.wastageRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="pt-4 border-t gap-2 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setWizardStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Back</span>
                </Button>
                <Button onClick={() => setWizardStep(4)} className="gap-1">
                  <span>Disease Surveillance</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 4: Disease Surveillance */}
          {wizardStep === 4 && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Step 4: WHO Disease Surveillance Cases</h3>
                <p className="text-xs text-muted-foreground">
                  Record cases identified during the period for surveillance transmission. Leave zero if none.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Measles Cases</label>
                  <Input
                    type="number"
                    value={surveillanceData.measles}
                    onChange={(e) =>
                      setSurveillanceData((p) => ({ ...p, measles: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Acute Flaccid Paralysis (AFP) Cases</label>
                  <Input
                    type="number"
                    value={surveillanceData.afp}
                    onChange={(e) =>
                      setSurveillanceData((p) => ({ ...p, afp: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Neonatal Tetanus (NNT) Cases</label>
                  <Input
                    type="number"
                    value={surveillanceData.nnt}
                    onChange={(e) =>
                      setSurveillanceData((p) => ({ ...p, nnt: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">AEFI Cases</label>
                  <Input
                    type="number"
                    value={surveillanceData.aefi}
                    onChange={(e) =>
                      setSurveillanceData((p) => ({ ...p, aefi: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  Confirming submission locks the monthly report database and transmits it for manager review. Facility clerks cannot modify the data post-transmission.
                </span>
              </div>

              <DialogFooter className="pt-4 border-t gap-2 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setWizardStep(3)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleSubmitMonthlyReport} disabled={saveReportMutation.isPending} className="gap-1.5 shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 text-white">
                  <CheckCircle className="h-4 w-4" />
                  <span>Lock & Submit Report</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
