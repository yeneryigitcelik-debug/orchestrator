# console.log in Prod

## Ararsın
- `console.log` / `console.error` source code'da (test/script hariç)
- Server-side log: PII sızabilir
- Client-side log: prod bundle'a giriyor (info disclosure)
- `debugger` statement
- `print()`, `dump()`, custom debug helper

## Patterns
- `console\.(log|debug|info|warn|error)\(` non-test dosyada
- `debugger` statement
- `if (DEBUG) console.log(...)` ama DEBUG hep true

## Severity
- **medium**: PII (email, token) console'a log'lanıyor
- **low**: Yaygın console.log, observability yok ama PII de yok
- **info**: Tek bir log, dev artığı

## Doğrusu
- Yapılandırılmış logger: pino, winston, logtail
- Level: debug / info / warn / error
- PII redaction
- Prod'da debug devre dışı

## Örnek
`{"severity":"medium","rule":"pii-in-console","file":"src/auth/login.ts","line":18,"why":"console.log({email, password}) — şifre plaintext console'a, log driver toplar","fix":"Password ASLA log'a, sadece email + sonuç (success/fail). Logger: logger.info({email, ok: true})","evidence":"console.log('login attempt', {email, password})"}`
