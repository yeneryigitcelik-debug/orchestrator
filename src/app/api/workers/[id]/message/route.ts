// POST /api/workers/:id/message — worker'a kullanıcı mesajı gönder

import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";

const Schema = z.object({
  text: z.string().min(1).max(50_000),
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
      { error: "text gerekli", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await orchestrator.send(id, parsed.data.text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gönderim başarısız" },
      { status: 500 },
    );
  }
}
