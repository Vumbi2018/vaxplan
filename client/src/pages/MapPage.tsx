import { useQuery } from "@tanstack/react-query";
import { MapView } from "@/components/MapView";
import type { Facility, Village } from "@shared/schema";
import { offlineDb } from "../lib/offlineDb";

interface PublicTenant {
  id: string;
  code: string;
  name: string;
  countryCode?: string | null;
  settings?: {
    isDemo?: boolean;
    mapCenter?: [number, number];
    mapZoom?: number;
  };
}

interface MyTenant { id: string }

const FALLBACK_CENTER: [number, number] = [-6.0, 147.0];
const FALLBACK_ZOOM = 6;

export default function MapPage() {
  /*
  // Original queries (commented out to preserve working code while adding offline capabilities):
  const { data: activeTenantInfo } = useQuery<MyTenant>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: tenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities", activeTenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/facilities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    },
    enabled: !!activeTenantInfo?.id,
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages", activeTenantInfo?.id],
    queryFn: async () => {
      const res = await fetch("/api/villages", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch villages");
      return res.json();
    },
    enabled: !!activeTenantInfo?.id,
  });
  */

  // Updated queries with offline fallbacks to Dexie local DB:
  const { data: activeTenantInfo } = useQuery<MyTenant>({
    queryKey: ["/api/me/tenant"],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("vaxplan_active_tenant");
        if (cached) return JSON.parse(cached);
        return { id: "default" };
      }
      const res = await fetch("/api/me/tenant");
      if (!res.ok) throw new Error("Failed to fetch tenant");
      const data = await res.json();
      localStorage.setItem("vaxplan_active_tenant", JSON.stringify(data));
      return data;
    }
  });

  const { data: tenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("vaxplan_active_tenant");
        if (cached) return [JSON.parse(cached)];
        return [];
      }
      const res = await fetch("/api/public/tenants");
      if (!res.ok) throw new Error("Failed to fetch public tenants");
      return res.json();
    }
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities", activeTenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.facilities.toArray() as any[];
      }
      const res = await fetch("/api/facilities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    },
    enabled: !!activeTenantInfo?.id,
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages", activeTenantInfo?.id],
    queryFn: async () => {
      if (!navigator.onLine) {
        return await offlineDb.villages.toArray() as any[];
      }
      const res = await fetch("/api/villages", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch villages");
      return res.json();
    },
    enabled: !!activeTenantInfo?.id,
  });

  const activeTenant = tenants?.find((t) => t.id === activeTenantInfo?.id);
  const tenantCenter = activeTenant?.settings?.mapCenter;
  const tenantZoom = activeTenant?.settings?.mapZoom;

  // correctly parse decimal strings returned by node-postgres to numbers and calculate averages safely.
  const facilityCoords = (facilities ?? []).filter(
    (f) => f.latitude !== null && f.longitude !== null && !isNaN(Number(f.latitude)) && !isNaN(Number(f.longitude))
  );

  let center: [number, number] = tenantCenter ?? FALLBACK_CENTER;
  let zoom: number = tenantZoom ?? FALLBACK_ZOOM;

  if (!tenantCenter && facilityCoords.length > 0) {
    const avgLat =
      facilityCoords.reduce((s, f) => s + Number(f.latitude), 0) /
      facilityCoords.length;
    const avgLng =
      facilityCoords.reduce((s, f) => s + Number(f.longitude), 0) /
      facilityCoords.length;
    center = [avgLat, avgLng];
  }

  return (
    <div className="h-full">
      <MapView
        facilities={facilities || []}
        villages={villages || []}
        center={center}
        zoom={zoom}
        height="100%"
        showFacilityList={true}
      />
    </div>
  );
}
