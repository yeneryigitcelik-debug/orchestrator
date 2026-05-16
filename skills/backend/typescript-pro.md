# TypeScript

Tip sistemini güvenlik ağı olarak kullan — kaçış değil, kanıt aracı.

## Ne yap
- `strict: true` aç; `noUncheckedIndexedAccess` ve `exactOptionalPropertyTypes` ekle.
- Dış sınırda (API yanıtı, env, JSON) tipi doğrula — `zod`/`valibot` ile parse et, `as` ile zorlama.
- Birlik tiplerini discriminated union yap; `switch` üzerinde exhaustive kontrol (`never` ile).
- `unknown`'ı `any` yerine kullan, sonra daralt.
- Yeniden kullanılan şekiller için `interface`/`type`; generic ile tekrarı kaldır.
- Public fonksiyonların dönüş tipini açıkça yaz — kazara genişlemeyi önler.
- Yardımcı tipleri (`Pick`, `Omit`, `Partial`, `ReturnType`) kullan, elle kopya tip yazma.

## Kırmızı bayraklar
- `any` veya `as unknown as X` ile tip sistemini susturma.
- `// @ts-ignore`/`@ts-expect-error` gerekçesiz serpiştirilmiş.
- `strict` kapalı — null/undefined hataları runtime'a kaçıyor.
- Dış veriyi doğrulamadan tipli kabul etmek (`const u = await res.json() as User`).
- Enum yerine gevşek string; typo derlemede yakalanmıyor.
- Aşırı karmaşık conditional/mapped type — okunmaz, basit tutulabilirdi.
