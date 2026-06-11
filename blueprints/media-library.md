# Media Library — Blueprint

> Foto galeri / medya akış / medya kütüphanesi: görsel ve videoyu toplar, gösterir.

## Hedef kullanıcı & değer
Bireyler, aileler, içerik koleksiyoncuları. Foto/videoyu yükler, otomatik organize
eder, görüntüler, paylaşır. Değer: anılar/medya güvenli, düzenli, hızlı erişilir.
Abonelik depolama bazlı veya açık/self-host.

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik
- `MediaItem` — görsel/video/ses: depolama anahtarı, tip, çekim tarihi, sahip
- `Metadata` — EXIF (tarih, konum, kamera), süre, çözünürlük
- `Thumbnail` / `Variant` — farklı boyut türevleri (grid, önizleme)
- `Album` / `Collection` — kullanıcı gruplaması
- `Tag` / `Face` / `Place` — otomatik veya elle sınıflandırma
- `Favorite` — işaretleme
- `ShareLink` — albüm/öğe paylaşımı

## Ekran haritası
### Web
- `/login` `/signup`
- `/` — galeri (tarih-gruplu grid, sonsuz kaydırma)
- `/photo/[id]` — medya görüntüleyici (lightbox, video player)
- `/albums` — albümler; `/album/[id]` — albüm içeriği
- `/search` — filtre: tarih, etiket, yer
- `/settings` — profil, depolama
### Mobil
- Galeri + görüntüleyici + yükleme — birincil yüzey.

## Anahtar kullanıcı akışları
1. Yükleme: medya seç → upload → thumbnail/metadata işlenir → galeriye düşer
2. Otomatik organize: tarih/yer'e göre gruplanır
3. Görüntüleme: galeri kaydır → lightbox/viewer → kaydır/zoom
4. Düzenleme: albüm oluştur, etiketle, favori, paylaş

## Tasarım sistemi notları
- Galeri grid: SANAL liste + lazy görsel — binlerce öğe jank'siz olmalı.
- Lightbox/viewer: tam ekran, kaydırma, zoom, video oynatma.
- Masonry veya tarih-gruplu grid; thumbnail'lar tutarlı.
- Medya yoğun UI — kromaj minimal, görsel öne çıkar (koyu arkaplan iyi).
- Boş durumlar, iskelet (thumbnail placeholder), yükleme ilerlemesi.

## Önerilen stack
- Web: Next.js (App Router)
- Mobil: cross-platform (Expo) birincil
- Backend: Postgres (metadata) + object storage; thumbnail/transcode pipeline
- Görsel servis: boyuta göre türev, CDN

## Build order
1. `design` — galeri grid, lightbox/viewer, albüm, upload component'leri
2. `db` — media/metadata/album/thumbnail şeması
3. `backend` — upload, EXIF çıkarımı, thumbnail/transcode, paylaşım  ‖ design paralel
4. `mobile` — galeri/viewer/upload (birincil); `frontend` — web galeri (paralel)
5. `qa` — büyük galeri performansı, yükleme, video oynatma

## Sık tuzaklar
- Thumbnail/transcode pipeline'ı sonraya bırakmak — ham medya servisi yavaş/pahalı.
- Galeri sanallaştırılmamış — binlerce foto'da bellek/jank.
- EXIF/metadata çıkarımı yok — otomatik organize (tarih/yer) çalışmaz.
- Ham, tam boyutlu görsel grid'de servis edilmiş.
- Video için ayrı player/transcode düşünülmemiş.
