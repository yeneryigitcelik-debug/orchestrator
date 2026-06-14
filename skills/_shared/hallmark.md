<!-- Hallmark anti-slop tasarım skill'i (DAMITILMIŞ). Kaynak: github.com/Nutlope/hallmark
     (MIT · v1.1.0 · "Powered by Together AI"). Tam ruleset (558 satır + references/) orada;
     bu, orchestrator'ın UI üreten rollerine enjekte edilen yoğunlaştırılmış özüdür. -->

# Hallmark — anti-slop UI disiplini

Ürettiğin arayüz "generated" değil **"made"** görünmeli. Her LLM'in eğitildiği
default'lara düşme. Asıl fark: sadece görsel DEĞİL **yapısal** çeşitlilik — iki farklı
brief aynı `hero → 3-feature → CTA → footer` ritmini paylaşmamalı; farklı siteler gibi
hissettirmeli, aynı şablonun renk-takası değil.

## Her zaman geçerli 6 disiplin
1. **Pre-emit öz-eleştiri**: çıktıyı vermeden önce 6 eksende 1–5 puanla (Philosophy ·
   Hierarchy · Execution · Specificity · Restraint · Variety). <3 olan varsa revize et.
2. **Dürüst kopya**: uydurma metrik/testimonial/logo YOK. Kullanıcı sayı vermediyse icat
   etme — "+47% conversion", "50,000+ teams", "10× faster" icat edildiği an slop'tur.
   Gerçek veri, placeholder (`—` + "metric to confirm") ya da farklı bir macrostructure kullan.
3. **Kilitli token**: her renk ve her `font-family` adlı token'a referans versin
   (`var(--color-accent)`, `var(--font-display)`). Inline OKLCH/hex/`rgb()` ya da token-dışı
   `font-family` YOK. Gereken değer yoksa önce token blokuna adlı değişken olarak ekle.
4. **Sahte chrome YASAK**: elle çizilmiş tarayıcı barı (URL pill + trafik-ışığı noktaları),
   telefon çerçevesi, kod penceresi (mock title bar + dots saran `<pre>`), IDE chrome ÜRETME.
   Gerçek screenshot `<figure>` içinde (en fazla hairline border) ya da chrome'u tamamen bırak.
5. **Mobil** (320/375/414/768px'de kusursuz): yatay scroll yok (`html`+`body`
   `overflow-x: clip`, `hidden` değil); tıklanabilir metin iki satıra düşmesin
   (buton/nav/footer/CTA/breadcrumb); görsel grid track'leri `minmax(0,1fr)` (bare `1fr`
   değil); başlıklar uzun kelimede `overflow-wrap: anywhere; min-width:0`; section'lar
   mobilde tek kolona iner. Bu bir taban, dilek listesi değil.
6. **Tipografi saflığı**: italik başlık YOK — başlıklar/display roman (`font-style: normal`).
   `Built to <em>think</em>` gibi vurgu, en güvenilir AI tell'lerinden. Vurguyu ağırlık,
   accent renk ya da çizili underline ile taşı. İtalik yalnız gövde metni vurgusunda.

## Yapısal çeşitlilik (asıl ayırt edici)
- **ÖNCE macrostructure seç** (page-shape) — sonra görsel ruleset. Generic
  hero→features→CTA→footer iskeletine default'lama.
- **Nav + footer archetype** yapısal parmak izinin parçası. **N1a** (wordmark + birkaç inline
  link + sağda buton) ve **Ft3** (4 kolon link + social row + minik copyright) en tanınan AI
  parmak izleri — gerçekten 2 hedef / docs-hub yoksa onlardan kaçın.
- **Specimen fall-through** (numaralı sol-margin label + dev serif + asimetrik span + tipografik
  CTA) artık default DEĞİL — yalnız brief açıkça editorial/foundry derse.
- **tag-left / heading-right** (hanging header) iki-kolon deseni YASAK — en güvenilir
  templated-editorial tell'i. Tag kullanıyorsan dikey istifle (tag üstte, başlık hemen altında).
- **Section eyebrow/numara** (`01 · THE TOUR`) default KAPALI — yalnız gerçekten ordinal
  içerikte (Long Document/Manifesto), sayfada 1–2 taneyle sınırlı.

## Build kuralları
- Renk **OKLCH**, token'lar `:root`'ta CSS custom property. Spacing **4pt** ölçek, semantik ad.
- Font: ayırt edici **display + rafine body PAIRING** (tek-font yalnız bilinçli terminal
  estetiğinde). Tone'u UÇ seç: editorial · brutalist · soft · utilitarian · luxury · playful ·
  technical · austere ("clean & modern" tone değildir).
- Her interaktif eleman **8 state**: default · hover · `:focus-visible` · `:active` · disabled ·
  loading · error · success.
- Animasyon yalnız `transform` + `opacity` (layout property animasyonu YOK). 3 adlandırılmış
  easing (`--ease-out/in/in-out`) — browser default `ease` ya da bounce/overshoot YOK.
- `prefers-reduced-motion: reduce` (spatial motion ≤150ms opacity crossfade'e iner).
- `:focus-visible` görünür ring ≥3:1 kontrast; ring **animasyonu YOK** (anında görünür).
- Motion'ı eklemeden ÖNCE kes — çoğu sayfada fazla var. Bilgi kaybettirmiyorsa kaldır.
- Mevcut global stylesheet'i (`app/globals.css` vb.) **CLOBBER etme** — append-only; framework
  CSS direktiflerini ve var olan token adlarını koru.

## Genre (theme'den önce)
**editorial** (default · anti-slop ana ses) · **modern-minimal** (SaaS/Linear/Stripe) ·
**atmospheric** (AI/müzik/video/dark) · **playful** (consumer/onboarding). Genre downstream'i
(theme cluster, gate'ler, ses) scope'lar.

## Modlar (verb)
- *(default)* yeni tasarım/build → bu disiplinlerle üret.
- **audit** → mevcut UI'ı anti-pattern'lara karşı skorla, ranked punch list ver — DÜZENLEME.
- **redesign** → içerik/route/brand/IA koru, yalnız görsel/yapısal katmanı yenile.
- **study** → referans (URL/screenshot) DNA'sını çıkar (macrostructure/archetype/type/renk
  anchor) — pixel kopyalama YOK.

## Güvenlik rayı
Tasarım skill'i = codebase'i buldozerle ezme lisansı değil. Production dosya/route/component
**silme** — kullanıcı açıkça istemedikçe. Önce değiştireceğin/oluşturacağın/sileceğin dosyaları
söyle; silme açık onay ister. PDF/README/`.md` brief'leri referans say — verbatim kopyalama.
