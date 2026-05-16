# iOS App Lifecycle & Platform

iOS uygulamasının yaşam döngüsünü, izinlerini ve platform kurallarını doğru yönet.

## Ne yap
- Giriş noktası `App` protokolü + `WindowGroup`; sahne durumunu `@Environment(\.scenePhase)`
  ile izle (active/inactive/background).
- Arka plana geçişte durumu kaydet; öne dönüşte tazele — kullanıcı kaldığı yerden devam etsin.
- İzinleri (konum, bildirim, kamera, foto) kullanımdan hemen önce, gerekçeyle iste;
  `Info.plist` açıklama anahtarlarını (`NSphotoLibraryUsageDescription` vb.) doldur.
- Reddedilen izni zarifçe karşıla — özelliği kapat, çökme yok.
- Hassas veriyi Keychain'de tut, `UserDefaults`'ta değil; küçük ayar için `UserDefaults`.
- Ağ ve disk işini arka plan task'inde yap, ana thread'i bloklama.
- App Store kuralları: gizlilik bildirimi, sürüm/build numarası, desteklenen iOS hedefi net.

## Kırmızı bayraklar
- `Info.plist`'te usage description eksik → izin isteyince uygulama çöker.
- Token/şifre `UserDefaults` veya düz dosyada.
- Arka plan/öne dönüş ele alınmamış — state kayboluyor.
- Ana thread'de ağ/disk → arayüz donuyor, watchdog kill.
- İzin reddini varsaymak — reddedilince akış kırılıyor.
