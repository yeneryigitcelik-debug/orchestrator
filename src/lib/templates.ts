// Vitrin (Şablon Vitrini) veri kaynağı — arketip + stil preset kataloğu.
// Client-safe (roles.ts gibi): hem TemplateWizard UI'ı hem brief composer kullanır.
//
// blueprints/*.md dosyaları her arketibin TAM build iskeletini taşır; burada
// yalnız galeri için hafif metadata + brief'e girecek alanlar tutulur.

// --- tipler ----------------------------------------------------------------

export interface Archetype {
  /** blueprint dosya adı (uzantısız) — blueprints/<id>.md ile birebir */
  id: string;
  name: string;
  /** galeri gruplaması */
  category: string;
  /** galeri kartı tek satır açıklaması */
  blurb: string;
  /** matrix-stili kart işareti */
  glyph: string;
}

export type Platform = "web" | "mobile" | "ios" | "android";

export interface StyleTokens {
  colorPrimary: string;
  colorAccent: string;
  neutral: "cool" | "warm" | "pure";
  fontHeading: string;
  fontBody: string;
  typeScale: "tight" | "balanced" | "expressive";
  radius: "sharp" | "soft" | "rounded";
  density: "compact" | "comfortable" | "airy";
  motion: "minimal" | "subtle" | "playful";
  elevation: "flat" | "soft" | "layered";
  mode: "light-first" | "dark-first" | "both";
}

export interface StylePreset {
  id: string;
  name: string;
  /** kısa his etiketi */
  feel: string;
  description: string;
  /** galeri kartındaki renk örnekleri (hex) */
  swatch: string[];
  /** design helper'a başlangıç token seti olarak gider */
  tokens: StyleTokens;
}

export interface BuildDetails {
  productName: string;
  platforms: Platform[];
  features: string;
}

// --- arketipler (12) — blueprints/*.md ile birebir -------------------------

export const ARCHETYPES: Archetype[] = [
  { id: "dashboard-saas", name: "Dashboard SaaS", category: "Yönetim & Veri",
    glyph: "▦", blurb: "Analitik/yönetim paneli, B2B araç, veri + CRUD" },
  { id: "developer-tool", name: "Developer Tool", category: "Yönetim & Veri",
    glyph: "⌘", blurb: "Internal tool, ops dashboard, status sayfası" },
  { id: "ai-saas", name: "AI SaaS", category: "AI & Sohbet",
    glyph: "◈", blurb: "LLM/AI sarmalayan ürün — sohbet, üretim, asistan" },
  { id: "marketplace", name: "Marketplace", category: "Ticaret",
    glyph: "⇄", blurb: "İki taraflı pazar — alıcı + satıcı, listeleme" },
  { id: "ecommerce-store", name: "E-ticaret Mağaza", category: "Ticaret",
    glyph: "⊞", blurb: "Tek-satıcılı online mağaza — ürün, sepet, sipariş" },
  { id: "productivity-tool", name: "Üretkenlik Aracı", category: "Üretkenlik",
    glyph: "✓", blurb: "Görev/proje/not — kişisel veya ekip" },
  { id: "knowledge-base", name: "Bilgi Tabanı", category: "Üretkenlik",
    glyph: "❋", blurb: "Wiki, dokümantasyon, yapılandırılmış içerik" },
  { id: "social-app", name: "Sosyal Uygulama", category: "Topluluk",
    glyph: "◍", blurb: "Akış, profil, etkileşim — topluluk" },
  { id: "communication-tool", name: "İletişim Aracı", category: "Topluluk",
    glyph: "✉", blurb: "Müşteri destek — gelen kutusu, canlı sohbet" },
  { id: "file-storage", name: "Dosya Depolama", category: "Depolama & Medya",
    glyph: "▣", blurb: "Bulut depolama, dosya paylaşım/senkron" },
  { id: "media-library", name: "Medya Kütüphanesi", category: "Depolama & Medya",
    glyph: "▷", blurb: "Foto galeri, medya akış/kütüphane" },
  { id: "cms-blog", name: "CMS / Blog", category: "İçerik",
    glyph: "¶", blurb: "İçerik üretimi, yayın, RSS/feed" },
];

/** Galeri için arketipleri kategoriye göre grupla (ekran sırası korunur). */
export function archetypesByCategory(): { category: string; items: Archetype[] }[] {
  const out: { category: string; items: Archetype[] }[] = [];
  for (const a of ARCHETYPES) {
    let group = out.find((g) => g.category === a.category);
    if (!group) {
      group = { category: a.category, items: [] };
      out.push(group);
    }
    group.items.push(a);
  }
  return out;
}

// --- stil preset'leri (8) --------------------------------------------------

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "minimal-saas",
    name: "Minimal SaaS",
    feel: "Sakin, ferah, ölçülü",
    description:
      "Bol beyaz alan, ince tipografi, az renk, yumuşak köşe. Linear/Notion ruhu.",
    swatch: ["#6366f1", "#0f172a", "#e2e8f0", "#f8fafc"],
    tokens: {
      colorPrimary: "#6366f1", colorAccent: "#8b5cf6", neutral: "cool",
      fontHeading: "Inter / geometrik sans", fontBody: "Inter",
      typeScale: "balanced", radius: "soft", density: "airy",
      motion: "subtle", elevation: "soft", mode: "both",
    },
  },
  {
    id: "bold-modern",
    name: "Bold & Modern",
    feel: "Güçlü, kendine güvenen, net",
    description:
      "Yüksek kontrast, büyük tipografi, canlı accent. Stripe ruhu.",
    swatch: ["#635bff", "#00d4ff", "#0a2540", "#ffffff"],
    tokens: {
      colorPrimary: "#635bff", colorAccent: "#00d4ff", neutral: "cool",
      fontHeading: "büyük, sıkı grotesk", fontBody: "sans-serif",
      typeScale: "expressive", radius: "soft", density: "comfortable",
      motion: "subtle", elevation: "layered", mode: "light-first",
    },
  },
  {
    id: "friendly-soft",
    name: "Friendly & Soft",
    feel: "Sıcak, davetkâr, oyuncu",
    description:
      "Sıcak renkler, yuvarlak köşeler, yumuşak gölge. Consumer app ruhu.",
    swatch: ["#f97316", "#fb7185", "#10b981", "#fffbeb"],
    tokens: {
      colorPrimary: "#f97316", colorAccent: "#fb7185", neutral: "warm",
      fontHeading: "yuvarlak, dostane sans", fontBody: "sans-serif",
      typeScale: "balanced", radius: "rounded", density: "comfortable",
      motion: "playful", elevation: "soft", mode: "light-first",
    },
  },
  {
    id: "dark-technical",
    name: "Dark Technical",
    feel: "Koyu, hassas, mühendis",
    description:
      "Koyu öncelikli, monospace aksanı, terminal/dev hissi.",
    swatch: ["#22d3ee", "#34d399", "#1e293b", "#0b0f17"],
    tokens: {
      colorPrimary: "#22d3ee", colorAccent: "#34d399", neutral: "cool",
      fontHeading: "monospace aksanlı sans", fontBody: "sans-serif",
      typeScale: "tight", radius: "sharp", density: "compact",
      motion: "minimal", elevation: "flat", mode: "dark-first",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    feel: "Tipografi-ağırlıklı, sakin, okunaklı",
    description:
      "Serif başlıklar, içerik öne çıkar, sade. Yayın/blog ruhu.",
    swatch: ["#1c1917", "#b91c1c", "#d6d3d1", "#fafaf9"],
    tokens: {
      colorPrimary: "#1c1917", colorAccent: "#b91c1c", neutral: "warm",
      fontHeading: "serif", fontBody: "okunaklı serif/sans",
      typeScale: "expressive", radius: "sharp", density: "airy",
      motion: "minimal", elevation: "flat", mode: "light-first",
    },
  },
  {
    id: "material-3",
    name: "Material 3",
    feel: "Google MD3, tonal, sistematik",
    description:
      "Tonal palet, dynamic color, belirgin elevation. Android-doğal.",
    swatch: ["#6750a4", "#7d5260", "#625b71", "#fef7ff"],
    tokens: {
      colorPrimary: "#6750a4", colorAccent: "#7d5260", neutral: "cool",
      fontHeading: "Roboto / Google Sans", fontBody: "Roboto",
      typeScale: "balanced", radius: "rounded", density: "comfortable",
      motion: "subtle", elevation: "layered", mode: "both",
    },
  },
  {
    id: "ios-clean",
    name: "iOS Clean",
    feel: "Apple HIG, sistem-doğal, hafif",
    description:
      "HIG hizalı, net, hafif; sistem renkleri. iOS-doğal görünüm.",
    swatch: ["#007aff", "#34c759", "#f2f2f7", "#ffffff"],
    tokens: {
      colorPrimary: "#007aff", colorAccent: "#34c759", neutral: "pure",
      fontHeading: "SF Pro / sistem sans", fontBody: "SF Pro / sistem sans",
      typeScale: "balanced", radius: "soft", density: "comfortable",
      motion: "subtle", elevation: "soft", mode: "both",
    },
  },
  {
    id: "vibrant",
    name: "Vibrant",
    feel: "Enerjik, gradient, parlak",
    description:
      "Gradient'ler, parlak renk, enerjik. Sosyal/yaratıcı ürün ruhu.",
    swatch: ["#d946ef", "#f59e0b", "#3b82f6", "#0f0a1e"],
    tokens: {
      colorPrimary: "#d946ef", colorAccent: "#f59e0b", neutral: "cool",
      fontHeading: "ifadeli, kalın sans", fontBody: "sans-serif",
      typeScale: "expressive", radius: "rounded", density: "comfortable",
      motion: "playful", elevation: "layered", mode: "dark-first",
    },
  },
];

// --- brief composer --------------------------------------------------------

const NEUTRAL_TR: Record<StyleTokens["neutral"], string> = {
  cool: "soğuk nötr", warm: "sıcak nötr", pure: "saf gri nötr",
};

/** Vitrin seçimlerini Lead'e gidecek yapılı brief metnine çevirir. */
export function composeBrief(
  archetype: Archetype,
  preset: StylePreset,
  details: BuildDetails,
): string {
  const t = preset.tokens;
  const platforms = details.platforms.length
    ? details.platforms.join(" + ")
    : "web";
  const features =
    details.features.trim() || "(belirtilmedi — blueprint varsayılanlarını kullan)";
  return [
    "[VİTRİN BRIEF]",
    `Ürün: ${details.productName.trim() || "(adsız)"}`,
    `Arketip: ${archetype.id} — blueprints/${archetype.id}.md oku`,
    `Stil preset: "${preset.name}" (${preset.feel})`,
    `  renk: primary ${t.colorPrimary}, accent ${t.colorAccent}, ${NEUTRAL_TR[t.neutral]}`,
    `  tipografi: başlık "${t.fontHeading}", gövde "${t.fontBody}", ölçek ${t.typeScale}`,
    `  biçim: köşe ${t.radius}, yoğunluk ${t.density}, hareket ${t.motion}, elevation ${t.elevation}`,
    `  mod: ${t.mode}`,
    `Platform: ${platforms}`,
    `Özellikler: ${features}`,
    "",
    `Talimat: blueprints/${archetype.id}.md'yi oku; catalog.md'den ilgili kategorinin`,
    "standart özelliklerini de plana kat. Tasarım-sistemi-öncelikli build sırasını",
    "uygula (design → db/backend → platform helper'ları → qa). Stil preset'ini design",
    "helper'a başlangıç token seti olarak ver, DESIGN-SYSTEM.md ürettir.",
  ].join("\n");
}
