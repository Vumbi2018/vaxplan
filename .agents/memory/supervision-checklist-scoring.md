---
name: Supervision checklist follow-up visibility & scoring
description: How conditional follow-ups, repeats, and scoring interact in the configurable supervision checklist
---

# Supervision checklist: visibility drives scoring

The supervision checklist (`shared/supervisionChecklist.ts`) supports conditional
follow-up questions (`parentId` + `showWhen`, with `SHOW_WHEN_ANY="__any__"`) and
repeatable questions (`repeatable`, keys `${baseKey}__r${n}`, `repeatIndex`).

**Rule:** `computeChecklistScore` only counts answers for which `isAnswerVisible`
is true. Therefore visibility and scoring are coupled — any change to visibility
logic silently changes scores.

**Why:** `isAnswerVisible` must enforce *cascading* visibility — a follow-up is
visible only if its parent both matches the trigger AND is itself visible
(recursive, cycle-guarded via a `seen` set). An earlier bug checked only the
immediate parent, so a hidden ancestor with a stale value leaked its descendant
into the visible flow and the score.

**How to apply:**
- The builder (`SupervisionTemplates.tsx`) only allows parents that are earlier
  (`pi < idx`), non-follow-up (`!parentId`), non-repeatable questions, so authored
  chains are depth-1; the cascade guard is defensive for legacy/hand-edited data.
- Scoring: yes_no/true_false count unless `includeInScore === false`; rating
  counts only when `includeInScore === true` (value/5). Each repeat entry
  contributes independently and they average together.
- Item IDs are generated as `q-${Date.now()}-${random}` and never contain `__r`,
  so repeat suffix keys cannot collide with real item IDs.
