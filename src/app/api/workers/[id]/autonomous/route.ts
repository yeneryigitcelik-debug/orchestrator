// POST /api/workers/:id/autonomous — autonomous mode on/off

import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";

const Schema = z.object({
  value: z.boolean(),
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
      { error: "value gerekli (boolean)" },
      { status: 400 },
    );
  }

  orchestrator.setAutonomous(id, parsed.data.value);
  return NextResponse.json({ ok: true });
}
