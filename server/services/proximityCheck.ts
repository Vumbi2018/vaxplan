/**
 * Proximity + population overlap check.
 *
 * Extracted from server/routes.ts so the offline-sync replay path
 * (server/services/syncService.ts) can reuse the same logic that
 * `POST /api/sessions` and `PATCH /api/sessions/:id` enforce online.
 *
 * Returns warnings, the nearby sessions that triggered them, and the
 * available / committed population numbers. Callers decide whether to
 * block (online write paths) or to apply-and-warn (offline outbox replay,
 * since the clerk already committed the edit locally and we can't lose it).
 */

import { db } from "../db";
import { storage } from "../storage";
import { populationData, sessionVillages } from "@shared/schema";
import { and, eq, inArray } from "drizzle-orm";

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function resolveSessionLocation(
  _tenantId: string,
  session: any,
  villageCache: Map<number, any>,
  facilityCache: Map<number, any>,
  svByPlan: Map<number, number[]>,
): Promise<{ lat: number; lng: number } | null> {
  const gj = session.geojson as any;
  if (gj && gj.type === "Point" && Array.isArray(gj.coordinates)) {
    return { lat: Number(gj.coordinates[1]), lng: Number(gj.coordinates[0]) };
  }
  if (gj && gj.type === "Polygon" && Array.isArray(gj.coordinates?.[0])) {
    const ring = gj.coordinates[0] as number[][];
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    return { lat, lng };
  }
  const vIds = svByPlan.get(session.id) ?? [];
  for (const vid of vIds) {
    const v = villageCache.get(vid);
    if (v?.latitude != null && v?.longitude != null) {
      return { lat: Number(v.latitude), lng: Number(v.longitude) };
    }
  }
  const f = facilityCache.get(session.facilityId);
  if (f?.latitude != null && f?.longitude != null) {
    return { lat: Number(f.latitude), lng: Number(f.longitude) };
  }
  return null;
}

export interface ProximityCheckInput {
  facilityId: number;
  scheduledDate: string | Date;
  targetPopulation: number;
  villageIds?: number[];
  lat?: number;
  lng?: number;
  excludeSessionId?: number;
}

export interface ProximityCheckResult {
  warnings: string[];
  nearbySessions: any[];
  availablePopulation: number;
  committedPopulation: number;
}

export async function checkProximityAndPopulation(
  tenantId: string,
  input: ProximityCheckInput,
): Promise<ProximityCheckResult> {
  const warnings: string[] = [];
  const PROXIMITY_KM = 2;
  const DAYS_WINDOW = 14;

  const facList = await storage.getFacilities(tenantId);
  const facMap = new Map<number, any>(facList.map((f: any) => [f.id, f]));
  const vilList = await storage.getVillages(tenantId);
  const vilMap = new Map<number, any>(vilList.map((v: any) => [v.id, v]));

  let lat = input.lat;
  let lng = input.lng;
  if (lat == null || lng == null) {
    const vIds = input.villageIds ?? [];
    for (const vid of vIds) {
      const v = vilMap.get(vid);
      if (v?.latitude != null && v?.longitude != null) {
        lat = Number(v.latitude);
        lng = Number(v.longitude);
        break;
      }
    }
    if (lat == null || lng == null) {
      const f = facMap.get(input.facilityId);
      if (f?.latitude != null && f?.longitude != null) {
        lat = Number(f.latitude);
        lng = Number(f.longitude);
      }
    }
  }
  if (lat == null || lng == null) {
    return {
      warnings: ["No coordinates available for this session — proximity check skipped."],
      nearbySessions: [],
      availablePopulation: 0,
      committedPopulation: 0,
    };
  }

  const target = new Date(input.scheduledDate);
  const winStart = new Date(target.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);
  const winEnd = new Date(target.getTime() + DAYS_WINDOW * 24 * 60 * 60 * 1000);

  const all = await storage.getSessionPlans(tenantId);
  const svRows = await db
    .select()
    .from(sessionVillages)
    .where(eq(sessionVillages.tenantId, String(tenantId)));
  const svByPlan = new Map<number, number[]>();
  for (const r of svRows) {
    const arr = svByPlan.get(r.sessionId) ?? [];
    arr.push(r.villageId);
    svByPlan.set(r.sessionId, arr);
  }

  const nearby: any[] = [];
  let committed = 0;
  for (const s of all as any[]) {
    if (input.excludeSessionId && s.id === input.excludeSessionId) continue;
    if (s.status === "cancelled" || s.status === "completed") continue;
    if (!s.scheduledDate) continue;
    const sd = new Date(s.scheduledDate);
    if (sd < winStart || sd > winEnd) continue;
    const loc = await resolveSessionLocation(tenantId, s, vilMap, facMap, svByPlan);
    if (!loc) continue;
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d <= PROXIMITY_KM) {
      nearby.push({
        id: s.id,
        name: s.name,
        scheduledDate: s.scheduledDate,
        distanceKm: Number(d.toFixed(2)),
        targetPopulation: s.targetPopulation ?? 0,
      });
      committed += s.targetPopulation ?? 0;
    }
  }

  const year = new Date().getFullYear();
  const nearbyVillages: any[] = [];
  for (const v of vilList as any[]) {
    if (v.latitude == null || v.longitude == null) continue;
    const d = haversineKm(lat, lng, Number(v.latitude), Number(v.longitude));
    if (d <= PROXIMITY_KM) nearbyVillages.push(v);
  }
  let available = 0;
  if (nearbyVillages.length) {
    const ids = nearbyVillages.map((v) => v.id);
    const popRows = await db
      .select()
      .from(populationData)
      .where(
        and(
          eq(populationData.tenantId, String(tenantId)),
          inArray(populationData.villageId, ids),
        ),
      );
    const bestByVillage = new Map<number, any>();
    for (const r of popRows as any[]) {
      const cur = bestByVillage.get(r.villageId);
      if (!cur || r.year === year || (cur.year < r.year && cur.year !== year)) {
        bestByVillage.set(r.villageId, r);
      }
    }
    bestByVillage.forEach((r) => { available += r.totalPopulation ?? 0; });
  }

  if (nearby.length > 0) {
    warnings.push(
      `${nearby.length} other session(s) already planned within ${PROXIMITY_KM} km and ±${DAYS_WINDOW} days. Possible duplicate outreach.`,
    );
  }
  const totalAsk = committed + (input.targetPopulation ?? 0);
  if (available > 0 && totalAsk > available) {
    warnings.push(
      `Combined target population (${totalAsk}) exceeds population available within ${PROXIMITY_KM} km (${available}). Likely double-counted.`,
    );
  }

  return {
    warnings,
    nearbySessions: nearby,
    availablePopulation: available,
    committedPopulation: committed,
  };
}
