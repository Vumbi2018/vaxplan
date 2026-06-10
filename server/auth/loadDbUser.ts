import type { RequestHandler } from "express";
import { ensureDbUserFromSession } from "../auth";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User | null;
    }
  }
}

/**
 * Resolves the caller's DB user row once per request and attaches it to
 * `req.dbUser`. Runs after `tenantContext` in the global middleware chain so
 * authenticated handlers can read `req.dbUser` directly instead of each one
 * re-fetching via `ensureDbUserFromSession`.
 *
 * Unauthenticated requests pass through untouched (`req.dbUser` stays
 * `undefined`); handlers that require an authenticated user should compose
 * `requireDbUser` (below) into their middleware chain instead of writing
 * their own null check.
 */
export const loadDbUser: RequestHandler = async (req, _res, next) => {
  if (!req.isAuthenticated?.()) return next();
  try {
    req.dbUser = await ensureDbUserFromSession(req);
  } catch (err) {
    console.error("loadDbUser error:", err);
    req.dbUser = null;
  }
  next();
};

/**
 * Guarantees `req.dbUser` is non-null for downstream handlers. Pair this with
 * `isAuthenticated` (and usually `requireTenant`) — by the time it calls
 * `next()`, handlers can use `req.dbUser!` safely.
 *
 * Why this exists: many write handlers used to re-check `if (!req.dbUser)
 * return 401`, which produced misleading "Unauthorized" responses for
 * sessions that were actually fully authenticated but whose `loadDbUser`
 * lookup transiently returned null (race on first OIDC login, replaced
 * user row, etc.). This middleware:
 *   1. Trusts the global `loadDbUser` result first.
 *   2. If it's still null, retries `ensureDbUserFromSession` once — which
 *      will upsert the row from the session claims if the user simply
 *      hasn't been materialised yet.
 *   3. Only if that *also* fails does it respond — and with a 500 and a
 *      clear, actionable message, never a misleading 401. (The request
 *      already passed `isAuthenticated`, so a 401 here is provably wrong.)
 */
export const requireDbUser: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.dbUser) {
    try {
      req.dbUser = await ensureDbUserFromSession(req);
    } catch (err) {
      console.error("requireDbUser recovery error:", err);
    }
  }
  if (!req.dbUser) {
    return res.status(500).json({
      message:
        "Could not resolve your user account from the active session. Please sign out and back in.",
    });
  }
  next();
};
