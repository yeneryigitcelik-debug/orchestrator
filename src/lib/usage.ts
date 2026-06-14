// Kullanım/maliyet — DB'siz tipler + formatlayıcılar.
// Hem daemon (src/core/usage.ts, prisma ile toplar) hem de UI (/usage sayfası,
// UsageTicker) bunu import eder. Burada prisma YOK — client-safe kalmalı.

export type ModelTier = "opus" | "sonnet" | "haiku" | "other";

/** Tek bir worker'ın ömür boyu kullanım toplamı. */
export interface WorkerUsage {
  workerId: string;
  name: string;
  role: string;
  model: string;
  tier: ModelTier;
  status: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  turns: number;
  createdAt: string;
}

/** Model katmanı (opus/sonnet/haiku) bazında rollup. */
export interface TierUsage {
  tier: ModelTier;
  workers: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface UsageTotals {
  workers: number;
  turns: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface UsageSummary {
  totals: UsageTotals;
  byTier: TierUsage[];
  workers: WorkerUsage[];
  generatedAt: string;
}

/** Model id → katman. role-prompts.ts'teki eşleme ile aynı mantık. */
export function tierOf(model: string): ModelTier {
  if (model.includes("opus")) return "opus";
  if (model.includes("sonnet")) return "sonnet";
  if (model.includes("haiku")) return "haiku";
  return "other";
}

/** USD tutarı — küçükse 4, büyükse 2 ondalık. Başına "$" eklemez. */
export function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  return n >= 1 ? n.toFixed(2) : n.toFixed(4);
}

/** Token sayısı — kompakt: 2.30M / 45k / 1.2k / 540. */
export function fmtTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}
