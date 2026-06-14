// Autonomous mode için DB erişim katmanı.
// Task backlog, thought günlüğü, autonomous run kayıtları, config key-value.
// SADECE daemon process'inde çalışır (prisma kullanır).

import { prisma } from "../lib/db";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "blocked"
  | "cancelled";

export type TaskSource = "user" | "lead-ideation" | "scheduler" | "telegram";

export type ThoughtType =
  | "observation"
  | "idea"
  | "question"
  | "decision"
  | "plan"
  | "checkpoint"
  | "drift-alarm"
  | "rationale";

// --- Config (key-value) ---

export interface AutonomousConfig {
  autonomousMode: boolean;
  maxIterations: number;
  checkpointEvery: number;
  ideationCooldownMs: number;
  tickIntervalMs: number;
  currentRunId: string | null;
}

const CONFIG_DEFAULTS: AutonomousConfig = {
  autonomousMode: false,
  maxIterations: 50,
  checkpointEvery: 10,
  ideationCooldownMs: 5 * 60_000,
  tickIntervalMs: 30_000,
  currentRunId: null,
};

export async function getConfig(): Promise<AutonomousConfig> {
  const rows = await prisma.config.findMany();
  const out: Record<string, unknown> = { ...CONFIG_DEFAULTS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      // ignore — config bozulmuşsa default'ta kal
    }
  }
  return out as unknown as AutonomousConfig;
}

export async function setConfig(
  patch: Partial<AutonomousConfig>,
): Promise<AutonomousConfig> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  for (const [key, value] of entries) {
    await prisma.config.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    });
  }
  return getConfig();
}

// --- Task backlog ---

export interface NewTaskInput {
  title: string;
  description?: string | null;
  priority?: number;
  source?: TaskSource;
  cwd?: string | null;
  goal?: string | null;
}

export async function addTask(input: NewTaskInput) {
  return prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 5,
      source: input.source ?? "user",
      cwd: input.cwd ?? null,
      goal: input.goal ?? null,
    },
  });
}

export async function listTasks(filter: { status?: TaskStatus } = {}) {
  return prisma.task.findMany({
    where: filter.status ? { status: filter.status } : undefined,
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
}

/** En öncelikli pending task'i in_progress'e çek (atomik). null = backlog boş. */
export async function claimNextTask(runId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const next = await tx.task.findFirst({
      where: { status: "pending" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    if (!next) return null;
    return tx.task.update({
      where: { id: next.id },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        runId: runId ?? null,
      },
    });
  });
}

export async function completeTask(id: string, result?: string) {
  return prisma.task.update({
    where: { id },
    data: {
      status: "done",
      result: result ?? null,
      completedAt: new Date(),
    },
  });
}

export async function blockTask(id: string, reason: string) {
  return prisma.task.update({
    where: { id },
    data: {
      status: "blocked",
      blockReason: reason,
    },
  });
}

export async function cancelTask(id: string) {
  return prisma.task.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

export async function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    priority: number;
    cwd: string | null;
    goal: string | null;
    status: TaskStatus;
  }>,
) {
  return prisma.task.update({ where: { id }, data: patch });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({ where: { id } });
}

// --- Thoughts (Lead'in düşünme günlüğü) ---

export interface NewThoughtInput {
  content: string;
  type: ThoughtType;
  workerId?: string | null;
  taskId?: string | null;
  runId?: string | null;
}

export async function logThought(input: NewThoughtInput) {
  return prisma.thought.create({
    data: {
      content: input.content,
      type: input.type,
      workerId: input.workerId ?? null,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
    },
  });
}

export async function recallThoughts(
  filter: {
    type?: ThoughtType;
    runId?: string;
    taskId?: string;
    limit?: number;
  } = {},
) {
  return prisma.thought.findMany({
    where: {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.runId ? { runId: filter.runId } : {}),
      ...(filter.taskId ? { taskId: filter.taskId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(filter.limit ?? 50, 1), 500),
  });
}

// --- AutonomousRun ---

export async function startRun(triggeredBy: "user" | "scheduler" | "telegram" = "user") {
  const run = await prisma.autonomousRun.create({
    data: { triggeredBy },
  });
  await setConfig({ currentRunId: run.id });
  return run;
}

export async function endRun(
  runId: string,
  reason: string,
  summary?: string,
) {
  const run = await prisma.autonomousRun.update({
    where: { id: runId },
    data: {
      endedAt: new Date(),
      terminatedReason: reason,
      summary: summary ?? null,
    },
  });
  await setConfig({ currentRunId: null });
  return run;
}

export async function bumpRunIterations(runId: string) {
  return prisma.autonomousRun.update({
    where: { id: runId },
    data: { iterations: { increment: 1 } },
  });
}

export async function bumpRunTaskCount(runId: string) {
  return prisma.autonomousRun.update({
    where: { id: runId },
    data: { tasksCompleted: { increment: 1 } },
  });
}

export async function bumpRunCheckpoints(runId: string) {
  return prisma.autonomousRun.update({
    where: { id: runId },
    data: { checkpointsHit: { increment: 1 } },
  });
}

export async function getCurrentRun() {
  const cfg = await getConfig();
  if (!cfg.currentRunId) return null;
  return prisma.autonomousRun.findUnique({
    where: { id: cfg.currentRunId },
  });
}

export async function listRuns(limit = 20) {
  return prisma.autonomousRun.findMany({
    orderBy: { startedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

// --- ScheduledJob ---

export interface NewScheduledJobInput {
  name: string;
  cron: string;
  prompt: string;
  kind?: "lead-message" | "create-task" | "scan-repo" | "memory-lint";
  payload?: Record<string, unknown> | null;
  enabled?: boolean;
}

export async function listScheduledJobs() {
  return prisma.scheduledJob.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function upsertScheduledJob(input: NewScheduledJobInput) {
  return prisma.scheduledJob.upsert({
    where: { name: input.name },
    create: {
      name: input.name,
      cron: input.cron,
      prompt: input.prompt,
      kind: input.kind ?? "lead-message",
      payload: input.payload ? JSON.stringify(input.payload) : null,
      enabled: input.enabled ?? true,
    },
    update: {
      cron: input.cron,
      prompt: input.prompt,
      kind: input.kind ?? "lead-message",
      payload: input.payload ? JSON.stringify(input.payload) : null,
      enabled: input.enabled ?? true,
    },
  });
}

export async function setScheduledJobEnabled(id: string, enabled: boolean) {
  return prisma.scheduledJob.update({
    where: { id },
    data: { enabled },
  });
}

export async function deleteScheduledJob(id: string) {
  return prisma.scheduledJob.delete({ where: { id } });
}

export async function recordScheduledRun(
  id: string,
  ok: boolean,
  error?: string,
) {
  return prisma.scheduledJob.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      lastError: ok ? null : (error ?? "unknown error"),
    },
  });
}

// --- Summary (anti-drift: kullanıcı 24h aralıkta neler oldu, hızlı bak) ---

export interface PeriodSummary {
  hours: number;
  since: string;
  now: string;
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    blocked: number;
    cancelled: number;
    completedTitles: string[];
    blockedTitles: string[];
  };
  thoughts: {
    total: number;
    byType: Record<string, number>;
    latestCheckpoints: { content: string; createdAt: string }[];
    latestDriftAlarms: { content: string; createdAt: string }[];
  };
  runs: {
    total: number;
    list: {
      id: string;
      startedAt: string;
      endedAt: string | null;
      iterations: number;
      tasksCompleted: number;
      checkpointsHit: number;
      terminatedReason: string | null;
      triggeredBy: string;
    }[];
  };
  scheduledJobsFired: number;
  questionsAsked: number;
  questionsAnswered: number;
}

export async function getPeriodSummary(hours = 24): Promise<PeriodSummary> {
  const since = new Date(Date.now() - hours * 60 * 60_000);
  const now = new Date();

  const tasksAll = await prisma.task.findMany({
    where: { OR: [{ createdAt: { gte: since } }, { completedAt: { gte: since } }] },
    orderBy: { createdAt: "desc" },
  });
  const byStatus = { pending: 0, in_progress: 0, done: 0, blocked: 0, cancelled: 0 };
  for (const t of tasksAll) {
    const s = t.status as keyof typeof byStatus;
    if (s in byStatus) byStatus[s] += 1;
  }
  const completedTitles = tasksAll
    .filter((t) => t.status === "done" && t.completedAt && t.completedAt >= since)
    .slice(0, 30)
    .map((t) => t.title);
  const blockedTitles = tasksAll
    .filter((t) => t.status === "blocked")
    .slice(0, 20)
    .map((t) => t.title);

  const thoughts = await prisma.thought.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  const byType: Record<string, number> = {};
  for (const th of thoughts) {
    byType[th.type] = (byType[th.type] ?? 0) + 1;
  }
  const latestCheckpoints = thoughts
    .filter((t) => t.type === "checkpoint")
    .slice(0, 5)
    .map((t) => ({ content: t.content.slice(0, 600), createdAt: t.createdAt.toISOString() }));
  const latestDriftAlarms = thoughts
    .filter((t) => t.type === "drift-alarm")
    .slice(0, 5)
    .map((t) => ({ content: t.content.slice(0, 600), createdAt: t.createdAt.toISOString() }));

  const runs = await prisma.autonomousRun.findMany({
    where: { startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
  });

  const jobsFired = await prisma.scheduledJob.count({
    where: { lastRunAt: { gte: since } },
  });

  const qAsked = await prisma.userQuestion.count({
    where: { askedAt: { gte: since } },
  });
  const qAnswered = await prisma.userQuestion.count({
    where: { askedAt: { gte: since }, status: "answered" },
  });

  return {
    hours,
    since: since.toISOString(),
    now: now.toISOString(),
    tasks: {
      total: tasksAll.length,
      pending: byStatus.pending,
      inProgress: byStatus.in_progress,
      done: byStatus.done,
      blocked: byStatus.blocked,
      cancelled: byStatus.cancelled,
      completedTitles,
      blockedTitles,
    },
    thoughts: {
      total: thoughts.length,
      byType,
      latestCheckpoints,
      latestDriftAlarms,
    },
    runs: {
      total: runs.length,
      list: runs.map((r) => ({
        id: r.id,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
        iterations: r.iterations,
        tasksCompleted: r.tasksCompleted,
        checkpointsHit: r.checkpointsHit,
        terminatedReason: r.terminatedReason,
        triggeredBy: r.triggeredBy,
      })),
    },
    scheduledJobsFired: jobsFired,
    questionsAsked: qAsked,
    questionsAnswered: qAnswered,
  };
}
