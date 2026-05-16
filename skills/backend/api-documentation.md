# API Documentation

API'yi tüketenin deneyebileceği kadar net belgele. Doküman koddan kopmasın.

## Ne yap
- Sözleşmeyi makine-okunur tut: OpenAPI/Swagger spec (REST) veya schema (GraphQL).
- Mümkünse spec'i koddan üret (route + tip + Zod şemasından) — elle yazılan doküman bayatlar.
- Her uç için: amaç, yöntem+yol, parametreler, istek gövdesi, yanıt şeması, hata kodları.
- Gerçek istek/yanıt örneği ver — boş şema yerine çalışan örnek.
- Auth gereksinimini, rate limit'i ve sayfalama davranışını açıkça yaz.
- Kırıcı değişiklikte versiyon ve değişiklik notu (changelog); deprecation'ı işaretle.
- README'ye hızlı başlangıç: kimlik alma, ilk çağrı, temel akış.

## Kırmızı bayraklar
- Doküman elle yazılmış, kod değişmiş — örnekler artık yanlış.
- Yalnız mutlu yol belgelenmiş; hata yanıtları ve kodları yok.
- Örnek yok, sadece tip tanımı — tüketici denemeden anlayamıyor.
- Auth/rate-limit/sayfalama belgesiz — entegrasyon deneme yanılmayla.
- Kırıcı değişiklik sessizce yapılmış, changelog yok.
