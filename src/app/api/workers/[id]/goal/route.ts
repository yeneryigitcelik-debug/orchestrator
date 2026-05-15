// POST /api/workers/:id/goal — goal ata (worker otonom modda çalışmaya başlar)
// DELETE /api/workers/:id/goal — goal'i iptal et

import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";

const Schema = z.object({
  goal: z.string().min(1).max(20_000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "goal gerekli", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await orchestrator.assignGoal(id, parsed.data.goal);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Atama başarısız" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await orchestrator.clearGoal(id);
  return NextResponse.json({ ok: true });
}
