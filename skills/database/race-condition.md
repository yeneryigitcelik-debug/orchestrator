# Race Condition

## Ararsın
- Read-modify-write patterni atomic değil (`select` → js'de mutate → `update`)
- Counter / stock decrement non-atomic
- "Check then insert" → unique constraint olmadan iki paralel istek aynı kaydı oluşturur
- Eksik `SELECT FOR UPDATE` / `INSERT ... ON CONFLICT`

## Patterns
- `const cur = await select(...); await update(...cur + 1)`
- `if (!exists) await insert(...)` unique constraint yok

## Severity
- **critical**: Para/stok counter race
- **high**: Çift kayıt, duplicate booking
- **medium**: İdempotensiyalık eksik

## Doğrusu
- Atomic: `update t set n = n + 1 where ...`
- `insert ... on conflict do nothing/update`
- `select for update` advisory lock
- Unique constraint + retry

## Örnek
`{"severity":"critical","rule":"counter-race","file":"src/services/inventory.ts","line":18,"why":"Stock select-then-update — 2 paralel order aynı stoku iki kere düşürebilir","fix":"update products set stock = stock - $1 where id=$2 and stock >= $1 returning stock","evidence":"const p = await db.query('select stock from products where id=$1'); await db.query('update products set stock=$1', [p.stock - qty]);"}`
