# Native Platform Erişimi

Cross-platform tek kod, ama iOS ve Android farklı davranır. Native yetenekler
`expo-*` paketleriyle gelir; platform farkını disiplinle yönet.

## Platform farkı
```ts
import { Platform } from 'react-native';
Platform.OS              // 'ios' | 'android'
Platform.select({ ios: A, android: B, default: C })
```
- Farkı component İÇİNDE kapsülle — çağıran taraf platformdan habersiz olsun.
- `Platform.Version` ile OS sürüm kontrolü gerekirse.

## Güvenli alan & klavye
- `react-native-safe-area-context` → `useSafeAreaInsets()` (çentik, status bar,
  home indicator). `SafeAreaView` yerine inset'leri tercih et — daha esnek.
- `KeyboardAvoidingView` — iOS `padding`, Android `height`; form ekranlarında şart.

## İzinler
- Her native yetenek izin ister: kamera, konum, bildirim, foto kütüphanesi.
- İste-önce-açıkla: kullanıcıya NEDEN gerektiğini izinden önce göster.
- Reddedilmeyi ele al — uygulama izin olmadan da makul çalışsın / ayarları aç.
- `app.json`'da izin string'lerini (iOS usage description) doldur.

## Sık kullanılan expo paketleri
- `expo-secure-store` — token/secret (Keychain / Keystore). AsyncStorage'a secret yazma.
- `expo-notifications` — push + local bildirim.
- `expo-image-picker` / `expo-camera` — medya.
- `expo-location` — konum.
- `expo-haptics` — dokunsal geri bildirim (eylem onayı).
- `expo-linking` — deep link, harici URL.
- `AsyncStorage` — hassas OLMAYAN kalıcı veri (tercih, cache).

## Ne yap
- Native farkı `Platform.select` ile component içinde gizle.
- İzni kullanımdan hemen önce, gerekçeyle iste; reddi zarifçe ele al.
- Token/secret → `expo-secure-store`; düz veri → AsyncStorage.
- `useSafeAreaInsets` ile her ekranı çentik-güvenli yap.
- Klavye açılınca giriş alanı görünür kalsın (`KeyboardAvoidingView`).

## Kırmızı bayraklar
- API anahtarı/secret JS bundle'ında — tersine mühendislikle açılır.
- İzin uygulama açılır açılmaz, gerekçesiz isteniyor.
- İzin reddi ele alınmamış → uygulama kırılıyor.
- `Platform.OS` kontrolü UI koduna saçılmış, kapsüllenmemiş.
- AsyncStorage'a oturum token'ı yazılmış (şifresiz).
