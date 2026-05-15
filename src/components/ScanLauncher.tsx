"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** 9 review rolü — scan.ts REVIEW_ROLES ile birebir. */
export const REVIEW_ROLES = [
  "security",
  "performance",
  "database",
  "api",
  "infrastructure",
  "quality",
  "ui",
  "ux",
  "cost",
] as const;

export type ReviewRole = (typeof REVIEW_ROLES)[number];

/** Her review rolünün sinyal rengi — panel ROLE_ACCENT estetiğiyle uyumlu. */
const ROLE_ACCENT: Record<ReviewRole, string> = {
  security: "text-[color:var(--color-signal-red)]",
  performance: "text-[color:var(--color-signal-amber)]",
  database: "text-[color:var(--color-signal-yellow)]",
  api: "text-[color:var(--color-signal-cyan)]",
  infrastructure: "text-[color:var(--color-signal-amber)]",
  quality: "text-[color:var(--color-signal-green)]",
  ui: "text-[color:var(--color-signal-violet)]",
  ux: "text-[color:var(--color-signal-violet)]",
  cost: "text-[color:var(--color-signal-green)]",
};

/**
 * Scan launcher — repo mutlak yol input'u + 9 review rolü toggle grid'i +
 * RUN SCAN butonu. POST /api/scan ile yeni scan başlatır.
 */
export function ScanLauncher({
  onLaunched,
}: {
  onLaunched: (scanId: string) => void;
}) {
  const [repo, setRepo] = useState("");
  // Varsayılan: 9 rolün hepsi seçili
  const [selected, setSelected] = useState<Set<ReviewRole>>(
    new Set(REVIEW_ROLES),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (role: ReviewRole) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const allOn = selected.size === REVIEW_ROLES.length;
  const setAll = (on: boolean) =>
    setSelected(on ? new Set(REVIEW_ROLES) : new Set());

  const run = async () => {
    if (!repo.trim() || busy || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Tüm 9 rol seçiliyse roles'u hiç gönderme — API hepsini çalıştırır.
      const body: { repo: string; roles?: string[] } = { repo: repo.trim() };
      if (!allOn) body.roles = [...selected];
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      const scanId = data?.scan?.scanId as string | undefined;
      if (scanId) onLaunched(scanId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan başlatılamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-inner brackets p-4">
      <span className="br-tl" />
      <span className="br-bl" />

      {/* Başlık */}
      <div className="flex items-center gap-2 mb-3">
        <span className="label-tac text-[color:var(--color-signal-amber)]">
          ▶ NEW SCAN
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          repo → review ajansları
        </span>
      </div>

      {/* Repo path input */}
      <label className="block mb-3">
        <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block mb-1">
          ▸ TARGET DIRECTORY · mutlak yol
        </span>
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
          }}
          placeholder="/Users/you/dev/proje"
          spellCheck={false}
          className="w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors"
        />
      </label>

      {/* Rol toggle grid */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
          ▸ REVIEW ROLES
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
          {selected.size}/{REVIEW_ROLES.length} armed
        </span>
        <span className="ml-auto" />
        <button
          onClick={() => setAll(!allOn)}
          className="label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] transition-colors"
        >
          {allOn ? "clear all" : "select all"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {REVIEW_ROLES.map((role) => {
          const on = selected.has(role);
          return (
            <button
              key={role}
              onClick={() => toggle(role)}
              className={cn(
                "flex items-center gap-2 border px-2.5 py-1.5 transition-colors text-left",
                on
                  ? "bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border-bright)]"
                  : "bg-[color:var(--color-bg-input)] border-[color:var(--color-border)] hover:border-[color:var(--color-border-bright)]",
              )}
            >
              <span
                className={cn(
                  "signal-dot",
                  on ? ROLE_ACCENT[role] : "text-[color:var(--color-fg-disabled)]",
                )}
              />
              <span
                className={cn(
                  "label-tac-sm",
                  on
                    ? "text-[color:var(--color-fg)]"
                    : "text-[color:var(--color-fg-disabled)]",
                )}
              >
                {role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hata satırı */}
      {error && (
        <div className="mb-3 border-l-2 border-[color:var(--color-signal-red)] pl-2.5 py-1 text-[11px] text-[color:var(--color-signal-red)]">
          <span className="label-tac-sm">✕ SCAN ERR</span>
          <span className="ml-2 text-[color:var(--color-fg)]">{error}</span>
        </div>
      )}

      {/* RUN butonu */}
      <button
        onClick={run}
        disabled={!repo.trim() || busy || selected.size === 0}
        className={cn(
          "w-full px-4 py-2 label-tac border transition-all duration-150",
          busy || !repo.trim() || selected.size === 0
            ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
            : "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110",
        )}
      >
        {busy ? "··· dispatching" : "▶ RUN SCAN"}
      </button>
    </div>
  );
}
