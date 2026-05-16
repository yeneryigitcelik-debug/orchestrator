"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScanLauncher } from "@/components/ScanLauncher";
import { ScanProgress } from "@/components/ScanProgress";
import {
  FindingsList,
  SeverityPill,
  type Finding,
} from "@/components/FindingsList";
import { cn } from "@/lib/cn";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

interface ScanSummary {
  id: string;
  repo: string;
  roles: string[];
  status: string;
  createdAt: string;
  finishedAt: string | null;
  total: number;
  bySeverity: Record<string, number>;
}

interface ScanDetail {
  id: string;
  repo: string;
  roles: string[];
  status: string;
  createdAt: string;
  finishedAt: string | null;
  findings: Finding[];
}

/**
 * Scan / Findings dashboard — launcher, son scan listesi ve seçili
 * scan'in canlı ilerlemesi + finding'leri. Tactical Ops Console estetiği.
 */
export default function ScanPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // --- son scan'leri çek ---
  const refreshScans = useCallback(async () => {
    try {
      const res = await fetch("/api/scan");
      if (!res.ok) return;
      const data = (await res.json()) as { scans: ScanSummary[] };
      setScans(data.scans ?? []);
    } catch {
      /* sessizce geç */
    }
  }, []);

  useEffect(() => {
    refreshScans();
  }, [refreshScans]);

  // running scan varsa periyodik refresh
  const hasRunning = useMemo(
    () => scans.some((s) => s.status === "running"),
    [scans],
  );
  useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(refreshScans, 4000);
    return () => clearInterval(t);
  }, [hasRunning, refreshScans]);

  // --- seçili scan detayını çek ---
  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/scan/${id}`);
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const data = (await res.json()) as { scan: ScanDetail };
      setDetail(data.scan);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // launcher → yeni scan başladı: seç + listeyi tazele
  const onLaunched = (scanId: string) => {
    setSelectedId(scanId);
    refreshScans();
  };

  // progress done → detay + liste tazele
  const onScanDone = useCallback(() => {
    refreshScans();
    if (selectedId) loadDetail(selectedId);
  }, [refreshScans, loadDetail, selectedId]);

  const selectedSummary = scans.find((s) => s.id === selectedId) ?? null;
  const detailRunning =
    (detail?.status ?? selectedSummary?.status) === "running";

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
            v0.1.0 :: SCAN
          </span>
          <span className="ml-auto" />
          <Link
            href="/"
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
          >
            ◂ ORCHESTRATOR
          </Link>
        </header>

        {/* === BODY === */}
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 max-w-[1500px] w-full mx-auto">
          {/* --- SOL KOLON: launcher + scan listesi --- */}
          <aside
            className="lg:w-[420px] shrink-0 space-y-4 reveal"
            style={{ animationDelay: "60ms" }}
          >
            <ScanLauncher onLaunched={onLaunched} />

            <div className="panel-inner">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60">
                <span className="label-tac text-[color:var(--color-signal-cyan)]">
                  ◆ RECENT SCANS
                </span>
                <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                  {scans.length}
                </span>
              </div>
              {scans.length === 0 ? (
                <div className="px-3 py-6 text-center label-tac-sm text-[color:var(--color-fg-disabled)]">
                  ▸ no scans yet — run one above
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--color-border)] max-h-[60vh] overflow-y-auto">
                  {scans.map((s) => (
                    <ScanRow
                      key={s.id}
                      scan={s}
                      active={s.id === selectedId}
                      onClick={() => setSelectedId(s.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* --- SAĞ KOLON: seçili scan --- */}
          <section
            className="flex-1 min-w-0 space-y-3 reveal"
            style={{ animationDelay: "120ms" }}
          >
            {!selectedId ? (
              <DetailEmpty />
            ) : (
              <>
                {/* Detay başlık şeridi */}
                <div className="panel-inner px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="label-tac text-[color:var(--color-signal-amber)]">
                      ▶ SCAN
                    </span>
                    <span className="text-[12px] text-[color:var(--color-fg)] font-medium">
                      {selectedId.slice(0, 8)}
                    </span>
                    <span className="ml-auto" />
                    {selectedSummary && (
                      <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
                        {selectedSummary.roles.length} roles ·{" "}
                        {selectedSummary.total} findings
                      </span>
                    )}
                  </div>
                  <div
                    className="log-line truncate"
                    title={detail?.repo ?? selectedSummary?.repo}
                  >
                    {detail?.repo ?? selectedSummary?.repo ?? "—"}
                  </div>
                </div>

                {/* Canlı ilerleme — yalnız running iken */}
                {detailRunning && (
                  <ScanProgress
                    scanId={selectedId}
                    roles={
                      detail?.roles ?? selectedSummary?.roles ?? []
                    }
                    onDone={onScanDone}
                  />
                )}

                {/* Finding'ler */}
                {loadingDetail && !detail ? (
                  <div className="panel-inner p-6 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
                    ··· loading findings
                  </div>
                ) : detail ? (
                  <FindingsList findings={detail.findings} />
                ) : (
                  <div className="panel-inner p-6 text-center label-tac-sm text-[color:var(--color-signal-red)]">
                    ✕ scan detail unavailable
                  </div>
                )}
              </>
            )}
          </section>
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3005/scan</span>
          <span>·</span>
          <span>REVIEW AJANSLARI :: 9 ROLES</span>
          <span className="ml-auto" />
          <span>{scans.length} scans logged</span>
        </footer>
      </div>
    </>
  );
}

function ScanRow({
  scan,
  active,
  onClick,
}: {
  scan: ScanSummary;
  active: boolean;
  onClick: () => void;
}) {
  const running = scan.status === "running";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 transition-colors block",
        active
          ? "bg-[color:var(--color-bg-deep)]"
          : "hover:bg-[color:var(--color-bg-elevated)]/40",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {active && (
          <span className="h-3 w-[2px] bg-[color:var(--color-signal-amber)] shrink-0" />
        )}
        <span
          className={cn(
            "signal-dot shrink-0",
            running
              ? "text-[color:var(--color-signal-cyan)] pulsing"
              : "text-[color:var(--color-signal-green)]",
          )}
        />
        <span
          className={cn(
            "label-tac-sm",
            running
              ? "text-[color:var(--color-signal-cyan)]"
              : "text-[color:var(--color-signal-green)]",
          )}
        >
          {running ? "running" : "done"}
        </span>
        <span className="text-[11px] text-[color:var(--color-fg-dim)]">
          {scan.id.slice(0, 8)}
        </span>
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {relTime(scan.createdAt)}
        </span>
      </div>
      <div
        className="text-[11px] text-[color:var(--color-fg-secondary)] truncate mb-1.5"
        title={scan.repo}
      >
        {scan.repo}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {SEVERITY_ORDER.map((sev) => (
          <SeverityPill
            key={sev}
            severity={sev}
            count={scan.bySeverity?.[sev] ?? 0}
          />
        ))}
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {scan.total} total
        </span>
      </div>
    </button>
  );
}

function DetailEmpty() {
  return (
    <div className="panel-inner brackets h-full min-h-[400px] flex flex-col items-center justify-center text-center gap-3 py-12">
      <span className="br-tl" />
      <span className="br-bl" />
      <div className="brand-display text-[44px] text-[color:var(--color-signal-cyan)]/70 tracking-widest">
        ▶ SELECT SCAN
      </div>
      <div className="label-tac text-[color:var(--color-fg-secondary)]">
        run a new scan or pick one from the log
      </div>
      <div className="text-[13px] text-[color:var(--color-fg-dim)] max-w-md mt-2 leading-relaxed">
        Review ajansları repo'yu paralel tarar — security, performance,
        database, api ve dahası. Bulgular severity ve agent'a göre buradan
        listelenir.
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
