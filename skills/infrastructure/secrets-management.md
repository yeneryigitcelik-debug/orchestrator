# Secrets Management

## Ararsın
- Secret'lar env'de plaintext (compose `.env`), rotation yok
- `.env` git'te tracked
- Kubernetes Secret base64 (encryption-at-rest off)
- Vault/Doppler/AWS Secrets Manager yok, hardcoded prod secret
- `--env-file` build sırasında image'a sızıyor

## Patterns
- `.env` file commit edilmiş
- `docker build --build-arg API_KEY=...` (image layer'a yazılır)
- compose'da `environment: STRIPE_KEY: sk_live_...`

## Severity
- **critical**: Prod secret git'te / image'da
- **high**: Rotation yok, 6+ ay aynı secret
- **medium**: Vault/Doppler yok, manual yönetim

## Doğrusu
- Vault / Doppler / AWS SM
- Compose: `secrets:` stanza Docker Swarm
- K8s: SealedSecrets / SOPS
- Build secret: `RUN --mount=type=secret`

## Örnek
`{"severity":"critical","rule":"secret-in-env-file","file":".env.production","line":3,"why":".env.production git'te tracked + STRIPE_LIVE_KEY plaintext","fix":".gitignore + Vault/Doppler. Compose secrets: stanza ile inject","evidence":"STRIPE_SECRET=sk_live_..."}`
