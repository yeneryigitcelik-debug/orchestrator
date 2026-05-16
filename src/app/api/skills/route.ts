// GET /api/skills — review rollerinin skill kataloğu

import { NextResponse } from "next/server";
import { listAllReviewSkills } from "@/core/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ skills: listAllReviewSkills() });
}
