/**
 * Regression guard for the "who's online" live-map location pinning.
 *
 * Background: the live map shows each online user at their last known position.
 * A device GPS fix is precise; the IP-based fallback usually resolves only to
 * the ISP's registered city (frequently the capital), so it can be hundreds of
 * km from the user's real location. `storage.touchPresence` therefore has a
 * deliberate rule for which heartbeat is allowed to overwrite the stored coords:
 *
 *   1. A GPS heartbeat (opts.hasGps) ALWAYS overwrites the stored location.
 *   2. An IP-only heartbeat seeds the location ONLY when the presence row has no
 *      coords yet.
 *   3. An IP-only heartbeat must NOT clobber an existing precise GPS fix — this
 *      is the bug that made the map pin flip between the user's true GPS spot and
 *      the capital whenever GPS momentarily failed between heartbeats.
 *
 * If touchPresence ever reverts to unconditionally writing whatever coords the
 * latest heartbeat carried, case (3) breaks and the jumping returns silently.
 * This test exercises all three cases against the real presence row.
 *
 * Requires a Postgres test DB with at least one tenant seeded (TEST_DATABASE_URL
 * or DATABASE_URL).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "../db";
import { storage } from "../storage";
import { tenants, users, pageViews, type InsertPageView } from "@shared/schema";

let tenantId: string;
let userId: string;

// A GPS heartbeat carries precise device coords; an IP-only heartbeat carries
// the coarse ISP city (here a stand-in "capital" far from the GPS spot).
const GPS = { lat: -9.4438, lng: 147.1803 }; // real device position
const IP = { lat: -6.314993, lng: 143.95555 }; // coarse IP fallback ("capital")

function pageView(
  coords: { lat: number; lng: number },
  cityLabel: string,
): InsertPageView {
  return {
    userId,
    path: "/dashboard",
    ipAddress: "203.0.113.7",
    country: "Testland",
    region: "Test Region",
    city: cityLabel,
    latitude: String(coords.lat),
    longitude: String(coords.lng),
    userAgent: "vitest",
  } as InsertPageView;
}

async function readStoredCoords(): Promise<{ lat: number | null; lng: number | null; city: string | null }> {
  const [row] = await db
    .select({
      latitude: pageViews.latitude,
      longitude: pageViews.longitude,
      city: pageViews.city,
    })
    .from(pageViews)
    .where(eq(pageViews.userId, userId))
    .limit(1);
  return {
    lat: row?.latitude != null ? Number(row.latitude) : null,
    lng: row?.longitude != null ? Number(row.longitude) : null,
    city: row?.city ?? null,
  };
}

beforeAll(async () => {
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).limit(1);
  if (!tenant) {
    throw new Error(
      "No tenants in test DB. Run the country bootstrap seeds before running this test.",
    );
  }
  tenantId = tenant.id;

  // A dedicated user so the presence row is fully self-contained and cleaned up
  // afterwards (no mutation of seed rows or other users' presence).
  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: `presence-test-${Date.now()}@example.com`,
      firstName: "Presence",
      lastName: "Test",
      role: "facility_clerk",
    } as typeof users.$inferInsert)
    .returning({ id: users.id });
  userId = user.id;
});

afterAll(async () => {
  try {
    if (userId) {
      await db.delete(pageViews).where(eq(pageViews.userId, userId)).catch(() => {});
      await db.delete(users).where(eq(users.id, userId)).catch(() => {});
    }
  } finally {
    await pool.end().catch(() => {});
  }
});

describe("storage.touchPresence — live-map location pinning", () => {
  it("a GPS heartbeat overwrites the stored location", async () => {
    // Seed the presence row with an initial IP-only fix...
    await storage.touchPresence(tenantId, userId, pageView(IP, "Capital"), { hasGps: false });
    let stored = await readStoredCoords();
    expect(stored.lat).toBeCloseTo(IP.lat, 4);
    expect(stored.lng).toBeCloseTo(IP.lng, 4);

    // ...then a GPS heartbeat must overwrite it with the precise position.
    await storage.touchPresence(tenantId, userId, pageView(GPS, "Real City"), { hasGps: true });
    stored = await readStoredCoords();
    expect(stored.lat).toBeCloseTo(GPS.lat, 4);
    expect(stored.lng).toBeCloseTo(GPS.lng, 4);
    expect(stored.city).toBe("Real City");
  });

  it("an IP-only heartbeat seeds the location when the presence row has no coords", async () => {
    // A fresh presence row with no coordinates at all.
    const noCoords = pageView(IP, "Capital");
    noCoords.latitude = null;
    noCoords.longitude = null;
    noCoords.city = null;
    await db
      .update(pageViews)
      .set({ latitude: null, longitude: null, city: null })
      .where(eq(pageViews.userId, userId));

    let stored = await readStoredCoords();
    expect(stored.lat).toBeNull();
    expect(stored.lng).toBeNull();

    // The IP-only heartbeat is allowed to seed the (otherwise empty) location.
    await storage.touchPresence(tenantId, userId, pageView(IP, "Capital"), { hasGps: false });
    stored = await readStoredCoords();
    expect(stored.lat).toBeCloseTo(IP.lat, 4);
    expect(stored.lng).toBeCloseTo(IP.lng, 4);
    expect(stored.city).toBe("Capital");
  });

  it("an IP-only heartbeat does NOT clobber an existing precise GPS fix (no-clobber)", async () => {
    // Establish a precise GPS fix on the presence row.
    await storage.touchPresence(tenantId, userId, pageView(GPS, "Real City"), { hasGps: true });
    let stored = await readStoredCoords();
    expect(stored.lat).toBeCloseTo(GPS.lat, 4);
    expect(stored.lng).toBeCloseTo(GPS.lng, 4);

    // A subsequent IP-only heartbeat (GPS momentarily failed) must leave the
    // stored GPS coordinates untouched — this is the jump the test guards.
    await storage.touchPresence(tenantId, userId, pageView(IP, "Capital"), { hasGps: false });
    stored = await readStoredCoords();
    expect(
      stored.lat,
      "An IP-only heartbeat clobbered an existing GPS fix — the live-map pin " +
        "would jump from the user's real location to the IP city (capital).",
    ).toBeCloseTo(GPS.lat, 4);
    expect(stored.lng).toBeCloseTo(GPS.lng, 4);
    expect(stored.city).toBe("Real City");
  });
});
