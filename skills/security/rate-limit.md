# Rate Limit

## Ararsın
- Login / signup / password reset / OTP / email send endpoint'lerinde rate-limit yok
- API endpoint genel rate-limit middleware yok
- Webhook receiver / public form için throttle yok
- Brute-force korumalı endpoint var ama IP yerine sadece user kullanıyor

## Patterns
- Express/Hono/Next route handler'da `rateLimit`, `slowDown`, `@upstash/ratelimit` çağrısı yok
- `/login`, `/signup`, `/forgot`, `/verify` özellikle kritik

## Severity
- **critical**: Auth endpoint rate-limit yok, captcha yok
- **high**: Mail/SMS gönderen endpoint limit yok (spam + maliyet)
- **medium**: Genel API limit yok ama hassas endpoint korumalı
- **low**: Limit var ama agresif değil

## Sağ kontrol
- `@upstash/ratelimit`, `express-rate-limit`, `hono-rate-limiter`
- Cloudflare/Vercel edge rate limit
- IP + email + device fingerprint kombinasyonu

## Örnek
`{"severity":"critical","rule":"login-no-rate-limit","file":"src/api/auth/login.ts","line":1,"why":"Login endpoint'inde rate-limit yok, credential stuffing açık","fix":"5/5dk per IP + 10/saat per email Upstash Ratelimit","evidence":"export async function POST(req: Request) { const {email, password} = await req.json(); ..."}`
