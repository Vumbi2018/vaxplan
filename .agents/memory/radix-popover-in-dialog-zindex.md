---
name: Radix popover/combobox unclickable inside a modal Dialog
description: Why Popover/cmdk comboboxes render behind modal Dialogs and the correct z-index fix (not the `modal` prop)
---

When a Radix `Popover` (or a cmdk `Command` combobox built on Popover, e.g. `FacilityCascadePicker`) opens **inside a modal Radix `Dialog`**, the popover can render *behind* the dialog — visible-looking trigger, but the dropdown never appears / isn't clickable.

**Root cause:** `@radix-ui/react-popper` copies the popover **content's** computed `z-index` onto its positioning wrapper. Our `DialogContent`/`DialogOverlay` are `z-[99999]`; the default shadcn `PopoverContent` was `z-50`. So the popover stacked under the dialog.

**Why the obvious fix fails:** toggling the Radix `modal` prop on the Popover does **nothing** for stacking — it only affects focus-trap / pointer-events / scroll-lock. There were three separate failed commits that just flipped `modal` on/off.

**The real fix:** raise `PopoverContent` z-index above the dialog. Keep an explicit ladder:
`dialog/overlay 99999 < popover 100000 < toast 100001`.

**Dead-code trap:** `client/src/index.css` has a global `div[data-radix-portal] { … }` rule. `@radix-ui/react-portal` does **not** emit a `data-radix-portal` attribute, so that rule matches nothing from Radix portals. Don't waste time theorizing about it when debugging portal/stacking issues.

**How to apply:** any time a shadcn overlay (popover/dropdown/select content) is reported "unclickable" or "doesn't open" inside a dialog, check the content's z-index vs the dialog's `z-[99999]` first. Same class of bug can hit `dropdown-menu` / `select` content (both also `z-50`) if they're ever used in these dialogs.
