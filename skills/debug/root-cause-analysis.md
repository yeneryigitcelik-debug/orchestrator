# Root Cause Analysis

Hatanın belirtisini değil, kök nedenini bul. Yamayı tetikleyen asıl arızayı izole et.

## Ne yap
- Kanıtla başla: tam hata mesajı, stack trace, log, hatalı çıktı — tahminle değil.
- Stack trace'i yukarıdan oku: hatanın atıldığı satır + oraya götüren çağrı zinciri.
- "5 neden" sor: hata neden oldu? o neden oldu? — belirtiden kaynağa in.
- Değişeni tespit et: en son hangi commit / deploy / config / veri değişti? `git bisect` düşün.
- Hipotezi izole et: değişkenleri teker teker sabitle, minimal yeniden üretim oluştur.
- Sınıflandır: kod hatası mı, veri/ortam mı, yarış durumu mu, dış servis mi, yapılandırma mı.
- Kanıtla doğrula: kök neden, gözlenen TÜM belirtileri açıklamalı — biri açıklanmıyorsa neden o değil.

## Kırmızı bayraklar
- Belirtiyi bastırmak: hatayı try/catch ile yutmak, kök neden dururken.
- "Muhtemelen şudur" deyip kanıtsız fix denemek.
- Stack trace okumadan rastgele yerlere log/print serpmek.
- İlk bulduğun şüpheliyi kök neden ilan etmek — diğer belirtiler hâlâ açıklanmıyor.
- Yeniden üretemeden "düzelttim" demek.
