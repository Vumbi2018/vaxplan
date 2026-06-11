import { useLocation, Link } from "wouter";
import { useState } from "react";
import { versionLabel } from "@/lib/version";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Map,
  Building2,
  Users,
  Calendar,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  Settings,
  HelpCircle,
  UserPlus,
  HeartPulse,
  Globe,
  ClipboardList,
  ClipboardCheck,
  Database,
  Package,
  Share2,
  Sparkles,
  ShieldCheck,
  Target,
  TrendingUp,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  Layers,
  Radio,
  BarChart3,
  Terminal,
  Activity,
  Search,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { User, ApprovalRequest } from "@shared/schema";
import { DEFAULT_MODULES } from "@/lib/modules";

interface TenantSummary { id: string; name: string; code: string }

interface AppSidebarProps {
  user: User;
}

const mainNavItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Microplan Flow", path: "/flow", icon: Sparkles },
  { title: "Map View", path: "/map", icon: Map },
  { title: "Settlement Intel", path: "/settlement-intelligence", icon: Globe },
  { title: "Facilities", path: "/facilities", icon: Building2 },
  { title: "Population Hub", path: "/population", icon: Users },
  { title: "Client Logbook", path: "/clients", icon: ClipboardList },
  { title: "Defaulter List", path: "/clients/defaulters", icon: AlertTriangle },
  { title: "Dropout Rates", path: "/indicators/dropout", icon: TrendingUp },
  { title: "Missed Communities", path: "/missed-communities", icon: Target },
];

// Planning sidebar — slimmed down. Budget / Vaccine Calculator / Social
// Mobilization used to be standalone pages but are now Steps 9, 6, and 7 of
// the Microplan Wizard, so their sidebar entries were removed (the routes
// now redirect to the wizard). "Microplan Builder" was a duplicate entry
// point into the same wizard that Routine + SIA already cover.
/* Commented out old planningNavItems definition to restructure SIA Campaigns collapsible section
const planningNavItems = [
  { title: "Routine Microplan", path: "/microplans/routine", icon: Calendar },
  { title: "SIA Campaigns", path: "/microplans/campaigns", icon: Sparkles },
  { title: "Supervision Tools", path: "/supervision-tools", icon: ClipboardCheck },
  { title: "PCE", path: "/pce", icon: Activity },
  { title: "House-to-House", path: "/house-to-house", icon: Home },
  { title: "Sessions", path: "/all-sessions", icon: CalendarDays },
  { title: "Stock Ledger", path: "/stock", icon: Package },
  { title: "Hard-to-Reach", path: "/htr", icon: AlertTriangle },
  { title: "HIS Integrations", path: "/his-integrations", icon: Share2, adminOnly: true },
];
*/

const planningNavItems = [
  { title: "Routine Microplan", path: "/microplans/routine", icon: Calendar },
  { title: "Sessions", path: "/all-sessions", icon: CalendarDays },
  { title: "Stock Ledger", path: "/stock", icon: Package },
  { title: "Hard-to-Reach", path: "/htr", icon: AlertTriangle },
  { title: "HIS Integrations", path: "/his-integrations", icon: Share2, adminOnly: true },
];

const siaNavItems = [
  { title: "Microplan", path: "/microplans/campaigns", icon: Sparkles },
  { title: "Supervision Tools", path: "/supervision-tools", icon: ClipboardCheck },
  { title: "PCE", path: "/pce", icon: Activity },
  { title: "House-to-House", path: "/house-to-house", icon: Home },
];

const workflowNavItems = [
  { title: "Approvals", path: "/approvals", icon: CheckCircle },
];

const adminNavItems = [
  { title: "User Management", path: "/admin/users", icon: Users },
  { title: "Access Requests", path: "/admin/signups", icon: UserPlus },
  { title: "Manage Staff", path: "/admin/staff", icon: Users },
  { title: "Country Onboarding", path: "/admin/countries", icon: Globe, superAdminOnly: true },
  { title: "Boundary Manager", path: "/admin/boundaries", icon: Map },
  { title: "Custom Layers", path: "/admin/custom-layers", icon: Layers },
  { title: "National Plan", path: "/national-plan", icon: FileText },
  { title: "Wiki / Docs", path: "/admin/wiki", icon: BookOpen, wikiAdminOnly: true },
];

const systemNavItems = [
  { title: "Surveillance", path: "/surveillance", icon: ShieldCheck },
  { title: "Supervision", path: "/supervision", icon: ClipboardCheck },
  { title: "Standards Alignment", path: "/standards-alignment", icon: ShieldCheck },
  { title: "Reconcile Vaccines", path: "/admin/reconcile-vaccines", icon: Wrench, reconcileOnly: true },
  { title: "Data Sources", path: "/data-sources", icon: Database },
  { title: "API Reference", path: "/api-reference", icon: Terminal },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Help", path: "/help", icon: HelpCircle },
];

/**
 * A SidebarGroup whose label acts as a chevron toggle to collapse the
 * section vertically. When the whole sidebar is in icon-collapse mode the
 * label is hidden by the parent CSS, so this only kicks in for the
 * expanded sidebar (where users want to hide sections they aren't using).
 */
function CollapsibleSection({
  label,
  storageKey,
  badge,
  colorClass,
  bgClass,
  children,
}: {
  label: string;
  storageKey: string;
  badge?: number;
  colorClass?: string;
  bgClass?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem(`vaxplan.sidebar.section.${storageKey}`);
      return raw === null ? true : raw === "1";
    } catch {
      // Private mode / restricted storage — default to open.
      return true;
    }
  });
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          `vaxplan.sidebar.section.${storageKey}`,
          next ? "1" : "0",
        );
      } catch {
        /* localStorage may be disabled */
      }
      return next;
    });
  };
  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-2 transition-colors group-data-[collapsible=icon]:hidden ${bgClass ?? ""}`}
          data-testid={`sidebar-section-toggle-${storageKey}`}
        >
          <span className={`flex items-center gap-2 font-semibold tracking-wide uppercase text-[11px] ${colorClass ?? ""}`}>
            {open ? (
              <ChevronDown className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0" />
            )}
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {badge > 99 ? "99+" : badge}
            </Badge>
          )}
        </button>
      </SidebarGroupLabel>
      {/* Keep content rendered when the sidebar is in icon-collapse mode
          (so icons stay visible there), and hide it only when the user has
          collapsed this section while the sidebar is fully expanded. */}
      <SidebarGroupContent
        className={open ? "" : "hidden group-data-[collapsible=icon]:block"}
      >
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();

  const canAccessApprovals = ["district_manager", "provincial_coordinator", "national_admin"].includes(user.role || "");
  const isNationalAdmin = user.role === "national_admin";
  const isPlatformAdmin = (user as any).isPlatformAdmin === true;
  const canAccessHis = user.role === "national_admin" || user.role === "gis_specialist";
  const canAccessAdmin = isNationalAdmin || user.role === "provincial_coordinator" || isPlatformAdmin;
  const canEditWiki = isNationalAdmin || user.role === "gis_specialist" || isPlatformAdmin;
  const canReconcile = user.role === "national_admin" || user.role === "district_manager";
  // Field Teams page is available to district_manager and above (not facility-level roles)
  const canAccessFieldTeams = ["district_manager", "provincial_coordinator", "national_admin", "gis_specialist"].includes(user.role || "") || isPlatformAdmin;
  const { data: tenant } = useQuery<TenantSummary>({ queryKey: ["/api/me/tenant"], retry: false });
  const modules = {
    ...DEFAULT_MODULES,
    ...((tenant as any)?.settings?.modules || {})
  };

  const visibleMainNavItems = mainNavItems.filter((item) => {
    if (item.path === "/") return true;
    if (item.path === "/flow") return modules.routine !== false || modules.campaigns !== false;
    if (item.path === "/map") return modules.map !== false;
    if (item.path === "/settlement-intelligence") return modules.settlementIntel !== false;
    if (item.path === "/facilities") return modules.facilities !== false;
    if (item.path === "/population") return modules.population !== false;
    if (item.path === "/clients") return modules.clientLogbook !== false;
    if (item.path === "/clients/defaulters") return modules.defaulters !== false;
    if (item.path === "/indicators/dropout") return modules.dropout !== false;
    if (item.path === "/missed-communities") return modules.missedCommunities !== false;
    return true;
  });

  const visiblePlanningNavItems = planningNavItems
    .filter((item) => !(item as any).adminOnly || canAccessHis)
    .filter((item) => {
      if (item.path === "/microplans/routine") return modules.routine !== false;
      if (item.path === "/all-sessions") return modules.sessions !== false;
      if (item.path === "/stock") return modules.stock !== false;
      if (item.path === "/htr") return modules.htr !== false;
      if (item.path === "/his-integrations") return modules.interop !== false;
      return true;
    });

  const visibleSiaNavItems = siaNavItems.filter((item) => {
    if (item.path === "/microplans/campaigns") return modules.campaigns !== false;
    if (item.path === "/supervision-tools" || item.path === "/pce" || item.path === "/house-to-house") {
      return modules.supervision !== false;
    }
    return true;
  });

  const visibleSystemNavItems = systemNavItems
    .filter((item) => !(item as any).reconcileOnly || canReconcile)
    .filter((item) => {
      if (item.path === "/supervision") return modules.supervision !== false;
      return true;
    });

  // Real pending-approvals count for the Workflow section badge. Only
  // fetched for users who can actually see the Approvals page; falls back
  // to undefined (no badge) for everyone else.
  const { data: approvalRequests } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals"],
    enabled: canAccessApprovals,
    retry: false,
  });
  const pendingApprovalsCount = approvalRequests
    ? approvalRequests.filter((r) => r.status === "pending").length
    : undefined;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-sky-600 to-sky-700 text-white shadow-md shadow-primary/30 ring-1 ring-white/20 shrink-0">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm truncate" data-testid="text-brand-name">VaxPlan</span>
            <span className="text-xs text-muted-foreground truncate" data-testid="text-tenant-name">
              {tenant?.name ?? "Health Microplanning"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleMainNavItems.length > 0 && (
          <CollapsibleSection label="Main" storageKey="main" colorClass="text-sky-600 dark:text-sky-400" bgClass="bg-sky-500/10 hover:bg-sky-500/15 dark:bg-sky-400/10 dark:hover:bg-sky-400/15">
            <SidebarMenu>
              {visibleMainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}

        {visiblePlanningNavItems.length > 0 && (
          <CollapsibleSection label="Planning" storageKey="planning" colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15">
            <SidebarMenu>
              {visiblePlanningNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}

        {visibleSiaNavItems.length > 0 && (
          <CollapsibleSection
            label="SIA Campaigns"
            storageKey="sia-campaigns"
            colorClass="text-indigo-600 dark:text-indigo-400"
            bgClass="bg-indigo-500/10 hover:bg-indigo-500/15 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/15"
          >
            <SidebarMenu>
              {visibleSiaNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}

        {/* Analytics — visible to all authenticated roles (RBAC scoping happens server-side) */}
        <CollapsibleSection
          label="Analytics"
          storageKey="analytics"
          colorClass="text-violet-600 dark:text-violet-400"
          bgClass="bg-violet-500/10 hover:bg-violet-500/15 dark:bg-violet-400/10 dark:hover:bg-violet-400/15"
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.startsWith("/reports")}
                tooltip="Reports"
              >
                <Link href="/reports" data-testid="nav-reports">
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/indicators/manual"}
                tooltip="Indicator Manual"
              >
                <Link href="/indicators/manual" data-testid="nav-indicator-manual">
                  <BookOpen className="h-4 w-4" />
                  <span>Indicator Manual</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </CollapsibleSection>

        {canAccessApprovals && (
          <CollapsibleSection
            label="Workflow"
            storageKey="workflow"
            badge={pendingApprovalsCount}
            colorClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
          >
            <SidebarMenu>
              {workflowNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {pendingApprovalsCount !== undefined && pendingApprovalsCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {pendingApprovalsCount > 99 ? "99+" : pendingApprovalsCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}

        {canAccessAdmin && (
          <CollapsibleSection label="Administration" storageKey="admin" colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-500/10 hover:bg-violet-500/15 dark:bg-violet-400/10 dark:hover:bg-violet-400/15">
            <SidebarMenu>
              {adminNavItems
                .filter((item) => {
                  // Country Onboarding is reserved for platform Super Admins —
                  // country-specific admins can never create new countries.
                  if ((item as any).superAdminOnly) {
                    return isPlatformAdmin;
                  }
                  // Wiki editor is for national_admin / gis_specialist / platform admins.
                  if ((item as any).wikiAdminOnly) {
                    return canEditWiki;
                  }
                  // User Management, Access Requests + Manage Staff are visible to any admin
                  // (national_admin or provincial_coordinator). The deeper
                  // tenant/boundary configuration tools stay national-only.
                  if (item.path === "/admin/users" || item.path === "/admin/signups" || item.path === "/admin/staff") {
                    return true;
                  }
                  return isNationalAdmin;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                      tooltip={item.title}
                    >
                      <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}

        {(visibleSystemNavItems.length > 0 || (canAccessFieldTeams && modules.fieldTeams !== false)) && (
          <CollapsibleSection label="System" storageKey="system" colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-400/10 dark:hover:bg-rose-400/15">
            <SidebarMenu>
              {/* Field Teams — only visible to district_manager and above */}
              {canAccessFieldTeams && modules.fieldTeams !== false && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/field-teams"}
                    tooltip="Field Teams"
                  >
                    <Link href="/field-teams" data-testid="nav-field-teams">
                      <Radio className="h-4 w-4" />
                      <span>Field Teams</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {visibleSystemNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSection>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="group-data-[collapsible=icon]:hidden space-y-1.5">
          <div className="text-xs text-muted-foreground text-center">
            {versionLabel()}
          </div>
          <div className="flex items-center justify-center">
            <Link
              href="/help"
              className="text-[11px] text-primary/70 hover:text-primary hover:underline flex items-center gap-1 transition-colors"
              data-testid="sidebar-help-link"
            >
              <HelpCircle className="h-3 w-3" />
              Help &amp; User Guide
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
