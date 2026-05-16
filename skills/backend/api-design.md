# API Design

Tutarlı, öngörülebilir ve dayanıklı HTTP API tasarla.

## Ne yap
- Kaynak odaklı yollar, isim çoğul: `GET /users`, `POST /users`, `GET /users/:id`.
- HTTP fiilini doğru kullan: GET okur (yan etkisiz), POST oluşturur, PUT/PATCH günceller, DELETE siler.
- Liste uçlarında sayfalama (cursor tercih) + filtre + sıralama; sınırsız liste dönme.
- Tutarlı response zarfı ve hata gövdesi; alan adlandırması tek stil (camelCase ya da snake, karışık değil).
- Yazma uçlarında idempotency anahtarı destekle (özellikle ödeme/kritik).
- Versiyonlama (`/v1`) ve breaking change için deprecation politikası.
- Auth her uçta açık; CORS'u beyaz liste ile sınırla.

## Kırmızı bayraklar
- `GET` ile veri değiştirmek veya fiil-içeren yol (`/getUser`, `/createOrder`).
- Tüm tabloyu sayfalamasız döndürmek.
- Aynı API'de bir uç `data`, diğeri ham array, üçüncüsü `result` dönmesi.
- Hata durumunda 200 + gövdede `success:false`.
- Versiyon yok → ilk breaking change tüm istemcileri kırıyor.
