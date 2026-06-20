// Paylaşılan memory MCP araçları — hem Lead'in tam server'ı (mcp-server.mjs) hem de
// helper'ların memory-only server'ı (mcp-memory.mjs) bunu kullanır. Tek kaynak.
//
// `project` boş bırakılırsa MCP server'ın cwd'sine düşer = worker'ın proje dizini.
// Lead (cwd = workspace) project'i AÇIKÇA geçmeli; helper'lar (cwd = proje) boş bırakıp
// kendi projelerine yazar/arar.

import { z } from "zod";

/** server'a 8 memory tool'unu kaydeder. api/ok/fail çağıran script'ten gelir. */
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
        "kırık link (gap), çelişki ADAYLARI, konsolidasyon ADAYLARI (promotions: ≥3 " +
        "episode'da geçen ama semantic'te olmayan kaynak → terfi et) + eski working/ " +
        "sayfalarını budar. Periyodik çağır; bulguları memory_write ile düzelt " +
        "(çelişkileri yargıla; promotions'ı kalıcı semantic sayfaya topla).",
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

  server.registerTool(
    "memory_graph",
    {
      description:
        "Entity-bazlı knowledge graph traversal: bir referansla (sayfa yolu 'tier/slug.md' " +
        "VEYA entity: dosya yolu / slug / tag) aynı kaynak/link/tag'i paylaşan komşu " +
        "sayfaları döner (idf-ağırlıklı). 'src/auth/jwt.ts'e bağlı her şey' / 'bu sayfayla " +
        "ilgili her şey' sorusu. Bir konuya dokunmadan önce bağlamı topla.",
      inputSchema: {
        project: projectField,
        ref: z
          .string()
          .describe("Sayfa yolu (tier/slug.md) ya da entity (dosya yolu / slug / tag)"),
        k: z.number().int().optional().describe("Kaç komşu (default 10)"),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/graph", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.result);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_ingest",
    {
      description:
        "Karpathy 'ingest' disiplini: yeni bilgiyi yaz VE entity grafiğinden ilgili " +
        "sayfaları döndür ki onları da güncelleyesin (tek-seferlik yazım yerine bileşik " +
        "hafıza). Parametreler memory_write ile aynı; ek olarak 'related' komşu listesi döner. " +
        "Kalıcı bir öğrenmeyi işlerken memory_write yerine bunu tercih et.",
      inputSchema: {
        project: projectField,
        tier: z.enum(["semantic", "procedural", "episodic", "working"]),
        title: z.string().describe("Sayfa başlığı"),
        body: z.string().describe("Markdown gövde; iddialar satır-içi atıf taşısın: [src/x.ts]"),
        tags: z.array(z.string()).optional(),
        sources: z
          .array(z.string())
          .optional()
          .describe("Provenance. semantic/procedural'da zorunlu."),
        links: z.array(z.string()).optional(),
        slug: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/ingest", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.result);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );

  server.registerTool(
    "memory_resolve",
    {
      description:
        "İki çakışan semantic sayfayı çöz (memory_lint çelişki adayının suggestedCanonical'ı " +
        "ile): 'keep' kanonik kalır, 'drop' SUPERSEDED işaretlenir (SİLİNMEZ — geri alınabilir), " +
        "drop'un provenance'ı keep'e birleşir, drop'a banner + keep'e link eklenir. " +
        "Yollar 'tier/slug.md' formatında.",
      inputSchema: {
        project: projectField,
        keep: z.string().describe("Kanonik kalacak sayfa yolu (tier/slug.md)"),
        drop: z.string().describe("Superseded işaretlenecek sayfa yolu (tier/slug.md)"),
      },
    },
    async (args) => {
      try {
        const body = await api("/api/memory/resolve", {
          method: "POST",
          body: JSON.stringify(withProject(args)),
        });
        return ok(body.result);
      } catch (err) {
        return fail(err.message ?? String(err));
      }
    },
  );
}
