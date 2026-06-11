# Jetpack Compose — deklaratif Android UI

Compose, Android'in modern UI araç takımı: UI = state'in fonksiyonu. XML layout yok,
`@Composable` fonksiyonlar var. Yeni Android işinde varsayılan.

## Composable temeli
```kotlin
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
  Text(text = "Merhaba $name", modifier = modifier)
}
```
- Composable fonksiyon UI tarif eder; state değişince Compose ilgili kısmı yeniden
  çalıştırır (recomposition).
- `Modifier` zinciri — boyut, padding, tıklama, arkaplan: `Modifier.padding(16.dp).fillMaxWidth()`.
- Layout primitive'leri: `Column`, `Row`, `Box`, `LazyColumn`/`LazyRow` (uzun liste).

## State & state hoisting
```kotlin
var count by remember { mutableStateOf(0) }     // ekran-içi geçici state
```
- `remember` — recomposition boyunca state'i korur; `rememberSaveable` — konfig
  değişiminde de korur.
- **State hoisting**: state'i en alt ortak ataya taşı; composable `value` +
  `onValueChange` alır → yeniden kullanılabilir, test edilebilir, "stateless" olur.
- Kalıcı/ekran state'i ViewModel'de (bkz. architecture).

## Recomposition disiplini
- Composable'lar yan etkisiz olmalı — yan etki için `LaunchedEffect`, `DisposableEffect`.
- Aynı girdiyle aynı UI; sırayla/sıklıkla çağrılmayı varsayma.
- Pahalı hesabı `remember(key)` ile anahtarla.
- `LazyColumn`'da `key = { it.id }` ver — kararlı kimlik.
- Kararlı (`@Stable`/`@Immutable`) parametreler gereksiz recomposition'ı keser.

## Önizleme
```kotlin
@Preview(showBackground = true)
@Composable fun GreetingPreview() { AppTheme { Greeting("Dünya") } }
```
Her ekran component'i için `@Preview` — IDE'de cihazsız gör. Light + dark preview.

## Ne yap
- UI'yı küçük, stateless composable'lara böl; state'i yukarı kaldır.
- `LazyColumn`/`LazyRow` ile uzun liste; `key` ver.
- Yan etkiyi `LaunchedEffect`/`rememberCoroutineScope` ile yönet.
- Her ekrana `@Preview` (light + dark) ekle.
- `Modifier`'ı parametre olarak al, default `Modifier`.

## Kırmızı bayraklar
- Composable içinde doğrudan yan etki (ağ çağrısı, state mutasyonu).
- Uzun liste `Column` + `forEach` ile — hepsi compose edilir.
- `remember` olmadan state — her recomposition'da sıfırlanır.
- `LazyColumn`'da `key` yok — yanlış öğe geri dönüşümü.
- Devasa tek composable — bölünmemiş, recomposition geniş.
