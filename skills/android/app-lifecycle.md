# Android Yaşam Döngüsü, Manifest, İzinler

Android süreç ve ekranları sistem kontrolündedir — bellek baskısında öldürür,
rotasyonda yeniden kurar. Kod buna dayanıklı olmalı.

## Yaşam döngüsü
- **Activity**: `onCreate` → `onStart` → `onResume` → (etkin) → `onPause` → `onStop`
  → `onDestroy`. Konfig değişimi (rotasyon, dil, tema) Activity'yi yeniden yaratır.
- State'i `ViewModel`'de tut → yeniden yaratmadan sağ kalır. UI-yerel küçük state
  `rememberSaveable`.
- Yaşam döngüsüne bağlı iş: `LifecycleEventEffect` / `repeatOnLifecycle` — ekran
  görünürken çalış, arka planda dur.

## Manifest
- `AndroidManifest.xml` — Activity'ler, izinler, `application` ayarı, intent filtreleri.
- Tek `MainActivity` + Compose navigation tipiktir; her ekrana Activity AÇMA.
- Deep link: intent filter veya Navigation Compose deep link.
- `minSdk` / `targetSdk` bilinçli seç; `targetSdk` güncel olsun (Play şartı).

## İzinler
- **Tehlikeli izinler** (kamera, konum, bildirim) runtime'da istenir:
  `rememberLauncherForActivityResult(RequestPermission())`.
- Android 13+ bildirim izni runtime — varsaymadan iste.
- İste-önce-açıkla: gerekçeyi izinden önce göster; `shouldShowRequestPermissionRationale`.
- Reddi ele al — özellik kapalı ama uygulama çalışsın; ayarlara yönlendir.

## Süreç & arka plan
- Uygulama her an öldürülebilir — kaydedilmemiş veri kaybolur; önemliyse kalıcılaştır.
- Uzun arka plan işi: `WorkManager` (garantili) — ham `Thread`/servis değil.
- `Activity` Context'i sızdırma; uygulama-ömürlü şeyler için `applicationContext`.

## Ne yap
- State'i ViewModel + `rememberSaveable`; rotasyonu test et.
- Tehlikeli izni kullanımdan önce, gerekçeyle iste; reddi ele al.
- Tek Activity + Compose navigation; ekranlar composable.
- Arka plan işi `WorkManager`; `targetSdk` güncel.
- Ekran-bağlı toplama `repeatOnLifecycle` / `collectAsStateWithLifecycle`.

## Kırmızı bayraklar
- Rotasyonda state kayboluyor — ViewModel/saveable kullanılmamış.
- Her ekran ayrı Activity — navigasyon ağır, geçiş kötü.
- İzin gerekçesiz, açılışta isteniyor; reddi çökmeye yol açıyor.
- Arka plan işi ham thread/servis — sistem öldürünce kayıp.
- `Activity` Context'i singleton/statik alanda — sızıntı.
