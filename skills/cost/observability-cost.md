# Observability Cost

## Ararsın
- Sentry / Datadog APM tüm transaction track ediliyor (sampling yok)
- Metric cardinality patlamış (user_id label'i ile metric)
- Trace her request (sample rate 1.0 prod)
- Error rate normal ama Sentry quota %200
- Multiple APM tool aynı anda (overlap)

## Patterns
- `Sentry.init({ tracesSampleRate: 1.0 })`
- Prometheus label kullanıcı id
- Datadog + New Relic + Sentry hepsi açık

## Severity
- **medium**: Tek vendor $1000+/ay overkill
- **low**: Optimize

## Doğrusu
- Sampling: hot endpoint %1, slow %100, error %100
- Label kardinalite low (user_id YOK)
- Tek primary vendor, others gerekli specific use
- Error rate trace tagging önemli

## Örnek
`{"severity":"medium","rule":"trace-sample-100","file":"src/sentry.ts","line":5,"why":"Production tracesSampleRate: 1.0 — 5M request/ay × Sentry pricing = $1200/ay overage","fix":"tracesSampler ile hot path %1, slow/error %100","evidence":"Sentry.init({ tracesSampleRate: 1.0 })"}`
