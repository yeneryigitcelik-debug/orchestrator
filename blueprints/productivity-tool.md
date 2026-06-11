# Productivity Tool — Blueprint

> Görev / proje / not yöneten kişisel veya ekip üretkenlik aracı.

## Hedef kullanıcı & değer
Bireyler ve ekipler. İşi organize eder, ilerlemeyi izler. Değer: netlik + yakalama
hızı + (ekipse) işbirliği. Abonelik, genelde seat-bazlı.

## Çekirdek varlıklar (veri modeli)
- `User`
- `Workspace` — kişisel veya ekip alanı
- `Member` — Workspace ↔ User, rol
- `Project` — üst gruplama
- `Item` / `Task` — temel birim: başlık, açıklama, durum, atanan, tarih, öncelik
- `Label` / `Tag` — çapraz sınıflandırma
- `Comment` — item üzerinde tartışma
- `Activity` — değişiklik geçmişi
- `View` — kullanıcının kaydettiği filtre/sıralama/gruplama

İç içe yapı (alt-görev, alt-sayfa) yaygın — `parentId` ile ağaç.

## Ekran haritası
### Web
- `/login` `/signup`
- `/` — bugün / atanmışlar / öne çıkan görünüm
- `/project/[id]` — proje: liste / pano (kanban) / takvim görünümü
- `/item/[id]` — görev detayı (panel veya tam sayfa)
- `/search` — global arama
- `/settings` — profil, workspace, üyeler, fatura
### Mobil
- Hızlı yakalama + bugünkü görevler + bildirim — mobil burada çok değerli.
  Mobil "yakala ve gözden geçir", web "derin organize".

## Anahtar kullanıcı akışları
1. Yakalama: hızlıca görev ekle (her yerden, sürtünmesiz) — sonra detaylandır
2. Organize: görevi projeye/etikete ata, tarih ver, alt-görev kır
3. İlerleme: görünüm değiştir (liste/pano/takvim), filtrele, durumu sürükle
4. İşbirliği (ekip): ata, yorum yap, bildirim, aktivite akışı

## Tasarım sistemi notları
- Hız ve klavye kritik: kısayol, hızlı-ekle, komut paleti.
- Çoklu görünüm aynı veriyi gösterir: liste, pano (sürükle-bırak), takvim.
- Yoğun ama sakin UI — içerik öne çıksın, kromaj geri çekilsin.
- Item component'i her görünümde tutarlı (satır / kart / takvim bloğu).
- İyimser güncelleme (optimistic UI) — etkileşim anında hissedilsin.
- Boş durumlar davetkâr (ilk proje, ilk görev).

## Önerilen stack
- Web: Next.js (App Router); sürükle-bırak + klavye için zengin client etkileşimi
- Mobil: cross-platform (Expo) — yakalama + görüntüleme
- Backend: Postgres; gerçek zamanlı işbirliği gerekiyorsa realtime katman
- Auth: workspace/rol destekli

## Build order
1. `design` — item satırı/kartı, pano, görünüm anahtarı, komut paleti component'leri
2. `db` — workspace/project/item şeması, parentId ağacı, view kayıtları
3. `backend` — auth, workspace/üye, item CRUD, yorum, aktivite  ‖ design paralel
4. `frontend` — çoklu görünüm + sürükle-bırak; `mobile` — yakalama/liste (paralel)
5. `qa` — sürükle-bırak, optimistic update geri alma, izinler

## Sık tuzaklar
- Yakalama yavaş/çok adımlı — aracın can damarı budur, sürtünmesiz olmalı.
- Optimistic update yok — her tıklama ağ beklemesi, araç ağır hissettirir.
- Tek görünüm (sadece liste) — pano/takvim sonradan eklemek veri modelini zorlar.
- İç içe yapı (alt-görev) sonradan — `parentId` baştan düşünülmeli.
- Gerçek zamanlı çakışma (iki kişi aynı item) ele alınmamış.
- Mobil "küçültülmüş web" — mobil yakalamaya, web organize'a odaklanmalı.
