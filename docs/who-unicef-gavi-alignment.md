# VaxPlan — Alignment with WHO, UNICEF, Gavi & MoH Standards for Microplanning and GIS-Microplanning

> Living document. Mirrored in-app at **Settings → Standards Alignment** (`/standards-alignment`). Last refreshed: 2026-05-30.
>
> **Grading scale**
> - ✅ **Aligned** — implemented end-to-end and enforced.
> - 🟡 **Partial** — present in schema/UI but missing fields, enforcement, or outputs needed for formal compliance.
> - 🔴 **Gap** — not implemented.

---

## 0. Executive summary

VaxPlan has the **right shape** for a WHO/UNICEF/Gavi-aligned microplanning platform: a clean multitenant model per MoH, a parent `microplans` table distinguishing routine vs SIA, a `sessionPlans` table that *can* link to a parent microplan, an approval workflow, an offline-first client, and FHIR + DHIS2 adapters.

**Update (2026-05-30): the workflow-enforcement gap is now largely closed.** The WHO/UNICEF "annual microplan → quarterly sessions" cascade is enforced in code:

1. ✅ `sessionPlans.microplanId` is now **NOT NULL** — every session must belong to a parent microplan. Session writes go through a shared `validateParentMicroplan` guard.
2. ✅ `validateParentMicroplan` rejects a session whose `planType` would **drift** from the parent microplan's plan type (routine vs campaign), on create, update, and offline-sync batch replay.
3. ✅ **Lock semantics** are enforced: once the parent microplan is `locked`/`approved`, its sessions are read-only (writes are rejected).
4. 🟡 SIA fields (`campaignAntigen`, `campaignTargetAge`, `campaignScope`) are still *overlaid* from the parent at read time rather than being fully normalized away from `sessionPlans`.
5. 🔴 The UI still does not visually segregate **Routine RI planning** from **SIA / campaign planning** in separate workspaces; they share the session-planning surface with a plan-type distinction.

The remaining gaps fall into well-known global-standards buckets: AEFI surveillance, EVM 2.0 cold-chain, GS1 traceability, SMART Guidelines IMMZ, zero-dose indicator, supportive supervision, and full FHIR/DHIS2 mapping.

**Data-isolation update (2026-05-30):** role-based **and** location-aware (row-level geographic) access control is now enforced consistently — see §11. A facility user only sees their own facility's records; single-record (`/:id`) reads are scoped, not just list views.

A prioritized 12-item action list at the end (§13) lists exactly what to change, with file references and effort estimates.

---

## 1. Workflow architecture — how WHO/UNICEF expects planning to cascade

WHO/UNICEF *Microplanning for Immunization Service Delivery using the RED Strategy* (2009, revised 2021), reinforced by IA2030 and Gavi 5.0, defines **three planning horizons that must be kept separate but linked**:

```
                ┌─────────────────────────────────────────────────────────┐
                │  NATIONAL / SUB-NATIONAL ANNUAL PLAN (cMYP / NIMP)      │
                │  - Country EPI strategy, targets, financing             │
                └───────────────┬─────────────────────────────────────────┘
                                │ informs targets & budget envelope
                                ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │  HEALTH FACILITY ANNUAL/QUARTERLY MICROPLAN  (planType = routine)│
        │  Owner: facility_in_charge.  One per (facility, year, quarter). │
        │  Contains: target pop by antigen, session strategy mix,         │
        │  staffing, cold-chain, budget, mobilization plan.               │
        └───────────────┬─────────────────────────────────────────────────┘
                        │ parent of
                        ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │  SESSION PLAN  (one per fixed/outreach/mobile session)          │
        │  Must inherit antigens, target pop, transport, geofence from    │
        │  the parent microplan.  Editable only while parent is "draft".  │
        └───────────────┬─────────────────────────────────────────────────┘
                        │ parent of
                        ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │  SESSION DAY PLAN  (one per session day)                        │
        │  Vaccinator team, cold boxes, ice packs, vials taken, actuals.  │
        └─────────────────────────────────────────────────────────────────┘

  Parallel track (NOT the same as routine RI):

        ┌─────────────────────────────────────────────────────────────────┐
        │  SIA / CAMPAIGN MASTER MICROPLAN  (planType = sia_campaign)     │
        │  Owner: provincial/national.  One per (campaign, scope).        │
        │  Contains: antigen, target age band, geographic scope,          │
        │  vaccinators, social-mob plan, post-campaign coverage survey.   │
        └───────────────┬─────────────────────────────────────────────────┘
                        │ parent of
                        ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │  CAMPAIGN SESSION PLAN  (one per team-day)                       │
        │  House-to-house / fixed-post / school-based teams.              │
        └─────────────────────────────────────────────────────────────────┘
```

**VaxPlan today vs the expected cascade**

| Layer | Status in code | File evidence |
|---|---|---|
| National / sub-national annual plan | 🔴 **Missing** as a distinct entity (`cMYP` / NIMP) | — |
| HF microplan (routine) | ✅ Present | `shared/schema.ts:395` `microplans`, `planType = facility_routine` |
| SIA / campaign master microplan | ✅ Present (same table) | `shared/schema.ts:400` `planType = sia_campaign` + `campaign*` columns |
| Session plan parented to microplan | ✅ FK is **NOT NULL & validated** on every write | `shared/schema.ts` `microplanId integer NOT NULL references microplans.id`; `validateParentMicroplan` in `server/routes.ts` |
| Session day plan | ✅ Present | `shared/schema.ts` `session_day_plans` |
| Approval cascade (microplan → sessions) | ✅ Parent **lock cascades** — locked/approved parent makes child sessions read-only | `validateParentMicroplan` (create / update / sync-batch) |
| UI segregation (Routine vs SIA) | 🔴 Both live on `/sessions`; SIA fields hidden in same form | `client/src/pages/SessionPlanning.tsx`; sidebar has only one "Session Planning" entry |

---

## 2. Workflow segregation — Routine RI vs SIA, in detail

### 2.1 What WHO/UNICEF requires
- **Routine RI** is a *standing* program: fixed-post + outreach + mobile sessions delivering the national EPI schedule (BCG, DPT-HepB-Hib, OPV/IPV, MCV1/MCV2, PCV, Rota, HPV, etc.) to age-eligible cohorts.
- **SIAs** are *time-bound* mass-vaccination activities (measles follow-up, polio NIDs/SNIDs, MR catch-up, COVID-19, cholera). They have a different target group definition (often 0–59 mo, or 9 mo–14 y, regardless of prior history), different team structures (often house-to-house), and a different M&E framework (independent monitoring + post-campaign coverage survey).
- The two **must never be merged in reporting** — WHO JRF, WUENIC and Gavi indicators treat them separately.

### 2.2 What VaxPlan does today

✅ **Good**
- Single `microplans` table with `microplanTypeEnum` cleanly distinguishes the two at the *master plan* level.
- SIA-specific fields (`campaign_antigen`, `campaign_target_age`, `campaign_scope`, `target_population`, `budget`) live on the master microplan row.
- `sessionPlans.microplanId` FK *allows* linking each session back to either a routine or campaign master plan.

✅ **Now enforced (2026-05-30)**
- `sessionPlans.microplanId` is **NOT NULL** — every session must derive from a parent microplan.
- A server-side guard (`validateParentMicroplan`) runs on session **create, update, and offline-sync batch replay**. It rejects a session whose `planType` does not match the parent microplan's, so a "routine" session can no longer be attached to a campaign microplan (and vice-versa) — keeping JRF/WUENIC reporting clean.
- Parent **lock semantics** are enforced: when the parent microplan is `locked`/`approved`, its child sessions are read-only.

🟡 **Partial**
- SIA fields (`campaign_antigen`, `campaign_target_age`, `campaign_scope`) are *overlaid* (read-only) from the parent microplan at API-read time, but the columns still physically exist on `sessionPlans` rather than being fully normalized away.

🔴 **Gap**
- The UI has **one** "Session Planning" surface. There is no dedicated **"SIA Campaigns"** workspace separating campaign master plans, campaign sessions, independent monitoring, and post-campaign coverage survey from the routine RI workflow.
- There is no SIA-specific module for: (i) independent monitoring, (ii) post-campaign coverage survey, (iii) finger-marking, (iv) micro-census of households visited.

### 2.3 Recommended workflow enforcement

1. **Add a NOT NULL constraint** to `sessionPlans.microplanId` after backfilling existing rows. *Migration step:* create per-facility "Untitled Q{quarter} {year}" microplans for any orphan session and point them at it.
2. **Promote `sessionPlans.planType`** to a `pgEnum('routine','campaign')` shared with a derived check: `sessionPlans.planType` must equal `microplans.planType` of its parent (validate on `insertSessionPlanSchema`).
3. **Drop duplicated SIA columns** from `sessionPlans` (or mark them generated). Inherit at API-read time via JOIN.
4. **Lock semantics**: when `microplans.status = 'locked'`, `POST/PATCH/DELETE /api/sessions` for any session under that microplan returns 409.
5. **Split the UI** into two top-level entries:
   - `/microplans/routine` — HF routine microplan builder + the sessions it owns
   - `/microplans/campaigns` — SIA campaign master plan + campaign sessions + independent monitoring + post-campaign survey
6. **Reporting**: every coverage view (`Dashboard.tsx`, `MonthlyReports`, `/api/coverage`) must filter by `planType` so RI doses are never mixed with campaign doses.

---

## 3. WHO/UNICEF Microplanning core elements (2021 RED revision)

| # | Core element | Status | Evidence | Gap-closure |
|---|---|---|---|---|
| 1 | Map of catchment area | ✅ | `MapView.tsx`, `FacilityCatchments` polygons | — |
| 2 | List of communities with target pop per antigen | ✅ | `villages`, `populationData` with sex & age cohorts | — |
| 3 | Schedule of fixed/outreach/mobile sessions | ✅ | `sessionTypeEnum`, `SessionPlanning.tsx` | — |
| 4 | Vaccine + supplies + cold-chain + waste forecast | 🟡 | `vaccineRequirements` (forecast only), wastage % | Add **safety boxes**, **AD syringes**, **diluents**, **droppers** as first-class line items |
| 5 | Transportation & itinerary | ✅ | `transportModeEnum`, `is_hard_to_reach`, `insecurity_level` | — |
| 6 | Human resources per session | 🔴 | Only `humanResources` text field on session plan | Add structured `staffing` (roles, count, per-diem) at microplan level |
| 7 | Social mobilization plan | ✅ | `mobilizationActivities` | — |
| 8 | Budget by activity & funding source | 🟡 | `budgetItems` | Add **funding source** enum (Govt / Gavi / WHO / UNICEF / Other) — Gavi HSS reporting requirement |

---

## 4. RED / REC five operational components

| Component | Status | Evidence | Gap-closure |
|---|---|---|---|
| Re-establish outreach & mobile services | ✅ | Session type covers outreach + mobile | — |
| Supportive supervision | 🔴 | No `supervisory_visits` entity | Add table (date, supervisor, facility, checklist score, follow-up actions) |
| Community links with service delivery | 🟡 | `mobilizationActivities` exists | Add structured **community feedback** capture |
| Monitoring for action (defaulter / dropout) | 🟡 | `ClientLogbook.tsx` tracks doses | Compute **DTP1→DTP3** and **DTP1→MCV1 dropout**, and a **defaulter list** view |
| Planning & management of resources | ✅ | Facility-restricted authoring + approval workflow | — |

---

## 5. WHO Immunization Agenda 2030 (IA2030) strategic priorities

| SP | Status | Evidence | Gap-closure |
|---|---|---|---|
| SP1 Coverage & equity | 🟡 | Sex disaggregation; geography hierarchy | Add **wealth quintile**, **urban/rural**, **IDP/refugee** equity dimensions on `populationData` and `clients` |
| SP2 Life-course immunization | 🟡 | Vaccine config is generic; UI infant-centric | Seed HPV, Td/Tdap, COVID-19 per tenant; age-band targeting on `vaccineRequirements` |
| SP3 PHC integration | ✅ | Generalizable session/stock/budget model | — |
| SP4 Supply, sustainability, innovation | 🟡 | `has_refrigerator`; stock ledger | Add cold-chain functionality status & stockout days per antigen per month |
| SP5 Outbreaks & emergencies (SIA mode) | 🟡 | `planType=sia_campaign` exists | Build the SIA workspace (§2.3 #5) and **independent monitoring** entity |
| SP6 R&D | — | N/A for MoH planning tool | — |
| SP7 Sub-national equity | ✅ | Province → District → LLG cascade across tables | — |

---

## 6. JRF (Joint Reporting Form) & WUENIC inputs

| Field | Status | Gap-closure |
|---|---|---|
| Doses administered by antigen + dose | ✅ | — |
| Target population by antigen | ✅ | — |
| Stockout days per antigen per month | 🟡 | Compute from `stock_transactions` (days at zero stock) |
| Actual wastage rate (opened-vial / closed-vial) | 🟡 | Capture in `stock_transactions` with reason codes |
| AEFI surveillance | 🔴 | Add `aefi_reports` (date, vaccine + lot, severity, outcome, investigated) |
| Cold-chain functional capacity | 🟡 | Add `cold_chain_equipment` with PQS code + functionality status |
| Financing by source | 🟡 | Add funding source enum (see §3 #8) |

---

## 7. Gavi 5.0 / Full Country Evaluation indicators

| Indicator | Status | Gap-closure |
|---|---|---|
| **Zero-dose children** (DTP1 = 0 in target age) | 🔴 | Materialized view: `clients` with no DTP1 dose by 12 months. Surface on Dashboard. **Gavi 5.0 flagship.** |
| Sub-national equity (district-level dropout) | 🟡 | Add DTP1→DTP3 + DTP1→MCV1 dropout by district |
| HMIS / DHIS2 reporting | ✅ | `Dhis2Adapter` exists; make tenant-configurable mappings |
| Supply chain / EVM | 🟡 | See §10 |
| Financial sustainability | 🟡 | Add planned-vs-actual execution rate per quarter |
| Health workforce | 🔴 | Tie staffing (§3 #6) to facility roster |
| Fragile / conflict settings | ✅ | `insecurity_level` + HTR module | — |
| Demand generation | ✅ | Social mobilization module | — |
| Data quality / triangulation | 🟡 | Add DQA self-assessment (verification factor between recorded and reported doses) |

---

## 8. WHO Effective Vaccine Management (EVM 2.0) — cold chain

| EVM criterion | Status | Gap-closure |
|---|---|---|
| E1 Arrival | — | Port-of-entry, out of scope for an MoH planning app |
| E2 Temperature monitoring | 🔴 | Add `temperature_logs` (timestamped readings per device) |
| E3 Storage capacity & E4 Buildings | 🟡 | Add `cold_chain_equipment` (capacity-L, PQS code, status, last service) |
| E5 Maintenance | 🔴 | Add `maintenance_log` linked to equipment |
| E6 Stock management | 🟡 | Add batch/lot + expiry on `stock_transactions` (currently only on vaccine config) |
| E7 Distribution | 🟡 | Add `shipments` entity with chain-of-custody |
| E8 / E9 Vaccine management & info systems | 🟡 | Information system is strong; vaccine-management metrics weak |

---

## 9. Interoperability — DHIS2 / FHIR / SMART Guidelines / GS1

| Standard | Status | Evidence | Gap-closure |
|---|---|---|---|
| DHIS2 Aggregate (`/api/dataValueSets`) | ✅ | `hisInteropService.ts:190` | Make mappings tenant-configurable |
| DHIS2 Tracker (individual-level) | 🔴 | — | Add Tracker adapter for `clientVaccinations` |
| HL7 FHIR R4 Patient + Immunization | ✅ | `FhirR4Adapter` | Add Encounter, MedicationAdministration, Location, Practitioner |
| WHO SMART Guidelines IMMZ (DAK→L2→L3) | 🔴 | — | Adopt IMMZ data dictionary; map vaccines to CVX + WHO ATC; align ages |
| SMART Vaccination Certificates (DDCC-VS) | 🔴 | — | Roadmap if cross-border use is anticipated |
| GS1 GTIN + lot + expiry (2D barcode) | 🔴 | — | Add `gtin` to `vaccine_configs`; barcode scan on stock entry — Gavi traceability |
| ICD-11 / SNOMED CT / LOINC | 🔴 | — | Map AEFI events to SNOMED CT or ICD-11 |
| iHRIS for health workforce | 🔴 | — | Roadmap |

---

## 10. GIS-Microplanning standards (WHO/CDC GIS guidance, GRID3, AccessMod)

| Standard | Status | Gap-closure |
|---|---|---|
| Authoritative basemap | ✅ | OSM via Leaflet |
| Building / settlement enumeration (GRID3 / Microsoft / Ecopia) | 🟡 | GRID3 wired for ZMB; extend to SSD + PNG |
| WorldPop / GRID3 / LandScan gridded population | ✅ | WorldPop 100m R2025A per tenant + refresh job |
| Catchment delineation (Voronoi / drive-time / walking isochrone) | 🟡 | Custom polygon authoring only | Add WHO **AccessMod**-style friction-surface isochrones |
| Facility geolocation accuracy (≥25m, MFL standard) | 🟡 | `lat`/`lng` only | Add `coord_accuracy_m`, `coord_source` (GPS/digitized/centroid), `coord_captured_at` |
| Hard-to-reach classification | ✅ | `is_hard_to_reach`, `insecurity_level`, distance, travel time | — |
| OSM-compatible export (GeoJSON / KML / Shapefile) | 🟡 | Excel only | Add GeoJSON / KML exports of catchments, sessions, facilities |
| CRS = WGS84 / EPSG:4326 | ✅ | — | — |

---

## 11. Governance, security & data protection

| Standard | Status | Gap-closure |
|---|---|---|
| Authentication & SSO (OIDC + SAML for MoH IdPs) | ✅ | Add WebAuthn / passkey for field |
| Multitenant isolation (per-country) | ✅ | Enforced by tenant-scoped storage (`withTenant`) on every query + cross-tenant write rejection and an audit `crossTenant` flag. (There is **no** `crossTenantWriteGuard` middleware — isolation is the storage tenant filter, not a single guard.) |
| **Role-based + location-aware (row-level) access** | ✅ *(2026-05-30)* | `hasPermission` + `GeographicContext` and `userCanAccessGeo` scope reads to the user's facility/district/province on **both list and single-record (`/:id`) endpoints**. A `facility_clerk` sees only their facility; `district_manager`/`provincial_coordinator` see only their area; `national_admin` sees the whole tenant. Authoring is restricted to facility roles. |
| Audit log (who/what/when/old/new + IP) | ✅ | Export to SIEM (CEF/JSON over syslog) for ISO 27001 |
| Encryption at rest | 🟡 | Document in `SECURITY.md` |
| Encryption in transit | ✅ | TLS via Replit | — |
| PII minimization | 🟡 | Add per-tenant PII redaction for analytics exports |
| Right to erasure (GDPR Art. 17) | 🔴 | Add "purge client" admin action that cascades and writes audit |
| Data residency | 🟡 | Document in-country hosting options for MoH procurement |
| Backups + RPO/RTO documentation | 🔴 | Document backup schedule + restore drill cadence |
| ISO 27799 mapping | 🟡 | Map existing controls to annex |

---

## 12. Offline-first capability (low-resource deployment)

| Capability | Status |
|---|---|
| Local store mirroring server schema | ✅ Dexie `offlineDb.ts` |
| Mutation outbox + replay | ✅ `syncEngine.ts` |
| Conflict log | ✅ `ConflictLog` table |
| GIS binary cache (GeoJSON + GeoTIFF) | ✅ `gisCache` |
| Manual "Sync now" control | ✅ *(2026-05-30)* Always-visible in the header (`SyncStatus` badge is clickable) plus the contextual button in `OfflineBanner` |
| Real-time live-sync across devices | ✅ Tenant-scoped websocket (`server/services/realtime.ts` + `client/src/lib/realtimeClient.ts`) pokes peers to pull after a write; falls back to interval polling |
| PWA install on Android | 🟡 Manifest exists; add onboarding UX |
| Service Worker Background Sync | ✅ *(2026-05-30)* `client/src/lib/backgroundSync.ts` registers SW Background Sync (`SyncManager`) to flush the outbox even when the page is closed; graceful hint + fallback where the API is unavailable (e.g. iOS Safari) |

---

## 13. Top-12 prioritized actions

| # | Action | Standard satisfied | Effort | Files most affected |
|---|---|---|---|---|
| 1 | ✅ **DONE (2026-05-30)** — **Enforce session → microplan parenthood** (NOT NULL, plan-type match, lock on parent.locked) via `validateParentMicroplan` on create/update/sync-batch | WHO/UNICEF Microplanning §1.3; workflow integrity | M | `shared/schema.ts`, `server/routes.ts` `/api/sessions` |
| 2 | **Split the UI** into Routine RI vs SIA workspaces; separate sidebar entries | WHO RED + IA2030 SP5; JRF separation | M | `App.tsx`, `AppSidebar.tsx`, new `pages/CampaignWorkspace.tsx` |
| 3 | **Zero-dose children indicator** on Dashboard (no DTP1 by 12 mo, by district) | Gavi 5.0 flagship; IA2030 SP1 | S | `Dashboard.tsx`, new SQL view |
| 4 | **AEFI reports** entity + DHIS2 push | JRF; IHR 2005; Gavi safety | M | `shared/schema.ts`, `pages/AefiReports.tsx`, `hisInteropService.ts` |
| 5 | **Cold-chain equipment + temperature logs** with PQS codes | EVM 2.0 E2-E4 | M | `shared/schema.ts`, new admin module |
| 6 | **Stockout days + actual wastage** in monthly reports | JRF; EVM 2.0 E6 | M | `MonthlyReports`, computed in `/api/coverage` |
| 7 | **Staffing + funding source** on microplan | WHO/UNICEF core elements 6 & 8; Gavi HSS | S | `microplans` schema; `MicroplanBuilder.tsx` |
| 8 | **GTIN + lot/expiry** on stock entries; barcode-scan UI | GS1; Gavi traceability | M | `vaccine_configs`, `stock_transactions`, `StockLedger.tsx` |
| 9 | **Supportive supervision visits** entity + checklist | RED/REC; Gavi FCE 4.2 | S | `shared/schema.ts`, new `pages/Supervision.tsx` |
| 10 | **Defaulter list + DTP1→DTP3 / DTP1→MCV1 dropout** | WUENIC; RED/REC monitoring | S | `ClientLogbook.tsx`, `Dashboard.tsx` |
| 11 | **Service Worker Background Sync** for outbox | Principles for Digital Development; low-resource WHO | M | `client/src/sw.ts`, `syncEngine.ts` |
| 12 | **Extend FHIR adapter** (Encounter + MedicationAdministration + Location + Practitioner) | WHO SMART Guidelines IMMZ; FHIR IPS | M | `hisInteropService.ts` |

---

## 14. Standards & sources referenced

- WHO/UNICEF **Microplanning for Immunization Service Delivery using the RED Strategy** (2009, revised 2021)
- WHO **Immunization Agenda 2030 (IA2030)** + M&E framework
- WHO/UNICEF **JRF** and **WUENIC** methodology
- WHO **Effective Vaccine Management (EVM 2.0)**
- WHO **SMART Guidelines** (L1–L4, IMMZ Digital Adaptation Kit)
- WHO **Classification of Digital Health Interventions v1.0**
- WHO **Global Strategy on Digital Health 2020–2025**
- WHO **Digital Documentation of COVID-19 Certificates (DDCC-VS) / SMART Vaccination Certificates**
- WHO **International Health Regulations (IHR 2005)** Annex 2
- WHO **Reaching Every District / Reaching Every Community** operational components
- WHO **AccessMod** for travel-time / catchment analysis
- **Gavi 5.0 Strategy** + **Full Country Evaluation (FCE)** indicators
- **Principles for Digital Development** (digitalprinciples.org)
- **HL7 FHIR R4** + International Patient Summary + Immunization profile
- **DHIS2** Aggregate & Tracker APIs; WHO DHIS2 Immunization package
- **GS1 Healthcare** standards (GTIN, 2D barcoding for vaccines)
- **CVX**, **SNOMED CT**, **ICD-11**, **LOINC**
- **GRID3 / WorldPop / LandScan** gridded population
- **ISO 27001 / ISO 27799** health information security
- **GDPR** Arts. 5, 17, 32
