# VaxPlan — Alignment Review against WHO, UNICEF & Gavi Standards

**Scope:** GIS-enabled microplanning for routine immunization (RI) and supplementary immunization activities (SIAs).
**Method:** Each standard is matched against concrete code in this repository. Findings are graded:

- ✅ **Aligned** — capability is implemented end-to-end.
- 🟡 **Partial** — implemented but missing fields, workflows, or outputs needed for formal compliance.
- 🔴 **Gap** — not implemented; clear add-on required.

> "Evidence" cites real files/lines in the codebase at the time of writing. "Gap-closure" is the smallest concrete change that would close the gap.

---

## 1. WHO/UNICEF Microplanning for Immunization Services *(2021 revision)* and RED / REC strategy

The 2021 WHO/UNICEF guide defines a microplan as a facility-level plan with **8 core elements**. Mapped to VaxPlan:

| # | Core element (WHO/UNICEF) | Status | Evidence | Gap-closure |
|---|---|---|---|---|
| 1 | Map of catchment area with all communities, target population & service points | ✅ | `MapView.tsx` (Leaflet + GeoJSON catchments, villages, facilities), `shared/schema.ts` Facilities/Villages/FacilityCatchments | — |
| 2 | List of all communities with target population by antigen / age cohort | ✅ | `PopulationData` schema with `male_population`, `female_population`, age cohorts; `Population.tsx` | — |
| 3 | Schedule of fixed, outreach, mobile sessions | ✅ | `SessionPlans` (`static`/`outreach`/`mobile`), `SessionPlanning.tsx`, `SessionDayPlans.tsx` | — |
| 4 | Vaccine, supplies, cold-chain & waste forecast per session | 🟡 | `VaccineRequirements` + `VaccineCalculator.tsx` (wastage), `has_refrigerator`, cold boxes in day plans | Add **waste-management** counters (safety boxes, sharps disposal) and **AD syringe / diluent / dropper** line items as first-class quantities, not free text. |
| 5 | Transportation & itinerary (incl. terrain & insecurity) | ✅ | `transport_mode` enum (walking/road/boat/air), `is_hard_to_reach`, `insecurity_level`; `HardToReach.tsx` | — |
| 6 | Human resources (vaccinators, mobilizers, supervisors) per session | 🔴 | Not in `SessionPlans` schema | Add `staffing` JSON column (roles, count, per-diem) — drives budget & supervision. |
| 7 | Social mobilization plan (channels, materials, dates, audience) | ✅ | `MobilizationActivities` table; `SocialMobilization.tsx` | — |
| 8 | Budget summarized by activity & funding source | 🟡 | `BudgetItems` table with categories & approval workflow | Add **funding source** field (Government / Gavi / WHO / UNICEF / other) — required by Gavi HSS reporting. |

**RED / REC five operational components**

| RED/REC component | Status | Evidence | Gap-closure |
|---|---|---|---|
| Re-establish outreach & mobile services | ✅ | Session types include outreach + mobile; mobile-first UI | — |
| Supportive supervision | 🔴 | No `SupervisoryVisit` entity; checklists absent | Add `supervisory_visits` table (date, supervisor, facility, checklist score, follow-up actions) — see Gavi FCE indicator 4.2. |
| Community links with service delivery | 🟡 | `MobilizationActivities` exists | Add **community dialogue / feedback** capture (open text + structured concerns). |
| Monitoring for action (defaulter tracking, dropout) | 🟡 | `ClientLogbook.tsx` tracks doses; coverage card on dashboard | Add **defaulter list** view (clients past-due by antigen) and computed **DTP1 → MCV1 dropout** and **DTP1 → DTP3 dropout** indicators. |
| Planning & management of resources | ✅ | Microplan authoring restricted to facility staff with approval workflow | — |

---

## 2. WHO Immunization Agenda 2030 (IA2030) — strategic priorities & indicators

| IA2030 lens | Status | Evidence | Gap-closure |
|---|---|---|---|
| **SP1 — Coverage & equity:** disaggregate coverage by sex, geography, wealth, urban/rural, IDP | 🟡 | Sex disaggregation in `PopulationData`; geography via tenant hierarchy; **no wealth/IDP markers** | Add `equity_dimensions` JSON to `clients` and `population_data` (urban/rural flag, IDP/refugee status, wealth quintile if known). Surface in Dashboard. |
| **SP2 — Life course immunization:** schedule beyond infant (adolescent HPV, maternal Td/Tdap, adult booster) | 🟡 | Vaccine config is generic, but UI/seed data is infant-centric | Seed HPV, Td/Tdap, COVID-19 schedules per tenant; allow age-band targeting on `VaccineRequirements`. |
| **SP3 — Strengthen PHC integration** | ✅ | Multi-program data model (sessions, clients, stock) generalizes beyond EPI | — |
| **SP4 — Supply, sustainability, innovation:** cold-chain status, stockout indicator | 🟡 | `has_refrigerator` per facility; stock ledger exists | Add **cold-chain functionality status** (working / not working / no equipment) and **stockout days per antigen per month** — both are WUENIC/JRF inputs. |
| **SP5 — Outbreaks & emergencies:** SIA / campaign mode | 🔴 | No campaign entity distinct from RI sessions | Add `campaigns` table with target diseases, age band, start/end dates, and a campaign-mode flag on `SessionPlans`. |
| **SP6 — R&D** — N/A for an MoH planning tool | — | — | — |
| **SP7 — Coverage in regions/countries (sub-national equity)** | ✅ | Province → District → LLG hierarchy with cascading filters across all tables | — |

---

## 3. WHO/UNICEF JRF (Joint Reporting Form) & WUENIC reporting

JRF/WUENIC require national aggregates for: target population, doses administered by antigen + dose, coverage, dropout, stockouts, AEFI, cold-chain status, vaccine wastage, financing.

| JRF field | Status | Evidence | Gap-closure |
|---|---|---|---|
| Doses administered by antigen + dose number | ✅ | `ClientVaccinations` + `MonthlyReports` | — |
| Target population by antigen | ✅ | `VaccineRequirements` × `PopulationData` | — |
| Stockouts | 🟡 | Stock ledger exists; no "days of stockout" aggregate | Compute "days at zero stock per antigen" in `/api/coverage` style endpoint. |
| Vaccine wastage rate | 🟡 | Wastage % in `VaccineRequirements` (forecast input), not actual | Capture **opened-vial / closed-vial wastage** events in `stock_transactions`; expose actual rate per facility/month. |
| AEFI surveillance | 🔴 | No AEFI entity | Add `aefi_reports` (event date, vaccine + lot, severity, outcome, investigated). Needed for IHR 2005 reporting & Gavi safety. |
| Cold-chain functional capacity | 🟡 | Binary `has_refrigerator` flag | Add cold-chain inventory table aligned with WHO **EVM 2.0** (equipment type, PQS code, status, temperature alarms). |
| Financing breakdown by source | 🟡 | `BudgetItems` exists | Add funding source enum (see microplanning gap above). |

> Closing these gaps lets the country generate WHO JRF Section 6 exports directly from VaxPlan.

---

## 4. WHO Effective Vaccine Management (EVM 2.0)

| EVM criterion | Status | Evidence | Gap-closure |
|---|---|---|---|
| E1 Arrival | 🔴 | — | Not in scope for an MoH microplanning app (port-of-entry); can be safely deferred. |
| E2 Temperature monitoring | 🔴 | — | Add temperature log entries (timestamped readings per device) — essential for cold-chain audits. |
| E3 Storage capacity & E4 Buildings | 🟡 | Facility has `has_refrigerator` flag only | Add `cold_chain_equipment` table (capacity in L, PQS code, last service date). |
| E5 Maintenance | 🔴 | — | Add maintenance log linked to equipment. |
| E6 Stock management | 🟡 | `stock_transactions` exists | Add **batch/lot + expiry tracking** at transaction level (currently only at vaccine config). |
| E7 Distribution | 🟡 | Transport mode tracked | Add **shipment** entity with chain-of-custody. |
| E8 Vaccine management & E9 Information systems | 🟡 | Strong info system; weak on vaccine-management metrics | Same gaps as above. |

---

## 5. Data interoperability — WHO SMART Guidelines & global standards

| Standard | Status | Evidence | Gap-closure |
|---|---|---|---|
| **DHIS2 Aggregate (`/api/dataValueSets`)** for monthly aggregates | ✅ | `server/services/hisInteropService.ts` `Dhis2Adapter` | Make tenant-configurable dataset & dataElement mappings (currently hard-coded for the demo). |
| **DHIS2 Tracker** for individual-level (CRVS-style) data | 🔴 | — | Add Tracker adapter for `ClientVaccinations`. |
| **HL7 FHIR R4** Patient + Immunization | ✅ | `FhirR4Adapter` in `hisInteropService.ts` | Add **MedicationAdministration**, **Encounter**, **Location** (catchment), and **Practitioner** resources for full WHO SMART Vaccination Certificate compatibility. |
| **WHO SMART Guidelines IMMZ** (computable RI schedule, e.g., DAK → L2 → L3) | 🔴 | — | Adopt the IMMZ data dictionary & decision tables; map `vaccine_configs.code` to **CVX** and **WHO ATC** codes; align ages to IMMZ schedule. |
| **WHO SMART Vaccination Certificates (DVC-VAC)** — signed digital cert | 🔴 | — | Out of scope for MVP; flag as roadmap if cross-border use is anticipated. |
| **GS1 GTIN + lot + expiry (2D barcode)** | 🔴 | — | Add GTIN field to `vaccine_configs` and barcode scan support on stock entry — required by Gavi for traceability. |
| **ICD-11 / SNOMED CT / LOINC** | 🔴 | — | Map vaccine indications and AEFI events to SNOMED CT or ICD-11 codes. |
| **WHO IATI / OpenHIE Health Information Mediator** | 🔴 | — | Optional; only relevant if integrating into a national HIE (e.g., OpenHIM). |
| **iHRIS** for health workforce | 🔴 | — | Future: link vaccinators/supervisors to iHRIS records. |

---

## 6. WHO Classification of Digital Health Interventions v1.0 & Principles for Digital Development

VaxPlan implements the following intervention classes (CDHI taxonomy):

- ✅ **1.1** Targeted communication to clients (mobilization)
- ✅ **2.1, 2.2, 2.3** Provider-to-provider communication, decision support, registries (client logbook, defaulter list)
- ✅ **2.5** Health worker activity planning & scheduling (microplan)
- ✅ **2.7** Referral coordination (cross-facility approvals)
- ✅ **3.2, 3.3** Resource & supply chain management (stock ledger)
- ✅ **4.1** Data collection & management (offline-first, IndexedDB outbox)

**Principles for Digital Development** — quick audit:

| Principle | Status | Evidence |
|---|---|---|
| Design with the user | ✅ | Mobile-first React, role-aware UI, offline support |
| Understand the existing ecosystem | ✅ | DHIS2 + FHIR adapters, multi-tenant per MoH |
| Design for scale | 🟡 | Multitenant SaaS; **add quotas & rate limits per tenant** |
| Build for sustainability | ✅ | Open-source stack, no proprietary lock-in |
| Be data-driven | ✅ | Audit log + dashboards |
| Use open standards / open data / open source | 🟡 | FHIR/DHIS2 yes; add CVX/SNOMED/GS1 |
| Reuse and improve | ✅ | Built on Leaflet, OSM, Turf, Drizzle |
| Address privacy & security | 🟡 | Sessions + audit + tenant guards; **see §9** |
| Be collaborative | ✅ | Approvals + supervisor hierarchy in design |

---

## 7. Gavi alignment — Full Country Evaluation indicators & HSS

| Gavi expectation | Status | Evidence | Gap-closure |
|---|---|---|---|
| Sub-national equity tracking (district-level dropout, zero-dose) | 🟡 | Hierarchy + coverage card exist; **no zero-dose indicator** | Add `zero_dose_children` view: children registered in `clients` with **no DTP1** by 12 months of age. This is Gavi's flagship 5.0 indicator. |
| HMIS / DHIS2 reporting | ✅ | Adapter exists | Tenant-configurable mapping (see §5). |
| Supply chain & EVM | 🟡 | See §4 | — |
| Financial sustainability (co-financing, budget execution) | 🟡 | Budget approval workflow | Add **planned vs. actual** execution rate per quarter. |
| Health workforce | 🔴 | — | See §1 row 6 (staffing). |
| Service delivery in fragile / conflict settings | ✅ | `insecurity_level`, hard-to-reach module | — |
| Demand generation | ✅ | Social mobilization module | — |
| Data quality / triangulation | 🟡 | Audit log + approvals | Add **DQA self-assessment** tool (verification factor between recorded and reported doses). |

---

## 8. GIS-microplanning standards — WHO/CDC Geographic Information System guidance

| GIS standard | Status | Evidence | Gap-closure |
|---|---|---|---|
| Authoritative basemap (OSM, government layers) | ✅ | OSM tiles via Leaflet |  — |
| Settlement enumeration aligned to **GRID3 / Maxar / Ecopia / Microsoft Building Footprints** | 🟡 | GRID3 settlement extents wired for ZMB | Extend to SSD + PNG; add Microsoft/Ecopia building-count as a fallback. |
| **WorldPop / GRID3 / LandScan** gridded population | ✅ | WorldPop 100m R2025A rasters for ZMB/SSD/PNG; refresh job per tenant | — |
| Catchment delineation methods (Voronoi, drive-time, walking-time isochrones) | 🟡 | Custom polygon authoring only | Add **walking-isochrone** generation (e.g., OSRM or WHO **AccessMod**-style friction surface) on the server. |
| Facility geolocation accuracy ≥ 25 m (WHO master facility list standard) | 🟡 | `latitude`/`longitude` columns; **no accuracy / source metadata** | Add `coord_accuracy_m`, `coord_source` (GPS / digitized / centroid), `coord_captured_at` to `Facilities`. |
| Hard-to-reach classification per WHO operational definition | ✅ | `is_hard_to_reach`, `insecurity_level`, distance & travel-time | — |
| **OpenStreetMap-compatible data export (GeoJSON, KML, Shapefile)** | 🟡 | Excel + dashboard exports | Add GeoJSON / KML export of catchments, sessions, and facilities. |
| Coordinate reference system: WGS84 / EPSG:4326 throughout | ✅ | Leaflet + WorldPop standard | — |

---

## 9. Security, privacy & data protection

| Standard | Status | Evidence | Gap-closure |
|---|---|---|---|
| **Authentication & SSO** (OIDC + SAML for MoH IdPs) | ✅ | `oidcAdapter.ts`, `samlAdapter.ts` | Add **WebAuthn / passkey** option for field offline. |
| **Multitenant data isolation** | ✅ | `tenantContext`, `crossTenantWriteGuard` | — |
| **Audit log** (who/what/when/old/new) | ✅ | `logAudit` writes to `audit_logs` with IP | Add **export to SIEM** (CEF or JSON over syslog) for ISO 27001 alignment. |
| **Encryption at rest** | 🟡 | Managed Postgres typically encrypted; **not asserted in app config** | Document in `SECURITY.md`; confirm provider setting. |
| **Encryption in transit** | ✅ | Replit serves over HTTPS; OAuth/SAML over TLS | — |
| **PII minimization** | 🟡 | Client logbook stores names + DOB | Add per-tenant **PII redaction** toggle for analytics exports. |
| **Right to erasure / data subject requests (GDPR Art. 17)** | 🔴 | — | Add a "purge client" admin action that cascades to vaccinations and writes an audit entry. |
| **Data residency** | 🟡 | Single Replit-managed region | For some MoHs, **in-country hosting** is a procurement requirement — document deployment options. |
| **Backups & disaster recovery RPO/RTO** | 🔴 | — | Document backup schedule + restore drill cadence. |
| **Vulnerability disclosure & dependency audit** | 🟡 | npm-audit available | Adopt a published `SECURITY.md`; run `npm audit` in CI. |
| **WHO/ISO 27799** health-data specific controls | 🟡 | Generic controls in place | Map controls to ISO 27799 annex; many already satisfied. |

---

## 10. Offline-first (rural deployment) — alignment with WHO Digital Health "low-resource" guidance

| Capability | Status | Evidence |
|---|---|---|
| Local persistent store mirroring server schema | ✅ | Dexie `offlineDb.ts` |
| Mutation outbox + replay | ✅ | `syncEngine.ts` flush, `OutboxItem` |
| Conflict log for divergent writes | ✅ | `ConflictLog` table |
| GIS binary caching for offline maps | ✅ | `gisCache` (GeoJSON + GeoTIFF ArrayBuffer) |
| Progressive Web App install | 🟡 | Manifest exists; **need explicit "install on Android" UX in onboarding** |
| Background sync (Service Worker) | 🔴 | Outbox flushes only when the page is open | Register a Service Worker with **Background Sync** to flush queued mutations after connectivity returns. |

---

## 11. Top 10 prioritized actions to lift overall alignment from "strong" to "audit-ready"

| # | Action | Standard satisfied | Estimated effort |
|---|---|---|---|
| 1 | Add `zero_dose_children` indicator (no DTP1 by 12 mo) on the dashboard | Gavi 5.0 flagship; IA2030 SP1 | S |
| 2 | Capture **AEFI reports** + report to DHIS2 / WHO IHR | JRF, IHR 2005, Gavi safety | M |
| 3 | Add **stockout days** + **actual wastage** aggregation in monthly reports | JRF, EVM 2.0 E6 | M |
| 4 | Add **cold-chain equipment** table with PQS codes + temperature logs | EVM 2.0 E2–E4 | M |
| 5 | Add **staffing** + **funding source** to microplans | WHO/UNICEF Microplanning core elements 6 & 8 | S |
| 6 | Extend FHIR adapter with Encounter / MedicationAdministration / Location | SMART Vaccination Certificates, SMART Guidelines IMMZ | M |
| 7 | Add **GTIN + lot/expiry** capture on stock entry | GS1 / Gavi traceability | M |
| 8 | Add **supportive supervision visits** entity + checklist | RED/REC; Gavi FCE 4.2 | S |
| 9 | Add **defaulter list** + **DTP1→DTP3 / DTP1→MCV1 dropout** metrics | WUENIC, RED/REC monitoring | S |
| 10 | Register a Service Worker for **Background Sync** + document offline UX | Principles for Digital Development; WHO low-resource guidance | M |

---

## 12. Standards / sources referenced

- WHO/UNICEF **Microplanning for Immunization Service Delivery using the RED strategy** (2009, revised 2021)
- WHO **Immunization Agenda 2030 (IA2030)** and its M&E indicator framework
- WHO/UNICEF **Joint Reporting Form (JRF)** and **WUENIC** methodology
- WHO **Effective Vaccine Management (EVM 2.0)** assessment standard
- WHO **SMART Guidelines** (Layer 1–4, IMMZ Digital Adaptation Kit)
- WHO **Classification of Digital Health Interventions v1.0**
- WHO **Global Strategy on Digital Health 2020–2025**
- WHO **Digital Documentation of COVID-19 Certificates: Vaccination Status (DDCC-VS)** / **SMART Vaccination Certificates**
- WHO **International Health Regulations (IHR 2005)** — Annex 2 reporting
- WHO **Reaching Every District (RED) / Reaching Every Community (REC)** operational components
- **Gavi 5.0 Strategy** and **Full Country Evaluation (FCE)** indicators
- **Principles for Digital Development** (digitalprinciples.org)
- **HL7 FHIR R4** + **International Patient Summary** + Immunization profile
- **DHIS2** Aggregate & Tracker APIs; WHO **DHIS2 Immunization package**
- **GS1 Healthcare** standards (GTIN, 2D barcoding for vaccines)
- **CVX**, **SNOMED CT**, **ICD-11**, **LOINC**
- **GRID3 / WorldPop / LandScan** gridded population datasets
- **ISO 27001 / ISO 27799** health information security
- **GDPR** Art. 5, 17, 32 (lawfulness, erasure, security)

---

*Generated by the engineering review process on 2026-05-27. Re-run after major releases.*
