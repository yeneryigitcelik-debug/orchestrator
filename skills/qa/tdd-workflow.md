# TDD Workflow

Test-önce döngüsüyle çalış: kırmızı → yeşil → refactor.

## Ne yap
- Önce başarısız test yaz (kırmızı): beklenen davranışı koda dökmeden tanımla.
- Testi geçiren en az kodu yaz (yeşil) — fazlasını ekleme.
- Yeşilken refactor et: testler ağ olarak güvence verir.
- Küçük adımlar: tek davranış, tek test, kısa döngü.
- Test davranışı doğrulasın, implementasyonu değil — iç detay değişince test kırılmasın.
- Bug için: önce onu yeniden üreten testi yaz, sonra düzelt — regresyon kalıcı yakalanır.
- Dış bağımlılığı (ağ, saat, rastgele) sınırda mock'la; saf mantığı doğrudan test et.

## Kırmızı bayraklar
- Kod yazıldıktan sonra "test eklemek" — TDD değil, sadece test.
- Test hiç kırmızı görülmeden yeşil — yanlış şeyi test ediyor olabilir.
- Bir testte birden çok davranış; hata hangi sebepten belirsiz.
- Private metodu / iç state'i test edip refactor'ı imkânsızlaştırma.
- Geçmek için test'i değiştirmek (assertion'ı zayıflatmak).
