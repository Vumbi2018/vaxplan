import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { offlineDb, enqueueOutbox } from "./offlineDb";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ─── Offline Database Query Router ──────────────────────────────────────────
async function getOfflineData(url: string): Promise<any> {
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  
  // Extract path and query params
  const [pathname, searchStr] = cleanUrl.split("?");
  const searchParams = new URLSearchParams(searchStr || "");

  if (pathname === "/api/regions") {
    return await offlineDb.regions.toArray();
  }
  if (pathname === "/api/provinces") {
    return await offlineDb.provinces.toArray();
  }
  if (pathname === "/api/districts") {
    return await offlineDb.districts.toArray();
  }
  if (pathname === "/api/llgs") {
    return await offlineDb.llgs.toArray();
  }
  if (pathname === "/api/facilities") {
    return await offlineDb.facilities.toArray();
  }
  if (pathname === "/api/villages") {
    return await offlineDb.villages.toArray();
  }
  if (pathname === "/api/clients") {
    const facilityId = searchParams.get("facilityId");
    if (facilityId) {
      return await offlineDb.clients.where("facilityId").equals(Number(facilityId)).toArray();
    }
    return await offlineDb.clients.toArray();
  }
  if (pathname === "/api/vaccines/config" || pathname === "/api/vaccines") {
    return await offlineDb.vaccineConfigs.toArray();
  }
  if (pathname === "/api/population") {
    return await offlineDb.populationData.toArray();
  }
  if (pathname === "/api/stock/ledger") {
    const facilityId = searchParams.get("facilityId");
    if (facilityId) {
      return await offlineDb.stockTransactions.where("facilityId").equals(Number(facilityId)).toArray();
    }
    return await offlineDb.stockTransactions.toArray();
  }
  if (pathname === "/api/monthly-reports") {
    const facilityId = searchParams.get("facilityId");
    if (facilityId) {
      return await offlineDb.monthlyReports.where("facilityId").equals(Number(facilityId)).toArray();
    }
    return await offlineDb.monthlyReports.toArray();
  }
  if (pathname === "/api/sessions" || pathname === "/api/session-plans") {
    return await offlineDb.sessionPlans.toArray();
  }
  if (pathname === "/api/session-day-plans") {
    return await offlineDb.sessionDayPlans.toArray();
  }
  if (pathname === "/api/sessions/villages") {
    // Session ↔ village junction data is not replicated offline; return empty array
    return [];
  }
  if (pathname === "/api/microplans") {
    // Microplans are not replicated offline; return empty array
    return [];
  }
  if (pathname === "/api/budget-items") {
    return await offlineDb.budgetItems.toArray();
  }
  if (pathname === "/api/mobilization") {
    return await offlineDb.mobilizationActivities.toArray();
  }

  // Handle dynamic / parameterized endpoints
  const clientsVaccinationsRegex = /^\/api\/clients\/([^/]+)\/vaccinations$/;
  const matchVaccinations = pathname.match(clientsVaccinationsRegex);
  if (matchVaccinations) {
    const clientId = matchVaccinations[1];
    return await offlineDb.clientVaccinations.where("clientId").equals(clientId).toArray();
  }

  const facilityCatchmentRegex = /^\/api\/facilities\/([^/]+)\/catchments$/;
  const matchCatchment = pathname.match(facilityCatchmentRegex);
  if (matchCatchment) {
    return []; // Return empty array offline for catchments
  }

  if (pathname === "/api/auth/user") {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("vaxplan_active_user");
      if (cached) return JSON.parse(cached);
    }
    const tenantIdRow = await offlineDb.syncMeta.get("tenantId");
    const tenantId = tenantIdRow?.value || "1";
    return {
      id: "offline-user",
      email: "offline@ministry.gov",
      role: "national_admin",
      roles: ["national_admin"],
      firstName: "Offline",
      lastName: "Officer",
      tenantId: tenantId,
      isActive: true,
    };
  }

  if (pathname === "/api/me/tenant") {
    const tenantIdRow = await offlineDb.syncMeta.get("tenantId");
    const tenantId = tenantIdRow?.value || "1";
    // Resolve dynamically based on offline active tenant ID as well as URL path fallbacks
    const isZambia = tenantId === "2" || tenantId === "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06" || (typeof window !== "undefined" && (window.location.hostname.includes("zambia") || window.location.href.includes("ZMB")));
    const isSSD = tenantId === "3" || tenantId === "705728db-4892-49d7-9b67-35aa67c7574b" || (typeof window !== "undefined" && (window.location.hostname.includes("sudan") || window.location.href.includes("SSD")));

    // Original Code (Mock returning Zambia vs South Sudan with 4-level/5-level mismatch):
    /*
    const isZambia = tenantId === "2" || (typeof window !== "undefined" && (window.location.hostname.includes("zambia") || window.location.href.includes("ZMB")));
    return {
      id: Number(tenantId) || tenantId,
      name: isZambia ? "Republic of Zambia Ministry of Health" : "Republic of South Sudan Ministry of Health",
      countryCode: isZambia ? "ZMB" : "SSD",
      settings: {
        skipRegionLevel: isZambia,
        adminLevelLabels: {
          level1: isZambia ? "Province" : "Region",
          level2: isZambia ? "District" : "Province",
          level3: isZambia ? "Facility" : "District",
          level4: isZambia ? "Ward" : "LLG",
          level5: "Village"
        }
      }
    };
    */

    // Updated Code: Fully aligned offline dynamic mock tenant details for PNG, SSD, and Zambia
    return {
      id: Number(tenantId) || tenantId,
      name: isZambia 
        ? "Republic of Zambia Ministry of Health" 
        : isSSD 
          ? "Republic of South Sudan Ministry of Health" 
          : "Papua New Guinea National Department of Health",
      countryCode: isZambia ? "ZMB" : isSSD ? "SSD" : "PNG",
      settings: {
        skipRegionLevel: true, // skip region level for all countries to start Level 1 at Province/State
        adminLevelLabels: {
          level1: "Region",
          level2: isZambia ? "Province" : isSSD ? "State" : "Province",
          level3: isZambia ? "District" : isSSD ? "County" : "District",
          level4: isZambia ? "Ward" : isSSD ? "Payam" : "LLG",
          level5: "Village"
        }
      }
    };
  }

  if (pathname === "/api/public/tenants") {
    return [
      { id: 1, name: "South Sudan EPI", countryCode: "SSD" },
      { id: 2, name: "Zambia EPI", countryCode: "ZMB" }
    ];
  }

  if (pathname === "/api/users") {
    return [];
  }

  throw new Error(`Offline query mapping not found for URL: ${url}`);
}

// ─── Offline Database Mutation Router ───────────────────────────────────────
async function writeToIndexedDB(method: string, url: string, data: any): Promise<void> {
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  const [pathname] = cleanUrl.split("?");
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments[0] !== "api") return;
  const resource = segments[1];
  const idStr = segments[2];

  let table: any = null;
  if (resource === "regions") table = offlineDb.regions;
  else if (resource === "provinces") table = offlineDb.provinces;
  else if (resource === "districts") table = offlineDb.districts;
  else if (resource === "llgs") table = offlineDb.llgs;
  else if (resource === "facilities") table = offlineDb.facilities;
  else if (resource === "villages") table = offlineDb.villages;
  else if (resource === "clients") {
    if (segments[3] === "vaccinations") {
      table = offlineDb.clientVaccinations;
    } else {
      table = offlineDb.clients;
    }
  } 
  /* Original Code: Only mapped sessionPlans/sessions
  else if (resource === "sessionPlans" || resource === "sessions") {
    table = offlineDb.sessionPlans;
  }
  */
  // Updated Code: Mapped both sessionPlans/sessions and session-day-plans/sessionDayPlans to their respective Dexie tables
  else if (resource === "sessionPlans" || resource === "sessions") {
    table = offlineDb.sessionPlans;
  } else if (resource === "session-day-plans" || resource === "sessionDayPlans") {
    table = offlineDb.sessionDayPlans;
  }
  else if (resource === "budgetItems" || resource === "budget-items") {
    table = offlineDb.budgetItems;
  } else if (resource === "mobilization") {
    table = offlineDb.mobilizationActivities;
  } else if (resource === "stock") {
    if (segments[2] === "transaction") {
      table = offlineDb.stockTransactions;
    }
  } else if (resource === "monthly-reports") {
    table = offlineDb.monthlyReports;
  } else if (resource === "population") {
    table = offlineDb.populationData;
  } else if (resource === "vaccines") {
    if (segments[2] === "config") {
      table = offlineDb.vaccineConfigs;
    }
  }

  if (!table) return;

  const id = idStr ? (isNaN(Number(idStr)) ? idStr : Number(idStr)) : data?.id;

  if (method === "POST") {
    await table.put({ ...data, _syncedAt: Date.now() });
  } else if (method === "PUT" || method === "PATCH") {
    if (id !== undefined) {
      const existing = await table.get(id);
      await table.put({ ...existing, ...data, _syncedAt: Date.now() });
    }
  } else if (method === "DELETE") {
    if (id !== undefined) {
      await table.delete(id);
    }
  }
}

async function handleOfflineMutation(method: string, url: string, data: any): Promise<any> {
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  const [pathname] = cleanUrl.split("?");

  if (pathname === "/api/me/switch-tenant") {
    const targetId = String(data.tenantId);
    await offlineDb.syncMeta.put({ key: "tenantId", value: targetId });
    return { success: true };
  }

  const tenantRow = await offlineDb.syncMeta.get("tenantId");
  const tenantId = tenantRow?.value || "1";
  const segments = pathname.split("/").filter(Boolean);
  const resource = segments[1];

  let itemData = { ...data };
  if (method === "POST" && !itemData.id) {
    if (resource === "clients") {
      itemData.id = crypto.randomUUID();
    } else {
      itemData.id = Math.floor(Date.now() + Math.random() * 1000);
    }
    itemData.tenantId = tenantId;
    itemData._localOnly = true;
  }

  await writeToIndexedDB(method, url, itemData);

  await enqueueOutbox({
    tenantId,
    entityType: resource,
    method: method as any,
    url: cleanUrl,
    body: JSON.stringify(itemData),
    localId: itemData.id ? String(itemData.id) : undefined,
  });

  // Dynamic status refresh in background
  setTimeout(() => {
    import("./syncEngine").then(({ syncEngine }) => {
      syncEngine.refreshPendingCount(tenantId);
    });
  }, 100);

  return itemData;
}

// ─── API Requests ───────────────────────────────────────────────────────────
export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // If browser network state is offline, run mutation locally and queue in outbox
  const isOffline = !navigator.onLine;
  if (isOffline && method !== "GET") {
    return await handleOfflineMutation(method, url, data) as T;
  }

  // True network failures (fetch rejects — no response received) fall back to
  // the offline outbox. HTTP responses (including 4xx/5xx) must be surfaced
  // to the caller so the UI can show a real error toast, NOT silently queued.
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (err) {
    if (method !== "GET") {
      console.warn("Network request failed, falling back to local database write:", err);
      return await handleOfflineMutation(method, url, data) as T;
    }
    throw err;
  }

  await throwIfResNotOk(res);

  if (res.status === 204) {
    return undefined as T;
  }
  const resultData = await res.json();

  // After success write on server, update local IndexedDB cache in background
  try {
    if (method !== "GET") {
      await writeToIndexedDB(method, url, resultData || data);
    }
  } catch (e) {
    console.warn("IndexedDB cache update failed:", e);
  }

  return resultData;
}

// ─── Original TanStack React Query Configuration (Commented out to follow rule 2) ───
/*
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false,
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst",
    },
  },
});
*/

// ─── Refactored TanStack React Query with Offline-First Bridging ───────────
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const isOffline = !navigator.onLine;

    // Immediately resolve from local IndexedDB if offline
    if (isOffline) {
      try {
        return await getOfflineData(url);
      } catch (e) {
        console.warn("Offline IndexedDB fetch failed:", e);
      }
    }

    let res: Response;
    try {
      res = await fetch(url, {
        credentials: "include",
      });
    } catch (err) {
      // Genuine network failure (fetch rejected — no response). Fall back to
      // local IndexedDB so the app stays usable when truly offline.
      try {
        console.warn("Network unreachable, falling back to local IndexedDB:", err);
        return await getOfflineData(url);
      } catch (offlineErr) {
        throw err;
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    // A clean JSON response from the server — including 4xx like 403
    // (cross-tenant write blocked) — is a real answer, not an offline
    // situation. Surface it to the caller so the toast layer sees the
    // server's actual message instead of falling through to IndexedDB.
    if (isJson) {
      if (!res.ok) {
        let message = `${res.status}`;
        try {
          const body = await res.json();
          if (body && typeof body === "object" && body.message) {
            message = `${res.status}: ${body.message}`;
          } else {
            message = `${res.status}: ${JSON.stringify(body)}`;
          }
        } catch {
          message = `${res.status}: ${res.statusText}`;
        }
        throw new Error(message);
      }
      const data = await res.json();
      if (url === "/api/auth/user" && data) {
        localStorage.setItem("vaxplan_active_user", JSON.stringify(data));
      }
      return data;
    }

    // Non-JSON response — likely an HTML error page (Vite SPA fallback,
    // proxy error, gateway timeout, etc.). Try the IndexedDB cache so the
    // user still sees data; if that also fails, surface the original error.
    const nonJsonErr = new Error(
      `${res.status}: Server returned non-JSON (${contentType.split(";")[0] || "unknown"})`,
    );
    try {
      console.warn("Server returned non-JSON, falling back to local IndexedDB:", nonJsonErr);
      return await getOfflineData(url);
    } catch (offlineErr) {
      throw nonJsonErr;
    }
  };

export function getOfflineStaleTime(): number {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("vaxplan_offline_stale_hours");
    if (saved) {
      const hours = parseFloat(saved);
      if (!isNaN(hours)) return hours * 60 * 60 * 1000;
    }
  }
  // Default to 2 hours
  return 2 * 60 * 60 * 1000;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      /* Original staleTime function (unsupported by TanStack Query, evaluated as NaN/0 causing infinite refetch loops):
      staleTime: () => {
        const isOffline = !navigator.onLine;
        if (isOffline) {
          return getOfflineStaleTime();
        }
        // If system is online, cache resources for 5 minutes to ensure high performance and prevent refetch loops
        return 5 * 60 * 1000;
      },
      */
      // Static staleTime — 5 minutes. For offline scenarios the queryFn resolves
      // instantly from IndexedDB regardless of staleTime, so there is no need for
      // a dynamic getter here. Using a plain number avoids referential instability
      // that ES6 getters can cause in React's render cycle (which was triggering
      // "Too many re-renders" infinite loops).
      staleTime: 5 * 60 * 1000,
      retry: false,
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst",
    },
  },
});


