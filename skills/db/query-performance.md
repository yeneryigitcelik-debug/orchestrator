# Query Performance

Sorguyu yazarken hızlandır — sonradan profil çekip kurtarmaktan ucuz.

## Ne yap
- `EXPLAIN (ANALYZE, BUFFERS)` ile gerçek planı oku; seq scan / yüksek satır tahminini fark et.
- WHERE, JOIN ve ORDER BY'da kullanılan kolonlara index ekle; bileşik index'te kolon sırası önemli.
- Sadece gereken kolonları seç — `SELECT *` ağ ve bellek israfı.
- N+1'i çöz: döngüde tekil sorgu yerine tek JOIN veya `IN (...)` toplu sorgu.
- Sayfalamada büyük `OFFSET` yerine keyset/cursor (`WHERE id > :last`).
- Toplu yazıda satır satır INSERT yerine batch/`COPY`; sayım için gereksiz `COUNT(*)` yapma.
- Sık ama pahalı okuma için cache veya materialized view düşün; cache invalidation planla.

## Kırmızı bayraklar
- ORM döngüde sorgu üretiyor — klasik N+1.
- Filtrelenen kolonda index yok → seq scan.
- `SELECT *` ile devasa satır + kullanılmayan kolon.
- Derin sayfalamada `OFFSET 100000` → her sayfa daha yavaş.
- Index var ama fonksiyon/cast nedeniyle kullanılmıyor (`WHERE lower(x)=...` ama index `x` üzerinde).
- "Yavaş" şikayeti var ama kimse `EXPLAIN` çekmemiş.
