// GET  /api/scan — son scan'leri listele
// POST /api/scan — yeni scan başlat (repo'yu review ajanslarına taratır)

import { NextResponse } from "next/server";
import { z } from "zod";
import { startScan, listScans } from "@/core/scan";
import { REVIEW_ROLES } from "@/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReviewRole = z.enum(
  REVIEW_ROLES as [string, ...string[]],
);

const ScanSchema = z.object({
  repo: z.string().min(1),
  roles: z.array(ReviewRole).optional(),
  skills: z.record(z.string(), z.array(z.string())).optional(),
});

export async function GET() {
  return NextResponse.json({ scans: await listScans() });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const parsed = ScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz parametre", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const handle = await startScan({
      repo: parsed.data.repo,
      roles: parsed.data.roles as never,
      skills: parsed.data.skills,
    });
    return NextResponse.json({ scan: handle }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan başlatılamadı" },
      { status: 500 },
    );
  }
}
