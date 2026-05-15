"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { WorkerSnapshot } from "./WorkerPane";
import { StatusBadge } from "./StatusBadge";

interface SkillMeta {
  name: string;
  description: string;
  bytes: number;
}
interface RoleEntry {
  role: string;
  model: string;
  basePrompt: string;
  skills: SkillMeta[];
}

const ROLE_ACCENT: Record<string, string> = {
  lead: "text-[color:var(--color-phosphor)]",
  backend: "text-[color:var(--color-signal-cyan)]",
  frontend: "text-[color:var(--color-signal-violet)]",
  db: "text-[color:var(--color-signal-amber)]",
  devops: "text-[color:var(--color-phosphor)]",
  qa: "text-[color:var(--color-signal-green)]",
  watcher: "text-[color:var(--color-fg-secondary)]",
};

type EditorState = {
  role: string;
  name: string;
  content: string;
  isNew: boolean;
};

export function Roster({ helpers }: { helpers: WorkerSnapshot[] }) {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/roster");
    if (res.ok) {
      const data = (await res.json()) as { roles: RoleEntry[] };
      setRoles(data.roles);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openSkill = async (role: string, name: string) => {
    const res = await fetch(
      `/api/roster/skill?role=${encodeURIComponent(role)}&name=${encodeURIComponent(name)}`,
    );
    if (res.ok) {
      const d = (await res.json()) as { content: string };
      setEditor({ role, name, content: d.content, isNew: false });
    }
  };

  const removeSkill = async (role: string, name: string) => {
    if (!confirm(`skill silinsin mi: ${role}/${name}?`)) return;
    await fetch(
      `/api/roster/skill?role=${encodeURIComponent(role)}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    load();
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-4 min-h-0">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="brand-display text-[22px] text-[color:var(--color-phosphor)] glow-strong">
            ◆ ROSTER
          </span>
          <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
            agent rol kataloğu · skill yönetimi
          </span>
        </div>

        {loading ? (
          <div className="label-tac-sm text-[color:var(--color-fg-dim)]">
            ··· yükleniyor
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            {roles.map((r) => (
              <RoleCard
                key={r.role}
                entry={r}
                liveHelpers={helpers.filter((h) => h.role === r.role)}
                onOpenSkill={openSkill}
                onNewSkill={() =>
                  setEditor({
                    role: r.role,
                    name: "",
                    content: "# Skill başlığı\n\nNe işe yarar, kısa açıklama.\n\n## Ne yap\n- ...\n\n## Kırmızı bayraklar\n- ...\n",
                    isNew: true,
                  })
                }
                onDeleteSkill={removeSkill}
              />
            ))}
          </div>
        )}
      </div>

      {editor && (
        <SkillEditor
          editor={editor}
          onChange={setEditor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RoleCard({
  entry,
  liveHelpers,
  onOpenSkill,
  onNewSkill,
  onDeleteSkill,
}: {
  entry: RoleEntry;
  liveHelpers: WorkerSnapshot[];
  onOpenSkill: (role: string, name: string) => void;
  onNewSkill: () => void;
  onDeleteSkill: (role: string, name: string) => void;
}) {
  const accent =
    ROLE_ACCENT[entry.role] ?? "text-[color:var(--color-fg-secondary)]";
  return (
    <div className="panel-inner p-3 flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <span className={cn("label-tac glow-soft", accent)}>
          {entry.role.toUpperCase()}
        </span>
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          {modelShort(entry.model)}
        </span>
        <span className="ml-auto" />
        <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
          {entry.skills.length} skill
        </span>
      </div>

      {/* live helpers of this role */}
      {liveHelpers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {liveHelpers.map((h) => (
            <span
              key={h.id}
              className="inline-flex items-center gap-1.5 border border-[color:var(--color-border)] px-1.5 py-0.5 bg-[color:var(--color-bg-deep)]/60"
            >
              <span className="text-[10px] text-[color:var(--color-fg-secondary)]">
                {h.name}
              </span>
              <StatusBadge status={h.status} size="sm" />
            </span>
          ))}
        </div>
      )}

      {/* skills */}
      <div className="flex flex-col gap-1">
        {entry.skills.length === 0 ? (
          <div className="text-[11px] text-[color:var(--color-fg-disabled)] label-tac-sm py-1">
            ▸ skill yok
          </div>
        ) : (
          entry.skills.map((s) => (
            <div
              key={s.name}
              className="group flex items-center gap-2 border border-[color:var(--color-border)] px-2 py-1 hover:border-[color:var(--color-border-bright)] transition-colors"
            >
              <button
                onClick={() => onOpenSkill(entry.role, s.name)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-[12px] text-[color:var(--color-phosphor)] truncate">
                  {s.name}
                </div>
                <div className="text-[10px] text-[color:var(--color-fg-dim)] truncate">
                  {s.description}
                </div>
              </button>
              <button
                onClick={() => onDeleteSkill(entry.role, s.name)}
                className="text-[11px] text-[color:var(--color-fg-disabled)] hover:text-[color:var(--color-signal-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))
        )}
        <button
          onClick={onNewSkill}
          className="text-[11px] label-tac-sm text-[color:var(--color-phosphor)] hover:glow-soft border border-dashed border-[color:var(--color-border-bright)] py-1 mt-0.5 transition-all hover:bg-[color:var(--color-bg-elevated)]/40"
        >
          + skill ekle
        </button>
      </div>

      {/* base prompt */}
      <details className="text-[11px]">
        <summary className="cursor-pointer select-none label-tac-sm text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg-secondary)]">
          base system prompt
        </summary>
        <pre className="whitespace-pre-wrap mt-1.5 p-2 bg-[color:var(--color-bg-deep)]/70 border border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] text-[10.5px] leading-snug max-h-[200px] overflow-y-auto">
          {entry.basePrompt}
        </pre>
      </details>
    </div>
  );
}

function SkillEditor({
  editor,
  onChange,
  onClose,
  onSaved,
}: {
  editor: EditorState;
  onChange: (e: EditorState) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const name = editor.name.trim();
    if (!name || !editor.content.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/roster/skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editor.role,
          name,
          content: editor.content,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Kaydedilemedi: ${err.error ?? res.status}`);
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="panel-inner brackets relative w-full max-w-2xl p-4 space-y-3 bg-[color:var(--color-bg-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="br-tl" />
        <span className="br-bl" />
        <div className="flex items-center gap-2">
          <span className="label-tac text-[color:var(--color-phosphor)] glow-soft">
            {editor.isNew ? "+ yeni skill" : "skill düzenle"}
          </span>
          <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
            roles/{editor.role}/skills/
          </span>
        </div>

        <label className="block space-y-1">
          <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
            skill adı (a-z0-9-)
          </span>
          <input
            value={editor.name}
            disabled={!editor.isNew}
            onChange={(e) =>
              onChange({
                ...editor,
                name: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-"),
              })
            }
            placeholder="ornek-skill-adi"
            className="w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-1.5 text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-phosphor)] disabled:opacity-50 font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
            içerik (markdown)
          </span>
          <textarea
            value={editor.content}
            onChange={(e) => onChange({ ...editor, content: e.target.value })}
            rows={16}
            className="w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2 py-2 text-[12px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-phosphor)] font-mono leading-snug resize-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            spawn'da bu rolün system prompt'una eklenir
          </span>
          <span className="ml-auto" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 label-tac-sm text-[color:var(--color-fg-secondary)] hover:text-[color:var(--color-fg)]"
          >
            iptal
          </button>
          <button
            onClick={save}
            disabled={busy || !editor.name.trim() || !editor.content.trim()}
            className={cn(
              "px-4 py-1.5 label-tac-sm border transition-all",
              busy || !editor.name.trim() || !editor.content.trim()
                ? "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]"
                : "bg-[color:var(--color-phosphor)] text-[color:var(--color-bg-deep)] border-[color:var(--color-phosphor)] shadow-[0_0_12px_rgba(67,245,127,0.45)]",
            )}
          >
            {busy ? "··· kaydet" : "▶ kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function modelShort(m: string): string {
  if (m.includes("opus")) return "OPUS";
  if (m.includes("sonnet")) return "SONNET";
  if (m.includes("haiku")) return "HAIKU";
  return m.slice(0, 10).toUpperCase();
}
