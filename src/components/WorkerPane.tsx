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

const ROLE_ACCENT: Record<string, string> = {
  backend: "text-[color:var(--color-signal-cyan)]",
  frontend: "text-[color:var(--color-signal-violet)]",
  db: "text-[color:var(--color-signal-amber)]",
  devops: "text-[color:var(--color-phosphor)]",
  qa: "text-[color:var(--color-signal-green)]",
  watcher: "text-[color:var(--color-fg-secondary)]",
  custom: "text-[color:var(--color-fg-secondary)]",
};

export function WorkerPane({
  worker: initialWorker,
  onKilled,
  onUpdated,
  readOnly = false,
}: {
  worker: WorkerSnapshot;
  onKilled: (id: string) => void;
  onUpdated: () => void;
  readOnly?: boolean;
}) {
  const [worker, setWorker] = useState(initialWorker);
  const [events, setEvents] = useState<Event[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorker(initialWorker);
  }, [initialWorker]);

  useEffect(() => {
    const es = new EventSource(`/api/workers/${worker.id}/stream`);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as Event;
        setEvents((prev) => [...prev, ev]);
        if (ev.type === "_local_status") {
          setWorker((w) => ({ ...w, status: String(ev.status ?? w.status) }));
        } else if (ev.type === "_local_goal_changed") {
          const g = ev.goal as string | null;
          setWorker((w) => ({
            ...w,
            goal: g,
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
    if (!el) return;
    el.scrollTop = el.scrollHeight;
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

  const kill = async () => {
    if (!confirm(`${worker.name} öldürülsün mü?`)) return;
    await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
    onKilled(worker.id);
  };

  const accent =
    ROLE_ACCENT[worker.role] ?? "text-[color:var(--color-fg-secondary)]";
  const sidShort = worker.sessionId.slice(0, 8);

  return (
    <div className="h-full flex flex-col bg-[color:var(--color-bg-deep)]/80 overflow-hidden">
      {/* Card header */}
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60">
        <span className={cn("label-tac-sm", accent)} title={`role: ${worker.role}`}>
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
        <StatusBadge status={worker.status} size="sm" />
        {readOnly ? (
          <span
            className="label-tac-sm text-[color:var(--color-fg-disabled)] border border-[color:var(--color-border)] px-1.5 py-0.5"
            title="Lead tarafından spawn — sadece izleme"
          >
            obs
          </span>
        ) : (
          <button
            onClick={kill}
            className="text-[12px] text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)] transition-colors ml-1"
            title="Kill"
          >
            ✕
          </button>
        )}
      </header>

      {/* Meta row */}
      <div className="px-3 py-1 text-[10px] text-[color:var(--color-fg-dim)] border-b border-[color:var(--color-border)] flex items-center gap-2">
        <span className="label-tac-sm">{modelShort(worker.model)}</span>
        <span className="text-[color:var(--color-fg-disabled)]">·</span>
        <span className="truncate flex-1" title={worker.cwd}>
          {worker.cwd}
        </span>
        <span className="text-[color:var(--color-fg-disabled)]">·</span>
        <span className="label-tac-sm">ssn {sidShort}</span>
      </div>

      {/* Goal strip */}
      {(worker.goal || !readOnly) && (
        <div className="border-b border-[color:var(--color-border)] px-3 py-1.5 bg-[color:var(--color-bg-deep)]/60">
          {worker.goal ? (
            <div className="flex items-start gap-2">
              <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft shrink-0 mt-0.5">
                ▶ goal
              </span>
              <span className="text-[11px] text-[color:var(--color-fg)] leading-snug line-clamp-2 flex-1">
                {worker.goal}
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-dim)] shrink-0">
                iter {worker.iteration}
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-[color:var(--color-fg-disabled)] label-tac-sm">
              ▸ no directive
            </div>
          )}
        </div>
      )}

      {/* Activity stream */}
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

      {/* Composer */}
      {!readOnly && (
        <div className="border-t border-[color:var(--color-border)] p-1.5 flex gap-1.5 bg-[color:var(--color-bg-elevated)]/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="// msg (Enter to send)"
            rows={2}
            className="flex-1 resize-none bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-1 text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-phosphor)]"
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy}
            className={cn(
              "px-2.5 label-tac-sm border transition-colors",
              busy || !input.trim()
                ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
                : "bg-[color:var(--color-phosphor)] text-[color:var(--color-bg-deep)] border-[color:var(--color-phosphor)]",
            )}
          >
            {busy ? "..." : "▶"}
          </button>
        </div>
      )}
    </div>
  );
}

function modelShort(m: string): string {
  if (m.includes("opus")) return "OPUS";
  if (m.includes("sonnet")) return "SONNET";
  if (m.includes("haiku")) return "HAIKU";
  return m.slice(0, 10).toUpperCase();
}
