"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScanDiff, type DiffPayload } from "@/components/ScanDiff";
import { cn } from "@/lib/cn";

interface ScanSummary {
  id: string;
  repo: string;
  roles: string[];
  status: string;
  createdAt: string;
  total: number;
}

/**
 * Scan diff sayfası — iki tarama (head + base) seçilir, /api/scan/diff
 * çağrılır ve new/resolved/unchanged finding'ler gösterilir.
 */
export default function ScanDiffPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [head, setHead] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { scans?: ScanSummary[] } | null) => {
        const list = d?.scans ?? [];
        setScans(list);
        // varsayılan: en yeni → head, bir sonraki → base
        if (list[0]) setHead(list[0].id);
        if (list[1]) setBase(list[1].id);
      })
      .catch(() => setError("scan listesi alınamadı"));
  }, []);

  const runDiff = useCallback(async () => {
    if (!head || !base) return;
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const res = await fetch(
        `/api/scan/diff?head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      setDiff(data.diff as DiffPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "diff alınamadı");
    } finally {
      setLoading(false);
    }
  }, [head, base]);

  const ready = !!head && !!base && head !== base;

  return (
    <>
      <div className="scanline-top" />
      <div className="min-h-screen flex flex-col">
        {/* === HEADER === */}
        <header className="reveal flex items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/80 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="brand-display text-[20px] text-[color:var(--color-signal-amber)] leading-none tracking-wider">
              DISPLAYERALL
            </span>
            <span className="brand-cursor text-[20px] text-[color:var(--color-signal-amber)] leading-none">
              ▮
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-1">
            v0.1.0 :: SCAN DIFF
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
                ⇄ COMPARE SCANS
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                head ← yeni · base ← referans
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <ScanSelect
                label="HEAD"
                accent="amber"
                value={head}
                scans={scans}
                onChange={setHead}
              />
              <ScanSelect
                label="BASE"
                accent="cyan"
                value={base}
                scans={scans}
                onChange={setBase}
              />
            </div>

            {head && base && head === base && (
              <div className="mb-3 label-tac-sm text-[color:var(--color-signal-yellow)]">
                ▸ head ve base aynı — farklı taramalar seç
              </div>
            )}
            {error && (
              <div className="mb-3 border-l-2 border-[color:var(--color-signal-red)] pl-2.5 py-1 text-[11px] text-[color:var(--color-signal-red)]">
                <span className="label-tac-sm">✕ DIFF ERR</span>
                <span className="ml-2 text-[color:var(--color-fg)]">
                  {error}
                </span>
              </div>
            )}

            <button
              onClick={runDiff}
              disabled={!ready || loading}
              className={cn(
                "w-full px-4 py-2 label-tac border transition-all duration-150",
                !ready || loading
                  ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
                  : "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110",
              )}
            >
              {loading ? "··· comparing" : "⇄ RUN DIFF"}
            </button>
          </div>

          {/* Sonuç */}
          <div
            className="reveal"
            style={{ animationDelay: "120ms" }}
          >
            {loading && !diff ? (
              <div className="panel-inner p-6 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
                ··· computing delta
              </div>
            ) : diff ? (
              <ScanDiff diff={diff} />
            ) : (
              <div className="panel-inner brackets min-h-[280px] flex flex-col items-center justify-center text-center gap-3 py-12">
                <span className="br-tl" />
                <span className="br-bl" />
                <div className="brand-display text-[40px] text-[color:var(--color-signal-cyan)]/70 tracking-widest">
                  ⇄ PICK TWO
                </div>
                <div className="label-tac text-[color:var(--color-fg-secondary)]">
                  select head + base, then run diff
                </div>
              </div>
            )}
          </div>
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3000/scan/diff</span>
          <span>·</span>
          <span>SCAN DELTA</span>
          <span className="ml-auto" />
          <span>{scans.length} scans available</span>
        </footer>
      </div>
    </>
  );
}

function ScanSelect({
  label,
  accent,
  value,
  scans,
  onChange,
}: {
  label: string;
  accent: "amber" | "cyan";
  value: string | null;
  scans: ScanSummary[];
  onChange: (id: string) => void;
}) {
  const c =
    accent === "amber"
      ? "text-[color:var(--color-signal-amber)]"
      : "text-[color:var(--color-signal-cyan)]";
  return (
    <label className="block">
      <span className={cn("label-tac-sm block mb-1", c)}>▸ {label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors"
      >
        <option value="" disabled>
          — select scan —
        </option>
        {scans.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id.slice(0, 8)} · {s.total} findings · {s.repo}
          </option>
        ))}
      </select>
    </label>
  );
}
