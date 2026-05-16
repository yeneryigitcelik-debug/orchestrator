# Response Size

## Ararsın
- API response 1MB+ tekil endpoint
- Embedded relations sınırsız (`?include=author,comments,replies` patlıyor)
- `select *` join ile 30+ kolon dönüyor
- Image meta endpoint full base64 data dönüyor
- HATEOAS/links şişkin

## Patterns
- `.json(bigArray)` 5000+ item liste
- ORM `include: { all: true }` derin
- Aynı obj farklı endpoint'lerde tekrarlanıyor

## Severity
- **high**: Mobil için 1MB+ response, kullanıcı bekliyor
- **medium**: Optimize fırsatı, pagination ile çözülebilir
- **low**: Best practice

## Doğrusu
- DTO mapping: sadece UI ihtiyacı
- Field selection (`?fields=id,name`)
- Sparse fieldsets (JSON:API standard)
- ETag + 304 cache

## Örnek
`{"severity":"high","rule":"oversized-list","file":"src/api/products.ts","line":12,"why":"Product list 2.4MB; thumbnail + description + variants gereksiz UI'da","fix":"Sparse fieldset: ?fields=id,name,price,thumb; detail endpoint full","evidence":"const products = await db.product.findMany({ include: { variants: true, images: true } })"}`
