# Vercel Deploy

Vercel'e güvenli ve öngörülebilir deploy.

## Ne yap
- Her PR otomatik preview deploy alır — prod'a merge etmeden preview URL'de doğrula.
- Ortam değişkenlerini Vercel'de Development/Preview/Production scope'larına ayrı tanımla.
- Sırrı repo'ya koyma; `vercel env` ile yönet, lokale `vercel env pull` ile çek.
- Proje yapılandırması için `vercel.ts` (TypeScript, tipli) tercih — `vercel.json` yerine.
- Build/install komutu ve framework preset'ini proje ayarında doğrula.
- Riskli sürümler için Rolling Release (kademeli rollout); sorunda önceki deployment'a anında rollback.
- Zamanlı iş için platform Cron (`crons`), ayrı sunucu kurma.

## Kırmızı bayraklar
- `.env`/secret commit'lenmiş.
- Tek bir env değeri tüm ortamlara paylaşılmış (prod sırrı preview'da).
- Production'a doğrudan, preview'da test etmeden push.
- Eski `vercel.json` ile yeni `vercel.ts` aynı projede çakışıyor.
- Build başarısız ama eski deployment'a rollback yapılmıyor.
