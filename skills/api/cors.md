# API CORS Strategy

## Ararsın
- CORS config yok, browser tarafı çağıramıyor (veya tam tersi: çok açık)
- Public ve internal API'lar aynı CORS policy
- Preflight cache yok (`Access-Control-Max-Age` eksik)
- Custom header'lar CORS'a eklenmemiş (`Allow-Headers`)

## Patterns
- `app.use(cors())` config'siz
- Internal admin endpoint dış origin'e açık
- Frontend `withCredentials: true` ama backend `Allow-Credentials: false`

## Severity
- **high**: Internal/admin endpoint CORS açık
- **medium**: Frontend CORS hatası prod
- **low**: Cache eksik

## Doğrusu
- `origin: env.ALLOWED_ORIGINS.split(',')`
- Public route + internal route ayrı router/middleware
- `Max-Age: 86400`
- `expose-headers` Rate-Limit-Reset, X-Request-Id

## Örnek
`{"severity":"medium","rule":"cors-preflight-no-cache","file":"src/server.ts","line":18,"why":"Preflight her API call'da yeni — gereksiz roundtrip","fix":"cors({ maxAge: 86400 })","evidence":"app.use(cors({ origin: env.ORIGIN }))"}`
