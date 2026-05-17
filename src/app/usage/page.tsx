"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { ROLE_ACCENT_VAR } from "@/lib/roles";
import {
  fmtTokens,
  fmtUsd,
  type ModelTier,
  type TierUsage,
  type UsageSummary,
  type WorkerUsage,
} from "@/lib/usage";

/** Katman → etiket + sinyal rengi. opus = lime (dikkat), aşağı indikçe yeşil. */
const TIER_META: Record<ModelTier, { label: string; color: string }> = {
  opus: { label: "OPUS", color: "var(--color-signal-yellow)" },
  sonnet: { label: "SONNET", color: "var(--color-signal-cyan)" },
  haiku: { label: "HAIKU", color: "var(--color-signal-green)" },
  other: { label: "OTHER", color: "var(--color-fg-dim)" },
};

const STATUS_TONE: Record<string, string> = {
  running: "var(--color-phosphor)",
  thinking: "var(--color-signal-cyan)",
  starting: "var(--color-signal-amber)",
  crashed: "var(--color-signal-red)",
  stopped: "var(--color-fg-disabled)",
  idle: "var(--color-fg-dim)",
};

const navBtn =
  "label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors";

function workerTokens(w: WorkerUsage): number {
  return w.inputTokens + w.outputTokens + w.cacheReadTokens + w.cacheWriteTokens;
}

function tierTokens(t: TierUsage): number {
  return t.inputTokens + t.outputTokens + t.cacheReadTokens + t.cacheWriteTokens;
}

function fmtClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * /usage — worker kullanım & maliyet HUD'u. Daemon'daki getUsageSummary'i
 * /api/usage üzerinden çeker; toplam rollup + model katmanı kartları + worker
 * tablosu gösterir. 15sn'de bir otomatik tazelenir.
 */
export default function UsagePage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/usage");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(body.usage as UsageSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "kullanım verisi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const workers = useMemo(
    () =>
      data
        ? [...data.workers].sort(
            (a, b) =>
              b.costUsd - a.costUsd || workerTokens(b) - workerTokens(a),
          )
        : [],
    [data],
  );

  const totalTokens = data
    ? data.totals.inputTokens +
      data.totals.outputTokens +
      data.totals.cacheReadTokens +
      data.totals.cacheWriteTokens
    : 0;

  return (
    <>
      <div className="scanline-top" />
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* === HEADER === */}
        <header className="reveal flex items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/80 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="brand-display brand-flicker text-[20px] text-[color:var(--color-signal-amber)] leading-none tracking-wider glow-soft">
              ORCHESTRATOR
            </span>
            <span className="brand-cursor text-[20px] text-[color:var(--color-signal-amber)] leading-none">
              ▮
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-1">
            v0.1.0 :: USAGE
          </span>
          <span className="ml-auto" />
          <button onClick={load} className={navBtn}>
            ↻ REFRESH
          </button>
          <Link href="/" className={navBtn}>
            ◂ ORCHESTRATOR
          </Link>
        </header>

        {/* === BODY === */}
        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-4">
            {error && (
              <div className="panel-inner px-3 py-2 border-l-2 border-[color:var(--color-signal-red)] label-tac-sm text-[color:var(--color-signal-red)]">
                ✕ {error}
              </div>
            )}

            {!data && loading ? (
              <div className="panel-inner px-3 py-10 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
                ··· loading usage
              </div>
            ) : !data ? (
              <div className="panel-inner px-3 py-10 text-center label-tac-sm text-[color:var(--color-fg-disabled)]">
                ▸ veri yok
              </div>
            ) : data.totals.workers === 0 ? (
              <div className="panel-inner px-3 py-10 text-center label-tac-sm text-[color:var(--color-fg-disabled)]">
                ▸ DB&apos;de worker yok — helper spawn et, kullanım burada birikir
              </div>
            ) : (
              <>
                {/* TOPLAM ROLLUP */}
                <section
                  className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 reveal"
                  style={{ animationDelay: "40ms" }}
                >
                  <StatCard
                    label="TOPLAM MALİYET"
                    value={`$ ${fmtUsd(data.totals.costUsd)}`}
                    accent="var(--color-signal-amber)"
                  />
                  <StatCard
                    label="GİRDİ TOKEN"
                    value={fmtTokens(data.totals.inputTokens)}
                  />
                  <StatCard
                    label="ÇIKTI TOKEN"
                    value={fmtTokens(data.totals.outputTokens)}
                  />
                  <StatCard
                    label="CACHE OKUMA"
                    value={fmtTokens(data.totals.cacheReadTokens)}
                  />
                  <StatCard
                    label="WORKER · TURN"
                    value={`${data.totals.workers} · ${data.totals.turns}`}
                  />
                </section>

                {/* MODEL KATMANI */}
                <section
                  className="reveal"
                  style={{ animationDelay: "100ms" }}
                >
                  <SectionTitle hint="ucuz katmana kaydıkça maliyet düşer">
                    ▣ MODEL KATMANI
                  </SectionTitle>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {data.byTier.map((t) => (
                      <TierCard
                        key={t.tier}
                        tier={t}
                        totalTokens={totalTokens}
                      />
                    ))}
                  </div>
                </section>

                {/* WORKER BAŞINA */}
                <section
                  className="reveal"
                  style={{ animationDelay: "160ms" }}
                >
                  <SectionTitle
                    hint={`${workers.length} worker · maliyete göre sıralı`}
                  >
                    ▤ WORKER BAŞINA
                  </SectionTitle>
                  <div className="panel-inner">
                    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60">
                      <span className="label-tac-sm text-[color:var(--color-fg-disabled)] flex-1">
                        WORKER
                      </span>
                      <ColHead className="w-[92px]">ROLE</ColHead>
                      <ColHead className="w-[62px]">TIER</ColHead>
                      <ColHead className="w-[64px]">STATUS</ColHead>
                      <ColHead className="w-[52px] text-right">TURN</ColHead>
                      <ColHead className="w-[88px] text-right">TOKEN</ColHead>
                      <ColHead className="w-[92px] text-right">COST</ColHead>
                    </div>
                    <div className="divide-y divide-[color:var(--color-border)]">
                      {workers.map((w) => (
                        <WorkerRow key={w.workerId} w={w} />
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-3 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3005/usage</span>
          <span>·</span>
          <span>USAGE &amp; COST</span>
          {data && (
            <>
              <span>·</span>
              <span>{fmtTokens(totalTokens)} token toplam</span>
            </>
          )}
          <span className="ml-auto" />
          <span>
            {data ? `son güncelleme ${fmtClock(data.generatedAt)} · 15s` : "—"}
          </span>
        </footer>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="panel-inner p-3 flex flex-col gap-1.5">
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        {label}
      </span>
      <span
        className="text-[22px] leading-none glow-soft"
        style={{ color: accent ?? "var(--color-fg)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="label-tac text-[color:var(--color-signal-amber)]">
        {children}
      </span>
      {hint && (
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {hint}
        </span>
      )}
    </div>
  );
}

function ColHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function TierCard({
  tier,
  totalTokens,
}: {
  tier: TierUsage;
  totalTokens: number;
}) {
  const meta = TIER_META[tier.tier];
  const tok = tierTokens(tier);
  const share = totalTokens > 0 ? (tok / totalTokens) * 100 : 0;
  return (
    <div className="panel-inner p-3 relative overflow-hidden">
      <span
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: meta.color }}
      />
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="label-tac glow-soft" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {tier.workers} worker
        </span>
      </div>
      <div
        className="text-[20px] leading-none mb-2"
        style={{ color: meta.color }}
      >
        $ {fmtUsd(tier.costUsd)}
      </div>
      {/* token payı barı */}
      <div
        className="h-[3px] bg-[color:var(--color-bg-input)] mb-2"
        title={`token payı %${share.toFixed(0)}`}
      >
        <div
          className="h-full"
          style={{
            width: `${share}%`,
            background: meta.color,
            opacity: 0.7,
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <TokStat label="IN" value={tier.inputTokens} />
        <TokStat label="OUT" value={tier.outputTokens} />
        <TokStat label="CACHE R" value={tier.cacheReadTokens} />
        <TokStat label="CACHE W" value={tier.cacheWriteTokens} />
      </div>
    </div>
  );
}

function TokStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        {label}
      </span>
      <span className="text-[11px] text-[color:var(--color-fg-dim)]">
        {fmtTokens(value)}
      </span>
    </div>
  );
}

function WorkerRow({ w }: { w: WorkerUsage }) {
  const meta = TIER_META[w.tier];
  const roleAccent = ROLE_ACCENT_VAR[w.role] ?? "var(--color-fg-secondary)";
  const statusColor = STATUS_TONE[w.status] ?? "var(--color-fg-dim)";
  const tok = workerTokens(w);
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 px-3 py-2 hover:bg-[color:var(--color-bg-elevated)]/40 transition-colors">
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-[color:var(--color-fg)]"
        title={w.workerId}
      >
        {w.name}
      </span>
      <span
        className="w-[92px] shrink-0 label-tac-sm truncate"
        style={{ color: roleAccent }}
      >
        {w.role.toUpperCase()}
      </span>
      <span
        className="w-[62px] shrink-0 label-tac-sm"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
      <span
        className="w-[64px] shrink-0 label-tac-sm"
        style={{ color: statusColor }}
      >
        {w.status.toUpperCase()}
      </span>
      <span className="w-[52px] shrink-0 text-[11px] text-[color:var(--color-fg-dim)] md:text-right">
        {w.turns}
      </span>
      <span
        className="w-[88px] shrink-0 text-[11px] text-[color:var(--color-fg-secondary)] md:text-right"
        title={`in ${fmtTokens(w.inputTokens)} · out ${fmtTokens(
          w.outputTokens,
        )} · cache r ${fmtTokens(w.cacheReadTokens)} · cache w ${fmtTokens(
          w.cacheWriteTokens,
        )}`}
      >
        {fmtTokens(tok)}
      </span>
      <span className="w-[92px] shrink-0 text-[12px] text-[color:var(--color-signal-amber)] md:text-right">
        $ {fmtUsd(w.costUsd)}
      </span>
    </div>
  );
}
