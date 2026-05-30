import { useLocation, Link } from "wouter";
import { useState } from "react";
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
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { User, ApprovalRequest } from "@shared/schema";

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
const planningNavItems = [
  { title: "Routine Microplan", path: "/microplans/routine", icon: Calendar },
  { title: "SIA Campaigns", path: "/microplans/campaigns", icon: Sparkles },
  { title: "Sessions", path: "/all-sessions", icon: CalendarDays },
  { title: "Stock Ledger", path: "/stock", icon: Package },
  { title: "Hard-to-Reach", path: "/htr", icon: AlertTriangle },
  { title: "HIS Integrations", path: "/his-integrations", icon: Share2, adminOnly: true },
];

const workflowNavItems = [
  { title: "Approvals", path: "/approvals", icon: CheckCircle },
];

const adminNavItems = [
  { title: "User Management", path: "/admin/users", icon: Users },
  { title: "Access Requests", path: "/admin/signups", icon: UserPlus },
  { title: "Country Onboarding", path: "/admin/countries", icon: Globe },
  { title: "Boundary Manager", path: "/admin/boundaries", icon: Map },
  { title: "Custom Layers", path: "/admin/custom-layers", icon: Layers },
  { title: "National Plan", path: "/national-plan", icon: FileText },
];

const systemNavItems = [
  { title: "Supervision", path: "/supervision", icon: ClipboardCheck },
  { title: "Standards Alignment", path: "/standards-alignment", icon: ShieldCheck },
  { title: "Reconcile Vaccines", path: "/admin/reconcile-vaccines", icon: Wrench, reconcileOnly: true },
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
  children,
}: {
  label: string;
  storageKey: string;
  badge?: number;
  colorClass?: string;
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
          className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:hidden"
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
  const canAccessHis = user.role === "national_admin" || user.role === "gis_specialist";
  const canAccessAdmin = isNationalAdmin || user.role === "provincial_coordinator";
  const canReconcile = user.role === "national_admin" || user.role === "district_manager";
  const { data: tenant } = useQuery<TenantSummary>({ queryKey: ["/api/me/tenant"], retry: false });

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
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
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
        <CollapsibleSection label="Main" storageKey="main" colorClass="text-sky-600 dark:text-sky-400">
          <SidebarMenu>
            {mainNavItems.map((item) => (
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

        <CollapsibleSection label="Planning" storageKey="planning" colorClass="text-emerald-600 dark:text-emerald-400">
          <SidebarMenu>
            {planningNavItems
              .filter((item) => !(item as any).adminOnly || canAccessHis)
              .filter((item) => {
                const modules = (tenant as any)?.settings?.modules || {
                  budget: true,
                  calculator: true,
                  stock: true,
                  mobilization: true,
                  htr: true,
                  interop: true,
                };
                if (item.path === "/budget") return modules.budget !== false;
                if (item.path === "/vaccines") return modules.calculator !== false;
                if (item.path === "/stock") return modules.stock !== false;
                if (item.path === "/mobilization") return modules.mobilization !== false;
                if (item.path === "/htr") return modules.htr !== false;
                if (item.path === "/his-integrations") return modules.interop !== false;
                return true;
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

        {canAccessApprovals && (
          <CollapsibleSection
            label="Workflow"
            storageKey="workflow"
            badge={pendingApprovalsCount}
            colorClass="text-amber-600 dark:text-amber-400"
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
          <CollapsibleSection label="Administration" storageKey="admin" colorClass="text-violet-600 dark:text-violet-400">
            <SidebarMenu>
              {adminNavItems
                .filter((item) => {
                  // User Management + Access Requests are visible to any admin
                  // (national_admin or provincial_coordinator). The deeper
                  // tenant/boundary configuration tools stay national-only.
                  if (item.path === "/admin/users" || item.path === "/admin/signups") {
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

        <CollapsibleSection label="System" storageKey="system" colorClass="text-rose-600 dark:text-rose-400">
          <SidebarMenu>
            {systemNavItems
              .filter((item) => !(item as any).reconcileOnly || canReconcile)
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
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          VaxPlan v1.0 · Health Microplanning
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
