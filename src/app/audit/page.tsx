"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: string;
}

/** action öneki → sinyal rengi (örn. "scan.start" → scan). */
function actionTone(action: string): string {
  const head = action.split(/[.:_/-]/)[0]?.toLowerCase() ?? "";
  if (/(delete|kill|fail|error|block|deny)/.test(action))
    return "text-[color:var(--color-signal-red)]";
  if (head === "scan" || head === "diff" || head === "drift")
    return "text-[color:var(--color-signal-cyan)]";
  if (head === "worker" || head === "lead" || head === "spawn")
    return "text-[color:var(--color-signal-violet)]";
  if (/(create|start|run|add)/.test(action))
    return "text-[color:var(--color-signal-green)]";
  return "text-[color:var(--color-signal-amber)]";
}

/**
 * Audit log sayfası — /api/audit olay kaydını listeler; action filtre
 * dropdown'u ile daraltılabilir. Tactical Ops Console estetiği.
 */
export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (action: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (action) qs.set("action", action);
      const res = await fetch(`/api/audit?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        setEvents([]);
        return;
      }
      setEvents((data.events ?? []) as AuditEvent[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "audit log alınamadı");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  // dropdown seçenekleri — yüklenen olaylardaki benzersiz action'lar
  const actions = useMemo(
    () => [...new Set(events.map((e) => e.action))].sort(),
    [events],
  );

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
            v0.1.0 :: AUDIT LOG
          </span>
          <span className="ml-auto" />
          <Link
            href="/scan"
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
          >
            ◈ SCAN
          </Link>
          <Link
            href="/"
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
          >
            ◂ ORCHESTRATOR
          </Link>
        </header>

        {/* === BODY === */}
        <main className="flex-1 min-h-0 flex flex-col gap-4 p-4 max-w-[1200px] w-full mx-auto">
          {/* Kontrol şeridi */}
          <div
            className="panel-inner p-3 reveal flex items-center gap-3 flex-wrap"
            style={{ animationDelay: "60ms" }}
          >
            <span className="label-tac text-[color:var(--color-signal-amber)]">
              ▤ EVENT LOG
            </span>
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
              {events.length} events
            </span>

            <span className="ml-auto" />

            <label className="flex items-center gap-2">
              <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
                ▸ ACTION
              </span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2.5 py-1 text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors"
              >
                <option value="">all actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => load(filter)}
              className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              ↻ REFRESH
            </button>
          </div>

          {/* Olay tablosu */}
          <div
            className="panel-inner reveal"
            style={{ animationDelay: "120ms" }}
          >
            {/* başlık satırı */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60">
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-[120px] shrink-0">
                TIMESTAMP
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-[110px] shrink-0">
                ACTOR
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-[140px] shrink-0">
                ACTION
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-[160px] shrink-0">
                TARGET
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)] flex-1">
                DETAIL
              </span>
            </div>

            {error ? (
              <div className="px-3 py-6 text-center label-tac-sm text-[color:var(--color-signal-red)]">
                ✕ {error}
              </div>
            ) : loading ? (
              <div className="px-3 py-6 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
                ··· loading events
              </div>
            ) : events.length === 0 ? (
              <div className="px-3 py-8 text-center label-tac-sm text-[color:var(--color-fg-disabled)]">
                ▸ no audit events
                {filter && ` for "${filter}"`}
              </div>
            ) : (
              <div className="divide-y divide-[color:var(--color-border)] max-h-[68vh] overflow-y-auto">
                {events.map((e) => (
                  <AuditRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3000/audit</span>
          <span>·</span>
          <span>ACTIVITY TRAIL</span>
          <span className="ml-auto" />
          <span>
            {filter ? `filtered :: ${filter}` : "unfiltered"}
          </span>
        </footer>
      </div>
    </>
  );
}

function AuditRow({ event: e }: { event: AuditEvent }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2 hover:bg-[color:var(--color-bg-elevated)]/40 transition-colors">
      {/* timestamp */}
      <span
        className="log-line w-[120px] shrink-0"
        title={e.createdAt}
      >
        {fmtTime(e.createdAt)}
      </span>

      {/* actor */}
      <span className="text-[11px] text-[color:var(--color-fg-secondary)] w-[110px] shrink-0 truncate">
        {e.actor}
      </span>

      {/* action */}
      <span className="w-[140px] shrink-0">
        <span
          className={cn(
            "label-tac-sm border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-1.5 py-0.5",
            actionTone(e.action),
          )}
        >
          {e.action}
        </span>
      </span>

      {/* target */}
      <span
        className="text-[11px] text-[color:var(--color-fg-dim)] w-[160px] shrink-0 truncate"
        title={e.target ?? ""}
      >
        {e.target ?? "—"}
      </span>

      {/* detail */}
      <span className="text-[12px] text-[color:var(--color-fg)] flex-1 min-w-0 break-words">
        {e.detail ?? (
          <span className="text-[color:var(--color-fg-disabled)]">—</span>
        )}
      </span>
    </div>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
