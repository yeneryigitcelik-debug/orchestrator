# CSRF

## Ararsın
- State-changing endpoint (POST/PUT/DELETE) CSRF token doğrulaması yok
- SameSite cookie attribute eksik (`SameSite=Lax|Strict`)
- CORS açık ama credentialed request korumasız
- Form submit'inde origin check yok
- GET endpoint mutation yapıyor (örn. `/logout` GET)

## Patterns
- `app.post(...)` body parsing var ama `csrf` middleware yok
- `cookie: { sameSite: 'none' }` httpOnly olmadan
- `Access-Control-Allow-Credentials: true` + `Origin: *`

## Severity
- **high**: Auth'lu state-changing endpoint korumasız
- **medium**: SameSite eksik, cookie yine de korumalı
- **low**: GET ile mutation

## Doğrusu
- CSRF token (double-submit cookie veya synchronizer)
- `SameSite=Lax` minimum
- Origin/Referer header doğrula

## Örnek
`{"severity":"high","rule":"csrf-no-token","file":"src/api/transfer.ts","line":8,"why":"POST /transfer endpoint CSRF token kontrolü yok; oturum açık kullanıcının tarayıcısında bir saldırgan formu submit ettirebilir","fix":"csurf veya hono-csrf middleware ekle, cookie SameSite=Lax","evidence":"app.post('/transfer', async (req, res) => { ... })"}`
