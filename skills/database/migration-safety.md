# Migration Safety

## Ararsın
- `DROP TABLE` veya `DROP COLUMN` rollback olmadan
- Büyük tabloya `ALTER TABLE ... ADD COLUMN NOT NULL DEFAULT` (locking)
- `CREATE INDEX` `CONCURRENTLY` olmadan büyük tablo (lock)
- Tek migration'da hem schema hem data manipulation (atomic ama yavaş)
- Migration `BEGIN/COMMIT` olmadan multi-statement

## Patterns
- `alter table ... add column ... not null` (default'sız zaten fail)
- `create index` (concurrently yok)
- `drop table` veya `drop column`
- Tek migration: schema + 1M satır update

## Severity
- **critical**: prod down riski (kilit, OOM), revert imkânsız drop
- **high**: Locking 30sn+, kullanıcı timeout
- **medium**: Best practice (concurrently)
- **low**: İsimlendirme

## Doğrusu
- Iki adımlı: nullable add → backfill → not null
- `create index concurrently` (transaction dışı)
- Önce shadow column, sonra swap
- Reversible migration

## Örnek
`{"severity":"high","rule":"locking-not-null-add","file":"migrations/0023_add_status.sql","line":1,"why":"50M satırlık orders tablosuna NOT NULL kolon ekleniyor — exclusive lock 5dk+","fix":"1) nullable ekle 2) backfill batch 3) NOT NULL constraint","evidence":"alter table orders add column status text not null default 'pending';"}`
