<!-- Imported from vibecosystem/skills/secret-management-patterns (MIT) — https://github.com/vibeeval/vibecosystem -->

# Secret Management Patterns

## Environment Variables (Baseline)

```typescript
// envalid ile startup validation
import { cleanEnv, str, url } from 'envalid'

const env = cleanEnv(process.env, {
  DATABASE_URL: url(),
  JWT_SECRET: str({ desc: 'Min 32 chars' }),
  STRIPE_SECRET_KEY: str(),
  REDIS_URL: url({ default: 'redis://localhost:6379' })
})
// App başlarken validation fail ederse crash (fail-fast)
```

## Cloud Secret Managers

```typescript
// AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
const client = new SecretsManagerClient({ region: 'eu-west-1' })
const secret = await client.send(new GetSecretValueCommand({ SecretId: 'prod/db-credentials' }))

// GCP Secret Manager
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
const client = new SecretManagerServiceClient()
const [version] = await client.accessSecretVersion({ name: 'projects/123/secrets/db-pass/versions/latest' })
```

## Secret Rotation

```
1. Yeni secret oluştur
2. Dual-accept: eski + yeni kabul et
3. Tüm consumer'ları yeniye geçir
4. Eski secret'ı deaktif et
5. Grace period sonrası sil
```

## CI/CD Secret Handling

```yaml
# GitHub Actions - OIDC (secret'sız cloud erişimi)
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123:role/deploy
    aws-region: eu-west-1

# ASLA: secret'ı env'e yazdırma
- run: echo ${{ secrets.API_KEY }}  # YANLIS!
```

## Secret Detection

```bash
# Pre-commit hook
pip install detect-secrets
detect-secrets scan --baseline .secrets.baseline

# CI'da
trufflehog git file://. --since-commit HEAD~1 --only-verified
gitleaks detect --source . --verbose
```

## Checklist

- [ ] Secret hardcoded DEĞİL
- [ ] .env .gitignore'da
- [ ] .env.example placeholder ile committed
- [ ] Secret rotation planı var
- [ ] CI'da secret scanning aktif
- [ ] Secret'lar least-privilege erişim
- [ ] Audit log: kim ne zaman erişti
- [ ] Pre-commit hook: detect-secrets

## Anti-Patterns

- Secret'ı log'a yazdırma
- Secret'ı URL query param'da gönderme
- Tek secret tüm environment'larda
- Rotation planı olmadan production secret
- Secret'ı client-side code'a gömme
