"use client";

// Proje hafızası (.agentwiki) görüntüleyici. Salt-okuma + lint tetikleyici.
// Proje seç → INDEX/sayfalar; ara (hibrit); sayfa oku; lint çalıştır. Canlı (SSE).

import { useCallback, useEffect, useState, type ReactNode } from "react";

interface PageMeta {
  path: string;
  tier: string;
  title: string;
  tags: string[];
  hits: number;
  updatedAt: string;
  bytes: number;
}
interface ProjectInfo {
  cwd: string;
  pages: number;
}
interface Hit {
  path: string;
  tier: string;
  title: string;
  score: number;
  snippet: string;
  tags: string[];
}
interface PageDetail {
  path: string;
  frontmatter: {
    tier: string;
    title: string;
    tags: string[];
    sources: string[];
    links: string[];
    createdAt: string;
    updatedAt: string;
    hits: number;
  };
  body: string;
}
interface LintReport {
  counts: Record<string, number>;
  orphans: { path: string; title: string }[];
  stale: { path: string; title: string; updatedAt: string; hits: number }[];
  gaps: { from: string; missingLink: string }[];
  contradictions: { a: string; b: string; sharedTags: string[] }[];
  prunedWorking: number;
}

const TIER_COLOR: Record<string, string> = {
  semantic: "var(--color-signal-green)",
  procedural: "var(--color-signal-amber)",
  episodic: "var(--color-phosphor)",
  working: "var(--color-fg-dim)",
};
const TIERS = ["semantic", "procedural", "episodic", "working"];

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
async function postJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

const cls = {
  chip: "label-tac-sm border px-1.5 py-0.5 shrink-0",
  input:
    "bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-1 text-[12.5px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-signal-amber)]",
};

export function MemoryPanel() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [project, setProject] = useState("");
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [detail, setDetail] = useState<PageDetail | null>(null);
  const [lint, setLint] = useState<LintReport | null>(null);
  const [busy, setBusy] = useState(false);

  const loadProjects = useCallback(async () => {
    const d = await getJSON<{ projects: ProjectInfo[] }>("/api/memory/projects");
    if (d) setProjects(d.projects ?? []);
  }, []);

  const loadIndex = useCallback(async (p: string) => {
    if (!p) return;
    const d = await postJSON<{ pages: PageMeta[] }>("/api/memory/index", {
      project: p,
    });
    if (d) setPages(d.pages ?? []);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!project) return;
    setHits(null);
    setDetail(null);
    setLint(null);
    void loadIndex(project);
  }, [project, loadIndex]);

  useEffect(() => {
    const es = new EventSource("/api/memory/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as { type?: string; project?: string };
        if (data.type?.startsWith("memory.") && data.project === project) {
          void loadIndex(project);
        }
      } catch {
        /* yoksay */
      }
    };
    return () => es.close();
  }, [project, loadIndex]);

  const openPage = async (path: string) => {
    setLint(null);
    setHits(null);
    const d = await postJSON<{ page: PageDetail }>("/api/memory/read", {
      project,
      path,
    });
    if (d?.page) setDetail(d.page);
  };
  const runSearch = async () => {
    if (!project || !query.trim()) return;
    setBusy(true);
    setDetail(null);
    setLint(null);
    const d = await postJSON<{ hits: Hit[] }>("/api/memory/search", {
      project,
      query,
    });
    setHits(d?.hits ?? []);
    setBusy(false);
  };
  const runLint = async () => {
    if (!project) return;
    setBusy(true);
    setDetail(null);
    setHits(null);
    const d = await postJSON<{ report: LintReport }>("/api/memory/lint", {
      project,
    });
    setLint(d?.report ?? null);
    setBusy(false);
    void loadIndex(project);
  };

  return (
    <div className="flex flex-col h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-2.5 bg-[color:var(--color-bg-panel)]/75 shrink-0">
        <a
          href="/"
          className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-phosphor)]"
        >
          ◂ MISSION CONTROL
        </a>
        <span className="label-tac-sm text-[color:var(--color-phosphor)] glow-soft">
          ❖ PROJE HAFIZASI (.agentwiki)
        </span>
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className={cls.input}
        >
          <option value="">— proje seç —</option>
          {projects.map((p) => (
            <option key={p.cwd} value={p.cwd}>
              {p.cwd} ({p.pages})
            </option>
          ))}
        </select>
        <input
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="…veya proje yolu yapıştır"
          className={`${cls.input} flex-1 min-w-0`}
        />
        <button
          onClick={runLint}
          disabled={!project || busy}
          className={`${cls.chip} border-[color:var(--color-signal-amber)] text-[color:var(--color-signal-amber)] disabled:opacity-40`}
        >
          ⚐ LINT
        </button>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 flex">
        {/* sol: arama + sayfa listesi */}
        <div className="w-[40%] min-w-[280px] border-r border-[color:var(--color-border)] flex flex-col min-h-0">
          <div className="flex gap-1 px-3 py-2 border-b border-[color:var(--color-border)]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="hibrit ara (keyword + vektör)…"
              className={`${cls.input} flex-1 min-w-0`}
            />
            <button
              onClick={runSearch}
              disabled={!project || busy}
              className={`${cls.chip} border-[color:var(--color-phosphor)] text-[color:var(--color-phosphor)] disabled:opacity-40`}
            >
              ARA
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {!project ? (
              <Empty text="▸ bir proje seç" />
            ) : pages.length === 0 ? (
              <Empty text="▸ bu projede hafıza sayfası yok" />
            ) : (
              TIERS.map((tier) => {
                const inTier = pages.filter((p) => p.tier === tier);
                if (inTier.length === 0) return null;
                return (
                  <div key={tier}>
                    <div
                      className="label-tac-sm px-3 py-1 sticky top-0 bg-[color:var(--color-bg-panel)] border-b border-[color:var(--color-border)]/40"
                      style={{ color: TIER_COLOR[tier] }}
                    >
                      {tier} ({inTier.length})
                    </div>
                    {inTier.map((p) => (
                      <button
                        key={p.path}
                        onClick={() => openPage(p.path)}
                        className="w-full text-left border-b border-[color:var(--color-border)]/30 px-3 py-1.5 hover:bg-[color:var(--color-bg-input)]/50"
                      >
                        <div className="text-sm text-[color:var(--color-fg-primary)] truncate">
                          {p.title}
                        </div>
                        <div className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                          {p.tags.join(", ") || "—"} · hits {p.hits}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* sağ: detay / arama sonucu / lint */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {lint ? (
            <LintView report={lint} onOpen={openPage} />
          ) : hits ? (
            <HitsView hits={hits} onOpen={openPage} />
          ) : detail ? (
            <DetailView detail={detail} />
          ) : (
            <Empty text="▸ sayfa seç, ara veya lint çalıştır" />
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="label-tac-sm text-[color:var(--color-fg-disabled)] p-4 text-center">
      {text}
    </div>
  );
}

function DetailView({ detail }: { detail: PageDetail }) {
  const fm = detail.frontmatter;
  return (
    <div>
      <div className="label-tac-sm" style={{ color: TIER_COLOR[fm.tier] }}>
        [{fm.tier}] {detail.path}
      </div>
      <h2 className="text-lg text-[color:var(--color-fg-primary)] glow-soft mt-1">
        {fm.title}
      </h2>
      <div className="label-tac-sm text-[color:var(--color-fg-dim)] mt-1">
        tags: {fm.tags.join(", ") || "—"} · hits {fm.hits} · güncel{" "}
        {new Date(fm.updatedAt).toLocaleString("tr-TR")}
      </div>
      {fm.sources.length > 0 && (
        <div className="label-tac-sm text-[color:var(--color-fg-dim)] mt-0.5">
          kaynak: {fm.sources.join(" · ")}
        </div>
      )}
      <pre className="text-sm text-[color:var(--color-fg-primary)] whitespace-pre-wrap mt-3 font-[inherit]">
        {detail.body}
      </pre>
    </div>
  );
}

function HitsView({
  hits,
  onOpen,
}: {
  hits: Hit[];
  onOpen: (p: string) => void;
}) {
  if (hits.length === 0) return <Empty text="▸ sonuç yok" />;
  return (
    <div className="flex flex-col gap-2">
      <div className="label-tac-sm text-[color:var(--color-phosphor)]">
        ▸ {hits.length} sonuç
      </div>
      {hits.map((h) => (
        <button
          key={h.path}
          onClick={() => onOpen(h.path)}
          className="text-left border border-[color:var(--color-border)] px-3 py-2 hover:border-[color:var(--color-phosphor)]"
        >
          <div className="flex items-center gap-2">
            <span className="label-tac-sm" style={{ color: TIER_COLOR[h.tier] }}>
              [{h.tier}]
            </span>
            <span className="text-sm text-[color:var(--color-fg-primary)]">
              {h.title}
            </span>
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-auto">
              {h.score}
            </span>
          </div>
          <div className="text-sm text-[color:var(--color-fg-secondary)] mt-1 line-clamp-2">
            {h.snippet}
          </div>
        </button>
      ))}
    </div>
  );
}

function LintView({
  report,
  onOpen,
}: {
  report: LintReport;
  onOpen: (p: string) => void;
}) {
  const Section = ({
    title,
    color,
    children,
  }: {
    title: string;
    color: string;
    children: ReactNode;
  }) => (
    <div className="mb-3">
      <div className="label-tac-sm" style={{ color }}>
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
  const Row = ({ path, label }: { path: string; label: string }) => (
    <button
      onClick={() => onOpen(path)}
      className="block text-left text-sm text-[color:var(--color-fg-secondary)] hover:text-[color:var(--color-phosphor)]"
    >
      • {label}
    </button>
  );
  return (
    <div>
      <div className="label-tac-sm text-[color:var(--color-signal-amber)] glow-soft">
        ⚐ LINT RAPORU
      </div>
      <div className="label-tac-sm text-[color:var(--color-fg-dim)] mt-1 mb-3">
        sayfalar: semantic {report.counts.semantic} · procedural{" "}
        {report.counts.procedural} · episodic {report.counts.episodic} · working{" "}
        {report.counts.working} · budanan working {report.prunedWorking}
      </div>
      {report.orphans.length > 0 && (
        <Section title={`ORPHAN (${report.orphans.length})`} color="var(--color-signal-red)">
          {report.orphans.map((o) => (
            <Row key={o.path} path={o.path} label={o.title} />
          ))}
        </Section>
      )}
      {report.stale.length > 0 && (
        <Section title={`BAYAT (${report.stale.length})`} color="var(--color-signal-amber)">
          {report.stale.map((s) => (
            <Row key={s.path} path={s.path} label={`${s.title} — ${new Date(s.updatedAt).toLocaleDateString("tr-TR")}`} />
          ))}
        </Section>
      )}
      {report.gaps.length > 0 && (
        <Section title={`KIRIK LİNK (${report.gaps.length})`} color="var(--color-signal-red)">
          {report.gaps.map((g, i) => (
            <Row key={i} path={g.from} label={`${g.from} → ${g.missingLink}`} />
          ))}
        </Section>
      )}
      {report.contradictions.length > 0 && (
        <Section
          title={`ÇELİŞKİ ADAYI (${report.contradictions.length})`}
          color="var(--color-phosphor)"
        >
          {report.contradictions.map((c, i) => (
            <div
              key={i}
              className="text-sm text-[color:var(--color-fg-secondary)]"
            >
              • {c.a} ⇆ {c.b}{" "}
              <span className="text-[color:var(--color-fg-disabled)]">
                ({c.sharedTags.join(", ")})
              </span>
            </div>
          ))}
        </Section>
      )}
      {report.orphans.length === 0 &&
        report.stale.length === 0 &&
        report.gaps.length === 0 &&
        report.contradictions.length === 0 && (
          <div className="label-tac-sm text-[color:var(--color-signal-green)]">
            ▸ temiz — bulgu yok
          </div>
        )}
    </div>
  );
}
