"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DriftChart, type DriftPoint } from "@/components/DriftChart";
import { cn } from "@/lib/cn";

interface ScanSummary {
  id: string;
  repo: string;
  createdAt: string;
}

const DAY_OPTIONS = [7, 14, 30, 90] as const;

/**
 * Drift sayfası — bir repo + zaman penceresi seçilir, /api/scan/drift
 * çağrılır ve severity sayıları günlere göre SVG çoklu-çizgi grafikte.
 */
export default function ScanDriftPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [repo, setRepo] = useState("");
  const [days, setDays] = useState<number>(30);
  const [series, setSeries] = useState<DriftPoint[] | null>(null);
  const [shownRepo, setShownRepo] = useState("");
  const [shownDays, setShownDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { scans?: ScanSummary[] } | null) => {
        const list = d?.scans ?? [];
        setScans(list);
        if (list[0]) setRepo(list[0].repo);
      })
      .catch(() => setError("scan listesi alınamadı"));
  }, []);

  // benzersiz repo yolları — en yeni tarama en başta
  const repos = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of scans) {
      if (!seen.has(s.repo)) {
        seen.add(s.repo);
        out.push(s.repo);
      }
    }
    return out;
  }, [scans]);

  const runDrift = useCallback(async () => {
    const r = repo.trim();
    if (!r || loading) return;
    setLoading(true);
    setError(null);
    setSeries(null);
    try {
      const res = await fetch(
        `/api/scan/drift?repo=${encodeURIComponent(r)}&days=${days}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      setSeries((data.series ?? []) as DriftPoint[]);
      setShownRepo(data.repo ?? r);
      setShownDays(data.days ?? days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "drift alınamadı");
    } finally {
      setLoading(false);
    }
  }, [repo, days, loading]);

  return (
    <>
      <div className="scanline-top" />
      <div className="min-h-screen flex flex-col">
        {/* === HEADER === */}
        <header className="reveal flex items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/80 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="brand-display text-[20px] text-[color:var(--color-signal-amber)] leading-none tracking-wider">
              ORCHESTRATOR
            </span>
            <span className="brand-cursor text-[20px] text-[color:var(--color-signal-amber)] leading-none">
              ▮
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-1">
            v0.1.0 :: SCAN DRIFT
          </span>
          <span className="ml-auto" />
          <Link
            href="/scan"
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
          >
            ◂ SCAN
          </Link>
        </header>

        {/* === BODY === */}
        <main className="flex-1 min-h-0 flex flex-col gap-4 p-4 max-w-[1100px] w-full mx-auto">
          {/* Seçici */}
          <div
            className="panel-inner brackets p-4 reveal"
            style={{ animationDelay: "60ms" }}
          >
            <span className="br-tl" />
            <span className="br-bl" />
            <div className="flex items-center gap-2 mb-3">
              <span className="label-tac text-[color:var(--color-signal-amber)]">
                ▰ DRIFT TRACE
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                repo severity trendi
              </span>
            </div>

            <label className="block mb-3">
              <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block mb-1">
                ▸ TARGET REPO · mutlak yol
              </span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runDrift();
                }}
                list="drift-repos"
                placeholder="/Users/you/dev/proje"
                spellCheck={false}
                className="w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors"
              />
              <datalist id="drift-repos">
                {repos.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>

            {/* Pencere seçimi */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="label-tac-sm text-[color:var(--color-fg-secondary)] mr-1">
                ▸ WINDOW
              </span>
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "label-tac-sm border px-2 py-0.5 transition-colors",
                    days === d
                      ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)]"
                      : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:border-[color:var(--color-border-bright)] hover:text-[color:var(--color-fg-secondary)]",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-3 border-l-2 border-[color:var(--color-signal-red)] pl-2.5 py-1 text-[11px] text-[color:var(--color-signal-red)]">
                <span className="label-tac-sm">✕ DRIFT ERR</span>
                <span className="ml-2 text-[color:var(--color-fg)]">
                  {error}
                </span>
              </div>
            )}

            <button
              onClick={runDrift}
              disabled={!repo.trim() || loading}
              className={cn(
                "w-full px-4 py-2 label-tac border transition-all duration-150",
                !repo.trim() || loading
                  ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
                  : "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110",
              )}
            >
              {loading ? "··· tracing" : "▰ TRACE DRIFT"}
            </button>
          </div>

          {/* Sonuç */}
          <div className="reveal" style={{ animationDelay: "120ms" }}>
            {loading && !series ? (
              <div className="panel-inner p-6 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
                ··· plotting trend
              </div>
            ) : series ? (
              <DriftChart series={series} repo={shownRepo} days={shownDays} />
            ) : (
              <div className="panel-inner brackets min-h-[280px] flex flex-col items-center justify-center text-center gap-3 py-12">
                <span className="br-tl" />
                <span className="br-bl" />
                <div className="brand-display text-[40px] text-[color:var(--color-signal-cyan)]/70 tracking-widest">
                  ▰ PICK REPO
                </div>
                <div className="label-tac text-[color:var(--color-fg-secondary)]">
                  select a repo and trace its severity drift
                </div>
              </div>
            )}
          </div>
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3000/scan/drift</span>
          <span>·</span>
          <span>SEVERITY TREND</span>
          <span className="ml-auto" />
          <span>{repos.length} repos scanned</span>
        </footer>
      </div>
    </>
  );
}
