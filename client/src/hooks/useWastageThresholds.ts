import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_WASTAGE_THRESHOLDS,
  mergeWastageThresholds,
  type WastageThreshold,
} from "@/lib/wastageThresholds";

export interface WastageThresholdsResponse {
  defaults: Record<string, WastageThreshold>;
  overrides: Record<string, WastageThreshold>;
  effective: Record<string, WastageThreshold>;
}

/**
 * Loads the tenant-effective wastage thresholds (WHO defaults merged with any
 * per-tenant overrides stored in `tenants.settings.wastageThresholds`). Falls
 * back to the WHO defaults while loading or on error so chips always render.
 */
export function useWastageThresholds() {
  const query = useQuery<WastageThresholdsResponse>({
    queryKey: ["/api/me/tenant/wastage-thresholds"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const thresholds = useMemo(
    () => query.data?.effective ?? mergeWastageThresholds(query.data?.overrides),
    [query.data],
  );

  return {
    thresholds,
    overrides: query.data?.overrides ?? {},
    defaults: query.data?.defaults ?? DEFAULT_WASTAGE_THRESHOLDS,
    isLoading: query.isLoading,
  };
}
