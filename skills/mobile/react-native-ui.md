# React Native UI — component ve styling

RN, web React'e benzer ama DOM yok: `View`/`Text`/`Pressable` var, `div`/`p` yok.
Stil JS objesi, CSS değil. Tasarım sistemini bu katmanda tüket.

## Çekirdek primitive'ler
- `View` — kapsayıcı (div karşılığı), Flexbox layout.
- `Text` — TÜM metin `Text` içinde olmalı; çıplak string render edilmez.
- `Pressable` — dokunma; `TouchableOpacity` yerine bunu tercih et (press state verir).
- `Image` / `expo-image` — görsel; `expo-image` cache + performans için daha iyi.
- `ScrollView` — kısa, sınırlı içerik; uzun liste için DEĞİL (bkz. performance).
- `TextInput` — form girişi; `KeyboardAvoidingView` ile sarmala.

## Layout
- Flexbox varsayılan; `flexDirection` RN'de `column` (web `row` değil).
- Birim yok — sayılar density-independent pixel. Spacing token'larını sayı olarak ver.
- Yüzde + `flex` ile responsive; sabit genişlik az kullan.
- Güvenli alan: `react-native-safe-area-context` → `useSafeAreaInsets()`.

## Styling — tasarım sistemini tüket
Token'ları sayı/string sabit olarak köprüle, component içine hardcode etme:
```ts
// constants/tokens.ts — design rolünün tokens.json'undan üretilmiş
export const color = { actionPrimary: '#3b82f6', bgSurface: '#f8fafc' } as const;
export const space = { s2: 8, s4: 16, s6: 24 } as const;
export const radius = { md: 8 } as const;
```
- `StyleSheet.create(...)` ile stilleri component DIŞINDA tanımla — her render'da
  yeni obje yaratma.
- NativeWind kullanılıyorsa Tailwind class; token'lar yine tek kaynaktan eşlenir.
- Tema (light/dark): `useColorScheme()` + token seçimi; component'te `if dark` dağıtma.

## Component kütüphanesi
- design rolünün foundation set'ini RN karşılıklarıyla kur: `<Button>`, `<Card>`,
  `<Input>` — web ile AYNI varyant API'si (`variant`, `size`).
- Platform farkını `Platform.select` ile component İÇİNDE yönet, çağıran bilmesin.

## Ne yap
- Metni hep `Text`'e sar; dokunmayı `Pressable` ile yap.
- `StyleSheet.create` + token sabitleri; inline obje literal'den kaçın.
- Görsel için `expo-image`, sabit boyut + cache.
- Tasarım sistemi varyant API'sini RN component'lerinde birebir koru.
- Erişilebilirlik: `accessibilityRole`, `accessibilityLabel`, dokunma hedefi ≥ 44.

## Kırmızı bayraklar
- Çıplak string (`<View>Merhaba</View>`) — RN render etmez/uyarır.
- Her render'da inline `style={{...}}` objesi → gereksiz recompute.
- `flexDirection` web alışkanlığıyla `row` varsayılmış.
- `useSafeAreaInsets` yok → içerik çentik/status bar altında.
- Hover'a bağlı etkileşim — dokunmatikte hover yok.
- Component içinde hex/px hardcode — token atlanmış.
