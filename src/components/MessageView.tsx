"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type AnyEvent = { type: string; [k: string]: unknown };

/** Single SDKMessage / orchestrator event — tactical/futuristic rendering */
export function MessageView({ event }: { event: AnyEvent }) {
  const [expanded, setExpanded] = useState(false);

  // --- Local synthetic events ---

  if (event.type === "_local_user_message") {
    const text = String((event as { text?: string }).text ?? "");
    return (
      <div className="my-2 border-l-2 border-[color:var(--color-signal-amber)] pl-3 py-1">
        <div className="label-tac-sm text-[color:var(--color-signal-amber)] mb-0.5">
          // USER → LEAD
        </div>
        <pre className="whitespace-pre-wrap text-[14px] text-[color:var(--color-fg)] font-normal leading-relaxed">
          {text}
        </pre>
      </div>
    );
  }

  if (event.type === "_hello") {
    return (
      <div className="log-line text-[color:var(--color-fg-disabled)] py-0.5">
        ::: link established
      </div>
    );
  }

  if (event.type === "_local_status") {
    return (
      <div className="log-line py-0.5">
        ::: status = {String((event as { status?: string }).status ?? "?")}
      </div>
    );
  }

  if (event.type === "_local_goal_changed") {
    const g = (event as { goal?: string | null }).goal;
    return (
      <div
        className={cn(
          "my-1 px-2 py-1 text-[11px] border-l-2",
          g
            ? "border-[color:var(--color-signal-amber)] text-[color:var(--color-signal-amber)]"
            : "border-[color:var(--color-signal-green)] text-[color:var(--color-signal-green)]",
        )}
      >
        <span className="label-tac-sm">
          {g ? "▶ DIRECTIVE LOCKED" : "✓ DIRECTIVE COMPLETE"}
        </span>
        {g && <span className="ml-2 text-[color:var(--color-fg)]">{g}</span>}
      </div>
    );
  }

  if (event.type === "_local_auto_continue") {
    const it = (event as { iteration?: number }).iteration;
    return (
      <div className="log-line py-0.5 text-[color:var(--color-signal-cyan)]/70">
        ↻ iter #{it ?? "?"} — auto-continue
      </div>
    );
  }

  if (event.type === "_local_iter_cap_hit") {
    const it = (event as { iteration?: number }).iteration;
    const cap = (event as { cap?: number }).cap;
    return (
      <div className="my-1 border-l-2 border-[color:var(--color-signal-red)] pl-3 py-1 text-[11px] text-[color:var(--color-signal-red)]">
        <span className="label-tac-sm">⚠ MAX_ITER CAP</span>
        <span className="ml-2 text-[color:var(--color-fg)]">
          iter #{it} / {cap} — directive auto-cancelled, model did not emit
          [DONE]
        </span>
      </div>
    );
  }

  // --- CLI events ---

  if (event.type === "assistant") {
    const msg = (event as { message?: { content?: unknown[] } }).message;
    const blocks = (msg?.content ?? []) as Array<Record<string, unknown>>;
    return (
      <div className="my-2 border-l-2 border-[color:var(--color-signal-cyan)]/60 pl-3 py-1 space-y-1.5">
        <div className="label-tac-sm text-[color:var(--color-signal-cyan)]">
          ◆ ASSISTANT
        </div>
        {blocks.map((b, i) => {
          if (b.type === "text") {
            return (
              <pre
                key={i}
                className="whitespace-pre-wrap text-[13.5px] text-[color:var(--color-fg)] leading-relaxed font-normal"
              >
                {String(b.text)}
              </pre>
            );
          }
          if (b.type === "thinking") {
            return (
              <details
                key={i}
                className="text-[11px] text-[color:var(--color-fg-dim)] italic"
              >
                <summary className="cursor-pointer select-none hover:text-[color:var(--color-fg-secondary)]">
                  ⌬ thinking…
                </summary>
                <pre className="whitespace-pre-wrap pl-3 pt-1 mt-1 border-l border-[color:var(--color-border)]">
                  {String(b.thinking)}
                </pre>
              </details>
            );
          }
          if (b.type === "tool_use") {
            return (
              <details
                key={i}
                className="text-[11px] text-[color:var(--color-signal-yellow)]/90"
              >
                <summary className="cursor-pointer select-none hover:text-[color:var(--color-signal-yellow)]">
                  ⚙ tool · {String(b.name)}
                </summary>
                <pre className="whitespace-pre-wrap pl-3 pt-1 mt-1 border-l border-[color:var(--color-border)] text-[color:var(--color-fg-dim)]">
                  {JSON.stringify(b.input, null, 2)}
                </pre>
              </details>
            );
          }
          return (
            <pre key={i} className="log-line">
              {JSON.stringify(b)}
            </pre>
          );
        })}
      </div>
    );
  }

  if (event.type === "user") {
    const msg = (event as { message?: { content?: unknown } }).message;
    const content = msg?.content;
    if (Array.isArray(content)) {
      return (
        <div className="my-1 pl-3 py-0.5 border-l border-[color:var(--color-border)] space-y-1">
          {content.map((b, i) => {
            if (
              typeof b === "object" &&
              b !== null &&
              (b as { type?: string }).type === "tool_result"
            ) {
              const tc = (b as { content?: unknown }).content;
              return (
                <details
                  key={i}
                  className="text-[11px] text-[color:var(--color-fg-dim)]"
                >
                  <summary className="cursor-pointer select-none hover:text-[color:var(--color-fg-secondary)]">
                    ← tool_result
                  </summary>
                  <pre className="whitespace-pre-wrap pl-3 pt-1 mt-1 border-l border-[color:var(--color-border)]">
                    {typeof tc === "string" ? tc : JSON.stringify(tc, null, 2)}
                  </pre>
                </details>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  }

  if (event.type === "result") {
    const r = event as {
      subtype?: string;
      result?: string;
      total_cost_usd?: number;
      duration_ms?: number;
    };
    const ok = r.subtype === "success";
    return (
      <div
        className={cn(
          "my-1 flex items-center gap-3 text-[11px] py-1 px-2 border-l-2",
          ok
            ? "border-[color:var(--color-signal-green)] text-[color:var(--color-signal-green)]"
            : "border-[color:var(--color-signal-red)] text-[color:var(--color-signal-red)]",
        )}
      >
        <span className="label-tac-sm">{ok ? "✓ TURN COMPLETE" : "✕ TURN ERR"}</span>
        {typeof r.duration_ms === "number" && (
          <span className="text-[color:var(--color-fg-dim)]">
            · {(r.duration_ms / 1000).toFixed(2)}s
          </span>
        )}
        {typeof r.total_cost_usd === "number" && (
          <span
            className="text-[color:var(--color-fg-dim)]"
            title="Max aboneliği para çekmez. Bu API eşdeğer maliyet — gerçek tüketim Max kotasından düşer."
          >
            · ≈ ${r.total_cost_usd.toFixed(4)}{" "}
            <span className="text-[color:var(--color-fg-disabled)]">
              (Max kotası)
            </span>
          </span>
        )}
      </div>
    );
  }

  if (event.type === "system") {
    const subtype = (event as { subtype?: string }).subtype;
    if (subtype === "init") {
      const sid = String(
        (event as { session_id?: string }).session_id ?? "?",
      ).slice(0, 8);
      return (
        <div className="log-line text-[color:var(--color-signal-amber)]/70 py-0.5">
          ⚡ session {sid} initialized
        </div>
      );
    }
    if (subtype?.startsWith("hook")) return null;
    if (subtype === "status") {
      return (
        <div className="log-line text-[color:var(--color-fg-disabled)] py-0.5">
          ::: {String((event as { status?: string }).status ?? subtype)}
        </div>
      );
    }
  }

  // Unknown event — collapsed debug
  return (
    <details className="text-[10px] text-[color:var(--color-fg-disabled)]">
      <summary
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        ◌ {event.type}
      </summary>
      <pre className="whitespace-pre-wrap pl-3 pt-1 mt-0.5 border-l border-[color:var(--color-border)]">
        {JSON.stringify(event, null, 2).slice(0, 2000)}
      </pre>
    </details>
  );
}
