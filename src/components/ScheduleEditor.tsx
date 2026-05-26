"use client";

import { useCallback, useEffect, useState } from "react";

interface Job {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  kind: string;
  payload: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  createdAt: string;
}

const COMMON_CRONS = [
  { label: "Her gece 02:00", cron: "0 2 * * *" },
  { label: "Her saat", cron: "0 * * * *" },
  { label: "Her 30 dk", cron: "*/30 * * * *" },
  { label: "Haftalık Pzt 09:00", cron: "0 9 * * 1" },
];

export function ScheduleEditor() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 2 * * *");
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"lead-message" | "create-task" | "scan-repo">(
    "lead-message",
  );
  const [payloadJson, setPayloadJson] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: Job[] };
      setJobs(data.jobs ?? []);
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as { type?: string };
        if (data.type?.startsWith("schedule.")) void load();
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [load]);

  const save = async () => {
    if (!name.trim() || !cron.trim() || !prompt.trim()) return;
    let payload: Record<string, unknown> | null = null;
    if (payloadJson.trim()) {
      try {
        payload = JSON.parse(payloadJson) as Record<string, unknown>;
      } catch {
        alert("Payload geçerli JSON değil");
        return;
      }
    }
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        cron: cron.trim(),
        prompt: prompt.trim(),
        kind,
        payload,
        enabled: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Kaydedilemedi: ${err.error ?? res.status}`);
      return;
    }
    setName("");
    setCron("0 2 * * *");
    setPrompt("");
    setPayloadJson("");
    setShowForm(false);
    void load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Bu zamanlanmış işi silmek istediğinden emin misin?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 flex flex-col min-h-0 max-h-[40vh]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
        <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft">
          ▸ schedule
        </span>
        <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
          {jobs.length}
        </span>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="label-tac-sm border border-[color:var(--color-signal-amber)] px-2 py-0.5 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)]/10"
        >
          ⊕ NEW
        </button>
      </div>

      {showForm && (
        <div className="border-b border-[color:var(--color-border)] p-2 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="İsim (örn: nightly-typecheck)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 outline-none focus:border-[color:var(--color-border-bright)]"
            />
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "lead-message" | "create-task" | "scan-repo")
              }
              className="bg-[color:var(--color-bg-panel)] border border-[color:var(--color-border)] px-2 py-1 outline-none"
            >
              <option value="lead-message">lead-message</option>
              <option value="create-task">create-task</option>
              <option value="scan-repo">scan-repo</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <input
              placeholder="Cron ifadesi"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="flex-1 bg-transparent border border-[color:var(--color-border)] px-2 py-1 outline-none focus:border-[color:var(--color-border-bright)] font-mono"
            />
            <select
              onChange={(e) => e.target.value && setCron(e.target.value)}
              className="bg-[color:var(--color-bg-panel)] border border-[color:var(--color-border)] px-2 py-1 outline-none"
              value=""
            >
              <option value="">presets...</option>
              {COMMON_CRONS.map((c) => (
                <option key={c.cron} value={c.cron}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Prompt / mesaj"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 outline-none focus:border-[color:var(--color-border-bright)] resize-none"
          />
          {(kind === "create-task" || kind === "scan-repo") && (
            <input
              placeholder={
                kind === "scan-repo"
                  ? `payload: {"repo":"/path/to/repo"}`
                  : `payload: {"title":"...","priority":3}`
              }
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="bg-transparent border border-[color:var(--color-border)] px-2 py-1 outline-none focus:border-[color:var(--color-border-bright)] font-mono"
            />
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg-secondary)]"
            >
              cancel
            </button>
            <button
              onClick={save}
              className="label-tac-sm border border-[color:var(--color-signal-green)] px-3 py-0.5 text-[color:var(--color-signal-green)] hover:bg-[color:var(--color-signal-green)]/10"
            >
              ✓ KAYDET
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="label-tac-sm text-[color:var(--color-fg-disabled)] p-3 text-center">
            ▸ zamanlanmış iş yok
          </div>
        ) : (
          jobs.map((j) => (
            <div
              key={j.id}
              className="border-b border-[color:var(--color-border)]/40 px-3 py-2 hover:bg-[color:var(--color-bg-panel)]/40"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(j.id, !j.enabled)}
                  className={`label-tac-sm border px-1.5 py-0 ${
                    j.enabled
                      ? "border-[color:var(--color-signal-green)] text-[color:var(--color-signal-green)]"
                      : "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]"
                  }`}
                >
                  {j.enabled ? "ON" : "off"}
                </button>
                <span className="text-[color:var(--color-fg-primary)]">{j.name}</span>
                <span className="label-tac-sm text-[color:var(--color-fg-dim)] font-mono">
                  {j.cron}
                </span>
                <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                  {j.kind}
                </span>
                <span className="ml-auto" />
                <button
                  onClick={() => del(j.id)}
                  className="label-tac-sm text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)]"
                >
                  ✕
                </button>
              </div>
              <div className="label-tac-sm text-[color:var(--color-fg-dim)] line-clamp-1 mt-0.5">
                {j.prompt}
              </div>
              {j.lastError && (
                <div className="label-tac-sm text-[color:var(--color-signal-red)] line-clamp-1 mt-0.5">
                  ! {j.lastError}
                </div>
              )}
              {j.lastRunAt && !j.lastError && (
                <div className="label-tac-sm text-[color:var(--color-fg-disabled)] mt-0.5">
                  son koşu: {new Date(j.lastRunAt).toLocaleString("tr-TR")}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
