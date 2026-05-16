# React State Management

State'i doğru yere koy — en yaygın hata her şeyi global store'a tıkmak.

## Ne yap
- State'i kullanan en yakın ortak parent'ta tut; gerekmedikçe yukarı kaldırma.
- Sunucu verisi ≠ client state. Sunucu verisi için TanStack Query / SWR (cache, refetch, invalidation onların işi).
- Gerçek global UI state (tema, oturum, modal) için hafif store: Zustand / Context.
- Türetilebilen değeri state'te tutma — render'da hesapla.
- Form state'i: kontrollü input azsa `useState`, çok/karmaşıksa form kütüphanesi (react-hook-form).
- URL'de yaşaması gereken state'i (filtre, sayfa, sekme) `searchParams`'a koy.

## Kırmızı bayraklar
- API verisini `useState` + `useEffect` ile elle yönetip cache/refetch'i baştan yazmak.
- Tek Context'e her şeyi koyup her değişimde tüm ağacı re-render etmek.
- Aynı veriyi iki yerde state olarak tutmak (senkron tutma derdi).
- Prop drilling 3+ seviye — composition veya store gerekir.
- `useState`'i türetilmiş değer için kullanıp `useEffect` ile senkron tutmaya çalışmak.
