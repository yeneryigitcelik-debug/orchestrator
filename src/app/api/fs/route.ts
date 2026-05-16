// GET /api/fs?path=<abs> — bir dizinin alt klasörlerini listeler.
// Yerel araç: panel localhost'ta, worker'lar zaten bypassPermissions ile tüm
// FS'e erişiyor → klasör gezme bu güven modeliyle tutarlı. SpawnDialog'un
// klasör seçicisi bunu kullanır.

import { NextRequest, NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return resolve(homedir(), p.slice(2));
  return resolve(p);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path");
  const path = raw && raw.trim() ? expandHome(raw.trim()) : homedir();
  const parent = dirname(path);

  try {
    const entries = await readdir(path, { withFileTypes: true });
    const dirs = entries
      .filter((e) => {
        try {
          return e.isDirectory();
        } catch {
          return false;
        }
      })
      .map((e) => e.name)
      .filter((n) => n !== "node_modules")
      .sort((a, b) => {
        // dotfile klasörleri sona
        const da = a.startsWith(".");
        const db = b.startsWith(".");
        if (da !== db) return da ? 1 : -1;
        return a.localeCompare(b);
      })
      .slice(0, 400);

    return NextResponse.json({
      path,
      parent: parent !== path ? parent : null,
      exists: true,
      dirs,
    });
  } catch (err) {
    return NextResponse.json({
      path,
      parent: parent !== path ? parent : null,
      exists: false,
      dirs: [],
      error: err instanceof Error ? err.message : "okunamadı",
    });
  }
}
