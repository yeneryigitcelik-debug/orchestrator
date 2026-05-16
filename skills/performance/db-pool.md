# DB Connection Pool

## Ararsın
- Her request yeni `new Pool()` oluşturuyor (pool tüketilmiyor)
- Pool `max` çok büyük (100+, DB'yi boğar) veya çok küçük (5, bottleneck)
- Connection leak: `client.release()` çağrılmıyor try/finally yok
- Pool warmup yok cold start'ta (ilk N istek yavaş)
- `idleTimeoutMillis` çok kısa (sürekli yeni bağlantı)

## Patterns
- `import { Pool } from 'pg'; export const pool = new Pool({...})` route handler içinde
- `pool.connect()` ama `client.release()` yok
- `pool.query()` doğrudan kullanmak yerine `connect+query+release`

## Severity
- **high**: Pool leak prod'da DB connection saturate
- **medium**: Pool config tuning yapılmamış
- **low**: Best practice

## Doğrusu
- Singleton pool, route handler dışında
- `max: 10..50` workload'a göre
- `try/finally { client.release() }` veya `pool.query()` doğrudan
- `pgBouncer` proxy production'da

## Örnek
`{"severity":"high","rule":"connection-leak","file":"src/repo/users.ts","line":22,"why":"pool.connect() ile alınan client release edilmiyor — 50 request sonra pool tükenir","fix":"const client = await pool.connect(); try { ... } finally { client.release(); }","evidence":"const client = await pool.connect(); const r = await client.query(...); return r.rows;"}`
