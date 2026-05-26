"use client";

import { useCallback, useEffect, useState } from "react";

interface Thought {
  id: string;
  content: string;
  type: string;
  workerId: string | null;
  taskId: string | null;
  runId: string | null;
  createdAt: string;
}

const TYPE_COLOR: Record<string, string> = {
  observation: "var(--color-fg-secondary)",
  idea: "var(--color-signal-amber)",
  question: "var(--color-phosphor)",
  decision: "var(--color-signal-green)",
  plan: "var(--color-signal-green)",
  checkpoint: "var(--color-signal-amber)",
  "drift-alarm": "var(--color-signal-red)",
  rationale: "var(--color-fg-dim)",
};

export function ThoughtsLog() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?type=${encodeURIComponent(filter)}&limit=50` : "?limit=50";
      const res = await fetch(`/api/thoughts${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { thoughts: Thought[] };
      setThoughts(data.thoughts ?? []);
    } catch {
      /* yoksay */
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  // SSE: thought.logged event'lerinde reload (basit)
  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as { type?: string };
        if (data.type === "thought.logged") void load();
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [load]);

  const TYPES = [
    "all",
    "rationale",
    "plan",
    "decision",
    "idea",
    "observation",
    "question",
    "checkpoint",
    "drift-alarm",
  ];

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[color:var(--color-border)] overflow-x-auto">
        <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft shrink-0">
          ▸ thoughts
        </span>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t === "all" ? "" : t)}
            className={`label-tac-sm border px-1.5 py-0.5 shrink-0 ${
              (t === "all" && filter === "") || filter === t
                ? "border-[color:var(--color-signal-amber)] text-[color:var(--color-signal-amber)]"
                : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg-secondary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {thoughts.length === 0 ? (
          <div className="label-tac-sm text-[color:var(--color-fg-disabled)] p-3 text-center">
            ▸ düşünce kaydı yok
          </div>
        ) : (
          thoughts.map((th) => (
            <div
              key={th.id}
              className="border-b border-[color:var(--color-border)]/40 px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="label-tac-sm shrink-0"
                  style={{ color: TYPE_COLOR[th.type] ?? "var(--color-fg-dim)" }}
                >
                  [{th.type}]
                </span>
                <span className="label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
                  {new Date(th.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="text-sm text-[color:var(--color-fg-primary)] whitespace-pre-wrap mt-0.5">
                {th.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
