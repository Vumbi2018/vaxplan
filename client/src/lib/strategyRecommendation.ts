// Smart Service Delivery Strategy recommender (WHO/Gavi RED Step 4).
// Takes distance / terrain / HTR signals already on a village and returns a
// plain-language recommendation that an HCW can accept or override.

export type DeliveryStrategy = "fixed" | "outreach" | "mobile" | "hard_to_reach";
export type DeliveryFrequency = "weekly" | "fortnightly" | "monthly" | "quarterly";

export interface StrategyRecommendation {
  strategy: DeliveryStrategy;
  strategyLabel: string;
  frequency: DeliveryFrequency;
  frequencyLabel: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  tone: "emerald" | "sky" | "amber" | "rose";
}

export interface RecommendationInput {
  distanceKm?: number | null;
  travelTimeMinutes?: number | null;
  terrainDifficulty?: string | null; // "easy" | "moderate" | "difficult" | "very_difficult"
  isHardToReach?: boolean | null;
  insecurityLevel?: string | null; // "none" | "low" | "moderate" | "high"
  seasonalAccessibility?: string | null; // "all_year" | "dry_only" | "wet_only" | "limited"
}

const STRATEGY_LABEL: Record<DeliveryStrategy, string> = {
  fixed: "Fixed-post",
  outreach: "Outreach",
  mobile: "Mobile team",
  hard_to_reach: "Hard-to-reach (mobile + escort)",
};

const FREQ_LABEL: Record<DeliveryFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly catch-up",
};

const terrainScore = (t?: string | null): number => {
  switch ((t || "").toLowerCase()) {
    case "very_difficult": return 3;
    case "difficult": return 2;
    case "moderate": return 1;
    default: return 0;
  }
};

const insecurityScore = (i?: string | null): number => {
  switch ((i || "").toLowerCase()) {
    case "high": return 3;
    case "moderate": return 2;
    case "low": return 1;
    default: return 0;
  }
};

export function recommendStrategy(input: RecommendationInput): StrategyRecommendation {
  const km = input.distanceKm ?? 0;
  const min = input.travelTimeMinutes ?? Math.round(km * 12); // ~5 km/h walking pace
  const terr = terrainScore(input.terrainDifficulty);
  const insec = insecurityScore(input.insecurityLevel);
  const seasonal = (input.seasonalAccessibility || "").toLowerCase();
  const explicitHtr = !!input.isHardToReach;

  // Composite risk weight.
  const distScore = km >= 25 ? 3 : km >= 15 ? 2 : km >= 5 ? 1 : 0;
  const composite = distScore + terr + insec + (explicitHtr ? 2 : 0) + (seasonal && seasonal !== "all_year" ? 1 : 0);

  let strategy: DeliveryStrategy;
  let frequency: DeliveryFrequency;
  let reason: string;
  let confidence: "high" | "medium" | "low" = "high";
  let tone: StrategyRecommendation["tone"] = "emerald";

  if (km <= 0 && !explicitHtr && terr === 0 && insec === 0) {
    strategy = "fixed";
    frequency = "weekly";
    reason = "Community is at the facility — vaccinate every clinic day.";
    confidence = "medium";
    tone = "sky";
  } else if (composite >= 6 || explicitHtr || km >= 25 || insec >= 2) {
    strategy = "hard_to_reach";
    frequency = composite >= 8 ? "quarterly" : "monthly";
    reason = [
      km >= 25 ? `${km.toFixed(1)} km from the facility` : null,
      terr >= 2 ? "difficult terrain" : null,
      insec >= 2 ? "security concerns" : null,
      explicitHtr ? "flagged hard-to-reach" : null,
      seasonal && seasonal !== "all_year" ? `${seasonal.replace("_", " ")} access only` : null,
    ].filter(Boolean).join(" + ") + ". Plan a mobile team with escort and catch-up sweep.";
    tone = "rose";
  } else if (km >= 5 || composite >= 3) {
    strategy = "outreach";
    frequency = composite >= 4 ? "monthly" : "fortnightly";
    reason = [
      km >= 5 ? `${km.toFixed(1)} km / ~${min} min from facility` : null,
      terr >= 1 ? `${input.terrainDifficulty} terrain` : null,
    ].filter(Boolean).join(", ") + " — schedule recurring outreach.";
    tone = "amber";
  } else {
    strategy = "fixed";
    frequency = "weekly";
    reason = `Only ${km.toFixed(1)} km away — patients can attend fixed sessions.`;
    tone = "sky";
  }

  return {
    strategy,
    strategyLabel: STRATEGY_LABEL[strategy],
    frequency,
    frequencyLabel: FREQ_LABEL[frequency],
    reason,
    confidence,
    tone,
  };
}

export function toneClasses(tone: StrategyRecommendation["tone"]): { bg: string; text: string; border: string } {
  switch (tone) {
    case "emerald": return { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30" };
    case "sky": return { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/30" };
    case "amber": return { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" };
    case "rose": return { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/30" };
  }
}
