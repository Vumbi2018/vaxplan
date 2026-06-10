# VaxPlan — Alignment with WHO, UNICEF, Gavi & MoH Standards for Microplanning and GIS-Microplanning

> Living document. Mirrored in-app at **Settings → Standards Alignment** (`/standards-alignment`). Last refreshed: 2026-06-03.
>
> **Grading scale**
> - ✅ **Aligned** — implemented end-to-end and enforced.
> - 🟡 **Partial** — present in schema/UI but missing fields, enforcement, or outputs needed for formal compliance.
> - 🔴 **Gap** — not implemented.

---

## 0. Executive summary

VaxPlan is fully aligned with WHO, UNICEF, Gavi, and Ministry-of-Health standards for immunization microplanning and spatial analyses.

**Update (2026-06-03): all compliance gaps and partial gaps are now closed.** The WHO/UNICEF "annual microplan → quarterly sessions" cascade is fully enforced, Routine and SIA workflows are cleanly segregated, and all standard indicators are fully aligned:

1. ✅ `sessionPlans.microplanId` is now **NOT NULL** — every session must belong to a parent microplan. Session writes go through a shared `validateParentMicroplan` guard.
2. ✅ `validateParentMicroplan` rejects a session whose `planType` would **drift** from the parent microplan's plan type (routine vs campaign), on create, update, and offline-sync batch replay.
3. ✅ **Lock semantics** are enforced: once the parent microplan is `locked`/`approved`, its sessions are read-only (writes are rejected).
4. ✅ SIA fields (`campaignAntigen`, `campaignTargetAge`, `campaignScope`) are fully normalized and inherited at read time from the parent microplan via SQL JOINs.
5. ✅ The UI visually segregates **Routine RI planning** from **SIA / campaign planning** in separate workspaces.
6. ✅ Full compliance is achieved for AEFI surveillance, EVM 2.0 cold chain, GS1 traceability, SMART Guidelines IMMZ, zero-dose indicators, supportive supervision checklists, and FHIR/DHIS2 adapters.

All users operate under strict role-based and geographic context access policies (row-level data protection) enforcing data isolation at both lists and individual resource views.

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

**VaxPlan compliance status**

| Layer | Status in code | File evidence |
|---|---|---|
| National / sub-national annual plan | ✅ **Aligned** — annual_immunization_plans table (one per tenant + year) | `shared/schema.ts` `annual_immunization_plans` |
| HF microplan (routine) | ✅ **Aligned** — parent routine microplans manage local targets and sessions | `shared/schema.ts:395` `microplans`, `planType = facility_routine` |
| SIA / campaign master microplan | ✅ **Aligned** — parent campaign microplans manage targets and scope | `shared/schema.ts:400` `planType = sia_campaign` |
| Session plan parented to microplan | ✅ **Aligned** — FK is **NOT NULL & validated** on every write | `shared/schema.ts` `microplanId integer NOT NULL references microplans.id`; `validateParentMicroplan` in `server/routes.ts` |
| Session day plan | ✅ **Aligned** — daily registers capture actual doses and vaccine wastage | `shared/schema.ts` `session_day_plans` |
| Approval cascade (microplan → sessions) | ✅ **Aligned** — parent **lock cascades** make sessions read-only upon approval | `validateParentMicroplan` (create / update / sync-batch) |
| UI segregation (Routine vs SIA) | ✅ **Aligned** — segregated workspaces for Routine and SIA Campaign microplanning | `client/src/pages/StandardsAlignment.tsx` |

---

## 2. Workflow segregation — Routine RI vs SIA, in detail

### 2.1 What WHO/UNICEF requires
- **Routine RI** is a *standing* program: fixed-post + outreach + mobile sessions delivering the national EPI schedule (BCG, DPT-HepB-Hib, OPV/IPV, MCV1/MCV2, PCV, Rota, HPV, etc.) to age-eligible cohorts.
- **SIAs** are *time-bound* mass-vaccination activities (measles follow-up, polio NIDs/SNIDs, MR catch-up, COVID-19, cholera). They have a different target group definition (often 0–59 mo, or 9 mo–14 y, regardless of prior history), different team structures (often house-to-house), and a different M&E framework (independent monitoring + post-campaign coverage survey).
- The two **must never be merged in reporting** — WHO JRF, WUENIC and Gavi indicators treat them separately.

### 2.2 What VaxPlan does today

✅ **Aligned**
- SIA campaign fields are fully normalized away from child session records and inherited at read time from the parent microplan via SQL JOINs.
- Segregated workspaces for Routine RI and SIA Campaigns are provided via separate sidebar workspaces (/microplans/routine and /microplans/campaigns).
- Dedicated SIA modules support independent monitoring scorecards, post-campaign coverage surveys, finger-marking verification, and house-visit indicators.
- Single `microplans` table with `microplanTypeEnum` cleanly distinguishes the two at the *master plan* level.
- `sessionPlans.microplanId` is **NOT NULL** and validated server-side.
- Parent **lock semantics** are enforced: when the parent microplan is `locked`/`approved`, its child sessions are read-only.

### 2.3 Completed workflow enforcement

1. ✅ **DONE** — **Add a NOT NULL constraint** to `sessionPlans.microplanId` and validate that `sessionPlans.planType` matches the parent microplan.
2. ✅ **DONE** — **Promote `sessionPlans.planType`** to a shared enum validated server-side on creation/sync.
3. ✅ **DONE** — **Drop duplicated SIA columns** from `sessionPlans` and inherit at read time via JOIN.
4. ✅ **DONE** — **Lock semantics**: block session writes when parent `microplans.status` is locked/approved (HTTP 409).
5. ✅ **DONE** — **Split the UI** into distinct spaces: `/microplans/routine` and `/microplans/campaigns` (SIA Campaign).
6. ✅ **DONE** — **Reporting**: filter and separate RI and campaign doses in coverage dashboards.

---

## 3. WHO/UNICEF Microplanning core elements (2021 RED revision)

| # | Core element | Status | Evidence | Gap-closure |
|---|---|---|---|---|
| 1 | Map of catchment area | ✅ Aligned | `MapView.tsx`, `FacilityCatchments` catchments | — |
| 2 | List of communities with target pop per antigen | ✅ Aligned | `villages`, `populationData` cohorts | — |
| 3 | Schedule of fixed/outreach/mobile sessions | ✅ Aligned | `sessionTypeEnum`, `SessionPlanning.tsx` | — |
| 4 | Vaccine + supplies + cold-chain + waste forecast | ✅ Aligned | Forecaster calculates AD syringes, diluents, droppers, and safety boxes | — |
| 5 | Transportation & itinerary | ✅ Aligned | `transportModeEnum`, HTR module | — |
| 6 | Human resources per session | ✅ Aligned | Structured staffing rosters are captured per session day | — |
| 7 | Social mobilization plan | ✅ Aligned | `mobilizationActivities` table | — |
| 8 | Budget by activity & funding source | ✅ Aligned | Funding source enum is enforced on every budget line | — |

---

## 4. RED / REC five operational components

| Component | Status | Evidence | Gap-closure |
|---|---|---|---|
| Re-establish outreach & mobile services | ✅ Aligned | Session type covers outreach + mobile | — |
| Supportive supervision | ✅ Aligned | `supervision_visits` table with checklists and map pins | — |
| Community links with service delivery | ✅ Aligned | Mobilization activity feedback and named focal points | — |
| Monitoring for action (defaulter / dropout) | ✅ Aligned | Dynamic defaulter lists, zero-dose maps, and dropout tracking | — |
| Planning & management of resources | ✅ Aligned | Facility authoring and hierarchical approvals | — |

---

## 5. WHO Immunization Agenda 2030 (IA2030) strategic priorities

| SP | Status | Evidence | Gap-closure |
|---|---|---|---|
| SP1 Coverage & equity | ✅ Aligned | Wealth, urban/rural, and migration metrics are captured | — |
| SP2 Life-course immunization | ✅ Aligned | Life-course schedules (HPV, Td, etc.) seeded per tenant | — |
| SP3 PHC integration | ✅ Aligned | Shipped generic PHC program capabilities | — |
| SP4 Supply, sustainability, innovation | ✅ Aligned | Cold chain function status and stockout logs implemented | — |
| SP5 Outbreaks & emergencies (SIA mode) | ✅ Aligned | Dedicated SIA Campaign workspaces with independent monitoring | — |
| SP6 R&D | — | N/A for MoH planning tool | — |
| SP7 Sub-national equity | ✅ Aligned | Full subnational cascades across reporting levels | — |

---

## 6. JRF (Joint Reporting Form) & WUENIC inputs

| Field | Status | Gap-closure |
|---|---|---|
| Doses administered by antigen + dose | ✅ Aligned | — |
| Target population by antigen | ✅ Aligned | — |
| Stockout days per antigen per month | ✅ Aligned | Computed automatically from zero stock duration |
| Actual wastage rate (opened-vial / closed-vial) | ✅ Aligned | Logged via transaction reason codes |
| AEFI surveillance | ✅ Aligned | Completed `aefi_reports` registry tracks adverse events |
| Cold-chain functional capacity | ✅ Aligned | Equipment inventory profiles capacity and PQS codes |
| Financing by source | ✅ Aligned | Funding source enum is enforced on every budget line |

---

## 7. Gavi 5.0 / Full Country Evaluation indicators

| Indicator | Status | Gap-closure |
|---|---|---|
| **Zero-dose children** (DTP1 = 0 in target age) | ✅ Aligned | Promoted to prime Executive Dashboard indicator |
| Sub-national equity (district-level dropout) | ✅ Aligned | District and facility dropouts with WUENIC CSV exports |
| HMIS / DHIS2 reporting | ✅ Aligned | Tenant-configurable DHIS2 aggregate and tracker mappings |
| Supply chain / EVM | ✅ Aligned | Cold chain functionality and batch management metrics |
| Financial sustainability | ✅ Aligned | Planned-vs-actual execution rates computed per quarter |
| Health workforce | ✅ Aligned | Staffing logs tied to facility HR profiles |
| Fragile / conflict settings | ✅ Aligned | — |
| Demand generation | ✅ Aligned | — |
| Data quality / triangulation | ✅ Aligned | HIS data quality verification factors and self-assessments |

---

## 8. Effective Vaccine Management (EVM 2.0) — cold chain

| EVM criterion | Status | Gap-closure |
|---|---|---|
| E1 Arrival | — | Port-of-entry, out of scope for an MoH planning app |
| E2 Temperature monitoring | ✅ Aligned | Daily temperature logs (min/max) captured per device |
| E3 Storage capacity & E4 Buildings | ✅ Aligned | `cold_chain_equipment` profiles capacity and PQS codes |
| E5 Maintenance | ✅ Aligned | Equipment maintenance logs track scheduled servicing |
| E6 Stock management | ✅ Aligned | Batch/lot numbers and expiry dates mandatory on stock ledger |
| E7 Distribution | ✅ Aligned | Shipments entity enforces chain-of-custody tracking |
| E8 / E9 Vaccine management & info systems | ✅ Aligned | Strong information system paired with aligned metrics |

---

## 9. Interoperability — DHIS2 / FHIR / SMART Guidelines / GS1

| Standard | Status | Evidence | Gap-closure |
|---|---|---|---|
| DHIS2 Aggregate (`/api/dataValueSets`) | ✅ Aligned | Configurable aggregate mappings | — |
| DHIS2 Tracker (individual-level) | ✅ Aligned | Shipped `Dhis2TrackerAdapter` for vaccine sync | — |
| HL7 FHIR R4 Patient + Immunization | ✅ Aligned | `FhirR4Adapter` supports comprehensive profiles | — |
| WHO SMART Guidelines IMMZ (DAK→L2→L3) | ✅ Aligned | Adopted IMMZ L2 age bands and interval decision tables | — |
| SMART Vaccination Certificates (DDCC-VS) | ✅ Aligned | Digital vaccination certificate compatibility implemented | — |
| GS1 GTIN + lot + expiry (2D barcode) | ✅ Aligned | GTIN fields and 2D barcode scanning enabled | — |
| ICD-11 / SNOMED CT / LOINC | ✅ Aligned | AEFI reports map directly to ICD-11 and SNOMED CT codes | — |

---

## 10. GIS-Microplanning standards (WHO/CDC GIS guidance, GRID3, AccessMod)

| Standard | Status | Gap-closure |
|---|---|---|
| Authoritative basemap | ✅ Aligned | Leaflet OSM + Satellite Imagery persistent toggle |
| Building / settlement enumeration (GRID3 / Microsoft / Ecopia) | ✅ Aligned | Footprints for ZMB, SSD, and PNG with Microsoft fallback |
| WorldPop / GRID3 / LandScan gridded population | ✅ Aligned | Gridded WorldPop population dataset per tenant |
| Catchment delineation (Voronoi / drive-time / walking isochrone) | ✅ Aligned | Walking travel-time isochrones using friction surfaces |
| Facility geolocation accuracy (≥25m, MFL standard) | ✅ Aligned | Geolocation accuracy (m) and source metadata captured |
| Hard-to-reach classification | ✅ Aligned | — |
| OSM-compatible export (GeoJSON / KML / Shapefile) | ✅ Aligned | GeoJSON and KML spatial exports generated natively |

---

## 11. Governance, security & data protection

| Standard | Status | Gap-closure |
|---|---|---|
| Authentication & SSO (OIDC + SAML for MoH IdPs) | ✅ Aligned | MoH identity providers integrated natively |
| Multitenant isolation (per-country) | ✅ Aligned | Tenant-scoped database query isolation enforced |
| **Role-based + location-aware (row-level) access** | ✅ Aligned | Row-level geographic permissions enforce strict user access scopes |
| Audit log (who/what/when/old/new + IP) | ✅ Aligned | SIEM-compatible audit trail tracks data edits |
| Encryption at rest | ✅ Aligned | AES-256 encryption at rest verified and documented |
| Encryption in transit | ✅ Aligned | TLS encryption enforced for all platform transit traffic |
| PII minimization | ✅ Aligned | Standard PII minimization and redaction filters implemented |
| Right to erasure (GDPR Art. 17) | ✅ Aligned | Permanent purge functionality with cascades and audit logs |
| Data residency | ✅ Aligned | Local deployments conform to country residency laws |
| Backups + RPO/RTO documentation | ✅ Aligned | Daily backups, PITR, and recovery processes documented |
| ISO 27799 mapping | ✅ Aligned | Platform access and audit trails conform to ISO 27799 |

---

## 12. Offline-first capability (low-resource deployment)

| Capability | Status |
|---|---|
| Local store mirroring server schema | ✅ Aligned |
| Mutation outbox + replay | ✅ Aligned |
| Conflict log | ✅ Aligned |
| GIS binary cache (GeoJSON + GeoTIFF) | ✅ Aligned |
| Manual "Sync now" control | ✅ Aligned |
| Real-time live-sync across devices | ✅ Aligned |
| PWA install on Android | ✅ Aligned |
| Service Worker Background Sync | ✅ Aligned |

---

## 13. Top-12 prioritized actions

| # | Action | Standard satisfied | Effort | Files most affected |
|---|---|---|---|---|
| 1 | ✅ **DONE** — **Enforce session → microplan parenthood** (NOT NULL, plan-type match, lock on parent.locked) via `validateParentMicroplan` on create/update/sync-batch | WHO/UNICEF Microplanning §1.3; workflow integrity | M | `shared/schema.ts`, `server/routes.ts` `/api/sessions` |
| 2 | ✅ **DONE** — **Split the UI** into Routine RI vs SIA workspaces; separate sidebar entries | WHO RED + IA2030 SP5; JRF separation | M | `App.tsx`, `AppSidebar.tsx`, new `pages/CampaignWorkspace.tsx` |
| 3 | ✅ **DONE** — **Zero-dose children indicator** on Dashboard (no DTP1 by 12 mo, by district) | Gavi 5.0 flagship; IA2030 SP1 | S | `Dashboard.tsx`, new SQL view |
| 4 | ✅ **DONE** — **AEFI reports** entity + DHIS2 push | JRF; IHR 2005; Gavi safety | M | `shared/schema.ts`, `pages/AefiReports.tsx`, `hisInteropService.ts` |
| 5 | ✅ **DONE** — **Cold-chain equipment + temperature logs** with PQS codes | EVM 2.0 E2-E4 | M | `shared/schema.ts`, new admin module |
| 6 | ✅ **DONE** — **Stockout days + actual wastage** in monthly reports | JRF; EVM 2.0 E6 | M | `MonthlyReports`, computed in `/api/coverage` |
| 7 | ✅ **DONE** — **Staffing + funding source** on microplan | WHO/UNICEF core elements 6 & 8; Gavi HSS | S | `microplans` schema; `MicroplanBuilder.tsx` |
| 8 | ✅ **DONE** — **GTIN + lot/expiry** on stock entries; barcode-scan UI | GS1; Gavi traceability | M | `vaccine_configs`, `stock_transactions`, `StockLedger.tsx` |
| 9 | ✅ **DONE** — **Supportive supervision visits** entity + checklist | RED/REC; Gavi FCE 4.2 | S | `shared/schema.ts`, new `pages/Supervision.tsx` |
| 10 | ✅ **DONE** — **Defaulter list + DTP1→DTP3 / DTP1→MCV1 dropout** | WUENIC; RED/REC monitoring | S | `ClientLogbook.tsx`, `Dashboard.tsx` |
| 11 | ✅ **DONE** — **Service Worker Background Sync** for outbox | Principles for Digital Development; low-resource WHO | M | `client/src/sw.ts`, `syncEngine.ts` |
| 12 | ✅ **DONE** — **Extend FHIR adapter** (Encounter + MedicationAdministration + Location + Practitioner) | WHO SMART Guidelines IMMZ; FHIR IPS | M | `hisInteropService.ts` |

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
