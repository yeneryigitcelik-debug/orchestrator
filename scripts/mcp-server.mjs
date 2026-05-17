#!/usr/bin/env node
/**
 * orchestrator MCP server.
 *
 * Lead worker'ın claude CLI'si bu sunucuyu `--mcp-config` ile bağlar.
 * Stdio üzerinden Lead'e tool sağlar; tool çağrılarını HTTP üzerinden
 * orchestrator daemon'ın API'sine düşürür (Next değil — daemon doğrudan,
 * böylece Next çökse de Lead worker'ları yönetmeye devam eder).
 *
 * Tool'lar:
 *  - spawn_helper(name, role, cwd, system_prompt?, model?, goal?)
 *  - send_helper(helper_id, text)
 *  - list_helpers()
 *  - kill_helper(helper_id)
 *  - wait_helper(helper_id, timeout_seconds?)   ← SSE ile goal=null bekler
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// orchestrator daemon (src/core/daemon-server.ts) — Next'e değil daemon'a bağlan.
const API_BASE = process.env.ORCHESTRATOR_API_URL ?? "http://127.0.0.1:3006";

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${path}: ${body.error ?? text.slice(0, 200)}`,
    );
  }
  return body;
}

function ok(payload) {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function fail(msg) {
  return {
    isError: true,
    content: [{ type: "text", text: `HATA: ${msg}` }],
  };
}

const server = new McpServer({
  name: "orchestrator",
  version: "0.1.0",
});

// --- spawn_helper -----------------------------------------------------------

server.registerTool(
  "spawn_helper",
  {
    description:
      "Yeni bir helper worker spawn et. role = backend|frontend|watcher|db|devops|qa|ios|debug|custom. " +
      "Her helper kendi claude CLI subprocess'i, kendi sessionId'si var. " +
      "goal verirsen otonom çalışıp [DONE] yazana kadar devam eder. " +
      "cwd çakışırsa (aynı dizinde başka helper varsa) hata döner — farklı klasör veya git worktree kullan.",
    inputSchema: {
      name: z.string().describe("Helper'a verilecek kısa isim, ör: 'auth-backend'"),
      role: z
        .enum([
          "backend",
          "frontend",
          "watcher",
          "db",
          "devops",
          "qa",
          "ios",
          "debug",
          "custom",
          "security",
          "performance",
          "database",
          "api",
          "infrastructure",
          "quality",
          "ui",
          "ux",
          "cost",
        ])
        .describe(
          "Helper rolü. Genel: backend|frontend|db|devops|qa|watcher|ios|debug|custom. " +
            "ios = Swift/SwiftUI native iOS; debug = hata kök-neden analizi + fix. " +
            "Uzman (tam yetkili, dar alan, skill yüklü): security|performance|" +
            "database|api|infrastructure|quality|ui|ux|cost.",
        ),
      cwd: z
        .string()
        .describe(
          "Helper'ın çalışacağı dizin (absolute path, Windows için forward-slash da olur)",
        ),
      goal: z
        .string()
        .optional()
        .describe(
          "Helper'a verilecek otonom görev. Kontrat: [DONE] yazınca biter, " +
            "[BLOCKED] sebep yazınca durur ve sana raporlar. Helper'a sıkı kapsam ver.",
        ),
      system_prompt: z
        .string()
        .optional()
        .describe(
          "Ek system prompt (role preset'inin üstüne append edilir). Boş bırakırsan rolün default'unu alır.",
        ),
      model: z
        .string()
        .optional()
        .describe(
          "Görev zorluğuna göre BİLİNÇLİ seç — körlemesine opus verme. " +
            "claude-haiku-4-5-20251001 → mekanik/salt-okuma/küçük iş " +
            "(test koşturma, durum özeti, arama, format, tek-dosya ufak değişiklik). " +
            "claude-sonnet-4-6 → VARSAYILAN üretim işi (net-spec endpoint, CRUD, " +
            "UI component, sıradan bug fix, refactor, migration) — işlerin çoğu burada. " +
            "claude-opus-4-7 → yalnız gerçekten zor (belirsiz/çapraz-kesen mimari, " +
            "kök-neden zor debug, güvenlik-kritik tasarım). Şüphedeysen sonnet. " +
            "Boş bırakırsan rolün default'u kullanılır (çoğu rol sonnet; " +
            "qa/watcher haiku; debug/security opus).",
        ),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/workers", {
        method: "POST",
        body: JSON.stringify({
          name: args.name,
          role: args.role,
          cwd: args.cwd,
          goal: args.goal,
          systemPrompt: args.system_prompt,
          model: args.model, // boş → daemon rolün preset default'unu enjekte eder
        }),
      });
      return ok(body.worker);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- send_helper ------------------------------------------------------------

server.registerTool(
  "send_helper",
  {
    description:
      "Belirli helper'a mesaj yolla (chat şeklinde). Eğer helper'a goal verdiysen " +
      "ona ek konuşma ya da kapsam değişikliği yapmak için kullan.",
    inputSchema: {
      helper_id: z.string().describe("Helper'ın UUID'si"),
      text: z.string().describe("Helper'a gidecek mesaj metni"),
    },
  },
  async ({ helper_id, text }) => {
    try {
      await api(`/api/workers/${helper_id}/message`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return ok({ sent: true, helper_id });
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- list_helpers -----------------------------------------------------------

server.registerTool(
  "list_helpers",
  {
    description:
      "Tüm aktif worker'ların durumunu listele. Kendin (Lead) dahil. " +
      "Her worker için id, name, role, status, goal, iteration, son aktivite zamanı döner.",
    inputSchema: {},
  },
  async () => {
    try {
      const body = await api("/api/workers");
      return ok(body.workers);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- kill_helper ------------------------------------------------------------

server.registerTool(
  "kill_helper",
  {
    description:
      "Helper'ı zorla durdur (subprocess SIGTERM). Kullanım: helper takıldıysa, " +
      "yanlış işe başladıysa veya scope dışına çıktıysa. Lead'i (kendini) kill etme.",
    inputSchema: {
      helper_id: z.string().describe("Durdurulacak helper'ın UUID'si"),
    },
  },
  async ({ helper_id }) => {
    try {
      await api(`/api/workers/${helper_id}`, { method: "DELETE" });
      return ok({ killed: helper_id });
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- wait_helper ------------------------------------------------------------

server.registerTool(
  "wait_helper",
  {
    description:
      "Helper goal'i [DONE] yazıp bitirene kadar bekle. SSE ile dinler, " +
      "blocking. Timeout aşılırsa veya MAX_ITER cap'e çarparsa erken döner. " +
      "Helper'ın son assistant cevabını result olarak verir.",
    inputSchema: {
      helper_id: z.string().describe("Beklenecek helper UUID'si"),
      timeout_seconds: z
        .number()
        .min(5)
        .max(7200)
        .default(1800)
        .describe("Maksimum bekleme süresi (5-7200sn). Default 30dk."),
    },
  },
  async ({ helper_id, timeout_seconds }) => {
    try {
      const res = await waitForGoalDone(helper_id, timeout_seconds * 1000);
      return ok(res);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

/**
 * SSE üzerinden helper'ı dinle, _local_goal_changed{goal:null} veya
 * _local_iter_cap_hit gelene kadar bekle. Son assistant text'i topla.
 */
async function waitForGoalDone(helperId, timeoutMs) {
  const url = `${API_BASE}/api/workers/${helperId}/stream`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let lastAssistantText = "";
  let outcome = "timeout";

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/event-stream" },
    });
    if (!res.ok || !res.body) {
      throw new Error(`SSE bağlanamadı: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    outer: while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nl;
      while ((nl = buf.indexOf("\n\n")) !== -1) {
        const chunk = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        let ev;
        try {
          ev = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (ev.type === "assistant" && Array.isArray(ev.message?.content)) {
          const text = ev.message.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          if (text) lastAssistantText = text;
        }

        // Goal'siz helper de [DONE]/[BLOCKED] yazıp bitebilir — result'tan yakala
        // (yoksa wait_helper, goal=null event'i hiç gelmediği için timeout'a asılır).
        if (ev.type === "result") {
          const rtext = ev.result ?? "";
          if (/\[DONE\]|TASK COMPLETE|TAMAMLANDI|GÖREV BİTTİ|GOREV BITTI/i.test(rtext)) {
            if (rtext) lastAssistantText = rtext;
            outcome = "done";
            break outer;
          }
          if (/\[BLOCKED\]/i.test(rtext)) {
            if (rtext) lastAssistantText = rtext;
            outcome = "blocked";
            break outer;
          }
        }

        if (ev.type === "_local_goal_changed" && ev.goal === null) {
          outcome = "done";
          break outer;
        }
        if (ev.type === "_local_iter_cap_hit") {
          outcome = "iter_cap_hit";
          break outer;
        }
        if (ev.type === "_local_status" && ev.status === "crashed") {
          outcome = "crashed";
          break outer;
        }
      }
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }

  return {
    helper_id: helperId,
    outcome,
    last_assistant_text: lastAssistantText.slice(0, 8000),
  };
}

// --- scan_repo --------------------------------------------------------------

const REVIEW_ROLES = [
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

server.registerTool(
  "scan_repo",
  {
    description:
      "Bir kod reposunu 9 review ajansına PARALEL taratır: security, performance, " +
      "database, api, infrastructure, quality, ui, ux, cost. Her ajans kendi skill " +
      "setiyle repo'yu salt-okuma inceler ve JSON finding üretir. wait=true ile " +
      "tarama bitene kadar bekler, severity özetini döndürür. Helper spawn etmene " +
      "gerek yok — scan modu ajansları kendisi yönetir.",
    inputSchema: {
      repo: z.string().describe("Taranacak dizinin absolute yolu"),
      roles: z
        .array(z.enum(REVIEW_ROLES))
        .optional()
        .describe("Alt küme review rolleri; boş bırakırsan 9'u da koşar"),
      wait: z
        .boolean()
        .default(true)
        .describe("Tarama bitene kadar bekle ve özet döndür"),
    },
  },
  async ({ repo, roles, wait }) => {
    try {
      const body = await api("/api/scan", {
        method: "POST",
        body: JSON.stringify({ repo, roles }),
      });
      const scanId = body.scan.scanId;
      if (!wait) {
        return ok({ scanId, status: "running", roles: body.scan.roles });
      }
      await waitForScanDone(scanId, 30 * 60 * 1000);
      const detail = await api(`/api/scan/${scanId}`);
      const s = detail.scan;
      const bySeverity = {};
      for (const f of s.findings ?? []) {
        bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      }
      return ok({
        scanId,
        repo: s.repo,
        status: s.status,
        totalFindings: (s.findings ?? []).length,
        bySeverity,
        findings: (s.findings ?? []).slice(0, 80),
      });
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- list_scans / get_scan --------------------------------------------------

server.registerTool(
  "list_scans",
  {
    description: "Son repo taramalarını listele (id, repo, status, severity sayıları).",
    inputSchema: {},
  },
  async () => {
    try {
      const body = await api("/api/scan");
      return ok(body.scans);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "get_scan",
  {
    description: "Bir taramanın tüm finding'lerini getir.",
    inputSchema: {
      scan_id: z.string().describe("Tarama UUID'si"),
    },
  },
  async ({ scan_id }) => {
    try {
      const body = await api(`/api/scan/${scan_id}`);
      return ok(body.scan);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

/** scan SSE stream'ini dinle, _scan_done gelene kadar bekle. */
async function waitForScanDone(scanId, timeoutMs) {
  const url = `${API_BASE}/api/scan/${scanId}/stream`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/event-stream" },
    });
    if (!res.ok || !res.body) throw new Error(`SSE bağlanamadı: HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n\n")) !== -1) {
        const chunk = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "_scan_done") return;
        } catch {
          /* yoksay */
        }
      }
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

// --- boot -------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr'e log basabiliriz (stdout protokol için ayrılmış)
process.stderr.write(
  `[mcp-server] orchestrator MCP bağlandı (API_BASE=${API_BASE})\n`,
);
