import { useCallback, useEffect, useState } from "react";

export type Basemap = "osm" | "satellite";

const STORAGE_KEY = "vaxplan.basemap";

function readStored(): Basemap | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "osm" || v === "satellite" ? v : null;
  } catch {
    return null;
  }
}

export function usePersistedBasemap(defaultValue: Basemap = "osm") {
  const [basemap, setBasemapState] = useState<Basemap>(
    () => readStored() ?? defaultValue,
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, basemap);
    } catch {
      // ignore (e.g. private mode / storage disabled)
    }
  }, [basemap]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "osm" || e.newValue === "satellite") {
        setBasemapState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setBasemap = useCallback<
    React.Dispatch<React.SetStateAction<Basemap>>
  >((value) => {
    setBasemapState((prev) =>
      typeof value === "function" ? (value as (p: Basemap) => Basemap)(prev) : value,
    );
  }, []);

  return [basemap, setBasemap] as const;
}
