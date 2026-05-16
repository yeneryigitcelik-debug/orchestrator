# Next.js App Router

App Router'da doğru render sınırı ve veri çekme deseni kur.

## Ne yap
- Varsayılan Server Component'tir — `"use client"` sadece etkileşim/hook/browser API gerektiğinde.
- Veriyi sunucuda çek: Server Component'te `await fetch(...)` veya doğrudan DB çağrısı.
- `loading.tsx` ve `error.tsx` ile route segment'lerine streaming + hata sınırı ver.
- Mutasyon için Server Action kullan; sonrasında `revalidatePath`/`revalidateTag` ile cache tazele.
- Metadata'yı `generateMetadata` ile route'tan üret.
- Dinamik segment'lerde `generateStaticParams` ile build-time prerender.
- Client'a sadece gereken veriyi geçir — tüm DB satırını serialize edip indirme.

## Kırmızı bayraklar
- Sayfanın tepesine `"use client"` koyup tüm ağacı client'a çekmek.
- Server Component'i client component'in çocuğu yapmak (children prop ile geçilmeli).
- Server-only sırrı (`process.env.SECRET`) client component'e sızdırmak.
- `useEffect` + `fetch` ile client-side veri çekip RSC'nin sunucu avantajını yok etmek.
- Mutasyondan sonra cache invalidate etmemek → bayat veri.
