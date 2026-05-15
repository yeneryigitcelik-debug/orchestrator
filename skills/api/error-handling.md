# Error Handling

## Ararsın
- Try/catch yok hot endpoint'lerde — uncaught Promise rejection
- Hata mesajı detay sızdırıyor (`error.stack` user'a dönüyor)
- 500 yerine 200 + `{ok:false}` (HTTP semantic kayboluyor)
- DB error swallow ediliyor (catch boş veya console.log)
- Global error handler / middleware yok

## Patterns
- `app.use((err, req, res, next) => ...)` yok (Express)
- Hono `onError` handler yok
- `catch (e) { console.log(e) }` no-op
- `return new Response(err.stack, { status: 500 })`

## Severity
- **high**: Stack/SQL leak (info disclosure), uncaught rejection prod crash
- **medium**: Generic error message, observability yok
- **low**: İsim/format

## Doğrusu
- Global handler: log + sanitized response
- `{ error: { code, message } }` minimal payload
- Sentry/Logtail entegrasyon

## Örnek
`{"severity":"medium","rule":"error-stack-leak","file":"src/api/orders.ts","line":40,"why":"catch'te error.stack response body'ye yazılıyor — SQL şema bilgisi sızıyor","fix":"logger.error(e); return c.json({error: 'internal'}, 500)","evidence":"} catch (e) { return c.json({error: e.stack}, 500); }"}`
