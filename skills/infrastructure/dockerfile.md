# Dockerfile

## Ararsın
- `FROM ... :latest` (deterministik değil)
- root user (USER directive yok)
- Multi-stage yok, prod image'da build tool'lar (~1GB+)
- `npm install` (prod için `npm ci --production` olmalı)
- COPY . . önce, sonra npm install (cache patladı)
- HEALTHCHECK yok
- ENV ile secret (DB password)
- node_modules COPY ediliyor host'tan

## Patterns
- `FROM node` (tag yok = latest)
- `RUN apt update` cache temizliği yok
- `EXPOSE` yok, port belirsiz

## Severity
- **high**: root + secret env, latest tag prod
- **medium**: Image gereksiz büyük, healthcheck yok
- **low**: Best practice (cache layer)

## Doğrusu
- `FROM node:22-alpine` pin
- Multi-stage: `as builder` + `as runtime`
- `RUN adduser -D app && USER app`
- COPY package*.json önce, install, sonra COPY . .
- HEALTHCHECK CMD curl -f http://localhost:port/health
- Secret'lar runtime --env-file ile

## Örnek
`{"severity":"medium","rule":"non-root-user-missing","file":"Dockerfile","line":1,"why":"USER directive yok — container root ile çalışıyor, host'a privilege escalation riski","fix":"adduser -D app ekle, sonra USER app","evidence":"FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nCMD [\"node\",\"index.js\"]"}`
