# Resource Limits

## Ararsın
- Container memory/cpu limit yok — bir servis host'u boğabilir
- Postgres `shared_buffers`, `work_mem` default (1 connection big query → OOM)
- Node app `--max-old-space-size` set değil (heap OOM tahmin edilmez)
- `ulimit -n` (file descriptor) düşük (ulaşılır)
- Log rotation yok, disk dolar

## Patterns
- compose'da `deploy.resources.limits` yok
- Dockerfile / runtime `NODE_OPTIONS` yok
- nginx `worker_connections` default

## Severity
- **high**: Prod OOM kill restart loop
- **medium**: Tuning yok, kapasiteyi kullanmıyor
- **low**: Best practice

## Doğrusu
- compose: `deploy.resources.limits.{memory, cpus}`
- Node: `NODE_OPTIONS=--max-old-space-size=512`
- Postgres tuning (pgtune)
- logrotate, journald limit

## Örnek
`{"severity":"medium","rule":"no-memory-limit","file":"docker-compose.yml","line":8,"why":"Worker container memory limit yok — bir job OOM yapınca host'u etkiler","fix":"deploy: resources: limits: memory: 1G","evidence":"worker-security: build: ... # no resources"}`
