# iOS Mimari — uygulama yapısı ve veri akışı

swiftui.md view state sahipliğini anlatır; bu skill o state'ten AYRILAN mantığın
nereye gittiğini anlatır: uygulama yapısı, model katmanı, ağ ve kalıcılık.

## Observation ile state akışı
- Modern iOS (17+): `@Observable` makro — gözlemlenebilir model sınıfı.
  `ObservableObject`/`@Published` eski yol; yeni kodda `@Observable`.
- Paylaşılan model `@Environment` ile enjekte edilir; view `@Bindable` ile bağlanır.
- Akış: model state tutar → view gözler → view olay çağırır → model state'i günceller.

## Katmanlar
```
View (SwiftUI)  →  Model/Store (@Observable)  →  Service  →  ağ / kalıcılık
   state gözler      iş mantığı + state          API/DB soyut
```
- View ince: state'i yansıt, olayı ilet. İş mantığı View'da değil.
- `Service` katmanı ağ/DB'yi soyutlar — test için protokol arkasına al.

## Eşzamanlılık
- `async/await` — ağ ve uzun iş; `URLSession`'ın async API'si.
- View'da `.task {}` — ömre bağlı, otomatik iptal edilir.
- Model'de iş: `Task {}` + uygun aktör izolasyonu. UI güncellemesi `@MainActor`.
- Paylaşılan değişebilir state'i `actor` ile koru — veri yarışını önle.

## Kalıcılık
- Yapısal yerel veri: SwiftData (`@Model`) — modern; Core Data eski projelerde.
- Küçük ayar: `UserDefaults`. Hassas veri: Keychain (bkz. app-lifecycle).
- Kalıcılığı `Service`/repository arkasına al; view doğrudan dokunmasın.

## Bağımlılık
- Bağımlılığı `@Environment` veya init enjeksiyonuyla ver — global singleton'dan kaçın.
- Protokol arkasına al → test'te sahte (mock) geçilebilir.

## Ne yap
- State'i `@Observable` model'de tut; `@Environment` ile dağıt.
- Ağ/kalıcılığı `Service` protokolü arkasına al, enjekte et.
- `async/await` + `.task`; UI güncellemesi `@MainActor`.
- View'ı ince tut — iş mantığı model katmanında.

## Kırmızı bayraklar
- İş mantığı/ağ çağrısı `body` veya view init'inde.
- Global singleton'a doğrudan erişim — test edilemez, gizli bağımlılık.
- `@Published`/`ObservableObject` yeni kodda — `@Observable` varken.
- Paylaşılan değişebilir state korumasız — veri yarışı.
- UI güncellemesi arka plan thread'inde — `@MainActor` atlanmış.
