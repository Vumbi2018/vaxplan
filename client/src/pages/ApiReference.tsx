import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Code2, Search, Copy, Check, Terminal, Shield, ArrowRight,
  Database, Users, Globe, ClipboardList, Package, Share2, Layers,
  Lock, BookOpen, Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface APIParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: "Public" | "Authenticated" | "District Manager+" | "National Admin+" | "Platform Admin";
  description: string;
  params?: APIParam[];
  requestExample?: string;
  responseExample: string;
}

interface APIGroup {
  id: string;
  title: string;
  icon: any;
  description: string;
  endpoints: APIEndpoint[];
}

const API_GROUPS: APIGroup[] = [
  {
    id: "auth",
    title: "System & Authentication",
    icon: Key,
    description: "Session tokens, device authentication for offline mobile sync, and platform stats.",
    endpoints: [
      {
        method: "GET",
        path: "/api/auth/user",
        auth: "Authenticated",
        description: "Fetch the active user profile session, including roles, tenant details, and specific granular permissions.",
        responseExample: `{
  "success": true,
  "data": {
    "id": 42,
    "firstName": "Dr. Sarah",
    "lastName": "Chola",
    "email": "sarah.chola@moh.gov.zm",
    "role": "provincial_coordinator",
    "provinceId": 3,
    "districtId": null,
    "facilityId": null,
    "tenantId": "tenant-zm-north",
    "permissions": ["view_reports", "approve_microplans", "manage_users"]
  }
}`
      },
      {
        method: "POST",
        path: "/api/auth/device-token",
        auth: "Authenticated",
        description: "Request a highly secure cryptographically signed API/device token used to authorize the offline Android client. Tokens are private and should be kept secure.",
        requestExample: `{
  "deviceName": "Zebra TC26 Handheld",
  "purpose": "Routine Outreach Syncing"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "tokenId": "tok_8f93a921",
    "tokenString": "vp_sec_7a2b9d4e1f83c09b882a...[truncated]",
    "createdAt": "2026-06-02T16:00:00.000Z",
    "expiresAt": "2027-06-02T16:00:00.000Z"
  }
}`
      },
      {
        method: "GET",
        path: "/api/stats",
        auth: "Authenticated",
        description: "Aggregates overall tenant metrics for the dashboard, including total zero-dose children mapped, defaulters, session completion percentage, and active microplans.",
        responseExample: `{
  "success": true,
  "data": {
    "totalZeroDose": 1284,
    "totalDefaulters": 642,
    "activeMicroplansCount": 8,
    "sessionCompletionRate": 78.4,
    "totalImmunizedThisMonth": 4812
  }
}`
      }
    ]
  },
  {
    id: "geo",
    title: "Geography & Facilities",
    icon: Globe,
    description: "Hierarchical administrative bounds mapping: Province → District → Health Facility.",
    endpoints: [
      {
        method: "GET",
        path: "/api/provinces",
        auth: "Authenticated",
        description: "Lists all provinces in the country onboarding scope for the active tenant.",
        responseExample: `{
  "success": true,
  "data": [
    { "id": 1, "name": "Northern Province" },
    { "id": 2, "name": "Southern Province" }
  ]
}`
      },
      {
        method: "GET",
        path: "/api/districts",
        auth: "Authenticated",
        description: "Lists districts. Returns all districts or filters them by parent province.",
        params: [
          { name: "provinceId", type: "number", required: false, description: "Filter districts belonging to a specific province" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    { "id": 12, "name": "Kasama District", "provinceId": 1 },
    { "id": 13, "name": "Mbala District", "provinceId": 1 }
  ]
}`
      },
      {
        method: "GET",
        path: "/api/facilities",
        auth: "Authenticated",
        description: "Retrieves health facilities. Projects names and locations. Highly cached.",
        params: [
          { name: "districtId", type: "number", required: false, description: "Filter facilities belonging to a specific district" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    { "id": 104, "name": "Kasama General Hospital", "districtId": 12, "latitude": -10.212, "longitude": 31.181 },
    { "id": 105, "name": "Chiba Urban Clinic", "districtId": 12, "latitude": -10.224, "longitude": 31.195 }
  ]
}`
      }
    ]
  },
  {
    id: "microplans",
    title: "Microplanning Engine",
    icon: ClipboardList,
    description: "Target calculations, planning steps, budget summaries, and approval cycles.",
    endpoints: [
      {
        method: "GET",
        path: "/api/microplans",
        auth: "Authenticated",
        description: "Lists all generated microplans for the active user's scope. Projection limits heavy columns for lists.",
        params: [
          { name: "status", type: "string", required: false, description: "Filter by status: 'draft', 'pending_approval', 'approved'" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Q3 Routine Outreach Plan - Kasama",
      "status": "pending_approval",
      "planType": "routine",
      "targetPopulation": 14200,
      "createdBy": "sarah.chola",
      "createdAt": "2026-05-15T08:30:00Z"
    }
  ]
}`
      },
      {
        method: "POST",
        path: "/api/microplans",
        auth: "District Manager+",
        description: "Creates a new microplan shell to coordinate geographic immunization campaigns or routine sessions.",
        requestExample: `{
  "name": "2026 SIA Polio Campaign - Kasama",
  "planType": "campaign",
  "targetPopulation": 18500,
  "districtId": 12
}`,
        responseExample: `{
  "success": true,
  "message": "Microplan created successfully",
  "data": {
    "id": 9,
    "name": "2026 SIA Polio Campaign - Kasama",
    "status": "draft",
    "planType": "campaign"
  }
}`
      },
      {
        method: "PATCH",
        path: "/api/monthly-reports/:id/approve",
        auth: "National Admin+",
        description: "Approves a submitted monthly microplanning execution report, committing indicators to permanent registry archives.",
        responseExample: `{
  "success": true,
  "message": "Report approved and archived successfully"
}`
      }
    ]
  },
  {
    id: "sessions",
    title: "Session Scheduling",
    icon: Code2,
    description: "Session builder, daily operations, proximity validations, and completion logs.",
    endpoints: [
      {
        method: "GET",
        path: "/api/sessions",
        auth: "Authenticated",
        description: "List scheduled outreach and fixed sessions. Supports coordinates bounding box for GIS overlays.",
        params: [
          { name: "microplanId", type: "number", required: false, description: "Scope to a specific microplan" },
          { name: "bbox", type: "string", required: false, description: "Geo bbox: 'minLon,minLat,maxLon,maxLat'" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "id": 142,
      "name": "Milima Outreach Day 1",
      "status": "scheduled",
      "sessionDate": "2026-06-15",
      "facilityId": 105,
      "latitude": -10.182,
      "longitude": 31.221
    }
  ]
}`
      },
      {
        method: "POST",
        path: "/api/sessions/validate-proximity",
        auth: "Authenticated",
        description: "Validates if a newly planned outreach session location is too close (e.g. within 5km) to an existing schedule to eliminate vaccine provider overlap.",
        requestExample: `{
  "latitude": -10.185,
  "longitude": 31.225,
  "sessionDate": "2026-06-15"
}`,
        responseExample: `{
  "success": true,
  "hasConflict": true,
  "conflicts": [
    { "sessionId": 142, "name": "Milima Outreach Day 1", "distanceKm": 0.48 }
  ]
}`
      }
    ]
  },
  {
    id: "clients",
    title: "Client Registry & Logbook",
    icon: Users,
    description: "Child demographic logging, immunization schedules, and zero-dose tracking.",
    endpoints: [
      {
        method: "GET",
        path: "/api/clients",
        auth: "Authenticated",
        description: "Search and retrieve registered children. Support pagination, full-text fuzzy matching, and target risk filter.",
        params: [
          { name: "search", type: "string", required: false, description: "Fuzzy search by name or registry card ID" },
          { name: "risk", type: "string", required: false, description: "Filter by risk level: 'zero_dose', 'dropout', 'default'" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "id": 1084,
      "firstName": "Mutale",
      "lastName": "Mwamba",
      "birthDate": "2025-11-04",
      "caregiverName": "Joyce Mwamba",
      "riskStatus": "dropout",
      "vaccinationCount": 3
    }
  ]
}`
      },
      {
        method: "POST",
        path: "/api/clients/:id/vaccinate",
        auth: "Authenticated",
        description: "Records the administration of an antigen dose to a registered child, triggering system reminder status updates.",
        requestExample: `{
  "antigenCode": "DTP-HepB-Hib-1",
  "administeredDate": "2026-06-02",
  "facilityId": 105,
  "batchNumber": "B9032A"
}`,
        responseExample: `{
  "success": true,
  "message": "Vaccination recorded successfully",
  "data": {
    "vaccinationId": 4821,
    "nextScheduledDose": "2026-07-02",
    "nextAntigen": "DTP-HepB-Hib-2"
  }
}`
      }
    ]
  },
  {
    id: "stock",
    title: "Vaccine Cold Chain & Stock",
    icon: Package,
    description: "Antigen ledger management, wastage rates, stock transfers, and alerts.",
    endpoints: [
      {
        method: "GET",
        path: "/api/stock/ledger",
        auth: "Authenticated",
        description: "View localized balance sheets of active cold chain antigens at a facility or district store level.",
        params: [
          { name: "facilityId", type: "number", required: true, description: "Scope to a specific facility warehouse" }
        ],
        responseExample: `{
  "success": true,
  "data": [
    { "antigen": "BCG", "availableDoses": 420, "vialsCount": 21, "minThreshold": 100, "status": "adequate" },
    { "antigen": "OPV", "availableDoses": 80, "vialsCount": 4, "minThreshold": 150, "status": "understocked_alert" }
  ]
}`
      },
      {
        method: "POST",
        path: "/api/stock/transfer",
        auth: "District Manager+",
        description: "Log dispatch/receipt stock transfers between supply line nodes.",
        requestExample: `{
  "sourceFacilityId": 104,
  "destFacilityId": 105,
  "antigen": "OPV",
  "dosesCount": 100,
  "batchNumber": "V892"
}`,
        responseExample: `{
  "success": true,
  "message": "Transfer logged and inventory balances updated dynamically"
}`
      }
    ]
  },
  {
    id: "sync",
    title: "Offline Sync & HIS Interop",
    icon: Share2,
    description: "Database sync endpoints for field tablets and push pipelines to national DHIS2.",
    endpoints: [
      {
        method: "GET",
        path: "/api/sync/pull",
        auth: "Authenticated",
        description: "Pull down delta changes made in the cloud since the client's last sync sequence timestamp. Essential for offline-first replication.",
        params: [
          { name: "since", type: "string", required: true, description: "ISO timestamp of the client's last successful sync" }
        ],
        responseExample: `{
  "success": true,
  "data": {
    "clients": [
      { "id": 1084, "firstName": "Mutale", "lastName": "Mwamba", "updatedAt": "2026-06-02T12:00:00Z" }
    ],
    "sessions": [],
    "stockTransactions": [],
    "serverTime": "2026-06-02T16:00:00Z"
  }
}`
      },
      {
        method: "POST",
        path: "/api/sync/batch",
        auth: "Authenticated",
        description: "Batch uploads offline operations stored in the SQLite outbox of a field tablet. Transactions execute atomically.",
        requestExample: `{
  "deviceToken": "vp_sec_7a2b...",
  "operations": [
    {
      "action": "create_client",
      "tempId": "tmp_90211",
      "payload": { "firstName": "Aaron", "lastName": "Phiri", "birthDate": "2026-01-10" }
    }
  ]
}`,
        responseExample: `{
  "success": true,
  "processed": 1,
  "failed": 0,
  "idMap": {
    "tmp_90211": 1085
  }
}`
      },
      {
        method: "POST",
        path: "/api/his/push-immunizations",
        auth: "National Admin+",
        description: "Triggers the pipeline to export aggregated monthly indicators (doses administered, drop-outs, wastage) to the National DHIS2 instance.",
        responseExample: `{
  "success": true,
  "dhis2Response": {
    "imported": 48,
    "updated": 2,
    "ignored": 0,
    "status": "SUCCESS"
  }
}`
      }
    ]
  }
];

export default function ApiReference() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast({
      title: "Copied to clipboard",
      description: "Path/Payload has been successfully copied.",
      duration: 2000,
    });
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "POST":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "PUT":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "PATCH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 border-slate-500/20";
    }
  };

  const getAuthBadgeClass = (auth: string) => {
    switch (auth) {
      case "Public":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
      case "Authenticated":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "District Manager+":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "National Admin+":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      default:
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    }
  };

  // Filter groups and endpoints
  const filteredGroups = API_GROUPS.map((group) => {
    if (selectedGroup !== "all" && group.id !== selectedGroup) return null;

    const filteredEndpoints = group.endpoints.filter((ep) => {
      const matchSearch =
        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });

    if (filteredEndpoints.length === 0) return null;

    return {
      ...group,
      endpoints: filteredEndpoints
    };
  }).filter(Boolean) as APIGroup[];

  return (
    <div className="min-h-screen bg-background">
      {/* Dynamic Header */}
      <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-20 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">API Documentation</h1>
              <p className="text-xs text-muted-foreground">
                REST Specifications &amp; offline synchronization protocols for integrators.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Role-Based Access Control Active</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Left Column Sidebar */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search endpoints..."
                    className="pl-9 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="border-t border-border/50 pt-2" />

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2">
                    Categories
                  </span>
                  <button
                    onClick={() => setSelectedGroup("all")}
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedGroup === "all"
                        ? "bg-primary text-primary-foreground font-semibold shadow"
                        : "hover:bg-accent text-foreground/80"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>All Endpoints</span>
                  </button>

                  {API_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroup(group.id)}
                        className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedGroup === group.id
                            ? "bg-primary text-primary-foreground font-semibold shadow"
                            : "hover:bg-accent text-foreground/80"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{group.title}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-indigo-500/5 border-indigo-500/10">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                  <Lock className="h-4 w-4" />
                  <span>Security Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  All requests must attach the `Cookie` session key or supply a generated device token in the `Authorization` header as:
                  <code className="block mt-1 p-1.5 rounded bg-muted/65 font-mono text-[10px] break-all">
                    Bearer vp_sec_...
                  </code>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column Endpoint Catalog */}
          <div className="lg:col-span-3 space-y-12">
            {filteredGroups.length === 0 ? (
              <Card className="border-border/60 bg-card/50 py-12">
                <CardContent className="text-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold">No endpoints found</h3>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search keywords or choosing a different category.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredGroups.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="space-y-6">
                    {/* Group Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-border/50">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GroupIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-foreground">{group.title}</h2>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>

                    {/* Endpoints */}
                    <div className="space-y-6">
                      {group.endpoints.map((ep, idx) => (
                        <Card key={idx} className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow">
                          {/* Endpoint title bar */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 px-4 py-3 border-b border-border/40">
                            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                              <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadgeClass(ep.method)}`} variant="outline">
                                {ep.method}
                              </Badge>
                              <code className="text-xs md:text-sm font-mono font-bold text-foreground truncate break-all select-all">
                                {ep.path}
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => handleCopy(ep.path)}
                              >
                                {copiedText === ep.path ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                              <Badge className={`text-[10px] font-semibold ${getAuthBadgeClass(ep.auth)}`} variant="secondary">
                                {ep.auth}
                              </Badge>
                            </div>
                          </div>

                          <CardContent className="p-4 space-y-4">
                            <p className="text-xs leading-relaxed text-foreground/90">
                              {ep.description}
                            </p>

                            {/* Parameters */}
                            {ep.params && ep.params.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                  Parameters
                                </span>
                                <div className="border border-border/40 rounded-lg overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-muted/30 border-b border-border/40 font-semibold">
                                        <th className="px-3 py-2">Parameter</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Required</th>
                                        <th className="px-3 py-2">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                                      {ep.params.map((param, pIdx) => (
                                        <tr key={pIdx} className="hover:bg-muted/10">
                                          <td className="px-3 py-2 font-bold text-foreground">{param.name}</td>
                                          <td className="px-3 py-2 text-primary">{param.type}</td>
                                          <td className="px-3 py-2">
                                            {param.required ? (
                                              <span className="text-rose-600 dark:text-rose-400 font-bold">Yes</span>
                                            ) : (
                                              <span className="text-muted-foreground">No</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-sans font-normal text-muted-foreground">{param.description}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Examples */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              {/* Request Payload */}
                              {ep.requestExample && (
                                <div className="md:col-span-6 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                      Example Request
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleCopy(ep.requestExample || "")}
                                    >
                                      {copiedText === ep.requestExample ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                  <pre className="p-3 rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 dark:text-zinc-300 font-mono text-[10.5px] leading-relaxed overflow-x-auto">
                                    <code>{ep.requestExample}</code>
                                  </pre>
                                </div>
                              )}

                              {/* Response Payload */}
                              <div className={`${ep.requestExample ? "md:col-span-6" : "md:col-span-12"} space-y-1.5`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                    Example Response (200 OK)
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleCopy(ep.responseExample)}
                                  >
                                    {copiedText === ep.responseExample ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 dark:text-zinc-300 font-mono text-[10.5px] leading-relaxed overflow-x-auto">
                                  <code>{ep.responseExample}</code>
                                </pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
