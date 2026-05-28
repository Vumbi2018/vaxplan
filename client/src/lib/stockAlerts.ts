import type { StockTransaction, VaccineConfig } from "@shared/schema";

export const DEFAULT_MONTHS_OF_STOCK_THRESHOLD = 1;
export const STOCK_THRESHOLD_STORAGE_KEY = "vaxplan_stock_mos_threshold";

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
  monthsOfStock: number | null; // null = no consumption history, cannot compute
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
  remainingDoses: number; // total received in batch (best-effort proxy)
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
  // Aggregate movements per batch
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
  expiringSoonBatches: number; // ≤30 days
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

export interface TransferSuggestion {
  antigen: string;
  batchNumber: string;
  expiryDate: string | Date;
  daysUntilExpiry: number;
  expiryStatus: ExpiryStatus;
  sourceFacilityId: number;
  destFacilityId: number;
  sourceBatchRemaining: number;
  destBalance: number;
  destMonthsOfStock: number | null;
  destShortfallDoses: number; // doses needed to bring dest up to thresholdMonths of stock
  suggestedDoses: number; // min(sourceBatchRemaining, destShortfallDoses) — at least 1 if both positive
  urgencyScore: number; // higher = more urgent
}

/**
 * Suggests redistribution of near-expiry batches from facilities with surplus
 * to facilities running below the months-of-stock threshold for the same antigen.
 *
 * Ranks each pair by an urgency score combining how soon the batch expires and
 * how short the destination is on that antigen.
 */
export function computeTransferSuggestions(
  transactions: StockTransaction[],
  vaccineConfigs: VaccineConfig[] | undefined,
  thresholdMonths: number,
  now: Date = new Date(),
): TransferSuggestion[] {
  // Bucket transactions by facility
  const byFacility = new Map<number, StockTransaction[]>();
  for (const tx of transactions) {
    if (tx.facilityId == null) continue;
    const fid = Number(tx.facilityId);
    const list = byFacility.get(fid) ?? [];
    list.push(tx);
    byFacility.set(fid, list);
  }

  // Per-facility antigen status (for destination shortfall)
  const facilityStatus = new Map<number, Map<string, AntigenStockStatus>>();
  byFacility.forEach((txs, fid) => {
    const statuses = computeAntigenStatus(txs, vaccineConfigs, thresholdMonths, now);
    const m = new Map<string, AntigenStockStatus>();
    for (const s of statuses) m.set(s.antigen, s);
    facilityStatus.set(fid, m);
  });

  // Per-facility near-expiry batches with remaining doses (source candidates)
  const out: TransferSuggestion[] = [];
  byFacility.forEach((txs, sourceFid) => {
    const nearExp = computeNearExpiryReceipts(txs, now);
    const sourceStatuses = facilityStatus.get(sourceFid);
    for (const batch of nearExp) {
      if (batch.status === "expired") continue; // don't redistribute expired doses

      // Source must have SURPLUS on this antigen — i.e. not low/out of stock
      // itself, and enough headroom to give doses away without falling below
      // the threshold.
      const sourceS = sourceStatuses?.get(batch.antigen);
      if (!sourceS || sourceS.isLowStock) continue;
      // Doses the source could spare while still staying at/above threshold.
      // If source has no recent consumption, treat the whole batch as spare.
      const sourceFloorDoses =
        sourceS.avgMonthlyConsumption > 0
          ? Math.ceil(sourceS.avgMonthlyConsumption * thresholdMonths)
          : 0;
      const sourceSurplus = Math.max(0, sourceS.balance - sourceFloorDoses);
      const transferableFromBatch = Math.min(batch.remainingDoses, sourceSurplus);
      if (transferableFromBatch <= 0) continue;

      // Find destinations that are low (or out) on this antigen.
      facilityStatus.forEach((destStatuses, destFid) => {
        if (destFid === sourceFid) return;
        const destS = destStatuses.get(batch.antigen);
        if (!destS) return;
        if (!destS.isLowStock) return;
        // How many doses would bring dest up to the threshold?
        // If no consumption history at dest, use the transferable surplus as a sensible cap.
        const targetDoses =
          destS.avgMonthlyConsumption > 0
            ? Math.max(0, Math.ceil(destS.avgMonthlyConsumption * thresholdMonths - destS.balance))
            : transferableFromBatch;
        const shortfall = Math.max(1, targetDoses); // at least 1 dose
        const suggested = Math.min(transferableFromBatch, shortfall);
        if (suggested <= 0) return;
        // Urgency: smaller daysUntil and bigger shortfall both raise score.
        // Base score: 1000 / (daysUntil+1) gives 33 at 30d, 16 at 60d.
        // Shortfall multiplier: out-of-stock dest weighted heavier.
        const expiryWeight = 1000 / Math.max(1, batch.daysUntil + 1);
        const stockWeight = destS.isOutOfStock
          ? 50
          : destS.monthsOfStock !== null
            ? Math.max(1, (thresholdMonths - destS.monthsOfStock) * 10)
            : 10;
        const urgencyScore = expiryWeight + stockWeight;
        out.push({
          antigen: batch.antigen,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          daysUntilExpiry: batch.daysUntil,
          expiryStatus: batch.status,
          sourceFacilityId: sourceFid,
          destFacilityId: destFid,
          sourceBatchRemaining: batch.remainingDoses,
          destBalance: destS.balance,
          destMonthsOfStock: destS.monthsOfStock,
          destShortfallDoses: shortfall,
          suggestedDoses: suggested,
          urgencyScore,
        });
      });
    }
  });

  out.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return out;
}

export function loadStockThreshold(): number {
  if (typeof window === "undefined") return DEFAULT_MONTHS_OF_STOCK_THRESHOLD;
  try {
    const raw = localStorage.getItem(STOCK_THRESHOLD_STORAGE_KEY);
    if (!raw) return DEFAULT_MONTHS_OF_STOCK_THRESHOLD;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_MONTHS_OF_STOCK_THRESHOLD;
    return n;
  } catch {
    return DEFAULT_MONTHS_OF_STOCK_THRESHOLD;
  }
}

export function saveStockThreshold(n: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STOCK_THRESHOLD_STORAGE_KEY, String(n));
  } catch {}
}
