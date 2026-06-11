# Dashboard SaaS — Blueprint

> Veri görselleştiren, kayıt yöneten bir B2B web aracı; analitik + CRUD ağırlıklı.

## Hedef kullanıcı & değer
İşletme kullanıcısı / ekip. Dağınık veriyi tek panelde toplar, ölçer, üzerinde işlem
yapar. Değer: görünürlük + hız. Genelde abonelik (seat veya kullanım bazlı).

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik, e-posta, rol
- `Organization` / `Workspace` — kiracı sınırı (multi-tenant)
- `Membership` — User ↔ Organization, rol (owner/admin/member)
- `<DomainEntity>` — ürünün asıl kaydı (örn. Project, Customer, Invoice)
- `ApiKey` / `Integration` — dış veri kaynağı bağlama
- `AuditLog` — kim ne yaptı
- `Subscription` / `Plan` — faturalama durumu

İlk karar: tek-kiracı mı çok-kiracı mı. Çoğu dashboard SaaS multi-tenant —
`organizationId` her sorguda zorunlu filtre (satır izolasyonu).

## Ekran haritası
### Web
- `/login` `/signup` — auth
- `/onboarding` — org kur, ilk veri/entegrasyon
- `/dashboard` — özet: metrik kartları, grafik, son aktivite
- `/<entity>` — liste: tablo, filtre, arama, sayfalama, toplu işlem
- `/<entity>/[id]` — detay + düzenleme
- `/settings` — profil, organizasyon, fatura, API anahtarı
- `/settings/members` — davet, rol yönetimi

### Mobil (opsiyonel — genelde görüntüleme odaklı)
- Dashboard özeti, bildirim, hızlı eylem. Tam CRUD genelde web'de kalır.

## Anahtar kullanıcı akışları
1. Onboarding: kayıt → org oluştur → veri kaynağı bağla → ilk dashboard dolu
2. Günlük: giriş → dashboard tara → bir entity'ye in → işlem yap
3. Ekip: üye davet et → rol ata → izin sınırı uygulanır
4. Faturalama: plan seç → ödeme → kota/özellik kapısı

## Tasarım sistemi notları
- Yoğun veri UI'ı: tablo, grafik, metrik kartı, filtre çubuğu — foundation'da olmalı.
- Net bilgi hiyerarşisi; sakin renk paleti, vurguyu veriye bırak.
- Light + dark ikisi de (uzun oturum, göz yorgunluğu).
- Boş durum, yükleniyor (skeleton), hata durumu HER liste/grafik için.
- Yoğun klavye kullanıcısı: kısayol, erişilebilir tablo.

## Önerilen stack
- Web: Next.js (App Router) + tasarım sistemi component kütüphanesi
- Mobil: gerekiyorsa cross-platform (Expo) — salt görüntüleme, native şart değil
- Backend: Next API veya ayrı servis; DB: Postgres (ilişkisel, multi-tenant)
- Auth: org/rol destekli sağlayıcı; faturalama: Stripe

## Build order
1. `design` — tasarım sistemi (tablo/grafik/kart/filtre dahil) → DESIGN-SYSTEM.md
2. `db` — multi-tenant şema, organizationId izolasyonu
3. `backend` — auth, org/üye, entity CRUD, faturalama webhook'ları  ‖ design ile paralel
4. `frontend` — ekranlar, tasarım sistemini tüketir  (mobil gerekiyorsa `mobile` paralel)
5. `qa` — izolasyon testleri (kiracı sızıntısı!), rol/izin testleri

## Sık tuzaklar
- Kiracı izolasyonu eksik — bir org diğerinin verisini görür (kritik güvenlik).
- Liste ekranı sayfalama/filtre olmadan — 10k satırda çöker.
- Boş/yükleniyor/hata durumları atlanmış — yeni hesap boş dashboard görür.
- Rol/izin sonradan eklenmiş — her endpoint'e geri dönüp eklemek pahalı.
- Grafik kütüphanesi tasarım sistemini ezmiş — token dışı renkler.
