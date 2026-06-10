import L from "leaflet";

export const MARKER_COLORS = {
  blue: "#2563eb",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  rose: "#e11d48",
  white: "#ffffff",
} as const;

export type PinColor = "blue" | "green" | "amber" | "red";
export type OutlinePinColor = "rose" | "green";

const buildFilledPinSvg = (fill: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="35" viewBox="0 0 24 35" fill="none">` +
  `<path d="M12 0C5.37 0 0 5.37 0 12c0 9.3 12 23 12 23s12-13.7 12-23c0-6.63-5.37-12-12-12z" fill="${fill}"/>` +
  `<circle cx="12" cy="12" r="4.5" fill="${MARKER_COLORS.white}"/>` +
  `</svg>`;

const buildOutlinePinSvg = (stroke: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M21 10a9 9 0 1 0-18 0 c0 7 9 13 9 13s9-6 9-13Z"/>` +
  `<circle cx="12" cy="10" r="3"/>` +
  `</svg>`;

const buildFacilityCircleSvg = (fill: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">` +
  `<circle cx="9" cy="9" r="8" fill="${fill}" stroke="${MARKER_COLORS.white}" stroke-width="1.5" />` +
  `<path d="M9 5v8M5 9h8" stroke="${MARKER_COLORS.white}" stroke-width="2.2" stroke-linecap="round" />` +
  `</svg>`;

const toDataUri = (svg: string): string => {
  const encoded =
    typeof window === "undefined"
      ? Buffer.from(svg, "utf-8").toString("base64")
      : window.btoa(svg);
  return `data:image/svg+xml;base64,${encoded}`;
};

const FILLED_PIN_COLORS: Record<PinColor, string> = {
  blue: MARKER_COLORS.blue,
  green: MARKER_COLORS.green,
  amber: MARKER_COLORS.amber,
  red: MARKER_COLORS.red,
};

const OUTLINE_PIN_COLORS: Record<OutlinePinColor, string> = {
  rose: MARKER_COLORS.rose,
  green: MARKER_COLORS.green,
};

export const FILLED_PIN_DATA_URIS: Record<PinColor, string> = {
  blue: toDataUri(buildFilledPinSvg(FILLED_PIN_COLORS.blue)),
  green: toDataUri(buildFilledPinSvg(FILLED_PIN_COLORS.green)),
  amber: toDataUri(buildFilledPinSvg(FILLED_PIN_COLORS.amber)),
  red: toDataUri(buildFilledPinSvg(FILLED_PIN_COLORS.red)),
};

export const OUTLINE_PIN_DATA_URIS: Record<OutlinePinColor, string> = {
  rose: toDataUri(buildOutlinePinSvg(OUTLINE_PIN_COLORS.rose)),
  green: toDataUri(buildOutlinePinSvg(OUTLINE_PIN_COLORS.green)),
};

export const FACILITY_CIRCLE_GREEN_DATA_URI = toDataUri(
  buildFacilityCircleSvg(MARKER_COLORS.green)
);

export interface IconSize {
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
}

export const FILLED_PIN_SIZE_24x35: IconSize = {
  iconSize: [24, 35],
  iconAnchor: [12, 35],
  popupAnchor: [0, -35],
};

export const FILLED_PIN_SIZE_20x29: IconSize = {
  iconSize: [20, 29],
  iconAnchor: [10, 29],
  popupAnchor: [0, -29],
};

export const OUTLINE_PIN_SIZE_24x30: IconSize = {
  iconSize: [24, 30],
  iconAnchor: [12, 30],
  popupAnchor: [0, -30],
};

export const FACILITY_CIRCLE_SIZE_18: IconSize = {
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
};

/**
 * Override the Leaflet default icon with the shared blue offline pin so any
 * <Marker> that does not specify a custom icon still renders without needing
 * network access to the Leaflet CDN. Safe to call multiple times.
 */
export function applyDefaultLeafletPinIcon(): void {
  if (typeof window === "undefined") return;
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  const proto = L.Icon.Default.prototype.options;
  proto.iconUrl = FILLED_PIN_DATA_URIS.blue;
  proto.iconRetinaUrl = FILLED_PIN_DATA_URIS.blue;
  proto.shadowUrl = "";
  proto.iconSize = FILLED_PIN_SIZE_24x35.iconSize;
  proto.iconAnchor = FILLED_PIN_SIZE_24x35.iconAnchor;
  proto.popupAnchor = FILLED_PIN_SIZE_24x35.popupAnchor;
}

export function createFilledPinIcon(
  color: PinColor,
  size: IconSize = FILLED_PIN_SIZE_24x35
): L.Icon {
  return L.icon({ iconUrl: FILLED_PIN_DATA_URIS[color], ...size });
}

export function createOutlinePinIcon(
  color: OutlinePinColor,
  size: IconSize = OUTLINE_PIN_SIZE_24x30
): L.Icon {
  return L.icon({ iconUrl: OUTLINE_PIN_DATA_URIS[color], ...size });
}

export function createFacilityCircleIcon(): L.Icon {
  return L.icon({
    iconUrl: FACILITY_CIRCLE_GREEN_DATA_URI,
    ...FACILITY_CIRCLE_SIZE_18,
  });
}
