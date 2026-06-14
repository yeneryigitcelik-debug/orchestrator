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
import {
  addTask,
  blockTask,
  cancelTask,
  claimNextTask,
  completeTask,
  deleteScheduledJob,
  getConfig,
  getCurrentRun,
  getPeriodSummary,
  getTask,
  listRuns,
  listScheduledJobs,
  listTasks,
  logThought,
  recallThoughts,
  setConfig,
  setScheduledJobEnabled,
  updateTask,
  upsertScheduledJob,
  bumpRunCheckpoints,
  type TaskStatus,
  type ThoughtType,
} from "./autonomous-store";
import {
  writePage,
  readPage,
  listPages,
  readIndexDoc,
  searchMemory,
  lintMemory,
} from "./memory-store";
import { listProjectWikis } from "./memory-prompt";
import { autonomousController } from "./autonomous";
import { telegramBot } from "./telegram";
import { scheduler } from "./scheduler";
import {
  askQuestion,
  answerQuestion,
  cancelQuestion,
  getQuestion,
  listPendingQuestions,
  listRecentQuestions,
} from "./questions";

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

// --- autonomous şemaları ---

const TASK_STATUS = [
  "pending",
  "in_progress",
  "done",
  "blocked",
  "cancelled",
] as const;

const TaskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20_000).nullish(),
  priority: z.number().int().min(1).max(10).optional(),
  source: z.enum(["user", "lead-ideation", "scheduler", "telegram"]).optional(),
  cwd: z.string().nullish(),
  goal: z.string().max(20_000).nullish(),
});

const TaskPatchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20_000).nullish(),
  priority: z.number().int().min(1).max(10).optional(),
  cwd: z.string().nullish(),
  goal: z.string().max(20_000).nullish(),
  status: z.enum(TASK_STATUS).optional(),
});

const ThoughtSchema = z.object({
  content: z.string().min(1).max(20_000),
  type: z.enum([
    "observation",
    "idea",
    "question",
    "decision",
    "plan",
    "checkpoint",
    "drift-alarm",
    "rationale",
  ]),
  workerId: z.string().nullish(),
  taskId: z.string().nullish(),
  runId: z.string().nullish(),
});

const ConfigPatchSchema = z.object({
  autonomousMode: z.boolean().optional(),
  maxIterations: z.number().int().min(1).max(1000).optional(),
  checkpointEvery: z.number().int().min(1).max(100).optional(),
  ideationCooldownMs: z.number().int().min(1000).max(60 * 60_000).optional(),
  tickIntervalMs: z.number().int().min(5_000).max(10 * 60_000).optional(),
});

const ScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cron: z.string().min(1).max(100),
  prompt: z.string().min(1).max(20_000),
  kind: z.enum(["lead-message", "create-task", "scan-repo", "memory-lint"]).optional(),
  payload: z.record(z.string(), z.unknown()).nullish(),
  enabled: z.boolean().optional(),
});

const ScheduleEnabledSchema = z.object({ enabled: z.boolean() });

const QuestionSchema = z.object({
  question: z.string().min(1).max(5_000),
  choices: z.array(z.string().min(1).max(200)).max(8).nullish(),
  workerId: z.string().nullish(),
  taskId: z.string().nullish(),
  runId: z.string().nullish(),
  timeoutSeconds: z.number().int().min(10).max(86_400).nullish(),
});

const AnswerSchema = z.object({ answer: z.string().min(1).max(20_000) });

// --- memory (.agentwiki) şemaları ---

const MEMORY_TIER_ENUM = [
  "working",
  "episodic",
  "semantic",
  "procedural",
] as const;

const MemoryWriteSchema = z
  .object({
    project: z.string().min(1),
    tier: z.enum(MEMORY_TIER_ENUM),
    title: z.string().min(1).max(300),
    body: z.string().min(1).max(100_000),
    tags: z.array(z.string().max(60)).max(40).optional(),
    sources: z.array(z.string().max(300)).max(60).optional(),
    links: z.array(z.string().max(120)).max(60).optional(),
    slug: z.string().max(80).optional(),
  })
  .refine(
    (d) =>
      (d.tier !== "semantic" && d.tier !== "procedural") ||
      (d.sources?.length ?? 0) > 0,
    {
      message:
        "semantic/procedural tier için en az bir source (provenance) gerekli",
    },
  );

const MemoryReadSchema = z.object({
  project: z.string().min(1),
  path: z.string().min(1).max(300),
});

const MemoryQuerySchema = z.object({ project: z.string().min(1) });

const MemorySearchSchema = z.object({
  project: z.string().min(1),
  query: z.string().min(1).max(1000),
  k: z.number().int().min(1).max(30).optional(),
  tier: z.enum(MEMORY_TIER_ENUM).optional(),
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

// --- autonomous handler'ları ---

async function tasksList(url: URL, res: ServerResponse): Promise<void> {
  const status = url.searchParams.get("status") as TaskStatus | null;
  const tasks = await listTasks(status ? { status } : {});
  sendJSON(res, 200, { tasks });
}

async function tasksAdd(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = TaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  const task = await addTask(parsed.data);
  pubsub.publish("autonomous", { type: "task.added", task, ts: Date.now() });
  sendJSON(res, 201, { task });
}

async function tasksNext(res: ServerResponse): Promise<void> {
  const cfg = await getConfig();
  const task = await claimNextTask(cfg.currentRunId);
  if (task) {
    pubsub.publish("autonomous", { type: "task.claimed", task, ts: Date.now() });
  }
  sendJSON(res, 200, { task });
}

async function tasksGet(id: string, res: ServerResponse): Promise<void> {
  const task = await getTask(id);
  if (!task) return sendJSON(res, 404, { error: "Task bulunamadı" });
  sendJSON(res, 200, { task });
}

async function tasksPatch(
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
  const parsed = TaskPatchSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  const task = await updateTask(id, parsed.data);
  pubsub.publish("autonomous", { type: "task.updated", task, ts: Date.now() });
  sendJSON(res, 200, { task });
}

async function tasksComplete(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown = {};
  try {
    body = await readJSON(req);
  } catch {
    /* boş body kabul */
  }
  const result =
    body && typeof body === "object" && "result" in body
      ? String((body as { result: unknown }).result ?? "")
      : undefined;
  const task = await completeTask(id, result);
  pubsub.publish("autonomous", { type: "task.completed", task, ts: Date.now() });
  sendJSON(res, 200, { task });
}

async function tasksBlock(
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
  const reason =
    body && typeof body === "object" && "reason" in body
      ? String((body as { reason: unknown }).reason ?? "")
      : "";
  if (!reason) return sendJSON(res, 400, { error: "reason gerekli" });
  const task = await blockTask(id, reason);
  pubsub.publish("autonomous", { type: "task.blocked", task, ts: Date.now() });
  sendJSON(res, 200, { task });
}

async function tasksCancel(id: string, res: ServerResponse): Promise<void> {
  const task = await cancelTask(id);
  pubsub.publish("autonomous", { type: "task.cancelled", task, ts: Date.now() });
  sendJSON(res, 200, { task });
}

async function thoughtsList(url: URL, res: ServerResponse): Promise<void> {
  const type = url.searchParams.get("type") as ThoughtType | null;
  const runId = url.searchParams.get("runId") ?? undefined;
  const taskId = url.searchParams.get("taskId") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10) || 50;
  const thoughts = await recallThoughts({
    type: type ?? undefined,
    runId,
    taskId,
    limit,
  });
  sendJSON(res, 200, { thoughts });
}

async function thoughtsAdd(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = ThoughtSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  // Eğer runId verilmediyse mevcut run'a bağla
  const cfg = await getConfig();
  const thought = await logThought({
    ...parsed.data,
    runId: parsed.data.runId ?? cfg.currentRunId,
  });
  pubsub.publish("autonomous", { type: "thought.logged", thought, ts: Date.now() });
  sendJSON(res, 201, { thought });
}

// --- memory (.agentwiki) handler'ları ---

async function memoryWriteHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MemoryWriteSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  const { project, ...input } = parsed.data;
  const page = await writePage(project, input);
  pubsub.publish("memory", {
    type: "memory.write",
    project,
    path: page.path,
    tier: page.frontmatter.tier,
    ts: Date.now(),
  });
  sendJSON(res, 201, { page });
}

async function memoryReadHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MemoryReadSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  const page = await readPage(parsed.data.project, parsed.data.path);
  if (!page) return sendJSON(res, 404, { error: "Sayfa bulunamadı" });
  sendJSON(res, 200, { page });
}

async function memoryIndexHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MemoryQuerySchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  const [pages, index] = await Promise.all([
    listPages(parsed.data.project),
    readIndexDoc(parsed.data.project),
  ]);
  sendJSON(res, 200, { pages, index });
}

async function memorySearchHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MemorySearchSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  const hits = await searchMemory(parsed.data.project, parsed.data.query, {
    k: parsed.data.k,
    tier: parsed.data.tier,
  });
  sendJSON(res, 200, { hits });
}

async function memoryLintHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = MemoryQuerySchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, {
      error: "Geçersiz parametre",
      issues: parsed.error.issues,
    });
  }
  const report = await lintMemory(parsed.data.project);
  pubsub.publish("memory", {
    type: "memory.lint",
    project: parsed.data.project,
    ts: Date.now(),
  });
  sendJSON(res, 200, { report });
}

async function memoryProjectsHandler(res: ServerResponse): Promise<void> {
  const projects = await listProjectWikis();
  sendJSON(res, 200, { projects });
}

async function autonomousGet(res: ServerResponse): Promise<void> {
  const [config, currentRun] = await Promise.all([getConfig(), getCurrentRun()]);
  sendJSON(res, 200, {
    config,
    currentRun,
    controller: autonomousController.getState(),
  });
}

async function autonomousStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown = {};
  try {
    body = await readJSON(req);
  } catch {
    /* opsiyonel */
  }
  const triggeredBy =
    body && typeof body === "object" && "triggeredBy" in body
      ? ((body as { triggeredBy: unknown }).triggeredBy as
          | "user"
          | "scheduler"
          | "telegram")
      : "user";
  const run = await autonomousController.startAutonomous(triggeredBy);
  sendJSON(res, 201, { run });
}

async function autonomousStop(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown = {};
  try {
    body = await readJSON(req);
  } catch {
    /* opsiyonel */
  }
  const reason =
    body && typeof body === "object" && "reason" in body
      ? String((body as { reason: unknown }).reason ?? "user-stop")
      : "user-stop";
  const summary =
    body && typeof body === "object" && "summary" in body
      ? String((body as { summary: unknown }).summary ?? "")
      : undefined;
  const run = await autonomousController.stopAutonomous(reason, summary);
  sendJSON(res, 200, { run, stopped: true });
}

async function autonomousResume(res: ServerResponse): Promise<void> {
  autonomousController.resume();
  sendJSON(res, 200, { ok: true });
}

async function autonomousPause(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown = {};
  try {
    body = await readJSON(req);
  } catch {
    /* opsiyonel */
  }
  const reason =
    body && typeof body === "object" && "reason" in body
      ? String((body as { reason: unknown }).reason ?? "manual")
      : "manual";
  autonomousController.pause(reason);
  sendJSON(res, 200, { ok: true });
}

async function autonomousCheckpoint(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown = {};
  try {
    body = await readJSON(req);
  } catch {
    /* opsiyonel */
  }
  const summary =
    body && typeof body === "object" && "summary" in body
      ? String((body as { summary: unknown }).summary ?? "")
      : "";
  const cfg = await getConfig();
  const thought = await logThought({
    content: summary || "Checkpoint istendi (özet boş)",
    type: "checkpoint",
    runId: cfg.currentRunId,
  });
  if (cfg.currentRunId) await bumpRunCheckpoints(cfg.currentRunId);
  pubsub.publish("autonomous", {
    type: "checkpoint.requested",
    thought,
    ts: Date.now(),
  });
  sendJSON(res, 201, { thought });
}

async function autonomousConfigPatch(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = ConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  const config = await setConfig(parsed.data);
  pubsub.publish("autonomous", { type: "config.updated", config, ts: Date.now() });
  sendJSON(res, 200, { config });
}

async function autonomousRunsList(res: ServerResponse): Promise<void> {
  const runs = await listRuns();
  sendJSON(res, 200, { runs });
}

async function autonomousSummary(url: URL, res: ServerResponse): Promise<void> {
  const hours = parseInt(url.searchParams.get("hours") ?? "24", 10) || 24;
  const summary = await getPeriodSummary(Math.min(Math.max(hours, 1), 168));
  sendJSON(res, 200, { summary });
}

async function scheduleList(res: ServerResponse): Promise<void> {
  const jobs = await listScheduledJobs();
  sendJSON(res, 200, { jobs });
}

async function scheduleUpsert(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  const job = await upsertScheduledJob({
    ...parsed.data,
    payload: parsed.data.payload as Record<string, unknown> | null | undefined,
  });
  pubsub.publish("autonomous", { type: "schedule.updated", job, ts: Date.now() });
  sendJSON(res, 200, { job });
}

async function schedulePatch(
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
  const parsed = ScheduleEnabledSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "enabled gerekli (boolean)" });
  }
  const job = await setScheduledJobEnabled(id, parsed.data.enabled);
  pubsub.publish("autonomous", { type: "schedule.updated", job, ts: Date.now() });
  sendJSON(res, 200, { job });
}

async function scheduleDelete(id: string, res: ServerResponse): Promise<void> {
  await deleteScheduledJob(id);
  pubsub.publish("autonomous", { type: "schedule.deleted", id, ts: Date.now() });
  sendJSON(res, 200, { ok: true });
}

// --- question handler'ları ---

async function questionAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "Geçersiz JSON" });
  }
  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "Geçersiz parametre", issues: parsed.error.issues });
  }
  const q = await askQuestion({
    workerId: parsed.data.workerId ?? null,
    taskId: parsed.data.taskId ?? null,
    runId: parsed.data.runId ?? null,
    question: parsed.data.question,
    choices: parsed.data.choices ?? null,
    timeoutSeconds: parsed.data.timeoutSeconds ?? null,
  });
  sendJSON(res, 201, { question: q });
}

async function questionAnswer(
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
  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return sendJSON(res, 400, { error: "answer gerekli" });
  }
  try {
    const q = await answerQuestion(id, parsed.data.answer);
    sendJSON(res, 200, { question: q });
  } catch (err) {
    sendJSON(res, 404, {
      error: err instanceof Error ? err.message : "Cevaplanamadı",
    });
  }
}

async function questionCancel(id: string, res: ServerResponse): Promise<void> {
  try {
    const q = await cancelQuestion(id);
    sendJSON(res, 200, { question: q });
  } catch (err) {
    sendJSON(res, 404, {
      error: err instanceof Error ? err.message : "İptal edilemedi",
    });
  }
}

async function questionGet(id: string, res: ServerResponse): Promise<void> {
  const q = await getQuestion(id);
  if (!q) return sendJSON(res, 404, { error: "Soru bulunamadı" });
  sendJSON(res, 200, { question: q });
}

async function questionsList(url: URL, res: ServerResponse): Promise<void> {
  const pending = url.searchParams.get("pending") === "1";
  if (pending) {
    const questions = await listPendingQuestions();
    return sendJSON(res, 200, { questions });
  }
  const limit = parseInt(url.searchParams.get("limit") ?? "30", 10) || 30;
  const questions = await listRecentQuestions(limit);
  sendJSON(res, 200, { questions });
}

function streamQuestion(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", questionId: id, ts: Date.now() });
  // Mevcut durumu hemen gönder
  getQuestion(id).then((q) => {
    if (q) send({ type: "question.snapshot", question: q, ts: Date.now() });
  });
  const unsub = pubsub.subscribe(`question:${id}`, send);
  onClose(unsub);
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

function streamAutonomous(req: IncomingMessage, res: ServerResponse): void {
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", topic: "autonomous", ts: Date.now() });
  const unsub = pubsub.subscribe("autonomous", send);
  onClose(unsub);
}

function streamMemory(req: IncomingMessage, res: ServerResponse): void {
  const { send, onClose } = sseStart(req, res);
  send({ type: "_hello", topic: "memory", ts: Date.now() });
  const unsub = pubsub.subscribe("memory", send);
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

  // /api/tasks ...
  if (seg[1] === "tasks") {
    if (seg.length === 2) {
      if (m === "GET") return tasksList(url, res);
      if (m === "POST") return tasksAdd(req, res);
    }
    if (seg.length === 3 && seg[2] === "next" && m === "POST") {
      return tasksNext(res);
    }
    const id = seg[2];
    if (seg.length === 3 && id) {
      if (m === "GET") return tasksGet(id, res);
      if (m === "PATCH") return tasksPatch(id, req, res);
      if (m === "DELETE") return tasksCancel(id, res);
    }
    if (seg.length === 4 && id) {
      const sub = seg[3];
      if (sub === "complete" && m === "POST") return tasksComplete(id, req, res);
      if (sub === "block" && m === "POST") return tasksBlock(id, req, res);
      if (sub === "cancel" && m === "POST") return tasksCancel(id, res);
    }
  }

  // /api/thoughts ...
  if (seg[1] === "thoughts") {
    if (seg.length === 2) {
      if (m === "GET") return thoughtsList(url, res);
      if (m === "POST") return thoughtsAdd(req, res);
    }
  }

  // /api/memory ... (.agentwiki per-proje hafıza)
  if (seg[1] === "memory" && seg.length === 3) {
    if (m === "GET" && seg[2] === "stream") return streamMemory(req, res);
    if (m === "GET" && seg[2] === "projects") return memoryProjectsHandler(res);
    if (m === "POST") {
      if (seg[2] === "write") return memoryWriteHandler(req, res);
      if (seg[2] === "read") return memoryReadHandler(req, res);
      if (seg[2] === "index") return memoryIndexHandler(req, res);
      if (seg[2] === "search") return memorySearchHandler(req, res);
      if (seg[2] === "lint") return memoryLintHandler(req, res);
    }
  }

  // /api/autonomous ...
  if (seg[1] === "autonomous") {
    if (seg.length === 2 && m === "GET") return autonomousGet(res);
    if (seg.length === 3) {
      const sub = seg[2];
      if (sub === "start" && m === "POST") return autonomousStart(req, res);
      if (sub === "stop" && m === "POST") return autonomousStop(req, res);
      if (sub === "pause" && m === "POST") return autonomousPause(req, res);
      if (sub === "resume" && m === "POST") return autonomousResume(res);
      if (sub === "checkpoint" && m === "POST")
        return autonomousCheckpoint(req, res);
      if (sub === "config" && m === "PATCH")
        return autonomousConfigPatch(req, res);
      if (sub === "runs" && m === "GET") return autonomousRunsList(res);
      if (sub === "summary" && m === "GET") return autonomousSummary(url, res);
      if (sub === "stream" && m === "GET") return streamAutonomous(req, res);
    }
  }

  // /api/questions ...
  if (seg[1] === "questions") {
    if (seg.length === 2) {
      if (m === "GET") return questionsList(url, res);
      if (m === "POST") return questionAsk(req, res);
    }
    const id = seg[2];
    if (seg.length === 3 && id) {
      if (m === "GET") return questionGet(id, res);
      if (m === "DELETE") return questionCancel(id, res);
    }
    if (seg.length === 4 && id) {
      const sub = seg[3];
      if (sub === "answer" && m === "POST") return questionAnswer(id, req, res);
      if (sub === "cancel" && m === "POST") return questionCancel(id, res);
      if (sub === "stream" && m === "GET") return streamQuestion(id, req, res);
    }
  }

  // /api/schedule ...
  if (seg[1] === "schedule") {
    if (seg.length === 2) {
      if (m === "GET") return scheduleList(res);
      if (m === "POST") return scheduleUpsert(req, res);
    }
    const id = seg[2];
    if (seg.length === 3 && id) {
      if (m === "PATCH") return schedulePatch(id, req, res);
      if (m === "DELETE") return scheduleDelete(id, res);
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
    autonomousController.shutdown();
  } catch (err) {
    console.error("[daemon] autonomous shutdown error", err);
  }
  try {
    scheduler.shutdown();
  } catch (err) {
    console.error("[daemon] scheduler shutdown error", err);
  }
  try {
    await orchestrator.shutdownAll();
  } catch (err) {
    console.error("[daemon] orchestrator shutdown error", err);
  }
  process.exit(0);
}

server.listen(PORT, HOST, async () => {
  console.log(`[daemon] orchestrator daemon dinliyor → http://${HOST}:${PORT}`);

  // DAEMON_SKIP_BOOT=1 → worker restore + Lead'i atla (smoke test / debug).
  // Autonomous controller, Telegram bot, scheduler yine başlar — bunlar claude CLI'ye bağlı değil.
  const skipWorkers = process.env.DAEMON_SKIP_BOOT === "1";
  if (skipWorkers) {
    console.log("[daemon] DAEMON_SKIP_BOOT=1 — worker restore + Lead atlandı");
  } else {
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
  }

  // Autonomous controller'ı başlat — autonomousMode true ise tick döngüsü açılır
  try {
    await autonomousController.boot();
  } catch (err) {
    console.error("[daemon] autonomous controller boot failed", err);
  }

  // Telegram bot'u başlat — TOKEN yoksa sessizce devre dışı kalır
  try {
    await telegramBot.boot();
  } catch (err) {
    console.error("[daemon] telegram boot failed", err);
  }

  // Zamanlayıcı: DB'deki ScheduledJob'ları cron olarak kur
  try {
    await scheduler.boot();
  } catch (err) {
    console.error("[daemon] scheduler boot failed", err);
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
