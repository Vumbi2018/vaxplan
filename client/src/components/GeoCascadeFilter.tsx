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
import { X, MapPin, Lock } from "lucide-react";
import { pluralize } from "@/lib/utils";
import type { Province, District, Facility, Region } from "@shared/schema";

export interface GeoCascadeFilterProps {
  provinceId: number | null;
  districtId: number | null;
  facilityId?: number | null;
  regionId?: number | null;
  onProvinceChange: (id: number | null) => void;
  onDistrictChange: (id: number | null) => void;
  onFacilityChange?: (id: number | null) => void;
  onRegionChange?: (id: number | null) => void;
  showFacility?: boolean;
  showRegion?: boolean;
  provinces?: Province[] | null;
  districts?: District[] | null;
  facilities?: Facility[] | null;
  regions?: Region[] | null;
  provinceLabel?: string;
  districtLabel?: string;
  facilityLabel?: string;
  regionLabel?: string;
  className?: string;
  testIdPrefix?: string;
  /**
   * When true (default), each downstream selector is locked until its parent
   * is selected — District is disabled until Province is chosen, Facility is
   * disabled until District is chosen. This enforces the true cascading UX and
   * prevents planners from skipping a level.
   *
   * Set to false only in rare contexts where all levels should remain
   * independently interactive (e.g. admin batch-edit screens).
   */
  strictCascade?: boolean;
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
 * - Smart cascade (strictCascade=true, default): District is disabled until a
 *   Province is selected; Facility is disabled until a District is selected.
 *   This mirrors the OSM / GIS convention of progressive geographic narrowing.
 */
export function GeoCascadeFilter({
  provinceId,
  districtId,
  facilityId,
  regionId,
  onProvinceChange,
  onDistrictChange,
  onFacilityChange,
  onRegionChange,
  showFacility = false,
  showRegion = false,
  provinces: providedProvinces,
  districts: providedDistricts,
  facilities: providedFacilities,
  regions: providedRegions,
  provinceLabel = "Province",
  districtLabel = "District",
  facilityLabel = "Facility",
  regionLabel = "Region",
  className,
  testIdPrefix = "geo",
  strictCascade = true,
}: GeoCascadeFilterProps) {
  // Tenant context — used as a cache scope so switching countries refetches.
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: fetchedRegions } = useQuery<Region[]>({
    queryKey: ["/api/regions", tenantInfo?.id],
    queryFn: () => fetchJson<Region[]>("/api/regions"),
    enabled: showRegion && providedRegions === undefined && !!tenantInfo?.id,
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
  const regions = providedRegions ?? fetchedRegions ?? [];

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name)),
    [regions],
  );

  const sortedProvinces = useMemo(() => {
    const list = showRegion && regionId
      ? provinces.filter((p) => Number((p as any).regionId) === Number(regionId))
      : provinces;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [provinces, regionId, showRegion]);

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

  // Smart cascade: downstream selectors are locked when strictCascade is on
  // and the parent has not yet been selected.
  const districtLocked = strictCascade && !provinceId;
  const facilityLocked = strictCascade && (!provinceId || !districtId);

  const hasSelection =
    (showRegion && regionId) ||
    provinceId !== null ||
    districtId !== null ||
    (showFacility && facilityId);

  const clearAll = () => {
    if (showRegion && onRegionChange) onRegionChange(null);
    onProvinceChange(null);
    onDistrictChange(null);
    if (showFacility && onFacilityChange) onFacilityChange(null);
  };

  const handleRegion = (val: string) => {
    if (!onRegionChange) return;
    const id = val === "all" ? null : Number(val);
    onRegionChange(id);
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

      {showRegion && (
        <div className="min-w-[180px] flex-1 max-w-[240px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {regionLabel}
          </label>
          <Select
            value={regionId?.toString() ?? "all"}
            onValueChange={handleRegion}
          >
            <SelectTrigger data-testid={`${testIdPrefix}-select-region`}>
              <SelectValue placeholder={`All ${regionLabel}s`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {regionLabel}s</SelectItem>
              {sortedRegions.map((r) => (
                <SelectItem key={r.id} value={r.id.toString()}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Province — always enabled; it's the top of the cascade */}
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

      {/* District — locked until Province selected in strict mode */}
      <div className="min-w-[180px] flex-1 max-w-[240px]">
        <label className={`text-xs font-medium mb-1 flex items-center gap-1 ${districtLocked ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
          {districtLabel}
          {districtLocked && <Lock className="h-2.5 w-2.5 opacity-60" />}
        </label>
        <Select
          value={districtId?.toString() ?? "all"}
          onValueChange={handleDistrict}
          disabled={districtLocked || filteredDistricts.length === 0}
        >
          <SelectTrigger
            data-testid={`${testIdPrefix}-select-district`}
            className={districtLocked ? "opacity-50 cursor-not-allowed" : ""}
          >
            <SelectValue
              placeholder={
                districtLocked
                  ? `Select ${provinceLabel.toLowerCase()} first`
                  : `All ${districtLabel}s`
              }
            />
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

      {/* Facility — locked until District selected in strict mode */}
      {showFacility && (
        <div className="min-w-[200px] flex-1 max-w-[280px]">
          <label className={`text-xs font-medium mb-1 flex items-center gap-1 ${facilityLocked ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
            {facilityLabel}
            {facilityLocked && <Lock className="h-2.5 w-2.5 opacity-60" />}
            {!facilityLocked && <span className="opacity-50">(optional)</span>}
          </label>
          <Select
            value={facilityId?.toString() ?? "all"}
            onValueChange={handleFacility}
            disabled={facilityLocked || filteredFacilities.length === 0}
          >
            <SelectTrigger
              data-testid={`${testIdPrefix}-select-facility`}
              className={facilityLocked ? "opacity-50 cursor-not-allowed" : ""}
            >
              <SelectValue
                placeholder={
                  facilityLocked
                    ? `Select ${districtLabel.toLowerCase()} first`
                    : `All ${pluralize(facilityLabel).toLowerCase()}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {pluralize(facilityLabel).toLowerCase()}</SelectItem>
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
