# Çok-Platform Token Haritası

Tek token kaynağı → web, iOS ve Android'e map'lenir. Tasarım kararı bir kez verilir,
üç platform aynı dili konuşur. Platform başına elle senkron = kayma.

## Akış

```
tokens.json (tek kaynak)
   │
   ├─► web      → CSS custom properties + Tailwind theme
   ├─► iOS      → Swift (Color/Font extension veya asset catalog)
   └─► Android  → Compose Theme.kt + (gerekirse) res/values XML
```

İdeal: bir build adımı (Style Dictionary veya basit bir script) token'ları üç
çıktıya derler. Küçük projede elle yaz ama TEK kaynaktan — kaynağı `tokens.json` tut.

## Web çıktısı
CSS değişkeni + Tailwind v4 `@theme`:
```css
@theme {
  --color-action-primary: #3b82f6;
  --color-bg-surface: #f8fafc;
  --radius-md: 8px;
  --space-4: 16px;
}
```
UI `bg-action-primary`, `rounded-md`, `p-4` ile tüketir. Dark mode: `:root` / `.dark`
altında semantic değerleri yeniden tanımla, primitive sabit kalır.

## iOS çıktısı
Swift extension'lar — token'lar tip-güvenli:
```swift
extension Color {
  static let actionPrimary = Color(hex: 0x3B82F6)
  static let bgSurface = Color("BgSurface")   // asset catalog → otomatik dark
}
extension CGFloat { static let space4: CGFloat = 16 }
```
Light/dark için asset catalog (Color Set) en temizi — sistem otomatik seçer.
Tipografi: `Font` extension + Dynamic Type ölçeğine saygı.

## Android çıktısı
Compose `Theme.kt` — `ColorScheme` + custom token objesi:
```kotlin
val LightColors = lightColorScheme(
  primary = Color(0xFF3B82F6),
  surface = Color(0xFFF8FAFC),
)
// MaterialTheme dışı token'lar (spacing vb.) için:
data class Spacing(val s4: Dp = 16.dp)
val LocalSpacing = staticCompositionLocalOf { Spacing() }
```
Dark: `darkColorScheme()`. Material You isteniyorsa `dynamicColorScheme` opt-in.

## İsim eşleme tablosu
Aynı token, platform isimlendirmesine uyar — anlam sabit kalır:

| Anlam           | tokens.json     | web (CSS)              | iOS (Swift)         | Android (Kotlin)    |
|-----------------|-----------------|------------------------|---------------------|---------------------|
| birincil eylem  | action.primary  | --color-action-primary | Color.actionPrimary | colorScheme.primary |
| yüzey arkaplanı | bg.surface      | --color-bg-surface     | Color.bgSurface     | colorScheme.surface |
| orta köşe       | radius.md       | --radius-md            | CGFloat.radiusMd    | Shapes.medium       |

## Ne yap
- Kaynak `tokens.json` tek doğruluk noktası; platform dosyaları üretilen çıktı.
- Renkleri platform-nötr sakla (hex / sRGB); platforma map ederken çevir.
- iOS/Android'de platformun NATIVE tema kanalını kullan (asset catalog, ColorScheme)
  — kendi paralel sistemini icat etme.
- Üç platformda da semantic isimler aynı kalsın; sadece sözdizimi değişsin.

## Kırmızı bayraklar
- Aynı hex üç dosyada elle yazılmış → biri güncellenince ikisi kayar.
- Web'de Tailwind, iOS'ta hardcode, Android'de XML — ortak kaynak yok.
- Platforma özel "ekstra" renkler kaynağa geri yazılmamış.
- iOS'ta dark mode asset catalog yerine `if colorScheme == .dark` spaghetti.
