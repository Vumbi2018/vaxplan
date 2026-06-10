/**
 * server/auth.ts
 *
 * Core authentication utilities for VaxPlan.
 *
 * Local development (NODE_ENV !== "production"):
 *   - Uses an in-memory session store (no remote DB round-trip per request).
 *   - Provides a mock /api/login endpoint that logs in as any DB user by email.
 *
 * Production (NODE_ENV=production):
 *   - Uses connect-pg-simple (PostgreSQL-backed session store).
 *   - Real logins go through /api/auth/login-password (passwordAuth.ts) or
 *     tenant-configured OIDC (oidcAdapter.ts).
 */

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export const IS_LOCAL_DEV = process.env.NODE_ENV !== "production";

// ── Session store ─────────────────────────────────────────────────────────────
// Local dev: in-memory (zero network latency, sessions reset on restart).
// Production: PostgreSQL (durable, shared across PM2 workers).
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (!IS_LOCAL_DEV) {
      throw new Error(
        "CRITICAL: SESSION_SECRET is not set in production environment!",
      );
    }
    console.warn("[auth] SESSION_SECRET not set — using temporary dev secret.");
    secret = "temporary_dev_session_secret_for_vaxplan";
  }

  let store: session.Store;
  if (IS_LOCAL_DEV) {
    const MemStore = MemoryStore(session);
    store = new MemStore({ checkPeriod: 86_400_000 });
    console.log("[session] Using in-memory session store (local dev)");
  } else {
    const PgStore = connectPg(session);
    store = new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  }

  return session({
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Require secure cookies only in production (HTTPS).
      secure: !IS_LOCAL_DEV,
      // Packaged native apps (Android/Windows) send cross-origin requests, so
      // the cookie must be SameSite=None + Secure in production. In local dev
      // we fall back to "lax" (no HTTPS).
      sameSite: IS_LOCAL_DEV ? "lax" : "none",
      maxAge: sessionTtl,
    },
  });
}

// ── Local-dev mock login ──────────────────────────────────────────────────────
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Only register dev-only mock login routes in local dev.
  if (!IS_LOCAL_DEV) {
    console.log("[auth] Production mode — mock login routes disabled.");
    return;
  }

  console.log("[auth] Local dev mode — mock login available at /api/login");

  app.get("/api/login", async (req, res) => {
    // Resolve tenant (default: first active tenant, prefer ZMB then PNG).
    let tenant = await storage.getTenantByCode("ZMB");
    if (!tenant) tenant = await storage.getTenantByCode("PNG");
    if (!tenant) {
      const active = await storage.listActiveTenants();
      tenant = active[0] ?? null;
    }
    const tenantId = tenant?.id ?? null;

    const emailParam = req.query.email
      ? String(req.query.email).toLowerCase()
      : "dev.admin@vaxplan.org";

    let dbUser = await storage.getUserByEmail(emailParam);

    if (!dbUser) {
      const sub =
        emailParam === "dev.admin@vaxplan.org"
          ? "dev-user-id"
          : `mock-user-${Date.now()}`;
      const nameParts = emailParam.split("@")[0].split(".");
      const firstName =
        nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
      const lastName = nameParts[1]
        ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
        : "User";

      await storage.upsertUser({
        id: sub,
        email: emailParam,
        firstName,
        lastName,
        profileImageUrl: null,
      });

      dbUser = await storage.getUserByEmail(emailParam);

      if (dbUser && tenantId && !dbUser.tenantId) {
        const isAdmin =
          emailParam === "dev.admin@vaxplan.org" ||
          emailParam === "national.admin@vaxplan.org";
        const role: string = isAdmin ? "national_admin" : "facility_clerk";
        await db
          .update(users)
          .set({ tenantId, role: role as any, roles: [role], updatedAt: new Date() })
          .where(eq(users.id, dbUser.id));
        dbUser = await storage.getUserByEmail(emailParam);
      }
    }

    if (!dbUser) {
      return res.status(400).send("Failed to retrieve or create mock user");
    }

    const mockUser = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role ?? "facility_clerk",
      roles: dbUser.roles ?? [],
      permissions: dbUser.permissions ?? [],
      dataAccessScope: dbUser.dataAccessScope ?? {
        provinces: [],
        districts: [],
        facilities: [],
      },
      tenantId: dbUser.tenantId ?? tenantId,
      claims: {
        sub: dbUser.id,
        email: dbUser.email,
        first_name: dbUser.firstName,
        last_name: dbUser.lastName,
      },
      access_token: "mock-access-token",
      refresh_token: null, // explicitly null — no OIDC refresh in local dev
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    };

    req.login(mockUser, (err) => {
      if (err) {
        console.error("[auth] mock login failed:", err);
        return res.status(500).send("Login failed");
      }
      res.redirect("/");
    });
  });

  app.get("/api/callback", (_req, res) => res.redirect("/"));

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });
}

// ── isAuthenticated middleware ────────────────────────────────────────────────
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated?.() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // In local dev the mock token has no real refresh path.
  // Expired sessions require a fresh /api/login.
  if (IS_LOCAL_DEV || !user.refresh_token) {
    return res
      .status(401)
      .json({ message: "Session expired — please log in again." });
  }

  // Production: attempt OIDC token refresh via oidcAdapter if needed.
  // (The tenant-OIDC flow handled by oidcAdapter.ts sets expires_at from
  //  the real token; password-auth sessions have a 7-day expiry so they
  //  rarely hit this branch.)
  return res.status(401).json({ message: "Session expired." });
};

// ── User-id helpers ───────────────────────────────────────────────────────────
/**
 * Extracts the caller's user-id from the session.
 * OIDC sessions store it under `claims.sub`; local dev mock under `id`.
 */
export function getCurrentUserId(req: any): string {
  return (req?.user?.claims?.sub ?? req?.user?.id ?? "") as string;
}

/**
 * Returns the caller's DB user row, upserting it from session claims when it
 * doesn't exist yet (e.g. first OIDC sign-in race).
 */
export async function ensureDbUserFromSession(req: any) {
  const userId = getCurrentUserId(req);
  if (!userId) return null;
  const existing = await storage.getUser(userId);
  if (existing) return existing;
  // Try to create from session claims (OIDC path).
  const claims = req?.user?.claims;
  if (claims?.sub && claims?.email) {
    await storage.upsertUser({
      id: claims.sub,
      email: claims.email,
      firstName: claims.first_name ?? claims.given_name ?? null,
      lastName: claims.last_name ?? claims.family_name ?? null,
      profileImageUrl: claims.profile_image_url ?? claims.picture ?? null,
    });
    return (await storage.getUser(userId)) ?? null;
  }
  return null;
}
