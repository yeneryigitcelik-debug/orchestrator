# CDN Headers

## Ararsın
- Static asset `Cache-Control` yok / kısa max-age (1 dk)
- `Cache-Control: no-store` her şeyde (CDN bypass)
- HTML / API response cache'sizken asset cache'lenmiş ama immutable bayrak yok
- `Vary: *` (cache hit oranı 0)
- Versioned asset URL (`/static/abc123.js`) ama `immutable` yok

## Patterns
- Vercel/Next default config dışında özelleşme yok
- `headers: { 'cache-control': 'no-cache' }` over-broad
- Nginx `expires` yok

## Severity
- **high**: Asset her seferinde origin'den (CDN faydası 0)
- **medium**: Cache var ama optimize değil
- **low**: Best practice

## Doğrusu
- Versioned static: `Cache-Control: public, max-age=31536000, immutable`
- HTML: `Cache-Control: no-cache` ama `ETag` ile 304
- API: kullanım göre `s-maxage` (CDN) + `stale-while-revalidate`

## Örnek
`{"severity":"medium","rule":"missing-immutable","file":"infra/nginx.conf","line":18,"why":"Versioned static asset'lerde Cache-Control yok, browser her seferinde revalidate","fix":"location /static { expires 1y; add_header Cache-Control 'public, immutable'; }","evidence":"location /static { root /var/www; }"}`
