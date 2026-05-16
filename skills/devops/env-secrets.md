# Environment & Secrets

Yapılandırma ve sırları koddan ayır, sızdırma.

## Ne yap
- Tüm yapılandırmayı env'den oku; kod içine host/anahtar gömme.
- `.env.example` repo'da (anahtar isimleri, değer yok); gerçek `.env` gitignore'da.
- Uygulama boot'unda env şemasını doğrula (Zod vb.) — eksik/yanlış env ile başlangıçta patla.
- Sırları gizli yönetici ile tut (Vercel/GitHub secrets, vault); CI log'una basma.
- Ortam başına ayrı değer: dev/staging/prod farklı DB, farklı anahtar.
- Sır sızdıysa: önce rotate et (iptal + yeni üret), sonra geçmişi temizle.
- Client'a yalnız public değişken (örn. `NEXT_PUBLIC_*`) gitsin; server sırrı bundle'a girmesin.

## Kırmızı bayraklar
- `.env` veya API anahtarı commit geçmişinde.
- Gerçek sır `.env.example` içinde.
- Env runtime'da serpiştirilmiş, tek noktada doğrulanmamış → eksikse runtime'da gizemli hata.
- Server sırrı `NEXT_PUBLIC_` önekiyle client bundle'ına sızmış.
- Sızan anahtar sadece silinmiş ama rotate edilmemiş — hâlâ geçerli.
