import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  LayoutDashboard,
  Map,
  Building2,
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  CalendarDays,
  Package,
  Share2,
  CheckCircle,
  UserPlus,
  Globe,
  Layers,
  FileText,
  Database,
  Terminal,
  Settings,
  HelpCircle,
  Activity,
  Home,
  ClipboardCheck,
  Wrench,
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
  Radio,
  BookOpen,
  BarChart3,
} from "lucide-react";
import type { User } from "@shared/schema";
import { DEFAULT_MODULES } from "@/lib/modules";

interface TenantSummary {
  id: string;
  name: string;
  code: string;
  settings?: {
    modules?: Record<string, boolean>;
  };
}

interface AppSearchItem {
  title: string;
  description: string;
  path?: string;
  action?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  group: "Navigation" | "Planning & Tools" | "Supervision & Campaigns" | "Administration" | "System" | "Quick Actions";
}

interface GlobalSearchProps {
  user: User;
}

export function GlobalSearch({ user }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: tenant } = useQuery<TenantSummary>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const modules = useMemo(() => {
    return {
      ...DEFAULT_MODULES,
      ...(tenant?.settings?.modules || {}),
    };
  }, [tenant]);

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Compute allowed menu items based on roles and active tenant modules
  const searchItems = useMemo<AppSearchItem[]>(() => {
    const items: AppSearchItem[] = [];

    const canAccessApprovals = ["district_manager", "provincial_coordinator", "national_admin"].includes(user.role || "");
    const isNationalAdmin = user.role === "national_admin";
    const isPlatformAdmin = (user as any).isPlatformAdmin === true;
    const canAccessHis = user.role === "national_admin" || user.role === "gis_specialist";
    const canAccessAdmin = isNationalAdmin || user.role === "provincial_coordinator" || isPlatformAdmin;
    const canReconcile = user.role === "national_admin" || user.role === "district_manager";
    const canAccessFieldTeams = ["district_manager", "provincial_coordinator", "national_admin", "gis_specialist"].includes(user.role || "") || isPlatformAdmin;

    // ─── 1. Navigation Group ─────────────────────────────────────────────────
    items.push({
      title: "Dashboard",
      description: "View key microplanning indicators and summary metrics",
      path: "/",
      icon: LayoutDashboard,
      group: "Navigation",
    });

    if (modules.routine !== false || modules.campaigns !== false) {
      items.push({
        title: "Microplan Flow",
        description: "Develop a microplan sequentially using the guided wizard steps",
        path: "/flow",
        icon: Target,
        group: "Navigation",
      });
    }

    if (modules.map !== false) {
      items.push({
        title: "Map View",
        description: "Interactive map visualizing catchment boundaries, settlements, and facilities",
        path: "/map",
        icon: Map,
        group: "Navigation",
      });
    }

    if (modules.settlementIntel !== false) {
      items.push({
        title: "Settlement Intel",
        description: "GIS settlement footprints, grid3 data layer overlays, and population analysis",
        path: "/settlement-intelligence",
        icon: Globe,
        group: "Navigation",
      });
    }

    if (modules.facilities !== false) {
      items.push({
        title: "Facilities",
        description: "Manage health facilities, coordinates, staff counts, and cold chain properties",
        path: "/facilities",
        icon: Building2,
        group: "Navigation",
      });
    }

    if (modules.population !== false) {
      items.push({
        title: "Population Hub",
        description: "View and edit community populations, zero-dose structures, and child registers",
        path: "/population",
        icon: Users,
        group: "Navigation",
      });
    }

    if (modules.clientLogbook !== false) {
      items.push({
        title: "Client Logbook",
        description: "Child registry and vaccination ledger tracking individual routine immunization records",
        path: "/clients",
        icon: ClipboardList,
        group: "Navigation",
      });
    }

    if (modules.defaulters !== false) {
      items.push({
        title: "Defaulter Tracking",
        description: "Track immunization defaulters, overdue list, and checklist reviews",
        path: "/clients/defaulters",
        icon: AlertTriangle,
        group: "Navigation",
      });
    }

    if (modules.dropout !== false) {
      items.push({
        title: "Dropout Rates",
        description: "Calculate and graph antigen dropout rates (DTP1 to DTP3, BCG to MCV1)",
        path: "/indicators/dropout",
        icon: TrendingUp,
        group: "Navigation",
      });
    }

    if (modules.missedCommunities !== false) {
      items.push({
        title: "Missed Communities",
        description: "Identify completely unserved and under-served geographic communities",
        path: "/missed-communities",
        icon: Target,
        group: "Navigation",
      });
    }

    // ─── 2. Planning & Tools Group ───────────────────────────────────────────
    if (modules.routine !== false) {
      items.push({
        title: "Routine Microplans",
        description: "Create and review routine facility microplans",
        path: "/microplans/routine",
        icon: Calendar,
        group: "Planning & Tools",
      });
    }

    if (modules.sessions !== false) {
      items.push({
        title: "Sessions Hub",
        description: "Manage outreach session planning dispatches, schedules, and targets",
        path: "/all-sessions",
        icon: CalendarDays,
        group: "Planning & Tools",
      });
    }

    if (modules.stock !== false) {
      items.push({
        title: "Stock Ledger",
        description: "Vaccine inventory ledger, batch tracking, transaction records, and alerts",
        path: "/stock",
        icon: Package,
        group: "Planning & Tools",
      });
    }

    if (modules.htr !== false) {
      items.push({
        title: "Hard-to-Reach",
        description: "Configure accessibility scores, terrain difficulties, and qualitative comments",
        path: "/htr",
        icon: AlertTriangle,
        group: "Planning & Tools",
      });
    }

    if (modules.interop !== false && canAccessHis) {
      items.push({
        title: "HIS Integrations",
        description: "Configure DHIS2, OpenHIE, and external health registry sync profiles",
        path: "/his-integrations",
        icon: Share2,
        group: "Planning & Tools",
      });
    }

    // ─── 3. Supervision & Campaigns Group ────────────────────────────────────
    if (modules.campaigns !== false) {
      items.push({
        title: "SIA Campaigns",
        description: "Plan Supplementary Immunization Activities (SIA) and campaign dispatches",
        path: "/microplans/campaigns",
        icon: CalendarDays,
        group: "Supervision & Campaigns",
      });
    }

    if (modules.supervision !== false) {
      items.push({
        title: "Supervision tools",
        description: "Open active supportive supervision checklists and templates",
        path: "/supervision-tools",
        icon: ClipboardCheck,
        group: "Supervision & Campaigns",
      });
      items.push({
        title: "PCE Monitoring",
        description: "Register Post-Campaign Coverage Evaluation surveys",
        path: "/pce",
        icon: Activity,
        group: "Supervision & Campaigns",
      });
      items.push({
        title: "House-to-House Monitor",
        description: "Log house-to-house campaign monitoring reports and tally sheets",
        path: "/house-to-house",
        icon: Home,
        group: "Supervision & Campaigns",
      });
    }

    // ─── 4. Administration Group ─────────────────────────────────────────────
    if (canAccessAdmin) {
      items.push({
        title: "User Management",
        description: "Manage tenant accounts, invite staff, and assign access roles",
        path: "/admin/users",
        icon: Users,
        group: "Administration",
      });
      items.push({
        title: "Access Requests",
        description: "Review pending signup requests and authorize new facility users",
        path: "/admin/signups",
        icon: UserPlus,
        group: "Administration",
      });
      if (isPlatformAdmin) {
        items.push({
          title: "Country Onboarding",
          description: "Initialize country configurations, tenants, and regional definitions",
          path: "/admin/countries",
          icon: Globe,
          group: "Administration",
        });
      }
      if (isNationalAdmin) {
        items.push({
          title: "Boundary Manager",
          description: "Import, edit, and manage geographic administrative boundaries (Wards/LLGs)",
          path: "/admin/boundaries",
          icon: Map,
          group: "Administration",
        });
        items.push({
          title: "Custom Layer Manager",
          description: "Configure custom spatial data geojson overlays",
          path: "/admin/custom-layers",
          icon: Layers,
          group: "Administration",
        });
        items.push({
          title: "National Plan",
          description: "Review consolidated national vaccine immunization target sheets",
          path: "/national-plan",
          icon: FileText,
          group: "Administration",
        });
      }
    }

    // ─── 5. System Group ─────────────────────────────────────────────────────
    if (modules.supervision !== false) {
      items.push({
        title: "Supervision Checklists",
        description: "Log checklist reviews and facility supervision scores",
        path: "/supervision",
        icon: ClipboardCheck,
        group: "System",
      });
    }

    items.push({
      title: "Reports",
      description: "Generate and export coverage, defaulter, microplan, and supervision reports",
      path: "/reports",
      icon: BarChart3,
      group: "System",
    });

    items.push({
      title: "Indicator Manual",
      description: "View calculated immunization indicator numerator, denominator, and logic details",
      path: "/indicators/manual",
      icon: BookOpen,
      group: "System",
    });

    items.push({
      title: "Standards Alignment",
      description: "Verify alignment with global microplanning standards and WHO guidelines",
      path: "/standards-alignment",
      icon: ShieldCheck,
      group: "System",
    });

    if (canReconcile) {
      items.push({
        title: "Reconcile Vaccines",
        description: "Reconcile unmapped antigen immunization codes in registry",
        path: "/admin/reconcile-vaccines",
        icon: Wrench,
        group: "System",
      });
    }

    if (canAccessFieldTeams && modules.fieldTeams !== false) {
      items.push({
        title: "Field Teams",
        description: "Manage mobile vaccination teams, device IDs, and coordinates",
        path: "/field-teams",
        icon: Radio,
        group: "System",
      });
    }

    items.push({
      title: "Data Sources",
      description: "Review data sources, acknowledgments, and spatial boundary sources",
      path: "/data-sources",
      icon: Database,
      group: "System",
    });

    items.push({
      title: "API Reference",
      description: "Browse VaxPlan public REST API endpoints and swagger definitions",
      path: "/api-reference",
      icon: Terminal,
      group: "System",
    });

    items.push({
      title: "Settings",
      description: "Modify user details, system settings, and sync intervals",
      path: "/settings",
      icon: Settings,
      group: "System",
    });

    items.push({
      title: "Help & Documentation",
      description: "Read documentation, search user guides, and lookup helpful tips",
      path: "/help",
      icon: HelpCircle,
      group: "System",
    });

    // ─── 6. Quick Actions Group ──────────────────────────────────────────────
    items.push({
      title: `Toggle Theme (Current: ${theme})`,
      description: "Switch between light and dark modes dynamically",
      action: toggleTheme,
      icon: theme === "dark" ? Sun : Moon,
      group: "Quick Actions",
    });

    items.push({
      title: "Log Out",
      description: "Safely end the current session and sign out",
      action: () => {
        window.location.assign("/api/logout");
      },
      icon: LogOut,
      group: "Quick Actions",
    });

    return items;
  }, [user, modules, theme, toggleTheme]);

  const handleSelect = (item: AppSearchItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.path) {
      setLocation(item.path);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-8 w-40 justify-start rounded-md bg-muted/50 text-xs text-muted-foreground sm:pr-12 md:w-64 border border-border/80 hover:bg-muted/70 transition-all select-none"
        onClick={() => setOpen(true)}
        data-testid="button-global-search-trigger"
      >
        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="truncate">Search features...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-[5px] hidden h-5 select-none items-center gap-1 rounded border border-border/60 bg-background px-1.5 font-mono text-[9px] font-medium opacity-80 sm:flex">
          <span className="text-2xs font-sans">Ctrl</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a feature name or command to search..." />
        <CommandList className="max-h-[350px] p-2">
          <CommandEmpty>No matching features or actions found.</CommandEmpty>
          
          {/* Group items by category */}
          {["Navigation", "Planning & Tools", "Supervision & Campaigns", "Administration", "System", "Quick Actions"].map((groupName) => {
            const groupItems = searchItems.filter((i) => i.group === groupName);
            if (groupItems.length === 0) return null;
            return (
              <div key={groupName}>
                <CommandGroup heading={groupName} className="text-xs font-semibold px-2 py-1.5">
                  {groupItems.map((item) => (
                    <CommandItem
                      key={item.title}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs hover:bg-accent/50 hover:text-accent-foreground data-[selected='true']:bg-accent/60"
                      data-testid={`search-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground opacity-80" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-foreground leading-snug">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground leading-normal truncate mt-0.5">{item.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator className="my-1 border-border/40" />
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
