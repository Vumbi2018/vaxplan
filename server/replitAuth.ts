import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
function memoize<T>(fn: () => Promise<T>, opts: { maxAge: number }): () => Promise<T> {
  let cached: T | undefined;
  let cachedAt = 0;
  return async () => {
    const now = Date.now();
    if (cached !== undefined && now - cachedAt < opts.maxAge) return cached;
    cached = await fn();
    cachedAt = Date.now();
    return cached;
  };
}
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// In local dev (no REPL_ID) we use an in-memory session store so every
// authenticated request is NOT gated by a round-trip to the remote PostgreSQL
// database. In production, connect-pg-simple is used for durability.
const IS_LOCAL_DEV = !process.env.REPL_ID;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

/*
// Original Code: Blindly uses process.env.SESSION_SECRET without validation, which will crash express-session if missing.
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}
*/

// Updated Code: Local dev uses an in-memory session store (no remote DB latency);
// production uses connect-pg-simple for durability and cross-process sharing.
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in production environment!");
    } else {
      console.warn("WARNING: SESSION_SECRET not set — using temporary dev secret.");
      secret = "temporary_dev_session_secret_for_gis_microplanning";
    }
  }

  // ── Session store selection ──────────────────────────────────────────────
  // Local dev: in-memory store. Zero network latency — session lookup is a
  // simple Map lookup in the same process. Sessions are lost on restart but
  // that is fine for local development.
  // Production: PostgreSQL store. Durable, shared across PM2 workers.
  let store: session.Store;
  if (IS_LOCAL_DEV) {
    const MemStore = MemoryStore(session);
    store = new MemStore({ checkPeriod: 86_400_000 }); // prune expired entries every 24h
    console.log("[session] Using in-memory session store (local dev mode)");
  } else {
    const pgStore = connectPg(session);
    store = new pgStore({
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
      secure: reqSecureOnlyInProd(),
      // Packaged native apps (Android/Windows) call this server cross-site from
      // their local origin, so the session cookie must be SameSite=None to be
      // sent on those requests. SameSite=None requires Secure, so we only set
      // it when cookies are secure (HTTPS/production); otherwise fall back to
      // "lax" for plain-HTTP local dev.
      sameSite: reqSecureOnlyInProd() ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

// Private helper to check if secure cookies should be dynamically enforced (HTTPS/Production)
function reqSecureOnlyInProd(): boolean {
  return process.env.NODE_ENV === "production";
}


function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (!process.env.REPL_ID) {
    console.log("No REPL_ID found. Booting VaxPlan in Local Developer Authentication mode.");

    app.get("/api/login", async (req, res) => {
      // Get Papua New Guinea as the default active tenant
      let tenant = await storage.getTenantByCode("PNG");
      if (!tenant) {
        const activeTenants = await storage.listActiveTenants();
        tenant = activeTenants[0];
      }
      const tenantId = tenant ? tenant.id : null;

      const emailParam = req.query.email ? String(req.query.email).toLowerCase() : "dev.admin@vaxplan.org";
      
      let dbUser = await storage.getUserByEmail(emailParam);
      
      if (!dbUser) {
        // If not found in DB, let's create a new mock user
        const sub = emailParam === "dev.admin@vaxplan.org" ? "dev-user-id" : `mock-user-${Date.now()}`;
        const nameParts = emailParam.split("@")[0].split(".");
        const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
        const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "User";
        
        await storage.upsertUser({
          id: sub,
          email: emailParam,
          firstName,
          lastName,
          profileImageUrl: null,
        });
        
        dbUser = await storage.getUserByEmail(emailParam);
        
        if (dbUser && tenantId && !dbUser.tenantId) {
          let initialRole: any = "facility_clerk";
          let initialRoles = ["facility_clerk"];
          if (emailParam === "dev.admin@vaxplan.org" || emailParam === "national.admin@vaxplan.org") {
            initialRole = "national_admin";
            initialRoles = ["national_admin"];
          }
          
          await db.update(users)
            .set({ 
              tenantId, 
              role: initialRole, 
              roles: initialRoles,
              updatedAt: new Date() 
            })
            .where(eq(users.id, dbUser.id));
            
          dbUser = await storage.getUserByEmail(emailParam);
        }
      }

      if (!dbUser) {
        return res.status(400).send("Failed to retrieve or create mock login user");
      }

      const mockUser = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role || "facility_clerk",
        roles: dbUser.roles || [],
        permissions: dbUser.permissions || [],
        dataAccessScope: dbUser.dataAccessScope || { provinces: [], districts: [], facilities: [] },
        tenantId: dbUser.tenantId || tenantId,
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
        },
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours in the future
      };

      req.login(mockUser, (err) => {
        if (err) {
          console.error("Local mock login failed:", err);
          return res.status(500).send("Login failed");
        }
        res.redirect("/");
      });
    });

    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

/**
 * Returns the caller's user id from the session.
 *
 * Real OIDC sessions stored by Passport have the shape
 * `{ claims, access_token, refresh_token, expires_at }` and carry the user id
 * on `claims.sub`. The local dev mock login synthesizes an extra top-level
 * `id`. Check `claims.sub` first so OIDC users win, falling back to `id` for
 * the local mock.
 */
export function getCurrentUserId(req: any): string {
  return (req?.user?.claims?.sub ?? req?.user?.id ?? "") as string;
}

/**
 * Returns the caller's DB user row, auto-recovering it from session claims
 * when `storage.getUser` returns null. This protects authenticated write
 * endpoints from returning a spurious 401 when the user has a valid session
 * (verified by `isAuthenticated`) but the `users` row has not been
 * upserted yet — for example on a fresh OIDC sign-in immediately followed
 * by a POST.
 */
export async function ensureDbUserFromSession(req: any) {
  const userId = getCurrentUserId(req);
  if (!userId) return null;
  const existing = await storage.getUser(userId);
  if (existing) return existing;
  const claims = req?.user?.claims;
  if (!claims?.sub) return null;
  await upsertUser(claims);
  return (await storage.getUser(userId)) ?? null;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // In local dev mode the mock refresh token is a placeholder string —
  // attempting a real OIDC token refresh would time-out trying to reach
  // Replit's OIDC servers from a local machine (8-10 second timeout per
  // request). Re-login is the correct recovery path here.
  if (IS_LOCAL_DEV) {
    res.status(401).json({ message: "Session expired — please log in again" });
    return;
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
