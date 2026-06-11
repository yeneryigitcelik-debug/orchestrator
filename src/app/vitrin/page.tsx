"use client";

import Link from "next/link";
import { TemplateWizard } from "@/components/TemplateWizard";

/**
 * /vitrin — Şablon Vitrini: arketip + stil seç, Lead build'e başlasın.
 * Mission Control header'ından ⊞ VİTRİN linkiyle gelinir. Roster/scan
 * sayfalarıyla aynı kabuk: marka header + geri link + footer.
 */
export default function VitrinPage() {
  return (
    <>
      <div className="scanline-top" />
      <div className="relative z-10 h-screen flex flex-col">
        {/* === HEADER === */}
        <header className="reveal flex items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-2.5 bg-[color:var(--color-bg-panel)]/80 backdrop-blur shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="brand-display brand-flicker text-[20px] text-[color:var(--color-signal-amber)] leading-none tracking-wider glow-soft">
              ORCHESTRATOR
            </span>
            <span className="brand-cursor text-[20px] text-[color:var(--color-signal-amber)] leading-none">
              ▮
            </span>
          </div>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] ml-1">
            v0.1.0 :: VİTRİN
          </span>
          <span className="ml-auto" />
          <Link
            href="/"
            className="label-tac-sm border border-[color:var(--color-border)] px-2.5 py-1 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)] transition-colors"
          >
            ◂ ORCHESTRATOR
          </Link>
        </header>

        {/* === BODY === */}
        <main className="flex-1 min-h-0 reveal">
          <TemplateWizard />
        </main>

        {/* === FOOTER === */}
        <footer className="border-t border-[color:var(--color-border)] px-4 py-1 bg-[color:var(--color-bg-panel)]/80 flex items-center gap-4 label-tac-sm text-[color:var(--color-fg-disabled)] shrink-0">
          <span>localhost:3005/vitrin</span>
          <span>·</span>
          <span>ŞABLON VİTRİNİ :: 12 ARKETİP · 8 STİL</span>
          <span className="ml-auto" />
          <span>seçim → brief → Lead</span>
        </footer>
      </div>
    </>
  );
}
