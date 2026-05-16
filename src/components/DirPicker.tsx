"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface FsResp {
  path: string;
  parent: string | null;
  exists: boolean;
  dirs: string[];
  error?: string;
}

/**
 * Sunucu-taraflı dizin gezgini — SpawnDialog'da working dir seçimi.
 * value = seçili mutlak yol (aynı zamanda gezilen yol). Klasöre tıkla → içine in,
 * ".." → üst klasör. Elle de yazılabilir. value boşsa API home dizinini çözer.
 */
export function DirPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (path: string) => void;
}) {
  const [listing, setListing] = useState<FsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(value);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = value.trim() ? `?path=${encodeURIComponent(value.trim())}` : "";
    fetch(`/api/fs${q}`)
      .then((r) => r.json())
      .then((data: FsResp) => {
        if (cancelled) return;
        setListing(data);
        // value boştu → API home'u çözdü → cwd'yi yukarı bildir
        if (!value.trim() && data.path) onChange(data.path);
      })
      .catch(() => {
        if (!cancelled) setListing(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value, onChange]);

  const onDraft = useCallback(
    (v: string) => {
      setDraft(v);
      if (debRef.current) clearTimeout(debRef.current);
      debRef.current = setTimeout(() => onChange(v), 400);
    },
    [onChange],
  );

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-input)]">
      {/* Yol satırı — düzenlenebilir */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[color:var(--color-border)]">
        <span className="text-[color:var(--color-signal-amber)] text-[11px] shrink-0">
          ◰
        </span>
        <input
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          spellCheck={false}
          placeholder="~/developer/proje"
          className="flex-1 bg-transparent text-[12px] text-[color:var(--color-fg)] outline-none"
        />
        {loading && (
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            ···
          </span>
        )}
      </div>

      {/* Klasör listesi */}
      <div className="max-h-[156px] overflow-y-auto">
        {listing?.parent && (
          <PickerRow
            glyph="▴"
            label=".."
            dim
            onClick={() => onChange(listing.parent!)}
          />
        )}
        {listing?.exists ? (
          listing.dirs.length > 0 ? (
            listing.dirs.map((d) => (
              <PickerRow
                key={d}
                glyph="▸"
                label={d}
                onClick={() => onChange(joinPath(listing.path, d))}
              />
            ))
          ) : (
            <div className="px-3 py-2 log-line text-[color:var(--color-fg-disabled)]">
              alt klasör yok — bu klasör kullanılabilir
            </div>
          )
        ) : (
          <div className="px-3 py-2 log-line text-[color:var(--color-signal-yellow)]">
            ⚠ klasör yok — spawn sırasında oluşturulacak
          </div>
        )}
      </div>
    </div>
  );
}

function PickerRow({
  glyph,
  label,
  dim,
  onClick,
}: {
  glyph: string;
  label: string;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1 text-left text-[12px] transition-colors hover:bg-[color:var(--color-bg-elevated)]",
        dim
          ? "text-[color:var(--color-fg-dim)]"
          : "text-[color:var(--color-fg-secondary)]",
      )}
    >
      <span className="text-[color:var(--color-fg-disabled)] text-[10px]">
        {glyph}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function joinPath(base: string, name: string): string {
  return base.endsWith("/") ? base + name : `${base}/${name}`;
}
