// ============================================================================
// OUTREACH SITE SUITABILITY SCORE
// ============================================================================
//
// A pure, shared scoring helper used both on the server (to rank unserved
// population clusters cheaply, without external network calls) and on the
// client (to refine a single cluster's score in the Geospatial Insights panel
// using the live travel-time and community-asset lookups it already runs).
//
// It deliberately imports NOTHING from server/ so it stays safe to bundle into
// the browser. All inputs are plain numbers the caller has already resolved.
//
// The score answers: "How good a candidate is this cluster for a NEW outreach
// site?" — combining how many unserved people are there, how far they are from
// any existing service (facility + existing outreach), whether a team can
// reach them, and whether there's a natural gathering venue (a landmark)
// nearby. Each input degrades gracefully: when a value is unknown the factor
// falls back to a labelled estimate rather than dropping out, so the total is
// always a 0–100 number.

export interface SuitabilityFactor {
  /** Stable key for the factor (population, facilityDistance, …). */
  key: string;
  /** Plain-language label shown to planners. */
  label: string;
  /** Maximum points this factor can contribute (the factor weight). */
  weight: number;
  /** Normalised 0–1 strength of this factor. */
  score: number;
  /** Points awarded = score × weight, rounded to 1 dp. */
  points: number;
  /** True when derived from a heuristic / fallback rather than measured data. */
  estimated: boolean;
  /** Short human explanation of why the factor scored as it did. */
  detail: string;
}

export interface SuitabilityInput {
  /** Estimated total population of the cluster. */
  estimatedPopulation: number;
  /** Great-circle / road km to the nearest health facility (null = unknown). */
  distanceToFacilityKm: number | null;
  /**
   * Km to the nearest EXISTING outreach site. `null` means the tenant has no
   * active outreach sites at all (a full service gap → maximum credit).
   */
  outreachGapKm: number | null;
  /** Driving minutes to the nearest facility (real or estimated). */
  travelTimeMin: number | null;
  /** True when travelTimeMin is a heuristic / straight-line estimate. */
  travelTimeEstimated: boolean;
  /** Count of community landmarks nearby (null when not looked up yet). */
  landmarkCount: number | null;
  /** True once a landmark lookup has actually run (false in the bulk list). */
  landmarkKnown: boolean;
}

export interface SuitabilityResult {
  /** Overall 0–100 suitability score. */
  score: number;
  /** Per-factor breakdown (always the same five factors, in display order). */
  factors: SuitabilityFactor[];
  /** Estimated under-5 children in the cluster. */
  estimatedUnder5: number;
  /** Estimated zero-dose (unvaccinated) children, used mainly for ranking. */
  estimatedZeroDoseChildren: number;
}

// Factor weights (sum = 100). Tuned to the data we can reliably resolve.
// Zero-dose carries explicit weight so clusters with more likely
// never-vaccinated children rank higher, all else equal.
export const SUITABILITY_WEIGHTS = {
  population: 20,
  zeroDose: 20,
  facilityDistance: 20,
  outreachGap: 20,
  roadAccess: 10,
  landmark: 10,
} as const;

// Normalisation caps — the point at which a factor reaches full strength.
const POPULATION_FULL = 500; // people
const ZERO_DOSE_FULL = 75; // estimated zero-dose children
const FACILITY_DISTANCE_FULL_KM = 20;
const OUTREACH_GAP_FULL_KM = 15;
const ROAD_ACCESS_MAX_MIN = 120; // beyond ~2h drive, road access scores 0
const LANDMARK_FULL_COUNT = 3;

// Demographic fractions (kept consistent with the validate-settlement fallback
// that promotes a candidate at 18% under-5).
const UNDER5_FRACTION = 0.18;
const ZERO_DOSE_MIN_SHARE = 0.3;
const ZERO_DOSE_MAX_SHARE = 0.8;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Estimated under-5 children for a cluster of the given population. */
export function estimateUnder5(estimatedPopulation: number): number {
  const pop = Number.isFinite(estimatedPopulation) ? Math.max(0, estimatedPopulation) : 0;
  return Math.round(pop * UNDER5_FRACTION);
}

/**
 * Estimated zero-dose (never-vaccinated) children. Unserved clusters this far
 * from a facility have a higher share of children who have missed every dose,
 * so the share scales with remoteness (capped) and is applied to the under-5
 * pool. This is explicitly a planning estimate, not a measured count.
 */
export function estimateZeroDoseChildren(
  estimatedPopulation: number,
  distanceToFacilityKm: number | null,
): number {
  const under5 = estimateUnder5(estimatedPopulation);
  const dist = distanceToFacilityKm != null && Number.isFinite(distanceToFacilityKm)
    ? Math.max(0, distanceToFacilityKm)
    : 0;
  const share = Math.min(
    ZERO_DOSE_MAX_SHARE,
    Math.max(ZERO_DOSE_MIN_SHARE, ZERO_DOSE_MIN_SHARE + dist / 40),
  );
  return Math.round(under5 * share);
}

/**
 * Compute the 0–100 Outreach Site Suitability Score plus a factor breakdown.
 * Never throws; unknown inputs become labelled estimates.
 */
export function computeOutreachSuitability(input: SuitabilityInput): SuitabilityResult {
  const pop = Number.isFinite(input.estimatedPopulation)
    ? Math.max(0, input.estimatedPopulation)
    : 0;

  const factors: SuitabilityFactor[] = [];

  // 1) Population — bigger unserved population = more impact from a new site.
  {
    const score = clamp01(pop / POPULATION_FULL);
    factors.push({
      key: "population",
      label: "Population size",
      weight: SUITABILITY_WEIGHTS.population,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.population),
      estimated: false,
      detail: `About ${pop.toLocaleString()} people in this cluster`,
    });
  }

  // 2) Zero-dose children — the core equity target. A cluster with more likely
  //    never-vaccinated children should rank higher, all else equal. Derived
  //    from population + remoteness (estimateZeroDoseChildren), so it is always
  //    an estimate.
  const zeroDoseChildren = estimateZeroDoseChildren(pop, input.distanceToFacilityKm);
  {
    const score = clamp01(zeroDoseChildren / ZERO_DOSE_FULL);
    factors.push({
      key: "zeroDose",
      label: "Likely zero-dose children",
      weight: SUITABILITY_WEIGHTS.zeroDose,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.zeroDose),
      estimated: true,
      detail: `About ${zeroDoseChildren} likely zero-dose (never-vaccinated) children`,
    });
  }

  // 3) Distance to nearest facility — the farther, the bigger the access gap a
  //    new outreach site would fill.
  {
    const dist = input.distanceToFacilityKm;
    const known = dist != null && Number.isFinite(dist);
    const score = known ? clamp01(Math.max(0, dist!) / FACILITY_DISTANCE_FULL_KM) : 0;
    factors.push({
      key: "facilityDistance",
      label: "Distance from nearest facility",
      weight: SUITABILITY_WEIGHTS.facilityDistance,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.facilityDistance),
      estimated: !known,
      detail: known
        ? `${round1(Math.max(0, dist!))} km from the nearest health facility`
        : "Distance to nearest facility unknown",
    });
  }

  // 4) Existing-outreach gap — far from (or no) existing outreach = less
  //    duplication, a cleaner gap to fill.
  {
    const gap = input.outreachGapKm;
    let score: number;
    let detail: string;
    if (gap == null) {
      // No active outreach sites in the tenant at all → full service gap.
      score = 1;
      detail = "No existing outreach site nearby";
    } else if (Number.isFinite(gap)) {
      score = clamp01(Math.max(0, gap) / OUTREACH_GAP_FULL_KM);
      detail = `${round1(Math.max(0, gap))} km from the nearest existing outreach site`;
    } else {
      score = 1;
      detail = "No existing outreach site nearby";
    }
    factors.push({
      key: "outreachGap",
      label: "Existing-outreach gap",
      weight: SUITABILITY_WEIGHTS.outreachGap,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.outreachGap),
      estimated: false,
      detail,
    });
  }

  // 5) Road access — a site a team can actually reach is more operable. Closer
  //    travel time scores higher; beyond ~2h it scores 0.
  {
    const tt = input.travelTimeMin;
    const known = tt != null && Number.isFinite(tt);
    const score = known ? clamp01(1 - Math.max(0, tt!) / ROAD_ACCESS_MAX_MIN) : 0.4;
    factors.push({
      key: "roadAccess",
      label: "Road access / travel time",
      weight: SUITABILITY_WEIGHTS.roadAccess,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.roadAccess),
      estimated: !known || input.travelTimeEstimated,
      detail: known
        ? `About ${Math.round(Math.max(0, tt!))} min drive to the nearest facility${
            input.travelTimeEstimated ? " (estimated)" : ""
          }`
        : "Travel time not yet measured — open Insights to route it",
    });
  }

  // 6) Nearby landmark — a school / place of worship / market is a natural
  //    venue for a session. Unknown until a live lookup runs (bulk list).
  {
    const count = input.landmarkCount;
    let score: number;
    let detail: string;
    let estimated: boolean;
    if (!input.landmarkKnown || count == null || !Number.isFinite(count)) {
      // Partial, clearly-labelled credit until Insights checks OSM.
      score = 0.5;
      estimated = true;
      detail = "Nearby landmarks not yet checked — open Insights";
    } else {
      score = clamp01(count / LANDMARK_FULL_COUNT);
      estimated = false;
      detail =
        count > 0
          ? `${count} community landmark${count === 1 ? "" : "s"} within 3 km`
          : "No mapped landmark within 3 km";
    }
    factors.push({
      key: "landmark",
      label: "Nearby landmark / venue",
      weight: SUITABILITY_WEIGHTS.landmark,
      score,
      points: round1(score * SUITABILITY_WEIGHTS.landmark),
      estimated,
      detail,
    });
  }

  const score = Math.round(factors.reduce((sum, f) => sum + f.points, 0));

  return {
    score: Math.min(100, Math.max(0, score)),
    factors,
    estimatedUnder5: estimateUnder5(pop),
    estimatedZeroDoseChildren: estimateZeroDoseChildren(pop, input.distanceToFacilityKm),
  };
}

/** A qualitative band + colour for a 0–100 score, for badges/labels. */
export function suitabilityBand(score: number): {
  label: string;
  tone: "high" | "medium" | "low";
} {
  if (score >= 70) return { label: "High", tone: "high" };
  if (score >= 45) return { label: "Medium", tone: "medium" };
  return { label: "Low", tone: "low" };
}
