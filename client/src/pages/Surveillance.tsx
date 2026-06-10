import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Activity, Map as MapIcon, Settings2, FileText, AlertTriangle, Trash2, ArrowUp, ArrowDown, CheckCircle2, Clock, ClipboardList, FlaskConical, X, Edit } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { MapView } from "@/components/MapView";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Surveillance() {
  const { toast } = useToast();
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  
  const { data: cases = [], isLoading: casesLoading } = useQuery<any[]>({
    queryKey: ["/api/surveillance/cases"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/surveillance/templates"],
  });

  const { data: configs = [] } = useQuery<any[]>({
    queryKey: ["/api/surveillance/config"],
  });

  const { data: provinces = [] } = useQuery<any[]>({ queryKey: ["/api/provinces"] });
  const { data: districts = [] } = useQuery<any[]>({ queryKey: ["/api/districts"] });
  const { data: facilities = [] } = useQuery<any[]>({ queryKey: ["/api/facilities"] });
  const { data: kpis } = useQuery<any>({ queryKey: ["/api/surveillance/cases/kpis"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");

  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [isCaseWorkflowOpen, setIsCaseWorkflowOpen] = useState(false);

  const { data: selectedCaseSamples = [], refetch: refetchSamples } = useQuery<any[]>({
    queryKey: [`/api/surveillance/cases/${selectedCase?.id}/samples`],
    enabled: !!selectedCase?.id,
  });

  const [sampleForm, setSampleForm] = useState<{
    id?: string;
    sampleType: string;
    dateCollected: string;
    dateSent: string;
    dateReceived: string;
    dateResults: string;
    result: string;
    labName: string;
    notes: string;
  }>({
    sampleType: "Blood",
    dateCollected: new Date().toISOString().split("T")[0],
    dateSent: "",
    dateReceived: "",
    dateResults: "",
    result: "pending",
    labName: "",
    notes: ""
  });

  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, any>>({});

  const createSampleMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/surveillance/cases/${selectedCase?.id}/samples`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surveillance/cases/${selectedCase?.id}/samples`] });
      toast({ title: "Sample Logged", description: "The lab specimen has been recorded." });
      setSampleForm({
        sampleType: "Blood",
        dateCollected: new Date().toISOString().split("T")[0],
        dateSent: "",
        dateReceived: "",
        dateResults: "",
        result: "pending",
        labName: "",
        notes: ""
      });
    },
    onError: (err: any) => {
      toast({ title: "Error logging sample", description: err.message, variant: "destructive" });
    }
  });

  const updateSampleMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("PATCH", `/api/surveillance/samples/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surveillance/cases/${selectedCase?.id}/samples`] });
      toast({ title: "Sample Updated", description: "The lab specimen details have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error updating sample", description: err.message, variant: "destructive" });
    }
  });

  const deleteSampleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/surveillance/samples/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/surveillance/cases/${selectedCase?.id}/samples`] });
      toast({ title: "Sample Deleted", description: "The lab specimen has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error deleting sample", description: err.message, variant: "destructive" });
    }
  });

  const reportCaseMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/surveillance/cases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases/kpis"] });
      setIsCaseModalOpen(false);
      setReportChecklistAnswers({});
      setLinkToRegistry(false);
      setFormData({
        disease: "afp",
        facilityId: "",
        patientName: "",
        patientAgeMonths: undefined,
        patientGender: "male",
        clientId: "",
        dateOfOnset: new Date().toISOString().split("T")[0],
        investigationDate: "",
        classification: "suspected",
        clinicalNotes: "",
        templateId: ""
      });
      toast({
        title: "Case Reported",
        description: "The suspected case has been logged and notifications dispatched.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to report case",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("PATCH", `/api/surveillance/cases/${data.id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases/kpis"] });
      setIsCaseModalOpen(false);
      if (selectedCase && selectedCase.id === data.id) {
        setSelectedCase(data);
      }
      toast({ title: "Case Updated", description: "The surveillance case has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update case", description: err.message, variant: "destructive" });
    }
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/surveillance/cases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/cases"] });
      toast({ title: "Case Deleted", description: "The surveillance case has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete case", description: err.message, variant: "destructive" });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/surveillance/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/templates"] });
      setIsTemplateModalOpen(false);
      setTemplateData({
        name: "", disease: "afp", description: "",
        fields: [{ name: "", label: "", type: "text", required: true }]
      });
      toast({ title: "Template Created", description: "Your custom linelist form is ready to use." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("PATCH", `/api/surveillance/templates/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/templates"] });
      setIsTemplateModalOpen(false);
      setTemplateData({
        name: "", disease: "afp", description: "",
        fields: [{ name: "", label: "", type: "text", required: true }]
      });
      toast({ title: "Template Updated", description: "Your custom linelist form has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/surveillance/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/templates"] });
      toast({ title: "Template Deleted", description: "The linelist template has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/surveillance/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveillance/config"] });
      setIsAlertsModalOpen(false);
      toast({ title: "Configuration Updated", description: "Surveillance alerts have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const [formData, setFormData] = useState<{
    id?: number;
    disease: string;
    facilityId: string;
    patientName: string;
    patientAgeMonths?: number;
    patientGender?: string;
    clientId?: string;
    dateOfOnset: string;
    investigationDate?: string;
    classification: string;
    clinicalNotes: string;
    templateId: string;
  }>({
    disease: "afp",
    facilityId: "",
    patientName: "",
    patientAgeMonths: undefined,
    patientGender: "male",
    clientId: "",
    dateOfOnset: new Date().toISOString().split("T")[0],
    investigationDate: "",
    classification: "suspected",
    clinicalNotes: "",
    templateId: ""
  });

  const [reportChecklistAnswers, setReportChecklistAnswers] = useState<Record<string, any>>({});
  const [linkToRegistry, setLinkToRegistry] = useState(false);

  const [templateData, setTemplateData] = useState<{
    id?: number;
    name: string;
    disease: string;
    description: string;
    fields: { name: string; label: string; type: string; required: boolean; options?: string }[];
  }>({
    name: "",
    disease: "afp",
    description: "",
    fields: [{ name: "", label: "", type: "text", required: true }]
  });

  const [alertConfigData, setAlertConfigData] = useState({
    disease: "afp",
    alertThreshold: 1,
    notifyRoles: "district_manager, provincial_coordinator"
  });

  const handleSubmitCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facilityId) {
      toast({ title: "Error", description: "Facility is required", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      patientAgeMonths: formData.patientAgeMonths ? parseInt(formData.patientAgeMonths.toString()) : undefined,
      clientId: linkToRegistry && formData.clientId ? formData.clientId : undefined,
      templateId: formData.templateId === "none" || formData.templateId === "" ? undefined : parseInt(formData.templateId),
      facilityId: parseInt(formData.facilityId),
      dateOfOnset: new Date(formData.dateOfOnset).toISOString(),
      investigationDate: formData.investigationDate ? new Date(formData.investigationDate).toISOString() : undefined,
      formData: reportChecklistAnswers
    };
    
    if (formData.id) {
      updateCaseMutation.mutate(payload);
    } else {
      reportCaseMutation.mutate(payload);
    }
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedData = {
      ...templateData,
      fields: templateData.fields.map(f => ({
        ...f,
        options: ['select', 'multiselect', 'radio'].includes(f.type) && f.options && typeof f.options === 'string'
          ? f.options.split(',').map((o: string) => o.trim()) 
          : f.options
      }))
    };
    if (templateData.id) {
      updateTemplateMutation.mutate(formattedData);
    } else {
      createTemplateMutation.mutate(formattedData);
    }
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate({
      disease: alertConfigData.disease,
      alertThreshold: parseInt(alertConfigData.alertThreshold.toString()),
      notifyRoles: alertConfigData.notifyRoles.split(",").map(r => r.trim())
    });
  };

  const addField = () => {
    setTemplateData({
      ...templateData,
      fields: [...templateData.fields, { name: "", label: "", type: "text", required: false }]
    });
  };

  const removeField = (index: number) => {
    setTemplateData({
      ...templateData,
      fields: templateData.fields.filter((_, i) => i !== index)
    });
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...templateData.fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setTemplateData({ ...templateData, fields: newFields });
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...templateData.fields];
    const temp = newFields[index - 1];
    newFields[index - 1] = newFields[index];
    newFields[index] = temp;
    setTemplateData({ ...templateData, fields: newFields });
  };

  const moveFieldDown = (index: number) => {
    if (index === templateData.fields.length - 1) return;
    const newFields = [...templateData.fields];
    const temp = newFields[index + 1];
    newFields[index + 1] = newFields[index];
    newFields[index] = temp;
    setTemplateData({ ...templateData, fields: newFields });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">VPD Surveillance</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Report Case
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Report Suspected Case
                </DialogTitle>
                <DialogDescription>
                  Enter case details, link registry records, and complete predefined checklists directly at the reporting site.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitCase} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Disease Target</Label>
                    <Select value={formData.disease || undefined} onValueChange={(v) => {
                      setFormData({ ...formData, disease: v });
                      setReportChecklistAnswers({});
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select Disease" /></SelectTrigger>
                      <SelectContent position="popper">
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

                  <div className="grid gap-2">
                    <Label>Classification</Label>
                    <Select value={formData.classification} onValueChange={(v) => setFormData({ ...formData, classification: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="suspected">Suspected</SelectItem>
                        <SelectItem value="probable">Probable</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="discarded">Discarded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Registry Linkage Checkbox */}
                <div className="flex items-center justify-between border p-3 rounded-xl bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Link to Client Registry</Label>
                    <p className="text-[11px] text-muted-foreground">Select an existing child or patient from the registry to auto-fill details.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={linkToRegistry} 
                    onChange={(e) => {
                      setLinkToRegistry(e.target.checked);
                      if (!e.target.checked) {
                        setFormData({
                          ...formData,
                          clientId: "",
                          patientName: "",
                          patientAgeMonths: undefined,
                          patientGender: "male"
                        });
                      }
                    }}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>

                {linkToRegistry && (
                  <div className="grid gap-2 border p-3 rounded-xl bg-background shadow-xs">
                    <Label className="text-xs font-semibold">Select Patient Record</Label>
                    <Select 
                      value={formData.clientId} 
                      onValueChange={(val) => {
                        const client = clients.find((c: any) => c.id === val || c.clientId === val);
                        if (client) {
                          const ageMonths = client.dateOfBirth 
                            ? Math.floor((Date.now() - new Date(client.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)) 
                            : undefined;
                          setFormData({
                            ...formData,
                            clientId: client.id,
                            patientName: client.name,
                            patientAgeMonths: ageMonths,
                            patientGender: client.gender || "male",
                            facilityId: client.facilityId ? String(client.facilityId) : formData.facilityId
                          });
                          const fac = facilities.find((f: any) => f.id === client.facilityId);
                          if (fac) {
                            setSelectedDistrictId(fac.districtId?.toString() || "");
                            const dist = districts.find((d: any) => d.id === fac.districtId);
                            if (dist) setSelectedProvinceId(dist.provinceId?.toString() || "");
                          }
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Search registered clients..." /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.clientId || "No ID"})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Patient Demographics */}
                <div className="grid grid-cols-3 gap-3 border p-3 rounded-xl bg-background shadow-xs">
                  <div className="grid gap-1">
                    <Label className="text-xs">Patient Name</Label>
                    <Input 
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      required
                      disabled={linkToRegistry}
                      className={linkToRegistry ? "bg-muted" : ""}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Age (Months)</Label>
                    <Input 
                      type="number"
                      value={formData.patientAgeMonths !== undefined ? formData.patientAgeMonths : ""}
                      onChange={(e) => setFormData({ ...formData, patientAgeMonths: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={linkToRegistry}
                      className={linkToRegistry ? "bg-muted" : ""}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Gender</Label>
                    <Select 
                      value={formData.patientGender} 
                      onValueChange={(val) => setFormData({ ...formData, patientGender: val })}
                      disabled={linkToRegistry}
                    >
                      <SelectTrigger className={linkToRegistry ? "bg-muted" : ""}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Smart Surveillance Warnings */}
                {formData.disease === "afp" && formData.patientAgeMonths !== undefined && formData.patientAgeMonths >= 180 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">WHO Standard Alert:</span> AFP surveillance targets children under 15 years old (&lt; 180 months). Verify patient age.
                    </div>
                  </div>
                )}

                {formData.disease === "nnt" && formData.patientAgeMonths !== undefined && formData.patientAgeMonths > 1 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">WHO Standard Alert:</span> Neonatal Tetanus targets newborns under 28 days old. Verify patient age.
                    </div>
                  </div>
                )}

                {/* Geographic Hierarchy */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Province</Label>
                    <Select value={selectedProvinceId || undefined} onValueChange={(v) => { setSelectedProvinceId(v); setSelectedDistrictId(""); setFormData({...formData, facilityId: ""}) }} disabled={linkToRegistry}>
                      <SelectTrigger className={linkToRegistry ? "bg-muted" : ""}><SelectValue placeholder="Province" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px]">
                        {provinces.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs">District</Label>
                    <Select value={selectedDistrictId || undefined} onValueChange={(v) => { setSelectedDistrictId(v); setFormData({...formData, facilityId: ""}) }} disabled={!selectedProvinceId || linkToRegistry}>
                      <SelectTrigger className={linkToRegistry ? "bg-muted" : ""}><SelectValue placeholder="District" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px]">
                        {districts.filter((d: any) => d.provinceId.toString() === selectedProvinceId).map((d: any) => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs">Facility</Label>
                    <Select value={formData.facilityId || undefined} onValueChange={(v) => setFormData({ ...formData, facilityId: v })} disabled={!selectedDistrictId || linkToRegistry}>
                      <SelectTrigger className={linkToRegistry ? "bg-muted" : ""}><SelectValue placeholder="Facility" /></SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px]">
                        {facilities.filter((f: any) => f.districtId.toString() === selectedDistrictId).map((f: any) => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label className="text-xs">Date of Onset</Label>
                    <Input 
                      type="date"
                      value={formData.dateOfOnset}
                      onChange={(e) => setFormData({ ...formData, dateOfOnset: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Date of Investigation</Label>
                    <Input 
                      type="date"
                      value={formData.investigationDate || ""}
                      onChange={(e) => setFormData({ ...formData, investigationDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Inline Active Predefined Template Checklist */}
                {(() => {
                  const activeTemplate = templates.find((t: any) => t.disease === formData.disease && t.isActive);
                  if (!activeTemplate) return null;
                  
                  // Auto-update templateId in form state behind the scenes
                  if (formData.templateId !== String(activeTemplate.id)) {
                    setTimeout(() => setFormData({ ...formData, templateId: String(activeTemplate.id) }), 0);
                  }

                  return (
                    <div className="border-t pt-3 space-y-3">
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                          <ClipboardList className="w-3.5 h-3.5" />
                          Predefined Checklist: {activeTemplate.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Please fill out standard disease-specific surveillance checklist inputs.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1 pb-2">
                        {activeTemplate.fields?.map((field: any, idx: number) => {
                          const evalCalculated = (formula: string) => {
                            const match = formula.match(/^([a-zA-Z]+)\(([^,]*),?([^,]*)\)$/);
                            if (!match) return "";
                            const op = match[1];
                            const op1 = match[2];
                            const op2 = match[3];
                            
                            const val1 = op1 === 'date_of_onset' ? formData.dateOfOnset : (reportChecklistAnswers[op1] || "");
                            const val2 = op2 === 'investigation_date' ? formData.investigationDate : (reportChecklistAnswers[op2] || "");
                            
                            if (op === 'dateDiff') {
                              if (!val1 || !val2) return "Pending dates";
                              const d1 = new Date(val1);
                              const d2 = new Date(val2);
                              const diffTime = Math.abs(d2.getTime() - d1.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return isNaN(diffDays) ? "" : `${diffDays} days`;
                            }
                            if (op === 'ageYears') {
                              if (!val1) return "Pending birthdate";
                              const dob = new Date(val1);
                              const diff = Date.now() - dob.getTime();
                              const ageDate = new Date(diff);
                              return Math.abs(ageDate.getUTCFullYear() - 1970);
                            }
                            return "";
                          };

                          return (
                            <div key={idx} className="grid gap-1">
                              <Label className="text-[11px] font-medium text-muted-foreground">{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                              {field.type === 'calculated' ? (
                                <Input 
                                  value={evalCalculated(field.options || "")}
                                  className="bg-muted font-mono h-8 text-xs"
                                  disabled
                                  readOnly
                                />
                              ) : field.type === 'boolean' ? (
                                <Select 
                                  value={reportChecklistAnswers[field.name] || ""} 
                                  onValueChange={(val) => setReportChecklistAnswers({ ...reportChecklistAnswers, [field.name]: val })}
                                >
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Yes/No" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : ['select', 'radio'].includes(field.type) ? (
                                <Select 
                                  value={reportChecklistAnswers[field.name] || ""} 
                                  onValueChange={(val) => setReportChecklistAnswers({ ...reportChecklistAnswers, [field.name]: val })}
                                >
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Option" /></SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(field.options) && field.options.map((opt: string) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input 
                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  value={reportChecklistAnswers[field.name] || ""}
                                  onChange={(e) => setReportChecklistAnswers({ ...reportChecklistAnswers, [field.name]: e.target.value })}
                                  placeholder={field.label}
                                  className="h-8 text-xs"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid gap-2">
                  <Label>Clinical Notes</Label>
                  <Input 
                    value={formData.clinicalNotes}
                    onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
                    placeholder="Enter clinical notes..."
                  />
                </div>

                <Button type="submit" className="w-full mt-2" disabled={reportCaseMutation.isPending}>
                  {reportCaseMutation.isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard"><Activity className="mr-2 h-4 w-4"/> Dashboard</TabsTrigger>
          <TabsTrigger value="linelist"><FileText className="mr-2 h-4 w-4"/> Case Linelist</TabsTrigger>
          <TabsTrigger value="map"><MapIcon className="mr-2 h-4 w-4"/> Spatial View</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="mr-2 h-4 w-4"/> Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cases (YTD)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cases.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspected AFP</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cases.filter((c: any) => c.disease === 'afp').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspected Measles</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cases.filter((c: any) => c.disease === 'measles').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Polio AFP Rate</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpis?.afpRate || "0.00"} <span className="text-sm text-muted-foreground font-normal">per 100k</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: &gt; 2.0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Measles Incidence</CardTitle>
                <Activity className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpis?.measlesRate || "0.00"} <span className="text-sm text-muted-foreground font-normal">per 100k</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map" className="h-[600px] border rounded-lg overflow-hidden">
          <MapView 
            facilities={facilities || []} 
            cases={cases || []} 
            height="100%" 
            mode="surveillance"
          />
        </TabsContent>

        <TabsContent value="linelist">
          <Card>
            <CardHeader>
              <CardTitle>Case Linelist</CardTitle>
              <CardDescription>Line list of all reported VPD cases.</CardDescription>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="p-4 text-center">Loading cases...</div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="h-10 px-4 text-left font-medium">ID</th>
                        <th className="h-10 px-4 text-left font-medium">Disease</th>
                        <th className="h-10 px-4 text-left font-medium">Patient</th>
                        <th className="h-10 px-4 text-left font-medium">Onset Date</th>
                        <th className="h-10 px-4 text-left font-medium">Status</th>
                        <th className="h-10 px-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No cases reported yet.</td></tr>
                      ) : cases.map((c: any) => (
                        <tr key={c.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 font-mono text-xs">{c.id.substring ? c.id.substring(0, 8) : c.id}</td>
                          <td className="p-4 uppercase font-semibold">{c.disease}</td>
                          <td className="p-4">{c.patientName}</td>
                          <td className="p-4">{new Date(c.dateOfOnset).toLocaleDateString()}</td>
                          <td className="p-4 capitalize">{c.classification}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="text-primary hover:text-primary-foreground border-primary/20 hover:border-primary" onClick={() => {
                                setSelectedCase(c);
                                setChecklistAnswers(c.formData || {});
                                setIsCaseWorkflowOpen(true);
                              }}>Manage Case</Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                if (window.confirm("Are you sure you want to delete this case?")) {
                                  deleteCaseMutation.mutate(c.id);
                                }
                              }}>Delete</Button>
                            </div>
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

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Surveillance Configuration</CardTitle>
              <CardDescription>Manage your active surveillance metrics, notification routing, and custom linelist templates.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Linelist Templates</h3>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">You have {templates.length} active custom templates for gathering additional case data.</p>
                    <Button variant="outline" size="sm" onClick={() => {
                      setTemplateData({
                        id: undefined,
                        name: "", disease: "afp", description: "",
                        fields: [{ name: "", label: "", type: "text", required: true }]
                      });
                      setIsTemplateModalOpen(true);
                    }}>Create New Template</Button>
                  </div>
                  
                  {templates.length > 0 && (
                    <div className="mb-4 rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="h-10 px-4 text-left font-medium">Template Name</th>
                            <th className="h-10 px-4 text-left font-medium">Disease</th>
                            <th className="h-10 px-4 text-left font-medium">Fields</th>
                            <th className="h-10 px-4 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.map((t: any) => (
                            <tr key={t.id} className="border-b transition-colors hover:bg-muted/50">
                              <td className="p-4 font-medium">{t.name}</td>
                              <td className="p-4 uppercase text-xs font-semibold">{t.disease}</td>
                              <td className="p-4 text-muted-foreground">{t.fields ? t.fields.length : 0} fields</td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setTemplateData({
                                      id: t.id,
                                      name: t.name,
                                      disease: t.disease,
                                      description: t.description || "",
                                      fields: t.fields || []
                                    });
                                    setIsTemplateModalOpen(true);
                                  }}>Edit</Button>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this template?")) {
                                      deleteTemplateMutation.mutate(t.id);
                                    }
                                  }}>Delete</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Create Linelist Template</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateTemplate} className="space-y-6 pt-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Template Name</Label>
                            <Input value={templateData.name} onChange={e => setTemplateData({...templateData, name: e.target.value})} required />
                          </div>
                          <div className="grid gap-2">
                            <Label>Disease Target</Label>
                            <Select value={templateData.disease || undefined} onValueChange={(v) => setTemplateData({ ...templateData, disease: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent position="popper">
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
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Input value={templateData.description} onChange={e => setTemplateData({...templateData, description: e.target.value})} />
                        </div>

                        <div className="border-t pt-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <Label className="text-base">Custom Form Fields</Label>
                              <p className="text-sm text-muted-foreground">Add specific data points to collect during case investigation.</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addField}>
                              <Plus className="w-4 h-4 mr-1" /> Add Field
                            </Button>
                          </div>
                          
                          <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-4">
                            {templateData.fields.map((field, idx) => (
                              <div key={idx} className="flex flex-col md:flex-row gap-3 items-start border p-4 rounded-md bg-background shadow-sm">
                                <div className="flex md:flex-col gap-1 shrink-0">
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFieldUp(idx)} disabled={idx === 0}>
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFieldDown(idx)} disabled={idx === templateData.fields.length - 1}>
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 w-full">
                                  <div className="md:col-span-4 grid gap-2">
                                    <Label className="text-xs text-muted-foreground">Internal Name</Label>
                                    <Input placeholder="e.g. stool_sample_1" value={field.name} onChange={e => updateField(idx, 'name', e.target.value)} required />
                                  </div>
                                  <div className="md:col-span-5 grid gap-2">
                                    <Label className="text-xs text-muted-foreground">Display Label</Label>
                                    <Input placeholder="e.g. Stool Sample 1 Date" value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} required />
                                  </div>
                                  <div className="md:col-span-3 grid gap-2">
                                    <Label className="text-xs text-muted-foreground">Data Type</Label>
                                    <Select value={field.type || undefined} onValueChange={v => updateField(idx, 'type', v)}>
                                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                      <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                                        <SelectItem value="text">Short Text</SelectItem>
                                        <SelectItem value="textarea">Long Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="boolean">Yes/No</SelectItem>
                                        <SelectItem value="select">Dropdown</SelectItem>
                                        <SelectItem value="multiselect">Multi-Select</SelectItem>
                                        <SelectItem value="radio">Radio Buttons</SelectItem>
                                        <SelectItem value="gis">GIS Location</SelectItem>
                                        <SelectItem value="calculated">Calculated Formula</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {['select', 'multiselect', 'radio'].includes(field.type) && (
                                    <div className="md:col-span-12 grid gap-2">
                                      <Label className="text-xs text-muted-foreground">Options (Comma Separated)</Label>
                                      <Input placeholder="Option 1, Option 2, Option 3" value={field.options || ''} onChange={e => updateField(idx, 'options', e.target.value)} required />
                                    </div>
                                  )}

                                  {field.type === 'calculated' && (() => {
                                    const formula = field.options || "";
                                    const match = formula.match(/^([a-zA-Z]+)\(([^,]*),?([^,]*)\)$/);
                                    const op = match ? match[1] : "";
                                    const op1 = match ? match[2] : "";
                                    const op2 = match ? match[3] : "";
                                    
                                    const previousDateFields = templateData.fields.slice(0, idx).filter(f => f.type === 'date' && f.name);
                                    const previousNumFields = templateData.fields.slice(0, idx).filter(f => (f.type === 'number' || f.type === 'calculated') && f.name);
                                    
                                    const handleBuild = (newOp: string, newOp1: string, newOp2: string) => {
                                      updateField(idx, 'options', `${newOp}(${newOp1},${newOp2})`);
                                    };

                                    return (
                                      <div className="md:col-span-12 grid gap-3 p-3 bg-muted/20 border rounded-md mt-2">
                                        <Label className="text-xs font-semibold">Formula Builder</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          <div className="grid gap-2">
                                            <Label className="text-xs text-muted-foreground">Operation</Label>
                                            <Select value={op || undefined} onValueChange={(v) => handleBuild(v, op1, op2)}>
                                              <SelectTrigger className="w-full"><SelectValue placeholder="Select Operation" /></SelectTrigger>
                                              <SelectContent position="popper">
                                                <SelectItem value="dateDiff">Date Difference (Days)</SelectItem>
                                                <SelectItem value="ageYears">Age in Years</SelectItem>
                                                <SelectItem value="add">Addition (+)</SelectItem>
                                                <SelectItem value="subtract">Subtraction (-)</SelectItem>
                                                <SelectItem value="multiply">Multiplication (*)</SelectItem>
                                                <SelectItem value="divide">Division (/)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="grid gap-2">
                                            <Label className="text-xs text-muted-foreground">Operand 1</Label>
                                            <Select value={op1 || undefined} onValueChange={(v) => handleBuild(op, v, op2)} disabled={!op}>
                                              <SelectTrigger className="w-full"><SelectValue placeholder="Select Field" /></SelectTrigger>
                                              <SelectContent position="popper">
                                                {['dateDiff', 'ageYears'].includes(op) 
                                                  ? previousDateFields.map(f => <SelectItem key={f.name} value={f.name}>{f.label} ({f.name})</SelectItem>)
                                                  : previousNumFields.map(f => <SelectItem key={f.name} value={f.name}>{f.label} ({f.name})</SelectItem>)
                                                }
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          {op !== 'ageYears' && (
                                            <div className="grid gap-2">
                                              <Label className="text-xs text-muted-foreground">Operand 2</Label>
                                              <Select value={op2 || undefined} onValueChange={(v) => handleBuild(op, op1, v)} disabled={!op}>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="Select Field" /></SelectTrigger>
                                                <SelectContent position="popper">
                                                  {['dateDiff', 'ageYears'].includes(op) 
                                                    ? previousDateFields.map(f => <SelectItem key={f.name} value={f.name}>{f.label} ({f.name})</SelectItem>)
                                                    : previousNumFields.map(f => <SelectItem key={f.name} value={f.name}>{f.label} ({f.name})</SelectItem>)
                                                  }
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Generated Formula: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{formula || 'None'}</code>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeField(idx)} className="shrink-0 md:mt-6">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-center mt-2 border-t pt-4">
                            <Button type="button" variant="outline" size="sm" onClick={addField}>
                              <Plus className="w-4 h-4 mr-1" /> Add Another Field
                            </Button>
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
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Notification Routing (UCE)</h3>
                  <p className="text-sm text-muted-foreground mb-4">When a suspected case is reported, immediate alerts are dispatched via WhatsApp, SMS, and Email to district managers and provincial coordinators according to the Unified Communication Engine rules.</p>
                  
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
                          <Select value={alertConfigData.disease || undefined} onValueChange={(v) => setAlertConfigData({ ...alertConfigData, disease: v })}>
                            <SelectTrigger><SelectValue placeholder="Select Disease" /></SelectTrigger>
                            <SelectContent position="popper">
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
                        <div className="grid gap-2">
                          <Label>Alert Threshold (Cases per 100k)</Label>
                          <Input type="number" min="1" value={alertConfigData.alertThreshold} onChange={e => setAlertConfigData({...alertConfigData, alertThreshold: parseInt(e.target.value) || 1})} required />
                        </div>
                        <div className="grid gap-2">
                          <Label>Notify Roles (comma separated)</Label>
                          <Input value={alertConfigData.notifyRoles} onChange={e => setAlertConfigData({...alertConfigData, notifyRoles: e.target.value})} placeholder="e.g. district_manager, provincial_coordinator" required />
                        </div>
                        <Button type="submit" className="w-full" disabled={updateConfigMutation.isPending}>
                          {updateConfigMutation.isPending ? "Saving..." : "Save Alert Settings"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isCaseWorkflowOpen} onOpenChange={setIsCaseWorkflowOpen}>
        <SheetContent className="sm:max-w-[650px] w-[95vw] overflow-y-auto flex flex-col p-6 space-y-6">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary animate-pulse" />
                  Manage Case: {selectedCase?.patientName}
                </SheetTitle>
                <SheetDescription>
                  VPD Case ID: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedCase?.id}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedCase && (
            <div className="space-y-6 flex-1">
              {/* Visual Workflow Stepper */}
              <div className="bg-muted/30 p-4 rounded-xl border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Investigation Progress</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">Reported</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-border mx-2"></div>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedCase.investigationDate ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary border border-primary/20"}`}>
                      {selectedCase.investigationDate ? <CheckCircle2 className="h-4 w-4" /> : "2"}
                    </div>
                    <span className={`text-xs font-medium ${selectedCase.investigationDate ? "font-semibold" : "text-muted-foreground"}`}>Investigated</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-border mx-2"></div>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedCaseSamples.length > 0 ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary border border-primary/20"}`}>
                      {selectedCaseSamples.length > 0 ? <CheckCircle2 className="h-4 w-4" /> : "3"}
                    </div>
                    <span className={`text-xs font-medium ${selectedCaseSamples.length > 0 ? "font-semibold" : "text-muted-foreground"}`}>Specimens</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-border mx-2"></div>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedCase.status === 'closed' ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary border border-primary/20"}`}>
                      {selectedCase.status === 'closed' ? <CheckCircle2 className="h-4 w-4" /> : "4"}
                    </div>
                    <span className={`text-xs font-medium ${selectedCase.status === 'closed' ? "font-semibold" : "text-muted-foreground"}`}>Outcome</span>
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <Tabs defaultValue="investigation" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Metadata</TabsTrigger>
                  <TabsTrigger value="investigation">Checklist</TabsTrigger>
                  <TabsTrigger value="lab">Lab Specs ({selectedCaseSamples.length})</TabsTrigger>
                </TabsList>

                {/* Tab 1: Metadata */}
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-background shadow-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Target Disease</p>
                      <p className="text-sm font-semibold uppercase">{selectedCase.disease}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Facility Reporting</p>
                      <p className="text-sm font-medium">{facilities.find((f: any) => f.id === selectedCase.facilityId)?.name || `Facility #${selectedCase.facilityId}`}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Patient Name</p>
                      <p className="text-sm font-semibold">{selectedCase.patientName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date of Onset</p>
                      <p className="text-sm font-medium">{new Date(selectedCase.dateOfOnset).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date Reported</p>
                      <p className="text-sm font-medium">{new Date(selectedCase.dateReported).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Classification</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        selectedCase.classification === 'confirmed' ? 'bg-rose-100 text-rose-800' :
                        selectedCase.classification === 'probable' ? 'bg-amber-100 text-amber-800' :
                        selectedCase.classification === 'discarded' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{selectedCase.classification}</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Investigation Checklist */}
                <TabsContent value="investigation" className="space-y-4">
                  {!selectedCase.templateId ? (
                    <div className="border border-dashed p-6 rounded-xl text-center space-y-3">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">No Checklist Template Linked</p>
                        <p className="text-xs text-muted-foreground">Link an active linelist template to capture disease-specific clinical data.</p>
                      </div>
                      <Select 
                        onValueChange={(val) => {
                          if (val !== "none") {
                            updateCaseMutation.mutate({ id: selectedCase.id, templateId: parseInt(val) });
                          }
                        }}
                      >
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateCaseMutation.mutate({ id: selectedCase.id, templateId: null })}
                          className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        >Unlink Template</Button>
                      </div>
                      
                      <div className="space-y-4 border p-4 rounded-xl bg-background max-h-[400px] overflow-y-auto pr-2">
                        {templates.find((t: any) => t.id === selectedCase.templateId)?.fields?.map((field: any, idx: number) => {
                          const evalCalculated = (formula: string) => {
                            const match = formula.match(/^([a-zA-Z]+)\(([^,]*),?([^,]*)\)$/);
                            if (!match) return "";
                            const op = match[1];
                            const op1 = match[2];
                            const op2 = match[3];
                            
                            const val1 = op1 === 'date_of_onset' ? selectedCase.dateOfOnset : (checklistAnswers[op1] || "");
                            const val2 = op2 === 'investigation_date' ? selectedCase.investigationDate : (checklistAnswers[op2] || "");
                            
                            if (op === 'dateDiff') {
                              if (!val1 || !val2) return "Pending dates";
                              const d1 = new Date(val1);
                              const d2 = new Date(val2);
                              const diffTime = Math.abs(d2.getTime() - d1.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return isNaN(diffDays) ? "" : `${diffDays} days`;
                            }
                            if (op === 'ageYears') {
                              if (!val1) return "Pending birthdate";
                              const dob = new Date(val1);
                              const diff = Date.now() - dob.getTime();
                              const ageDate = new Date(diff);
                              return Math.abs(ageDate.getUTCFullYear() - 1970);
                            }
                            return "";
                          };

                          return (
                            <div key={idx} className="grid gap-2">
                              <Label className="text-xs font-semibold">{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                              {field.type === 'calculated' ? (
                                <Input 
                                  value={evalCalculated(field.options || "")}
                                  className="bg-muted font-mono"
                                  disabled
                                  readOnly
                                />
                              ) : field.type === 'boolean' ? (
                                <Select 
                                  value={checklistAnswers[field.name] || ""} 
                                  onValueChange={(val) => setChecklistAnswers({ ...checklistAnswers, [field.name]: val })}
                                >
                                  <SelectTrigger><SelectValue placeholder="Select Yes/No" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : ['select', 'radio'].includes(field.type) ? (
                                <Select 
                                  value={checklistAnswers[field.name] || ""} 
                                  onValueChange={(val) => setChecklistAnswers({ ...checklistAnswers, [field.name]: val })}
                                >
                                  <SelectTrigger><SelectValue placeholder="Select Option" /></SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(field.options) && field.options.map((opt: string) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input 
                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  value={checklistAnswers[field.name] || ""}
                                  onChange={(e) => setChecklistAnswers({ ...checklistAnswers, [field.name]: e.target.value })}
                                  placeholder={field.label}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <Button 
                        onClick={() => updateCaseMutation.mutate({ id: selectedCase.id, formData: checklistAnswers })}
                        className="w-full"
                        disabled={updateCaseMutation.isPending}
                      >
                        {updateCaseMutation.isPending ? "Saving..." : "Save Checklist Details"}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Lab Specimens */}
                <TabsContent value="lab" className="space-y-4">
                  {/* Inline list of current samples */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {selectedCaseSamples.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">No laboratory samples logged yet.</p>
                    ) : (
                      selectedCaseSamples.map((sample) => (
                        <div key={sample.id} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-xs">
                          <div>
                            <p className="text-sm font-semibold">{sample.sampleType} Specimen</p>
                            <p className="text-[11px] text-muted-foreground">Collected: {new Date(sample.dateCollected).toLocaleDateString()} | Lab: {sample.labName || "N/A"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              sample.result === 'positive' ? 'bg-rose-100 text-rose-800' :
                              sample.result === 'negative' ? 'bg-emerald-100 text-emerald-800' :
                              sample.result === 'inconclusive' ? 'bg-amber-100 text-amber-800' :
                              'bg-muted text-muted-foreground'
                            }`}>{sample.result}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => deleteSampleMutation.mutate(sample.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add specimen form */}
                  <div className="border p-4 rounded-xl bg-background space-y-4 shadow-sm">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log New Specimen</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Specimen Type</Label>
                        <Select value={sampleForm.sampleType} onValueChange={(val) => setSampleForm({ ...sampleForm, sampleType: val })}>
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
                        <Input 
                          type="date" 
                          value={sampleForm.dateCollected} 
                          onChange={(e) => setSampleForm({ ...sampleForm, dateCollected: e.target.value })}
                          className="h-8"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs">Lab Name</Label>
                        <Input 
                          placeholder="e.g. National Virology Lab" 
                          value={sampleForm.labName} 
                          onChange={(e) => setSampleForm({ ...sampleForm, labName: e.target.value })}
                          className="h-8"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs">Result</Label>
                        <Select value={sampleForm.result} onValueChange={(val) => setSampleForm({ ...sampleForm, result: val })}>
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

                    <Button 
                      size="sm"
                      onClick={() => {
                        createSampleMutation.mutate({
                          ...sampleForm,
                          dateCollected: new Date(sampleForm.dateCollected).toISOString()
                        });
                        
                        // Suggest auto-classification
                        if (sampleForm.result === "positive") {
                          if (window.confirm("A positive specimen results automatically indicates confirmation. Do you want to auto-classify the Case status to 'Confirmed'?")) {
                            updateCaseMutation.mutate({ id: selectedCase.id, classification: "confirmed" });
                          }
                        }
                      }}
                      className="w-full"
                      disabled={createSampleMutation.isPending}
                    >
                      {createSampleMutation.isPending ? "Logging..." : "Log Specimen"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Step 4: Outcome & Closure */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-semibold">Case Resolution & Outcome</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs">Date of Investigation</Label>
                    <Input 
                      type="date"
                      value={selectedCase.investigationDate ? new Date(selectedCase.investigationDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => updateCaseMutation.mutate({ id: selectedCase.id, investigationDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Workflow Status</Label>
                    <Select 
                      value={selectedCase.status} 
                      onValueChange={(val) => updateCaseMutation.mutate({ id: selectedCase.id, status: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open (Active Tracking)</SelectItem>
                        <SelectItem value="under_investigation">Under Investigation</SelectItem>
                        <SelectItem value="closed">Closed (Final Outcome)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs">Final Classification</Label>
                  <Select 
                    value={selectedCase.classification} 
                    onValueChange={(val) => updateCaseMutation.mutate({ id: selectedCase.id, classification: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suspected">Suspected</SelectItem>
                      <SelectItem value="probable">Probable</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="discarded">Discarded (Negative specimens or non-VPD outcome)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
