# Log Rotation / Driver

## Ararsın
- Docker default `json-file` driver, max-size yok → disk patlar
- Application file log rotation yok (`logs/app.log` sürekli büyür)
- syslog/journal retention yok
- Application stdout JSON ama parsing pipeline yok

## Patterns
- compose'da `logging:` block yok
- log4j/winston file appender rotate yok
- `tail -f` ile manual log inceleniyor

## Severity
- **high**: Prod disk full → tüm servisler crash
- **medium**: Log var ama aranabilir değil
- **low**: Best practice

## Doğrusu
- Docker: `logging: { driver: 'json-file', options: { max-size: '10m', max-file: '5' } }`
- App: rotate by date/size, gzip
- Centralized: Loki, ELK, CloudWatch
- structured JSON

## Örnek
`{"severity":"medium","rule":"docker-log-unbounded","file":"docker-compose.yml","line":1,"why":"Tüm servislerde log limit yok — chatty container 30GB log yapar, host disk dolar","fix":"global logging: driver: json-file options: max-size: 10m max-file: 5","evidence":"services:\n  api:\n    image: ... # no logging block"}`
