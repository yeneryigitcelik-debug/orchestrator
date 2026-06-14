# Hallmark Anti-Slop (görsel)

<!-- Kaynak: github.com/Nutlope/hallmark (MIT). LLM-üretimi "slop" UI tell'leri taraması. -->

## Ararsın
- Generic ritim: brief'e bakılmaksızın aynı `hero → 3-feature → CTA → footer` iskeleti
- Token-dışı inline değer: component'te `oklch()/#hex/rgb()` ya da `font-family:"X"` (kilitli token yok)
- İtalik başlık: `<h1>…<em>…</em>` ya da display face italic (en güvenilir AI tell'i)
- Sahte chrome: elle çizilmiş tarayıcı barı (URL pill + trafik-ışığı noktaları), telefon
  çerçevesi, kod penceresi (mock title bar + dots saran `<pre>`), IDE chrome
- **N1a** nav (wordmark + birkaç inline link + sağda buton) — gerçekten 2 hedef yokken
- **Ft3** footer (4 kolon link + social row + minik copyright) — docs/hub değilken
- Uydurma metrik/testimonial/logo: "+47% conversion", "50,000+ teams", "10× faster"
- tag-left / heading-right (hanging header) iki-kolon deseni
- Section eyebrow spam: `01 · THE TOUR`, `02 / FEATURES` (ordinal olmayan içerikte)
- `transition: all` / browser default `ease` / bounce / layout property animasyonu
- Tek-tip "blue gradient + glassmorphism card" default estetiği; tema çeşitliliği yok

## Patterns
- `:root`'ta token tanımlı ama component'te yine inline hex/oklch
- `font-style: italic` bir `h1..h3` / `.display` öğesinde
- `<div class="browser-bar"><span class="dot">` benzeri sahte-chrome markup
- `transition: all`, `@keyframes` içinde `top/left/width/height`
- Footer'da 4× `<ul>` kolon + `.social` + `© 20xx`

## Severity
- **high**: uydurma metrik (dürüstlük ihlali), sahte chrome, italik başlık, token-dışı inline değer
- **medium**: N1a/Ft3 default, generic ritim, hanging header, `transition: all`
- **low**: eyebrow spam, fazla motion

## Doğrusu
- Macrostructure'ı ÖNCE seç; brief'e göre yapısal çeşitlilik (nav/footer archetype dahil)
- Her renk/font adlı token'a referans; OKLCH + 4pt spacing
- Başlıklar roman; vurgu ağırlık/accent/underline ile
- Gerçek screenshot `<figure>` ya da chrome yok; uydurma veri yerine placeholder
- Animasyon yalnız transform/opacity + adlandırılmış easing; `prefers-reduced-motion`
