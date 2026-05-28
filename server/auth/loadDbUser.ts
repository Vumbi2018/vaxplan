import type { RequestHandler } from "express";
import { ensureDbUserFromSession } from "../replitAuth";
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
 * `undefined`); handlers that require an authenticated user should continue
 * to null-check before use.
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
