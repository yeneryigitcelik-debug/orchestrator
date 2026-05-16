# Backup

## Ararsın
- Postgres backup cron / scheduled job yok
- Backup var ama remote (S3/B2) değil — host die'da kaybolur
- Retention yok (1 backup, kötü yedek üstüne yazar)
- Restore test edilmemiş (backup var ama açılır mı?)
- Volume `:ro` ama backup hedefi yok

## Patterns
- compose'da postgres volume var ama dump script yok
- pg_dump script var ama upload yok
- `.gitlab-ci.yml` / cron / systemd timer yok

## Severity
- **critical**: Hiç backup yok prod DB
- **high**: Local backup, off-site copy yok
- **medium**: Retention zayıf (sadece 1 gece)
- **low**: Restore drill yapılmamış

## Doğrusu
- Daily pg_dump + S3 upload + 7/30/365 retention
- WAL streaming (PITR) kritik prod için
- Aylık restore drill
- Sentry/Slack notify backup fail'da

## Örnek
`{"severity":"critical","rule":"no-db-backup","file":"docker-compose.yml","line":1,"why":"postgres servisi var ama backup mekanizması yok — host kaybında tüm veri gider","fix":"Cron + pg_dump → S3 (rclone) + 7d/30d/365d retention","evidence":"postgres: image: postgres:16 ... # no backup service/cron"}`
