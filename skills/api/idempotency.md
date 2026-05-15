# Idempotency

## Ararsın
- Ödeme/sipariş/transfer endpoint'leri Idempotency-Key header desteklemiyor
- POST endpoint client retry yapınca çift kayıt
- Webhook receiver event id'ye göre dedupe etmiyor
- Stripe / payment provider charge endpoint'i idempotent değil

## Patterns
- Sensitive write endpoint'te `request.headers.get('Idempotency-Key')` yok
- DB'de `idempotency_keys` tablosu yok
- Webhook event_id unique constraint yok

## Severity
- **critical**: Para çift çekilebilir, çift sipariş
- **high**: Audit log çift girdi, kullanıcı confused
- **medium**: Hatalı retry ile gereksiz yan etki
- **low**: Best practice

## Doğrusu
- Idempotency-Key header zorunlu sensitive endpoint'te
- DB'de `(user_id, idempotency_key)` unique
- Webhook: `events(event_id pk)` insert on conflict
- Outbox + dedupe

## Örnek
`{"severity":"critical","rule":"payment-not-idempotent","file":"src/api/payments/charge.ts","line":15,"why":"Charge endpoint Idempotency-Key kontrolü yok — network retry çift çekim yapar","fix":"Header zorunlu, idempotency_keys tablosuna (user_id, key) unique insert, varsa cached response döndür","evidence":"export async function POST(req) { const charge = await stripe.charges.create(...); }"}`
