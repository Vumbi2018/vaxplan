export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : new Date().toISOString();

export function formatBuildTime(iso: string = BUILD_TIME): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} UTC${d.getTimezoneOffset() <= 0 ? "+" : "-"}${pad(Math.abs(d.getTimezoneOffset()) / 60)}`;
}

export function versionLabel(): string {
  return `v${APP_VERSION} · built ${formatBuildTime()}`;
}
