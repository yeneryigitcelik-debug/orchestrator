// GET /api/scan/drift?repo=<path>&days=30 — repo'nun severity trendi

import { NextResponse } from "next/server";
import { driftFor } from "@/core/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo");
  const days = parseInt(url.searchParams.get("days") ?? "30", 10) || 30;
  if (!repo) {
    return NextResponse.json({ error: "repo query parametresi gerekli" }, { status: 400 });
  }
  const series = await driftFor(repo, days);
  return NextResponse.json({ repo, days, series });
}
