// Client-safe rol metadata'sı — SpawnDialog + AgentCard bunu kullanır.
// role → default model eşlemesi src/core/role-prompts.ts ROLE_PRESETS ile birebir.
// (role-prompts.ts büyük system prompt string'leri taşır; client'a sızdırmamak
//  için burada yalnız hafif metadata tutulur.)

export const MODEL_IDS = {
  fable: "claude-fable-5",
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODEL_IDS;

/** Lead dışındaki — UI'dan manuel spawn edilebilen — roller. */
export type SpawnRole =
  | "backend"
  | "frontend"
  | "db"
  | "devops"
  | "qa"
  | "watcher"
  | "ios"
  | "android"
  | "mobile"
  | "design"
  | "debug"
  | "custom"
  | "security"
  | "performance"
  | "database"
  | "api"
  | "infrastructure"
  | "quality"
  | "ui"
  | "ux"
  | "cost";

export interface RoleMeta {
  role: SpawnRole;
  label: string;
  group: "core" | "specialist";
  model: ModelKey;
  blurb: string;
}

export const SPAWN_ROLES: RoleMeta[] = [
  // --- core ---
  { role: "backend", label: "backend", group: "core", model: "sonnet", blurb: "API · iş mantığı · auth" },
  { role: "frontend", label: "frontend", group: "core", model: "sonnet", blurb: "UI · component · state" },
  { role: "db", label: "db", group: "core", model: "sonnet", blurb: "şema · migration · query" },
  { role: "devops", label: "devops", group: "core", model: "sonnet", blurb: "docker · CI/CD · deploy" },
  { role: "qa", label: "qa", group: "core", model: "haiku", blurb: "test · regresyon · bug" },
  { role: "watcher", label: "watcher", group: "core", model: "haiku", blurb: "salt-okuma gözlem" },
  { role: "ios", label: "ios", group: "core", model: "sonnet", blurb: "Swift · SwiftUI · native" },
  { role: "android", label: "android", group: "core", model: "sonnet", blurb: "Kotlin · Compose · native" },
  { role: "mobile", label: "mobile", group: "core", model: "sonnet", blurb: "React Native · Expo · cross" },
  { role: "design", label: "design", group: "core", model: "sonnet", blurb: "token · tema · component sistem" },
  { role: "debug", label: "debug", group: "core", model: "opus", blurb: "kök-neden · hata düzeltme" },
  { role: "custom", label: "custom", group: "core", model: "sonnet", blurb: "kapsamı goal belirler" },
  // --- specialist (skill yüklü, tam yetkili) ---
  { role: "security", label: "security", group: "specialist", model: "opus", blurb: "açık · secret · injection" },
  { role: "performance", label: "performance", group: "specialist", model: "sonnet", blurb: "gecikme · N+1 · bundle" },
  { role: "database", label: "database", group: "specialist", model: "sonnet", blurb: "bütünlük · FK · race" },
  { role: "api", label: "api", group: "specialist", model: "sonnet", blurb: "kontrat · validation · CORS" },
  { role: "infrastructure", label: "infra", group: "specialist", model: "sonnet", blurb: "build · SSL · runtime" },
  { role: "quality", label: "quality", group: "specialist", model: "sonnet", blurb: "kod hijyeni · ölü kod" },
  { role: "ui", label: "ui", group: "specialist", model: "sonnet", blurb: "görsel sistem · token" },
  { role: "ux", label: "ux", group: "specialist", model: "sonnet", blurb: "akış · erişilebilirlik" },
  { role: "cost", label: "cost", group: "specialist", model: "sonnet", blurb: "israf · dolar etkisi" },
];

export const ROLE_BY_NAME: Record<SpawnRole, RoleMeta> = Object.fromEntries(
  SPAWN_ROLES.map((r) => [r.role, r]),
) as Record<SpawnRole, RoleMeta>;

/** Rol → matrix sinyal rengi (CSS var string). Agent card + spawn dialog aksanı. */
export const ROLE_ACCENT_VAR: Record<string, string> = {
  lead: "var(--color-signal-amber)",
  backend: "var(--color-signal-cyan)",
  frontend: "var(--color-signal-violet)",
  db: "var(--color-signal-yellow)",
  devops: "var(--color-signal-amber)",
  qa: "var(--color-signal-green)",
  watcher: "var(--color-fg-secondary)",
  ios: "var(--color-signal-cyan)",
  android: "var(--color-signal-green)",
  mobile: "var(--color-signal-cyan)",
  design: "var(--color-signal-violet)",
  debug: "var(--color-signal-red)",
  custom: "var(--color-fg-secondary)",
  security: "var(--color-signal-red)",
  performance: "var(--color-signal-amber)",
  database: "var(--color-signal-yellow)",
  api: "var(--color-signal-cyan)",
  infrastructure: "var(--color-signal-amber)",
  quality: "var(--color-signal-green)",
  ui: "var(--color-signal-violet)",
  ux: "var(--color-signal-violet)",
  cost: "var(--color-signal-green)",
};
