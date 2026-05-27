import { useLocation, Link } from "wouter";
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
  Wallet,
  Syringe,
  Megaphone,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

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
  { title: "Missed Communities", path: "/missed-communities", icon: Target },
];

const planningNavItems = [
  { title: "Routine Microplan", path: "/microplans/routine", icon: Calendar },
  { title: "SIA Campaigns", path: "/microplans/campaigns", icon: Sparkles },
  { title: "Microplan Builder", path: "/develop-microplan", icon: ClipboardList },
  { title: "Stock Ledger", path: "/stock", icon: Package },
  { title: "Hard-to-Reach", path: "/htr", icon: AlertTriangle },
  { title: "Budget Planning", path: "/budget", icon: Wallet },
  { title: "Vaccine Calculator", path: "/vaccines", icon: Syringe },
  { title: "Social Mobilization", path: "/mobilization", icon: Megaphone },
  { title: "HIS Integrations", path: "/his-integrations", icon: Share2, adminOnly: true },
];

const workflowNavItems = [
  { title: "Approvals", path: "/approvals", icon: CheckCircle },
];

const adminNavItems = [
  { title: "User Control", path: "/admin/users", icon: Users },
  { title: "Access Requests", path: "/admin/signups", icon: UserPlus },
  { title: "Country Onboarding", path: "/admin/countries", icon: Globe },
  { title: "Boundary Manager", path: "/admin/boundaries", icon: Map },
];

const systemNavItems = [
  { title: "Supervision", path: "/supervision", icon: ClipboardCheck },
  { title: "Standards Alignment", path: "/standards-alignment", icon: ShieldCheck },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Help", path: "/help", icon: HelpCircle },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();

  const canAccessApprovals = ["district_manager", "provincial_coordinator", "national_admin"].includes(user.role || "");
  const isNationalAdmin = user.role === "national_admin";
  const canAccessHis = user.role === "national_admin" || user.role === "gis_specialist";
  const canAccessAdmin = isNationalAdmin || user.role === "provincial_coordinator";
  const { data: tenant } = useQuery<TenantSummary>({ queryKey: ["/api/me/tenant"], retry: false });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate" data-testid="text-brand-name">VaxPlan</span>
            <span className="text-xs text-muted-foreground truncate" data-testid="text-tenant-name">
              {tenant?.name ?? "Health Microplanning"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Planning</SidebarGroupLabel>
          <SidebarGroupContent>
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
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canAccessApprovals && (
          <SidebarGroup>
            <SidebarGroupLabel>Workflow</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workflowNavItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                    >
                      <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          3
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Navigation Sidebar Group (Commented out to preserve working code - now unified under Settings tabs): */}
        {/*
        {canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems
                  .filter((item) => {
                    if (item.path !== "/admin/users" && !isNationalAdmin) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={location === item.path}>
                      <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        */}

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                  >
                    <Link href={item.path} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          VaxPlan v1.0 · Health Microplanning
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
