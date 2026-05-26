"use client";

import { useCallback, useEffect, useState } from "react";
import { BacklogPanel } from "./BacklogPanel";
import { ThoughtsLog } from "./ThoughtsLog";
import { PendingQuestions } from "./PendingQuestions";
import { ScheduleEditor } from "./ScheduleEditor";
import { SummaryCard } from "./SummaryCard";

interface AutonomousConfig {
  autonomousMode: boolean;
  maxIterations: number;
  checkpointEvery: number;
  ideationCooldownMs: number;
  tickIntervalMs: number;
  currentRunId: string | null;
}

interface AutonomousRun {
  id: string;
  startedAt: string;
  endedAt: string | null;
  iterations: number;
  tasksCompleted: number;
  checkpointsHit: number;
  terminatedReason: string | null;
  summary: string | null;
  triggeredBy: string;
}

interface ControllerState {
  paused: boolean;
  pauseReason: string | null;
  pausedSince: number | null;
  driftStreak: number;
  lastTickSentAt: number;
  booted: boolean;
  timerActive: boolean;
}

interface StatusPayload {
  config: AutonomousConfig;
  currentRun: AutonomousRun | null;
  controller: ControllerState;
}

export function AutonomousPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/autonomous", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StatusPayload;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  // SSE: autonomous topic — config/run/control değişikliklerini canlı al
  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = () => {
      void refresh();
    };
    return () => es.close();
  }, [refresh]);

  const post = async (path: string, body?: unknown) => {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    }
  };

  const patchConfig = async (patch: Partial<AutonomousConfig>) => {
    try {
      const res = await fetch("/api/autonomous/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Config güncellenemedi");
    }
  };

  const cfg = status?.config;
  const run = status?.currentRun;
  const ctrl = status?.controller;
  const mode = cfg?.autonomousMode ? "ON" : "off";
  const paused = ctrl?.paused;

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <header className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/75 backdrop-blur shrink-0">
        <a
          href="/"
          className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)]"
        >
          ◂ MISSION GRID
        </a>
        <span className="text-[color:var(--color-fg-disabled)]">/</span>
        <span className="brand-display text-[18px] text-[color:var(--color-signal-amber)] glow-soft">
          AUTONOMOUS
        </span>
        <span className="ml-auto" />
        <span
          className={`label-tac-sm border px-2 py-0.5 ${
            cfg?.autonomousMode
              ? "border-[color:var(--color-signal-green)] text-[color:var(--color-signal-green)]"
              : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)]"
          }`}
        >
          MODE :: {mode}
        </span>
        {paused && (
          <span className="label-tac-sm border border-[color:var(--color-signal-amber)] px-2 py-0.5 text-[color:var(--color-signal-amber)]">
            PAUSED :: {ctrl?.pauseReason ?? ""}
          </span>
        )}
        {run && (
          <span className="label-tac-sm border border-[color:var(--color-border)] px-2 py-0.5 text-[color:var(--color-fg-secondary)]">
            ITER {run.iterations}/{cfg?.maxIterations ?? "—"}
          </span>
        )}
      </header>

      {error && (
        <div className="border-b border-[color:var(--color-signal-red)] px-4 py-2 bg-[color:var(--color-signal-red)]/10 text-[color:var(--color-signal-red)] label-tac-sm">
          ! {error}
        </div>
      )}

      <PendingQuestions onAnswered={() => void refresh()} />

      <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-4 overflow-y-auto">
        {/* ÜST: Summary (12 sütun) */}
        <section className="col-span-12">
          <SummaryCard />
        </section>

        {/* SOL: Backlog + Schedule */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-0">
          <BacklogPanel />
          <ScheduleEditor />
        </section>

        {/* SAĞ: Controls + Thoughts */}
        <aside className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0">
          <ControlsCard
            cfg={cfg}
            run={run}
            paused={!!paused}
            onStart={() => post("/api/autonomous/start")}
            onStop={() => post("/api/autonomous/stop")}
            onPause={() => post("/api/autonomous/pause")}
            onResume={() => post("/api/autonomous/resume")}
            onCheckpoint={() =>
              post("/api/autonomous/checkpoint", {
                summary: "Kullanıcı manuel checkpoint istedi.",
              })
            }
            onConfigChange={patchConfig}
          />
          <ThoughtsLog />
        </aside>
      </main>
    </div>
  );
}

function ControlsCard({
  cfg,
  run,
  paused,
  onStart,
  onStop,
  onPause,
  onResume,
  onCheckpoint,
  onConfigChange,
}: {
  cfg: AutonomousConfig | undefined;
  run: AutonomousRun | null | undefined;
  paused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCheckpoint: () => void;
  onConfigChange: (patch: Partial<AutonomousConfig>) => void;
}) {
  const live = cfg?.autonomousMode && !paused;
  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 p-3">
      <div className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft mb-2">
        ▸ controls
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {!cfg?.autonomousMode ? (
          <button
            onClick={onStart}
            className="label-tac-sm border border-[color:var(--color-signal-green)] bg-[color:var(--color-signal-green)]/10 px-3 py-1 text-[color:var(--color-signal-green)] hover:bg-[color:var(--color-signal-green)] hover:text-[color:var(--color-bg-deep)]"
          >
            ▶ START
          </button>
        ) : (
          <button
            onClick={onStop}
            className="label-tac-sm border border-[color:var(--color-signal-red)] bg-[color:var(--color-signal-red)]/10 px-3 py-1 text-[color:var(--color-signal-red)] hover:bg-[color:var(--color-signal-red)] hover:text-[color:var(--color-bg-deep)]"
          >
            ⏹ STOP
          </button>
        )}
        {paused ? (
          <button
            onClick={onResume}
            disabled={!cfg?.autonomousMode}
            className="label-tac-sm border border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10 px-3 py-1 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)] hover:text-[color:var(--color-bg-deep)] disabled:opacity-30"
          >
            ▶ RESUME
          </button>
        ) : (
          <button
            onClick={onPause}
            disabled={!cfg?.autonomousMode}
            className="label-tac-sm border border-[color:var(--color-border)] px-3 py-1 text-[color:var(--color-fg-secondary)] hover:border-[color:var(--color-border-bright)] disabled:opacity-30"
          >
            ⏸ PAUSE
          </button>
        )}
        <button
          onClick={onCheckpoint}
          disabled={!cfg?.autonomousMode}
          className="label-tac-sm border border-[color:var(--color-border)] px-3 py-1 text-[color:var(--color-fg-secondary)] hover:border-[color:var(--color-border-bright)] disabled:opacity-30"
        >
          ◉ CHECKPOINT
        </button>
      </div>

      {run && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <Stat label="ITER" value={`${run.iterations}/${cfg?.maxIterations ?? "—"}`} live={!!live} />
          <Stat label="TASKS" value={String(run.tasksCompleted)} />
          <Stat label="CHECKS" value={String(run.checkpointsHit)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Max iter"
          value={cfg?.maxIterations ?? 50}
          min={1}
          max={1000}
          onChange={(v) => onConfigChange({ maxIterations: v })}
        />
        <NumberInput
          label="Checkpoint @"
          value={cfg?.checkpointEvery ?? 10}
          min={1}
          max={100}
          onChange={(v) => onConfigChange({ checkpointEvery: v })}
        />
        <NumberInput
          label="Tick (sn)"
          value={Math.round((cfg?.tickIntervalMs ?? 30000) / 1000)}
          min={5}
          max={600}
          onChange={(v) => onConfigChange({ tickIntervalMs: v * 1000 })}
        />
        <NumberInput
          label="Idle cool (sn)"
          value={Math.round((cfg?.ideationCooldownMs ?? 300000) / 1000)}
          min={1}
          max={3600}
          onChange={(v) => onConfigChange({ ideationCooldownMs: v * 1000 })}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="border border-[color:var(--color-border)] py-1">
      <div className="label-tac-sm text-[color:var(--color-fg-disabled)]">{label}</div>
      <div
        className={`text-lg ${
          live ? "text-[color:var(--color-signal-green)] glow-soft" : "text-[color:var(--color-fg-secondary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="flex flex-col gap-1">
      <span className="label-tac-sm text-[color:var(--color-fg-dim)]">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseInt(draft, 10);
          if (!Number.isNaN(n) && n >= min && n <= max && n !== value) {
            onChange(n);
          } else {
            setDraft(String(value));
          }
        }}
        className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 text-[color:var(--color-fg-primary)] focus:border-[color:var(--color-border-bright)] outline-none"
      />
    </label>
  );
}
