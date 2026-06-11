# Android Tema — token tüketimi

design rolünün tasarım sistemi çıktısını Compose temasında tüket. Renk/spacing/şekli
hardcode etme — `Theme.kt` tek köprü olsun.

## Theme.kt yapısı
```kotlin
private val LightColors = lightColorScheme(
  primary = Color(0xFF3B82F6),
  surface = Color(0xFFF8FAFC),
  onSurface = Color(0xFF0F172A),
  // ... design rolünün tokens.json'undan üretildi
)
private val DarkColors = darkColorScheme( /* dark token değerleri */ )

@Composable
fun AppTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val scheme = when {
    dynamicColor && Build.VERSION.SDK_INT >= 31 ->
      if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
      else dynamicLightColorScheme(LocalContext.current)
    darkTheme -> DarkColors
    else -> LightColors
  }
  MaterialTheme(colorScheme = scheme, typography = AppTypography,
    shapes = AppShapes, content = content)
}
```

## MaterialTheme dışı token'lar
Spacing gibi token'lar `MaterialTheme`'de yoktur — `CompositionLocal` ile taşı:
```kotlin
data class Spacing(val s2: Dp = 8.dp, val s4: Dp = 16.dp, val s6: Dp = 24.dp)
val LocalSpacing = staticCompositionLocalOf { Spacing() }
// AppTheme içinde: CompositionLocalProvider(LocalSpacing provides Spacing()) { ... }
// Kullanım: LocalSpacing.current.s4
```

## Tipografi & şekil
- `Typography` — design rolünün type scale'i `displayLarge`…`labelSmall` rollerine map'lenir.
- `Shapes` — radius token'ları `small`/`medium`/`large`'a.
- Font'lar `res/font` + `FontFamily`.

## Light / dark
- `isSystemInDarkTheme()` varsayılan; kullanıcı override'ını DataStore'da sakla.
- `darkColorScheme` ayrı değerler taşır — light'ın inversi değil.
- Dark'ta surface saf siyah değil; elevation tonal ile açılır.

## Dynamic color (Material You)
- Marka kimliği güçlüyse `dynamicColor = false` tut.
- Açılırsa kullanıcıya seçim sun; design rolünün paleti referans kalsın.

## Ne yap
- `Theme.kt`'yi token kaynağından üret; tek köprü orası olsun.
- Renk → `colorScheme`, tipografi → `Typography`, şekil → `Shapes`.
- MaterialTheme'de olmayanları (spacing) `CompositionLocal` ile dağıt.
- Her composable'ı light + dark `@Preview` ile doğrula.

## Kırmızı bayraklar
- Composable'da `Color(0xFF...)` / `.dp` magic number — `Theme.kt` atlanmış.
- Light/dark için ayrı composable kopyaları.
- Spacing her component'te yeniden tanımlı — `CompositionLocal` yok.
- Dynamic color zorla açık — design rolünün paleti görünmüyor.
