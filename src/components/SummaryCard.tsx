"use client";

import { useCallback, useEffect, useState } from "react";

interface Summary {
  hours: number;
  since: string;
  now: string;
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    blocked: number;
    cancelled: number;
    completedTitles: string[];
    blockedTitles: string[];
  };
  thoughts: {
    total: number;
    byType: Record<string, number>;
    latestCheckpoints: { content: string; createdAt: string }[];
    latestDriftAlarms: { content: string; createdAt: string }[];
  };
  runs: {
    total: number;
    list: {
      id: string;
      startedAt: string;
      iterations: number;
      tasksCompleted: number;
      checkpointsHit: number;
      terminatedReason: string | null;
    }[];
  };
  scheduledJobsFired: number;
  questionsAsked: number;
  questionsAnswered: number;
}

export function SummaryCard() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<Summary | null>(null);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/autonomous/summary?hours=${hours}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { summary: Summary };
      setData(json.summary);
    } catch {
      /* yoksay */
    }
  }, [hours]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 p-3">
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          summary yükleniyor...
        </span>
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
        <button
          onClick={() => setOpen((o) => !o)}
          className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft"
        >
          {open ? "▾" : "▸"} summary · son {hours}h
        </button>
        <select
          value={hours}
          onChange={(e) => setHours(parseInt(e.target.value, 10))}
          className="bg-transparent border border-[color:var(--color-border)] px-1.5 py-0.5 label-tac-sm outline-none"
        >
          <option value="1">1 saat</option>
          <option value="6">6 saat</option>
          <option value="24">24 saat</option>
          <option value="72">3 gün</option>
          <option value="168">1 hafta</option>
        </select>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {new Date(data.now).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {open && (
        <div className="p-3 grid gap-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label="DONE" value={String(data.tasks.done)} accent="green" />
            <Stat label="PENDING" value={String(data.tasks.pending)} />
            <Stat label="BLOCKED" value={String(data.tasks.blocked)} accent={data.tasks.blocked > 0 ? "red" : "dim"} />
            <Stat label="RUNS" value={String(data.runs.total)} />
            <Stat
              label="Q ASKED"
              value={`${data.questionsAnswered}/${data.questionsAsked}`}
            />
          </div>
          {data.tasks.completedTitles.length > 0 && (
            <Section title="Tamamlanan task'lar">
              <ul className="list-disc pl-4 label-tac-sm text-[color:var(--color-fg-secondary)] space-y-0.5">
                {data.tasks.completedTitles.slice(0, 10).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
                {data.tasks.completedTitles.length > 10 && (
                  <li className="text-[color:var(--color-fg-disabled)]">
                    … {data.tasks.completedTitles.length - 10} tane daha
                  </li>
                )}
              </ul>
            </Section>
          )}
          {data.tasks.blockedTitles.length > 0 && (
            <Section title="Blocked task'lar">
              <ul className="list-disc pl-4 label-tac-sm text-[color:var(--color-signal-red)] space-y-0.5">
                {data.tasks.blockedTitles.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Section>
          )}
          {data.thoughts.latestCheckpoints.length > 0 && (
            <Section title="Son checkpoint'ler">
              {data.thoughts.latestCheckpoints.map((c, i) => (
                <div key={i} className="label-tac-sm text-[color:var(--color-fg-secondary)] mb-1.5">
                  <span className="text-[color:var(--color-fg-disabled)]">
                    {new Date(c.createdAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>{" "}
                  — {c.content}
                </div>
              ))}
            </Section>
          )}
          {data.thoughts.latestDriftAlarms.length > 0 && (
            <Section title="Drift uyarıları">
              {data.thoughts.latestDriftAlarms.map((c, i) => (
                <div key={i} className="label-tac-sm text-[color:var(--color-signal-red)] mb-1.5">
                  {c.content}
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "green" | "red" | "dim";
}) {
  const color =
    accent === "green"
      ? "text-[color:var(--color-signal-green)]"
      : accent === "red"
        ? "text-[color:var(--color-signal-red)]"
        : accent === "dim"
          ? "text-[color:var(--color-fg-disabled)]"
          : "text-[color:var(--color-fg-secondary)]";
  return (
    <div className="border border-[color:var(--color-border)] py-1 text-center">
      <div className="label-tac-sm text-[color:var(--color-fg-disabled)]">{label}</div>
      <div className={`text-lg ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-tac-sm text-[color:var(--color-phosphor)] mb-1">{title}</div>
      {children}
    </div>
  );
}
