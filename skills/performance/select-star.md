# SELECT *

## Ararsın
- Raw SQL veya ORM'de `select *` kullanımı, özellikle list endpoint'lerde
- `.select('*')` Supabase/Knex
- Postgres `select * from big_table`
- API response'unda tüm kolonlar dönüyor — gereksiz bandwidth + tip leak

## Patterns
- `select\s+\*\s+from`
- `.select\(['"]?\*['"]?\)`
- ORM model'inde explicit field listesi yok

## Severity
- **high**: Hot path'te (list, search) `select *`, tablo 20+ kolon, payload büyük
- **medium**: Generic `select *` ama tablo küçük
- **low**: Test/dev kodu

## Doğrusu
- Sadece gerekli kolonları list'le: `select('id, name, created_at')`
- API tarafında DTO mapping yap

## Örnek
`{"severity":"high","rule":"select-star-list","file":"src/api/products/list.ts","line":22,"why":"500 ürün × 30 kolon = ~120KB gereksiz payload, response 3sn","fix":".select('id,name,price,thumb_url') sadece UI'ın ihtiyacı","evidence":"supabase.from('products').select('*').limit(500)"}`
