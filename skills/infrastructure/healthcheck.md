# Healthcheck

## Ararsın
- Container HEALTHCHECK yok
- App `/health` veya `/healthz` endpoint yok
- Healthcheck var ama gerçek bağımlılığı kontrol etmiyor (sadece `curl /`, DB ölü olsa bile 200)
- Liveness vs readiness karışıklığı

## Patterns
- Dockerfile `HEALTHCHECK` directive yok
- compose `healthcheck:` yok
- Kubernetes `livenessProbe`/`readinessProbe` yok

## Severity
- **high**: Restart policy var ama healthcheck yok — donmuş app yeniden başlamaz
- **medium**: Sığ healthcheck (DB/Redis kontrol etmiyor)
- **low**: Naming

## Doğrusu
- `/healthz` (liveness, process ayakta mı)
- `/readyz` (readiness, DB+Redis+migrations ok mu)
- compose: `healthcheck: test, interval, start_period, retries`

## Örnek
`{"severity":"high","rule":"no-healthcheck","file":"docker-compose.yml","line":15,"why":"orchestrator container'ında healthcheck yok, restart: unless-stopped olmasına rağmen donduğunda kendini yeniden başlatmaz","fix":"healthcheck: test: ['CMD', 'curl', '-f', 'http://localhost:3000/healthz']","evidence":"orchestrator: build: ... restart: unless-stopped"}`
