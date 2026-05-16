# Vacuum / Bloat

## Ararsın
- Sık update edilen tablo, autovacuum tuning yok (`fillfactor`, `autovacuum_vacuum_scale_factor`)
- pg_stat_user_tables `n_dead_tup` çok yüksek
- Bloat indikatör: index size > table size 3x
- TRUNCATE yerine DELETE büyük batch (dead tuple birikimi)

## Patterns
- Hot update column'lar (counter, last_seen) HOT pruning'i bozuyorsa: fillfactor 100
- `set autovacuum_vacuum_scale_factor = 0.2` default, hot tablo için 0.05 olmalı

## Severity
- **medium**: Index bloat, query yavaşlıyor
- **low**: Tuning fırsatı

## Doğrusu
- `alter table t set (fillfactor = 80)` HOT pruning için
- Per-table autovacuum tuning
- pg_repack ile online bloat fix
- Büyük batch delete → partition + drop

## Örnek
`{"severity":"medium","rule":"index-bloat","file":"migrations/0020_sessions.sql","line":1,"why":"sessions tablosu hot update (last_seen_at her request), index bloat 4x table size","fix":"alter table sessions set (fillfactor=80); + per-table autovacuum_scale_factor=0.05","evidence":"create table sessions (id uuid pk, last_seen_at timestamptz, ...);"}`
