// GET /api/scan/[id]/export?format=json|csv|sarif

import { NextResponse } from "next/server";
import { exportScan } from "@/core/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fmt = (new URL(req.url).searchParams.get("format") ?? "json").toLowerCase();
  if (fmt !== "json" && fmt !== "csv" && fmt !== "sarif") {
    return NextResponse.json(
      { error: "format json|csv|sarif olmalı" },
      { status: 400 },
    );
  }
  const result = await exportScan(id, fmt);
  if (!result) {
    return NextResponse.json({ error: "scan bulunamadı" }, { status: 404 });
  }
  return new Response(result.body, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
