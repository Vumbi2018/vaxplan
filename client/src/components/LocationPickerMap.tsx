import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_TILE_ATTRIBUTION } from "@/data/dataSources";
import { Button } from "@/components/ui/button";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface PickedLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

// A teardrop pin drawn purely with inline HTML so we never depend on Leaflet's
// default marker image assets (which break under bundlers).
const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%);width:26px;height:26px;">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="#6366f1" stroke="white" stroke-width="1.5">
        <path d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7z"/>
        <circle cx="12" cy="9" r="2.6" fill="white" stroke="none"/>
      </svg>
    </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Leaflet measures its container at mount. Inside a dialog the container is
// still animating/zero-size then, so the map renders gray and ignores clicks.
// Re-measure once it's visible and whenever the container resizes.
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const timers = [setTimeout(fix, 100), setTimeout(fix, 400)];
    const ro = new ResizeObserver(fix);
    ro.observe(map.getContainer());
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

// Flies the map to `center` whenever it changes (e.g. after "use my location").
function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

interface Props {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  defaultCenter?: [number, number] | null;
  height?: number;
}

export default function LocationPickerMap({ value, onChange, defaultCenter, height = 220 }: Props) {
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [flyCenter, setFlyCenter] = useState<[number, number] | null>(null);

  // Facility coordinates can arrive after this mounts (async load). When there
  // is no pin yet, recenter the map on the default once it becomes available.
  useEffect(() => {
    if (!value && defaultCenter) setFlyCenter(defaultCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCenter?.[0], defaultCenter?.[1]]);

  const start: [number, number] = value
    ? [value.lat, value.lng]
    : defaultCenter || [0, 20];
  const startZoom = value || defaultCenter ? 13 : 2;

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not available", description: "This device can't report its location.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        onChange(loc);
        setFlyCenter([loc.lat, loc.lng]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast({ title: "Couldn't get location", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer center={start} zoom={startZoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution={OSM_TILE_ATTRIBUTION}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={19}
            maxZoom={22}
          />
          <InvalidateSize />
          <ClickToPlace onPick={(lat, lng) => onChange({ lat, lng })} />
          <FlyTo center={flyCenter} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={PIN_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  onChange({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={useMyLocation} disabled={locating} data-testid="btn-use-my-location">
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {locating ? "Locating…" : "Use my location"}
        </Button>
        {value ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            {value.accuracy != null ? ` (±${Math.round(value.accuracy)}m)` : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Tap the map to drop a pin, drag it to fine-tune, or use your location.</span>
        )}
      </div>
    </div>
  );
}
