# Dockerfile Hygiene

Küçük, güvenli, hızlı build olan image üret.

## Ne yap
- Multi-stage build: build aşaması ayrı, runtime image sadece gerekli artefaktları taşır.
- Spesifik base tag kullan (`node:22-alpine`), `latest` değil.
- Layer cache'i koru: önce `package.json` + lockfile kopyala, install et, sonra kaynak.
- Non-root user ile çalıştır (`USER node`).
- `.dockerignore` ile `node_modules`, `.git`, `.env` dışarıda bırak.
- `HEALTHCHECK` tanımla.

## Kırmızı bayraklar
- Image içinde secret (`.env`, kimlik dosyası, token).
- `RUN apt-get update` ayrı layer, temizlik yok → şişik image.
- `COPY . .` en başta → her kod değişikliğinde tüm cache çöküyor.
- root olarak çalışan container.
