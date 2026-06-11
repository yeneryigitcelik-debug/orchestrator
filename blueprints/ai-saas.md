# AI SaaS — Blueprint

> LLM/AI yeteneğini sarmalayan ürün: sohbet, içerik üretimi veya asistan.

## Hedef kullanıcı & değer
Bir işi AI ile hızlandırmak isteyen kullanıcı. Değer: model + iyi UX + alan-özel
bağlam. Faturalama genelde kullanım (token/kredi) veya abonelik.

## Çekirdek varlıklar (veri modeli)
- `User` — kimlik
- `Conversation` / `Thread` — oturum
- `Message` — rol (user/assistant), içerik, token sayısı, maliyet
- `Document` / `Source` — RAG/bağlam kaynağı (yüklenen dosya, bağlanan veri)
- `Generation` — üretim çıktısı (görsel/metin), durum, parametre
- `UsageRecord` — token/kredi tüketimi (faturalama + kota)
- `Subscription` / `CreditBalance` — plan, kalan kredi

## Ekran haritası
### Web
- `/login` `/signup`
- `/` veya `/chat` — ana sohbet/üretim arayüzü (streaming çıktı)
- `/chat/[id]` — geçmiş konuşma
- `/library` — geçmiş üretimler / dökümanlar
- `/sources` — bağlam yükleme/yönetme (RAG varsa)
- `/settings` — profil, kullanım/kota, fatura, API anahtarı
### Mobil
- Sohbet/üretim mobilde çok değerli — cross-platform iyi aday.

## Anahtar kullanıcı akışları
1. İlk değer: giriş → prompt → streaming cevap → "vay" anı (hızlı olmalı)
2. Bağlam: döküman yükle → işlenir → cevaplar o bağlamı kullanır
3. Üretim: parametre seç → üret → bekle (durum) → kaydet/yinele/dışa aktar
4. Kota: kredi azaldı → uyarı → yükselt/satın al

## Tasarım sistemi notları
- Streaming metin: token token akış, imleç, "duraklat/durdur".
- Mesaj component'leri: user/assistant baloncuğu, kod bloğu, markdown, kaynak alıntısı.
- Bekleme durumları kritik: düşünüyor, üretiliyor, kuyrukta — boş spinner yetmez.
- Prompt girişi: çok satırlı, ekli dosya, gönder kısayolu.
- Hata/red durumu nazik (model reddi, kota bitti, zaman aşımı).
- Light + dark; uzun okuma için tipografi.

## Önerilen stack
- Web: Next.js (App Router), streaming için SSE / stream response
- Mobil: cross-platform (Expo) — sohbet UX taşınır
- AI: sağlayıcı-bağımsız bir ağ geçidi üstünden model çağrısı (fallback + maliyet izleme)
- Backend: streaming destekli; DB: Postgres + (RAG varsa) vektör deposu
- Faturalama: kullanım-bazlı (Stripe metered) veya kredi sistemi

## Build order
1. `design` — sohbet/mesaj/streaming component'leri dahil tasarım sistemi
2. `db` — conversation/message/usage şeması
3. `backend` — model çağrısı, streaming, RAG pipeline, kullanım sayacı  ‖ design ile paralel
4. `frontend` + `mobile` — sohbet arayüzü, streaming tüketimi (paralel)
5. `qa` — streaming kesintisi, kota sınırı, hata yolları

## Sık tuzaklar
- Streaming'i sonradan eklemek — mimariyi baştan stream'e göre kur.
- Token/maliyet izlenmiyor — fatura sürprizi, kota uygulanamıyor.
- Tek model sağlayıcıya kilitlenmek — fallback yok, sağlayıcı düşünce ürün düşer.
- API anahtarı client'a sızmış — çağrılar backend'den geçmeli.
- Bekleme/hata durumları zayıf — AI yavaş/hatalı olabilir, UX bunu taşımalı.
- Prompt injection / kötüye kullanım — girdi sınırı ve denetim yok.
