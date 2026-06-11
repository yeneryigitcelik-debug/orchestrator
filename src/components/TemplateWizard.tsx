"use client";

// TemplateWizard — Şablon Vitrini sihirbazı (3 adım).
// Arketip + stil preset + detay seçilir; composeBrief yapılı bir brief üretir;
// brief Lead'in mesaj kanalına (/api/workers/<leadId>/message) gönderilir ve
// Mission Control'e dönülür. Veri kaynağı: src/lib/templates.ts.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  ARCHETYPES,
  STYLE_PRESETS,
  archetypesByCategory,
  composeBrief,
  type Archetype,
  type StylePreset,
  type Platform,
} from "@/lib/templates";

const inputCls =
  "w-full bg-[color:var(--color-bg-input)] border border-[color:var(--color-border)] px-2.5 py-1.5 text-[12.5px] text-[color:var(--color-fg)] outline-none focus:border-[color:var(--color-signal-amber)] transition-colors";

const PLATFORMS: { id: Platform; label: string; hint: string }[] = [
  { id: "web", label: "web", hint: "React / Next.js" },
  { id: "mobile", label: "mobile", hint: "React Native + Expo · cross-platform" },
  { id: "ios", label: "ios", hint: "native Swift / SwiftUI" },
  { id: "android", label: "android", hint: "native Kotlin / Compose" },
];

const STEPS = ["ARKETİP", "STİL", "DETAY"] as const;

export function TemplateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [archetypeId, setArchetypeId] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["web"]);
  const [features, setFeatures] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead id'si — brief oraya gidecek
  useEffect(() => {
    let alive = true;
    fetch("/api/lead")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const id = (d as { lead?: { id?: string } } | null)?.lead?.id;
        if (alive && typeof id === "string") setLeadId(id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const archetype = useMemo(
    () => ARCHETYPES.find((a) => a.id === archetypeId) ?? null,
    [archetypeId],
  );
  const preset = useMemo(
    () => STYLE_PRESETS.find((s) => s.id === styleId) ?? null,
    [styleId],
  );
  const brief = useMemo(
    () =>
      archetype && preset
        ? composeBrief(archetype, preset, { productName, platforms, features })
        : "",
    [archetype, preset, productName, platforms, features],
  );

  const canAdvance =
    (step === 0 && !!archetype) || (step === 1 && !!preset) || step === 2;
  const canLaunch =
    !!archetype &&
    !!preset &&
    !!leadId &&
    !sending &&
    !!productName.trim() &&
    platforms.length > 0;

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    );

  const launch = async () => {
    if (!canLaunch || !leadId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${leadId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brief }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d?.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push("/"); // Mission Control'e geç, build'i izle
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-4 min-h-0">
      <div className="max-w-[1500px] mx-auto">
        {/* başlık */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="brand-display text-[22px] text-[color:var(--color-phosphor)] glow">
            ⊞ VİTRİN
          </span>
          <span className="label-tac-sm text-[color:var(--color-fg-dim)]">
            şablon seç · stil seç · Lead build&apos;e başlasın
          </span>
        </div>
        <div className="label-tac-sm text-[color:var(--color-fg-disabled)] mb-4">
          seçimlerin yapılı bir brief&apos;e çevrilip Lead&apos;e gönderilir
        </div>

        {/* stepper */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((s, i) => (
            <StepChip
              key={s}
              n={i + 1}
              label={s}
              active={i === step}
              done={i < step}
              last={i === STEPS.length - 1}
            />
          ))}
        </div>

        {/* adım içeriği */}
        {step === 0 && (
          <ArchetypeStep selected={archetypeId} onSelect={setArchetypeId} />
        )}
        {step === 1 && <StyleStep selected={styleId} onSelect={setStyleId} />}
        {step === 2 && (
          <DetailStep
            archetype={archetype}
            preset={preset}
            productName={productName}
            onProductName={setProductName}
            platforms={platforms}
            onTogglePlatform={togglePlatform}
            features={features}
            onFeatures={setFeatures}
            brief={brief}
          />
        )}

        {/* nav */}
        <div className="flex items-center gap-2 mt-6 border-t border-[color:var(--color-border)] pt-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={cn(
              "label-tac-sm border px-3 py-1.5 transition-colors",
              step === 0
                ? "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]"
                : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-signal-amber)] hover:border-[color:var(--color-border-bright)]",
            )}
          >
            ◂ geri
          </button>
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)]">
            adım {step + 1}/3
          </span>
          <span className="ml-auto" />
          {error && (
            <span className="label-tac-sm text-[color:var(--color-signal-red)]">
              ✕ {error}
            </span>
          )}
          {step < 2 ? (
            <button
              onClick={() => canAdvance && setStep((s) => s + 1)}
              disabled={!canAdvance}
              className={cn(
                "label-tac-sm border px-4 py-1.5 transition-colors",
                canAdvance
                  ? "border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10 text-[color:var(--color-signal-amber)] hover:bg-[color:var(--color-signal-amber)] hover:text-[color:var(--color-bg-deep)]"
                  : "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]",
              )}
            >
              ileri ▸
            </button>
          ) : (
            <button
              onClick={launch}
              disabled={!canLaunch}
              className={cn(
                "label-tac border px-5 py-1.5 transition-all",
                canLaunch
                  ? "bg-[color:var(--color-phosphor)] text-[color:var(--color-bg-deep)] border-[color:var(--color-phosphor)] shadow-[0_0_12px_rgba(67,245,127,0.45)]"
                  : "bg-[color:var(--color-bg-input)] text-[color:var(--color-fg-disabled)] border-[color:var(--color-border)]",
              )}
            >
              {sending
                ? "··· gönderiliyor"
                : !leadId
                  ? "··· Lead bekleniyor"
                  : "▶ BUILD BAŞLAT"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepChip({
  n,
  label,
  active,
  done,
  last,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
  last: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "label-tac-sm border px-2.5 py-0.5 transition-colors",
          active
            ? "border-[color:var(--color-signal-amber)] text-[color:var(--color-signal-amber)]"
            : done
              ? "border-[color:var(--color-phosphor)] text-[color:var(--color-phosphor)]"
              : "border-[color:var(--color-border)] text-[color:var(--color-fg-disabled)]",
        )}
      >
        {done ? "✓" : n} {label}
      </span>
      {!last && <span className="text-[color:var(--color-fg-disabled)]">──</span>}
    </>
  );
}

// --- adım 1: arketip ------------------------------------------------------

function ArchetypeStep({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = archetypesByCategory();
  return (
    <div className="space-y-5 reveal">
      {groups.map((g) => (
        <section key={g.category}>
          <div className="label-tac-sm text-[color:var(--color-fg-dim)] mb-2 border-b border-[color:var(--color-border)] pb-1">
            {g.category}
          </div>
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {g.items.map((a) => (
              <ArchetypeCard
                key={a.id}
                archetype={a}
                active={selected === a.id}
                onClick={() => onSelect(a.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ArchetypeCard({
  archetype,
  active,
  onClick,
}: {
  archetype: Archetype;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border p-3 text-left flex flex-col gap-1.5 transition-colors",
        active
          ? "border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/5"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-input)] hover:border-[color:var(--color-border-bright)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[18px] leading-none",
            active
              ? "text-[color:var(--color-signal-amber)]"
              : "text-[color:var(--color-fg-secondary)]",
          )}
        >
          {archetype.glyph}
        </span>
        <span className="label-tac text-[color:var(--color-phosphor)]">
          {archetype.name}
        </span>
        {active && (
          <span className="ml-auto label-tac-sm text-[color:var(--color-signal-amber)]">
            ✓
          </span>
        )}
      </div>
      <div className="text-[11px] text-[color:var(--color-fg-dim)] leading-snug">
        {archetype.blurb}
      </div>
    </button>
  );
}

// --- adım 2: stil preset --------------------------------------------------

function StyleStep({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="reveal">
      <div className="label-tac-sm text-[color:var(--color-fg-dim)] mb-2 border-b border-[color:var(--color-border)] pb-1">
        görsel yön — design ajanına başlangıç token seti olur
      </div>
      <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {STYLE_PRESETS.map((s) => (
          <StyleCard
            key={s.id}
            preset={s}
            active={selected === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StyleCard({
  preset,
  active,
  onClick,
}: {
  preset: StylePreset;
  active: boolean;
  onClick: () => void;
}) {
  const t = preset.tokens;
  return (
    <button
      onClick={onClick}
      className={cn(
        "border text-left flex flex-col overflow-hidden transition-colors",
        active
          ? "border-[color:var(--color-signal-amber)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-input)] hover:border-[color:var(--color-border-bright)]",
      )}
    >
      {/* renk swatch şeridi */}
      <div className="flex h-14">
        {preset.swatch.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="label-tac text-[color:var(--color-phosphor)]">
            {preset.name}
          </span>
          {active ? (
            <span className="ml-auto label-tac-sm text-[color:var(--color-signal-amber)]">
              ✓ SEÇİLİ
            </span>
          ) : (
            <span className="ml-auto label-tac-sm text-[color:var(--color-fg-disabled)]">
              {preset.feel}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[color:var(--color-fg-dim)] leading-snug">
          {preset.description}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {[t.radius, t.density, t.motion, t.mode].map((chip) => (
            <span
              key={chip}
              className="border border-[color:var(--color-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--color-fg-disabled)]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// --- adım 3: detay --------------------------------------------------------

function DetailStep({
  archetype,
  preset,
  productName,
  onProductName,
  platforms,
  onTogglePlatform,
  features,
  onFeatures,
  brief,
}: {
  archetype: Archetype | null;
  preset: StylePreset | null;
  productName: string;
  onProductName: (v: string) => void;
  platforms: Platform[];
  onTogglePlatform: (p: Platform) => void;
  features: string;
  onFeatures: (v: string) => void;
  brief: string;
}) {
  return (
    <div className="reveal grid gap-4 grid-cols-1 lg:grid-cols-[1fr_380px]">
      {/* form */}
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
            ▸ ÜRÜN ADI
          </span>
          <input
            value={productName}
            onChange={(e) => onProductName(e.target.value)}
            placeholder="TaskFlow"
            spellCheck={false}
            className={inputCls}
          />
          {!productName.trim() && (
            <span className="label-tac-sm text-[color:var(--color-fg-disabled)] block">
              build başlatmak için ürün adı gerekli
            </span>
          )}
        </label>

        <div className="space-y-1">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)] block">
            ▸ PLATFORMLAR
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onTogglePlatform(p.id)}
                  className={cn(
                    "flex items-center gap-2 border px-2.5 py-1.5 text-left transition-colors",
                    on
                      ? "border-[color:var(--color-signal-amber)] bg-[color:var(--color-signal-amber)]/10"
                      : "border-[color:var(--color-border)] hover:border-[color:var(--color-border-bright)]",
                  )}
                >
                  <span
                    className={cn(
                      "signal-dot shrink-0",
                      on
                        ? "text-[color:var(--color-signal-amber)]"
                        : "text-[color:var(--color-fg-disabled)]",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "label-tac-sm block",
                        on
                          ? "text-[color:var(--color-fg)]"
                          : "text-[color:var(--color-fg-dim)]",
                      )}
                    >
                      {p.label}
                    </span>
                    <span className="text-[10px] text-[color:var(--color-fg-disabled)] block truncate">
                      {p.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="label-tac-sm text-[color:var(--color-fg-secondary)]">
            ▸ ÖZELLİKLER / NOTLAR
          </span>
          <textarea
            value={features}
            onChange={(e) => onFeatures(e.target.value)}
            rows={6}
            placeholder='// ör: "kullanıcılar proje açar, görev atar, kanban panosu, takvim görünümü, e-posta bildirimi"'
            className={cn(inputCls, "resize-none leading-relaxed")}
          />
          <span className="label-tac-sm text-[color:var(--color-fg-disabled)] block">
            boş bırakırsan blueprint&apos;in varsayılan özellik seti kullanılır
          </span>
        </label>
      </div>

      {/* özet + brief önizleme */}
      <aside className="space-y-3">
        <div className="panel-inner p-3 space-y-2">
          <span className="label-tac-sm text-[color:var(--color-fg-dim)] block">
            ▸ SEÇİM ÖZETİ
          </span>
          <SummaryRow
            k="arketip"
            v={archetype ? `${archetype.glyph} ${archetype.name}` : "—"}
          />
          <SummaryRow k="stil" v={preset ? preset.name : "—"} />
          {preset && (
            <div className="flex h-6 overflow-hidden">
              {preset.swatch.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
          <SummaryRow
            k="platform"
            v={platforms.length ? platforms.join(" · ") : "—"}
          />
        </div>

        <div className="panel-inner p-3 space-y-1.5">
          <span className="label-tac-sm text-[color:var(--color-fg-dim)] block">
            ▸ LEAD&apos;E GİDECEK BRIEF
          </span>
          <pre className="whitespace-pre-wrap bg-[color:var(--color-bg-deep)]/70 border border-[color:var(--color-border)] p-2 text-[10.5px] leading-snug text-[color:var(--color-fg-dim)] max-h-[320px] overflow-y-auto">
            {brief || "// arketip ve stil seç"}
          </pre>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label-tac-sm text-[color:var(--color-fg-disabled)] w-[64px] shrink-0">
        {k}
      </span>
      <span className="text-[12px] text-[color:var(--color-phosphor)]">{v}</span>
    </div>
  );
}
