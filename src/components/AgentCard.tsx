"use client";

import type { WorkerSnapshot } from "./WorkerPane";
import type { FeedLine, FeedKind } from "@/lib/feed";
import { StatusBadge } from "./StatusBadge";
import { ROLE_ACCENT_VAR } from "@/lib/roles";
import { cn } from "@/lib/cn";

function modelShort(m: string): string {
  if (m.includes("opus")) return "OPUS";
  if (m.includes("sonnet")) return "SONNET";
  if (m.includes("haiku")) return "HAIKU";
  return m.slice(0, 8).toUpperCase();
}

const FEED_STYLE: Record<FeedKind, { glyph: string; color: string }> = {
  assistant: { glyph: "◆", color: "var(--color-signal-cyan)" },
  tool: { glyph: "⚙", color: "var(--color-signal-yellow)" },
  result: { glyph: "✓", color: "var(--color-signal-green)" },
  err: { glyph: "✕", color: "var(--color-signal-red)" },
  user: { glyph: "▸", color: "var(--color-signal-amber)" },
  goal: { glyph: "▶", color: "var(--color-signal-amber)" },
  iter: { glyph: "↻", color: "var(--color-fg-dim)" },
  sys: { glyph: "⚡", color: "var(--color-fg-dim)" },
};

/**
 * Mission-control grid hücresi — bir worker'ın anlık durumu + canlı feed.
 * Tıkla → tam konsol. Helper kartlarında ✕ ile doğrudan kapatılır (Lead hariç).
 */
export function AgentCard({
  snapshot,
  isLead = false,
  feed,
  onOpen,
  onKilled,
}: {
  snapshot: WorkerSnapshot;
  isLead?: boolean;
  feed?: FeedLine[];
  onOpen: () => void;
  /** Verilirse kartta ✕ kapat butonu görünür (Lead'e verilmez). */
  onKilled?: (id: string) => void;
}) {
  const accent = ROLE_ACCENT_VAR[snapshot.role] ?? "var(--color-fg-secondary)";
  const live =
    snapshot.status === "running" || snapshot.status === "thinking";
  const lines = (feed ?? []).slice(-5);

  const kill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${snapshot.name} worker'ı kapatılsın mı?`)) return;
    try {
      await fetch(`/api/workers/${snapshot.id}`, { method: "DELETE" });
    } catch {
      /* yine de UI'dan düş */
    }
    onKilled?.(snapshot.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "agent-card group relative flex flex-col text-left p-3 min-h-[236px] cursor-pointer",
        live && "agent-card-live",
      )}
      title={`${snapshot.role} :: ${snapshot.id.slice(0, 8)}`}
    >
      {/* Sol kenar rol aksanı */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: accent }}
      />

      {/* Üst satır: rol + status + kapat */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="label-tac-sm glow-soft" style={{ color: accent }}>
          {isLead ? "◆ LEAD" : snapshot.role.toUpperCase()}
        </span>
        {isLead && (
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] border border-[color:var(--color-border)] px-1">
            PRIMARY
          </span>
        )}
        <span className="ml-auto" />
        <StatusBadge status={snapshot.status} size="sm" />
        {!isLead && onKilled && (
          <button
            type="button"
            onClick={kill}
            title="Worker'ı kapat (subprocess SIGTERM)"
            className="text-[12px] leading-none text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)] transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* İsim */}
      <div
        className={cn(
          "truncate mb-1",
          isLead
            ? "brand-display text-[17px] text-[color:var(--color-signal-amber)]"
            : "text-[14px] text-[color:var(--color-fg)] font-medium",
        )}
      >
        {snapshot.name}
      </div>

      {/* Goal / direktif */}
      <div className="mb-2 min-h-[30px]">
        {snapshot.goal ? (
          <p className="text-[11px] text-[color:var(--color-fg-secondary)] leading-snug line-clamp-2">
            <span className="text-[color:var(--color-signal-amber)]">▶ </span>
            {snapshot.goal}
          </p>
        ) : (
          <p className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            ▸ no directive · idle
          </p>
        )}
      </div>

      {/* Canlı feed — agent çalışırken ne yapıyor */}
      <div className="flex-1 min-h-0 mb-2 border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/80 flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 shrink-0">
          <span
            className={cn("signal-dot", live && "pulsing")}
            style={{
              width: 5,
              height: 5,
              color: live
                ? "var(--color-signal-green)"
                : "var(--color-fg-disabled)",
            }}
          />
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            LIVE FEED
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col justify-end gap-[1px] px-2 pb-1.5 overflow-hidden">
          {lines.length === 0 ? (
            <div className="log-line text-[color:var(--color-fg-disabled)]">
              ··· awaiting activity
            </div>
          ) : (
            lines.map((l, i) => {
              const st = FEED_STYLE[l.kind];
              const last = i === lines.length - 1;
              return (
                <div
                  key={`${l.ts}-${i}`}
                  className="text-[10px] leading-[1.55] truncate"
                  style={{ color: st.color, opacity: last ? 1 : 0.5 }}
                >
                  {st.glyph} {l.text}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Alt telemetri */}
      <div className="flex items-center gap-2 pt-1.5 border-t border-[color:var(--color-border)] label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
        <span>{modelShort(snapshot.model)}</span>
        {snapshot.goal && (
          <>
            <span>·</span>
            <span className="text-[color:var(--color-fg-dim)]">
              ↻ {snapshot.iteration}
            </span>
          </>
        )}
        {snapshot.messageCount > 0 && (
          <>
            <span>·</span>
            <span className="text-[color:var(--color-fg-dim)]">
              ◇ {snapshot.messageCount}
            </span>
          </>
        )}
        <span className="ml-auto" />
        <span className="text-[color:var(--color-fg-dim)] group-hover:text-[color:var(--color-signal-amber)] transition-colors">
          OPEN ▸
        </span>
      </div>
    </div>
  );
}

/** Grid'in sonundaki "yeni helper spawn et" hücresi. */
export function SpawnCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="spawn-card group flex flex-col items-center justify-center gap-2 min-h-[236px] p-3"
    >
      <span className="text-[34px] leading-none text-[color:var(--color-border-bright)] group-hover:text-[color:var(--color-signal-amber)] transition-colors">
        ⊕
      </span>
      <span className="label-tac text-[color:var(--color-fg-dim)] group-hover:text-[color:var(--color-signal-amber)] transition-colors">
        NEW HELPER
      </span>
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        spawn worker subprocess
      </span>
    </button>
  );
}
