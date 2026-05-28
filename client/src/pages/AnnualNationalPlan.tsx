import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileText, Lock } from "lucide-react";
import type { AnnualImmunizationPlan } from "@shared/schema";

const ANTIGENS = ["BCG", "DTP1", "DTP3", "MCV1", "MCV2", "Polio3", "PCV3", "Rota"];
const FUNDING_SOURCES = ["government", "gavi", "who", "unicef", "other"];

export default function AnnualNationalPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState<{
    year: number;
    totalTargetPopulation: string;
    survivingInfants: string;
    pregnantWomen: string;
    budgetEnvelope: string;
    priorities: string;
    narrative: string;
    fundingMix: Record<string, string>;
    targetsByAntigen: Record<string, string>;
  }>({
    year: new Date().getFullYear(),
    totalTargetPopulation: "",
    survivingInfants: "",
    pregnantWomen: "",
    budgetEnvelope: "",
    priorities: "",
    narrative: "",
    fundingMix: { government: "", gavi: "", who: "", unicef: "", other: "" },
    targetsByAntigen: Object.fromEntries(ANTIGENS.map((a) => [a, ""])),
  });

  const role = (user as any)?.role;
  const canEdit = role === "national_admin" || role === "gis_specialist";

  const { data: plans = [], isLoading } = useQuery<AnnualImmunizationPlan[]>({
    queryKey: ["/api/annual-plans"],
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        year: draft.year,
        status: "draft",
        totalTargetPopulation: draft.totalTargetPopulation ? parseInt(draft.totalTargetPopulation, 10) : null,
        survivingInfants: draft.survivingInfants ? parseInt(draft.survivingInfants, 10) : null,
        pregnantWomen: draft.pregnantWomen ? parseInt(draft.pregnantWomen, 10) : null,
        budgetEnvelope: draft.budgetEnvelope || null,
        fundingMix: Object.fromEntries(
          Object.entries(draft.fundingMix)
            .filter(([, v]) => v !== "")
            .map(([k, v]) => [k, parseFloat(v) || 0]),
        ),
        targetsByAntigen: Object.fromEntries(
          Object.entries(draft.targetsByAntigen)
            .filter(([, v]) => v !== "")
            .map(([k, v]) => [k, parseFloat(v) || 0]),
        ),
        priorities: draft.priorities || null,
        narrative: draft.narrative || null,
      };
      return apiRequest("POST", "/api/annual-plans", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annual-plans"] });
      toast({ title: "Annual plan created" });
    },
    onError: (err: any) => {
      toast({ title: "Could not create plan", description: err?.message, variant: "destructive" });
    },
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/annual-plans/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annual-plans"] });
      toast({ title: "Annual plan approved" });
    },
  });

  if (!canEdit && plans.length === 0 && !isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> National plan</CardTitle>
            <CardDescription>No annual plan has been published yet for your country.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Annual National Immunization Plan
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          One country-level plan per year. Sets coverage targets, budget envelope, and funding mix that health-facility microplans inherit from.
        </p>
      </div>

      <Tabs defaultValue="existing">
        <TabsList>
          <TabsTrigger value="existing">Existing plans ({plans.length})</TabsTrigger>
          {canEdit && <TabsTrigger value="new">Create new</TabsTrigger>}
        </TabsList>

        <TabsContent value="existing" className="space-y-3 mt-4">
          {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!isLoading && plans.length === 0 && (
            <p className="text-muted-foreground text-sm">No plans yet. {canEdit ? "Use the 'Create new' tab." : ""}</p>
          )}
          {plans.map((p) => (
            <Card key={p.id} data-testid={`card-annual-plan-${p.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Plan year {p.year}
                      <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Target pop {p.totalTargetPopulation?.toLocaleString() ?? "—"} · Surviving infants{" "}
                      {p.survivingInfants?.toLocaleString() ?? "—"} · Budget envelope{" "}
                      {p.budgetEnvelope ? `$${Number(p.budgetEnvelope).toLocaleString()}` : "—"}
                    </CardDescription>
                  </div>
                  {canEdit && p.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => approveMut.mutate(p.id)}
                      disabled={approveMut.isPending}
                      data-testid={`button-approve-${p.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </CardHeader>
              {(p.priorities || p.narrative || (p.targetsByAntigen && Object.keys(p.targetsByAntigen as any).length > 0)) && (
                <CardContent className="text-sm space-y-2">
                  {p.priorities && (
                    <div>
                      <div className="font-medium">Priorities</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">{p.priorities}</div>
                    </div>
                  )}
                  {p.targetsByAntigen && Object.keys(p.targetsByAntigen as any).length > 0 && (
                    <div>
                      <div className="font-medium">Coverage targets</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(p.targetsByAntigen as any).map(([k, v]) => (
                          <Badge key={k} variant="outline">{k}: {String(v)}%</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.fundingMix && Object.keys(p.fundingMix as any).length > 0 && (
                    <div>
                      <div className="font-medium">Funding mix</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(p.fundingMix as any).map(([k, v]) => (
                          <Badge key={k} variant="outline">{k}: {String(v)}%</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {canEdit && (
          <TabsContent value="new" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>New annual plan</CardTitle>
                <CardDescription>One plan per year. You'll be blocked if a plan already exists for the chosen year.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={draft.year}
                      onChange={(e) => setDraft({ ...draft, year: parseInt(e.target.value, 10) || draft.year })}
                      data-testid="input-year"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalpop">Total target population</Label>
                    <Input
                      id="totalpop"
                      type="number"
                      value={draft.totalTargetPopulation}
                      onChange={(e) => setDraft({ ...draft, totalTargetPopulation: e.target.value })}
                      data-testid="input-total-pop"
                    />
                  </div>
                  <div>
                    <Label htmlFor="surv">Surviving infants</Label>
                    <Input
                      id="surv"
                      type="number"
                      value={draft.survivingInfants}
                      onChange={(e) => setDraft({ ...draft, survivingInfants: e.target.value })}
                      data-testid="input-surviving-infants"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preg">Pregnant women</Label>
                    <Input
                      id="preg"
                      type="number"
                      value={draft.pregnantWomen}
                      onChange={(e) => setDraft({ ...draft, pregnantWomen: e.target.value })}
                      data-testid="input-pregnant"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="budget">Budget envelope (USD)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={draft.budgetEnvelope}
                    onChange={(e) => setDraft({ ...draft, budgetEnvelope: e.target.value })}
                    data-testid="input-budget-envelope"
                  />
                </div>

                <div>
                  <Label>Funding mix (% per source — should sum to ~100)</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {FUNDING_SOURCES.map((src) => (
                      <div key={src}>
                        <Label htmlFor={`fm-${src}`} className="text-xs capitalize">{src}</Label>
                        <Input
                          id={`fm-${src}`}
                          type="number"
                          placeholder="0"
                          value={draft.fundingMix[src]}
                          onChange={(e) =>
                            setDraft({ ...draft, fundingMix: { ...draft.fundingMix, [src]: e.target.value } })
                          }
                          data-testid={`input-funding-${src}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Coverage targets (% per antigen)</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {ANTIGENS.map((a) => (
                      <div key={a}>
                        <Label htmlFor={`tg-${a}`} className="text-xs">{a}</Label>
                        <Input
                          id={`tg-${a}`}
                          type="number"
                          placeholder="0"
                          value={draft.targetsByAntigen[a]}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              targetsByAntigen: { ...draft.targetsByAntigen, [a]: e.target.value },
                            })
                          }
                          data-testid={`input-target-${a}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="priorities">Strategic priorities</Label>
                  <Textarea
                    id="priorities"
                    rows={3}
                    placeholder="Top 3-5 strategic priorities for this year (e.g. close the zero-dose gap in Eastern Province; introduce HPV nationwide)…"
                    value={draft.priorities}
                    onChange={(e) => setDraft({ ...draft, priorities: e.target.value })}
                    data-testid="textarea-priorities"
                  />
                </div>

                <div>
                  <Label htmlFor="narrative">Plan narrative (or link to PDF)</Label>
                  <Textarea
                    id="narrative"
                    rows={4}
                    value={draft.narrative}
                    onChange={(e) => setDraft({ ...draft, narrative: e.target.value })}
                    data-testid="textarea-narrative"
                  />
                </div>

                <Button
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  data-testid="button-create-plan"
                >
                  {createMut.isPending ? "Saving…" : "Create plan"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
