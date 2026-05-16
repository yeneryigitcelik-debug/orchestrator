# ESLint Disable Abuse

## Ararsın
- `/* eslint-disable */` dosya başında (tüm kuralları kapatıyor)
- `// eslint-disable-next-line` kritik kuralı kapatıyor (no-unused-vars, no-explicit-any)
- `// eslint-disable-line` justification yok (neden disable?)
- ESLint config'te kritik kural `off` çevrili

## Patterns
- `/* eslint-disable */` (kapsam global)
- `// eslint-disable-next-line` yorumun yanında "neden" yok
- `.eslintrc` `"rules": { "no-unused-vars": "off" }`

## Severity
- **medium**: Yaygın disable (10+ dosya), kuralın amacı kayboluyor
- **low**: Tek disable + justified yorum (tamam)

## Doğrusu
- Disable yerine kuralı düzelt
- Disable şartsa: `// eslint-disable-next-line no-x -- {neden}` (--justification)
- `overrides` ile dosya bazlı (test, migration, ...)

## Örnek
`{"severity":"medium","rule":"unjustified-eslint-disable","file":"src/services/payment.ts","line":1,"why":"Dosya başında `/* eslint-disable */` — tüm kurallar kapalı, justification yok","fix":"Spesifik kural disable et veya kodu düzelt","evidence":"/* eslint-disable */\nimport ..."}`
