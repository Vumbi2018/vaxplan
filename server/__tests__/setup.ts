// Vitest setup file. Runs before any test module is imported, so any env
// vars set here are visible when server/replitAuth.ts initializes.
//
// We force "Local Developer Authentication" mode (no REPL_ID) so the test can
// log in via the mock /api/login endpoint, and provide a fixed SESSION_SECRET
// so express-session does not warn or fail. SKIP_DEMO_SEED is a no-op here
// (the test imports registerRoutes directly and never boots server/index.ts),
// but we set it defensively in case future test files do.
delete process.env.REPL_ID;
delete process.env.REPLIT_DOMAINS;
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "vitest-session-secret";
process.env.SKIP_DEMO_SEED = "1";
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

// Allow tests to point at a separate test database. When TEST_DATABASE_URL is
// set, swap it into DATABASE_URL before any module reads it (db.ts captures
// DATABASE_URL at import time).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
