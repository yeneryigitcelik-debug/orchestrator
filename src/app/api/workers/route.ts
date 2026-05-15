// GET /api/workers — listele
// POST /api/workers — yeni worker spawn et (opsiyonel goal ile)

import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  model: z.string().default("claude-opus-4-7"),
  cwd: z.string().min(1),
  systemPrompt: z.string().optional(),
  permissionMode: z
    .enum(["bypassPermissions", "acceptEdits", "default"])
    .optional(),
  resumeSessionId: z.string().uuid().optional(),
  goal: z.string().optional(),
  autonomous: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ workers: orchestrator.list() });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const parsed = SpawnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz parametre", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const snapshot = await orchestrator.spawn(parsed.data);
    return NextResponse.json({ worker: snapshot }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Spawn başarısız" },
      { status: 500 },
    );
  }
}
