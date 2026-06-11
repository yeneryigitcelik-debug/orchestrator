# File Storage — Blueprint

> Bulut depolama / dosya paylaşım / senkronizasyon aracı.

## Hedef kullanıcı & değer
Bireyler ve ekipler. Dosyalarını yükler, organize eder, paylaşır, cihazlar arası
erişir. Değer: dosyalara her yerden güvenli erişim + paylaşım. Abonelik genelde
depolama kotası bazlı.

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik, depolama kotası
- `Folder` — hiyerarşik (`parentId` ağaç)
- `File` — metadata: ad, boyut, tip, depolama anahtarı, sahip
- `Version` — dosya sürüm geçmişi
- `Share` / `ShareLink` — kullanıcıya veya public link ile paylaşım, izin (görüntüle/düzenle)
- `Permission` — klasör/dosya erişim kuralı
- `ActivityLog` — kim ne zaman ne yaptı
- `Trash` — silinen öğeler (geri alma)

## Ekran haritası
### Web
- `/login` `/signup`
- `/files` — dosya gezgini (grid/list, klasör navigasyonu)
- `/files/[id]` — dosya önizleme (görsel/pdf/video)
- `/shared` — benimle paylaşılanlar
- `/trash` — çöp kutusu
- `/settings` — profil, kota, depolama
### Mobil
- Gezinme + yükleme + kamera/galeri yükleme — mobil çok değerli.

## Anahtar kullanıcı akışları
1. Yükleme: dosya seç/sürükle → upload (ilerleme) → klasöre düşer
2. Organize: klasör oluştur, taşı, yeniden adlandır
3. Paylaşma: dosya/klasör → link veya kullanıcı ile paylaş, izin ver
4. Erişim: önizle, indir, sürüm geri al, sil → çöp → geri al

## Tasarım sistemi notları
- Dosya gezgini ana component: grid/list toggle, klasör ağacı, breadcrumb.
- Önizleme: görsel, PDF, video — tip'e göre viewer.
- Upload: sürükle-bırak, çoklu, ilerleme çubuğu, iptal.
- Dosya tipi ikonları, boyut/tarih meta gösterimi.
- Boş durumlar (boş klasör, paylaşılan yok, çöp boş).

## Önerilen stack
- Web: Next.js (App Router)
- Mobil: cross-platform (Expo) — gezinme/yükleme
- Backend: Postgres (yalnız metadata) + object storage (S3-uyumlu / Vercel Blob)
  — dosya içeriği DB'ye DEĞİL, obje deposuna.
- Büyük dosya: chunked / resumable upload

## Build order
1. `design` — dosya gezgini, önizleme, upload component'leri
2. `db` — folder/file/version/share şeması, parentId ağacı
3. `backend` — upload (chunked), object storage, paylaşım/izin, kota  ‖ design paralel
4. `frontend` — gezgin + önizleme + upload; `mobile` — gezinme/yükleme (paralel)
5. `qa` — büyük dosya upload, paylaşım izinleri, kota sınırı

## Sık tuzaklar
- Dosya içeriğini DB'ye blob olarak yazmak — object storage kullan.
- Büyük dosya upload tek istekte — chunked/resumable gerekir.
- Paylaşım izin modeli zayıf — link/kullanıcı/klasör-devralma baştan düşünülmeli.
- Kota takibi sonradan — yükleme yolunda baştan say.
- Hiyerarşi (parentId) ve çöp/geri-alma sonradan — veri modelinde baştan olmalı.
