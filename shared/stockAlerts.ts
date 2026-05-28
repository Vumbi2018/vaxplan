import type { StockTransaction, VaccineConfig } from "./schema";

export const DEFAULT_MONTHS_OF_STOCK_THRESHOLD = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CONSUMPTION_WINDOW_DAYS = 90;

export type ExpiryStatus = "expired" | "expiring-30" | "expiring-60" | "ok";

export function getExpiryStatus(
  expiryDate: string | Date | null | undefined,
  now: Date = new Date(),
): { status: ExpiryStatus; daysUntil: number } {
  if (!expiryDate) return { status: "ok", daysUntil: Infinity };
  const exp = new Date(expiryDate).getTime();
  const daysUntil = Math.floor((exp - now.getTime()) / MS_PER_DAY);
  if (daysUntil < 0) return { status: "expired", daysUntil };
  if (daysUntil <= 30) return { status: "expiring-30", daysUntil };
  if (daysUntil <= 60) return { status: "expiring-60", daysUntil };
  return { status: "ok", daysUntil };
}

/**
 * Returns total doses issued (consumed) per antigen over the last
 * `windowDays`, scaled to a per-month rate.
 */
export function computeAvgMonthlyConsumption(
  transactions: StockTransaction[],
  now: Date = new Date(),
  windowDays: number = CONSUMPTION_WINDOW_DAYS,
): Record<string, number> {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.transactionType !== "issue" && tx.transactionType !== "loss") continue;
    const txTime = new Date(tx.transactionDate).getTime();
    if (txTime < cutoff) continue;
    totals[tx.vaccineName] =
      (totals[tx.vaccineName] ?? 0) + Number(tx.quantityDoses ?? 0);
  }
  const monthsInWindow = windowDays / 30;
  const perMonth: Record<string, number> = {};
  for (const [name, total] of Object.entries(totals)) {
    perMonth[name] = total / monthsInWindow;
  }
  return perMonth;
}

export function computeStockOnHand(
  transactions: StockTransaction[],
  vaccineConfigs?: VaccineConfig[],
): Record<string, number> {
  const soh: Record<string, number> = {};
  if (vaccineConfigs) {
    for (const c of vaccineConfigs) {
      if (c.isActive) soh[c.name] = 0;
    }
  }
  for (const tx of transactions) {
    if (!(tx.vaccineName in soh)) soh[tx.vaccineName] = 0;
    const doses = Number(tx.quantityDoses ?? 0);
    if (tx.transactionType === "receipt" || tx.transactionType === "adjustment") {
      soh[tx.vaccineName] += doses;
    } else if (tx.transactionType === "issue" || tx.transactionType === "loss") {
      soh[tx.vaccineName] -= doses;
    }
  }
  return soh;
}

export interface AntigenStockStatus {
  antigen: string;
  balance: number;
  avgMonthlyConsumption: number;
  monthsOfStock: number | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export function computeAntigenStatus(
  transactions: StockTransaction[],
  vaccineConfigs: VaccineConfig[] | undefined,
  thresholdMonths: number,
  now: Date = new Date(),
): AntigenStockStatus[] {
  const soh = computeStockOnHand(transactions, vaccineConfigs);
  const consumption = computeAvgMonthlyConsumption(transactions, now);
  return Object.keys(soh).map((antigen) => {
    const balance = soh[antigen];
    const avg = consumption[antigen] ?? 0;
    const mos = avg > 0 ? balance / avg : null;
    const isOutOfStock = balance <= 0;
    const isLowStock =
      isOutOfStock || (mos !== null && mos < thresholdMonths);
    return {
      antigen,
      balance,
      avgMonthlyConsumption: avg,
      monthsOfStock: mos,
      isLowStock,
      isOutOfStock,
    };
  });
}

export interface NearExpiryReceipt {
  transactionId: number;
  antigen: string;
  batchNumber: string;
  expiryDate: string | Date;
  remainingDoses: number;
  status: ExpiryStatus;
  daysUntil: number;
}

/**
 * Returns receipt transactions whose batches are within 60 days of expiry
 * (or already expired) and that still appear to have remaining stock —
 * i.e. cumulative receipts of that batch outweigh cumulative issues/losses.
 */
export function computeNearExpiryReceipts(
  transactions: StockTransaction[],
  now: Date = new Date(),
): NearExpiryReceipt[] {
  const batchBalance: Record<string, number> = {};
  for (const tx of transactions) {
    const key = `${tx.vaccineName}::${tx.batchNumber}`;
    const doses = Number(tx.quantityDoses ?? 0);
    if (!(key in batchBalance)) batchBalance[key] = 0;
    if (tx.transactionType === "receipt" || tx.transactionType === "adjustment") {
      batchBalance[key] += doses;
    } else {
      batchBalance[key] -= doses;
    }
  }

  const out: NearExpiryReceipt[] = [];
  for (const tx of transactions) {
    if (tx.transactionType !== "receipt") continue;
    const { status, daysUntil } = getExpiryStatus(tx.expiryDate, now);
    if (status === "ok") continue;
    const key = `${tx.vaccineName}::${tx.batchNumber}`;
    const remaining = batchBalance[key] ?? 0;
    if (remaining <= 0) continue;
    out.push({
      transactionId: tx.id,
      antigen: tx.vaccineName,
      batchNumber: tx.batchNumber,
      expiryDate: tx.expiryDate as any,
      remainingDoses: remaining,
      status,
      daysUntil,
    });
  }
  return out;
}

export interface FacilityStockAlertSummary {
  facilityId: number;
  lowStockAntigens: string[];
  outOfStockAntigens: string[];
  nearExpiryBatches: number;
  expiringSoonBatches: number;
  expiredBatches: number;
}

export function summarizeFacilityAlerts(
  transactions: StockTransaction[],
  vaccineConfigs: VaccineConfig[] | undefined,
  thresholdMonths: number,
  now: Date = new Date(),
): FacilityStockAlertSummary[] {
  const byFacility: Record<number, StockTransaction[]> = {};
  for (const tx of transactions) {
    if (tx.facilityId == null) continue;
    const fid = Number(tx.facilityId);
    if (!byFacility[fid]) byFacility[fid] = [];
    byFacility[fid].push(tx);
  }
  return Object.entries(byFacility).map(([fid, txs]) => {
    const statuses = computeAntigenStatus(txs, vaccineConfigs, thresholdMonths, now);
    const expiry = computeNearExpiryReceipts(txs, now);
    return {
      facilityId: Number(fid),
      lowStockAntigens: statuses
        .filter((s) => s.isLowStock && !s.isOutOfStock)
        .map((s) => s.antigen),
      outOfStockAntigens: statuses
        .filter((s) => s.isOutOfStock)
        .map((s) => s.antigen),
      nearExpiryBatches: expiry.length,
      expiringSoonBatches: expiry.filter(
        (e) => e.status === "expiring-30" || e.status === "expired",
      ).length,
      expiredBatches: expiry.filter((e) => e.status === "expired").length,
    };
  });
}

export function hasFacilityAlerts(s: FacilityStockAlertSummary): boolean {
  return (
    s.lowStockAntigens.length > 0 ||
    s.outOfStockAntigens.length > 0 ||
    s.nearExpiryBatches > 0
  );
}
