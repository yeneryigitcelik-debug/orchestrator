# Content Negotiation

## Ararsın
- `Accept` header ignored, hep JSON
- `Content-Type` validation eksik (POST text/plain ama JSON.parse)
- `Accept-Encoding` honor yok (gzip/br response yok)
- `Content-Encoding` brotli/gzip yok büyük JSON response'larda
- File download endpoint `Content-Type` yanlış

## Patterns
- `app.post(...)` `Content-Type: application/json` zorunlu kontrol yok
- Hono / Express response gzip middleware yok
- 500KB JSON response uncompressed

## Severity
- **medium**: Compression yok, bandwidth israfı + yavaş
- **low**: Naming/MIME hatası

## Doğrusu
- `Content-Type` validation ile early reject
- `compression()` middleware (gzip + br)
- Streaming `transfer-encoding: chunked` büyük response

## Örnek
`{"severity":"medium","rule":"no-compression","file":"src/server.ts","line":1,"why":"Response gzip yok — 500KB JSON x 1000 req/dakika = 500MB bandwidth","fix":"app.use(compression()) veya nginx gzip on","evidence":"const app = express(); app.use(express.json()); // no compression"}`
