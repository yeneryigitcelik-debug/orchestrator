"use client";

import { useEffect, useState } from "react";
import { fmtTokens, fmtUsd, type UsageTotals } from "@/lib/usage";

/**
 * Footer HUD — toplam maliyet + token okuması. /api/usage'ı 15sn'de bir yoklar,
 * /usage sayfasına link verir. Veri gelmeden ya da hata olursa sessizce gizlenir
 * (footer telemetri akışını bozmaz).
 */
export function UsageTicker() {
  const [totals, setTotals] = useState<UsageTotals | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data = (await res.json()) as {
          usage?: { totals?: UsageTotals };
        };
        if (alive && data.usage?.totals) setTotals(data.usage.totals);
      } catch {
        /* sessizce geç */
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!totals) return null;

  const tokens =
    totals.inputTokens +
    totals.outputTokens +
    totals.cacheReadTokens +
    totals.cacheWriteTokens;

  return (
    <a
      href="/usage"
      title="Kullanım & maliyet detayı"
      className="inline-flex items-center gap-1.5 text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] transition-colors"
    >
      <span className="text-[color:var(--color-signal-amber)]">$</span>
      <span>{fmtUsd(totals.costUsd)}</span>
      <span className="text-[color:var(--color-fg-disabled)]">·</span>
      <span>{fmtTokens(tokens)} tok</span>
    </a>
  );
}
