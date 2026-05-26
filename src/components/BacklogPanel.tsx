"use client";

import { useCallback, useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  source: string;
  cwd: string | null;
  goal: string | null;
  result: string | null;
  blockReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

type Filter = "pending" | "in_progress" | "done" | "all";

export function BacklogPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("5");

  const load = useCallback(async () => {
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/tasks${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(data.tasks ?? []);
    } catch {
      /* sessizce */
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  // SSE: task.* event'lerinde reload
  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as { type?: string };
        if (data.type?.startsWith("task.")) void load();
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [load]);

  const addTask = async () => {
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        priority: parseInt(priority, 10) || 5,
        source: "user",
      }),
    });
    setTitle("");
    setDescription("");
    setShowForm(false);
    void load();
  };

  const cancel = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
        <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft">▸ backlog</span>
        <div className="flex gap-1 ml-3">
          {(["pending", "in_progress", "done", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`label-tac-sm border px-2 py-0.5 ${
                filter === f
                  ? "border-[color:var(--color-signal-amber)] text-[color:var(--color-signal-amber)]"
                  : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg-secondary)]"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {tasks.length}
        </span>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="label-tac-sm border border-[color:var(--color-signal-amber)] px-2 py-0.5 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)]/10"
        >
          ⊕ ADD
        </button>
      </div>

      {showForm && (
        <div className="border-b border-[color:var(--color-border)] p-2 grid gap-2">
          <input
            placeholder="Task başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 text-[color:var(--color-fg-primary)] outline-none focus:border-[color:var(--color-border-bright)]"
          />
          <textarea
            placeholder="Detay (opsiyonel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 text-[color:var(--color-fg-primary)] outline-none focus:border-[color:var(--color-border-bright)] resize-none"
          />
          <div className="flex gap-2 items-center">
            <label className="label-tac-sm text-[color:var(--color-fg-dim)]">
              Priority
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 text-[color:var(--color-fg-primary)] outline-none w-16"
            />
            <span className="ml-auto" />
            <button
              onClick={() => setShowForm(false)}
              className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg-secondary)]"
            >
              cancel
            </button>
            <button
              onClick={addTask}
              className="label-tac-sm border border-[color:var(--color-signal-green)] px-3 py-0.5 text-[color:var(--color-signal-green)] hover:bg-[color:var(--color-signal-green)]/10"
            >
              ✓ EKLE
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="label-tac-sm text-[color:var(--color-fg-disabled)] p-3 text-center">
            ▸ task yok
          </div>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} onCancel={cancel} />)
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onCancel }: { task: Task; onCancel: (id: string) => void }) {
  const statusColor =
    task.status === "done"
      ? "text-[color:var(--color-fg-disabled)]"
      : task.status === "in_progress"
        ? "text-[color:var(--color-signal-green)]"
        : task.status === "blocked"
          ? "text-[color:var(--color-signal-red)]"
          : "text-[color:var(--color-fg-secondary)]";
  return (
    <div className="border-b border-[color:var(--color-border)]/40 px-3 py-2 hover:bg-[color:var(--color-bg-panel)]/40">
      <div className="flex items-start gap-2">
        <span className={`label-tac-sm ${statusColor} w-2 text-center`}>
          {task.status[0].toUpperCase()}
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-6">
          p{task.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[color:var(--color-fg-primary)]">{task.title}</div>
          {task.description && (
            <div className="label-tac-sm text-[color:var(--color-fg-dim)] mt-0.5 line-clamp-2">
              {task.description}
            </div>
          )}
          {task.blockReason && (
            <div className="label-tac-sm text-[color:var(--color-signal-red)] mt-0.5">
              blocked: {task.blockReason}
            </div>
          )}
          {task.result && task.status === "done" && (
            <div className="label-tac-sm text-[color:var(--color-fg-dim)] mt-0.5 line-clamp-2 italic">
              → {task.result}
            </div>
          )}
        </div>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          {task.source}
        </span>
        {task.status !== "done" && task.status !== "cancelled" && (
          <button
            onClick={() => onCancel(task.id)}
            className="label-tac-sm text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)]"
            title="iptal"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
