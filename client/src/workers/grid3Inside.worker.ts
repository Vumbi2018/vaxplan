/// <reference lib="webworker" />
//
// Web Worker for computing which GRID3 settlement footprints fall inside the
// currently selected administrative polygon(s).
//
// This work used to run on the React render thread inside a useMemo and could
// briefly freeze the UI when the dataset has tens of thousands of polygons
// (e.g. the GRID3 Zambia file). Moving it to a worker keeps Province /
// District / LLG changes feeling instant.
//
// Centroids for the dataset are computed once and cached by `datasetKey`, so
// subsequent selection changes only run the cheap bbox + point-in-polygon
// pass against the precomputed centroids.

import { booleanPointInPolygon, centroid as turfCentroid, bbox as turfBbox } from "@turf/turf";

type Centroid = { id: string | number; x: number; y: number };

let centroidsCache: Centroid[] | null = null;
let centroidsCacheKey: string | null = null;

type ComputeMsg = {
  type: "compute";
  requestId: number;
  datasetKey: string;
  // Only sent when the cached centroids are stale or missing.
  grid3?: { features: any[] };
  selected: { features: any[] };
};

self.onmessage = (e: MessageEvent<ComputeMsg>) => {
  const msg = e.data;
  if (!msg || msg.type !== "compute") return;

  const { requestId, datasetKey, grid3, selected } = msg;

  if (centroidsCacheKey !== datasetKey) {
    if (!grid3 || !Array.isArray(grid3.features)) {
      (self as any).postMessage({ type: "needData", requestId, datasetKey });
      return;
    }
    const arr: Centroid[] = [];
    const feats = grid3.features;
    for (let i = 0; i < feats.length; i++) {
      const feat = feats[i];
      try {
        const c = (turfCentroid(feat) as any).geometry.coordinates as number[];
        const id = feat.id ?? feat.properties?.OBJECTID ?? i;
        arr.push({ id, x: c[0], y: c[1] });
      } catch {
        // skip malformed geometry
      }
    }
    centroidsCache = arr;
    centroidsCacheKey = datasetKey;
  }

  const admFeatures = selected?.features ?? [];
  const admBboxes: (number[] | null)[] = admFeatures.map((f: any) => {
    try {
      return turfBbox(f) as number[];
    } catch {
      return null;
    }
  });

  const ids: (string | number)[] = [];
  const centroids = centroidsCache!;
  for (let i = 0; i < centroids.length; i++) {
    const pt = centroids[i];
    for (let j = 0; j < admFeatures.length; j++) {
      const bb = admBboxes[j];
      if (!bb) continue;
      if (pt.x < bb[0] || pt.x > bb[2] || pt.y < bb[1] || pt.y > bb[3]) continue;
      try {
        if (booleanPointInPolygon([pt.x, pt.y] as any, admFeatures[j])) {
          ids.push(pt.id);
          break;
        }
      } catch {
        // ignore malformed polygons
      }
    }
  }

  (self as any).postMessage({ type: "result", requestId, datasetKey, ids });
};

export {};
