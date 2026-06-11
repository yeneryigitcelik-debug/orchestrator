# SaaS Blueprint Kütüphanesi

Bu klasör, sık görülen SaaS/uygulama **arketiplerinin** yapı taslaklarını tutar.
Her blueprint bir markdown dosyası: ekran haritası, kullanıcı akışları, veri modeli,
tasarım notları, önerilen stack ve **build order** (hangi rol hangi sırada).

## Lead bunu nasıl kullanır
Kullanıcı bir SaaS/uygulama kurmak istediğinde Lead:
1. Göreve en yakın arketipi seçer (aşağıdaki tablo).
2. O blueprint dosyasını `Read` ile okur — bu dosyalar prompt'a önceden YÜKLENMEZ,
   yalnız ihtiyaç anında okunur (Lead'in context'ini şişirmez).
3. Blueprint'i kullanıcının somut isteğine uyarlar — her şeyi birebir almaz, iskelet alır.
4. Blueprint'in "Build order"ını helper spawn planına çevirir.

Blueprint bir reçete değil, bir başlangıç iskeletidir. Kullanıcının "istediği UI" ve
özel gereksinimleri her zaman blueprint'i ezer.

## Arketipler

| Dosya                   | Ne zaman seç |
|-------------------------|--------------|
| `dashboard-saas.md`     | Analitik/yönetim paneli, B2B araç, veri + CRUD ağırlıklı |
| `ai-saas.md`            | LLM/AI sarmalayan ürün — sohbet, üretim, asistan |
| `marketplace.md`        | İki taraflı pazar — alıcı + satıcı, listeleme, işlem |
| `ecommerce-store.md`    | Tek-satıcılı online mağaza — ürün, sepet, sipariş |
| `productivity-tool.md`  | Görev/proje/not — kişisel veya ekip üretkenlik aracı |
| `knowledge-base.md`     | Wiki, dokümantasyon, bilgi tabanı — yapılandırılmış içerik |
| `social-app.md`         | Akış, profil, etkileşim — topluluk/sosyal uygulama |
| `communication-tool.md` | Müşteri iletişim/destek — gelen kutusu, canlı sohbet, helpdesk |
| `file-storage.md`       | Bulut depolama, dosya paylaşım/senkron |
| `media-library.md`      | Foto galeri, medya akış/kütüphane |
| `cms-blog.md`           | CMS/blog — içerik üretimi, yayın, RSS/feed |
| `developer-tool.md`     | Internal tool, ops dashboard, status sayfası |

Bu arketipler `awesome-selfhosted` kategori taksonomisinden damıtıldı. Bir SaaS
spec'lerken `catalog.md` (12 kategori × örnek projeler × standart özellik seti)
özellik araştırması için ek referanstır.

Hiçbiri tam oturmuyorsa: en yakınını al, farkı uyarla. Yeni bir kalıcı arketip
gerekiyorsa `_template.md`'yi kopyalayıp doldur.

## Yeni blueprint ekleme
`_template.md`'yi kopyala, bölümleri doldur, bu README'deki tabloya bir satır ekle.
Tek dosya = tek arketip, gezilebilir uzunlukta tut.
