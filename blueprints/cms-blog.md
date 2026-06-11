# CMS / Blog — Blueprint

> İçerik yönetim sistemi / blog: yazı üretir, yayınlar, feed ile dağıtır.

## Hedef kullanıcı & değer
Yazarlar, yayıncılar, pazarlama ekipleri. İçerik üretir, düzenler, yayınlar, SEO ve
RSS ile dağıtır. Değer: içerik üretimi + organik erişim. Gelir reklam, abonelik,
veya araç olarak satış.

## Çekirdek varlıklar (veri modeli)
- `User` — yazar/editör, rol
- `Post` / `Article` — içerik: başlık, gövde, durum (draft/scheduled/published), yazar
- `Page` — statik sayfa (hakkında, iletişim)
- `Category` / `Tag` — sınıflandırma
- `Media` — görsel/dosya kütüphanesi
- `Revision` — yazı sürüm geçmişi
- `Comment` — okuyucu yorumu (opsiyonel, moderasyonlu)
- `Subscriber` — e-posta/RSS abonesi
- `SeoMeta` — yazı/sayfa başına başlık, açıklama, OG görseli

## Ekran haritası
### Web — iki yüz
**Public:**
- `/` — ana sayfa (öne çıkanlar, son yazılar)
- `/post/[slug]` — yazı
- `/category/[slug]` — kategori arşivi
- `/feed.xml` — RSS
**Admin:**
- `/admin` — yazı listesi (durum filtresi)
- `/admin/post/[id]` — editör (rich text)
- `/admin/media` — medya kütüphanesi
- `/admin/settings` — site ayarı, SEO, kullanıcılar
### Mobil
- Opsiyonel — okuma; yazma genelde web'de.

## Anahtar kullanıcı akışları
1. Üretim: yazı oluştur (draft) → yaz → SEO/görsel ayarla → yayınla/zamanla
2. Organize: kategori/etiket ata, öne çıkar
3. Yayın: yayınlanan yazı public'te + RSS'e düşer + SEO meta üretilir
4. Okuma: ziyaretçi yazıyı bulur (arama/sosyal), okur, abone olur

## Tasarım sistemi notları
- İki ayrı yüz: public (editorial okuma) + admin (dashboard üretim).
- Public: Editorial preset güçlü aday — tipografi-ağırlıklı, içerik öne çıkar.
- Admin: yazı listesi, editör, medya — dashboard component'leri.
- Editör: rich text/markdown, görsel ekleme, embed, önizleme.
- Public sayfalar SEO-kritik: meta, OG, yapısal veri, hız.

## Önerilen stack
- Web: Next.js (App Router) — public sayfalar server-render/ISR, SEO için şart
- Backend: Postgres
- Medya: object storage + görsel optimizasyon

## Build order
1. `design` — public editorial yüz + admin editör/liste component'leri
2. `db` — post/page/category/media/revision şeması, draft/publish durumu
3. `backend` — post CRUD, yayınlama, RSS üretimi, SEO meta  ‖ design paralel
4. `frontend` — public yüz (SEO-render) + admin paneli
5. `qa` — SEO meta, RSS geçerliliği, draft/publish geçişleri

## Sık tuzaklar
- SEO sonradan — CMS/blog'un özü organik erişim; meta/render baştan kurulmalı.
- Public ve admin yüzü karışmış — net ayrılmalı (render stratejisi farklı).
- RSS/feed unutulmuş — içerik dağıtımının standart kanalı.
- Draft/scheduled/published durumu zayıf — sonlu durum + zamanlama gerekir.
- Editör + medya kütüphanesi hafife alınmış — gerçek iş.
