# Material Design 3 — bir tasarım preset'i

MD3 (Material You), Google'ın tasarım dili. Burada bir REFERANS PRESET olarak ele
alınır: token sisteminin MD3'e göre doldurulmuş bir hali. Zorunlu değil — kullanıcı
"Material" derse veya seçim sana bırakıldıysa sağlam, denenmiş bir başlangıçtır.
"Material Web" (`@material/web` component kütüphanesi) bundan ayrıdır — o kütüphane,
bu tasarım dili.

## MD3 renk sistemi
MD3 rengi tonal palet üstüne kurar — "istediğin UI"yı tek girdiden üretmenin yolu:

1. **Kaynak renk** seç (marka rengi, tek hex).
2. Ondan **tonal paletler** türet: primary, secondary, tertiary, neutral,
   neutral-variant, error. Her palet 0–100 ton (0=siyah, 100=beyaz).
3. Tonlardan **renk rolleri** ata (semantic katman):
   - `primary`, `on-primary`, `primary-container`, `on-primary-container`
   - aynısı secondary / tertiary / error için
   - `surface`, `surface-dim`, `surface-bright`, `surface-container` (5 seviye),
     `on-surface`, `on-surface-variant`, `outline`, `outline-variant`
   - Light tema belli tonları seçer (örn. primary = ton 40), dark farklı (ton 80).

`on-*` kuralı: her dolu renk için üstündeki içerik rengi tanımlı → kontrast garanti.

## Type scale
5 rol × 3 boy = 15: `display` L/M/S, `headline` L/M/S, `title` L/M/S, `body` L/M/S,
`label` L/M/S. Her birinin font/size/weight/line-height/tracking'i sabittir.

## Shape, elevation, state
- **Shape** — corner ölçeği: none / xs / sm / md / lg / xl / full. Component'ler
  ölçekten seçer (kart md, FAB lg, chip sm).
- **Elevation** — 0–5 seviye; MD3'te gölge + tonal surface birlikte (yüksek
  elevation = daha "primary-tinted" surface).
- **State layer** — hover/focus/pressed = içerik renginin düşük-opaklık katmanı
  (hover ~%8, focus ~%10, pressed ~%10). Her interaktif yüzeyde olmalı.

## Component anatomisi
Buton tipleri hiyerarşi sırasıyla: elevated, filled, filled-tonal, outlined, text.
Filled = birincil eylem, sayfada bir tane. Text = en düşük vurgu. FAB = tek, ekranın
ana eylemi. Bu hiyerarşiyi component kütüphanene taşı.

## Ne yap
- Kaynak renkten tonal paletleri türet (HCT renk uzayı; `@material/material-color-utilities`
  bu işi yapar) — paleti elle uydurma.
- 5 surface-container seviyesini kullan — düz "gri kart" yerine derinlik.
- `on-*` rollerini eksiksiz tanımla; kontrastı WCAG'a karşı doğrula.
- MD3'ü token katmanına yerleştir (bkz. token-architecture) — UI rolleri okur.
- iOS hedefi varsa: MD3 Android+web için doğru, iOS'ta Apple HIG'i tercih et;
  ortak token (renk/spacing) paylaşılır, component dili platforma uyar.

## Kırmızı bayraklar
- MD3 renk rolleri yerine düz hex paleti — tonal sistem atlanmış.
- `on-*` renkleri tanımsız → metin kontrastı şansa kalmış.
- State layer yok — hover/pressed geri bildirimi eksik.
- Elevation sadece gölge, tonal surface yok → MD3 görünmüyor.
- `@material/web` bakım modunda: greenfield'de tasarım dilini al ama component
  kütüphanesi olarak kendi kütüphaneni kurmayı değerlendir.
