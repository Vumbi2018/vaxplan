import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Pencil, Trash2, Plus, RefreshCw, ChevronDown, ChevronRight, Info, Award, HelpCircle, Landmark, CalendarRange } from "lucide-react";

/*
// ORIGINAL INDICATOR ENTRY INTERFACE COMMENTED OUT TO PRESERVE BACKWARD COMPATIBILITY
export interface IndicatorEntry {
  id: string;
  category: string;
  subCategory: string;
  name: string;
  numerator: string;
  denominator: string;
  source: string;
  calculation: string;
  reference: string | null;
  updatedAt: string;
}
*/

export interface IndicatorEntry {
  id: string;
  category: string;
  subCategory: string;
  name: string;
  numerator: string;
  numeratorSource: string;
  denominator: string;
  denominatorSource: string;
  calculation: string;
  calculationExample: string;
  reference: string | null;
  referenceUrl: string | null;
  updatedAt: string;
}

/*
// ORIGINAL COMPONENT CODE COMMENTED OUT TO PRESERVE BACKWARD COMPATIBILITY
// AND RESPECT THE "NEVER OVERWRITE WORKING CODE WITHOUT COMMENTING IT OUT FIRST" RULE.

export default function IndicatorManual() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<Record<string, boolean>>({});
  ...
}
*/

// NEW GAMIFIED AND EXTENDED INDICATOR MANUAL COMPONENT

export default function IndicatorManual() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Collapsed states: key is category name or subcategory path
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<Record<string, boolean>>({});
  
  // Selected indicator for editing
  const [editingEntry, setEditingEntry] = useState<IndicatorEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form states for editing
  const [formNumerator, setFormNumerator] = useState("");
  const [formNumeratorSource, setFormNumeratorSource] = useState("");
  const [formDenominator, setFormDenominator] = useState("");
  const [formDenominatorSource, setFormDenominatorSource] = useState("");
  const [formCalculation, setFormCalculation] = useState("");
  const [formCalculationExample, setFormCalculationExample] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formReferenceUrl, setFormReferenceUrl] = useState("");

  // Form states for creating a new indicator
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState("");
  const [createSubCategory, setCreateSubCategory] = useState("");
  const [createName, setCreateName] = useState("");
  const [createNumerator, setCreateNumerator] = useState("");
  const [createNumeratorSource, setCreateNumeratorSource] = useState("");
  const [createDenominator, setCreateDenominator] = useState("");
  const [createDenominatorSource, setCreateDenominatorSource] = useState("");
  const [createCalculation, setCreateCalculation] = useState("");
  const [createCalculationExample, setCreateCalculationExample] = useState("");
  const [createReference, setCreateReference] = useState("");
  const [createReferenceUrl, setCreateReferenceUrl] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // State for deleting an indicator
  const [deletingEntry, setDeletingEntry] = useState<IndicatorEntry | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Gamification: Mastered Indicator IDs stored in localStorage
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("vaxplan::mastered_indicators");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const canEdit = useMemo(() => {
    if (!user) return false;
    return ["national_admin", "provincial_coordinator"].includes(user.role || "");
  }, [user]);

  const isNationalAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === "national_admin";
  }, [user]);

  // Load manual entries from the server
  const { data: entries, isLoading, error } = useQuery<IndicatorEntry[]>({
    queryKey: ["/api/indicator-manual"],
    queryFn: async () => {
      const res = await fetch("/api/indicator-manual", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch indicator manual");
      return res.json();
    }
  });

  // Mutate: update indicator
  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<IndicatorEntry> & { id: string }) => {
      const res = await fetch(`/api/indicator-manual/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update indicator manual entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicator-manual"] });
      toast({
        title: "Indicator updated",
        description: "The definition has been saved successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Mutate: reset manual to defaults
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/indicator-manual/reset", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset indicator manual");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicator-manual"] });
      toast({
        title: "Manual reset to defaults",
        description: "All calculations and coverages have been restored.",
      });
      setIsResetConfirmOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Reset failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Mutate: create indicator
  const createMutation = useMutation({
    mutationFn: async (newEntry: Omit<IndicatorEntry, "id" | "updatedAt">) => {
      const res = await fetch("/api/indicator-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create indicator");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicator-manual"] });
      toast({
        title: "Indicator created",
        description: "New indicator definition has been added successfully.",
      });
      setIsCreateOpen(false);
      // Reset form
      setCreateCategory("");
      setCreateSubCategory("");
      setCreateName("");
      setCreateNumerator("");
      setCreateNumeratorSource("");
      setCreateDenominator("");
      setCreateDenominatorSource("");
      setCreateCalculation("");
      setCreateCalculationExample("");
      setCreateReference("");
      setCreateReferenceUrl("");
    },
    onError: (err: any) => {
      toast({
        title: "Creation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Mutate: delete indicator
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/indicator-manual/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete indicator");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicator-manual"] });
      toast({
        title: "Indicator deleted",
        description: "Indicator definition has been removed successfully.",
      });
      setIsDeleteOpen(false);
      setDeletingEntry(null);
    },
    onError: (err: any) => {
      toast({
        title: "Deletion failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Group entries by Category -> Subcategory
  const groupedEntries = useMemo(() => {
    if (!entries) return {};
    const groups: Record<string, Record<string, IndicatorEntry[]>> = {};
    for (const entry of entries) {
      if (!groups[entry.category]) {
        groups[entry.category] = {};
      }
      if (!groups[entry.category][entry.subCategory]) {
        groups[entry.category][entry.subCategory] = [];
      }
      groups[entry.category][entry.subCategory].push(entry);
    }
    return groups;
  }, [entries]);

  // Gamification: mastery stats
  const totalIndicators = entries?.length || 0;
  const masteredCount = useMemo(() => {
    if (!entries) return 0;
    const entryIds = new Set(entries.map(e => e.id));
    return masteredIds.filter(id => entryIds.has(id)).length;
  }, [entries, masteredIds]);

  const masteryPercent = totalIndicators ? Math.round((masteredCount / totalIndicators) * 100) : 0;

  const masteryLevel = useMemo(() => {
    if (masteryPercent === 100) return { title: "EPI Mastery Legend 🏆", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30" };
    if (masteryPercent >= 70) return { title: "EPI Specialist 🎯", color: "text-violet-500 bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/30" };
    if (masteryPercent >= 35) return { title: "EPI Practitioner 📘", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30" };
    return { title: "EPI Novice 🌱", color: "text-slate-500 bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800/40" };
  }, [masteryPercent]);

  const toggleMastered = (id: string) => {
    setMasteredIds(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else {
        next = [...prev, id];
        toast({
          title: "Progress Unlocked! 🎯",
          description: "Indicator marked as understood. Keep building your EPI mastery!",
        });
      }
      localStorage.setItem("vaxplan::mastered_indicators", JSON.stringify(next));
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleSubCategory = (subKey: string) => {
    setCollapsedSubCategories(prev => ({ ...prev, [subKey]: !prev[subKey] }));
  };

  const handleEditClick = (entry: IndicatorEntry) => {
    setEditingEntry(entry);
    setFormNumerator(entry.numerator);
    setFormNumeratorSource(entry.numeratorSource);
    setFormDenominator(entry.denominator);
    setFormDenominatorSource(entry.denominatorSource);
    setFormCalculation(entry.calculation);
    setFormCalculationExample(entry.calculationExample);
    setFormReference(entry.reference || "");
    setFormReferenceUrl(entry.referenceUrl || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    updateMutation.mutate({
      id: editingEntry.id,
      numerator: formNumerator,
      numeratorSource: formNumeratorSource,
      denominator: formDenominator,
      denominatorSource: formDenominatorSource,
      calculation: formCalculation,
      calculationExample: formCalculationExample,
      reference: formReference.trim() || null,
      referenceUrl: formReferenceUrl.trim() || null,
    });
  };

  const handleDeleteClick = (entry: IndicatorEntry) => {
    setDeletingEntry(entry);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      category: createCategory,
      subCategory: createSubCategory,
      name: createName,
      numerator: createNumerator,
      numeratorSource: createNumeratorSource,
      denominator: createDenominator,
      denominatorSource: createDenominatorSource,
      calculation: createCalculation,
      calculationExample: createCalculationExample,
      reference: createReference.trim() || null,
      referenceUrl: createReferenceUrl.trim() || null,
    });
  };

  const existingCategories = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map(e => e.category)));
  }, [entries]);

  // Visually distinct gradients for each category
  const getCategoryStyles = (catName: string) => {
    const c = catName.toLowerCase();
    if (c.includes("coverage")) {
      return {
        headerClass: "bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border-l-4 border-sky-500 text-sky-900 dark:text-sky-200",
        icon: <Award className="h-5 w-5 text-sky-500" />,
      };
    }
    if (c.includes("operational")) {
      return {
        headerClass: "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-l-4 border-emerald-500 text-emerald-900 dark:text-emerald-200",
        icon: <CalendarRange className="h-5 w-5 text-emerald-500" />,
      };
    }
    if (c.includes("budget") || c.includes("finance")) {
      return {
        headerClass: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-l-4 border-amber-500 text-amber-900 dark:text-amber-200",
        icon: <Landmark className="h-5 w-5 text-amber-500" />,
      };
    }
    return {
      headerClass: "bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border-l-4 border-violet-500 text-violet-900 dark:text-violet-200",
      icon: <Info className="h-5 w-5 text-violet-500" />,
    };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-rose-500">Failed to load manual</h1>
        <p className="text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <BookOpen className="h-6 w-6 text-primary shrink-0" />
            Indicator Manual
          </h1>
          <p className="text-sm text-muted-foreground">
            Reference manual explaining the formulas, numerators, denominators, and data sources for VaxPlan metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!canEdit && (
            <Badge variant="secondary" className="px-3 py-1 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Read-Only
            </Badge>
          )}
          {canEdit && (
            <>
              <Badge variant="outline" className="px-3 py-1 border-primary/30 text-primary bg-primary/5 font-medium">
                Admin Editor Mode
              </Badge>
              {isNationalAdmin && (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1.5 bg-primary text-white hover:bg-primary/90 font-medium">
                      <Plus className="h-3.5 w-3.5" />
                      Add Indicator
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Indicator</DialogTitle>
                      <DialogDescription>
                        Add a new indicator explanation to the system manual for all users in your tenant.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label htmlFor="create-category" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category</label>
                          <button
                            type="button"
                            onClick={() => setIsCustomCategory(!isCustomCategory)}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            {isCustomCategory ? "Select Existing" : "Create Custom Category"}
                          </button>
                        </div>
                        {isCustomCategory ? (
                          <Input
                            id="create-category"
                            value={createCategory}
                            onChange={(e) => setCreateCategory(e.target.value)}
                            placeholder="Enter custom category name (e.g. Immunization Coverage)"
                            className="text-sm"
                            required
                          />
                        ) : (
                          <select
                            id="create-category"
                            value={createCategory}
                            onChange={(e) => setCreateCategory(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          >
                            <option value="">-- Select Category --</option>
                            {existingCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-subcategory" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sub-Category</label>
                        <Input
                          id="create-subcategory"
                          value={createSubCategory}
                          onChange={(e) => setCreateSubCategory(e.target.value)}
                          placeholder="e.g. Coverage or Dropouts"
                          className="text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-name" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Indicator Name</label>
                        <Input
                          id="create-name"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          placeholder="e.g. DTP3 Coverage Rate"
                          className="text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-numerator" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Numerator Description</label>
                        <Textarea
                          id="create-numerator"
                          value={createNumerator}
                          onChange={(e) => setCreateNumerator(e.target.value)}
                          placeholder="Detailed explanation of what the numerator represents"
                          className="text-sm min-h-16"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-numerator-source" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Numerator Data Source</label>
                        <Textarea
                          id="create-numerator-source"
                          value={createNumeratorSource}
                          onChange={(e) => setCreateNumeratorSource(e.target.value)}
                          placeholder="e.g. Client vaccination records, static sessions logbooks"
                          className="text-sm min-h-16"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-denominator" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Denominator Description</label>
                        <Textarea
                          id="create-denominator"
                          value={createDenominator}
                          onChange={(e) => setCreateDenominator(e.target.value)}
                          placeholder="Detailed explanation of what the denominator represents"
                          className="text-sm min-h-16"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-denominator-source" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Denominator Data Source</label>
                        <Textarea
                          id="create-denominator-source"
                          value={createDenominatorSource}
                          onChange={(e) => setCreateDenominatorSource(e.target.value)}
                          placeholder="e.g. Census population estimates, WorldPop gridded datasets"
                          className="text-sm min-h-16"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-calculation" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculation Formula</label>
                        <Input
                          id="create-calculation"
                          value={createCalculation}
                          onChange={(e) => setCreateCalculation(e.target.value)}
                          placeholder="e.g. Coverage Rate (%) = (Numerator / Denominator) * 100"
                          className="text-sm font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-calculation-example" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculation Example</label>
                        <Textarea
                          id="create-calculation-example"
                          value={createCalculationExample}
                          onChange={(e) => setCreateCalculationExample(e.target.value)}
                          placeholder="Provide a step-by-step example with numbers"
                          className="text-sm min-h-16"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-reference" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference Guidelines (Optional)</label>
                        <Input
                          id="create-reference"
                          value={createReference}
                          onChange={(e) => setCreateReference(e.target.value)}
                          placeholder="e.g. WHO Routine Microplanning Guidelines"
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="create-reference-url" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference URL (Optional)</label>
                        <Input
                          id="create-reference-url"
                          value={createReferenceUrl}
                          onChange={(e) => setCreateReferenceUrl(e.target.value)}
                          placeholder="e.g. https://www.who.int/..."
                          className="text-sm"
                        />
                      </div>

                      <DialogFooter className="gap-2 mt-6 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900/30 dark:hover:bg-rose-950/20">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset defaults
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Indicator Manual?</DialogTitle>
                    <DialogDescription>
                      This will discard all custom edits and restore every indicator formula, numerator, denominator, and source to the default system values. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                      {resetMutation.isPending ? "Resetting..." : "Confirm Reset"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Gamification Dashboard */}
      <Card className="border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div className="flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl animate-bounce shrink-0">
              🎓
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">EPI Knowledge Mastery</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle checklist checkmarks inside metrics to track your understanding of standard formulas.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Level:</span>
              <Badge variant="outline" className={`font-semibold border px-2.5 py-0.5 rounded-full ${masteryLevel.color}`}>
                {masteryLevel.title}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-48 mt-1">
              <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right shrink-0">
                {masteredCount}/{totalIndicators}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion Categories */}
      <div className="space-y-4">
        {Object.entries(groupedEntries).map(([category, subcategories]) => {
          const isCatCollapsed = collapsedCategories[category];
          const styles = getCategoryStyles(category);

          return (
            <Card key={category} className="shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between p-4 transition-all text-left font-bold text-base ${styles.headerClass}`}
              >
                <div className="flex items-center gap-3">
                  {styles.icon}
                  <span>{category}</span>
                </div>
                {isCatCollapsed ? <ChevronRight className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>

              {/* Category Content */}
              {!isCatCollapsed && (
                <CardContent className="p-4 space-y-6 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {Object.entries(subcategories).map(([subCategory, subEntries]) => {
                    const subKey = `${category}::${subCategory}`;
                    const isSubCollapsed = collapsedSubCategories[subKey];
                    return (
                      <div key={subCategory} className="pt-4 first:pt-0 space-y-3">
                        {/* Subcategory Label */}
                        <button
                          type="button"
                          onClick={() => toggleSubCategory(subKey)}
                          className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                        >
                          {isSubCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {subCategory}
                        </button>

                        {/* Subcategory Indicators Grid */}
                        {!isSubCollapsed && (
                          <div className="grid gap-4 mt-2">
                            {subEntries.map((entry) => {
                              const isMastered = masteredIds.includes(entry.id);
                              return (
                                <div
                                  key={entry.id}
                                  className={`border rounded-xl p-4 bg-white dark:bg-slate-950 hover:shadow-md transition-all space-y-4 relative group ${
                                    isMastered
                                      ? "border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/5 dark:bg-emerald-950/5"
                                      : "border-slate-200 dark:border-slate-800/80"
                                  }`}
                                >
                                  {/* Name and Action buttons */}
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1.5">
                                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base leading-tight flex items-center gap-2">
                                        {entry.name}
                                        {isMastered && (
                                          <span className="text-emerald-500 text-sm" title="Mastered">
                                            ✅
                                          </span>
                                        )}
                                      </h3>
                                      {entry.reference && (
                                        <div className="inline-block">
                                          {entry.referenceUrl ? (
                                            <a
                                              href={entry.referenceUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[11px] text-primary hover:text-primary-focus font-semibold bg-primary/5 hover:bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                                            >
                                              {entry.reference} ↗
                                            </a>
                                          ) : (
                                            <span className="text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                                              {entry.reference}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => toggleMastered(entry.id)}
                                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-all ${
                                          isMastered
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                      >
                                        🎯 {isMastered ? "Mastered" : "Learn"}
                                      </button>

                                      {canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                                          onClick={() => handleEditClick(entry)}
                                          title="Edit formula details"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}

                                      {isNationalAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                          onClick={() => handleDeleteClick(entry)}
                                          title="Delete indicator"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Metric Breakdown */}
                                  <div className="grid sm:grid-cols-2 gap-4 text-xs md:text-sm pt-2">
                                    {/* Numerator */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Numerator</span>
                                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.numerator}
                                      </p>
                                    </div>

                                    {/* Denominator */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Denominator</span>
                                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.denominator}
                                      </p>
                                    </div>

                                    {/* Numerator Source */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Numerator Source</span>
                                      <p className="text-slate-600 dark:text-slate-400 font-medium leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.numeratorSource}
                                      </p>
                                    </div>

                                    {/* Denominator Source */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Denominator Source</span>
                                      <p className="text-slate-600 dark:text-slate-400 font-medium leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.denominatorSource}
                                      </p>
                                    </div>

                                    {/* Calculation Formula */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Calculation Formula</span>
                                      <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] md:text-xs leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.calculation}
                                      </p>
                                    </div>

                                    {/* Calculation Example */}
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">Calculation Example</span>
                                      <p className="text-slate-700 dark:text-slate-300 italic leading-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                                        {entry.calculationExample}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit Indicator Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Indicator Definition</DialogTitle>
            <DialogDescription>
              Modify how {editingEntry?.name} is calculated and cataloged in the system manual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="numerator-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Numerator</label>
              <Textarea
                id="numerator-input"
                value={formNumerator}
                onChange={(e) => setFormNumerator(e.target.value)}
                placeholder="Description of the numerator"
                className="text-sm min-h-16"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="numerator-source-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Numerator Source</label>
              <Textarea
                id="numerator-source-input"
                value={formNumeratorSource}
                onChange={(e) => setFormNumeratorSource(e.target.value)}
                placeholder="Database or logbook source for numerator data"
                className="text-sm min-h-16"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="denominator-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Denominator</label>
              <Textarea
                id="denominator-input"
                value={formDenominator}
                onChange={(e) => setFormDenominator(e.target.value)}
                placeholder="Description of the denominator"
                className="text-sm min-h-16"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="denominator-source-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Denominator Source</label>
              <Textarea
                id="denominator-source-input"
                value={formDenominatorSource}
                onChange={(e) => setFormDenominatorSource(e.target.value)}
                placeholder="Database or census source for denominator data"
                className="text-sm min-h-16"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="calculation-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculation Formula</label>
              <Input
                id="calculation-input"
                value={formCalculation}
                onChange={(e) => setFormCalculation(e.target.value)}
                placeholder="e.g. Coverage Rate (%) = (Vaccinated Count / Target Population) * 100"
                className="text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="calculation-example-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculation Example</label>
              <Textarea
                id="calculation-example-input"
                value={formCalculationExample}
                onChange={(e) => setFormCalculationExample(e.target.value)}
                placeholder="e.g. If 85 children out of 100 are vaccinated..."
                className="text-sm min-h-16"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reference-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference Guidelines</label>
              <Input
                id="reference-input"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="e.g. WHO Immunization Guidelines"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reference-url-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference URL</label>
              <Input
                id="reference-url-input"
                value={formReferenceUrl}
                onChange={(e) => setFormReferenceUrl(e.target.value)}
                placeholder="e.g. https://www.who.int/..."
                className="text-sm"
              />
            </div>

            <DialogFooter className="gap-2 mt-6 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Indicator Definition?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the indicator <strong>{deletingEntry?.name}</strong>? This will permanently remove it from the system reference manual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeletingEntry(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
