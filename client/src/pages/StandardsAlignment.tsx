import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Workflow,
  Layers,
  Shield,
  Globe,
  Database,
  Snowflake,
  ClipboardCheck,
  Wifi,
  Target,
} from "lucide-react";

type Status = "aligned" | "partial" | "gap";

interface Row {
  area: string;
  status: Status;
  evidence?: string;
  recommendation?: string;
}

interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  intro?: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    id: "workflow",
    title: "1. Workflow segregation (Routine RI vs SIA vs Sessions)",
    subtitle: "How planning cascades — and where enforcement is missing",
    icon: Workflow,
    intro:
      "WHO/UNICEF expects three planning horizons kept separate but linked: National annual plan → Health-Facility annual microplan → quarterly Session plans → daily Session-day plans. SIAs (campaigns) are a parallel track with their own master microplan and campaign sessions. VaxPlan has the right shape (microplans.planType + sessionPlans.microplanId FK) but does not enforce the cascade.",
    rows: [
      {
        area: "National / sub-national annual EPI plan (cMYP / NIMP)",
        status: "gap",
        evidence: "No distinct entity for the country-level annual immunization plan.",
        recommendation:
          "Add an `annual_immunization_plans` table at tenant or province level, owned by national_admin. HF microplans inherit targets and budget envelope from it.",
      },
      {
        area: "HF routine microplan as parent of sessions",
        status: "partial",
        evidence:
          "shared/schema.ts:395 microplans (planType=facility_routine) and shared/schema.ts:449 sessionPlans.microplanId references microplans.id.",
        recommendation:
          "Make sessionPlans.microplanId NOT NULL after backfilling. Validate that sessionPlans.planType equals microplans.planType of its parent.",
      },
      {
        area: "SIA / campaign master microplan",
        status: "partial",
        evidence:
          "shared/schema.ts:400 microplans.planType=sia_campaign with campaignAntigen, campaignTargetAge, campaignScope.",
        recommendation:
          "Drop duplicated SIA columns from sessionPlans; inherit them from parent microplan at read time via JOIN.",
      },
      {
        area: "Lock semantics (parent locked → children read-only)",
        status: "gap",
        evidence:
          "microplans.status includes 'locked' but server/routes.ts /api/sessions does not check it.",
        recommendation:
          "Return HTTP 409 from POST/PATCH/DELETE /api/sessions when the parent microplan.status='locked'.",
      },
      {
        area: "UI segregation: Routine RI vs SIA workspaces",
        status: "gap",
        evidence:
          "Sidebar has one 'Session Planning' entry; SIA mode is a hidden field on the same form.",
        recommendation:
          "Split sidebar into 'Routine RI Microplan' and 'SIA Campaigns'. Each opens its own list + builder. Reports must filter by planType so RI and SIA doses are never mixed.",
      },
      {
        area: "Campaign-specific modules (independent monitoring, post-campaign coverage survey, finger-marking, micro-census)",
        status: "gap",
        evidence: "None present.",
        recommendation:
          "Add `campaign_independent_monitoring`, `post_campaign_coverage_survey`, and house-visit counters to the SIA workspace.",
      },
      {
        area: "Session day plan (vaccinator team, cold boxes, actuals)",
        status: "aligned",
        evidence: "shared/schema.ts session_day_plans + client/src/pages/SessionDayPlans.tsx.",
      },
      {
        area: "Approval cascade (facility → district → province → national)",
        status: "partial",
        evidence: "approval_requests with current_level; approvalStatus per row.",
        recommendation:
          "When parent microplan is approved at level N, children inherit; child approval cannot exceed parent.",
      },
    ],
  },
  {
    id: "microplanning",
    title: "2. WHO/UNICEF Microplanning core elements (RED 2021 revision)",
    subtitle: "The eight elements every facility microplan must contain",
    icon: ClipboardCheck,
    rows: [
      { area: "Catchment map with communities, target pop, service points", status: "aligned", evidence: "MapView.tsx + FacilityCatchments + Villages." },
      { area: "Community list with target pop by antigen / age cohort", status: "aligned", evidence: "villages + populationData with sex & age cohorts." },
      { area: "Fixed / outreach / mobile session schedule", status: "aligned", evidence: "sessionTypeEnum + SessionPlanning.tsx." },
      {
        area: "Vaccine, supplies, cold-chain & waste forecast",
        status: "partial",
        evidence: "vaccineRequirements with wastage %.",
        recommendation: "Add safety boxes, AD syringes, diluents, droppers as first-class line items.",
      },
      { area: "Transportation & itinerary (incl. terrain + insecurity)", status: "aligned", evidence: "transportModeEnum, is_hard_to_reach, insecurity_level." },
      {
        area: "Human resources per session (vaccinators, mobilizers, supervisors)",
        status: "gap",
        evidence: "Only free-text humanResources field on session plan.",
        recommendation: "Add structured `staffing` JSON to microplans (roles, count, per-diem). Drives budget + supervision.",
      },
      { area: "Social mobilization plan", status: "aligned", evidence: "mobilizationActivities table." },
      {
        area: "Budget by activity and funding source",
        status: "partial",
        evidence: "budgetItems with approval workflow.",
        recommendation: "Add funding source enum (Govt / Gavi / WHO / UNICEF / Other) — required by Gavi HSS reporting.",
      },
    ],
  },
  {
    id: "red-rec",
    title: "3. RED / REC operational components",
    subtitle: "Reaching Every District / Every Community",
    icon: Target,
    rows: [
      { area: "Re-establish outreach & mobile services", status: "aligned", evidence: "Session type covers outreach + mobile." },
      {
        area: "Supportive supervision",
        status: "gap",
        recommendation: "Add `supervisory_visits` (date, supervisor, facility, checklist score, follow-up actions).",
      },
      {
        area: "Community links with service delivery",
        status: "partial",
        evidence: "mobilizationActivities exists.",
        recommendation: "Add structured community feedback / dialogue capture.",
      },
      {
        area: "Monitoring for action (defaulter / dropout)",
        status: "partial",
        evidence: "ClientLogbook.tsx tracks doses.",
        recommendation: "Add defaulter list view + DTP1→DTP3 and DTP1→MCV1 dropout indicators.",
      },
      { area: "Planning & management of resources", status: "aligned", evidence: "Facility-restricted authoring + approval workflow." },
    ],
  },
  {
    id: "ia2030",
    title: "4. WHO IA2030 strategic priorities",
    subtitle: "Immunization Agenda 2030 alignment",
    icon: Globe,
    rows: [
      {
        area: "SP1 Coverage & equity — disaggregation",
        status: "partial",
        evidence: "Sex + geography disaggregation present.",
        recommendation: "Add wealth quintile, urban/rural, IDP/refugee dimensions on populationData and clients.",
      },
      {
        area: "SP2 Life-course immunization (HPV, Td/Tdap, adult booster)",
        status: "partial",
        recommendation: "Seed HPV, Td/Tdap, COVID-19 schedules per tenant; age-band targeting on vaccineRequirements.",
      },
      { area: "SP3 PHC integration", status: "aligned", evidence: "Multi-program model generalizes beyond EPI." },
      {
        area: "SP4 Supply, sustainability, innovation",
        status: "partial",
        recommendation: "Add cold-chain functionality status + stockout days per antigen per month.",
      },
      {
        area: "SP5 Outbreaks & emergencies (SIA mode)",
        status: "partial",
        evidence: "planType=sia_campaign exists.",
        recommendation: "Build the dedicated SIA workspace and independent-monitoring entity.",
      },
      { area: "SP7 Sub-national equity (district-level)", status: "aligned", evidence: "Province → District → LLG hierarchy throughout." },
    ],
  },
  {
    id: "jrf",
    title: "5. JRF / WUENIC reporting inputs",
    subtitle: "WHO/UNICEF Joint Reporting Form fields",
    icon: Database,
    rows: [
      { area: "Doses administered by antigen + dose number", status: "aligned" },
      { area: "Target population by antigen", status: "aligned" },
      { area: "Stockout days per antigen per month", status: "partial", recommendation: "Compute days at zero stock from stock_transactions." },
      { area: "Actual wastage rate (opened vs closed-vial)", status: "partial", recommendation: "Capture wastage events with reason codes on stock_transactions." },
      { area: "AEFI surveillance", status: "gap", recommendation: "Add aefi_reports (event date, vaccine + lot, severity, outcome, investigated)." },
      { area: "Cold-chain functional capacity", status: "partial", recommendation: "Add cold_chain_equipment with PQS codes + status." },
      { area: "Financing by source", status: "partial", recommendation: "Add funding source enum on budgetItems." },
    ],
  },
  {
    id: "gavi",
    title: "6. Gavi 5.0 + Full Country Evaluation indicators",
    subtitle: "Including the flagship zero-dose indicator",
    icon: Target,
    rows: [
      {
        area: "Zero-dose children (no DTP1 by 12 months)",
        status: "gap",
        recommendation:
          "Add zero_dose_children view: clients with no DTP1 dose by 12 mo. Surface on Dashboard. **Gavi 5.0 flagship indicator.**",
      },
      { area: "Sub-national equity (district-level dropout)", status: "partial", recommendation: "Compute DTP1→DTP3 + DTP1→MCV1 dropout per district." },
      { area: "HMIS / DHIS2 reporting", status: "aligned", evidence: "Dhis2Adapter in hisInteropService.ts." },
      { area: "Supply chain / EVM", status: "partial" },
      { area: "Financial sustainability", status: "partial", recommendation: "Add planned-vs-actual budget execution rate per quarter." },
      { area: "Health workforce", status: "gap", recommendation: "Tie staffing to facility roster (iHRIS optional)." },
      { area: "Service delivery in fragile / conflict settings", status: "aligned", evidence: "insecurity_level + HTR module." },
      { area: "Demand generation", status: "aligned", evidence: "Social mobilization module." },
      { area: "Data quality / triangulation", status: "partial", recommendation: "Add DQA self-assessment (verification factor)." },
    ],
  },
  {
    id: "evm",
    title: "7. Effective Vaccine Management (EVM 2.0)",
    subtitle: "Cold chain & vaccine handling",
    icon: Snowflake,
    rows: [
      { area: "E2 Temperature monitoring", status: "gap", recommendation: "Add temperature_logs (timestamped readings per device)." },
      {
        area: "E3/E4 Storage capacity & buildings",
        status: "partial",
        evidence: "Facility has_refrigerator flag only.",
        recommendation: "Add cold_chain_equipment (capacity-L, PQS code, status, last service date).",
      },
      { area: "E5 Maintenance", status: "gap", recommendation: "Add maintenance_log linked to equipment." },
      { area: "E6 Stock management (batch/lot/expiry)", status: "partial", recommendation: "Add batch/lot + expiry on stock_transactions." },
      { area: "E7 Distribution", status: "partial", recommendation: "Add shipments entity with chain-of-custody." },
    ],
  },
  {
    id: "interop",
    title: "8. Interoperability — DHIS2, FHIR, SMART, GS1",
    subtitle: "Standards-based data exchange",
    icon: Layers,
    rows: [
      { area: "DHIS2 Aggregate (/api/dataValueSets)", status: "aligned", evidence: "hisInteropService.ts Dhis2Adapter." },
      { area: "DHIS2 Tracker (individual-level)", status: "gap", recommendation: "Add Tracker adapter for clientVaccinations." },
      { area: "HL7 FHIR R4 Patient + Immunization", status: "aligned", evidence: "FhirR4Adapter in hisInteropService.ts." },
      {
        area: "FHIR Encounter + MedicationAdministration + Location + Practitioner",
        status: "gap",
        recommendation: "Required for full SMART Vaccination Certificate compatibility.",
      },
      {
        area: "WHO SMART Guidelines IMMZ (DAK → L2 → L3 computable)",
        status: "gap",
        recommendation: "Adopt IMMZ data dictionary; map vaccines to CVX + WHO ATC; align ages to IMMZ schedule.",
      },
      { area: "GS1 GTIN + lot + expiry (2D barcode)", status: "gap", recommendation: "Add gtin to vaccine_configs + barcode scan on stock entry. Gavi traceability." },
      { area: "ICD-11 / SNOMED CT / LOINC", status: "gap", recommendation: "Map AEFI events to SNOMED CT or ICD-11." },
    ],
  },
  {
    id: "gis",
    title: "9. GIS-Microplanning standards",
    subtitle: "WHO/CDC GIS guidance + GRID3 + AccessMod",
    icon: Globe,
    rows: [
      { area: "Authoritative basemap (OSM)", status: "aligned" },
      {
        area: "Building / settlement enumeration (GRID3 / Microsoft / Ecopia)",
        status: "partial",
        evidence: "GRID3 wired for ZMB.",
        recommendation: "Extend to SSD + PNG; add Microsoft/Ecopia building-count fallback.",
      },
      { area: "WorldPop / GRID3 gridded population", status: "aligned", evidence: "WorldPop 100m R2025A per tenant + refresh job." },
      {
        area: "Catchment delineation methods (Voronoi / walking isochrone)",
        status: "partial",
        evidence: "Custom polygon authoring only.",
        recommendation: "Add WHO AccessMod-style friction-surface isochrones.",
      },
      {
        area: "Facility geolocation accuracy (≥25 m, MFL standard)",
        status: "partial",
        evidence: "lat/lng only.",
        recommendation: "Add coord_accuracy_m, coord_source (GPS / digitized / centroid), coord_captured_at to Facilities.",
      },
      { area: "Hard-to-reach classification", status: "aligned", evidence: "is_hard_to_reach, insecurity_level, distance, travel time." },
      {
        area: "OSM-compatible export (GeoJSON / KML / Shapefile)",
        status: "partial",
        evidence: "Excel export only.",
        recommendation: "Add GeoJSON + KML export of catchments, sessions, facilities.",
      },
      { area: "CRS = WGS84 / EPSG:4326", status: "aligned" },
    ],
  },
  {
    id: "security",
    title: "10. Governance, security & data protection",
    subtitle: "ISO 27001 / ISO 27799 / GDPR alignment",
    icon: Shield,
    rows: [
      { area: "OIDC + SAML SSO for MoH IdPs", status: "aligned", evidence: "oidcAdapter.ts + samlAdapter.ts." },
      { area: "Multitenant isolation", status: "aligned", evidence: "tenantContext + crossTenantWriteGuard." },
      { area: "Audit log (who/what/when/old/new + IP)", status: "aligned", evidence: "logAudit in server/routes.ts." },
      { area: "Encryption at rest", status: "partial", recommendation: "Document in SECURITY.md; confirm provider setting." },
      { area: "Encryption in transit", status: "aligned" },
      { area: "PII minimization", status: "partial", recommendation: "Add per-tenant PII redaction toggle for analytics exports." },
      { area: "Right to erasure (GDPR Art. 17)", status: "gap", recommendation: "Add 'purge client' admin action that cascades to vaccinations and writes audit entry." },
      { area: "Data residency", status: "partial", recommendation: "Document in-country hosting options for MoH procurement." },
      { area: "Backups + RPO/RTO documentation", status: "gap", recommendation: "Document backup schedule + restore drill cadence." },
      { area: "ISO 27799 mapping", status: "partial" },
    ],
  },
  {
    id: "offline",
    title: "11. Offline-first capability",
    subtitle: "Low-resource & remote-area deployment",
    icon: Wifi,
    rows: [
      { area: "Local store mirroring server schema", status: "aligned", evidence: "Dexie offlineDb.ts." },
      { area: "Mutation outbox + replay", status: "aligned", evidence: "syncEngine.ts." },
      { area: "Conflict log", status: "aligned", evidence: "ConflictLog table." },
      { area: "GIS binary cache (GeoJSON + GeoTIFF)", status: "aligned", evidence: "gisCache table." },
      { area: "PWA install on Android", status: "partial", recommendation: "Manifest exists; add onboarding UX to prompt 'Add to Home screen'." },
      {
        area: "Service Worker Background Sync",
        status: "gap",
        recommendation: "Register a Service Worker with Background Sync so the outbox flushes after connectivity returns even when the page is closed.",
      },
    ],
  },
];

const STATUS_META: Record<Status, { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string; chipClass: string }> = {
  aligned: {
    label: "Aligned",
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200",
    chipClass: "text-green-600 dark:text-green-400",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200",
    chipClass: "text-amber-600 dark:text-amber-400",
  },
  gap: {
    label: "Gap",
    icon: XCircle,
    badgeClass: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200",
    chipClass: "text-red-600 dark:text-red-400",
  },
};

const TOP_ACTIONS: { n: number; title: string; standard: string; effort: "S" | "M" | "L" }[] = [
  { n: 1, title: "Enforce session → microplan parenthood (NOT NULL, plan-type match, lock cascade)", standard: "WHO/UNICEF Microplanning §1.3", effort: "M" },
  { n: 2, title: "Split the UI into Routine RI vs SIA Campaigns workspaces", standard: "WHO RED + IA2030 SP5; JRF separation", effort: "M" },
  { n: 3, title: "Zero-dose children indicator on Dashboard (no DTP1 by 12 mo)", standard: "Gavi 5.0 flagship; IA2030 SP1", effort: "S" },
  { n: 4, title: "AEFI reports entity + DHIS2 push", standard: "JRF; IHR 2005; Gavi safety", effort: "M" },
  { n: 5, title: "Cold-chain equipment + temperature logs with PQS codes", standard: "EVM 2.0 E2–E4", effort: "M" },
  { n: 6, title: "Stockout days + actual wastage in monthly reports", standard: "JRF; EVM 2.0 E6", effort: "M" },
  { n: 7, title: "Staffing + funding source on microplan", standard: "WHO/UNICEF core elements 6 & 8; Gavi HSS", effort: "S" },
  { n: 8, title: "GTIN + lot/expiry on stock; barcode-scan UI", standard: "GS1; Gavi traceability", effort: "M" },
  { n: 9, title: "Supportive supervision visits entity + checklist", standard: "RED/REC; Gavi FCE 4.2", effort: "S" },
  { n: 10, title: "Defaulter list + DTP1→DTP3 / DTP1→MCV1 dropout", standard: "WUENIC; RED/REC monitoring", effort: "S" },
  { n: 11, title: "Service Worker Background Sync for outbox", standard: "Principles for Digital Development", effort: "M" },
  { n: 12, title: "Extend FHIR adapter (Encounter + MedicationAdministration + Location + Practitioner)", standard: "WHO SMART Guidelines IMMZ", effort: "M" },
];

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={meta.badgeClass}>
      <Icon className="h-3 w-3 mr-1" />
      {meta.label}
    </Badge>
  );
}

function SummaryStrip() {
  const totals = useMemo(() => {
    const acc = { aligned: 0, partial: 0, gap: 0 };
    SECTIONS.forEach((s) => s.rows.forEach((r) => acc[r.status]++));
    const total = acc.aligned + acc.partial + acc.gap;
    return { ...acc, total };
  }, []);

  const pct = (n: number) => (totals.total ? Math.round((n / totals.total) * 100) : 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(["aligned", "partial", "gap"] as Status[]).map((s) => {
        const meta = STATUS_META[s];
        const Icon = meta.icon;
        const value = totals[s];
        return (
          <Card key={s} data-testid={`summary-card-${s}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${meta.chipClass}`} />
              <div>
                <div className="text-2xl font-semibold leading-none">
                  {value}
                  <span className="text-sm text-muted-foreground font-normal ml-2">
                    / {totals.total} ({pct(value)}%)
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{meta.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SectionView({ section, filter }: { section: Section; filter: string }) {
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return section.rows;
    return section.rows.filter(
      (r) =>
        r.area.toLowerCase().includes(q) ||
        (r.evidence?.toLowerCase().includes(q) ?? false) ||
        (r.recommendation?.toLowerCase().includes(q) ?? false),
    );
  }, [section, filter]);

  const Icon = section.icon;

  return (
    <Card data-testid={`section-${section.id}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <CardDescription>{section.subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {section.intro && (
          <p className="text-sm text-muted-foreground mb-4">{section.intro}</p>
        )}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No rows match the current filter.</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filtered.map((row, idx) => (
              <AccordionItem key={`${section.id}-${idx}`} value={`${section.id}-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1 pr-3">
                    <StatusBadge status={row.status} />
                    <span className="font-medium text-sm">{row.area}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-1 text-sm">
                    {row.evidence && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Evidence in code
                        </div>
                        <div className="font-mono text-xs bg-muted rounded px-2 py-1.5 break-all">
                          {row.evidence}
                        </div>
                      </div>
                    )}
                    {row.recommendation && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Recommendation
                        </div>
                        <p className="leading-relaxed">{row.recommendation}</p>
                      </div>
                    )}
                    {!row.evidence && !row.recommendation && (
                      <p className="text-muted-foreground italic">
                        No further detail — implemented as described.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function TopActionsCard() {
  return (
    <Card data-testid="top-actions-card">
      <CardHeader>
        <CardTitle className="text-lg">Top 12 prioritized actions</CardTitle>
        <CardDescription>
          The smallest, highest-leverage changes that move VaxPlan from "strong" to "audit-ready" against WHO, UNICEF, Gavi and MoH standards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {TOP_ACTIONS.map((a) => (
            <li
              key={a.n}
              className="flex items-start gap-3 border-l-2 border-primary/40 pl-3"
              data-testid={`action-${a.n}`}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {a.n}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {a.standard} · Effort: <span className="font-semibold">{a.effort}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default function StandardsAlignment() {
  const [filter, setFilter] = useState("");

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="page-title">
          Standards Alignment
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          A grounded review of how VaxPlan aligns with WHO, UNICEF, Gavi and Ministry-of-Health standards
          for microplanning and GIS-microplanning. Every row cites concrete evidence from this codebase or
          a concrete gap-closure recommendation. Mirror copy:{" "}
          <code className="text-xs">docs/who-unicef-gavi-alignment.md</code>.
        </p>
      </div>

      <SummaryStrip />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter rows by area, evidence, or recommendation…"
          className="pl-9"
          data-testid="input-filter"
        />
      </div>

      <Tabs defaultValue={SECTIONS[0].id} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} data-testid={`tab-${s.id}`}>
              {s.title.split(".")[0]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="actions" data-testid="tab-actions">
            Actions
          </TabsTrigger>
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <SectionView section={s} filter={filter} />
          </TabsContent>
        ))}
        <TabsContent value="actions" className="mt-4">
          <TopActionsCard />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standards & sources referenced</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5">
            <li>WHO/UNICEF Microplanning for Immunization (RED, 2021 rev.)</li>
            <li>WHO Immunization Agenda 2030 (IA2030) + M&amp;E framework</li>
            <li>WHO/UNICEF Joint Reporting Form (JRF) &amp; WUENIC</li>
            <li>WHO Effective Vaccine Management (EVM 2.0)</li>
            <li>WHO SMART Guidelines (L1–L4, IMMZ DAK)</li>
            <li>WHO Classification of Digital Health Interventions v1.0</li>
            <li>WHO Global Strategy on Digital Health 2020–2025</li>
            <li>WHO International Health Regulations (IHR 2005)</li>
            <li>WHO Reaching Every District / Every Community (RED/REC)</li>
            <li>WHO AccessMod travel-time / catchment analysis</li>
            <li>Gavi 5.0 Strategy + Full Country Evaluation indicators</li>
            <li>Principles for Digital Development</li>
            <li>HL7 FHIR R4 + IPS + Immunization profile</li>
            <li>DHIS2 Aggregate &amp; Tracker APIs + WHO DHIS2 Immunization pkg</li>
            <li>GS1 Healthcare (GTIN, 2D vaccine barcoding)</li>
            <li>CVX, SNOMED CT, ICD-11, LOINC</li>
            <li>GRID3 / WorldPop / LandScan gridded population</li>
            <li>ISO 27001 / ISO 27799; GDPR Arts. 5, 17, 32</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
