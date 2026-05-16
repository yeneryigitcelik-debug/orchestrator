// GET /api/roster — roster rol kataloğu: model, grup, base prompt, skill listesi.
// Panel'in ▦ ROSTER sayfası bunu render eder. `custom` hariç (sabit kimliği yok).

import { NextResponse } from "next/server";
import { ROLE_PRESETS } from "@/core/role-prompts";
import { LEAD_SYSTEM_PROMPT } from "@/core/lead-prompt";
import { listSkills, ROSTER_ROLES } from "@/core/skills";
import { ROLE_BY_NAME, type SpawnRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const roles = ROSTER_ROLES.map((role) => {
    const preset = ROLE_PRESETS[role];
    const basePrompt =
      role === "lead" ? LEAD_SYSTEM_PROMPT : (preset?.systemPrompt ?? "");
    const group =
      role === "lead"
        ? "lead"
        : (ROLE_BY_NAME[role as SpawnRole]?.group ?? "core");
    return {
      role,
      group,
      model: preset?.model ?? "claude-opus-4-7",
      basePrompt,
      skills: listSkills(role),
    };
  });
  return NextResponse.json({ roles });
}
