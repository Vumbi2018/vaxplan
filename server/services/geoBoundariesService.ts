/**
 * GeoBoundaries API Service
 * Fetches admin boundary GeoJSON for any country at any level (0-5)
 * from the open GeoBoundaries REST API (https://geoboundaries.org)
 *
 * GeoBoundaries covers 200+ countries and returns standard GeoJSON FeatureCollections.
 * This is the recommended data source for developing countries / Africa.
 *
 * GADM alternative: https://gadm.org/download_country.html (manual download, higher detail)
 * OCHA HDX: https://data.humdata.org/ (humanitarian, Africa focus)
 */

export interface GeoBoundariesMeta {
  boundaryID: string;
  boundaryName: string;
  boundaryISO: string;
  boundaryYearRepresented: string;
  boundaryType: string; // ADM0, ADM1, ADM2, ADM3, ADM4, ADM5
  boundaryCanonical: string;
  gjDownloadURL: string;
  imagePreview: string;
  nameInternational?: string;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

const GB_BASE_URL = "https://www.geoboundaries.org/api/current";

/**
 * Map admin level number → GeoBoundaries ADM type string
 */
function levelToAdmType(level: number): string {
  if (level < 0 || level > 5) throw new Error(`Invalid admin level: ${level} (must be 0-5)`);
  return `ADM${level}`;
}

/**
 * Fetch metadata for a specific country + admin level from GeoBoundaries
 * Returns the download URL for the GeoJSON file.
 */
export async function fetchGeoBoundariesMeta(
  countryCode: string,  // ISO-3166 Alpha-3 (e.g. "KEN", "NGA", "ZMB")
  adminLevel: number,   // 0-5
): Promise<GeoBoundariesMeta> {
  const admType = levelToAdmType(adminLevel);
  const url = `${GB_BASE_URL}/gbOpen/${countryCode.toUpperCase()}/${admType}/`;

  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      const err: Error & { status?: number } = new Error(
        `GeoBoundaries has no ${admType} boundary for country code "${countryCode}". ` +
        `Try a lower admin level (most countries top out at ADM2 or ADM3), or upload a custom GeoJSON instead.`
      );
      err.status = 404;
      throw err;
    }
    const err: Error & { status?: number } = new Error(
      `GeoBoundaries API error ${response.status}: ${await response.text()}`
    );
    err.status = 502;
    throw err;
  }

  return response.json() as Promise<GeoBoundariesMeta>;
}

/**
 * Fetch the full GeoJSON FeatureCollection for a country + admin level.
 * Downloads from the GeoBoundaries CDN URL returned by the metadata API.
 */
export async function fetchGeoBoundariesGeoJSON(
  countryCode: string,
  adminLevel: number,
): Promise<{ meta: GeoBoundariesMeta; geojson: GeoJSONFeatureCollection; featureCount: number }> {
  // First get the metadata to retrieve download URL
  const meta = await fetchGeoBoundariesMeta(countryCode, adminLevel);

  if (!meta.gjDownloadURL) {
    throw new Error(`No GeoJSON download URL found for ${countryCode} ADM${adminLevel}`);
  }

  // Fetch the GeoJSON FeatureCollection
  const geoResponse = await fetch(meta.gjDownloadURL, {
    signal: AbortSignal.timeout(60_000), // GeoJSON files can be large
  });

  if (!geoResponse.ok) {
    throw new Error(`Failed to download GeoJSON from ${meta.gjDownloadURL}: ${geoResponse.status}`);
  }

  const geojson = await geoResponse.json() as GeoJSONFeatureCollection;
  const featureCount = geojson.features?.length ?? 0;

  return { meta, geojson, featureCount };
}

/**
 * Calculate bounding box from a GeoJSON FeatureCollection.
 * Returns [minLng, minLat, maxLng, maxLat]
 */
export function calcBBox(geojson: GeoJSONFeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

  function processCoords(coords: any): void {
    if (typeof coords[0] === "number") {
      // This is a single coordinate [lng, lat]
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(processCoords);
    }
  }

  for (const feature of geojson.features) {
    if (feature.geometry?.coordinates) {
      processCoords(feature.geometry.coordinates);
    }
  }

  if (!isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * List of developing countries with GeoBoundaries support
 * Pre-indexed for Africa and key developing regions — used in the BoundaryManager UI.
 */
export const SUPPORTED_COUNTRIES: Array<{
  code: string;       // ISO-3
  name: string;
  region: string;
  maxLevel: number;
  levelNames: Record<number, string>;
}> = [
  // ─── Sub-Saharan Africa ──────────────────────────────────────────
  { code: "NGA", name: "Nigeria",          region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "LGA", 3: "Ward" } },
  { code: "ETH", name: "Ethiopia",         region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "Region", 2: "Zone", 3: "Woreda", 4: "Kebele" } },
  { code: "COD", name: "DR Congo",         region: "Central Africa",    maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Territory", 3: "Sector", 4: "Grouping" } },
  { code: "TZA", name: "Tanzania",         region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Ward", 4: "Village" } },
  { code: "KEN", name: "Kenya",            region: "East Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "County", 2: "Sub-County", 3: "Ward" } },
  { code: "UGA", name: "Uganda",           region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "District", 2: "County", 3: "Sub-County", 4: "Parish" } },
  { code: "MOZ", name: "Mozambique",       region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Post Admin" } },
  { code: "GHA", name: "Ghana",            region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Sub-District" } },
  { code: "CMR", name: "Cameroon",         region: "Central Africa",    maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Arrondissement" } },
  { code: "CIV", name: "Côte d'Ivoire",    region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "District", 2: "Region", 3: "Sous-Préfecture" } },
  { code: "AGO", name: "Angola",           region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "Municipality", 3: "Commune" } },
  { code: "MDG", name: "Madagascar",       region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Region", 3: "District", 4: "Commune" } },
  { code: "ZMB", name: "Zambia",           region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Constituency" } },
  { code: "MWI", name: "Malawi",           region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "District", 3: "Traditional Authority" } },
  { code: "SEN", name: "Senegal",          region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Arrondissement", 3: "Commune" } },
  { code: "ZWE", name: "Zimbabwe",         region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Ward" } },
  { code: "SDN", name: "Sudan",            region: "North Africa",      maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "Locality", 3: "Administrative Unit" } },
  { code: "SSD", name: "South Sudan",      region: "East Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "State", 2: "County", 3: "Payam" } },
  { code: "MLI", name: "Mali",             region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Cercle", 3: "Commune" } },
  { code: "NER", name: "Niger",            region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Commune" } },
  { code: "BFA", name: "Burkina Faso",     region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Province", 3: "Commune" } },
  { code: "TCD", name: "Chad",             region: "Central Africa",    maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Department", 3: "Sous-Préfecture" } },
  { code: "SOM", name: "Somalia",          region: "East Africa",       maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "District" } },
  { code: "RWA", name: "Rwanda",           region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Sector", 4: "Cell" } },
  { code: "BDI", name: "Burundi",          region: "East Africa",       maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "Commune", 3: "Zone", 4: "Colline" } },
  { code: "SLE", name: "Sierra Leone",     region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Chiefdom" } },
  { code: "LBR", name: "Liberia",          region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "County", 2: "District", 3: "Clan" } },
  { code: "GIN", name: "Guinea",           region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Prefecture", 3: "Sub-Prefecture" } },
  { code: "TGO", name: "Togo",             region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Prefecture", 3: "Commune" } },
  { code: "BEN", name: "Benin",            region: "West Africa",       maxLevel: 3, levelNames: { 0: "Country", 1: "Department", 2: "Commune", 3: "Arrondissement" } },
  { code: "ZAF", name: "South Africa",     region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District Municipality", 3: "Local Municipality" } },
  { code: "NAM", name: "Namibia",          region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "Region", 2: "Constituency", 3: "Settlement" } },
  { code: "BWA", name: "Botswana",         region: "Southern Africa",   maxLevel: 2, levelNames: { 0: "Country", 1: "District", 2: "Sub-District" } },
  { code: "LSO", name: "Lesotho",          region: "Southern Africa",   maxLevel: 3, levelNames: { 0: "Country", 1: "District", 2: "Constituency", 3: "Community Council" } },
  { code: "SWZ", name: "Eswatini",         region: "Southern Africa",   maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "Tinkhundla" } },
  { code: "ERI", name: "Eritrea",          region: "East Africa",       maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "Sub-Region" } },
  { code: "DJI", name: "Djibouti",         region: "East Africa",       maxLevel: 2, levelNames: { 0: "Country", 1: "Region", 2: "District" } },

  // ─── South & Southeast Asia ──────────────────────────────────────
  { code: "PAK", name: "Pakistan",         region: "South Asia",        maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "Division", 3: "District" } },
  { code: "AFG", name: "Afghanistan",      region: "South Asia",        maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "District" } },
  { code: "BGD", name: "Bangladesh",       region: "South Asia",        maxLevel: 4, levelNames: { 0: "Country", 1: "Division", 2: "District", 3: "Upazila", 4: "Union" } },
  { code: "MMR", name: "Myanmar",          region: "SE Asia",           maxLevel: 3, levelNames: { 0: "Country", 1: "State/Region", 2: "District", 3: "Township" } },
  { code: "KHM", name: "Cambodia",         region: "SE Asia",           maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Commune" } },
  { code: "LAO", name: "Laos",             region: "SE Asia",           maxLevel: 3, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "Village" } },
  { code: "HTI", name: "Haiti",            region: "Caribbean",         maxLevel: 3, levelNames: { 0: "Country", 1: "Department", 2: "Arrondissement", 3: "Commune" } },

  // ─── Pacific ─────────────────────────────────────────────────────
  { code: "PNG", name: "Papua New Guinea", region: "Pacific",           maxLevel: 4, levelNames: { 0: "Country", 1: "Province", 2: "District", 3: "LLG", 4: "Ward" } },
  { code: "SLB", name: "Solomon Islands",  region: "Pacific",           maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "Ward" } },
  { code: "VUT", name: "Vanuatu",          region: "Pacific",           maxLevel: 2, levelNames: { 0: "Country", 1: "Province", 2: "Local Council" } },
];
