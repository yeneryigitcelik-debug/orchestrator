// Yerel / offline metin embedding — @xenova/transformers (all-MiniLM-L6-v2, 384-dim).
// Model LAZY yüklenir (ilk embed çağrısında); ilk indirmeden sonra offline çalışır.
// SIFIR API maliyeti. Per-proje vektör cache (.cache/embeddings.json) hash-bazlı
// invalidasyon ile — yalnız içeriği değişen sayfa yeniden embed edilir.
//
// YALNIZ daemon process'inde çalışır (heavy dep Next bundle'ına girmez).
// Kapatmak için: MEMORY_EMBEDDINGS=0 → searchMemory keyword-only'ye düşer.

import { existsSync } from "node:fs";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const DIM = 384;

/* eslint-disable @typescript-eslint/no-explicit-any */
let extractorP: Promise<any> | null = null;
function getExtractor(): Promise<any> {
  extractorP ??= pipeline("feature-extraction", MODEL);
  return extractorP;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** MEMORY_EMBEDDINGS=0/false ile kapatılabilir (keyword-only'ye düşülür). */
export function embeddingsEnabled(): boolean {
  const v = process.env.MEMORY_EMBEDDINGS;
  return v !== "0" && v !== "false";
}

/** Metni 384-dim, L2-normalize edilmiş vektöre çevirir (mean-pool). */
export async function embed(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const out = await extractor(text.slice(0, 8000), {
    pooling: "mean",
    normalize: true,
  });
  return Float32Array.from(out.data as ArrayLike<number>);
}

/** İki normalize vektörün cosine benzerliği (= dot product). */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function hashText(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

export interface EmbItem {
  path: string;
  text: string;
  hash: string;
}

interface CacheEntry {
  hash: string;
  vec: number[];
}
interface CacheFile {
  model: string;
  dim: number;
  entries: Record<string, CacheEntry>;
}

/**
 * Item'lar için vektör Map'i döndürür; yalnız hash'i değişen/eksik olanları
 * yeniden embed eder, gerisini cache'ten alır. Silinen path'leri cache'ten düşürür.
 * Model yüklenemezse HATA fırlatır → çağıran keyword-only'ye düşmeli.
 */
export async function ensureEmbeddings(
  cacheFile: string,
  items: EmbItem[],
): Promise<Map<string, Float32Array>> {
  let cache: CacheFile = { model: MODEL, dim: DIM, entries: {} };
  if (existsSync(cacheFile)) {
    try {
      const j = JSON.parse(await readFile(cacheFile, "utf8")) as CacheFile;
      if (j?.model === MODEL && j?.dim === DIM && j.entries) cache = j;
    } catch {
      /* bozuk cache → sıfırdan */
    }
  }
  const result = new Map<string, Float32Array>();
  const wanted = new Set(items.map((i) => i.path));
  let changed = false;

  for (const p of Object.keys(cache.entries)) {
    if (!wanted.has(p)) {
      delete cache.entries[p];
      changed = true;
    }
  }
  for (const it of items) {
    const cur = cache.entries[it.path];
    if (cur && cur.hash === it.hash && cur.vec.length === DIM) {
      result.set(it.path, Float32Array.from(cur.vec));
      continue;
    }
    const vec = await embed(it.text);
    cache.entries[it.path] = { hash: it.hash, vec: Array.from(vec) };
    result.set(it.path, vec);
    changed = true;
  }
  if (changed) {
    await mkdir(path.dirname(cacheFile), { recursive: true });
    const tmp = `${cacheFile}.tmp`;
    await writeFile(tmp, JSON.stringify(cache), "utf8");
    await rename(tmp, cacheFile);
  }
  return result;
}
