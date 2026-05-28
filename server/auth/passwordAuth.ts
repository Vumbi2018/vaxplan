import type { Express, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LEN = 8;

// Dummy bcrypt hash used to equalize timing on failure paths (no user, no
// password set, etc.) so attackers can't distinguish "user exists" from
// "user does not exist" by response time.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.IxQ7XJjF6Q9hL.q5p9PqQ9oC5Yga";

// In-memory login rate limit. Keyed by IP + email (lowercased). Resets after
// the window. For a 2026 colleague-testing deployment this is sufficient;
// migrate to Redis if we ever scale to multiple server instances.
type Attempt = { count: number; firstAt: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

function rateKey(req: Request, email: string) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  return `${ip}::${email}`;
}
function checkLocked(key: string): number | null {
  const a = attempts.get(key);
  const now = Date.now();
  if (a && a.lockedUntil > now) return Math.ceil((a.lockedUntil - now) / 1000);
  if (a && now - a.firstAt > WINDOW_MS) attempts.delete(key);
  return null;
}
function recordFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.lockedUntil = now + LOCK_MS;
}
function clearAttempts(key: string) { attempts.delete(key); }

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Express middleware: gate a route behind "is a national_admin OR
 * platform admin in their home tenant". Used for the source-tarball
 * download so colleagues can't pull the repo anonymously.
 */
export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated?.() || !req.user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Prefer DB lookup (authoritative), fall back to session claims so we
  // don't 403 a freshly-logged-in user whose dbUser fetch fails for a
  // transient reason. Either source must show an admin role.
  const userId = req.user?.claims?.sub ?? req.user?.id;
  const dbUser = userId ? await storage.getUser(userId).catch(() => null) : null;
  const role = (dbUser?.role ?? req.user?.role) as string | undefined;
  const isPlatformAdmin = !!(dbUser?.isPlatformAdmin);
  if (isPlatformAdmin || role === "national_admin" || role === "national_program_manager") {
    return next();
  }
  return res.status(403).json({ message: "Admin only." });
};

async function buildSessionUser(dbUser: any, tenantId: string) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role || "facility_clerk",
    roles: dbUser.roles || [],
    permissions: dbUser.permissions || [],
    dataAccessScope: dbUser.dataAccessScope || { provinces: [], districts: [], facilities: [] },
    tenantId,
    claims: {
      sub: dbUser.id,
      email: dbUser.email,
      first_name: dbUser.firstName,
      last_name: dbUser.lastName,
    },
    access_token: "password-session",
    refresh_token: "password-session",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
}

export function registerPasswordAuthRoutes(app: Express) {
  app.post("/api/auth/login-password", async (req: Request, res: Response) => {
    const emailRaw = String((req.body && req.body.email) || "").trim().toLowerCase();
    const password = String((req.body && req.body.password) || "");
    const key = rateKey(req, emailRaw);

    try {
      if (!emailRaw || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const lockedFor = checkLocked(key);
      if (lockedFor !== null) {
        return res
          .status(429)
          .json({ message: `Too many attempts. Try again in ${Math.ceil(lockedFor / 60)} min.` });
      }

      const dbUser = await storage.getUserByEmail(emailRaw);
      // Run bcrypt.compare unconditionally (against a dummy hash when the
      // user is missing/inactive/has no password) to equalize timing.
      const hashToCheck = (dbUser && dbUser.isActive && dbUser.passwordHash) || DUMMY_HASH;
      const ok = await bcrypt.compare(password, hashToCheck);

      if (!ok || !dbUser || !dbUser.isActive || !dbUser.passwordHash) {
        recordFailure(key);
        return res.status(401).json({ message: "Invalid email or password." });
      }

      clearAttempts(key);

      const tenantId = dbUser.tenantId || "";
      const sessionUser = await buildSessionUser(dbUser, tenantId);

      // Regenerate session ID to defeat fixation, and clear any prior
      // tenant view state so a stale viewTenantId from a previous user
      // doesn't bleed into the new identity.
      const reqAny = req as any;
      const finishLogin = () => {
        reqAny.login(sessionUser, (err: any) => {
          if (err) {
            console.error("[password-auth] req.login failed:", err);
            return res.status(500).json({ message: "Login failed." });
          }
          if (reqAny.session) {
            reqAny.session.tenantId = tenantId || undefined;
            delete reqAny.session.viewTenantId;
          }
          return res.json({
            ok: true,
            user: {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
              role: dbUser.role,
            },
          });
        });
      };

      if (reqAny.session && typeof reqAny.session.regenerate === "function") {
        reqAny.session.regenerate((err: any) => {
          if (err) {
            console.error("[password-auth] session regenerate failed:", err);
            return res.status(500).json({ message: "Login failed." });
          }
          finishLogin();
        });
      } else {
        finishLogin();
      }
    } catch (err) {
      console.error("[password-auth] login failed:", err);
      return res.status(500).json({ message: "Login failed." });
    }
  });

  app.post("/api/auth/set-password", isAuthenticated, async (req: any, res: Response) => {
    try {
      const caller = await storage.getUser(req.user?.claims?.sub ?? req.user?.id);
      if (!caller) return res.status(401).json({ message: "Unauthorized" });

      const targetEmailRaw = String((req.body && req.body.email) || "").trim().toLowerCase();
      const newPassword = String((req.body && req.body.password) || "");
      if (!targetEmailRaw || !newPassword) {
        return res.status(400).json({ message: "email and password are required." });
      }
      if (newPassword.length < MIN_PASSWORD_LEN) {
        return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
      }

      const target = await storage.getUserByEmail(targetEmailRaw);
      if (!target) return res.status(404).json({ message: "User not found." });

      const isSelf = target.id === caller.id;
      const isPlatformAdmin = !!caller.isPlatformAdmin;
      const isSameTenantNationalAdmin =
        caller.tenantId &&
        target.tenantId === caller.tenantId &&
        (caller.role === "national_admin" || caller.role === "national_program_manager");

      if (!isSelf && !isPlatformAdmin && !isSameTenantNationalAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const hash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, target.id));
      return res.json({ ok: true, userId: target.id });
    } catch (err) {
      console.error("[password-auth] set-password failed:", err);
      return res.status(500).json({ message: "Set password failed." });
    }
  });
}
