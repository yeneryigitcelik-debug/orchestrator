// Claude Code stream-json mesaj tipleri.
// CLI'nin --output-format stream-json çıktısını typed olarak modelliyoruz.
// Bilinmeyen alanlar zarar vermez; defensive parsing kullanıyoruz.

export type WorkerRole =
  | "lead"
  | "backend"
  | "frontend"
  | "watcher"
  | "db"
  | "devops"
  | "qa"
  | "custom"
  // --- review agents (agent-orchestra merge) ---
  | "security"
  | "performance"
  | "database"
  | "api"
  | "infrastructure"
  | "quality"
  | "ui"
  | "ux"
  | "cost";

/** Repo tarama yapan review rolleri — kod yazmaz, JSON finding üretir. */
export const REVIEW_ROLES: WorkerRole[] = [
  "security",
  "performance",
  "database",
  "api",
  "infrastructure",
  "quality",
  "ui",
  "ux",
  "cost",
];

export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** Bir review worker'ının ürettiği tek bulgu. */
export interface FindingDraft {
  severity: Severity;
  rule: string;
  file: string;
  line?: number | null;
  why: string;
  fix?: string | null;
  evidence?: string | null;
}

export type WorkerStatus =
  | "idle"
  | "starting"
  | "running"
  | "thinking"
  | "crashed"
  | "stopped";

export interface WorkerConfig {
  id: string;
  name: string;
  role: WorkerRole;
  model: string;
  cwd: string;
  systemPrompt?: string;
  permissionMode?: "bypassPermissions" | "acceptEdits" | "default";
  sessionId?: string;
  /** claude CLI'ye geçirilecek ek bayraklar — Lead için --mcp-config bunda gelir */
  extraArgs?: string[];
}

// --- stream-json mesaj union'ı (CLI'den gelen) ---

export interface InitMessage {
  type: "system";
  subtype: "init";
  session_id: string;
  tools?: string[];
  model?: string;
  cwd?: string;
}

export interface AssistantMessage {
  type: "assistant";
  message: {
    role: "assistant";
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: unknown }
    >;
    stop_reason?: string;
  };
  session_id?: string;
}

export interface UserMessage {
  type: "user";
  message: {
    role: "user";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "tool_result"; tool_use_id: string; content: unknown }
        >;
  };
  session_id?: string;
}

export interface ResultMessage {
  type: "result";
  subtype: "success" | "error" | "error_max_turns" | "error_max_budget_usd";
  result?: string;
  total_cost_usd?: number;
  usage?: Record<string, number>;
  session_id?: string;
  is_error?: boolean;
}

export interface PartialMessage {
  type: "stream_event" | "partial";
  delta?: { text?: string };
  [k: string]: unknown;
}

export type SDKMessage =
  | InitMessage
  | AssistantMessage
  | UserMessage
  | ResultMessage
  | PartialMessage
  | { type: string; [k: string]: unknown };

// --- stdin'e gönderilecek mesaj (CLI'ye user input) ---

export interface StreamInputMessage {
  type: "user";
  message: {
    role: "user";
    content: string | Array<{ type: "text"; text: string }>;
  };
}
