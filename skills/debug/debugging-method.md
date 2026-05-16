# Debugging Method

Kök neden bulununca: en küçük doğru fix'i uygula, regresyonu kalıcı kıl.

## Ne yap
- Önce hatayı yeniden üreten otomatik test yaz (kırmızı) — sonra düzelt (yeşil).
  Test, hatanın geri gelmesini kalıcı yakalar.
- Fix kök nedene yönelik olsun, belirtiyi maskeleme. Kapsamı dar tut — ilgisiz refactor yok.
- Aynı kök nedenin başka yerde de olup olmadığına bak; benzer hataları da kapat.
- Hata sınıfını sistemik kapat: tek bir null kontrolü değil, o tip hatayı imkânsız kılan
  tasarım (tipi daralt, invariant ekle, sınırda doğrula).
- Düzeltmeyi doğrula: yeni test geçer, mevcut testler kırılmaz, hata senaryosu elle de doğrulanır.
- Geçici tanı kodunu (ekstra log, print, debug flag) temizle; kalıcı olması gerekeni yapılandır.
- Önemsiz olmayan kök nedeni ve fix gerekçesini kısa bir notla bırak (commit mesajı / yorum).

## Kırmızı bayraklar
- Testsiz fix — hata sessizce geri gelir.
- Belirtiyi gizleyen fix (değeri zorla düzelt, hatayı yut) — kök neden duruyor.
- Fix'le birlikte ilgisiz büyük refactor — gözden geçirilemez, yeni risk.
- "Çalışana kadar deneme" — anlamadan rastgele değişiklik.
- Debug print/log üretimde unutulmuş.
