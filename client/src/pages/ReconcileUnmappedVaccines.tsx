import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { canReconcileUnmappedVaccines } from "@/lib/permissions";

interface UnmappedRow {
  code: string;
  sessionCount: number;
  totalDoses: number;
}

interface CanonicalCode {
  code: string;
  label: string;
  antigen: string;
  doseNumber: number;
}

interface UnmappedResponse {
  unmapped: UnmappedRow[];
  canonical: CanonicalCode[];
}

export default function ReconcileUnmappedVaccines() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ from: string; to: string; row: UnmappedRow } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const allowed = canReconcileUnmappedVaccines(user as any);

  const { data, isLoading, error } = useQuery<UnmappedResponse>({
    queryKey: ["/api/sessions/unmapped-antigens"],
    queryFn: async () => {
      const res = await fetch("/api/sessions/unmapped-antigens");
      if (!res.ok) throw new Error("Failed to load unmapped antigens");
      return res.json();
    },
    enabled: allowed,
  });

  const canonical = data?.canonical ?? [];
  const unmapped = data?.unmapped ?? [];

  const groupedCanonical = useMemo<Array<[string, CanonicalCode[]]>>(() => {
    const groups = new Map<string, CanonicalCode[]>();
    for (const c of canonical) {
      const arr = groups.get(c.antigen) ?? [];
      arr.push(c);
      groups.set(c.antigen, arr);
    }
    const entries: Array<[string, CanonicalCode[]]> = Array.from(groups.entries());
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [canonical]);

  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Only national and district admins can reconcile unmapped vaccine codes.
          </CardContent>
        </Card>
      </div>
    );
  }

  const runReconcile = async (fromCode: string, toCode: string) => {
    setBusy(fromCode);
    try {
      const result = await apiRequest<{
        updatedSessionCount: number;
        totalDosesMoved: number;
        canonicalLabel: string;
      }>("POST", "/api/sessions/reconcile-unmapped-antigens", { fromCode, toCode });
      toast({
        title: "Reconciled",
        description: `Moved ${result.totalDosesMoved} dose${result.totalDosesMoved === 1 ? "" : "s"} of "${fromCode}" into ${result.canonicalLabel} across ${result.updatedSessionCount} session${result.updatedSessionCount === 1 ? "" : "s"}.`,
      });
      setSelections((s) => {
        const next = { ...s };
        delete next[fromCode];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/unmapped-antigens"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/history"] });
    } catch (err: any) {
      toast({
        title: "Reconcile failed",
        description: err?.message || "Could not reconcile this code.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Reconcile Unmapped Vaccines</h1>
          <Badge variant="secondary" data-testid="badge-unmapped-count">{unmapped.length}</Badge>
        </div>
        <Link
          href="/sessions/history"
          className="text-sm text-muted-foreground hover:text-foreground underline"
          data-testid="link-back-to-history"
        >
          Back to session history
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Stale vaccine codes saved against past sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These codes don't match any antigen in your tenant's current vaccine schedule.
            Pick the canonical code each one should map to and confirm; the doses will move
            out of <code className="text-xs">perAntigenUnmapped</code> and into the regular
            per-antigen totals across every affected session.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="text-sm text-destructive py-6 text-center">
              Could not load unmapped antigens.
            </div>
          ) : unmapped.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center flex flex-col items-center gap-2" data-testid="empty-no-unmapped">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              No unmapped vaccine codes — every recorded dose is on a canonical code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Stale code</th>
                    <th className="text-right p-2">Sessions</th>
                    <th className="text-right p-2">Total doses</th>
                    <th className="text-left p-2">Map to</th>
                    <th className="text-right p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {unmapped.map((row) => {
                    const selected = selections[row.code] ?? "";
                    return (
                      <tr
                        key={row.code}
                        className="border-b last:border-0 bg-amber-50/40 dark:bg-amber-900/10"
                        data-testid={`row-unmapped-${row.code.toLowerCase()}`}
                      >
                        <td className="p-2 font-medium">
                          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.code}
                          </span>
                        </td>
                        <td className="p-2 text-right tabular-nums">{row.sessionCount.toLocaleString()}</td>
                        <td className="p-2 text-right tabular-nums font-semibold">{row.totalDoses.toLocaleString()}</td>
                        <td className="p-2">
                          <Select
                            value={selected}
                            onValueChange={(v) => setSelections((s) => ({ ...s, [row.code]: v }))}
                          >
                            <SelectTrigger
                              className="h-8 w-56"
                              data-testid={`select-target-${row.code.toLowerCase()}`}
                            >
                              <SelectValue placeholder="Pick canonical code…" />
                            </SelectTrigger>
                            <SelectContent>
                              {groupedCanonical.length === 0 ? (
                                <SelectItem value="__none" disabled>No vaccine schedule configured</SelectItem>
                              ) : (
                                groupedCanonical.map((entry) => (
                                  <div key={entry[0]}>
                                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {entry[0]}
                                    </div>
                                    {entry[1].map((c: CanonicalCode) => (
                                      <SelectItem key={c.code} value={c.code}>
                                        {c.label} <span className="text-muted-foreground ml-1">({c.code})</span>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            size="sm"
                            data-testid={`button-reconcile-${row.code.toLowerCase()}`}
                            disabled={!selected || busy === row.code}
                            onClick={() => setConfirm({ from: row.code, to: selected, row })}
                          >
                            {busy === row.code ? "Reconciling…" : "Reconcile"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reconcile "{confirm?.from}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {confirm?.row.totalDoses.toLocaleString()} dose
              {confirm?.row.totalDoses === 1 ? "" : "s"} across{" "}
              {confirm?.row.sessionCount.toLocaleString()} session
              {confirm?.row.sessionCount === 1 ? "" : "s"} from the unmapped bucket into{" "}
              <strong>{confirm?.to}</strong>. The change is audit-logged but cannot be
              automatically undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reconcile">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-reconcile"
              onClick={() => confirm && runReconcile(confirm.from, confirm.to)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
