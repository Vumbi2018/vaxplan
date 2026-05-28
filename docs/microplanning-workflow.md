# Immunization Microplanning Workflow — WHO RED + Gavi RED-Q

> Living reference. Mirrored in-app at **Develop Microplan → Guided Workflow**. Last refreshed: 2026-05-27.
>
> This document is the canonical end-to-end immunization microplanning process for VaxPlan tenants. It harmonizes:
>
> - **WHO RED** — *Reaching Every District* strategy (WHO/AFRO, 2008; revised 2017 & 2021 microplanning guide).
> - **WHO/Gavi RED-Q / REC** — *Reaching Every Community with Equity*, the zero-dose / missed-communities operationalization of RED used in Gavi 5.0 and the Equity Accelerator.
> - **IA2030** — Immunization Agenda 2030 strategic priorities (SP1 coverage & equity, SP5 outbreaks, SP7 sub-national equity).
> - **WHO/UNICEF Joint Reporting Form (JRF)** — the indicator set every country reports annually.
>
> The 12-step cycle below is what facility staff, district reviewers, and national EPI officers are expected to walk every year, in the same order, against the same evidence base.

---

## 1. The two strategies in one cycle

### 1.1 WHO RED — five operational components

| # | Component                                          | What it means at the health facility                                                                 |
|---|----------------------------------------------------|------------------------------------------------------------------------------------------------------|
| 1 | **Re-establish outreach services**                 | Catalogue every community outside the static catchment and schedule fixed, outreach, or mobile sessions to reach them. |
| 2 | **Supportive supervision**                         | Quarterly on-site supervisory visits by the district team using a standard checklist; findings drive corrective actions. |
| 3 | **Community links with service delivery**          | Named community focal points, dialogues, and demand-generation activities co-owned with the facility. |
| 4 | **Monitoring for action**                          | Wall chart + defaulter tracking + dropout (DTP1→DTP3, DTP1→MCV1) reviewed monthly with staff. |
| 5 | **Planning and management of resources**           | Annual microplan with target population, session calendar, vaccines, cold chain, staffing, budget, mobilization — approved up the hierarchy. |

### 1.2 Gavi RED-Q / REC — four equity layers on top of RED

| Layer | Purpose | Operational implication in the microplan |
|-------|---------|-----------------------------------------|
| **Identify** missed communities | Find every settlement getting 0 or partial sessions | Reconcile DHIS2/JRF coverage with catchment village list; flag villages with no DTP1 session in the past 12 months. |
| **Reach** zero-dose children | Drive DTP1 coverage where it is 0 | Tag villages by zero-dose burden; prioritize outreach and mobile sessions there. |
| **Monitor** equity | Disaggregate coverage by community, sex, wealth, displacement status | Report sub-village level coverage, not just facility totals. |
| **Measure** missed-community indicator | Gavi 5.0 flagship indicator | Compute % of catchment communities with at least one immunization contact per year. |

---

## 2. Roles and the approval cascade

| Role                        | Authors microplan? | Reviews / approves                                  |
|----------------------------|--------------------|-----------------------------------------------------|
| `facility_clerk`           | ✅ Yes             | —                                                   |
| `facility_in_charge`       | ✅ Yes             | Submits to district                                 |
| `district_manager`         | ❌ Read-only       | Approve / return at district level (Step 11)        |
| `provincial_coordinator`   | ❌ Read-only       | Approve / return at provincial level (Step 11)      |
| `national_admin`           | ❌ Read-only       | Final approval, lock for execution (Step 11)        |

**Authoring is restricted to facility staff** by both the UI (`canCreateSessionPlan` in `client/src/lib/permissions.ts`) and the server (`POST /api/sessions` returns 403 for non-facility roles). District and above only review and approve.

---

## 3. The 12-step annual cycle

Each step lists: **Purpose · What to do · Required output · VaxPlan module · Definition of done**.

### Step 1 — Situation analysis & coverage review *(RED 5, RED-Q "Monitor")*
- **Purpose.** Understand last year's performance before planning next year.
- **What to do.** Pull DTP1, DTP3, MCV1, MCV2 coverage; dropout %; zero-dose %; stockouts; AEFI; sessions planned vs held.
- **Required output.** A one-page coverage & equity snapshot per facility, with sub-village breakdown.
- **VaxPlan module.** `Dashboard` + `Reports` + `Standards Alignment`.
- **Done when.** Last full year of DTP1/DTP3/MCV1 coverage has been reviewed by the facility in-charge.

### Step 2 — Catchment & population mapping *(RED-Q "Identify")*
- **Purpose.** Establish denominators for every community served.
- **What to do.** Confirm the catchment polygon; list every village, hamlet, IDP camp, school; assign each to fixed, outreach, or mobile delivery; capture target population by source (NSO, HMIS, WorldPop, community census).
- **Required output.** A geocoded community list with target-pop denominator and population source.
- **VaxPlan module.** `Boundary Manager`, `Population`, `Map View`.
- **Done when.** Every catchment community has a target population with a recorded source.

### Step 3 — Hard-to-reach & equity profiling *(RED-Q "Identify" + "Reach")*
- **Purpose.** Classify communities by access difficulty and zero-dose burden so the strategy reflects effort, not just distance.
- **What to do.** Score each village on distance, terrain, seasonal accessibility, insecurity; tag missed communities (no contact in past 12 mo) and zero-dose hotspots.
- **Required output.** HTR score per village + missed-community flag + zero-dose tag.
- **VaxPlan module.** `Hard-to-Reach`, `Population`.
- **Done when.** Every village has an HTR score and an equity tag.

### Step 4 — Service delivery strategy & session calendar *(RED 1)*
- **Purpose.** Decide *how* each community is reached and *when*.
- **What to do.** For each community pick fixed / outreach / mobile delivery; produce a 12-month rolling calendar with one session per delivery point; schedule special strategies for missed communities (catch-up, periodic intensification).
- **Required output.** A 12-month session calendar covering every catchment community.
- **VaxPlan module.** `Routine Microplan` (Session Planning) or `SIA Campaigns`.
- **Done when.** A microplan exists for the current quarter with at least one scheduled session per community.

### Step 5 — Workforce & teaming *(WHO core element 6)*
- **Purpose.** Match staff and team composition to the session calendar.
- **What to do.** Per session-day assign vaccinator(s), recorder, supervisor, volunteers; for SIA add team type (house-to-house / fixed post) and per-team daily target.
- **Required output.** Staffing plan tied to the session calendar.
- **VaxPlan module.** `Session Day Plans` (per-session staffing fields).
- **Done when.** Every scheduled session-day has at least one named vaccinator. *(Structured staffing roster — counts + roles + per-diem — is still pending; tracked as **"Staffing + funding source on microplan"**.)*

### Step 6 — Vaccine, supplies & cold-chain forecast *(WHO core element 4, EVM 2.0)*
- **Purpose.** Forecast doses, diluents, AD syringes, safety boxes, and cold-chain capacity for the plan period.
- **What to do.** Apply wastage factors (BCG ~40%, MR/OPV ~25%, Penta/PCV ~11%, IPV/Rota ~5%) per antigen; size cold boxes, ice packs, carriers per session; verify storage capacity at facility level.
- **Required output.** Forecast table (doses + vials + supplies + cold-chain capacity).
- **VaxPlan module.** `Vaccine Calculator`, `Stock Ledger`.
- **Done when.** Vaccine forecast exists for every active antigen for the plan period. *(Cold-chain inventory and temperature logs are still pending; tracked as **"Cold-chain inventory, temperature logs, stockout/wastage, GTIN-lot-expiry"**.)*

### Step 7 — Demand generation & social mobilization *(RED 3, RED-Q "Reach")*
- **Purpose.** Plan how communities are informed and mobilized for every session.
- **What to do.** Per session schedule the announcement channel (megaphone, religious leader, SMS), the named focal point, and the target group; pre-position IEC materials.
- **Required output.** A mobilization activity per session, with date and target group.
- **VaxPlan module.** `Social Mobilization`.
- **Done when.** Every scheduled session has at least one mobilization activity.

### Step 8 — Logistics & transport *(WHO core element 5)*
- **Purpose.** Make sure the team and vaccines arrive at the community.
- **What to do.** Per session-day record transport mode, distance, fuel, vehicle/boat/escort, and (where applicable) security clearance.
- **Required output.** Transport line per session-day.
- **VaxPlan module.** `Session Day Plans` (transport + fuel fields).
- **Done when.** Every scheduled session-day has a transport mode and an estimated distance.

### Step 9 — Budget with funding source *(WHO core element 8, Gavi HSS)*
- **Purpose.** Cost the microplan and tag every line to a funder.
- **What to do.** Itemize Personnel / Transport / Supplies / Per Diem / Cold Chain / Training / Communication; tag each line with funding source (Govt, Gavi, WHO, UNICEF, Other).
- **Required output.** Quarterly budget with at least one line per category and an explicit funding source.
- **VaxPlan module.** `Budget Planning`.
- **Done when.** Budget items exist for the quarter and at least Personnel + Transport + Supplies categories are populated. *(The structured funding-source enum is still pending; tracked as **"Staffing + funding source on microplan"**.)*

### Step 10 — Supportive supervision plan *(RED 2)*
- **Purpose.** Schedule quarterly supervisory visits using a standard checklist.
- **What to do.** Per facility schedule at least one supervisory visit per quarter, name the supervisor, conduct the visit and capture the 12-item WHO RED checklist (Yes / No / N/A) plus findings and follow-up actions.
- **Required output.** Supervisory visit calendar with checklist scores and follow-up actions for the quarter.
- **VaxPlan module.** `Supportive Supervision` (`/supervision`), backed by the `supervision_visits` table.
- **Done when.** Every facility with sessions this quarter has at least one supervisory visit scheduled (or conducted) with `scheduledDate` in the current quarter.

### Step 11 — Approval cascade *(RED 5)*
- **Purpose.** Move the microplan from facility draft → district → provincial → national approval.
- **What to do.** Facility in-charge submits; each level reviews catchment coverage, denominators, session calendar, budget tags, and equity flags; final national approval locks the plan for execution.
- **Required output.** Approved microplan with an audit trail (who approved, when, comments).
- **VaxPlan module.** `Approvals`.
- **Done when.** Microplan has reached `approval_status = approved` at the facility's terminal review level (district/provincial/national depending on tenant policy).

### Step 12 — Execution, monitoring & quarterly review *(RED 4 + RED-Q "Measure")*
- **Purpose.** Run sessions, record what happened, and feed it back into the next quarter.
- **What to do.** Record doses given per session (`Client Logbook`); update wall chart; review defaulters and dropout monthly; re-rank missed communities every quarter; trigger a coverage survey after every SIA.
- **Required output.** Monthly tally + defaulter list + quarterly review note; trigger Step 1 again for next year.
- **VaxPlan module.** `Client Logbook`, `Dashboard`, `Reports`.
- **Done when.** At least one session this quarter has actual doses recorded *and* a defaulter review has been run. *(Defaulter list + zero-dose indicator + dropout view are still pending; tracked as **"Zero-dose children indicator + defaulter list + DTP dropout rates"**.)*

---

## 4. Required indicators (WHO + Gavi + JRF)

These are the indicators a complete microplan must compute or feed into. Status is tracked in-app at `Settings → Standards Alignment`.

| Indicator                                              | Source                  | Why it matters                              |
|--------------------------------------------------------|-------------------------|---------------------------------------------|
| DTP1 / DTP3 / MCV1 / MCV2 coverage                     | WUENIC, JRF             | Core EPI performance signal.                |
| **DTP1→DTP3 dropout %**                                | WUENIC                  | Programme retention; RED 4 monitoring.      |
| **DTP1→MCV1 dropout %**                                | WUENIC                  | Cross-antigen retention.                    |
| **Zero-dose children** (no DTP1 by 12 mo)              | Gavi 5.0 flagship       | RED-Q "Reach" target.                       |
| Under-immunized children (DTP1 yes, DTP3 no)           | Gavi 5.0                | RED-Q "Reach" target.                       |
| **Missed-community %** (no session in past 12 mo)      | Gavi 5.0 / RED-Q        | RED-Q "Measure" indicator.                  |
| Sessions planned vs held                               | RED 5 / HMIS            | Plan fidelity.                              |
| Stockout-days per antigen per month                    | JRF                     | EVM 2.0 E6 signal.                          |
| Actual wastage rate per antigen                        | JRF                     | EVM 2.0 E6 signal.                          |
| AEFI cases per 100k doses                              | JRF / IHR 2005          | Safety surveillance.                        |
| Cold-chain equipment functional %                      | JRF / EVM 2.0           | Capacity to deliver.                        |
| Supervisory visits completed vs planned                | RED 2                   | Quality assurance.                          |

---

## 5. Definition of a "complete" microplan

A microplan is **complete** (ready for approval submission) when **all twelve** of the following are true:

1. The catchment has a denominator for every community with a recorded source (Step 2).
2. Every community has an HTR score and equity tag (Step 3).
3. A 12-month session calendar exists covering every community (Step 4).
4. Every session-day has a named vaccinator (Step 5).
5. A vaccine + supplies forecast exists for every active antigen (Step 6).
6. Every session has a mobilization activity (Step 7).
7. Every session-day has a transport mode and estimated distance (Step 8).
8. The quarter's budget has Personnel + Transport + Supplies lines, each tagged to a funding source (Step 9).
9. A supportive-supervision visit is scheduled for the quarter (Step 10).
10. The microplan has been submitted for approval (Step 11).
11. The approval has reached the tenant's terminal review level (Step 11).
12. At least one session this quarter has actual doses recorded *and* a defaulter review has been run (Step 12).

VaxPlan's guided stepper computes 1–4, 6, 7, 9, 10, 11 from existing data today; 5, 8, 12 are marked **"Pending — tracked in [task title]"** until the underlying features ship.

---

## 6. Mapping table — step → VaxPlan module

| Step | Module(s)                                              | Route(s)                                  |
|------|--------------------------------------------------------|-------------------------------------------|
| 1    | Dashboard, Standards Alignment                         | `/`, `/standards-alignment`               |
| 2    | Boundary Manager, Population, Map View                 | `/admin/boundaries`, `/population`, `/map`|
| 3    | Hard-to-Reach, Population                              | `/htr`, `/population`                     |
| 4    | Routine Microplan, SIA Campaigns                       | `/sessions`, `/sia-campaigns`             |
| 5    | Session Day Plans                                      | `/sessions/:id/day-plans`                 |
| 6    | Vaccine Calculator, Stock Ledger                       | `/vaccines`, `/stock`                     |
| 7    | Social Mobilization                                    | `/mobilization`                           |
| 8    | Session Day Plans                                      | `/sessions/:id/day-plans`                 |
| 9    | Budget Planning                                        | `/budget`                                 |
| 10   | Supportive Supervision                                 | `/supervision`                            |
| 11   | Approvals                                              | `/approvals`                              |
| 12   | Client Logbook, Dashboard                              | `/clients`, `/`                           |

---

## 7. References

- WHO. *Microplanning for Immunization Service Delivery using the Reaching Every District (RED) Strategy.* WHO/AFRO 2009; revised 2017 and 2021.
- WHO. *Reaching Every Community: Operational Guide for Immunization in Hard-to-Reach Areas.* 2018.
- Gavi. *Gavi 5.0 Strategy 2021–2025* and *Equity Accelerator Framework.*
- WHO. *Immunization Agenda 2030: A Global Strategy to Leave No One Behind.*
- WHO & UNICEF. *Joint Reporting Form (JRF) on Immunization.* Annual.
- WHO. *Effective Vaccine Management (EVM) 2.0 Assessment Tool.*
