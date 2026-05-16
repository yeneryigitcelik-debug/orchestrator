# CI / CD

## Ararsın
- GitHub Actions / GitLab CI / vercel.json içinde test çalışmıyor merge önce
- Secret'lar hardcoded (TOKEN: 'abc')
- main'e doğrudan deploy, PR check yok
- `actions/checkout@v2` eski (v4 olmalı)
- Cache'leme yok (node_modules her seferinde install)
- `if: always()` deploy stage (test başarısızsa bile deploy)
- `pull_request_target` event yanlış kullanımı (RCE riski)

## Patterns
- `.github/workflows/*.yml` test step yok
- `secrets.X` yerine literal value
- `permissions: write-all` (least privilege ihlali)

## Severity
- **critical**: pull_request_target + checkout PR head (fork RCE), secret literal
- **high**: Test yok, deploy fail koruması yok
- **medium**: Cache yok, runner pinleme yok
- **low**: Naming

## Doğrusu
- pin actions: `actions/checkout@v4` veya SHA
- `permissions: contents: read` minimum
- needs: [test, lint] deploy önce
- cache: actions/setup-node + cache key

## Örnek
`{"severity":"critical","rule":"pull-request-target-checkout","file":".github/workflows/build.yml","line":12,"why":"pull_request_target + actions/checkout ref: pr/head — fork PR'ında RCE","fix":"pull_request event'i kullan veya checkout ref: github.event.pull_request.base.sha","evidence":"on: pull_request_target\n...steps:\n  - uses: actions/checkout@v4\n    with: { ref: ${{github.event.pull_request.head.sha}} }"}`
