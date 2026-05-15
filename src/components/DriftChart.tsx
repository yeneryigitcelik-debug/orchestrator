"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

/** /api/scan/drift series noktası. */
export interface DriftPoint {
  day: string;
  scanId: string;
  total: number;
  bySeverity: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    info?: number;
  };
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
type Severity = (typeof SEVERITIES)[number];

/** Severity → ham renk değeri (SVG stroke için CSS değişkeni). */
const SEV_COLOR: Record<Severity, string> = {
  critical: "var(--color-signal-red)",
  high: "var(--color-signal-amber)",
  medium: "var(--color-signal-yellow)",
  low: "var(--color-fg-dim)",
  info: "var(--color-signal-cyan)",
};
const SEV_TEXT: Record<Severity, string> = {
  critical: "text-[color:var(--color-signal-red)]",
  high: "text-[color:var(--color-signal-amber)]",
  medium: "text-[color:var(--color-signal-yellow)]",
  low: "text-[color:var(--color-fg-secondary)]",
  info: "text-[color:var(--color-signal-cyan)]",
};

const VW = 720;
const VH = 240;
const PAD = { t: 12, r: 12, b: 26, l: 30 };

/**
 * Drift grafiği — bir repo'nun severity sayılarının günlere göre
 * trendi. Kütüphanesiz, elle çizilmiş inline-SVG polyline'lar.
 */
export function DriftChart({
  series,
  repo,
  days,
}: {
  series: DriftPoint[];
  repo: string;
  days: number;
}) {
  // Görünür severity'ler — legend'dan kapatılabilir.
  const [hidden, setHidden] = useState<Set<Severity>>(new Set());

  const counts = useMemo(
    () =>
      series.map((p) => {
        const c = {} as Record<Severity, number>;
        for (const s of SEVERITIES) c[s] = p.bySeverity?.[s] ?? 0;
        return c;
      }),
    [series],
  );

  const maxY = useMemo(() => {
    let m = 1;
    counts.forEach((c, i) => {
      if (series[i] && hidden.size === SEVERITIES.length) return;
      for (const s of SEVERITIES) {
        if (!hidden.has(s)) m = Math.max(m, c[s]);
      }
    });
    return m;
  }, [counts, hidden, series]);

  if (series.length === 0) {
    return (
      <div className="panel-inner brackets min-h-[260px] flex flex-col items-center justify-center text-center gap-3 py-12">
        <span className="br-tl" />
        <span className="br-bl" />
        <div className="brand-display text-[36px] text-[color:var(--color-signal-cyan)]/70 tracking-widest">
          ▱ NO TREND
        </div>
        <div className="label-tac text-[color:var(--color-fg-secondary)]">
          no scans for this repo in window
        </div>
      </div>
    );
  }

  const innerW = VW - PAD.l - PAD.r;
  const innerH = VH - PAD.t - PAD.b;
  const n = series.length;
  const xAt = (i: number) =>
    PAD.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.t + innerH - (v / maxY) * innerH;

  // Y ekseni grid çizgileri (0, mid, max)
  const gridVals = [0, Math.round(maxY / 2), maxY].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div className="panel-inner p-3 space-y-3">
      {/* Üst satır */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="label-tac text-[color:var(--color-signal-amber)]">
          ▰ SEVERITY DRIFT
        </span>
        <span className="log-line truncate ml-1" title={repo}>
          {repo}
        </span>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {n} pts · {days}d window
        </span>
      </div>

      {/* Legend — tıklanabilir */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SEVERITIES.map((s) => {
          const on = !hidden.has(s);
          return (
            <button
              key={s}
              onClick={() =>
                setHidden((prev) => {
                  const next = new Set(prev);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  return next;
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 border px-1.5 py-0.5 transition-colors",
                on
                  ? "border-[color:var(--color-border-bright)] bg-[color:var(--color-bg-elevated)]"
                  : "border-[color:var(--color-border)] opacity-50 hover:opacity-100",
              )}
            >
              <span
                className="h-[2px] w-3 shrink-0"
                style={{ background: SEV_COLOR[s] }}
              />
              <span
                className={cn(
                  "label-tac-sm",
                  on ? SEV_TEXT[s] : "text-[color:var(--color-fg-disabled)]",
                )}
              >
                {s}
              </span>
            </button>
          );
        })}
      </div>

      {/* SVG grafik */}
      <div className="bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ minWidth: 480, display: "block" }}
          preserveAspectRatio="none"
        >
          {/* Y grid + etiket */}
          {gridVals.map((v) => (
            <g key={v}>
              <line
                x1={PAD.l}
                y1={yAt(v)}
                x2={VW - PAD.r}
                y2={yAt(v)}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 6}
                y={yAt(v) + 3}
                textAnchor="end"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fill="var(--color-fg-dim)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* X ekseni etiketleri — ilk, orta, son */}
          {[0, Math.floor((n - 1) / 2), n - 1]
            .filter((v, i, a) => a.indexOf(v) === i && series[v])
            .map((i) => (
              <text
                key={i}
                x={xAt(i)}
                y={VH - 8}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={9}
                fontFamily="var(--font-mono)"
                fill="var(--color-fg-dim)"
              >
                {series[i].day.slice(5)}
              </text>
            ))}

          {/* Severity polyline'ları */}
          {SEVERITIES.filter((s) => !hidden.has(s)).map((s) => {
            const pts = counts.map((c, i) => `${xAt(i)},${yAt(c[s])}`);
            return (
              <g key={s}>
                {n > 1 && (
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={SEV_COLOR[s]}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {counts.map((c, i) => (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(c[s])}
                    r={2.4}
                    fill={SEV_COLOR[s]}
                  >
                    <title>
                      {series[i].day} · {s}: {c[s]}
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Son nokta özeti */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="label-tac-sm text-[color:var(--color-fg-secondary)] mr-1">
          ▸ LATEST
        </span>
        {SEVERITIES.map((s) => (
          <span
            key={s}
            className="inline-flex items-baseline gap-1 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-1.5 py-0.5"
          >
            <span className={cn("label-tac-sm", SEV_TEXT[s])}>
              {s.slice(0, 4)}
            </span>
            <span className="label-tac-sm text-[color:var(--color-fg)]">
              {counts[n - 1]?.[s] ?? 0}
            </span>
          </span>
        ))}
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {series[n - 1]?.total ?? 0} total
        </span>
      </div>
    </div>
  );
}
