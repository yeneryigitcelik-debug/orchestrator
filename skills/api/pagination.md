# Pagination

## Ararsın
- List endpoint LIMIT yok — `select * from t` (sonsuz response)
- Offset-based pagination büyük tablo (deep pagination yavaş)
- Sıralama belirsiz — pagination tekrarlı/eksik kayıt verir
- Total count her sayfada yeniden hesaplanıyor (pahalı)

## Patterns
- `from('t').select('*')` limit yok
- `offset 10000 limit 20` derin offset
- `order by created_at` ama created_at aynı olabilen kayıtlar var → tie breaker yok

## Severity
- **high**: Liste endpoint LIMIT yok, 100K kayıt response
- **medium**: Offset yöntem çok yavaşlıyor (cursor önerilir)
- **low**: Best practice

## Doğrusu
- Cursor-based: `where (created_at, id) < ($cursor_date, $cursor_id) order by created_at desc, id desc limit 20`
- `Link: <...>; rel="next"` header
- Count'u ayrı endpoint / approx (`reltuples`)

## Örnek
`{"severity":"high","rule":"unbounded-list","file":"src/api/users/list.ts","line":8,"why":"`select * from users` limit yok — tablo 200K → response 500MB","fix":".limit(50).order('created_at', { ascending: false }) cursor pagination","evidence":"const users = await db.from('users').select('*')"}`
