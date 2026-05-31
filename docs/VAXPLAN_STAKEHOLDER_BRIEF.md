# VaxPlan

### Reach every child. Plan every session.

**A GIS microplanning platform for national immunization programs**

A stakeholder briefing for Ministries of Health

---

## The problem we are solving

Every year, millions of children miss life-saving vaccines — not because the vaccines don't exist, but because **planning breaks down at the last mile.**

- **Zero-dose children** are concentrated in communities that are never reliably mapped or reached.
- **Microplans live in spreadsheets and on paper** — disconnected from maps, populations, and stock.
- **Denominators are guesswork.** Without accurate catchment populations, coverage figures are unreliable.
- **Plans are invisible to managers** until it is too late to act.
- **Field teams work offline,** but their tools assume constant connectivity.

The result: missed communities, wasted vaccines, and coverage numbers no one fully trusts.

---

## What VaxPlan is

VaxPlan is a **mobile-first, offline-capable GIS microplanning platform** that takes a Ministry of Health from a map of its facilities all the way down to a vaccinator's daily itinerary — and back up to a national coverage dashboard.

It unifies, in one system:

- **Where** people are (maps, facilities, communities, catchments)
- **How many** there are (multi-source populations and target cohorts)
- **What** they need (tenant-specific vaccine schedules and forecasts)
- **Who** does the work, **when**, and **how** (sessions, itineraries, supervision)
- **What actually happened** (coverage, defaulters, stock, wastage)

Built on the **WHO "Reaching Every District" (RED)** and **Gavi "RED-Q"** strategies — operationalized, not just referenced.

---

## Who it is for

| Level | What they get |
| :--- | :--- |
| **Facility staff** | Build microplans, plan and run sessions, record vaccinations, track defaulters — online or offline. |
| **District managers** | Review and approve facility plans, monitor coverage and dropout, oversee their district. |
| **Provincial coordinators** | Province-wide visibility, approvals, and equity targeting. |
| **National administrators** | Whole-country dashboards, vaccine schedules, boundaries, users, and standards. |
| **Ministry / national EPI** | A single source of truth for routine immunization and campaigns (SIAs). |

One platform, every level of the health system — with each role seeing exactly what it should.

---

## The big picture: one continuous workflow

```
  MAP            PLAN              EXECUTE           MEASURE
  ───            ────              ───────           ───────
 Facilities  →  Microplan     →   Sessions in   →   Coverage,
 Communities    (RED/RED-Q)       the field         dropout,
 Catchments     Vaccine needs     Client records    zero-dose
 Populations    Budgets           Stock & wastage   Defaulters
                                                     Supervision
                          ↑                              │
                          └──────── Approvals ───────────┘
```

Nothing is re-entered. Each step feeds the next, and managers see it all in real time.

---

## 1 — Mapping & GIS intelligence

The geographic backbone of the entire platform.

- **Interactive maps** pinning every health facility and community on OpenStreetMap or satellite imagery.
- **Catchment delineation** — drop a pin or draw a custom GeoJSON catchment polygon for any community.
- **Automatic overlap detection** when two communities' catchments collide, with a built-in **harmonization request** so facilities resolve who covers the shared area.
- **Administrative hierarchy** — Province → District → sub-district → Ward/Village, with fully customizable labels per country.
- **"Plan a session here"** directly from any unserved community on the map.

> Maps are not decoration — they are the planning surface.

---

## 2 — Population & denominators

Coverage is only as good as the denominator beneath it.

- **Multiple population sources** in one model: national census & projections, HMIS catchment headcounts, **WorldPop 100m gridded estimates**, and community/CHW surveys.
- **WorldPop raster estimation** to fill gaps where census data is missing or outdated.
- **Automatic target cohorts** — Under-1, Under-5, pregnant women — derived from growth rates and demographic ratios.
- **Per-country demographic constants** so every calculation reflects local reality.

The right denominator turns "we think coverage is high" into "we know where the gaps are."

---

## 3 — Equity & hard-to-reach profiling

Find the children the system usually misses.

- Every community is scored on a **Hard-to-Reach (HTR) index (1–5)** based on distance, terrain, seasonal accessibility, and insecurity.
- **Zero-dose villages** and **missed communities** views surface the places with no DTP coverage at all.
- **Settlement intelligence** highlights unmapped or potentially missed settlements for investigation.

Equity is built into the workflow, not bolted on as a report.

---

## 4 — Vaccine schedules, needs & budget forecasting

From population to procurement, automatically.

- **Tenant-specific vaccine schedules** — antigens, doses, intervals — configured per country.
- **Automated forecasting** of required doses, vials, AD syringes, and safety boxes.
- **Standardized wastage factors** applied per antigen (e.g. BCG ~40%, MR ~25%, Penta/PCV ~11%) with monitoring against national targets.
- **Budget planning** that turns the plan into a costed requirement.

Microplanning math that used to take days, done in seconds — and consistently.

---

## 5 — Microplanning (RED / RED-Q)

The heart of the platform: a guided, standards-based planning engine.

- **Step-by-step microplan wizard** that enforces the WHO RED and Gavi RED-Q methods.
- **Routine and campaign (SIA)** planning in differentiated workflows — for standing programs and time-bound polio/measles campaigns.
- **Sessions cascade from the microplan,** inheriting targets and the vaccine schedule so nothing drifts out of sync.
- **Local accountability by design:** microplans are authored by **facility staff** — the people who run the sessions — while district and provincial roles review and approve.

A national strategy, executed identically in every facility.

---

## 6 — Session execution & field operations

Where the plan meets the road — literally.

- **Itinerary planning** down to the day: lead vaccinator, transport mode (foot, motorbike, boat, air), fuel needs, and security clearance.
- **Session capture** — record vaccinations administered, online or fully offline.
- **Client logbook** for individual-level vaccination history and lookup.
- **Fixed-site, outreach, and mobile** session types all supported.

Designed for the realities of remote, low-connectivity field work.

---

## 7 — Defaulter & dropout tracking

Closing the loop on every child.

- **Defaulter / under-immunized lists** automatically identify children who started but didn't finish (e.g. DTP1 given, DTP3 missing).
- **One-click follow-up sessions** created straight from the defaulter list.
- **Dropout-rate analysis** (DTP1 → DTP3) to spot where children are slipping through.

Every missed dose becomes a concrete, assignable action.

---

## 8 — Coverage analytics & dashboards

Decision-grade visibility, in real time.

- **Coverage dashboards** by antigen (DTP3, MCV2, and more), by dose, by month, by location.
- **Zero-dose targeting** views for children and villages with no DTP coverage.
- **Heatmaps and KPIs** at national, provincial, district, and facility level.
- **Real-time site-activity analytics** for administrators: who is online, busiest pages, and login locations on a live map.

Managers stop waiting for monthly reports and start acting on live signals.

---

## 9 — Stock, cold chain & supply

Vaccines in the arm depend on vaccines in the fridge.

- **Stock ledger** tracking receipts, issues, and adjustments with **lot and expiry** tracking.
- **Cold chain status** monitoring for facility refrigerators.
- **Stockout alerts** and **monthly stock returns** with reconciliation.
- **Wastage monitoring** of opened vs. closed vials against national thresholds.

Supply and demand planning live in the same place.

---

## 10 — Approvals & supportive supervision

Governance and quality, built in.

- **Hierarchical approval workflows:** Facility submits → District reviews → Provincial/National signs off (1, 2, or 3 levels, configurable per country).
- **Supportive supervision** with scheduled visits, **customizable scored checklists**, branching follow-up questions, and tracked corrective actions.

Plans are reviewed before they run, and quality is measured after.

---

## 11 — Offline-first by design

Built for the places that need it most.

- **Full functionality with no internet** — planning, sessions, and records all work offline via on-device storage.
- **Automatic background sync** replays queued changes the moment connectivity returns.
- **Conflict handling** for changes made in multiple places.
- **Live real-time updates** across users when online.

The hardest-to-reach districts are exactly where offline matters most — so it is the default, not an afterthought.

---

## 12 — Multitenancy & cross-country (SaaS)

One platform, many Ministries — fully isolated.

- **Per-country tenants** with strict data isolation across every table.
- **Per-tenant SSO** (OIDC / SAML) and email-domain mapping.
- **Self-service onboarding** with hierarchical approval of new users.
- **Super Admin** oversight to switch between countries; everyone else is pinned to their own.
- **Fully brandable and localizable** labels (e.g. "Province" → "Region").

Each country owns its data; the platform scales across borders.

---

## 13 — Roles, security & audit

Trust is a feature.

- **Role-based access control** with **geographic scoping** — users see only their assigned facility, district, or province.
- **Comprehensive audit logging** — who changed what, when, with old and new values.
- **Session-based authentication** and per-tenant access boundaries enforced on the server.
- **Cross-tenant writes blocked** at the API layer.

Auditable, accountable, and safe to hand to a national program.

---

## 14 — Interoperability & standards

Fits into the national health information ecosystem.

- **DHIS2** aggregate integration and **FHIR R4** adapters for exchange with national HIS.
- **Master facility list** alignment and cross-referencing.
- **Standards alignment scorecard** — a live view of how the platform maps to WHO, UNICEF, and Gavi technical guidance.
- **Transparent data sources** — a public Data Sources & Acknowledgements page crediting every dataset, with map boundary disclaimers and disputed-region acknowledgement.

VaxPlan strengthens the existing system rather than replacing it.

---

## Why it matters — the outcomes

| Before | With VaxPlan |
| :--- | :--- |
| Zero-dose children invisible | Zero-dose villages mapped and targeted |
| Denominators are guesswork | Multi-source, defensible populations |
| Plans on paper, disconnected | One continuous digital workflow |
| Coverage known monthly, late | Coverage known in real time |
| Field teams cut off offline | Full offline-first operation |
| Quality unverified | Approvals + scored supervision |
| Each country reinvents tools | Shared, standards-based platform |

**The bottom line: more children reached, less vaccine wasted, and coverage figures the Ministry can stand behind.**

---

## Built on open foundations

- **Open data:** OpenStreetMap, geoBoundaries, GADM, WorldPop, GRID3, UN OCHA/HDX.
- **Global standards:** WHO, PAHO, UNICEF, Gavi, U.S. CDC immunization guidance.
- **Interoperability:** DHIS2, FHIR R4.
- **Modern, secure engineering** with full audit trails.

Transparent sourcing means every number can be traced to its origin.

---

## Deployment & onboarding

Getting a country live is a guided, repeatable process.

1. **Register the country** — schedule, demographics, currency, map, and admin labels.
2. **Load administrative boundaries** from geoBoundaries or your own GeoJSON.
3. **Load reference data** — facilities, communities, populations (with automatic district matching from GPS).
4. **Provision the first national admin,** configure SSO, and invite teams.
5. **Verify and go live** — confirm facilities, boundaries, and populations on the map.

Available on **web, installable mobile (PWA), and packaged desktop/mobile shells.**

---

## Why VaxPlan is different

- **It is operational, not just analytical** — it produces the plan, runs the session, and measures the result.
- **It is offline-first** — designed for the last mile, not the head office.
- **It is equity-driven** — zero-dose and hard-to-reach targeting are core, not optional.
- **It is standards-native** — WHO RED and Gavi RED-Q are built into the workflow.
- **It is multi-country** — one secure platform that scales across Ministries.
- **It is transparent and auditable** — every data point and every change is traceable.

---

## Let's reach every child

VaxPlan turns national immunization strategy into action — at every facility, in every community, down to every child.

**Next steps**

- A live demonstration tailored to your program
- A pilot in one or more provinces
- A phased national rollout plan

> *Reach every child. Plan every session.*
