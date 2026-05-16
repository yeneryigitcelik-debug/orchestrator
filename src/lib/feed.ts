// SSE event → kompakt aktivite satırı. Mission Control kartlarındaki canlı feed.
// Client-safe; hem Panel (dönüştürür) hem AgentCard (FeedLine tipini kullanır).

export type FeedKind =
  | "assistant"
  | "tool"
  | "result"
  | "user"
  | "goal"
  | "iter"
  | "sys"
  | "err";

export interface FeedLine {
  kind: FeedKind;
  text: string;
  ts: number;
}

type AnyEvent = { type?: string; [k: string]: unknown };

function clip(s: string, n = 96): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/** Bir SSE event'ini 0+ feed satırına çevirir. Gürültülü/ilgisiz event → []. */
export function eventToFeedLines(event: AnyEvent): FeedLine[] {
  const ts = Date.now();

  switch (event.type) {
    case "assistant": {
      const msg = (event as { message?: { content?: unknown[] } }).message;
      const blocks = (msg?.content ?? []) as Array<Record<string, unknown>>;
      const out: FeedLine[] = [];
      for (const b of blocks) {
        if (b.type === "text" && typeof b.text === "string" && b.text.trim()) {
          out.push({ kind: "assistant", text: clip(b.text), ts });
        } else if (b.type === "tool_use" && typeof b.name === "string") {
          out.push({ kind: "tool", text: `tool · ${b.name}`, ts });
        }
      }
      return out;
    }

    case "result": {
      const r = event as { subtype?: string; duration_ms?: number };
      const ok = r.subtype === "success";
      const dur =
        typeof r.duration_ms === "number"
          ? ` ${(r.duration_ms / 1000).toFixed(1)}s`
          : "";
      return [
        {
          kind: ok ? "result" : "err",
          text: ok ? `turn complete${dur}` : `turn error${dur}`,
          ts,
        },
      ];
    }

    case "_local_user_message": {
      const text = String((event as { text?: string }).text ?? "");
      return text ? [{ kind: "user", text: clip(text, 80), ts }] : [];
    }

    case "_local_goal_changed": {
      const g = (event as { goal?: string | null }).goal;
      return [
        g
          ? { kind: "goal", text: `directive: ${clip(String(g), 64)}`, ts }
          : { kind: "goal", text: "directive complete", ts },
      ];
    }

    case "_local_auto_continue": {
      const it = (event as { iteration?: number }).iteration;
      return [{ kind: "iter", text: `auto-continue · iter ${it ?? "?"}`, ts }];
    }

    case "_local_iter_cap_hit":
      return [{ kind: "err", text: "max-iter cap — directive cancelled", ts }];

    case "system": {
      if ((event as { subtype?: string }).subtype === "init") {
        return [{ kind: "sys", text: "session initialized", ts }];
      }
      return [];
    }

    default:
      return [];
  }
}
