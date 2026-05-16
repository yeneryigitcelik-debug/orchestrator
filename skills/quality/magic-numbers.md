# Magic Numbers

## Ararsın
- Açıklamasız number literal kritik path'te (`if (status === 3)`, `setTimeout(fn, 86400000)`)
- Aynı sayı 5+ farklı yerde tekrarlanıyor (sabit olmalı)
- Tarih/zaman ms cinsinden hesaplama (`60*60*24*7`) sürekli
- Threshold hardcoded (`if (count > 100)`)

## Patterns
- `if (x === 7)` enum yerine
- `* 1000 * 60 * 60` inline
- `0x80` flag bit math

## Severity
- **low**: Best practice
- **info**: Refactor önerisi

## Doğrusu
- Named constants: `const ONE_DAY_MS = 86_400_000`
- Enum: `enum OrderStatus { Pending = 1, ... }`
- Config object module-level

## Örnek
`{"severity":"low","rule":"magic-number","file":"src/orders.ts","line":18,"why":"`if (order.status === 3)` — 3 ne demek? enum yok","fix":"`enum OrderStatus { Draft=1, Confirmed=2, Shipped=3 }` if (order.status === OrderStatus.Shipped)","evidence":"if (order.status === 3) await sendShipmentEmail(order)"}`
