/**
 * Curated inventory of the external data sources, open datasets, and software
 * libraries VaxPlan relies on, grouped by category for the Data Sources &
 * Acknowledgements page (Task #267).
 *
 * This is a static, human-maintained list — keep it in sync when a new external
 * data source, basemap, or major dependency is introduced. Per-tenant
 * population sources are layered on top at render time from the active tenant's
 * settings.populationSources.
 */

export interface DataSource {
  name: string;
  description: string;
  url?: string;
  license?: string;
}

export interface DataSourceCategory {
  id: string;
  title: string;
  blurb: string;
  sources: DataSource[];
}

export const dataSourceCategories: DataSourceCategory[] = [
  {
    id: "maps",
    title: "Maps & Basemaps",
    blurb:
      "Background map tiles and the mapping engine used across the Map View, microplanning, and supervision location pickers.",
    sources: [
      {
        name: "OpenStreetMap",
        description:
          "Default street basemap tiles. Community-maintained, global coverage — used as the standard background layer throughout the app.",
        url: "https://www.openstreetmap.org/copyright",
        license: "© OpenStreetMap contributors (ODbL)",
      },
      {
        name: "Esri World Imagery",
        description:
          "Optional satellite / aerial imagery basemap for spotting settlements and terrain that street maps miss.",
        url: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
        license: "Esri, Maxar, Earthstar Geographics and the GIS community",
      },
      {
        name: "Leaflet",
        description:
          "Open-source JavaScript library that powers the interactive maps, markers, and catchment polygons.",
        url: "https://leafletjs.com/",
        license: "BSD-2-Clause",
      },
    ],
  },
  {
    id: "boundaries",
    title: "Administrative Boundaries",
    blurb:
      "Province, district, and lower-level boundary polygons used to draw the hierarchy and to assign facilities to districts during onboarding.",
    sources: [
      {
        name: "geoBoundaries",
        description:
          "Open database of political administrative boundaries (ADM0–ADM5) for 200+ countries. VaxPlan fetches these in the Boundary Manager and uses ADM2 polygons to place facilities into districts when onboarding a country.",
        url: "https://www.geoboundaries.org/",
        license: "Open data — attribution required (CC BY / source-specific)",
      },
      {
        name: "GADM",
        description:
          "Higher-detail global administrative areas, available as an alternative boundary source for countries needing finer geometry.",
        url: "https://gadm.org/",
        license: "Free for academic & non-commercial use",
      },
      {
        name: "UN OCHA — Humanitarian Data Exchange (HDX)",
        description:
          "Humanitarian boundary and operational datasets (COD-AB) — the upstream source behind several countries' district boundaries.",
        url: "https://data.humdata.org/",
        license: "Varies by dataset (often CC BY / CC BY-IGO)",
      },
    ],
  },
  {
    id: "population",
    title: "Population & Demographics",
    blurb:
      "Population estimates and demographic ratios used for catchment populations and vaccine-needs forecasting. The specific sources active for your country are listed below.",
    sources: [
      {
        name: "National Statistics Office census & projections",
        description:
          "Official national census counts and yearly projections — the authoritative baseline for province and district populations where available.",
      },
      {
        name: "WorldPop",
        description:
          "Open, high-resolution gridded population estimates (~100m). Useful for catchment estimates where recent census figures are unavailable.",
        url: "https://www.worldpop.org/",
        license: "CC BY 4.0",
      },
      {
        name: "Health registry / HMIS catchment headcounts",
        description:
          "Facility-reported catchment populations from the national health management information system.",
      },
      {
        name: "Community / CHW surveys",
        description:
          "Local enumeration by community health workers, used to refine or correct estimates at the ward and village level.",
      },
    ],
  },
  {
    id: "facilities",
    title: "Health Facilities & Health Information Systems",
    blurb:
      "Master facility lists and the health information systems VaxPlan exchanges data with.",
    sources: [
      {
        name: "National Master Facility Lists",
        description:
          "Each country's official register of health facilities (names, types, ownership, codes, coordinates) — the basis of the Facilities directory.",
      },
      {
        name: "Sub-Saharan public health facility dataset",
        description:
          "Open compilation of public health facility locations across Sub-Saharan Africa, used to seed facility points where a national list is being assembled.",
        url: "https://data.humdata.org/",
        license: "Open data (source-specific attribution)",
      },
      {
        name: "DHIS2",
        description:
          "The district health information platform many ministries run. VaxPlan can cross-reference facilities and exchange aggregate data via DHIS2 identifiers.",
        url: "https://dhis2.org/",
        license: "BSD-3-Clause",
      },
    ],
  },
  {
    id: "guidance",
    title: "Immunization Guidance & Standards",
    blurb:
      "The technical guidance and immunization standards VaxPlan's microplanning workflow and default vaccine schedules follow.",
    sources: [
      {
        name: "WHO — Immunization, Vaccines and Biologicals",
        description:
          "World Health Organization guidance on immunization programmes, schedules, and the Reaching Every District (RED) microplanning approach.",
        url: "https://www.who.int/teams/immunization-vaccines-and-biologicals",
      },
      {
        name: "Gavi, the Vaccine Alliance",
        description:
          "Guidance behind the RED-Q (RED with a quality focus) microplanning method used in the app's planning workflow.",
        url: "https://www.gavi.org/",
      },
      {
        name: "UNICEF — Immunization",
        description:
          "Supply, cold chain, and demand-generation guidance for childhood immunization programmes.",
        url: "https://www.unicef.org/immunization",
      },
    ],
  },
  {
    id: "software",
    title: "Software, Fonts & Icons",
    blurb:
      "Open-source building blocks behind the interface and geospatial calculations.",
    sources: [
      {
        name: "Turf.js",
        description:
          "Geospatial analysis library used for catchment overlap detection, point-in-polygon district assignment, and distance calculations.",
        url: "https://turfjs.org/",
        license: "MIT",
      },
      {
        name: "Google Fonts",
        description:
          "Typography used in the interface (Roboto, DM Sans, Geist Mono, Fira Code).",
        url: "https://fonts.google.com/",
        license: "Open Font License / Apache 2.0",
      },
      {
        name: "Lucide Icons",
        description: "The icon set used throughout the interface.",
        url: "https://lucide.dev/",
        license: "ISC",
      },
    ],
  },
];

/**
 * Tile/basemap attribution strings rendered directly on every Leaflet map via
 * Leaflet's built-in attribution control. The open licences behind these tiles
 * (OpenStreetMap's ODbL, Esri's terms) require the credit to be visible on the
 * map itself — not only on the Data Sources page — so every map component reuses
 * these constants as the single source of truth. Keep them in sync with the
 * "Maps & Basemaps" licences listed above.
 */
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const ESRI_IMAGERY_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics and the GIS community';

export const acknowledgements = [
  "VaxPlan is built on open data and open-source software. We are grateful to the OpenStreetMap community, geoBoundaries, WorldPop, UN OCHA / HDX, the World Health Organization, UNICEF, Gavi, DHIS2, and the maintainers of the many open-source libraries listed here.",
  "Boundary, population, and facility datasets remain the property of their respective owners and are used under their published licenses. Always cite the original source when reusing this data outside VaxPlan.",
  "Country data loaded into VaxPlan is owned by the respective Ministry / Department of Health. External reference datasets are used only to bootstrap and enrich that official data.",
];
