# Knowledge Base — Blueprint

> Wiki / dokümantasyon / bilgi tabanı: bilgiyi yapılandıran, aranabilir kılan araç.

## Hedef kullanıcı & değer
Ekipler, topluluklar, dokümantasyon yazarları. Dağınık bilgiyi tek yerde toplar,
yapılandırır, bulunabilir kılar. Değer: bilgi kaybolmaz, aranır, paylaşılır. Abonelik
genelde seat-bazlı (ekip) veya açık/topluluk.

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik, rol
- `Workspace` — kişisel veya ekip alanı (multi-tenant)
- `Space` / `Collection` — üst gruplama (proje, ekip, konu)
- `Page` — temel birim: başlık, içerik, `parentId` (iç içe hiyerarşi/ağaç)
- `Revision` — sayfanın versiyon geçmişi
- `Comment` — sayfa veya satır üstünde tartışma
- `Attachment` — gömülü dosya/görsel
- `Tag` — çapraz sınıflandırma
- `ShareLink` / `Permission` — okuma/yazma erişimi, public link

## Ekran haritası
### Web
- `/login` `/signup`
- `/` — son sayfalar, favoriler, hızlı arama
- `/space/[id]` — space içeriği + sayfa ağacı sidebar'ı
- `/page/[id]` — sayfa görünümü (okuma)
- `/page/[id]/edit` — editör (rich text / markdown)
- `/search` — global tam-metin arama
- `/settings` — profil, workspace, üyeler, erişim
### Mobil
- Okuma + arama odaklı; hızlı not. Derin düzenleme web'de.

## Anahtar kullanıcı akışları
1. Yakalama: sayfa oluştur → yaz → kaydet (taslak/yayın)
2. Organize: sayfayı space'e/parent'a taşı, etiketle, ağacı kur
3. Bulma: ara → sonuç → sayfaya git (arama bu ürünün canı)
4. İşbirliği: yorum, versiyon karşılaştır, paylaş

## Tasarım sistemi notları
- Okuma tipografisi kritik — uzun metin, başlık hiyerarşisi, rahat satır uzunluğu.
- İçerik öne çıkar; kromaj geri çekilir (Editorial preset iyi oturur).
- Sidebar navigasyon ağacı, breadcrumb.
- Editör component'i ağır: rich text/markdown, kod bloğu, tablo, embed, görsel.
- Boş durumlar (ilk space, ilk sayfa), iskelet yükleme.
- Light + dark (uzun okuma).

## Önerilen stack
- Web: Next.js (App Router) — public sayfalar SEO için server-render
- Mobil: cross-platform (Expo) — okuma/arama
- Backend: Postgres + tam-metin arama (büyürse gerçek arama altyapısı)
- Auth: workspace/rol destekli

## Build order
1. `design` — okuma tipografisi, editör, sayfa ağacı, arama component'leri
2. `db` — workspace/space/page şeması, parentId ağacı, revision
3. `backend` — auth, page CRUD, arama, versiyon, yorum  ‖ design ile paralel
4. `frontend` — editör + okuma + ağaç; `mobile` — okuma/arama (paralel)
5. `qa` — arama doğruluğu, versiyon geri alma, izinler

## Sık tuzaklar
- Arama zayıf — knowledge base'in özü budur, `LIKE` ile başlama.
- Versiyonlama sonradan eklenmiş — revision baştan veri modelinde olmalı.
- Hiyerarşi (parentId ağacı) sonradan — sayfa modeli baştan ağaç olmalı.
- Editör karmaşıklığını hafife almak — rich text + embed + kod bloğu büyük iş.
- İzin modeli (sayfa/space bazlı) sonradan — multi-tenant izolasyonla birlikte kur.
