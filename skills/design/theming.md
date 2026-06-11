# Tema, Dark Mode ve Preset'ler

Tema = semantic token katmanının somut bir değer kümesi. "İstediğin UI" pratikte bir
tema preset'idir. İyi kurulmuş sistemde tema değiştirmek = preset değiştirmek,
component'lere dokunmadan.

## Light / dark
- TEK semantic token seti, token başına İKİ değer (light + dark). İki ayrı set tutma.
- Primitive palet sabit; sadece semantic→primitive eşlemesi temaya göre değişir.
- Web: `:root` light, `.dark` (veya `prefers-color-scheme`) override.
- iOS: asset catalog Color Set otomatik; `@Environment(\.colorScheme)`.
- Android: `lightColorScheme()` / `darkColorScheme()`.
- Dark, light'ın ters çevrilmişi DEĞİL: saf siyah (#000) yerine koyu gri yüzey,
  daha düşük renk doygunluğu, elevation ile açılan surface.

## Preset sistemi (marka / "istediğin UI")
Birden çok görünüm gerekiyorsa (marka temaları, kullanıcı seçimi):
- Her preset = semantic token'lara değer atayan bir nesne.
- Component'ler hep semantic token okur → preset değişince otomatik uyum.
- Web'de `data-theme="..."` attribute + CSS değişkeni override en temizi.
- Bir "kaynak renk → tam tema" üretici fonksiyon yaz (MD3 tonal palet mantığı):
  kullanıcı tek renk verir, sistem tutarlı paleti üretir.

## Kontrast / erişilebilirlik
- Gövde metni ↔ arkaplan: WCAG AA = 4.5:1; büyük metin / UI bileşeni = 3:1.
- HER `text` token'ını, üstüne geleceği HER `surface` token'ında doğrula.
- Dark temayı ayrı doğrula — light'ta geçen kombinasyon dark'ta kalmayabilir.
- Disabled durum kontrast muafiyeti DEĞİL — okunur kalsın.
- Rengi tek sinyal yapma (hata = sadece kırmızı olmasın; ikon/metin de).

## Theme switch
- Geçiş anlık olabilir; `prefers-reduced-motion`'a saygı.
- FOUC önle: ilk boyamadan önce temayı uygula (web'de `<head>` inline script).
- Seçimi kalıcı sakla (localStorage / UserDefaults / DataStore), sistem temasını
  varsayılan al.

## Ne yap
- Semantic token + iki-değer (light/dark) tek tabloyu kaynak yap.
- Bir preset üreticisi yaz — kaynak renkten tam, kontrast-güvenli tema.
- Her tema × her platformda kontrastı otomatik test et (CI'da script).
- Component'leri temadan habersiz tut — sadece semantic token okusunlar.

## Kırmızı bayraklar
- `if (dark) color = '#fff'` — component içinde tema dallanması.
- Dark mode = light'ın CSS `invert()`'i.
- Kontrast hiç ölçülmemiş, "gözüme iyi göründü".
- Tema değişiminde component'leri elle güncelleyen kod.
- FOUC: sayfa light açılıp dark'a sıçrıyor.
