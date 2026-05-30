# VaxPlan — End-User Guide

> A practical, role-by-role manual for the VaxPlan GIS microplanning
> platform. Use the table of contents to jump to your role.

**Audience:** Ministry of Health staff at every level — facility
clerks, facility in-charges, district managers, provincial coordinators,
national administrators, and tenant onboarding leads.

**Version:** This document is kept in lockstep with the running
application. If a screen looks different in your environment, your
tenant administrator may have customised the labels (for example
"Province" → "Region") — the workflows below are unchanged.

---

## Table of Contents

1. [What VaxPlan does](#1-what-vaxplan-does)
2. [Roles at a glance](#2-roles-at-a-glance)
3. [Signing in](#3-signing-in)
4. [The home screen and switching country](#4-the-home-screen-and-switching-country)
5. [Facility staff — your daily workflow](#5-facility-staff--your-daily-workflow)
   - 5.1 [Build a routine microplan](#51-build-a-routine-microplan)
   - 5.2 [Plan a session](#52-plan-a-session)
   - 5.3 [Run a session in the field](#53-run-a-session-in-the-field)
   - 5.4 [Mark a session done](#54-mark-a-session-done)
   - 5.5 [Coverage and the under-immunised list](#55-coverage-and-the-under-immunised-list)
   - 5.6 [Stock, wastage, and supply](#56-stock-wastage-and-supply)
   - 5.7 [Offline mode and sync](#57-offline-mode-and-sync)
6. [District managers — review and oversight](#6-district-managers--review-and-oversight)
7. [Provincial coordinators — approvals and visibility](#7-provincial-coordinators--approvals-and-visibility)
8. [National administrators](#8-national-administrators)
9. [Tenant onboarding (new Ministry of Health)](#9-tenant-onboarding-new-ministry-of-health)
10. [Map and boundary management](#10-map-and-boundary-management)
11. [Settlement intelligence and zero-dose targeting](#11-settlement-intelligence-and-zero-dose-targeting)
12. [Settings, customisation, and labels](#12-settings-customisation-and-labels)
13. [Supervision visits](#13-supervision-visits)
14. [Reports and exports](#14-reports-and-exports)
15. [Troubleshooting](#15-troubleshooting)
16. [Glossary](#16-glossary)

---

## 1. What VaxPlan does

VaxPlan is a multi-country microplanning system used by Ministries of
Health to plan, run, and track routine immunisation and supplementary
immunisation activities (SIAs).

**Core workflows it covers:**

- **Microplanning:** facility-level quarterly plans that combine
  catchment population, vaccine schedules, and outreach intent into a
  list of executable sessions.
- **Session execution:** scheduling, running, and closing out
  vaccination sessions (fixed-site, outreach, mobile).
- **Coverage analytics:** by antigen, by dose, by month, by location,
  with under-immunised and zero-dose surfacing.
- **Stock and supply:** vaccine requirements, wastage thresholds,
  cold-chain stock balances, and reconciliation.
- **Supervision:** scheduled supervisory visits with rolled-up
  reporting to district and province.
- **Mapping:** every facility, village, settlement, and session plotted
  on Leaflet maps with admin boundary overlays (GeoBoundaries +
  custom GeoJSON uploads).
- **Multitenant SaaS:** each Ministry of Health is a separate tenant
  with its own data, users, and SSO. Users with cross-tenant access
  can switch between countries from the header.

**See the full feature list.** For a complete, plain-language catalogue
of everything VaxPlan can do today, open **Standards Alignment** from the
sidebar and select the **Features** tab. It groups every feature by area
(dashboards, microplanning, vaccines & stock, maps & GIS, supervision,
users & access, offline & sync, security, and more), and the filter box
lets you jump straight to anything.

**Where the data lives.** Everything is stored in PostgreSQL on a
tenant-isolated schema. Facility and village reference data is loaded
once during onboarding and then maintained by national administrators.
Day-to-day operational data (sessions, coverage, stock) is written by
facility staff.

---

## 2. Roles at a glance

| Role | What they can do | Where they work |
| --- | --- | --- |
| **Facility clerk** | Authors microplans and sessions, captures session results, manages stock balances. | Their own facility only. |
| **Facility in-charge** | Same as clerk, plus signs off (submits) the microplan and session results. | Their own facility only. |
| **District manager** | Reviews and approves microplans from facilities in the district, runs supervision visits, reads coverage. | Their district. |
| **Provincial coordinator** | Approves district-level plans, sees rolled-up coverage, escalates issues. | Their province. |
| **National admin** | Manages users, facilities, vaccine schedule, labels, boundaries, and the country dashboard. | Whole country (tenant). |
| **Tenant superadmin** | Onboards new tenants, configures SSO, and provisions the first national admin. | Cross-tenant. |

Microplan authoring (creating new microplans and session plans) is
**reserved for facility staff** (clerk and in-charge), so accountability
stays with the people who actually run the sessions. National admins can
also author when setting up or correcting a country's data. District
managers and provincial coordinators are reviewers and approvers only —
they cannot author plans on a facility's behalf.

---

## 3. Signing in

VaxPlan supports two sign-in modes:

1. **Email and password** (used during onboarding and colleague
   testing).
2. **Tenant SSO** — once your Ministry of Health is fully onboarded,
   you sign in with your own organisational identity (OIDC or SAML —
   for example Microsoft Entra, Google Workspace, Okta).

**To sign in:**

1. Open the VaxPlan URL provided by your administrator (each tenant
   has either a subdomain or a path-based URL).
2. Click **Sign in**.
3. You will be redirected to your identity provider; complete the
   login there.
4. On first login, your home tenant is set automatically from your
   email domain (if your administrator has configured a domain
   mapping) or from the signup invite you accepted. You'll land on
   your home tenant's dashboard.

If you signed up but no role has been granted yet, you'll see a
"pending approval" message. Your district or national administrator
needs to confirm your role before you can use the system. They will
receive an inbox notification automatically.

**Passwords (email sign-in):**

- **Change your own password.** Click your name in the top-right
  corner and choose **Change password**. Enter your current password
  (leave it blank if you've never set one), then your new password
  twice. Passwords must be at least 8 characters.
- **Forgot your password?** On the sign-in screen click **Forgot
  password?** and enter your email. Your administrator is notified so
  they can set a new one for you, which they'll share with you
  securely.
- **Administrators** can set or reset passwords for users — see
  section 8.

---

## 4. The home screen and switching country

The header has three constant elements:

- **Tenant switcher (top-left)** — shows your current country. If you
  have access to more than one tenant (rare, mostly used by cross-MoH
  regional coordinators), you'll see a dropdown to switch. Switching
  does not move your home — it only changes what data you're viewing.
- **Navigation sidebar (collapsible)** — your modules. Items that
  your role can't access are hidden, so the menu adapts to who you
  are.
- **Profile menu (top-right)** — language, theme (light/dark), and
  sign-out.

**Cross-tenant rule:** when you switch to another country, you become
a read-only viewer of that tenant's data. The system rejects any write
you try to perform outside your home tenant with a clear error
message. This is intentional — it lets a regional advisor see
neighbouring countries' plans without risking accidental edits.

**What you can see within your country.** VaxPlan also scopes data by
your place in the hierarchy. A facility clerk or in-charge sees only
their **own facility's** facilities, villages, population, microplans,
sessions, and reports. A district manager sees their district; a
provincial coordinator sees their province; a national admin sees the
whole country. You won't see — or be able to open — a record that
belongs to a facility outside your area, even with a direct link. This
keeps each facility's data private to the people responsible for it.

---

## 5. Facility staff — your daily workflow

This is the most important section for clerks and in-charges. Read it
end-to-end the first time, then return to specific subsections as
needed. There is also a separate one-page card,
`QUICKSTART_FACILITY.md`, you can print and pin next to your
workstation.

### 5.1 Build a routine microplan

A **microplan** is your facility's quarterly plan. It declares:

- which villages your facility serves this quarter,
- the target population (under-1s and pregnant women by default —
  configurable per tenant),
- the antigens you will offer,
- the outreach sessions you intend to run (fixed-site sessions are
  automatic).

**Steps:**

1. From the sidebar, open **Microplans → Routine**.
2. Click **New microplan**. The wizard opens.
3. **Step 1 — Scope.** Pick the quarter and year. Your facility is
   pre-filled from your profile and cannot be changed.
4. **Step 2 — Catchment.** Tick the villages the facility will serve
   this quarter. The list is your facility's assigned villages from
   the registry; if a village is missing, ask your national admin to
   add it before continuing.
5. **Step 3 — Population.** Confirm the target denominators. Three
   data sources feed this:
   - **Registered population** (your registry, the default),
   - **WorldPop raster** (an open population grid — useful for
     remote villages without a recent census), and
   - **Manual override** (with a justification note).
   Pick the source per village; the wizard sums everything and shows
   you the totals.
6. **Step 4 — Vaccine schedule.** The default schedule is your
   tenant's. Untick antigens that don't apply (for example, if your
   facility doesn't carry HPV).
7. **Step 5 — Outreach intent.** Declare how many outreach sessions
   per village you expect to run. The system creates one session
   plan per (village × month × declared count). You can edit
   individual sessions later.
8. **Step 6 — Review and submit.** Check the totals, then **Save as
   draft** (you can keep editing) or **Submit for approval** (your
   district manager sees it in their queue).

> **Tip.** You can save a draft at any step. Drafts are private to you
> until you submit.

### 5.2 Plan a session

Once a microplan is approved, its sessions appear on the **Sessions**
page. Each session is created automatically from the microplan's
outreach intent. You can also add ad-hoc sessions for defaulter
follow-up.

**To edit a session:**

1. Open **Sessions** from the sidebar.
2. Use the **Province → District → Facility** cascade filter at the
   top to find your sessions. The row count below changes as you
   filter.
3. Click a session name. The edit dialog opens.
4. Fill in:
   - **Scheduled date** — the day you'll run it.
   - **Site type** — fixed, outreach, or mobile.
   - **Villages served** (for outreach) — pick from the facility's
     catchment.
   - **Cold-chain plan** — vaccine carrier, ice packs, expected
     vaccines.
5. Click **Save**.

If GPS coordinates are missing for the village, the system warns you
when you save and offers a "Capture GPS now" link to record them from
your phone in the field.

### 5.3 Run a session in the field

The session execution screen is designed for use **offline**, on a
phone or tablet, while you're at the village.

1. From **Sessions**, tap your session for today.
2. Tap **Start session**. The screen switches to capture mode.
3. For each child or pregnant woman vaccinated:
   - Tap **Add client** (or scan their card if you've enabled barcode
     scanning).
   - Pick the antigens administered. The system auto-picks the next
     due dose based on the schedule.
   - Confirm.
4. The session totals update live. Stock balances on the device
   decrement automatically.

You can capture an entire day's session with no connectivity. The
device queues every entry into an **offline outbox** (see 5.7).

### 5.4 Mark a session done

After you've finished vaccinating:

1. Tap **Mark session done**.
2. Confirm the per-antigen counts. The system pre-fills these from
   your capture; you can adjust if your physical tally differs.
3. Add session notes (issues, no-shows, supply problems).
4. Tap **Submit**.

**What happens behind the scenes:**

- Per-antigen counts are validated against your tenant's vaccine
  schedule. Known codes are stored under their canonical name (so
  `opv-1` and `OPV-1` are treated the same).
- Unknown codes — usually from older offline entries — are stored in a
  separate bucket so they still count toward totals but don't pollute
  per-antigen rollups. You'll see a warning if any were found, and
  your national admin can review them in the audit log.
- Stock movements are recorded.
- The session is locked. Reopening requires district approval.

### 5.5 Coverage and the under-immunised list

**Coverage** is shown on the **Coverage** page. You'll see:

- Coverage by antigen, this quarter and year-to-date.
- A heatmap of villages by coverage percentage.
- An **under-immunised list** of children who have started but not
  completed a vaccine series (for example, OPV-1 done but OPV-2
  missing past the due date).

**Acting on the under-immunised list:**

- Click a child to see their full vaccination history.
- Click **Create defaulter follow-up session** to spin up a new
  outreach session targeting that child's village. The session is
  tagged so it shows up under the **Defaulter follow-up only** filter
  on the Sessions page.

### 5.6 Stock, wastage, and supply

The **Stock** page tracks vaccine balances at your facility:

- **On hand** by antigen and lot, with expiry dates.
- **Receipts** — when supply arrives from the district, enter the
  delivery note.
- **Issues** — automatic when you mark a session done, manual if
  you give vaccines to another facility.
- **Wastage** — auto-computed from session counts vs. opened vials,
  with a per-antigen wastage threshold. Vials wasted above threshold
  trigger an alert visible to your in-charge and district manager.

The **monthly stock summary** is your end-of-month return: review,
adjust if you find a discrepancy on physical count, and submit.

### 5.7 Offline mode and sync

VaxPlan works without an internet connection. Here's what you need
to know:

- The first time you sign in, the app **caches your reference data**
  (facilities, villages, vaccine schedule, microplans) into an
  on-device IndexedDB.
- When you create or update something offline (a session result, a
  stock movement, a new defaulter session), it goes into an
  **outbox**. The header shows a small cloud/sync badge with the number
  of pending items.
- **"Sync now" is built into the header.** The sync badge is always
  visible. Whenever you're online, tap it to push your outbox and pull
  the latest server data immediately — whether you have items queued or
  just want a refresh. While you're offline it shows your status and
  pending count, and syncs as soon as you're back online.
- When connectivity returns, the outbox **syncs automatically in the
  background** — even if you've closed the tab or locked the phone, on
  devices that support background sync (most Android browsers). On
  devices that don't (for example iPhones), it syncs the next time you
  open the app.
- **Live updates across devices.** While you're online, VaxPlan keeps a
  lightweight live connection open. If a colleague — or you on another
  device — changes something for your facility, your screen refreshes
  within a few seconds, with no manual reload. If that live connection
  drops, the app quietly falls back to periodic checks.
- If a sync entry is rejected (for example, a session was already
  closed on the server), the system shows the rejection inline and
  asks you to resolve it.

> **Best practice.** Sync at the end of each session day, when you're
> back in cellular range. Don't let the outbox grow longer than a
> week's worth of entries.

---

## 6. District managers — review and oversight

You sit between facilities and the province. Your day-to-day:

- **Approval queue.** Open **Approvals**. You'll see microplans
  submitted by facilities in your district. For each, you can:
  - **Approve** — the plan locks and its sessions go live.
  - **Request changes** — the plan returns to the facility with your
    note.
  - **Reject** — for plans that should be rebuilt from scratch.
- **Coverage rollup.** The **Coverage** page shows you the whole
  district at a glance. Drill down by facility or village.
- **Supervision visits.** Schedule visits to facilities; see §13.
- **Stock alerts.** You'll receive a weekly digest of facilities with
  stockouts, wastage above threshold, or upcoming expiries.
- **Cross-facility intelligence.** The **Map** view shows every
  session in your district pinned by status (planned, conducted,
  overdue, cancelled). Use it to spot uneven coverage by location.

You **cannot** author microplans for a facility — that responsibility
stays with facility staff. You can, however, edit catchment
assignments (which villages belong to which facility) if you spot a
boundary issue.

---

## 7. Provincial coordinators — approvals and visibility

Your role mirrors the district manager's, scoped to the province:

- District-level **plan approvals**: when a district manager signs off
  on aggregated district-level outreach plans (for SIAs, mostly),
  they come to you next.
- **Province-wide coverage** dashboards.
- **Cross-district comparison** — see which districts are on track
  and which are slipping.
- **Resource allocation** — request stock reallocations between
  districts using the **Supply request** workflow.

You also have access to the **National admin** read-only views (you
cannot edit users or facilities, but you can see them).

---

## 8. National administrators

National admins are the power users for your country. Your modules:

- **Users.** Invite users, assign roles, suspend or reactivate
  accounts. You can also bulk-import users from a CSV. When creating a
  user you can set an **initial password** so they can sign in right
  away, and you can **reset any user's password** later from the
  user's edit screen (open a user → **Reset Password**). Passwords must
  be at least 8 characters — share them with the user securely. (Only
  national/platform admins see these password controls, and national
  admins can only set passwords for users in **their own country** —
  the controls are hidden while you're viewing another country.)
- **Facilities.** The registry of all facilities. Import from CSV (a
  template is downloadable), edit GPS coordinates, merge duplicates,
  or retire facilities.
- **Villages and catchments.** The same for villages. The **catchment
  matrix** lets you assign villages to facilities.
- **Vaccine schedule.** Your tenant's authoritative schedule.
  Adding an antigen here makes it available in microplans nationwide.
- **Labels.** Customise the administrative level labels (e.g.
  "Province" → "Region" for South Sudan).
- **Boundaries.** See §10.
- **Country dashboard.** Top-line KPIs for the country, including
  coverage by antigen, dropout rates, stock health, and supervision
  compliance.
- **Approvals (escalations).** Anything a district or province
  rejected escalates to you.
- **Audit log.** Every change to sensitive data is logged with who,
  when, and what.
- **Site activity.** A panel on your country dashboard shows who is
  online right now and where they are signed in from, a live map
  pinning those users, visits today and over the last two weeks, your
  busiest pages, and a breakdown of login locations. Users stay counted
  as online while their tab is open — the app sends a quiet heartbeat —
  so someone reading a single page without clicking around still shows
  up. When a user allows location access in their browser, the map uses
  their device's real GPS position; otherwise it falls back to a
  best-effort estimate from the network address, which often resolves
  only to the nearest large city. Platform super admins can tap any
  online person for full detail — email, IP address, device, and exact
  coordinates. It is visible only to national and platform
  administrators.

National admins can also configure **scheduled jobs** — population
refresh from WorldPop, stock-alert digests, and supervision digests
all run on schedules you can tune in **Settings → Schedules**.

---

## 9. Tenant onboarding (new Ministry of Health)

This section is for the VaxPlan superadmin onboarding a new country.

1. **Create the tenant.** Use **Settings → Tenants → New** and pick:
   - Country name and ISO-3 code.
   - Default time zone.
   - Default admin level labels (e.g. Province/District/Facility,
     or Region/State/Health Area).
   - Default vaccine schedule (clone from a sibling country if you
     have one, then edit).
2. **Configure SSO.** Add the OIDC or SAML configuration for the
   ministry's identity provider. Test the connection before going
   live.
3. **Map email domains.** Adding `@health.gov.xx` makes anyone who
   signs in from that domain land on this tenant by default.
4. **Provision the first national admin.** They will receive an
   invite email and be able to onboard everyone else.
5. **Load reference data.**
   - Admin boundaries — use the **Boundary Manager** (§10).
   - Facilities — import via CSV.
   - Villages and catchments — import via CSV.
   - Population — either ingest a WorldPop raster (national admin
     can do this on demand) or rely on registered population.
6. **Set the approval workflow.** Decide whether plans need 1, 2, or
   3 levels of approval (facility → district → province → national).
7. **Go live.** The national admin sends out user invites and
   training links.

---

## 10. Map and boundary management

Every map in VaxPlan (Sessions, Coverage, Settlement intelligence,
Microplans) draws boundaries on top of OpenStreetMap tiles. Boundaries
come from two sources:

- **GeoBoundaries API** — public, covers 200+ countries, available
  for admin levels 0 to 2 or 3 depending on the country.
- **Custom GeoJSON upload** — your own files, for levels GeoBoundaries
  doesn't cover (e.g. South Sudan Payam) or for your authoritative
  national geometry.

**To fetch from GeoBoundaries:**

1. Open **Settings → Boundary Manager**.
2. Click **Fetch from GeoBoundaries API**.
3. Pick country and admin level. Level names are pre-filled (you can
   edit them).
4. Click **Fetch Boundaries**. Large countries (Nigeria, DRC,
   Ethiopia) take 30 to 60 seconds.

**To upload custom GeoJSON:**

1. In Boundary Manager, click **Upload Custom GeoJSON**.
2. **ISO-3 country code** (3 letters, e.g. `SSD`, `ZMB`, `PNG`).
3. Pick the admin level and edit the level label if needed.
4. Choose the file (`.geojson` or `.json`). Files up to 50 MB are
   accepted.
5. Click **Upload & Store**.

> **GADM users.** GADM ships shapefiles, not GeoJSON. Convert with
> the free [mapshaper.org](https://mapshaper.org) website (drag in
> the `.shp`, `.shx`, `.dbf` files, export as GeoJSON).

---

## 11. Settlement intelligence and zero-dose targeting

For countries where village-level registration is patchy (parts of
South Sudan, PNG highlands, Sahel), VaxPlan offers a **settlement
intelligence** layer. It overlays:

- WorldPop-derived populated cells (250m or 1km).
- Cellular signal coverage (where available).
- Travel-time isochrones from each health facility.

The **Zero-dose map** uses this data to highlight settlements with no
recorded vaccinations. Click a hotspot to:

- See the settlement's estimated population.
- See the nearest facility and travel time.
- Create an outreach session targeting the hotspot.

This module is most useful for the **district manager** and
**provincial coordinator** roles when planning quarterly
microplanning calendars.

---

## 12. Settings, customisation, and labels

National admins can adjust the look and feel of the app for their
country:

- **Admin level labels.** Each tenant can rename the four hierarchy
  levels. The default is Country / Province / District / Facility.
  Common alternatives:
  - South Sudan: Country / State / County / Payam.
  - PNG: Country / Province / District / Local-Level Government.
  - Zambia: Country / Province / District / Constituency.
- **Branding.** Upload your ministry logo; it appears on the header
  and on all PDF exports.
- **Languages.** Choose the default language for users in your
  tenant. English, French, and Portuguese are bundled; ask the
  VaxPlan team for additions.
- **Vaccine schedule.** Add antigens and doses; mark which are
  routine vs. campaign.
- **Wastage thresholds.** Per antigen, what percentage of doses
  wasted triggers an alert.

---

## 13. Supervision visits

Supervision is a first-class workflow:

1. **Schedule visits.** Open **Supervision → Schedule Visit**, pick a
   facility, a date, and a supervisor. You can also choose which
   **checklist** to use — the built-in WHO checklist, or any custom
   checklist your national admin has built (see below).
2. **Visit checklist.** When the supervisor arrives, they open the
   visit on their phone. A **progress bar** at the top shows how many
   questions are answered and the **live score** updates as they go. A
   **Visit location** card confirms where the visit happened using a
   smart **Province → District → Health Facility** picker plus an
   **interactive map** — tap the map to drop a pin, drag it to
   fine-tune, or tap **Use my location** to place it from the device's
   GPS. They then answer the checklist questions. Questions
   can be Yes/No, True/False, short text, a number, single- or
   multiple-choice, a 1–5 rating, a date, a **GPS location** (picked
   the same way, on a map), or a **photo** taken on the device.
   Some questions are **follow-ups** that only appear after a
   particular answer (for example, an "If No, why?" box that shows up
   only when the previous question is answered "No"). Other questions
   are **repeatable** — tap **Add another** to record one entry per
   vaccinator, session, or child, and remove an entry you don't need.
3. **Findings and actions.** Record findings and follow-up actions,
   and set the next visit date.
4. **Score.** The visit score is the average of the scored questions —
   Yes/No and True/False answers, plus any ratings the checklist author
   chose to count. Every repeated entry counts, so the entries are
   averaged together automatically. N/A and hidden follow-ups are
   ignored.

The **Supervision digest** (a weekly summary) rolls up overdue
visits to the district and provincial dashboards.

### Custom supervision checklists (national admins)

National admins can build their own checklists so every facility in
the country uses the same questions:

1. Open **Supervision → Manage Checklists**.
2. Click **New checklist**, give it a name, and add questions. For
   each question pick a type (Yes/No, True/False, short text, number,
   single choice, multiple choice, rating, date, GPS location, or
   photo), and add options for choice questions.
3. Make any question highly configurable:
   - **Follow-up:** under any question, click **Add a follow-up
     question**. The new question appears indented beneath it, and you
     choose which answer reveals it (e.g. show it only when the question
     is answered "No", or whenever it has any answer). Any question can
     have follow-ups — including the first one — and you can **Detach** a
     follow-up to make it a normal question again.
   - **Repeat:** turn on "Allow multiple entries" so supervisors can
     add as many entries as needed during a visit. You can name each
     entry (e.g. "Vaccinator") and cap how many are allowed.
   - **Scoring:** choose whether each Yes/No or True/False question
     counts toward the score, and opt a rating in so it counts too.
4. Mark a checklist **Active** to make it available when scheduling
   visits. Anyone in the country can then pick it; only national
   admins can create, edit, or delete the checklists themselves.

---

## 14. Reports and exports

Most tables in VaxPlan have an **Export** button that produces an
Excel workbook with the currently filtered rows.

For more formal outputs, use **Reports → Generate**:

- **Quarterly microplan return** (PDF, per facility).
- **District coverage report** (PDF, per district per month).
- **Stock and wastage report** (Excel, per facility per month).
- **Supervision report** (PDF, per visit).

All reports honour the geo filters you've selected on the page.

---

## 15. Troubleshooting

**I can't see my facility's sessions on the Sessions page.**
Check the Province / District / Facility filter at the top of the
page — if any are set, only matching sessions are shown. Clear them
to see everything you're allowed to see.

**The map is blank.**
Either you don't have boundaries loaded for the level you're viewing
(ask a national admin), or your browser blocked location/tile
fetches. Try a different browser or hard-refresh.

**"413 Request Entity Too Large" when uploading a boundary.**
That used to happen for files over 100 KB. Files up to 50 MB are now
accepted. If you see this on a smaller file, the file may not be
valid GeoJSON; try opening it in [geojson.io](https://geojson.io) to
validate.

**"GeoBoundaries has no ADM3 boundary" error.**
GeoBoundaries doesn't publish every admin level for every country.
For South Sudan, only ADM0-ADM2 are upstream — for Payam you need to
upload a custom GeoJSON (OCHA HDX is a good source).

**My country code is rejected with "must contain exactly 3
characters".** Use the ISO 3166-1 alpha-3 code (e.g. `SSD` for South
Sudan, `ZMB` for Zambia, `PNG` for Papua New Guinea, `KEN` for
Kenya). The 2-letter alpha-2 codes (`SS`, `ZM`) are not accepted.

**I marked a session done but it shows zero coverage.**
The per-antigen counts may use unknown codes (older offline outbox
entries). Open the session, check the "unmapped antigens" warning,
and ask your national admin to standardise the codes via the audit
log workflow.

**Sync failed for some outbox entries.**
Tap the cloud icon to see which ones. Most failures are because the
underlying session was closed or deleted on the server. Reopen the
entry, resolve the conflict, and retry.

**I'm logged in but I see "pending approval".**
A national or district admin needs to confirm your role. Contact
your administrator; they will see the request in their inbox.

---

## 16. Glossary

- **Antigen** — A vaccine type (BCG, OPV, Penta, MCV1, etc.).
- **Catchment** — The set of villages a facility serves.
- **Coverage** — Percentage of the target population that received
  a given dose, in a given period.
- **Defaulter** — A child who started but did not complete a vaccine
  series on time.
- **Denominator** — The target population used to calculate coverage.
- **Dropout** — The percentage of children who received an earlier
  dose but did not receive a later one (e.g. Penta1 → Penta3).
- **Fixed-site session** — A vaccination session held at the
  facility.
- **Microplan** — A facility's quarterly plan combining catchment,
  denominator, schedule, and intended outreach.
- **Outreach session** — A session held away from the facility,
  usually in a village.
- **SIA** — Supplementary Immunisation Activity (a campaign — for
  example a measles SIA).
- **Tenant** — A Ministry of Health (one country) on the VaxPlan
  platform. Each tenant has isolated data.
- **WorldPop** — An open population dataset providing population
  estimates on a 100m or 1km grid.
- **Zero-dose child** — A child of vaccination age who has received
  no doses of any vaccine.

---

*If you spot an error in this guide or want a topic added, ask your
national admin to file an issue with the VaxPlan team. The guide is
versioned alongside the application code.*
