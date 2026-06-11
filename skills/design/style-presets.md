# Stil Preset'i — başlangıç token seti

Bir stil preset'i tasarım sisteminin TOHUMUDUR — bitmiş tasarım sistemi değil.
Vitrin sihirbazı (veya Lead) sana bir preset verir; senin işin onu tam token
sistemine genişletmek.

## Preset ne içerir
Vitrin brief'inden gelen preset şu alanları taşır:
- **renk:** `primary` + `accent` (tohum hex'ler) + nötr karakteri (soğuk/sıcak/saf)
- **tipografi:** başlık fontu, gövde fontu, type scale karakteri (tight/balanced/expressive)
- **biçim:** köşe (sharp/soft/rounded), yoğunluk (compact/comfortable/airy),
  hareket (minimal/subtle/playful), elevation (flat/soft/layered)
- **mod:** light-first / dark-first / both

Bunlar KARAR'dır, hazır değer değil. İşin bu kararları somut token'lara çevirmek.

## Preset'i tam token sistemine genişletme
token-architecture skill'indeki 3 katmanı preset'ten üret:
- **Renk:** `primary`/`accent` tohumlarından tam tonal palet türet (50–950 veya MD3
  tonal). Nötr karakteri nötr paletini seçer. Sonra semantic rolleri (bg, surface,
  text, border, feedback) + her birinin light/dark değerini ata.
- **Tipografi:** başlık/gövde fontu + type scale karakterini somut ölçeğe çevir —
  tight = sıkı, küçük adımlar; expressive = geniş, kontrastlı ölçek.
- **Spacing/yoğunluk:** density → spacing ölçeği ve component iç boşlukları
  (compact = dar, airy = ferah).
- **Radius:** sharp ≈ 0–2px, soft ≈ 6–10px, rounded ≈ 12px+ / full.
- **Elevation:** flat = gölgesiz/çizgi sınır, soft = hafif gölge, layered = MD3-tarzı
  katmanlı yüzey + gölge.
- **Motion:** süre + easing token'larını minimal/subtle/playful'a göre ayarla.
- **Mod:** light-first/dark-first hangi temanın birincil olduğunu söyler; `both` ise
  ikisini de eşit olgunlukta kur.

## Ne yap
- Preset'i tohum kabul et — eksiksiz token sistemi + DESIGN-SYSTEM.md üret.
- Tohum hex'lerden üretilen paletin kontrastını WCAG'a karşı doğrula (theming skill).
- Preset'in "his"ini koru — bold-modern'i sessiz, minimal'i gürültülü yapma.
- Preset bir başlangıçtır; kullanıcının ek istekleri onu inceltir.

## Kırmızı bayraklar
- Preset'i bitmiş tasarım sistemi sanıp yalnız 2 rengi kullanmak.
- Tohum hex'leri palet türetmeden doğrudan her yere koymak.
- Preset'in karakterini görmezden gelip generic bir tema üretmek.
- Mod `both` denmişken dark temayı baştan savma.
