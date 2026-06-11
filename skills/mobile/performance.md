# React Native Performans

RN'de JS thread + UI thread ayrıdır. Ağır iş JS'te bloklarsa animasyon takılır (jank).
Mobil bütçe dar — performansı baştan tasarla.

## Listeler
- Uzun liste = `FlatList` veya `FlashList` (Shopify) — sadece görünür satırları render.
- `ScrollView` + `.map()` ile uzun liste ❌ — hepsi belleğe, jank + çökme.
- `keyExtractor` ver; satır component'ini `React.memo` ile sar.
- `getItemLayout` (sabit yükseklikte) — scroll hesabı atlanır.
- `FlashList`'te `estimatedItemSize` ver.

## Animasyon
- `react-native-reanimated` kullan — animasyon UI thread'inde koşar, JS bloklasa
  bile akıcı.
- Eski `Animated` kullanılıyorsa `useNativeDriver: true`.
- `react-native-gesture-handler` — jestler native tarafta.
- Erişilebilirlik motion azaltma tercihine saygı göster.

## Render
- `StyleSheet.create` — stil objesini render dışında tut.
- Pahalı hesabı `useMemo`, callback'i `useCallback` ile sabitle; memo'lu çocuklara ver.
- Büyük component ağacını böl; gereksiz context yeniden render'ını izle.
- Inline fonksiyon/obje prop'u memo'lu çocuğun memo'sunu bozar.

## Görsel & varlık
- `expo-image` — disk/bellek cache, `contentFit`, placeholder.
- Görseli kullanılacak boyutta sun; dev görseli küçük View'a yükleme.
- Font'ları `expo-font` ile önceden yükle; splash'i hazır olana dek tut.

## Başlangıç
- Açılışta ağır iş yapma — ilk ekranı hızlı boya, gerisini ertele.
- Liste/ekran kodunu gerektiğinde yükle (lazy).
- `react-native-screens` aktif (expo-router'da varsayılan) — native ekran optimizasyonu.

## Ne yap
- Her uzun liste `FlatList`/`FlashList`; satır `memo`'lu, `keyExtractor` net.
- Animasyon/jest = Reanimated + gesture-handler (UI thread).
- `expo-image` + doğru boyutlu, cache'li görsel.
- Render'ı ölç (RN DevTools / profiler) — tahmin etme.

## Kırmızı bayraklar
- `ScrollView` + `map` ile yüzlerce satır.
- `useNativeDriver` olmadan animasyon → JS bloklayınca takılıyor.
- Her render'da inline obje/fonksiyon → `memo` etkisiz.
- Ham, dev boyutlu görsel ağdan yükleniyor.
- Açılışta senkron ağır iş → uzun beyaz ekran.
