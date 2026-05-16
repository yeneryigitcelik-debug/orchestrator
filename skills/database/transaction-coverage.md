# Transaction Coverage

## Ararsın
- Birbirine bağlı çoklu DB yazma transaction'sız (yarıda kalırsa tutarsızlık)
- Cross-service kayıt: önce ödeme oluştur, sonra invoice yaz — ikincisi fail'se ne olur?
- `BEGIN/COMMIT` veya ORM transaction sarmalama yok
- `INSERT + UPDATE + DELETE` zinciri atomic değil

## Patterns
- Aynı handler içinde 2+ `INSERT/UPDATE/DELETE` ama `BEGIN` yok
- ORM: `db.tx(async tx => ...)` veya `prisma.$transaction([...])` eksik

## Severity
- **high**: Para/stok/audit log eksik bırakabilir
- **medium**: Tutarsızlık olası ama recoverable
- **low**: Best practice

## Doğrusu
- Tüm bağıntılı yazımları tek tx
- Outbox pattern external side effect için
- Idempotency key cross-call

## Örnek
`{"severity":"high","rule":"multi-write-no-tx","file":"src/api/checkout.ts","line":30,"why":"Order + payment + inventory update transaction'sız — payment fail'se order kalır, stok düşmüş olur","fix":"db.tx(async tx => { tx.query(order); tx.query(payment); tx.query(inventory) })","evidence":"await db.query('insert into orders ...'); await db.query('update inventory ...');"}`
