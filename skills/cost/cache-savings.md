# Cache Savings

## Ararsın
- DB query her seferinde — Redis/memory cache fırsatı
- Edge cache yok (Cloudflare/Vercel) static-ish endpoint'lerde
- Memoization yok — pahalı hesap her render
- Build-time hesap yapılabilirken runtime'a bırakılmış
- Static page ISR yok (her request'te SSR)

## Patterns
- `getStaticProps` yerine `getServerSideProps` static data
- `useMemo` eksik pahalı compute
- `unstable_cache` next.js'te yok ama static data fetch

## Severity
- **high**: Hot endpoint hiç cache yok, DB CPU yüksek
- **medium**: ISR / edge cache fırsatı kaçırılmış
- **low**: Memoization eksik

## Doğrusu
- Redis with TTL
- Next.js `unstable_cache`, `revalidate`
- React `useMemo` / `cache()` server-side
- ETag/Last-Modified header

## Örnek
`{"severity":"high","rule":"category-list-uncached","file":"src/app/api/categories/route.ts","line":1,"why":"Kategoriler günde 1 kez değişiyor ama her request DB'ye gidiyor","fix":"unstable_cache + revalidate: 3600 veya CDN-cache header (Cache-Control: s-maxage=3600)","evidence":"export async function GET() { return db.query('select * from categories'); }"}`
