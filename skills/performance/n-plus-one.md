# N+1 Query

## Ararsın
- `for/forEach/map` döngüsü içinde DB query
- `Promise.all(items.map(async i => db.query(...)))` (paralel ama N tane)
- ORM lazy load döngüde: `users.forEach(u => u.posts.findAll())`
- Bir liste fetch sonra her item için detay fetch

## Patterns
- `for (const ... of ...)\s*\{[\s\S]*?(db\.|supabase\.|knex|prisma)`
- `\.map\(\s*async\s*[^)]*\)[\s\S]*?(db\.|supabase|knex|prisma)`

## Severity
- **critical**: Hot path, 100+ iteration, prod'da timeout sebebi
- **high**: List endpoint, 20-100 query
- **medium**: Düşük frekans ama yine N+1

## Doğrusu
- JOIN ile tek query: `select * from posts where user_id in ($1...)`
- Batch fetch: `dataloader` veya `whereIn`
- ORM eager loading: `include: { posts: true }`

## Örnek
`{"severity":"high","rule":"n-plus-one-orders","file":"src/api/dashboard.ts","line":45,"why":"100 kullanıcı için 100 ayrı order query — 2sn → 200ms olmalı","fix":"select user_id, count(*) ... where user_id in (...) group by user_id","evidence":"for (const u of users) { u.orderCount = (await db.query('select count(*) from orders where user_id=$1', [u.id])).rows[0].count; }"}`
