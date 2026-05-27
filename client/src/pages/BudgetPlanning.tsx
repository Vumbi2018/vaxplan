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
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { offlineDb } from "../lib/offlineDb";
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
} from "@shared/schema";
import { MicroplanStepper } from "@/components/MicroplanStepper";
import { z } from "zod";

const budgetFormSchema = insertBudgetItemSchema.extend({
  description: z.string().min(2, "Description is required"),
  unitCost: z.string().transform((v) => v),
  totalCost: z.string().transform((v) => v),
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

export default function BudgetPlanning() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );

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

  const form = useForm<InsertBudgetItem>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "Transport",
      quarter: selectedQuarter,
      year: new Date().getFullYear(),
      quantity: 1,
      approvalStatus: "draft",
    },
  });

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
        await offlineDb.outbox.add({
          tenantId: data.tenantId || "default",
          entityType: "budget_item",
          method: "POST",
          url: "/api/budget-items",
          body: JSON.stringify({ ...data, totalCost }),
          localId: String(localId),
          retries: 0,
          createdAt: Date.now(),
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

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!navigator.onLine) {
        if (itemId < 0) {
          await offlineDb.budgetItems.delete(itemId);
        } else {
          await offlineDb.budgetItems.delete(itemId);
          await offlineDb.outbox.add({
            tenantId: user?.tenantId || "default",
            entityType: "budget_item",
            method: "DELETE",
            url: `/api/budget-items/${itemId}`,
            localId: String(itemId),
            retries: 0,
            createdAt: Date.now(),
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

  const quarterItems = budgetItems?.filter(
    (b) => b.quarter === selectedQuarter && b.year === new Date().getFullYear()
  ) || [];

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

  const columns = [
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
        );
      },
    },
  ];

  const onSubmit = (data: InsertBudgetItem) => {
    const totalCost = (parseFloat(data.unitCost as string) * data.quantity).toString();
    createMutation.mutate({ ...data, totalCost });
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
      <MicroplanStepper currentStep={7} />
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

          <Button variant="outline" data-testid="button-export-budget">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-budget-item">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-facility">
                              <SelectValue placeholder="Select facility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {facilities?.map((f) => (
                              <SelectItem key={f.id} value={f.id.toString()}>
                                {f.name}
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
                    name="sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linked Microplan Session (Optional)</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}
                          value={field.value?.toString() ?? ""}
                          disabled={!formFacilityId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-budget-session">
                              <SelectValue placeholder={formFacilityId ? (filteredSessions.length > 0 ? "Select linked session" : "No active session plans this quarter") : "Select a facility first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None / Facility Level</SelectItem>
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
                      disabled={createMutation.isPending}
                      data-testid="button-save-budget"
                    >
                      {createMutation.isPending ? "Saving..." : "Add Item"}
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
          <CardContent className="p-6">
            <DataTable
              data={quarterItems}
              columns={columns}
              searchable
              searchKeys={["description", "category"]}
              emptyMessage="No budget items for this quarter."
            />
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
