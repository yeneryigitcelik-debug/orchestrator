# SSRF (Server-Side Request Forgery)

## Ararsın
- `fetch(req.body.url)` kullanıcı input'u URL'e gidiyor, allowlist yok
- Webhook callback URL kullanıcı tarafından setlenip server fetch'liyor
- Image proxy / link unfurl pattern allowlist'siz
- `localhost`, `127.0.0.1`, `169.254.169.254` (AWS metadata) blok yok
- Redirect follow + protocol check yok (file://, gopher://)

## Patterns
- `axios.get(userUrl)` allowlist yok
- Link preview / OG image fetch
- Webhook subscriber URL

## Severity
- **critical**: Cloud metadata endpoint erişimi (AWS/GCP IAM token leak)
- **high**: Internal network scan / port probe mümkün
- **medium**: Public-only allowlist eksik

## Doğrusu
- URL parse + protocol whitelist (`http`, `https`)
- DNS resolve + private IP block (RFC1918, AWS metadata)
- Allowlist host'lar
- redirect: 0 veya manual follow

## Örnek
`{"severity":"critical","rule":"ssrf-metadata","file":"src/api/preview.ts","line":18,"why":"req.body.url → axios.get, allowlist yok — http://169.254.169.254/latest/meta-data/ ile EC2 IAM token sızar","fix":"URL parse + host private IP/metadata block + protocol whitelist","evidence":"const r = await axios.get(req.body.url)"}`
