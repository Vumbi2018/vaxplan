import {
  Map,
  Globe,
  Building2,
  Users,
  Radio,
  Calendar,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Target,
  FileText,
  DollarSign,
  Calculator,
  Package,
  Share2,
  Sparkles,
  ClipboardCheck
} from "lucide-react";

export const DEFAULT_MODULES = {
  // Core Data
  map: true,
  settlementIntel: true,
  facilities: true,
  population: true,
  fieldTeams: true,

  // Clinical / Planning
  routine: true,
  sessions: true,
  clientLogbook: true,
  defaulters: true,
  dropout: true,
  zeroDose: true,
  missedCommunities: true,

  // Logistics / Integrations
  budget: true,
  calculator: true,
  stock: true,
  mobilization: true,
  htr: true,
  interop: true,

  // SIA Campaigns & Supervision
  campaigns: true,
  supervision: true,
};

export type ModuleKey = keyof typeof DEFAULT_MODULES;

export interface ModuleMetadata {
  key: ModuleKey;
  title: string;
  description: string;
  category: "core" | "clinical" | "logistics" | "campaigns";
  icon: any;
}

export const MODULE_CATEGORIES = [
  { id: "core", name: "Core Data Modules", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-400/10 dark:hover:bg-blue-400/15" },
  { id: "clinical", name: "Clinical & Planning", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15" },
  { id: "logistics", name: "Logistics & Integrations", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 hover:bg-indigo-500/15 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/15" },
  { id: "campaigns", name: "SIA Campaigns & Supervision", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 hover:bg-violet-500/15 dark:bg-violet-400/10 dark:hover:bg-violet-400/15" },
] as const;

export const MODULE_METADATA: ModuleMetadata[] = [
  // Core Data
  {
    key: "map",
    title: "Map View",
    description: "Visual geographic maps, village pins, and planning coverage overlays.",
    category: "core",
    icon: Map,
  },
  {
    key: "settlementIntel",
    title: "Settlement Intelligence",
    description: "GeoNames community exploration, search, and satellite basemap overlays.",
    category: "core",
    icon: Globe,
  },
  {
    key: "facilities",
    title: "Facilities Registry",
    description: "Database of health centers, outreach posts, and cold chain capacity.",
    category: "core",
    icon: Building2,
  },
  {
    key: "population",
    title: "Population Hub",
    description: "Tabular census metrics, target demographic ratios, and WorldPop rasters.",
    category: "core",
    icon: Users,
  },
  {
    key: "fieldTeams",
    title: "Field Teams",
    description: "Track and coordinate mobile healthcare field teams and communications.",
    category: "core",
    icon: Radio,
  },

  // Clinical & Planning
  {
    key: "routine",
    title: "Routine Microplanning",
    description: "Unified microplanning wizard builder for annual routine immunization plans.",
    category: "clinical",
    icon: Calendar,
  },
  {
    key: "sessions",
    title: "Sessions Hub",
    description: "Complete session calendar, immunization day-plans, status tracking, and history.",
    category: "clinical",
    icon: CalendarDays,
  },
  {
    key: "clientLogbook",
    title: "Client Logbook",
    description: "Digital index logbook of child demographic details and dose history registry.",
    category: "clinical",
    icon: ClipboardList,
  },
  {
    key: "defaulters",
    title: "Defaulter Tracking",
    description: "Identify and generate outreach tracing lists for children missing scheduled doses.",
    category: "clinical",
    icon: AlertTriangle,
  },
  {
    key: "dropout",
    title: "Dropout Rates",
    description: "Analyze DTP1-DTP3 cohort dropouts to identify operational gaps.",
    category: "clinical",
    icon: TrendingUp,
  },
  {
    key: "zeroDose",
    title: "Zero-Dose Villages",
    description: "Monitor and target communities with zero-dose children vaccine hotspots.",
    category: "clinical",
    icon: Target,
  },
  {
    key: "missedCommunities",
    title: "Missed Communities",
    description: "Identify population centers with no outreach session contact in the last 12 months.",
    category: "clinical",
    icon: AlertTriangle,
  },

  // Logistics & Integrations
  {
    key: "budget",
    title: "Budget Planning",
    description: "Calculate and monitor microplan per-diems, transport fuel, and supply costs.",
    category: "logistics",
    icon: DollarSign,
  },
  {
    key: "calculator",
    title: "Vaccine Calculator",
    description: "Forecast antigen vial and syringe requirements using dynamic target ratios.",
    category: "logistics",
    icon: Calculator,
  },
  {
    key: "stock",
    title: "Stock Ledger",
    description: "Manage and record cold chain vaccine inventory transactions and transactions history.",
    category: "logistics",
    icon: Package,
  },
  {
    key: "mobilization",
    title: "Social Mobilization",
    description: "Plan megaphone, SMS, and religious leader community announcement details.",
    category: "logistics",
    icon: Share2,
  },
  {
    key: "htr",
    title: "Hard-to-Reach Scores",
    description: "Apply terrain, distance, season, and security risk weightings to outreach plans.",
    category: "logistics",
    icon: AlertTriangle,
  },
  {
    key: "interop",
    title: "HIS Interoperability",
    description: "Interface with automated FHIR resources and DHIS2 reporting endpoints.",
    category: "logistics",
    icon: Share2,
  },

  // SIA Campaigns & Supervision
  {
    key: "campaigns",
    title: "SIA Campaigns",
    description: "Polio, measles, and catch-up immunization campaign microplanning.",
    category: "campaigns",
    icon: Sparkles,
  },
  {
    key: "supervision",
    title: "Supervision & Checklists",
    description: "Supportive supervision checklists, PCE checklists, and H2H campaign tracking.",
    category: "campaigns",
    icon: ClipboardCheck,
  },
];
