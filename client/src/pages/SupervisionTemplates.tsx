import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Plus, Trash2, ArrowUp, ArrowDown, Pencil, ArrowLeft,
  MapPin, Image as ImageIcon, ToggleLeft, Hash, Type as TypeIcon, ListChecks,
  CheckSquare, Star, Calendar as CalendarIcon, ShieldAlert, Repeat, GitBranch,
} from "lucide-react";
import {
  CHECKLIST_QUESTION_TYPES,
  SHOW_WHEN_ANY,
  type ChecklistQuestionType,
  type ChecklistTemplateItem,
  type ChecklistTemplate,
} from "@shared/supervisionChecklist";

// The trigger answers a parent question can offer a follow-up question.
function showWhenOptions(parent: ChecklistTemplateItem): { value: string; label: string }[] {
  const t = parent.type;
  if (t === "yes_no") {
    return [
      { value: "yes", label: "answered Yes" },
      { value: "no", label: "answered No" },
      { value: "na", label: "answered N/A" },
      { value: SHOW_WHEN_ANY, label: "has any answer" },
    ];
  }
  if (t === "true_false") {
    return [
      { value: "yes", label: "answered True" },
      { value: "no", label: "answered False" },
      { value: SHOW_WHEN_ANY, label: "has any answer" },
    ];
  }
  if (t === "single_select" || t === "multi_select") {
    return [
      ...(parent.options || []).filter((o) => o.trim()).map((o) => ({ value: o, label: `is "${o}"` })),
      { value: SHOW_WHEN_ANY, label: "has any answer" },
    ];
  }
  return [{ value: SHOW_WHEN_ANY, label: "has any answer" }];
}

const TYPE_ICON: Record<ChecklistQuestionType, any> = {
  yes_no: ToggleLeft,
  true_false: ToggleLeft,
  text: TypeIcon,
  number: Hash,
  single_select: ListChecks,
  multi_select: CheckSquare,
  rating: Star,
  date: CalendarIcon,
  gps: MapPin,
  image: ImageIcon,
};

function typeLabel(t: ChecklistQuestionType): string {
  return CHECKLIST_QUESTION_TYPES.find((q) => q.value === t)?.label ?? t;
}

function newItem(): ChecklistTemplateItem {
  return { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: "yes_no", label: "", required: false };
}

export default function SupervisionTemplates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const admin = (user as any)?.role === "national_admin";

  const { data: templates = [], isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/supervision-checklist-templates"],
  });

  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<ChecklistTemplateItem[]>([]);

  const openEditor = (tpl?: ChecklistTemplate) => {
    if (tpl) {
      setEditing(tpl);
      setIsNew(false);
      setName(tpl.name);
      setDescription(tpl.description || "");
      setActive(tpl.isActive);
      setItems((tpl.items || []).map((i) => ({ ...i })));
    } else {
      setEditing({} as ChecklistTemplate);
      setIsNew(true);
      setName("");
      setDescription("");
      setActive(true);
      setItems([newItem()]);
    }
  };
  const closeEditor = () => setEditing(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), description: description.trim() || null, isActive: active, items };
      if (isNew) return await apiRequest("POST", "/api/supervision-checklist-templates", payload);
      return await apiRequest("PATCH", `/api/supervision-checklist-templates/${editing!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-checklist-templates"] });
      toast({ title: isNew ? "Checklist created" : "Checklist saved" });
      closeEditor();
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => await apiRequest("DELETE", `/api/supervision-checklist-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-checklist-templates"] });
      toast({ title: "Checklist deleted" });
    },
    onError: (e: any) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  const setItem = (idx: number, patch: Partial<ChecklistTemplateItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const moveItem = (idx: number, dir: -1 | 1) =>
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const canSave =
    name.trim().length > 0 &&
    items.length > 0 &&
    items.every((it) => it.label.trim().length > 0) &&
    items.every((it) => !["single_select", "multi_select"].includes(it.type) || (it.options || []).filter((o) => o.trim()).length > 0) &&
    // A follow-up must point at a real parent question.
    items.every((it) => !it.parentId || items.some((p) => p.id === it.parentId));

  if (!admin) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center text-center py-16 gap-3">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
            <h2 className="text-lg font-semibold">National admin access required</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Supervision checklists are built by national-level administrators and then become available to all
              lower levels in your country. Ask your national admin to set these up.
            </p>
            <Button variant="outline" onClick={() => setLocation("/supervision")}>Back to supervision</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 dark:text-indigo-400">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Supervision Checklists</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Build reusable checklists with any mix of question types. Published checklists become available to every
              level in your country when scheduling or conducting a supervisory visit.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setLocation("/supervision")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Supervision
          </Button>
          <Button onClick={() => openEditor()} className="gap-1.5" data-testid="btn-new-template">
            <Plus className="h-4 w-4" /> New checklist
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading checklists…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-16 gap-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No checklists yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Create your first supervision checklist. You can combine Yes/No, True/False, text, numbers, choice lists,
              ratings, dates, GPS location capture, and photos.
            </p>
            <Button onClick={() => openEditor()} className="gap-1.5"><Plus className="h-4 w-4" /> New checklist</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} data-testid={`template-card-${tpl.id}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{tpl.name}</h3>
                    {tpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>}
                  </div>
                  <Badge variant={tpl.isActive ? "default" : "secondary"}>
                    {tpl.isActive ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(tpl.items || []).slice(0, 6).map((it) => {
                    const Icon = TYPE_ICON[it.type] || TypeIcon;
                    return (
                      <span key={it.id} className="inline-flex items-center gap-1 text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        <Icon className="h-3 w-3" /> {typeLabel(it.type)}
                      </span>
                    );
                  })}
                  {(tpl.items || []).length > 6 && (
                    <span className="text-[11px] text-muted-foreground">+{tpl.items.length - 6} more</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{(tpl.items || []).length} question(s)</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEditor(tpl)} className="gap-1.5" data-testid={`btn-edit-${tpl.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete checklist "${tpl.name}"? Visits already recorded with it keep their answers.`)) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                    data-testid={`btn-delete-${tpl.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "New checklist" : "Edit checklist"}</DialogTitle>
            <DialogDescription>
              Add questions and choose a type for each. Publish it to make it available across your country.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Checklist name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Routine facility supervision" data-testid="input-template-name" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={active} onCheckedChange={setActive} data-testid="switch-template-active" />
                  <span className="text-sm">{active ? "Published (usable by all levels)" : "Draft (hidden)"}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="When should supervisors use this checklist?" />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-base">Questions</Label>
              <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, newItem()])} className="gap-1.5" data-testid="btn-add-question">
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const needsOptions = it.type === "single_select" || it.type === "multi_select";
                return (
                  <div key={it.id} className="border rounded-xl p-3 space-y-3 bg-card" data-testid={`question-row-${idx}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-6">{idx + 1}.</span>
                      <Input
                        value={it.label}
                        onChange={(e) => setItem(idx, { label: e.target.value })}
                        placeholder="Question text"
                        className="flex-1"
                        data-testid={`input-question-label-${idx}`}
                      />
                      <Button size="icon" variant="ghost" onClick={() => moveItem(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                      <div>
                        <Label className="text-xs">Answer type</Label>
                        <Select value={it.type} onValueChange={(v) => setItem(idx, { type: v as ChecklistQuestionType })}>
                          <SelectTrigger data-testid={`select-question-type-${idx}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CHECKLIST_QUESTION_TYPES.map((q) => (
                              <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {CHECKLIST_QUESTION_TYPES.find((q) => q.value === it.type)?.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 md:pt-6">
                        <Switch checked={!!it.required} onCheckedChange={(v) => setItem(idx, { required: v })} />
                        <span className="text-sm">Required</span>
                      </div>
                    </div>

                    <div className="pl-8">
                      <Input
                        value={it.helpText || ""}
                        onChange={(e) => setItem(idx, { helpText: e.target.value })}
                        placeholder="Helper text / instructions (optional)"
                        className="text-xs"
                      />
                    </div>

                    {needsOptions && (
                      <div className="pl-8 space-y-2">
                        <Label className="text-xs">Options</Label>
                        {(it.options || [""]).map((opt, oi) => (
                          <div key={oi} className="flex gap-2">
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const opts = [...(it.options || [""])];
                                opts[oi] = e.target.value;
                                setItem(idx, { options: opts });
                              }}
                              placeholder={`Option ${oi + 1}`}
                              className="text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setItem(idx, { options: (it.options || []).filter((_, k) => k !== oi) })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={() => setItem(idx, { options: [...(it.options || []), ""] })} className="gap-1">
                          <Plus className="h-3.5 w-3.5" /> Add option
                        </Button>
                      </div>
                    )}

                    {it.type === "number" && (
                      <div className="pl-8 grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Min (optional)</Label>
                          <Input type="number" value={it.min ?? ""} onChange={(e) => setItem(idx, { min: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label className="text-xs">Max (optional)</Label>
                          <Input type="number" value={it.max ?? ""} onChange={(e) => setItem(idx, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        </div>
                      </div>
                    )}

                    {it.type === "rating" && (
                      <div className="pl-8 flex items-center gap-2">
                        <Switch checked={!!it.includeInScore} onCheckedChange={(v) => setItem(idx, { includeInScore: v })} data-testid={`switch-rating-score-${idx}`} />
                        <span className="text-sm">Count this rating toward the visit score</span>
                      </div>
                    )}
                    {(it.type === "yes_no" || it.type === "true_false") && (
                      <div className="pl-8 flex items-center gap-2">
                        <Switch checked={it.includeInScore !== false} onCheckedChange={(v) => setItem(idx, { includeInScore: v })} data-testid={`switch-yn-score-${idx}`} />
                        <span className="text-sm">Count this question toward the visit score</span>
                      </div>
                    )}

                    {/* Repeat configuration */}
                    <div className="pl-8 space-y-3 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <Switch
                          checked={!!it.repeatable}
                          onCheckedChange={(v) => setItem(idx, { repeatable: v })}
                          data-testid={`switch-repeatable-${idx}`}
                        />
                        <span className="text-sm">Allow multiple entries (repeat this question)</span>
                      </div>
                      {it.repeatable && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Label for each entry (optional)</Label>
                            <Input
                              value={it.repeatLabel || ""}
                              onChange={(e) => setItem(idx, { repeatLabel: e.target.value })}
                              placeholder="e.g. Vaccinator, Session, Child"
                              className="text-sm"
                              data-testid={`input-repeat-label-${idx}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max entries (optional)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={it.maxRepeats ?? ""}
                              onChange={(e) => setItem(idx, { maxRepeats: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)) })}
                              placeholder="No limit"
                              className="text-sm"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground md:col-span-2">
                            Supervisors can add as many entries as needed during a visit. Scored entries are averaged together.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Follow-up (conditional display) configuration */}
                    <div className="pl-8 space-y-3 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Show only as a follow-up (optional)</span>
                      </div>
                      {(() => {
                        const parentCandidates = items.filter(
                          (p, pi) => pi < idx && !p.parentId && !p.repeatable && p.label.trim().length > 0,
                        );
                        const parent = items.find((p) => p.id === it.parentId);
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Depends on question</Label>
                              <Select
                                value={it.parentId || "__none__"}
                                onValueChange={(v) => {
                                  if (v === "__none__") {
                                    setItem(idx, { parentId: undefined, showWhen: undefined });
                                  } else {
                                    const p = items.find((x) => x.id === v);
                                    const first = p ? showWhenOptions(p)[0]?.value : SHOW_WHEN_ANY;
                                    setItem(idx, { parentId: v, showWhen: first });
                                  }
                                }}
                              >
                                <SelectTrigger data-testid={`select-parent-${idx}`}>
                                  <SelectValue placeholder="Always show" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Always show</SelectItem>
                                  {parentCandidates.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.label.slice(0, 60)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {it.parentId && !parent && (
                                <p className="text-[11px] text-rose-500 mt-1">The chosen question was removed — pick another.</p>
                              )}
                            </div>
                            {it.parentId && parent && (
                              <div>
                                <Label className="text-xs">Show when the answer…</Label>
                                <Select value={it.showWhen || SHOW_WHEN_ANY} onValueChange={(v) => setItem(idx, { showWhen: v })}>
                                  <SelectTrigger data-testid={`select-showwhen-${idx}`}><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {showWhenOptions(parent).map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Cancel</Button>
            <Button disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()} data-testid="btn-save-template">
              {saveMutation.isPending ? "Saving…" : isNew ? "Create checklist" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
