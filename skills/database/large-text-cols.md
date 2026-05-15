# Large Text / JSON Columns

## Ararsın
- `text` veya `jsonb` kolonu 100KB+ değer, hot table'da
- `SELECT *` ile büyük text dönüyor (network + memory)
- TOAST overhead, hot path
- JSON kolonu içinde sıkça filter edilen alan var ama expression index yok

## Patterns
- `description text` ama field 50KB+ avg
- `metadata jsonb` ama `metadata->>'status'` filter yaygın

## Severity
- **medium**: Liste endpoint'te büyük text döner
- **low**: Optimize fırsatı

## Doğrusu
- Büyük text ayrı tabloya: `posts(id, ...)` + `posts_body(post_id, body text)`
- `select id, title from posts` listede; body sadece detay
- JSON path için expression index: `create index ... on t ((data->>'status'))`

## Örnek
`{"severity":"medium","rule":"large-text-on-list","file":"src/api/posts/list.ts","line":12,"why":"posts.body 40KB avg, list endpoint'te select * dönüyor — 1000 satır 40MB response","fix":"select id, title from posts list, body sadece detay","evidence":"const posts = await db.from('posts').select('*').limit(1000)"}`
