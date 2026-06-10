// Vitest setup file. Runs before any test module is imported.
//
// Forces "local dev" mode (NODE_ENV !== "production") so getSession() uses the
// in-memory store and /api/login uses the mock handler. Provides a fixed
// SESSION_SECRET so express-session does not warn. SKIP_DEMO_SEED prevents
// the operational seed from running during tests.
delete process.env.REPL_ID;
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "vitest-session-secret";
process.env.SKIP_DEMO_SEED = "1";
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

// Allow tests to point at a separate test database. When TEST_DATABASE_URL is
// set, swap it into DATABASE_URL before any module reads it (db.ts captures
// DATABASE_URL at import time).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
