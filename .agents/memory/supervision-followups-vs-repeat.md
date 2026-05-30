---
name: Supervision follow-ups vs repeatable questions
description: Why a supervision checklist question cannot be both repeatable and have follow-ups.
---

A supervision checklist question must NOT be both repeatable (allow multiple entries)
and a parent of follow-up questions at the same time.

**Why:** At conduct time, adding a repeat entry clones only the base question, not
its follow-up children. Visibility (`isAnswerVisible` in
`shared/supervisionChecklist.ts`) matches a follow-up to its parent by the same
`repeatIndex`, but template-seeded follow-ups only exist at index 0. So follow-ups
tied to a repeatable parent would silently appear for the first entry only, and
since visibility drives scoring, the score would be wrong.

**How to apply:** In the template builder (`SupervisionTemplates.tsx`) the two are
mutually exclusive in the UI: the "Allow multiple entries" switch is disabled when
the question already has follow-up children, and the "Add a follow-up question"
button is hidden when the question is repeatable. If you ever want both to coexist,
first make repeat-cloning also clone child follow-ups with the new `repeatIndex`.
