# Missing Index

## Ararsın
- Migration'larda FK kolonu var ama index yok
- WHERE / ORDER BY / JOIN sık kullandığı kolonlarda index yok
- created_at, updated_at, status, user_id, tenant_id gibi alanlar
- Compound query ama composite index yok

## Patterns
- SQL migration: `create table ... foreign key (x) references y` sonra `create index` yok
- Sık görülen pattern: `where user_id = X and created_at > Y` → composite index gerekli

## Severity
- **high**: FK kolonu index yok büyük tablo, full scan yapan join
- **medium**: Sık filter ama index eksik
- **low**: Eklenebilir ama performans şu an iyi

## Doğrusu
- Her FK'ya index
- Filter pattern'lerine composite index (kolon sırası selektivite önemine göre)
- `EXPLAIN ANALYZE` ile doğrula

## Örnek
`{"severity":"high","rule":"missing-fk-index","file":"supabase/migrations/003_orders.sql","line":12,"why":"orders.user_id FK var ama index yok, listing endpoint seq scan","fix":"create index orders_user_id_idx on orders(user_id);","evidence":"create table orders (id uuid pk, user_id uuid references users(id), ...);"}`
