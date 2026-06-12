import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Search,
  Building2,
  Phone,
  Briefcase,
  UserCheck,
  UserX,
  Loader2,
  ChevronRight,
  ChevronUp,
  Settings2,
  ClipboardList,
  Filter,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  MapPin,
  GraduationCap,
  Home,
  Award,
  TrendingUp,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
  Stethoscope,
  Star,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import type { Facility, Province, District } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StaffMember {
  id: number;
  facilityId: number;
  fullName: string;
  gender: string;
  position: string | null;
  contactPhone: string | null;
  yearsExperience: number | null;
  yearsAtFacility: number | null;
  role: string | null;
  campaignRole: string | null;
  isActive: boolean;
  isVolunteer: boolean;
  educationLevel: string | null;
  trainingStatus: string | null;
  residenceVillage: string | null;
  createdAt: string | null;
  employeeId?: string | null;
  nrc?: string | null;
  history?: any[] | null;
}

interface StaffFormData {
  fullName: string;
  gender: string;
  position: string;
  contactPhone: string;
  yearsExperience: string;
  yearsAtFacility: string;
  role: string;
  campaignRole: string;
  isActive: boolean;
  isVolunteer: boolean;
  educationLevel: string;
  trainingStatus: string;
  residenceVillage: string;
  employeeId: string;
  nrc: string;
  history: any[];
}

// ─── Import Types ─────────────────────────────────────────────────────────────
interface ImportRow {
  _rowNum: number;
  _errors: string[];
  fullName: string;
  gender: string;
  role: string;
  campaignRole: string;
  position: string | null;
  contactPhone: string | null;
  educationLevel: string | null;
  trainingStatus: string;
  yearsExperience: number | null;
  yearsAtFacility: number | null;
  residenceVillage: string | null;
  isActive: boolean;
  isVolunteer: boolean;
  employeeId: string | null;
  nrc: string | null;
  facilityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  resolvedFacilityId?: number | null;
}

interface ImportResult {
  rowNum: number;
  name: string;
  ok: boolean;
  error?: string;
}

const EMPTY_FORM: StaffFormData = {
  fullName: "",
  gender: "female",
  position: "",
  contactPhone: "",
  yearsExperience: "",
  yearsAtFacility: "",
  role: "vaccinator",
  campaignRole: "vaccinator",
  isActive: true,
  isVolunteer: false,
  educationLevel: "",
  trainingStatus: "trained",
  residenceVillage: "",
  employeeId: "",
  nrc: "",
  history: [],
};

const ROLE_OPTIONS = [
  { value: "vaccinator", label: "Vaccinator" },
  { value: "recorder", label: "Recorder" },
  { value: "supervisor", label: "Supervisor" },
  { value: "facility_in_charge", label: "Facility In-Charge" },
  { value: "nurse", label: "Nurse" },
  { value: "midwife", label: "Midwife" },
  { value: "chw", label: "Community Health Worker" },
  { value: "driver", label: "Driver" },
  { value: "cold_chain_officer", label: "Cold Chain Officer" },
];

const CAMPAIGN_ROLE_OPTIONS = [
  { value: "vaccinator", label: "Vaccinator" },
  { value: "mobilizer", label: "Social Mobilizer" },
  { value: "volunteer", label: "Volunteer" },
  { value: "supervisor", label: "Supervisor / Team Lead" },
  { value: "recorder", label: "Recorder / Tally" },
  { value: "logistics", label: "Logistics Officer" },
];

const EDUCATION_OPTIONS = [
  { value: "primary", label: "Primary Education" },
  { value: "secondary", label: "Secondary Education" },
  { value: "certificate", label: "Certificate / Diploma" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "phd", label: "PhD / Doctorate" },
];

const TRAINING_OPTIONS = [
  { value: "trained", label: "Trained" },
  { value: "not_trained", label: "Not Trained" },
  { value: "refresher_needed", label: "Refresher Needed" },
  { value: "in_training", label: "Currently in Training" },
];

// Role color mapping
const roleColor: Record<string, string> = {
  vaccinator: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  recorder: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  supervisor: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  facility_in_charge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  nurse: "bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400",
  midwife: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  chw: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400",
  driver: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  cold_chain_officer: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Avatar Initials ──────────────────────────────────────────────────────────
function StaffAvatar({ name, gender }: { name: string; gender: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const femaleGradient = "from-rose-400 to-pink-600";
  const maleGradient = "from-blue-400 to-indigo-600";
  const gradient = gender === "male" ? maleGradient : femaleGradient;
  return (
    <div
      className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm`}
    >
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StaffManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // National admin / platform admin can see all facilities without selecting one
  const isGlobalAdmin = !!(user?.isPlatformAdmin || user?.role === "national_admin");
  // District/provincial roles see all staff in their geo scope without needing a facility filter
  const isDistrictOrProvincial =
    user?.role === "district_manager" ||
    user?.role === "district_partner" ||
    user?.role === "provincial_coordinator" ||
    user?.role === "provincial_partner";
  // Any role that can load staff without first picking a facility
  const canSeeMultiFacilityStaff = isGlobalAdmin || isDistrictOrProvincial;
  // ─── Cascade Filter State ─────────────────────────────────────────────────
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("roster");

  // ─── Pagination & Sorting State ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ─── Column Visibility State ──────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    staffMember: true,
    facility: true,
    role: true,
    campaignRole: false,
    training: true,
    experience: true,
    contact: true,
    employeeId: true,
    nrc: true,
    active: true,
  });

  const COLUMN_LABELS: Record<string, string> = {
    staffMember: "Staff Member",
    facility: "Facility",
    role: "Routine Role",
    campaignRole: "Campaign Role",
    training: "Training Status",
    experience: "Experience",
    contact: "Contact Phone",
    employeeId: "Employee ID",
    nrc: "NRC Number",
    active: "Status",
  };

  // ─── Dialog State ─────────────────────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffFormData>(EMPTY_FORM);
  const [formTab, setFormTab] = useState("basic");
  // When national admin adds staff, they must pick a facility
  const [formFacilityId, setFormFacilityId] = useState<string>("");

  // ─── Employment History Add State ─────────────────────────────────────────
  const [historyFacility, setHistoryFacility] = useState("");
  const [historyRole, setHistoryRole] = useState("");
  const [historyYears, setHistoryYears] = useState("");
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<StaffMember | null>(null);

  // ─── Bulk Actions State & Logic ───────────────────────────────────────────
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, percentage: 0 });

  const runBulkAction = async (
    actionName: string,
    actionFn: (staff: StaffMember) => Promise<void>
  ) => {
    if (selectedStaffIds.length === 0) return;
    setBulkProcessing(true);
    const total = selectedStaffIds.length;
    setBulkProgress({ current: 0, total, percentage: 0 });

    const selectedStaff = staffList.filter((s) => selectedStaffIds.includes(s.id));
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i += batchSize) {
      const batch = selectedStaff.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (staff) => {
          try {
            await actionFn(staff);
            successCount++;
          } catch (err) {
            failCount++;
            console.error(`Failed bulk action ${actionName} on staff ${staff.id}:`, err);
          }
        })
      );
      const current = Math.min(i + batchSize, total);
      setBulkProgress({
        current,
        total,
        percentage: Math.round((current / total) * 100),
      });
    }

    setBulkProcessing(false);
    setSelectedStaffIds([]);
    refetchStaff();

    toast({
      title: `${actionName} complete`,
      description: `${successCount} staff successfully processed.${failCount ? ` ${failCount} failed.` : ""}`,
      variant: failCount > 0 ? "destructive" : "default"
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to permanently delete the ${selectedStaffIds.length} selected staff members? This cannot be undone.`)) {
      void runBulkAction(
        "Bulk Delete",
        async (staff) => {
          await apiRequest("DELETE", `/api/facilities/${staff.facilityId}/staff/${staff.id}`);
        }
      );
    }
  };

  const handleBulkToggleActive = (isActive: boolean) => {
    void runBulkAction(
      `Bulk Set ${isActive ? 'Active' : 'Inactive'}`,
      async (staff) => {
        await apiRequest("PATCH", `/api/facilities/${staff.facilityId}/staff/${staff.id}`, { isActive });
      }
    );
  };

  const handleBulkUpdateRole = (role: string) => {
    void runBulkAction(
      "Bulk Update Role",
      async (staff) => {
        await apiRequest("PATCH", `/api/facilities/${staff.facilityId}/staff/${staff.id}`, { role });
      }
    );
  };

  const handleBulkUpdateTraining = (trainingStatus: string) => {
    void runBulkAction(
      "Bulk Update Training",
      async (staff) => {
        await apiRequest("PATCH", `/api/facilities/${staff.facilityId}/staff/${staff.id}`, { trainingStatus });
      }
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStaffIds(paginatedStaff.map((s) => s.id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedStaffIds((prev) => [...prev, id]);
    } else {
      setSelectedStaffIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleAddHistoryEntry = () => {
    if (!historyFacility.trim() || !historyRole.trim()) {
      toast({ title: "Facility and Role are required for history entry.", variant: "destructive" });
      return;
    }
    const years = historyYears ? parseInt(historyYears) : 1;
    const newEntry = { facilityName: historyFacility.trim(), role: historyRole.trim(), years };
    setForm((prev) => ({
      ...prev,
      history: [...(prev.history || []), newEntry],
    }));
    setHistoryFacility("");
    setHistoryRole("");
    setHistoryYears("");
  };

  const handleRemoveHistoryEntry = (index: number) => {
    setForm((prev) => ({
      ...prev,
      history: (prev.history || []).filter((_: any, i: number) => i !== index),
    }));
  };

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStaffIds([]);
  }, [searchTerm, roleFilter, statusFilter, pageSize]);

  // Reset selection on pagination page changes
  useEffect(() => {
    setSelectedStaffIds([]);
  }, [currentPage]);

  // ─── Cascade Queries ──────────────────────────────────────────────────────
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: allDistricts = [], isLoading: loadingDistricts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
  });

  const { data: allFacilities = [], isLoading: loadingFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  // ─── Derived / filtered cascades ─────────────────────────────────────────
  const districts = useMemo(() => {
    if (!selectedProvinceId) return allDistricts;
    return allDistricts.filter(
      (d) => d.provinceId.toString() === selectedProvinceId
    );
  }, [allDistricts, selectedProvinceId]);

  const facilities = useMemo(() => {
    if (!selectedDistrictId) {
      if (!selectedProvinceId) return allFacilities;
      // filter by province via districts
      const districtIds = new Set(districts.map((d) => d.id));
      return allFacilities.filter((f) => districtIds.has(f.districtId));
    }
    return allFacilities.filter(
      (f) => f.districtId.toString() === selectedDistrictId
    );
  }, [allFacilities, selectedDistrictId, selectedProvinceId, districts]);

  // Auto-cascade resets
  const handleProvinceChange = (val: string) => {
    setSelectedProvinceId(val === "all" ? "" : val);
    setSelectedDistrictId("");
    setSelectedFacilityId("");
  };

  const handleDistrictChange = (val: string) => {
    setSelectedDistrictId(val === "all" ? "" : val);
    setSelectedFacilityId("");
  };

  const handleFacilityChange = (val: string) => {
    setSelectedFacilityId(val === "all" ? "" : val);
  };

  // Auto-select single province/facility
  useEffect(() => {
    if (provinces.length === 1 && !selectedProvinceId) {
      setSelectedProvinceId(provinces[0].id.toString());
    }
  }, [provinces]);

  useEffect(() => {
    if (facilities.length === 1 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id.toString());
    }
  }, [facilities]);

  // ─── Staff Query ─────────────────────────────────────────────────────────
  // Global admins and district/provincial users use /api/staff (sees all facilities in scope).
  // Facility-level roles require a facility selection first.
  const staffQueryEnabled = canSeeMultiFacilityStaff || !!selectedFacilityId;
  const {
    data: staffList = [],
    isLoading: isLoadingStaff,
    refetch: refetchStaff,
  } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff", selectedFacilityId || "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFacilityId) params.set("facilityId", selectedFacilityId);
      const res = await fetch(`/api/staff?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
    enabled: staffQueryEnabled,
  });

  // ─── Derived Lookups ─────────────────────────────────────────────────────
  const selectedFacility = useMemo(
    () => allFacilities.find((f) => f.id.toString() === selectedFacilityId),
    [allFacilities, selectedFacilityId]
  );

  const selectedDistrict = useMemo(
    () => allDistricts.find((d) => d.id.toString() === selectedDistrictId),
    [allDistricts, selectedDistrictId]
  );

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.id.toString() === selectedProvinceId),
    [provinces, selectedProvinceId]
  );

  // ─── Filtered Staff ──────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    let result = staffList;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          (s.position && s.position.toLowerCase().includes(term)) ||
          (s.contactPhone && s.contactPhone.includes(term)) ||
          (s.role && s.role.toLowerCase().includes(term)) ||
          (s.employeeId && s.employeeId.toLowerCase().includes(term)) ||
          (s.nrc && s.nrc.toLowerCase().includes(term)) ||
          (s.residenceVillage && s.residenceVillage.toLowerCase().includes(term))
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((s) => s.role === roleFilter);
    }
    if (statusFilter === "active") result = result.filter((s) => s.isActive);
    if (statusFilter === "inactive") result = result.filter((s) => !s.isActive);
    if (statusFilter === "volunteer") result = result.filter((s) => s.isVolunteer);
    return result;
  }, [staffList, searchTerm, roleFilter, statusFilter]);

  // ─── Sorting Logic ───────────────────────────────────────────────────────
  const sortedStaff = useMemo(() => {
    const result = [...filteredStaff];
    if (sortColumn) {
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";
        if (sortColumn === "name") {
          valA = a.fullName.toLowerCase();
          valB = b.fullName.toLowerCase();
        } else if (sortColumn === "role") {
          valA = (a.role || "").toLowerCase();
          valB = (b.role || "").toLowerCase();
        } else if (sortColumn === "experience") {
          valA = a.yearsExperience || 0;
          valB = b.yearsExperience || 0;
        } else if (sortColumn === "employeeId") {
          valA = (a.employeeId || "").toLowerCase();
          valB = (b.employeeId || "").toLowerCase();
        } else if (sortColumn === "nrc") {
          valA = (a.nrc || "").toLowerCase();
          valB = (b.nrc || "").toLowerCase();
        } else if (sortColumn === "facility") {
          const facA = allFacilities.find((f) => f.id === a.facilityId)?.name || "";
          const facB = allFacilities.find((f) => f.id === b.facilityId)?.name || "";
          valA = facA.toLowerCase();
          valB = facB.toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredStaff, sortColumn, sortDirection, allFacilities]);

  // ─── Paginated Staff ─────────────────────────────────────────────────────
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStaff.slice(start, start + pageSize);
  }, [sortedStaff, currentPage, pageSize]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = staffList.filter((s) => s.isActive).length;
    const volunteers = staffList.filter((s) => s.isVolunteer).length;
    const vaccinators = staffList.filter((s) => s.role === "vaccinator").length;
    const supervisors = staffList.filter(
      (s) => s.role === "supervisor" || s.role === "facility_in_charge"
    ).length;
    return { total: staffList.length, active, volunteers, vaccinators, supervisors };
  }, [staffList]);

  // ─── Form Helpers ─────────────────────────────────────────────────────────
  const setField = useCallback(
    <K extends keyof StaffFormData>(key: K, val: StaffFormData[K]) =>
      setForm((prev) => ({ ...prev, [key]: val })),
    []
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingStaff(null);
    setFormTab("basic");
    // Pre-fill facility when one is selected
    setFormFacilityId(selectedFacilityId);
  }, [selectedFacilityId]);

  const handleNewStaff = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    // Always lock to the staff's own facility for edits
    setFormFacilityId(staff.facilityId.toString());
    setForm({
      fullName: staff.fullName,
      gender: staff.gender || "female",
      position: staff.position || "",
      contactPhone: staff.contactPhone || "",
      yearsExperience: staff.yearsExperience?.toString() || "",
      yearsAtFacility: staff.yearsAtFacility?.toString() || "",
      role: staff.role || "vaccinator",
      campaignRole: staff.campaignRole || "vaccinator",
      isActive: staff.isActive,
      isVolunteer: staff.isVolunteer,
      educationLevel: staff.educationLevel || "",
      trainingStatus: staff.trainingStatus || "trained",
      residenceVillage: staff.residenceVillage || "",
      employeeId: staff.employeeId || "",
      nrc: staff.nrc || "",
      history: staff.history || [],
    });
    setFormTab("basic");
    setIsDialogOpen(true);
  };

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const facilityId = formFacilityId || selectedFacilityId;
      if (!facilityId) {
        throw new Error("Please select a facility before adding staff.");
      }
      const payload = {
        fullName: form.fullName.trim(),
        gender: form.gender,
        position: form.position.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        yearsAtFacility: form.yearsAtFacility ? parseInt(form.yearsAtFacility) : null,
        role: form.role,
        campaignRole: form.campaignRole,
        isActive: form.isActive,
        isVolunteer: form.isVolunteer,
        educationLevel: form.educationLevel || null,
        trainingStatus: form.trainingStatus || null,
        residenceVillage: form.residenceVillage.trim() || null,
        employeeId: form.employeeId.trim() || null,
        nrc: form.nrc.trim() || null,
        history: form.history || [],
      };
      if (editingStaff) {
        // Use the staff's own facilityId for edits (critical for national view)
        await apiRequest(
          "PATCH",
          `/api/facilities/${editingStaff.facilityId}/staff/${editingStaff.id}`,
          payload
        );
      } else {
        await apiRequest("POST", `/api/facilities/${facilityId}/staff`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: editingStaff ? "Staff record updated" : "Staff member added",
        description: `${form.fullName.trim()} has been saved to the roster.`,
      });
      refetchStaff();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    // Pass full staff object so we can use staff.facilityId (works in national view)
    mutationFn: async (staff: StaffMember) => {
      await apiRequest(
        "DELETE",
        `/api/facilities/${staff.facilityId}/staff/${staff.id}`
      );
    },
    onSuccess: (_, staffId) => {
      toast({ title: "Staff member removed", description: "The record has been deleted." });
      refetchStaff();
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  // Quick status toggle — uses staff.facilityId so it works in national view
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ staff }: { staff: StaffMember }) => {
      await apiRequest(
        "PATCH",
        `/api/facilities/${staff.facilityId}/staff/${staff.id}`,
        { isActive: !staff.isActive }
      );
    },
    onSuccess: () => refetchStaff(),
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (staff: StaffMember) => {
    if (confirm(`Remove ${staff.fullName} from the roster? This cannot be undone.`)) {
      deleteMutation.mutate(staff);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    // NRC is mandatory
    if (!form.nrc.trim()) {
      toast({ title: "NRC Number is required", description: "Every staff member must have a unique NRC number.", variant: "destructive" });
      return;
    }
    // NRC uniqueness check (exclude self when editing)
    const nrcLower = form.nrc.trim().toLowerCase();
    const duplicate = staffList.find(
      (s) => s.nrc && s.nrc.toLowerCase() === nrcLower && s.id !== editingStaff?.id
    );
    if (duplicate) {
      toast({
        title: "Duplicate NRC",
        description: `NRC ${form.nrc.trim()} is already registered to ${duplicate.fullName}. Each staff member must have a unique NRC.`,
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  // ─── CSV Import State ─────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importStep, setImportStep] = useState<"preview" | "uploading" | "done">("preview");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  // Facility choice when importing from the global/national view
  const [importTargetFacilityId, setImportTargetFacilityId] = useState<string>("");
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; percentage: number }>({
    current: 0,
    total: 0,
    percentage: 0,
  });

  // Export to CSV
  const handleExport = () => {
    if (!staffList.length) return;
    const headers = [
      "ID", "Employee ID", "NRC", "Full Name", "Gender", "Role", "Campaign Role", "Position",
      "Phone", "Education", "Training Status", "Experience (yrs)", "Yrs at Facility",
      "Village", "Active", "Volunteer",
    ];
    const rows = staffList.map((s) => [
      s.id, s.employeeId || "", s.nrc || "", s.fullName, s.gender, s.role, s.campaignRole, s.position,
      s.contactPhone, s.educationLevel, s.trainingStatus, s.yearsExperience,
      s.yearsAtFacility, s.residenceVillage, s.isActive ? "Yes" : "No",
      s.isVolunteer ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_${selectedFacility?.name || "roster"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `${staffList.length} records downloaded.` });
  };

  // Download blank template
  const handleDownloadTemplate = () => {
    const headers = [
      "full_name",
      "employee_id",
      "nrc",
      "gender",
      "role",
      "campaign_role",
      "position",
      "contact_phone",
      "education_level",
      "training_status",
      "years_experience",
      "years_at_facility",
      "residence_village",
      "is_active",
      "is_volunteer",
      "facility_name",
      "district_name",
      "province_name",
    ];
    const notes = [
      "# gender: female | male | other",
      "# role: vaccinator | recorder | supervisor | facility_in_charge | nurse | midwife | chw | driver | cold_chain_officer",
      "# campaign_role: vaccinator | mobilizer | volunteer | supervisor | recorder | logistics",
      "# education_level: primary | secondary | certificate | bachelors | masters | phd",
      "# training_status: trained | not_trained | refresher_needed | in_training",
      "# is_active: Yes | No  (default Yes)",
      "# is_volunteer: Yes | No  (default No)",
      "# facility_name, district_name, province_name are optional but recommended for bulk uploading across facilities",
    ];
    const sampleRow = [
      "Mary Phiri", "EMP-0042", "123456/10/1", "female", "vaccinator", "vaccinator",
      "Clinical Officer", "+260977123456", "certificate",
      "trained", "5", "2", "Kalingalinga", "Yes", "No",
      selectedFacility?.name || "Mushitala Urban Health Centre",
      selectedDistrict?.name || "Solwezi",
      selectedProvince?.name || "North-Western",
    ];
    const csvContent = [
      notes.join("\n"),
      headers.join(","),
      sampleRow.join(","),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded", description: "Fill in the CSV and use Import to upload." });
  };

  // Parse CSV file chosen by user (updated to pre-fill the target facility if selected)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      // Strip comment lines (start with #) and blank lines
      const lines = text
        .split(/\r?\n/)
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (lines.length < 2) {
        toast({ title: "Empty file", description: "The CSV must have a header row and at least one data row.", variant: "destructive" });
        return;
      }
      const rawHeaders = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const col = (name: string) => rawHeaders.indexOf(name);

      const parsed: ImportRow[] = lines.slice(1).map((line, idx) => {
        // Handle quoted fields
        const cells: string[] = [];
        let cur = "", inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        cells.push(cur.trim());

        const get = (name: string) => {
          const index = col(name);
          return index !== -1 ? (cells[index] || "").trim() : "";
        };
        const fullName = get("full_name") || get("fullname") || get("name") || get("full name");
        const nrcVal = (get("nrc") || get("nrc_number") || "").trim();
        const errors: string[] = [];

        if (!fullName) errors.push("full_name is required");
        const gender = get("gender") || "female";
        if (gender && !["female", "male", "other"].includes(gender.toLowerCase())) {
          errors.push(`Invalid gender "${gender}"`);
        }
        const role = get("role") || "vaccinator";
        const validRoles = ["vaccinator","recorder","supervisor","facility_in_charge","nurse","midwife","chw","driver","cold_chain_officer"];
        if (!validRoles.includes(role.toLowerCase())) {
          errors.push(`Invalid role "${role}"`);
        }
        const exp = get("years_experience") || get("experience_yrs") || get("experience (yrs)");
        const atFac = get("years_at_facility") || get("yrs_at_facility") || get("yrs at facility");
        if (exp && isNaN(Number(exp))) errors.push(`years_experience must be a number`);
        if (atFac && isNaN(Number(atFac))) errors.push(`years_at_facility must be a number`);

        const isActiveRaw = get("is_active") || get("active");
        const isVolRaw = get("is_volunteer") || get("volunteer");

        // Facility resolver
        const facilityName = get("facility_name") || get("facility") || get("health_facility");
        const districtName = get("district_name") || get("district");
        const provinceName = get("province_name") || get("province");
        
        let resolvedFacilityId: number | null = null;
        if (facilityName) {
          const fNameLower = facilityName.toLowerCase().trim();
          const dNameLower = districtName.toLowerCase().trim();
          const pNameLower = provinceName.toLowerCase().trim();
          
          let matches = allFacilities.filter(f => f.name.toLowerCase().trim() === fNameLower);
          if (matches.length === 0) {
            matches = allFacilities.filter(f => f.name.toLowerCase().includes(fNameLower));
          }
          
          if (matches.length === 1) {
            resolvedFacilityId = matches[0].id;
          } else if (matches.length > 1) {
            if (dNameLower) {
              const matchedDist = matches.filter(f => {
                const d = allDistricts.find(dist => dist.id === f.districtId);
                return d && d.name.toLowerCase().trim() === dNameLower;
              });
              if (matchedDist.length === 1) {
                resolvedFacilityId = matchedDist[0].id;
              } else if (matchedDist.length > 1) {
                matches = matchedDist;
              }
            }
            if (!resolvedFacilityId && pNameLower) {
              const matchedProv = matches.filter(f => {
                const d = allDistricts.find(dist => dist.id === f.districtId);
                if (!d) return false;
                const p = provinces.find(prov => prov.id === d.provinceId);
                return p && p.name.toLowerCase().trim() === pNameLower;
              });
              if (matchedProv.length === 1) {
                resolvedFacilityId = matchedProv[0].id;
              }
            }
            if (!resolvedFacilityId && matches.length > 0) {
              resolvedFacilityId = matches[0].id;
            }
          }
          if (!resolvedFacilityId) {
            errors.push(`Could not resolve facility "${facilityName}"`);
          }
        }

        return {
          _rowNum: idx + 2,
          _errors: errors,
          fullName,
          gender: gender.toLowerCase() || "female",
          role: role.toLowerCase() || "vaccinator",
          campaignRole: (get("campaign_role") || get("campaignrole") || "vaccinator").toLowerCase(),
          position: get("position") || null,
          contactPhone: get("contact_phone") || get("phone") || null,
          educationLevel: get("education_level") || null,
          trainingStatus: get("training_status") || "trained",
          yearsExperience: exp ? parseInt(exp) : null,
          yearsAtFacility: atFac ? parseInt(atFac) : null,
          residenceVillage: get("residence_village") || null,
          isActive: isActiveRaw ? isActiveRaw.toLowerCase() !== "no" : true,
          isVolunteer: isVolRaw ? isVolRaw.toLowerCase() === "yes" : false,
          employeeId: get("employee_id") || get("employeeid") || null,
          nrc: get("nrc") || get("nrc_number") || null,
          facilityName: facilityName || null,
          districtName: districtName || null,
          provinceName: provinceName || null,
          resolvedFacilityId,
        } as ImportRow;
      });

      setImportRows(parsed);
      setImportStep("preview");
      setImportResults([]);
      setImportTargetFacilityId(selectedFacilityId);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  // Bulk POST each valid row
  const importMutation = useMutation({
    mutationFn: async () => {
      // Use the *current* selectedFacilityId at submit time (not a stale capture)
      const fallbackFacilityId = selectedFacilityId || importTargetFacilityId;
      setImportStep("uploading");
      const validRows = importRows.filter((r) => r._errors.length === 0);
      const total = validRows.length;
      setImportProgress({ current: 0, total, percentage: 0 });
      const results: ImportResult[] = [];

      // Process in concurrent batches of 10 to speed it up significantly
      const batchSize = 10;
      for (let i = 0; i < total; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (row) => {
            const { _rowNum, _errors, facilityName, districtName, provinceName, resolvedFacilityId, ...payload } = row;
            // Prefer facility resolved from CSV column; fall back to filter selection
            const targetFacilityId = resolvedFacilityId?.toString() || fallbackFacilityId;
            if (!targetFacilityId) {
              results.push({ rowNum: _rowNum, name: row.fullName, ok: false, error: "No facility — add facility_name column to CSV or select a facility in the filter" });
              return;
            }
            try {
              await apiRequest("POST", `/api/facilities/${targetFacilityId}/staff`, payload);
              results.push({ rowNum: _rowNum, name: row.fullName, ok: true });
            } catch (err: any) {
              results.push({ rowNum: _rowNum, name: row.fullName, ok: false, error: err.message });
            }
          })
        );
        const current = Math.min(i + batchSize, total);
        setImportProgress({
          current,
          total,
          percentage: Math.round((current / total) * 100),
        });
      }

      setImportResults(results);
      setImportStep("done");
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.ok).length;
      const fail = results.filter((r) => !r.ok).length;
      toast({
        title: `Import complete — ${ok} added${fail ? `, ${fail} failed` : ""}`,
        description: fail ? "Review failed rows in the dialog." : "All staff members have been added to the roster.",
        variant: fail ? "destructive" : "default",
      });
      refetchStaff();
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
      setImportStep("preview");
    },
  });

  // ─── Breadcrumb ──────────────────────────────────────────────────────────
  const breadcrumb = [
    selectedProvince?.name,
    selectedDistrict?.name,
    selectedFacility?.name,
  ]
    .filter(Boolean)
    .join(" › ");

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ── */}
      <div className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-[1400px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">
                  Staff Roster Management
                </h1>
                {breadcrumb ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {breadcrumb}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage healthcare workers across facilities
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStaff()}
                disabled={!staffQueryEnabled}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!staffList.length}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              {/* Import group */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1.5 border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 border-dashed border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500"
              >
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </Button>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                size="sm"
                onClick={handleNewStaff}
                 title={
                  (isGlobalAdmin || isDistrictOrProvincial) && !selectedFacilityId
                    ? "Select a facility in the filter to add staff"
                    : undefined
                }
              >
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-[1400px] space-y-6">
        {/* ── Smart Cascade Filter ── */}
        <Card className="border-border bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-violet-500/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-foreground">Smart Cascade Filter</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-blue-500/10 text-blue-600 border-0">
                Province → District → Facility
              </Badge>
              {(selectedProvinceId || selectedDistrictId || selectedFacilityId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-muted-foreground hover:text-foreground gap-1 text-xs"
                  onClick={() => {
                    setSelectedProvinceId("");
                    setSelectedDistrictId("");
                    setSelectedFacilityId("");
                  }}
                >
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Province */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] items-center justify-center font-bold">1</span>
                  Province / State
                </Label>
                <Select
                  value={selectedProvinceId || "all"}
                  onValueChange={handleProvinceChange}
                  disabled={loadingProvinces}
                >
                  <SelectTrigger className="bg-background border-border h-9">
                    <SelectValue placeholder={loadingProvinces ? "Loading..." : "All Provinces"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] items-center justify-center font-bold">2</span>
                  District / County
                  {selectedProvinceId && districts.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">({districts.length})</span>
                  )}
                </Label>
                <Select
                  value={selectedDistrictId || "all"}
                  onValueChange={handleDistrictChange}
                  disabled={loadingDistricts}
                >
                  <SelectTrigger className="bg-background border-border h-9">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Facility */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] items-center justify-center font-bold">3</span>
                  Health Facility
                  {facilities.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">({facilities.length})</span>
                  )}
                </Label>
                <Select
                  value={selectedFacilityId || "all"}
                  onValueChange={handleFacilityChange}
                  disabled={loadingFacilities}
                >
                  <SelectTrigger className="bg-background border-border h-9">
                    <SelectValue placeholder={loadingFacilities ? "Loading..." : "Select Facility"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">— Select a Facility —</SelectItem>
                    {facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Facility info strip */}
            {selectedFacility && (
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="font-medium text-foreground">{selectedFacility.name}</span>
                </span>
                {(selectedFacility as any).hmisCode && (
                  <span className="flex items-center gap-1">
                    <span>HMIS:</span>
                    <span className="font-mono font-medium text-foreground">{(selectedFacility as any).hmisCode}</span>
                  </span>
                )}
                {(selectedFacility as any).facilityType && (
                  <Badge variant="outline" className="text-[10px] py-0 px-2 h-5">
                    {(selectedFacility as any).facilityType}
                  </Badge>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-semibold text-foreground">{stats.total}</span> staff registered
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── No Facility Selected Prompt (non-admin only) ── */}
        {!selectedFacilityId && !isGlobalAdmin && (
          <Card className="flex flex-col items-center justify-center text-center p-16 border-dashed bg-card/50">
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-blue-500/50" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Select a Health Facility</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Use the <span className="font-medium text-foreground">Smart Cascade Filter</span> above to drill
              down from Province → District → Facility to view and manage the staff roster.
            </p>
          </Card>
        )}

        {/* ── Global Admin hint: select facility to add staff ── */}
        {isGlobalAdmin && !selectedFacilityId && staffList.length === 0 && !isLoadingStaff && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              You are viewing <span className="font-semibold">all facilities</span>. No staff records found. To add staff, first select a facility in the filter above.
            </span>
          </div>
        )}

        {/* ── Stats + Roster (admin sees always; others need facility selected) ── */}
        {(selectedFacilityId || isGlobalAdmin) && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard
                icon={Users}
                label="Total Staff"
                value={stats.total}
                color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={UserCheck}
                label="Active"
                value={stats.active}
                sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of roster`}
                color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                icon={Stethoscope}
                label="Vaccinators"
                value={stats.vaccinators}
                color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              />
              <StatCard
                icon={Shield}
                label="Supervisors"
                value={stats.supervisors}
                color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              />
              <StatCard
                icon={Star}
                label="Volunteers"
                value={stats.volunteers}
                color="bg-rose-500/10 text-rose-600 dark:text-rose-400"
              />
            </div>

            {/* Roster Card */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>
                        {selectedFacility
                          ? selectedFacility.name
                          : isGlobalAdmin
                          ? "All Facilities — National View"
                          : "Staff Roster"}
                      </span>
                      <Badge variant="secondary" className="font-normal text-xs">
                        {staffList.length} staff
                      </Badge>
                      {isGlobalAdmin && !selectedFacilityId && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          National View
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Active roster of vaccinators, recorders, and supervisors
                    </CardDescription>
                  </div>
                </div>

                {/* Search + Filters + Column Toggle */}
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, role, phone, village, ID, NRC..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm bg-background/50 border-border"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px] h-9 text-sm bg-background/50 border-border">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm bg-background/50 border-border">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                      <SelectItem value="volunteer">Volunteers</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Column Visibility Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-background/50 border-border">
                        <Settings2 className="h-3.5 w-3.5" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
                        Toggle Columns
                      </div>
                      <div className="space-y-1">
                        {Object.entries(COLUMN_LABELS).map(([col, label]) => {
                          if (col === "facility" && !isGlobalAdmin) return null;
                          return (
                            <label
                              key={col}
                              className="flex items-center gap-2 px-2 py-1 text-xs rounded-md hover:bg-muted/50 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns[col]}
                                onChange={(e) =>
                                  setVisibleColumns((prev) => ({
                                    ...prev,
                                    [col]: e.target.checked,
                                  }))
                                }
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    Loading staff roster...
                  </div>
                ) : sortedStaff.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="font-medium text-foreground text-sm mb-1">
                      {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                        ? "No staff match your filters"
                        : "No staff registered yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Click 'Add Staff' to register the first staff member for this facility."}
                    </p>
                    {!(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                      <Button size="sm" onClick={handleNewStaff} className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add First Staff Member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Sticky Table Scroll Container */}
                    <div className="overflow-auto max-h-[60vh] relative border-b border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/95 border-b border-border sticky top-0 z-10 backdrop-blur-sm shadow-xs">
                          <tr>
                            <th className="w-12 px-4 py-3 text-center sticky top-0 bg-muted/95 z-20">
                              <Checkbox
                                checked={
                                  paginatedStaff.length > 0 &&
                                  paginatedStaff.every((s) => selectedStaffIds.includes(s.id))
                                }
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Select all"
                              />
                            </th>
                            {visibleColumns.staffMember && (
                              <th
                                onClick={() => handleSort("name")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  Staff Member
                                  {sortColumn === "name" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {isGlobalAdmin && !selectedFacilityId && visibleColumns.facility && (
                              <th
                                onClick={() => handleSort("facility")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  Facility
                                  {sortColumn === "facility" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {visibleColumns.employeeId && (
                              <th
                                onClick={() => handleSort("employeeId")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  Employee ID
                                  {sortColumn === "employeeId" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {visibleColumns.nrc && (
                              <th
                                onClick={() => handleSort("nrc")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  NRC
                                  {sortColumn === "nrc" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {visibleColumns.role && (
                              <th
                                onClick={() => handleSort("role")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  Routine Role
                                  {sortColumn === "role" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {visibleColumns.campaignRole && (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                SIA Campaign Role
                              </th>
                            )}
                            {visibleColumns.training && (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Training
                              </th>
                            )}
                            {visibleColumns.experience && (
                              <th
                                onClick={() => handleSort("experience")}
                                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-muted/50 select-none"
                              >
                                <div className="flex items-center gap-1">
                                  Experience
                                  {sortColumn === "experience" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </th>
                            )}
                            {visibleColumns.contact && (
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Contact
                              </th>
                            )}
                            {visibleColumns.active && (
                              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Active
                              </th>
                            )}
                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedStaff.map((staff) => (
                            <tr
                              key={staff.id}
                              className="hover:bg-muted/30 transition-colors group"
                            >
                              <td className="w-12 px-4 py-3 text-center">
                                <Checkbox
                                  checked={selectedStaffIds.includes(staff.id)}
                                  onCheckedChange={(checked) => handleSelectRow(staff.id, !!checked)}
                                  aria-label="Select staff"
                                />
                              </td>
                              {/* Name + Avatar */}
                              {visibleColumns.staffMember && (
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <StaffAvatar name={staff.fullName} gender={staff.gender} />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                        {staff.fullName}
                                        {staff.history && (staff.history as any[]).length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedStaffForHistory(staff)}
                                            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-md px-1.5 py-0.5 shrink-0"
                                            title="View Placement History"
                                          >
                                            <Activity className="h-3 w-3" />
                                            {(staff.history as any[]).length} past
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {staff.position && (
                                          <span className="text-[11px] text-muted-foreground truncate">
                                            {staff.position}
                                          </span>
                                        )}
                                        {staff.isVolunteer && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] py-0 px-1 h-4 border-teal-500/30 bg-teal-500/5 text-teal-600 dark:text-teal-400"
                                          >
                                            VOL
                                          </Badge>
                                        )}
                                        {staff.residenceVillage && (
                                          <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                                            · {staff.residenceVillage}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              )}

                              {/* Facility column — national view only */}
                              {isGlobalAdmin && !selectedFacilityId && visibleColumns.facility && (
                                <td className="px-4 py-3">
                                  <span className="text-xs font-medium text-foreground">
                                    {allFacilities.find((f) => f.id === staff.facilityId)?.name || (
                                      <span className="text-muted-foreground font-mono text-[10px]">HF #{staff.facilityId}</span>
                                    )}
                                  </span>
                                </td>
                              )}

                              {/* Employee ID */}
                              {visibleColumns.employeeId && (
                                <td className="px-4 py-3 font-mono text-xs text-foreground">
                                  {staff.employeeId || <span className="text-muted-foreground">—</span>}
                                </td>
                              )}

                              {/* NRC */}
                              {visibleColumns.nrc && (
                                <td className="px-4 py-3 font-mono text-xs text-foreground">
                                  {staff.nrc || <span className="text-muted-foreground">—</span>}
                                </td>
                              )}

                              {/* Role */}
                              {visibleColumns.role && (
                                <td className="px-4 py-3">
                                  {staff.role ? (
                                    <Badge
                                      variant="outline"
                                      className={`text-[11px] capitalize px-2 py-0.5 font-medium ${roleColor[staff.role] || "bg-muted text-muted-foreground"}`}
                                    >
                                      {ROLE_OPTIONS.find((r) => r.value === staff.role)?.label || staff.role}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                              )}

                              {/* Campaign Role */}
                              {visibleColumns.campaignRole && (
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] capitalize px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0"
                                  >
                                    {CAMPAIGN_ROLE_OPTIONS.find((r) => r.value === staff.campaignRole)?.label ||
                                      staff.campaignRole ||
                                      "Vaccinator"}
                                  </Badge>
                                </td>
                              )}

                              {/* Training */}
                              {visibleColumns.training && (
                                <td className="px-4 py-3">
                                  {staff.trainingStatus ? (
                                    <span
                                      className={`text-[11px] font-medium ${
                                        staff.trainingStatus === "trained"
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : staff.trainingStatus === "in_training"
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {TRAINING_OPTIONS.find((t) => t.value === staff.trainingStatus)?.label ||
                                        staff.trainingStatus}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                              )}

                              {/* Experience */}
                              {visibleColumns.experience && (
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {staff.yearsExperience != null ? (
                                    <div>
                                      <span className="font-medium text-foreground">{staff.yearsExperience}</span> yrs
                                      {staff.yearsAtFacility != null && (
                                        <div className="text-[10px]">({staff.yearsAtFacility} here)</div>
                                      )}
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              )}

                              {/* Phone */}
                              {visibleColumns.contact && (
                                <td className="px-4 py-3 font-mono text-xs text-foreground">
                                  {staff.contactPhone || <span className="text-muted-foreground">—</span>}
                                </td>
                              )}

                              {/* Active Toggle */}
                              {visibleColumns.active && (
                                <td className="px-4 py-3 text-center">
                                  <Switch
                                    checked={staff.isActive}
                                    onCheckedChange={() =>
                                      toggleActiveMutation.mutate({ staff })
                                    }
                                    className="data-[state=checked]:bg-emerald-500"
                                  />
                                </td>
                              )}

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => handleEditStaff(staff)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        toggleActiveMutation.mutate({ staff })
                                      }
                                    >
                                      {staff.isActive ? (
                                        <>
                                          <UserX className="h-3.5 w-3.5 mr-2" />
                                          Mark Inactive
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="h-3.5 w-3.5 mr-2" />
                                          Mark Active
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDelete(staff)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bulk Actions Panel */}
                    {selectedStaffIds.length > 0 && (
                      <div className="sticky bottom-0 left-0 right-0 z-50 bg-background/95 border-t border-border p-3 backdrop-blur shadow-lg flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              paginatedStaff.length > 0 &&
                              paginatedStaff.every((s) => selectedStaffIds.includes(s.id))
                            }
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            aria-label="Select all"
                          />
                          <span className="text-sm font-semibold text-foreground">
                            {selectedStaffIds.length} staff selected
                          </span>
                          {bulkProcessing && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              Processing ({bulkProgress.current}/{bulkProgress.total} - {bulkProgress.percentage}%)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Change Routine Role */}
                          <Select onValueChange={(val) => handleBulkUpdateRole(val)}>
                            <SelectTrigger className="h-8 w-44 text-xs bg-background">
                              <SelectValue placeholder="Change Routine Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Change Training Status */}
                          <Select onValueChange={(val) => handleBulkUpdateTraining(val)}>
                            <SelectTrigger className="h-8 w-44 text-xs bg-background">
                              <SelectValue placeholder="Change Training Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRAINING_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Toggle Active Status */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => handleBulkToggleActive(true)}
                            disabled={bulkProcessing}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Make Active
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => handleBulkToggleActive(false)}
                            disabled={bulkProcessing}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Make Inactive
                          </Button>

                          <Separator orientation="vertical" className="h-6" />

                          {/* Delete */}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={handleBulkDelete}
                            disabled={bulkProcessing}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Rows per page:</span>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(v) => {
                            setPageSize(parseInt(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map((size) => (
                              <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground ml-2">
                          Showing {sortedStaff.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                          {Math.min(currentPage * pageSize, sortedStaff.length)} of {sortedStaff.length} staff members
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(1)}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                          Previous
                        </Button>
                        <span className="px-3 py-1.5 rounded-md border border-border bg-background font-medium">
                          Page {currentPage} of {Math.ceil(sortedStaff.length / pageSize) || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          disabled={currentPage >= Math.ceil(sortedStaff.length / pageSize)}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          disabled={currentPage >= Math.ceil(sortedStaff.length / pageSize)}
                          onClick={() => setCurrentPage(Math.ceil(sortedStaff.length / pageSize) || 1)}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ─── Add / Edit Staff Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] bg-card border border-border p-0 gap-0 overflow-hidden">
          {/* Dialog Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                {editingStaff ? (
                  <>
                    <Pencil className="h-4 w-4 text-blue-600" />
                    Edit Staff Record
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 text-blue-600" />
                    Add Staff Member
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingStaff
                  ? `Updating record for ${editingStaff.fullName}`
                  : `Adding new staff to ${selectedFacility?.name}`}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tab navigation */}
            <Tabs value={formTab} onValueChange={setFormTab} className="flex-1">
              <div className="px-6 pt-4">
                <TabsList className="w-full grid grid-cols-4 h-8">
                  <TabsTrigger value="basic" className="text-xs gap-1">
                    <Users className="h-3 w-3" />Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="professional" className="text-xs gap-1">
                    <Briefcase className="h-3 w-3" />Professional
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs gap-1">
                    <ClipboardList className="h-3 w-3" />History
                  </TabsTrigger>
                  <TabsTrigger value="status" className="text-xs gap-1">
                    <Activity className="h-3 w-3" />Status
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Tab 1: Basic Info ── */}
              <TabsContent value="basic" className="px-6 pt-4 pb-0 space-y-4 mt-0">
                {/* Global admin must pick a facility when none is pre-selected */}
                {isGlobalAdmin && !editingStaff && (
                  <div className="space-y-1.5">
                    <Label htmlFor="form-facility" className="text-sm font-medium flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Health Facility <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formFacilityId || "none"}
                      onValueChange={(v) => setFormFacilityId(v === "none" ? "" : v)}
                      disabled={saveMutation.isPending}
                    >
                      <SelectTrigger id="form-facility" className="h-9 border-amber-500/30 bg-amber-500/5">
                        <SelectValue placeholder="— Select a facility —" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        <SelectItem value="none" disabled>— Select a facility —</SelectItem>
                        {allFacilities.map((f) => {
                          const count = staffList.filter((s) => s.facilityId === f.id).length;
                          return (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.name}{count > 0 ? ` (${count} staff)` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {!formFacilityId && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        You must select a facility to add staff from the national view.
                      </p>
                    )}
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="staff-name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="staff-name"
                    placeholder="e.g. Mary Phiri"
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    disabled={saveMutation.isPending}
                    required
                    className="h-9"
                  />
                </div>

                {/* Unique Identifiers: Employee ID & NRC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-employee-id" className="text-sm font-medium">Employee ID</Label>
                    <Input
                      id="staff-employee-id"
                      placeholder="e.g. EMP-0042"
                      value={form.employeeId}
                      onChange={(e) => setField("employeeId", e.target.value)}
                      disabled={saveMutation.isPending}
                      className="h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-nrc" className="text-sm font-medium">
                      NRC Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="staff-nrc"
                      placeholder="e.g. 123456/10/1"
                      value={form.nrc}
                      onChange={(e) => setField("nrc", e.target.value)}
                      disabled={saveMutation.isPending}
                      required
                      className={`h-9 font-mono ${!form.nrc.trim() ? "border-amber-400 focus:border-amber-500" : ""}`}
                    />
                    {!form.nrc.trim() && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">Required — used for identity verification</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-gender" className="text-sm font-medium">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setField("gender", v)}>
                      <SelectTrigger id="staff-gender" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-phone" className="text-sm font-medium">
                      <Phone className="h-3 w-3 inline mr-1" />Phone Number
                    </Label>
                    <Input
                      id="staff-phone"
                      placeholder="+260977112233"
                      value={form.contactPhone}
                      onChange={(e) => setField("contactPhone", e.target.value)}
                      disabled={saveMutation.isPending}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                {/* Residence Village */}
                <div className="space-y-1.5">
                  <Label htmlFor="staff-village" className="text-sm font-medium">
                    <Home className="h-3 w-3 inline mr-1" />Residence Village / Area
                  </Label>
                  <Input
                    id="staff-village"
                    placeholder="e.g. Kalingalinga"
                    value={form.residenceVillage}
                    onChange={(e) => setField("residenceVillage", e.target.value)}
                    disabled={saveMutation.isPending}
                    className="h-9"
                  />
                </div>
              </TabsContent>

              {/* ── Tab 2: Professional ── */}
              <TabsContent value="professional" className="px-6 pt-4 pb-0 space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Role (RI) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-role" className="text-sm font-medium">
                      <Briefcase className="h-3 w-3 inline mr-1" />Role (Routine RI)
                    </Label>
                    <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                      <SelectTrigger id="staff-role" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campaign Role */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-campaign" className="text-sm font-medium">
                      <Award className="h-3 w-3 inline mr-1" />SIA Campaign Role
                    </Label>
                    <Select
                      value={form.campaignRole}
                      onValueChange={(v) => setField("campaignRole", v)}
                    >
                      <SelectTrigger id="staff-campaign" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Job Title / Position */}
                <div className="space-y-1.5">
                  <Label htmlFor="staff-position" className="text-sm font-medium">
                    Job Title / Position
                  </Label>
                  <Input
                    id="staff-position"
                    placeholder="e.g. Senior Clinical Officer"
                    value={form.position}
                    onChange={(e) => setField("position", e.target.value)}
                    disabled={saveMutation.isPending}
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Education */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-edu" className="text-sm font-medium">
                      <GraduationCap className="h-3 w-3 inline mr-1" />Education Level
                    </Label>
                    <Select
                      value={form.educationLevel}
                      onValueChange={(v) => setField("educationLevel", v)}
                    >
                      <SelectTrigger id="staff-edu" className="h-9">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_OPTIONS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Training Status */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-training" className="text-sm font-medium">
                      Training Status
                    </Label>
                    <Select
                      value={form.trainingStatus}
                      onValueChange={(v) => setField("trainingStatus", v)}
                    >
                      <SelectTrigger id="staff-training" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Years of Experience */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-exp" className="text-sm font-medium">
                      <TrendingUp className="h-3 w-3 inline mr-1" />Total Yrs Experience
                    </Label>
                    <Input
                      id="staff-exp"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="0"
                      value={form.yearsExperience}
                      onChange={(e) => setField("yearsExperience", e.target.value)}
                      disabled={saveMutation.isPending}
                      className="h-9"
                    />
                  </div>

                  {/* Years at Facility */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-here" className="text-sm font-medium">
                      Yrs at This Facility
                    </Label>
                    <Input
                      id="staff-here"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="0"
                      value={form.yearsAtFacility}
                      onChange={(e) => setField("yearsAtFacility", e.target.value)}
                      disabled={saveMutation.isPending}
                      className="h-9"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── Tab 3: History ── */}
              <TabsContent value="history" className="px-6 pt-4 pb-0 space-y-4 mt-0">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-foreground">Add Past Employment History</div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="space-y-1">
                      <Label htmlFor="history-facility" className="text-[10px] text-muted-foreground">Facility Name</Label>
                      <Input
                        id="history-facility"
                        placeholder="e.g. Solwezi General"
                        value={historyFacility}
                        onChange={(e) => setHistoryFacility(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="history-role" className="text-[10px] text-muted-foreground">Role</Label>
                      <Input
                        id="history-role"
                        placeholder="e.g. Midwife"
                        value={historyRole}
                        onChange={(e) => setHistoryRole(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1 flex gap-1.5 items-center">
                      <div className="flex-1">
                        <Label htmlFor="history-years" className="text-[10px] text-muted-foreground">Years</Label>
                        <Input
                          id="history-years"
                          type="number"
                          min="1"
                          placeholder="2"
                          value={historyYears}
                          onChange={(e) => setHistoryYears(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddHistoryEntry}
                        className="h-8 text-xs shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  <div className="text-xs font-semibold text-muted-foreground">History Records ({form.history?.length || 0})</div>
                  {(!form.history || form.history.length === 0) ? (
                    <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                      No previous facility history added.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {form.history.map((h: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border text-xs">
                          <div>
                            <span className="font-semibold text-foreground">{h.facilityName}</span>
                            <span className="text-muted-foreground"> · {h.role} </span>
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-1 font-mono">{h.years} yrs</Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHistoryEntry(index)}
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Tab 4: Status ── */}
              <TabsContent value="status" className="px-6 pt-4 pb-0 space-y-3 mt-0">
                {/* Active Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div>
                    <Label htmlFor="staff-active" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Active Roster Status
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Active staff appear in session planning and vaccination dropdowns.
                    </p>
                  </div>
                  <Switch
                    id="staff-active"
                    checked={form.isActive}
                    onCheckedChange={(v) => setField("isActive", v)}
                    disabled={saveMutation.isPending}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                {/* Volunteer Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div>
                    <Label htmlFor="staff-volunteer" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-teal-500" />
                      Volunteer Status
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check if this person is a community volunteer (e.g. CHA, CVW).
                    </p>
                  </div>
                  <Switch
                    id="staff-volunteer"
                    checked={form.isVolunteer}
                    onCheckedChange={(v) => setField("isVolunteer", v)}
                    disabled={saveMutation.isPending}
                    className="data-[state=checked]:bg-teal-500"
                  />
                </div>

                {/* Summary preview */}
                {form.fullName && (
                  <div className="p-4 rounded-lg border border-border bg-blue-500/5">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                    <div className="flex items-center gap-3">
                      <StaffAvatar name={form.fullName || "?"} gender={form.gender} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{form.fullName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {form.role && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${roleColor[form.role] || ""}`}>
                              {ROLE_OPTIONS.find((r) => r.value === form.role)?.label}
                            </Badge>
                          )}
                          {form.isActive ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted text-muted-foreground">Inactive</Badge>
                          )}
                          {form.isVolunteer && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-teal-500/10 text-teal-600 border-teal-500/20">Volunteer</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Dialog Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/20 mt-4">
              <div className="flex gap-1">
                {/* Original:
                {["basic", "professional", "status"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFormTab(tab)}
                    className={`h-1.5 rounded-full transition-all ${
                      formTab === tab
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
                */}
                {["basic", "professional", "history", "status"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFormTab(tab)}
                    className={`h-1.5 rounded-full transition-all ${
                      formTab === tab
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                {formTab !== "status" && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      /* Original:
                      setFormTab(
                        formTab === "basic" ? "professional" : "status"
                      )
                      */
                      setFormTab(
                        formTab === "basic"
                          ? "professional"
                          : formTab === "professional"
                          ? "history"
                          : "status"
                      )
                    }
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveMutation.isPending}
                  className="min-w-[100px]"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingStaff ? (
                    "Update Record"
                  ) : (
                    "Add to Roster"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Import Preview Dialog ─── */}
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(open) => {
          if (!importMutation.isPending) {
            setIsImportDialogOpen(open);
            if (!open) setImportStep("preview");
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[96vw] bg-card border border-border p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-indigo-500/5 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                {importStep === "done" ? "Import Complete" : "Import Preview"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {importStep === "done"
                  ? `Processed ${importRows.filter((r) => r._errors.length === 0).length} rows from "${importFileName}"`
                  : `Review ${importRows.length} rows parsed from "${importFileName}" before confirming import`}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Summary banner — Preview */}
          {importStep === "preview" && importRows.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {importRows.length} rows found
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {importRows.filter((r) => r._errors.length === 0).length} valid
                </span>
                {importRows.filter((r) => r._errors.length > 0).length > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {importRows.filter((r) => r._errors.length > 0).length} with errors
                    <span className="text-muted-foreground font-normal">(will be skipped)</span>
                  </span>
                )}
                {!selectedFacilityId ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-muted-foreground">Target Facility:</span>
                    <Select
                      value={importTargetFacilityId || "none"}
                      onValueChange={(v) => setImportTargetFacilityId(v === "none" ? "" : v)}
                      disabled={importMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs w-[180px] bg-background border-border">
                        <SelectValue placeholder="Select target facility" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="none" disabled>Select target facility</SelectItem>
                        {allFacilities.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[11px] py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    Target: {selectedFacility?.name}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Summary banner — Done */}
          {importStep === "done" && importResults.length > 0 && (
            <div className="px-6 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  {importResults.filter((r) => r.ok).length} added successfully
                </span>
                {importResults.filter((r) => !r.ok).length > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="h-4 w-4" />
                    {importResults.filter((r) => !r.ok).length} failed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="overflow-auto flex-1 min-h-0">
            {importStep === "uploading" ? (
              /* Original:
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                </div>
                <p className="text-sm font-medium text-foreground">Importing staff records…</p>
                <p className="text-xs text-muted-foreground">
                  Please wait while we add each staff member to the roster.
                </p>
              </div>
              */
              <div className="flex flex-col items-center justify-center py-20 px-6 gap-4 max-w-md mx-auto w-full">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                </div>
                <p className="text-sm font-medium text-foreground">Importing staff records…</p>
                <div className="w-full space-y-1 mt-2">
                  <Progress value={importProgress.percentage} className="h-2 w-full" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{importProgress.current} of {importProgress.total} records uploaded</span>
                    <span>{importProgress.percentage}%</span>
                  </div>
                </div>
              </div>
            ) : importStep === "done" ? (
              // Results table
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Row</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importResults.map((r) => (
                    <tr key={r.rowNum} className={r.ok ? "" : "bg-destructive/5"}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{r.rowNum}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.ok ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                            <CheckCircle className="h-3 w-3" /> Added
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Preview table
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gender</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Facility</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">NRC</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid?</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importRows.map((row) => {
                    const hasErrors = row._errors.length > 0;
                    return (
                      <tr
                        key={row._rowNum}
                        className={hasErrors ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/20"}
                      >
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{row._rowNum}</td>
                        <td className="px-4 py-2.5">
                          {hasErrors ? (
                            <span className="text-muted-foreground italic">{row.fullName || "—"}</span>
                          ) : (
                            /* Original:
                            <div className="flex items-center gap-2">
                              <StaffAvatar name={row.fullName || "?"} gender={row.gender} />
                              <span className="font-medium text-foreground">{row.fullName}</span>
                            </div>
                            */
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <StaffAvatar name={row.fullName || "?"} gender={row.gender} />
                                <span className="font-medium text-foreground">{row.fullName}</span>
                              </div>
                              {row.resolvedFacilityId && (
                                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 pl-1">
                                  <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>
                                    Resolved to: <strong className="text-foreground">{allFacilities.find((f) => f.id === row.resolvedFacilityId)?.name || `HF #${row.resolvedFacilityId}`}</strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs capitalize text-foreground">{row.gender || "—"}</td>
                        <td className="px-4 py-2.5">
                          {row.role && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize px-1.5 py-0 ${roleColor[row.role] || "bg-muted text-muted-foreground"}`}
                            >
                              {ROLE_OPTIONS.find((r) => r.value === row.role)?.label || row.role}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-foreground hidden md:table-cell">
                          {row.resolvedFacilityId
                            ? allFacilities.find((f) => f.id === row.resolvedFacilityId)?.name || `HF #${row.resolvedFacilityId}`
                            : selectedFacility?.name || importTargetFacilityId
                              ? allFacilities.find((f) => f.id.toString() === (selectedFacilityId || importTargetFacilityId))?.name || "—"
                              : <span className="text-amber-500">No facility</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-foreground hidden md:table-cell">
                          {(row as any).nrc || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs hidden md:table-cell">
                          <span
                            className={
                              row.trainingStatus === "trained"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }
                          >
                            {TRAINING_OPTIONS.find((t) => t.value === row.trainingStatus)?.label || row.trainingStatus || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {hasErrors ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1">
                              <XCircle className="h-3 w-3" /> Skip
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                              <CheckCircle className="h-3 w-3" /> OK
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-destructive max-w-[200px]">
                          {hasErrors ? (
                            <ul className="list-disc list-inside space-y-0.5">
                              {row._errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Dialog footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            {importStep === "preview" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Only <span className="text-emerald-600 dark:text-emerald-400 font-medium">OK</span> rows will be imported. Rows with errors are automatically skipped.{" "}
                  <button type="button" className="text-primary hover:underline" onClick={handleDownloadTemplate}>
                    Re-download template
                  </button>
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportDialogOpen(false)}
                    disabled={importMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => importMutation.mutate()}
                    disabled={
                      importRows.filter((r) => r._errors.length === 0).length === 0 ||
                      importMutation.isPending ||
                      (!selectedFacilityId && !importTargetFacilityId)
                    }
                    className="gap-1.5 min-w-[130px]"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Import {importRows.filter((r) => r._errors.length === 0).length} Staff
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
            {importStep === "done" && (
              <>
                <p className="text-xs text-muted-foreground">Import finished. The roster has been updated.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportStep("preview");
                  }}
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Employment History Timeline Dialog ─── */}
      <Dialog
        open={selectedStaffForHistory !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStaffForHistory(null);
        }}
      >
        <DialogContent className="max-w-md w-[95vw] bg-card border border-border p-6 rounded-lg shadow-xl">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Career Placements
            </DialogTitle>
            <DialogDescription className="text-xs">
              Employment timeline for <span className="font-semibold text-foreground">{selectedStaffForHistory?.fullName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 overflow-y-auto max-h-[400px] pr-1">
            <div className="relative border-l border-blue-500/30 ml-4 pl-6 space-y-6">
              {/* Current Facility Placement */}
              {selectedStaffForHistory && (
                <div className="relative">
                  {/* Timeline Node Icon */}
                  <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white ring-8 ring-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full mb-1">
                      Current Placement
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {allFacilities.find((f) => f.id === selectedStaffForHistory.facilityId)?.name || "Current Facility"}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {ROLE_OPTIONS.find((r) => r.value === selectedStaffForHistory.role)?.label || selectedStaffForHistory.role || "Staff Member"}
                    </p>
                    {selectedStaffForHistory.yearsAtFacility && (
                      <p className="text-[10px] text-muted-foreground/75 mt-1 font-mono">
                        Duration: {selectedStaffForHistory.yearsAtFacility} year{selectedStaffForHistory.yearsAtFacility > 1 ? "s" : ""} here
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Past History Timeline Placements */}
              {selectedStaffForHistory?.history && selectedStaffForHistory.history.length > 0 ? (
                selectedStaffForHistory.history.map((h: any, index: number) => (
                  <div key={index} className="relative">
                    {/* Timeline Node Icon */}
                    <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-blue-500/30 text-muted-foreground ring-8 ring-background">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
                    </span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full mb-1">
                        Previous Placement #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{h.facilityName}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{h.role}</p>
                      <p className="text-[10px] text-muted-foreground/75 mt-1 font-mono">
                        Duration: {h.years} year{h.years > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                selectedStaffForHistory && (
                  <div className="text-xs text-muted-foreground italic pl-2 py-2">
                    No prior facility history documented.
                  </div>
                )
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedStaffForHistory(null)}
              className="w-full"
            >
              Close Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
