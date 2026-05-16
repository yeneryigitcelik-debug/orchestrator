# Postgres Schema Design

Tutarlılığı veritabanı seviyesinde garanti eden şema tasarla.

## Ne yap
- Doğru tip seç: `timestamptz` (naive timestamp değil), para için `numeric`, kimlik için `uuid`/`bigint`.
- `NOT NULL` varsayılan olsun; nullable olmak istisna ve bilinçli karar.
- Foreign key tanımla ve `ON DELETE` davranışını açıkça seç (cascade/restrict/set null).
- Tekillik kuralını `UNIQUE` constraint ile uygula — uygulama koduna güvenme.
- Sık sorgulanan FK ve WHERE/JOIN kolonlarına index; kısmi index uygun yerde.
- Sabit değer kümesi için enum veya `CHECK` constraint.
- Normalize et; gerçek performans ihtiyacı kanıtlanmadan denormalize etme.

## Kırmızı bayraklar
- FK yok — yetim satırlar, tutarsız ilişkiler.
- Para `float`/`double` ile tutulmuş → yuvarlama hatası.
- Her şey `text` ve nullable; doğrulama yalnız uygulamada.
- FK kolonunda index yok → JOIN ve silme yavaş.
- Zaman `timestamp` (tz'siz) → sunucu/istemci saat dilimi karmaşası.
