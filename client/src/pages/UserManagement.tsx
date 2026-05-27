import { useState, useMemo } from "react";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { buildGeoMaps, getRecordHierarchy } from "@/lib/geoHierarchy";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Shield, 
  MapPin, 
  Search, 
  Edit3, 
  Check, 
  X, 
  Lock, 
  Unlock,
  AlertTriangle,
  Building,
  Map,
  Compass,
  Plus,
  Trash2,
  Download,
  Activity,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Province, District, Facility } from "@shared/schema";
import { ROLE_PERMISSIONS, Permission } from "../../../server/auth/authorization";

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportUsersCsv(users: any[], provinces: any[], districts: any[], facilities: any[]) {
  const pById: Record<number, string> = {};
  (provinces || []).forEach((p: any) => { pById[p.id] = p.name; });
  const dById: Record<number, string> = {};
  (districts || []).forEach((d: any) => { dById[d.id] = d.name; });
  const fById: Record<number, string> = {};
  (facilities || []).forEach((f: any) => { fById[f.id] = f.name; });
  const header = ["Email", "First Name", "Last Name", "Role", "Active", "Province", "District", "Facility", "Last Login", "Created"];
  const rows = users.map((u) => [
    u.email, u.firstName, u.lastName,
    u.role || (Array.isArray(u.roles) ? u.roles.join("|") : ""),
    u.isActive ? "yes" : "no",
    pById[u.provinceId] || "",
    dById[u.districtId] || "",
    fById[u.facilityId] || "",
    u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "",
    u.createdAt ? new Date(u.createdAt).toISOString() : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vaxplan-users-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function ActivityLogPanel({ users }: { users: any[] }) {
  const [userFilter, setUserFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/audit-logs", { userId: userFilter, entityType: entityFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (userFilter !== "all") params.set("userId", userFilter);
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      const r = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audit logs");
      return r.json();
    },
  });

  const userById = useMemo(() => {
    const m: Record<string, any> = {};
    users.forEach((u) => { if (u?.id) m[u.id] = u; });
    return m;
  }, [users]);

  const entityTypes = useMemo<string[]>(() => {
    const seen: Record<string, true> = {};
    logs.forEach((l: any) => { if (l.entityType) seen[l.entityType] = true; });
    return Object.keys(seen).sort();
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">User & system activity</h3>
          <p className="text-muted-foreground text-xs">Read-only audit trail of every create / update / delete on records across this tenant.</p>
        </div>
        <select
          className="bg-background border border-border rounded-xl px-3 py-2 text-sm"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          data-testid="filter-user"
        >
          <option value="all">All users</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName || ""} {u.lastName || ""} ({u.email})</option>)}
        </select>
        <select
          className="bg-background border border-border rounded-xl px-3 py-2 text-sm"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          data-testid="filter-entity"
        >
          <option value="all">All entities</option>
          {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center p-12 text-muted-foreground text-sm">Loading audit logs…</div>
      ) : logs.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-3xl border border-border">
          <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border divide-y">
          {logs.map((l: any) => {
            const actor = l.userId ? userById[l.userId] : null;
            const actorLabel = actor ? `${actor.firstName || ""} ${actor.lastName || ""} (${actor.email})`.trim() : (l.userId || "system");
            return (
              <div key={l.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2" data-testid={`audit-${l.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize text-xs">{l.action}</Badge>
                    <span className="text-sm font-medium">{l.entityType}{l.entityId ? ` #${l.entityId}` : ""}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">by {actorLabel}</div>
                </div>
                <div className="text-xs text-muted-foreground">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ALL_ROLES = [
  { value: "facility_clerk", label: "Facility Clerk" },
  { value: "facility_in_charge", label: "Facility In-Charge" },
  { value: "district_manager", label: "District Manager" },
  { value: "provincial_coordinator", label: "Provincial Coordinator" },
  { value: "gis_specialist", label: "GIS Specialist" },
  { value: "national_admin", label: "National Admin" }
];

const ALL_PERMISSIONS: { value: Permission; label: string; desc: string }[] = [
  { value: "view_clients", label: "View Clients", desc: "Allows reading child and maternal demographic records" },
  { value: "create_client", label: "Create Client", desc: "Allows registering new child and maternal profiles" },
  { value: "edit_client", label: "Edit Client", desc: "Allows updating demographic details" },
  { value: "log_immunization", label: "Log Immunizations", desc: "Allows recording administered vaccine logs" },
  { value: "send_reminders", label: "Send Reminders", desc: "Allows dispatching reminder notices and SMS messages" },
  { value: "view_session_plans", label: "View Sessions", desc: "Allows browsing upcoming vaccination sessions" },
  { value: "manage_session_plans", label: "Manage Sessions", desc: "Allows scheduling, modifying and deleting session targets" },
  { value: "approve_plans", label: "Approve Schedule Plans", desc: "Allows moving session drafts to finalized status" },
  { value: "view_stock", label: "View Stock Ledger", desc: "Allows viewing dynamic vaccine vial stock availability" },
  { value: "manage_stock", label: "Manage Stock Transactions", desc: "Allows logging vaccine stock adjustments and deliveries" },
  { value: "view_mobilization", label: "View Mobilizations", desc: "Allows viewing community campaigns" },
  { value: "manage_mobilization", label: "Manage Mobilizations", desc: "Allows authoring mobilization events" },
  { value: "view_budget", label: "View Budgets", desc: "Allows viewing session cost projections" },
  { value: "manage_budget", label: "Manage Budgets", desc: "Allows entering budget items" },
  { value: "approve_budget", label: "Approve Budgets", desc: "Allows final signoff on cost items" },
  { value: "view_reports", label: "View Reports", desc: "Allows reading monthly statistical aggregations" },
  { value: "manage_reports", label: "Manage Reports", desc: "Allows generating custom HIS exports" },
  { value: "manage_boundaries", label: "Manage Boundaries", desc: "Allows uploading GADM boundaries and catchments" },
  { value: "manage_users", label: "Manage User Access", desc: "Allows editing user roles and data scopes" }
];

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [geoFilterProvinceId, setGeoFilterProvinceId] = useState<number | null>(null);
  const [geoFilterDistrictId, setGeoFilterDistrictId] = useState<number | null>(null);
  const [geoFilterFacilityId, setGeoFilterFacilityId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Modal editing states
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<string[]>([]);
  const [scopeProvinces, setScopeProvinces] = useState<number[]>([]);
  const [scopeDistricts, setScopeDistricts] = useState<number[]>([]);
  const [scopeFacilities, setScopeFacilities] = useState<number[]>([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");

  // General details editing states
  const [userEmail, setUserEmail] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userIsActive, setUserIsActive] = useState(true);
  const [userFacilityId, setUserFacilityId] = useState<number | null>(null);
  const [userDistrictId, setUserDistrictId] = useState<number | null>(null);
  const [userProvinceId, setUserProvinceId] = useState<number | null>(null);

  // Add User Modal states
  const [isAdding, setIsAdding] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addRoles, setAddRoles] = useState<string[]>(["facility_clerk"]);
  const [addIsActive, setAddIsActive] = useState(true);
  const [addProvinceId, setAddProvinceId] = useState<number | null>(null);
  const [addDistrictId, setAddDistrictId] = useState<number | null>(null);
  const [addFacilityId, setAddFacilityId] = useState<number | null>(null);

  // Custom Roles CRUD Dialog States
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);

  // Queries
  const { data: usersList, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: dbRoles, isLoading: loadingRoles } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  // Custom Roles Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to create custom role");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role created successfully", description: "The custom user role has been registered." });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      setIsAddingRole(false);
      setNewRoleCode("");
      setNewRoleName("");
      setNewRolePermissions([]);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to create role", description: err.message });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, name, permissions }: { id: number; name: string; permissions: string[] }) => {
      const res = await fetch(`/api/user-roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions }),
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update custom role");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated successfully", description: "The custom user role permissions have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      setIsEditingRole(false);
      setSelectedRole(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to update role", description: err.message });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/user-roles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to delete custom role");
      }
      return true;
    },
    onSuccess: () => {
      toast({ title: "Role deleted", description: "The custom user role was permanently removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      setIsEditingRole(false);
      setSelectedRole(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to delete role", description: err.message });
    }
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to create user account");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User created successfully",
        description: `Registered new user account for ${data.firstName || data.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAdding(false);
      setAddEmail("");
      setAddFirstName("");
      setAddLastName("");
      setAddRoles(["facility_clerk"]);
      setAddIsActive(true);
      setAddProvinceId(null);
      setAddDistrictId(null);
      setAddFacilityId(null);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: err.message,
      });
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName, email, isActive, roles, permissions, dataAccessScope, facilityId, districtId, provinceId }: {
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      isActive: boolean;
      roles: string[];
      permissions: string[];
      dataAccessScope: any;
      facilityId: number | null;
      districtId: number | null;
      provinceId: number | null;
    }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, isActive, roles, permissions, dataAccessScope, facilityId, districtId, provinceId }),
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update user parameters");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User details updated successfully",
        description: `Successfully configured profile and access for ${data.firstName || data.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditing(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message,
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to delete user account");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user account was permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditing(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: err.message,
      });
    }
  });

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setUserEmail(user.email || "");
    setUserFirstName(user.firstName || "");
    setUserLastName(user.lastName || "");
    setUserIsActive(user.isActive ?? true);
    setUserFacilityId(user.facilityId);
    setUserDistrictId(user.districtId);
    setUserProvinceId(user.provinceId);

    // Parse roles
    const roles: string[] = Array.isArray(user.roles) ? (user.roles as string[]) : [];
    setAssignedRoles(roles.length > 0 ? roles : [user.role]);

    // Parse overrides
    const overrides: string[] = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
    setPermissionOverrides(overrides);

    // Parse scopes
    const scope = (user.dataAccessScope as any) || { provinces: [], districts: [], facilities: [] };
    setScopeProvinces(Array.isArray(scope.provinces) ? scope.provinces.map(Number) : []);
    setScopeDistricts(Array.isArray(scope.districts) ? scope.districts.map(Number) : []);
    setScopeFacilities(Array.isArray(scope.facilities) ? scope.facilities.map(Number) : []);

    setDistrictSearch("");
    setFacilitySearch("");

    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updateAccessMutation.mutate({
      userId: selectedUser.id,
      firstName: userFirstName,
      lastName: userLastName,
      email: userEmail,
      isActive: userIsActive,
      roles: assignedRoles,
      permissions: permissionOverrides,
      dataAccessScope: {
        provinces: scopeProvinces,
        districts: scopeDistricts,
        facilities: scopeFacilities
      },
      facilityId: userFacilityId,
      districtId: userDistrictId,
      provinceId: userProvinceId
    });
  };

  const toggleRole = (roleVal: string) => {
    setAssignedRoles(prev => 
      prev.includes(roleVal) 
        ? prev.filter(r => r !== roleVal) 
        : [...prev, roleVal]
    );
  };

  const togglePermission = (permVal: string) => {
    setPermissionOverrides(prev => 
      prev.includes(permVal) 
        ? prev.filter(p => p !== permVal) 
        : [...prev, permVal]
    );
  };

  // Scopes toggling helpers
  const toggleProvinceScope = (id: number) => {
    setScopeProvinces(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleDistrictScope = (id: number) => {
    setScopeDistricts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleFacilityScope = (id: number) => {
    setScopeFacilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Get aggregated list of permissions given the roles (without overrides)
  const getBasePermissions = (rolesList: string[]) => {
    const list = new Set<Permission>();
    rolesList.forEach(role => {
      const dbRole = dbRoles?.find((r: any) => r.code === role);
      const perms = dbRole ? (dbRole.permissions as Permission[]) : (ROLE_PERMISSIONS[role] || []);
      perms.forEach(p => list.add(p));
    });
    return Array.from(list);
  };

  const activeRolesList = dbRoles ? dbRoles.map((r: any) => ({ value: r.code, label: r.name })) : ALL_ROLES;

  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages: [], facilities }),
    [provinces, districts, facilities],
  );

  const filteredUsers = (usersList || []).filter(u => {
    const text = `${u.firstName || ""} ${u.lastName || ""} ${u.email || ""}`.toLowerCase();
    if (!text.includes(searchTerm.toLowerCase())) return false;

    const h = getRecordHierarchy(u as unknown as Record<string, unknown>, geoMaps);
    if (geoFilterProvinceId !== null && h.provinceId !== geoFilterProvinceId) return false;
    if (geoFilterDistrictId !== null && h.districtId !== geoFilterDistrictId) return false;
    if (geoFilterFacilityId !== null && Number((u as any).facilityId) !== geoFilterFacilityId) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header section with rich dark theme elements */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 dark:text-indigo-400">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">User Access Administration</h1>
              <p className="text-muted-foreground text-sm mt-1">Configure granular multitenant roles, individual permission overrides, and administrative row-level geographic scopes.</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            setAddEmail("");
            setAddFirstName("");
            setAddLastName("");
            setAddRoles(["facility_clerk"]);
            setAddIsActive(true);
            setAddProvinceId(null);
            setAddDistrictId(null);
            setAddFacilityId(null);
            setIsAdding(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-indigo-600/10 self-start md:self-auto font-sans font-semibold text-sm"
          data-testid="btn-add-user"
        >
          <Plus className="h-4 w-4" />
          <span>Add New User</span>
        </Button>
      </div>

      {/* Main interface with modern layout */}
      <Tabs defaultValue="users" className="w-full space-y-6">
        <TabsList className="bg-secondary border border-border p-1 rounded-2xl w-fit flex gap-2">
          <TabsTrigger value="users" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold flex items-center gap-1.5 px-4 py-2 text-xs">
            <Users className="h-4 w-4" />
            Users Access Registry
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold flex items-center gap-1.5 px-4 py-2 text-xs">
            <Shield className="h-4 w-4" />
            Custom Roles Manager
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold flex items-center gap-1.5 px-4 py-2 text-xs" data-testid="tab-activity">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Search filter bar + export */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500 rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportUsersCsv(filteredUsers, provinces as any[], districts as any[], facilities as any[])}
                className="rounded-xl gap-1.5"
                data-testid="btn-export-csv"
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Badge variant="secondary" className="ml-auto text-xs">
                {filteredUsers.length} of {(usersList || []).length} users
              </Badge>
            </div>

            {/* Geo cascade filter (Province → District → Facility) */}
            <GeoCascadeFilter
              provinceId={geoFilterProvinceId}
              districtId={geoFilterDistrictId}
              facilityId={geoFilterFacilityId}
              onProvinceChange={setGeoFilterProvinceId}
              onDistrictChange={setGeoFilterDistrictId}
              onFacilityChange={setGeoFilterFacilityId}
              showFacility
              provinces={provinces}
              districts={districts}
              facilities={facilities}
              testIdPrefix="users"
            />

            {/* User table/cards */}
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-border min-h-[300px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
                <p className="text-muted-foreground text-sm mt-4">Retrieving active user records...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-3xl border border-border">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No active users found</h3>
                <p className="text-muted-foreground text-sm mt-1">Try modifying your active query or search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => {
                  const uRoles: string[] = Array.isArray(user.roles) ? (user.roles as string[]) : [];
                  const activeRoles = uRoles.length > 0 ? uRoles : [user.role];
                  const scope = (user.dataAccessScope as any) || { provinces: [], districts: [], facilities: [] };
                  const userGeo = getRecordHierarchy(user as unknown as Record<string, unknown>, geoMaps);
                  const provinceName = userGeo.provinceId !== null
                    ? geoMaps.provinceMap.get(userGeo.provinceId)?.name ?? null
                    : null;
                  const districtName = userGeo.districtId !== null
                    ? geoMaps.districtMap.get(userGeo.districtId)?.name ?? null
                    : null;
                  const facilityName = (user as any).facilityId
                    ? geoMaps.facilityMap.get(Number((user as any).facilityId))?.name ?? null
                    : null;
                  
                  const hasRestrictedScope = 
                    (scope.provinces && scope.provinces.length > 0) || 
                    (scope.districts && scope.districts.length > 0) || 
                    (scope.facilities && scope.facilities.length > 0);

                  return (
                    <div 
                      key={user.id} 
                      className="relative overflow-hidden bg-card rounded-3xl border border-border p-6 flex flex-col justify-between hover:border-border/80 dark:hover:border-white/20 transition-all duration-300 group shadow-lg"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="h-24 w-24 text-indigo-500 dark:text-indigo-400" />
                      </div>

                      <div>
                        {/* User profile identifier */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-bold text-lg text-indigo-500 dark:text-indigo-400 uppercase">
                            {user.firstName ? user.firstName.charAt(0) : user.email?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">
                              {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : "Unnamed Staff"}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>

                        {/* Roles Badges */}
                        <div className="mb-4">
                          <span className="text-xs text-muted-foreground/80 block mb-1.5 uppercase tracking-wider font-semibold">Assigned Roles</span>
                          <div className="flex flex-wrap gap-1.5">
                            {activeRoles.map(role => (
                              <Badge key={role} variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 text-xs px-2.5 py-0.5 rounded-lg capitalize">
                                {role.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Province / District / Facility (resolved location) */}
                        <div className="mb-4 pt-4 border-t border-border" data-testid={`user-geo-${user.id}`}>
                          <span className="text-xs text-muted-foreground/80 block mb-1.5 uppercase tracking-wider font-semibold">Location</span>
                          <div className="grid grid-cols-1 gap-1 text-xs text-foreground/80">
                            <div className="flex items-center gap-1.5">
                              <Compass className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                              <span className="text-muted-foreground">Province:</span>
                              <span className="font-medium">{provinceName ?? "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Map className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                              <span className="text-muted-foreground">District:</span>
                              <span className="font-medium">{districtName ?? "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Building className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                              <span className="text-muted-foreground">Facility:</span>
                              <span className="font-medium">{facilityName ?? "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Geographic Access scope description */}
                        <div className="mb-6 pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground/80 block mb-1.5 uppercase tracking-wider font-semibold">Row-Level Scope</span>
                          {hasRestrictedScope ? (
                            <div className="space-y-1 text-xs text-foreground/80">
                              {scope.provinces && scope.provinces.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Compass className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                                  <span>Province IDs: {scope.provinces.join(", ")}</span>
                                </div>
                              )}
                              {scope.districts && scope.districts.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Map className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                                  <span>District IDs: {scope.districts.join(", ")}</span>
                                </div>
                              )}
                              {scope.facilities && scope.facilities.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Building className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                  <span>Facility IDs: {scope.facilities.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Unlock className="h-3.5 w-3.5 text-emerald-500/60" />
                              <span>Global Scope / Default Hierarchies</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions row */}
                      <Button 
                        onClick={() => handleOpenEdit(user)}
                        className="w-full bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl py-2 flex items-center justify-center gap-2 transition-all font-sans text-sm font-semibold"
                      >
                        <Edit3 className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        Configure Access Parameters
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-bold text-foreground">Custom Role Definitions</h3>
              <p className="text-muted-foreground text-xs">Create, update, and manage dynamic role capabilities and associated system permission scopes.</p>
            </div>
            <Button
              onClick={() => {
                setNewRoleCode("");
                setNewRoleName("");
                setNewRolePermissions([]);
                setIsAddingRole(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 px-4 flex items-center gap-1.5 text-xs font-semibold"
              data-testid="btn-add-role"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Role</span>
            </Button>
          </div>

          {loadingRoles ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-border min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="text-muted-foreground text-xs mt-3">Loading custom role definitions...</p>
            </div>
          ) : (dbRoles || []).length === 0 ? (
            <div className="text-center p-12 bg-card rounded-3xl border border-border">
              <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-foreground">No custom roles defined</h3>
              <p className="text-muted-foreground text-xs mt-1">Click "Add Custom Role" to define new access levels.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(dbRoles || []).map((role: any) => {
                const isSystemRole = ["facility_clerk", "facility_in_charge", "district_manager", "provincial_coordinator", "gis_specialist", "national_admin"].includes(role.code);
                const rolePerms = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
                
                return (
                  <div 
                    key={role.id} 
                    className="bg-card rounded-3xl border border-border p-6 flex flex-col justify-between hover:border-border/80 dark:hover:border-white/20 transition-all duration-300 shadow-md group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-foreground capitalize">{role.name}</h4>
                            {isSystemRole && (
                              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 text-[9px] py-0 px-1.5 rounded">
                                System Default
                              </Badge>
                            )}
                          </div>
                          <code className="text-[10px] text-muted-foreground/80 font-mono block mt-0.5">{role.code}</code>
                        </div>
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400 shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mb-6 pt-3 border-t border-border">
                        <span className="text-[10px] text-muted-foreground/80 block mb-2 uppercase tracking-wider font-semibold">Assigned Permissions ({rolePerms.length})</span>
                        <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                          {rolePerms.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">No permissions assigned</span>
                          ) : (
                            rolePerms.map((perm: string) => (
                              <Badge key={perm} variant="outline" className="bg-secondary/40 text-foreground/80 border-border text-[10px] py-0 px-2 rounded-md capitalize">
                                {perm.replace(/_/g, " ")}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                      <Button
                        onClick={() => {
                          setSelectedRole(role);
                          setEditRoleName(role.name);
                          setEditRolePermissions(rolePerms);
                          setIsEditingRole(true);
                        }}
                        className="flex-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                        Configure Role
                      </Button>
                      {!isSystemRole && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete custom role ${role.name}? Users assigned this role will lose its associated permissions.`)) {
                              deleteRoleMutation.mutate(role.id);
                            }
                          }}
                          disabled={deleteRoleMutation.isPending}
                          className="px-3 border border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <ActivityLogPanel users={usersList || []} />
        </TabsContent>
      </Tabs>

      {/* Editing Dialog Modal */}
      {selectedUser && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                Access Configuration Panel
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Configure roles, granular permissions, and administrative boundaries for <strong>{selectedUser.firstName || selectedUser.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full space-y-6">
              <TabsList className="bg-secondary border border-border p-1 rounded-2xl w-full grid grid-cols-4">
                <TabsTrigger value="general" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold">
                  1. General Info
                </TabsTrigger>
                <TabsTrigger value="roles" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold">
                  2. Multi-Roles
                </TabsTrigger>
                <TabsTrigger value="permissions" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold">
                  3. Overrides
                </TabsTrigger>
                <TabsTrigger value="scopes" className="rounded-xl text-muted-foreground data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow font-semibold">
                  4. Geographic Scopes
                </TabsTrigger>
              </TabsList>

              {/* TABS: General Info */}
              <TabsContent value="general" className="space-y-4">
                <div className="bg-secondary/50 p-5 rounded-2xl border border-border space-y-4">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    User General Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                      <Input 
                        value={userFirstName}
                        onChange={(e) => setUserFirstName(e.target.value)}
                        placeholder="e.g. John"
                        className="bg-background border-border text-foreground rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                      <Input 
                        value={userLastName}
                        onChange={(e) => setUserLastName(e.target.value)}
                        placeholder="e.g. Doe"
                        className="bg-background border-border text-foreground rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                    <Input 
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. john.doe@health.gov"
                      className="bg-background border-border text-foreground rounded-xl"
                    />
                  </div>

                  {/* Active switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-background">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-foreground">User Active Status</span>
                      <span className="text-xs text-muted-foreground block">Toggle to enable or disable system login access</span>
                    </div>
                    <Switch 
                      checked={userIsActive}
                      onCheckedChange={setUserIsActive}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  {/* User Primary Scoped Cascade (Province -> District -> Facility) */}
                  <div className="space-y-3 rounded-xl border p-4 bg-background">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block">Primary Scoped Locations</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Province</label>
                        <select
                          value={userProvinceId?.toString() ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setUserProvinceId(val);
                            setUserDistrictId(null);
                            setUserFacilityId(null);
                          }}
                          className="w-full bg-secondary border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500"
                        >
                          <option value="">Global / Select Province</option>
                          {(provinces || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">District</label>
                        <select
                          value={userDistrictId?.toString() ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setUserDistrictId(val);
                            setUserFacilityId(null);
                          }}
                          disabled={!userProvinceId}
                          className="w-full bg-secondary border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="">Select District</option>
                          {(districts || [])
                            .filter(d => Number(d.provinceId) === Number(userProvinceId))
                            .map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Facility</label>
                        <select
                          value={userFacilityId?.toString() ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setUserFacilityId(val);
                          }}
                          disabled={!userDistrictId}
                          className="w-full bg-secondary border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="">Select Facility</option>
                          {(facilities || [])
                            .filter(f => Number(f.districtId) === Number(userDistrictId))
                            .map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Red zone: Delete User Account */}
                  <div className="pt-4 border-t border-destructive/20 mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Danger Zone
                      </span>
                      <span className="text-xs text-muted-foreground block">Permanently delete user profile and access scopes.</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Are you absolutely sure you want to permanently delete user ${userFirstName || selectedUser.email}? This action cannot be undone.`)) {
                          deleteUserMutation.mutate(selectedUser.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold text-xs px-4 py-2"
                    >
                      {deleteUserMutation.isPending ? "Deleting Account..." : "Delete User Account"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TABS: Roles Setup */}
              <TabsContent value="roles" className="space-y-4">
                <div className="bg-secondary/50 p-5 rounded-2xl border border-border">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Select Active Roles
                  </h4>
                  <p className="text-muted-foreground text-xs mb-4">A user may belong to multiple roles concurrently. Active permissions will be dynamically aggregated across all checked roles.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeRolesList.map(role => {
                      const active = assignedRoles.includes(role.value);
                      return (
                        <div 
                          key={role.value}
                          onClick={() => toggleRole(role.value)}
                          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                            active 
                              ? "bg-indigo-500/10 border-indigo-500 text-foreground" 
                              : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          <span className="font-semibold text-sm">{role.label}</span>
                          <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-colors ${
                            active ? "bg-indigo-600 border-indigo-600 text-white" : "border-input"
                          }`}>
                            {active && <Check className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* TABS: Custom Permissions Overrides */}
              <TabsContent value="permissions" className="space-y-4">
                <div className="bg-secondary/50 p-5 rounded-2xl border border-border">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Permission Custom Toggles
                  </h4>
                  <p className="text-muted-foreground text-xs mb-4">Configure user-specific custom overrides. Switches indicate explicit access bounds (toggled on represents user-level override grants).</p>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {ALL_PERMISSIONS.map(perm => {
                      const basePerms = getBasePermissions(assignedRoles);
                      const isInherited = basePerms.includes(perm.value);
                      const isOverridden = permissionOverrides.includes(perm.value);
                      const hasAccess = isInherited || isOverridden;

                      return (
                        <div 
                          key={perm.value}
                          className="flex items-start justify-between p-3.5 rounded-xl bg-background border border-border hover:bg-accent/40 transition-colors"
                        >
                          <div className="pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{perm.label}</span>
                              {isInherited && (
                                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] py-0 px-2 rounded">
                                  Inherited from Role
                                </Badge>
                              )}
                              {isOverridden && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 px-2 rounded">
                                  Custom Override
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground block mt-0.5">{perm.desc}</span>
                          </div>
                          
                          <Switch 
                            checked={hasAccess} 
                            disabled={isInherited} // Can't toggle off inherited permissions via override switches
                            onCheckedChange={() => togglePermission(perm.value)}
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* TABS: Row-Level Geographic Data Access Scopes */}
              <TabsContent value="scopes" className="space-y-4">
                <div className="bg-secondary/50 p-5 rounded-2xl border border-border">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Row-Level Geographical Boundaries
                  </h4>
                  <p className="text-muted-foreground text-xs mb-4">Constrain data visibility at the database row-level. Select specific locations this user is locked to. If left empty, default single-hierarchy locks will apply.</p>

                  <div className="space-y-6">
                    {/* Province level scope */}
                    <div>
                      <span className="text-xs font-bold text-indigo-500 dark:text-indigo-300 uppercase tracking-wider block mb-2">Provinces Grid Scope</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(provinces || []).map(p => {
                          const active = scopeProvinces.includes(p.id);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => toggleProvinceScope(p.id)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                active ? "bg-emerald-500/10 border-emerald-500 text-foreground font-bold" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              <span>{p.name}</span>
                              {active && <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* District level scope */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-sky-500 dark:text-sky-300 uppercase tracking-wider block">Districts Grid Scope</span>
                        <Input 
                          placeholder="Filter districts..." 
                          value={districtSearch} 
                          onChange={(e) => setDistrictSearch(e.target.value)} 
                          className="max-w-[200px] h-7 bg-background border-border text-xs rounded-lg placeholder:text-muted-foreground/60 text-foreground focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {(() => {
                          const activeD = (districts || []).filter(d => scopeDistricts.includes(d.id));
                          const inactiveD = (districts || []).filter(d => !scopeDistricts.includes(d.id));
                          const list = districtSearch
                            ? (districts || []).filter(d => d.name.toLowerCase().includes(districtSearch.toLowerCase()) || scopeDistricts.includes(d.id))
                            : [...activeD, ...inactiveD.slice(0, 15)];
                          
                          if (list.length === 0) {
                            return <div className="text-xs text-muted-foreground/75 col-span-3 py-2 text-center">No matching districts found</div>;
                          }
                          
                          return list.map(d => {
                            const active = scopeDistricts.includes(d.id);
                            return (
                              <div 
                                key={d.id}
                                onClick={() => toggleDistrictScope(d.id)}
                                className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                  active ? "bg-emerald-500/10 border-emerald-500 text-foreground font-bold" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                              >
                                <span>{d.name}</span>
                                {active && <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Facility level scope */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-500 dark:text-amber-300 uppercase tracking-wider block">Facilities Clinic Scope</span>
                        <Input 
                          placeholder="Filter facilities..." 
                          value={facilitySearch} 
                          onChange={(e) => setFacilitySearch(e.target.value)} 
                          className="max-w-[200px] h-7 bg-background border-border text-xs rounded-lg placeholder:text-muted-foreground/60 text-foreground focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {(() => {
                          const activeF = (facilities || []).filter(f => scopeFacilities.includes(f.id));
                          const inactiveF = (facilities || []).filter(f => !scopeFacilities.includes(f.id));
                          const list = facilitySearch
                            ? (facilities || []).filter(f => f.name.toLowerCase().includes(facilitySearch.toLowerCase()) || scopeFacilities.includes(f.id)).slice(0, 30)
                            : [...activeF, ...inactiveF.slice(0, 15)];
                          
                          if (list.length === 0) {
                            return <div className="text-xs text-muted-foreground/75 col-span-3 py-2 text-center">No matching facilities found</div>;
                          }
                          
                          return list.map(f => {
                            const active = scopeFacilities.includes(f.id);
                            return (
                              <div 
                                key={f.id}
                                onClick={() => toggleFacilityScope(f.id)}
                                className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                  active ? "bg-emerald-500/10 border-emerald-500 text-foreground font-bold" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                              >
                                <span className="truncate pr-1">{f.name}</span>
                                {active && <Check className="h-3 w-3 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-8 border-t border-border pt-4 flex gap-2 justify-end">
              <Button 
                onClick={() => {
                  setIsEditing(false);
                  setSelectedUser(null);
                }}
                className="bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl px-4 py-2 font-sans font-semibold text-sm"
              >
                Cancel Changes
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateAccessMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2 font-sans font-semibold text-sm shadow-md"
              >
                {updateAccessMutation.isPending ? "Applying Access Parameters..." : "Save Configured Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Adding Dialog Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-xl bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Plus className="h-6 w-6 text-indigo-500" />
              Add New User Account
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Register a new administrative or healthcare program user with specific role and location scope locks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                <Input 
                  value={addFirstName}
                  onChange={(e) => setAddFirstName(e.target.value)}
                  placeholder="e.g. Alice"
                  className="bg-background border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                <Input 
                  value={addLastName}
                  onChange={(e) => setAddLastName(e.target.value)}
                  placeholder="e.g. Smith"
                  className="bg-background border-border text-foreground rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
              <Input 
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="e.g. alice.smith@health.gov"
                className="bg-background border-border text-foreground rounded-xl"
              />
            </div>

            {/* Role dropdown selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Primary User Role</label>
              <select
                value={addRoles[0] || "facility_clerk"}
                onChange={(e) => setAddRoles([e.target.value])}
                className="w-full bg-secondary border border-border rounded-xl p-2.5 text-sm text-foreground focus:ring-indigo-500"
              >
                {activeRolesList.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            {/* User Primary Scoped Cascade (Province -> District -> Facility) */}
            <div className="space-y-3 rounded-xl border p-4 bg-secondary/30">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block">Scope Location Scopes</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Province</label>
                  <select
                    value={addProvinceId?.toString() ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setAddProvinceId(val);
                      setAddDistrictId(null);
                      setAddFacilityId(null);
                    }}
                    className="w-full bg-background border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500"
                  >
                    <option value="">Global / Select Province</option>
                    {(provinces || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">District</label>
                  <select
                    value={addDistrictId?.toString() ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setAddDistrictId(val);
                      setAddFacilityId(null);
                    }}
                    disabled={!addProvinceId}
                    className="w-full bg-background border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {(districts || [])
                      .filter(d => Number(d.provinceId) === Number(addProvinceId))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Facility</label>
                  <select
                    value={addFacilityId?.toString() ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setAddFacilityId(val);
                    }}
                    disabled={!addDistrictId}
                    className="w-full bg-background border border-border rounded-xl p-2 text-sm text-foreground focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Select Facility</option>
                    {(facilities || [])
                      .filter(f => Number(f.districtId) === Number(addDistrictId))
                      .map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-border pt-4 flex gap-2 justify-end">
            <Button 
              onClick={() => setIsAdding(false)}
              variant="outline"
              className="rounded-xl px-4 py-2 font-sans font-semibold text-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!addEmail.trim()) {
                  toast({ title: "Email required", description: "Please supply a valid email address.", variant: "destructive" });
                  return;
                }
                createUserMutation.mutate({
                  email: addEmail,
                  firstName: addFirstName,
                  lastName: addLastName,
                  roles: addRoles,
                  isActive: addIsActive,
                  provinceId: addProvinceId,
                  districtId: addDistrictId,
                  facilityId: addFacilityId,
                });
              }}
              disabled={createUserMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2 font-sans font-semibold text-sm shadow-md"
            >
              {createUserMutation.isPending ? "Creating User..." : "Register User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dynamic Add Role Modal */}
      <Dialog open={isAddingRole} onOpenChange={setIsAddingRole}>
        <DialogContent className="max-w-xl bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-500" />
              Define New Custom Role
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a custom role with a specific system name, key code, and assigned functional permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Role Name *</label>
                <Input 
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Supervisor"
                  className="bg-background border-border text-foreground rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Role Key Code *</label>
                <Input 
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g. senior_supervisor"
                  className="bg-background border-border text-foreground rounded-xl font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Associated Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {ALL_PERMISSIONS.map(perm => {
                  const active = newRolePermissions.includes(perm.value);
                  return (
                    <div 
                      key={perm.value}
                      onClick={() => {
                        setNewRolePermissions(prev => 
                          prev.includes(perm.value) 
                            ? prev.filter(p => p !== perm.value) 
                            : [...prev, perm.value]
                        );
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        active ? "bg-indigo-500/10 border-indigo-500 text-foreground font-bold" : "bg-background border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block truncate">{perm.label}</span>
                        <span className="text-[9px] text-muted-foreground block truncate">{perm.desc}</span>
                      </div>
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        active ? "bg-indigo-600 border-indigo-600 text-white" : "border-input"
                      }`}>
                        {active && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-border pt-4 flex gap-2 justify-end">
            <Button 
              onClick={() => setIsAddingRole(false)}
              variant="outline"
              className="rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!newRoleName.trim() || !newRoleCode.trim()) {
                  toast({ title: "Validation failed", description: "Role Name and Key Code are required.", variant: "destructive" });
                  return;
                }
                createRoleMutation.mutate({
                  name: newRoleName.trim(),
                  code: newRoleCode.trim().toLowerCase().replace(/\s+/g, "_"),
                  permissions: newRolePermissions,
                });
              }}
              disabled={createRoleMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-md"
            >
              {createRoleMutation.isPending ? "Creating Role..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dynamic Edit Role Modal */}
      {selectedRole && (
        <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
          <DialogContent className="max-w-xl bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Configure Custom Role: {selectedRole.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Modify display name and toggle access permissions for custom role <strong>{selectedRole.code}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Role Name *</label>
                <Input 
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  placeholder="e.g. Senior Coordinator"
                  className="bg-background border-border text-foreground rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Associated Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {ALL_PERMISSIONS.map(perm => {
                    const active = editRolePermissions.includes(perm.value);
                    return (
                      <div 
                        key={perm.value}
                        onClick={() => {
                          setEditRolePermissions(prev => 
                            prev.includes(perm.value) 
                              ? prev.filter(p => p !== perm.value) 
                              : [...prev, perm.value]
                          );
                        }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          active ? "bg-indigo-500/10 border-indigo-500 text-foreground font-bold" : "bg-background border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate">{perm.label}</span>
                          <span className="text-[9px] text-muted-foreground block truncate">{perm.desc}</span>
                        </div>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          active ? "bg-indigo-600 border-indigo-600 text-white" : "border-input"
                        }`}>
                          {active && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-border pt-4 flex gap-2 justify-end">
              <Button 
                onClick={() => {
                  setIsEditingRole(false);
                  setSelectedRole(null);
                }}
                variant="outline"
                className="rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!editRoleName.trim()) {
                    toast({ title: "Validation failed", description: "Role display name is required.", variant: "destructive" });
                    return;
                  }
                  updateRoleMutation.mutate({
                    id: selectedRole.id,
                    name: editRoleName.trim(),
                    permissions: editRolePermissions,
                  });
                }}
                disabled={updateRoleMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-md"
              >
                {updateRoleMutation.isPending ? "Saving Role..." : "Save Role Configuration"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
