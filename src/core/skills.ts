// Skill sistemi — her rolün roles/<rol>/skills/*.md klasörü.
// Skill = markdown bilgi dosyası. Worker spawn olunca rolünün skill'leri
// system prompt'una concat edilir (resolveSkillsPrompt).
//
// Güvenlik: role ve skill adı path traversal'a karşı whitelist + regex ile
// doğrulanır; API'den gelen girdiyle dosya yazıyoruz.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import type { WorkerRole } from "./types";

const ROLES_DIR = resolve(process.cwd(), "roles");

const VALID_ROLES: WorkerRole[] = [
  "lead",
  "backend",
  "frontend",
  "watcher",
  "db",
  "devops",
  "qa",
  "custom",
];

// skill adı = dosya adı (uzantısız). a-z 0-9 tire; başta harf/rakam.
const SKILL_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export interface SkillMeta {
  name: string;
  description: string;
  bytes: number;
}

function assertRole(role: string): asserts role is WorkerRole {
  if (!VALID_ROLES.includes(role as WorkerRole)) {
    throw new Error(`Geçersiz rol: ${role}`);
  }
}

function assertSkillName(name: string): void {
  if (!SKILL_NAME_RE.test(name)) {
    throw new Error(
      "Geçersiz skill adı — sadece harf, rakam ve tire (a-z0-9-), max 64 karakter.",
    );
  }
}

function skillsDir(role: string): string {
  return resolve(ROLES_DIR, role, "skills");
}

/** Bir rolün skill'lerini metadata olarak listele. */
export function listRoleSkills(role: string): SkillMeta[] {
  assertRole(role);
  const dir = skillsDir(role);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const content = readFileSync(resolve(dir, f), "utf8");
      const firstLine =
        content
          .split("\n")
          .map((l) => l.trim())
          .find(Boolean) ?? "";
      return {
        name: f.replace(/\.md$/, ""),
        description: firstLine.replace(/^#+\s*/, "").slice(0, 140),
        bytes: Buffer.byteLength(content, "utf8"),
      };
    });
}

/** Tek bir skill'in içeriğini oku. Yoksa null. */
export function readSkill(role: string, name: string): string | null {
  assertRole(role);
  assertSkillName(name);
  const f = resolve(skillsDir(role), `${name}.md`);
  if (!existsSync(f)) return null;
  return readFileSync(f, "utf8");
}

/** Skill oluştur veya güncelle. */
export function writeSkill(role: string, name: string, content: string): void {
  assertRole(role);
  assertSkillName(name);
  const dir = skillsDir(role);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${name}.md`), content, "utf8");
}

/** Skill sil. */
export function deleteSkill(role: string, name: string): void {
  assertRole(role);
  assertSkillName(name);
  const f = resolve(skillsDir(role), `${name}.md`);
  if (existsSync(f)) rmSync(f);
}

/**
 * Rolün tüm skill'lerini system prompt'a eklenecek tek metin olarak birleştir.
 * Worker spawn'da çağrılır. Skill yoksa boş string döner.
 */
export function resolveSkillsPrompt(role: string): string {
  if (!VALID_ROLES.includes(role as WorkerRole)) return "";
  const dir = skillsDir(role);
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  if (files.length === 0) return "";

  const parts: string[] = [
    "",
    "",
    "=== YÜKLÜ SKILL'LER ===",
    "Bu role eklenmiş ek yetenekler. Görevini yaparken bunları uygula:",
  ];
  for (const f of files) {
    const content = readFileSync(resolve(dir, f), "utf8").trim();
    parts.push("", `### skill: ${f.replace(/\.md$/, "")}`, content);
  }
  return parts.join("\n");
}

export { VALID_ROLES };
