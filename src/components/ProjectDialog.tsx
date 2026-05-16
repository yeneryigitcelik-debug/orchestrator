"use client";

import { useState } from "react";
import { DirPicker } from "./DirPicker";
import { cn } from "@/lib/cn";

/**
 * Aktif proje seçici — bir kez klasör seç; tüm yeni spawn'lar onu varsayılan
 * cwd alır, Lead o projeyi merkez alır (paralel iş için git worktree açar).
 */
export function ProjectDialog({
  current,
  onClose,
  onSet,
}: {
  current: string;
  onClose: () => void;
  onSet: (path: string) => void;
}) {
  const [path, setPath] = useState(current);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel-inner brackets w-full max-w-[520px] reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="br-tl" />
        <span className="br-bl" />

        <div className="flex items-center gap-2 px-4 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/70">
          <span className="label-tac text-[color:var(--color-signal-amber)] glow-soft">
            ◆ ACTIVE PROJECT
          </span>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            tüm spawn'lar bunu kullanır
          </span>
          <span className="ml-auto" />
          <button
            onClick={onClose}
            className="text-[14px] text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-red)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block">
            ▸ PROJE KLASÖRÜ
          </span>
          <DirPicker value={path} onChange={setPath} />
          <p className="text-[11px] text-[color:var(--color-fg-dim)] leading-relaxed">
            Seçtiğin klasör yeni helper'lara otomatik gelir — teker teker
            seçmezsin. Lead bu projeyi merkez alır; aynı repo'da paralel iş
            için git worktree açarak çakışmayı önler.
          </p>
          <button
            onClick={() => {
              const p = path.trim();
              if (p) onSet(p);
            }}
            disabled={!path.trim()}
            className={cn(
              "w-full px-4 py-2.5 label-tac border transition-all duration-150",
              path.trim()
                ? "bg-[color:var(--color-signal-amber)] text-[color:var(--color-bg-deep)] border-[color:var(--color-signal-amber)] hover:brightness-110"
                : "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]",
            )}
          >
            ◆ SET ACTIVE PROJECT
          </button>
        </div>
      </div>
    </div>
  );
}
