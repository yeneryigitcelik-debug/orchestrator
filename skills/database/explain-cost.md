# EXPLAIN Cost / Query Plan

## Ararsın
- Büyük tabloda full seq scan beklenebilecek query
- ORDER BY index kapsamayan kolonda + LIMIT olmadan
- LIKE '%x%' (prefix wildcard) büyük tablo
- WHERE kolonu üzerinde fonksiyon var (`where lower(email) = ...`) → index by-pass
- Eksik covering index — index hit ama heap fetch fazla

## Patterns
- `where ... in (select ...)` korelasyonsuz subquery
- `where lower/upper/cast(col)` → expression index gerekir
- `order by created_at desc` index yok

## Severity
- **medium**: Belirgin tarama, ölçeklenince patlar
- **low**: Şu an ok, geleceğe not

## Doğrusu
- Function-based index: `create index ... on t (lower(email))`
- Full-text search ya da `pg_trgm` ILIKE için
- Covering index `INCLUDE` clause

## Örnek
`{"severity":"medium","rule":"function-on-where-col","file":"src/repo/users.ts","line":12,"why":"`where lower(email) = ...` users(email) index'ini bypass eder","fix":"`create index users_email_lower on users (lower(email))` ve query'i öyle bırak","evidence":"select * from users where lower(email) = $1"}`
