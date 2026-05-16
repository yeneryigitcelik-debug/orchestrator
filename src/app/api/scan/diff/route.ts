// GET /api/scan/diff?head=<id>&base=<id> — iki taramayı karşılaştır

import { NextResponse } from "next/server";
import { diffScans } from "@/core/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const head = url.searchParams.get("head");
  const base = url.searchParams.get("base");
  if (!head || !base) {
    return NextResponse.json(
      { error: "head ve base query parametreleri gerekli" },
      { status: 400 },
    );
  }
  const diff = await diffScans(head, base);
  if (!diff) {
    return NextResponse.json({ error: "scan bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ diff });
}
