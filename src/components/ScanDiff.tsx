"use client";

import { cn } from "@/lib/cn";

/** Diff API'sinin döndürdüğü finding objesi. */
export interface DiffFinding {
  agent: string;
  severity: string;
  rule: string;
  file: string;
  line: number | null;
  why: string;
  fix: string | null;
}

interface ScanRef {
  id: string;
  repo: string;
  createdAt: string;
}

export interface DiffPayload {
  head: ScanRef;
  base: ScanRef;
  newFindings: DiffFinding[];
  resolved: DiffFinding[];
  unchanged: DiffFinding[];
  counts: { new: number; resolved: number; unchanged: number };
}

/** Severity → sinyal rengi. critical=red high=orange medium=yellow low=zinc info=cyan */
const SEVERITY_TEXT: Record<string, string> = {
  critical: "text-[color:var(--color-signal-red)]",
  high: "text-[color:var(--color-signal-amber)]",
  medium: "text-[color:var(--color-signal-yellow)]",
  low: "text-[color:var(--color-fg-secondary)]",
  info: "text-[color:var(--color-signal-cyan)]",
};
const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-[color:var(--color-signal-red)]",
  high: "border-[color:var(--color-signal-amber)]",
  medium: "border-[color:var(--color-signal-yellow)]",
  low: "border-[color:var(--color-fg-dim)]",
  info: "border-[color:var(--color-signal-cyan)]",
};

function sevText(s: string) {
  return SEVERITY_TEXT[s] ?? SEVERITY_TEXT.info;
}
function sevBorder(s: string) {
  return SEVERITY_BORDER[s] ?? SEVERITY_BORDER.info;
}

/** Üç diff grubunun renk teması — new=red resolved=green unchanged=zinc */
type GroupTone = {
  glyph: string;
  label: string;
  accent: string;
  dot: string;
  bar: string;
};
const TONES: Record<"new" | "resolved" | "unchanged", GroupTone> = {
  new: {
    glyph: "▲",
    label: "NEW",
    accent: "text-[color:var(--color-signal-red)]",
    dot: "bg-[color:var(--color-signal-red)]",
    bar: "bg-[color:var(--color-signal-red)]",
  },
  resolved: {
    glyph: "▼",
    label: "RESOLVED",
    accent: "text-[color:var(--color-signal-green)]",
    dot: "bg-[color:var(--color-signal-green)]",
    bar: "bg-[color:var(--color-signal-green)]",
  },
  unchanged: {
    glyph: "■",
    label: "UNCHANGED",
    accent: "text-[color:var(--color-fg-secondary)]",
    dot: "bg-[color:var(--color-fg-dim)]",
    bar: "bg-[color:var(--color-fg-dim)]",
  },
};

/**
 * Scan diff görünümü — iki taramayı karşılaştırır: new (kırmızı),
 * resolved (yeşil), unchanged (zinc) finding grupları + sayaçlar.
 */
export function ScanDiff({ diff }: { diff: DiffPayload }) {
  return (
    <div className="space-y-3">
      {/* head ↔ base şeridi */}
      <div className="panel-inner p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="label-tac text-[color:var(--color-signal-amber)]">
            ⇄ DELTA
          </span>
          <span
            className="log-line truncate ml-1"
            title={diff.head.repo}
          >
            {diff.head.repo}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanTag label="HEAD" ref_={diff.head} tone="amber" />
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            ◂ vs ▸
          </span>
          <ScanTag label="BASE" ref_={diff.base} tone="cyan" />
          <span className="ml-auto" />
          <CountChip kind="new" n={diff.counts.new} />
          <CountChip kind="resolved" n={diff.counts.resolved} />
          <CountChip kind="unchanged" n={diff.counts.unchanged} />
        </div>
      </div>

      <DiffGroup kind="new" findings={diff.newFindings} />
      <DiffGroup kind="resolved" findings={diff.resolved} />
      <DiffGroup kind="unchanged" findings={diff.unchanged} />
    </div>
  );
}

function ScanTag({
  label,
  ref_,
  tone,
}: {
  label: string;
  ref_: ScanRef;
  tone: "amber" | "cyan";
}) {
  const c =
    tone === "amber"
      ? "text-[color:var(--color-signal-amber)]"
      : "text-[color:var(--color-signal-cyan)]";
  return (
    <span className="inline-flex items-baseline gap-1.5 border border-[color:var(--color-border)] px-2 py-0.5">
      <span className={cn("label-tac-sm", c)}>{label}</span>
      <span className="text-[11px] text-[color:var(--color-fg)]">
        {ref_.id.slice(0, 8)}
      </span>
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
        {relTime(ref_.createdAt)}
      </span>
    </span>
  );
}

function CountChip({
  kind,
  n,
}: {
  kind: "new" | "resolved" | "unchanged";
  n: number;
}) {
  const t = TONES[kind];
  return (
    <span className="inline-flex items-baseline gap-1 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-1.5 py-0.5">
      <span className={cn("label-tac-sm", t.accent)}>{t.glyph}</span>
      <span className={cn("label-tac-sm", t.accent)}>{t.label}</span>
      <span className="label-tac-sm text-[color:var(--color-fg)]">{n}</span>
    </span>
  );
}

function DiffGroup({
  kind,
  findings,
}: {
  kind: "new" | "resolved" | "unchanged";
  findings: DiffFinding[];
}) {
  const t = TONES[kind];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-0.5">
        <span className={cn("h-2 w-2 shrink-0", t.dot)} />
        <span className={cn("label-tac", t.accent)}>{t.label}</span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {findings.length}
        </span>
        <span className="flex-1 h-px bg-[color:var(--color-border)] ml-1" />
      </div>
      {findings.length === 0 ? (
        <div className="panel-inner px-3 py-2.5 label-tac-sm text-[color:var(--color-fg-disabled)]">
          ▸ none
        </div>
      ) : (
        findings.map((f, i) => (
          <DiffRow key={`${kind}-${i}`} finding={f} bar={t.bar} />
        ))
      )}
    </div>
  );
}

function DiffRow({ finding: f, bar }: { finding: DiffFinding; bar: string }) {
  return (
    <div className="panel-inner flex items-stretch">
      <span className={cn("w-[2px] shrink-0", bar)} />
      <div className="flex-1 min-w-0 px-3 py-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "label-tac-sm border px-1.5 py-0.5 shrink-0",
              sevBorder(f.severity),
              sevText(f.severity),
            )}
          >
            {f.severity}
          </span>
          <span className="label-tac-sm text-[color:var(--color-signal-cyan)] shrink-0">
            {f.agent}
          </span>
          <span className="text-[12px] text-[color:var(--color-fg)] truncate flex-1">
            {f.rule}
          </span>
          <span
            className="text-[11px] text-[color:var(--color-fg-dim)] shrink-0 hidden sm:inline"
            title={f.file}
          >
            {f.file}
            {f.line != null && (
              <span className="text-[color:var(--color-signal-amber)]">
                :{f.line}
              </span>
            )}
          </span>
        </div>
        <div className="text-[11px] text-[color:var(--color-fg-secondary)] mt-1 leading-relaxed">
          {f.why}
        </div>
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
