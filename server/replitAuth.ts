import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// Updated Code: Safe session initialization with validation and explicit production environment checks
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in production environment!");
    } else {
      console.warn("WARNING: SESSION_SECRET environment variable is missing! Falling back to a temporary development secret.");
      secret = "temporary_dev_session_secret_for_gis_microplanning";
    }
  }

  return session({
    secret: secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: reqSecureOnlyInProd(), // Only require secure cookies in production or HTTPS setups
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

    // Define seedGranularUsers function inside local auth scope
    const seedGranularUsers = async (tenantId: string) => {
      const seededUsersList = [
        {
          id: "seed-user-national-admin",
          email: "national.admin@vaxplan.org",
          firstName: "National",
          lastName: "Admin",
          role: "national_admin",
          roles: ["national_admin"],
          permissions: [],
          dataAccessScope: { provinces: [], districts: [], facilities: [] },
          facilityId: null,
          districtId: null,
          provinceId: null,
          isActive: true,
          tenantId,
        },
        {
          id: "seed-user-provincial-coord",
          email: "provincial.coord@vaxplan.org",
          firstName: "Provincial",
          lastName: "Coordinator",
          role: "provincial_coordinator",
          roles: ["provincial_coordinator"],
          permissions: ["view_clients", "approve_plans", "manage_users"],
          dataAccessScope: { provinces: [1], districts: [], facilities: [] }, // Locked to Province ID 1 (Highlands Province)
          facilityId: null,
          districtId: null,
          provinceId: 1,
          isActive: true,
          tenantId,
        },
        {
          id: "seed-user-district-mgr",
          email: "district.mgr@vaxplan.org",
          firstName: "District",
          lastName: "Manager",
          role: "district_manager",
          roles: ["district_manager"],
          permissions: ["view_clients", "manage_session_plans", "approve_plans"],
          dataAccessScope: { provinces: [], districts: [1], facilities: [] }, // Locked to District ID 1 (District A)
          facilityId: null,
          districtId: 1,
          provinceId: 1,
          isActive: true,
          tenantId,
        },
        {
          id: "seed-user-facility-clerk",
          email: "facility.clerk@vaxplan.org",
          firstName: "Facility",
          lastName: "Clerk",
          role: "facility_clerk",
          roles: ["facility_clerk", "gis_specialist"], // Dual-role
          permissions: ["log_immunization"], // User permission override
          dataAccessScope: { provinces: [], districts: [], facilities: [1] }, // Locked to Facility ID 1 (Facility A)
          facilityId: 1,
          districtId: 1,
          provinceId: 1,
          isActive: true,
          tenantId,
        },
      ];

      console.log("Seeding granular test accounts...");
      for (const userConfig of seededUsersList) {
        const existing = await storage.getUserByEmail(userConfig.email);
        if (!existing) {
          await db.insert(users).values(userConfig as any);
          console.log(`Successfully pre-seeded test account: ${userConfig.email}`);
        } else {
          // Overwrite/sync to ensure exact state for demo credentials
          await db.update(users)
            .set({
              role: userConfig.role as any,
              roles: userConfig.roles,
              permissions: userConfig.permissions,
              dataAccessScope: userConfig.dataAccessScope,
              facilityId: userConfig.facilityId,
              districtId: userConfig.districtId,
              provinceId: userConfig.provinceId,
            })
            .where(eq(users.id, existing.id));
        }
      }
    };

    // Auto-trigger seeding on bootstrap
    storage.getTenantByCode("PNG").then((tenant) => {
      if (tenant) {
        seedGranularUsers(tenant.id).catch((err) => {
          console.error("Failed to seed granular test accounts:", err);
        });
      } else {
        storage.listActiveTenants().then((activeTenants) => {
          if (activeTenants.length > 0) {
            seedGranularUsers(activeTenants[0].id).catch((err) => {
              console.error("Failed to seed granular test accounts:", err);
            });
          }
        });
      }
    });
    
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

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
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
