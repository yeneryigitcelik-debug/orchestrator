# Dependency Audit

## Ararsın
- `package.json` / `package-lock.json` / `pnpm-lock.yaml` içinde bilinen CVE'li paketler
- Çok eski major version (ör. `next@12`, `react@16`, `axios@0.x`)
- Belirgin abandoned paketler (request, node-uuid, …)
- Doğrudan veya transitive bilinen ciddi açıklar

## Patterns
- Bilgi kaynağı: github.com/advisories, npm advisory feed (bellekte tut)
- Sürüm sınırı bilinen CVE altındaysa raporla

## Severity
- **critical**: Aktif sömürülen CVE (prototype pollution, RCE) prod kodunda
- **high**: HIGH-CVE patch versiyonu var ama uygulanmamış
- **medium**: Major version eski (security release missed)
- **low**: Audit warning ama low-risk

## Format
- Komut açıklaması da yaz: "npm audit fix" veya "pnpm up <pkg>@<safe>"

## Örnek
`{"severity":"high","rule":"vulnerable-axios","file":"package.json","line":18,"why":"axios <1.7.4 SSRF (CVE-2024-XXX), kullandığın sürüm 0.27.x","fix":"axios sürümünü ^1.7.4'e yükselt: pnpm up axios","evidence":"\"axios\": \"^0.27.2\""}`
