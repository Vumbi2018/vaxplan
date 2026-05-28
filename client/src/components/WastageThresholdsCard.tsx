import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, RotateCcw, Droplets } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWastageThresholds } from "@/hooks/useWastageThresholds";
import {
  DEFAULT_WASTAGE_THRESHOLDS,
  type WastageThreshold,
} from "@/lib/wastageThresholds";

type DraftRow = {
  antigen: string;
  warn: string;
  max: string;
  isOverride: boolean;
};

function buildDraft(
  defaults: Record<string, WastageThreshold>,
  overrides: Record<string, WastageThreshold>,
): DraftRow[] {
  const keys: string[] = Array.from(
    new Set<string>([...Object.keys(defaults), ...Object.keys(overrides)]),
  );
  keys.sort((a, b) => a.localeCompare(b));
  return keys.map((antigen) => {
    const o = overrides[antigen];
    const d = defaults[antigen] ?? { warn: 8, max: 10 };
    const active = o ?? d;
    return {
      antigen,
      warn: String(active.warn),
      max: String(active.max),
      isOverride: !!o,
    };
  });
}

interface Props {
  isNationalAdmin: boolean;
}

export function WastageThresholdsCard({ isNationalAdmin }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { defaults, overrides, isLoading } = useWastageThresholds();

  const baseDefaults = useMemo(
    () => (Object.keys(defaults).length ? defaults : DEFAULT_WASTAGE_THRESHOLDS),
    [defaults],
  );

  const [rows, setRows] = useState<DraftRow[]>(() => buildDraft(baseDefaults, overrides));

  useEffect(() => {
    setRows(buildDraft(baseDefaults, overrides));
  }, [baseDefaults, overrides]);

  const save = useMutation({
    mutationFn: async (payload: Record<string, { warn: number; max: number } | null>) => {
      return apiRequest("PUT", "/api/me/tenant/wastage-thresholds", { thresholds: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/me/tenant/wastage-thresholds"] });
      toast({
        title: "Wastage thresholds saved",
        description: "Reports will now color chips with your tenant's custom limits.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save thresholds",
        description: err?.message || "Could not save wastage thresholds.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (idx: number, field: "warn" | "max", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value, isOverride: true } : r)));
  };

  const handleResetRow = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const d = baseDefaults[r.antigen] ?? { warn: 8, max: 10 };
        return { ...r, warn: String(d.warn), max: String(d.max), isOverride: false };
      }),
    );
  };

  const validate = (): {
    payload: Record<string, { warn: number; max: number } | null>;
    error?: string;
  } => {
    const payload: Record<string, { warn: number; max: number } | null> = {};
    for (const r of rows) {
      const d = baseDefaults[r.antigen];
      if (!r.isOverride) {
        payload[r.antigen] = null;
        continue;
      }
      const warn = Number(r.warn);
      const max = Number(r.max);
      if (!Number.isFinite(warn) || !Number.isFinite(max)) {
        return { payload, error: `${r.antigen}: warn and max must be numbers.` };
      }
      if (warn < 0 || max < 0 || warn > 100 || max > 100) {
        return { payload, error: `${r.antigen}: values must be between 0 and 100.` };
      }
      if (max < warn) {
        return { payload, error: `${r.antigen}: max must be greater than or equal to warn.` };
      }
      if (d && warn === d.warn && max === d.max) {
        payload[r.antigen] = null;
      } else {
        payload[r.antigen] = { warn, max };
      }
    }
    return { payload };
  };

  const handleSave = () => {
    const { payload, error } = validate();
    if (error) {
      toast({ title: "Invalid thresholds", description: error, variant: "destructive" });
      return;
    }
    save.mutate(payload);
  };

  const handleResetAll = () => {
    save.mutate({});
  };

  const overrideCount = rows.filter((r) => r.isOverride).length;

  return (
    <Card className="border border-border/80 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Vaccine Wastage Thresholds
              {overrideCount > 0 && (
                <Badge variant="secondary" data-testid="badge-wastage-override-count">
                  {overrideCount} custom
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Per-antigen warn / max wastage percentages used to color the chips in the Monthly Reports
              table and the Compile Monthly Report wizard. Leave a row untouched (or reset it) to fall
              back to the WHO default.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNationalAdmin && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Only national admins can change these thresholds. You can review the active values below.
            </span>
          </div>
        )}

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 font-semibold text-left">
              <tr>
                <th className="px-3 py-2">Antigen</th>
                <th className="px-3 py-2 w-28">Warn (%)</th>
                <th className="px-3 py-2 w-28">Max (%)</th>
                <th className="px-3 py-2 w-32">WHO default</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    Loading thresholds…
                  </td>
                </tr>
              )}
              {!isLoading && rows.map((r, idx) => {
                const d = baseDefaults[r.antigen];
                return (
                  <tr key={r.antigen} className={r.isOverride ? "bg-amber-500/5" : ""}>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.antigen}</span>
                        {r.isOverride && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            custom
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={r.warn}
                        onChange={(e) => handleChange(idx, "warn", e.target.value)}
                        disabled={!isNationalAdmin || save.isPending}
                        className="h-8 text-xs font-mono"
                        data-testid={`input-wastage-warn-${r.antigen}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={r.max}
                        onChange={(e) => handleChange(idx, "max", e.target.value)}
                        disabled={!isNationalAdmin || save.isPending}
                        className="h-8 text-xs font-mono"
                        data-testid={`input-wastage-max-${r.antigen}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">
                      {d ? `${d.warn}% / ${d.max}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isNationalAdmin && r.isOverride && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => handleResetRow(idx)}
                          disabled={save.isPending}
                          data-testid={`button-wastage-reset-${r.antigen}`}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isNationalAdmin && (
          <>
            <Separator />
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetAll}
                disabled={save.isPending || overrideCount === 0}
                data-testid="button-wastage-reset-all"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset all to WHO defaults
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={save.isPending}
                data-testid="button-wastage-save"
              >
                {save.isPending ? "Saving…" : "Save thresholds"}
              </Button>
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground italic">
          Tip: Set <Label className="text-[11px] font-semibold inline">warn</Label> to the percentage where the
          chip turns amber, and <Label className="text-[11px] font-semibold inline">max</Label> to the WHO max
          (or your country's tighter target) where it turns red.
        </p>
      </CardContent>
    </Card>
  );
}
