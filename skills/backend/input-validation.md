# Input Validation

Tüm dış girdiyi sistem sınırında doğrula — API body, query params, headers,
webhook payload. Doğrulanmamış veriyi business logic'e veya DB'ye sokma.

## Ne yap
- Şema tabanlı doğrulama kullan (Zod, Valibot vb.) — tipli ve tek noktadan.
- Whitelist yaklaşımı: bilinen alanları kabul et, fazlasını reddet.
- Sayısal sınır, string uzunluğu, enum değeri, format (email/uuid) kontrol et.
- Hata mesajları net olsun ama iç detay (stack, query) sızdırma.

## Kırmızı bayraklar
- `req.body.x` doğrudan SQL query'ye, dosya yoluna veya `eval`'e gidiyor.
- `JSON.parse` try/catch'siz.
- Doğrulama yalnızca frontend'de — backend güveniyor.
- `any` tipli request handler'lar.
