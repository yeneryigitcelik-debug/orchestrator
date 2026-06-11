# Developer / Internal Tool — Blueprint

> Internal tool / ops dashboard: veri kaynaklarını bağlar, yönetim arayüzü kurar, izler.

## Hedef kullanıcı & değer
Geliştiriciler, ops ekipleri, teknik olmayan operasyon kullanıcıları. Veri tabanı/API
gibi kaynakları bağlar, üzerine yönetim arayüzü (admin panel, dashboard) kurar, izler.
Değer: özel iç araç yazmadan operasyon görünürlüğü + eylem. Abonelik seat-bazlı.

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik, rol (admin/editor/viewer)
- `DataSource` / `Connection` — bağlı kaynak (DB, REST API), kimlik bilgisi
- `Resource` / `Query` — kaynak üzerinde tanımlı sorgu/eylem
- `Dashboard` — widget'lardan oluşan görünüm
- `Widget` — tek görselleştirme (tablo, grafik, metrik, form/eylem)
- `Alert` — bir metrik eşiği aşınca tetiklenen uyarı
- `ActivityLog` — kim hangi eylemi/sorguyu çalıştırdı
- `ApiKey` — programatik erişim

## Ekran haritası
### Web
- `/login`
- `/` — dashboard listesi
- `/dashboard/[id]` — widget grid'i (canlı veri)
- `/dashboard/[id]/edit` — widget ekle/düzenle, düzen
- `/resources` — query/eylem tanımlama (kod editörü)
- `/sources` — veri kaynağı bağlama/yapılandırma
- `/settings` — kullanıcılar, roller, API anahtarı, alert'ler
### Mobil
- Dashboard görüntüleme + alert bildirimi (salt-okuma odaklı).

## Anahtar kullanıcı akışları
1. Bağlama: veri kaynağı ekle → kimlik bilgisi → bağlantı testi
2. Tanımlama: kaynak üstünde query/eylem yaz
3. İnşa: dashboard oluştur → widget ekle → query bağla → düzen
4. İzleme: dashboard canlı veri → alert eşiği → uyarı/bildirim

## Tasarım sistemi notları
- Widget grid: sürükle-bırak düzen; grafik/tablo/metrik/form widget'ları.
- Yoğun teknik UI — Dark Technical preset güçlü aday (monospace aksanı, koyu).
- Kod editörü component'i (query yazımı) — sözdizimi vurgulama.
- Rol bazlı görünüm: viewer eylem yapamaz; admin her şeyi.
- Boş/yükleniyor/hata HER widget için (veri kaynağı düşebilir).

## Önerilen stack
- Web: Next.js (App Router)
- Mobil: cross-platform (Expo) — dashboard görüntüleme
- Backend: Postgres + çeşitli connector'lar (DB/REST)
- Kimlik bilgisi: şifreli saklama, asla client'a sızdırma

## Build order
1. `design` — widget grid, grafik/tablo/metrik widget'ları, kod editörü component'leri
2. `db` — datasource/resource/dashboard/widget şeması, kimlik bilgisi şifreli
3. `backend` — connector katmanı, query çalıştırma, alert, rol kontrolü  ‖ design paralel
4. `frontend` — dashboard builder + widget'lar; `mobile` — görüntüleme (paralel)
5. `qa` — kaynak credential güvenliği, query injection, rol izinleri

## Sık tuzaklar
- Veri kaynağı credential'ı güvensiz saklanmış / client'a sızmış.
- Kullanıcı query'leri injection'a açık — parametreli/sandbox'lı çalıştır.
- Dashboard çok widget'la yavaş — sorgu paralelliği, cache, refresh aralığı.
- Rol/izin sonradan — viewer'ın eylem çalıştırabilmesi kritik açık.
- Veri kaynağı düşünce widget çöküyor — hata durumu her widget'ta.
