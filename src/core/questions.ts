// User-question store + bekleme mantığı.
// Lead'in (veya helper'ın) MCP üzerinden ask_user çağırması bu modülü kullanır.
// HTTP route'undan POST geldiğinde DB'ye yazılır, pubsub'a "question.asked" basılır.
// MCP server SSE veya polling ile cevap bekler.

import { prisma } from "../lib/db";
import { pubsub } from "../lib/pubsub";

export interface AskQuestionInput {
  workerId?: string | null;
  taskId?: string | null;
  runId?: string | null;
  question: string;
  choices?: string[] | null;
  timeoutSeconds?: number | null;
}

export async function askQuestion(input: AskQuestionInput) {
  const timeoutAt =
    input.timeoutSeconds && input.timeoutSeconds > 0
      ? new Date(Date.now() + input.timeoutSeconds * 1000)
      : null;
  const q = await prisma.userQuestion.create({
    data: {
      workerId: input.workerId ?? null,
      taskId: input.taskId ?? null,
      runId: input.runId ?? null,
      question: input.question,
      choices: input.choices ? JSON.stringify(input.choices) : null,
      timeoutAt,
    },
  });
  const serialized = serializeQuestion(q);
  pubsub.publish("autonomous", {
    type: "question.asked",
    question: serialized,
    ts: Date.now(),
  });
  return serialized;
}

export async function answerQuestion(id: string, answer: string) {
  const q = await prisma.userQuestion.findUnique({ where: { id } });
  if (!q) throw new Error("Soru bulunamadı");
  if (q.status !== "pending") {
    return serializeQuestion(q);
  }
  const updated = await prisma.userQuestion.update({
    where: { id },
    data: { status: "answered", answer, answeredAt: new Date() },
  });
  const serialized = serializeQuestion(updated);
  pubsub.publish("autonomous", {
    type: "question.answered",
    question: serialized,
    ts: Date.now(),
  });
  // Bu soruyu bekleyen MCP istekleri için spesifik topic'e de bas
  pubsub.publish(`question:${id}`, {
    type: "question.answered",
    question: serialized,
    ts: Date.now(),
  });
  return serialized;
}

export async function cancelQuestion(id: string) {
  const q = await prisma.userQuestion.update({
    where: { id },
    data: { status: "cancelled" },
  });
  const serialized = serializeQuestion(q);
  pubsub.publish("autonomous", {
    type: "question.cancelled",
    question: serialized,
    ts: Date.now(),
  });
  pubsub.publish(`question:${id}`, {
    type: "question.cancelled",
    question: serialized,
    ts: Date.now(),
  });
  return serialized;
}

export async function getQuestion(id: string) {
  const q = await prisma.userQuestion.findUnique({ where: { id } });
  return q ? serializeQuestion(q) : null;
}

export async function listPendingQuestions() {
  const rows = await prisma.userQuestion.findMany({
    where: { status: "pending" },
    orderBy: { askedAt: "asc" },
    take: 50,
  });
  return rows.map(serializeQuestion);
}

export async function listRecentQuestions(limit = 30) {
  const rows = await prisma.userQuestion.findMany({
    orderBy: { askedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(serializeQuestion);
}

/** Süresi geçmiş pending soruları timeout olarak kapatır (cron tarafından çağrılır). */
export async function expireOldQuestions() {
  const now = new Date();
  const expired = await prisma.userQuestion.findMany({
    where: {
      status: "pending",
      timeoutAt: { lt: now, not: null },
    },
  });
  for (const q of expired) {
    await prisma.userQuestion.update({
      where: { id: q.id },
      data: { status: "timeout", answeredAt: now },
    });
    pubsub.publish(`question:${q.id}`, {
      type: "question.timeout",
      question: serializeQuestion({ ...q, status: "timeout" }),
      ts: Date.now(),
    });
  }
  return expired.length;
}

function serializeQuestion(q: {
  id: string;
  workerId: string | null;
  taskId: string | null;
  runId: string | null;
  question: string;
  choices: string | null;
  status: string;
  answer: string | null;
  askedAt: Date;
  answeredAt: Date | null;
  timeoutAt: Date | null;
}) {
  return {
    id: q.id,
    workerId: q.workerId,
    taskId: q.taskId,
    runId: q.runId,
    question: q.question,
    choices: q.choices ? (JSON.parse(q.choices) as string[]) : null,
    status: q.status,
    answer: q.answer,
    askedAt: q.askedAt.toISOString(),
    answeredAt: q.answeredAt?.toISOString() ?? null,
    timeoutAt: q.timeoutAt?.toISOString() ?? null,
  };
}
