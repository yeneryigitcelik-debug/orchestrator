# Log Storage Cost

## Ararsın
- CloudWatch/Logtail/Datadog retention çok uzun (1 yıl+)
- Verbose log level prod'da (`debug`)
- PII / payload tam log'lanıyor (compliance + maliyet)
- Application metric yerine log metric (cardinality cost)
- Aynı satır 3 yerde log'lanıyor (duplikat)

## Patterns
- `logger.debug({ fullPayload })` her request
- Datadog `@trace` her span detail
- 7 günden fazla retention sebepsiz

## Severity
- **medium**: Aylık $500+ log fatura
- **low**: Optimize

## Doğrusu
- Log level: prod info, structured + sampling
- PII redaction (pino-noir)
- Cold storage 30+ gün (S3)
- Log → metric pipeline (Vector, Fluent Bit)

## Örnek
`{"severity":"medium","rule":"debug-in-prod","file":"src/server.ts","line":4,"why":"NODE_ENV=production ama logger.level='debug' — request başına 50 satır log, Datadog $800/ay","fix":"Prod info level + per-request id ile correlate","evidence":"const logger = pino({ level: 'debug' });"}`
