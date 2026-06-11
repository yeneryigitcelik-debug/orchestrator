"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { MessageView } from "./MessageView";
import { cn } from "@/lib/cn";

export interface WorkerSnapshot {
  id: string;
  name: string;
  role: string;
  model: string;
  cwd: string;
  sessionId: string;
  status: string;
  goal: string | null;
  iteration: number;
  autonomous: boolean;
  goalStartedAt?: string;
  lastMessageAt?: string;
  messageCount: number;
}

type Event = { type: string; [k: string]: unknown };

/** Konsol transcript'inde tutulan azami event — bellek tavanı. */
const MAX_EVENTS = 1000;

const ROLE_ACCENT: Record<string, string> = {
  backend: "text-[color:var(--color-signal-cyan)]",
  frontend: "text-[color:var(--color-signal-violet)]",
  db: "text-[color:var(--color-signal-yellow)]",
  devops: "text-[color:var(--color-signal-amber)]",
  qa: "text-[color:var(--color-signal-green)]",
  watcher: "text-[color:var(--color-fg-secondary)]",
  custom: "text-[color:var(--color-fg-secondary)]",
  security: "text-[color:var(--color-signal-red)]",
  performance: "text-[color:var(--color-signal-amber)]",
  database: "text-[color:var(--color-signal-yellow)]",
  api: "text-[color:var(--color-signal-cyan)]",
  infrastructure: "text-[color:var(--color-signal-amber)]",
  quality: "text-[color:var(--color-signal-green)]",
  ui: "text-[color:var(--color-signal-violet)]",
  ux: "text-[color:var(--color-signal-violet)]",
};

/**
 * Helper'ın tam konsolu — interaktif: mesaj yolla, goal ata/iptal et,
 * autonomous toggle, kill. Lead tarafından ya da UI'dan spawn edilmiş
 * her helper buradan yönetilir.
 */
export function WorkerPane({
  worker: initialWorker,
  onKilled,
  onUpdated,
}: {
  worker: WorkerSnapshot;
  onKilled: (id: string) => void;
  onUpdated: () => void;
}) {
  const [worker, setWorker] = useState(initialWorker);
  const [events, setEvents] = useState<Event[]>([]);
  const [input, setInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // İlk transcript geldiğinde bir kez dibe götür; sonra scroll position'a hiç dokunma.
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    setWorker(initialWorker);
  }, [initialWorker]);

  useEffect(() => {
    const es = new EventSource(`/api/workers/${worker.id}/stream`);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as Event;
        // _hello = (yeniden) bağlanıldı; sunucu geçmişi baştan yolluyor →
        // reset et ki reconnect'te transcript ikiye katlanmasın.
        if (ev.type === "_hello") {
          setEvents([ev]);
          return;
        }
        setEvents((prev) => [...prev, ev].slice(-MAX_EVENTS));
        if (ev.type === "_local_status") {
          setWorker((w) => ({ ...w, status: String(ev.status ?? w.status) }));
        } else if (ev.type === "_local_goal_changed") {
          setWorker((w) => ({
            ...w,
            goal: (ev.goal as string | null) ?? null,
            iteration: Number(ev.iteration ?? w.iteration),
          }));
        } else if (ev.type === "_local_auto_continue") {
          setWorker((w) => ({
            ...w,
            iteration: Number(ev.iteration ?? w.iteration),
          }));
        }
      } catch {}
    };
    return () => es.close();
  }, [worker.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || didInitialScrollRef.current || events.length === 0) return;
    el.scrollTop = el.scrollHeight;
    didInitialScrollRef.current = true;
  }, [events]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Mesaj iletilemedi: ${err.error ?? res.status}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const assignGoal = async () => {
    if (!goalInput.trim() || busy) return;
    const goal = goalInput.trim();
    setBusy(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}/goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Goal atanamadı: ${err.error ?? res.status}`);
      } else {
        setGoalInput("");
        setWorker((w) => ({ ...w, goal }));
        onUpdated();
      }
    } finally {
      setBusy(false);
    }
  };

  const clearGoal = async () => {
    try {
      await fetch(`/api/workers/${worker.id}/goal`, { method: "DELETE" });
      setWorker((w) => ({ ...w, goal: null }));
      onUpdated();
    } catch {
      /* ağ hatası — sonraki poll state'i düzeltir */
    }
  };

  const toggleAutonomous = async () => {
    const next = !worker.autonomous;
    setWorker((w) => ({ ...w, autonomous: next }));
    await fetch(`/api/workers/${worker.id}/autonomous`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    }).catch(() => {});
  };

  const kill = async () => {
    if (!confirm(`${worker.name} öldürülsün mü?`)) return;
    await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
    onKilled(worker.id);
  };

  const accent =
    ROLE_ACCENT[worker.role] ?? "text-[color:var(--color-fg-secondary)]";
  const sidShort = worker.sessionId ? worker.sessionId.slice(0, 8) : "—";

  return (
    <div className="flex-1 min-h-0 flex flex-col panel-inner overflow-hidden">
      {/* Konsol header */}
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60 shrink-0">
        <span className={cn("label-tac-sm glow-soft", accent)}>
          {worker.role.toUpperCase()}
        </span>
        <span className="text-[color:var(--color-fg-disabled)]">·</span>
        <span
          className="text-[12px] font-medium text-[color:var(--color-fg)] truncate"
          title={worker.name}
        >
          {worker.name}
        </span>
        <span className="ml-auto" />
        <button
          onClick={toggleAutonomous}
          title="Autonomous loop aç/kapat"
          className={cn(
            "label-tac-sm border px-1.5 py-0.5 transition-colors",
            worker.autonomous
              ? "border-[color:var(--color-signal-green)] text-[color:var(--color-signal-green)]"
              : "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]",
          )}
        >
          AUTO {worker.autonomous ? "◉" : "○"}
        </button>
        <StatusBadge status={worker.status} size="sm" />
        <button
          onClick={kill}
          className="text-[12px] text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)] transition-colors ml-0.5"
          title="Kill worker"
        >
          ✕
        </button>
      </header>

      {/* Meta satırı */}
      <div className="px-3 py-1 text-[10px] text-[color:var(--color-fg-dim)] border-b border-[color:var(--color-border)] flex items-center gap-2 shrink-0">
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {modelShort(worker.model)}
        </span>
        <span className="text-[color:var(--color-fg-disabled)]">·</span>
        <span className="truncate flex-1" title={worker.cwd}>
          {worker.cwd}
        </span>
        <span className="text-[color:var(--color-fg-disabled)]">·</span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          ssn {sidShort}
        </span>
      </div>

      {/* Goal şeridi — interaktif */}
      <div className="border-b border-[color:var(--color-border)] px-3 py-1.5 bg-[color:var(--color-bg-deep)]/40 shrink-0">
        {worker.goal ? (
          <div className="flex items-start gap-2">
            <span className="label-tac-sm text-[color:var(--color-signal-amber)] shrink-0 mt-0.5">
              ▶ GOAL
            </span>
            <span className="text-[11px] text-[color:var(--color-fg)] leading-snug line-clamp-2 flex-1">
              {worker.goal}
            </span>
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
              iter {worker.iteration}
            </span>
            <button
              onClick={clearGoal}
              className="label-tac-sm text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)] transition-colors shrink-0"
              title="Goal iptal"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
              ▸ DIRECTIVE
            </span>
            <input
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  assignGoal();
                }
              }}
              placeholder="// goal ata — worker otonom çalışmaya başlar"
              className="flex-1 bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-1 text-[11px] outline-none focus:border-[color:var(--color-signal-amber)]"
            />
            <button
              onClick={assignGoal}
              disabled={!goalInput.trim() || busy}
              className={cn(
                "label-tac-sm border px-2 py-1 transition-colors shrink-0",
                goalInput.trim() && !busy
                  ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)]"
                  : "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]",
              )}
            >
              ASSIGN
            </button>
          </div>
        )}
      </div>

      {/* Aktivite akışı */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 min-h-0 text-[12px]"
      >
        {events.length === 0 ? (
          <div className="text-[color:var(--color-fg-disabled)] text-[11px] label-tac-sm pt-2">
            ··· awaiting transmission
          </div>
        ) : (
          events.map((ev, i) => <MessageView key={i} event={ev} />)
        )}
      </div>

      {/* Composer — bu helper'a mesaj */}
      <div className="border-t border-[color:var(--color-border)] p-1.5 flex gap-1.5 bg-[color:var(--color-bg-elevated)]/30 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`// ${worker.name} → mesaj (Enter yolla · Shift+Enter newline)`}
          rows={2}
          className="flex-1 resize-none bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-1 text-[12px] outline-none focus:border-[color:var(--color-signal-amber)] [field-sizing:content] max-h-[30vh] overflow-auto"
        />
        <button
          onClick={send}
          disabled={!input.trim() || busy}
          className={cn(
            "px-3 label-tac-sm border transition-colors",
            busy || !input.trim()
              ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
              : "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)]",
          )}
        >
          {busy ? "···" : "▶"}
        </button>
      </div>
    </div>
  );
}

function modelShort(m: string): string {
  if (m.includes("fable")) return "FABLE";
  if (m.includes("opus")) return "OPUS";
  if (m.includes("sonnet")) return "SONNET";
  if (m.includes("haiku")) return "HAIKU";
  return m.slice(0, 10).toUpperCase();
}
