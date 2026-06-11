# Marketplace — Blueprint

> İki taraflı pazar: satıcılar listeler, alıcılar bulur ve işlem yapar.

## Hedef kullanıcı & değer
İki ayrı kullanıcı: **satıcı** (arz) ve **alıcı** (talep). Değer: eşleştirme + güven
+ ödeme. Gelir genelde işlem komisyonu veya listeleme ücreti.

## Çekirdek varlıklar (veri modeli)
- `User` — ortak hesap; `role` veya ayrı profil (alıcı/satıcı/ikisi)
- `SellerProfile` — mağaza, doğrulama durumu, ödeme alma bilgisi
- `Listing` / `Product` — listelenen şey: başlık, fiyat, medya, durum, stok
- `Category` — sınıflandırma, arama/filtre
- `Order` — alıcı + listing + miktar + durum (pending→paid→fulfilled)
- `Payment` / `Payout` — alıcı tahsilatı + satıcıya ödeme
- `Review` / `Rating` — güven sinyali
- `Message` — alıcı↔satıcı iletişim
- `Dispute` — anlaşmazlık çözümü

## Ekran haritası
### Web
- `/` — keşif: öne çıkanlar, kategori, arama
- `/search` — sonuç: filtre (fiyat, kategori, konum), sıralama
- `/listing/[id]` — ürün detayı, satıcı bilgisi, "satın al"
- `/seller/[id]` — satıcı mağaza profili
- `/sell/new` — listeleme oluştur/düzenle (satıcı)
- `/dashboard/seller` — satıcı paneli: listelerim, siparişler, ödemeler
- `/orders` — alıcı sipariş geçmişi + durum
- `/checkout` — ödeme akışı
- `/settings`
### Mobil
- Keşif + satın alma + bildirim mobilde güçlü. Listeleme genelde web'de daha kolay.

## Anahtar kullanıcı akışları
1. Alıcı: ara → filtrele → listing incele → satın al → ödeme → takip
2. Satıcı onboarding: kayıt → satıcı doğrula → ödeme hesabı bağla → ilk listeleme
3. İşlem: sipariş → satıcıya bildir → karşıla → para serbest → değerlendirme
4. Güven: değerlendirme bırak, anlaşmazlık aç

## Tasarım sistemi notları
- İki farklı kullanıcı arayüzü: alıcı keşif-odaklı, satıcı yönetim-odaklı (dashboard gibi).
- Listing kartı en önemli component: medya, fiyat, değerlendirme, rozet — tutarlı.
- Güven görselleri: doğrulanmış rozeti, yıldız, satıcı puanı.
- Arama/filtre UI'ı yoğun — net, hızlı.
- Boş durumlar: sonuç yok, listing yok, sipariş yok.

## Önerilen stack
- Web: Next.js (App Router) — keşif sayfaları SEO için server-render
- Mobil: cross-platform (Expo) — keşif + satın alma
- Backend: Postgres; ödeme: emanet/payout destekli sağlayıcı (Stripe Connect tipi)
- Arama: büyürse gerçek arama altyapısı — `LIKE` ile başlama

## Build order
1. `design` — listing kartı, arama/filtre, satıcı dashboard component'leri
2. `db` — kullanıcı/listing/order/payment şeması, durum makineleri
3. `backend` — auth + iki rol, listing CRUD, sipariş/ödeme akışı, payout  ‖ design paralel
4. `frontend` — alıcı keşif + satıcı dashboard; `mobile` — keşif/satın alma (paralel)
5. `qa` — ödeme akışı, sipariş durum geçişleri, rol izinleri

## Sık tuzaklar
- Ödeme/payout akışını hafife almak — emanet, iade, anlaşmazlık baştan düşünülmeli.
- Sipariş durumu serbest metin — sonlu durum makinesi olmalı.
- Arama `LIKE %...%` ile — ölçeklenmez, alakasız sonuç.
- Tek kullanıcı tipi varsayıp satıcı/alıcı ayrımını sonraya bırakmak.
- Güven sinyalleri (değerlendirme, doğrulama) sonradan — pazarın çekirdeği bu.
- SEO unutulmuş — keşif sayfaları organik trafiğin kaynağı.
