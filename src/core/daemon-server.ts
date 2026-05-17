// Orchestrator daemon — bağımsız Node process'i.
//
// Worker subprocess'lerini, pubsub'ı ve TÜM Prisma DB erişimini bu process
// taşır. Next.js (UI + API) ayrı bir process'tir ve buraya HTTP/SSE ile proxy
// yapar. Böylece Next çökse/yeniden başlasa bile worker'lar hayatta kalır.
//
// HTTP API yolları Next'in eski /api/* şekliyle birebir aynıdır — Next proxy'si
// ve MCP server yalnız base URL değiştirir, yol/yanıt aynı kalır.
//
// Çalıştırma: node --import tsx --env-file-if-exists=.env src/core/daemon-server.ts
// (launcher: scripts/start.mjs / scripts/dev.mjs)

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { orchestrator } from "./orchestrator";
import { pubsub } from "../lib/pubsub";
import {
  startScan,
  listScans,
  getScan,
  diffScans,
  driftFor,
} from "./scan";
import { exportScan } from "./export";
import { audit, listAudit } from "./audit";
import { getUsageSummary } from "./usage";
import { REVIEW_ROLES } from "./types";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DAEMON_PORT ?? 3006);
const MAX_BODY = 20 * 1024 * 1024; // 20 MB

// --- şema doğrulama (daemon güvenlik sınırı — MCP doğrudan buraya çağırır) ---

const SpawnSchema = z.object({
  name: z.string().min(1).max(64),
  role: z.enum([
    "lead",
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
  ]),
  // boş → orchestrator.spawn rolün preset default'unu enjekte eder (opus'a düşmez)
  model: z.string().optional(),
  cwd: z.string().min(1),
  systemPrompt: z.string().optional(),
  permissionMode: z
    .enum(["bypassPermissions", "acceptEdits", "default"])
    .optional(),
  resumeSessionId: z.string().uuid().optional(),
  goal: z.string().optional(),
  autonomous: z.boolean().optional(),
});

const ScanSchema = z.object({
  repo: z.string().min(1),
  roles: z.array(z.enum(REVIEW_ROLES as [string, ...string[]])).optional(),
  skills: z.record(z.string(), z.array(z.string())).optional(),
});

const MessageSchema = z.object({ text: z.string().min(1).max(50_000) });
const GoalSchema = z.object({ goal: z.string().min(1).max(20_000) });
const AutonomousSchema = z.object({ value: z.boolean() });
const AuditSchema = z.object({
  action: z.string().min(1),
  target: z.string().nullish(),
  detail: z.record(z.string(), z.unknown()).nullish(),
  actor: z.string().nullish(),
});

// --- HTTP yardımcıları ---

function sendJSON(res: ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c: Buffer) => {
      data += c.toString("utf8");
      if (data.length > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function readJSON(req: IncomingMessage): Promise<unknown> {
  const text = await readBody(req);
  return text ? JSON.parse(text) : {};
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/** SSE bağlantısı kur; cleanup fonksiyonu döner. heartbeat + close yönetir. */
function sseStart(
  req: IncomingMessage,
  res: ServerResponse,
): { send: (obj: unknown) => void; onClose: (fn: () => void) => void } {
  res.writeHead(200, SSE_HEADERS);
  const send = (obj: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    } catch {
      /* bağlantı kapanmış olabilir */
    }
  };
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);
  const closeFns: Array<() => void> = [
    () => clearInterval(heartbeat),
  ];
  const fire = () => {
    for (const fn of closeFns) {
      try {
        fn();
      } catch {
        /* yoksay */
      }
    }
    try {
      res.end();
    } catch {
      /* yoksay */
    }
  };
  req.on("close", fire);
  return { send, onClose: (fn) => closeFns.push(fn) };
}

// --- worker handler'ları ---

function workerListResponse(res: ServerResponse): void {
  sendJSON(res, 200, { workers: orchestrator.list() });
}

async function workerSpawn(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = SpawnSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  try {
    const snapshot = await orchestrator.spawn(parsed.data);
    sendJSON(res, 201, { worker: snapshot });
  } catch (err) {
    sendJSON(res, 500, {
      error: err instanceof Error ? err.message : "Spawn başarısız",
    });
  }
}

function workerGet(id: string, res: ServerResponse): void {
  const worker = orchestrator.get(id);
  if (!worker) return sendJSON(res, 404, { error: "Bulunamadı" });
  sendJSON(res, 200, {
    worker: {
      id: worker.id,
      name: worker.config.name,
      role: worker.config.role,
      model: worker.config.model,
      cwd: worker.config.cwd,
      sessionId: worker.sessionId,
      status: worker.status,
      messageCount: worker.history().length,
    },
  });
}

async function workerStop(id: string, res: ServerResponse): Promise<void> {
  try {
    await orchestrator.stop(id);
    sendJSON(res, 200, { ok: true });
  } catch (err) {
    sendJSON(res, 500, {
      error: err instanceof Error ? err.message : "Durdurma başarısız",
    });
  }
}

async function workerMessage(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "text gerekli", issues: parsed.error.issues });
  }
  try {
    await orchestrator.send(id, parsed.data.text);
    sendJSON(res, 200, { ok: true });
  } catch (err) {
    sendJSON(res, 500, {
      error: err instanceof Error ? err.message : "Gönderim başarısız",
    });
  }
}

async function workerGoalSet(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = GoalSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "goal gerekli", issues: parsed.error.issues });
  }
  try {
    await orchestrator.assignGoal(id, parsed.data.goal);
    sendJSON(res, 200, { ok: true });
  } catch (err) {
    sendJSON(res, 500, {
      error: err instanceof Error ? err.message : "Atama başarısız",
    });
  }
}

async function workerGoalClear(id: string, res: ServerResponse): Promise<void> {
  await orchestrator.clearGoal(id);
  sendJSON(res, 200, { ok: true });
}

async function workerAutonomous(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = AutonomousSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "value gerekli (boolean)" });
  }
  orchestrator.setAutonomous(id, parsed.data.value);
  sendJSON(res, 200, { ok: true });
}

async function leadGet(res: ServerResponse): Promise<void> {
  try {
    const lead = await orchestrator.ensureLead();
    sendJSON(res, 200, { lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[daemon] ensureLead failed:", err);
    sendJSON(res, 500, { error: message });
  }
}

// --- scan handler'ları ---

async function scanStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = ScanSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  try {
    const handle = await startScan({
      repo: parsed.data.repo,
      roles: parsed.data.roles as never,
      skills: parsed.data.skills,
    });
    sendJSON(res, 201, { scan: handle });
  } catch (err) {
    sendJSON(res, 500, {
      error: err instanceof Error ? err.message : "Scan başlatılamadı",
    });
  }
}

async function scanGet(id: string, res: ServerResponse): Promise<void> {
  const scan = await getScan(id);
  if (!scan) return sendJSON(res, 404, { error: "Scan bulunamadı" });
  sendJSON(res, 200, { scan });
}

async function scanDiff(url: URL, res: ServerResponse): Promise<void> {
  const head = url.searchParams.get("head");
  const base = url.searchParams.get("base");
  if (!head || !base) {
    return sendJSON(res, 400, {
      error: "head ve base query parametreleri gerekli",
    });
  }
  const diff = await diffScans(head, base);
  if (!diff) return sendJSON(res, 404, { error: "scan bulunamadı" });
  sendJSON(res, 200, { diff });
}

async function scanDrift(url: URL, res: ServerResponse): Promise<void> {
  const repo = url.searchParams.get("repo");
  const days = parseInt(url.searchParams.get("days") ?? "30", 10) || 30;
  if (!repo) {
    return sendJSON(res, 400, { error: "repo query parametresi gerekli" });
  }
  const series = await driftFor(repo, days);
  sendJSON(res, 200, { repo, days, series });
}

async function scanExport(
  id: string,
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const fmt = (url.searchParams.get("format") ?? "json").toLowerCase();
  if (fmt !== "json" && fmt !== "csv" && fmt !== "sarif") {
    return sendJSON(res, 400, { error: "format json|csv|sarif olmalı" });
  }
  const result = await exportScan(id, fmt);
  if (!result) return sendJSON(res, 404, { error: "scan bulunamadı" });
  res.writeHead(200, {
    "Content-Type": result.contentType,
    "Content-Disposition": `attachment; filename="${result.filename}"`,
  });
  res.end(result.body);
}

// --- audit handler'ları ---

async function auditGet(url: URL, res: ServerResponse): Promise<void> {
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10) || 100;
  const action = url.searchParams.get("action") ?? undefined;
  const events = await listAudit(limit, action);
  sendJSON(res, 200, { events });
}

async function auditPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = AuditSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "action gerekli" });
  }
  await audit(
    parsed.data.action,
    parsed.data.target ?? null,
    parsed.data.detail ?? undefined,
    parsed.data.actor ?? null,
  );
  sendJSON(res, 200, { ok: true });
}

// --- SSE handler'ları ---

function streamWorker(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const worker = orchestrator.get(id);
  if (!worker) return sendJSON(res, 404, { error: "Worker bulunamadı" });
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", workerId: id, ts: Date.now() });
  for (const ev of worker.history()) send(ev);
  const unsub = pubsub.subscribe(id, send);
  onClose(unsub);
}

function streamAll(req: IncomingMessage, res: ServerResponse): void {
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", ts: Date.now() });
  const unsub = pubsub.subscribeAll((workerId, event) => {
    send({ workerId, event });
  });
  onClose(unsub);
}

function streamScan(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", scanId: id, ts: Date.now() });
  const unsub = pubsub.subscribe(`scan:${id}`, send);
  onClose(unsub);
}

// --- router ---

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://daemon");
  const seg = url.pathname.split("/").filter(Boolean);
  const m = req.method ?? "GET";

  if (url.pathname === "/health") {
    return sendJSON(res, 200, { ok: true, ts: Date.now() });
  }
  if (seg[0] !== "api") {
    return sendJSON(res, 404, { error: "not found" });
  }

  // /api/stream
  if (seg.length === 2 && seg[1] === "stream" && m === "GET") {
    return streamAll(req, res);
  }
  // /api/lead
  if (seg.length === 2 && seg[1] === "lead" && m === "GET") {
    return leadGet(res);
  }
  // /api/audit
  if (seg.length === 2 && seg[1] === "audit") {
    if (m === "GET") return auditGet(url, res);
    if (m === "POST") return auditPost(req, res);
  }
  // /api/usage — worker kullanım/maliyet özeti (salt-okuma)
  if (seg.length === 2 && seg[1] === "usage" && m === "GET") {
    return sendJSON(res, 200, { usage: await getUsageSummary() });
  }

  // /api/workers ...
  if (seg[1] === "workers") {
    const id = seg[2];
    if (seg.length === 2) {
      if (m === "GET") return workerListResponse(res);
      if (m === "POST") return workerSpawn(req, res);
    }
    if (seg.length === 3 && id) {
      if (m === "GET") return workerGet(id, res);
      if (m === "DELETE") return workerStop(id, res);
    }
    if (seg.length === 4 && id) {
      const sub = seg[3];
      if (sub === "message" && m === "POST") return workerMessage(id, req, res);
      if (sub === "goal" && m === "POST") return workerGoalSet(id, req, res);
      if (sub === "goal" && m === "DELETE") return workerGoalClear(id, res);
      if (sub === "autonomous" && m === "POST")
        return workerAutonomous(id, req, res);
      if (sub === "stream" && m === "GET") return streamWorker(id, req, res);
    }
  }

  // /api/scan ...
  if (seg[1] === "scan") {
    if (seg.length === 2) {
      if (m === "GET") return sendJSON(res, 200, { scans: await listScans() });
      if (m === "POST") return scanStart(req, res);
    }
    // literal segment'ler :id'den ÖNCE
    if (seg.length === 3 && seg[2] === "diff" && m === "GET") {
      return scanDiff(url, res);
    }
    if (seg.length === 3 && seg[2] === "drift" && m === "GET") {
      return scanDrift(url, res);
    }
    const id = seg[2];
    if (seg.length === 3 && id && m === "GET") return scanGet(id, res);
    if (seg.length === 4 && id && seg[3] === "export" && m === "GET") {
      return scanExport(id, url, res);
    }
    if (seg.length === 4 && id && seg[3] === "stream" && m === "GET") {
      return streamScan(id, req, res);
    }
  }

  sendJSON(res, 404, { error: `no route: ${m} ${url.pathname}` });
}

// --- server + boot ---

const server = createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error("[daemon] route error", err);
    if (!res.headersSent) {
      sendJSON(res, 500, {
        error: err instanceof Error ? err.message : "Sunucu hatası",
      });
    } else {
      try {
        res.end();
      } catch {
        /* yoksay */
      }
    }
  });
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[daemon] ${signal} alındı, shutdown...`);
  try {
    await orchestrator.shutdownAll();
  } catch (err) {
    console.error("[daemon] shutdown error", err);
  }
  process.exit(0);
}

server.listen(PORT, HOST, async () => {
  console.log(`[daemon] orchestrator daemon dinliyor → http://${HOST}:${PORT}`);

  // DAEMON_SKIP_BOOT=1 → yalnız HTTP katmanı (smoke test / debug); worker yok.
  if (process.env.DAEMON_SKIP_BOOT === "1") {
    console.log("[daemon] DAEMON_SKIP_BOOT=1 — worker restore + Lead atlandı");
    return;
  }

  // DB'den ölmemiş worker'ları geri yükle
  try {
    const { restored, skipped } = await orchestrator.restoreFromDB();
    if (restored > 0 || skipped > 0) {
      console.log(`[daemon] restore: restored=${restored} skipped=${skipped}`);
    }
  } catch (err) {
    console.error("[daemon] restore failed", err);
  }

  // Lead'i garantile — kullanıcı yalnız Lead ile konuşur
  try {
    await orchestrator.ensureLead();
  } catch (err) {
    console.error("[daemon] Lead ensure failed", err);
  }
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("beforeExit", () => {
  orchestrator.shutdownAll().catch(() => {});
});

// Daemon hayatta kalsın — tek bir kaçak hata TÜM worker'ları düşürmesin.
// Hatayı loglayıp devam et; daemon gerçekten ölürse launcher yeniden başlatır
// ve restoreFromDB worker'ları DB'den kurtarır.
process.on("uncaughtException", (err) => {
  console.error("[daemon] uncaughtException — daemon ayakta tutuluyor:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[daemon] unhandledRejection:", reason);
});
