"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkerPane, type WorkerSnapshot } from "./WorkerPane";
import { LeadChat, type LeadSnapshot } from "./LeadChat";
import { TransmissionBar } from "./TransmissionBar";
import { StatusBadge } from "./StatusBadge";
import { MatrixRain } from "./MatrixRain";
import { Roster } from "./Roster";
import { cn } from "@/lib/cn";

const ROSTER_TAB = "__roster__";

const ROLE_ACCENT: Record<string, string> = {
  lead: "text-[color:var(--color-phosphor)]",
  backend: "text-[color:var(--color-signal-cyan)]",
  frontend: "text-[color:var(--color-signal-violet)]",
  db: "text-[color:var(--color-signal-amber)]",
  devops: "text-[color:var(--color-phosphor)]",
  qa: "text-[color:var(--color-signal-green)]",
  watcher: "text-[color:var(--color-fg-secondary)]",
  custom: "text-[color:var(--color-fg-secondary)]",
};

export function Panel({
  lead,
  initialHelpers,
}: {
  lead: LeadSnapshot;
  initialHelpers: WorkerSnapshot[];
}) {
  const [helpers, setHelpers] = useState<WorkerSnapshot[]>(initialHelpers);
  const [leadStatus, setLeadStatus] = useState<string>(lead.status);
  const [activeTabId, setActiveTabId] = useState<string>(lead.id);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/workers");
    if (!res.ok) return;
    const data = (await res.json()) as { workers: WorkerSnapshot[] };
    setHelpers(data.workers.filter((w) => w.role !== "lead"));
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const onKilled = (id: string) => {
    setHelpers((ws) => ws.filter((w) => w.id !== id));
    if (activeTabId === id) setActiveTabId(lead.id);
  };

  const stats = useMemo(() => {
    const live = helpers.filter(
      (w) => w.status === "running" || w.status === "thinking",
    ).length;
    const crashed = helpers.filter((w) => w.status === "crashed").length;
    return { total: helpers.length, live, crashed };
  }, [helpers]);

  const activeHelper = helpers.find((w) => w.id === activeTabId);

  return (
    <>
      <MatrixRain />
      <div className="crt-vignette" />
      <div className="crt-scanlines" />

      <div className="h-screen flex flex-col relative z-10 crt-flicker">
        {/* === GLOBAL HEADER === */}
        <header className="reveal flex items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/85 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="brand-display text-[28px] leading-none text-[color:var(--color-phosphor)] glow-strong">
              DISPLAYERALL
            </span>
            <span className="brand-cursor text-[24px] leading-none text-[color:var(--color-phosphor)] glow">
              █
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-dim)] ml-1">
            ::builder.v0.1.0
          </span>
          <span className="ml-auto" />
          <Pill
            label="HELPERS"
            value={`${stats.live}/${stats.total}`}
            accent={stats.live > 0 ? "phosphor" : "dim"}
          />
          {stats.crashed > 0 && (
            <Pill label="CRASH" value={String(stats.crashed)} accent="red" />
          )}
        </header>

        {/* === TAB BAR === */}
        <div
          className="flex items-stretch border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/70 overflow-x-auto shrink-0 reveal"
          style={{ animationDelay: "60ms" }}
        >
          <Tab
            id={lead.id}
            isActive={activeTabId === lead.id}
            onClick={() => setActiveTabId(lead.id)}
            role="lead"
            name="LEAD"
            status={leadStatus}
            primary
          />
          <button
            onClick={() => setActiveTabId(ROSTER_TAB)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 border-r border-[color:var(--color-border)] transition-colors",
              activeTabId === ROSTER_TAB
                ? "bg-[color:var(--color-bg-deep)]"
                : "hover:bg-[color:var(--color-bg-elevated)]/50",
            )}
            title="Rol kataloğu + skill yönetimi"
          >
            {activeTabId === ROSTER_TAB && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[color:var(--color-phosphor)] shadow-[0_0_8px_var(--color-phosphor)]" />
            )}
            <span
              className={cn(
                "label-tac-sm",
                activeTabId === ROSTER_TAB
                  ? "text-[color:var(--color-phosphor)] glow-soft"
                  : "text-[color:var(--color-fg-secondary)]",
              )}
            >
              ◆ ROSTER
            </span>
          </button>
          {helpers.map((h) => (
            <Tab
              key={h.id}
              id={h.id}
              isActive={activeTabId === h.id}
              onClick={() => setActiveTabId(h.id)}
              role={h.role}
              name={h.name}
              status={h.status}
              iteration={h.iteration}
              hasGoal={!!h.goal}
            />
          ))}
          <div className="ml-auto flex items-center px-3 label-tac-sm text-[color:var(--color-fg-dim)] border-l border-[color:var(--color-border)]">
            {helpers.length === 0
              ? "no helpers — lead spawns"
              : `${helpers.length} node · click to inspect`}
          </div>
        </div>

        {/* === ACTIVE PANE === */}
        <main
          className="flex-1 min-h-0 flex flex-col reveal"
          style={{ animationDelay: "120ms" }}
        >
          {activeTabId === lead.id ? (
            <LeadChat lead={lead} onStatusChange={setLeadStatus} />
          ) : activeTabId === ROSTER_TAB ? (
            <Roster helpers={helpers} />
          ) : activeHelper ? (
            <WorkerPane
              key={activeHelper.id}
              worker={activeHelper}
              onKilled={onKilled}
              onUpdated={refresh}
              readOnly
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[color:var(--color-fg-dim)] label-tac">
              ▸ node offline
            </div>
          )}
        </main>

        {/* === TRANSMISSION BAR === */}
        <div className="reveal shrink-0" style={{ animationDelay: "180ms" }}>
          <TransmissionBar leadId={lead.id} />
        </div>

        {/* === TELEMETRY === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/85 flex items-center gap-3 label-tac-sm text-[color:var(--color-fg-dim)] shrink-0">
          <span className="text-[color:var(--color-phosphor)] glow-soft">●</span>
          <span>localhost:3000</span>
          <span>·</span>
          <span>max::claude.ai oauth</span>
          <span>·</span>
          <span>
            tab:{" "}
            {activeTabId === lead.id
              ? "lead"
              : activeTabId === ROSTER_TAB
                ? "roster"
                : (activeHelper?.name ?? "—")}
          </span>
          <span className="ml-auto" />
          {activeTabId !== lead.id && activeHelper && (
            <span>{activeHelper.cwd}</span>
          )}
        </footer>
      </div>
    </>
  );
}

function Tab({
  id,
  isActive,
  onClick,
  role,
  name,
  status,
  iteration,
  hasGoal,
  primary,
}: {
  id: string;
  isActive: boolean;
  onClick: () => void;
  role: string;
  name: string;
  status: string;
  iteration?: number;
  hasGoal?: boolean;
  primary?: boolean;
}) {
  const roleColor =
    ROLE_ACCENT[role] ?? "text-[color:var(--color-fg-secondary)]";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex items-center gap-2 px-4 py-2 border-r border-[color:var(--color-border)] min-w-[160px] max-w-[280px] transition-colors text-left",
        isActive
          ? "bg-[color:var(--color-bg-deep)]"
          : "hover:bg-[color:var(--color-bg-elevated)]/50 text-[color:var(--color-fg-secondary)]",
      )}
      title={`${role} :: ${id.slice(0, 8)}`}
    >
      {isActive && (
        <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[color:var(--color-phosphor)] shadow-[0_0_8px_var(--color-phosphor)]" />
      )}
      <span className={cn("label-tac-sm shrink-0", roleColor, isActive && "glow-soft")}>
        {primary ? "LEAD" : role.toUpperCase()}
      </span>
      {!primary && (
        <span
          className={cn(
            "text-[12px] truncate flex-1",
            isActive
              ? "text-[color:var(--color-fg)]"
              : "text-[color:var(--color-fg-secondary)]",
          )}
        >
          {name}
        </span>
      )}
      <span className="ml-auto" />
      {hasGoal && iteration !== undefined && iteration > 0 && (
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          ↻{iteration}
        </span>
      )}
      <StatusBadge status={status} size="sm" />
    </button>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "phosphor" | "red" | "dim";
}) {
  const accentColor = {
    phosphor: "text-[color:var(--color-phosphor)] glow-soft",
    red: "text-[color:var(--color-signal-red)]",
    dim: "text-[color:var(--color-fg-dim)]",
  }[accent];
  return (
    <span className="inline-flex items-baseline gap-1.5 border border-[color:var(--color-border)] px-2 py-0.5 bg-[color:var(--color-bg-deep)]/60">
      <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
        {label}
      </span>
      <span className={`label-tac-sm ${accentColor}`}>{value}</span>
    </span>
  );
}
