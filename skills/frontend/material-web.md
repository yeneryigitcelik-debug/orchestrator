# Material Web (Material Design 3) — referans kütüphane

Google'ın resmi Material Design 3 web component seti: `@material/web`
(repo: github.com/material-components/material-web). Framework-bağımsız
custom element'ler — React, Next.js, vanilla, her yerde çalışır.

## Ne zaman devreye girer
Bu bir REFERANS kütüphanedir, zorunluluk değil. Kullan:
- Proje zaten `@material/web` kullanıyorsa,
- Kullanıcı/Lead "Material Design" istediyse veya component kütüphanesi
  seçimini sana bıraktıysa.
Aksi halde projenin mevcut yığınına (Tailwind, shadcn, MUI, vb.) saygı göster —
üstüne Material Web dayatma.

## Durum notu
Material Web bakım (maintenance) modunda — yeni component eklenmiyor, mevcutlar
çalışır durumda. Greenfield bir proje için kullanıcıya bunu belirt; mevcut
Material Web projesinde sorunsuz devam et.

## Kurulum + kullanım
```
npm i @material/web
```
Component'i import et, sonra custom element olarak kullan:
```ts
import '@material/web/button/filled-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/checkbox/checkbox.js';
```
```html
<md-filled-button>Kaydet</md-filled-button>
<md-outlined-text-field label="E-posta"></md-outlined-text-field>
```

## Ne yap
- Sadece kullandığın component'i import et (tree-shaking — `all.js` kullanma).
- Tipografi için `@material/web/typography/md-typescale-styles.js`'i bir kez
  yükle, `<body>`'ye `md-typescale-*` class'ları uygula.
- Tema: `--md-sys-color-*` ve `--md-sys-typescale-*` CSS custom property'leriyle
  özelleştir; component'in shadow DOM'una elle dokunma.
- Form'da `<md-*>` input'ları gerçek form ile çalışır (FACE — form-associated
  custom elements); native `name`/`value` davranışını koru.
- Olayları custom element event'leriyle dinle (`input`, `change`).

## React / Next.js notu
- Custom element'ler client-side'dır → kullanıldıkları component `"use client"`.
- Next.js App Router'da SSR sırasında `window` yok; import'ları client component
  içinde tut, gerekiyorsa `next/dynamic` ile `ssr: false`.
- React 19 custom element prop/event'leri native destekler; eski React'te
  `ref` ile event bağla.

## Kırmızı bayraklar
- Tüm kütüphaneyi tek seferde import etmek (`@material/web/all.js`) — bundle şişer.
- Shadow DOM'a `::part` dışından zorla stil enjekte etmek.
- Material Web ile Tailwind utility class'larını aynı elemana yığıp tema
  token'larını ezmek.
- Erişilebilirliği "component halleder" diye atlamak — yine `label`, `aria-*`
  ve klavye akışını doğrula.
