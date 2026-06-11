# Tasarım Sistemini Tüketme — web frontend

design rolü token foundation + component kütüphanesini kurdu. frontend rolünün işi:
bunu TÜKETMEK, yeniden icat etmek değil. Ekran kur, sistemi kullan.

## Önce DESIGN-SYSTEM.md
Bir UI işine başlamadan önce proje kökünde `DESIGN-SYSTEM.md` ara ve oku: token
kaynağı nerede, component'ler ne, prop API'leri, "Yapma" kuralları. Yoksa Lead'e
bildir — design helper önce çalışmalı.

## Token tüketimi
- Renk/spacing/radius → Tailwind theme class'ı veya CSS değişkeni:
  `bg-action-primary`, `text-text-primary`, `p-4`, `rounded-md`.
- Çıplak hex (`bg-[#3b82f6]`), magic px (`p-[13px]`), inline `style` ile renk — YASAK.
- Primitive token'a değil semantic token'a dokun (`text-primary`; `gray-900` değil).

## Component tüketimi
- Foundation component'ler hazır: `<Button>`, `<Input>`, `<Card>`, `<Dialog>`…
  Yeni buton/input/kart YAZMA — varyant prop'uyla kullan.
- Varyant API'sine uy: `<Button variant="primary" size="md">`.
- Ürüne özel bileşik component'i foundation'dan KUR (örn. `<UserCard>` = `<Card>` +
  `<Avatar>` + `<Badge>`), sıfırdan değil.
- Eksik bir foundation component varsa: `[BLOCKED]` ile design helper'a / Lead'e
  bildir, kendi versiyonunu uydurma.

## Tema
- Light/dark + preset design sisteminden gelir; component'ler semantic token okur.
- `if (dark)` dallanması YAZMA — token zaten temaya göre çözülür.

## Ne yap
- İşe `DESIGN-SYSTEM.md`'yi okuyarak başla.
- Token class'ları + foundation component'leri tüket.
- Ürün component'lerini foundation'dan kompoze et.
- Eksik/yanlış bir şey varsa design helper'a geri bildir, uydurma.

## Kırmızı bayraklar
- Hazır `<Button>` dururken sayfada elle `<button className="px-4 py-2 bg-...">`.
- Çıplak hex / magic px / inline renk — token atlanmış.
- DESIGN-SYSTEM.md okunmadan ekran kurmak.
- Component içinde `if (dark)` tema dallanması.
- Aynı amaca ikinci bir Button/Card tanımı — duplikasyon.
