# Naming

## Ararsın
- Tek harfli variable global scope'ta (`const u = ...`)
- Misleading isim: `getUser` döner Promise ama `await` yok denecek anlam
- Hungarian notation kalıntısı (`strName`, `arrItems`)
- İngilizce-Türkçe karışık (`musteri_id`, `customerEmail`)
- Inconsistent boolean prefix (`isActive`, `enabled`, `hasPermission`)

## Patterns
- `function fn(a, b, c)` parametre isimsiz
- `data`, `info`, `obj` jenerik isim
- `temp`, `tmp`, `xxx` test artığı

## Severity
- **low**: Refactor önerisi
- **info**: Best practice

## Doğrusu
- Domain dili sabit (İngilizce veya Türkçe, karışık olmasın)
- Boolean: `is/has/can/should`
- Function: verb-first (`createUser`, `parseJson`)
- Length proportional to scope (loop var `i` ok, module export değil)

## Örnek
`{"severity":"low","rule":"mixed-language","file":"src/models/Customer.ts","line":8,"why":"Customer model alanları yarı Türkçe yarı İngilizce: musteri_kod + email + olusturma_tarihi","fix":"Tek dil, kod base İngilizce yaygın: customerCode, email, createdAt","evidence":"export interface Customer { musteri_kod: string; email: string; olusturma_tarihi: Date; }"}`
