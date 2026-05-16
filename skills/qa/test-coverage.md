# Test Coverage

Anlamlı test yaz — sayıyı değil, riski kapsa.

## Ne yap
- Önce kritik yolları test et: auth, ödeme, veri yazma, sınır koşulları.
- Edge case'ler: boş girdi, çok büyük girdi, null, eşzamanlılık, hata yolu.
- Test isimleri davranışı anlatsın ("rejects expired token" — "test1" değil).
- Her test bağımsız: paylaşılan state yok, sıra bağımlılığı yok.
- Bug bulununca: önce onu yakalayan testi yaz, sonra düzelt.

## Kırmızı bayraklar
- Yalnızca happy-path testleri; hata yolu hiç test edilmemiş.
- Coverage yüksek ama assertion zayıf (çağırıyor, doğrulamıyor).
- Gerçek davranış yerine implementasyon detayını test etme.
- Flaky testleri `skip`'leyip geçme — kök nedeni bul.
