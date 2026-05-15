"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkerPane, type WorkerSnapshot } from "./WorkerPane";
import { LeadChat, type LeadSnapshot } from "./LeadChat";
import { TransmissionBar } from "./TransmissionBar";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/cn";

const ROLE_ACCENT: Record<string, string> = {
  lead: "text-[color:var(--color-signal-amber)]",
  backend: "text-[color:var(--color-signal-cyan)]",
  frontend: "text-[color:var(--color-signal-violet)]",
  db: "text-[color:var(--color-signal-yellow)]",
  devops: "text-[color:var(--color-signal-amber)]",
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
  const [activeTabId, setActiveTabId] = useState<string>(lead.id); // default: Lead

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
    // killed olan tab aktif idiyse Lead'e dön
    if (activeTabId === id) setActiveTabId(lead.id);
  };

  const stats = useMemo(() => {
    const live = helpers.filter((w) => w.status === "running" || w.status === "thinking").length;
    const crashed = helpers.filter((w) => w.status === "crashed").length;
    return { total: helpers.length, live, crashed };
  }, [helpers]);

  const activeHelper = helpers.find((w) => w.id === activeTabId);

  return (
    <>
      <div className="scanline-top" />
      <div className="h-screen flex flex-col">
        {/* === GLOBAL HEADER === */}
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
            v0.1.0 :: ORCHESTRATOR
          </span>
          <span className="ml-auto" />
          <nav className="flex items-stretch -space-x-px">
            <a
              href="/scan"
              className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              ◈ SCAN
            </a>
            <a
              href="/scan/diff"
              className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              ⇄ DIFF
            </a>
            <a
              href="/scan/drift"
              className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              ▰ DRIFT
            </a>
            <a
              href="/audit"
              className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              ▤ AUDIT
            </a>
          </nav>
          <Pill label="HELPERS" value={`${stats.live}/${stats.total}`} accent={stats.live > 0 ? "green" : "dim"} />
          {stats.crashed > 0 && (
            <Pill label="CRASH" value={String(stats.crashed)} accent="red" />
          )}
        </header>

        {/* === TAB BAR === */}
        <div
          className="flex items-stretch border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 overflow-x-auto shrink-0 reveal"
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
          {/* Trailing space + spawn hint */}
          <div className="ml-auto flex items-center px-3 label-tac-sm text-[color:var(--color-fg-disabled)] border-l border-[color:var(--color-border)]">
            {helpers.length === 0
              ? "no helpers — Lead spawn'lar"
              : `${helpers.length} helper · click to inspect`}
          </div>
        </div>

        {/* === ACTIVE PANE === */}
        <main
          className="flex-1 min-h-0 flex flex-col reveal"
          style={{ animationDelay: "120ms" }}
        >
          {activeTabId === lead.id ? (
            <LeadChat lead={lead} onStatusChange={setLeadStatus} />
          ) : activeHelper ? (
            <WorkerPane
              key={activeHelper.id}
              worker={activeHelper}
              onKilled={onKilled}
              onUpdated={refresh}
              readOnly
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[color:var(--color-fg-disabled)] label-tac">
              ▸ tab boş — helper kapatıldı
            </div>
          )}
        </main>

        {/* === TRANSMISSION BAR (her zaman Lead'e) === */}
        <div
          className="reveal shrink-0"
          style={{ animationDelay: "180ms" }}
        >
          <TransmissionBar leadId={lead.id} />
        </div>

        {/* === TELEMETRY === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3000</span>
          <span>·</span>
          <span>MAX :: claude.ai OAuth</span>
          <span>·</span>
          <span>active tab: {activeTabId === lead.id ? "LEAD" : (activeHelper?.name ?? "—")}</span>
          <span className="ml-auto" />
          {activeTabId !== lead.id && activeHelper && (
            <span className="text-[color:var(--color-fg-dim)]">
              {activeHelper.cwd}
            </span>
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
  const roleColor = ROLE_ACCENT[role] ?? "text-[color:var(--color-fg-secondary)]";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex items-center gap-2 px-4 py-2 border-r border-[color:var(--color-border)] min-w-[160px] max-w-[280px] transition-colors text-left",
        isActive
          ? "bg-[color:var(--color-bg-deep)]"
          : "hover:bg-[color:var(--color-bg-elevated)]/40 text-[color:var(--color-fg-secondary)]",
      )}
      title={`${role} :: ${id.slice(0, 8)}`}
    >
      {/* Active indicator line at bottom */}
      {isActive && (
        <span
          className={cn(
            "absolute left-0 right-0 bottom-0 h-[2px]",
            primary
              ? "bg-[color:var(--color-signal-amber)]"
              : "bg-[color:var(--color-signal-cyan)]",
          )}
        />
      )}

      {/* Role badge */}
      <span className={cn("label-tac-sm shrink-0", roleColor)}>
        {primary ? "LEAD" : role.toUpperCase()}
      </span>

      {/* Name */}
      {!primary && (
        <span
          className={cn(
            "text-[12px] truncate flex-1",
            isActive ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-secondary)]",
          )}
        >
          {name}
        </span>
      )}

      <span className="ml-auto" />

      {/* Iteration indicator */}
      {hasGoal && iteration !== undefined && iteration > 0 && (
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          ↻{iteration}
        </span>
      )}

      {/* Status badge */}
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
  accent: "amber" | "green" | "red" | "dim";
}) {
  const accentColor = {
    amber: "text-[color:var(--color-signal-amber)]",
    green: "text-[color:var(--color-signal-green)]",
    red: "text-[color:var(--color-signal-red)]",
    dim: "text-[color:var(--color-fg-dim)]",
  }[accent];
  return (
    <span className="inline-flex items-baseline gap-1.5 border border-[color:var(--color-border)] px-2 py-0.5">
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        {label}
      </span>
      <span className={`label-tac-sm ${accentColor}`}>{value}</span>
    </span>
  );
}
