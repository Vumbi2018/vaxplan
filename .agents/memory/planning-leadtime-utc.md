---
name: Planning lead-time UTC arithmetic
description: Why session-plan date validation must use UTC calendar-day math, not local/server time.
---

The "Create Derived Session Plan" client submits the picked date as a UTC
calendar date (`YYYY-MM-DDT00:00:00.000Z`) and defaults to UTC today + 7.
`validatePlanningLeadTimeAndNoConflict` (server/routes.ts) enforces a
">= 7 days in advance" rule and also matches same-day conflicts against the
`scheduled_date` / `session_date` `timestamp` columns.

**Rule:** all calendar-day arithmetic in that validator (and any future copy)
must use `Date.UTC(...)` + `getUTC*`, never `getFullYear/getMonth/getDate`.

**Why:** local/server-time components on a UTC-midnight timestamp shift the date
back a day on any negative-offset server (UTC midnight = previous day 19:00 in
US zones), so the valid today+7 default computes as 6 days out and is wrongly
rejected ("must be scheduled at least 7 days in advance"). Confirmed: under
America/New_York the old local math gives diffDays=6, UTC gives 7.

**How to apply:** both client and server now route through the shared helpers in
shared/schedulingDates.ts (`isAtLeastDaysAhead` / `DEFAULT_LEAD_TIME_DAYS`) — a
single source of truth, no inlined server copy of the lead-time math. (The server
still builds `inputMidnight` via Date.UTC locally, but only for the same-day
conflict queries, not the lead-time decision.) The regression is guarded by
server/__tests__/planning-leadtime-timezone.test.ts,
which runs the validator under several simulated server timezones — covering both
the session-plan conflict branch and the itinerary day-plan conflict branch
(sessionDayPlans.sessionDate).

The same validator backs the multi-day itinerary endpoints (POST
/api/sessions/:sessionId/days, PATCH /api/sessions/days/:id). The day-plan
clients (SessionDayPlans.tsx, MicroplanBuilder.tsx) submit the picked day as a
date-only / UTC-midnight string, so server serialization is safe — but their
*client-side* lead-time checks (zod refine / isDateValid) and date-picker
defaults must also use getUTC*/setUTCDate. Local-time math (getDate/setHours on a
UTC-midnight date) there silently rejects the valid UTC today+7 default on
negative-offset *clients* before any request is sent.
