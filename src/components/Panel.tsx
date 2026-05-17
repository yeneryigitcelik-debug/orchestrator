"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkerPane, type WorkerSnapshot } from "./WorkerPane";
import { LeadChat, type LeadSnapshot } from "./LeadChat";
import { TransmissionBar } from "./TransmissionBar";
import { StatusBadge } from "./StatusBadge";
import { AgentCard, SpawnCard } from "./AgentCard";
import { SpawnDialog } from "./SpawnDialog";
import { ProjectDialog } from "./ProjectDialog";
import { UsageTicker } from "./UsageTicker";
import { eventToFeedLines, type FeedLine } from "@/lib/feed";

/** Kart başına tutulan azami canlı feed satırı. */
const FEED_CAP = 40;
/** Aktif proje localStorage anahtarı. */
const PROJECT_KEY = "orchestrator.activeProject";

/** Üst nav linkleri — roster + scan/diff/drift/audit Mission Control header'ında. */
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/roster", label: "▦ ROSTER" },
  { href: "/scan", label: "◈ SCAN" },
  { href: "/scan/diff", label: "⇄ DIFF" },
  { href: "/scan/drift", label: "▰ DRIFT" },
  { href: "/audit", label: "▤ AUDIT" },
  { href: "/usage", label: "$ USAGE" },
];

function projectBasename(p: string): string {
  const parts = p.replace(/[/\\]+$/, "").split(/[/\\]/);
  return parts[parts.length - 1] || p;
}

/**
 * Mission Control — agent kart grid'i. Her kart bir worker; kart'a tıkla → tam
 * konsol. Tek multiplex SSE (/api/stream) tüm worker'ların event'lerini akıtır.
 * Aktif Proje: bir kez seçilir, her spawn varsayılan olarak onu kullanır.
 */
export function Panel({
  lead,
  initialHelpers,
}: {
  lead: LeadSnapshot;
  initialHelpers: WorkerSnapshot[];
}) {
  const leadAsWorker = useMemo<WorkerSnapshot>(
    () => ({ ...lead, sessionId: "", messageCount: 0 }),
    [lead],
  );

  const [workers, setWorkers] = useState<WorkerSnapshot[]>([
    leadAsWorker,
    ...initialHelpers,
  ]);
  const [feeds, setFeeds] = useState<Map<string, FeedLine[]>>(() => new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [activeProject, setActiveProject] = useState("");

  // Aktif proje'yi localStorage'dan geri yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROJECT_KEY);
      if (saved) setActiveProject(saved);
    } catch {
      /* localStorage yok — sorun değil */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (!res.ok) return;
      const data = (await res.json()) as { workers: WorkerSnapshot[] };
      if (Array.isArray(data.workers) && data.workers.length > 0) {
        setWorkers(data.workers);
      }
    } catch {
      /* sessizce geç */
    }
  }, []);

  // Periyodik tam senkron — yeni worker / messageCount / reconcile.
  useEffect(() => {
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [refresh]);

  // Multiplex SSE — tüm worker'ların canlı event'leri tek bağlantıdan.
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as {
          type?: string;
          workerId?: string;
          event?: { type?: string; [k: string]: unknown };
        };
        if (data.type === "_hello") {
          setFeeds(new Map());
          return;
        }
        const { workerId, event } = data;
        if (!workerId || !event) return;

        // status / goal'i anlık güncelle — 2.5sn poll'u beklemeden.
        if (event.type === "_local_status") {
          const s = String(event.status ?? "");
          if (s) {
            setWorkers((ws) =>
              ws.map((w) => (w.id === workerId ? { ...w, status: s } : w)),
            );
          }
        } else if (event.type === "_local_goal_changed") {
          setWorkers((ws) =>
            ws.map((w) =>
              w.id === workerId
                ? {
                    ...w,
                    goal: (event.goal as string | null) ?? null,
                    iteration: Number(event.iteration ?? w.iteration),
                  }
                : w,
            ),
          );
        }

        const lines = eventToFeedLines(event);
        if (lines.length > 0) {
          setFeeds((prev) => {
            const next = new Map(prev);
            const cur = next.get(workerId) ?? [];
            next.set(workerId, [...cur, ...lines].slice(-FEED_CAP));
            return next;
          });
        }
      } catch {
        /* parse hatası — yoksay */
      }
    };
    return () => es.close();
  }, []);

  const leadSnap = useMemo(
    () => workers.find((w) => w.role === "lead") ?? leadAsWorker,
    [workers, leadAsWorker],
  );
  const helpers = useMemo(
    () => workers.filter((w) => w.role !== "lead"),
    [workers],
  );

  const stats = useMemo(() => {
    const live = helpers.filter(
      (w) => w.status === "running" || w.status === "thinking",
    ).length;
    const crashed = helpers.filter((w) => w.status === "crashed").length;
    return { total: helpers.length, live, crashed };
  }, [helpers]);

  const onKilled = (id: string) => {
    setWorkers((ws) => ws.filter((w) => w.id !== id));
    setFeeds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const onSpawned = (w: WorkerSnapshot) => {
    setWorkers((ws) => [...ws.filter((x) => x.id !== w.id), w]);
    setSpawnOpen(false);
    setExpandedId(w.id); // yeni helper'ın konsolunu aç
    refresh();
  };

  // Aktif proje seç → localStorage'a yaz + Lead'e bildir
  const applyProject = (path: string) => {
    setActiveProject(path);
    try {
      localStorage.setItem(PROJECT_KEY, path);
    } catch {
      /* yoksay */
    }
    setProjectOpen(false);
    fetch(`/api/workers/${leadSnap.id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          `[AKTİF PROJE] Çalışma klasörü: ${path}\n` +
          `Bundan sonraki görevleri bu projede yürüt. Paralel helper gerektiğinde, ` +
          `repo git deposuysa her helper için "git worktree add" ile ayrı worktree + ` +
          `branch aç (çakışma olmasın); değilse ayrı alt-dizin kullan.`,
      }),
    }).catch(() => {});
  };

  const expanded = expandedId
    ? workers.find((w) => w.id === expandedId)
    : undefined;
  const showTransmission = !expanded || expanded.role === "lead";

  return (
    <>
      <div className="scanline-top" />
      <div className="relative z-10 h-screen flex flex-col">
        {/* === HEADER === */}
        <header className="reveal flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/75 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="brand-display brand-flicker text-[20px] text-[color:var(--color-signal-amber)] leading-none tracking-wider glow-soft">
              ORCHESTRATOR
            </span>
            <span className="brand-cursor text-[20px] text-[color:var(--color-signal-amber)] leading-none">
              ▮
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-1 hidden lg:inline">
            v0.1.0
          </span>
          <span className="ml-auto" />
          <Pill
            label="HELPERS"
            value={`${stats.live}/${stats.total}`}
            accent={stats.live > 0 ? "green" : "dim"}
          />
          {stats.crashed > 0 && (
            <Pill label="CRASH" value={String(stats.crashed)} accent="red" />
          )}
          <button
            onClick={() => setProjectOpen(true)}
            title={activeProject || "Aktif proje seç"}
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors max-w-[200px] truncate"
          >
            ◆{" "}
            {activeProject ? projectBasename(activeProject) : "SET PROJECT"}
          </button>
          <nav className="flex items-stretch -space-x-px">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <button
            onClick={() => setSpawnOpen(true)}
            className="label-tac-sm border border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10 px-2.5 py-1 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)] hover:text-[color:var(--color-bg-deep)] transition-colors"
          >
            ⊕ SPAWN
          </button>
        </header>

        {/* === BODY === */}
        {!expanded ? (
          <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 reveal">
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(290px,1fr))] max-w-[1640px] mx-auto">
              <AgentCard
                snapshot={leadSnap}
                isLead
                feed={feeds.get(leadSnap.id)}
                onOpen={() => setExpandedId(leadSnap.id)}
              />
              {helpers.map((h) => (
                <AgentCard
                  key={h.id}
                  snapshot={h}
                  feed={feeds.get(h.id)}
                  onOpen={() => setExpandedId(h.id)}
                  onKilled={onKilled}
                />
              ))}
              <SpawnCard onClick={() => setSpawnOpen(true)} />
            </div>
            {helpers.length === 0 && (
              <div className="max-w-[1640px] mx-auto mt-4 label-tac-sm text-[color:var(--color-fg-disabled)] text-center">
                ▸ henüz helper yok — kart'tan spawn et, ya da Lead'e görev ver, o
                spawn etsin
              </div>
            )}
          </main>
        ) : (
          <main className="flex-1 min-h-0 flex flex-col reveal">
            {/* Breadcrumb — grid'e dönüş */}
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)]/60 shrink-0">
              <button
                onClick={() => setExpandedId(null)}
                className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] transition-colors"
              >
                ◂ MISSION GRID
              </button>
              <span className="text-[color:var(--color-fg-disabled)]">/</span>
              <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
                {expanded.role === "lead"
                  ? "LEAD CONSOLE"
                  : `${expanded.role.toUpperCase()} · ${expanded.name}`}
              </span>
              <span className="ml-auto" />
              <StatusBadge status={expanded.status} size="sm" />
            </div>

            {expanded.role === "lead" ? (
              <LeadChat
                lead={lead}
                onStatusChange={(s) =>
                  setWorkers((ws) =>
                    ws.map((w) =>
                      w.role === "lead" ? { ...w, status: s } : w,
                    ),
                  )
                }
              />
            ) : (
              <WorkerPane
                key={expanded.id}
                worker={expanded}
                onKilled={onKilled}
                onUpdated={refresh}
              />
            )}
          </main>
        )}

        {/* === TRANSMISSION (her zaman Lead'e) === */}
        {showTransmission && (
          <div className="reveal shrink-0">
            <TransmissionBar leadId={leadSnap.id} />
          </div>
        )}

        {/* === TELEMETRY === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/75 flex items-center gap-3 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3005</span>
          <span>·</span>
          <span>MAX :: claude.ai OAuth</span>
          {activeProject && (
            <>
              <span>·</span>
              <span
                className="text-[color:var(--color-fg-dim)] truncate max-w-[280px]"
                title={activeProject}
              >
                ◆ {activeProject}
              </span>
            </>
          )}
          <span className="ml-auto" />
          <UsageTicker />
          <span>
            {expanded
              ? expanded.role === "lead"
                ? "console · LEAD"
                : `console · ${expanded.name}`
              : `grid · ${helpers.length + 1} agents`}
          </span>
        </footer>
      </div>

      {spawnOpen && (
        <SpawnDialog
          onClose={() => setSpawnOpen(false)}
          onSpawned={onSpawned}
          defaultCwd={activeProject}
        />
      )}
      {projectOpen && (
        <ProjectDialog
          current={activeProject}
          onClose={() => setProjectOpen(false)}
          onSet={applyProject}
        />
      )}
    </>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "green" | "red" | "dim";
}) {
  const accentColor = {
    amber: "text-[color:var(--color-signal-amber)]",
    green: "text-[color:var(--color-signal-green)]",
    red: "text-[color:var(--color-signal-red)]",
    dim: "text-[color:var(--color-fg-dim)]",
  }[accent];
  return (
    <span className="inline-flex items-baseline gap-1.5 border border-[color:var(--color-border)] px-2 py-0.5">
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        {label}
      </span>
      <span className={`label-tac-sm ${accentColor}`}>{value}</span>
    </span>
  );
}
