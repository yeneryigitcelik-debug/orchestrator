// GET /api/roster — tüm rol tiplerinin kataloğu (model, base prompt, skill listesi).
// "custom" hariç — o rolün sabit kimliği yok, roster'da gösterilmez.

import { NextResponse } from "next/server";
import { ROLE_PRESETS } from "@/core/role-prompts";
import { LEAD_SYSTEM_PROMPT } from "@/core/lead";
import { listRoleSkills, VALID_ROLES } from "@/core/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const roles = VALID_ROLES.filter((r) => r !== "custom").map((role) => {
    const preset = ROLE_PRESETS[role];
    const basePrompt =
      role === "lead" ? LEAD_SYSTEM_PROMPT : (preset?.systemPrompt ?? "");
    return {
      role,
      model: preset?.model ?? "claude-opus-4-7",
      basePrompt,
      skills: listRoleSkills(role),
    };
  });
  return NextResponse.json({ roles });
}
