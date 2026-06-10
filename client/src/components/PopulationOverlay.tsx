import { useCallback, useRef, useState } from "react";
import { WMSTileLayer } from "react-leaflet";
import { useToast } from "@/hooks/use-toast";

const WORLDPOP_WMS_URL = "https://ogc.worldpop.org/geoserver/wpGlobal/ows";
const WORLDPOP_LAYER = "wpGlobal:ppp_2020_1km_Aggregated";
const WORLDPOP_ATTRIBUTION = "Population &copy; WorldPop";

export type PopulationOverlayState = {
  showPopulation: boolean;
  setShowPopulation: (next: boolean | ((prev: boolean) => boolean)) => void;
  populationUnavailable: boolean;
  handleTileError: () => void;
};

/**
 * Session-scoped state hook for the WorldPop population-density overlay.
 * The overlay is off by default and resets to off on each page load.
 */
export function usePopulationOverlay(): PopulationOverlayState {
  const [showPopulation, setShowPopulationState] = useState(false);
  const [populationUnavailable, setPopulationUnavailable] = useState(false);
  const errorToastedRef = useRef(false);
  const { toast } = useToast();

  const setShowPopulation = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setShowPopulationState((prev) =>
        typeof next === "function" ? (next as (p: boolean) => boolean)(prev) : next,
      );
    },
    [],
  );

  const handleTileError = useCallback(() => {
    if (errorToastedRef.current) return;
    errorToastedRef.current = true;
    setPopulationUnavailable(true);
    setShowPopulationState(false);
    toast({
      title: "Population layer unavailable",
      description: "Couldn't load WorldPop tiles. The layer may be offline.",
      variant: "destructive",
    });
  }, [toast]);

  return { showPopulation, setShowPopulation, populationUnavailable, handleTileError };
}

/**
 * WMS tile layer rendering the WorldPop population-density raster. Must be
 * placed as a direct child of a react-leaflet <MapContainer>.
 */
export function PopulationWmsLayer({ overlay }: { overlay: PopulationOverlayState }) {
  if (!overlay.showPopulation || overlay.populationUnavailable) return null;
  return (
    <WMSTileLayer
      url={WORLDPOP_WMS_URL}
      layers={WORLDPOP_LAYER}
      format="image/png"
      transparent={true}
      opacity={0.6}
      version="1.3.0"
      attribution={WORLDPOP_ATTRIBUTION}
      eventHandlers={{
        tileerror: overlay.handleTileError,
      }}
    />
  );
}

/**
 * Floating toggle button. Position with `className` (defaults to top-right).
 */
export function PopulationOverlayToggle({
  overlay,
  className,
  testId = "button-toggle-population",
}: {
  overlay: PopulationOverlayState;
  className?: string;
  testId?: string;
}) {
  const { showPopulation, setShowPopulation, populationUnavailable } = overlay;
  return (
    <button
      type="button"
      onClick={() => {
        if (populationUnavailable) return;
        setShowPopulation((v) => !v);
      }}
      disabled={populationUnavailable}
      title={
        populationUnavailable
          ? "Population layer unavailable offline."
          : showPopulation
          ? "Hide population density"
          : "Show population density"
      }
      className={
        (className ?? "absolute top-2 right-2 z-[400]") +
        " rounded-full px-3 py-1 text-xs font-medium shadow transition-colors " +
        (populationUnavailable
          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          : showPopulation
          ? "bg-orange-600 text-white hover:bg-orange-700"
          : "bg-background/90 text-foreground hover:bg-background")
      }
      data-testid={testId}
    >
      Population
    </button>
  );
}

/**
 * Floating legend for the population gradient. Renders nothing when the
 * overlay is hidden or unavailable. Position with `className` (defaults to
 * bottom-right).
 */
export function PopulationOverlayLegend({
  overlay,
  className,
}: {
  overlay: PopulationOverlayState;
  className?: string;
}) {
  if (!overlay.showPopulation || overlay.populationUnavailable) return null;
  return (
    <div
      className={
        (className ?? "absolute bottom-2 right-2 z-[400]") +
        " rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow"
      }
      data-testid="legend-population"
    >
      <div className="mb-1 font-medium">Population density</div>
      <div
        className="h-2 w-32 rounded"
        style={{
          background:
            "linear-gradient(to right, #ffffcc, #ffeda0, #fed976, #feb24c, #fd8d3c, #fc4e2a, #e31a1c, #b10026)",
        }}
      />
      <div className="mt-0.5 flex justify-between text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
