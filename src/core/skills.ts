// Skill kütüphanesi — her rolün skills/<role>/ klasöründeki markdown kuralları.
// Bir worker spawn olunca rolünün skill'leri system prompt'a eklenir
// (orchestrator.spawn → buildSkillPrompt). _role.md ve *.test.json hariç tutulur.
//
// Roster paneli (▦ ROSTER) bu dosyadaki CRUD fonksiyonlarıyla skill'leri yönetir.
// Güvenlik: API'den gelen role ve skill adı path traversal'a karşı whitelist +
// regex ile doğrulanır — dosya yazmadan önce assertRole/assertSkillName geçer.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { REVIEW_ROLES, type WorkerRole } from "./types";

const SKILLS_ROOT = path.join(process.cwd(), "skills");

/**
 * Roster'da görünen ve skill klasörü olabilen roller. `custom` hariç —
 * onun sabit kimliği yok, kapsamını goal belirler. `lead` dahil: özel olsa da
 * ona da skill yüklenebilir.
 */
export const ROSTER_ROLES: WorkerRole[] = [
  "lead",
  "backend",
  "frontend",
  "db",
  "devops",
  "qa",
  "watcher",
  "ios",
  "debug",
  "security",
  "performance",
  "database",
  "api",
  "infrastructure",
  "quality",
  "ui",
  "ux",
  "cost",
];

// skill adı = dosya adı (uzantısız): harf/rakamla başlar, yalnız a-z0-9- ·
// max 64 karakter. `_role` (alt çizgi) ve `.test.json` bu desenle reddedilir.
const SKILL_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export interface SkillMeta {
  name: string;
  description: string;
}

function assertRole(role: string): asserts role is WorkerRole {
  if (!ROSTER_ROLES.includes(role as WorkerRole)) {
    throw new Error(`Geçersiz rol: ${role}`);
  }
}

function assertSkillName(name: string): void {
  if (!SKILL_NAME_RE.test(name)) {
    throw new Error(
      "Geçersiz skill adı — harf/rakamla başla, yalnız a-z0-9- kullan, en çok 64 karakter.",
    );
  }
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

/** Tüm review rolleri için skill kataloğu — scan launcher kullanır. */
export function listAllReviewSkills(): Record<string, SkillMeta[]> {
  const out: Record<string, SkillMeta[]> = {};
  for (const role of REVIEW_ROLES) out[role] = listSkills(role);
  return out;
}

/** Tüm roster rolleri için skill kataloğu — Roster paneli kullanır. */
export function listAllSkills(): Record<string, SkillMeta[]> {
  const out: Record<string, SkillMeta[]> = {};
  for (const role of ROSTER_ROLES) out[role] = listSkills(role);
  return out;
}

/** Tek bir skill'in ham içeriği. Yoksa null. */
export function readSkill(role: string, name: string): string | null {
  assertRole(role);
  assertSkillName(name);
  const f = path.join(skillDir(role), `${name}.md`);
  if (!existsSync(f)) return null;
  return readFileSync(f, "utf8");
}

/** Skill oluştur veya güncelle. */
export function writeSkill(role: string, name: string, content: string): void {
  assertRole(role);
  assertSkillName(name);
  const dir = skillDir(role);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}.md`), content, "utf8");
}

/** Skill sil. */
export function deleteSkill(role: string, name: string): void {
  assertRole(role);
  assertSkillName(name);
  const f = path.join(skillDir(role), `${name}.md`);
  if (existsSync(f)) rmSync(f);
}

/**
 * Bir rolün skill'lerini tek system-prompt bloğu olarak derler.
 * `selected` verilirse yalnız o skill'ler; verilmezse hepsi.
 * orchestrator.spawn her worker için çağırır — skill klasörü yoksa boş döner.
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
Her skill bu rolün uzmanlık kuralıdır. Görev tipine göre uygula:
TARAMA görevinde kontrol listesi, YAPMA görevinde kalite ölçütü.

${blocks.join("\n\n")}`;
}
