"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Event = { type: string; [k: string]: unknown };

interface RoleProgress {
  role: string;
  findings: number;
  done: boolean;
}

/**
 * Scan ilerleme izleyici — verilen scanId için /api/scan/[id]/stream
 * SSE'sini açar; per-rol durumu (running → N findings → done) ve genel
 * scan durumunu gösterir. _scan_done geldiğinde onDone() tetiklenir.
 */
export function ScanProgress({
  scanId,
  roles,
  onDone,
}: {
  scanId: string;
  roles: string[];
  onDone?: () => void;
}) {
  // Beklenen roller "running" olarak seed edilir.
  const [progress, setProgress] = useState<Map<string, RoleProgress>>(
    () =>
      new Map(
        roles.map((r) => [r, { role: r, findings: 0, done: false }]),
      ),
  );
  const [linked, setLinked] = useState(false);
  const [complete, setComplete] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // scanId değişince taze durumla başla
    setProgress(
      new Map(roles.map((r) => [r, { role: r, findings: 0, done: false }])),
    );
    setLinked(false);
    setComplete(false);

    const es = new EventSource(`/api/scan/${scanId}/stream`);
    es.onmessage = (m) => {
      let ev: Event;
      try {
        ev = JSON.parse(m.data) as Event;
      } catch {
        return;
      }
      if (ev.type === "_hello") {
        setLinked(true);
      } else if (ev.type === "_scan_progress") {
        const role = String(ev.role ?? "");
        const findings = Number(ev.findings ?? 0);
        setProgress((prev) => {
          const next = new Map(prev);
          next.set(role, { role, findings, done: true });
          return next;
        });
      } else if (ev.type === "_scan_done") {
        setComplete(true);
        es.close();
        onDoneRef.current?.();
      }
    };
    es.onerror = () => {
      /* heartbeat'ler hattı açık tutar — sessizce geç */
    };
    return () => es.close();
    // roles içerik olarak sabit; scanId değişimi tetikleyici
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  const items = [...progress.values()];
  const doneCount = items.filter((p) => p.done).length;
  const totalFindings = items.reduce((s, p) => s + p.findings, 0);
  const pct = items.length
    ? Math.round((doneCount / items.length) * 100)
    : 0;

  return (
    <div className="panel-inner p-3">
      {/* Üst durum satırı */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className={cn(
            "signal-dot",
            complete
              ? "text-[color:var(--color-signal-green)]"
              : "text-[color:var(--color-signal-cyan)] pulsing",
          )}
        />
        <span
          className={cn(
            "label-tac",
            complete
              ? "text-[color:var(--color-signal-green)]"
              : "text-[color:var(--color-signal-cyan)]",
          )}
        >
          {complete ? "✓ SCAN COMPLETE" : "◆ SCAN RUNNING"}
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {linked || complete ? "link up" : "linking…"}
        </span>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          {doneCount}/{items.length} roles · {totalFindings} findings
        </span>
      </div>

      {/* Genel ilerleme çubuğu */}
      <div className="h-[3px] bg-[color:var(--color-bg-input)] mb-3 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500",
            complete
              ? "bg-[color:var(--color-signal-green)]"
              : "bg-[color:var(--color-signal-cyan)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Per-rol satırları */}
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((p) => (
          <div
            key={p.role}
            className={cn(
              "flex items-center gap-2 border px-2.5 py-1.5",
              p.done
                ? "border-[color:var(--color-border-bright)] bg-[color:var(--color-bg-elevated)]/50"
                : "border-[color:var(--color-border)] bg-[color:var(--color-bg-input)]",
            )}
          >
            <span
              className={cn(
                "signal-dot",
                p.done
                  ? "text-[color:var(--color-signal-green)]"
                  : "text-[color:var(--color-signal-yellow)] pulsing",
              )}
            />
            <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
              {p.role}
            </span>
            <span className="ml-auto label-tac-sm">
              {p.done ? (
                <span
                  className={cn(
                    p.findings > 0
                      ? "text-[color:var(--color-signal-amber)]"
                      : "text-[color:var(--color-fg-dim)]",
                  )}
                >
                  {p.findings} found
                </span>
              ) : (
                <span className="text-[color:var(--color-signal-yellow)]">
                  scanning
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
