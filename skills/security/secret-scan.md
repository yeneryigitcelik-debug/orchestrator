# Secret Scan

## Ararsın
- API key / token / password literal kod içinde
- `.env` veya credential dosyası `.gitignore`'da değil (tracked)
- DB/Redis connection string hardcoded
- Private key (PEM) inline

## Patterns
- AWS: `AKIA[0-9A-Z]{16}`
- Stripe: `sk_(live|test)_[A-Za-z0-9]{24,}`
- GitHub PAT: `ghp_[A-Za-z0-9]{36}`
- OpenAI/Anthropic: `sk-(ant-)?[A-Za-z0-9_-]{40,}`
- Generic: `(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]`
- JWT secret: `jwt.*sign\([^,]+,\s*['"]`

## Severity
- **critical**: prod credential (sk_live, AKIA, gerçek DB password), .env commit edilmiş
- **high**: dev/test credential commit, eski (revoke edilmemiş) key
- **medium**: placeholder ama gerçek formatta görünen string

## Örnek
`{"severity":"critical","rule":"hardcoded-stripe-secret","file":"src/payment.ts","line":12,"why":"Stripe live key kaynak kodda — git history'de kalıcı","fix":"process.env.STRIPE_SECRET, key'i revoke et","evidence":"const k = 'sk_live_abc...'"}`
