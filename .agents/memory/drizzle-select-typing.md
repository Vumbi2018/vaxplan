---
name: Drizzle select() loose typing
description: Why query results often type as {} / unknown here, and how to handle it
---

In this codebase, `db.select({...})...` results frequently lose their element
type and surface as `{}` or `unknown` (you'll see `TS2339: Property 'x' does not
exist on type '{}'` and `TS2461: Type 'unknown' is not an array type` scattered
through server/routes.ts and server/storage.ts — many are long-standing, not
your change).

**How to apply:** When you `.map()`, index, or build a `Map`/`Record` from a
select result and TS can't see the columns, cast the awaited rows to an explicit
row type, e.g. `const rows = (await db.select({...})...) as Array<{ date: string;
visits: number }>;`. Building a `new Map(rows.map(r => [r.k, r]))` is especially
prone to collapsing the value type to `{}` — prefer an explicit
`Record<string, T>` populated with a `for` loop. Don't chase these with
`as const` on the tuple; cast the row array instead.

**Why:** Two attempts were wasted fixing a phantom `{}` value type on a Map
built from a grouped select before casting the row array resolved it. The
baseline `tsc --noEmit` already reports dozens of pre-existing errors of this
shape, so "tsc is clean" is not the bar — verify only that *your* edited line
ranges add no new errors.
