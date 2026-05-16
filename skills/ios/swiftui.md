# SwiftUI

SwiftUI ile native iOS arayüzü kur — deklaratif, state-sürümlü.

## Ne yap
- View küçük ve saf olsun; karmaşık ekranı alt-view'lara böl, `body`'yi şişirme.
- State sahipliğini doğru kur: `@State` view'a ait yerel state, `@Binding` türetilmiş,
  paylaşılan model için `@Observable` (Observation) + `@Environment`.
- Liste için `List`/`LazyVStack`; her satıra stabil `id`.
- Layout'u stack + `Spacer` + `frame`/`padding` ile kur; sabit piksel konum verme.
- Async iş için `.task {}` modifier'ı kullan — view ömrüne bağlı, otomatik iptal edilir.
- Dynamic Type, Dark Mode ve farklı ekran boyutlarını destekle; `#Preview` ile doğrula.
- Yan etkiyi (ağ, kalıcılık) view'dan ayır; view sadece state'i yansıtsın.

## Kırmızı bayraklar
- Dev `body` — tüm ekran tek view, alt parçaya bölünmemiş.
- State birden çok yerde kopya tutuluyor, senkron tutma derdi.
- `onAppear` içinde `Task {}` ile iş başlatıp iptal yönetmemek (`.task` varken).
- Sabit `frame` ile düzen — farklı cihazda kırılıyor.
- İş mantığı/ağ çağrısı doğrudan `body` veya view init'inde.
