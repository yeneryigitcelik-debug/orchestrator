# React Performance

React/Next.js uygulamasında render ve yükleme darboğazlarını önle.
Önce ölç, sonra optimize et — tahminle `memo` serpme.

## Ne yap
- Bağımsız async işleri paralelleştir: `Promise.all([...])` — ardışık `await` zinciri kurma.
- `await`'i gerçekten gerektiği dala kadar ertele; layout'u bloklama.
- Barrel import'tan kaçın (`import { x } from 'lib'` yerine doğrudan dosyadan) — bundle şişer.
- Ağır component'leri `next/dynamic` veya `React.lazy` ile lazy-load et.
- Liste render'ında stabil `key` (index değil, kimlik).
- Gereksiz re-render: pahalı hesap için `useMemo`, child'a geçen fonksiyon için `useCallback` — ama sadece kanıtlı darboğazda.
- Server Component'te kalabilecek kodu client'a taşıma; `"use client"` sınırını yaprağa it.

## Kırmızı bayraklar
- Sıralı `await` waterfall'u — biri bitmeden diğeri başlamıyor.
- Her render'da yeni obje/array/fonksiyon literal'i prop olarak inip child'ı patlatması.
- `useEffect` içinde veri çekip waterfall yaratmak (RSC veya loader varken).
- Tüm icon/util kütüphanesini import edip 200KB taşımak.
- `memo` her yere serpilmiş ama prop'lar zaten her render değişiyor — etkisiz.
