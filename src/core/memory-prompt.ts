// Spawn-time hafıza enjeksiyonu — `buildMemoryPrompt(cwd, role)`.
//
// orchestrator.spawn, buildSkillPrompt'tan ÖNCE bunu çağırır (system prompt'a
// eklenir). Helper'lar projenin INDEX'ini OKUR (yazma yok — helper'ların MCP'si
// yok; katkıları [DONE] raporuyla yakalanır). Lead, hafızası olan projelerin
// roster'ını alır + memory_* araçlarıyla okur/yazar.
//
// Hafıza katmanı ASLA spawn'ı bozmamalı → her şey try/catch içinde, hata → "".
//
// YALNIZ daemon process'inde çalışır.

import path from "node:path";
import { readFile } from "node:fs/promises";
import { prisma } from "../lib/db";
import type { WorkerRole } from "./types";
import { hasWiki, readIndexDoc, memoryRoot } from "./memory-store";

const INDEX_CAP = 4000; // ~karakter (~1500 token); fazlası kırpılır

export async function buildMemoryPrompt(
  cwd: string,
  role: WorkerRole,
): Promise<string> {
  try {
    return role === "lead"
      ? await leadMemoryPrompt(cwd)
      : await helperMemoryPrompt(cwd);
  } catch {
    return ""; // hafıza katmanı spawn'ı bozmaz
  }
}

async function helperMemoryPrompt(cwd: string): Promise<string> {
  const header = `

=== PROJE HAFIZASI (.agentwiki) ===
Bu projenin kalıcı agent hafızası \`.agentwiki/\` altında (markdown).
- İşe başlamadan INDEX'i oku; ilgili sayfaları \`.agentwiki/<tier>/<slug>.md\` yolundan Read ile aç.
- KALICI bir şey öğrenirsen (mimari karar, API kontratı, gotcha, tekrarlı prosedür)
  [DONE] raporunun sonunda "HAFIZA:" başlığı altında KAYNAK (dosya yolu) göstererek özetle
  — Lead/daemon bunu .agentwiki'ye işler.
- .agentwiki dosyalarını ELLE düzenleme; var olanı tekrar yazma.`;

  if (!hasWiki(cwd)) {
    return (
      header +
      `\n\nBu projede henüz hafıza yok — ilk kalıcı bulguları [DONE] raporunda belirt.`
    );
  }
  const idx = (await readIndexDoc(cwd)) ?? "";
  const capped =
    idx.length > INDEX_CAP
      ? idx.slice(0, INDEX_CAP) + "\n…(kırpıldı — tamamı .agentwiki/INDEX.md)"
      : idx;
  return header + `\n\n--- .agentwiki/INDEX.md ---\n${capped}`;
}

async function leadMemoryPrompt(cwd: string): Promise<string> {
  const header = `

=== PROJE HAFIZASI (.agentwiki) ===
Her projenin kalıcı hafızası kendi \`.agentwiki/\`'sinde tutulur. Bir projede iş
yapmadan ÖNCE \`memory_index\`/\`memory_search\` ile o projenin hafızasını yokla;
\`memory_read\` ile sayfa oku. İş bitince kalıcı öğrenmeleri \`memory_write\` ile
(KAYNAK göstererek) semantic/procedural tier'a işle. Helper'ların [DONE]
raporundaki "HAFIZA:" notlarını da sen kalıcılaştır.`;

  const projects = await collectProjectWikis(cwd);
  if (projects.length === 0) {
    return header + `\n\nHenüz hafızası olan proje yok.`;
  }
  const lines = projects
    .map((p) => `- ${p.cwd}  (${p.pages} sayfa)`)
    .join("\n");
  return header + `\n\nHafızası olan projeler (roster):\n${lines}`;
}

/** Bilinen projeler (opsiyonel firstCwd + distinct Task.cwd) — hafızası olanlar. */
async function collectProjectWikis(
  firstCwd: string | null,
): Promise<Array<{ cwd: string; pages: number }>> {
  const out: Array<{ cwd: string; pages: number }> = [];
  const seen = new Set<string>();

  const consider = async (cwd: string | null | undefined): Promise<void> => {
    if (!cwd || seen.has(cwd) || out.length >= 15) return;
    seen.add(cwd);
    if (!hasWiki(cwd)) return;
    let pages = 0;
    try {
      const j = JSON.parse(
        await readFile(
          path.join(memoryRoot(cwd), ".cache", "index.json"),
          "utf8",
        ),
      ) as { pages?: unknown[] };
      pages = Array.isArray(j.pages) ? j.pages.length : 0;
    } catch {
      /* cache yok — 0 göster */
    }
    out.push({ cwd, pages });
  };

  await consider(firstCwd);
  try {
    const tasks = await prisma.task.findMany({
      where: { cwd: { not: null } },
      distinct: ["cwd"],
      select: { cwd: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    for (const t of tasks) await consider(t.cwd);
  } catch {
    /* prisma erişilemezse roster boş — sorun değil */
  }
  return out.slice(0, 15);
}

/** UI / daemon için: hafızası olan tüm bilinen projeler. */
export async function listProjectWikis(): Promise<
  Array<{ cwd: string; pages: number }>
> {
  return collectProjectWikis(null);
}
