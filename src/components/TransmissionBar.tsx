"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Sabit alt bar — her zaman Lead'e mesaj yollar.
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
        <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft">
          ▶ transmission → lead
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          ürün/feature direktifi
        </span>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          ctrl+enter · transmit
        </span>
      </div>
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-2 text-[color:var(--color-phosphor)] glow-soft text-[13px] pointer-events-none select-none">
            ❯
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`directive girin — örn: "Next.js portfolyo sitesi kur ve Vercel'e deploy et"`}
            rows={3}
            className="w-full resize-none bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] pl-7 pr-3 py-2 text-[13.5px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-phosphor)] leading-relaxed transition-colors placeholder:text-[color:var(--color-fg-disabled)] [field-sizing:content] max-h-[40vh] overflow-auto"
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
              : "bg-[color:var(--color-phosphor)] text-[color:var(--color-bg-deep)] border-[color:var(--color-phosphor)] hover:brightness-110 shadow-[0_0_12px_rgba(67,245,127,0.45)]",
          )}
        >
          {busy ? "··· tx" : "▶ transmit"}
        </button>
      </div>
    </div>
  );
}
