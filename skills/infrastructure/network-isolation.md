# Network Isolation

## Ararsın
- Docker compose'da tek default network, internal-only servis dış'a açık
- Postgres / Redis port'u host'a `ports:` ile yayılmış (sadece internal olmalıydı)
- `--net=host` veya `network_mode: host` (firewall bypass)
- VPC / firewall kural yok, public IP'li DB
- Container'da gereksiz capability (`SYS_ADMIN`, `NET_ADMIN`)

## Patterns
- `ports: ['5432:5432']` postgres host'a açık
- `network_mode: host`
- `cap_add: [SYS_ADMIN]` neden?

## Severity
- **critical**: DB internet'e açık (auth zayıfsa shodan'da)
- **high**: Sadece internal kullanım için DB host'a `ports:`
- **medium**: Network izolasyonu yok

## Doğrusu
- Compose `networks:` ile tier ayır (web, app, db)
- DB sadece app network'ünde
- `expose:` (sadece internal), `ports:` (host bind)
- Capabilities drop default + ihtiyaç olanı add

## Örnek
`{"severity":"high","rule":"db-port-exposed","file":"docker-compose.yml","line":24,"why":"postgres `ports: 5432:5432` host'a açık — sadece app container kullanıyor, dış erişim gereksiz","fix":"ports yerine expose; veya 127.0.0.1:5432:5432 sadece localhost","evidence":"postgres:\n  ports: ['5432:5432']"}`
