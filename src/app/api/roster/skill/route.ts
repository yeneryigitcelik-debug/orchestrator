// Skill CRUD.
//   GET    /api/roster/skill?role=X&name=Y   → { content }
//   POST   /api/roster/skill   body {role,name,content}  → oluştur/güncelle
//   DELETE /api/roster/skill?role=X&name=Y   → sil

import { NextResponse } from "next/server";
import { z } from "zod";
import { readSkill, writeSkill, deleteSkill } from "@/core/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "";
  const name = url.searchParams.get("name") ?? "";
  try {
    const content = readSkill(role, name);
    if (content === null) {
      return NextResponse.json({ error: "Skill bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ role, name, content });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 400 });
  }
}

const PostSchema = z.object({
  role: z.string().min(1),
  name: z.string().min(1).max(64),
  content: z.string().max(50_000),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz parametre", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    writeSkill(parsed.data.role, parsed.data.name, parsed.data.content);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "";
  const name = url.searchParams.get("name") ?? "";
  try {
    deleteSkill(role, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 400 });
  }
}
