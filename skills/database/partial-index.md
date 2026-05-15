# Partial Index

## Ararsın
- Sık filter koşulu ama tabloda yaygın değil (örn. `where status = 'pending'` ama %95 'done')
- Soft-delete: `where deleted_at is null` her query'de, full index gereksiz büyük
- Unique constraint genel ama belirli koşulda anlam taşıyor (örn. aktif kullanıcılar)

## Patterns
- `where deleted_at is null` filter yaygın, normal index var ama büyük
- `where status in ('pending','processing')` küçük subset

## Severity
- **medium**: İndex boyutu yarısı, kullanılmayan kısımları kaplıyor
- **low**: Optimize fırsatı

## Doğrusu
- `create index ... on t (col) where deleted_at is null`
- `create unique index ... where active = true` (yumuşak unique)
- Index size azalır, write maliyeti düşer, sorgu daha hızlı

## Örnek
`{"severity":"medium","rule":"partial-index-soft-delete","file":"migrations/0007_users.sql","line":12,"why":"users tablosu 5M satır, %85'i deleted=true; her query 'where deleted_at is null' filter ediyor, index full","fix":"create index users_email_active_idx on users(email) where deleted_at is null","evidence":"create index users_email_idx on users(email);"}`
