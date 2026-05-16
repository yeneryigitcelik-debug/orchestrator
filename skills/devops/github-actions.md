# GitHub Actions

Hızlı, güvenli ve okunur CI/CD workflow'ları kur.

## Ne yap
- Job'ları ayır: lint / typecheck / test / build paralel koşsun, deploy bunlara bağlı.
- Bağımlılık ve build çıktısını cache'le (`actions/cache` veya setup action'ının cache'i).
- Action'ları sürüm pinle — hareketli `@v4` yerine commit SHA, en azından sabit tag.
- Sırları `secrets.*` ile geçir; log'a env basma. `pull_request` tetikleyicide fork'a sır verme.
- `permissions:` bloğunu en az yetkiye düşür (varsayılan geniş).
- `concurrency` ile aynı branch'in eski koşusunu iptal et.
- Deploy job'unu `environment` + gerekiyorsa onay (protection rule) ile koru.

## Kırmızı bayraklar
- Sır veya token workflow log'una yazdırılmış.
- Tüm adımlar tek dev job'da seri → CI dakikalarca sürüyor.
- Cache yok → her koşu sıfırdan `install`.
- `pull_request_target` ile fork PR'da sır + checkout — kod enjeksiyonu riski.
- Deploy testlere bağlı değil; kırık kod prod'a gidiyor.
