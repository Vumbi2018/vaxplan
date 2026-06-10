import { TileLayer } from "react-leaflet";
import { Map as MapIcon, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersistedBasemap, type Basemap } from "@/hooks/usePersistedBasemap";
import {
  OSM_TILE_ATTRIBUTION,
  ESRI_IMAGERY_ATTRIBUTION,
} from "@/data/dataSources";

export { usePersistedBasemap };
export type { Basemap };

export function BasemapTileLayer({ basemap }: { basemap: Basemap }) {
  if (basemap === "satellite") {
    return (
      // maxNativeZoom=17: ArcGIS World Imagery only provides tiles to z17 in most rural
      // Africa / PNG regions. Requesting z18+ returns ArcGIS's own "Map data not yet
      // available" placeholder tile image (this is served BY ArcGIS, not a Leaflet error).
      // Leaflet scales z17 tiles for any zoom above 17 — smooth over-zoom, no error tiles.
      // maxZoom=22: allows the map to zoom up to level 22 using scaled tiles.
      <TileLayer
        attribution={ESRI_IMAGERY_ATTRIBUTION}
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={17}
        maxZoom={22}
      />
    );
  }
  return (
    <TileLayer
      attribution={OSM_TILE_ATTRIBUTION}
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

/**
 * Floating basemap switcher control. Render INSIDE a relatively-positioned
 * map wrapper (the same div that contains <MapContainer />) — it positions
 * itself top-right above the Leaflet zoom controls.
 */
export function BasemapSwitcher({
  basemap,
  onChange,
  className,
}: {
  basemap: Basemap;
  onChange: (b: Basemap) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute top-3 right-3 z-[1000] flex rounded-md overflow-hidden shadow-md border border-border bg-card",
        className,
      )}
      role="group"
      aria-label="Basemap"
      data-testid="basemap-switcher"
    >
      <button
        type="button"
        onClick={() => onChange("osm")}
        aria-pressed={basemap === "osm"}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
          basemap === "osm"
            ? "bg-primary text-primary-foreground"
            : "bg-card hover:bg-secondary text-foreground",
        )}
        data-testid="basemap-osm"
      >
        <MapIcon className="h-3.5 w-3.5" />
        Map
      </button>
      <button
        type="button"
        onClick={() => onChange("satellite")}
        aria-pressed={basemap === "satellite"}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-l border-border transition-colors",
          basemap === "satellite"
            ? "bg-primary text-primary-foreground"
            : "bg-card hover:bg-secondary text-foreground",
        )}
        data-testid="basemap-satellite"
      >
        <Satellite className="h-3.5 w-3.5" />
        Satellite
      </button>
    </div>
  );
}
