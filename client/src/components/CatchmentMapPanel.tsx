/**
 * CatchmentMapPanel — Step 2 community polygon drawing tool
 *
 * Features:
 *  - Draw HF catchment polygon (locked after first save, edit-only thereafter)
 *  - Draw community sub-polygons inside the catchment (one per community)
 *  - Auto-assigns distinct colors to each community polygon
 *  - Auto-populates gridded population from polygon area estimate (WorldPop)
 *  - Prevents overlap between community polygons (Turf.js intersection check)
 *  - Flags uncovered areas within catchment
 *  - Persists polygons to API: /api/facilities/:id/catchment-polygon
 *                              /api/villages/:id/community-polygon
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

// ─── Color palette for community polygons ────────────────────────────────────
const PALETTE = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e91e63", "#00bcd4", "#8bc34a",
  "#ff5722", "#607d8b", "#795548", "#ff9800", "#4caf50",
];

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CommunityPolygon {
  communityId?: number;
  communityName: string;
  color: string;
  coords: [number, number][];          // [lat, lng] pairs
  griddedPopulation?: number;
  saved: boolean;
}

export interface CatchmentPolygon {
  coords: [number, number][];
  gridPopulation?: number;
  locked: boolean;                     // locked = cannot be redrawn, only edited
}

interface Props {
  facilityId: number;
  facilityName: string;
  facilityLat?: number;
  facilityLng?: number;
  communities: { id?: number; villageId?: number; name: string; targetPopulation?: string }[];
  onCommunityPopUpdate: (name: string, population: number) => void;
}

// ─── Drawing layer controller ─────────────────────────────────────────────────
function DrawingController({
  mode,
  onClose,
  onPolygonComplete,
}: {
  mode: "catchment" | "community" | null;
  onClose: () => void;
  onPolygonComplete: (coords: [number, number][]) => void;
}) {
  const map = useMap();
  const pointsRef = useRef<[number, number][]>([]);
  const tempLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mode) return;

    pointsRef.current = [];
    const lg = L.layerGroup().addTo(map);
    tempLayerRef.current = lg;
    map.getContainer().style.cursor = "crosshair";

    const clickHandler = (e: L.LeafletMouseEvent) => {
      const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
      pointsRef.current = [...pointsRef.current, pt];

      // Draw running line
      lg.clearLayers();
      if (pointsRef.current.length > 1) {
        L.polyline(pointsRef.current, { color: mode === "catchment" ? "#1a56db" : "#e74c3c", weight: 2, dashArray: "6,4" }).addTo(lg);
      }
      // Dot at each vertex
      L.circleMarker(e.latlng, { radius: 4, color: "#fff", fillColor: mode === "catchment" ? "#1a56db" : "#e74c3c", fillOpacity: 1 }).addTo(lg);
    };

    const dblClickHandler = () => {
      if (pointsRef.current.length < 3) return;
      lg.clearLayers();
      // Show closed polygon
      L.polygon(pointsRef.current, { color: mode === "catchment" ? "#1a56db" : "#e74c3c", fillOpacity: 0.15 }).addTo(lg);
      onPolygonComplete([...pointsRef.current]);
      map.getContainer().style.cursor = "";
      map.off("click", clickHandler);
      map.off("dblclick", dblClickHandler);
    };

    map.on("click", clickHandler);
    map.on("dblclick", dblClickHandler);

    return () => {
      map.off("click", clickHandler);
      map.off("dblclick", dblClickHandler);
      if (tempLayerRef.current) {
        map.removeLayer(tempLayerRef.current);
        tempLayerRef.current = null;
      }
      map.getContainer().style.cursor = "";
    };
  }, [mode, map, onPolygonComplete]);

  return null;
}

// ─── Estimate gridded population from polygon area (proxy using WorldPop WMS) ─
async function estimateGridPopulation(coords: [number, number][]): Promise<number | null> {
  // Turf-based area in km²
  const poly = turf.polygon([[...coords.map(([lat, lng]) => [lng, lat]), [coords[0][1], coords[0][0]]]]);
  const areaSqKm = turf.area(poly) / 1_000_000;
  // WorldPop Papua New Guinea: ~8.9 persons/km² average (fallback)
  // We use a density lookup via WorldPop WMS GetFeatureInfo for centroid
  const centroid = turf.centroid(poly).geometry.coordinates; // [lng, lat]
  try {
    const url = `https://ogc.worldpop.org/geoserver/wpGlobal/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=wpGlobal:ppgplc0200f2020&bbox=${centroid[0] - 0.01},${centroid[1] - 0.01},${centroid[0] + 0.01},${centroid[1] + 0.01}&outputFormat=application/json&maxFeatures=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const density = data?.features?.[0]?.properties?.PPGPLC0200F2020;
      if (density && Number.isFinite(density)) {
        return Math.round(density * areaSqKm);
      }
    }
  } catch { /* fall back to area-based estimate */ }
  // Fallback: use 8.9 persons/km² (PNG average)
  return Math.round(8.9 * areaSqKm);
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CatchmentMapPanel({
  facilityId,
  facilityName,
  facilityLat = -6.314,
  facilityLng = 143.956,
  communities,
  onCommunityPopUpdate,
}: Props) {
  const { toast } = useToast();
  const [catchment, setCatchment] = useState<CatchmentPolygon | null>(null);
  const [communityPolygons, setCommunityPolygons] = useState<CommunityPolygon[]>([]);
  const [drawMode, setDrawMode] = useState<"catchment" | "community" | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingPop, setLoadingPop] = useState(false);

  // Load existing polygons on mount
  useEffect(() => {
    if (!facilityId) return;
    apiRequest("GET", `/api/facilities/${facilityId}/catchment-polygon`)
      .then((r: any) => {
        if (r?.catchmentPolygon?.coordinates) {
          const coords = (r.catchmentPolygon.coordinates[0] as [number, number][]).map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          setCatchment({ coords, gridPopulation: r.catchmentGridPopulation ?? undefined, locked: true });
        }
      })
      .catch(() => {});
    // Load community polygons from each village
    communities.forEach((c) => {
      if (!c.villageId) return;
      apiRequest("GET", `/api/villages/${c.villageId}/community-polygon`)
        .then((r: any) => {
          if (r?.catchmentPolygon?.coordinates) {
            const coords = (r.catchmentPolygon.coordinates[0] as [number, number][]).map(
              ([lng, lat]) => [lat, lng] as [number, number]
            );
            const idx = communityPolygons.findIndex((p) => p.communityName === c.name);
            if (idx === -1) {
              setCommunityPolygons((prev) => [
                ...prev,
                {
                  communityName: c.name,
                  communityId: c.villageId,
                  color: PALETTE[prev.length % PALETTE.length],
                  coords,
                  griddedPopulation: r.griddedPopulation ?? undefined,
                  saved: true,
                },
              ]);
            }
          }
        })
        .catch(() => {});
    });
  }, [facilityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Overlap check (Turf) ─────────────────────────────────────────────────
  const hasOverlapWithExisting = useCallback(
    (newCoords: [number, number][]): boolean => {
      const newPoly = turf.polygon([[...newCoords.map(([lat, lng]) => [lng, lat]), [newCoords[0][1], newCoords[0][0]]]]);
      return communityPolygons.some((existing) => {
        if (existing.communityName === selectedCommunity) return false; // allow re-draw of own polygon
        const exPoly = turf.polygon([[...existing.coords.map(([lat, lng]) => [lng, lat]), [existing.coords[0][1], existing.coords[0][0]]]]);
        try {
          const intersection = turf.intersect(turf.featureCollection([newPoly, exPoly]));
          return intersection !== null;
        } catch { return false; }
      });
    },
    [communityPolygons, selectedCommunity]
  );

  // ─── Handle completed polygon ─────────────────────────────────────────────
  const handlePolygonComplete = useCallback(
    async (coords: [number, number][]) => {
      setDrawMode(null);

      if (drawMode === "catchment") {
        setLoadingPop(true);
        const pop = await estimateGridPopulation(coords);
        setLoadingPop(false);
        setCatchment({ coords, gridPopulation: pop ?? undefined, locked: false });
        toast({ title: "Catchment drawn", description: pop ? `~${pop.toLocaleString()} people estimated from grid population.` : "Polygon ready — click Save to persist." });
        return;
      }

      // Community polygon
      if (!selectedCommunity) {
        toast({ title: "No community selected", description: "Select a community from the list before drawing.", variant: "destructive" });
        return;
      }

      // Overlap check
      if (hasOverlapWithExisting(coords)) {
        toast({ title: "Overlap detected", description: "This polygon overlaps an existing community area. Adjust the boundary.", variant: "destructive" });
        return;
      }

      // Check it fits within catchment
      if (catchment) {
        const catchPoly = turf.polygon([[...catchment.coords.map(([lat, lng]) => [lng, lat]), [catchment.coords[0][1], catchment.coords[0][0]]]]);
        const newPoly = turf.polygon([[...coords.map(([lat, lng]) => [lng, lat]), [coords[0][1], coords[0][0]]]]);
        const isWithin = turf.booleanWithin(newPoly, catchPoly);
        if (!isWithin) {
          toast({ title: "Outside catchment", description: "Community polygon must be fully inside the facility catchment area.", variant: "destructive" });
          return;
        }
      }

      setLoadingPop(true);
      const pop = await estimateGridPopulation(coords);
      setLoadingPop(false);

      const existingIdx = communityPolygons.findIndex((p) => p.communityName === selectedCommunity);
      const color = existingIdx >= 0 ? communityPolygons[existingIdx].color : PALETTE[communityPolygons.length % PALETTE.length];
      const newPoly: CommunityPolygon = { communityName: selectedCommunity, color, coords, griddedPopulation: pop ?? undefined, saved: false };

      if (existingIdx >= 0) {
        setCommunityPolygons((prev) => prev.map((p, i) => (i === existingIdx ? newPoly : p)));
      } else {
        setCommunityPolygons((prev) => [...prev, newPoly]);
      }

      if (pop) onCommunityPopUpdate(selectedCommunity, pop);
      toast({ title: `"${selectedCommunity}" polygon drawn`, description: pop ? `~${pop.toLocaleString()} grid population.` : "Save to persist." });
    },
    [drawMode, selectedCommunity, catchment, communityPolygons, hasOverlapWithExisting, onCommunityPopUpdate, toast]
  );

  // ─── Save catchment polygon ───────────────────────────────────────────────
  const saveCatchment = async () => {
    if (!catchment || catching.current) return;
    catching.current = true;
    setSaving(true);
    try {
      const geojson = {
        type: "Polygon",
        coordinates: [[...catchment.coords.map(([lat, lng]) => [lng, lat]), [catchment.coords[0][1], catchment.coords[0][0]]]],
      };
      await apiRequest("PATCH", `/api/facilities/${facilityId}/catchment-polygon`, { geojson, gridPopulation: catchment.gridPopulation });
      setCatchment((prev) => prev ? { ...prev, locked: true } : prev);
      toast({ title: "Catchment saved", description: `Facility catchment polygon locked. ${catchment.gridPopulation ? `Grid population: ~${catchment.gridPopulation.toLocaleString()}` : ""}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
      catching.current = false;
    }
  };
  const catching = useRef(false);

  // ─── Save community polygon ───────────────────────────────────────────────
  const saveCommunityPolygon = async (poly: CommunityPolygon) => {
    const community = communities.find((c) => c.name === poly.communityName);
    if (!community?.villageId) {
      toast({ title: "Village not saved", description: "Save the community in Step 2 first, then draw its polygon.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const geojson = {
        type: "Polygon",
        coordinates: [[...poly.coords.map(([lat, lng]) => [lng, lat]), [poly.coords[0][1], poly.coords[0][0]]]],
      };
      await apiRequest("PATCH", `/api/villages/${community.villageId}/community-polygon`, {
        geojson,
        griddedPopulation: poly.griddedPopulation,
        polygonColor: poly.color,
        populationSourceLabel: "WorldPop 2020",
      });
      setCommunityPolygons((prev) => prev.map((p) => p.communityName === poly.communityName ? { ...p, saved: true } : p));
      toast({ title: `"${poly.communityName}" saved`, description: "Community boundary persisted to the database." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Coverage gap detection ───────────────────────────────────────────────
  const uncoveredCommunities = communities.filter(
    (c) => !communityPolygons.some((p) => p.communityName === c.name)
  );

  const flagUncovered = async () => {
    if (!uncoveredCommunities.length) return;
    try {
      await apiRequest("POST", `/api/facilities/${facilityId}/flag-uncovered`, {
        communities: uncoveredCommunities.map((c) => ({ villageName: c.name, estimatedPopulation: parseInt(c.targetPopulation || "0", 10) })),
        flaggedLevel: "district",
      });
      toast({ title: "Uncovered communities flagged", description: `${uncoveredCommunities.length} communities reported to district officials.` });
    } catch (e: any) {
      toast({ title: "Flag failed", description: e?.message, variant: "destructive" });
    }
  };

  const center: [number, number] = [facilityLat, facilityLng];

  return (
    <div className="flex flex-col gap-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <span className="font-semibold text-muted-foreground">HF Catchment:</span>
        {!catchment ? (
          <button
            type="button"
            disabled={!!drawMode}
            onClick={() => setDrawMode("catchment")}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            ✏️ Draw HF Catchment
          </button>
        ) : (
          <>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium">
              {catchment.locked ? "🔒 Locked" : "📐 Drawn (unsaved)"}
            </span>
            {catchment.gridPopulation && (
              <span className="text-xs text-muted-foreground">~{catchment.gridPopulation.toLocaleString()} people</span>
            )}
            {!catchment.locked && (
              <button type="button" onClick={saveCatchment} disabled={saving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "💾 Save & Lock Catchment"}
              </button>
            )}
            {catchment.locked && (
              <button type="button" onClick={() => setCatchment((p) => p ? { ...p, locked: false } : p)}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                ✏️ Edit
              </button>
            )}
          </>
        )}

        <span className="ml-4 font-semibold text-muted-foreground">Community:</span>
        <select
          className="rounded border px-2 py-1 text-xs"
          value={selectedCommunity}
          onChange={(e) => setSelectedCommunity(e.target.value)}
        >
          <option value="">— select community —</option>
          {communities.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}{communityPolygons.some((p) => p.communityName === c.name) ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedCommunity || !!drawMode || (!catchment)}
          onClick={() => setDrawMode("community")}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          ✏️ Draw Community Polygon
        </button>

        {drawMode && (
          <span className="ml-2 animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            🖱 Click to place vertices → double-click to close
          </span>
        )}
        {loadingPop && <span className="text-xs text-muted-foreground animate-pulse">Fetching grid population…</span>}
      </div>

      {/* Map */}
      <div className="relative h-[420px] w-full overflow-hidden rounded-xl border shadow-sm">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} doubleClickZoom={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* HF Catchment polygon */}
          {catchment && (
            <Polygon
              positions={catchment.coords}
              pathOptions={{ color: "#1a56db", fillColor: "#1a56db", fillOpacity: 0.08, weight: 2.5, dashArray: catchment.locked ? undefined : "8,4" }}
            >
              <Popup>
                <strong>{facilityName} — HF Catchment</strong><br />
                {catchment.gridPopulation ? `Grid population: ~${catchment.gridPopulation.toLocaleString()}` : "No population estimate"}<br />
                Status: {catchment.locked ? "🔒 Locked" : "Unsaved — click Save to lock"}
              </Popup>
            </Polygon>
          )}

          {/* Community polygons */}
          {communityPolygons.map((poly) => (
            <Polygon
              key={poly.communityName}
              positions={poly.coords}
              pathOptions={{ color: poly.color, fillColor: poly.color, fillOpacity: 0.25, weight: 2 }}
            >
              <Popup>
                <strong>{poly.communityName}</strong><br />
                {poly.griddedPopulation ? `Grid pop: ~${poly.griddedPopulation.toLocaleString()}` : "No grid pop"}<br />
                <span style={{ color: poly.color }}>■</span> {poly.saved ? "✅ Saved" : "⚠️ Unsaved"}
                {!poly.saved && (
                  <><br /><button onClick={() => saveCommunityPolygon(poly)} disabled={saving}
                    style={{ marginTop: 4, padding: "2px 8px", background: "#1a56db", color: "#fff", borderRadius: 4, border: "none", cursor: "pointer" }}>
                    Save
                  </button></>
                )}
              </Popup>
            </Polygon>
          ))}

          {/* Facility marker */}
          <Marker position={center}>
            <Popup><strong>{facilityName}</strong><br />Health Facility</Popup>
          </Marker>

          {/* Drawing controller */}
          <DrawingController mode={drawMode} onClose={() => setDrawMode(null)} onPolygonComplete={handlePolygonComplete} />
        </MapContainer>
      </div>

      {/* Community polygon checklist */}
      {communities.length > 0 && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Community Coverage ({communityPolygons.length}/{communities.length} polygons drawn)
          </h4>
          <div className="flex flex-wrap gap-2">
            {communities.map((c, i) => {
              const poly = communityPolygons.find((p) => p.communityName === c.name);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    poly ? "border-green-300 bg-green-50 text-green-700" : "border-orange-300 bg-orange-50 text-orange-700"
                  }`}
                  onClick={() => { setSelectedCommunity(c.name); if (poly) setDrawMode("community"); }}
                >
                  {poly ? (
                    <span style={{ color: poly.color }}>■</span>
                  ) : (
                    <span>○</span>
                  )}
                  {c.name}
                  {poly?.saved ? " ✓" : poly ? " (unsaved)" : " (no polygon)"}
                </div>
              );
            })}
          </div>
          {uncoveredCommunities.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-md bg-red-50 border border-red-200 p-2">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ {uncoveredCommunities.length} communities without polygons — they will be flagged as uncovered
              </p>
              <button
                type="button"
                onClick={flagUncovered}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                Flag to District Officials
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
