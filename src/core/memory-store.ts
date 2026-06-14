// Per-proje agent hafızası — `<proje>/.agentwiki/` markdown wiki.
//
// Kaynak doğruluk = markdown. Daemon TEK process olduğu için per-proje bir
// in-process mutex (withLock) tüm yazmaları serialize eder — dosya kilidi gerekmez.
// Yazımlar `.tmp`→`rename` ile atomik. Embedding/index `.cache/` türetilmiş ve
// gitignore'lu (P3'te embeddings eklenecek).
//
// Tier'lar (agentmemory konsepti): working (uçucu) · episodic (oturum notu) ·
// semantic (kalıcı fact/karar) · procedural (tekrarlı how-to).
//
// YALNIZ daemon process'inde çalışır (Next import etmez).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile, writeFile, rename, readdir, stat, appendFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { normalizeCwd } from "../lib/paths";
import {
  embed,
  cosine,
  ensureEmbeddings,
  hashText,
  embeddingsEnabled,
  type EmbItem,
} from "./embeddings";

export type MemoryTier = "working" | "episodic" | "semantic" | "procedural";
export const MEMORY_TIERS: MemoryTier[] = [
  "working",
  "episodic",
  "semantic",
  "procedural",
];

export interface PageFrontmatter {
  tier: MemoryTier;
  title: string;
  slug: string;
  tags: string[];
  sources: string[];
  links: string[];
  createdAt: string;
  updatedAt: string;
  accessedAt: string;
  hits: number;
}

export interface Page {
  /** tier/slug.md (root'a göreli) */
  path: string;
  frontmatter: PageFrontmatter;
  body: string;
}

export interface WritePageInput {
  tier: MemoryTier;
  title: string;
  body: string;
  tags?: string[];
  sources?: string[];
  links?: string[];
  slug?: string;
}

export interface PageMeta {
  path: string;
  tier: MemoryTier;
  title: string;
  slug: string;
  tags: string[];
  links: string[];
  hits: number;
  updatedAt: string;
  accessedAt: string;
  bytes: number;
}

export interface LogEntry {
  kind: string;
  subject: string;
  fields?: Record<string, string | undefined>;
}

const WIKI_DIR = ".agentwiki";

// --- yol çözümü ---

/**
 * Bir cwd için wiki kökünü (proje kökü) çözer. P1: doğrudan resolve(cwd).
 * (Git worktree paylaşımı — aynı repo'nun ana .agentwiki'sine yönlendirme —
 *  ileride buraya eklenecek; tek ekleme noktası.)
 */
export function resolveWikiRoot(cwd: string): string {
  return path.resolve(cwd);
}

/** `<proje>/.agentwiki` mutlak yolu. */
export function memoryRoot(cwd: string): string {
  return path.join(resolveWikiRoot(cwd), WIKI_DIR);
}

/** Bu projede daha önce hafıza oluşturulmuş mu? (INDEX.md varlığı) */
export function hasWiki(cwd: string): boolean {
  return existsSync(path.join(memoryRoot(cwd), "INDEX.md"));
}

// --- per-proje yazma serileştirme (mutex) ---

const chains = new Map<string, Promise<unknown>>();

/** Aynı projeye eşzamanlı yazımları sıraya sokar (daemon tek-process). */
function withLock<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const key = normalizeCwd(cwd);
  const prev = chains.get(key) ?? Promise.resolve();
  const result = prev.then(fn, fn); // prev ne olursa olsun fn'i çalıştır
  chains.set(
    key,
    result.then(
      () => {},
      () => {},
    ),
  );
  return result;
}

// --- frontmatter (kontrollü, tek-satır YAML alt kümesi) ---

function unquote(s: string): string {
  const t = s.trim();
  if (t.startsWith('"')) {
    try {
      return JSON.parse(t) as string;
    } catch {
      return t.replace(/^"|"$/g, "");
    }
  }
  return t;
}

function parseArr(s: string | undefined): string[] {
  if (!s) return [];
  const inner = s.trim().replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map((x) => unquote(x))
    .filter(Boolean);
}

function quote(s: string): string {
  return /[:#\n[\]"]/.test(s) ? JSON.stringify(s) : s;
}

function arr(a: string[]): string {
  const cleaned = a
    .map((s) => s.replace(/[[\],"\n]/g, " ").trim())
    .filter(Boolean);
  return `[${cleaned.join(", ")}]`;
}

function parseFrontmatter(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function serializeFrontmatter(fm: PageFrontmatter): string {
  return [
    "---",
    `tier: ${fm.tier}`,
    `title: ${quote(fm.title)}`,
    `slug: ${fm.slug}`,
    `tags: ${arr(fm.tags)}`,
    `sources: ${arr(fm.sources)}`,
    `links: ${arr(fm.links)}`,
    `createdAt: ${fm.createdAt}`,
    `updatedAt: ${fm.updatedAt}`,
    `accessedAt: ${fm.accessedAt}`,
    `hits: ${fm.hits}`,
    "---",
  ].join("\n");
}

function parsePage(raw: string, rel: string): Page {
  let fmText = "";
  let body = raw;
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (m) {
    fmText = m[1];
    body = m[2];
  }
  const kv = parseFrontmatter(fmText);
  const tierFromPath = rel.split("/")[0] as MemoryTier;
  const slugFromPath = path.basename(rel).replace(/\.md$/, "");
  const tier = (MEMORY_TIERS.includes(kv.tier as MemoryTier)
    ? (kv.tier as MemoryTier)
    : tierFromPath) as MemoryTier;
  const fm: PageFrontmatter = {
    tier,
    title: kv.title ? unquote(kv.title) : slugFromPath,
    slug: kv.slug || slugFromPath,
    tags: parseArr(kv.tags),
    sources: parseArr(kv.sources),
    links: parseArr(kv.links),
    createdAt: kv.createdAt || "",
    updatedAt: kv.updatedAt || kv.createdAt || "",
    accessedAt: kv.accessedAt || kv.updatedAt || "",
    hits: Number(kv.hits) || 0,
  };
  return { path: rel, frontmatter: fm, body: body.trim() };
}

// --- yardımcılar ---

function slugify(s: string): string {
  const tr: Record<string, string> = {
    ç: "c", Ç: "c", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
    ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ü: "u", Ü: "u",
  };
  return s
    .split("")
    .map((c) => tr[c] ?? c)
    .join("")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

function uniq(a: string[]): string[] {
  return [...new Set(a.map((s) => s.trim()).filter(Boolean))];
}

function nowIso(): string {
  return new Date().toISOString();
}

async function atomicWrite(abs: string, content: string): Promise<void> {
  const tmp = `${abs}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, abs);
}

function scaffoldFile(p: string, content: string): void {
  if (!existsSync(p)) writeFileSync(p, content, "utf8");
}

/** root içinde güvenli relatif yol; traversal'ı reddeder (null döner). */
function safeJoin(root: string, rel: string): string | null {
  const rootResolved = path.resolve(root);
  const abs = path.resolve(rootResolved, rel);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path.sep)) {
    return null;
  }
  return abs;
}

// --- scaffold içerikleri ---

const GITIGNORE = `# .agentwiki — türetilmiş/uçucu; markdown tier'lar git'e girer
.cache/
working/
`;

const INITIAL_INDEX = `# .agentwiki — INDEX

Bu projenin kalıcı agent hafızası. Sayfalar \`memory_search\` ile aranır,
\`memory_read\` ile okunur, \`memory_write\` ile güncellenir. Dosyaları doğrudan
düzenleme — yalnız memory_* araçları (index + log + kilit otomatik yönetilir).

_(Henüz sayfa yok.)_
`;

const INITIAL_LOG = `# .agentwiki — log

Append-only olay günlüğü. Her blok: \`## <ISO8601>  <kind>  <konu>\` + \`- key: value\`.
`;

const SCHEMA_MD = `# .agentwiki — şema / konvansiyon

Bu klasör bu projenin **kalıcı agent hafızasıdır** (Karpathy "LLM Wiki" deseni).
Kaynak doğruluk = markdown. Daemon tarafından yönetilir; dosyaları elle değil
\`memory_*\` araçlarıyla güncelle.

## Tier'lar
- **semantic/** — kalıcı facts / kararlar / mimari / API kontratı / gotcha. Lead küratörlüğü.
- **procedural/** — tekrarlanan how-to / runbook / konvansiyon.
- **episodic/** — oturum notları (bir helper işi bitince deterministik yakalanır).
- **working/** — uçucu scratch (gitignore'lu, agresif budanır).

## Sayfa frontmatter
\`\`\`yaml
---
tier: semantic
title: "..."
slug: ...
tags: [a, b]
sources: [src/x.ts, episode:episodic/...]   # PROVENANCE — semantic/procedural'da zorunlu
links: [diger-slug]
createdAt / updatedAt / accessedAt: ISO8601
hits: 0
---
\`\`\`
Gövdedeki iddialar satır-içi atıf taşımalı: \`... [src/auth/jwt.ts]\`.

## Operasyonlar (Ingest / Query / Lint)
- **Ingest:** öğrenileni \`memory_write\` ile kaydet (kaynak göstererek).
- **Query:** önce INDEX / \`memory_search\`; iyi cevaplar yeni sayfa olur.
- **Lint:** düzenli olarak çelişki / orphan / bayat sayfa taraması (\`memory_lint\`).

## log.md
Append-only; her yazma/olay bir blok bırakır. Provenance ve denetim izi.
`;

// --- ensure ---

/** .agentwiki iskeletini oluşturur (idempotent). Mutlak kök yolu döner. */
export function ensureWiki(cwd: string): string {
  const root = memoryRoot(cwd);
  mkdirSync(root, { recursive: true });
  for (const t of MEMORY_TIERS) mkdirSync(path.join(root, t), { recursive: true });
  mkdirSync(path.join(root, ".cache"), { recursive: true });
  scaffoldFile(path.join(root, "_schema.md"), SCHEMA_MD);
  scaffoldFile(path.join(root, ".gitignore"), GITIGNORE);
  scaffoldFile(path.join(root, "INDEX.md"), INITIAL_INDEX);
  scaffoldFile(path.join(root, "log.md"), INITIAL_LOG);
  return root;
}

// --- okuma ---

/** Tek sayfayı oku (tier/slug.md). Yoksa null. */
export async function readPage(cwd: string, rel: string): Promise<Page | null> {
  const root = memoryRoot(cwd);
  const abs = safeJoin(root, rel);
  if (!abs || !existsSync(abs)) return null;
  try {
    return parsePage(await readFile(abs, "utf8"), rel.replace(/\\/g, "/"));
  } catch {
    return null;
  }
}

/** INDEX.md ham metni (prompt enjeksiyonu için). Yoksa null. */
export async function readIndexDoc(cwd: string): Promise<string | null> {
  const p = path.join(memoryRoot(cwd), "INDEX.md");
  if (!existsSync(p)) return null;
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Sayfa meta listesi (cache'ten; yoksa yeniden tarar). */
export async function listPages(cwd: string): Promise<PageMeta[]> {
  const root = memoryRoot(cwd);
  if (!existsSync(root)) return [];
  const cachePath = path.join(root, ".cache", "index.json");
  if (existsSync(cachePath)) {
    try {
      const j = JSON.parse(await readFile(cachePath, "utf8")) as {
        pages?: PageMeta[];
      };
      if (Array.isArray(j.pages)) return j.pages;
    } catch {
      /* cache bozuk → yeniden tara */
    }
  }
  return withLock(cwd, () => rebuildIndexInner(root));
}

// --- yazma (hepsi lock altında) ---

/** Sayfa oluştur/güncelle. Aynı slug varsa tag/source/link birleşir, gövde değişir. */
export async function writePage(
  cwd: string,
  input: WritePageInput,
): Promise<Page> {
  return withLock(cwd, async () => {
    const root = ensureWiki(cwd);
    if (!MEMORY_TIERS.includes(input.tier)) {
      throw new Error(`geçersiz tier: ${input.tier}`);
    }
    const slug =
      (input.slug && slugify(input.slug)) ||
      slugify(input.title) ||
      randomUUID().slice(0, 8);
    const rel = `${input.tier}/${slug}.md`;
    const abs = path.join(root, rel);
    const now = nowIso();

    let existing: Page | null = null;
    if (existsSync(abs)) {
      try {
        existing = parsePage(await readFile(abs, "utf8"), rel);
      } catch {
        /* bozuksa üzerine yaz */
      }
    }

    const fm: PageFrontmatter = {
      tier: input.tier,
      title: input.title.trim() || slug,
      slug,
      tags: uniq([...(existing?.frontmatter.tags ?? []), ...(input.tags ?? [])]),
      sources: uniq([
        ...(existing?.frontmatter.sources ?? []),
        ...(input.sources ?? []),
      ]),
      links: uniq([
        ...(existing?.frontmatter.links ?? []),
        ...(input.links ?? []),
      ]),
      createdAt: existing?.frontmatter.createdAt || now,
      updatedAt: now,
      accessedAt: existing?.frontmatter.accessedAt || now,
      hits: existing?.frontmatter.hits ?? 0,
    };

    const content = `${serializeFrontmatter(fm)}\n\n${input.body.trim()}\n`;
    await atomicWrite(abs, content);
    await appendLogInner(root, {
      kind: existing ? "update" : "create",
      subject: rel,
      fields: {
        title: fm.title,
        sources: fm.sources.join(", ") || "-",
      },
    });
    await rebuildIndexInner(root);
    return { path: rel, frontmatter: fm, body: input.body.trim() };
  });
}

/** log.md'ye bir olay bloğu ekle. */
export async function appendLog(cwd: string, entry: LogEntry): Promise<void> {
  return withLock(cwd, async () => {
    const root = ensureWiki(cwd);
    await appendLogInner(root, entry);
  });
}

/** INDEX.md + .cache/index.json'u yeniden üret. */
export async function rebuildIndex(cwd: string): Promise<PageMeta[]> {
  return withLock(cwd, async () => {
    const root = ensureWiki(cwd);
    return rebuildIndexInner(root);
  });
}

// --- lock-içi (re-entrant değil; yalnız withLock gövdesinden çağır) ---

async function appendLogInner(root: string, entry: LogEntry): Promise<void> {
  const lines = [`\n## ${nowIso()}  ${entry.kind}  ${entry.subject}`];
  for (const [k, v] of Object.entries(entry.fields ?? {})) {
    if (v != null && v !== "") lines.push(`- ${k}: ${v}`);
  }
  await appendFile(path.join(root, "log.md"), lines.join("\n") + "\n", "utf8");
}

async function rebuildIndexInner(root: string): Promise<PageMeta[]> {
  const metas: PageMeta[] = [];
  for (const tier of MEMORY_TIERS) {
    const dir = path.join(root, tier);
    if (!existsSync(dir)) continue;
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    for (const f of files) {
      const rel = `${tier}/${f}`;
      try {
        const raw = await readFile(path.join(dir, f), "utf8");
        const page = parsePage(raw, rel);
        const st = await stat(path.join(dir, f));
        metas.push({
          path: rel,
          tier,
          title: page.frontmatter.title,
          slug: page.frontmatter.slug,
          tags: page.frontmatter.tags,
          links: page.frontmatter.links,
          hits: page.frontmatter.hits,
          updatedAt: page.frontmatter.updatedAt,
          accessedAt: page.frontmatter.accessedAt,
          bytes: st.size,
        });
      } catch {
        /* bozuk sayfayı atla */
      }
    }
  }
  metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await atomicWrite(path.join(root, "INDEX.md"), renderIndexMd(metas));
  await atomicWrite(
    path.join(root, ".cache", "index.json"),
    JSON.stringify({ builtAt: nowIso(), pages: metas }, null, 2),
  );
  return metas;
}

function renderIndexMd(metas: PageMeta[]): string {
  const parts: string[] = [
    "# .agentwiki — INDEX",
    "",
    "Bu projenin kalıcı agent hafızası. `memory_search` ile ara, `memory_read` ile",
    "oku, `memory_write` ile güncelle. Dosyaları elle düzenleme.",
  ];
  // working tier'ı index'te göstermiyoruz (uçucu) — semantic/procedural/episodic.
  const tiersToShow: MemoryTier[] = ["semantic", "procedural", "episodic"];
  let total = 0;
  for (const tier of tiersToShow) {
    const inTier = metas.filter((m) => m.tier === tier);
    if (inTier.length === 0) continue;
    total += inTier.length;
    parts.push("", `## ${tier} (${inTier.length})`);
    for (const m of inTier) {
      const tags = m.tags.length ? ` — ${m.tags.join(", ")}` : "";
      parts.push(`- [${m.title}](${m.path})${tags}`);
    }
  }
  if (total === 0) parts.push("", "_(Henüz sayfa yok.)_");
  return parts.join("\n") + "\n";
}

// --- deterministik episodic yakalama (P2) ---

export interface EpisodeInput {
  worker: string;
  role: string;
  model: string;
  goal: string;
  outcome: "done" | "blocked" | "capped";
  filesTouched: string[];
  resultText: string;
  runId?: string | null;
  taskId?: string | null;
}

/**
 * Bir helper işi bitince (working→episodic) DETERMİNİSTİK olarak — LLM YOK —
 * bir episode sayfası yazar. Daemon tarafından çağrılır (helper'ların MCP'si yok).
 */
export async function captureEpisode(
  cwd: string,
  ep: EpisodeInput,
): Promise<Page> {
  const date = new Date().toISOString().slice(0, 10);
  const slug = `${date}-${slugify(ep.role) || "helper"}-${randomUUID().slice(0, 8)}`;
  const goalLine = ep.goal.replace(/\s+/g, " ").trim();
  const title = `${date} ${ep.role}: ${goalLine.slice(0, 80)}`;
  const sources = uniq([
    ...ep.filesTouched,
    ep.taskId ? `task:${ep.taskId}` : "",
    ep.runId ? `run:${ep.runId}` : "",
  ]);
  const filesBlock = ep.filesTouched.length
    ? `**Dokunulan dosyalar:**\n${ep.filesTouched.map((f) => `- ${f}`).join("\n")}`
    : "**Dokunulan dosyalar:** (tespit edilemedi)";
  const body = [
    `**Worker:** ${ep.worker} (${ep.role} / ${ep.model})`,
    `**Sonuç:** ${ep.outcome}`,
    "",
    `**Goal:** ${goalLine}`,
    "",
    filesBlock,
    "",
    "**Rapor (özet):**",
    ep.resultText.replace(/\s+$/g, "").slice(0, 2000),
  ].join("\n");
  return writePage(cwd, {
    tier: "episodic",
    title,
    slug,
    body,
    tags: uniq([ep.role, ep.outcome]),
    sources,
  });
}

// --- arama (P2: keyword/BM25-lite; P3'te vektör + RRF eklenecek) ---

export interface SearchHit {
  path: string;
  tier: MemoryTier;
  title: string;
  score: number;
  snippet: string;
  tags: string[];
  sources: string[];
}

const SEARCHABLE: MemoryTier[] = ["semantic", "procedural", "episodic"];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);
}

function makeSnippet(body: string, qTokens: string[]): string {
  const paras = body
    .split(/\n{2,}/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const p of paras) {
    const low = p.toLowerCase();
    if (qTokens.some((t) => low.includes(t))) return p.slice(0, 300);
  }
  return (paras[0] ?? body).slice(0, 300);
}

async function loadSearchablePages(root: string): Promise<Page[]> {
  const pages: Page[] = [];
  for (const tier of SEARCHABLE) {
    const dir = path.join(root, tier);
    if (!existsSync(dir)) continue;
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    for (const f of files) {
      try {
        pages.push(parsePage(await readFile(path.join(dir, f), "utf8"), `${tier}/${f}`));
      } catch {
        /* bozuk sayfayı atla */
      }
    }
  }
  return pages;
}

/** Keyword/BM25-lite skoru (title×3, tags×2, body), skor>0, azalan sıralı. */
function bm25Rank(
  pages: Page[],
  qTokens: string[],
): Array<{ path: string; score: number }> {
  const docs = pages.map((p) => {
    const fm = p.frontmatter;
    const weighted = `${fm.title} ${fm.title} ${fm.title} ${fm.tags.join(" ")} ${fm.tags.join(" ")} ${p.body}`;
    return { path: p.path, tokens: tokenize(weighted) };
  });
  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.tokens.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const k1 = 1.2;
  const b = 0.75;
  const idf = (t: string): number =>
    Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  return docs
    .map((d) => {
      const tf = new Map<string, number>();
      for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      const dl = d.tokens.length || 1;
      let score = 0;
      for (const qt of qTokens) {
        const f = tf.get(qt) ?? 0;
        if (f === 0) continue;
        score +=
          (idf(qt) * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * dl) / avgdl));
      }
      return { path: d.path, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b2) => b2.score - a.score);
}

/**
 * Hibrit arama: keyword (BM25) + yerel vektör (cosine), RRF (k=60) ile füzyon.
 * Embedding kapalı/yüklenemezse SESSİZCE keyword-only'ye düşer. Hit yoksa [].
 */
export async function searchMemory(
  cwd: string,
  query: string,
  opts: { k?: number; tier?: MemoryTier; useVectors?: boolean } = {},
): Promise<SearchHit[]> {
  const root = memoryRoot(cwd);
  if (!existsSync(root)) return [];
  let pages = await loadSearchablePages(root);
  if (opts.tier) pages = pages.filter((p) => p.frontmatter.tier === opts.tier);
  if (pages.length === 0) return [];
  const qTokens = [...new Set(tokenize(query))];
  if (qTokens.length === 0) return [];
  const k = opts.k ?? 8;
  const byPath = new Map(pages.map((p) => [p.path, p]));

  // keyword (BM25) — 1-indeksli rank
  const kwRank = new Map<string, number>();
  bm25Rank(pages, qTokens).forEach((x, i) => kwRank.set(x.path, i + 1));

  // vektör (opsiyonel) — model yoksa sessizce atla
  const vecRank = new Map<string, number>();
  const useVectors = opts.useVectors ?? embeddingsEnabled();
  if (useVectors) {
    try {
      const items: EmbItem[] = pages.map((p) => {
        const text = `${p.frontmatter.title}\n${p.frontmatter.tags.join(" ")}\n${p.body}`;
        return { path: p.path, text, hash: hashText(text) };
      });
      const embByPath = await ensureEmbeddings(
        path.join(root, ".cache", "embeddings.json"),
        items,
      );
      const qVec = await embed(query);
      pages
        .map((p) => {
          const v = embByPath.get(p.path);
          return { path: p.path, sim: v ? cosine(qVec, v) : -1 };
        })
        .filter((x) => x.sim > 0.15)
        .sort((a, b2) => b2.sim - a.sim)
        .forEach((x, i) => vecRank.set(x.path, i + 1));
    } catch (err) {
      console.error(
        "[memory] embedding atlandı (keyword-only):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // RRF füzyon (k=60)
  const RRF_K = 60;
  const fused: Array<{ path: string; score: number }> = [];
  for (const p of new Set([...kwRank.keys(), ...vecRank.keys()])) {
    let s = 0;
    const kr = kwRank.get(p);
    if (kr) s += 1 / (RRF_K + kr);
    const vr = vecRank.get(p);
    if (vr) s += 1 / (RRF_K + vr);
    fused.push({ path: p, score: s });
  }
  fused.sort((a, b2) => b2.score - a.score);
  const top = fused.slice(0, k);
  // access-boost: dönen sayfaların hits/accessedAt'ini artır (fire-and-forget;
  // arama gecikmesini etkilemez, frontmatter dışı içerik değişmez → re-embed yok).
  void bumpAccess(
    cwd,
    top.map((t) => t.path),
  ).catch(() => {});

  return top.map(({ path: pth, score }) => {
    const page = byPath.get(pth)!;
    return {
      path: page.path,
      tier: page.frontmatter.tier,
      title: page.frontmatter.title,
      score: Math.round(score * 100000) / 100000,
      snippet: makeSnippet(page.body, qTokens),
      tags: page.frontmatter.tags,
      sources: page.frontmatter.sources,
    };
  });
}

// --- erişim sayacı (access-boost) ---

/** Verilen sayfaların hits'ini +1, accessedAt'ini now yapar (log/rebuild yok). */
export async function bumpAccess(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  return withLock(cwd, async () => {
    const root = memoryRoot(cwd);
    const now = nowIso();
    for (const rel of paths) {
      const abs = safeJoin(root, rel);
      if (!abs || !existsSync(abs)) continue;
      try {
        const page = parsePage(await readFile(abs, "utf8"), rel);
        page.frontmatter.hits += 1;
        page.frontmatter.accessedAt = now;
        await atomicWrite(
          abs,
          `${serializeFrontmatter(page.frontmatter)}\n\n${page.body}\n`,
        );
      } catch {
        /* yoksay */
      }
    }
  });
}

// --- lint + decay (P4) ---

export interface LintReport {
  counts: { semantic: number; procedural: number; episodic: number; working: number };
  orphans: Array<{ path: string; title: string }>;
  stale: Array<{ path: string; title: string; updatedAt: string; hits: number }>;
  gaps: Array<{ from: string; missingLink: string }>;
  contradictions: Array<{ a: string; b: string; sharedTags: string[] }>;
  prunedWorking: number;
}

const STALE_DAYS = Number(process.env.MEMORY_STALE_DAYS ?? 60);
const ORPHAN_MIN_AGE_DAYS = 14;
const WORKING_TTL_DAYS = Number(process.env.MEMORY_WORKING_TTL_DAYS ?? 7);
const DAY_MS = 86_400_000;

/**
 * Deterministik hafıza denetimi (LLM yok) + working/ budama (decay).
 * - orphans: semantic/procedural, gelen link yok + hits 0 + >14 gün (referanssız/erişilmemiş)
 * - stale: working dışı, >STALE_DAYS güncellenmemiş + hits<2
 * - gaps: bir sayfanın links'i var olmayan bir slug'a işaret ediyor
 * - contradictions: ≥2 ortak tag taşıyan semantic çiftleri (ADAY — Lead yargılar)
 */
export async function lintMemory(cwd: string): Promise<LintReport> {
  const root = memoryRoot(cwd);
  const empty: LintReport = {
    counts: { semantic: 0, procedural: 0, episodic: 0, working: 0 },
    orphans: [],
    stale: [],
    gaps: [],
    contradictions: [],
    prunedWorking: 0,
  };
  if (!existsSync(root)) return empty;

  const all: Page[] = [];
  for (const tier of MEMORY_TIERS) {
    const dir = path.join(root, tier);
    if (!existsSync(dir)) continue;
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    for (const f of files) {
      try {
        all.push(parsePage(await readFile(path.join(dir, f), "utf8"), `${tier}/${f}`));
      } catch {
        /* atla */
      }
    }
  }

  const counts = { semantic: 0, procedural: 0, episodic: 0, working: 0 };
  for (const p of all) counts[p.frontmatter.tier]++;

  const bySlug = new Map(all.map((p) => [p.frontmatter.slug, p]));
  const inbound = new Map<string, number>();
  const gaps: LintReport["gaps"] = [];
  for (const p of all) {
    for (const l of p.frontmatter.links) {
      if (bySlug.has(l)) inbound.set(l, (inbound.get(l) ?? 0) + 1);
      else gaps.push({ from: p.path, missingLink: l });
    }
  }

  const nowMs = Date.now();
  const orphans: LintReport["orphans"] = [];
  const stale: LintReport["stale"] = [];
  for (const p of all) {
    const fm = p.frontmatter;
    const updatedMs = Date.parse(fm.updatedAt || fm.createdAt || "") || 0;
    const ageDays = updatedMs ? (nowMs - updatedMs) / DAY_MS : 0;
    if (
      (fm.tier === "semantic" || fm.tier === "procedural") &&
      (inbound.get(fm.slug) ?? 0) === 0 &&
      fm.hits === 0 &&
      ageDays > ORPHAN_MIN_AGE_DAYS
    ) {
      orphans.push({ path: p.path, title: fm.title });
    }
    if (fm.tier !== "working" && updatedMs && ageDays > STALE_DAYS && fm.hits < 2) {
      stale.push({ path: p.path, title: fm.title, updatedAt: fm.updatedAt, hits: fm.hits });
    }
  }

  const sem = all.filter((p) => p.frontmatter.tier === "semantic");
  const contradictions: LintReport["contradictions"] = [];
  for (let i = 0; i < sem.length && contradictions.length < 20; i++) {
    for (let j = i + 1; j < sem.length && contradictions.length < 20; j++) {
      const shared = sem[i].frontmatter.tags.filter((t) =>
        sem[j].frontmatter.tags.includes(t),
      );
      if (shared.length >= 2) {
        contradictions.push({ a: sem[i].path, b: sem[j].path, sharedTags: shared });
      }
    }
  }

  // decay: eski working/ sayfalarını buda
  let prunedWorking = 0;
  const workingDir = path.join(root, "working");
  if (existsSync(workingDir)) {
    prunedWorking = await withLock(cwd, async () => {
      let n = 0;
      let files: string[] = [];
      try {
        files = (await readdir(workingDir)).filter((f) => f.endsWith(".md"));
      } catch {
        return 0;
      }
      for (const f of files) {
        const abs = path.join(workingDir, f);
        try {
          const st = await stat(abs);
          if ((nowMs - st.mtimeMs) / DAY_MS > WORKING_TTL_DAYS) {
            await rm(abs);
            n++;
          }
        } catch {
          /* yoksay */
        }
      }
      if (n > 0) await rebuildIndexInner(root);
      return n;
    });
  }

  if (orphans.length || stale.length || gaps.length || prunedWorking) {
    await appendLog(cwd, {
      kind: "lint",
      subject: `orphan:${orphans.length} stale:${stale.length} gap:${gaps.length} pruned:${prunedWorking}`,
    });
  }

  return { counts, orphans, stale, gaps, contradictions, prunedWorking };
}
