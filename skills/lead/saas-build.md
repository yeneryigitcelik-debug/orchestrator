# SaaS / Uygulama İnşa Oyun Kitabı

Kullanıcı bir ürün, SaaS, uygulama veya herhangi bir UI'lı şey kurmak istediğinde
izlenecek düzen. Amaç: eksiksiz, tutarlı, çok-platform bir sonuç — her platformun
kendi rengini uydurduğu dağınık bir şey değil.

## 0. Vitrin brief'i geldiyse
Panel'in "Vitrin" sihirbazı kullanılmışsa kullanıcı mesajı `[VİTRİN BRIEF]` ile
başlar. Bu durumda arketip, stil preset'i ve platformlar ZATEN seçilmiştir:
- "Arketip:" satırındaki blueprint'i `Read` et (örn. `blueprints/dashboard-saas.md`).
- "Stil preset:" bloğunu olduğu gibi `design` helper'ının goal'ine taşı — başlangıç
  token seti odur.
- "Platform:" satırı hangi platform helper'larını açacağını söyler.
Brief yoksa (serbest sohbet) aşağıdaki adımları sen yürüt.

## 1. Blueprint seç ve oku
`blueprints/` klasörü (Lead'e `--add-dir` ile açık) 12 SaaS arketipi tutar:
dashboard-saas, developer-tool, ai-saas, marketplace, ecommerce-store,
productivity-tool, knowledge-base, social-app, communication-tool, file-storage,
media-library, cms-blog. Tam liste + seçim rehberi `blueprints/README.md`'de.
- Göreve en yakın arketipi seç, o dosyayı `Read` et.
- `blueprints/catalog.md` — 12 kategorinin standart özellik setini verir; bir SaaS
  spec'lerken "bu tür üründe table-stakes ne" diye buna danış, eksik özellik bırakma.
- Blueprint sana ekran haritası, veri modeli, akışlar, önerilen stack ve build order
  verir — sıfırdan düşünme, iskeleti al.
- İskelettir, reçete değil: kullanıcının "istediği UI" ve özel gereksinimleri ezer.
- Hiçbiri oturmuyorsa en yakınını al, farkı uyarla.

## 2. Tasarım sistemi ÖNCE — `design` helper
İlk spawn edilen helper `design` rolüdür. Ürettiği:
- design token'lar (renk/tipografi/spacing/radius/elevation/motion) — tek kaynak
- çok-platform token haritası (web · iOS · Android)
- foundation component kütüphanesi (Button, Input, Card, Dialog…)
- `DESIGN-SYSTEM.md` — handoff sözleşmesi

Bu adım pazarlık konusu değil. Atlanırsa frontend/mobile/ios/android her biri kendi
rengini, spacing'ini, buton'unu uydurur → tutarsız, "harika" olmayan sonuç.
"İstediğin UI" pratikte bir token preset'idir — design helper'a kullanıcının istediği
görünümü (renk, his, MD3 mi özgün mü) net tarif et.

design için model: standart işte sonnet; tamamen özgün/karmaşık bir tasarım dili
sıfırdan kuruluyorsa opus'a yükseltmeyi düşün — foundation hatası her yere yayılır.

## 3. Veri ve backend
- `db` — blueprint'in veri modelinden şema. design ile PARALEL olabilir.
- `backend` — API, auth, iş mantığı. db çıkınca ya da net contract'la paralel.

## 4. Platform helper'ları — paralel
design'ın `DESIGN-SYSTEM.md`'si hazır olunca platform UI helper'larını aç. Her
birinin goal'inde şu satır olmalı:
> Tasarım sistemi `<yol>/DESIGN-SYSTEM.md`'de. Token + component kütüphanesini TÜKET,
> yeni renk/component icat etme. Eksik varsa [BLOCKED] ile design'a bildir.

Platform seçimi:
- **web** → `frontend` (React/Next)
- **mobil, tek kod tabanı** → `mobile` (React Native + Expo). Varsayılan tercih:
  hızlı, ucuz, Windows'ta build olur, iki platform tek kod.
- **mobil, native** → `ios` (Swift/SwiftUI) + `android` (Kotlin/Compose). Platforma
  özgü kalite/yetenek şart olduğunda. Not: native iOS build macOS/Xcode ister;
  Windows makinedeysen iOS helper kodu yazar ama derleyemez — kullanıcıya söyle.
- Kullanıcı "ikisi de hazır olsun" dediyse: görev başına sen karar ver — basit/hızlı
  ürün `mobile`, native-ağırlıklı ürün `ios` + `android`.

Bağımsız platformlar paralelleşir — frontend, mobile, ios, android ayrı helper'lar,
hepsi aynı anda. Agresif paralelleş.

## 5. Doğrulama
- `qa` — testler; blueprint'in "sık tuzaklar" bölümü kontrol listen.
- İsteğe bağlı: `ui`/`ux` review helper'ları tasarım sistemine uyumu denetler
  (design KURAR, ui DENETLER — ikisi farklı rol).

## Özet sıra
design → (db ‖ backend) → (frontend ‖ mobile ‖ ios ‖ android) → qa

## Sık hata
- design adımını atlayıp doğrudan frontend spawn etmek → tutarsızlık.
- Platform helper'ına DESIGN-SYSTEM.md yolunu vermemek → helper kendi sistemini kurar.
- Blueprint okumadan plan yapmak → eksik ekran, atlanmış akış.
- Her şeyi opus'a vermek → maliyet; çoğu helper sonnet.
- Native iOS'u Windows'ta derlenebilir sanmak.
