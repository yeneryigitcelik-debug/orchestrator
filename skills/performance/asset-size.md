# Asset Size

## Ararsın
- 500KB+ görsel `public/` veya `assets/` altında
- PNG kullanılmış ama WebP/AVIF olmalıydı
- `<img src="...">` next/image kullanılmamış
- Video poster yok, ön-yükleme 10MB
- Font tüm subset yüklü (Cyrillic + Greek vs gereksiz)
- SVG inline edilmemiş, 5KB altı icon

## Patterns
- `*.png` 500KB+, `*.jpg` 1MB+
- `<img` next/image kullanan projede
- `@font-face` `font-display: swap` yok

## Severity
- **high**: 1MB+ hero görsel, LCP'yi 3sn'ye atan
- **medium**: 200-500KB optimize edilmeli
- **low**: Best practice (WebP eklenmeli)

## Doğrusu
- `next/image` veya `sharp` build-time optimize
- WebP / AVIF + JPEG fallback
- `loading="lazy"` below-fold
- Font subset (latin sadece)
- `<link rel="preload" as="image">` LCP image

## Örnek
`{"severity":"high","rule":"oversized-hero-image","file":"public/hero.png","line":1,"why":"4.2MB PNG ana sayfa hero — LCP 4.8sn, mobil felaket","fix":"`sharp hero.png -o hero.webp -q 80 -resize 1920` ve next/image","evidence":"public/hero.png — 4.2MB, 4000×2500"}`
