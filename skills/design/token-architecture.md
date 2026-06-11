# Token Mimarisi — tek kaynak, üç katman

Tasarım sisteminin kalbi token'lardır. Token = isimlendirilmiş bir tasarım kararı —
hardcode değer değil, anlamı olan bir referans. Üç katman halinde kur; bu katmanlama
"istediğin UI"yı tek yerden değiştirilebilir yapar.

## Üç katman

**1. Primitive (ham) token** — çıplak değerler, anlamsız. Paletin tamamı.
`color-blue-500: #3b82f6`, `space-4: 16px`, `font-size-3: 18px`, `radius-2: 8px`.
Buraya UI'da DOĞRUDAN dokunma — sadece semantic katman referans verir.

**2. Semantic (anlamsal) token** — role atanmış primitive'ler. UI bunları kullanır.
`color-bg-surface → color-gray-50`, `color-text-primary → color-gray-900`,
`color-action-primary → color-blue-500`, `space-inset-md → space-4`.
Tema değişimi = semantic katmanın primitive eşlemesini değiştirmek.

**3. Component token** — tek component'e özel, semantic'e bağlı (opsiyonel ama güçlü).
`button-primary-bg → color-action-primary`, `card-radius → radius-2`.
Bir component'i izole ayarlamak gerektiğinde devreye girer.

UI kodu → component/semantic token okur, primitive okumaz. Bu kural ihlal edilirse
rebrand/tema imkânsızlaşır.

## Token aileleri (eksiksiz set)

- **color** — palet (her renk 50–950 tonal skala) + semantic roller: bg, surface,
  surface-variant, text, border, action, feedback (success/warning/error/info)
- **typography** — font ailesi, type scale (display/headline/title/body/label ×
  L/M/S), font-weight, line-height, letter-spacing, paragraph-spacing
- **spacing** — tek ölçek (4px tabanlı: 0,1,2,3,4,6,8,12,16,24…), inset/stack/inline
- **sizing** — ikon boyları, kontrol yükseklikleri (sm/md/lg), container max-width
- **radius** — none, sm, md, lg, full
- **elevation** — gölge seviyeleri (0–5) + z-index ölçeği
- **motion** — süre (instant/fast/normal/slow), easing eğrileri
- **border** — kalınlık, stil
- **opacity** — disabled, hover, overlay, scrim seviyeleri
- **breakpoint** — sm/md/lg/xl/2xl

## Ne yap
- Token'ları tek kaynak dosyada tanımla (`tokens.json` veya `tokens.ts`). Platform
  çıktıları (CSS/Swift/Kotlin) bundan ÜRETİLİR — elle senkron tutma.
- Ölçekleri tutarlı tut: spacing tek tabandan (4px) türesin, type scale oranlı olsun.
- Her semantic token'ın hem light hem dark değeri olsun (bkz. theming).
- İsimleri amaca göre ver (`text-primary`), görünüşe göre değil (`text-dark-gray`).
- Token sayısını dürüst tut — 12 gri tonu değil, ihtiyacın kadar.

## Kırmızı bayraklar
- UI kodunda primitive token / hex literal — semantic katman atlanmış.
- "primary", "secondary" gibi tek-kelime semantic'ler — bg mi text mi belirsiz.
- Spacing için magic number (`padding: 13px`) — ölçek dışı.
- Light/dark için iki ayrı token seti — tek set + iki değer olmalı.
- Token dosyası var ama platform çıktıları elle yazılmış → kayar.
