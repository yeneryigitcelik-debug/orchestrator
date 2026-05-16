# Webhook Signature

## Ararsın
- Stripe / GitHub / Twilio / Verimor webhook signature verify yok
- Signature var ama timing-safe compare değil (string ===)
- Replay protection yok (timestamp + nonce kontrolü)
- HMAC secret kod içinde / env'den okunmuyor

## Patterns
- `app.post('/webhooks/stripe', async (req) => { const event = await req.json(); ... })` — `stripe.webhooks.constructEvent` yok
- `if (signature === expected)` (timing attack)

## Severity
- **critical**: Signature kontrolü hiç yok — sahte event ile şirket fonu yönlendirme
- **high**: Signature var ama yanlış (string compare, eski clock skew)
- **medium**: Replay protection eksik

## Doğrusu
- Stripe: `stripe.webhooks.constructEvent(rawBody, sig, secret)`
- GitHub: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` + `crypto.timingSafeEqual`
- Verimor: dökümante imza yöntemi
- Raw body parser (JSON parse'tan önce)

## Örnek
`{"severity":"critical","rule":"webhook-no-signature","file":"src/api/webhooks/stripe.ts","line":1,"why":"Stripe webhook signature verify yok, sahte event ile order.completed tetiklenebilir","fix":"const event = stripe.webhooks.constructEvent(rawBody, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)","evidence":"const event = await req.json(); if (event.type === 'checkout.session.completed') { ... }"}`
