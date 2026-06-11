# Tasarım Sistemi Handoff

design rolünün son işi: çıktıyı, üstüne inşa edecek platform helper'larının
(frontend/mobile/ios/android) sıfır sürtünmeyle tüketebileceği biçimde teslim etmek.
Handoff zayıfsa her helper kendi yorumunu yapar — tutarlılık ölür.

## design'ın teslim ettiği şey
1. **Token kaynağı** — `tokens.json` (veya `tokens.ts`), tek doğruluk noktası.
2. **Platform çıktıları** — projedeki her platform için üretilmiş:
   - web: Tailwind theme / CSS değişkenleri
   - iOS: Swift Color/Font extension veya asset catalog
   - Android: Compose `Theme.kt`
3. **Component kütüphanesi** — foundation set, varyant API'li, token-bağlı, a11y'li.
4. **`DESIGN-SYSTEM.md`** — tek sayfalık sözleşme (aşağıdaki şablon).

## DESIGN-SYSTEM.md şablonu
```
# <Ürün> Tasarım Sistemi
## Token'lar      → kaynak dosya yolu, kategoriler, platform başına nasıl tüketilir
## Tema           → light/dark, preset'ler, tema değiştirme
## Component'ler  → liste + prop API + ne zaman hangisi + örnek kullanım
## Foundation     → grid/breakpoint, spacing ölçeği, type scale
## Yapma          → primitive token doğrudan kullanma, hardcode renk/px, vb.
## Platform notu  → web/iOS/Android farkları, hangi component nerede karşılığı
```

## Helper'lara kontrat
Platform helper'ının goal'inde şu satır olmalı (Lead ekler):
> Tasarım sistemi `<yol>/DESIGN-SYSTEM.md`'de. Token + component kütüphanesini TÜKET —
> yeni renk/spacing/component icat etme. Eksik bir şey varsa `[BLOCKED]` yazıp design
> helper'a bildir.

## Çok-platform tutarlılık
- Aynı semantic isimler üç platformda da geçerli — helper biri öğrenince hepsini bilir.
- Component PARİTESİ: web `<Button variant="primary">` ↔ iOS `PrimaryButton()` ↔
  Android `PrimaryButton()` — aynı varyantlar, platform-doğru implementasyon.
- Platform farkı normaldir (iOS HIG, Android Material) — token paylaşılır, component
  dili platforma uyar. Bunu DESIGN-SYSTEM.md "Platform notu"nda açıkça yaz.

## Ne yap
- DESIGN-SYSTEM.md'yi proje köküne yaz; kısa, gezilebilir, örnekli olsun.
- Token kaynağını + üretilen platform dosyalarını birlikte teslim et.
- "Yapma" listesini açıkça yaz — helper'lar en çok burada kayar.
- Eksik component'i sessiz bırakma; DESIGN-SYSTEM.md'de "henüz yok" diye işaretle.
- İş bitince Lead'e raporla: ne üretildi, hangi platformlar hazır, helper'lar ne okumalı.

## Kırmızı bayraklar
- Token var, DESIGN-SYSTEM.md yok → helper'lar nasıl tüketeceğini bilmiyor.
- Component kütüphanesi var ama prop API'leri belgesiz.
- "Yapma" kuralları yok → helper primitive/hardcode'a kayıyor.
- Platform çıktısı eksik (web hazır, Android elle senkron bekleniyor).
- Handoff dokümanı destan uzunluğunda — kimse okumaz; tek sayfa tut.
