// Kullanım/maliyet özeti — daemon tarafı. Worker'ların `result` event'lerinden
// token + maliyeti toplar, model katmanına (fable/opus/sonnet/haiku) göre gruplar.
//
// Salt-okuma: spawn/lifecycle'a dokunmaz, yalnız Message + Worker tablolarını
// okur. Veri kaynağı = type='result' Message satırları. Worker satırı silinince
// mesajları cascade silinir → özet "DB'de şu an duran worker'lar" kapsamındadır.
//
// ÖLÇÜM NOTU: Claude Code `result` event'i session-kümülatif raporlar
// (total_cost_usd / usage o ana dek olan toplamı taşır). Bu yüzden worker
// başına TÜM result'ları toplamayız — en SON result event'i alınır; o, worker'ın
// ömür boyu toplamıdır. `turns` = üretilen result event sayısı (≈ tamamlanan tur).

import { prisma } from "../lib/db";
import {
  tierOf,
  type ModelTier,
  type TierUsage,
  type UsageSummary,
  type UsageTotals,
  type WorkerUsage,
} from "../lib/usage";

interface ParsedResult {
  cost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Bir `result` event payload'ından maliyet + token çıkar. */
function parseResultPayload(payload: string): ParsedResult | null {
  try {
    const ev = JSON.parse(payload) as {
      total_cost_usd?: unknown;
      usage?: Record<string, unknown>;
    };
    const u = ev.usage ?? {};
    return {
      cost: num(ev.total_cost_usd),
      input: num(u.input_tokens),
      output: num(u.output_tokens),
      cacheRead: num(u.cache_read_input_tokens),
      cacheWrite: num(u.cache_creation_input_tokens),
    };
  } catch {
    return null;
  }
}

const ALL_TIERS: ModelTier[] = ["fable", "opus", "sonnet", "haiku", "other"];

function sum<T>(arr: T[], pick: (x: T) => number): number {
  let s = 0;
  for (const x of arr) s += pick(x);
  return s;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const [workers, results] = await Promise.all([
    prisma.worker.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.message.findMany({
      where: { type: "result" },
      select: { workerId: true, payload: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // worker → en son result (asc sıra → son yazılan kazanır) + result sayısı.
  const lastResult = new Map<string, ParsedResult>();
  const turnCount = new Map<string, number>();
  for (const r of results) {
    turnCount.set(r.workerId, (turnCount.get(r.workerId) ?? 0) + 1);
    const p = parseResultPayload(r.payload);
    if (p) lastResult.set(r.workerId, p);
  }

  const workerUsage: WorkerUsage[] = workers.map((w) => {
    const p = lastResult.get(w.id);
    return {
      workerId: w.id,
      name: w.name,
      role: w.role,
      model: w.model,
      tier: tierOf(w.model),
      status: w.status,
      costUsd: p?.cost ?? 0,
      inputTokens: p?.input ?? 0,
      outputTokens: p?.output ?? 0,
      cacheReadTokens: p?.cacheRead ?? 0,
      cacheWriteTokens: p?.cacheWrite ?? 0,
      turns: turnCount.get(w.id) ?? 0,
      createdAt: w.createdAt.toISOString(),
    };
  });

  // model katmanı rollup
  const tierMap = new Map<ModelTier, TierUsage>(
    ALL_TIERS.map((tier): [ModelTier, TierUsage] => [
      tier,
      {
        tier,
        workers: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    ]),
  );
  for (const w of workerUsage) {
    const t = tierMap.get(w.tier);
    if (!t) continue;
    t.workers += 1;
    t.costUsd += w.costUsd;
    t.inputTokens += w.inputTokens;
    t.outputTokens += w.outputTokens;
    t.cacheReadTokens += w.cacheReadTokens;
    t.cacheWriteTokens += w.cacheWriteTokens;
  }
  const byTier = [...tierMap.values()].filter((t) => t.workers > 0);

  const totals: UsageTotals = {
    workers: workerUsage.length,
    turns: sum(workerUsage, (w) => w.turns),
    costUsd: sum(workerUsage, (w) => w.costUsd),
    inputTokens: sum(workerUsage, (w) => w.inputTokens),
    outputTokens: sum(workerUsage, (w) => w.outputTokens),
    cacheReadTokens: sum(workerUsage, (w) => w.cacheReadTokens),
    cacheWriteTokens: sum(workerUsage, (w) => w.cacheWriteTokens),
  };

  return {
    totals,
    byTier,
    workers: workerUsage,
    generatedAt: new Date().toISOString(),
  };
}
