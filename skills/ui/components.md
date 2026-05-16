# Component Consistency

## Ararsın
- Aynı görsel ihtiyaca farklı component'ler (3 farklı Button, 2 farklı Card)
- Component variant prop yerine boolean flag spaghetti (`isPrimary, isLarge, isLoading...`)
- Inline style + className karışık (hibrit style approach)
- Prop drilling 3+ seviye (Context veya composition gerekir)
- Component tek dosyada export edilmiş ama içeride sub-component kaynama

## Patterns
- `<Button>` 3+ farklı dosyada definition
- `<Card>` / `<Box>` yan yana, design system yok
- `style={{ ... }}` yaygın

## Severity
- **medium**: Component duplikasyon yaygın (3-5 yerde)
- **low**: Tek tek tutarsızlıklar
- **info**: Refactor önerisi

## Doğrusu
- Tek `<Button variant="primary|secondary|ghost" size="sm|md|lg">`
- Compound component pattern
- Variants yerine cva (class-variance-authority)

## Örnek
`{"severity":"medium","rule":"duplicate-button","file":"src/components/Header.tsx","line":12,"why":"3 farklı `<Button>` tanımı var: ui/Button, common/Button, header'da inline button — design tutarsız","fix":"Tek `ui/Button` + variant/size prop. Diğerlerini sil","evidence":"<button className=\"px-4 py-2 bg-blue-500 ...\">Save</button>"}`
