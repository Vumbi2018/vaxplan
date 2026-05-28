import type { VaccineConfig } from "./schema";

export interface DoseStage {
  code: string;
  label: string;
  antigen: string;
  doseNumber: number;
  configId: number;
}

const DOSE_LIST_SUFFIX = /^(.+?)[-_\s]+(\d+(?:\s*[,/]\s*\d+)*\+?)\s*$/;

function stripDoseListSuffix(name: string): string {
  const m = name.match(DOSE_LIST_SUFFIX);
  return m ? m[1].trim() : name;
}

function normalizeCode(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "_");
}

export function expandVaccineSchedule(
  configs: VaccineConfig[] | undefined | null,
): DoseStage[] {
  if (!configs || configs.length === 0) return [];

  const stages: DoseStage[] = [];

  for (const cfg of configs) {
    if (!cfg || (cfg as any).isActive === false) continue;
    const doses = Math.max(1, Number(cfg.doses) || 1);
    const rawName = (cfg.name || "").trim();
    if (!rawName) continue;

    if (doses === 1) {
      stages.push({
        code: normalizeCode(rawName),
        label: rawName,
        antigen: rawName,
        doseNumber: 1,
        configId: cfg.id,
      });
      continue;
    }

    const antigenLabel = stripDoseListSuffix(rawName);
    const codeBase = normalizeCode(antigenLabel);

    for (let i = 1; i <= doses; i++) {
      stages.push({
        code: `${codeBase}-${i}`,
        label: `${antigenLabel}-${i}`,
        antigen: antigenLabel,
        doseNumber: i,
        configId: cfg.id,
      });
    }
  }

  return stages;
}
