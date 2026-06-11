# Communication Tool — Blueprint

> Müşteri iletişim / destek aracı: paylaşılan gelen kutusu, canlı sohbet, helpdesk.

## Hedef kullanıcı & değer
Destek ekipleri, küçük işletmeler. Müşteri mesajlarını (e-posta, sohbet, form) tek
gelen kutusunda toplar, ekibe dağıtır, yanıtlar. Değer: hiçbir mesaj kaçmaz, ekip
koordine. Abonelik genelde agent (seat) bazlı.

## Çekirdek varlıklar (veri modeli)
- `User` / `Agent` — destek ekibi üyesi, rol
- `Team` — agent grubu, atama hedefi
- `Customer` / `Contact` — mesajı gönderen son kullanıcı
- `Conversation` — bir müşteriyle bir konu; durum (open/pending/closed)
- `Message` — konuşmadaki tek mesaj; yön (gelen/giden), kanal
- `Channel` — kaynak (e-posta, canlı sohbet widget'ı, form)
- `Assignment` — konuşma ↔ agent/team
- `CannedResponse` — hazır yanıt şablonu
- `Tag` — konuşma sınıflandırma; `Note` — iç (müşteriye görünmez) not

## Ekran haritası
### Web
- `/login`
- `/inbox` — konuşma listesi + thread görünümü (iki/üç panel)
- `/inbox/[id]` — konuşma detayı: thread, müşteri bilgisi, atama
- `/widget` — sitelere gömülen canlı sohbet bileşeni (ayrı, hafif)
- `/reports` — yanıt süresi, hacim, agent performansı
- `/settings` — kanallar, ekip, hazır yanıtlar, otomasyon
### Mobil
- Agent gelen kutusu — bildirim + hızlı yanıt.

## Anahtar kullanıcı akışları
1. Gelen: müşteri mesaj atar → konuşma oluşur → agent'a/team'e atanır
2. Yanıt: agent thread'i açar → yanıtlar (hazır yanıt opsiyonu) → durum günceller
3. Çözüm: konuşma `closed` → müşteriye bildirim → (opsiyonel) memnuniyet anketi
4. Yönetim: rapor incele, otomasyon kuralı kur (otomatik atama, etiket)

## Tasarım sistemi notları
- Gelen kutusu çok-panelli düzen: liste + thread + bağlam paneli.
- Durum rozetleri (open/pending/closed), atama avatarları, kanal ikonları.
- Gerçek zamanlı: yeni mesaj anında düşmeli, "yazıyor" göstergesi.
- Canlı sohbet widget'ı ayrı, çok hafif, gömülebilir, tema-uyumlu.
- Boş/yükleniyor durumları her panel için.

## Önerilen stack
- Web: Next.js (App Router)
- Mobil: cross-platform (Expo) — agent inbox
- Backend: Postgres + realtime katman (websocket) — anlık mesaj zorunlu
- Kanal entegrasyonu: e-posta alımı/gönderimi, webhook

## Build order
1. `design` — inbox düzeni, thread, durum rozeti, sohbet widget'ı component'leri
2. `db` — conversation/message/channel/assignment şeması, durum makinesi
3. `backend` — kanal alımı, realtime, atama, hazır yanıt, otomasyon  ‖ design paralel
4. `frontend` — inbox + widget; `mobile` — agent inbox (paralel)
5. `qa` — realtime kesinti, atama kuralları, çok-kanal birleştirme

## Sık tuzaklar
- Realtime sonradan eklenmiş — mimari baştan anlık mesaja göre kurulmalı.
- Çok-kanal birleştirme zayıf — e-posta + sohbet aynı konuşmaya düşmeli.
- Konuşma durumu serbest metin — sonlu durum makinesi olmalı.
- Atama/SLA mantığı dağınık — kurallar tek yerde, izlenebilir.
- Sohbet widget'ı ağır — gömülen taraf hızlı yüklenmeli, izole olmalı.
