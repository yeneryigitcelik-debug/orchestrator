// REST: DELETE /api/workers/:id — durdur ve sil

import { NextResponse } from "next/server";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await orchestrator.stop(id);
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const worker = orchestrator.get(id);
  if (!worker) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({
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
