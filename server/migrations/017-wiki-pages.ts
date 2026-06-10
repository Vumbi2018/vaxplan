import { db } from "../db";
import { sql } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Migration 017 — Wiki Pages
 *
 * Creates the `wiki_pages` table that backs the admin-editable VaxPlan
 * documentation wiki (served at docs.vaxplan.org).
 *
 * The table is platform-wide (no tenant_id column) so the docs site can
 * render without a tenant context.  On first run (table is empty) the
 * migration seeds content by parsing the 19 sections in docs/USER_GUIDE.md
 * so the wiki starts populated rather than blank.
 */
export async function applyWikiPages(): Promise<void> {
  // ── 1. Create table ────────────────────────────────────────────────────────
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS wiki_pages (
      id           SERIAL PRIMARY KEY,
      slug         TEXT UNIQUE NOT NULL,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL DEFAULT '',
      sort_order   INT  NOT NULL DEFAULT 0,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_by   TEXT,
      updated_by   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages (slug)`,
    `CREATE INDEX IF NOT EXISTS idx_wiki_pages_sort ON wiki_pages (sort_order, id)`,
  ];

  for (const stmt of createStatements) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[migration:017] OK — ${stmt.slice(0, 60).trim()}…`);
    } catch (err: any) {
      console.error(`[migration:017] Warning: ${err.message}`);
    }
  }

  // ── 2. Seed from USER_GUIDE.md (idempotent — only when table is empty) ────
  try {
    const countResult = await db.execute(
      sql.raw("SELECT COUNT(*)::int AS n FROM wiki_pages")
    );
    const existingCount = Number((countResult.rows[0] as any)?.n ?? 0);
    if (existingCount > 0) {
      console.log(
        `[migration:017] wiki_pages already has ${existingCount} rows — skipping seed.`
      );
      return;
    }
  } catch (err: any) {
    console.error(`[migration:017] Could not count wiki_pages: ${err.message}`);
    return;
  }

  // Locate USER_GUIDE.md relative to this file (server/migrations/ → docs/)
  const guidePath = join(__dirname, "../../docs/USER_GUIDE.md");
  if (!existsSync(guidePath)) {
    console.warn(
      `[migration:017] USER_GUIDE.md not found at ${guidePath} — seeding skipped.`
    );
    return;
  }

  const md = readFileSync(guidePath, "utf8");
  const sections = extractH2Sections(md);
  console.log(
    `[migration:017] Seeding ${sections.length} wiki pages from USER_GUIDE.md…`
  );

  for (let i = 0; i < sections.length; i++) {
    const { title, body } = sections[i];
    const slug = slugify(title);
    try {
      await db.execute(
        sql.raw(
          `INSERT INTO wiki_pages (slug, title, body, sort_order, is_published)
           VALUES (${sqlStr(slug)}, ${sqlStr(title)}, ${sqlStr(body)}, ${i * 10}, TRUE)
           ON CONFLICT (slug) DO NOTHING`
        )
      );
    } catch (err: any) {
      console.error(
        `[migration:017] Failed to insert page "${title}": ${err.message}`
      );
    }
  }

  console.log(`[migration:017] Seed complete — ${sections.length} pages inserted.`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract ## heading sections from Markdown, skipping the Table of Contents. */
function extractH2Sections(md: string): { title: string; body: string }[] {
  const lines = md.split(/\r?\n/);
  const sections: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)(?:\s*$)/);
    if (m) {
      if (current) sections.push(current);
      const title = m[1].trim();
      current = { title, body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  if (current) sections.push(current);

  // Strip the Table of Contents section
  return sections.filter((s) => !/table of contents/i.test(s.title));
}

/** Convert a heading string to a URL-safe slug. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

/** Safely escape a string for direct SQL interpolation (single-quote escaping). */
function sqlStr(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}
