// Lead worker — sistemin kalıcı orkestratörü.
// Kullanıcı sadece bununla konuşur. Lead helper spawn eder, koordine eder, raporlar.
//
// Yan etkiler:
//  - İlk boot'ta data/lead-mcp.json üretilir (claude CLI'nin --mcp-config'i için)
//  - DB'de role='lead' tek bir kayıt olur; bu varsa restore edilir, yoksa spawn edilir

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/db";
import type { SpawnRequest, WorkerSnapshot } from "./orchestrator";
import { LEAD_SYSTEM_PROMPT, PROJECT_ROOT, DEFAULT_WORKSPACE } from "./lead-prompt";

const DATA_DIR = resolve(PROJECT_ROOT, "data");
const MCP_CONFIG_PATH = resolve(DATA_DIR, "lead-mcp.json");
const MCP_SERVER_PATH = resolve(PROJECT_ROOT, "scripts", "mcp-server.mjs");
// Lead'in salt-okuma erişmesi gereken klasör: SaaS blueprint kütüphanesi.
// Lead'in cwd'si DEFAULT_WORKSPACE; --add-dir olmadan orchestrator kökündeki
// blueprints/'i (blueprint dosyaları + catalog.md) okuyamaz.
const BLUEPRINTS_DIR = resolve(PROJECT_ROOT, "blueprints");

/** MCP config dosyasını üretir (zaten varsa overwrite). */
function ensureMcpConfig(): string {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  const cfg = {
    mcpServers: {
      orchestrator: {
        command: process.execPath, // node binary
        args: [MCP_SERVER_PATH],
        env: {
          // MCP server orchestrator daemon'a bağlanır (Next'e değil).
          ORCHESTRATOR_API_URL:
            process.env.ORCHESTRATOR_API_URL ?? "http://127.0.0.1:3006",
        },
      },
    },
  };
  writeFileSync(MCP_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  return MCP_CONFIG_PATH;
}

/** Lead spawn için config (orchestrator'a verilir). */
export function buildLeadSpawnRequest(): SpawnRequest & {
  extraArgs: string[];
} {
  const mcpConfigPath = ensureMcpConfig();

  // Default workspace dizini yoksa yarat
  if (!existsSync(DEFAULT_WORKSPACE)) {
    mkdirSync(DEFAULT_WORKSPACE, { recursive: true });
  }

  return {
    name: "Lead",
    role: "lead",
    model: process.env.LEAD_MODEL ?? "claude-opus-4-8",
    cwd: DEFAULT_WORKSPACE,
    systemPrompt: LEAD_SYSTEM_PROMPT,
    permissionMode: "bypassPermissions",
    autonomous: false, // Lead chat moduyla başlar, kullanıcı goal verince autonomous geçer
    extraArgs: ["--mcp-config", mcpConfigPath, "--add-dir", BLUEPRINTS_DIR],
  };
}

/** DB'de Lead var mı diye bakar. */
export async function findLeadInDB(): Promise<{
  id: string;
  sessionId: string | null;
} | null> {
  const lead = await prisma.worker.findFirst({
    where: { role: "lead" },
    orderBy: { createdAt: "desc" },
  });
  if (!lead) return null;
  return { id: lead.id, sessionId: lead.sessionId };
}

/** UI ve API'de "Bu Lead mi?" kontrolü için. */
export function isLead(snapshot: { role: string }): boolean {
  return snapshot.role === "lead";
}
