import{bg as Ee,A as o,u as We,j as e,an as D,ao as M,ax as E,ay as we,bw as xt,U as Re,ad as Ze,Q as i,bS as vt,Y as wt,bT as bt,a9 as m,bU as Fe,au as kt,af as jt,z as St,ae as Nt,I as Ct,ah as At,a3 as qe,aQ as Ve,bK as Pt,aj as Tt,aW as qt,bV as It,bD as Dt,a4 as C,a5 as A,a6 as P,a7 as T,aL as q,a8 as d,ac as I,ab as Ie,B as Mt}from"./index-Ciq76Cxi.js";import{A as tt,a as nt,b as at,c as rt}from"./accordion-De0e13IO.js";import{E as De}from"./external-link-uBzKTUQw.js";import{P as Ot}from"./phone-Dehp4b04.js";import{T as Me}from"./trash-2-DUVZX3xC.js";import{S as ve}from"./square-pen-D2iw2pAS.js";import{P as Ft}from"./progress-CSOWyIT8.js";import{A as Vt}from"./award-yR8y-b0h.js";import{L as Rt}from"./lock-Nld9roTh.js";import{M as Ke,r as Je}from"./index-Cv-KcQYt.js";import"./index-BntIEMuY.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge=Ee("Book",[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ue=Ee("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xe=Ee("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oe=Ee("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]),Et=`# VaxPlan — End-User Guide\r
\r
> A practical, role-by-role manual for the VaxPlan GIS microplanning\r
> platform. Use the table of contents to jump to your role.\r
\r
**Audience:** Ministry of Health staff at every level — facility\r
clerks, facility in-charges, district managers, provincial coordinators,\r
national administrators, and tenant onboarding leads.\r
\r
**Version:** This document is kept in lockstep with the running\r
application. If a screen looks different in your environment, your\r
tenant administrator may have customised the labels (for example\r
"Province" → "Region") — the workflows below are unchanged.\r
\r
---\r
\r
## Table of Contents\r
\r
1. [What VaxPlan does](#1-what-vaxplan-does)\r
2. [Roles at a glance](#2-roles-at-a-glance)\r
3. [Signing in](#3-signing-in)\r
4. [The home screen and switching country](#4-the-home-screen-and-switching-country)\r
5. [Facility staff — your daily workflow](#5-facility-staff--your-daily-workflow)\r
   - 5.1 [Build a routine microplan](#51-build-a-routine-microplan)\r
   - 5.2 [Plan a session](#52-plan-a-session)\r
   - 5.3 [Run a session in the field](#53-run-a-session-in-the-field)\r
   - 5.4 [Mark a session done](#54-mark-a-session-done)\r
   - 5.5 [Coverage and the under-immunised list](#55-coverage-and-the-under-immunised-list)\r
   - 5.6 [Stock, wastage, and supply](#56-stock-wastage-and-supply)\r
   - 5.7 [Offline mode and sync](#57-offline-mode-and-sync)\r
   - 5.8 [Manage your communities](#58-manage-your-communities)\r
6. [District managers — review and oversight](#6-district-managers--review-and-oversight)\r
7. [Provincial coordinators — approvals and visibility](#7-provincial-coordinators--approvals-and-visibility)\r
8. [National administrators](#8-national-administrators)\r
9. [Tenant onboarding (new Ministry of Health)](#9-tenant-onboarding-new-ministry-of-health)\r
10. [Map and boundary management](#10-map-and-boundary-management)\r
11. [Settlement intelligence and zero-dose targeting](#11-settlement-intelligence-and-zero-dose-targeting)\r
12. [Settings, customisation, and labels](#12-settings-customisation-and-labels)\r
13. [Supervision visits](#13-supervision-visits)\r
14. [Reports and exports](#14-reports-and-exports)\r
14b. [Indicator reference manual](#14b-indicator-reference-manual)\r
15. [Troubleshooting](#15-troubleshooting)\r
16. [Data sources and acknowledgements](#16-data-sources-and-acknowledgements)\r
17. [Glossary](#17-glossary)\r
\r
---\r
\r
## 1. What VaxPlan does\r
\r
VaxPlan is a multi-country microplanning system used by Ministries of\r
Health to plan, run, and track routine immunisation and supplementary\r
immunisation activities (SIAs).\r
\r
**Core workflows it covers:**\r
\r
- **Microplanning:** facility-level quarterly plans that combine\r
  catchment population, vaccine schedules, and outreach intent into a\r
  list of executable sessions.\r
- **Session execution:** scheduling, running, and closing out\r
  vaccination sessions (fixed-site, outreach, mobile).\r
- **Coverage analytics:** by antigen, by dose, by month, by location,\r
  with under-immunised and zero-dose surfacing.\r
- **Stock and supply:** vaccine requirements, wastage thresholds,\r
  cold-chain stock balances, and reconciliation.\r
- **Supervision:** scheduled supervisory visits with rolled-up\r
  reporting to district and province.\r
- **Mapping:** every facility, village, settlement, and session plotted\r
  on Leaflet maps with admin boundary overlays (GeoBoundaries +\r
  custom GeoJSON uploads).\r
- **Multitenant SaaS:** each Ministry of Health is a separate tenant\r
  with its own data, users, and SSO. Every account belongs to exactly\r
  one country and can only ever access that country. The single\r
  exception is a **Super Admin**, who can access and switch between all\r
  countries from the header.\r
\r
**See the full feature list.** For a complete, plain-language catalogue\r
of everything VaxPlan can do today, open **Standards Alignment** from the\r
sidebar and select the **Features** tab. It groups every feature by area\r
(dashboards, microplanning, vaccines & stock, maps & GIS, supervision,\r
users & access, offline & sync, security, and more), and the filter box\r
lets you jump straight to anything.\r
\r
**Where the data lives.** Everything is stored in PostgreSQL on a\r
tenant-isolated schema. Facility and village reference data is loaded\r
once during onboarding and then maintained by national administrators.\r
Day-to-day operational data (sessions, coverage, stock) is written by\r
facility staff.\r
\r
---\r
\r
## 2. Roles at a glance\r
\r
| Role | What they can do | Where they work |\r
| --- | --- | --- |\r
| **Facility clerk** | Authors microplans and sessions, captures session results, manages stock balances. | Their own facility only. |\r
| **Facility in-charge** | Same as clerk, plus signs off (submits) the microplan and session results. | Their own facility only. |\r
| **District manager** | Reviews and approves microplans from facilities in the district, runs supervision visits, reads coverage. | Their district. |\r
| **Provincial coordinator** | Approves district-level plans, sees rolled-up coverage, escalates issues. | Their province. |\r
| **National admin** | Manages users, facilities, vaccine schedule, labels, boundaries, and the country dashboard. | Their own country only. |\r
| **Super Admin** | Onboards new countries, configures SSO, provisions national admins, and is the only role that can access and switch between all countries (and promote other Super Admins). | All countries. |\r
\r
Microplan authoring (creating new microplans and session plans) is\r
**reserved for facility staff** (clerk and in-charge), so accountability\r
stays with the people who actually run the sessions. National admins can\r
also author when setting up or correcting a country's data. District\r
managers and provincial coordinators are reviewers and approvers only —\r
they cannot author plans on a facility's behalf.\r
\r
---\r
\r
## 3. Signing in\r
\r
VaxPlan supports two sign-in modes:\r
\r
1. **Email and password** (used during onboarding and colleague\r
   testing).\r
2. **Tenant SSO** — once your Ministry of Health is fully onboarded,\r
   you sign in with your own organisational identity (OIDC or SAML —\r
   for example Microsoft Entra, Google Workspace, Okta).\r
\r
**To sign in:**\r
\r
1. Open the VaxPlan URL provided by your administrator (each tenant\r
   has either a subdomain or a path-based URL).\r
2. Click **Sign in**.\r
3. You will be redirected to your identity provider; complete the\r
   login there.\r
4. On first login, your home tenant is set automatically from your\r
   email domain (if your administrator has configured a domain\r
   mapping) or from the signup invite you accepted. You'll land on\r
   your home tenant's dashboard.\r
\r
If you signed up but no role has been granted yet, you'll see a\r
"pending approval" message. Your district or national administrator\r
needs to confirm your role before you can use the system. They will\r
receive an inbox notification automatically.\r
\r
**Passwords (email sign-in):**\r
\r
- **Change your own password.** Click your name in the top-right\r
  corner and choose **Change password**. Enter your current password\r
  (leave it blank if you've never set one), then your new password\r
  twice. Passwords must be at least 8 characters.\r
- **Forgot your password?** On the sign-in screen click **Forgot\r
  password?** and enter your email. Your administrator is notified so\r
  they can set a new one for you, which they'll share with you\r
  securely.\r
- **Administrators** can set or reset passwords for users — see\r
  section 8.\r
\r
---\r
\r
## 4. The home screen and switching country\r
\r
The header has three constant elements:\r
\r
- **Country switcher (top-left)** — this appears **only for a Super\r
  Admin**. It shows the current country and a dropdown to switch\r
  between all countries. Switching changes which country's data you're\r
  working in. Every other account is permanently locked to its own\r
  country and never sees this switcher.\r
- **Navigation sidebar (collapsible)** — your modules. Items that\r
  your role can't access are hidden, so the menu adapts to who you\r
  are.\r
- **Profile menu (top-right)** — language, theme (light/dark), and\r
  sign-out.\r
\r
**Country isolation rule:** every account — including a national admin\r
— can only ever access its own country. There is no way to view or\r
edit another country's data. Only a Super Admin can move between\r
countries; when a Super Admin switches, they act fully within whichever\r
country they have selected. A Super Admin can also grant Super Admin to\r
another user from that user's edit screen (Users → open a user → Super\r
Admin access).\r
\r
**What you can see within your country.** VaxPlan also scopes data by\r
your place in the hierarchy. A facility clerk or in-charge sees only\r
their **own facility's** facilities, villages, population, microplans,\r
sessions, and reports. A district manager sees their district; a\r
provincial coordinator sees their province; a national admin sees the\r
whole country. You won't see — or be able to open — a record that\r
belongs to a facility outside your area, even with a direct link. This\r
keeps each facility's data private to the people responsible for it.\r
\r
---\r
\r
## 5. Facility staff — your daily workflow\r
\r
This is the most important section for clerks and in-charges. Read it\r
end-to-end the first time, then return to specific subsections as\r
needed. There is also a separate one-page card,\r
\`QUICKSTART_FACILITY.md\`, you can print and pin next to your\r
workstation.\r
\r
### 5.1 Build a routine microplan\r
\r
A **microplan** is your facility's quarterly plan. It declares:\r
\r
- which villages your facility serves this quarter,\r
- the target population (under-1s and pregnant women by default —\r
  configurable per tenant),\r
- the antigens you will offer,\r
- the outreach sessions you intend to run (fixed-site sessions are\r
  automatic).\r
\r
**Steps:**\r
\r
1. From the sidebar, open **Microplans → Routine**. You will see a list of your facility's saved microplans in a sortable and searchable table showing the plan name, period, status, and planned vs. completed session counts. You can sort by columns, filter by plan name, and use the page size selectors and pagination controls.\r
2. Click **New microplan** (or click **Open** on an existing plan in the table to resume editing). The wizard opens.\r
3. **Step 1 — Scope.** Pick the quarter and year. Your facility is\r
   pre-filled from your profile and cannot be changed.\r
4. **Step 2 — Catchment.** Tick the villages the facility will serve\r
   this quarter. The list is your facility's assigned villages from\r
   the registry. If a community is missing you can add it yourself —\r
   see **5.8 Manage your communities** below — then return to the\r
   wizard.\r
5. **Step 3 — Population.** Confirm the target denominators. Three\r
   data sources feed this:\r
   - **Registered population** (your registry, the default),\r
   - **WorldPop raster** (an open population grid — useful for\r
     remote villages without a recent census), and\r
   - **Manual override** (with a justification note).\r
   Pick the source per village; the wizard sums everything and shows\r
   you the totals.\r
6. **Step 4 — Vaccine schedule.** The default schedule is your\r
   tenant's. Untick antigens that don't apply (for example, if your\r
   facility doesn't carry HPV).\r
7. **Step 5 — Outreach intent.** Declare how many outreach sessions\r
   per village you expect to run. The system creates one session\r
   plan per (village × month × declared count). You can edit\r
   individual sessions later.\r
8. **Step 6 — Review and submit.** Check the totals, then **Save as\r
   draft** (you can keep editing) or **Submit for approval** (your\r
   district manager sees it in their queue).\r
\r
> **Tip.** You can save a draft at any step. Drafts are private to you\r
> until you submit.\r
\r
### 5.2 Plan a session\r
\r
Once a microplan is approved, its sessions appear on the **Sessions**\r
page. Each session is created automatically from the microplan's\r
outreach intent. You can also add ad-hoc sessions for defaulter\r
follow-up.\r
\r
**To edit a session:**\r
\r
1. Open **Sessions** from the sidebar.\r
2. Use the **Province → District → Facility** cascade filter at the\r
   top to find your sessions. The row count below changes as you\r
   filter.\r
3. Click a session name. The edit dialog opens.\r
4. Fill in:\r
   - **Scheduled date** — the day you'll run it.\r
   - **Site type** — fixed, outreach, or mobile.\r
   - **Villages served** (for outreach) — pick from the facility's\r
     catchment.\r
   - **Cold-chain plan** — vaccine carrier, ice packs, expected\r
     vaccines.\r
5. Click **Save**.\r
\r
If GPS coordinates are missing for the village, the system warns you\r
when you save and offers a "Capture GPS now" link to record them from\r
your phone in the field.\r
\r
**Tip — plan from the calendar.** On **All sessions**, pick a day and\r
click **Plan a session on this day**. This opens the New Session form\r
(not the microplan wizard) with the date already filled in; pick the\r
parent microplan and the form inherits its facility, quarter, year, and\r
target population.\r
\r
**Add itinerary days.** Inside a session, use **Add Vaccination Session\r
Itinerary Day** to plan each outreach day. Each day needs a **lead\r
vaccinator**, a **date at least 7 days ahead**, a **target population**,\r
and at least one **community** (tick from the list or quick-add from the\r
map). The **Calculated Vaccine Supplies** panel estimates realistic doses\r
per antigen — target × doses-per-child × wastage — so ~50 children yields\r
tens of doses, not thousands. If a day won't save, the error names the\r
field that needs fixing.\r
\r
### 5.3 Run a session in the field\r
\r
The session execution screen is designed for use **offline**, on a\r
phone or tablet, while you're at the village.\r
\r
1. From **Sessions**, tap your session for today.\r
2. Tap **Start session**. The screen switches to capture mode.\r
3. For each child or pregnant woman vaccinated:\r
   - Tap **Add client** (or scan their card if you've enabled barcode\r
     scanning).\r
   - Pick the antigens administered. The system auto-picks the next\r
     due dose based on the schedule.\r
   - Confirm.\r
4. The session totals update live. Stock balances on the device\r
   decrement automatically.\r
\r
You can capture an entire day's session with no connectivity. The\r
device queues every entry into an **offline outbox** (see 5.7).\r
\r
### 5.4 Mark a session done\r
\r
After you've finished vaccinating:\r
\r
1. Tap **Mark session done**.\r
2. Confirm the per-antigen counts. The system pre-fills these from\r
   your capture; you can adjust if your physical tally differs.\r
3. Add session notes (issues, no-shows, supply problems).\r
4. Tap **Submit**.\r
\r
**What happens behind the scenes:**\r
\r
- Per-antigen counts are validated against your tenant's vaccine\r
  schedule. Known codes are stored under their canonical name (so\r
  \`opv-1\` and \`OPV-1\` are treated the same).\r
- Unknown codes — usually from older offline entries — are stored in a\r
  separate bucket so they still count toward totals but don't pollute\r
  per-antigen rollups. You'll see a warning if any were found, and\r
  your national admin can review them in the audit log.\r
- Stock movements are recorded.\r
- The session is locked. Reopening requires district approval.\r
\r
### 5.5 Coverage and the under-immunised list\r
\r
**Coverage** is shown on the **Coverage** page. You'll see:\r
\r
- Coverage by antigen, this quarter and year-to-date.\r
- A heatmap of villages by coverage percentage.\r
- An **under-immunised list** of children who have started but not\r
  completed a vaccine series (for example, OPV-1 done but OPV-2\r
  missing past the due date).\r
\r
**Acting on the under-immunised list:**\r
\r
- Click a child to see their full vaccination history.\r
- Click **Create defaulter follow-up session** to spin up a new\r
  outreach session targeting that child's village. The session is\r
  tagged so it shows up under the **Defaulter follow-up only** filter\r
  on the Sessions page.\r
\r
### 5.6 Stock, wastage, and supply\r
\r
The **Stock** page tracks vaccine balances at your facility:\r
\r
- **On hand** by antigen and lot, with expiry dates.\r
- **Receipts** — when supply arrives from the district, enter the\r
  delivery note.\r
- **Issues** — automatic when you mark a session done, manual if\r
  you give vaccines to another facility.\r
- **Wastage** — auto-computed from session counts vs. opened vials,\r
  with a per-antigen wastage threshold. Vials wasted above threshold\r
  trigger an alert visible to your in-charge and district manager.\r
\r
The **monthly stock summary** is your end-of-month return: review,\r
adjust if you find a discrepancy on physical count, and submit.\r
\r
### 5.6b Cold Chain Equipment Inventory\r
\r
Every health facility tracks its vaccine storage equipment (refrigerators, freezers, solar direct drive units, vaccine carriers, and generators). \r
* **Viewing and Adding Equipment:** Open **Facilities** from the sidebar, click on your health facility, and switch to the **Cold Chain** tab. You can add new equipment, specify the condition (Functional, Needs Repair, Non-Functional, Condemned, Decommissioned), brand/model, serial number, storage capacity in litres, temperature ranges, and installation details.\r
* **Bulk Actions:** You can perform operations concurrently on multiple selected equipment items. Select multiple items in the list to reveal the floating actions toolbar at the bottom of the table to bulk delete, update condition, or make items active/inactive.\r
* **Interoperability (CSV & IGA):** To support Inventory and Gap Analysis (IGA), you can export the facility cold-chain assets to a standard CSV file or a specialized IGA-compatible JSON file. You can also import equipment lists from a CSV file directly.\r
\r
### 5.7 Offline mode and sync\r
\r
VaxPlan works without an internet connection. Here's what you need\r
to know:\r
\r
- The first time you sign in, the app **caches your reference data**\r
  (facilities, villages, vaccine schedule, microplans) into an\r
  on-device IndexedDB.\r
- When you create or update something offline (a session result, a\r
  stock movement, a new defaulter session), it goes into an\r
  **outbox**. The header shows a small cloud/sync badge with the number\r
  of pending items.\r
- **"Sync now" is built into the header.** The sync badge is always\r
  visible. Whenever you're online, tap it to push your outbox and pull\r
  the latest server data immediately — whether you have items queued or\r
  just want a refresh. While you're offline it shows your status and\r
  pending count, and syncs as soon as you're back online.\r
- When connectivity returns, the outbox **syncs automatically in the\r
  background** — even if you've closed the tab or locked the phone, on\r
  devices that support background sync (most Android browsers). On\r
  devices that don't (for example iPhones), it syncs the next time you\r
  open the app.\r
- **Live updates across devices.** While you're online, VaxPlan keeps a\r
  lightweight live connection open. If a colleague — or you on another\r
  device — changes something for your facility, your screen refreshes\r
  within a few seconds, with no manual reload. If that live connection\r
  drops, the app quietly falls back to periodic checks.\r
- If a sync entry is rejected (for example, a session was already\r
  closed on the server), the system shows the rejection inline and\r
  asks you to resolve it.\r
\r
> **Best practice.** Sync at the end of each session day, when you're\r
> back in cellular range. Don't let the outbox grow longer than a\r
> week's worth of entries.\r
\r
### 5.8 Manage your communities\r
\r
You can add and edit the communities (villages) your facility serves —\r
you don't need to wait for your national admin.\r
\r
**To add a community:**\r
\r
1. Open **Facilities** from the sidebar and switch to the\r
   **Communities** tab.\r
2. Click **Add Community**.\r
3. **Facility.** If you're facility staff, the facility is pinned to\r
   your own facility and can't be changed. District staff can pick any\r
   facility in their district; coordinators and admins get a searchable\r
   **Province → District → Facility** picker.\r
4. Fill in the community **name** and any other details.\r
5. **Set the location.** Either drop a **single pin** for the centre of\r
   the community, or switch to **Draw Polygon Mode** and click points on\r
   the map to trace the community's **catchment boundary**. Boundaries\r
   are saved and shown on the map everywhere in the app, and can be\r
   reused later.\r
6. Click **Save**.\r
\r
> **Note.** Facility and district staff can add and edit **communities**,\r
> but only provincial coordinators and national admins can add a new\r
> **health facility**. The **Add Facility** button is hidden for staff\r
> who aren't allowed to use it.\r
\r
**Communities Registry & Bulk Actions:** Under the Communities tab, you can manage all assigned villages:\r
* **Customize Columns:** Click the **Columns** dropdown next to "Add Community" to show/hide dynamic administrative level columns or metadata like HTR status and coordinates.\r
* **Floating Bulk Actions:** Tick checkboxes on individual community rows (or select all) to activate the floating actions bar. You can bulk delete, bulk update Hard-to-Reach status, bulk update transit modes, or reassign communities in batch to another facility. All bulk updates are processed concurrently in batches of 10 requests.\r
\r
**Catchment overlap and harmonization.** If the boundary you draw\r
overlaps another community's catchment, VaxPlan shows a **Catchment\r
overlap detected** panel after you save. It lists each overlapping\r
community, the other facility, and how much they overlap. To resolve a\r
clash, click **Request harmonization** next to a community: VaxPlan\r
records the conflict and emails that community's facility in-charge so\r
the two facilities can agree on who covers the shared area.\r
\r
---\r
\r
## 6. District managers — review and oversight\r
\r
You sit between facilities and the province. Your day-to-day:\r
\r
- **Approval queue.** Open **Approvals**. You'll see microplans\r
  submitted by facilities in your district. For each, you can:\r
  - **Approve** — the plan locks and its sessions go live.\r
  - **Request changes** — the plan returns to the facility with your\r
    note.\r
  - **Reject** — for plans that should be rebuilt from scratch.\r
- **Coverage rollup.** The **Coverage** page shows you the whole\r
  district at a glance. Drill down by facility or village.\r
- **Supervision visits.** Schedule visits to facilities; see §13.\r
- **Stock alerts.** You'll receive a weekly digest of facilities with\r
  stockouts, wastage above threshold, or upcoming expiries.\r
- **Cross-facility intelligence.** The **Map** view shows every\r
  session in your district pinned by status (planned, conducted,\r
  overdue, cancelled). Use it to spot uneven coverage by location.\r
\r
You **cannot** author microplans for a facility — that responsibility\r
stays with facility staff. You can, however, edit catchment\r
assignments (which villages belong to which facility) if you spot a\r
boundary issue.\r
\r
---\r
\r
## 7. Provincial coordinators — approvals and visibility\r
\r
Your role mirrors the district manager's, scoped to the province:\r
\r
- District-level **plan approvals**: when a district manager signs off\r
  on aggregated district-level outreach plans (for SIAs, mostly),\r
  they come to you next.\r
- **Province-wide coverage** dashboards.\r
- **Cross-district comparison** — see which districts are on track\r
  and which are slipping.\r
- **Resource allocation** — request stock reallocations between\r
  districts using the **Supply request** workflow.\r
\r
You also have access to the **National admin** read-only views (you\r
cannot edit users or facilities, but you can see them).\r
\r
---\r
\r
## 8. National administrators\r
\r
National admins are the power users for your country. Your modules:\r
\r
- **Users & Staff.** Invite users, assign roles, suspend or reactivate accounts.\r
  * **Password Controls:** When creating a user you can set an **initial password** so they can sign in right away, and you can **reset any user's password** later from the user's edit screen (open a user → **Reset Password**). Passwords must be at least 8 characters — share them with the user securely. (Only national admins and Super Admins see these password controls. A national admin can only manage users in **their own country**; a Super Admin can manage users in whichever country they're working in.)\r
  * **Staff Management Bulk Actions:** Open the **Staff** management table. You can perform batch updates concurrently on multiple selected staff members by ticking checkboxes on the left side of the rows (or selecting the header box to select all) to reveal the floating actions bar. You can bulk delete, toggle active/inactive status, update routine roles, or update training status in batches of 10.\r
- **Facilities.** The registry of all facilities. Import from CSV (a\r
  template is downloadable), edit GPS coordinates, merge duplicates,\r
  or retire facilities.\r
- **Villages and catchments.** The same for villages. The **catchment\r
  matrix** lets you assign villages to facilities.\r
- **Vaccine schedule.** Your tenant's authoritative schedule.\r
  Adding an antigen here makes it available in microplans nationwide.\r
- **Labels.** Customise the administrative level labels (e.g.\r
  "Province" → "Region" for South Sudan).\r
- **Boundaries.** See §10.\r
- **Country dashboard.** Top-line KPIs for the country, including\r
  coverage by antigen, dropout rates, stock health, and supervision\r
  compliance.\r
- **Approvals (escalations).** Anything a district or province\r
  rejected escalates to you.\r
- **Audit log.** Every change to sensitive data is logged with who,\r
  when, and what.\r
- **Site activity.** A panel on your country dashboard shows who is\r
  online right now and where they are signed in from, a live map\r
  pinning those users, visits today and over the last two weeks, your\r
  busiest pages, and a breakdown of login locations. Users stay counted\r
  as online while their tab is open — the app sends a quiet heartbeat —\r
  so someone reading a single page without clicking around still shows\r
  up. When a user allows location access in their browser, the map uses\r
  their device's real GPS position; otherwise it falls back to a\r
  best-effort estimate from the network address, which often resolves\r
  only to the nearest large city. Platform super admins can tap any\r
  online person for full detail — email, IP address, device, and exact\r
  coordinates. It is visible only to national and platform\r
  administrators.\r
\r
National admins can also configure **scheduled jobs** — population\r
refresh from WorldPop, stock-alert digests, and supervision digests\r
all run on schedules you can tune in **Settings → Schedules**.\r
\r
---\r
\r
## 9. Tenant onboarding (new Ministry of Health)\r
\r
This section is for the VaxPlan **Super Admin** onboarding a new country.\r
Onboarding a new country is **restricted to Super Admins** — country\r
administrators (national admins) manage only their own country and cannot\r
add new countries. The **Country Onboarding** screen (sidebar →\r
Administration → Country Onboarding) is hidden from everyone except Super\r
Admins, and it carries a built-in step-by-step guide that mirrors the\r
steps below.\r
\r
1. **Create the tenant.** Use **Settings → Tenants → New** and pick:\r
   - Country name and ISO-3 code.\r
   - Default time zone.\r
   - Default admin level labels (e.g. Province/District/Facility,\r
     or Region/State/Health Area).\r
   - Default vaccine schedule (clone from a sibling country if you\r
     have one, then edit).\r
2. **Configure SSO.** Add the OIDC or SAML configuration for the\r
   ministry's identity provider. Test the connection before going\r
   live.\r
3. **Map email domains.** Adding \`@health.gov.xx\` makes anyone who\r
   signs in from that domain land on this tenant by default.\r
4. **Provision the first national admin.** They will receive an\r
   invite email and be able to onboard everyone else.\r
5. **Load reference data.**\r
   - Admin boundaries — use the **Boundary Manager** (§10).\r
   - Facilities — import via CSV.\r
   - Villages and catchments — import via CSV.\r
   - Population — either ingest a WorldPop raster (national admin\r
     can do this on demand) or rely on registered population.\r
   - Where you only have an open facility list with province (but not\r
     district) labels, VaxPlan can fill in districts automatically by\r
     matching each facility's GPS coordinates against GeoBoundaries\r
     ADM2 polygons. See \`docs/COUNTRY_ONBOARDING.md\` for the repeatable\r
     prep-and-seed scripts (used to onboard South Africa).\r
6. **Set the approval workflow.** Decide whether plans need 1, 2, or\r
   3 levels of approval (facility → district → province → national).\r
7. **Go live.** The national admin sends out user invites and\r
   training links.\r
\r
---\r
\r
## 9b. Local Development Database & Restore\r
\r
VaxPlan includes a compressed database dump \`local_dump.sql.zip\` in the root of the project. This dump contains all available development data, including pre-seeded mock health facilities, routine/campaign microplans, volunteer/CHV profiles, spatial boundary definitions, performance indexes, indicators, and multi-tenant profiles (e.g., Zambia and South Africa).\r
\r
To set up your local development database with this data:\r
\r
1. **Unzip the Database Dump**:\r
   Unzip the compressed archive to extract the raw SQL dump file:\r
   \`\`\`bash\r
   unzip local_dump.sql.zip\r
   \`\`\`\r
\r
2. **Restore to PostgreSQL**:\r
   Make sure you have a local PostgreSQL database named \`vaxplan\` running, then restore the dump using \`psql\`:\r
   \`\`\`bash\r
   psql -U postgres -d vaxplan -f local_dump.sql\r
   \`\`\`\r
   *Note: If your local database has different credentials, adjust the username (\`-U\`) and database name (\`-d\`) accordingly.*\r
\r
3. **Verify Restored Schema**:\r
   Run the dev server (\`npm run dev\`) and test the landing page to verify that all country tenants (Zambia, South Africa, etc.) are listed and accessible with pre-configured demo credentials.\r
\r
---\r
\r
## 10. Map and boundary management\r
\r
Every map in VaxPlan (Sessions, Coverage, Settlement intelligence,\r
Microplans) draws boundaries on top of OpenStreetMap tiles.\r
\r
> **Boundary disclaimer.** The credit at the bottom-right of every map\r
> carries a short notice that boundaries are approximate, for planning\r
> and reference only, and do not imply endorsement — and that disputed\r
> areas are not authoritatively depicted. The full statement, including\r
> how disputed regions are handled, is in the **Acknowledgements** on the\r
> Data Sources page (§16).\r
\r
Boundaries come from two sources:\r
\r
- **GeoBoundaries API** — public, covers 200+ countries, available\r
  for admin levels 0 to 2 or 3 depending on the country.\r
- **Custom GeoJSON upload** — your own files, for levels GeoBoundaries\r
  doesn't cover (e.g. South Sudan Payam) or for your authoritative\r
  national geometry.\r
\r
**To fetch from GeoBoundaries:**\r
\r
1. Open **Settings → Boundary Manager**.\r
2. Click **Fetch from GeoBoundaries API**.\r
3. Pick country and admin level. Level names are pre-filled (you can\r
   edit them).\r
4. Click **Fetch Boundaries**. Large countries (Nigeria, DRC,\r
   Ethiopia) take 30 to 60 seconds.\r
\r
**To upload custom GeoJSON:**\r
\r
1. In Boundary Manager, click **Upload Custom GeoJSON**.\r
2. **ISO-3 country code** (3 letters, e.g. \`SSD\`, \`ZMB\`, \`PNG\`).\r
3. Pick the admin level and edit the level label if needed.\r
4. Choose the file (\`.geojson\` or \`.json\`). Files up to 50 MB are\r
   accepted.\r
5. Click **Upload & Store**.\r
\r
> **GADM users.** GADM ships shapefiles, not GeoJSON. Convert with\r
> the free [mapshaper.org](https://mapshaper.org) website (drag in\r
> the \`.shp\`, \`.shx\`, \`.dbf\` files, export as GeoJSON).\r
\r
---\r
\r
## 11. Settlement intelligence and zero-dose targeting\r
\r
For countries where village-level registration is patchy (parts of\r
South Sudan, PNG highlands, Sahel), VaxPlan offers a **settlement\r
intelligence** layer. It overlays:\r
\r
- WorldPop-derived populated cells (250m or 1km).\r
- Building footprints (GRID3) and detected zero-dose clusters.\r
- 5 km service-coverage gaps and suggested outreach sites.\r
\r
The population heatmap is read in **real people**, not an abstract\r
density figure. Each coloured cell shows the estimated number of people\r
living in that small grid cell (about 100 m × 100 m, roughly one\r
hectare), and the legend is labelled in people. When you **click any\r
point on the map**, the popup gives you a real headcount — the estimated\r
number of people living within 1 km of that point, worked out by adding\r
up the people in every nearby grid cell — so you can plan an outreach\r
session straight from the number without converting density yourself.\r
\r
The **Zero-dose map** uses this data to highlight settlements with no\r
recorded vaccinations. Click a hotspot to:\r
\r
- See the settlement's estimated population.\r
- See the nearest facility and travel time.\r
- Create an outreach session targeting the hotspot.\r
\r
**Geospatial Insights (real travel time and nearby assets).** On any\r
zero-dose cluster card or settlement record, click the **Insights**\r
(compass) button to open the Geospatial Insights panel. It shows:\r
\r
- **Travel time to the nearest facility and the nearest outreach\r
  site**, calculated on the real road network (OpenStreetMap routing) —\r
  each with both a **driving** and a **walking** estimate, the road\r
  distance, and a badge noting whether it's a true road route or a\r
  straight-line estimate (used automatically if routing is briefly\r
  unavailable, so the panel always answers). Existing outreach sites are\r
  often closer to a remote cluster than a fixed facility, so the panel\r
  shows whichever is relevant — or both, clearly labelled.\r
- **The route drawn on the map.** While the Insights panel is open, the\r
  map highlights the inspected point and draws a line to each\r
  destination — the actual road geometry when a route is available\r
  (or a dashed straight line when it falls back to an estimate) — and\r
  marks the nearest facility and outreach site, so you can judge terrain\r
  and direction at a glance. The map fits the view around the route\r
  automatically.\r
- **Community assets within 3 km** — schools, places of worship,\r
  markets, water points, transport nodes, pharmacies / drug stores,\r
  universities and colleges, government offices, transport &\r
  logistics features (airstrips, helipads, ferry terminals, river\r
  crossings, bridges, fuel stations, taxi ranks), and\r
  vulnerable-population sites (refugee/IDP camps and mining sites)\r
  pulled live from OpenStreetMap, each with\r
  its distance and a clearly coloured icon. These show what services\r
  already exist near a cluster, which helps you pick an outreach venue.\r
  If a remote cluster has nothing mapped nearby, the panel says so.\r
\r
**Outreach Site Suitability Score (0–100).** Every unserved cluster gets\r
a single, easy-to-read score that answers one question: *how good a\r
candidate is this place for a new outreach session?* A higher score means\r
a stronger case. The score combines six things, each shown as its own\r
bar so you can see exactly why a cluster scored the way it did:\r
\r
- **Population size** — more unserved people means more impact.\r
- **Likely zero-dose children** — the core equity target; clusters with\r
  more estimated never-vaccinated children score higher.\r
- **Distance from the nearest facility** — the farther, the bigger the\r
  access gap a new site would fill.\r
- **Existing-outreach gap** — how far the cluster is from any outreach\r
  site you already run (so you don't double up).\r
- **Road access / travel time** — a site a team can actually reach scores\r
  higher.\r
- **Nearby landmark / venue** — a school, place of worship or market\r
  makes a natural place to hold the session.\r
\r
The list view scores every cluster quickly using the data already on\r
hand (so anything still being measured is clearly marked **est.**). When\r
you open **Insights** on a cluster, the score is **refined live** using\r
the real road-network travel time and the landmarks actually found\r
nearby, and the panel also shows the estimated number of under-5 children\r
and likely zero-dose children there.\r
\r
**Ranked "Unserved Population Clusters" list.** The left panel lists\r
every pending unserved cluster, ranked by suitability score by default.\r
Use the **Sort** dropdown to re-order by suitability, population,\r
zero-dose children, distance to facility, outreach gap or travel time —\r
whatever matters most for your plan. Each row shows the score, the factor\r
breakdown and the key numbers, with three actions: **Locate** (centre the\r
map on it), **Insights** (open the refined breakdown and routes) and —\r
for facility staff who can author plans — **Plan session** (jump straight\r
to Session Planning, pre-filled for that cluster). This is a planning view\r
only: it never changes any data and only shows clusters for your country.\r
\r
**Ranked clusters on the map.** Turn on the **Ranked Clusters** layer in\r
the Map Layers Control panel to plot the same scored clusters from the\r
left panel directly on the map. Each pin is colour-graded by suitability\r
band — **green** for high, **amber** for medium, **grey** for low — so you\r
can judge geography and clustering at a glance alongside the facility and\r
zero-dose layers. Click a pin to see its score, population, likely\r
zero-dose children, distance to the nearest facility and outreach gap,\r
with the same **Locate**, **Insights** and (for facility staff)\r
**Plan session** actions as the list. Like the list, it's a planning view\r
only and shows clusters for your country.\r
\r
**More map layers** (toggle them in the **Map Layers Control**\r
panel, top-right of the map):\r
\r
- **Travel-time zones** — travel-time zones around every health\r
  facility **and every active outreach site** (outreach posts are often\r
  closer to a remote cluster than a fixed facility, so they give a fuller\r
  picture of real-world access), with a **Walking / Driving / Cycling**\r
  toggle in the Map Layers Control panel. Walking shows about 1, 2, and 3\r
  hours on foot; Driving shows about 30, 60, and 90 minutes by vehicle\r
  (useful for planning vehicle-based outreach and supply runs); Cycling\r
  shows about 30, 60, and 90 minutes by bicycle or motorbike (useful for\r
  outreach teams that travel by two-wheeler). When road routing is available\r
  these follow the real road and path network (so a settlement across a\r
  river or behind a ridge correctly shows as far), giving a far more\r
  trustworthy picture than plain circles. If routing is briefly\r
  unavailable, the layer falls back to simple dashed rings so you always\r
  see something — see at a glance which clusters fall outside a\r
  reasonable walking, driving, or cycling distance. On a busy map the\r
  zones can overlap a lot, so a second toggle lets you show only\r
  **Facilities**, only **Outreach** sites, or **Both** — focus on one\r
  access question at a time. (Both the road-network zones and the\r
  fallback rings respect the choice.)\r
- **Community assets** — plots schools, water points, pharmacies,\r
  universities and colleges, government offices, transport & logistics\r
  features, vulnerable-population sites, and other assets found within 5 km of\r
  the current map centre, each with its own coloured icon. Pan or click\r
  **Locate** on a cluster, then turn this layer on to scan what's\r
  around it.\r
\r
> Travel times and community assets come from open data and are a\r
> planning aid, not a survey. Always confirm on the ground.\r
\r
This module is most useful for the **district manager**,\r
**provincial coordinator**, and **national admin** roles when planning\r
quarterly microplanning calendars.\r
\r
---\r
\r
## 12. Settings, customisation, and labels\r
\r
National admins can adjust the look and feel of the app for their\r
country:\r
\r
- **Admin level labels.** Each tenant can rename the four hierarchy\r
  levels. The default is Country / Province / District / Facility.\r
  Common alternatives:\r
  - South Sudan: Country / State / County / Payam.\r
  - PNG: Country / Province / District / Local-Level Government.\r
  - Zambia: Country / Province / District / Constituency.\r
- **Branding.** Upload your ministry logo; it appears on the header\r
  and on all PDF exports.\r
- **Languages.** Choose the default language for users in your\r
  tenant. English, French, and Portuguese are bundled; ask the\r
  VaxPlan team for additions.\r
- **Vaccine schedule.** Add antigens and doses; mark which are\r
  routine vs. campaign.\r
- **Wastage thresholds.** Per antigen, what percentage of doses\r
  wasted triggers an alert.\r
\r
---\r
\r
## 13. Supervision visits\r
\r
Supervision is a first-class workflow:\r
\r
1. **Schedule visits.** Open **Supervision → Schedule Visit**, pick a\r
   facility, a date, and a supervisor. You can also choose which\r
   **checklist** to use — the built-in WHO checklist, or any custom\r
   checklist your national admin has built (see below).\r
2. **Visit checklist.** When the supervisor arrives, they open the\r
   visit on their phone. A **progress bar** at the top shows how many\r
   questions are answered and the **live score** updates as they go. A\r
   **Visit location** card confirms where the visit happened using a\r
   smart **Province → District → Health Facility** picker plus an\r
   **interactive map** — tap the map to drop a pin, drag it to\r
   fine-tune, or tap **Use my location** to place it from the device's\r
   GPS. They then answer the checklist questions. Questions\r
   can be Yes/No, True/False, short text, a number, single- or\r
   multiple-choice, a 1–5 rating, a date, a **GPS location** (picked\r
   the same way, on a map), or a **photo** taken on the device.\r
   Some questions are **follow-ups** that only appear after a\r
   particular answer (for example, an "If No, why?" box that shows up\r
   only when the previous question is answered "No"). Other questions\r
   are **repeatable** — tap **Add another** to record one entry per\r
   vaccinator, session, or child, and remove an entry you don't need.\r
3. **Findings and actions.** Record findings and follow-up actions,\r
   and set the next visit date.\r
4. **Score.** The visit score is the average of the scored questions —\r
   Yes/No and True/False answers, plus any ratings the checklist author\r
   chose to count. Every repeated entry counts, so the entries are\r
   averaged together automatically. N/A and hidden follow-ups are\r
   ignored.\r
\r
The **Supervision digest** (a weekly summary) rolls up overdue\r
visits to the district and provincial dashboards.\r
\r
### Custom supervision checklists (national admins)\r
\r
National admins can build their own checklists so every facility in\r
the country uses the same questions:\r
\r
1. Open **Supervision → Manage Checklists**.\r
2. Click **New checklist**, give it a name, and add questions. For\r
   each question pick a type (Yes/No, True/False, short text, number,\r
   single choice, multiple choice, rating, date, GPS location, or\r
   photo), and add options for choice questions.\r
3. Make any question highly configurable:\r
   - **Follow-up:** under any question, click **Add a follow-up\r
     question**. The new question appears indented beneath it, and you\r
     choose which answer reveals it (e.g. show it only when the question\r
     is answered "No", or whenever it has any answer). Any question can\r
     have follow-ups — including the first one — and you can **Detach** a\r
     follow-up to make it a normal question again.\r
   - **Repeat:** turn on "Allow multiple entries" so supervisors can\r
     add as many entries as needed during a visit. You can name each\r
     entry (e.g. "Vaccinator") and cap how many are allowed.\r
   - **Scoring:** choose whether each Yes/No or True/False question\r
     counts toward the score, and opt a rating in so it counts too.\r
4. Mark a checklist **Active** to make it available when scheduling\r
   visits. Anyone in the country can then pick it; only national\r
   admins can create, edit, or delete the checklists themselves.\r
\r
---\r
\r
## 14. Reports and exports\r
\r
Most tables in VaxPlan have an **Export** button that produces an\r
Excel workbook with the currently filtered rows.\r
\r
For more formal outputs, use **Reports → Generate**:\r
\r
- **Quarterly microplan return** (PDF, per facility).\r
- **District coverage report** (PDF, per district per month).\r
- **Stock and wastage report** (Excel, per facility per month).\r
- **Supervision report** (PDF, per visit).\r
\r
All reports honour the geo filters you've selected on the page.\r
\r
---\r
\r
## 14b. Indicator reference manual & Knowledge Mastery\r
\r
To support health planners and managers in interpreting vaccination progress correctly, VaxPlan includes an interactive, tenant-specific **Indicator Reference Manual** accessible from the Analytics sidebar group.\r
\r
### Structure of the Manual\r
The manual organizes standard indicators (including WHO, Gavi, and UNICEF reporting metrics) by category and subcategory:\r
- **Core Metrics**: Numerators, Denominators, and detailed formulas (e.g. \`Coverage Rate (%) = (Vaccinated Count / Target Population) * 100\`).\r
- **Granular Data Sources**: Data sources are explicitly split into separate fields for the Numerator (e.g., client logbooks) and Denominator (e.g., WorldPop or census estimates).\r
- **Calculation Examples**: Every metric includes a concrete, plain-language example showing how values are calculated (e.g., Penta1-Penta3 dropout calculations).\r
- **Clickable Guidelines**: Reference guidelines are clickable pills that open the official WHO or Gavi documentation directly in a new tab.\r
\r
### Knowledge Mastery Gamification\r
Planners can build their expertise using the built-in **Mastery Tracker**:\r
- Toggling **Mark as Mastered 🎯** on any indicator adds it to your personal learning register (saved locally on your device).\r
- Progresses through four mastery ranks in the dashboard header:\r
  - **EPI Novice 🌱** (0-3 metrics mastered)\r
  - **EPI Practitioner 📘** (4-7 metrics mastered)\r
  - **EPI Specialist 🎯** (8-10 metrics mastered)\r
  - **EPI Mastery Legend 🏆** (All 11 metrics mastered)\r
\r
---\r
\r
## 15. Troubleshooting\r
\r
**I can't see my facility's sessions on the Sessions page.**\r
Check the Province / District / Facility filter at the top of the\r
page — if any are set, only matching sessions are shown. Clear them\r
to see everything you're allowed to see.\r
\r
**The map is blank.**\r
Either you don't have boundaries loaded for the level you're viewing\r
(ask a national admin), or your browser blocked location/tile\r
fetches. Try a different browser or hard-refresh.\r
\r
**"413 Request Entity Too Large" when uploading a boundary.**\r
That used to happen for files over 100 KB. Files up to 50 MB are now\r
accepted. If you see this on a smaller file, the file may not be\r
valid GeoJSON; try opening it in [geojson.io](https://geojson.io) to\r
validate.\r
\r
**"GeoBoundaries has no ADM3 boundary" error.**\r
GeoBoundaries doesn't publish every admin level for every country.\r
For South Sudan, only ADM0-ADM2 are upstream — for Payam you need to\r
upload a custom GeoJSON (OCHA HDX is a good source).\r
\r
**My country code is rejected with "must contain exactly 3\r
characters".** Use the ISO 3166-1 alpha-3 code (e.g. \`SSD\` for South\r
Sudan, \`ZMB\` for Zambia, \`PNG\` for Papua New Guinea, \`KEN\` for\r
Kenya). The 2-letter alpha-2 codes (\`SS\`, \`ZM\`) are not accepted.\r
\r
**I marked a session done but it shows zero coverage.**\r
The per-antigen counts may use unknown codes (older offline outbox\r
entries). Open the session, check the "unmapped antigens" warning,\r
and ask your national admin to standardise the codes via the audit\r
log workflow.\r
\r
**Sync failed for some outbox entries.**\r
Tap the cloud icon to see which ones. Most failures are because the\r
underlying session was closed or deleted on the server. Reopen the\r
entry, resolve the conflict, and retry.\r
\r
**I'm logged in but I see "pending approval".**\r
A national or district admin needs to confirm your role. Contact\r
your administrator; they will see the request in their inbox.\r
\r
---\r
\r
## 16. Data sources and acknowledgements\r
\r
VaxPlan has a built-in **Data Sources** page that lists where the\r
platform's maps, administrative boundaries, population figures, and\r
facility data come from, along with the open-source projects it is built\r
on.\r
\r
- Open it from the sidebar (**Data Sources**, near Settings and Help),\r
  from the **External Resources** card on the Help page, or by tapping the\r
  small **Data sources** link in the credit at the bottom-right corner of\r
  any map.\r
- The page is also **public**: anyone can view it at \`/data-sources\`\r
  without signing in, and there is a link to it in the footer of the\r
  public landing page. The per-country population sources block is only\r
  shown to signed-in users; signed-out visitors see the general source\r
  list and acknowledgements.\r
- Sources are grouped by category: Maps & Basemaps, Administrative\r
  Boundaries, Population & Demographics, Health Facilities & Health\r
  Information Systems, Immunization Guidance & Standards, and Software /\r
  Fonts / Icons. Each entry shows a short description, its licence where\r
  relevant, and a link to the original source.\r
- If your country has population sources configured, they appear at the\r
  top of the page so you can see exactly which datasets feed your\r
  catchment and vaccine-needs calculations.\r
- The **Acknowledgements** section credits the data providers and open\r
  projects, and is a reminder that each dataset remains the property of\r
  its original owner and should be cited accordingly.\r
- The Acknowledgements also carry the **map boundary disclaimer** and a\r
  note on **disputed regions**: boundaries shown are for reference only\r
  and do not imply endorsement, and disputed or contested areas are not\r
  authoritatively depicted. The same short notice appears in the credit\r
  on every map.\r
\r
---\r
\r
## 17. Glossary\r
\r
- **Antigen** — A vaccine type (BCG, OPV, Penta, MCV1, etc.).\r
- **Catchment** — The set of villages a facility serves.\r
- **Coverage** — Percentage of the target population that received\r
  a given dose, in a given period.\r
- **Defaulter** — A child who started but did not complete a vaccine\r
  series on time.\r
- **Denominator** — The target population used to calculate coverage.\r
- **Dropout** — The percentage of children who received an earlier\r
  dose but did not receive a later one (e.g. Penta1 → Penta3).\r
- **Fixed-site session** — A vaccination session held at the\r
  facility.\r
- **Microplan** — A facility's quarterly plan combining catchment,\r
  denominator, schedule, and intended outreach.\r
- **Outreach session** — A session held away from the facility,\r
  usually in a village.\r
- **SIA** — Supplementary Immunisation Activity (a campaign — for\r
  example a measles SIA).\r
- **Tenant** — A Ministry of Health (one country) on the VaxPlan\r
  platform. Each tenant has isolated data.\r
- **WorldPop** — An open population dataset providing population\r
  estimates on a 100m or 1km grid.\r
- **Zero-dose child** — A child of vaccination age who has received\r
  no doses of any vaccine.\r
\r
---\r
\r
*If you spot an error in this guide or want a topic added, ask your\r
national admin to file an issue with the VaxPlan team. The guide is\r
versioned alongside the application code.*\r
`,zt=`# VaxPlan — Facility Staff Quick-Start

> Pin this card next to your workstation. It covers the things
> you'll do most days as a facility clerk or in-charge.

## 1. Sign in
- Open the VaxPlan link your administrator gave you.
- Click **Sign in** and complete your organisation's login.
- The first time, you'll land on your facility's dashboard
  automatically.
- **Change your password** anytime: click your name (top-right) →
  **Change password**. Forgot it? Use **Forgot password?** on the
  sign-in screen and your admin will help.

## 2. Add a community (village)
1. Sidebar → **Facilities** → **Communities** tab → **Add Community**.
2. Your facility is **pinned automatically** — you can't pick another.
3. Enter the **name**, then set the location: drop a **single pin**, or
   use **Draw Polygon Mode** to trace the **catchment boundary** on the map.
4. **Save.** If your boundary overlaps another community, a
   **Catchment overlap** panel appears — click **Request harmonization**
   to flag it and email the other facility's in-charge.

> You can add **communities**, but only coordinators/admins can add a new
> **health facility** — that button won't show for you.

## 3. Build a quarterly microplan
1. Sidebar → **Microplans → Routine**
2. **New microplan** → pick the quarter and year.
3. Tick the **villages** your facility will serve.
4. Confirm the **target population** (Registered / WorldPop / Manual).
5. Confirm the **antigens** to offer.
6. Declare **outreach sessions per village per month**.
7. **Save as draft** or **Submit for approval**.

## 4. Plan the session days (itinerary)
1. Open a session → **Add Vaccination Session Itinerary Day**.
2. Enter the **lead vaccinator's** name, a **date at least 7 days ahead**,
   the **target population**, and tick at least one **community**.
3. The **Calculated Vaccine Supplies** panel estimates realistic doses per
   antigen (target × doses-per-child × wastage) — ~50 children gives tens of
   doses, not thousands.
4. If a day won't save, the message names the field to fix.

> Tip: From **All sessions → calendar**, "Plan a session on this day" opens
> the New Session form (not the microplan wizard) with the date filled in.

## 5. Run a session in the field
1. Sidebar → **Sessions** → find today's session.
2. **Start session** (works offline).
3. **Add client** for each child or pregnant woman vaccinated.
   - Pick antigens administered; the next-due dose is preselected.
4. When done, **Mark session done** → confirm counts → **Submit**.
5. Sync when you're back in range (cloud icon, top-right).

## 6. Follow up defaulters
1. Sidebar → **Coverage** → **Under-immunised list**.
2. Click a child to see their history.
3. Click **Create defaulter follow-up session** to schedule outreach.

## 7. Track stock
1. Sidebar → **Stock**.
2. Enter **Receipts** when supply arrives.
3. **Issues** are auto-recorded when you close a session.
4. At month-end, review and submit the **Monthly stock summary**.

<!-- Original section ended here. Added section 8 for Cold Chain Equipment below: -->

## 8. Manage Cold Chain Equipment
1. Sidebar → **Facilities** → select your facility → **Cold Chain** tab.
2. View, add, or edit your facility's refrigerators, freezers, solar direct drive units, vaccine carriers, or generators.
3. Select multiple items in the list to trigger the bottom **floating bulk actions** toolbar (e.g. bulk update condition, make active/inactive).
4. Use **Import CSV** to import equipment lists or **Export** (CSV/IGA JSON) to share with Inventory and Gap Analysis (IGA) systems.

---

## Daily checklist

- [ ] Open today's sessions before leaving for outreach.
- [ ] Capture clients during the session (offline is fine).
- [ ] Mark session done before packing up.
- [ ] Tap the **sync badge** (top-right) to sync when back in cellular range.
- [ ] Skim the **Under-immunised list** weekly for defaulters.
- [ ] Submit the **Monthly stock summary** on the last working day.

> **Good to know.** When you're online, the app updates on its own
> within seconds if anything changes for your facility — no need to
> refresh. You only ever see your own facility's data. If a newer
> version of the app is published, a banner appears at the top: tap
> **Reload** in the browser, or **Download update** in the Windows /
> Android app, to get the latest features (your data keeps syncing
> either way).

## Who to call

| Problem | Contact |
| --- | --- |
| My role hasn't been approved | Your district manager |
| Missing villages on my list | Add them yourself (Facilities → Communities → Add Community) |
| Need a new health facility added | Your provincial coordinator or national admin |
| Stock alert / wastage threshold | Your in-charge or district manager |
| Cannot sign in | Your IT focal point |
| App keeps crashing | Open Help → Send feedback (a national admin will see it) |
| Where does the map / population / facility data come from? | Sidebar → **Data Sources** lists every source and its licence |
`,et=[{id:"quickstart",name:"Quick-Start Pro",description:"Read the Facility Quick-Start guide.",icon:"⚡",color:"from-amber-400 to-orange-500"},{id:"gis_intel",name:"GIS Navigator",description:"Complete the Settlement Intelligence section and pass the quiz.",icon:"🛰️",color:"from-sky-400 to-indigo-500"},{id:"routine_plan",name:"Field Commander",description:"Complete the Routine Microplanning section and pass the quiz.",icon:"🗺️",color:"from-emerald-400 to-teal-500"},{id:"scholar",name:"Wiki Scholar",description:"Mark all available wiki user guide sections as read.",icon:"🎓",color:"from-violet-400 to-purple-500"}],Gt={"11-settlement-intelligence-and-zero-dose-targeting":{id:"gis_intel",title:"Settlement Intelligence & Zero-Dose Quiz",questions:[{question:"What does the Outreach Site Suitability Score represent?",options:["The percentage of completed supervision visits.","An abstract population density indicator.","A 0-100 score prioritizing unserved building clusters based on size, zero-dose risk, distance, and road travel time."],correctAnswer:2,explanation:"The Outreach Site Suitability Score aggregates multiple factors (unserved size, zero-dose children, distance, accessibility) to help planners choose the optimal location for new outreach sessions."},{question:"What is the spatial resolution of the WorldPop gridded population data in VaxPlan?",options:["100 meters × 100 meters (approx. 1 hectare)","1 kilometer × 1 kilometer","5 kilometers × 5 kilometers"],correctAnswer:0,explanation:"VaxPlan fuses high-resolution WorldPop raster data, which maps population density at 100m grid cells, letting planners click the map and get a precise headcount of people."}]},"5-facility-staff--your-daily-workflow":{id:"routine_plan",title:"Routine Microplanning Quiz",questions:[{question:"How far in advance must a vaccination session date be scheduled?",options:["At least 24 hours in advance","At least 7 days in advance","No advance scheduling is required"],correctAnswer:1,explanation:"To allow for logistics and cold chain planning, all itinerary days must be scheduled at least 7 days in the future."},{question:"Which role is responsible for reviewing and approving microplans?",options:["Facility Clerks","WHO external monitors only","District Managers and Provincial Coordinators"],correctAnswer:2,explanation:"Authoring is done at the facility level, while review and approvals are routed hierarchically to District Managers and Provincial Coordinators."}]}};function Ut(p){return p.toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-")}function Wt(p){const g=p.split(`
`),b=[];let v=null;for(const a of g){const h=a.match(/^##\s+(.+?)\s*$/);if(h){v&&b.push(v),v={id:Ut(h[1]),title:h[1],level:2,body:""};continue}v&&(v.body+=a+`
`)}return v&&b.push(v),b.filter(a=>!/table of contents/i.test(a.title))}function Ht({isFacilityRole:p}){const g=o.useMemo(()=>Wt(Et),[]),[b,v]=o.useState(""),[a,h]=o.useState(void 0),[c,y]=o.useState([]),[k,z]=o.useState([]),[G,j]=o.useState({}),[l,be]=o.useState({}),[U,B]=o.useState(null);o.useEffect(()=>{try{const n=localStorage.getItem("vaxplan.docs.readSections");n&&y(JSON.parse(n));const r=localStorage.getItem("vaxplan.quizzes.completed");r&&z(JSON.parse(r))}catch{}},[]);const O=n=>{y(n);try{localStorage.setItem("vaxplan.docs.readSections",JSON.stringify(n))}catch{}},{data:F=[],isLoading:me}=We({queryKey:["/api/wiki/pages"],queryFn:async()=>{const n=await fetch("/api/wiki/pages");if(!n.ok)throw new Error("Failed to fetch wiki list");return(await n.json()).data},retry:1}),{data:V}=We({queryKey:["/api/wiki/pages",a],queryFn:async()=>{if(!a||a==="quickstart")return null;const n=await fetch(`/api/wiki/pages/${encodeURIComponent(a)}`);if(!n.ok)throw new Error("Failed to fetch page body");return(await n.json()).data},enabled:!!a&&a!=="quickstart"&&F.some(n=>n.slug===a)}),x=o.useMemo(()=>F.length===0?g:F.map(n=>{const r=g.find(u=>u.id===n.slug);return{id:n.slug,title:n.title,level:2,body:n.slug===a&&(V!=null&&V.body)?V.body:(r==null?void 0:r.body)??""}}),[F,g,a,V]),ge=o.useMemo(()=>{const n=b.trim().toLowerCase();return n?x.filter(r=>r.title.toLowerCase().includes(n)||r.body.toLowerCase().includes(n)):x},[x,b]),W=o.useMemo(()=>{const n=x.length+(p?1:0);if(n===0)return 0;let r=c.filter(u=>u==="quickstart"||x.some(f=>f.id===u)).length;return Math.round(r/n*100)},[x,c,p]),ke=o.useMemo(()=>{const n=[];return c.includes("quickstart")&&n.push("quickstart"),k.includes("gis_intel")&&n.push("gis_intel"),k.includes("routine_plan")&&n.push("routine_plan"),x.length>0&&x.every(u=>c.includes(u.id))&&n.push("scholar"),n},[c,k,x]),Q=n=>{let r;c.includes(n)?r=c.filter(u=>u!==n):r=[...c,n],O(r)},je=(n,r)=>{j(u=>({...u,[`${a}-${n}`]:r})),be(u=>({...u,[`${a}-${n}`]:!1}))},fe=(n,r)=>{let u=!0;if(r.questions.forEach((f,w)=>{G[`${n}-${w}`]!==f.correctAnswer&&(u=!1),be(_=>({..._,[`${n}-${w}`]:!0}))}),u){if(!k.includes(r.id)){const f=[...k,r.id];z(f);try{localStorage.setItem("vaxplan.quizzes.completed",JSON.stringify(f))}catch{}}c.includes(n)||O([...c,n])}};return e.jsxs("div",{className:"space-y-6",children:[e.jsx(D,{className:"border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20",children:e.jsx(M,{className:"pt-6",children:e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-6",children:[e.jsxs("div",{className:"space-y-2 flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Xe,{className:"h-5 w-5 text-indigo-500"}),e.jsx("h2",{className:"font-bold text-base",children:"Your Learning Academy Progress"})]}),e.jsxs("div",{className:"flex items-center justify-between text-xs text-muted-foreground",children:[e.jsxs("span",{children:["Modules Read: ",c.length," of ",x.length+(p?1:0)]}),e.jsxs("span",{children:[W,"% Complete"]})]}),e.jsx(Ft,{value:W,className:"h-2 bg-muted-foreground/15"})]}),e.jsxs("div",{className:"border-t md:border-t-0 md:border-l border-indigo-500/10 pt-4 md:pt-0 md:pl-6",children:[e.jsxs("div",{className:"text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1.5",children:[e.jsx(Vt,{className:"h-4 w-4"})," Unlocked Badges (",ke.length," / ",et.length,")"]}),e.jsx("div",{className:"flex gap-2 flex-wrap",children:et.map(n=>{const r=ke.includes(n.id);return e.jsxs("div",{title:`${n.name}: ${n.description} (${r?"Unlocked":"Locked"})`,className:`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium select-none transition-all duration-300 ${r?`bg-gradient-to-r ${n.color} text-white border-transparent shadow-sm scale-100 hover:scale-105`:"bg-muted text-muted-foreground/60 border-muted-foreground/15 opacity-60"}`,children:[e.jsx("span",{children:n.icon}),e.jsx("span",{children:n.name}),!r&&e.jsx(Rt,{className:"h-3 w-3 ml-0.5 opacity-60"})]},n.id)})})]})]})})}),p&&e.jsxs(D,{className:"border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-sky-500/5",children:[e.jsx(E,{className:"pb-3",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsxs(we,{className:"flex items-center gap-2 text-base",children:[e.jsx(xt,{className:"h-5 w-5 text-indigo-500"}),"Facility Quick-Start",c.includes("quickstart")&&e.jsxs(Re,{variant:"secondary",className:"ml-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 flex items-center gap-0.5",children:[e.jsx(Ze,{className:"h-3 w-3"})," Completed"]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(i,{size:"sm",variant:c.includes("quickstart")?"ghost":"default",className:c.includes("quickstart")?"text-muted-foreground text-xs":"text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700",onClick:()=>{const n=c.includes("quickstart");O(n?c.filter(r=>r!=="quickstart"):[...c,"quickstart"])},children:c.includes("quickstart")?"Mark Unread":"Mark as Read"}),e.jsx(i,{size:"sm",variant:"outline",onClick:()=>window.print(),"data-testid":"btn-print-quickstart",children:"Print"})]})]})}),e.jsx(M,{children:e.jsx("article",{className:"prose prose-sm max-w-none dark:prose-invert",children:e.jsx(Ke,{remarkPlugins:[Je],components:{img:({src:n,alt:r})=>e.jsx("img",{src:n,alt:r,className:"rounded-lg shadow-md max-h-96 object-cover cursor-zoom-in transition-transform hover:scale-[1.01]",onClick:()=>B(n||null)})},children:zt})})})]}),e.jsxs(D,{children:[e.jsx(E,{className:"pb-3 border-b",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs(we,{className:"flex items-center gap-2 text-base",children:[e.jsx(vt,{className:"h-5 w-5 text-indigo-500"}),"VaxPlan End-User Wiki Guide"]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Live role-by-role training handbook. Read modules, submit quizzes, and earn badges."})]}),e.jsxs(i,{size:"sm",variant:"outline",className:"gap-1.5","data-testid":"btn-download-guide-pdf",onClick:async()=>{try{if((await fetch("/VaxPlan-User-Guide.pdf",{method:"HEAD"})).ok){const r=document.createElement("a");r.href="/VaxPlan-User-Guide.pdf",r.download="VaxPlan-User-Guide.pdf",r.click()}else window.print()}catch{window.print()}},children:[e.jsx(wt,{className:"h-3.5 w-3.5"}),"Download PDF"]})]})}),e.jsxs(M,{className:"space-y-3 pt-4",children:[e.jsxs("div",{className:"relative",children:[e.jsx(bt,{"aria-hidden":"true",className:"absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"}),e.jsx(m,{id:"guide-search",placeholder:"Search guide pages...",value:b,onChange:n=>v(n.target.value),className:"pl-8 h-9 text-sm","data-testid":"input-guide-search"})]}),me&&ge.length===0?e.jsx("div",{className:"py-8 text-center text-sm text-muted-foreground",children:"Loading wiki pages from database..."}):ge.length===0?e.jsx("p",{className:"text-sm text-muted-foreground py-6 text-center",children:"No matching pages found."}):e.jsx(tt,{type:"single",collapsible:!0,value:a,onValueChange:h,children:ge.map(n=>{const r=c.includes(n.id),u=Gt[n.id],f=u&&k.includes(u.id);return e.jsxs(nt,{value:n.id,children:[e.jsxs(at,{className:"text-sm hover:no-underline text-left flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[r?e.jsx(Ze,{className:"h-4 w-4 text-emerald-500 shrink-0"}):e.jsx("div",{className:"h-4 w-4 border rounded-full shrink-0 border-muted-foreground/30"}),e.jsx("span",{children:n.title})]}),u&&e.jsx(Re,{variant:"outline",className:`ml-2 text-[10px] uppercase font-semibold ${f?"bg-emerald-500/10 text-emerald-600 border-0":"bg-indigo-500/10 text-indigo-600 border-indigo-200"}`,children:f?"Quiz Passed ✅":"Quiz Available 📝"})]}),e.jsx(rt,{className:"pt-2",children:a===n.id&&F.length>0&&V===void 0?e.jsx("div",{className:"py-4 text-center text-xs text-muted-foreground",children:"Loading page body..."}):e.jsxs("div",{className:"space-y-6",children:[e.jsx("article",{className:"prose prose-sm max-w-none dark:prose-invert overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:max-w-full",children:e.jsx(Ke,{remarkPlugins:[Je],components:{img:({src:w,alt:S})=>e.jsx("img",{src:w,alt:S,className:"rounded-lg shadow-md max-h-96 object-cover cursor-zoom-in transition-transform hover:scale-[1.01]",onClick:()=>B(w||null)})},children:n.body})}),u&&e.jsxs("div",{className:"border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-lg p-4 mt-6 space-y-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Fe,{className:"h-5 w-5 text-indigo-500"}),e.jsx("h4",{className:"font-bold text-sm text-foreground m-0",children:u.title})]}),e.jsx("div",{className:"space-y-4 divide-y divide-indigo-500/5",children:u.questions.map((w,S)=>{const _=`${n.id}-${S}`,H=G[_],Se=l[_],R=H===w.correctAnswer;return e.jsxs("div",{className:"pt-4 first:pt-0 space-y-2",children:[e.jsxs("p",{className:"text-xs font-semibold text-foreground",children:[S+1,". ",w.question]}),e.jsx("div",{className:"grid gap-2",children:w.options.map((Ne,L)=>e.jsx("button",{type:"button",disabled:f,onClick:()=>je(S,L),className:`text-left text-xs px-3 py-2 border rounded-md transition-all ${H===L?Se?R?"bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium":"bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-medium":"bg-indigo-500/15 border-indigo-500 font-medium":"bg-background border-muted hover:bg-muted/40"}`,children:Ne},L))}),Se&&e.jsxs("div",{className:`text-xs p-2 rounded ${R?"bg-emerald-500/5 text-emerald-600":"bg-rose-500/5 text-rose-600"}`,children:[e.jsx("strong",{children:R?"Correct!":"Incorrect."})," ",w.explanation]})]},S)})}),f?e.jsxs("div",{className:"flex items-center justify-center gap-1.5 py-1 text-emerald-500 text-xs font-semibold",children:[e.jsx(Xe,{className:"h-4 w-4"})," Quiz Completed successfully!"]}):e.jsx(i,{size:"sm",onClick:()=>fe(n.id,u),className:"w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white",children:"Submit Quiz Answers"})]}),e.jsxs("div",{className:"flex justify-between items-center border-t pt-4 mt-6",children:[e.jsx("span",{className:"text-xs text-muted-foreground",children:r?"You read this page ✅":"Finished reading?"}),e.jsx(i,{size:"sm",variant:r?"outline":"default",onClick:()=>Q(n.id),className:"text-xs",children:r?"Mark Unread":"Mark as Read"})]})]})})]},n.id)})})]})]}),U&&e.jsxs("div",{onClick:()=>B(null),className:"fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm",children:[e.jsx("button",{type:"button",className:"absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2",onClick:()=>B(null),children:e.jsx(kt,{className:"h-5 w-5"})}),e.jsx("img",{src:U,alt:"Expanded view",className:"max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"})]})]})}const Lt=[{question:"How do I add a new health facility?",answer:"Adding a facility is reserved for provincial coordinators and national admins (GIS specialists too). If you have that role, open the Facilities page, click 'Add Facility', and fill in the name, HMIS code, district, and GPS coordinates. Facility and district staff won't see the 'Add Facility' button — they can add communities instead (see the community question below)."},{question:"How do I add a new community (village)?",answer:"Open the Facilities page and go to the Communities tab, then click 'Add Community'. Facility staff are automatically pinned to their own facility; district staff can choose any facility in their district; coordinators and admins get a searchable Province → District → Facility picker. You can drop a single pin for the location, or switch to 'Draw Polygon Mode' and click points on the map to draw the community's catchment boundary. The boundary is saved and shown on the map across the app."},{question:"What happens if two communities' boundaries overlap?",answer:"When you save a community boundary that overlaps another community's catchment, VaxPlan shows a 'Catchment overlap detected' panel listing the conflicting communities and how much they overlap. Click 'Request harmonization' next to one to record the conflict and email that community's facility in-charge, so the two facilities can agree on who covers the shared area."},{question:"How does the population fusion work?",answer:"The system combines multiple population data sources (census, health registry, WorldPop estimates, and local surveys) using a weighted algorithm. Each source is given a confidence score, and the system calculates a best estimate based on data recency and reliability."},{question:"How do I read the population heatmap — does it show real people?",answer:"Yes. Turn on the population layer and the coloured cells show the estimated number of people living in each small grid cell (about 100 m × 100 m, roughly one hectare) — the legend reads in people, not an abstract density figure. When you click anywhere on the map, the popup gives you a real headcount: the estimated number of people living within 1 km of that point, worked out by adding up the people in every grid cell nearby. You don't have to convert density to people yourself — the app does the maths so you can plan an outreach session straight from the number."},{question:"What are the vaccine wastage rates used in calculations?",answer:"Each country tenant configures its own vaccine wastage rates. Defaults follow common national immunization program guidelines (e.g. BCG ~40%, MR ~25%, OPV ~25%, TT ~25%, Penta/PCV ~11%, IPV/Rota ~5%) and can be reviewed in the Vaccine Calculator."},{question:"How do I submit data for approval?",answer:"After entering or updating data (population, sessions, budget), change the status to 'Submit for Approval'. The request will be routed to the appropriate level (District Manager, Provincial Coordinator, or National Admin) based on your role and the approval hierarchy."},{question:"What makes a village 'Hard-to-Reach'?",answer:"Villages are classified as HTR based on a composite score considering: distance from facility, terrain difficulty, seasonal accessibility, and historical coverage rates. Each factor is weighted equally (25%) to calculate the final score."},{question:"How do I see travel time and what's near a settlement cluster?",answer:"Open Settlement Intelligence. On any zero-dose cluster card or settlement record, click the compass 'Insights' button. The Geospatial Insights panel shows the travel time to the nearest facility and the nearest existing outreach site on the real road network (each with a driving and a walking estimate, plus the road distance), and the community assets within 3 km — schools, places of worship, markets, water points, transport nodes, pharmacies / drug stores, universities and colleges, government offices, transport & logistics features (airstrips, helipads, ferry terminals, river crossings, bridges, fuel stations, taxi ranks), and vulnerable-population sites (refugee/IDP camps and mining sites) — each with its own coloured icon, pulled live from OpenStreetMap. Outreach sites are often closer to a remote cluster than a fixed facility, so the panel shows whichever is relevant — or both, clearly labelled. While the panel is open, the map also highlights the inspected point and draws the route to each destination — the real road geometry when available, or a dashed straight line when it falls back to an estimate — and marks the nearest facility and outreach site, so you can judge terrain and direction at a glance. If routing is briefly unavailable it falls back to a straight-line estimate (clearly labelled), so the panel always answers. You can also turn on the 'Travel-Time Zones' layer and switch it between Walking (1/2/3-hour zones on foot), Driving (30/60/90-minute zones by vehicle, for vehicle-based outreach and supply runs), and Cycling (30/60/90-minute zones by bicycle or motorbike, for two-wheeler outreach teams) — these are drawn around every active health facility AND every active outreach site (outreach posts are often closer to a remote cluster than a fixed facility), follow the real road and path network when routing is available, and fall back to simple rings if it isn't. On a busy map the zones can overlap a lot, so a second toggle lets you show only Facilities, only Outreach sites, or Both — so you can focus on one access question at a time (both the road-network zones and the fallback rings respect the choice). You can also turn on the 'Community Assets' layer (assets near the map centre) from the Map Layers Control panel. These come from open data and are a planning aid, not a survey — confirm on the ground."},{question:"What is the Outreach Site Suitability Score, and how do I find the best clusters for outreach?",answer:"Open Settlement Intelligence. The left panel has a ranked 'Unserved Population Clusters' list. Every unserved cluster gets a single 0–100 Outreach Site Suitability Score that tells you how good a candidate it is for a new outreach session — higher is stronger. The score combines six factors, each shown as its own bar so you can see exactly why a cluster scored the way it did: population size (more unserved people = more impact), likely zero-dose children (the core equity target — clusters with more estimated never-vaccinated children score higher), distance from the nearest facility (the farther, the bigger the access gap), the gap from any existing outreach site you already run (so you don't double up), road access / travel time (a site a team can actually reach scores higher), and a nearby landmark or venue (a school, place of worship or market makes a natural place to hold the session). The list ranks clusters by score by default; use the Sort dropdown to re-order by population, zero-dose children, distance to facility, outreach gap or travel time instead. Anything still being measured is clearly marked 'est.'. Click Insights on a cluster to refine the score live with the real road-network travel time and the landmarks actually found nearby — Insights also shows the estimated under-5 and likely zero-dose children. Locate centres the map on the cluster, and (for facility staff who can author plans) 'Plan session' jumps straight to Session Planning, pre-filled for that cluster. To see the same scored clusters plotted on the map, turn on the 'Ranked Clusters' layer in the Map Layers Control panel — each pin is colour-graded by band (green = high, amber = medium, grey = low) and its popup shows the score, population, likely zero-dose children, distance to the nearest facility and outreach gap, with the same Locate, Insights and Plan session actions. It's a planning view only — it never changes any data and only shows clusters for your country."},{question:"How does offline mode work?",answer:"The app caches your reference data on the device, so you can view and edit while offline. Anything you create or change goes into an outbox and syncs automatically when you're back online — including in the background, even if you've closed the tab (on devices that support it). Watch the sync badge in the header for your current status and pending count."},{question:"How do I sync my changes manually?",answer:"The sync badge in the top-right of the header is always visible. Whenever you're online, tap it to push your outbox to the server and pull down any new data right away — whether you have items queued or just want a refresh. While you're offline it shows your pending count and syncs automatically once you're back online."},{question:"Why did my screen update on its own?",answer:"When you're online, VaxPlan keeps a lightweight live connection open. If a colleague (or you on another device) changes something for your facility, your screen refreshes within a few seconds — no manual reload needed. If that connection drops, the app quietly falls back to periodic checks."},{question:"I'm using the Windows or Android app — how do I get new features?",answer:"Your data always syncs with the server, but the screens and features in the installed Windows/Android apps come from the version you installed. When a newer version is published, a banner appears at the top of the app. On the web, tap 'Reload'. In the Windows app the update installs automatically the next time you restart it; in the Android app, tap 'Download update' to install the newest build. Until you update, you'll keep seeing the older screens even though your data is current."},{question:"Who can see my facility's data?",answer:"Data is scoped to your place in the hierarchy. Facility staff see only their own facility's facilities, villages, population, microplans, sessions, and reports. District managers see their district, provincial coordinators their province, and national admins the whole country. You can't open a record belonging to a facility outside your area, even with a direct link."},{question:"Can I work in more than one country?",answer:"No — every account belongs to exactly one country and can only ever access that country, national admins included. There's no way to view or edit another country's data. The only exception is a Super Admin, who can access and switch between all countries using the switcher at the top of the screen (everyone else never sees that switcher). A Super Admin can also make another user a Super Admin from that user's edit screen, under 'Super Admin access'."},{question:"Who can add a new country to VaxPlan?",answer:"Only a Super Admin can onboard a new country. Country administrators (national admins) manage their own country only and cannot create new ones — the Country Onboarding screen is hidden from everyone except Super Admins. That screen includes a built-in step-by-step guide covering how to register the country, load its boundaries and reference data, and set up the first national admin. If you need a new country added, contact your platform Super Admin."},{question:"Who can create microplans and session plans?",answer:"Day-to-day microplan and session-plan authoring belongs to facility staff (Facility Clerk and Facility In-charge), keeping accountability with the people who run the sessions. National admins can also author when setting up or correcting a country's data. District and provincial roles are reviewers and approvers only — they review and approve plans but do not author them."},{question:"How do I add itinerary days to a session?",answer:"Open the session and use 'Add Vaccination Session Itinerary Day'. Each day needs a lead vaccinator's name, a session date at least 7 days ahead, a target population, and at least one community ticked (or quick-added from the map). The 'Calculated Vaccine Supplies' panel estimates realistic doses per antigen from your target population (target × doses-per-child × wastage), so ~50 children yields tens of doses — not thousands. If a day won't save, the error names the field that needs fixing (for example, the missing lead vaccinator or a date that's too soon)."},{question:"How do I schedule and run a supervision visit?",answer:"Open Supervision and click 'Schedule Visit'. Pick the facility, date, and supervisor, and choose which checklist to use — the built-in WHO checklist or any custom one your national admin has set up. When the supervisor arrives, they open the visit. At the top a progress bar shows how many questions are answered and the live score updates as you go. A 'Visit location' card lets you confirm where the visit happened with a smart Province → District → Health Facility picker plus an interactive map — tap the map to drop a pin, drag it to fine-tune, or tap 'Use my location' to place it from the device's GPS. Then answer the checklist questions (Yes/No, True/False, text, number, choices, rating, date, GPS location picked the same way on a map, or a photo) and record findings and follow-up actions. Some questions are follow-ups that only appear after a certain answer, and some are repeatable — tap 'Add another' to record one entry per vaccinator, session, or child. The score is the average of the scored questions (Yes/No and True/False, plus any ratings the author chose to count); every repeated entry is included."},{question:"Can I build my own supervision checklist?",answer:"Yes — national admins can. Open Supervision and click 'Manage Checklists', then 'New checklist'. Give it a name and add questions, choosing a type for each (Yes/No, True/False, short text, number, single choice, multiple choice, rating, date, GPS location, or photo). Each question is highly configurable: click 'Add a follow-up question' under any question to branch off a follow-up that only appears when this question gets a certain answer (any question can have follow-ups, including the first one, and you can 'Detach' one later), allow multiple entries (a repeat, with an optional name and limit per entry), and decide whether it counts toward the visit score. Mark the checklist Active and everyone in the country can pick it when scheduling a visit. Only national admins can create, edit, or delete the checklists."},{question:"How do I change or reset my password?",answer:"To change your own password, click your name in the top-right corner and choose 'Change password'. Enter your current password (leave it blank if you've never set one — for example if you normally sign in through your organisation's single sign-on), then type your new password twice. Passwords must be at least 8 characters. If you've forgotten your password, click 'Forgot password?' on the sign-in screen and enter your email — your administrator is notified so they can set a new one for you and share it securely. National and platform administrators can also set an initial password when creating a user, and reset any user's password from that user's edit screen under 'Reset Password'. National admins can only set passwords for users in their own country, so these controls are hidden while viewing another country."},{question:"What is the number next to my name at the top?",answer:"That's a live count of how many people are online in your country right now — anyone with the app open in the last few minutes. The app sends a quiet heartbeat while your tab is open, so you stay counted even if you pause on one page without clicking around. It sits beside your profile in the header with a small green dot and refreshes on its own. It's just a count; the detailed 'who's online' list stays with administrators on the Site activity panel."},{question:"Where can I see a full list of everything VaxPlan can do?",answer:"Open the Standards Alignment page from the sidebar and look at the 'Features' tab. It lists every feature currently in the platform — grouped by area (dashboards, microplanning, vaccines & stock, maps & GIS, supervision, users & access, offline & sync, security, and more) — in plain language. Use the filter box on that page to jump straight to anything."},{question:"Where does the map, boundary, population, and facility data come from?",answer:"Open the Data Sources page from the sidebar (it's near Settings and Help) — there's also a link to it under 'External Resources' on this Help page, and you can tap the small 'Data sources' link in the credit at the bottom-right corner of any map to jump straight there. It lists every external source VaxPlan uses, grouped by category: map tiles (OpenStreetMap, satellite imagery), administrative boundaries (geoBoundaries, GADM, UN OCHA/HDX), population and demographics (national census, WorldPop, HMIS, community surveys), health facilities and information systems (national master facility lists, DHIS2), immunization guidance (WHO, UNICEF, Gavi), and the open-source software, fonts, and icons behind the app. Each entry shows a short description, its licence, and a link to the original source. If your country has population sources set up, they're shown at the top so you can see exactly which datasets feed your calculations. The page also carries the acknowledgements crediting these providers, plus a map boundary disclaimer: the credit at the bottom-right of every map notes that boundaries are approximate, for reference only, and don't imply endorsement, and that disputed areas are not authoritatively depicted — the full statement, including how disputed regions are handled, is in the acknowledgements. This page is public — anyone can view it at /data-sources without signing in (there's also a link in the footer of the public landing page), so data providers can confirm they're properly credited."},{question:"How do I see who's online and how the site is being used?",answer:"National and platform administrators have a 'Site activity' panel on the dashboard. It shows who is online right now (with their role, current page, and the city/country they're signed in from), a live map pinning where those users are, how many visits there were today, a 14-day visits trend, your most-visited pages, and a breakdown of login locations. Platform super admins get full detail: tap any person to see their email, IP address, device, and exact coordinates. If a user allows location access in their browser, the map uses their device's real GPS position; otherwise it falls back to a best-effort estimate from the network address (which often only resolves to the nearest large city). The panel refreshes on its own every 30 seconds."},{question:"How do I use the new Remote Sensing & Spatial Gap Analysis capabilities?",answer:"VaxPlan includes active satellite remote sensing integration. The spatial gap analysis automatically isolates unserved settlement footprints ('geographical black holes') by subtracting active clinic and outreach isochrones from high-resolution Google Open Buildings vector layers. The DBSCAN clustering engine dynamically groups these unserved building coordinates into 'Zero-Dose Hotspots' and prioritizes them by total density, distance, and historical coverage. You can also view Sentinel-1 SAR monsoonal flood risks and SRTM digital elevation slope warnings directly on scheduled outreach dates in Step 4 of the Microplan Wizard to identify environmental transit hazards before sending health teams."},{question:"How do I generate a report?",answer:"Open the Reports module from the Analytics section of the sidebar (look for the bar-chart icon). The Reports page has eight report tabs: Sessions, Microplans, Zero-Dose Communities, Missed Communities, Vaccination Coverage, Hard-to-Reach, Budget, and Supervision. Use the filter bar at the top to choose a year, quarter, and geographic scope (province, district, and facility). All reports update automatically when you change a filter. To download data, click the Export button in the top-right corner and choose Excel (.xlsx) or CSV. The data you see matches exactly what will be in the export."},{question:"What is the difference between a Zero-Dose Community report and a Missed Communities report?",answer:"The Zero-Dose Communities report shows villages that have never had a completed or achieved vaccination session linked to them — they are entirely outside the planned service area. These are the most under-served communities with the highest equity risk. The Missed Communities report is different: it shows villages that were included in a session plan but the session was not marked as achieved — meaning a plan existed but delivery failed. Both reports are hierarchical and show facility, district, and province totals. Addressing zero-dose communities requires planning a new session; addressing missed communities requires understanding why the scheduled session failed."},{question:"How does the hierarchical aggregation work in reports?",answer:"All reports aggregate data in the chain: Facility → District → Province → National. When you open a report at national level, you see every province's total. Click a province row to expand it and see each district inside that province. Click a district to expand its facilities. Each level's total is the true arithmetic sum of everything beneath it — no double-counting. Your access scope is enforced automatically: if you are a Facility In-charge, you only see data for your own facility; District Managers see their district and its facilities; Provincial Coordinators see their province; National Admins see everything. The filters (province, district, facility dropdowns) let you narrow the view further, but they can never show you data outside your assigned scope."},{question:"How do I use the new Global Search and command menu?",answer:"VaxPlan includes a persistent search bar in the top layout header next to the Sidebar Trigger toggle. Click it or press 'Ctrl+K' / 'Cmd+K' from anywhere to launch the global command palette. You can search for dashboard parameters, microplanning wizards, user management, and other navigation routes. It also supports quick actions like theme-switching and logging out. All search options are role-gated and module-gated; if a feature is disabled for your tenant or disallowed for your role, it will not appear in the results."},{question:"How do I configure and save the coordinates of an outreach post for a community?",answer:"To persistent-configure the outreach site for any village catchment, go to the Map View, click the village pin, and select 'Configure' under the Outreach Post section in the popup. A configuration dialog opens, allowing you to name the site, manually key in coordinates, auto-fill coordinates from the village centroid, capture live coordinates from your device's GPS, or choose 'Select on Map' to click a point directly. The site is marked with a high-contrast violet pin connected to the village centroid by a dashed line. This information is saved to PostgreSQL (with full offline outbox replay and local Dexie IndexedDB caching) so it is persistently available."},{question:"How does VaxPlan classify Due, Overdue, and Missed vaccination statuses?",answer:"VaxPlan strictly follows WHO/UNICEF/GAVI guidelines to monitor routine immunization cohorts and child safety limits: (1) 'Given': Dose is already logged. (2) 'Due': Target age reached, but child is within a 4-week grace period. (3) 'Overdue': Child is 4 weeks or more past the due date but still eligible. (4) 'Missed': The child has exceeded the upper safety age limit for the vaccine (e.g. OPV 0 is missed after 28 days; Rotavirus 1 after 15 weeks; Rotavirus 2 & 3 after 24 weeks; other infant series after 12 months; MR 2 after 24 months). In the Immunization Card, missed doses display a grey/red warning badge. The AI panel displays contraindicated missed doses separately so clinicians know not to administer them, while infant cohort-missed doses remain listed with recommended catch-up spacing actions."},{question:"How does SMS and WhatsApp messaging work?",answer:"VaxPlan natively integrates the Twilio SDK to send automated appointment reminders, session schedules, and catch-up alerts via SMS and WhatsApp directly to parents and community leaders. To activate real messaging on your server, open the 'Settings' page from the sidebar, scroll to 'Communication Settings', and securely enter your Twilio Account SID, Auth Token, and Sender Number (or Sandbox Number for WhatsApp). All messages are securely routed through a background Redis queue to ensure no messages are lost and to provide automatic fallback from WhatsApp to SMS if delivery fails."},{question:"Are the WorldPop and ArcGIS satellite maps available offline, even across borders?",answer:"Yes! VaxPlan employs a robust background Service Worker that automatically pre-caches both ArcGIS Satellite Imagery base maps and WorldPop Settlement Overlays as soon as your device connects to the internet. We've significantly expanded the offline tile capacity (up to 2,500 tiles), ensuring that even if you zoom out or pan to unserved settlements located across national borders, your map layers remain fully intact and interactive when you subsequently go offline."},{question:"How does the VPD Surveillance Module work?",answer:"The VPD Surveillance Module allows facility staff and coordinators to report and track Vaccine-Preventable Diseases (e.g., AFP, Measles, Neonatal Tetanus). Suspected cases are logged with onset dates and locations. When a disease triggers an alert threshold, the Unified Communication Engine immediately dispatches real-time notifications via WhatsApp, SMS, and Email to district managers and provincial coordinators. National admins can configure custom linelist templates to capture extended disease-specific data."},{question:"How does the Idle Timeout security feature work?",answer:"To protect sensitive Patient Identifying Data (PID), the system enforces an idle timeout. If there is no activity (mouse movement, keyboard input, or touches) for the configured number of minutes, you will be automatically logged out. National admins can adjust this duration in the tenant's security settings."},{question:"How do I perform bulk actions on staff, cold chain equipment, and communities?",answer:"To save time, VaxPlan lets you select multiple items in tables and update them at the same time. Open the Staff, Cold Chain, or Communities tables and tick the checkboxes on the left side of the rows (or tick the header box to select all). A floating bar will appear at the bottom of the screen with quick bulk actions. Depending on the page, you can bulk delete, bulk update conditions/status, change transport modes, or reassign communities to another health facility. All updates are sent in batches of 10 to keep the system fast and responsive."},{question:"How does the Cold Chain Equipment Inventory work?",answer:"Every facility can track its immunization cold chain inventory (refrigerators, freezers, solar direct drive units, vaccine carriers, and generators). Go to Facilities, click your facility, and select the 'Cold Chain' tab. Here you can add new equipment, edit specs (like capacity in litres, temperature limits, and PQS codes), record service dates, or delete retired units. You can also import equipment lists from a CSV file, or export the inventory as a CSV or special IGA (Inventory and Gap Analysis) JSON file to share with other tools."},{question:"What features are available in the new Saved Microplans table?",answer:"In the Routine or Campaigns microplan list, your saved plans are displayed in a clean table rather than cards. You can sort plans by name, period, or status by clicking the column headers. The table is paginated, has page size selectors (10, 20, 50 rows), and displays live counters of planned and completed sessions. Tap the 'Open' button or click the plan name to load its step-by-step editing wizard."}],Yt=[{title:"Facility Management",icon:Pt,path:"/facilities"},{title:"Population Data",icon:Tt,path:"/population"},{title:"Session Planning",icon:qt,path:"/sessions"},{title:"Vaccine Calculator",icon:It,path:"/vaccines"},{title:"Reports",icon:Ve,path:"/reports"}],Bt={email:"",phone:"",hours:"Monday – Friday, business hours (your local time)"},Qt=[{title:"Getting Started",description:"Basic navigation and setup",badge:"Beginner"},{title:"Data Entry Guide",description:"How to enter and validate data",badge:"Essential"},{title:"Map Operations",description:"Using the GIS mapping features",badge:"Intermediate"},{title:"Approval Workflows",description:"Understanding the approval process",badge:"Advanced"}],_t=[{name:"Data Sources & Acknowledgements",url:"/data-sources"},{name:"VaxPlan — Microplanning Workflow (WHO RED + Gavi RED-Q)",url:"/docs/microplanning-workflow.md"},{name:"WHO Immunization Guidelines",url:"https://www.who.int/teams/immunization-vaccines-and-biologicals"},{name:"National Health Plan Guideline",url:"https://www.health.gov"},{name:"EPI Program Reference Manual",url:"https://www.cdc.gov/vaccines/imz-managers/index.html"}],$t=[];function pe({onUploadComplete:p,initialUrl:g=""}){const[b,v]=o.useState(g);return e.jsx(m,{type:"url",value:b,onChange:a=>{v(a.target.value),p(a.target.value)},placeholder:"https://… link to a PDF or web page",className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})}function ln(){var $e;const{user:p}=jt(),{toast:g}=St(),[,b]=Nt(),v=Ct(),{data:a}=We({queryKey:["/api/me/tenant"],retry:!1}),h=(($e=a==null?void 0:a.settings)==null?void 0:$e.help)||{},c=h.faqs||Lt,y=h.support||Bt,k=h.guides||Qt,z=h.resources||_t,G=h.videos||$t,j=(p==null?void 0:p.role)==="national_admin",l=At({mutationFn:async t=>await Mt("PATCH","/api/me/tenant",t),onSuccess:()=>{v.invalidateQueries({queryKey:["/api/me/tenant"]}),g({title:"Help Center Configuration Saved",description:"Help resources, guides, support details, and FAQs updated successfully."})},onError:t=>{g({title:"Update Failed",description:t.message,variant:"destructive"})}}),[be,U]=o.useState(!1),[B,O]=o.useState(!1),[F,me]=o.useState(null),[V,x]=o.useState(!1),[ge,W]=o.useState(!1),[ke,Q]=o.useState(!1),[je,fe]=o.useState(null),[n,r]=o.useState(!1),[u,f]=o.useState(!1),[w,S]=o.useState(null),[_,H]=o.useState(!1),[Se,R]=o.useState(!1),[Ne,L]=o.useState(null),[$,Z]=o.useState(""),[K,J]=o.useState(""),[Ce,ye]=o.useState(""),[He,Le]=o.useState(""),[Ye,Be]=o.useState(""),[Qe,_e]=o.useState(""),[X,ee]=o.useState(""),[te,ne]=o.useState(""),[Ae,ae]=o.useState(""),[Pe,xe]=o.useState(""),[re,se]=o.useState(""),[oe,ie]=o.useState(""),[le,de]=o.useState(""),[ce,ue]=o.useState(""),[Te,he]=o.useState(""),st=()=>{if(!$.trim()||!K.trim()){g({title:"Validation Error",description:"Please fill out both the question and the answer.",variant:"destructive"});return}const t=[...c,{question:$,answer:K,documentUrl:Ce}],s={...a==null?void 0:a.settings,help:{...h,faqs:t}};l.mutate({settings:s}),U(!1),Z(""),J(""),ye("")},ot=()=>{if(F===null||!$.trim()||!K.trim()){g({title:"Validation Error",description:"Please fill out both the question and the answer.",variant:"destructive"});return}const t=[...c];t[F]={question:$,answer:K,documentUrl:Ce};const s={...a==null?void 0:a.settings,help:{...h,faqs:t}};l.mutate({settings:s}),O(!1),me(null),Z(""),J(""),ye("")},it=t=>{const s=c.filter((ze,Y)=>Y!==t),N={...a==null?void 0:a.settings,help:{...h,faqs:s}};l.mutate({settings:N})},lt=()=>{const t={...a==null?void 0:a.settings,help:{...h,support:{email:He.trim(),phone:Ye.trim(),hours:Qe}}};l.mutate({settings:t}),x(!1)},dt=()=>{if(!X.trim()||!te.trim()){g({title:"Validation Error",description:"Please fill out both the guide title and description.",variant:"destructive"});return}const t=[...k,{title:X,description:te,badge:Ae||"Beginner",documentUrl:Pe}],s={...a==null?void 0:a.settings,help:{...h,guides:t}};l.mutate({settings:s}),W(!1),ee(""),ne(""),ae(""),xe("")},ct=()=>{if(je===null||!X.trim()||!te.trim()){g({title:"Validation Error",description:"Please fill out both the guide title and description.",variant:"destructive"});return}const t=[...k];t[je]={title:X,description:te,badge:Ae||"Beginner",documentUrl:Pe};const s={...a==null?void 0:a.settings,help:{...h,guides:t}};l.mutate({settings:s}),Q(!1),fe(null),ee(""),ne(""),ae(""),xe("")},ut=t=>{const s=k.filter((ze,Y)=>Y!==t),N={...a==null?void 0:a.settings,help:{...h,guides:s}};l.mutate({settings:N})},ht=()=>{if(!re.trim()||!oe.trim()){g({title:"Validation Error",description:"Please fill out both the resource name and URL link.",variant:"destructive"});return}const t=[...z,{name:re,url:oe}],s={...a==null?void 0:a.settings,help:{...h,resources:t}};l.mutate({settings:s}),r(!1),se(""),ie("")},pt=()=>{if(w===null||!re.trim()||!oe.trim()){g({title:"Validation Error",description:"Please fill out both the resource name and URL link.",variant:"destructive"});return}const t=[...z];t[w]={name:re,url:oe};const s={...a==null?void 0:a.settings,help:{...h,resources:t}};l.mutate({settings:s}),f(!1),S(null),se(""),ie("")},mt=t=>{const s=z.filter((ze,Y)=>Y!==t),N={...a==null?void 0:a.settings,help:{...h,resources:s}};l.mutate({settings:N})},gt=()=>{if(!le.trim()||!ce.trim()){g({title:"Validation Error",description:"Please fill out both the video title and duration.",variant:"destructive"});return}const t=[...G,{title:le,duration:ce,url:Te}],s={...a==null?void 0:a.settings,help:{...h,videos:t}};l.mutate({settings:s}),H(!1),de(""),ue(""),he("")},ft=()=>{if(Ne===null||!le.trim()||!ce.trim()){g({title:"Validation Error",description:"Please fill out both the video title and duration.",variant:"destructive"});return}const t=[...G];t[Ne]={title:le,duration:ce,url:Te};const s={...a==null?void 0:a.settings,help:{...h,videos:t}};l.mutate({settings:s}),R(!1),L(null),de(""),ue(""),he("")},yt=t=>{const s=G.filter((ze,Y)=>Y!==t),N={...a==null?void 0:a.settings,help:{...h,videos:s}};l.mutate({settings:N})};return e.jsxs("div",{className:"p-6 space-y-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Help & Support Hub"}),e.jsx("p",{className:"text-muted-foreground text-sm",children:"Find answers, review guides, access external WHO resources, and get assistance with VaxPlan"})]}),e.jsx(Ht,{isFacilityRole:(p==null?void 0:p.role)==="facility_clerk"||(p==null?void 0:p.role)==="facility_in_charge"}),e.jsxs("div",{className:"grid lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsxs(D,{children:[e.jsx(E,{className:"pb-3 border-b",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("h3",{className:"text-lg font-bold flex items-center gap-2 text-foreground",children:[e.jsx(Fe,{className:"h-5 w-5 text-indigo-500"}),"Knowledge Base FAQ Module"]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Direct access to dynamic troubleshooting FAQs and answers."})]}),j&&e.jsxs(i,{size:"sm",className:"h-8 font-semibold flex items-center gap-1.5",onClick:()=>{Z(""),J(""),U(!0)},"data-testid":"btn-add-faq",children:[e.jsx(qe,{className:"h-3.5 w-3.5"}),"Add FAQ"]})]})}),e.jsx(M,{className:"pt-4",children:c.length===0?e.jsx("div",{className:"py-6 text-center text-sm text-muted-foreground",children:"No FAQs configured for this country."}):e.jsx(tt,{type:"single",collapsible:!0,className:"w-full",children:c.map((t,s)=>e.jsxs(nt,{value:`faq-${s}`,children:[e.jsx(at,{className:"text-left text-sm font-medium hover:text-indigo-500 dark:hover:text-indigo-400",children:t.question}),e.jsxs(rt,{className:"text-sm text-muted-foreground space-y-3 pt-1",children:[e.jsx("p",{className:"leading-relaxed text-foreground/80",children:t.answer}),t.documentUrl&&e.jsx("div",{className:"mt-2",children:e.jsxs("a",{href:t.documentUrl,target:"_blank",rel:"noreferrer",className:"inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 hover:underline mt-1",children:[e.jsx(Ve,{className:"h-3.5 w-3.5"}),"View Reference Attachment Document"]})}),j&&e.jsxs("div",{className:"flex items-center justify-end gap-2 pt-2 border-t border-border/40",children:[e.jsxs(i,{size:"sm",variant:"outline",className:"h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1",onClick:()=>{me(s),Z(t.question),J(t.answer),ye(t.documentUrl||""),O(!0)},"data-testid":`btn-edit-faq-${s}`,children:[e.jsx(ve,{className:"h-3 w-3"}),"Edit FAQ"]}),e.jsxs(i,{size:"sm",variant:"outline",className:"h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 flex items-center gap-1",onClick:()=>it(s),"data-testid":`btn-delete-faq-${s}`,children:[e.jsx(Me,{className:"h-3 w-3"}),"Delete"]})]})]})]},s))})})]}),e.jsxs(D,{children:[e.jsx(E,{className:"pb-3 border-b",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("h3",{className:"text-lg font-bold flex items-center gap-2 text-foreground",children:[e.jsx(Ge,{className:"h-5 w-5 text-indigo-500"}),"User Guides"]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Download and read instructions for program staff."})]}),j&&e.jsxs(i,{size:"sm",className:"h-8 font-semibold flex items-center gap-1.5",onClick:()=>{ee(""),ne(""),ae("Beginner"),W(!0)},"data-testid":"btn-add-guide",children:[e.jsx(qe,{className:"h-3.5 w-3.5"}),"Add Guide"]})]})}),e.jsx(M,{className:"pt-4",children:e.jsx("div",{className:"grid sm:grid-cols-2 gap-4",children:k.map((t,s)=>e.jsx("div",{className:"relative p-4 rounded-xl border hover:bg-muted/10 transition-all duration-200 group flex flex-col justify-between",children:e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-start justify-between gap-2 mb-2",children:[e.jsx(Ve,{className:"h-5 w-5 text-indigo-500 flex-shrink-0"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Re,{variant:"outline",className:"text-[10px] px-2 py-0.5 rounded",children:t.badge}),j&&e.jsxs("div",{className:"opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150",children:[e.jsx(i,{size:"icon",variant:"ghost",className:"h-6 w-6 text-muted-foreground hover:text-foreground",onClick:N=>{N.stopPropagation(),fe(s),ee(t.title),ne(t.description),ae(t.badge),xe(t.documentUrl||""),Q(!0)},children:e.jsx(ve,{className:"h-3 w-3"})}),e.jsx(i,{size:"icon",variant:"ghost",className:"h-6 w-6 text-muted-foreground hover:text-destructive",onClick:N=>{N.stopPropagation(),ut(s)},children:e.jsx(Me,{className:"h-3 w-3"})})]})]})]}),e.jsx("p",{className:"font-semibold text-sm text-foreground",children:t.title}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1 leading-relaxed",children:t.description}),t.documentUrl&&e.jsx("div",{className:"mt-3",children:e.jsxs(i,{variant:"outline",size:"sm",className:"h-7 px-2.5 text-xs text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/10 flex items-center gap-1.5 rounded-lg",onClick:()=>window.open(t.documentUrl,"_blank"),children:[e.jsx(Ve,{className:"h-3 w-3"}),"View Reference Document"]})})]})},s))})})]}),e.jsxs(D,{children:[e.jsx(E,{className:"pb-3 border-b",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("h3",{className:"text-lg font-bold flex items-center gap-2 text-foreground",children:[e.jsx(Oe,{className:"h-5 w-5 text-indigo-500"}),"Video Tutorials"]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Watch and learn from instructional video walk-throughs."})]}),j&&e.jsxs(i,{size:"sm",className:"h-8 font-semibold flex items-center gap-1.5",onClick:()=>{de(""),ue(""),he(""),H(!0)},"data-testid":"btn-add-video",children:[e.jsx(qe,{className:"h-3.5 w-3.5"}),"Add Video"]})]})}),e.jsx(M,{className:"pt-4",children:e.jsx("div",{className:"space-y-3",children:G.map((t,s)=>e.jsxs("div",{className:"group flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/10 transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center",children:e.jsx(Oe,{className:"h-4 w-4 text-indigo-500"})}),e.jsxs("div",{className:"flex flex-col",children:[e.jsx("span",{className:"font-semibold text-sm text-foreground",children:t.title}),t.url&&e.jsxs("a",{href:t.url,target:"_blank",rel:"noreferrer",className:"text-[11px] text-indigo-500 hover:underline flex items-center gap-1 mt-0.5",children:[e.jsx(De,{className:"h-2.5 w-2.5"}),"Watch Video Asset"]})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Re,{variant:"secondary",className:"text-xs font-semibold",children:t.duration}),j&&e.jsxs("div",{className:"opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150",children:[e.jsx(i,{size:"icon",variant:"ghost",className:"h-7 w-7 text-muted-foreground hover:text-foreground",onClick:()=>{L(s),de(t.title),ue(t.duration),he(t.url||""),R(!0)},children:e.jsx(ve,{className:"h-3.5 w-3.5"})}),e.jsx(i,{size:"icon",variant:"ghost",className:"h-7 w-7 text-muted-foreground hover:text-destructive",onClick:()=>yt(s),children:e.jsx(Me,{className:"h-3.5 w-3.5"})})]})]})]},s))})})]})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs(D,{children:[e.jsx(E,{children:e.jsx(we,{className:"text-lg",children:"Quick Links"})}),e.jsx(M,{className:"space-y-2",children:Yt.map(t=>e.jsxs(i,{variant:"ghost",className:"w-full justify-start text-foreground/80 hover:text-foreground",onClick:()=>b(t.path),"data-testid":`link-${t.title.toLowerCase().replace(/\s+/g,"-")}`,children:[e.jsx(t.icon,{className:"h-4 w-4 mr-2 text-indigo-500"}),t.title]},t.path))})]}),e.jsxs(D,{children:[e.jsxs(E,{className:"pb-3 border-b flex flex-row items-center justify-between gap-4",children:[e.jsxs(we,{className:"text-lg flex items-center gap-2 text-foreground",children:[e.jsx(Ue,{className:"h-5 w-5 text-indigo-500"}),"Contact Support"]}),j&&e.jsx(i,{size:"icon",variant:"ghost",className:"h-8 w-8 text-muted-foreground hover:text-foreground",onClick:()=>{Le(y.email),Be(y.phone),_e(y.hours||""),x(!0)},"data-testid":"btn-edit-support",children:e.jsx(ve,{className:"h-4 w-4"})})]}),e.jsx(M,{className:"space-y-4 pt-4",children:y.email||y.phone?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"p-4 rounded-lg bg-muted/50 space-y-3",children:[y.email&&e.jsxs("div",{className:"flex items-center gap-2 text-sm text-foreground",children:[e.jsx(Dt,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{children:y.email})]}),y.phone&&e.jsxs("div",{className:"flex items-center gap-2 text-sm text-foreground",children:[e.jsx(Ot,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{children:y.phone})]})]}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Support hours: ",y.hours]}),y.email&&e.jsxs(i,{className:"w-full","data-testid":"button-contact-support",onClick:()=>window.location.href=`mailto:${y.email}`,children:[e.jsx(Ue,{className:"h-4 w-4 mr-2"}),"Send Email"]})]}):e.jsx("p",{className:"text-sm text-muted-foreground",children:"Support contact details have not been added yet. Your VaxPlan administrator can add them here."})})]}),e.jsxs(D,{children:[e.jsx(E,{className:"pb-3 border-b",children:e.jsxs("div",{className:"flex items-center justify-between gap-4 flex-wrap",children:[e.jsx(we,{className:"text-lg text-foreground",children:"External Resources"}),j&&e.jsxs(i,{size:"sm",className:"h-8 font-semibold flex items-center gap-1.5",onClick:()=>{se(""),ie(""),r(!0)},"data-testid":"btn-add-resource",children:[e.jsx(qe,{className:"h-3.5 w-3.5"}),"Add Link"]})]})}),e.jsx(M,{className:"space-y-2 pt-4",children:z.map((t,s)=>e.jsxs("div",{className:"flex items-center gap-2 w-full group",children:[e.jsxs(i,{variant:"outline",className:"flex-1 justify-between text-left truncate text-foreground hover:bg-muted/30",onClick:()=>window.open(t.url,"_blank"),"data-testid":`link-${t.name.toLowerCase().replace(/\s+/g,"-")}`,children:[e.jsx("span",{className:"text-sm truncate",children:t.name}),e.jsx(De,{className:"h-3 w-3 flex-shrink-0 text-muted-foreground"})]}),j&&e.jsxs("div",{className:"opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity",children:[e.jsx(i,{size:"icon",variant:"ghost",className:"h-8 w-8 text-muted-foreground hover:text-foreground",onClick:()=>{S(s),se(t.name),ie(t.url),f(!0)},children:e.jsx(ve,{className:"h-3.5 w-3.5"})}),e.jsx(i,{size:"icon",variant:"ghost",className:"h-8 w-8 text-muted-foreground hover:text-destructive",onClick:()=>mt(s),children:e.jsx(Me,{className:"h-3.5 w-3.5"})})]})]},s))})]})]})]}),e.jsx(C,{open:V,onOpenChange:x,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Ue,{className:"h-5 w-5 text-indigo-500"}),"Edit Support Contact Information"]}),e.jsx(q,{className:"text-muted-foreground",children:"Modify the central help desk email and phone support details. Changes are persisted into the active tenant's settings database."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"support-email",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Support Email"}),e.jsx(m,{id:"support-email",placeholder:"e.g. support@health.gov",value:He,onChange:t=>Le(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"support-phone",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Support Phone Number"}),e.jsx(m,{id:"support-phone",placeholder:"e.g. +675 301 3601",value:Ye,onChange:t=>Be(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"support-hours",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Working Support Hours"}),e.jsx(m,{id:"support-hours",placeholder:"e.g. Monday - Friday, 8:00 AM - 4:00 PM",value:Qe,onChange:t=>_e(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>x(!1),className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:lt,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Saving...":"Save Support Info"})]})]})}),e.jsx(C,{open:be,onOpenChange:U,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Fe,{className:"h-5 w-5 text-indigo-500"}),"Add Help FAQ"]}),e.jsx(q,{className:"text-muted-foreground",children:"Configure a new frequently asked question. It will be saved into the PostgreSQL settings table for this tenant."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"add-question",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Question"}),e.jsx(m,{id:"add-question",placeholder:"e.g. How do I request a new user role?",value:$,onChange:t=>Z(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl","data-testid":"input-faq-question"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"add-answer",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Answer"}),e.jsx(Ie,{id:"add-answer",placeholder:"Provide a detailed instructions answer...",value:K,rows:5,onChange:t=>J(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl","data-testid":"input-faq-answer"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"add-faq-doc-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Reference Document Attachment URL"}),e.jsx(pe,{initialUrl:Ce,onUploadComplete:t=>ye(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>U(!1),className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:st,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Adding...":"Add FAQ"})]})]})}),e.jsx(C,{open:B,onOpenChange:O,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Fe,{className:"h-5 w-5 text-indigo-500"}),"Edit Help FAQ"]}),e.jsx(q,{className:"text-muted-foreground",children:"Modify this frequently asked question. Changes will reflect instantly inside the system Help Center."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"edit-question",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Question"}),e.jsx(m,{id:"edit-question",value:$,onChange:t=>Z(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl","data-testid":"edit-faq-question"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"edit-answer",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Answer"}),e.jsx(Ie,{id:"edit-answer",value:K,rows:5,onChange:t=>J(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl","data-testid":"edit-faq-answer"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"edit-faq-doc-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Reference Document Attachment URL"}),e.jsx(pe,{initialUrl:Ce,onUploadComplete:t=>ye(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>{O(!1),me(null)},className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:ot,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Saving...":"Save Changes"})]})]})}),e.jsx(C,{open:ge,onOpenChange:W,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Ge,{className:"h-5 w-5 text-indigo-500"}),"Add User Guide"]}),e.jsx(q,{className:"text-muted-foreground",children:"Configure a new instructional booklet or guide card for active VaxPlan platform users."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-add-title",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Guide Title"}),e.jsx(m,{id:"guide-add-title",placeholder:"e.g. Microplanning Reference Manual",value:X,onChange:t=>ee(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-add-desc",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Description"}),e.jsx(Ie,{id:"guide-add-desc",placeholder:"e.g. Detailed step-by-step for GIS operations...",value:te,onChange:t=>ne(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl",rows:3})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-add-badge",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Difficulty Badge"}),e.jsx(m,{id:"guide-add-badge",placeholder:"e.g. Essential, Intermediate, Advanced",value:Ae,onChange:t=>ae(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-add-doc-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Upload Guide Reference Document URL"}),e.jsx(pe,{initialUrl:Pe,onUploadComplete:t=>xe(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>W(!1),className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:dt,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Adding...":"Add Guide"})]})]})}),e.jsx(C,{open:ke,onOpenChange:Q,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Ge,{className:"h-5 w-5 text-indigo-500"}),"Edit User Guide"]}),e.jsx(q,{className:"text-muted-foreground",children:"Modify the title, description, or target badge level of this instructional user guide card."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-edit-title",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Guide Title"}),e.jsx(m,{id:"guide-edit-title",value:X,onChange:t=>ee(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-edit-desc",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Description"}),e.jsx(Ie,{id:"guide-edit-desc",value:te,onChange:t=>ne(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl",rows:3})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-edit-badge",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Difficulty Badge"}),e.jsx(m,{id:"guide-edit-badge",value:Ae,onChange:t=>ae(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"guide-edit-doc-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Upload Guide Reference Document URL"}),e.jsx(pe,{initialUrl:Pe,onUploadComplete:t=>xe(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>{Q(!1),fe(null)},className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:ct,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Saving...":"Save Changes"})]})]})}),e.jsx(C,{open:n,onOpenChange:r,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(De,{className:"h-5 w-5 text-indigo-500"}),"Add External Resource Link"]}),e.jsx(q,{className:"text-muted-foreground",children:"Provide a name and valid web hyperlink reference pointing to official guidelines or reference materials."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"resource-add-name",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Resource Name"}),e.jsx(m,{id:"resource-add-name",placeholder:"e.g. WHO Immunization Reference Guidelines",value:re,onChange:t=>se(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"resource-add-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"URL Address Path"}),e.jsx(m,{id:"resource-add-url",placeholder:"e.g. https://www.who.int/...",value:oe,onChange:t=>ie(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>r(!1),className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:ht,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Adding...":"Add Link"})]})]})}),e.jsx(C,{open:u,onOpenChange:f,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(De,{className:"h-5 w-5 text-indigo-500"}),"Edit External Resource Link"]}),e.jsx(q,{className:"text-muted-foreground",children:"Modify the display label or the hyperlink URL path pointing to this external reference resource."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"resource-edit-name",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Resource Name"}),e.jsx(m,{id:"resource-edit-name",value:re,onChange:t=>se(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"resource-edit-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"URL Address Path"}),e.jsx(m,{id:"resource-edit-url",value:oe,onChange:t=>ie(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>{f(!1),S(null)},className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:pt,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Saving...":"Save Changes"})]})]})}),e.jsx(C,{open:_,onOpenChange:H,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Oe,{className:"h-5 w-5 text-indigo-500"}),"Add Video Tutorial"]}),e.jsx(q,{className:"text-muted-foreground",children:"Configure a new instructional video walkthrough."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-add-title",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Video Title"}),e.jsx(m,{id:"video-add-title",placeholder:"e.g. System Walkthrough Overview",value:le,onChange:t=>de(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-add-duration",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Duration (MM:SS)"}),e.jsx(m,{id:"video-add-duration",placeholder:"e.g. 05:30",value:ce,onChange:t=>ue(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-add-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Upload / Video Link URL"}),e.jsx(pe,{initialUrl:Te,onUploadComplete:t=>he(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>H(!1),className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:gt,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Adding...":"Add Video"})]})]})}),e.jsx(C,{open:Se,onOpenChange:R,children:e.jsxs(A,{className:"sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans",children:[e.jsxs(P,{children:[e.jsxs(T,{className:"text-xl font-bold flex items-center gap-2",children:[e.jsx(Oe,{className:"h-5 w-5 text-indigo-500"}),"Edit Video Tutorial"]}),e.jsx(q,{className:"text-muted-foreground",children:"Modify video title, duration or file asset URL."})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-edit-title",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Video Title"}),e.jsx(m,{id:"video-edit-title",value:le,onChange:t=>de(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-edit-duration",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Duration (MM:SS)"}),e.jsx(m,{id:"video-edit-duration",value:ce,onChange:t=>ue(t.target.value),className:"bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx(d,{htmlFor:"video-edit-url",className:"text-xs font-semibold uppercase tracking-wider text-muted-foreground",children:"Upload / Video Link URL"}),e.jsx(pe,{initialUrl:Te,onUploadComplete:t=>he(t)})]})]}),e.jsxs(I,{className:"border-t border-border pt-4",children:[e.jsx(i,{variant:"outline",onClick:()=>{R(!1),L(null)},className:"rounded-xl",children:"Cancel"}),e.jsx(i,{onClick:ft,disabled:l.isPending,className:"bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl",children:l.isPending?"Saving...":"Save Changes"})]})]})})]})}export{ln as default};
