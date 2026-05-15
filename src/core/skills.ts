// Skill loader — review ajanslarının kontrol kuralları.
// skills/<role>/<skill>.md dosyaları spawn anında system prompt'a eklenir.
// _role.md ve *.test.json hariç tutulur.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { REVIEW_ROLES } from "./types";

const SKILLS_ROOT = path.join(process.cwd(), "skills");

export interface SkillMeta {
  name: string;
  description: string;
}

function skillDir(role: string): string {
  return path.join(SKILLS_ROOT, role);
}

function skillFiles(role: string): string[] {
  const dir = skillDir(role);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "_role.md")
    .sort();
}

/** Bir rolün skill listesi — UI / seçim için (ad + tek satır açıklama). */
export function listSkills(role: string): SkillMeta[] {
  return skillFiles(role).map((f) => {
    let description = "";
    try {
      const content = readFileSync(path.join(skillDir(role), f), "utf8");
      const firstLine = content.split("\n").find((l) => l.trim()) ?? "";
      description = firstLine.replace(/^#+\s*/, "").trim().slice(0, 160);
    } catch {
      /* yoksay */
    }
    return { name: f.replace(/\.md$/, ""), description };
  });
}

/** Tüm review rolleri için skill kataloğu. */
export function listAllReviewSkills(): Record<string, SkillMeta[]> {
  const out: Record<string, SkillMeta[]> = {};
  for (const role of REVIEW_ROLES) out[role] = listSkills(role);
  return out;
}

/**
 * Bir rolün skill'lerini tek system-prompt bloğu olarak derler.
 * `selected` verilirse yalnız o skill'ler; verilmezse hepsi.
 */
export function buildSkillPrompt(role: string, selected?: string[]): string {
  let files = skillFiles(role);
  if (selected && selected.length > 0) {
    const set = new Set(selected.map((s) => s.replace(/\.md$/, "")));
    files = files.filter((f) => set.has(f.replace(/\.md$/, "")));
  }
  if (files.length === 0) return "";

  const blocks: string[] = [];
  for (const f of files) {
    try {
      const content = readFileSync(path.join(skillDir(role), f), "utf8").trim();
      blocks.push(`### SKILL: ${f.replace(/\.md$/, "")}\n${content}`);
    } catch {
      /* yoksay */
    }
  }
  if (blocks.length === 0) return "";

  return `\n\n=== YÜKLÜ SKILL'LER (${blocks.length}) ===
Aşağıdaki her skill bir kontrol kuralıdır. Hepsini sırayla repo'ya uygula.

${blocks.join("\n\n")}`;
}
