// Review worker'ın `result` çıktısından JSON finding'leri çıkarır.
// Üç katmanlı: doğrudan array → code-fence → dengeli array taraması.
// Model markdown'a kaçsa bile ilk geçerli JSON array'i yakalar.

import type { FindingDraft, Severity } from "./types";

const SEVERITIES = new Set<Severity>([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export function parseFindings(raw: string): FindingDraft[] {
  // [DONE]/[BLOCKED] marker'larını temizle
  const text = raw.replace(/\[DONE\]/gi, "").replace(/\[BLOCKED\][^\n]*/gi, "").trim();

  const candidates: string[] = [];

  const direct = text.match(/^\s*(\[[\s\S]*\])\s*$/);
  if (direct) candidates.push(direct[1]);

  for (const m of text.matchAll(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/g)) {
    candidates.push(m[1]);
  }

  const balanced = extractFirstBalancedArray(text);
  if (balanced) candidates.push(balanced);

  let best: FindingDraft[] = [];
  for (const c of candidates) {
    const parsed = tryParseArray(c);
    if (parsed.length > best.length) best = parsed;
  }
  return best;
}

function tryParseArray(s: string): FindingDraft[] {
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr.flatMap((x) => {
      const f = normalizeFinding(x);
      return f ? [f] : [];
    });
  } catch {
    return [];
  }
}

function normalizeFinding(x: unknown): FindingDraft | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const severity = String(o.severity ?? "").toLowerCase() as Severity;
  if (!SEVERITIES.has(severity)) return null;
  const rule = typeof o.rule === "string" ? o.rule.slice(0, 200) : "";
  const file = typeof o.file === "string" ? o.file.slice(0, 500) : "";
  const why = typeof o.why === "string" ? o.why.slice(0, 2000) : "";
  if (!rule || !file || !why) return null;
  const lineNum = Number(o.line);
  return {
    severity,
    rule,
    file,
    line: Number.isInteger(lineNum) && lineNum > 0 ? lineNum : null,
    why,
    fix: typeof o.fix === "string" ? o.fix.slice(0, 2000) : null,
    evidence: typeof o.evidence === "string" ? o.evidence.slice(0, 2000) : null,
  };
}

function extractFirstBalancedArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
