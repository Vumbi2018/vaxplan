---
name: Day-plan required-field visibility
description: Required day-plan form fields must be rendered for every plan type, not just campaigns.
---

# Required fields must be reachable for the plan type that requires them

`dayPlanFormSchema` in `client/src/pages/SessionDayPlans.tsx` marks
`leadVaccinator` as required (`z.string().trim().min(1, ...)`) for ALL plan
types. The input was originally only rendered inside the
`sessionPlan?.planType === "campaign"` staff section, so a **routine**
day-plan could never satisfy the schema — save failed with a validation
error for a field the user had no way to fill.

**Rule:** if a form field is required unconditionally in the zod schema, its
input must render for every plan type. Either render it always (e.g. a
"Session-Day Staffing" block shown when `planType !== "campaign"`, plus the
campaign block keeping its own copy), or make the schema requirement
conditional on plan type to match the UI.

**Why:** a required-but-hidden field is an invisible save blocker — the
on-error toast can name the field, but the user still can't proceed.

**How to apply:** when adding/auditing day-plan (or any multi-variant) forms,
cross-check every required schema key against the JSX to confirm an input is
reachable in each variant that the schema validates.
