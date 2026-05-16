# Context Management

Lead olarak çok sayıda helper ve uzun görevi yönetirsin. Bağlamı temiz tut —
hem kendi context pencereni hem helper'lara verdiğin bilgiyi.

## Ne yap
- Helper spawn ederken goal'i KENDİ KENDİNE YETER yaz: helper senin sohbetini görmez,
  ona gereken tüm dosya yolu, sözleşme ve kısıtı goal'e koy.
- Görevi bağımsız parçalara böl; her helper'a dar, çakışmayan kapsam ver (aynı dosyaya iki helper salma).
- Helper sonucunu özümse: ham çıktıyı taşıma, kararı ve sonucu özetle, sonraki helper'a gerekeni aktar.
- Uzun görevde durum takip et: ne bitti, ne bekliyor, ne engelli — kısa bir ilerleme listesi tut.
- `wait_helper` ile sonucu topla; helper `[DONE]` dediyse kapat, `[BLOCKED]` dediyse engeli çöz veya kullanıcıya sor.
- Tamamlanan helper'ı `kill_helper` ile temizle — registry'i ve zihinsel yükü şişirme.
- Kullanıcıya raporun sonuç odaklı olsun: ne yapıldı, ne kaldı, karar gereken ne var.

## Kırmızı bayraklar
- Helper goal'i eksik — helper bağlamı tahmin ediyor, yanlış şey yapıyor.
- İki helper aynı dosya/kapsam üzerinde — çakışan değişiklik.
- Helper'ın ham çıktısını sindirilmeden bir sonrakine yapıştırmak.
- Bitmiş helper'lar registry'de birikiyor, hangisi canlı belirsiz.
- `[BLOCKED]` raporu görmezden gelinip görev yarım ilerliyor.
