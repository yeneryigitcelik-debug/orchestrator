# SSL / TLS

## Ararsın
- Caddy / nginx / Traefik config HTTP'ye fallback yapıyor (HTTPS zorunlu değil)
- `Strict-Transport-Security` header yok
- Sertifika auto-renew yok (Let's Encrypt 90 gün)
- Eski TLS sürümleri kabul (1.0/1.1)
- Mixed content (HTML https, asset http)

## Patterns
- nginx `listen 80;` + `proxy_pass` (redirect to https yok)
- Caddyfile yok HTTPS auto
- HSTS preload eksik

## Severity
- **high**: Prod HTTPS zorunlu değil, password sniff edilebilir
- **medium**: HSTS yok, auto-renew yok
- **low**: TLS 1.2 minimum

## Doğrusu
- nginx: 80 → 301 redirect to 443
- HSTS: `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`
- Caddy auto TLS
- TLS 1.2+ only

## Örnek
`{"severity":"high","rule":"http-not-redirected","file":"infra/nginx.conf","line":3,"why":"80 portu sadece serve ediyor, HTTPS redirect yok — login HTTP'de cleartext","fix":"server { listen 80; return 301 https://$host$request_uri; }","evidence":"server { listen 80; root /var/www; }"}`
