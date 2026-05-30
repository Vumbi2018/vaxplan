/**
 * tenantCache.ts
 *
 * Small localStorage-backed cache for the cross-tenant country switcher so it
 * keeps working offline.
 *
 * Two keys are used:
 *   - `vaxplan_active_tenant`  — the tenant the user is currently viewing
 *     (written by App.tsx + TenantSwitcher). Shape: { id, code, name, ... }.
 *   - `vaxplan_tenants_cache`  — the last successfully-fetched list of active
 *     tenants from GET /api/public/tenants.
 *
 * The switcher always merges the cached list with the active tenant so the
 * currently-active country is never missing from the dropdown — that was the
 * root cause of the "active = PNG but PNG not listed" mismatch when the list
 * fetch failed offline.
 */

export interface CachedTenant {
  id: string;
  code: string;
  name: string;
  countryCode?: string | null;
  settings?: { isDemo?: boolean } | Record<string, unknown>;
}

const TENANTS_CACHE_KEY = "vaxplan_tenants_cache";
const ACTIVE_TENANT_KEY = "vaxplan_active_tenant";

/** Persist the freshly-fetched public tenant list for offline reuse. */
export function saveTenantsCache(list: CachedTenant[]): void {
  try {
    if (Array.isArray(list) && list.length > 0) {
      localStorage.setItem(TENANTS_CACHE_KEY, JSON.stringify(list));
    }
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/** Read the last-known tenant list (used as offline fallback / initial data). */
export function loadTenantsCache(): CachedTenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedTenant[]) : [];
  } catch {
    return [];
  }
}

/** Read the currently-active tenant object cached by App.tsx / the switcher. */
export function loadActiveTenant(): CachedTenant | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TENANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
      return parsed as CachedTenant;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Merge a base tenant list with the active tenant, de-duplicating by id and
 * guaranteeing the active tenant is always present (even if the list fetch
 * failed offline or the active tenant was filtered out as demo).
 */
export function mergeWithActive(
  list: CachedTenant[],
  active: CachedTenant | null | undefined,
): CachedTenant[] {
  const byId = new Map<string, CachedTenant>();
  for (const t of list) {
    if (t && typeof t.id === "string") byId.set(t.id, t);
  }
  if (active && typeof active.id === "string" && !byId.has(active.id)) {
    byId.set(active.id, active);
  }
  return Array.from(byId.values());
}
