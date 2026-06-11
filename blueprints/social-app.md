# Social App — Blueprint

> Akış, profil ve etkileşim merkezli topluluk/sosyal uygulama.

## Hedef kullanıcı & değer
İçerik üreten ve tüketen topluluk. Değer: bağlantı + ilgili içerik + ifade. Gelir
genelde reklam, premium abonelik veya yaratıcı araçları.

## Çekirdek varlıklar (veri modeli)
- `User` — profil: ad, kullanıcı adı, avatar, bio
- `Follow` — User ↔ User (yönlü ilişki)
- `Post` — içerik: metin/medya, yazar, zaman
- `Comment` — Post üzerinde, iç içe olabilir
- `Reaction` / `Like` — User ↔ Post/Comment
- `Notification` — etkileşim bildirimi
- `Conversation` / `DirectMessage` — birebir mesaj (varsa)
- `Report` / `Block` — moderasyon, güvenlik

## Ekran haritası
### Mobil (birincil — sosyal uygulama mobil-öncelikli)
- Akış (takip / keşfet sekmeleri)
- Post detay + yorumlar
- Profil (kendi + başkası)
- Oluştur (post composer — medya)
- Bildirimler
- Arama / keşfet
- DM (varsa)
### Web
- Aynı yüzeyler; genelde daha geniş düzen, "lite" oluşturma. Bazı sosyal ürünler
  web'i salt-okuma/SEO landing tutar.

## Anahtar kullanıcı akışları
1. Onboarding: kayıt → profil kur → ilgi/insan takip et → akış dolu
2. Tüketim: akışı kaydır → beğen/yorum → profile in → takip et
3. Üretim: oluştur → medya ekle → yayınla → etkileşim al
4. Bildirim: etkileşim → bildirim → geri dön (geri kazanım döngüsü)
5. Güvenlik: raporla / engelle / sustur

## Tasarım sistemi notları
- Mobil-öncelikli: dokunma hedefleri, tek-el erişim, alt navigasyon.
- Akış performansı kritik: sanal liste, medya lazy-load, kaydırma jank'siz.
- Post/yorum/profil component'leri çok tekrar eder — kusursuz tutarlı olmalı.
- Optimistic etkileşim (beğeni anında).
- Boş durumlar (akış boş → takip öner), iskelet yükleme.
- Dark mode neredeyse zorunlu (gece kullanımı yoğun).
- Medya: görsel/video, farklı en-boy, erişilebilir alt metin.

## Önerilen stack
- Mobil: cross-platform (Expo) birincil — iki platform tek kod; kitle çok büyürse
  performans için native (`ios` + `android`) düşün
- Web: Next.js — SEO'lu profil/post sayfaları + akış
- Backend: akış üretimi (fan-out) bir ölçek sorusu; DB: Postgres + medya için obje deposu
- Gerçek zamanlı: bildirim/DM için realtime katman

## Build order
1. `design` — post/yorum/profil kartı, akış, composer, alt-nav component'leri
2. `db` — user/follow/post/reaction/notification şeması
3. `backend` — auth, takip grafiği, akış üretimi, etkileşim, bildirim, moderasyon  ‖ design paralel
4. `mobile` — akış/profil/composer (birincil); `frontend` — web yüzeyleri (paralel).
   Native gerekiyorsa `mobile` yerine `ios` + `android`.
5. `qa` — akış performansı, optimistic update, moderasyon/engelleme yolları

## Sık tuzaklar
- Akış üretimini hafife almak — naif sorgu büyüyünce çöker (fan-out stratejisi gerekir).
- Moderasyon/raporlama/engelleme sonraya bırakılmış — güvenlik ve yasal risk.
- Akış listesi sanallaştırılmamış — uzun kaydırmada bellek/jank.
- Medya optimizasyonu yok — ham yükleme, yavaş akış, veri yakar.
- Bildirim döngüsü zayıf — geri kazanım yok, kullanıcı geri gelmiyor.
- Mobil-öncelikli ürünü web-öncelikli kurmak — kitle mobilde.
