# iOS Tasarım Sistemi — token tüketimi

design rolünün tasarım sistemi çıktısını SwiftUI'da tüket. Renk/font/spacing'i
hardcode etme. iOS'ta ek bir kural var: ortak token'ları paylaş ama component
dilini Apple HIG'e uydur.

## Token'ları tüketme
design rolünün ürettiği Swift çıktısını kullan:
```swift
// DesignTokens.swift — design rolünün tokens.json'undan üretildi
extension Color {
  static let bgSurface     = Color("BgSurface")      // asset catalog → otomatik dark
  static let textPrimary   = Color("TextPrimary")
  static let actionPrimary = Color("ActionPrimary")
}
extension CGFloat {
  static let space2: CGFloat = 8
  static let space4: CGFloat = 16
}
```
- Renkleri **asset catalog Color Set** olarak tut — light/dark sistemce otomatik seçilir.
- View'da `Color.actionPrimary`, `.padding(.space4)` — çıplak hex/sayı yok.

## Tipografi & Dynamic Type
- Type scale token'larını `Font` extension'a map'le ama Dynamic Type ölçeğine SAYGI:
  `.font(.system(.body))` veya `Font.custom(..., relativeTo: .body)`.
- Sabit punto (`Font.system(size: 14)`) kullanıcının metin boyutu tercihini ezer — kaçın.

## Apple HIG hizası
Ortak token (renk, spacing, marka) paylaşılır; component dili iOS'a uyar:
- Native kontrolleri tercih et: `NavigationStack`, `TabView`, `.sheet`, `List`,
  `Form`, `Menu` — Android Material kalıbını iOS'a dayatma.
- SF Symbols ikon sistemi temel; özel ikon setini gerektiğinde ekle.
- Native jest ve geçişlere saygı (geri kaydırma, sheet sürükleme).
- design rolünün component paritesini koru: `PrimaryButton`, `AppCard` — aynı
  varyantlar, iOS-doğru görünüm.

## Tema
- Light/dark = asset catalog otomatik; `@Environment(\.colorScheme)` yalnız gerektiğinde.
- Marka teması/preset gerekiyorsa token değerlerini bir `Theme` ortam değeriyle dağıt.

## Ne yap
- Renkleri asset catalog Color Set yap; token'ları `Color`/`CGFloat`/`Font` extension'dan oku.
- Dynamic Type ölçeğini koru — göreli font kullan.
- Native iOS component diliyle kur; ortak token'ı paylaş.
- SF Symbols + design rolünün component paritesi.

## Kırmızı bayraklar
- View'da hardcode `Color(hex:)` / sabit punto / magic spacing.
- Dark mode `if colorScheme == .dark` ile elle — asset catalog varken.
- Android Material component'lerini iOS'a birebir taşımak.
- Sabit `Font.system(size:)` — Dynamic Type'ı eziyor.
- design rolünün DESIGN-SYSTEM.md'si okunmadan kendi token'ını icat etmek.
