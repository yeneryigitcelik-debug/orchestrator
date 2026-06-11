# Material 3 — Compose'da

Material 3 (`androidx.compose.material3`), Android'in tasarım dili implementasyonu.
Compose ile native, doğru görünen Android UI'ın hızlı yolu.

## MaterialTheme
Üç eksen: renk şeması, tipografi, şekil.
```kotlin
MaterialTheme(
  colorScheme = if (dark) darkColorScheme() else lightColorScheme(),
  typography = AppTypography,
  shapes = AppShapes,
) { /* uygulama */ }
```
- `MaterialTheme.colorScheme.primary`, `.surface`, `.onSurface` — token'lara erişim.
- UI'da hardcode `Color(0xFF...)` kullanma — şemadan oku (bkz. theming).

## Renk rolleri
M3 renk rolleri: `primary`, `onPrimary`, `primaryContainer`, `secondary`, `tertiary`,
`surface`, `surfaceVariant`, `surfaceContainer` (low→highest), `onSurface`, `outline`,
`error`. `on*` her zaman üstündeki içeriğin rengidir → kontrast garanti.

## Component'ler
- Buton: `Button` (filled), `FilledTonalButton`, `OutlinedButton`, `TextButton`,
  `ElevatedButton` — hiyerarşi bu sırada. `FloatingActionButton` ana eylem.
- Yapı: `Scaffold` (topBar + bottomBar + FAB + content yuvası), `Card`,
  `NavigationBar`, `TopAppBar`, `ModalBottomSheet`, `AlertDialog`.
- Giriş: `TextField`/`OutlinedTextField`, `Checkbox`, `Switch`, `Slider`,
  `SegmentedButton`.
- Ekran iskeleti olarak `Scaffold` — insets'i o yönetir.

## Material You — dynamic color
```kotlin
val scheme = if (Build.VERSION.SDK_INT >= 31)
  dynamicLightColorScheme(context) else lightColorScheme()
```
- Android 12+ kullanıcının duvar kâğıdından renk üretir. Opsiyonel — marka kimliği
  güçlüyse kapalı tut, kullanıcıya seçim sun.

## Ne yap
- `MaterialTheme` + `Scaffold`'u uygulama iskeleti yap.
- Rengi/tipografiyi `MaterialTheme.colorScheme` / `.typography`'den oku.
- Buton hiyerarşisine uy — ekranda tek filled `Button` (ana eylem).
- `Scaffold`'a window insets'i bırak — elle padding hesaplama.
- Edge-to-edge çiz (`enableEdgeToEdge()`), sistem çubuklarına saygı.

## Kırmızı bayraklar
- UI'da hardcode `Color(0xFF...)` — colorScheme atlanmış.
- Aynı ekranda birden çok filled `Button` — hiyerarşi yok.
- `Scaffold` yok, insets elle ve yanlış hesaplanıyor.
- Material 2 (`material`) ile M3 (`material3`) karışık import.
- Dynamic color zorla açık — marka rengi duvar kâğıdına feda edilmiş.
