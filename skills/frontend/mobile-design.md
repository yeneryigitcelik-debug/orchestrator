# Mobile Design

Mobil ekran için arayüz tasarla — küçük alan, dokunmatik giriş, değişken bağlam.

## Ne yap
- Dokunma hedefi en az 44×44 pt (iOS) / 48×48 dp (Android); hedefler arası boşluk bırak.
- Güvenli alanlara saygı: çentik, status bar, home indicator, klavye — `safe-area-inset` kullan.
- Tek elle erişim: birincil eylemleri ekranın alt/orta bölgesine koy, üst köşeye değil.
- İçerik öncelikli: dar ekranda tek sütun, ikincil bilgi katlanır/gizlenir (progressive disclosure).
- Gerçek cihaz koşulunu varsay: yavaş ağ, düşük ışık, hareket halinde kullanım.
- Yükleniyor/boş/hata durumlarını tasarla; dokunsal/görsel geri bildirim ver.
- Tipografi ve kontrast okunur olsun (gövde ≥ 16px, WCAG AA kontrast).

## Kırmızı bayraklar
- Küçük, sıkışık dokunma hedefleri — yanlış tıklama.
- Birincil eylem ekranın üst köşesinde, başparmakla zor erişilir.
- İçerik klavye veya çentik altında kalıyor.
- Masaüstü düzenini küçültüp mobile dayatmak (yatay kaydırma, minik metin).
- Hover'a bağlı etkileşim — dokunmatikte hover yok.
