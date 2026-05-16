# HTTP Status Codes

## Ararsın
- `200 OK` ile hata dönülüyor (`{ok:false, ...}`)
- 401 yerine 403 (veya tersi)
- POST create için 201 yerine 200
- 404 ile 400 / 422 karıştırılmış
- DELETE success'te 200 + body (204 olmalı)
- 5xx aslında 4xx (validation hatası 500'e düşüyor)

## Patterns
- `return c.json({error:...}, 200)` (status missing veya yanlış)
- `if (!authed) return 404 'hidden'` (401 olmalı, security through obscurity)

## Severity
- **medium**: Cache'leyen client/CDN için sorun, semantic broken
- **low**: Naming/usage best practice

## Doğrusu
- 200 OK / 201 Created / 204 No Content / 304 Not Modified
- 400 Bad Request (validation) / 401 Unauthorized / 403 Forbidden / 404 Not Found / 409 Conflict / 422 Unprocessable / 429 Too Many
- 500 Server Error / 502 Bad Gateway / 503 Unavailable

## Örnek
`{"severity":"medium","rule":"create-returns-200","file":"src/api/posts/create.ts","line":24,"why":"POST /posts başarılı insert'te 200 dönüyor, REST semantiğe göre 201 Created olmalı","fix":"return c.json(post, 201)","evidence":"return c.json(post)"}`
