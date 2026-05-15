# Restart Policy

## Ararsın
- compose'da `restart: no` veya policy hiç yok
- `restart: always` ama crash loop fail-fast'a engel
- `init: true` yok — PID 1 sinyalleri yanlış yönetiyor (Node default behavior)
- Graceful shutdown handler yok (SIGTERM ignore)

## Patterns
- compose service'lerinde `restart:` directive yok
- `init: true` yok, hand-rolled signal yok
- Node app `process.on('SIGTERM')` yok

## Severity
- **high**: Prod container crash sonrası kendini başlatmıyor
- **medium**: SIGTERM ignore, deploy sırasında uzun timeout
- **low**: Naming

## Doğrusu
- `restart: unless-stopped` (manual stop hariç)
- `init: true` veya tini ile PID 1
- App: SIGTERM'de connection drain, sonra exit
- Backoff: docker swarm/k8s exponential

## Örnek
`{"severity":"high","rule":"no-restart-policy","file":"docker-compose.yml","line":22,"why":"redis servisi restart policy yok — host reboot'tan sonra ayağa kalkmaz","fix":"restart: unless-stopped ekle","evidence":"redis: image: redis:7-alpine"}`
