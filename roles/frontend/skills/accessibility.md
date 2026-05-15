# Accessibility (a11y)

Erişilebilir arayüz üret — klavye, ekran okuyucu ve düşük görüşlü kullanıcılar
dahil herkes kullanabilsin.

## Ne yap
- Semantik HTML: `button`, `nav`, `main`, `label` — `div`+onClick değil.
- Her interaktif eleman klavyeyle erişilebilir ve `:focus-visible` ile görünür.
- Görsel olmayan içerik için `aria-label`; ikon-only butonlar etiketli.
- Renk kontrastı WCAG AA (metin ≥ 4.5:1).
- Form input'ları gerçek `<label>` ile bağlı.

## Kırmızı bayraklar
- `<div onClick>` ile buton taklidi.
- `outline: none` — focus ring'i tamamen kaldırma.
- Sadece renkle bilgi verme (örn. yalnız kırmızı = hata).
- `alt` metni olmayan anlamlı görseller.
