# JSON vs Relational

## Ararsın
- jsonb içinde "schema" giderek netleşmiş, ilişkisel ama hala jsonb
- jsonb içinde array sıkça filter ediliyor (GIN index yok)
- jsonb içinde foreign key kavramı simüle ediliyor (`{user_id: ...}`)
- Schema migration yok, prod'da farklı satırlarda farklı alanlar

## Patterns
- `data->>'user_id'` join key
- `data->'tags' @> '[...]'` filter ama GIN yok
- jsonb satırı 5KB+ ortak şema ile

## Severity
- **medium**: Migration olmadan prod'da heterojen veri
- **low**: Optimize/normalize fırsatı

## Doğrusu
- Şema netse: ayrı kolonlar (typed, indexable)
- Hala JSON ihtiyacı varsa: GIN index `using gin (data jsonb_path_ops)`
- Strict subset için partial index

## Örnek
`{"severity":"medium","rule":"json-foreign-key","file":"migrations/0012_events.sql","line":4,"why":"events.data->>'user_id' ile join, FK constraint yok ve performans seq scan","fix":"events.user_id uuid references users(id) ayrı kolon olarak çıkar","evidence":"create table events (id uuid, data jsonb); -- queries: events.data->>'user_id'"}`
