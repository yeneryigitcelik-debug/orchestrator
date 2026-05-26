"use client";

import { useCallback, useEffect, useState } from "react";

interface Question {
  id: string;
  question: string;
  choices: string[] | null;
  status: string;
  askedAt: string;
  workerId: string | null;
  taskId: string | null;
}

/**
 * Lead'in bekleyen sorularını üst banner olarak gösterir.
 * Cevap geldikten sonra onAnswered callback'i tetiklenir.
 */
export function PendingQuestions({ onAnswered }: { onAnswered?: () => void }) {
  const [pending, setPending] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/questions?pending=1", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { questions: Question[] };
      setPending(data.questions ?? []);
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/autonomous/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as { type?: string };
        if (data.type?.startsWith("question.")) void load();
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [load]);

  const answer = async (id: string, text: string) => {
    if (!text.trim()) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`/api/questions/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text.trim() }),
      });
      if (res.ok) {
        setDrafts((d) => ({ ...d, [id]: "" }));
        await load();
        onAnswered?.();
      }
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  if (pending.length === 0) return null;

  return (
    <div className="border-b-2 border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10 px-4 py-3">
      <div className="label-tac-sm text-[color:var(--color-signal-amber)] glow-soft mb-2">
        ❓ LEAD SANA SORU SORUYOR ({pending.length})
      </div>
      <div className="space-y-3 max-w-4xl">
        {pending.map((q) => (
          <div
            key={q.id}
            className="border border-[color:var(--color-signal-amber)]/60 bg-[color:var(--color-bg-panel)]/80 p-3"
          >
            <div className="text-[color:var(--color-fg-primary)] mb-2 whitespace-pre-wrap">
              {q.question}
            </div>
            {q.choices?.length ? (
              <div className="flex flex-wrap gap-2">
                {q.choices.map((c, i) => (
                  <button
                    key={i}
                    disabled={busy[q.id]}
                    onClick={() => answer(q.id, c)}
                    className="label-tac-sm border border-[color:var(--color-signal-amber)] px-3 py-1 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)] hover:text-[color:var(--color-bg-deep)] disabled:opacity-40"
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={drafts[q.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      answer(q.id, drafts[q.id] ?? "");
                    }
                  }}
                  disabled={busy[q.id]}
                  placeholder="Cevap..."
                  className="flex-1 bg-transparent border border-[color:var(--color-border)] px-2 py-1 text-[color:var(--color-fg-primary)] outline-none focus:border-[color:var(--color-signal-amber)]"
                />
                <button
                  onClick={() => answer(q.id, drafts[q.id] ?? "")}
                  disabled={busy[q.id] || !drafts[q.id]?.trim()}
                  className="label-tac-sm border border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10 px-3 py-1 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)] hover:text-[color:var(--color-bg-deep)] disabled:opacity-40"
                >
                  ⏎ SEND
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
