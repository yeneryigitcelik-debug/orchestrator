# SaaS Kategori Kataloğu

`awesome-selfhosted` taksonomisinden damıtılmış 12 kategori. Her kategori için:
örnek projeler (referans), kategorinin **standart özellik seti** (kullanıcı bunu
bekler) ve eşleşen blueprint.

## Lead bunu nasıl kullanır
Bir SaaS spec'lerken ilgili kategoriyi bul → "standart özellikler" o üründe
table-stakes olan şeylerdir. Kullanıcı saymasa bile bunları plana kat — bir bookmark
manager'da arama + etiketleme yoksa eksik üründür. Örnek projeler referanstır:
kopyalama, özellik/UX kıyası için bak. Detaylı build iskeleti için kategorinin
blueprint'ini `Read` et.

---

## 1. Productivity — not, bilgi, çalışma alanı
**Örnekler:** Outline, AppFlowy, AFFiNE, Trilium, Joplin, Logseq, Focalboard
**Standart özellikler:** hızlı yakalama, hiyerarşik organize (sayfa/klasör ağacı),
tam-metin arama, rich text / markdown editör, etiket, paylaşım + izin, versiyon
geçmişi, çevrimdışı/senkron, ekip alanı.
**Blueprint:** `productivity-tool.md` (görev odaklı) · `knowledge-base.md` (bilgi odaklı)

## 2. Communication & Email — iletişim, destek, bildirim
**Örnekler:** Chatwoot, Mattermost, Rocket.Chat, Zammad, Listmonk, ntfy
**Standart özellikler:** gerçek-zamanlı mesaj, konuşma/thread, çok-kanal (e-posta/
sohbet/form), atama + ekip, durum (open/pending/closed), hazır yanıt, bildirim,
arama, rapor (yanıt süresi/hacim).
**Blueprint:** `communication-tool.md`

## 3. Storage & File Sharing — depolama, dosya paylaşım
**Örnekler:** Nextcloud, Seafile, Syncthing, File Browser, Pingvin Share
**Standart özellikler:** yükle/indir, klasör hiyerarşisi, önizleme (görsel/pdf/video),
paylaşım linki + izin, sürüm geçmişi, çöp/geri-alma, kota, cihaz senkron, arama.
**Blueprint:** `file-storage.md`

## 4. Media — galeri, medya akış
**Örnekler:** Immich, PhotoPrism, Jellyfin, Navidrome
**Standart özellikler:** yükleme, thumbnail/transcode, galeri grid, viewer/lightbox,
albüm/koleksiyon, metadata (EXIF: tarih/yer), arama/filtre, paylaşım, video/ses oynatma.
**Blueprint:** `media-library.md`

## 5. Documents — belge yönetimi, PDF
**Örnekler:** Paperless-ngx, Stirling-PDF, Docuseal
**Standart özellikler:** belge yükleme + OCR, etiket/kategori, tam-metin arama,
PDF işleme (birleştir/böl/imzala), sürüm, paylaşım, arşivleme.
**Blueprint:** `file-storage.md` / `knowledge-base.md` (özel arketip değil — varyant)

## 6. Analytics — web analitiği, ölçüm
**Örnekler:** Plausible, Umami, Matomo, PostHog
**Standart özellikler:** olay/sayfa görüntüleme toplama, gizlilik-dostu izleme,
dashboard (metrik kartı + grafik), tarih aralığı filtresi, segment, gerçek-zamanlı
görünüm, çoklu site/proje, paylaşılabilir rapor.
**Blueprint:** `dashboard-saas.md`

## 7. Content & Feeds — CMS, blog, RSS
**Örnekler:** Ghost, WordPress, Strapi, FreshRSS, Miniflux
**Standart özellikler:** içerik CRUD + draft/publish, rich editör, medya kütüphanesi,
kategori/etiket, SEO meta, RSS/feed üretimi, public render, abone/newsletter.
**Blueprint:** `cms-blog.md`

## 8. Business & Commerce — e-ticaret, faturalama
**Örnekler:** Medusa, Saleor, Invoice Ninja, Kill Bill
**Standart özellikler:** ürün + varyant + stok, sepet, checkout, ödeme (webhook),
sipariş durum makinesi, indirim/kupon, müşteri hesabı, vergi/kargo, admin paneli.
**Blueprint:** `ecommerce-store.md` (tek satıcı) · `marketplace.md` (iki taraflı)

## 9. Security & Privacy — kimlik, parola
**Örnekler:** Vaultwarden, Authentik, Keycloak, Authelia
**Standart özellikler:** kimlik doğrulama (parola/OAuth/SSO), MFA, oturum/token
yönetimi, RBAC, audit log, parola kasası + paylaşım.
**Not:** Genelde tek başına bir ürün arketipi değil — auth/RBAC her blueprint'in
parçasıdır. Ayrı bir kimlik ürünü gerekirse `developer-tool.md` iskeletine yakın.

## 10. Developer Tools — internal tool, runtime
**Örnekler:** Gitea/Forgejo, Coolify, Appwrite, n8n, Supabase
**Standart özellikler:** veri kaynağı bağlama, query/eylem tanımlama, dashboard +
widget, rol bazlı erişim, API anahtarı, activity log, alert, kod editörü.
**Blueprint:** `developer-tool.md`

## 11. Infrastructure & Dashboards — sunucu, izleme paneli
**Örnekler:** Homepage, Dashy, Uptime Kuma, Portainer
**Standart özellikler:** servis/kaynak listesi, durum izleme, metrik widget'ları,
uptime/healthcheck, alert/bildirim, gerçek-zamanlı refresh, özelleştirilebilir düzen.
**Blueprint:** `developer-tool.md` (araç) · `dashboard-saas.md` (analitik panel)

## 12. Utilities — dönüştürücü, küçük araç
**Örnekler:** ConvertX, IT-Tools
**Standart özellikler:** genelde tek-amaç: girdi al → işle → çıktı ver. Az ekran,
sürtünmesiz akış, geçmiş.
**Blueprint:** Tek-amaçlı; en yakın iskelet `developer-tool.md` veya basit bir
`dashboard-saas.md` varyantı.

---

## Taksonomi dışı modern arketipler
`ai-saas.md` ve `social-app.md` `awesome-selfhosted` kategorilerinde doğrudan
yoktur ama geçerli, sık istenen modern arketiplerdir — onlar için kendi
blueprint'lerine bak.
