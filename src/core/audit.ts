// Audit log — sistemde kim ne zaman ne yaptı.
// scan başlatma, worker spawn/kill, webhook, toggle gibi olayları kaydeder.

import { prisma } from "@/lib/db";

export async function audit(
  action: string,
  target?: string | null,
  detail?: Record<string, unknown>,
  actor?: string | null,
): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        action,
        target: target ?? null,
        detail: detail ? JSON.stringify(detail) : null,
        actor: actor ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] insert failed", e);
  }
}

export interface AuditRow {
  id: string;
  actor: string | null;
  action: string;
  target: string | null;
  detail: unknown;
  createdAt: string;
}

export async function listAudit(limit = 100, action?: string): Promise<AuditRow[]> {
  const rows = await prisma.auditEvent.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    target: r.target,
    detail: r.detail ? safeJson(r.detail) : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
