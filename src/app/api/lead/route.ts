// GET /api/lead — Lead worker'ının snapshot'ını döndür.
// Frontend chat-first UI bunu kullanarak Lead'in id'sini öğrenir.

import { NextResponse } from "next/server";
import { orchestrator } from "@/core/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ensureLead idempotent — aktifse hızlı, değilse spawn eder
    const lead = await orchestrator.ensureLead();
    return NextResponse.json({ lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/lead] ensureLead failed:", err);
    return NextResponse.json(
      { error: message, stack },
      { status: 500 },
    );
  }
}
