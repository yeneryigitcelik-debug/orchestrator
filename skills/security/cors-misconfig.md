# CORS Misconfig

## Ararsın
- `Access-Control-Allow-Origin: *` + credentialed endpoint (cookies/Authorization)
- Origin echo: `req.headers.origin` direkt response'a yazılıyor (anti-pattern)
- Pre-flight `OPTIONS` her şeyi kabul ediyor (`Allow-Headers: *`)
- Subdomain wildcard çok geniş (`.example.com` herşey)

## Patterns
- `app.use(cors())` config yok = `Origin: *`
- `res.setHeader('Access-Control-Allow-Origin', req.headers.origin)` whitelist'siz
- Hono `cors({ origin: '*', credentials: true })`

## Severity
- **critical**: Wildcard + credentials true (Origin echo ile session çalınabilir)
- **high**: Production'da CORS yok ama auth endpoint açık
- **medium**: Origin whitelist gevşek

## Doğrusu
- Whitelist explicit array
- credentials için sıkı match (env'den okunan list)
- preflight `Max-Age` ile

## Örnek
`{"severity":"critical","rule":"cors-credentials-wildcard","file":"src/server.ts","line":12,"why":"CORS wildcard '*' + credentials:true — başka origin'den auth'lu request gönderilebilir","fix":"origin: ['https://app.example.com'] explicit whitelist","evidence":"app.use(cors({ origin: '*', credentials: true }))"}`
