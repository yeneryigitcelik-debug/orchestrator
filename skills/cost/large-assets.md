# Large Assets / Bandwidth

## Ararsın
- 1MB+ image her sayfa load'unda
- Video autoplay full quality (mobile data israfı)
- CDN'siz büyük asset serve (origin'den her seferinde)
- Font tüm subset (Latin + Greek + Cyrillic) — 2MB
- WOFF kullanılıyor WOFF2 yerine

## Patterns
- `public/` 1MB+ image
- `<video autoplay>` poster yok, full src
- `Cache-Control` header yok / kısa

## Severity
- **high**: Anasayfa hero 5MB, mobile traffic'te aylık $X bandwidth
- **medium**: Asset optimize değil ama az traffic
- **low**: Best practice

## Doğrusu
- CDN (Cloudflare/CloudFront) + long Cache-Control
- WebP/AVIF + WOFF2
- Lazy load below-fold
- Video preload="none"

## Örnek
`{"severity":"high","rule":"cdn-missing","file":"infra/nginx.conf","line":1,"why":"public/ static asset'ler origin'den serve ediliyor (5GB/gün) — CDN ile %85 tasarruf","fix":"Cloudflare proxy + Cache-Control: public, max-age=31536000, immutable","evidence":"location /static { root /var/www; } # no cache header"}`
