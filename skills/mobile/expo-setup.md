# Expo Kurulumu — cross-platform mobil temel

Expo, React Native'in managed katmanı: tek kod tabanı iOS + Android, native build
buluttan (EAS), OTA güncelleme, geniş kütüphane uyumu. Yeni cross-platform mobil
işin varsayılan başlangıcı budur.

## Ne zaman devreye girer
Görev iOS + Android'i tek kod tabanıyla istiyorsa. Tek-platforma özgü derin native
gereksinim varsa (App Clip, karmaşık native SDK) Lead'e bildir — native ios/android
helper daha doğru olabilir.

## Proje kurma
```
npx create-expo-app@latest <ad>          # TypeScript + expo-router hazır
cd <ad> && npx expo start                # dev — QR ile cihaz / emülatör
```
- **Managed workflow** kullan — `ios/` `android/` klasörlerini elle yönetme; native
  config `app.json` ve config plugin'lerle gelir.
- Paket ekleme: `expo install <paket>` (sürüm uyumunu Expo seçer), `npm install` değil.

## Proje yapısı
```
app/              → expo-router: dosya = route
  _layout.tsx     → kök layout (provider'lar, tema)
  (tabs)/         → tab grubu
  index.tsx
components/       → ortak component (tasarım sistemini buraya tüket)
constants/        → token köprüsü, config
hooks/  lib/      → mantık
assets/           → görsel, font
app.json          → Expo config (ikon, splash, izin, plugin)
```

## Build & dağıtım
- **EAS Build** — bulutta native binary: `eas build --platform all`. macOS gerekmez.
- **EAS Update** — JS katmanı için OTA: store'a gitmeden güncelleme.
- **Development build** (`expo-dev-client`) — Expo Go'da olmayan native modül gerekince.
- Store dağıtımı: `eas submit`.

## Ne yap
- Yeni proje = managed workflow + expo-router + TypeScript.
- `expo install` ile sürüm uyumunu koru.
- Native yetenek `expo-*` paketleriyle gelir (camera, notifications, secure-store).
- Çevre değişkeni: `app.config.ts` + `extra`, veya `EXPO_PUBLIC_*`; secret gömme.
- `app.json`'da ikon/splash/bundle-id'yi baştan doğru kur.

## Kırmızı bayraklar
- Sebep yokken `expo prebuild` / eject — managed avantajını kaybedersin.
- `npm install` ile uyumsuz RN paketi sürümü → Metro/runtime hatası.
- API anahtarı `EXPO_PUBLIC_*` ile client'a sızmış — bunlar bundle'da görünür.
- Native modülü Expo Go'da test etmeye çalışmak — development build gerekir.
- iOS native build için macOS aramak — EAS Build bulutta yapar.
