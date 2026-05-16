# JWT Best Practice

## Ararsın
- HS256 + sabit string secret (zayıf)
- `alg: none` accept edilen kütüphane
- Token expiry yok veya çok uzun (>30 gün)
- JWT içinde hassas veri (password, full DB row)
- Refresh token rotation yok
- `verify({ algorithms })` whitelist eksik

## Patterns
- `jsonwebtoken.sign(payload, secret)` algorithms specified değil
- `jwt.verify(token, secret)` algorithms whitelist yok
- payload: `{ password: ..., email: ... }`

## Severity
- **critical**: `algorithms` whitelist yok → `alg: none` saldırısı
- **high**: HS256 + zayıf secret, expiry yok
- **medium**: Token içinde gereksiz hassas alan
- **low**: Best practice (rotation)

## Doğrusu
- RS256 (asymmetric) tercih
- `algorithms: ['RS256']` whitelist
- Kısa expiry (15dk) + refresh token rotation
- payload: sub + role + iat + exp only

## Örnek
`{"severity":"critical","rule":"jwt-alg-none","file":"src/auth.ts","line":15,"why":"jwt.verify(token, secret) algorithms whitelist yok — alg: none header saldırısıyla signature bypass edilir","fix":"jwt.verify(token, key, { algorithms: ['RS256'] })","evidence":"const decoded = jwt.verify(token, secret)"}`
