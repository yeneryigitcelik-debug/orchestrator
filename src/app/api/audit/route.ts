// GET /api/audit?limit=100&action=<filter> — audit log

import { NextResponse } from "next/server";
import { listAudit } from "@/core/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10) || 100;
  const action = url.searchParams.get("action") ?? undefined;
  const events = await listAudit(limit, action);
  return NextResponse.json({ events });
}
