# Responsive / Grid

## Ararsın
- Sadece desktop breakpoint'i göz önünde (mobile broken)
- `w-[600px]` fix width — overflow mobil
- Grid/flex direction breakpoint switch yok
- Modal/dialog mobile'da scroll'a girmiyor
- Container max-width yok (4K monitor'da geriliyor)

## Patterns
- `width: 600px` hardcoded
- `flex flex-row` ama mobile'da `flex-col` yok
- Tailwind sınıflarda `md:`, `sm:` prefix yok
- `min-w-[800px]` mobile'a sığmaz

## Severity
- **high**: Ana sayfa mobil tamamen broken
- **medium**: Bazı bölümler mobile'da scroll/overflow
- **low**: Best practice (container max-width)

## Doğrusu
- Mobile-first: önce `flex-col`, sonra `md:flex-row`
- Container max-w-7xl + mx-auto
- `min-w-0` flex item'larda overflow için
- Storybook viewport variant'ı

## Örnek
`{"severity":"high","rule":"fixed-width-no-mobile","file":"src/components/PricingTable.tsx","line":4,"why":"Pricing table `w-[1100px]` hardcoded — mobile'da yatay scroll, kullanıcı checkout'a ulaşamıyor","fix":"`w-full max-w-5xl mx-auto md:flex md:gap-6 flex-col` mobile-first","evidence":"<div className=\"w-[1100px] flex gap-4\">"}`
