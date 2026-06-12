import React, { useState, useMemo } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Progress } from "@/components/ui/progress";

import {

  Activity, AlertTriangle, FileText, Map as MapIcon, Settings2,

  Plus, Trash2, CheckCircle2, ClipboardList, ArrowUp, ArrowDown,

  Search, Filter, Download, TrendingUp, TrendingDown, Minus,

  FlaskConical, Clock, ShieldCheck, BarChart3, Info,

} from "lucide-react";

import { MapView } from "@/components/MapView";

import {

  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,

  PieChart, Pie, Cell, Legend,

} from "recharts";



// ─── Utility helpers ──────────────────────────────────────────────────────────



function getEpiWeek(date: Date): number {

  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));

  const week1 = new Date(d.getFullYear(), 0, 4);

  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

}



function getEpiWeekLabel(date: Date): string {

  const yr = date.getFullYear().toString().slice(2);

  return `W${String(getEpiWeek(date)).padStart(2, "0")}/${yr}`;

}



const DISEASE_COLORS: Record<string, string> = {

  afp:          "#3b82f6",

  measles:      "#f97316",

  nnt:          "#8b5cf6",

  yellow_fever: "#eab308",

  cholera:      "#14b8a6",

  covid19:      "#6b7280",

  other:        "#94a3b8",

};



const DISEASE_LABELS: Record<string, string> = {

  afp:          "AFP",

  measles:      "Measles",

  nnt:          "Neonatal Tetanus",

  yellow_fever: "Yellow Fever",

  cholera:      "Cholera",

  covid19:      "COVID-19",

  other:        "Other VPD",

};



function classificationBadgeClass(c: string) {

  return {

    confirmed:  "bg-rose-100 text-rose-800 border-rose-200",

    probable:   "bg-amber-100 text-amber-800 border-amber-200",

    suspected:  "bg-blue-100 text-blue-800 border-blue-200",

    discarded:  "bg-emerald-100 text-emerald-800 border-emerald-200",

  }[c] ?? "bg-slate-100 text-slate-800 border-slate-200";

}



// ─── WHO IDSR Thresholds ──────────────────────────────────────────────────────



function AfpRateStatus({ rate }: { rate: number }) {

  if (rate >= 2.0) return <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Meets WHO target (≥2.0)</span>;

  if (rate >= 1.0) return <span className="text-amber-600 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>Below target</span>;

  return <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>Critical – action needed</span>;

}



// ─── Component ────────────────────────────────────────────────────────────────



export default function Surveillance() {

  const queryClient = useQueryClient();

  const { toast } = useToast();



  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: cases = [], isLoading: casesLoading } = useQuery<any[]>({

    queryKey: ["/api/surveillance/cases"],

  });

  const { data: kpis } = useQuery<any>({

    queryKey: ["/api/surveillance/cases/kpis"],

  });

  const { data: templates = [] } = useQuery<any[]>({

    queryKey: ["/api/surveillance/templates"],

  });

  const { data: facilities = [] } = useQuery<any[]>({

    queryKey: ["/api/facilities"],

  });

  const { data: provinces = [] } = useQuery<any[]>({

    queryKey: ["/api/provinces"],

  });

  const { data: districts = [] } = useQuery<any[]>({

    queryKey: ["/api/districts"],

  });

  const { data: labSamples = [] } = useQuery<any[]>({

    queryKey: ["/api/surveillance/samples/all"],

    enabled: false,

  });



  // ── UI state ─────────────────────────────────────────────────────────────────

  const [isCaseReportOpen,    setIsCaseReportOpen]    = useState(false);

  const [isCaseWorkflowOpen,  setIsCaseWorkflowOpen]  = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [isAlertsModalOpen,   setIsAlertsModalOpen]   = useState(false);

  const [selectedCase,        setSelectedCase]        = useState<any>(null);
  const [caseEditData,        setCaseEditData]        = useState<any>(null);
  const [isEditingCase,       setIsEditingCase]       = useState(false);

  const [checklistAnswers,    setChecklistAnswers]     = useState<Record<string, string>>({});

  const [reportChecklistAnswers, setReportChecklistAnswers] = useState<Record<string, string>>({});

  // Chart drill-down state
  const [chartDrillDisease,   setChartDrillDisease]   = useState<string | null>(null);
  const [chartDrillWeek,      setChartDrillWeek]      = useState<string | null>(null);
  const [activeTab,           setActiveTab]           = useState("dashboard");



  // Linelist filters

  const [diseaseFilter,         setDiseaseFilter]         = useState("all");

  const [classificationFilter,  setClassificationFilter]  = useState("all");

  const [statusFilter,          setStatusFilter]          = useState("all");

  const [searchQuery,           setSearchQuery]           = useState("");



  // Location cascade filters
  const [provinceFilter,  setProvinceFilter]  = useState<number | "all">("all");
  const [districtFilter,  setDistrictFilter]  = useState<number | "all">("all");
  const [facilityFilter,  setFacilityFilter]  = useState<number | "all">("all");


  // Map filter

  const [mapDiseaseFilter,      setMapDiseaseFilter]      = useState("all");



  // Case report form

  const [formData, setFormData] = useState({

    disease: "afp", patientName: "", patientAge: "", dateOfOnset: "",

    facilityId: "", gpsLatitude: "", gpsLongitude: "", classification: "suspected",

    clinicalNotes: "", investigationDate: "", templateId: "",

  });



  // Specimens

  const [sampleForm, setSampleForm] = useState({

    sampleType: "Stool", dateCollected: new Date().toISOString().split("T")[0],

    labName: "", result: "pending",

  });



  // Template form

  const [templateData, setTemplateData] = useState<any>({

    id: undefined, name: "", disease: "afp", description: "",

    fields: [{ name: "", label: "", type: "text", required: true }],

  });



  // Alert config form

  const [alertConfigData, setAlertConfigData] = useState({

    disease: "afp", alertThreshold: 5, notifyRoles: "district_manager",

  });



  // ── Per-case sample queries ──────────────────────────────────────────────────

  const { data: selectedCaseSamples = [], refetch: refetchSamples } = useQuery<any[]>({

    queryKey: ["/api/surveillance/cases", selectedCase?.id, "samples"],

    queryFn: () =>

      selectedCase

        ? apiRequest("GET", `/api/surveillance/cases/${selectedCase.id}/samples`)

        : Promise.resolve([]),

    enabled: !!selectedCase,

  });



  // ── Mutations ────────────────────────────────────────────────────────────────

  const reportCaseMutation = useMutation({

    mutationFn: (data: any) => apiRequest("POST", "/api/surveillance/cases", data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases/kpis"] });

      setIsCaseReportOpen(false);

      setFormData({ disease: "afp", patientName: "", patientAge: "", dateOfOnset: "", facilityId: "", gpsLatitude: "", gpsLongitude: "", classification: "suspected", clinicalNotes: "", investigationDate: "", templateId: "" });

      setReportChecklistAnswers({});

      toast({ title: "Case Reported", description: "The VPD case has been submitted successfully." });

    },

    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),

  });



  const updateCaseMutation = useMutation({

    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/surveillance/cases/${id}`, data),

    onSuccess: (updated) => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });

      setSelectedCase(updated);

      toast({ title: "Case Updated" });

    },

    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),

  });



  const deleteCaseMutation = useMutation({

    mutationFn: (id: string) => apiRequest("DELETE", `/api/surveillance/cases/${id}`),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases/kpis"] });

      toast({ title: "Case Deleted" });

    },

  });



  const createTemplateMutation = useMutation({

    mutationFn: (data: any) => {

      if (data.id) {

        return apiRequest("PATCH", `/api/surveillance/templates/${data.id}`, data);

      }

      return apiRequest("POST", "/api/surveillance/templates", data);

    },

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/templates"] });

      setIsTemplateModalOpen(false);

      toast({ title: "Template Saved" });

    },

    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),

  });



  const deleteTemplateMutation = useMutation({

    mutationFn: (id: string) => apiRequest("DELETE", `/api/surveillance/templates/${id}`),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/templates"] });

      toast({ title: "Template Deleted" });

    },

  });



  const updateConfigMutation = useMutation({

    mutationFn: (data: any) => apiRequest("POST", "/api/surveillance/config", data),

    onSuccess: () => {

      setIsAlertsModalOpen(false);

      toast({ title: "Alert Configuration Saved" });

    },

    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),

  });



  const createSampleMutation = useMutation({

    mutationFn: (data: any) =>

      apiRequest("POST", `/api/surveillance/cases/${selectedCase?.id}/samples`, data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases", selectedCase?.id, "samples"] });

      refetchSamples();

      setSampleForm({ sampleType: "Stool", dateCollected: new Date().toISOString().split("T")[0], labName: "", result: "pending" });

      toast({ title: "Specimen Logged" });

    },

    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),

  });



  const deleteSampleMutation = useMutation({

    mutationFn: (id: string) => apiRequest("DELETE", `/api/surveillance/samples/${id}`),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases", selectedCase?.id, "samples"] });

      refetchSamples();

      toast({ title: "Specimen Removed" });

    },

  });



  // ── Template field helpers ───────────────────────────────────────────────────

  const addField = () =>

    setTemplateData((p: any) => ({ ...p, fields: [...p.fields, { name: "", label: "", type: "text", required: true }] }));

  const removeField = (idx: number) =>

    setTemplateData((p: any) => ({ ...p, fields: p.fields.filter((_: any, i: number) => i !== idx) }));

  const updateField = (idx: number, key: string, value: any) =>

    setTemplateData((p: any) => {

      const fields = [...p.fields];

      fields[idx] = { ...fields[idx], [key]: value };

      return { ...p, fields };

    });

  const moveFieldUp = (idx: number) => {

    if (idx === 0) return;

    setTemplateData((p: any) => {

      const f = [...p.fields];

      [f[idx - 1], f[idx]] = [f[idx], f[idx - 1]];

      return { ...p, fields: f };

    });

  };

  const moveFieldDown = (idx: number) => {

    setTemplateData((p: any) => {

      if (idx >= p.fields.length - 1) return p;

      const f = [...p.fields];

      [f[idx], f[idx + 1]] = [f[idx + 1], f[idx]];

      return { ...p, fields: f };

    });

  };



  // ── Form submit handlers ─────────────────────────────────────────────────────

  function handleReportCase(e: React.FormEvent) {

    e.preventDefault();

    const activeTemplate = templates.find((t: any) => t.disease === formData.disease && t.isActive);

    reportCaseMutation.mutate({

      ...formData,

      patientAge:   parseInt(formData.patientAge) || null,

      facilityId:   parseInt(formData.facilityId) || null,

      dateOfOnset:  new Date(formData.dateOfOnset).toISOString(),

      investigationDate: formData.investigationDate ? new Date(formData.investigationDate).toISOString() : null,

      templateId:   activeTemplate ? activeTemplate.id : (formData.templateId ? parseInt(formData.templateId) : null),

      formData:     reportChecklistAnswers,

    });

  }



  function handleCreateTemplate(e: React.FormEvent) {

    e.preventDefault();

    createTemplateMutation.mutate(templateData);

  }



  function handleUpdateConfig(e: React.FormEvent) {

    e.preventDefault();

    updateConfigMutation.mutate({ ...alertConfigData, isActive: true });

  }



  // ── Dashboard analytics (client-side) ───────────────────────────────────────

  const now = new Date();

  const ytdCases = useMemo(() =>

    cases.filter((c: any) => new Date(c.dateOfOnset).getFullYear() === now.getFullYear()),

    [cases]);



  const epiCurveData = useMemo(() => {

    const weeks: Record<string, any> = {};

    for (let i = 15; i >= 0; i--) {

      const d = new Date(now);

      d.setDate(d.getDate() - i * 7);

      const label = getEpiWeekLabel(d);

      if (!weeks[label]) weeks[label] = { week: label, afp: 0, measles: 0, nnt: 0, yellow_fever: 0, other: 0 };

    }

    cases.forEach((c: any) => {

      const label = getEpiWeekLabel(new Date(c.dateOfOnset));

      if (weeks[label]) {

        const d = c.disease as string;

        if (["afp", "measles", "nnt", "yellow_fever"].includes(d)) (weeks[label] as any)[d]++;

        else weeks[label].other++;

      }

    });

    return Object.values(weeks);

  }, [cases]);



  const diseaseBreakdown = useMemo(() => {

    const counts: Record<string, number> = {};

    ytdCases.forEach((c: any) => { counts[c.disease] = (counts[c.disease] || 0) + 1; });

    return Object.entries(counts).map(([disease, count]) => ({

      name: DISEASE_LABELS[disease] ?? disease,

      value: count,

      color: DISEASE_COLORS[disease] ?? "#94a3b8",

    }));

  }, [ytdCases]);



  const pendingInvestigations = useMemo(() =>

    cases.filter((c: any) => !c.investigationDate && c.status !== "closed").length,

    [cases]);



  const timeliness48h = useMemo(() => {

    const investigated = cases.filter((c: any) => c.investigationDate && c.dateReported);

    if (!investigated.length) return null;

    const onTime = investigated.filter((c: any) => {

      const diff = (new Date(c.investigationDate).getTime() - new Date(c.dateReported).getTime()) / (1000 * 60 * 60);

      return diff <= 48;

    });

    return Math.round((onTime.length / investigated.length) * 100);

  }, [cases]);



  const filteredCases = useMemo(() => {
    const facDistMap = new Map((facilities as any[]).map((f: any) => [f.id, f.districtId]));
    const distProvMap = new Map((districts as any[]).map((d: any) => [Number(d.id), Number(d.provinceId)]));
    return cases.filter((c: any) => {
      if (diseaseFilter !== "all" && c.disease !== diseaseFilter) return false;
      if (classificationFilter !== "all" && c.classification !== classificationFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.patientName?.toLowerCase().includes(q) && !c.id?.toLowerCase().includes(q)) return false;
      }
      if (facilityFilter !== "all" && Number(c.facilityId) !== Number(facilityFilter)) return false;
      if (districtFilter !== "all") {
        const dId = facDistMap.get(c.facilityId);
        if (Number(dId) !== Number(districtFilter)) return false;
      }
      if (provinceFilter !== "all") {
        const dId = facDistMap.get(c.facilityId);
        const pId = distProvMap.get(Number(dId));
        if (Number(pId) !== Number(provinceFilter)) return false;
      }
      if (chartDrillDisease) {
        const effectiveDrillDisease = ["afp","measles","nnt","yellow_fever","cholera","covid19"].includes(chartDrillDisease) ? chartDrillDisease : "other";
        if (effectiveDrillDisease === "other") {
          if (["afp","measles","nnt","yellow_fever","cholera","covid19"].includes(c.disease)) return false;
        } else if (c.disease !== chartDrillDisease) return false;
      }
      if (chartDrillWeek) {
        const getEpiWeekLabel = (d: Date) => {
          const tmp = new Date(d); tmp.setHours(0,0,0,0); tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay()+6)%7));
          const w1 = new Date(tmp.getFullYear(),0,4);
          const wk = 1 + Math.round(((tmp.getTime()-w1.getTime())/86400000-3+((w1.getDay()+6)%7))/7);
          return `W${String(wk).padStart(2,"0")}/${String(tmp.getFullYear()).slice(2)}`;
        };
        if (getEpiWeekLabel(new Date(c.dateOfOnset)) !== chartDrillWeek) return false;
      }
      return true;
    });
  }, [cases, diseaseFilter, classificationFilter, statusFilter, searchQuery,
      facilityFilter, districtFilter, provinceFilter, facilities, districts,
      chartDrillDisease, chartDrillWeek]);



  // Cascade: districts for selected province
  const filteredDistrictList = useMemo(() =>
    provinceFilter === "all"
      ? (districts as any[])
      : (districts as any[]).filter((d: any) => Number(d.provinceId) === Number(provinceFilter)),
  [districts, provinceFilter]);

  // Cascade: facilities for selected province/district
  const filteredFacilityList = useMemo(() => {
    let facs = facilities as any[];
    if (districtFilter !== "all") facs = facs.filter((f: any) => Number(f.districtId) === Number(districtFilter));
    else if (provinceFilter !== "all") {
      const dIds = new Set(filteredDistrictList.map((d: any) => Number(d.id)));
      facs = facs.filter((f: any) => dIds.has(Number(f.districtId)));
    }
    return facs;
  }, [facilities, districtFilter, provinceFilter, filteredDistrictList]);

  const mapFilteredCases = useMemo(() =>

    mapDiseaseFilter === "all" ? cases : cases.filter((c: any) => c.disease === mapDiseaseFilter),

    [cases, mapDiseaseFilter]);



  const afpRate  = parseFloat(kpis?.afpRate  ?? "0");

  const measRate = parseFloat(kpis?.measlesRate ?? "0");



  // ── Checklist evaluator ──────────────────────────────────────────────────────

  function evalCalculated(formula: string, answers: Record<string, string>, caseData: any) {

    const match = formula.match(/^([a-zA-Z]+)\(([^,]*),?([^,]*)\)$/);

    if (!match) return "";

    const [, op, op1, op2] = match;

    const val1 = op1 === "date_of_onset" ? caseData?.dateOfOnset : (answers[op1] || "");

    const val2 = op2 === "investigation_date" ? caseData?.investigationDate : (answers[op2] || "");

    if (op === "dateDiff") {

      if (!val1 || !val2) return "Pending dates";

      const diff = Math.abs(new Date(val2).getTime() - new Date(val1).getTime());

      const days = Math.ceil(diff / 86400000);

      return isNaN(days) ? "" : `${days} days`;

    }

    if (op === "ageYears") {

      if (!val1) return "Pending birthdate";

      const age = new Date(Date.now() - new Date(val1).getTime());

      return Math.abs(age.getUTCFullYear() - 1970);

    }

    return "";

  }



  // ── Render ───────────────────────────────────────────────────────────────────

  return (

    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">

            <Activity className="h-6 w-6 text-primary" />

            VPD Surveillance

          </h1>

          <p className="text-sm text-muted-foreground mt-0.5">

            Integrated Disease Surveillance &amp; Response (IDSR) · {now.getFullYear()} EPI cycle

          </p>

        </div>

        <Dialog open={isCaseReportOpen} onOpenChange={setIsCaseReportOpen}>

          <DialogTrigger asChild>

            <Button className="gap-2 shadow-sm">

              <Plus className="h-4 w-4" /> Report New Case

            </Button>

          </DialogTrigger>

          <DialogContent className="sm:max-w-[620px] w-[95vw] max-h-[90vh] overflow-y-auto">

            <DialogHeader>

              <DialogTitle className="flex items-center gap-2">

                <AlertTriangle className="h-5 w-5 text-amber-500" />

                Report Suspected VPD Case

              </DialogTitle>

            </DialogHeader>

            <form onSubmit={handleReportCase} className="space-y-4 pt-2">

              <div className="grid grid-cols-2 gap-3">

                <div className="grid gap-1.5">

                  <Label className="text-xs">Disease *</Label>

                  <Select value={formData.disease} onValueChange={(v) => setFormData({ ...formData, disease: v })}>

                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>

                    <SelectContent>

                      <SelectItem value="afp">Acute Flaccid Paralysis (AFP)</SelectItem>

                      <SelectItem value="measles">Measles</SelectItem>

                      <SelectItem value="nnt">Neonatal Tetanus</SelectItem>

                      <SelectItem value="yellow_fever">Yellow Fever</SelectItem>

                      <SelectItem value="cholera">Cholera</SelectItem>

                      <SelectItem value="covid19">COVID-19</SelectItem>

                      <SelectItem value="other">Other VPD</SelectItem>

                    </SelectContent>

                  </Select>

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Classification *</Label>

                  <Select value={formData.classification} onValueChange={(v) => setFormData({ ...formData, classification: v })}>

                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>

                    <SelectContent>

                      <SelectItem value="suspected">Suspected</SelectItem>

                      <SelectItem value="probable">Probable</SelectItem>

                      <SelectItem value="confirmed">Confirmed</SelectItem>

                    </SelectContent>

                  </Select>

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Patient Name *</Label>

                  <Input value={formData.patientName} onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} required className="h-9" />

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Age (years)</Label>

                  <Input type="number" min="0" max="120" value={formData.patientAge} onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })} className="h-9" />

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Date of Onset *</Label>

                  <Input type="date" value={formData.dateOfOnset} onChange={(e) => setFormData({ ...formData, dateOfOnset: e.target.value })} required className="h-9" />

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Reporting Facility</Label>

                  <Select value={formData.facilityId} onValueChange={(v) => setFormData({ ...formData, facilityId: v })}>

                    <SelectTrigger className="h-9"><SelectValue placeholder="Select facility..." /></SelectTrigger>

                    <SelectContent className="max-h-[200px]">

                      {(facilities as any[]).map((f: any) => (

                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">GPS Latitude</Label>

                  <Input placeholder="-15.4167" value={formData.gpsLatitude} onChange={(e) => setFormData({ ...formData, gpsLatitude: e.target.value })} className="h-9" />

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">GPS Longitude</Label>

                  <Input placeholder="28.2833" value={formData.gpsLongitude} onChange={(e) => setFormData({ ...formData, gpsLongitude: e.target.value })} className="h-9" />

                </div>

                <div className="grid gap-1.5">

                  <Label className="text-xs">Date of Investigation</Label>

                  <Input type="date" value={formData.investigationDate || ""} onChange={(e) => setFormData({ ...formData, investigationDate: e.target.value })} className="h-9" />

                </div>

              </div>



              {/* Active predefined template checklist */}

              {(() => {

                const activeTpl = templates.find((t: any) => t.disease === formData.disease && t.isActive);

                if (!activeTpl) return null;

                return (

                  <div className="border-t pt-3 space-y-3">

                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">

                      <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 uppercase tracking-wider">

                        <ClipboardList className="w-3.5 h-3.5" /> Checklist: {activeTpl.name}

                      </h4>

                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1">

                      {activeTpl.fields?.map((field: any, idx: number) => (

                        <div key={idx} className="grid gap-1">

                          <Label className="text-[11px] text-muted-foreground">{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>

                          {field.type === "calculated" ? (

                            <Input value={evalCalculated(field.options || "", reportChecklistAnswers, formData)} className="bg-muted font-mono h-8 text-xs" disabled readOnly />

                          ) : field.type === "boolean" || field.type === "select" || field.type === "radio" ? (

                            <Select value={reportChecklistAnswers[field.name] || ""} onValueChange={(v) => setReportChecklistAnswers({ ...reportChecklistAnswers, [field.name]: v })}>

                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>

                              <SelectContent>

                                {field.type === "boolean" ? (

                                  <><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></>

                                ) : Array.isArray(field.options) ? field.options.map((o: string) => (

                                  <SelectItem key={o} value={o}>{o}</SelectItem>

                                )) : null}

                              </SelectContent>

                            </Select>

                          ) : (

                            <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={reportChecklistAnswers[field.name] || ""} onChange={(e) => setReportChecklistAnswers({ ...reportChecklistAnswers, [field.name]: e.target.value })} placeholder={field.label} className="h-8 text-xs" />

                          )}

                        </div>

                      ))}

                    </div>

                  </div>

                );

              })()}



              <div className="grid gap-1.5">

                <Label className="text-xs">Clinical Notes</Label>

                <Input value={formData.clinicalNotes} onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })} placeholder="Enter clinical notes..." className="h-9" />

              </div>

              <Button type="submit" className="w-full" disabled={reportCaseMutation.isPending}>

                {reportCaseMutation.isPending ? "Submitting..." : "Submit Report"}

              </Button>

            </form>

          </DialogContent>

        </Dialog>

      </div>



      {/* ── Tabs ─────────────────────────────────────────────────────────── */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        <TabsList className="h-9">

          <TabsTrigger value="dashboard" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>

          <TabsTrigger value="linelist"  className="text-xs gap-1.5"><FileText  className="h-3.5 w-3.5" /> Case Linelist</TabsTrigger>

          <TabsTrigger value="map"       className="text-xs gap-1.5"><MapIcon   className="h-3.5 w-3.5" /> Spatial View</TabsTrigger>

          <TabsTrigger value="config"    className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Configuration</TabsTrigger>

        </TabsList>



        {/* ══ DASHBOARD TAB ══════════════════════════════════════════════════ */}

        <TabsContent value="dashboard" className="space-y-5">



          {/* KPI Cards Row */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total YTD */}

            <Card className="border-l-4 border-l-blue-500">

              <CardContent className="p-4">

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Cases YTD</p>

                <p className="text-3xl font-bold">{ytdCases.length}</p>

                <p className="text-xs text-muted-foreground mt-1">{cases.length - ytdCases.length} prior years</p>

              </CardContent>

            </Card>



            {/* AFP Rate */}

            <Card className={`border-l-4 ${afpRate >= 2 ? "border-l-emerald-500" : afpRate >= 1 ? "border-l-amber-500" : "border-l-rose-500"}`}>

              <CardContent className="p-4">

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Non-Polio AFP Rate</p>

                <div className="flex items-end gap-1">

                  <p className="text-3xl font-bold">{kpis?.afpRate ?? "—"}</p>

                  <p className="text-xs text-muted-foreground mb-1">per 100k</p>

                </div>

                <div className="mt-1"><AfpRateStatus rate={afpRate} /></div>

              </CardContent>

            </Card>



            {/* Measles Rate */}

            <Card className="border-l-4 border-l-orange-500">

              <CardContent className="p-4">

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Measles Incidence</p>

                <div className="flex items-end gap-1">

                  <p className="text-3xl font-bold">{kpis?.measlesRate ?? "—"}</p>

                  <p className="text-xs text-muted-foreground mb-1">per 100k</p>

                </div>

                <p className="text-xs text-muted-foreground mt-1">{kpis?.totalMeaslesCases ?? 0} confirmed/suspected YTD</p>

              </CardContent>

            </Card>



            {/* Pending Investigations */}

            <Card className={`border-l-4 ${pendingInvestigations > 0 ? "border-l-amber-500" : "border-l-emerald-500"}`}>

              <CardContent className="p-4">

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Investigations</p>

                <p className="text-3xl font-bold">{pendingInvestigations}</p>

                <p className="text-xs text-muted-foreground mt-1">

                  {pendingInvestigations === 0 ? "All cases investigated ✓" : "Cases awaiting investigation"}

                </p>

              </CardContent>

            </Card>

          </div>



          {/* Epidemic Curve + Disease Breakdown */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Epidemic Curve */}

            <Card className="lg:col-span-2">

              <CardHeader className="pb-2">

                <CardTitle className="text-sm font-semibold flex items-center gap-2">

                  <Activity className="h-4 w-4 text-primary" />

                  Epidemic Curve — Last 16 Epi-Weeks

                </CardTitle>

                <CardDescription className="text-xs">Weekly case count by disease (onset date)</CardDescription>

              </CardHeader>

              <CardContent>

                {epiCurveData.every((w: any) => w.afp + w.measles + w.nnt + w.yellow_fever + w.other === 0) ? (

                  <div className="h-52 flex items-center justify-center text-sm text-muted-foreground flex-col gap-2">

                    <BarChart3 className="h-8 w-8 text-muted-foreground/30" />

                    <p>No cases recorded in the past 16 weeks.</p>

                    <p className="text-xs">Report a case to populate the epidemic curve.</p>

                  </div>

                ) : (

                  <ResponsiveContainer width="100%" height={208}>

                    <BarChart data={epiCurveData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                      style={{ cursor: "pointer" }}
                      onClick={(data: any) => {
                        if (data?.activeLabel) {
                          setChartDrillWeek(data.activeLabel === chartDrillWeek ? null : data.activeLabel);
                          setActiveTab("linelist");
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                        labelStyle={{ fontWeight: 700 }}
                        formatter={(value: any, name: string) => [value, name]}
                        cursor={{ fill: "hsl(var(--primary)/0.08)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="afp"          name="AFP"          stackId="a" fill={DISEASE_COLORS.afp}          radius={[0,0,0,0]}
                        onClick={(_: any, __: any, e: any) => { e.stopPropagation(); setChartDrillDisease(chartDrillDisease === "afp" ? null : "afp"); setActiveTab("linelist"); }}
                      />
                      <Bar dataKey="measles"       name="Measles"      stackId="a" fill={DISEASE_COLORS.measles}       radius={[0,0,0,0]}
                        onClick={(_: any, __: any, e: any) => { e.stopPropagation(); setChartDrillDisease(chartDrillDisease === "measles" ? null : "measles"); setActiveTab("linelist"); }}
                      />
                      <Bar dataKey="nnt"           name="NNT"          stackId="a" fill={DISEASE_COLORS.nnt}           radius={[0,0,0,0]}
                        onClick={(_: any, __: any, e: any) => { e.stopPropagation(); setChartDrillDisease(chartDrillDisease === "nnt" ? null : "nnt"); setActiveTab("linelist"); }}
                      />
                      <Bar dataKey="yellow_fever"  name="Yellow Fever" stackId="a" fill={DISEASE_COLORS.yellow_fever}  radius={[0,0,0,0]}
                        onClick={(_: any, __: any, e: any) => { e.stopPropagation(); setChartDrillDisease(chartDrillDisease === "yellow_fever" ? null : "yellow_fever"); setActiveTab("linelist"); }}
                      />
                      <Bar dataKey="other"         name="Other"        stackId="a" fill={DISEASE_COLORS.other}         radius={[4,4,0,0]}
                        onClick={(_: any, __: any, e: any) => { e.stopPropagation(); setChartDrillDisease(chartDrillDisease === "other" ? null : "other"); setActiveTab("linelist"); }}
                      />
                    </BarChart>

                  </ResponsiveContainer>

                )}

              </CardContent>

            </Card>



            {/* Disease Breakdown */}

            <Card>

              <CardHeader className="pb-2">

                <CardTitle className="text-sm font-semibold flex items-center gap-2">

                  <FlaskConical className="h-4 w-4 text-primary" />

                  Disease Breakdown (YTD)

                </CardTitle>

              </CardHeader>

              <CardContent>

                {diseaseBreakdown.length === 0 ? (

                  <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">No data</div>

                ) : (

                  <ResponsiveContainer width="100%" height={140}>

                    <PieChart>

                      <Pie data={diseaseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={32} paddingAngle={2}
                    style={{ cursor: "pointer" }}
                    onClick={(entry: any) => { setChartDrillDisease(chartDrillDisease === entry.name ? null : entry.name); setActiveTab("linelist"); }}

                  >
                        {diseaseBreakdown.map((entry, idx) => (

                           <Cell key={idx} fill={entry.color} stroke={chartDrillDisease === entry.name ? "hsl(var(--foreground))" : "transparent"} strokeWidth={2} />


                        ))}

                      </Pie>

                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />

                    </PieChart>

                  </ResponsiveContainer>

                )}

                <div className="space-y-1.5 mt-2">

                  {diseaseBreakdown.map((d) => (

                    <div key={d.name} className="flex items-center justify-between text-xs">

                      <div className="flex items-center gap-2">

                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />

                        <span className="text-muted-foreground">{d.name}</span>

                      </div>

                      <span className="font-bold tabular-nums">{d.value}</span>

                    </div>

                  ))}

                </div>

              </CardContent>

            </Card>

          </div>



          {/* WHO IDSR Performance Indicators */}

          <Card>

            <CardHeader className="pb-3">

              <CardTitle className="text-sm font-semibold flex items-center gap-2">

                <ShieldCheck className="h-4 w-4 text-emerald-500" />

                WHO / IDSR Performance Indicators

              </CardTitle>

              <CardDescription className="text-xs">Key surveillance quality metrics aligned with global IDSR standards</CardDescription>

            </CardHeader>

            <CardContent>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Timeliness */}

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-1.5">

                      <Clock className="h-3.5 w-3.5 text-primary" />

                      <p className="text-xs font-semibold">Investigation Timeliness</p>

                    </div>

                    <Badge variant="outline" className="text-[10px]">≤ 48 h target</Badge>

                  </div>

                  {timeliness48h === null ? (

                    <p className="text-xs text-muted-foreground">No investigated cases yet</p>

                  ) : (

                    <>

                      <p className="text-2xl font-bold">{timeliness48h}%</p>

                      <Progress value={timeliness48h} className="h-1.5" />

                      <p className="text-[10px] text-muted-foreground">of cases investigated within 48h of reporting</p>

                    </>

                  )}

                </div>



                {/* AFP surveillance standard */}

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-1.5">

                      <Activity className="h-3.5 w-3.5 text-blue-500" />

                      <p className="text-xs font-semibold">AFP Surveillance Standard</p>

                    </div>

                    <Badge variant="outline" className="text-[10px]">WHO Polio Endgame</Badge>

                  </div>

                  <p className="text-2xl font-bold">{kpis?.afpRate ?? "0.00"}</p>

                  <Progress value={Math.min((afpRate / 2) * 100, 100)} className="h-1.5" />

                  <p className="text-[10px] text-muted-foreground">

                    Non-polio AFP rate · target ≥ 2.0 per 100k &lt;15

                    {" "}(under-15 pop: {(kpis?.under15Population ?? 0).toLocaleString()})

                  </p>

                </div>



                {/* Active templates */}

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-1.5">

                      <ClipboardList className="h-3.5 w-3.5 text-purple-500" />

                      <p className="text-xs font-semibold">Case Investigation Forms</p>

                    </div>

                    <Badge variant="outline" className="text-[10px]">IDSR Standard</Badge>

                  </div>

                  <p className="text-2xl font-bold">{templates.length}</p>

                  <p className="text-[10px] text-muted-foreground">

                    disease-specific investigation templates configured

                  </p>

                  <p className="text-[10px] text-primary font-medium">

                    {templates.filter((t: any) => t.isActive).length} active · {templates.filter((t: any) => !t.isActive).length} archived

                  </p>

                </div>

              </div>

            </CardContent>

          </Card>

        </TabsContent>



        {/* ══ LINELIST TAB ══════════════════════════════════════════════════ */}

        <TabsContent value="linelist">

          <Card>

            <CardHeader className="pb-3">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                <div>

                  <CardTitle className="text-sm font-semibold">Case Linelist</CardTitle>

                  <CardDescription className="text-xs">All reported VPD cases · {filteredCases.length} of {cases.length} shown</CardDescription>

                </div>

                <Button variant="outline" size="sm" className="gap-1.5 self-start">

                  <Download className="h-3.5 w-3.5" /> Export CSV

                </Button>

              </div>



              {/* Filter bar */}

              <div className="flex flex-wrap gap-2 mt-3">

                <div className="relative flex-1 min-w-[160px] max-w-xs">

                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

                  <Input

                    className="pl-8 h-8 text-xs"

                    placeholder="Search name or ID..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                  />

                </div>

                <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>

                  <SelectTrigger className="h-8 text-xs w-[140px]"><Filter className="h-3 w-3 mr-1.5" /><SelectValue /></SelectTrigger>

                  <SelectContent>

                    <SelectItem value="all">All Diseases</SelectItem>

                    <SelectItem value="afp">AFP</SelectItem>

                    <SelectItem value="measles">Measles</SelectItem>

                    <SelectItem value="nnt">NNT</SelectItem>

                    <SelectItem value="yellow_fever">Yellow Fever</SelectItem>

                    <SelectItem value="cholera">Cholera</SelectItem>

                    <SelectItem value="covid19">COVID-19</SelectItem>

                    <SelectItem value="other">Other</SelectItem>

                  </SelectContent>

                </Select>

                <Select value={classificationFilter} onValueChange={setClassificationFilter}>

                  <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>

                  <SelectContent>

                    <SelectItem value="all">All Classifications</SelectItem>

                    <SelectItem value="suspected">Suspected</SelectItem>

                    <SelectItem value="probable">Probable</SelectItem>

                    <SelectItem value="confirmed">Confirmed</SelectItem>

                    <SelectItem value="discarded">Discarded</SelectItem>

                  </SelectContent>

                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>

                  <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>

                  <SelectContent>

                    <SelectItem value="all">All Statuses</SelectItem>

                    <SelectItem value="open">Open</SelectItem>

                    <SelectItem value="closed">Closed</SelectItem>

                  </SelectContent>

                </Select>

              </div>

              {/* Smart cascade location filters */}
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/40 items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-1">Location:</span>
                <Select
                  value={String(provinceFilter)}
                  onValueChange={(v) => { setProvinceFilter(v === "all" ? "all" : Number(v)); setDistrictFilter("all"); setFacilityFilter("all"); }}
                >
                  <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue placeholder="All Provinces" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {(provinces as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(districtFilter)}
                  onValueChange={(v) => { setDistrictFilter(v === "all" ? "all" : Number(v)); setFacilityFilter("all"); }}
                >
                  <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="All Districts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {filteredDistrictList.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(facilityFilter)}
                  onValueChange={(v) => setFacilityFilter(v === "all" ? "all" : Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue placeholder="All Facilities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Facilities</SelectItem>
                    {filteredFacilityList.slice(0, 200).map((f: any) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(provinceFilter !== "all" || districtFilter !== "all" || facilityFilter !== "all") && (
                  <button
                    className="h-8 px-2.5 text-xs text-muted-foreground border border-border/50 rounded-md hover:border-destructive/50 hover:text-destructive transition-colors"
                    onClick={() => { setProvinceFilter("all"); setDistrictFilter("all"); setFacilityFilter("all"); }}
                  >× Clear</button>
                )}
              </div>

            </CardHeader>

            <CardContent className="p-0">

              {(chartDrillDisease || chartDrillWeek) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b text-xs">
                  <span className="font-semibold text-primary">Drill-down active:</span>
                  {chartDrillDisease && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase" style={{ background: (DISEASE_COLORS[chartDrillDisease]??'#94a3b8')+'20', color: DISEASE_COLORS[chartDrillDisease]??'#94a3b8' }}>{DISEASE_LABELS[chartDrillDisease]??chartDrillDisease}</span>}
                  {chartDrillWeek && <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{chartDrillWeek}</span>}
                  <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => { setChartDrillDisease(null); setChartDrillWeek(null); }}>× Clear drill</button>
                </div>
              )}
              {casesLoading ? (

                <div className="p-8 text-center text-sm text-muted-foreground">Loading cases...</div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-sm min-w-[700px]">

                    <thead className="border-b bg-muted/30">

                      <tr>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Disease</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Age/Sex</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Onset Date</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date Reported</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">District / Facility</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Classification</th>
                        <th className="h-9 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="h-9 px-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-border/50">

                      {filteredCases.length === 0 ? (

                        <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No cases match the current filters.</td></tr>

                      ) : filteredCases.map((c: any) => (

                        <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setSelectedCase(c); setCaseEditData({ patientName: c.patientName || "", patientAgeMonths: c.patientAgeMonths ?? "", dateOfOnset: c.dateOfOnset ? new Date(c.dateOfOnset).toISOString().split("T")[0] : "", dateReported: c.dateReported ? new Date(c.dateReported).toISOString().split("T")[0] : "", facilityId: c.facilityId ?? "", classification: c.classification || "suspected", patientGender: c.patientGender || "", clinicalNotes: c.clinicalNotes || "" }); setIsEditingCase(false); setChecklistAnswers(c.formData || {}); setIsCaseWorkflowOpen(true); }}>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                              style={{ background: (DISEASE_COLORS[c.disease] ?? "#94a3b8") + "20", color: DISEASE_COLORS[c.disease] ?? "#94a3b8" }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: DISEASE_COLORS[c.disease] ?? "#94a3b8" }} />
                              {DISEASE_LABELS[c.disease] ?? c.disease}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-sm">{c.patientName || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.patientAgeMonths != null ? `${c.patientAgeMonths}y` : "—"}{c.patientGender ? ` / ${c.patientGender.charAt(0).toUpperCase()}` : ""}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{c.dateOfOnset ? new Date(c.dateOfOnset).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{c.dateReported ? new Date(c.dateReported).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2.5 text-xs">
                            {(() => { const fac = (facilities as any[]).find((f: any) => f.id === c.facilityId); const dist = fac ? (districts as any[]).find((d: any) => Number(d.id) === Number(fac.districtId)) : null; return (<><div className="font-medium text-foreground/80">{dist?.name ?? "—"}</div><div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{fac?.name ?? `#${c.facilityId}`}</div></>); })()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${classificationBadgeClass(c.classification)}`}>{c.classification}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${c.status === "closed" ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"}`}>{c.status || "open"}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if (window.confirm("Delete this case?")) deleteCaseMutation.mutate(c.id); }}><Trash2 className="h-3 w-3" /></Button>
                          </td>
                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </CardContent>

          </Card>

        </TabsContent>



        {/* ══ MAP TAB ══════════════════════════════════════════════════════ */}

        <TabsContent value="map" className="space-y-3">

          {/* Disease filter bar above the map */}

          <div className="flex items-center gap-3 flex-wrap">

            <div className="flex items-center gap-2">

              <Filter className="h-3.5 w-3.5 text-muted-foreground" />

              <span className="text-xs font-semibold text-muted-foreground">Filter by disease:</span>

            </div>

            {["all", "afp", "measles", "nnt", "yellow_fever", "cholera", "other"].map((d) => (

              <button

                key={d}

                onClick={() => setMapDiseaseFilter(d)}

                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${

                  mapDiseaseFilter === d

                    ? "border-transparent text-white shadow-sm"

                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"

                }`}

                style={mapDiseaseFilter === d ? {

                  background: d === "all" ? "hsl(var(--primary))" : DISEASE_COLORS[d],

                  borderColor: d === "all" ? "hsl(var(--primary))" : DISEASE_COLORS[d],

                } : {}}

              >

                {d === "all" ? "All Diseases" : DISEASE_LABELS[d]}

                {d !== "all" && (

                  <span className="ml-1.5 opacity-70">

                    ({cases.filter((c: any) => c.disease === d).length})

                  </span>

                )}

              </button>

            ))}

          </div>

          <div className="h-[600px] border rounded-xl overflow-hidden shadow-sm">

            <MapView

              facilities={facilities as any[] || []}

              cases={mapFilteredCases}

              height="100%"

              mode="surveillance"

            />

          </div>

        </TabsContent>



        {/* ══ CONFIG TAB ════════════════════════════════════════════════════ */}

        <TabsContent value="config">

          <div className="space-y-4">

            {/* Linelist Templates */}

            <Card>

              <CardHeader>

                <div className="flex items-center justify-between">

                  <div>

                    <CardTitle className="text-sm font-semibold">Linelist Templates</CardTitle>

                    <CardDescription className="text-xs mt-1">{templates.length} template{templates.length !== 1 ? "s" : ""} configured for disease-specific case investigation.</CardDescription>

                  </div>

                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {

                    setTemplateData({ id: undefined, name: "", disease: "afp", description: "", fields: [{ name: "", label: "", type: "text", required: true }] });

                    setIsTemplateModalOpen(true);

                  }}>

                    <Plus className="h-3.5 w-3.5" /> New Template

                  </Button>

                </div>

              </CardHeader>

              {templates.length > 0 && (

                <CardContent className="p-0">

                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead className="border-b bg-muted/30">

                        <tr>

                          <th className="h-9 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Template Name</th>

                          <th className="h-9 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Disease</th>

                          <th className="h-9 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fields</th>

                          <th className="h-9 px-4 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-border/50">

                        {templates.map((t: any) => (

                          <tr key={t.id} className="hover:bg-muted/30 transition-colors">

                            <td className="px-4 py-3 font-medium">{t.name}</td>

                            <td className="px-4 py-3">

                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: (DISEASE_COLORS[t.disease] ?? "#94a3b8") + "20", color: DISEASE_COLORS[t.disease] ?? "#94a3b8" }}>

                                {DISEASE_LABELS[t.disease] ?? t.disease}

                              </span>

                            </td>

                            <td className="px-4 py-3 text-muted-foreground">{t.fields?.length ?? 0} fields</td>

                            <td className="px-4 py-3 text-right">

                              <div className="flex justify-end gap-1.5">

                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {

                                  setTemplateData({ id: t.id, name: t.name, disease: t.disease, description: t.description || "", fields: t.fields || [] });

                                  setIsTemplateModalOpen(true);

                                }}>Edit</Button>

                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {

                                  if (window.confirm("Delete this template?")) deleteTemplateMutation.mutate(t.id);

                                }}><Trash2 className="h-3.5 w-3.5" /></Button>

                              </div>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </CardContent>

              )}

            </Card>



            {/* Notification Routing */}

            <Card>

              <CardHeader>

                <div className="flex items-center justify-between">

                  <div>

                    <CardTitle className="text-sm font-semibold">Alert Routing (UCE)</CardTitle>

                    <CardDescription className="text-xs mt-1">Configure automatic multi-channel alerts dispatched on new case reports via the Unified Communication Engine.</CardDescription>

                  </div>

                  <Dialog open={isAlertsModalOpen} onOpenChange={setIsAlertsModalOpen}>

                    <DialogTrigger asChild>

                      <Button variant="outline" size="sm">Configure Alerts</Button>

                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[425px]">

                      <DialogHeader>

                        <DialogTitle>Configure Alert Routing</DialogTitle>

                      </DialogHeader>

                      <form onSubmit={handleUpdateConfig} className="space-y-4 pt-4">

                        <div className="grid gap-2">

                          <Label>Disease Target</Label>

                          <Select value={alertConfigData.disease} onValueChange={(v) => setAlertConfigData({ ...alertConfigData, disease: v })}>

                            <SelectTrigger><SelectValue /></SelectTrigger>

                            <SelectContent>

                              <SelectItem value="afp">AFP</SelectItem>

                              <SelectItem value="measles">Measles</SelectItem>

                              <SelectItem value="nnt">Neonatal Tetanus</SelectItem>

                              <SelectItem value="yellow_fever">Yellow Fever</SelectItem>

                              <SelectItem value="cholera">Cholera</SelectItem>

                              <SelectItem value="covid19">COVID-19</SelectItem>

                              <SelectItem value="other">Other VPD</SelectItem>

                            </SelectContent>

                          </Select>

                        </div>

                        <div className="grid gap-2">

                          <Label>Alert Threshold (cases per 100k)</Label>

                          <Input type="number" min="1" value={alertConfigData.alertThreshold} onChange={(e) => setAlertConfigData({ ...alertConfigData, alertThreshold: parseInt(e.target.value) || 1 })} required />

                        </div>

                        <div className="grid gap-2">

                          <Label>Notify Roles (comma-separated)</Label>

                          <Input value={alertConfigData.notifyRoles} onChange={(e) => setAlertConfigData({ ...alertConfigData, notifyRoles: e.target.value })} placeholder="e.g. district_manager, provincial_coordinator" required />

                        </div>

                        <Button type="submit" className="w-full" disabled={updateConfigMutation.isPending}>

                          {updateConfigMutation.isPending ? "Saving..." : "Save Alert Settings"}

                        </Button>

                      </form>

                    </DialogContent>

                  </Dialog>

                </div>

              </CardHeader>

            </Card>

          </div>

        </TabsContent>

      </Tabs>



      {/* ── Template Modal ───────────────────────────────────────────────── */}

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>

        <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col">

          <DialogHeader>

            <DialogTitle>{templateData.id ? "Edit" : "Create"} Linelist Template</DialogTitle>

          </DialogHeader>

          <form onSubmit={handleCreateTemplate} className="space-y-6 pt-4 flex-1 flex flex-col">

            <div className="grid grid-cols-2 gap-4">

              <div className="grid gap-2">

                <Label>Template Name</Label>

                <Input value={templateData.name} onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })} required />

              </div>

              <div className="grid gap-2">

                <Label>Disease Target</Label>

                <Select value={templateData.disease} onValueChange={(v) => setTemplateData({ ...templateData, disease: v })}>

                  <SelectTrigger><SelectValue /></SelectTrigger>

                  <SelectContent position="popper">

                    <SelectItem value="afp">AFP</SelectItem>

                    <SelectItem value="measles">Measles</SelectItem>

                    <SelectItem value="nnt">Neonatal Tetanus</SelectItem>

                    <SelectItem value="yellow_fever">Yellow Fever</SelectItem>

                    <SelectItem value="cholera">Cholera</SelectItem>

                    <SelectItem value="covid19">COVID-19</SelectItem>

                    <SelectItem value="other">Other VPD</SelectItem>

                  </SelectContent>

                </Select>

              </div>

            </div>

            <div className="grid gap-2">

              <Label>Description</Label>

              <Input value={templateData.description} onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })} />

            </div>



            <div className="border-t pt-4 flex-1 flex flex-col">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <Label className="text-base">Custom Form Fields</Label>

                  <p className="text-xs text-muted-foreground mt-0.5">Add specific data points to collect during case investigation.</p>

                </div>

                <Button type="button" variant="outline" size="sm" onClick={addField}>

                  <Plus className="w-4 h-4 mr-1" /> Add Field

                </Button>

              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-4">

                {templateData.fields.map((field: any, idx: number) => (

                  <div key={idx} className="flex flex-col md:flex-row gap-3 items-start border p-4 rounded-md bg-background shadow-sm">

                    <div className="flex md:flex-col gap-1 shrink-0">

                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFieldUp(idx)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>

                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFieldDown(idx)} disabled={idx === templateData.fields.length - 1}><ArrowDown className="w-4 h-4" /></Button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 w-full">

                      <div className="md:col-span-4 grid gap-2">

                        <Label className="text-xs text-muted-foreground">Internal Name</Label>

                        <Input placeholder="e.g. stool_sample_1" value={field.name} onChange={(e) => updateField(idx, "name", e.target.value)} required />

                      </div>

                      <div className="md:col-span-5 grid gap-2">

                        <Label className="text-xs text-muted-foreground">Display Label</Label>

                        <Input placeholder="e.g. Stool Sample 1 Date" value={field.label} onChange={(e) => updateField(idx, "label", e.target.value)} required />

                      </div>

                      <div className="md:col-span-3 grid gap-2">

                        <Label className="text-xs text-muted-foreground">Data Type</Label>

                        <Select value={field.type} onValueChange={(v) => updateField(idx, "type", v)}>

                          <SelectTrigger><SelectValue /></SelectTrigger>

                          <SelectContent position="popper" className="max-h-[250px]">

                            <SelectItem value="text">Short Text</SelectItem>

                            <SelectItem value="number">Number</SelectItem>

                            <SelectItem value="date">Date</SelectItem>

                            <SelectItem value="boolean">Yes/No</SelectItem>

                            <SelectItem value="select">Dropdown</SelectItem>

                            <SelectItem value="calculated">Calculated</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                      {(field.type === "select") && (

                        <div className="md:col-span-8 grid gap-2">

                          <Label className="text-xs text-muted-foreground">Options (comma-separated)</Label>

                          <Input

                            placeholder="e.g. Option A, Option B, Option C"

                            value={Array.isArray(field.options) ? field.options.join(", ") : (field.options || "")}

                            onChange={(e) => updateField(idx, "options", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}

                          />

                        </div>

                      )}

                      {field.type === "calculated" && (

                        <div className="md:col-span-8 grid gap-2">

                          <Label className="text-xs text-muted-foreground">Formula</Label>

                          <Input placeholder="e.g. dateDiff(date_of_onset, investigation_date)" value={field.options || ""} onChange={(e) => updateField(idx, "options", e.target.value)} />

                        </div>

                      )}

                    </div>

                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeField(idx)}><Trash2 className="w-4 h-4" /></Button>

                  </div>

                ))}

              </div>

            </div>



            <div className="mt-auto pt-4 border-t">

              <Button type="submit" className="w-full" disabled={createTemplateMutation.isPending}>

                {createTemplateMutation.isPending ? "Saving..." : "Save Template"}

              </Button>

            </div>

          </form>

        </DialogContent>

      </Dialog>



      {/* ── Case Workflow Sheet ──────────────────────────────────────────── */}

      <Sheet open={isCaseWorkflowOpen} onOpenChange={setIsCaseWorkflowOpen}>

        <SheetContent className="sm:max-w-[650px] w-[95vw] overflow-y-auto flex flex-col p-6 space-y-6">

          <SheetHeader className="border-b pb-4">

            <SheetTitle className="text-xl font-bold flex items-center gap-2">

              <Activity className="h-5 w-5 text-primary animate-pulse" />

              Manage Case: {selectedCase?.patientName}

            </SheetTitle>

            <SheetDescription>

              VPD Case ID: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedCase?.id}</span>

            </SheetDescription>

          </SheetHeader>



          {selectedCase && (

            <div className="space-y-6 flex-1">

              {/* Visual Workflow Stepper */}

              <div className="bg-muted/30 p-4 rounded-xl border">

                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Investigation Progress</h4>

                <div className="flex items-center justify-between">

                  {[

                    { label: "Reported",    done: true },

                    { label: "Investigated", done: !!selectedCase.investigationDate },

                    { label: "Specimens",    done: selectedCaseSamples.length > 0 },

                    { label: "Outcome",      done: selectedCase.status === "closed" },

                  ].map((step, i, arr) => (

                    <React.Fragment key={step.label}>

                      <div className="flex items-center gap-2">

                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${step.done ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary border border-primary/20"}`}>

                          {step.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}

                        </div>

                        <span className={`text-xs font-medium ${step.done ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</span>

                      </div>

                      {i < arr.length - 1 && <div className="h-[2px] flex-1 bg-border mx-2" />}

                    </React.Fragment>

                  ))}

                </div>

              </div>



              {/* Detail Tabs */}

              <Tabs defaultValue="investigation" className="space-y-4">

                <TabsList className="grid w-full grid-cols-3">

                  <TabsTrigger value="info">Metadata</TabsTrigger>

                  <TabsTrigger value="investigation">Checklist</TabsTrigger>

                  <TabsTrigger value="lab">Lab Specs ({selectedCaseSamples.length})</TabsTrigger>

                </TabsList>



                {/* Metadata */}

                <TabsContent value="info" className="space-y-4">
                  {/* ── Editable patient details ───────────────────────── */}
                  <div className="border rounded-xl bg-background shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Details</p>
                      {!isEditingCase ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsEditingCase(true)}>
                          <span>✏</span> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingCase(false)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" disabled={updateCaseMutation.isPending}
                            onClick={() => {
                              const payload: any = { id: selectedCase.id, ...caseEditData };
                              if (payload.dateOfOnset) payload.dateOfOnset = new Date(payload.dateOfOnset).toISOString();
                              if (payload.dateReported) payload.dateReported = new Date(payload.dateReported).toISOString();
                              updateCaseMutation.mutate(payload);
                              setIsEditingCase(false);
                            }}>
                            {updateCaseMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4">
                      {/* Disease */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Target Disease</p>
                        {isEditingCase ? (
                          <Select value={caseEditData?.disease ?? selectedCase.disease} onValueChange={(v) => setCaseEditData((p: any) => ({ ...p, disease: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(DISEASE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm font-bold uppercase" style={{ color: DISEASE_COLORS[selectedCase.disease] }}>{DISEASE_LABELS[selectedCase.disease] ?? selectedCase.disease}</span>
                        )}
                      </div>
                      {/* Facility */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Facility</p>
                        {isEditingCase ? (
                          <Select value={String(caseEditData?.facilityId ?? selectedCase.facilityId ?? "")} onValueChange={(v) => setCaseEditData((p: any) => ({ ...p, facilityId: Number(v) }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(facilities as any[]).map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-semibold">{(facilities as any[]).find((f: any) => f.id === selectedCase.facilityId)?.name || `Facility #${selectedCase.facilityId}`}</p>
                        )}
                      </div>
                      {/* Patient Name */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</p>
                        {isEditingCase ? (
                          <Input className="h-8 text-xs" value={caseEditData?.patientName ?? ""} onChange={(e) => setCaseEditData((p: any) => ({ ...p, patientName: e.target.value }))} />
                        ) : (
                          <p className="text-sm font-semibold">{selectedCase.patientName || "—"}</p>
                        )}
                      </div>
                      {/* Age */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Age (years)</p>
                        {isEditingCase ? (
                          <Input className="h-8 text-xs" type="number" min={0} max={150} value={caseEditData?.patientAgeMonthsMonths ?? ""} onChange={(e) => setCaseEditData((p: any) => ({ ...p, patientAgeMonths: e.target.value }))} />
                        ) : (
                          <p className="text-sm font-semibold">{selectedCase.patientAge != null ? `${selectedCase.patientAge} years` : "Not recorded"}</p>
                        )}
                      </div>
                      {/* Sex */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sex</p>
                        {isEditingCase ? (
                          <Select value={caseEditData?.patientGender ?? ""} onValueChange={(v) => setCaseEditData((p: any) => ({ ...p, patientGender: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-semibold capitalize">{selectedCase.patientGender || "Not recorded"}</p>
                        )}
                      </div>
                      {/* Date of Onset */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date of Onset</p>
                        {isEditingCase ? (
                          <Input className="h-8 text-xs" type="date" value={caseEditData?.dateOfOnset ?? ""} onChange={(e) => setCaseEditData((p: any) => ({ ...p, dateOfOnset: e.target.value }))} />
                        ) : (
                          <p className="text-sm font-semibold">{selectedCase.dateOfOnset ? new Date(selectedCase.dateOfOnset).toLocaleDateString() : "—"}</p>
                        )}
                      </div>
                      {/* Date Reported */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date Reported</p>
                        {isEditingCase ? (
                          <Input className="h-8 text-xs" type="date" value={caseEditData?.dateReported ?? ""} onChange={(e) => setCaseEditData((p: any) => ({ ...p, dateReported: e.target.value }))} />
                        ) : (
                          <p className="text-sm font-semibold">{selectedCase.dateReported ? new Date(selectedCase.dateReported).toLocaleDateString() : "—"}</p>
                        )}
                      </div>
                      {/* Classification */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Classification</p>
                        <Select value={caseEditData?.classification ?? selectedCase.classification} onValueChange={(v) => { setCaseEditData((p: any) => ({ ...(p||{}), classification: v })); updateCaseMutation.mutate({ id: selectedCase.id, classification: v }); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="suspected">Suspected</SelectItem>
                            <SelectItem value="probable">Probable</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="discarded">Discarded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Clinical Notes */}
                      <div className="col-span-2 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Clinical Notes</p>
                        {isEditingCase ? (
                          <textarea className="w-full h-20 text-xs border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={caseEditData?.clinicalNotes ?? ""} onChange={(e) => setCaseEditData((p: any) => ({ ...p, clinicalNotes: e.target.value })) } />
                        ) : (
                          <p className="text-sm text-muted-foreground">{selectedCase.clinicalNotes || "No notes recorded."}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Investigation date quick update */}
                  {!selectedCase.investigationDate && (
                    <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Investigation Date Not Set</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">IDSR standard: investigate within 48 hours of notification</p>
                      </div>
                      <Input type="date" className="h-8 w-40 text-xs" onChange={(e) => {
                        if (e.target.value) updateCaseMutation.mutate({ id: selectedCase.id, investigationDate: new Date(e.target.value).toISOString() });
                      }} />
                    </div>
                  )}

                  {/* Close case button */}
                  {selectedCase.status !== "closed" && (
                    <Button variant="outline" className="w-full h-9 text-sm border-dashed" onClick={() => updateCaseMutation.mutate({ id: selectedCase.id, status: "closed" })}>
                      Mark Case as Closed
                    </Button>
                  )}
                </TabsContent>



                {/* Checklist */}

                <TabsContent value="investigation" className="space-y-4">

                  {!selectedCase.templateId ? (

                    <div className="border border-dashed p-6 rounded-xl text-center space-y-3">

                      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />

                      <div>

                        <p className="text-sm font-semibold">No Checklist Template Linked</p>

                        <p className="text-xs text-muted-foreground mt-0.5">Link an investigation template to capture disease-specific data.</p>

                      </div>

                      <Select onValueChange={(v) => { if (v !== "none") updateCaseMutation.mutate({ id: selectedCase.id, templateId: parseInt(v) }); }}>

                        <SelectTrigger className="w-[250px] mx-auto"><SelectValue placeholder="Select Template" /></SelectTrigger>

                        <SelectContent position="popper">

                          {templates.filter((t: any) => t.disease === selectedCase.disease).map((t: any) => (

                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      <div className="flex items-center justify-between">

                        <h4 className="text-sm font-semibold">Checklist: {templates.find((t: any) => t.id === selectedCase.templateId)?.name}</h4>

                        <Button variant="outline" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => updateCaseMutation.mutate({ id: selectedCase.id, templateId: null })}>Unlink</Button>

                      </div>

                      <div className="space-y-4 border p-4 rounded-xl bg-background max-h-[400px] overflow-y-auto">

                        {templates.find((t: any) => t.id === selectedCase.templateId)?.fields?.map((field: any, idx: number) => (

                          <div key={idx} className="grid gap-2">

                            <Label className="text-xs font-semibold">{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>

                            {field.type === "calculated" ? (

                              <Input value={evalCalculated(field.options || "", checklistAnswers, selectedCase)} className="bg-muted font-mono" disabled readOnly />

                            ) : field.type === "boolean" ? (

                              <Select value={checklistAnswers[field.name] || ""} onValueChange={(v) => setChecklistAnswers({ ...checklistAnswers, [field.name]: v })}>

                                <SelectTrigger><SelectValue placeholder="Select Yes/No" /></SelectTrigger>

                                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>

                              </Select>

                            ) : field.type === "select" || field.type === "radio" ? (

                              <Select value={checklistAnswers[field.name] || ""} onValueChange={(v) => setChecklistAnswers({ ...checklistAnswers, [field.name]: v })}>

                                <SelectTrigger><SelectValue placeholder="Select Option" /></SelectTrigger>

                                <SelectContent>{Array.isArray(field.options) && field.options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>

                              </Select>

                            ) : (

                              <Input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={checklistAnswers[field.name] || ""} onChange={(e) => setChecklistAnswers({ ...checklistAnswers, [field.name]: e.target.value })} placeholder={field.label} />

                            )}

                          </div>

                        ))}

                      </div>

                      <Button onClick={() => updateCaseMutation.mutate({ id: selectedCase.id, formData: checklistAnswers })} className="w-full" disabled={updateCaseMutation.isPending}>

                        {updateCaseMutation.isPending ? "Saving..." : "Save Checklist Details"}

                      </Button>

                    </div>

                  )}

                </TabsContent>



                {/* Lab Specimens */}

                <TabsContent value="lab" className="space-y-4">

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">

                    {selectedCaseSamples.length === 0 ? (

                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">No specimens logged yet.</p>

                    ) : selectedCaseSamples.map((s: any) => (

                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">

                        <div>

                          <p className="text-sm font-semibold">{s.sampleType} Specimen</p>

                          <p className="text-[11px] text-muted-foreground">Collected: {new Date(s.dateCollected).toLocaleDateString()} · Lab: {s.labName || "N/A"}</p>

                        </div>

                        <div className="flex items-center gap-2">

                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${s.result === "positive" ? "bg-rose-100 text-rose-800" : s.result === "negative" ? "bg-emerald-100 text-emerald-800" : s.result === "inconclusive" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>{s.result}</span>

                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteSampleMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>

                        </div>

                      </div>

                    ))}

                  </div>



                  <div className="border p-4 rounded-xl bg-background space-y-3">

                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log New Specimen</h5>

                    <div className="grid grid-cols-2 gap-3">

                      <div className="grid gap-1.5">

                        <Label className="text-xs">Specimen Type</Label>

                        <Select value={sampleForm.sampleType} onValueChange={(v) => setSampleForm({ ...sampleForm, sampleType: v })}>

                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Stool">Stool (AFP Standard)</SelectItem>

                            <SelectItem value="Blood">Blood (Measles Standard)</SelectItem>

                            <SelectItem value="Serum">Serum</SelectItem>

                            <SelectItem value="Swab">Swab</SelectItem>

                            <SelectItem value="Urine">Urine</SelectItem>

                            <SelectItem value="Other">Other</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                      <div className="grid gap-1.5">

                        <Label className="text-xs">Date Collected</Label>

                        <Input type="date" value={sampleForm.dateCollected} onChange={(e) => setSampleForm({ ...sampleForm, dateCollected: e.target.value })} className="h-8" />

                      </div>

                      <div className="grid gap-1.5">

                        <Label className="text-xs">Lab Name</Label>

                        <Input placeholder="National Virology Lab" value={sampleForm.labName} onChange={(e) => setSampleForm({ ...sampleForm, labName: e.target.value })} className="h-8" />

                      </div>

                      <div className="grid gap-1.5">

                        <Label className="text-xs">Result</Label>

                        <Select value={sampleForm.result} onValueChange={(v) => setSampleForm({ ...sampleForm, result: v })}>

                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>

                          <SelectContent>

                            <SelectItem value="pending">Pending</SelectItem>

                            <SelectItem value="positive">Positive</SelectItem>

                            <SelectItem value="negative">Negative</SelectItem>

                            <SelectItem value="inconclusive">Inconclusive</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                    </div>

                    <Button size="sm" className="w-full" disabled={createSampleMutation.isPending} onClick={() => {

                      createSampleMutation.mutate({ ...sampleForm, dateCollected: new Date(sampleForm.dateCollected).toISOString() });

                      if (sampleForm.result === "positive") {

                        if (window.confirm("Positive specimen — auto-classify case as Confirmed?")) {

                          updateCaseMutation.mutate({ id: selectedCase.id, classification: "confirmed" });

                        }

                      }

                    }}>

                      {createSampleMutation.isPending ? "Saving..." : "Log Specimen"}

                    </Button>

                  </div>

                </TabsContent>

              </Tabs>

            </div>

          )}

        </SheetContent>

      </Sheet>

    </div>

  );

}

