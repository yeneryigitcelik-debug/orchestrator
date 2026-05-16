"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export interface Finding {
  id: string;
  agent: string;
  severity: string;
  rule: string;
  file: string;
  line: number | null;
  why: string;
  fix: string | null;
  evidence: string | null;
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

/** Severity → sinyal rengi. critical=red high=orange medium=yellow low=zinc info=cyan */
const SEVERITY_STYLE: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  critical: {
    text: "text-[color:var(--color-signal-red)]",
    border: "border-[color:var(--color-signal-red)]",
    bg: "bg-[color:var(--color-signal-red)]",
  },
  high: {
    // orange — signal-amber bu paletteki turuncu
    text: "text-[color:var(--color-signal-amber)]",
    border: "border-[color:var(--color-signal-amber)]",
    bg: "bg-[color:var(--color-signal-amber)]",
  },
  medium: {
    text: "text-[color:var(--color-signal-yellow)]",
    border: "border-[color:var(--color-signal-yellow)]",
    bg: "bg-[color:var(--color-signal-yellow)]",
  },
  low: {
    // zinc — paletteki nötr gri
    text: "text-[color:var(--color-fg-secondary)]",
    border: "border-[color:var(--color-fg-dim)]",
    bg: "bg-[color:var(--color-fg-dim)]",
  },
  info: {
    text: "text-[color:var(--color-signal-cyan)]",
    border: "border-[color:var(--color-signal-cyan)]",
    bg: "bg-[color:var(--color-signal-cyan)]",
  },
};

function sevStyle(s: string) {
  return SEVERITY_STYLE[s] ?? SEVERITY_STYLE.info;
}

/** Küçük renkli severity sayaç pill'i. */
export function SeverityPill({
  severity,
  count,
}: {
  severity: string;
  count: number;
}) {
  const st = sevStyle(severity);
  const muted = count === 0;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 border px-1.5 py-0.5",
        muted
          ? "border-[color:var(--color-border)]"
          : st.border + " bg-[color:var(--color-bg-elevated)]",
      )}
    >
      <span
        className={cn(
          "label-tac-sm",
          muted ? "text-[color:var(--color-fg-disabled)]" : st.text,
        )}
      >
        {severity.slice(0, 4)}
      </span>
      <span
        className={cn(
          "label-tac-sm",
          muted ? "text-[color:var(--color-fg-disabled)]" : "text-[color:var(--color-fg)]",
        )}
      >
        {count}
      </span>
    </span>
  );
}

/**
 * Findings listesi — severity ve agent'a göre filtrelenebilir/gruplanabilir.
 * Her finding: severity badge, agent, file:line, rule, why, fix.
 */
export function FindingsList({ findings }: { findings: Finding[] }) {
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"severity" | "agent">("severity");

  const agents = useMemo(
    () => [...new Set(findings.map((f) => f.agent))].sort(),
    [findings],
  );

  const sevCounts = useMemo(() => {
    const c: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
    return c;
  }, [findings]);

  const filtered = useMemo(
    () =>
      findings.filter(
        (f) =>
          (!sevFilter || f.severity === sevFilter) &&
          (!agentFilter || f.agent === agentFilter),
      ),
    [findings, sevFilter, agentFilter],
  );

  // Gruplama
  const groups = useMemo(() => {
    const map = new Map<string, Finding[]>();
    if (groupBy === "severity") {
      for (const sev of SEVERITY_ORDER) map.set(sev, []);
    }
    for (const f of filtered) {
      const key = groupBy === "severity" ? f.severity : f.agent;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [filtered, groupBy]);

  if (findings.length === 0) {
    return (
      <div className="panel-inner p-8 text-center">
        <div className="brand-display text-[28px] text-[color:var(--color-signal-green)]/70 tracking-widest mb-2">
          ✓ CLEAN
        </div>
        <div className="label-tac-sm text-[color:var(--color-fg-dim)]">
          no findings reported
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtre / kontrol çubuğu */}
      <div className="panel-inner p-3 space-y-2.5">
        {/* Severity filtreleri */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)] mr-1">
            ▸ SEVERITY
          </span>
          <FilterChip
            active={sevFilter === null}
            onClick={() => setSevFilter(null)}
            label={`all ${findings.length}`}
          />
          {SEVERITY_ORDER.map((sev) => (
            <button
              key={sev}
              onClick={() =>
                setSevFilter((cur) => (cur === sev ? null : sev))
              }
              disabled={sevCounts[sev] === 0}
              className={cn(
                "transition-opacity",
                sevCounts[sev] === 0 && "opacity-40 cursor-not-allowed",
                sevFilter !== null &&
                  sevFilter !== sev &&
                  "opacity-50 hover:opacity-100",
              )}
            >
              <SeverityPill severity={sev} count={sevCounts[sev]} />
            </button>
          ))}
        </div>

        {/* Agent filtreleri */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)] mr-1">
            ▸ AGENT
          </span>
          <FilterChip
            active={agentFilter === null}
            onClick={() => setAgentFilter(null)}
            label="all"
          />
          {agents.map((a) => (
            <FilterChip
              key={a}
              active={agentFilter === a}
              onClick={() =>
                setAgentFilter((cur) => (cur === a ? null : a))
              }
              label={a}
            />
          ))}
        </div>

        {/* Gruplama seçici */}
        <div className="flex items-center gap-1.5">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)] mr-1">
            ▸ GROUP BY
          </span>
          <FilterChip
            active={groupBy === "severity"}
            onClick={() => setGroupBy("severity")}
            label="severity"
          />
          <FilterChip
            active={groupBy === "agent"}
            onClick={() => setGroupBy("agent")}
            label="agent"
          />
          <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
            {filtered.length} shown
          </span>
        </div>
      </div>

      {/* Gruplanmış finding'ler */}
      {groups.length === 0 ? (
        <div className="panel-inner p-6 text-center label-tac-sm text-[color:var(--color-fg-dim)]">
          ▸ no findings match filter
        </div>
      ) : (
        groups.map(([key, list]) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center gap-2 px-0.5">
              {groupBy === "severity" ? (
                <span
                  className={cn(
                    "h-2 w-2 shrink-0",
                    sevStyle(key).bg,
                  )}
                />
              ) : (
                <span className="signal-dot text-[color:var(--color-signal-cyan)]" />
              )}
              <span
                className={cn(
                  "label-tac",
                  groupBy === "severity"
                    ? sevStyle(key).text
                    : "text-[color:var(--color-signal-cyan)]",
                )}
              >
                {key}
              </span>
              <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
                {list.length}
              </span>
              <span className="flex-1 h-px bg-[color:var(--color-border)] ml-1" />
            </div>
            {list.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "label-tac-sm border px-2 py-0.5 transition-colors",
        active
          ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:border-[color:var(--color-border-bright)] hover:text-[color:var(--color-fg-secondary)]",
      )}
    >
      {label}
    </button>
  );
}

function FindingCard({ finding: f }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const st = sevStyle(f.severity);
  return (
    <div
      className={cn(
        "panel-inner border-l-2",
        st.border,
      )}
    >
      {/* Üst satır — tıklanabilir */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[color:var(--color-bg-elevated)]/40 transition-colors"
      >
        <span
          className={cn(
            "label-tac-sm border px-1.5 py-0.5 shrink-0",
            st.border,
            st.text,
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
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {/* Genişletilmiş gövde */}
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[color:var(--color-border)]">
          {/* file:line — mobilde de görünür */}
          <div className="log-line sm:hidden">
            {f.file}
            {f.line != null && (
              <span className="text-[color:var(--color-signal-amber)]">
                :{f.line}
              </span>
            )}
          </div>

          <Field label="WHY" tone="text-[color:var(--color-fg)]">
            {f.why}
          </Field>

          {f.fix && (
            <Field label="FIX" tone="text-[color:var(--color-signal-green)]">
              {f.fix}
            </Field>
          )}

          {f.evidence && (
            <div>
              <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block mb-1">
                ▸ EVIDENCE
              </span>
              <pre className="whitespace-pre-wrap text-[11px] text-[color:var(--color-fg-dim)] bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2.5 py-1.5 overflow-x-auto">
                {f.evidence}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  tone,
  children,
}: {
  label: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="label-tac-sm text-[color:var(--color-fg-secondary)] shrink-0 mt-0.5 w-9">
        ▸ {label}
      </span>
      <span className={cn("text-[12px] leading-relaxed", tone)}>
        {children}
      </span>
    </div>
  );
}
