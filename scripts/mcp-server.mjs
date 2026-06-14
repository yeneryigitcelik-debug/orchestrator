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
      "Yeni bir helper worker spawn et. role = backend|frontend|watcher|db|devops|qa|ios|android|mobile|design|debug|custom. " +
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
          "android",
          "mobile",
          "design",
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
          "Helper rolü. Genel: backend|frontend|db|devops|qa|watcher|debug|custom. " +
            "design = tasarım sistemi mimarı (token + component foundation; UI/SaaS " +
            "işinde İLK sen spawn et — diğer platform helper'ları çıktısını tüketir). " +
            "ios = Swift/SwiftUI native iOS; android = Kotlin/Compose native Android; " +
            "mobile = React Native + Expo cross-platform (tek kod, iki platform). " +
            "debug = hata kök-neden analizi + fix. " +
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
          "Görev zorluğuna göre BİLİNÇLİ seç — körlemesine üst katman verme. Üç katman: " +
            "claude-haiku-4-5-20251001 → mekanik/salt-okuma/küçük iş " +
            "(test koşturma, durum özeti, arama, format, tek-dosya ufak değişiklik). " +
            "claude-sonnet-4-6 → VARSAYILAN üretim işi (net-spec endpoint, CRUD, " +
            "UI component, sıradan bug fix, refactor, migration) — işlerin çoğu burada. " +
            "claude-opus-4-8 → gerçekten zor / en yüksek bahis, en üst katman " +
            "(belirsiz/çapraz-kesen mimari, sıfırdan karmaşık sistem tasarımı, " +
            "kök-neden zor debug, güvenlik-kritik core). Seyrek kullan — pahalı, " +
            "rate-limit yer; sonnet'in yeteceği işe verme. Şüphedeysen sonnet. " +
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

// --- Autonomous mode: task backlog --------------------------------------------

server.registerTool(
  "add_task",
  {
    description:
      "Backlog'a yeni task ekle. Sen (Lead) idle döngüde 'şu işi de yapayım' " +
      "diye düşündüğünde veya kullanıcı 'şunları sıraya ekle' dediğinde kullan. " +
      "priority 1=en yüksek, 10=en düşük (default 5). source='lead-ideation' senin " +
      "kendi fikirlerin için; kullanıcının verdiği işlerde 'user' kullan.",
    inputSchema: {
      title: z.string().min(1).max(500).describe("Kısa task başlığı (1-2 cümle)"),
      description: z
        .string()
        .optional()
        .describe("Detaylar: kapsam, kabul kriterleri, yapılmayacaklar"),
      priority: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("1=acil, 5=normal (default), 10=ertelenebilir"),
      source: z
        .enum(["user", "lead-ideation", "scheduler", "telegram"])
        .optional()
        .describe("İşi kim önerdi (default: lead-ideation)"),
      cwd: z
        .string()
        .optional()
        .describe("Hangi projede çalışılacak (absolute path). Boş = sen karar ver."),
      goal: z
        .string()
        .optional()
        .describe(
          "Bu task'a karşılık spawn edeceğin helper goal'ünün taslağı. Boş bırakılırsa task'a başladığında üretirsin.",
        ),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: args.title,
          description: args.description,
          priority: args.priority,
          source: args.source ?? "lead-ideation",
          cwd: args.cwd,
          goal: args.goal,
        }),
      });
      return ok(body.task);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "list_tasks",
  {
    description:
      "Backlog'u görüntüle. status filtre: pending|in_progress|done|blocked|cancelled. " +
      "Boş bırakırsan hepsi (status'a + priority'ye göre sıralı).",
    inputSchema: {
      status: z
        .enum(["pending", "in_progress", "done", "blocked", "cancelled"])
        .optional(),
    },
  },
  async ({ status }) => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const body = await api(`/api/tasks${qs}`);
      return ok(body.tasks);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "next_task",
  {
    description:
      "Backlog'tan SIRADAKİ en öncelikli pending task'i çek ve in_progress'e taşı. " +
      "Yoksa task=null döner — o zaman ideation turuna geç veya kullanıcıdan iş bekle. " +
      "Çağırınca otomatik kilitlenir; aynı task'ı iki kez almazsın.",
    inputSchema: {},
  },
  async () => {
    try {
      const body = await api("/api/tasks/next", { method: "POST" });
      if (!body.task) return ok({ task: null, message: "Backlog boş." });
      return ok(body.task);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "complete_task",
  {
    description:
      "Task'ı done olarak işaretle. result = 2-4 cümle özet: ne yapıldı, hangi dosyalar " +
      "etkilendi, açıkta kalan iş varsa. Bu özet 24h-summary ve UI'da görünür.",
    inputSchema: {
      task_id: z.string().describe("Task UUID"),
      result: z.string().optional().describe("Tamamlama özeti"),
    },
  },
  async ({ task_id, result }) => {
    try {
      const body = await api(`/api/tasks/${task_id}/complete`, {
        method: "POST",
        body: JSON.stringify({ result }),
      });
      return ok(body.task);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "block_task",
  {
    description:
      "Task'ı blocked olarak işaretle. reason = neyi bekliyor (kullanıcı kararı, " +
      "harici servis, eksik bilgi). Bu kullanıcıya Telegram/UI'da bildirim gider.",
    inputSchema: {
      task_id: z.string().describe("Task UUID"),
      reason: z.string().min(1).describe("Blokaj sebebi"),
    },
  },
  async ({ task_id, reason }) => {
    try {
      const body = await api(`/api/tasks/${task_id}/block`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      return ok(body.task);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- Project memory (.agentwiki) ----------------------------------------------

server.registerTool(
  "memory_write",
  {
    description:
      "Bir projenin kalıcı hafızasına (.agentwiki) sayfa yaz/güncelle. " +
      "tier: semantic (kalıcı fact/karar/mimari/API kontratı/gotcha) | " +
      "procedural (tekrarlanan how-to/runbook) | episodic (oturum notu) | working (geçici). " +
      "semantic/procedural için sources ZORUNLU — iddiayı dosya/episode'a bağla (provenance). " +
      "Aynı slug varsa günceller (tag/source/link birleşir, gövde değişir). " +
      "Helper'ların [DONE] raporundaki 'HAFIZA:' notlarını da böyle kalıcılaştır.",
    inputSchema: {
      project: z
        .string()
        .describe("Proje absolute path'i — hangi projenin hafızası (helper'ın cwd'si)."),
      tier: z.enum(["semantic", "procedural", "episodic", "working"]),
      title: z.string().describe("Sayfa başlığı"),
      body: z
        .string()
        .describe("Markdown gövde. İddialar satır-içi atıf taşısın: [src/x.ts]"),
      tags: z.array(z.string()).optional(),
      sources: z
        .array(z.string())
        .optional()
        .describe(
          "Provenance: 'src/auth/jwt.ts' veya 'episode:episodic/2026-...md' gibi. semantic/procedural'da zorunlu.",
        ),
      links: z.array(z.string()).optional().describe("İlgili sayfa slug'ları"),
      slug: z.string().optional().describe("Boş bırakılırsa başlıktan üretilir"),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/memory/write", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return ok(body.page);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "memory_read",
  {
    description:
      "Bir projenin hafıza sayfasını oku. path = 'tier/slug.md' " +
      "(örn 'semantic/auth-mimarisi.md'). Yolları memory_index / INDEX'ten bul.",
    inputSchema: {
      project: z.string().describe("Proje absolute path'i"),
      path: z.string().describe("tier/slug.md"),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/memory/read", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return ok(body.page);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "memory_index",
  {
    description:
      "Bir projenin hafıza INDEX'ini + sayfa listesini getir. Bir projede iş " +
      "yapmadan ÖNCE çağır — neyin zaten bilindiğini gör, tekrarlama.",
    inputSchema: {
      project: z.string().describe("Proje absolute path'i"),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/memory/index", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return ok({ index: body.index, pages: body.pages });
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "memory_search",
  {
    description:
      "Bir projenin hafızasında anahtar-kelime araması (BM25). İlgili sayfaları " +
      "skor + snippet ile döner. Bir konuda iş yapmadan önce 'bunu daha önce " +
      "çözmüş müyüz / karar vermiş miyiz?' diye ara.",
    inputSchema: {
      project: z.string().describe("Proje absolute path'i"),
      query: z.string().describe("Aranacak metin / konu"),
      k: z.number().int().optional().describe("Kaç sonuç (default 8)"),
      tier: z.enum(["semantic", "procedural", "episodic"]).optional(),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/memory/search", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return ok(body.hits);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "memory_lint",
  {
    description:
      "Bir projenin hafızasını denetle: orphan (referanssız) sayfalar, bayat " +
      "sayfalar, kırık link (gap), çelişki ADAYLARI + eski working/ sayfalarını " +
      "budar. Idle/checkpoint turlarında periyodik çağır; bulguları memory_write " +
      "ile düzelt (çelişkileri sen yargıla).",
    inputSchema: {
      project: z.string().describe("Proje absolute path'i"),
    },
  },
  async (args) => {
    try {
      const body = await api("/api/memory/lint", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return ok(body.report);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- Autonomous mode: thinking journal ----------------------------------------

server.registerTool(
  "log_thought",
  {
    description:
      "Düşünme günlüğüne kayıt at. Drift kontrolünün TEMELİ — autonomous modda her " +
      "tool çağrısından / karardan ÖNCE bir thought yaz. Type seç: " +
      "observation (proje hakkında bir tespit), idea (yeni fikir/öneri), " +
      "question (kararsızsın, kullanıcı görüşü gerekebilir), " +
      "decision (bir yola karar verdin + neden), plan (sıradaki birkaç adımı yaz), " +
      "rationale (yaptığın şeyin gerekçesi). Kısa tut (1-3 cümle).",
    inputSchema: {
      content: z.string().min(1).max(20_000).describe("Düşüncenin metni"),
      type: z
        .enum([
          "observation",
          "idea",
          "question",
          "decision",
          "plan",
          "rationale",
        ])
        .describe("Düşünce türü"),
      task_id: z.string().optional().describe("Bağlı task varsa UUID'si"),
    },
  },
  async ({ content, type, task_id }) => {
    try {
      const body = await api("/api/thoughts", {
        method: "POST",
        body: JSON.stringify({ content, type, taskId: task_id }),
      });
      return ok(body.thought);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "recall_thoughts",
  {
    description:
      "Önceki düşüncelerini oku — son N tane (default 20). Autonomous modda yeni " +
      "tura başlamadan ÖNCE bunu çağır: 'son ne düşünmüştüm, sapma var mı?' " +
      "filtre: type ile sadece o tip; task_id ile o task'a bağlı olanlar.",
    inputSchema: {
      type: z
        .enum([
          "observation",
          "idea",
          "question",
          "decision",
          "plan",
          "checkpoint",
          "drift-alarm",
          "rationale",
        ])
        .optional(),
      task_id: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(20),
    },
  },
  async ({ type, task_id, limit }) => {
    try {
      const qs = new URLSearchParams();
      if (type) qs.set("type", type);
      if (task_id) qs.set("taskId", task_id);
      qs.set("limit", String(limit));
      const body = await api(`/api/thoughts?${qs.toString()}`);
      return ok(body.thoughts);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- Autonomous mode: checkpoint + status -------------------------------------

server.registerTool(
  "request_checkpoint",
  {
    description:
      "Kullanıcıya 'dur, bana bak' sinyali ver. Anti-drift mekanizması. Şu durumlarda " +
      "kullan: (a) checkpointEvery turuna geldin (zorunlu), (b) önemli bir kararla " +
      "karşılaştın ve onay istiyorsun, (c) iş orijinal hedeften uzaklaşıyor gibi " +
      "hissettin. summary 3-6 cümle: ne yaptım, ne öğrendim, devam edersem ne yapacağım. " +
      "Telegram bildirimi atılır.",
    inputSchema: {
      summary: z.string().min(20).max(10_000).describe("Checkpoint özeti"),
    },
  },
  async ({ summary }) => {
    try {
      const body = await api("/api/autonomous/checkpoint", {
        method: "POST",
        body: JSON.stringify({ summary }),
      });
      return ok(body.thought);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

server.registerTool(
  "autonomous_status",
  {
    description:
      "Mevcut autonomous run'ın durumunu öğren: aktif mi, kaçıncı iterasyonda, " +
      "checkpoint sayacı, config (maxIterations, checkpointEvery vs.). Yeni tura " +
      "başlamadan önce bunu çağır — özellikle checkpoint zamanı geldi mi diye bak.",
    inputSchema: {},
  },
  async () => {
    try {
      const body = await api("/api/autonomous");
      return ok(body);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

// --- ask_user: kullanıcıya soru sor + cevap bekle -----------------------------

server.registerTool(
  "ask_user",
  {
    description:
      "Kullanıcıya bir soru sor ve cevabını BEKLE. Bloke eder (SSE üzerinden dinler). " +
      "Kullanım: bir karar belirsizse, kapsam dışı bir şey istendi mi onayı gerekiyorsa, " +
      "iki yoldan hangisini seçeceğin net değilse. Otomatik karar verme — kullanıcıyı sıkıştır. " +
      "choices verirsen kullanıcı UI'da buton görür (Telegram'da numara seçer). " +
      "Sorduğun şey net ve sıkı olsun: 'X mi Y mi?' tarzı, 'açıklama yaz' değil. " +
      "Cevap geldiğinde answer alanı dolu döner. Timeout aşılırsa status='timeout', " +
      "kullanıcı reddederse 'cancelled' döner — o zaman kendi kararını ver veya işi durdur.",
    inputSchema: {
      question: z
        .string()
        .min(1)
        .max(5000)
        .describe("Kullanıcıya gidecek soru (1 cümle, net)"),
      choices: z
        .array(z.string().min(1).max(200))
        .max(8)
        .optional()
        .describe("Önceden tanımlı seçenekler (örn: ['Evet','Hayır','Detay ver']). Boş = serbest cevap"),
      timeout_seconds: z
        .number()
        .int()
        .min(10)
        .max(86_400)
        .default(1800)
        .describe("Maks bekleme süresi (10sn - 24sa). Default 30dk."),
      task_id: z
        .string()
        .optional()
        .describe("Bağlı task UUID (opsiyonel)"),
    },
  },
  async ({ question, choices, timeout_seconds, task_id }) => {
    try {
      const created = await api("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          question,
          choices: choices ?? null,
          taskId: task_id ?? null,
          timeoutSeconds: timeout_seconds,
        }),
      });
      const qid = created.question.id;
      const result = await waitForAnswer(qid, timeout_seconds * 1000 + 5000);
      return ok(result);
    } catch (err) {
      return fail(err.message ?? String(err));
    }
  },
);

/** Soru cevabını SSE ile bekle; timeout/cancelled/answered hepsi result döner. */
async function waitForAnswer(questionId, timeoutMs) {
  const url = `${API_BASE}/api/questions/${questionId}/stream`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
        let ev;
        try {
          ev = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (ev.type === "question.snapshot" && ev.question?.status !== "pending") {
          return ev.question;
        }
        if (
          ev.type === "question.answered" ||
          ev.type === "question.cancelled" ||
          ev.type === "question.timeout"
        ) {
          return ev.question;
        }
      }
    }
    return { id: questionId, status: "timeout", answer: null };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

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
