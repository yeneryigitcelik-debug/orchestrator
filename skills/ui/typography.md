# Typography Scale

## Ararsın
- Font size 7+ farklı keyfi değer (`text-[13px]`, `text-[15px]`, ...)
- Line-height inconsistency (1, 1.2, 1.5 karışık)
- Font weight 200, 350, 450 (mevcut olmayan ara değer → browser fallback)
- 2+ font family (sans + display + mono) ama hierarchy net değil
- Heading `<h1>` font size body ile aynı

## Patterns
- `text-[13px]` keyfi
- `font-weight: 350`
- `<h1 className="text-base">`

## Severity
- **medium**: Görsel hierarchy bozuk
- **low**: Refactor

## Doğrusu
- Type scale (tailwind: text-xs/sm/base/lg/xl/2xl...)
- Modular scale ratio (1.25, 1.333)
- Font weight 100/300/400/500/700/900
- Heading hiyerarşisi semantic + visual

## Örnek
`{"severity":"medium","rule":"non-scale-font-size","file":"src/components/Card.tsx","line":18,"why":"text-[13px] custom — design system scale dışında, tutarsız","fix":"text-sm (14px) veya text-base (16px) scale'i kullan","evidence":"<h3 className=\"text-[13px] font-[450]\">Card title</h3>"}`
