# Deprecated Endpoints

## Ararsın
- `/v1/...` ve `/v2/...` paralel, v1 yıllardır no-op değişiklik
- `Deprecation` / `Sunset` header yok eski endpoint'lerde
- API doc'da "deprecated" ama runtime metric/notice yok
- Internal endpoint ölü ama hala route'lu
- A/B test endpoint kalmış prod'da

## Patterns
- Route listesinde v1, v2 birlikte
- Code comment'te "TODO: remove" yıl eski
- Sentry'de 0 hit yıllık (deadend)

## Severity
- **medium**: Sürdürmek maliyetli, deprecation plan yok
- **low**: Best practice

## Doğrusu
- `Deprecation: true`, `Sunset: <date>` RFC header
- Doc'ta kalkış tarihi
- Telemetri ile kullanım takip + son kullanıcılara mail
- Sunset gününde 410 Gone

## Örnek
`{"severity":"medium","rule":"deprecated-no-header","file":"src/api/v1/users.ts","line":1,"why":"v1/users 8 ay önce deprecate edildi ama Deprecation/Sunset header yok, client'lar bilinçsiz","fix":"res.setHeader('Sunset', 'Wed, 31 Dec 2026 23:59 GMT'); 'Deprecation', 'true'","evidence":"router.get('/v1/users', ...)"}`
