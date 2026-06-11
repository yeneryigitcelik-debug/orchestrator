"use client";

import { useState } from "react";
import type { WorkerSnapshot } from "./WorkerPane";
import { DirPicker } from "./DirPicker";
import {
  SPAWN_ROLES,
  ROLE_BY_NAME,
  ROLE_ACCENT_VAR,
  MODEL_IDS,
  type RoleMeta,
  type SpawnRole,
  type ModelKey,
} from "@/lib/roles";
import { cn } from "@/lib/cn";

const MODEL_KEYS: ModelKey[] = ["fable", "opus", "sonnet", "haiku"];

const inputCls =
  "w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2.5 py-1.5 text-[12.5px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors";

/**
 * Helper spawn formu — modal. POST /api/workers ile yeni worker subprocess'i açar.
 * Working dir DirPicker ile gezilerek seçilir (var olan klasör) ya da yazılır
 * (yeni klasör — spawn'da oluşturulur). Rol seçimi default model'i doldurur.
 */
export function SpawnDialog({
  onClose,
  onSpawned,
  defaultCwd = "",
}: {
  onClose: () => void;
  onSpawned: (worker: WorkerSnapshot) => void;
  /** Aktif proje — verilirse working dir buradan başlar (teker teker seçme yok). */
  defaultCwd?: string;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<SpawnRole>("backend");
  const [model, setModel] = useState<ModelKey>(ROLE_BY_NAME["backend"].model);
  const [cwd, setCwd] = useState(defaultCwd);
  const [goal, setGoal] = useState("");
  const [autonomous, setAutonomous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickRole = (r: SpawnRole) => {
    setRole(r);
    setModel(ROLE_BY_NAME[r].model);
  };

  const canSubmit = !!name.trim() && !!cwd.trim() && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          model: MODEL_IDS[model],
          cwd: cwd.trim(),
          goal: goal.trim() || undefined,
          autonomous,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      onSpawned(data.worker as WorkerSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spawn başarısız");
    } finally {
      setBusy(false);
    }
  };

  const core = SPAWN_ROLES.filter((r) => r.group === "core");
  const specialist = SPAWN_ROLES.filter((r) => r.group === "specialist");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel-inner brackets w-full max-w-[580px] max-h-[90vh] overflow-y-auto reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="br-tl" />
        <span className="br-bl" />

        {/* Başlık */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/70 sticky top-0 backdrop-blur z-10">
          <span className="label-tac text-[color:var(--color-signal-amber)] glow-soft">
            ⊕ SPAWN HELPER
          </span>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            yeni worker subprocess
          </span>
          <span className="ml-auto" />
          <button
            onClick={onClose}
            className="text-[14px] text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-red)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Callsign */}
          <Field label="▸ CALLSIGN · helper ismi">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="auth-backend"
              spellCheck={false}
              className={inputCls}
            />
          </Field>

          {/* Working dir — klasör seçici */}
          <div>
            <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block mb-1">
              ▸ WORKING DIR · agent bu klasörde çalışır
            </span>
            <DirPicker value={cwd} onChange={setCwd} />
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] block mt-1">
              klasöre tıkla = içine in · var olan projeyi seç ya da yeni yol yaz
            </span>
          </div>

          {/* Rol seçimi */}
          <div>
            <RowLabel>▸ ROLE</RowLabel>
            <div className="label-tac-sm text-[color:var(--color-fg-disabled)] mb-1">
              core
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {core.map((r) => (
                <RoleBtn
                  key={r.role}
                  meta={r}
                  active={role === r.role}
                  onClick={() => pickRole(r.role)}
                />
              ))}
            </div>
            <div className="label-tac-sm text-[color:var(--color-fg-disabled)] mb-1">
              specialist · skill yüklü · review + üretim
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {specialist.map((r) => (
                <RoleBtn
                  key={r.role}
                  meta={r}
                  active={role === r.role}
                  onClick={() => pickRole(r.role)}
                />
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <RowLabel>
              ▸ MODEL
              <span className="text-[color:var(--color-fg-disabled)] ml-1.5">
                rol default'u otomatik
              </span>
            </RowLabel>
            <div className="flex gap-1.5">
              {MODEL_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setModel(k)}
                  className={cn(
                    "flex-1 label-tac-sm border px-2 py-1.5 transition-colors",
                    model === k
                      ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)]"
                      : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:border-[color:var(--color-border-bright)]",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <Field label="▸ DIRECTIVE · opsiyonel goal">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder='// ör: "bu repoyu güvenlik açısından incele" — boşsa worker chat modunda bekler'
              className={cn(inputCls, "resize-none leading-relaxed")}
            />
          </Field>

          {/* Autonomous toggle */}
          <button
            onClick={() => setAutonomous((v) => !v)}
            className="flex items-center gap-2.5 w-full text-left"
          >
            <span
              className={cn(
                "signal-dot shrink-0",
                autonomous
                  ? "text-[color:var(--color-signal-green)]"
                  : "text-[color:var(--color-fg-disabled)]",
              )}
            />
            <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
              autonomous loop
            </span>
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] truncate">
              {autonomous ? "goal bitene dek [DONE] döngüsü" : "tek tur · manuel"}
            </span>
            <span className="ml-auto" />
            <span
              className="label-tac-sm"
              style={{
                color: autonomous
                  ? "var(--color-signal-green)"
                  : "var(--color-fg-disabled)",
              }}
            >
              {autonomous ? "ON" : "OFF"}
            </span>
          </button>

          {/* Hata satırı */}
          {error && (
            <div className="border-l-2 border-[color:var(--color-signal-red)] pl-2.5 py-1 text-[11px] text-[color:var(--color-signal-red)]">
              <span className="label-tac-sm">✕ SPAWN ERR</span>
              <span className="ml-2 text-[color:var(--color-fg)]">{error}</span>
            </div>
          )}

          {/* Disabled sebebi */}
          {!canSubmit && !busy && (
            <div className="label-tac-sm text-[color:var(--color-fg-disabled)] text-center">
              {!name.trim()
                ? "▸ helper ismi gir"
                : !cwd.trim()
                  ? "▸ working dir seç"
                  : ""}
            </div>
          )}

          {/* Spawn butonu */}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "w-full px-4 py-2.5 label-tac border transition-all duration-150",
              canSubmit
                ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110"
                : "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]",
            )}
          >
            {busy ? "··· spawning" : "▶ SPAWN HELPER"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-tac-sm text-[color:var(--color-fg-secondary)] mb-1.5">
      {children}
    </div>
  );
}

function RoleBtn({
  meta,
  active,
  onClick,
}: {
  meta: RoleMeta;
  active: boolean;
  onClick: () => void;
}) {
  const accent = ROLE_ACCENT_VAR[meta.role] ?? "var(--color-fg-secondary)";
  return (
    <button
      onClick={onClick}
      title={meta.blurb}
      className={cn(
        "flex items-center gap-1.5 border px-2 py-1.5 transition-colors text-left",
        active
          ? "bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border-bright)]"
          : "bg-[color:var(--color-bg-input)] border-[color:var(--color-border)] hover:border-[color:var(--color-border-bright)]",
      )}
    >
      <span
        className="signal-dot shrink-0"
        style={{ color: active ? accent : "var(--color-fg-disabled)" }}
      />
      <span
        className={cn(
          "label-tac-sm truncate",
          active
            ? "text-[color:var(--color-fg)]"
            : "text-[color:var(--color-fg-disabled)]",
        )}
      >
        {meta.label}
      </span>
    </button>
  );
}
