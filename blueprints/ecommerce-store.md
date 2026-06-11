# E-commerce Store — Blueprint

> Tek-satıcılı online mağaza: kendi ürününü listeler, satar, sipariş yönetir.

## Hedef kullanıcı & değer
Kendi ürününü satan işletme/birey (marketplace'ten farkı: tek satıcı, çok ürün/müşteri).
Değer: vitrin + sepet + ödeme + sipariş yönetimi. Gelir doğrudan satış.

## Çekirdek varlıklar (veri modeli)
- `User` / `Customer` — alıcı hesabı
- `Product` — ürün: ad, açıklama, medya, fiyat
- `Variant` — ürün varyantı (beden/renk), kendi SKU/fiyat/stok
- `Category` / `Collection` — ürün gruplaması
- `Inventory` — varyant başına stok
- `Cart` / `CartItem` — sepet
- `Order` / `OrderItem` — sipariş, durum (pending→paid→shipped→delivered)
- `Payment` — tahsilat, sağlayıcı referansı
- `Discount` / `Coupon` — indirim
- `Address` — kargo/fatura adresi
- `Review` — ürün değerlendirmesi

## Ekran haritası
### Web
- `/` — vitrin (öne çıkan ürünler, koleksiyon)
- `/products` — ürün liste (filtre, sıralama)
- `/product/[slug]` — ürün detayı (galeri, varyant seçimi, sepete ekle)
- `/cart` — sepet
- `/checkout` — adres + ödeme
- `/order/[id]` — sipariş onayı/takibi
- `/account` — siparişlerim, adresler
- `/admin` — ürün/sipariş/stok yönetimi
### Mobil
- Alışveriş akışı — gezinme, sepet, ödeme.

## Anahtar kullanıcı akışları
1. Alışveriş: gezin → ürün detay → varyant seç → sepete → checkout → ödeme → onay
2. Takip: sipariş durumu, kargo
3. Yönetim (admin): ürün ekle/düzenle, stok güncelle, siparişi işle
4. İndirim: kupon uygula → fiyat güncellenir

## Tasarım sistemi notları
- Ürün kartı + ürün galerisi + varyant seçici en kritik component'ler.
- Sepet/checkout akışı: net adımlar, az sürtünme, güven sinyalleri.
- Fiyat, indirim, stok-durumu gösterimi tutarlı.
- Admin: dashboard component'leri (tablo, form).
- Vitrin SEO-kritik — ürün sayfaları server-render.

## Önerilen stack
- Web: Next.js (App Router) — vitrin/ürün sayfaları server-render (SEO)
- Mobil: cross-platform (Expo) — alışveriş
- Backend: Postgres; ödeme: Stripe (webhook ile sipariş durumu)
- Medya: object storage + görsel optimizasyon

## Build order
1. `design` — ürün kartı/galeri, varyant seçici, sepet/checkout, admin component'leri
2. `db` — product/variant/inventory/cart/order/payment şeması, durum makinesi
3. `backend` — ürün CRUD, sepet, checkout, ödeme webhook, stok  ‖ design paralel
4. `frontend` — vitrin + checkout + admin; `mobile` — alışveriş (paralel)
5. `qa` — checkout akışı, ödeme webhook idempotency, stok yarış durumu

## Sık tuzaklar
- Varyant/inventory modeli zayıf — beden/renk + stok baştan düşünülmeli.
- Ödeme webhook idempotent değil — çift sipariş / kayıp ödeme.
- Stok yarış durumu — aynı son ürün iki kişiye satılır.
- Checkout çok adımlı/sürtünmeli — terk oranını artırır.
- Vergi/kargo hesabı sonradan — fiyatlandırmaya baştan girmeli.
- Vitrin SEO unutulmuş — ürün keşfinin kaynağı.
