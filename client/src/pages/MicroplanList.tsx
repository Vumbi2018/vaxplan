import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable } from "@/components/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { 
  Calendar, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  FolderOpen 
} from "lucide-react";
import type { SessionPlan } from "@shared/schema";

interface MicroplanListProps {
  planType: "routine" | "campaign";
}

export default function MicroplanList({ planType }: MicroplanListProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data: microplans, isLoading: loadingPlans } = useQuery<any[]>({
    queryKey: ["/api/microplans"],
  });

  const { data: sessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });

  const sessionsByPlan = useMemo(() => {
    const m = new Map<number, SessionPlan[]>();
    for (const s of sessions ?? []) {
      if (s.microplanId == null) continue;
      const arr = m.get(s.microplanId) ?? [];
      arr.push(s);
      m.set(s.microplanId, arr);
    }
    return m;
  }, [sessions]);

  const handleDelete = async (id: number) => {
    setDeleteBusy(true);
    try {
      await apiRequest("DELETE", `/api/microplans/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/microplans"] });
      toast({
        title: "Microplan deleted",
        description: "The microplan has been permanently deleted.",
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete the microplan.",
        variant: "destructive",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const filtered = useMemo(() => {
    return (microplans ?? []).filter((m) => {
      const pt = String(m.planType ?? "");
      return planType === "campaign"
        ? pt.includes("campaign")
        : !pt.includes("campaign");
    });
  }, [microplans, planType]);

  const columns = useMemo(() => [
    {
      key: "name",
      header: "Plan Name",
      sortable: true,
      render: (m: any) => (
        <button
          onClick={() => setLocation(`/microplans/${planType === "campaign" ? "campaigns" : "routine"}/${m.id}`)}
          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left text-sm"
          data-testid={`button-open-microplan-name-${m.id}`}
        >
          {m.name}
        </button>
      ),
    },
    {
      key: "period",
      header: "Quarter / Year",
      sortable: true,
      render: (m: any) => `Q${m.quarter} ${m.year}`,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (m: any) => {
        const s = String(m.status ?? "draft").toLowerCase();
        const label =
          s === "pending"
            ? "Pending approval"
            : s === "approved"
              ? "Approved"
              : s === "locked"
                ? "Locked"
                : "Draft";
        const variant: "default" | "secondary" | "outline" =
          s === "approved" ? "default" : s === "pending" ? "secondary" : "outline";
        return (
          <Badge variant={variant} className="gap-1 rounded-md capitalize" data-testid={`microplan-status-${m.id}`}>
            {label}
          </Badge>
        );
      },
    },
    {
      key: "planned",
      header: "Planned Sessions",
      sortable: true,
      render: (m: any) => {
        const rows = sessionsByPlan.get(m.id) ?? [];
        const completed = rows.filter((s) => s.completedAt || (s as any).isAchieved).length;
        const planned = rows.length - completed;
        return (
          <Badge variant="secondary" className="gap-1 rounded-md">
            <Calendar className="h-3 w-3 text-indigo-500" />
            {planned} planned
          </Badge>
        );
      },
    },
    {
      key: "completed",
      header: "Completed Sessions",
      sortable: true,
      render: (m: any) => {
        const rows = sessionsByPlan.get(m.id) ?? [];
        const completed = rows.filter((s) => s.completedAt || (s as any).isAchieved).length;
        return (
          <Badge variant="outline" className="gap-1 rounded-md border-emerald-500/35 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {completed} done
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (m: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation(`/microplans/${planType === "campaign" ? "campaigns" : "routine"}/${m.id}`)}
            className="rounded-xl font-semibold text-xs px-3"
            data-testid={`button-open-microplan-${m.id}`}
          >
            Open Plan
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={() => setDeleteId(m.id)}
            data-testid={`button-delete-microplan-${m.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [sessionsByPlan, planType, setLocation]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            {planType === "campaign" ? (
              <>
                <Sparkles className="h-8 w-8 text-indigo-500" />
                SIA Campaigns
              </>
            ) : (
              <>
                <Calendar className="h-8 w-8 text-indigo-500" />
                Routine Microplanning
              </>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Manage, review, and author hierarchical health microplans for target communities.
          </p>
        </div>
        <Button
          onClick={() => setLocation(`/microplans/${planType === "campaign" ? "campaigns" : "routine"}/new`)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-bold shadow-md flex items-center gap-2 text-sm whitespace-nowrap self-start sm:self-center"
          data-testid="button-create-new-microplan"
        >
          <Plus className="h-4 w-4" />
          {planType === "campaign" ? "Create Campaign Plan" : "Create Routine Plan"}
        </Button>
      </div>

      <Card className="rounded-3xl border border-border/80 shadow-lg bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-500" />
            Saved Microplans
          </CardTitle>
          <CardDescription>
            Click a microplan's name or the Open button to edit its target locations, forecast, budgets, and scheduling parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPlans ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
              <p className="text-muted-foreground text-xs mt-3">Loading plans...</p>
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              searchable={true}
              searchKeys={["name"]}
              pageSize={10}
              emptyMessage="No saved microplans found. Click the button above to create your first plan."
              searchPlaceholder="Search saved plans..."
            />
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete saved microplan?"
        description="This will permanently delete this microplan and all of its planned sessions. This action cannot be undone."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        isPending={deleteBusy}
      />
    </div>
  );
}
