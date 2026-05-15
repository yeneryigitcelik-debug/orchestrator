# Migration Safety

Şema değişikliklerini üretimde kesinti yaratmadan uygula. Geri alınabilir,
sıralı, test edilmiş migration yaz.

## Ne yap
- Her migration tek bir mantıksal değişiklik; küçük ve odaklı tut.
- Geri alma (down) yolunu düşün — veri kaybı varsa açıkça not düş.
- Büyük tabloda `NOT NULL` kolon eklerken önce nullable + backfill + sonra constraint.
- Index'i mümkünse `CONCURRENTLY` ile ekle (kilit yaratmasın).
- Migration'ı kod deploy'undan ayır; eski kod yeni şemayla çalışabilmeli.

## Kırmızı bayraklar
- Tek migration'da kolon silme + yeniden adlandırma + tip değiştirme.
- Production tablosuna doğrudan `ALTER` — dry-run / staging testi yok.
- Migration içinde uzun süren `UPDATE` (tüm tabloyu kilitler).
- Foreign key'i validation'sız ekleyip sonra unutmak.
