# Prisma Patterns

Prisma ile güvenli ve performanslı veri erişimi.

## Ne yap
- `PrismaClient`'ı tek instance tut (singleton); her istekte `new` yapma — dev'de globalThis'e bağla.
- N+1'i `include`/`select` ile çöz; ilişkili veriyi tek query'de getir.
- `select` ile sadece gereken kolonları çek — tüm modeli taşıma.
- Birden fazla yazıyı `$transaction` ile atomik yap.
- Migration'ı `prisma migrate` ile üret ve repo'ya commit'le; şemayı elle DB'de değiştirme.
- `@@index` / `@@unique` ile sık sorgulanan ve benzersizlik gereken alanları işaretle.
- Sayfalamada büyük offset yerine cursor (`cursor` + `take`).

## Kırmızı bayraklar
- Her istekte `new PrismaClient()` → bağlantı havuzu tükenir.
- Döngü içinde `await prisma.x.findUnique(...)` → klasik N+1.
- `findMany()` filtresiz/limitsiz tüm tabloyu çekiyor.
- İlişkili yazılar ayrı ayrı, transaction'sız → yarım kalan kayıt.
- `migrate dev` ile `db push` karışık kullanılıp migration geçmişi tutarsız.
