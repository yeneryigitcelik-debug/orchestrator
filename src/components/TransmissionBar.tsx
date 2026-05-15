"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Sabit alt bar — her zaman Lead'e mesaj yollar.
 * Hangi tab açık olursa olsun bu komposer Lead chat'e gider.
 */
export function TransmissionBar({ leadId }: { leadId: string }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/workers/${leadId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Lead'e iletilemedi: ${err.error ?? res.status}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-[color:var(--color-border)] px-3 py-2.5 bg-[color:var(--color-bg-panel)]/90 backdrop-blur">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="label-tac-sm text-[color:var(--color-signal-amber)]">
          ▶ TRANSMISSION → LEAD
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          ürün/feature direktifi
        </span>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          CTRL+ENTER · transmit
        </span>
      </div>
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`// Örn: "Next.js portfolyo sitesi kur ve Vercel'e deploy et"`}
            rows={3}
            className="w-full resize-none bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-signal-amber)] leading-relaxed transition-colors"
          />
          {input.length > 0 && (
            <div className="absolute bottom-1.5 right-2 label-tac-sm text-[color:var(--color-fg-disabled)] pointer-events-none">
              {input.length}c
            </div>
          )}
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || busy}
          className={cn(
            "px-5 label-tac border transition-all duration-150 min-w-[140px]",
            busy || !input.trim()
              ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
              : "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110",
          )}
        >
          {busy ? "··· transmit" : "▶ transmit"}
        </button>
      </div>
    </div>
  );
}
