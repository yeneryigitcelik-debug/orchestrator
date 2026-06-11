# Navigasyon — expo-router

expo-router, dosya-tabanlı navigasyon: `app/` altındaki dosya = route. Next.js App
Router'a benzer mantık, React Navigation üstüne kuruludur.

## Route tipleri
```
app/
  _layout.tsx          → kök; Stack/Tabs burada, provider'lar burada
  index.tsx            → /
  (tabs)/              → grup; URL'e segment EKLEMEZ, layout paylaşır
    _layout.tsx        → Tabs navigator
    home.tsx  feed.tsx
  post/[id].tsx        → dinamik route → /post/123
  (auth)/login.tsx     → auth grubu
  +not-found.tsx       → 404
```

## Navigator'lar
- **Stack** — itme/çekme, geri jesti; ekran derinliği.
- **Tabs** — alt sekme çubuğu; uygulamanın üst düzey bölümleri.
- **Drawer** — yan çekmece; ikincil navigasyon.
- Grup `(parantez)` — URL'i kirletmeden layout/navigator paylaşımı.

## Gezinme
```ts
import { router, Link } from 'expo-router';
router.push('/post/123');           // imperatif
router.replace('/(tabs)/home');     // geçmişe eklemeden
<Link href="/post/123">…</Link>     // deklaratif
```
- Parametre: `useLocalSearchParams()` ile oku.
- Ekranlar arası veri: küçük → route param; büyük/paylaşımlı → store (Zustand) veya
  context. Param'a obje serileştirme.

## Pattern'ler
- Auth akışı: kök `_layout.tsx`'te oturum kontrolü → korumalı grup `(app)`, korumasız
  `(auth)`; oturum yoksa `redirect`.
- Modal: route'a `presentation: 'modal'` (`Stack.Screen` options).
- Deep link: `app.json` scheme + expo-router otomatik eşler.
- Header: `Stack.Screen` options ile başlık/buton; tasarım sistemi token'larıyla.

## Ne yap
- Dosya yapısını navigasyon haritası gibi kur — route'lar dosyadan okunsun.
- Grupları `(parantez)` ile layout paylaşımına kullan.
- Auth durumunu kök layout'ta yönet, redirect ile koru.
- Type-safe route'ları aç (`experiments.typedRoutes`).

## Kırmızı bayraklar
- Ekran state'ini route param'a obje olarak serileştirmek.
- Geri yığınını şişirmek — `replace` gereken yerde hep `push`.
- expo-router navigator'ları yerine el yapımı Stack/Tabs.
- Auth kontrolü her ekranda tekrar — kök layout'ta bir kez yap.
