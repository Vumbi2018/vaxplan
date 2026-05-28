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
        status: "aligned",
        evidence:
          "Sidebar exposes 'Routine Microplan' (/microplans/routine) and 'SIA Campaigns' (/microplans/campaigns) as separate entries. Both mount the shared MicroplanWizard with a `prePlanType` prop so the plan type is fixed at entry (header badge: Routine / SIA Campaign), and POST/PATCH /api/sessions rejects client-supplied planType/campaign* fields and inherits them from the parent microplan.",
        recommendation: "Add a planType column to clientVaccinations so coverage reports can filter RI vs SIA doses cleanly (currently excluded heuristically by campaign name).",
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
        area: "Sessions hub (unified list + month calendar of every planned / overdue / conducted session)",
        status: "aligned",
        evidence:
          "client/src/pages/SessionsHub.tsx at /all-sessions — tabs for List and Calendar share a Province → District → Facility cascade filter, status sub-tabs (All / Planned / Overdue / Conducted / Cancelled) with counts, and a 'Start' action on calendar days that routes into the existing session workspace.",
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
        status: "aligned",
        evidence: "Wizard Step 5 captures vaccinator / recorder / supervisor / team type / target / per-diem per session-day. Counts persist to session_day_plans (vaccinatorsCount / recordersCount / supervisorsCount) and the full structured roster is written to microplans.staffing as { roster: [...] } so reports and Supportive Supervision can read it without parsing notes.",
      },
      { area: "Social mobilization plan", status: "aligned", evidence: "mobilizationActivities table." },
      {
        area: "Budget by activity and funding source",
        status: "aligned",
        evidence: "budget_items.funding_source pgEnum (government / gavi / who / unicef / other / unspecified) with required validation and 'other' descriptor (shared/schema.ts:550). Wizard Step 9 + BudgetPlanning page enforce the enum on every line.",
      },
    ],
  },
  {
    id: "red-rec",
    title: "3. RED / REC operational components",
    subtitle: "Reaching Every District / Every Community — grouped by RED component (full reference: /docs/microplanning-workflow.md)",
    icon: Target,
    intro:
      "VaxPlan's 12-step guided microplanning workflow (Develop Microplan → Guided Workflow) maps every step to one of the five WHO RED components plus the four Gavi RED-Q equity layers (Identify · Reach · Monitor · Measure). The rows below are grouped by RED component and tagged with their RED-Q layer where applicable.",
    rows: [
      // RED 1 — Re-establish outreach
      { area: "RED 1 · Re-establish outreach & mobile services", status: "aligned", evidence: "sessionType covers fixed / outreach / mobile; guided workflow Step 4." },
      { area: "RED 1 · Catchment population denominators with source [RED-Q Identify]", status: "partial", evidence: "villages table + Population page. Guided workflow Step 2 checks every village has a population source.", recommendation: "Require populationSource on every village row at write time." },
      { area: "RED 1 · Missed-community + zero-dose tagging [RED-Q Identify + Reach]", status: "gap", recommendation: "Add a `missedCommunity` boolean + `zeroDoseBurden` int on villages and surface them in Hard-to-Reach (guided workflow Step 3)." },
      // RED 2 — Supportive supervision
      { area: "RED 2 · Supportive supervision visits + checklist", status: "aligned", evidence: "`supervision_visits` table + Supportive Supervision page (`/supervision`) capture scheduled / conducted visits, a 12-item WHO RED checklist (Yes / No / N/A), a derived score, findings and follow-up actions. Guided workflow Step 10 flips green when every facility with sessions has ≥1 visit scheduled for the current quarter." },
      // RED 3 — Community links
      { area: "RED 3 · Community links via mobilization activities [RED-Q Reach]", status: "partial", evidence: "mobilizationActivities table + Social Mobilization page. Guided workflow Step 7 checks ≥1 activity per scheduled session.", recommendation: "Add named community focal point + dialogue / feedback capture." },
      // RED 4 — Monitoring for action
      { area: "RED 4 · Monthly tally + defaulter list [RED-Q Measure]", status: "partial", evidence: "ClientLogbook tracks doses given.", recommendation: "Add defaulter list view + DTP1→DTP3 / DTP1→MCV1 dropout indicators + zero-dose children indicator." },
      { area: "RED 4 · Quarterly review feedback into next plan [RED-Q Measure]", status: "partial", evidence: "Guided workflow Step 12 flags whether a session this quarter has actual doses recorded.", recommendation: "Add a structured quarterly review note linked to the microplan." },
      // RED 5 — Planning & management
      { area: "RED 5 · HF microplan as parent of sessions", status: "aligned", evidence: "microplans + sessionPlans.microplanId NOT NULL; facility-only authoring (permissions.ts)." },
      { area: "RED 5 · Vaccine, supplies & cold-chain forecast (WHO core 4)", status: "partial", evidence: "Vaccine Calculator computes antigen forecasts per session. Guided workflow Step 6 checks vaccinesRequired persisted.", recommendation: "Add cold-chain inventory + temperature logs + stockout/wastage + GTIN-lot-expiry (Step 6 secondary pending)." },
      { area: "RED 5 · Workforce & teaming roster (WHO core 6)", status: "aligned", evidence: "Wizard Step 5 captures vaccinator / recorder / supervisor / team type / target / per-diem per session-day; the structured roster is written to microplans.staffing and the per-session counts to session_day_plans." },
      { area: "RED 5 · Logistics & transport per session-day (WHO core 5)", status: "partial", evidence: "Session Day Plans capture transportMode, distance, fuel.", recommendation: "Roll up transport coverage to the microplan view (Step 8 pending)." },
      { area: "RED 5 · Budget tagged to funding source (WHO core 8)", status: "aligned", evidence: "budget_items.funding_source pgEnum (government / gavi / who / unicef / other / unspecified). Wizard Step 9 + BudgetPlanning enforce it on every line; 'other' requires a free-text descriptor (zod refinement at shared/schema.ts:1002)." },
      { area: "RED 5 · Approval cascade (facility → district → provincial → national)", status: "aligned", evidence: "Approvals workflow; Step 11 of the guided workflow flips green when the current-quarter microplan is approved." },
    ],
  },
  {
    id: "red-indicators",
    title: "3b. RED + Gavi indicator computation status",
    subtitle: "Which microplanning indicators VaxPlan computes today, grouped by RED component (full reference: /docs/microplanning-workflow.md §4)",
    icon: Target,
    intro:
      "Status legend for this section: Aligned = computed end-to-end today and fed by the 12-step guided workflow · Partial = partially computed (data captured but the indicator view or full disaggregation is missing) · Gap = not yet wired (the indicator is required by WHO/Gavi but no compute path exists yet). Rows are grouped by the RED component they belong to.",
    rows: [
      // RED 1 — Re-establish outreach
      { area: "RED 1 · Sessions planned vs held (per facility, per quarter)", status: "partial", evidence: "sessions + sessionStatus capture scheduled vs conducted; guided workflow Step 4 + 12.", recommendation: "Add a per-facility 'sessions held / planned' tile on Dashboard." },
      { area: "RED 1 · Missed-community % (no session in past 12 mo)", status: "gap", recommendation: "RED-Q Measure flagship. Derive from village ↔ sessions join over a rolling 12-mo window." },
      // RED 2 — Supportive supervision
      { area: "RED 2 · Supervisory visits completed vs planned", status: "aligned", evidence: "Supportive Supervision page (`/supervision`) tiles count scheduled / conducted / missed / cancelled visits and an average checklist score from the `supervision_visits` table." },
      // RED 3 — Community links
      { area: "RED 3 · Mobilization activities per session", status: "aligned", evidence: "Computed by guided workflow Step 7: mobilization rows / scheduled sessions for the current quarter." },
      // RED 4 — Monitoring for action (computes coverage / dropout / zero-dose)
      { area: "RED 4 · DTP1 / DTP3 / MCV1 / MCV2 coverage", status: "partial", evidence: "Dose-level data exists in clientLogbook; aggregate coverage tiles are not yet on the Dashboard.", recommendation: "Add antigen-coverage tiles per facility / district / province." },
      { area: "RED 4 · DTP1→DTP3 dropout %", status: "partial", evidence: "Dropout Rates page (/indicators/dropout) computes DTP1→DTP3 from clientLogbook.", recommendation: "Add per-district disaggregation tile for WUENIC submission." },
      { area: "RED 4 · DTP1→MCV1 dropout %", status: "partial", evidence: "Dropout Rates page (/indicators/dropout) computes DTP1→MCV1.", recommendation: "Add per-district disaggregation tile for WUENIC submission." },
      { area: "RED 4 · Zero-dose children (no DTP1 by 12 mo) [Gavi 5.0 flagship]", status: "partial", evidence: "Zero-Dose Villages page (/indicators/zero-dose) surfaces villages with zero-dose burden + map + Province/District/Facility cascade filter and basemap toggle.", recommendation: "Promote to a top-of-Dashboard tile and disaggregate by district." },
      { area: "RED 4 · Under-immunized children (DTP1 yes, DTP3 no)", status: "partial", evidence: "Derived alongside dropout on /indicators/dropout.", recommendation: "Add a dedicated under-immunized list with last-dose + due-by date." },
      { area: "RED 4 · Defaulter list (children due, not yet vaccinated)", status: "aligned", evidence: "Defaulter List page (/clients/defaulters) lists children with overdue doses; planners can one-click 'Plan defaulter follow-up here' from the zero-dose / under-immunized map pins, which tags the resulting session row with outreachPurpose='defaulter_followup' and exposes coverage impact after mark-done." },
      { area: "RED 4 · Missed Communities (no session in past 12 mo)", status: "aligned", evidence: "Missed Communities page (/missed-communities) surfaces villages with no immunization contact in the past 12 months and supports CSV import from DHIS2." },
      // RED 5 — Planning & management (vaccines, cold chain, safety, financing)
      { area: "RED 5 · Vaccine doses + AD syringes + safety boxes forecast", status: "aligned", evidence: "Vaccine Calculator + guided workflow Step 6 check on persisted vaccinesRequired." },
      { area: "RED 5 · Per-antigen wastage rate (actual)", status: "partial", evidence: "Stock transactions capture issuances.", recommendation: "Add wastage reason codes + monthly wastage % per antigen." },
      { area: "RED 5 · Stockout-days per antigen per month", status: "partial", recommendation: "Compute days at zero stock from stock_transactions (also called out in Section 5 JRF)." },
      { area: "RED 5 · Cold-chain equipment functional %", status: "partial", evidence: "facility.has_refrigerator flag only.", recommendation: "Add cold_chain_equipment table with PQS codes + status." },
      { area: "RED 5 · AEFI cases per 100k doses", status: "gap", recommendation: "Blocked on the aefi_reports entity (see Section 5 JRF)." },
      { area: "RED 5 · Microplan approved before quarter starts", status: "aligned", evidence: "Computed by guided workflow Step 11 against microplans.status." },
      { area: "RED 5 · Budget executed by funding source (planned vs actual)", status: "partial", evidence: "Planned amounts now carry the funding-source enum per line. Actual-execution capture (paid / pending) is not yet on budget_items.", recommendation: "Add an `actualSpent` decimal + payment status to budget_items so planned-vs-actual can be rolled up per source." },
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
        evidence:
          "Dedicated SIA Campaigns workspace shipped (/microplans/campaigns) sharing the MicroplanWizard with prePlanType='campaign' and SIA-specific fields (antigen / target age / scope).",
        recommendation: "Add `campaign_independent_monitoring` and `post_campaign_coverage_survey` entities + finger-marking and house-visit counters.",
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
        status: "aligned",
        evidence: "Server endpoint /api/indicators/zero-dose computes child-level zero-dose (children ≥12mo with no DTP1, SIA doses excluded) from clients + clientVaccinations. Dashboard mounts ImmunizationIndicatorCards as the first KPI row — shows total, denominator, %, and a per-district breakdown linking to /indicators/zero-dose. **Gavi 5.0 flagship indicator.**",
      },
      { area: "Sub-national equity (district-level dropout)", status: "partial", evidence: "/indicators/dropout computes DTP1→DTP3 + DTP1→MCV1 per district; surfaced on the Dashboard alongside zero-dose.", recommendation: "Add a JRF-shaped per-district CSV export for WUENIC submission." },
      { area: "HMIS / DHIS2 reporting", status: "aligned", evidence: "Dhis2Adapter in hisInteropService.ts." },
      { area: "Supply chain / EVM", status: "partial" },
      { area: "Financial sustainability", status: "partial", evidence: "Funding source enum on every budget line.", recommendation: "Add planned-vs-actual execution rate per quarter (needs actualSpent on budget_items)." },
      { area: "Health workforce", status: "partial", evidence: "Microplan-level structured staffing roster (microplans.staffing.roster) captured per session day in Wizard Step 5.", recommendation: "Tie staffing to a facility-wide HR roster (iHRIS optional) so the same vaccinator/supervisor can be referenced across microplans." },
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
      { area: "Authoritative basemap (OSM + satellite)", status: "aligned", evidence: "BasemapToggle component lets planners switch between OpenStreetMap and Esri World Imagery (satellite) on every planning map. Choice persists per user via localStorage (vaxplan.basemap)." },
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
      { area: "Multitenant isolation", status: "aligned", evidence: "tenantContext scopes reads/writes to the currently viewed tenant (session.viewTenantId); cross-tenant operations are recorded in the audit log with a crossTenant flag." },
      { area: "Audit log (who/what/when/old/new + IP)", status: "aligned", evidence: "logAudit in server/routes.ts." },
      { area: "Granular user management (invite, role, geographic scope, bulk CSV import)", status: "aligned", evidence: "UserManagement.tsx — per-user role + province/district/facility scope, hierarchical approval workflow, CSV bulk import, custom role permissions editor." },
      { area: "Platform super-admin (break-glass cross-tenant operator)", status: "aligned", evidence: "users.is_platform_admin BOOLEAN (DB-only grant, no API to set) short-circuits hasPermission() across all tenants for Replit operators." },
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
  { n: 1, title: "AEFI reports entity + DHIS2 push", standard: "JRF; IHR 2005; Gavi safety", effort: "M" },
  { n: 2, title: "Cold-chain equipment + temperature logs with PQS codes", standard: "EVM 2.0 E2–E4", effort: "M" },
  { n: 3, title: "Stockout days + actual wastage in monthly reports", standard: "JRF; EVM 2.0 E6", effort: "M" },
  { n: 4, title: "GTIN + lot/expiry on stock; barcode-scan UI", standard: "GS1; Gavi traceability", effort: "M" },
  { n: 5, title: "Microplan lock cascade — block POST/PATCH /api/sessions when parent microplan.status='locked'", standard: "WHO/UNICEF Microplanning §1.3", effort: "S" },
  { n: 6, title: "Per-district disaggregation export for dropout (/indicators/dropout) — WUENIC submission CSV", standard: "WUENIC; RED/REC monitoring", effort: "S" },
  { n: 7, title: "Budget actual-spent capture (actualSpent + payment status on budget_items) for planned-vs-actual by funding source", standard: "Gavi HSS; WHO core element 8", effort: "S" },
  { n: 8, title: "Campaign independent monitoring + post-campaign coverage survey entities", standard: "WHO SIA field guide; IA2030 SP5", effort: "M" },
  { n: 9, title: "Service Worker Background Sync for outbox", standard: "Principles for Digital Development", effort: "M" },
  { n: 10, title: "Extend FHIR adapter (Encounter + MedicationAdministration + Location + Practitioner)", standard: "WHO SMART Guidelines IMMZ", effort: "M" },
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
        <CardTitle className="text-lg">Top {TOP_ACTIONS.length} prioritized actions</CardTitle>
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
