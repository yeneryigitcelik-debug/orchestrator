"use client";

import { useEffect, useRef, useState } from "react";
import { MessageView } from "./MessageView";

type Event = { type: string; [k: string]: unknown };

export interface LeadSnapshot {
  id: string;
  name: string;
  role: string;
  model: string;
  cwd: string;
  status: string;
  goal: string | null;
  iteration: number;
  autonomous: boolean;
}

/**
 * Lead'in transcript-only görünümü. Composer dışarda (TransmissionBar).
 * Tab seçili olduğunda full-height pane içerisinde gösterilir.
 */
export function LeadChat({
  lead,
  onStatusChange,
}: {
  lead: LeadSnapshot;
  onStatusChange?: (status: string) => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/workers/${lead.id}/stream`);
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as Event;
        setEvents((prev) => [...prev, ev]);
        if (ev.type === "_local_status" && onStatusChange) {
          onStatusChange(String(ev.status ?? lead.status));
        }
      } catch {}
    };
    return () => es.close();
  }, [lead.id, lead.status, onStatusChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-6 py-5 min-h-0"
    >
      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-1 max-w-[1200px] mx-auto">
          {events.map((ev, i) => (
            <MessageView key={i} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12 reveal">
      <div className="brand-display text-[48px] text-[color:var(--color-signal-amber)]/80 tracking-widest">
        ▶ STAND BY
      </div>
      <div className="label-tac text-[color:var(--color-fg-secondary)]">
        Lead online — awaiting directive
      </div>
      <div className="text-[13px] text-[color:var(--color-fg-dim)] max-w-md mt-4 leading-relaxed">
        Aşağıdaki transmission alanına ürün/feature seviyesinde bir görev yaz.
        Örnek:{" "}
        <span className="text-[color:var(--color-fg-secondary)]">
          "Next.js portfolyo sitesi kur ve Vercel'e deploy et"
        </span>
        . Lead plan yapar, gerekirse helper spawn eder, sonucu raporlar.
      </div>
    </div>
  );
}
