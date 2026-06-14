// Paylaşılan memory MCP araçları — hem Lead'in tam server'ı (mcp-server.mjs) hem de
// helper'ların memory-only server'ı (mcp-memory.mjs) bunu kullanır. Tek kaynak.
//
// `project` boş bırakılırsa MCP server'ın cwd'sine düşer = worker'ın proje dizini.
// Lead (cwd = workspace) project'i AÇIKÇA geçmeli; helper'lar (cwd = proje) boş bırakıp
// kendi projelerine yazar/arar.

import { z } from "zod";

/** server'a 5 memory tool'unu kaydeder. api/ok/fail çağıran script'ten gelir. */
export function registerMemoryTools(server, api, ok, fail) {
  const withProject = (args) => ({
    ...args,
    project: args.project && args.project.trim() ? args.project : process.cwd(),
  });
  const projectField = z
    .string()
    .optional()
    .describe("Proje absolute path'i. Boş = bu proje (MCP cwd). Lead AÇIKÇA geçmeli.");

  server.registerTool(
    "memory_write",
    {
      description:
        "Bir projenin kalıcı hafızasına (.agentwiki) sayfa yaz/güncelle. " +
        "tier: semantic (kalıcı fact/karar/mimari/API kontratı/gotcha) | " +
        "procedural (tekrarlanan how-to/runbook) | episodic (oturum notu) | working (geçici). " +
        "semantic/procedural için sources ZORUNLU — iddiayı dosya/episode'a bağla (provenance). " +
        "Aynı slug varsa günceller (tag/source/link birleşir, gövde değişir).",
      inputSchema: {
        project: projectField,
        tier: z.enum(["semantic", "procedural", "episodic", "working"]),
        title: z.string().describe("Sayfa başlığı"),
        body: z
          .string()
          .describe("Markdown gövde. İddialar satır-içi atıf taşısın: [src/x.ts]"),
        tags: z.array(z.string()).optional(),
        sources: z
          .array(z.string())
          .optional()
          .describe(
            "Provenance: 'src/auth/jwt.ts' veya 'episode:episodic/2026-...md'. semantic/procedural'da zorunlu.",
          ),
        links: z.array(z.string()).optional().describe("İlgili sayfa slug'ları"),
        slug: z.string().optional().describe("Boş bırakılırsa başlıktan üretilir"),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/write", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.page);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_read",
    {
      description:
        "Bir projenin hafıza sayfasını oku. path = 'tier/slug.md' " +
        "(örn 'semantic/auth-mimarisi.md'). Yolları memory_index / INDEX'ten bul.",
      inputSchema: {
        project: projectField,
        path: z.string().describe("tier/slug.md"),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/read", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.page);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_index",
    {
      description:
        "Bir projenin hafıza INDEX'ini + sayfa listesini getir. Bir projede iş " +
        "yapmadan ÖNCE çağır — neyin zaten bilindiğini gör, tekrarlama.",
      inputSchema: { project: projectField },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/index", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok({ index: body.index, pages: body.pages });
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_search",
    {
      description:
        "Bir projenin hafızasında hibrit arama (keyword + yerel vektör). İlgili sayfaları " +
        "skor + snippet ile döner. Bir konuda iş yapmadan önce 'bunu daha önce çözmüş " +
        "müyüz / karar vermiş miyiz?' diye ara.",
      inputSchema: {
        project: projectField,
        query: z.string().describe("Aranacak metin / konu"),
        k: z.number().int().optional().describe("Kaç sonuç (default 8)"),
        tier: z.enum(["semantic", "procedural", "episodic"]).optional(),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/search", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.hits);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_lint",
    {
      description:
        "Bir projenin hafızasını denetle: orphan (referanssız) sayfalar, bayat sayfalar, " +
        "kırık link (gap), çelişki ADAYLARI + eski working/ sayfalarını budar. Periyodik " +
        "çağır; bulguları memory_write ile düzelt (çelişkileri yargıla).",
      inputSchema: { project: projectField },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/lint", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.report);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );
}
