/**
 * Backfill funding source on legacy budget lines.
 *
 * Budget rows created before the funding-source enum shipped default to
 * `unspecified`, which leaves the by-funder rollup on Budget Planning blank
 * and breaks Gavi HSS exports. This script tags every legacy row with a
 * best-guess funder based on its category, and leaves genuinely ambiguous
 * categories ("Communication", "Other") alone so the UI surfaces them for
 * manual review.
 *
 * Idempotent: only touches rows still flagged `unspecified`.
 *
 * Run with:  tsx server/migrations/008-backfill-budget-funding-source.ts
 */

import { db } from "../db";
import { budgetItems } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

// Category → funder heuristic. Based on typical EPI cost-line ownership:
//  - Government covers civil-service salaries, transport, per-diems
//  - Gavi underwrites cold-chain capex
//  - UNICEF procures bundled supplies/consumables
//  - WHO funds technical training
// Categories not listed here (Communication, Other) stay `unspecified`
// so a human classifies them via the bulk-edit banner.
const CATEGORY_HEURISTICS: Record<string, "government" | "gavi" | "who" | "unicef"> = {
  Personnel: "government",
  "Per Diem": "government",
  Transport: "government",
  "Cold Chain": "gavi",
  Supplies: "unicef",
  Training: "who",
};

async function backfill() {
  const beforeRows = await db
    .select({ id: budgetItems.id, category: budgetItems.category })
    .from(budgetItems)
    .where(eq(budgetItems.fundingSource, "unspecified"));

  console.log(`Found ${beforeRows.length} budget rows with funding_source='unspecified'.`);

  let updated = 0;
  for (const [category, funder] of Object.entries(CATEGORY_HEURISTICS)) {
    const res = await db
      .update(budgetItems)
      .set({ fundingSource: funder, fundingSourceOther: null })
      .where(
        and(
          eq(budgetItems.fundingSource, "unspecified"),
          eq(budgetItems.category, category),
        ),
      )
      .returning({ id: budgetItems.id });
    console.log(`  ${category.padEnd(12)} → ${funder.padEnd(10)} (${res.length} rows)`);
    updated += res.length;
  }

  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS remaining FROM budget_items WHERE funding_source = 'unspecified'`,
  );
  const remaining = (result.rows?.[0] as { remaining: number } | undefined)?.remaining ?? 0;

  console.log(`\nBackfilled ${updated} rows.`);
  console.log(`${remaining} rows still 'unspecified' — flagged for manual classification in the UI.`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
