# Data Modeling

Veriyi erişim desenine göre modelle — tabloyu çizmeden önce sorguları düşün.

## Ne yap
- Önce erişim desenlerini çıkar: hangi sorgular sık, hangi alanlar filtreleniyor/JOIN'leniyor.
- Doğru depo tipi: ilişkisel veri + tutarlılık → SQL; esnek/iç içe belge → document store;
  anahtar-değer önbellek → KV. Modayı değil ihtiyacı seç.
- İlişkili veriyi normalize et; tekrarı kaldır. Denormalize sadece kanıtlı okuma darboğazında.
- Kimlik stratejisi: dış görünür id için UUID/ULID, iç için `bigint`; doğal anahtara güvenme.
- Durum/yaşam döngüsü alanlarını (created/updated, soft-delete, status) baştan tasarla.
- Çok kiracılı (multi-tenant) sistemde izolasyon sınırını (tenant_id + RLS) en baştan koy.
- Büyüme planı: hangi tablo şişecek, partition/arşiv stratejisi ne.

## Kırmızı bayraklar
- Şema sorgular düşünülmeden çizilmiş — sonradan pahalı JOIN/migration.
- Erken denormalizasyon → senkron tutma cehennemi.
- Her şey tek "kitchen sink" tabloda, onlarca nullable kolon.
- Çok kiracılı veride tenant izolasyonu sonradan ekleniyor (sızıntı riski).
- Doğal anahtar (email, telefon) primary key — değişince her şey kırılır.
