# Error Handling

Hatayı tutarlı yakala, sınıflandır ve istemciye güvenli döndür.

## Ne yap
- Beklenen hataları (validation, not-found, yetki) tipli hata sınıflarıyla modelle.
- Tek bir merkezi error handler / middleware: hatayı log'la, HTTP karşılığını üret.
- Doğru status: 400 girdi, 401 kimlik, 403 yetki, 404 yok, 409 çakışma, 422 işlenemez, 5xx sunucu.
- İstemciye stabil hata gövdesi: `{ error: { code, message } }` — stack/SQL/iç detay sızdırma.
- Operasyonel hata (beklenen) ile programlama hatası (bug) ayır; bug'da süreci güvenli yeniden başlat.
- Async handler'ları sarmala ki reddedilen promise merkezi handler'a düşsün.
- Dış servis çağrısında timeout + sınırlı retry (exponential backoff) + circuit breaker düşün.

## Kırmızı bayraklar
- Her hataya 500 veya her hataya 200 dönmek.
- `catch (e) { console.log(e) }` deyip akışın devam etmesi.
- Stack trace veya DB hatasını ham haliyle response'a koymak.
- `throw 'string'` — Error olmayan değer fırlatmak.
- Retry'ın sonsuz veya idempotent olmayan işlemde olması.
