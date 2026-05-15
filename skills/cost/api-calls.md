# API Call Cost

## Ararsın
- Pahalı external API (OpenAI, Stripe, Maps, Twilio) cache'siz tekrar tekrar
- Polling 1-2sn (server-side event veya webhook olmalı)
- Render başına API call (server component / useEffect)
- Sonsuz loop'a düşen retry — `while (true)` veya yanlış backoff
- Tek sayfa load'da 30+ API call (waterfall)

## Patterns
- `setInterval(fetch, 1000)` polling
- `useEffect(() => fetch(...), [renderTrigger])` her render
- `fetch(OPENAI_URL)` cache header yok

## Severity
- **critical**: Sonsuz loop pahalı API ($X/dakika kayıp)
- **high**: 1sn polling expensive endpoint
- **medium**: Cache'lenmesi gereken response'lar cache'siz
- **low**: Best practice

## Doğrusu
- Cache: Redis / unstable_cache / SWR
- WebSocket veya Server-Sent Event polling yerine
- Webhook + idempotent receiver
- Exponential backoff retry (max 5)

## Örnek
`{"severity":"critical","rule":"openai-uncached-render","file":"src/app/chat/page.tsx","line":15,"why":"OpenAI completion her render'da çağrılıyor, aynı prompt aynı yanıt — günde $200 boşa","fix":"Cache layer: `unstable_cache(getCompletion, [prompt], { revalidate: 3600 })`","evidence":"const res = await openai.chat.completions.create({...})"}`
