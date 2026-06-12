/**
 * CatchmentMapPanel — Interactive polygon drawing tool for HF catchments & communities
 *
 * Features:
 *  - Draw HF catchment polygon + community sub-polygons
 *  - Server-side population from population_grids (PostGIS/GeoTIFF)
 *    with 3-source cascade: local DB → WorldPop WOPR → WorldPop REST → area-density
 *  - Interactive controls: undo vertex (Ctrl+Z), Escape to cancel, satellite/OSM toggle,
 *    geolocation, fit-to-catchment zoom
 *  - Gap visualization — uncovered area within catchment rendered as red hatched overlay
 *  - Population balance panel — community sum vs catchment total
 *  - "Extract Communities" — aggressive OSM + settlements scraping
 *  - Flag uncovered communities to district officials
 *  - Save All in one click
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer, TileLayer, Polygon, Marker, Popup, useMap,
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import type {
  Feature as GeoJSONFeature,
  Polygon as GeoJSONPolygon,
  MultiPolygon as GeoJSONMultiPolygon,
} from "geojson";


import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

// ─── Colour palette for community polygons ────────────────────────────────────
const PALETTE = [
  "#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6",
  "#1abc9c","#e67e22","#e91e63","#00bcd4","#8bc34a",
  "#ff5722","#607d8b","#795548","#ff9800","#4caf50",
];

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CommunityPolygon {
  communityId?: number;
  communityName: string;
  color: string;
  coords: [number, number][];
  griddedPopulation?: number;
  under5Population?: number;
  saved: boolean;
}

export interface CatchmentPolygon {
  coords: [number, number][];
  gridPopulation?: number;
  under5Population?: number;
  locked: boolean;
}

interface ExtractResult {
  villages: Array<{ id: number; name: string; latitude?: number; longitude?: number }>;
  settlements: Array<{ id: number; name: string; latitude: number; longitude: number; populationEstimate?: number }>;
  unmapped: Array<{ name: string; latitude: number; longitude: number; placeType: string; osmId?: string }>;
  counts: { villages: number; settlements: number; unmapped: number };
}

interface Props {
  facilityId: number;
  facilityName: string;
  facilityLat?: number;
  facilityLng?: number;
  communities: { id?: number; villageId?: number; name: string; targetPopulation?: string }[];
  onCommunityPopUpdate: (name: string, population: number) => void;
  onExtractedCommunities?: (names: string[]) => void;
}

// ─── Tile layers ──────────────────────────────────────────────────────────────
const TILES = {
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap contributors" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri World Imagery" },
};

// ─── Convert [lat,lng] coords array to GeoJSON Polygon ring ──────────────────
function toGeoRing(coords: [number, number][]): [number, number][] {
  return [...coords.map(([lat, lng]) => [lng, lat] as [number, number]), [coords[0][1], coords[0][0]] as [number, number]];
}

// ─── Population estimation (server-side + cascade) ───────────────────────────
async function estimatePolygonPop(
  coords: [number, number][]
): Promise<{ total: number; under5: number }> {
  const ring = toGeoRing(coords);
  const geojson = { type: "Polygon", coordinates: [ring] };

  // 1. Local population_grids via server API
  try {
    const r = await apiRequest<{ totalPopulation: number; under5Population: number }>(
      "POST", "/api/population/estimate-polygon", { boundary: geojson }
    );
    if (r.totalPopulation > 0) return { total: r.totalPopulation, under5: r.under5Population ?? 0 };
  } catch { /* fall through */ }

  // Compute area once for fallbacks
  const poly = turf.polygon([ring]);
  const areaSqKm = turf.area(poly) / 1_000_000;
  const centroid = turf.centroid(poly).geometry.coordinates; // [lng, lat]

  // 2. WorldPop WOPR point estimate
  try {
    const woprUrl = `https://hub.worldpop.org/v1/wopr/pointestimate?iso3=ZMB&ver=1.0.0&lat=${centroid[1]}&lon=${centroid[0]}`;
    const r = await fetch(woprUrl, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      const density = d?.data?.mean;
      if (density && Number.isFinite(density)) {
        const total = Math.round(density * areaSqKm);
        return { total, under5: Math.round(total * 0.18) };
      }
    }
  } catch { /* cascade */ }

  // 3. WorldPop REST stats API
  try {
    const geoStr = encodeURIComponent(JSON.stringify(geojson));
    const url = `https://api.worldpop.org/v1/services/stats?dataset=wpgppop&iso3=ZMB&year=2020&geojson=${geoStr}&runasync=false`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (r.ok) {
      const d = await r.json();
      const total = d?.data?.total_population;
      if (total && Number.isFinite(total)) return { total: Math.round(total), under5: Math.round(total * 0.18) };
    }
  } catch { /* area-density fallback */ }

  // 4. Area × regional density fallback (45 persons/km² sub-Saharan average)
  const total = Math.round(45 * areaSqKm);
  return { total, under5: Math.round(total * 0.18) };
}

// ─── Drawing controller — click to place vertices, dblclick to close ──────────
function DrawingController({
  mode, onClose, onPolygonComplete,
}: {
  mode: "catchment" | "community" | null;
  onClose: () => void;
  onPolygonComplete: (coords: [number, number][]) => void;
}) {
  const map = useMap();
  const pointsRef = useRef<[number, number][]>([]);
  const lgRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mode) return;
    pointsRef.current = [];
    const lg = L.layerGroup().addTo(map);
    lgRef.current = lg;
    map.getContainer().style.cursor = "crosshair";
    const color = mode === "catchment" ? "#1a56db" : "#e74c3c";

    const redraw = () => {
      lg.clearLayers();
      const pts = pointsRef.current;
      if (pts.length > 1) {
        L.polyline([...pts, pts[0]], { color, weight: 2, dashArray: "6,4", opacity: 0.85 }).addTo(lg);
      }
      pts.forEach((pt) =>
        L.circleMarker(pt, { radius: 4, color: "#fff", fillColor: color, fillOpacity: 1, weight: 1.5 }).addTo(lg)
      );
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      pointsRef.current = [...pointsRef.current, [e.latlng.lat, e.latlng.lng]];
      redraw();
    };
    const onDblClick = () => {
      if (pointsRef.current.length < 3) return;
      lg.clearLayers();
      L.polygon(pointsRef.current, { color, fillOpacity: 0.15 }).addTo(lg);
      onPolygonComplete([...pointsRef.current]);
      cleanup();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); cleanup(); }
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (pointsRef.current.length > 0) {
          pointsRef.current = pointsRef.current.slice(0, -1);
          redraw();
        }
      }
    };

    const cleanup = () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      document.removeEventListener("keydown", onKey);
      map.getContainer().style.cursor = "";
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    document.addEventListener("keydown", onKey);

    return () => {
      cleanup();
      if (lgRef.current) { map.removeLayer(lgRef.current); lgRef.current = null; }
    };
  }, [mode, map, onPolygonComplete, onClose]);

  return null;
}

// ─── Fit map to polygon after draw ───────────────────────────────────────────
function FitToPolygon({ coords }: { coords: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length < 3) return;
    map.fitBounds(L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng))), { padding: [40, 40] });
  }, [coords, map]);
  return null;
}

// ─── Geolocation button ───────────────────────────────────────────────────────
function GeolocateButton() {
  const map = useMap();
  return (
    <button
      type="button"
      title="Go to my location"
      onClick={() =>
        navigator.geolocation?.getCurrentPosition((pos) =>
          map.setView([pos.coords.latitude, pos.coords.longitude], 15)
        )
      }
      className="absolute bottom-14 right-2 z-[1000] flex h-8 w-8 items-center justify-center rounded bg-white shadow border text-base hover:bg-gray-50"
    >
      📍
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CatchmentMapPanel({
  facilityId, facilityName,
  facilityLat = -6.314, facilityLng = 143.956,
  communities, onCommunityPopUpdate, onExtractedCommunities,
}: Props) {
  const { toast } = useToast();
  const [catchment, setCatchment] = useState<CatchmentPolygon | null>(null);
  const [communityPolygons, setCommunityPolygons] = useState<CommunityPolygon[]>([]);
  const [drawMode, setDrawMode] = useState<"catchment" | "community" | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingPop, setLoadingPop] = useState(false);
  const [tileLayer, setTileLayer] = useState<"osm" | "satellite">("osm");
  const [fitCoords, setFitCoords] = useState<[number, number][] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [showGap, setShowGap] = useState(true);
  const catchingRef = useRef(false);

  // ─── Load existing polygons on mount ───────────────────────────────────────
  useEffect(() => {
    if (!facilityId) return;
    apiRequest<any>("GET", `/api/facilities/${facilityId}/catchment-polygon`)
      .then((r) => {
        if (r?.catchmentPolygon?.coordinates) {
          const coords = (r.catchmentPolygon.coordinates[0] as [number, number][])
            .map(([lng, lat]) => [lat, lng] as [number, number]);
          setCatchment({ coords, gridPopulation: r.catchmentGridPopulation ?? undefined, locked: true });
        }
      }).catch(() => {});
    communities.forEach((c) => {
      if (!c.villageId) return;
      apiRequest<any>("GET", `/api/villages/${c.villageId}/community-polygon`)
        .then((r) => {
          if (r?.catchmentPolygon?.coordinates) {
            const coords = (r.catchmentPolygon.coordinates[0] as [number, number][])
              .map(([lng, lat]) => [lat, lng] as [number, number]);
            setCommunityPolygons((prev) => {
              if (prev.some((p) => p.communityName === c.name)) return prev;
              return [...prev, {
                communityName: c.name,
                communityId: c.villageId,
                color: PALETTE[prev.length % PALETTE.length],
                coords, griddedPopulation: r.griddedPopulation ?? undefined, saved: true,
              }];
            });
          }
        }).catch(() => {});
    });
  }, [facilityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Gap polygon = catchment minus union of community polygons ──────────────
  const gapPolygons: [number, number][][] = (() => {
    if (!catchment || !showGap || communityPolygons.length === 0) return [];
    try {
      const catchPoly = turf.polygon([toGeoRing(catchment.coords)]);
      const comFeatures = communityPolygons
        .filter((p) => p.coords.length >= 3)
        .map((p) => turf.polygon([toGeoRing(p.coords)]));
      if (comFeatures.length === 0) return [];
      let union: GeoJSONFeature<GeoJSONPolygon | GeoJSONMultiPolygon> | null = comFeatures[0];


      for (let i = 1; i < comFeatures.length; i++) {
        union = union ? turf.union(turf.featureCollection([union as any, comFeatures[i]])) : comFeatures[i];
      }
      if (!union) return [];
      const gap = turf.difference(turf.featureCollection([catchPoly as any, union as any]));
      if (!gap) return [];
      const geom = gap.geometry;
      if (geom.type === "Polygon") {
        return [geom.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])];
      } else if (geom.type === "MultiPolygon") {
        return geom.coordinates.map((poly) => poly[0].map(([lng, lat]) => [lat, lng] as [number, number]));
      }
    } catch { return []; }
    return [];
  })();

  // ─── Overlap check ──────────────────────────────────────────────────────────
  const hasOverlap = useCallback((newCoords: [number, number][]): boolean => {
    const newPoly = turf.polygon([toGeoRing(newCoords)]);
    return communityPolygons.some((existing) => {
      if (existing.communityName === selectedCommunity) return false;
      try { return turf.intersect(turf.featureCollection([newPoly, turf.polygon([toGeoRing(existing.coords)])])) !== null; }
      catch { return false; }
    });
  }, [communityPolygons, selectedCommunity]);

  // ─── Handle completed polygon ───────────────────────────────────────────────
  const handlePolygonComplete = useCallback(async (coords: [number, number][]) => {
    const mode = drawMode;
    setDrawMode(null);

    if (mode === "catchment") {
      setLoadingPop(true);
      const { total, under5 } = await estimatePolygonPop(coords);
      setLoadingPop(false);
      setCatchment({ coords, gridPopulation: total || undefined, under5Population: under5 || undefined, locked: false });
      setFitCoords(coords);
      toast({
        title: "Catchment drawn",
        description: total
          ? `~${total.toLocaleString()} people · ${under5.toLocaleString()} under-5 (grid population)`
          : "Polygon ready — click Save to persist.",
      });
      return;
    }

    if (!selectedCommunity) {
      toast({ title: "No community selected", variant: "destructive" });
      return;
    }
    if (hasOverlap(coords)) {
      toast({ title: "Overlap detected", description: "This polygon overlaps another community. Adjust the boundary.", variant: "destructive" });
      return;
    }
    if (catchment) {
      const catchPoly = turf.polygon([toGeoRing(catchment.coords)]);
      if (!turf.booleanWithin(turf.polygon([toGeoRing(coords)]), catchPoly)) {
        toast({ title: "Outside catchment", description: "Community polygon must be fully inside the HF catchment area.", variant: "destructive" });
        return;
      }
    }

    setLoadingPop(true);
    const { total, under5 } = await estimatePolygonPop(coords);
    setLoadingPop(false);

    const existingIdx = communityPolygons.findIndex((p) => p.communityName === selectedCommunity);
    const color = existingIdx >= 0 ? communityPolygons[existingIdx].color : PALETTE[communityPolygons.length % PALETTE.length];
    const entry: CommunityPolygon = { communityName: selectedCommunity, color, coords, griddedPopulation: total || undefined, under5Population: under5 || undefined, saved: false };

    setCommunityPolygons((prev) =>
      existingIdx >= 0 ? prev.map((p, i) => i === existingIdx ? entry : p) : [...prev, entry]
    );
    if (total) onCommunityPopUpdate(selectedCommunity, total);
    toast({ title: `"${selectedCommunity}" drawn`, description: total ? `~${total.toLocaleString()} people · ${under5.toLocaleString()} under-5` : "Click Save to persist." });
  }, [drawMode, selectedCommunity, catchment, communityPolygons, hasOverlap, onCommunityPopUpdate, toast]);

  // ─── Save catchment ─────────────────────────────────────────────────────────
  const saveCatchment = async () => {
    if (!catchment || catchingRef.current) return;
    catchingRef.current = true;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/facilities/${facilityId}/catchment-polygon`, {
        geojson: { type: "Polygon", coordinates: [toGeoRing(catchment.coords)] },
        gridPopulation: catchment.gridPopulation,
      });
      setCatchment((p) => p ? { ...p, locked: true } : p);
      toast({ title: "Catchment saved", description: `Grid pop: ~${(catchment.gridPopulation ?? 0).toLocaleString()} · U5: ~${(catchment.under5Population ?? 0).toLocaleString()}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); catchingRef.current = false; }
  };

  // ─── Save community polygon ─────────────────────────────────────────────────
  const saveCommunity = async (poly: CommunityPolygon) => {
    const comm = communities.find((c) => c.name === poly.communityName);
    if (!comm?.villageId) {
      toast({ title: "Register community first", description: "Save the community record before drawing its polygon.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/villages/${comm.villageId}/community-polygon`, {
        geojson: { type: "Polygon", coordinates: [toGeoRing(poly.coords)] },
        griddedPopulation: poly.griddedPopulation,
        polygonColor: poly.color,
        populationSourceLabel: "GridPop/WorldPop 2020",
      });
      setCommunityPolygons((prev) => prev.map((p) => p.communityName === poly.communityName ? { ...p, saved: true } : p));
      toast({ title: `"${poly.communityName}" saved` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ─── Save all ────────────────────────────────────────────────────────────────
  const saveAll = async () => {
    let count = 0;
    if (catchment && !catchment.locked) { await saveCatchment(); count++; }
    for (const poly of communityPolygons.filter((p) => !p.saved)) { await saveCommunity(poly); count++; }
    if (count === 0) toast({ title: "Nothing to save", description: "All polygons are already saved." });
  };

  // ─── Extract communities (aggressive OSM scraping) ──────────────────────────
  const extractCommunities = async () => {
    if (!catchment) { toast({ title: "Draw catchment first", variant: "destructive" }); return; }
    setExtracting(true);
    try {
      const result = await apiRequest<ExtractResult>("POST", "/api/catchments/extract", {
        geojson: { type: "Polygon", coordinates: [toGeoRing(catchment.coords)] },
        bufferMeters: 500,
        includeOsm: true,
      });
      setExtractResult(result);
      const total = result.counts.villages + result.counts.settlements + result.counts.unmapped;
      toast({
        title: `${total} community places extracted`,
        description: `${result.counts.villages} registered · ${result.counts.settlements} settlements · ${result.counts.unmapped} OSM places`,
      });
      if (onExtractedCommunities) {
        onExtractedCommunities([
          ...result.villages.map((v) => v.name),
          ...result.settlements.map((s) => s.name),
          ...result.unmapped.map((u) => u.name),
        ]);
      }
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e?.message, variant: "destructive" });
    } finally { setExtracting(false); }
  };

  // ─── Flag uncovered communities to district ─────────────────────────────────
  const uncovered = communities.filter((c) => !communityPolygons.some((p) => p.communityName === c.name));
  const flagUncovered = async () => {
    if (!uncovered.length) return;
    try {
      await apiRequest("POST", `/api/facilities/${facilityId}/flag-uncovered`, {
        communities: uncovered.map((c) => ({ villageName: c.name, villageId: c.villageId, estimatedPopulation: parseInt(c.targetPopulation || "0", 10) })),
        flaggedLevel: "district",
      });
      toast({ title: "Gaps flagged", description: `${uncovered.length} communities reported to district officials.` });
    } catch (e: any) { toast({ title: "Flag failed", description: e?.message, variant: "destructive" }); }
  };

  // ─── Population balance ──────────────────────────────────────────────────────
  const communityPopSum = communityPolygons.reduce((s, p) => s + (p.griddedPopulation ?? 0), 0);
  const catchmentPop = catchment?.gridPopulation ?? 0;
  const balancePct = catchmentPop > 0 ? Math.min(100, Math.round((communityPopSum / catchmentPop) * 100)) : 0;

  const center: [number, number] = [facilityLat, facilityLng];

  return (
    <div className="flex flex-col gap-3">

      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Catchment:</span>

        {!catchment ? (
          <button type="button" disabled={!!drawMode} onClick={() => setDrawMode("catchment")}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
            ✏️ Draw HF Catchment
          </button>
        ) : (
          <>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${catchment.locked ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
              {catchment.locked ? "🔒 Locked" : "📐 Unsaved"}
            </span>
            {catchment.gridPopulation != null && (
              <span className="text-xs text-muted-foreground">
                ~{catchment.gridPopulation.toLocaleString()} people
                {catchment.under5Population ? ` · ${catchment.under5Population.toLocaleString()} U5` : ""}
              </span>
            )}
            {!catchment.locked && (
              <button type="button" onClick={saveCatchment} disabled={saving}
                className="rounded-md bg-green-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "💾 Save & Lock"}
              </button>
            )}
            {catchment.locked && (
              <>
                <button type="button" onClick={() => setCatchment((p) => p ? { ...p, locked: false } : p)}
                  className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">✏️ Edit</button>
                <button type="button" onClick={() => setFitCoords(catchment.coords)}
                  className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">🎯 Fit</button>
              </>
            )}
          </>
        )}

        <div className="h-4 w-px bg-border mx-1" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Community:</span>

        <select className="rounded border px-2 py-1 text-xs max-w-[150px]" value={selectedCommunity}
          onChange={(e) => setSelectedCommunity(e.target.value)}>
          <option value="">— select —</option>
          {communities.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}{communityPolygons.some((p) => p.communityName === c.name) ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button type="button" disabled={!selectedCommunity || !!drawMode || !catchment}
          onClick={() => setDrawMode("community")}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-50">
          ✏️ Draw Polygon
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <button type="button" onClick={() => setTileLayer((t) => t === "osm" ? "satellite" : "osm")}
          className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
          {tileLayer === "osm" ? "🛰 Satellite" : "🗺 OSM"}
        </button>
        <button type="button" disabled={!catchment || extracting} onClick={extractCommunities}
          className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50">
          {extracting ? "⏳ Extracting…" : "🔍 Extract Communities"}
        </button>
        <button type="button" onClick={saveAll} disabled={saving}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
          💾 Save All
        </button>
      </div>

      {/* ── Drawing instructions ── */}
      {drawMode && (
        <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="flex-1 animate-pulse text-xs font-semibold text-blue-700">
            🖱 Click to place vertices · Double-click to close · Ctrl+Z undo · Esc cancel
          </span>
          <button type="button" onClick={() => setDrawMode(null)}
            className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200">
            Cancel (Esc)
          </button>
        </div>
      )}
      {loadingPop && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 animate-pulse">
          ⏳ Estimating grid population from local GeoTIFF data / WorldPop cascade…
        </div>
      )}

      {/* ── Map ── */}
      <div className="relative h-[500px] w-full overflow-hidden rounded-xl border shadow-sm">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} doubleClickZoom={false}>
          <TileLayer url={TILES[tileLayer].url} attribution={TILES[tileLayer].attr} maxNativeZoom={19} maxZoom={22} />

          {/* HF Catchment polygon */}
          {catchment && (
            <Polygon positions={catchment.coords}
              pathOptions={{ color: "#1a56db", fillColor: "#1a56db", fillOpacity: 0.07, weight: 2.5, dashArray: catchment.locked ? undefined : "8,4" }}>
              <Popup>
                <strong>{facilityName} — HF Catchment</strong><br />
                Grid pop: ~{(catchment.gridPopulation ?? 0).toLocaleString()}<br />
                Under-5: ~{(catchment.under5Population ?? 0).toLocaleString()}<br />
                {catchment.locked ? "🔒 Locked" : "⚠️ Unsaved"}
              </Popup>
            </Polygon>
          )}

          {/* Community polygons */}
          {communityPolygons.map((poly) => (
            <Polygon key={poly.communityName} positions={poly.coords}
              pathOptions={{ color: poly.color, fillColor: poly.color, fillOpacity: 0.22, weight: 2 }}>
              <Popup>
                <strong>{poly.communityName}</strong><br />
                Grid pop: ~{(poly.griddedPopulation ?? 0).toLocaleString()}<br />
                Under-5: ~{(poly.under5Population ?? 0).toLocaleString()}<br />
                {poly.saved ? "✅ Saved" : (
                  <>
                    <span>⚠️ Unsaved</span><br />
                    <button onClick={() => saveCommunity(poly)} disabled={saving}
                      style={{ marginTop: 4, padding: "2px 10px", background: "#1a56db", color: "#fff", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11 }}>
                      Save
                    </button>
                  </>
                )}
              </Popup>
            </Polygon>
          ))}

          {/* Gap overlay — red hatched uncovered area */}
          {gapPolygons.map((ring, i) => (
            <Polygon key={`gap-${i}`} positions={ring}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.16, weight: 1.5, dashArray: "5,4" }}>
              <Popup>
                <strong style={{ color: "#ef4444" }}>⚠️ Coverage Gap</strong><br />
                This area within the catchment is not yet covered by a community polygon.
              </Popup>
            </Polygon>
          ))}

          {/* Extracted place markers */}
          {extractResult?.unmapped.map((u, i) => (
            <Marker key={`osm-${i}`} position={[u.latitude, u.longitude]}>
              <Popup><strong>{u.name}</strong><br />{u.placeType} · OpenStreetMap</Popup>
            </Marker>
          ))}
          {extractResult?.settlements.map((s) => (
            <Marker key={`settle-${s.id}`} position={[s.latitude, s.longitude]}>
              <Popup><strong>{s.name}</strong><br />Pop est: {s.populationEstimate?.toLocaleString() ?? "?"}</Popup>
            </Marker>
          ))}

          {/* Facility marker */}
          <Marker position={center}>
            <Popup><strong>{facilityName}</strong><br />Health Facility</Popup>
          </Marker>

          <DrawingController mode={drawMode} onClose={() => setDrawMode(null)} onPolygonComplete={handlePolygonComplete} />
          <FitToPolygon coords={fitCoords} />
          <GeolocateButton />
        </MapContainer>

        {/* Map overlay controls (outside map, uses regular absolute positioning) */}
        <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1">
          <button type="button" onClick={() => setShowGap((v) => !v)}
            className={`rounded px-2 py-1 text-xs font-medium shadow border ${showGap ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-muted-foreground"}`}>
            {showGap ? "🔴 Hide Gaps" : "⬜ Show Gaps"}
          </button>
        </div>
      </div>

      {/* ── Population balance panel ── */}
      {catchment && (
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Population Coverage Balance</span>
            <span className={`font-bold tabular-nums ${balancePct >= 90 ? "text-green-600" : balancePct >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {communityPopSum.toLocaleString()} / {catchmentPop.toLocaleString()}
              {" "}({balancePct}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full transition-all duration-500 ${balancePct >= 90 ? "bg-green-500" : balancePct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${balancePct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {communityPolygons.length} of {communities.length} community polygons drawn ·{" "}
            {catchmentPop > communityPopSum
              ? `~${(catchmentPop - communityPopSum).toLocaleString()} people not yet attributed to a community`
              : communityPolygons.length > 0
                ? "✓ All catchment population attributed to communities"
                : "Draw community polygons to attribute population"}
          </p>
        </div>
      )}

      {/* ── Community checklist ── */}
      {communities.length > 0 && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Community Coverage — {communityPolygons.length}/{communities.length} polygons drawn
          </h4>
          <div className="flex flex-wrap gap-2">
            {communities.map((c, i) => {
              const poly = communityPolygons.find((p) => p.communityName === c.name);
              return (
                <button key={i} type="button"
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    poly ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                         : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                  onClick={() => setSelectedCommunity(c.name)}>
                  {poly ? <span style={{ color: poly.color }}>■</span> : <span>○</span>}
                  {c.name}
                  {poly?.griddedPopulation ? ` (${poly.griddedPopulation.toLocaleString()})` : ""}
                  {poly?.saved ? " ✓" : poly ? " ●" : ""}
                </button>
              );
            })}
          </div>

          {/* Extraction results */}
          {extractResult && (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-2.5 text-xs space-y-1">
              <p className="font-semibold text-sky-700">
                📍 {extractResult.counts.villages + extractResult.counts.settlements + extractResult.counts.unmapped} places found inside catchment
              </p>
              <div className="flex flex-wrap gap-3 text-sky-600">
                <span>✅ {extractResult.counts.villages} registered villages</span>
                <span>🏘 {extractResult.counts.settlements} settlements</span>
                <span>🗺 {extractResult.counts.unmapped} unmapped OSM places</span>
              </div>
              {extractResult.unmapped.length > 0 && (
                <p className="text-[11px] text-sky-500 italic">
                  Unmapped: {extractResult.unmapped.slice(0, 8).map((u) => u.name).join(", ")}
                  {extractResult.unmapped.length > 8 ? ` +${extractResult.unmapped.length - 8} more` : ""}
                </p>
              )}
            </div>
          )}

          {/* Coverage gaps warning */}
          {uncovered.length > 0 && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-2.5">
              <div>
                <p className="text-xs font-semibold text-red-700">
                  ⚠️ {uncovered.length} communities without polygons — coverage gap
                </p>
                <p className="mt-0.5 text-[11px] text-red-600">
                  {uncovered.slice(0, 5).map((c) => c.name).join(", ")}
                  {uncovered.length > 5 ? ` +${uncovered.length - 5} more` : ""}
                </p>
              </div>
              <button type="button" onClick={flagUncovered}
                className="shrink-0 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                🚩 Flag to District
              </button>
            </div>
          )}
          {uncovered.length === 0 && communityPolygons.length === communities.length && communities.length > 0 && (
            <p className="text-xs font-medium text-green-700">✅ All communities have polygons — no coverage gaps!</p>
          )}
        </div>
      )}
    </div>
  );
}
