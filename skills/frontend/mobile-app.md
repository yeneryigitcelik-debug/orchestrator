# Mobile App Development

React Native / Expo ile mobil uygulama geliştir. Web React'ten farklı:
DOM yok, platform farkları var, performans bütçesi dar.

## Ne zaman devreye girer
Görev mobil uygulama (iOS/Android), React Native veya Expo istiyorsa.
Web projesinde devreye girmez.

## Ne yap
- Yeni proje için Expo (managed workflow) tercih et — native build, OTA güncelleme, kütüphane uyumu kolay.
- Navigasyon için `expo-router` veya React Navigation; ekranlar arası state'i route paramı veya store ile taşı.
- Liste için `FlatList`/`FlashList` — uzun listeyi `map` ile render etme.
- Platform farkını `Platform.select` ile yönet; `SafeAreaView` ile çentik/status bar.
- Görseli boyutlandır ve cache'le; ağ resmini ham yükleme.
- Native modül gerekiyorsa Expo config plugin veya development build; eject son çare.
- Gizli anahtarı app bundle'ına gömme — bundle tersine mühendislikle açılır.

## Kırmızı bayraklar
- Uzun listede `ScrollView` + `map` → bellek ve jank.
- Her render'da `StyleSheet` yerine inline obje literal.
- `SafeAreaView` yok → içerik çentik/status bar altında.
- Ağır iş JS thread'inde → animasyon takılıyor (native driver kullan).
- API anahtarı/secret koda gömülü.
