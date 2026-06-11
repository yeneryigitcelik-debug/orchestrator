# <Arketip Adı> — Blueprint

> Bir cümlelik tanım: bu arketip ne tür bir ürün.

## Hedef kullanıcı & değer
Kim kullanır, hangi işi çözer, neden para öder.

## Çekirdek varlıklar (veri modeli)
Ana entity listesi + ilişkiler. db helper'ın şema iskeleti.
- `User` — ...
- `<Entity>` — ... (alanlar, ilişki)

## Ekran haritası
### Web
- `/` — ...
- `/<rota>` — ...
### Mobil (varsa)
- `<Ekran>` — ...

İşaretle: hangi ekran web-only, hangi mobil-only, hangisi ikisinde.

## Anahtar kullanıcı akışları
1. <Akış adı>: adım → adım → sonuç
2. ...

## Tasarım sistemi notları
design rolüne girdi: bu arketipte hangi token/component kritik, ekran yoğunluğu,
light/dark gereksinimi, öne çıkan etkileşimler.

## Önerilen stack
- Web: ...
- Mobil: ... (cross-platform mı native mi — karar gerekçesi)
- Backend / DB / Auth: ...

## Build order (helper spawn sırası)
1. `design` — tasarım sistemi temeli
2. `db` — şema
3. `backend` — API
4. `frontend` / `mobile` / `ios` / `android` — paralel, tasarım sistemini tüketir
5. `qa` — test

Hangi adımlar paralelleşir, işaretle.

## Sık tuzaklar
- ...
