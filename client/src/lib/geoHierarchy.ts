import type { Province, District, Village, Facility } from "@shared/schema";

export interface GeoMaps {
  provinceMap?: Map<number, Province>;
  districtMap?: Map<number, District>;
  villageMap?: Map<number, Village>;
  facilityMap?: Map<number, Facility>;
}

export interface GeoHierarchy {
  provinceId: number | null;
  provinceName: string;
  districtId: number | null;
  districtName: string;
}

/**
 * Resolve the Province + District geography for an arbitrary record.
 *
 * Order of precedence:
 *   1. Direct provinceId / districtId fields on the record.
 *   2. Transitive lookup: villageId -> village.districtId -> district.provinceId
 *   3. Transitive lookup: facilityId -> facility.districtId -> district.provinceId
 *
 * Returns "—" for any name that cannot be resolved.
 */
export function getRecordHierarchy(
  record: Record<string, unknown> | null | undefined,
  maps: GeoMaps,
): GeoHierarchy {
  const r = (record ?? {}) as Record<string, unknown>;
  const { provinceMap, districtMap, villageMap, facilityMap } = maps;

  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let provinceId = toNum(r.provinceId);
  let districtId = toNum(r.districtId);

  if (!districtId) {
    const villageId = toNum(r.villageId);
    if (villageId && villageMap) {
      const v = villageMap.get(villageId);
      if (v) {
        districtId = toNum((v as any).districtId);
      }
    }
  }

  if (!districtId) {
    const facilityId = toNum(r.facilityId) ?? toNum(r.assignedFacilityId);
    if (facilityId && facilityMap) {
      const f = facilityMap.get(facilityId);
      if (f) {
        districtId = toNum((f as any).districtId);
      }
    }
  }

  if (!provinceId && districtId && districtMap) {
    const d = districtMap.get(districtId);
    if (d) {
      provinceId = toNum((d as any).provinceId);
    }
  }

  const provinceName =
    provinceId && provinceMap ? provinceMap.get(provinceId)?.name ?? "—" : "—";
  const districtName =
    districtId && districtMap ? districtMap.get(districtId)?.name ?? "—" : "—";

  return { provinceId, provinceName, districtId, districtName };
}

/**
 * Build lookup maps from the four canonical reference collections.
 */
export function buildGeoMaps(args: {
  provinces?: Province[] | null;
  districts?: District[] | null;
  villages?: Village[] | null;
  facilities?: Facility[] | null;
}): Required<GeoMaps> {
  const provinceMap = new Map<number, Province>();
  (args.provinces ?? []).forEach((p) => provinceMap.set(Number(p.id), p));
  const districtMap = new Map<number, District>();
  (args.districts ?? []).forEach((d) => districtMap.set(Number(d.id), d));
  const villageMap = new Map<number, Village>();
  (args.villages ?? []).forEach((v) => villageMap.set(Number(v.id), v));
  const facilityMap = new Map<number, Facility>();
  (args.facilities ?? []).forEach((f) => facilityMap.set(Number(f.id), f));
  return { provinceMap, districtMap, villageMap, facilityMap };
}

/*
// Original withGeoColumns implementation:
export function withGeoColumns<T extends Record<string, unknown>>(
  items: T[],
  maps: GeoMaps,
): Array<T & {
  _geoProvinceId: number | null;
  _geoProvinceName: string;
  _geoDistrictId: number | null;
  _geoDistrictName: string;
}> {
  return items.map((item) => {
    const h = getRecordHierarchy(item, maps);
    return {
      ...item,
      _geoProvinceId: h.provinceId,
      _geoProvinceName: h.provinceName,
      _geoDistrictId: h.districtId,
      _geoDistrictName: h.districtName,
    };
  });
}
*/

// Updated withGeoColumns:
// Checks if client-side map lookups fail to resolve the province/district/village names,
// and falls back to pre-resolved _geo fields returned from the backend (or sync engine) if present.
export function withGeoColumns<T extends Record<string, unknown>>(
  items: T[],
  maps: GeoMaps,
): Array<T & {
  _geoProvinceId: number | null;
  _geoProvinceName: string;
  _geoDistrictId: number | null;
  _geoDistrictName: string;
  _geoVillageName?: string | null;
}> {
  const { villageMap } = maps;
  return items.map((item) => {
    const h = getRecordHierarchy(item, maps);
    const villageId = Number(item.villageId);
    const vName = villageId && villageMap ? villageMap.get(villageId)?.name : undefined;
    return {
      ...item,
      _geoProvinceId: h.provinceId || (item._geoProvinceId as number | null),
      _geoProvinceName: h.provinceName !== "—" ? h.provinceName : (item._geoProvinceName as string || "—"),
      _geoDistrictId: h.districtId || (item._geoDistrictId as number | null),
      _geoDistrictName: h.districtName !== "—" ? h.districtName : (item._geoDistrictName as string || "—"),
      _geoVillageName: vName || (item._geoVillageName as string | null | undefined),
    };
  });
}
