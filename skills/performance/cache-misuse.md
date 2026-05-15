# Cache Misuse

## Ararsın
- Aynı veriyi tek request içinde 2+ kere fetch
- Statik / nadiren değişen veri her render'da fetch (kategori, config)
- Server-side render'da `fetch(..., { cache: 'no-store' })` gereksiz yere
- Client'ta SWR / React Query yok, useEffect ile basit fetch (cache yok, dedupe yok)
- Redis var ama TTL agresif (1sn) — cache anlamsız

## Patterns
- Aynı endpoint birden fazla yerden çağrılıyor (next/react-server)
- `useEffect(() => fetch(...))` yaygın
- `revalidate: 0` veya `cache: 'no-store'` data tarafsız endpoint'te

## Severity
- **high**: Pahalı external API her sayfa render'da çağrılıyor
- **medium**: DB query duplikası, basit memoize çözer
- **low**: Optimize edilebilir

## Doğrusu
- React Query / SWR / RSC fetch dedupe
- Next ISR / revalidate doğru değer
- Redis cache + invalidation event'i

## Örnek
`{"severity":"high","rule":"static-data-fetched-each-render","file":"src/app/page.tsx","line":8,"why":"Categories listesi (10 satır, günde değişmez) her sayfa load'unda fetch ediliyor","fix":"`unstable_cache(getCategories, ['categories'], { revalidate: 3600 })`","evidence":"const categories = await fetch('/api/categories', { cache: 'no-store' })"}`
