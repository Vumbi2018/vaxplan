import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, MapPin } from "lucide-react";
import type { Province, District, Facility } from "@shared/schema";

export interface GeoCascadeFilterProps {
  provinceId: number | null;
  districtId: number | null;
  facilityId?: number | null;
  onProvinceChange: (id: number | null) => void;
  onDistrictChange: (id: number | null) => void;
  onFacilityChange?: (id: number | null) => void;
  showFacility?: boolean;
  provinces?: Province[] | null;
  districts?: District[] | null;
  facilities?: Facility[] | null;
  provinceLabel?: string;
  districtLabel?: string;
  facilityLabel?: string;
  className?: string;
  testIdPrefix?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

/**
 * Cascading Province → District → (optional) Facility filter bar.
 *
 * - Tenant-scoped: relies on the server's session-aware endpoints
 *   (`/api/provinces`, `/api/districts`, `/api/facilities`) when callers
 *   don't pass their own lists.
 * - Pure controlled component: parent owns the selected IDs.
 * - Cascading: changing a parent clears the child selection.
 */
export function GeoCascadeFilter({
  provinceId,
  districtId,
  facilityId,
  onProvinceChange,
  onDistrictChange,
  onFacilityChange,
  showFacility = false,
  provinces: providedProvinces,
  districts: providedDistricts,
  facilities: providedFacilities,
  provinceLabel = "Province",
  districtLabel = "District",
  facilityLabel = "Facility",
  className,
  testIdPrefix = "geo",
}: GeoCascadeFilterProps) {
  // Tenant context — used as a cache scope so switching countries refetches.
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: fetchedProvinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    queryFn: () => fetchJson<Province[]>("/api/provinces"),
    enabled: providedProvinces === undefined && !!tenantInfo?.id,
  });

  const { data: fetchedDistricts } = useQuery<District[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    queryFn: () => fetchJson<District[]>("/api/districts"),
    enabled: providedDistricts === undefined && !!tenantInfo?.id,
  });

  const { data: fetchedFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities", tenantInfo?.id],
    queryFn: () => fetchJson<Facility[]>("/api/facilities"),
    enabled:
      showFacility &&
      providedFacilities === undefined &&
      !!tenantInfo?.id,
  });

  const provinces = providedProvinces ?? fetchedProvinces ?? [];
  const districts = providedDistricts ?? fetchedDistricts ?? [];
  const facilities = providedFacilities ?? fetchedFacilities ?? [];

  const sortedProvinces = useMemo(
    () => [...provinces].sort((a, b) => a.name.localeCompare(b.name)),
    [provinces],
  );

  const filteredDistricts = useMemo(() => {
    const list = provinceId
      ? districts.filter((d) => Number((d as any).provinceId) === Number(provinceId))
      : districts;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [districts, provinceId]);

  const filteredFacilities = useMemo(() => {
    if (!showFacility) return [];
    const list = districtId
      ? facilities.filter(
          (f) => Number((f as any).districtId) === Number(districtId),
        )
      : provinceId
      ? facilities.filter((f) => {
          const d = districts.find(
            (dd) => Number(dd.id) === Number((f as any).districtId),
          );
          return d && Number((d as any).provinceId) === Number(provinceId);
        })
      : facilities;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, districts, provinceId, districtId, showFacility]);

  const hasSelection =
    provinceId !== null || districtId !== null || (showFacility && facilityId);

  const clearAll = () => {
    onProvinceChange(null);
    onDistrictChange(null);
    if (showFacility && onFacilityChange) onFacilityChange(null);
  };

  const handleProvince = (val: string) => {
    const id = val === "all" ? null : Number(val);
    onProvinceChange(id);
    onDistrictChange(null);
    if (showFacility && onFacilityChange) onFacilityChange(null);
  };

  const handleDistrict = (val: string) => {
    const id = val === "all" ? null : Number(val);
    onDistrictChange(id);
    if (showFacility && onFacilityChange) onFacilityChange(null);
  };

  const handleFacility = (val: string) => {
    if (!onFacilityChange) return;
    onFacilityChange(val === "all" ? null : Number(val));
  };

  return (
    <div
      className={`flex flex-wrap items-end gap-3 ${className ?? ""}`}
      data-testid={`${testIdPrefix}-cascade-filter`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground self-end pb-2.5">
        <MapPin className="h-3.5 w-3.5" />
        Filter by location
      </div>

      <div className="min-w-[180px] flex-1 max-w-[240px]">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {provinceLabel}
        </label>
        <Select
          value={provinceId?.toString() ?? "all"}
          onValueChange={handleProvince}
        >
          <SelectTrigger data-testid={`${testIdPrefix}-select-province`}>
            <SelectValue placeholder={`All ${provinceLabel}s`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {provinceLabel}s</SelectItem>
            {sortedProvinces.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[180px] flex-1 max-w-[240px]">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {districtLabel}
        </label>
        <Select
          value={districtId?.toString() ?? "all"}
          onValueChange={handleDistrict}
          disabled={filteredDistricts.length === 0}
        >
          <SelectTrigger data-testid={`${testIdPrefix}-select-district`}>
            <SelectValue placeholder={`All ${districtLabel}s`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {districtLabel}s</SelectItem>
            {filteredDistricts.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showFacility && (
        <div className="min-w-[200px] flex-1 max-w-[280px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {facilityLabel} <span className="opacity-50">(optional)</span>
          </label>
          <Select
            value={facilityId?.toString() ?? "all"}
            onValueChange={handleFacility}
            disabled={filteredFacilities.length === 0}
          >
            <SelectTrigger data-testid={`${testIdPrefix}-select-facility`}>
              <SelectValue placeholder={`All ${facilityLabel.toLowerCase()}s`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {facilityLabel.toLowerCase()}s</SelectItem>
              {filteredFacilities.map((f) => (
                <SelectItem key={f.id} value={f.id.toString()}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasSelection && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          data-testid={`${testIdPrefix}-clear-filter`}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
